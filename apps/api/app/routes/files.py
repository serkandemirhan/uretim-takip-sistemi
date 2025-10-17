import os
from datetime import timedelta
from uuid import uuid4

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from app.config import Config
from app.middleware.auth_middleware import token_required, role_required
from app.models.database import execute_query, execute_query_one, execute_write
from app.services.s3_client import get_s3
from app.services.storage_paths import (
    ensure_bucket,
    job_files_prefix,
    make_folder,
    process_prefix,
)

files_bp = Blueprint("files", __name__, url_prefix="/api/files")


def _ensure_role_process_table():
    execute_write(
        """
        CREATE TABLE IF NOT EXISTS role_process_permissions (
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
            can_view BOOLEAN DEFAULT TRUE,
            PRIMARY KEY (role_id, process_id)
        )
        """
    )


def _pick(data, *keys):
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return None


def _int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _ensure_trailing_slash(path):
    path = (path or "").strip()
    if not path:
        return ""
    return path if path.endswith("/") else f"{path}/"


def _build_object_key(folder_path, filename):
    folder = _ensure_trailing_slash(folder_path)
    safe = secure_filename(filename or "")
    base, ext = os.path.splitext(safe)
    if not base:
        base = "file"
    ext = ext.lower()
    unique_name = f"{base}_{uuid4().hex[:8]}{ext}"
    return f"{folder}{unique_name}", unique_name


def _bucket_name():
    env_bucket = os.environ.get("MINIO_BUCKET")
    if env_bucket:
        return env_bucket
    if getattr(Config, "MINIO_BUCKET", None):
        return Config.MINIO_BUCKET
    return "reklampro-files"


def _resolve_folder_path(ref_type, ref_id):
    ref_type = (ref_type or "").strip()
    if not ref_type or not ref_id:
        return None

    ref_id_str = str(ref_id)

    if ref_type == "job":
        row = execute_query_one(
            """
            SELECT j.id, j.job_number, j.title,
                   c.id AS customer_id, c.name AS customer_name
            FROM jobs j
            LEFT JOIN customers c ON c.id = j.customer_id
            WHERE j.id = %s
            """,
            (ref_id_str,),
        )
        if not row:
            return None

        return _ensure_trailing_slash(
            job_files_prefix(
                row.get("customer_name"),
                str(row["customer_id"]) if row.get("customer_id") else "unknown",
                row.get("job_number") or "",
                row.get("title") or "",
                str(row["id"]),
            )
        )

    if ref_type == "job_step":
        row = execute_query_one(
            """
            SELECT js.id,
                   js.job_id,
                   p.id AS process_id, p.code AS process_code,
                   j.job_number, j.title,
                   c.id AS customer_id, c.name AS customer_name
            FROM job_steps js
            JOIN processes p ON p.id = js.process_id
            JOIN jobs j ON j.id = js.job_id
            LEFT JOIN customers c ON c.id = j.customer_id
            WHERE js.id = %s
            """,
            (ref_id_str,),
        )
        if not row:
            return None

        return _ensure_trailing_slash(
            process_prefix(
                row.get("customer_name"),
                str(row["customer_id"]) if row.get("customer_id") else "unknown",
                row.get("job_number") or "",
                row.get("title") or "",
                str(row["job_id"]),
                row.get("process_code") or "PROC",
                str(row["process_id"]),
            )
        )

    if ref_type == "stock_movement":
        row = execute_query_one(
            """
            SELECT sm.id, sm.movement_type, sm.created_at,
                   s.product_code, s.product_name
            FROM stock_movements sm
            JOIN stocks s ON s.id = sm.stock_id
            WHERE sm.id = %s
            """,
            (ref_id_str,),
        )
        if not row:
            return None

        # stocks/URUN_KODU/YILAYGUN_HareketID/
        product_code = secure_filename(row.get("product_code") or "UNKNOWN")
        movement_date = row.get("created_at")
        date_str = movement_date.strftime("%Y%m%d") if movement_date else "UNKNOWN"
        movement_id = ref_id_str[:8]  # First 8 chars of UUID

        return f"stocks/{product_code}/{date_str}_{movement_id}/"

    # Fallback: use sanitized ref_type/ref_id
    return f"{secure_filename(ref_type)}/{secure_filename(ref_id_str)}/"


@files_bp.route("/upload-url", methods=["POST"])
@token_required
def get_upload_url():
    data = request.get_json(force=True) or {}

    filename = _pick(data, "filename", "name")
    ref_type = _pick(data, "ref_type", "refType")
    ref_id = _pick(data, "ref_id", "refId")
    content_type = (
        _pick(data, "content_type", "contentType") or "application/octet-stream"
    )

    if not filename or not ref_type or not ref_id:
        return (
            jsonify({"error": "filename, ref_type ve ref_id alanları zorunludur"}),
            400,
        )

    folder_path = _resolve_folder_path(ref_type, ref_id)
    if not folder_path:
        return jsonify({"error": "Klasör yolu oluşturulamadı"}), 400

    bucket = _bucket_name()
    client = get_s3()
    ensure_bucket(client, bucket)
    make_folder(client, bucket, folder_path)

    object_key, unique_name = _build_object_key(folder_path, filename)
    expires_seconds = int(timedelta(hours=1).total_seconds())

    if hasattr(client, "presigned_put_object"):
        upload_url = client.presigned_put_object(
            bucket, object_key, expires=timedelta(hours=1)
        )
    else:
        params = {
            "Bucket": bucket,
            "Key": object_key,
        }
        if content_type:
            params["ContentType"] = content_type
        upload_url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=expires_seconds,
        )

    return (
        jsonify(
            {
                "data": {
                    "upload_url": upload_url,
                    "object_key": object_key,
                    "unique_filename": unique_name,
                    "folder_path": folder_path,
                }
            }
        ),
        200,
    )


@files_bp.route("/link", methods=["POST"])
@token_required
def link_file():
    data = request.get_json(force=True) or {}

    object_key = _pick(data, "object_key", "objectKey")
    filename = _pick(data, "filename", "name")
    ref_type = _pick(data, "ref_type", "refType")
    ref_id = _pick(data, "ref_id", "refId")
    content_type = _pick(data, "content_type", "contentType") or "application/octet-stream"
    file_size = _int_or_none(_pick(data, "file_size", "fileSize", "size"))
    folder_path = _pick(data, "folder_path", "folderPath")
    user_id = request.current_user.get("user_id") if hasattr(request, "current_user") else None

    if not all([object_key, filename, ref_type, ref_id]):
        return jsonify({"error": "object_key, filename, ref_type, ref_id zorunludur"}), 400

    bucket = _bucket_name()

    rows = execute_write(
        """
        INSERT INTO files (
            bucket,
            object_key,
            filename,
            file_size,
            content_type,
            ref_type,
            ref_id,
            uploaded_by,
            folder_path,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id, object_key, filename
        """,
        (
            bucket,
            object_key,
            filename,
            file_size,
            content_type,
            ref_type,
            str(ref_id),
            user_id,
            folder_path,
        ),
    )

    if not rows:
        return jsonify({"error": "Dosya kaydedilemedi"}), 500

    result = rows[0]
    return (
        jsonify(
            {
                "message": "Dosya başarıyla kaydedildi",
                "data": {
                    "id": str(result["id"]),
                    "object_key": result["object_key"],
                    "filename": result["filename"],
                },
            }
        ),
        201,
    )


@files_bp.route("", methods=["GET"])
@token_required
def get_files():
    ref_type = request.args.get("ref_type")
    ref_id = request.args.get("ref_id")

    query = """
        SELECT
            f.id,
            f.bucket,
            f.object_key,
            f.filename,
            f.file_size,
            f.content_type,
            f.ref_type,
            f.ref_id,
            f.folder_path,
            f.created_at,
            u.full_name AS uploaded_by_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE 1=1
    """

    params = []

    if ref_type:
        query += " AND f.ref_type = %s"
        params.append(ref_type)

    if ref_id:
        query += " AND f.ref_id = %s"
        params.append(ref_id)

    query += " ORDER BY f.created_at DESC"

    files = execute_query(query, tuple(params) if params else None) or []

    data = []
    for file in files:
        data.append(
            {
                "id": str(file["id"]),
                "bucket": file.get("bucket"),
                "object_key": file["object_key"],
                "filename": file["filename"],
                "file_size": file["file_size"],
                "content_type": file["content_type"],
                "ref_type": file["ref_type"],
                "ref_id": str(file["ref_id"]) if file.get("ref_id") else None,
                "folder_path": file.get("folder_path"),
                "created_at": file["created_at"].isoformat()
                if file.get("created_at")
                else None,
                "uploaded_by_name": file.get("uploaded_by_name"),
            }
        )

    return jsonify({"data": data}), 200


@files_bp.route("/by-job/<job_id>", methods=["GET"])
@token_required
def get_files_by_job(job_id):
    query = """
        SELECT
            f.id,
            f.bucket,
            f.object_key,
            f.filename,
            f.file_size,
            f.content_type,
            f.ref_type,
            f.ref_id,
            f.folder_path,
            f.created_at,
            u.full_name AS uploaded_by_name,
            js.process_id,
            p.name AS process_name,
            p.code AS process_code
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        LEFT JOIN job_steps js ON f.ref_type = 'job_step' AND f.ref_id = js.id
        LEFT JOIN processes p ON js.process_id = p.id
        WHERE (f.ref_type = 'job' AND f.ref_id = %s)
           OR (f.ref_type = 'job_step' AND js.job_id = %s)
        ORDER BY f.created_at DESC
    """

    files = execute_query(query, (job_id, job_id)) or []

    job_files = []
    process_files = {}

    for file in files:
        file_data = {
            "id": str(file["id"]),
            "bucket": file.get("bucket"),
            "object_key": file["object_key"],
            "filename": file["filename"],
            "file_size": file["file_size"],
            "content_type": file["content_type"],
            "folder_path": file.get("folder_path"),
            "created_at": file["created_at"].isoformat()
            if file.get("created_at")
            else None,
            "uploaded_by_name": file.get("uploaded_by_name"),
        }

        if file["ref_type"] == "job":
            job_files.append(file_data)
        elif file["ref_type"] == "job_step" and file.get("process_id"):
            process_key = str(file["process_id"])
            if process_key not in process_files:
                process_files[process_key] = {
                    "process_id": process_key,
                    "process_name": file.get("process_name"),
                    "process_code": file.get("process_code"),
                    "files": [],
                }
            process_files[process_key]["files"].append(file_data)

    return (
        jsonify(
            {
                "data": {
                    "job_files": job_files,
                    "process_files": list(process_files.values()),
                }
            }
        ),
        200,
    )


@files_bp.route("/<file_id>/download-url", methods=["GET"])
@token_required
def get_download_url(file_id):
    file = execute_query_one(
        "SELECT bucket, object_key, filename FROM files WHERE id = %s", (file_id,)
    )

    if not file:
        return jsonify({"error": "Dosya bulunamadı"}), 404

    bucket = file.get("bucket") or _bucket_name()
    s3_client = get_s3()

    presigned_url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket,
            "Key": file["object_key"],
            "ResponseContentDisposition": f'attachment; filename="{file["filename"]}"',
        },
        ExpiresIn=3600,
    )

    return (
        jsonify(
            {"data": {"download_url": presigned_url, "filename": file["filename"]}}
        ),
        200,
    )


@files_bp.route("/<file_id>", methods=["DELETE"])
@token_required
def delete_file(file_id):
    file = execute_query_one(
        "SELECT bucket, object_key FROM files WHERE id = %s", (file_id,)
    )

    if not file:
        return jsonify({"error": "Dosya bulunamadı"}), 404

    bucket = file.get("bucket") or _bucket_name()
    s3_client = get_s3()

    try:
        s3_client.delete_object(Bucket=bucket, Key=file["object_key"])
    except Exception as err:
        print(f"S3 delete error: {err}")

    execute_write("DELETE FROM files WHERE id = %s", (file_id,))

    return jsonify({"message": "Dosya başarıyla silindi"}), 200


def _allowed_process_ids():
    current_user = getattr(request, "current_user", None)
    if not current_user:
        return None

    role_code = current_user.get("role")
    if not role_code or role_code == "yonetici":
        return None

    _ensure_role_process_table()

    role_row = execute_query_one(
        "SELECT id FROM roles WHERE code = %s",
        (role_code,),
    )
    if not role_row:
        return None

    rows = execute_query(
        "SELECT process_id FROM role_process_permissions WHERE role_id = %s AND can_view = TRUE",
        (role_row['id'],)
    )
    return {str(row['process_id']) for row in (rows or [])}


@files_bp.route("/explorer", methods=["GET"])
@token_required
@role_required(["yonetici"])
def explorer():
    """Yönetici için tüm dosya envanterini getir"""
    try:
        query = """
            SELECT
                f.id,
                f.filename,
                f.object_key,
                f.folder_path,
                f.file_size,
                f.content_type,
                f.created_at,
                f.ref_type,
                f.ref_id,
                f.uploaded_by,
                u.full_name AS uploaded_by_name,
                c.id AS customer_id,
                c.name AS customer_name,
                j_base.id AS job_id,
                j_base.job_number,
                j_base.title AS job_title,
                js.id AS step_id,
                p.name AS process_name,
                p.code AS process_code
            FROM files f
            LEFT JOIN users u ON f.uploaded_by = u.id
            LEFT JOIN jobs j_ref ON f.ref_type = 'job' AND f.ref_id = j_ref.id
            LEFT JOIN job_steps js ON f.ref_type = 'job_step' AND f.ref_id = js.id
            LEFT JOIN jobs j_step ON js.job_id = j_step.id
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN jobs j_base ON j_base.id = COALESCE(j_ref.id, j_step.id)
            LEFT JOIN customers c ON j_base.customer_id = c.id
            ORDER BY c.name NULLS LAST, j_base.job_number NULLS LAST, f.created_at DESC
        """

        rows = execute_query(query)

        allowed_process_ids = _allowed_process_ids()

        data = []
        for row in rows:
            if allowed_process_ids is not None:
                process_id_val = row['step_id']
                if process_id_val is None or str(process_id_val) not in allowed_process_ids:
                    continue

            data.append({
                'id': str(row['id']),
                'filename': row['filename'],
                'object_key': row['object_key'],
                'folder_path': row['folder_path'],
                'file_size': row['file_size'],
                'content_type': row['content_type'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                'ref_type': row['ref_type'],
                'ref_id': str(row['ref_id']) if row['ref_id'] else None,
                'uploaded_by': {
                    'id': str(row['uploaded_by']) if row['uploaded_by'] else None,
                    'name': row['uploaded_by_name'],
                } if row['uploaded_by'] else None,
                'customer': {
                    'id': str(row['customer_id']) if row['customer_id'] else None,
                    'name': row['customer_name'],
                } if row['customer_id'] else None,
                'job': {
                    'id': str(row['job_id']) if row['job_id'] else None,
                    'job_number': row['job_number'],
                    'title': row['job_title'],
                } if row['job_id'] else None,
                'process': {
                    'id': str(row['step_id']) if row['step_id'] else None,
                    'code': row['process_code'],
                    'name': row['process_name'],
                } if row['step_id'] else None,
            })

        return jsonify({'data': data}), 200

    except Exception as e:
        print(f"Error getting explorer data: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
