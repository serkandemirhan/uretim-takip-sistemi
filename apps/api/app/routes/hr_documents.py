from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from uuid import UUID

from flask import Blueprint, jsonify, request
from psycopg2.errors import UniqueViolation

from app.middleware.auth_middleware import permission_required, token_required
from app.services import hr_documents as hr_service

hr_documents_bp = Blueprint("hr_documents", __name__, url_prefix="/api/hr")


def _serialize(value: Any):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


def _serialize_row(row: Dict[str, Any]):
    if not row:
        return row
    return {k: _serialize(v) for k, v in row.items()}


def _safe_uuid(val):
    if val in (None, "", "null"):
        return None
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        return None


def _parse_date(value):
    if value in (None, "", "null"):
        return None
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def _parse_datetime(value):
    if value in (None, "", "null"):
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _current_user_context() -> Dict[str, Optional[str]]:
    current_user = getattr(request, "current_user", {}) or {}
    user_id = current_user.get("user_id")
    primary_role = getattr(request, "_hr_primary_role_code", None)
    if user_id and not primary_role:
        primary_role = hr_service.get_primary_role_code(user_id)
        if not primary_role:
            primary_role = current_user.get("role")
        setattr(request, "_hr_primary_role_code", primary_role)
    elif not user_id:
        primary_role = current_user.get("role")

    return {
        "user_id": user_id,
        "role_code": primary_role,
    }


def _is_hr_employee(role_code: Optional[str]) -> bool:
    return role_code == "hr_employee"


def _is_hr_managerial(role_code: Optional[str]) -> bool:
    return role_code in {"hr_admin", "hr_manager", "hr_specialist"}


def _normalize_category_param(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = str(value).strip().upper()
    if value in ('ONBOARDING', 'OPERATIONS', 'HR_LIFECYCLE', 'OFFBOARDING'):
        return value
    return None


@hr_documents_bp.route("/document-types", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def list_document_types():
    include_inactive = (
        request.args.get("include_inactive", "false").strip().lower() == "true"
    )
    rows = hr_service.list_document_types(include_inactive=include_inactive)
    data = [_serialize_row(row) for row in rows or []]
    return jsonify({"data": data}), 200


@hr_documents_bp.route("/document-types/<uuid:document_type_id>", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def get_document_type(document_type_id):
    row = hr_service.get_document_type(document_type_id)
    if not row:
        return jsonify({"error": "Doküman tipi bulunamadı"}), 404
    return jsonify({"data": _serialize_row(row)}), 200


@hr_documents_bp.route("/document-types", methods=["POST"])
@token_required
@permission_required("hr_documents", "create")
def create_document_type():
    try:
        payload = request.get_json(force=True) or {}
        current_user = getattr(request, "current_user", {}) or {}
        creator_id = _safe_uuid(current_user.get("user_id"))
        payload["created_by"] = creator_id

        metadata_schema = payload.get("metadata_schema")
        if metadata_schema is None:
            payload["metadata_schema"] = {}
        elif not isinstance(metadata_schema, dict):
            return jsonify({"error": "metadata_schema JSON formatında olmalıdır"}), 400

        if payload.get("code"):
            payload["code"] = str(payload["code"]).strip().lower()
        if payload.get("name"):
            payload["name"] = str(payload["name"]).strip()

        if payload.get("category"):
            payload["category"] = payload["category"].strip().upper()

        if payload.get("sequence_no") in (None, ""):
            return jsonify({"error": "sequence_no alanı zorunludur"}), 400

        row = hr_service.create_document_type(payload)
        return jsonify({"data": _serialize_row(row)}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except UniqueViolation:
        return jsonify({"error": "Aynı koda sahip doküman tipi mevcut"}), 409
    except Exception as exc:
        return jsonify({"error": f"Doküman tipi oluşturulamadı: {exc}"}), 500


@hr_documents_bp.route("/document-types/<uuid:document_type_id>", methods=["PATCH"])
@token_required
@permission_required("hr_documents", "update")
def update_document_type(document_type_id):
    try:
        payload = request.get_json(force=True) or {}
        if not payload:
            return jsonify({"error": "Güncellenecek alan belirtilmedi"}), 400

        metadata_schema = payload.get("metadata_schema")
        if metadata_schema is not None and not isinstance(metadata_schema, dict):
            return jsonify({"error": "metadata_schema JSON formatında olmalıdır"}), 400

        if payload.get("category"):
            payload["category"] = payload["category"].strip().upper()

        row = hr_service.update_document_type(document_type_id, payload)
        if not row:
            return jsonify({"error": "Doküman tipi bulunamadı"}), 404
        return jsonify({"data": _serialize_row(row)}), 200
    except UniqueViolation:
        return jsonify({"error": "Aynı koda sahip doküman tipi mevcut"}), 409
    except Exception as exc:
        return jsonify({"error": f"Doküman tipi güncellenemedi: {exc}"}), 500


@hr_documents_bp.route("/document-requirements", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def list_document_requirements():
    document_type_id = request.args.get("document_type_id")
    role_id = request.args.get("role_id")

    document_uuid = _safe_uuid(document_type_id)
    if document_type_id and not document_uuid:
        return jsonify({"error": "document_type_id geçersiz"}), 400

    role_uuid = _safe_uuid(role_id)
    if role_id and not role_uuid:
        return jsonify({"error": "role_id geçersiz"}), 400

    rows = hr_service.list_document_requirements(
        document_type_id=document_uuid,
        role_id=role_uuid,
    )
    data = [_serialize_row(row) for row in rows or []]
    return jsonify({"data": data}), 200


@hr_documents_bp.route("/document-requirements", methods=["POST"])
@token_required
@permission_required("hr_documents", "create")
def create_document_requirement():
    try:
        payload = request.get_json(force=True) or {}
        context = _current_user_context()
        role_code = context.get("role_code")
        creator_id = _safe_uuid(context.get("user_id"))
        if not creator_id:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Zorunluluk kuralı oluşturma yetkiniz yok"}), 403

        payload["created_by"] = creator_id

        doc_type_uuid = _safe_uuid(payload.get("document_type_id"))
        if not doc_type_uuid:
            return jsonify({"error": "document_type_id zorunludur"}), 400
        payload["document_type_id"] = doc_type_uuid

        role_uuid = _safe_uuid(payload.get("role_id"))
        payload["role_id"] = role_uuid

        if payload.get("department_code"):
            payload["department_code"] = str(payload["department_code"]).strip()

        if payload.get("employment_type"):
            payload["employment_type"] = str(payload["employment_type"]).strip()

        applies_from = _parse_date(payload.get("applies_from"))
        applies_until = _parse_date(payload.get("applies_until"))
        payload["applies_from"] = applies_from
        payload["applies_until"] = applies_until

        row = hr_service.create_document_requirement(payload)
        return jsonify({"data": _serialize_row(row)}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except UniqueViolation:
        return jsonify({"error": "Bu kapsam için zaten bir zorunluluk kuralı mevcut"}), 409
    except Exception as exc:
        return jsonify({"error": f"Zorunluluk kuralı oluşturulamadı: {exc}"}), 500


@hr_documents_bp.route("/document-requirements/<uuid:requirement_id>", methods=["PATCH"])
@token_required
@permission_required("hr_documents", "update")
def update_document_requirement(requirement_id):
    try:
        payload = request.get_json(force=True) or {}
        if not payload:
            return jsonify({"error": "Güncellenecek alan belirtilmedi"}), 400

        context = _current_user_context()
        if not _is_hr_managerial(context.get("role_code")):
            return jsonify({"error": "Zorunluluk kuralı güncelleme yetkiniz yok"}), 403

        row = hr_service.update_document_requirement(requirement_id, payload)
        if not row:
            return jsonify({"error": "Zorunluluk kuralı bulunamadı"}), 404
        return jsonify({"data": _serialize_row(row)}), 200
    except UniqueViolation:
        return jsonify({"error": "Bu kapsam için zaten bir zorunluluk kuralı mevcut"}), 409
    except Exception as exc:
        return jsonify({"error": f"Kural güncellenemedi: {exc}"}), 500


@hr_documents_bp.route("/document-requirements/<uuid:requirement_id>", methods=["DELETE"])
@token_required
@permission_required("hr_documents", "delete")
def delete_document_requirement(requirement_id):
    try:
        context = _current_user_context()
        if not _is_hr_managerial(context.get("role_code")):
            return jsonify({"error": "Zorunluluk kuralı silme yetkiniz yok"}), 403

        result = hr_service.delete_document_requirement(requirement_id)
        if not result:
            return jsonify({"error": "Zorunluluk kuralı bulunamadı"}), 404
        return jsonify({"message": "Kural silindi"}), 200
    except Exception as exc:
        return jsonify({"error": f"Kural silinemedi: {exc}"}), 500


@hr_documents_bp.route(
    "/document-requirements/<uuid:requirement_id>/sync", methods=["POST"]
)
@token_required
@permission_required("hr_documents", "update")
def sync_document_requirement(requirement_id):
    try:
        context = _current_user_context()
        role_code = context.get("role_code")
        initiator = _safe_uuid(context.get("user_id"))
        if not initiator:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Zorunluluk senkronizasyonu için yetkiniz yok"}), 403

        result = hr_service.sync_requirement_documents(requirement_id, initiated_by=initiator)
        return jsonify({"data": result}), 200
    except ValueError as ve:
        message = str(ve)
        status_code = 404 if "bulunamadı" in message else 400
        return jsonify({"error": message}), status_code
    except Exception as exc:
        return jsonify({"error": f"Zorunluluk senkronizasyonu başarısız: {exc}"}), 500


@hr_documents_bp.route("/employee-documents", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def list_employee_documents():
    context = _current_user_context()
    current_user_id = context.get("user_id")
    role_code = context.get("role_code")

    user_id = request.args.get("user_id")
    status = request.args.get("status")
    document_type_id = request.args.get("document_type_id")
    category = request.args.get("category")

    category_normalized = _normalize_category_param(category)
    if category and not category_normalized:
        return jsonify({"error": "category geçersiz"}), 400

    doc_type_uuid = _safe_uuid(document_type_id)
    if document_type_id and not doc_type_uuid:
        return jsonify({"error": "document_type_id geçersiz"}), 400

    if _is_hr_employee(role_code):
        user_uuid = _safe_uuid(current_user_id)
        rows = hr_service.list_employee_documents(
            user_id=user_uuid,
            status=status,
            document_type_id=doc_type_uuid,
            category=category_normalized,
        )
    else:
        user_uuid = _safe_uuid(user_id)
        if user_id and not user_uuid:
            return jsonify({"error": "user_id geçersiz"}), 400

        rows = hr_service.list_employee_documents(
            user_id=user_uuid,
            status=status,
            document_type_id=doc_type_uuid,
            category=category_normalized,
        )

    data = [_serialize_row(row) for row in rows or []]
    return jsonify({"data": data}), 200


@hr_documents_bp.route("/employee-documents", methods=["POST"])
@token_required
@permission_required("hr_documents", "create")
def create_employee_document():
    try:
        payload = request.get_json(force=True) or {}
        context = _current_user_context()
        if _is_hr_employee(context.get("role_code")):
            return jsonify({"error": "Bu işlem için yetkiniz yok"}), 403

        creator = _safe_uuid(context.get("user_id"))
        payload.setdefault("created_by", creator)
        payload.setdefault("updated_by", creator)

        user_uuid = _safe_uuid(payload.get("user_id"))
        if not user_uuid:
            return jsonify({"error": "user_id zorunludur"}), 400
        payload["user_id"] = user_uuid

        doc_type_uuid = _safe_uuid(payload.get("document_type_id"))
        if not doc_type_uuid:
            return jsonify({"error": "document_type_id zorunludur"}), 400
        payload["document_type_id"] = doc_type_uuid

        requirement_id = _safe_uuid(payload.get("requirement_id"))
        if requirement_id:
            payload["requirement_id"] = requirement_id
        elif payload.get("requirement_id"):
            return jsonify({"error": "requirement_id geçersiz"}), 400

        payload["valid_from"] = _parse_date(payload.get("valid_from"))
        payload["valid_until"] = _parse_date(payload.get("valid_until"))

        row = hr_service.create_employee_document(payload)
        return jsonify({"data": _serialize_row(row)}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"Çalışan dokümanı oluşturulamadı: {exc}"}), 500


@hr_documents_bp.route("/employee-documents/<uuid:document_id>", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def get_employee_document(document_id):
    context = _current_user_context()
    current_user_id = context.get("user_id")
    role_code = context.get("role_code")

    row = hr_service.get_employee_document(document_id)
    if not row:
        return jsonify({"error": "Çalışan dokümanı bulunamadı"}), 404

    if _is_hr_employee(role_code) and current_user_id:
        if str(row.get("user_id")) != str(current_user_id):
            return jsonify({"error": "Yalnızca kendi dokümanlarınıza erişebilirsiniz"}), 403

    return jsonify({"data": _serialize_row(row)}), 200


@hr_documents_bp.route("/employee-documents/<uuid:document_id>/versions", methods=["POST"])
@token_required
@permission_required("hr_documents", "update")
def create_document_version(document_id):
    try:
        payload = request.get_json(force=True) or {}
        file_id = payload.get("file_id")
        if not file_id:
            return jsonify({"error": "file_id alanı zorunludur"}), 400

        context = _current_user_context()
        uploaded_by = context.get("user_id")
        role_code = context.get("role_code")

        employee_document = hr_service.get_employee_document(document_id)
        if not employee_document:
            return jsonify({"error": "Çalışan dokümanı bulunamadı"}), 404

        owner_id = employee_document.get("user_id")
        if _is_hr_employee(role_code):
            if not uploaded_by or str(owner_id) != str(uploaded_by):
                return jsonify({"error": "Yalnızca kendi dokümanlarınız için dosya yükleyebilirsiniz"}), 403
        elif not _is_hr_managerial(role_code) and owner_id and uploaded_by:
            # Diğer roller için: eğer standart HR rolü değilse, kendi kayıtları dışında işlem yapıyorsa engelle
            if str(owner_id) != str(uploaded_by):
                return jsonify({"error": "Bu doküman üzerinde işlem yetkiniz yok"}), 403

        valid_from = _parse_date(payload.get("valid_from"))
        valid_until = _parse_date(payload.get("valid_until"))

        metadata = payload.get("metadata")
        if metadata is not None and not isinstance(metadata, dict):
            return jsonify({"error": "metadata alanı JSON formatında olmalıdır"}), 400

        file_uuid = _safe_uuid(file_id)
        if not file_uuid:
            return jsonify({"error": "file_id geçersiz"}), 400

        uploader_uuid = _safe_uuid(uploaded_by)

        version = hr_service.create_document_version(
            document_id,
            file_uuid,
            uploaded_by=uploader_uuid,
            checksum=payload.get("checksum"),
            metadata=metadata,
            valid_from=valid_from,
            valid_until=valid_until,
        )
        return jsonify({"data": _serialize_row(version)}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"Versiyon oluşturulamadı: {exc}"}), 500


@hr_documents_bp.route("/employee-documents/cron/expiry-check", methods=["POST"])
@token_required
@permission_required("hr_documents", "update")
def run_document_expiry_check():
    try:
        payload = request.get_json(silent=True) or {}
        context = _current_user_context()
        initiator = _safe_uuid(context.get("user_id"))
        role_code = context.get("role_code")
        if not initiator:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Expiry kontrolünü çalıştırma yetkiniz yok"}), 403

        reference_date = _parse_date(payload.get("reference_date")) if payload.get("reference_date") else None
        result = hr_service.run_expiry_check(reference_date=reference_date, initiated_by=initiator)
        return jsonify({"data": result}), 200
    except Exception as exc:
        return jsonify({"error": f"Expiry kontrolü başarısız: {exc}"}), 500


@hr_documents_bp.route("/employee-documents/summary", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def get_documents_summary():
    context = _current_user_context()
    role_code = context.get("role_code")

    user_id_param = request.args.get("user_id")
    category_param = request.args.get("category")

    user_uuid = _safe_uuid(user_id_param)
    if user_id_param and not user_uuid:
        return jsonify({"error": "user_id geçersiz"}), 400

    category_normalized = _normalize_category_param(category_param)
    if category_param and not category_normalized:
        return jsonify({"error": "category geçersiz"}), 400

    if _is_hr_employee(role_code):
        summary = hr_service.summarize_employee_documents(
            user_id=_safe_uuid(context.get("user_id")),
            category=category_normalized,
        )
    else:
        summary = hr_service.summarize_employee_documents(
            user_id=user_uuid,
            category=category_normalized,
        )

    return jsonify({"data": summary}), 200


@hr_documents_bp.route("/document-versions/<uuid:version_id>/approve", methods=["POST"])
@token_required
@permission_required("hr_documents", "update")
def approve_document_version(version_id):
    try:
        payload = request.get_json(force=True) or {}
        context = _current_user_context()
        approver_id = _safe_uuid(context.get("user_id"))
        role_code = context.get("role_code")
        if not approver_id:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Bu işlem için yetkiniz yok"}), 403

        valid_from = _parse_date(payload.get("valid_from"))
        valid_until = _parse_date(payload.get("valid_until"))

        row = hr_service.approve_document_version(
            version_id,
            approver_id,
            approval_note=payload.get("note"),
            valid_from=valid_from,
            valid_until=valid_until,
        )
        return jsonify({"data": _serialize_row(row)}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"Versiyon onaylanamadı: {exc}"}), 500


@hr_documents_bp.route("/document-versions/<uuid:version_id>/reject", methods=["POST"])
@token_required
@permission_required("hr_documents", "update")
def reject_document_version(version_id):
    try:
        payload = request.get_json(force=True) or {}
        context = _current_user_context()
        approver_id = _safe_uuid(context.get("user_id"))
        role_code = context.get("role_code")
        if not approver_id:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Bu işlem için yetkiniz yok"}), 403

        row = hr_service.reject_document_version(
            version_id,
            approver_id,
            rejection_note=payload.get("note"),
        )
        return jsonify({"data": _serialize_row(row)}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"Versiyon reddedilemedi: {exc}"}), 500


@hr_documents_bp.route("/employee-documents/<uuid:document_id>/share-links", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def list_share_links(document_id):
    context = _current_user_context()
    current_user_id = context.get("user_id")
    role_code = context.get("role_code")

    employee_document = hr_service.get_employee_document(document_id)
    if not employee_document:
        return jsonify({"error": "Çalışan dokümanı bulunamadı"}), 404

    owner_id = employee_document.get("user_id")
    if _is_hr_employee(role_code) and current_user_id and str(owner_id) != str(current_user_id):
        return jsonify({"error": "Yalnızca kendi dokümanlarınıza ait bağlantıları görüntüleyebilirsiniz"}), 403

    links = hr_service.list_share_links(employee_document_id=document_id)
    data = [_serialize_row(link) for link in links or []]
    return jsonify({"data": data}), 200


@hr_documents_bp.route("/employee-documents/<uuid:document_id>/share-links", methods=["POST"])
@token_required
@permission_required("hr_documents", "create")
def create_share_link(document_id):
    try:
        payload = request.get_json(force=True) or {}
        context = _current_user_context()
        creator = _safe_uuid(context.get("user_id"))
        role_code = context.get("role_code")
        if not creator:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Paylaşım bağlantısı oluşturma yetkiniz yok"}), 403

        employee_document = hr_service.get_employee_document(document_id)
        if not employee_document:
            return jsonify({"error": "Çalışan dokümanı bulunamadı"}), 404

        expires_at = _parse_datetime(payload.get("expires_at"))
        expire_hours = payload.get("expires_in_hours")
        if not expires_at:
            hours = int(expire_hours or 72)
            expires_at = datetime.utcnow() + timedelta(hours=hours)

        allowed_roles = payload.get("allowed_roles") or []
        allowed_departments = payload.get("allowed_departments") or []
        if not isinstance(allowed_roles, list):
            return jsonify({"error": "allowed_roles liste olmalıdır"}), 400
        if not isinstance(allowed_departments, list):
            return jsonify({"error": "allowed_departments liste olmalıdır"}), 400

        link_payload = {
            "employee_document_id": document_id,
            "document_version_id": _safe_uuid(payload.get("document_version_id")),
            "expires_at": expires_at,
            "max_views": payload.get("max_views"),
            "allowed_roles": allowed_roles,
            "allowed_departments": allowed_departments,
            "created_by": creator,
        }
        row = hr_service.create_share_link(link_payload)
        return jsonify({"data": _serialize_row(row)}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"Paylaşım linki oluşturulamadı: {exc}"}), 500


@hr_documents_bp.route("/document-share-links/<uuid:share_link_id>/deactivate", methods=["POST"])
@token_required
@permission_required("hr_documents", "update")
def deactivate_share_link(share_link_id):
    try:
        context = _current_user_context()
        role_code = context.get("role_code")
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "Bu işlem için yetkiniz yok"}), 403

        link = hr_service.get_share_link(share_link_id)
        if not link:
            return jsonify({"error": "Paylaşım linki bulunamadı"}), 404

        result = hr_service.deactivate_share_link(share_link_id)
        if not result:
            return jsonify({"error": "Paylaşım linki bulunamadı veya zaten pasif"}), 404
        return jsonify({"message": "Paylaşım linki pasif hale getirildi"}), 200
    except Exception as exc:
        return jsonify({"error": f"Paylaşım linki kapatılamadı: {exc}"}), 500


@hr_documents_bp.route("/document-imports", methods=["POST"])
@token_required
@permission_required("hr_documents", "create")
def create_document_import_job():
    try:
        payload = request.get_json(force=True) or {}
        context = _current_user_context()
        role_code = context.get("role_code")
        uploader = _safe_uuid(context.get("user_id"))
        if not uploader:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "İçe aktarma işi oluşturma yetkiniz yok"}), 403

        csv_file_id = _safe_uuid(payload.get("csv_file_id"))
        if not csv_file_id:
            return jsonify({"error": "csv_file_id zorunludur"}), 400

        archive_file_id = _safe_uuid(payload.get("archive_file_id"))

        job = hr_service.create_import_job(
            {
                "csv_file_id": csv_file_id,
                "archive_file_id": archive_file_id,
                "uploaded_by": uploader,
                "source_filename": payload.get("source_filename"),
                "identifier_field": payload.get("identifier_field"),
                "delimiter": payload.get("delimiter"),
                "encoding": payload.get("encoding"),
                "document_type_code": payload.get("document_type_code"),
            }
        )
        return jsonify({"data": _serialize_row(job)}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"İçe aktarma işi oluşturulamadı: {exc}"}), 500


@hr_documents_bp.route("/document-imports", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def list_document_import_jobs():
    try:
        context = _current_user_context()
        if _is_hr_employee(context.get("role_code")):
            return jsonify({"error": "İçe aktarma işlerini görüntüleme yetkiniz yok"}), 403

        limit = request.args.get("limit")
        limit_val = 50
        if limit:
            try:
                limit_val = max(1, min(200, int(limit)))
            except ValueError:
                return jsonify({"error": "limit sayısal olmalıdır"}), 400
        rows = hr_service.list_import_jobs(limit=limit_val)
        data = [_serialize_row(row) for row in rows or []]
        return jsonify({"data": data}), 200
    except Exception as exc:
        return jsonify({"error": f"İçe aktarma işleri listelenemedi: {exc}"}), 500


@hr_documents_bp.route("/document-imports/<uuid:job_id>", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def get_document_import_job(job_id):
    try:
        context = _current_user_context()
        if _is_hr_employee(context.get("role_code")):
            return jsonify({"error": "İçe aktarma işlerini görüntüleme yetkiniz yok"}), 403

        row = hr_service.get_import_job(job_id)
        if not row:
            return jsonify({"error": "İçe aktarma işi bulunamadı"}), 404
        return jsonify({"data": _serialize_row(row)}), 200
    except Exception as exc:
        return jsonify({"error": f"İçe aktarma işi getirilemedi: {exc}"}), 500


@hr_documents_bp.route("/document-imports/<uuid:job_id>/items", methods=["GET"])
@token_required
@permission_required("hr_documents", "view")
def list_document_import_items(job_id):
    try:
        context = _current_user_context()
        if _is_hr_employee(context.get("role_code")):
            return jsonify({"error": "İçe aktarma işlerini görüntüleme yetkiniz yok"}), 403

        status = request.args.get("status")
        rows = hr_service.list_import_items(job_id, status=status)
        data = [_serialize_row(row) for row in rows or []]
        return jsonify({"data": data}), 200
    except Exception as exc:
        return jsonify({"error": f"İçe aktarma kalemleri listelenemedi: {exc}"}), 500


@hr_documents_bp.route("/document-imports/<uuid:job_id>/process", methods=["POST"])
@token_required
@permission_required("hr_documents", "update")
def process_document_import_job(job_id):
    try:
        payload = request.get_json(silent=True) or {}
        dry_run = bool(payload.get("dry_run"))
        context = _current_user_context()
        initiator = _safe_uuid(context.get("user_id"))
        role_code = context.get("role_code")
        if not initiator:
            return jsonify({"error": "Kullanıcı bilgisine ulaşılamadı"}), 401
        if not _is_hr_managerial(role_code):
            return jsonify({"error": "İçe aktarma işlemini başlatma yetkiniz yok"}), 403

        job = hr_service.process_import_job(job_id, initiated_by=initiator, dry_run=dry_run)
        return jsonify({"data": _serialize_row(job)}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": f"İçe aktarma süreci tamamlanamadı: {exc}"}), 500
