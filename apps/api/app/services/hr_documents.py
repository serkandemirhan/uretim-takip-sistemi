import csv
import json
import mimetypes
import os
import zipfile
from datetime import date, datetime
from io import BytesIO, StringIO
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from werkzeug.utils import secure_filename

from psycopg2.extras import RealDictRow, Json

from app.models.database import (
    execute_query,
    execute_query_one,
    execute_write,
    get_db_connection,
    release_db_connection,
)
from app.services.s3_client import get_s3
from app.services.storage_paths import ensure_bucket, make_folder


DocumentRow = Dict[str, Any]


CATEGORY_PREFIX = {
    'ONBOARDING': 'ON',
    'OPERATIONS': 'OP',
    'HR_LIFECYCLE': 'HR',
    'OFFBOARDING': 'OF',
}


def _normalize_category(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    category = str(value).strip().upper()
    if category and category not in CATEGORY_PREFIX:
        raise ValueError("Geçersiz kategori değeri")
    return category


def _normalize_sequence(value: Any) -> Optional[int]:
    if value in (None, '', 'null'):
        return None
    try:
        seq = int(value)
        if seq < 0:
            raise ValueError
        return seq
    except (TypeError, ValueError):
        raise ValueError("sequence_no sayısal olmalıdır")


def _compute_folder_code(category: str, sequence_no: int, explicit: Optional[str] = None) -> str:
    if explicit:
        folder = str(explicit).strip().upper()
        if not folder:
            raise ValueError("folder_code boş olamaz")
        return folder
    prefix = CATEGORY_PREFIX.get(category)
    if not prefix:
        raise ValueError("Kategori prefix bulunamadı")
    return f"{prefix}_{sequence_no:02d}"


def _prepare_document_type_payload(payload: Dict[str, Any], *, is_create: bool = False) -> Dict[str, Any]:
    data = dict(payload or {})

    category = _normalize_category(data.get('category'))
    sequence = _normalize_sequence(data.get('sequence_no'))

    if is_create and not category:
        raise ValueError("category alanı zorunludur")
    if is_create and sequence is None:
        raise ValueError("sequence_no alanı zorunludur")

    if category:
        data['category'] = category
    elif 'category' in data and data.get('category') in (None, '', 'null'):
        data.pop('category')

    if sequence is not None:
        data['sequence_no'] = sequence
    elif 'sequence_no' in data and data.get('sequence_no') in (None, '', 'null'):
        data.pop('sequence_no')

    folder_code = data.get('folder_code')
    if folder_code:
        category_for_folder = data.get('category', category)
        if not category_for_folder:
            raise ValueError("folder_code belirlemek için category gerekli")
        seq_for_folder = sequence if sequence is not None else _normalize_sequence(data.get('sequence_no'))
        if seq_for_folder is None:
            raise ValueError("folder_code belirlemek için sequence_no gerekli")
        data['folder_code'] = _compute_folder_code(category_for_folder, seq_for_folder, folder_code)
    elif category and sequence is not None:
        data['folder_code'] = _compute_folder_code(category, sequence)

    return data


def list_document_types(include_inactive: bool = True) -> List[DocumentRow]:
    where_clause = "" if include_inactive else "WHERE is_active = TRUE"
    query = f"""
        SELECT
            id, code, name, description, requires_approval,
            default_validity_days, default_renew_before_days,
            default_share_expiry_hours, metadata_schema,
            category, sequence_no, folder_code,
            is_active, created_by, created_at, updated_at
        FROM hr_document_types
        {where_clause}
        ORDER BY name
    """
    return execute_query(query)


def get_document_type(document_type_id: UUID) -> Optional[DocumentRow]:
    return execute_query_one(
        """
        SELECT
            id, code, name, description, requires_approval,
            default_validity_days, default_renew_before_days,
            default_share_expiry_hours, metadata_schema,
            category, sequence_no, folder_code,
            is_active, created_by, created_at, updated_at
        FROM hr_document_types
        WHERE id = %s
        """,
        (str(document_type_id),),
    )


def create_document_type(payload: Dict[str, Any]) -> Optional[DocumentRow]:
    normalized = _prepare_document_type_payload(payload, is_create=True)
    allowed_fields = [
        "code",
        "name",
        "description",
        "requires_approval",
        "default_validity_days",
        "default_renew_before_days",
        "default_share_expiry_hours",
        "metadata_schema",
        "category",
        "sequence_no",
        "folder_code",
        "is_active",
        "created_by",
    ]
    columns: List[str] = []
    placeholders: List[str] = []
    params: List[Any] = []

    for field in allowed_fields:
        if field in normalized:
            columns.append(field)
            placeholders.append("%s")
            params.append(normalized[field])

    if "code" not in normalized or "name" not in normalized:
        raise ValueError("code ve name alanları zorunludur")

    query = f"""
        INSERT INTO hr_document_types ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """
    rows = execute_write(query, tuple(params))
    return rows[0] if rows else None


def update_document_type(document_type_id: UUID, updates: Dict[str, Any]) -> Optional[DocumentRow]:
    normalized = _prepare_document_type_payload(updates)
    allowed_fields = [
        "name",
        "description",
        "requires_approval",
        "default_validity_days",
        "default_renew_before_days",
        "default_share_expiry_hours",
        "metadata_schema",
        "category",
        "sequence_no",
        "folder_code",
        "is_active",
    ]
    setters: List[str] = []
    params: List[Any] = []

    for field in allowed_fields:
        if field in normalized:
            setters.append(f"{field} = %s")
            params.append(normalized[field])

    if not setters:
        return get_document_type(document_type_id)

    setters.append("updated_at = NOW()")
    params.append(str(document_type_id))

    rows = execute_write(
        f"""
        UPDATE hr_document_types
           SET {', '.join(setters)}
         WHERE id = %s
         RETURNING *
        """,
        tuple(params),
    )
    return rows[0] if rows else None


def list_document_requirements(
    document_type_id: Optional[UUID] = None,
    role_id: Optional[UUID] = None,
) -> List[DocumentRow]:
    conditions: List[str] = []
    params: List[Any] = []

    if document_type_id:
        conditions.append("dr.document_type_id = %s")
        params.append(str(document_type_id))

    if role_id:
        conditions.append("dr.role_id = %s")
        params.append(str(role_id))

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    query = f"""
        SELECT
            dr.id,
            dr.document_type_id,
            dr.role_id,
            r.name AS role_name,
            r.code AS role_code,
            dr.department_code,
            dr.employment_type,
            dr.is_mandatory,
            dr.validity_days_override,
            dr.renew_before_days_override,
            dr.applies_from,
            dr.applies_until,
            dr.created_by,
            dr.created_at,
            dr.updated_at
        FROM hr_document_requirements dr
        LEFT JOIN roles r ON r.id = dr.role_id
        {where_clause}
        ORDER BY dr.created_at DESC
    """
    return execute_query(query, tuple(params) if params else None)


def get_document_requirement(requirement_id: UUID) -> Optional[DocumentRow]:
    return execute_query_one(
        """
        SELECT
            dr.id,
            dr.document_type_id,
            dr.role_id,
            r.name AS role_name,
            r.code AS role_code,
            dr.department_code,
            dr.employment_type,
            dr.is_mandatory,
            dr.validity_days_override,
            dr.renew_before_days_override,
            dr.applies_from,
            dr.applies_until,
            dr.created_by,
            dr.created_at,
            dr.updated_at
        FROM hr_document_requirements dr
        LEFT JOIN roles r ON r.id = dr.role_id
        WHERE dr.id = %s
        """,
        (str(requirement_id),),
    )


def create_document_requirement(payload: Dict[str, Any]) -> Optional[DocumentRow]:
    allowed_fields = [
        "document_type_id",
        "role_id",
        "department_code",
        "employment_type",
        "is_mandatory",
        "validity_days_override",
        "renew_before_days_override",
        "applies_from",
        "applies_until",
        "created_by",
    ]
    columns: List[str] = []
    placeholders: List[str] = []
    params: List[Any] = []

    if "document_type_id" not in payload:
        raise ValueError("document_type_id alanı zorunludur")

    for field in allowed_fields:
        if field in payload:
            columns.append(field)
            placeholders.append("%s")
            params.append(payload[field])

    query = f"""
        INSERT INTO hr_document_requirements ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """
    rows = execute_write(query, tuple(params))
    return rows[0] if rows else None


def update_document_requirement(requirement_id: UUID, updates: Dict[str, Any]) -> Optional[DocumentRow]:
    allowed_fields = [
        "role_id",
        "department_code",
        "employment_type",
        "is_mandatory",
        "validity_days_override",
        "renew_before_days_override",
        "applies_from",
        "applies_until",
    ]
    setters: List[str] = []
    params: List[Any] = []

    for field in allowed_fields:
        if field in updates:
            setters.append(f"{field} = %s")
            params.append(updates[field])

    if not setters:
        return get_document_requirement(requirement_id)

    setters.append("updated_at = NOW()")
    params.append(str(requirement_id))

    rows = execute_write(
        f"""
        UPDATE hr_document_requirements
           SET {', '.join(setters)}
         WHERE id = %s
         RETURNING *
        """,
        tuple(params),
    )
    return rows[0] if rows else None


def delete_document_requirement(requirement_id: UUID) -> bool:
    rows = execute_write(
        """
        DELETE FROM hr_document_requirements
        WHERE id = %s
        RETURNING id
        """,
        (str(requirement_id),),
    )
    return bool(rows)


def list_employee_documents(
    user_id: Optional[UUID] = None,
    status: Optional[str] = None,
    document_type_id: Optional[UUID] = None,
    category: Optional[str] = None,
) -> List[DocumentRow]:
    conditions: List[str] = []
    params: List[Any] = []

    if user_id:
        conditions.append("ed.user_id = %s")
        params.append(str(user_id))

    if status:
        conditions.append("ed.status = %s")
        params.append(status)

    if document_type_id:
        conditions.append("ed.document_type_id = %s")
        params.append(str(document_type_id))

    if category:
        conditions.append("dt.category = %s")
        params.append(category)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    query = f"""
        SELECT
            ed.id,
            ed.user_id,
            u.full_name AS user_name,
            u.email AS user_email,
            ed.document_type_id,
            dt.code AS document_type_code,
            dt.name AS document_type_name,
            dt.folder_code,
            dt.category,
            dt.requires_approval,
            ed.requirement_id,
            ed.status,
            ed.valid_from,
            ed.valid_until,
            ed.current_version_id,
            ed.last_status_check_at,
            ed.notes,
            ed.created_by,
            ed.updated_by,
            ed.created_at,
            ed.updated_at
        FROM hr_employee_documents ed
        JOIN users u ON u.id = ed.user_id
        JOIN hr_document_types dt ON dt.id = ed.document_type_id
        LEFT JOIN hr_document_requirements dr ON dr.id = ed.requirement_id
        {where_clause}
        ORDER BY u.full_name NULLS LAST, dt.name
    """

    return execute_query(query, tuple(params) if params else None)


def get_employee_document(document_id: UUID) -> Optional[DocumentRow]:
    row = execute_query_one(
        """
        SELECT
            ed.id,
            ed.user_id,
            u.full_name AS user_name,
            u.email AS user_email,
            ed.document_type_id,
            dt.code AS document_type_code,
            dt.name AS document_type_name,
            dt.folder_code,
            dt.category,
            dt.requires_approval,
            ed.requirement_id,
            ed.status,
            ed.valid_from,
            ed.valid_until,
            ed.current_version_id,
            ed.last_status_check_at,
            ed.notes,
            ed.created_by,
            ed.updated_by,
            ed.created_at,
            ed.updated_at
        FROM hr_employee_documents ed
        JOIN users u ON u.id = ed.user_id
        JOIN hr_document_types dt ON dt.id = ed.document_type_id
        WHERE ed.id = %s
        """,
        (str(document_id),),
    )

    if not row:
        return None

    versions = execute_query(
        """
        SELECT
            v.id,
            v.employee_document_id,
            v.file_id,
            v.version_no,
            v.uploaded_by,
            uploader.full_name AS uploaded_by_name,
            v.uploaded_at,
            v.approval_status,
            v.approved_by,
            approver.full_name AS approved_by_name,
            v.approved_at,
            v.approval_note,
            v.checksum,
            v.file_metadata,
            v.created_at
        FROM hr_document_versions v
        LEFT JOIN users uploader ON uploader.id = v.uploaded_by
        LEFT JOIN users approver ON approver.id = v.approved_by
        WHERE v.employee_document_id = %s
        ORDER BY v.version_no DESC
        """,
        (str(document_id),),
    )

    row["versions"] = versions or []
    return row


def summarize_employee_documents(
    *,
    user_id: Optional[UUID] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    conditions: List[str] = []
    params: List[Any] = []

    if user_id:
        conditions.append("ed.user_id = %s")
        params.append(str(user_id))

    if category:
        conditions.append("dt.category = %s")
        params.append(category)

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    status_rows = execute_query(
        f"""
        SELECT ed.status, COUNT(*) AS count
        FROM hr_employee_documents ed
        JOIN hr_document_types dt ON dt.id = ed.document_type_id
        {where_clause}
        GROUP BY ed.status
        """,
        tuple(params) if params else None,
    ) or []

    category_rows = execute_query(
        f"""
        SELECT dt.category, COUNT(*) AS count
        FROM hr_employee_documents ed
        JOIN hr_document_types dt ON dt.id = ed.document_type_id
        {where_clause}
        GROUP BY dt.category
        """,
        tuple(params) if params else None,
    ) or []

    total = sum(row["count"] for row in status_rows)
    by_status = {row["status"]: row["count"] for row in status_rows}
    by_category = {row["category"]: row["count"] for row in category_rows}

    return {
        "total": total,
        "by_status": by_status,
        "by_category": by_category,
    }


def create_employee_document(payload: Dict[str, Any]) -> Optional[DocumentRow]:
    allowed_fields = [
        "user_id",
        "document_type_id",
        "requirement_id",
        "status",
        "valid_from",
        "valid_until",
        "notes",
        "created_by",
        "updated_by",
    ]

    if "user_id" not in payload or "document_type_id" not in payload:
        raise ValueError("user_id ve document_type_id alanları zorunludur")

    requirement_id = payload.get("requirement_id")
    existing = get_employee_document_by_scope(
        payload["user_id"],
        payload["document_type_id"],
        requirement_id,
    )
    if existing:
        return existing

    columns: List[str] = []
    placeholders: List[str] = []
    params: List[Any] = []

    for field in allowed_fields:
        if field in payload:
            columns.append(field)
            placeholders.append("%s")
            params.append(payload[field])

    query = f"""
        INSERT INTO hr_employee_documents ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """

    rows = execute_write(query, tuple(params))
    return rows[0] if rows else None


def get_employee_document_by_scope(
    user_id: UUID,
    document_type_id: UUID,
    requirement_id: Optional[UUID] = None,
) -> Optional[DocumentRow]:
    return execute_query_one(
        """
        SELECT *
        FROM hr_employee_documents
        WHERE user_id = %s
          AND document_type_id = %s
          AND (
                (requirement_id IS NULL AND %s IS NULL)
             OR requirement_id = %s
          )
        """,
        (
            str(user_id),
            str(document_type_id),
            str(requirement_id) if requirement_id else None,
            str(requirement_id) if requirement_id else None,
        ),
    )


def _row_as_dict(row: RealDictRow) -> DocumentRow:
    return dict(row) if row is not None else None


def _serialize_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _parse_date_value(value: Any) -> Optional[date]:
    if value in (None, "", "null"):
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text).date()
    except ValueError:
        return None


def create_document_version(
    employee_document_id: UUID,
    file_id: UUID,
    uploaded_by: Optional[UUID],
    *,
    checksum: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    status_requires_approval: Optional[bool] = None,
    valid_from: Optional[datetime] = None,
    valid_until: Optional[datetime] = None,
) -> DocumentRow:
    """
    Yeni versiyon oluşturur ve ilgili çalışan doküman kaydını günceller.
    Approval gerekli mi bilgisini dışarıdan alabilir; verilmezse tablo üzerinden okunur.
    """
    conn = get_db_connection()
    cur = None
    try:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                ed.id,
                ed.user_id,
                ed.status,
                ed.valid_from,
                ed.valid_until,
                dt.requires_approval
            FROM hr_employee_documents ed
            JOIN hr_document_types dt ON dt.id = ed.document_type_id
            WHERE ed.id = %s
            FOR UPDATE
            """,
            (str(employee_document_id),),
        )
        doc_row = cur.fetchone()
        if not doc_row:
            raise ValueError("Çalışan doküman kaydı bulunamadı")

        requires_approval = (
            status_requires_approval
            if status_requires_approval is not None
            else doc_row["requires_approval"]
        )

        cur.execute(
            """
            SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
            FROM hr_document_versions
            WHERE employee_document_id = %s
            """,
            (str(employee_document_id),),
        )
        next_row = cur.fetchone()
        next_version = next_row["next_version"] if next_row else 1

        approval_status = "pending" if requires_approval else "approved"
        approved_by = uploaded_by if not requires_approval else None
        approval_note = None

        file_metadata = dict(metadata or {})
        if valid_from:
            file_metadata.setdefault("valid_from", _serialize_date(valid_from))
        if valid_until:
            file_metadata.setdefault("valid_until", _serialize_date(valid_until))

        cur.execute(
            """
            INSERT INTO hr_document_versions (
                employee_document_id,
                file_id,
                version_no,
                uploaded_by,
                uploaded_at,
                approval_status,
                approved_by,
                approved_at,
                approval_note,
                checksum,
                file_metadata
            )
            VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                str(employee_document_id),
                str(file_id),
                next_version,
                str(uploaded_by) if uploaded_by else None,
                approval_status,
                str(approved_by) if approved_by else None,
                datetime.utcnow() if not requires_approval else None,
                approval_note,
                checksum,
                Json(file_metadata),
            ),
        )
        version_row = cur.fetchone()
        if not version_row:
            raise RuntimeError("Doküman versiyonu oluşturulamadı")

        new_status = "pending_approval" if requires_approval else "active"
        update_fields: List[str] = [
            "current_version_id = %s",
            "status = %s",
            "updated_at = NOW()",
        ]
        update_params: List[Any] = [
            str(version_row["id"]),
            new_status,
        ]

        if uploaded_by:
            update_fields.append("updated_by = %s")
            update_params.append(str(uploaded_by))

        if not requires_approval:
            if valid_from:
                update_fields.append("valid_from = %s")
                update_params.append(valid_from)
            if valid_until:
                update_fields.append("valid_until = %s")
                update_params.append(valid_until)

        cur.execute(
            f"""
            UPDATE hr_employee_documents
               SET {', '.join(update_fields)}
             WHERE id = %s
            """,
            tuple(update_params + [str(employee_document_id)]),
        )

        conn.commit()
        return _row_as_dict(version_row)
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        release_db_connection(conn)


def approve_document_version(
    version_id: UUID,
    approved_by: UUID,
    *,
    approval_note: Optional[str] = None,
    valid_from: Optional[datetime] = None,
    valid_until: Optional[datetime] = None,
) -> DocumentRow:
    conn = get_db_connection()
    cur = None
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                v.id,
                v.employee_document_id,
                v.file_metadata,
                ed.status,
                ed.valid_from,
                ed.valid_until
            FROM hr_document_versions v
            JOIN hr_employee_documents ed ON ed.id = v.employee_document_id
            WHERE v.id = %s
            FOR UPDATE
            """,
            (str(version_id),),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Versiyon kaydı bulunamadı")

        meta = row.get("file_metadata") or {}
        valid_from_final = valid_from or meta.get("valid_from") or row.get("valid_from")
        valid_until_final = valid_until or meta.get("valid_until") or row.get("valid_until")

        cur.execute(
            """
            UPDATE hr_document_versions
               SET approval_status = 'approved',
                   approved_by = %s,
                   approved_at = NOW(),
                   approval_note = %s
             WHERE id = %s
             RETURNING *
            """,
            (
                str(approved_by),
                approval_note,
                str(version_id),
            ),
        )
        updated_version = cur.fetchone()

        if not updated_version:
            raise RuntimeError("Versiyon güncellenemedi")

        update_fields = [
            "current_version_id = %s",
            "status = 'active'",
            "updated_at = NOW()",
            "updated_by = %s",
        ]
        update_params: List[Any] = [
            str(version_id),
            str(approved_by),
        ]

        if valid_from_final:
            update_fields.append("valid_from = %s")
            update_params.append(valid_from_final)

        if valid_until_final:
            update_fields.append("valid_until = %s")
            update_params.append(valid_until_final)

        cur.execute(
            f"""
            UPDATE hr_employee_documents
               SET {', '.join(update_fields)}
             WHERE id = %s
            """,
            tuple(update_params + [str(row["employee_document_id"])]),
        )

        conn.commit()
        return _row_as_dict(updated_version)
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        release_db_connection(conn)


def reject_document_version(
    version_id: UUID,
    rejected_by: UUID,
    *,
    rejection_note: Optional[str] = None,
) -> DocumentRow:
    conn = get_db_connection()
    cur = None
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                v.id,
                v.employee_document_id
            FROM hr_document_versions v
            WHERE v.id = %s
            FOR UPDATE
            """,
            (str(version_id),),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("Versiyon kaydı bulunamadı")

        employee_document_id = row["employee_document_id"]

        cur.execute(
            """
            UPDATE hr_document_versions
               SET approval_status = 'rejected',
                   approved_by = %s,
                   approved_at = NOW(),
                   approval_note = %s
             WHERE id = %s
             RETURNING *
            """,
            (
                str(rejected_by),
                rejection_note,
                str(version_id),
            ),
        )
        updated_version = cur.fetchone()

        if not updated_version:
            raise RuntimeError("Versiyon güncellenemedi")

        # Onaylı son versiyonu bul
        cur.execute(
            """
            SELECT id, file_metadata
            FROM hr_document_versions
            WHERE employee_document_id = %s AND approval_status = 'approved'
            ORDER BY version_no DESC
            LIMIT 1
            """,
            (str(employee_document_id),),
        )
        latest_approved = cur.fetchone()

        if latest_approved:
            update_fields = [
                "current_version_id = %s",
                "status = 'active'",
                "updated_at = NOW()",
                "updated_by = %s",
            ]
            update_params: List[Any] = [
                str(latest_approved["id"]),
                str(rejected_by),
            ]

            metadata = latest_approved.get("file_metadata") or {}
            if metadata.get("valid_from"):
                update_fields.append("valid_from = %s")
                update_params.append(metadata.get("valid_from"))
            if metadata.get("valid_until"):
                update_fields.append("valid_until = %s")
                update_params.append(metadata.get("valid_until"))
        else:
            update_fields = [
                "current_version_id = NULL",
                "status = 'missing'",
                "updated_at = NOW()",
                "updated_by = %s",
            ]
            update_params = [str(rejected_by)]

        cur.execute(
            f"""
            UPDATE hr_employee_documents
               SET {', '.join(update_fields)}
             WHERE id = %s
            """,
            tuple(update_params + [str(employee_document_id)]),
        )

        conn.commit()
        return _row_as_dict(updated_version)
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        release_db_connection(conn)


def delete_document_version(version_id: UUID) -> bool:
    rows = execute_write(
        """
        DELETE FROM hr_document_versions
        WHERE id = %s
        RETURNING id
        """,
        (str(version_id),),
    )
    return bool(rows)


def list_share_links(employee_document_id: Optional[UUID] = None) -> List[DocumentRow]:
    conditions: List[str] = []
    params: List[Any] = []

    if employee_document_id:
        conditions.append("sl.employee_document_id = %s")
        params.append(str(employee_document_id))

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    query = f"""
        SELECT
            sl.id,
            sl.token,
            sl.employee_document_id,
            sl.document_version_id,
            sl.expires_at,
            sl.max_views,
            sl.views_count,
            sl.allowed_roles,
            sl.allowed_departments,
            sl.is_active,
            sl.created_by,
            sl.created_at
        FROM hr_document_share_links sl
        {where_clause}
        ORDER BY sl.created_at DESC
    """
    return execute_query(query, tuple(params) if params else None)


def create_share_link(payload: Dict[str, Any]) -> Optional[DocumentRow]:
    allowed_fields = [
        "employee_document_id",
        "document_version_id",
        "expires_at",
        "max_views",
        "allowed_roles",
        "allowed_departments",
        "is_active",
        "created_by",
    ]
    columns: List[str] = []
    placeholders: List[str] = []
    params: List[Any] = []

    if "employee_document_id" not in payload or "expires_at" not in payload:
        raise ValueError("employee_document_id ve expires_at alanları zorunludur")

    for field in allowed_fields:
        if field in payload:
            columns.append(field)
            placeholders.append("%s")
            params.append(payload[field])

    query = f"""
        INSERT INTO hr_document_share_links ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """
    rows = execute_write(query, tuple(params))
    return rows[0] if rows else None


def get_share_link(share_link_id: UUID) -> Optional[DocumentRow]:
    return execute_query_one(
        """
        SELECT
            sl.id,
            sl.token,
            sl.employee_document_id,
            sl.document_version_id,
            sl.expires_at,
            sl.max_views,
            sl.views_count,
            sl.allowed_roles,
            sl.allowed_departments,
            sl.is_active,
            sl.created_by,
            sl.created_at
        FROM hr_document_share_links sl
        WHERE sl.id = %s
        """,
        (str(share_link_id),),
    )


def deactivate_share_link(share_link_id: UUID) -> bool:
    rows = execute_write(
        """
        UPDATE hr_document_share_links
           SET is_active = FALSE
         WHERE id = %s AND is_active = TRUE
         RETURNING id
        """,
        (str(share_link_id),),
    )
    return bool(rows)


def sync_requirement_documents(
    requirement_id: UUID,
    initiated_by: Optional[UUID] = None,
) -> Dict[str, Any]:
    requirement = get_document_requirement(requirement_id)
    if not requirement:
        raise ValueError("Zorunluluk kaydı bulunamadı")

    document_type_id = requirement["document_type_id"]
    role_id = requirement.get("role_id")

    if role_id:
        user_rows = execute_query(
            """
            SELECT DISTINCT ur.user_id AS id
            FROM user_roles ur
            JOIN users u ON u.id = ur.user_id
            WHERE ur.role_id = %s
              AND u.is_active = TRUE
            """,
            (str(role_id),),
        )
    else:
        user_rows = execute_query(
            """
            SELECT id
            FROM users
            WHERE is_active = TRUE
            """,
        )

    total_users = len(user_rows or [])
    created_count = 0
    skipped = 0

    for row in user_rows or []:
        user_id = row["id"]
        existing = get_employee_document_by_scope(
            user_id,
            document_type_id,
            requirement_id,
        )
        if existing:
            skipped += 1
            continue

        execute_write(
            """
            INSERT INTO hr_employee_documents (
                user_id,
                document_type_id,
                requirement_id,
                status,
                created_by,
                updated_by
            )
            VALUES (%s, %s, %s, 'missing', %s, %s)
            """,
            (
                str(user_id),
                str(document_type_id),
                str(requirement_id),
                str(initiated_by) if initiated_by else None,
                str(initiated_by) if initiated_by else None,
            ),
        )
        created_count += 1

    return {
        "requirement_id": str(requirement_id),
        "document_type_id": str(document_type_id),
        "processed_users": total_users,
        "created_documents": created_count,
        "existing_documents": skipped,
    }


def run_expiry_check(
    reference_date: Optional[date] = None,
    initiated_by: Optional[UUID] = None,
) -> Dict[str, Any]:
    target_date = reference_date or datetime.utcnow().date()
    conn = get_db_connection()
    cur = None
    expired_docs: List[DocumentRow] = []
    reactivated_docs: List[DocumentRow] = []
    try:
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id, user_id, document_type_id, status, valid_until
            FROM hr_employee_documents
            WHERE status IN ('active', 'pending_approval')
              AND valid_until IS NOT NULL
              AND valid_until < %s
            """,
            (target_date,),
        )
        to_expire = cur.fetchall() or []

        for doc in to_expire:
            cur.execute(
                """
                UPDATE hr_employee_documents
                   SET status = 'expired',
                       updated_at = NOW(),
                       updated_by = %s,
                       last_status_check_at = NOW()
                 WHERE id = %s
                 RETURNING id, user_id, document_type_id, valid_until
                """,
                (
                    str(initiated_by) if initiated_by else None,
                    doc["id"],
                ),
            )
            updated_row = cur.fetchone()
            if updated_row:
                expired_docs.append(updated_row)
                change = {
                    "previous_status": doc.get("status"),
                    "new_status": "expired",
                    "valid_until": _serialize_date(updated_row.get("valid_until")),
                    "reference_date": target_date.isoformat(),
                }
                cur.execute(
                    """
                    INSERT INTO audit_logs (
                        user_id,
                        action,
                        entity_type,
                        entity_id,
                        changes
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        str(initiated_by) if initiated_by else None,
                        "hr_document_status_expired",
                        "hr_employee_document",
                        str(updated_row["id"]),
                        json.dumps(change),
                    ),
                )

        cur.execute(
            """
            SELECT id, user_id, document_type_id, status, valid_until
            FROM hr_employee_documents
            WHERE status = 'expired'
              AND valid_until IS NOT NULL
              AND valid_until >= %s
            """,
            (target_date,),
        )
        to_reactivate = cur.fetchall() or []

        for doc in to_reactivate:
            cur.execute(
                """
                UPDATE hr_employee_documents
                   SET status = 'active',
                       updated_at = NOW(),
                       updated_by = %s,
                       last_status_check_at = NOW()
                 WHERE id = %s
                 RETURNING id, user_id, document_type_id, valid_until
                """,
                (
                    str(initiated_by) if initiated_by else None,
                    doc["id"],
                ),
            )
            updated_row = cur.fetchone()
            if updated_row:
                reactivated_docs.append(updated_row)
                change = {
                    "previous_status": doc.get("status"),
                    "new_status": "active",
                    "valid_until": _serialize_date(updated_row.get("valid_until")),
                    "reference_date": target_date.isoformat(),
                }
                cur.execute(
                    """
                    INSERT INTO audit_logs (
                        user_id,
                        action,
                        entity_type,
                        entity_id,
                        changes
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        str(initiated_by) if initiated_by else None,
                        "hr_document_status_reactivated",
                        "hr_employee_document",
                        str(updated_row["id"]),
                        json.dumps(change),
                    ),
                )

        conn.commit()
        return {
            "reference_date": target_date.isoformat(),
            "expired_count": len(expired_docs),
            "reactivated_count": len(reactivated_docs),
        }
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        release_db_connection(conn)


def create_import_job(payload: Dict[str, Any]) -> Optional[DocumentRow]:
    csv_file_id = payload.get("csv_file_id")
    if not csv_file_id:
        raise ValueError("csv_file_id zorunludur")

    summary = {
        "csv_file_id": str(csv_file_id),
        "archive_file_id": str(payload.get("archive_file_id")) if payload.get("archive_file_id") else None,
        "identifier_field": payload.get("identifier_field") or "username",
        "delimiter": payload.get("delimiter") or ",",
        "encoding": payload.get("encoding") or "utf-8",
    }
    if payload.get("document_type_code"):
        summary["document_type_code"] = payload["document_type_code"]

    rows = execute_write(
        """
        INSERT INTO hr_document_import_jobs (
            uploaded_by,
            status,
            source_filename,
            total_records,
            processed_records,
            success_count,
            failure_count,
            summary,
            created_at
        )
        VALUES (%s, 'uploaded', %s, 0, 0, 0, 0, %s, NOW())
        RETURNING *
        """,
        (
            str(payload.get("uploaded_by")) if payload.get("uploaded_by") else None,
            payload.get("source_filename"),
            summary,
        ),
    )
    return rows[0] if rows else None


def list_import_jobs(limit: int = 50) -> List[DocumentRow]:
    return execute_query(
        """
        SELECT
            id,
            uploaded_by,
            status,
            source_filename,
            total_records,
            processed_records,
            success_count,
            failure_count,
            summary,
            error_log,
            created_at,
            started_at,
            completed_at
        FROM hr_document_import_jobs
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (limit,),
    )


def get_import_job(job_id: UUID) -> Optional[DocumentRow]:
    return execute_query_one(
        """
        SELECT
            id,
            uploaded_by,
            status,
            source_filename,
            total_records,
            processed_records,
            success_count,
            failure_count,
            summary,
            error_log,
            created_at,
            started_at,
            completed_at
        FROM hr_document_import_jobs
        WHERE id = %s
        """,
        (str(job_id),),
    )


def list_import_items(job_id: UUID, status: Optional[str] = None) -> List[DocumentRow]:
    params: List[Any] = [str(job_id)]
    status_clause = ""
    if status:
        status_clause = "AND status = %s"
        params.append(status)

    return execute_query(
        f"""
        SELECT
            id,
            import_job_id,
            line_number,
            employee_identifier,
            document_type_code,
            requirement_id,
            matched_user_id,
            status,
            error_message,
            generated_document_id,
            generated_version_id,
            metadata,
            created_at
        FROM hr_document_import_items
        WHERE import_job_id = %s
        {status_clause}
        ORDER BY line_number
        """,
        tuple(params),
    )


def _read_file_from_storage(file_row: DocumentRow) -> bytes:
    client = get_s3()
    bucket = file_row["bucket"]
    object_key = file_row["object_key"]
    response = client.get_object(Bucket=bucket, Key=object_key)
    data = response["Body"].read()
    response["Body"].close()
    return data


def process_import_job(
    job_id: UUID,
    initiated_by: Optional[UUID] = None,
    dry_run: bool = False,
) -> DocumentRow:
    job = get_import_job(job_id)
    if not job:
        raise ValueError("İçe aktarma işi bulunamadı")
    if job.get("status") == "processing":
        raise ValueError("İçe aktarma süreci zaten devam ediyor")

    summary = job.get("summary") or {}
    csv_file_id = summary.get("csv_file_id")
    archive_file_id = summary.get("archive_file_id")
    if not csv_file_id:
        raise ValueError("CSV dosyası tanımlı değil")

    identifier_field = (summary.get("identifier_field") or "username").lower()
    delimiter = summary.get("delimiter") or ","
    encoding = summary.get("encoding") or "utf-8"

    execute_write(
        """
        UPDATE hr_document_import_jobs
           SET status = 'processing',
               started_at = NOW()
         WHERE id = %s
        """,
        (str(job_id),),
    )

    csv_file = execute_query_one(
        """
        SELECT id, bucket, object_key, filename
        FROM files
        WHERE id = %s
        """,
        (csv_file_id,),
    )
    if not csv_file:
        raise ValueError("CSV dosyası bulunamadı")

    archive_file = None
    if archive_file_id:
        archive_file = execute_query_one(
            """
            SELECT id, bucket, object_key, filename
            FROM files
            WHERE id = %s
            """,
            (archive_file_id,),
        )
        if not archive_file:
            raise ValueError("Arşiv dosyası bulunamadı")

    total_records = 0
    success_count = 0
    failure_count = 0
    processed = 0
    zip_handle = None
    archive_map: Dict[str, zipfile.ZipInfo] = {}

    try:
        csv_bytes = _read_file_from_storage(csv_file)
        csv_text = csv_bytes.decode(encoding, errors="ignore")
        reader = csv.DictReader(StringIO(csv_text), delimiter=delimiter)
        csv_rows = list(reader)
        total_records = len(csv_rows)

        if archive_file:
            zip_bytes = _read_file_from_storage(archive_file)
            zip_handle = zipfile.ZipFile(BytesIO(zip_bytes))
            for info in zip_handle.infolist():
                if info.is_dir():
                    continue
                archive_map[os.path.basename(info.filename).lower()] = info

        target_bucket = archive_file["bucket"] if archive_file else csv_file["bucket"]
        client = get_s3()
        ensure_bucket(client, target_bucket)

        for idx, row in enumerate(csv_rows, start=2):
            processed += 1
            employee_identifier = (row.get("employee_identifier") or row.get("employee_code") or "").strip()
            document_type_code = (row.get("document_type_code") or row.get("document_type") or "").strip().lower()
            file_name = row.get("file_name") or row.get("filename") or ""
            issue_date = _parse_date_value(row.get("issue_date") or row.get("valid_from"))
            expiry_date = _parse_date_value(row.get("expiry_date") or row.get("valid_until"))
            approval_status_raw = (row.get("approval_status") or row.get("status") or "").strip().lower()

            item_status = "imported"
            error_message = None
            generated_doc_id = None
            generated_version_id = None
            matched_user_id = None

            metadata = {
                "file_name": file_name,
                "issue_date": _serialize_date(issue_date),
                "expiry_date": _serialize_date(expiry_date),
                "approval_status": approval_status_raw,
            }

            try:
                if not employee_identifier:
                    raise ValueError("employee_identifier alanı boş")
                if not document_type_code:
                    raise ValueError("document_type_code alanı boş")

                if identifier_field == "email":
                    user_row = execute_query_one(
                        "SELECT id FROM users WHERE LOWER(email) = LOWER(%s)",
                        (employee_identifier,),
                    )
                elif identifier_field == "username":
                    user_row = execute_query_one(
                        "SELECT id FROM users WHERE LOWER(username) = LOWER(%s)",
                        (employee_identifier,),
                    )
                else:
                    user_row = execute_query_one(
                        "SELECT id FROM users WHERE LOWER(username) = LOWER(%s)",
                        (employee_identifier,),
                    )
                    if not user_row:
                        user_row = execute_query_one(
                            "SELECT id FROM users WHERE LOWER(email) = LOWER(%s)",
                            (employee_identifier,),
                        )

                if not user_row:
                    raise ValueError("Kullanıcı bulunamadı")

                matched_user_id = user_row["id"]

                document_type = execute_query_one(
                    """
                    SELECT id, code, requires_approval
                    FROM hr_document_types
                    WHERE LOWER(code) = LOWER(%s)
                    """,
                    (document_type_code,),
                )
                if not document_type:
                    raise ValueError("Doküman tipi bulunamadı")

                requirement_id = None
                req_raw = row.get("requirement_id")
                if req_raw:
                    try:
                        requirement_candidate = UUID(str(req_raw))
                        requirement_check = execute_query_one(
                            """
                            SELECT id
                            FROM hr_document_requirements
                            WHERE id = %s AND document_type_id = %s
                            """,
                            (str(requirement_candidate), str(document_type["id"])),
                        )
                        if requirement_check:
                            requirement_id = requirement_check["id"]
                    except (TypeError, ValueError):
                        requirement_id = None

                employee_doc = create_employee_document(
                    {
                        "user_id": matched_user_id,
                        "document_type_id": document_type["id"],
                        "requirement_id": requirement_id,
                        "created_by": initiated_by,
                        "updated_by": initiated_by,
                    }
                )
                generated_doc_id = employee_doc["id"]

                if not archive_map and not dry_run:
                    raise ValueError("Arşiv dosyası sağlanmadı")

                if not file_name:
                    raise ValueError("file_name alanı boş")

                lookup_name = os.path.basename(file_name).lower()
                archive_entry = archive_map.get(lookup_name) if archive_map else None
                if not archive_entry:
                    raise ValueError(f"Arşiv içinde {file_name} bulunamadı")

                if dry_run:
                    item_status = "skipped"
                    metadata["dry_run"] = True
                    success_count += 1
                    continue

                file_bytes = zip_handle.read(archive_entry) if zip_handle else b""
                if not file_bytes:
                    raise ValueError(f"{file_name} içeriği okunamadı")

                content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
                folder_path = f"hr-documents/{str(matched_user_id)}/{document_type['code'].lower()}/"
                make_folder(client, target_bucket, folder_path)

                base_name, ext = os.path.splitext(os.path.basename(file_name))
                safe_base = secure_filename(base_name) or "document"
                unique_name = f"{safe_base}_{uuid4().hex[:8]}{ext.lower()}"
                object_key = f"{folder_path}{unique_name}"

                client.put_object(
                    Bucket=target_bucket,
                    Key=object_key,
                    Body=file_bytes,
                    ContentType=content_type,
                )

                file_rows = execute_write(
                    """
                    INSERT INTO files (
                        bucket,
                        object_key,
                        filename,
                        file_type,
                        file_size,
                        ref_type,
                        ref_id,
                        uploaded_by,
                        checksum,
                        folder_path,
                        content_type
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s)
                    RETURNING *
                    """,
                    (
                        target_bucket,
                        object_key,
                        os.path.basename(file_name),
                        content_type,
                        len(file_bytes),
                        "hr_employee_document",
                        str(generated_doc_id),
                        str(initiated_by) if initiated_by else None,
                        folder_path,
                        content_type,
                    ),
                )
                file_record = file_rows[0]

                version = create_document_version(
                    generated_doc_id,
                    file_record["id"],
                    uploaded_by=initiated_by,
                    checksum=None,
                    metadata={
                        "source": "import",
                        "import_job_id": str(job_id),
                        "original_filename": file_name,
                        "issue_date": _serialize_date(issue_date),
                        "expiry_date": _serialize_date(expiry_date),
                    },
                    valid_from=issue_date,
                    valid_until=expiry_date,
                )

                generated_version_id = version["id"]

                if approval_status_raw in ("approved", "active") and initiated_by:
                    approve_document_version(
                        generated_version_id,
                        initiated_by,
                        approval_note="Import auto approval",
                        valid_from=issue_date,
                        valid_until=expiry_date,
                    )
                elif approval_status_raw in ("rejected",) and initiated_by:
                    reject_document_version(
                        generated_version_id,
                        initiated_by,
                        rejection_note="Import marked as rejected",
                    )

                success_count += 1
            except Exception as row_exc:
                item_status = "failed"
                error_message = str(row_exc)
                failure_count += 1
            finally:
                execute_write(
                    """
                    INSERT INTO hr_document_import_items (
                        import_job_id,
                        line_number,
                        employee_identifier,
                        document_type_code,
                        requirement_id,
                        matched_user_id,
                        status,
                        error_message,
                        generated_document_id,
                        generated_version_id,
                        metadata
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        str(job_id),
                        idx,
                        employee_identifier,
                        document_type_code,
                        str(requirement_id) if requirement_id else None,
                        str(matched_user_id) if matched_user_id else None,
                        item_status,
                        error_message,
                        str(generated_doc_id) if generated_doc_id else None,
                        str(generated_version_id) if generated_version_id else None,
                        metadata,
                    ),
                )

        final_status = "completed" if failure_count == 0 else "completed"
        if success_count == 0 and failure_count > 0:
            final_status = "failed"

        summary.update(
            {
                "last_run_at": datetime.utcnow().isoformat(),
                "last_run_by": str(initiated_by) if initiated_by else None,
                "success_count": success_count,
                "failure_count": failure_count,
            }
        )

        rows = execute_write(
            """
            UPDATE hr_document_import_jobs
               SET status = %s,
                   total_records = %s,
                   processed_records = %s,
                   success_count = %s,
                   failure_count = %s,
                   summary = %s,
                   completed_at = NOW()
             WHERE id = %s
             RETURNING *
            """,
            (
                final_status,
                total_records,
                processed,
                success_count,
                failure_count,
                summary,
                str(job_id),
            ),
        )

        return rows[0] if rows else job
    except Exception as exc:
        summary.update(
            {
                "last_error": str(exc),
                "last_run_at": datetime.utcnow().isoformat(),
                "last_run_by": str(initiated_by) if initiated_by else None,
                "success_count": success_count,
                "failure_count": failure_count,
            }
        )
        execute_write(
            """
            UPDATE hr_document_import_jobs
               SET status = 'failed',
                   total_records = %s,
                   processed_records = %s,
                   success_count = %s,
                   failure_count = %s,
                   summary = %s,
                   error_log = %s,
                   completed_at = NOW()
             WHERE id = %s
            """,
            (
                total_records,
                processed,
                success_count,
                failure_count,
                summary,
                str(exc),
                str(job_id),
            ),
        )
        raise
    finally:
        if zip_handle:
            zip_handle.close()
def get_primary_role_code(user_id: UUID) -> Optional[str]:
    if not user_id:
        return None

    row = execute_query_one(
        """
        SELECT r.code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s
        ORDER BY ur.is_primary DESC, ur.assigned_at DESC
        LIMIT 1
        """,
        (str(user_id),),
    )
    if row and row.get("code"):
        return row["code"]

    fallback = execute_query_one(
        """
        SELECT role
        FROM users
        WHERE id = %s
        """,
        (str(user_id),),
    )
    return fallback["role"] if fallback and fallback.get("role") else None
