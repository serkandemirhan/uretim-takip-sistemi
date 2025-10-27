from flask import Blueprint, request, jsonify
from app.models.database import execute_query
from app.middleware.auth_middleware import token_required

job_materials_api_bp = Blueprint('job_materials_api', __name__, url_prefix='/api/job-materials')

@job_materials_api_bp.route('', methods=['GET'])
@token_required
def get_job_materials_by_query():
    """
    Get job materials by job_id query parameter
    Used by frontend: /api/job-materials?job_id=xxx
    """
    try:
        job_id = request.args.get('job_id')
        if not job_id:
            return jsonify({'error': 'job_id parameter is required'}), 400

        materials = execute_query("""
            SELECT
                jm.id,
                jm.job_id,
                jm.product_id,
                jm.required_quantity as quantity,
                jm.allocated_quantity,
                jm.consumed_quantity,
                jm.unit,
                jm.status,
                jm.notes,
                jm.created_at,
                jm.updated_at,
                s.product_code,
                s.product_name,
                s.current_quantity as stock_quantity,
                s.reserved_quantity,
                s.available_quantity,
                s.category,
                s.unit_price,
                s.supplier_name
            FROM job_materials jm
            LEFT JOIN stocks s ON jm.product_id = s.id
            WHERE jm.job_id = %s
            ORDER BY jm.created_at
        """, (str(job_id),))

        data = [{
            'id': str(m['id']),
            'job_id': str(m['job_id']),
            'product_id': str(m['product_id']) if m.get('product_id') else None,
            'product_code': m.get('product_code'),
            'product_name': m.get('product_name'),
            'category': m.get('category'),
            'quantity': float(m['quantity']) if m.get('quantity') else 0,
            'required_quantity': float(m['quantity']) if m.get('quantity') else 0,
            'allocated_quantity': float(m['allocated_quantity']) if m.get('allocated_quantity') else 0,
            'consumed_quantity': float(m['consumed_quantity']) if m.get('consumed_quantity') else 0,
            'remaining_quantity': float(m['quantity'] or 0) - float(m['consumed_quantity'] or 0),
            'unit': m.get('unit', 'adet'),
            'status': m.get('status'),
            'stock_quantity': float(m['stock_quantity']) if m.get('stock_quantity') else 0,
            'reserved_quantity': float(m['reserved_quantity']) if m.get('reserved_quantity') else 0,
            'available_quantity': float(m['available_quantity']) if m.get('available_quantity') else 0,
            'unit_price': float(m['unit_price']) if m.get('unit_price') else 0,
            'supplier_name': m.get('supplier_name'),
            'notes': m.get('notes'),
            'created_at': m['created_at'].isoformat() if m.get('created_at') else None,
            'updated_at': m['updated_at'].isoformat() if m.get('updated_at') else None,
        } for m in materials]

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
