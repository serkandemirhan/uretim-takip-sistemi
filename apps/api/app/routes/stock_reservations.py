"""
Stock Reservations API Routes
Handles material reservations for jobs with planned usage dates
"""

from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, permission_required
from app.models.database import execute_query, execute_write
import uuid

stock_reservations_bp = Blueprint('stock_reservations', __name__, url_prefix='/api/stock-reservations')

# =====================================================
# GET ALL RESERVATIONS (with filters)
# =====================================================
@stock_reservations_bp.route('', methods=['GET'])
@token_required
@permission_required('stocks', 'view')
def get_reservations():
    """Get all stock reservations with optional filters"""
    try:
        job_id = request.args.get('job_id')
        stock_id = request.args.get('stock_id')
        status = request.args.get('status')
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')

        query = """
            SELECT
                sr.*,
                j.job_number, j.title as job_title, j.status as job_status,
                s.product_code as stock_code, s.product_name as stock_name,
                s.unit, s.category,
                u_created.full_name as created_by_name,
                u_cancelled.full_name as cancelled_by_name
            FROM stock_reservations sr
            LEFT JOIN jobs j ON sr.job_id = j.id
            LEFT JOIN stocks s ON sr.stock_id = s.id
            LEFT JOIN users u_created ON sr.created_by = u_created.id
            LEFT JOIN users u_cancelled ON sr.cancelled_by = u_cancelled.id
            WHERE 1=1
        """
        params = []

        if job_id:
            query += " AND sr.job_id = %s"
            params.append(job_id)
        if stock_id:
            query += " AND sr.stock_id = %s"
            params.append(stock_id)
        if status:
            query += " AND sr.status = %s"
            params.append(status)
        if from_date:
            query += " AND sr.planned_usage_date >= %s"
            params.append(from_date)
        if to_date:
            query += " AND sr.planned_usage_date <= %s"
            params.append(to_date)

        query += " ORDER BY sr.planned_usage_date, sr.created_at DESC"

        reservations = execute_query(query, tuple(params) if params else None)

        result = []
        for res in reservations:
            result.append({
                'id': str(res['id']),
                'job_id': str(res['job_id']),
                'job_number': res.get('job_number'),
                'job_title': res.get('job_title'),
                'job_status': res.get('job_status'),
                'quotation_id': str(res['quotation_id']) if res.get('quotation_id') else None,
                'job_material_id': str(res['job_material_id']) if res.get('job_material_id') else None,
                'stock_id': str(res['stock_id']),
                'stock_code': res.get('stock_code'),
                'stock_name': res.get('stock_name'),
                'unit': res.get('unit'),
                'category': res.get('category'),
                'reserved_quantity': float(res['reserved_quantity']),
                'used_quantity': float(res['used_quantity']),
                'remaining_quantity': float(res['reserved_quantity']) - float(res['used_quantity']),
                'planned_usage_date': res['planned_usage_date'].isoformat() if res.get('planned_usage_date') else None,
                'status': res['status'],
                'notes': res.get('notes'),
                'created_by': str(res['created_by']) if res.get('created_by') else None,
                'created_by_name': res.get('created_by_name'),
                'created_at': res['created_at'].isoformat() if res.get('created_at') else None,
                'updated_at': res['updated_at'].isoformat() if res.get('updated_at') else None,
                'cancelled_at': res['cancelled_at'].isoformat() if res.get('cancelled_at') else None,
                'cancelled_by': str(res['cancelled_by']) if res.get('cancelled_by') else None,
                'cancelled_by_name': res.get('cancelled_by_name'),
                'cancellation_reason': res.get('cancellation_reason')
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =====================================================
# CREATE BULK RESERVATIONS FOR A JOB
# =====================================================
@stock_reservations_bp.route('/bulk', methods=['POST'])
@token_required
@permission_required('stocks', 'create')
def create_bulk_reservations(current_user):
    """Create multiple reservations for a job"""
    try:
        data = request.get_json()

        if not data.get('job_id'):
            return jsonify({'error': 'job_id is required'}), 400

        if not data.get('reservations') or not isinstance(data['reservations'], list):
            return jsonify({'error': 'reservations array is required'}), 400

        job_id = data['job_id']
        quotation_id = data.get('quotation_id')
        reservations_data = data['reservations']

        # Verify job exists
        job = execute_query("SELECT id, status FROM jobs WHERE id = %s", (job_id,))
        if not job:
            return jsonify({'error': 'Job not found'}), 404

        created_reservations = []

        for res_data in reservations_data:
            if not res_data.get('stock_id') or not res_data.get('reserved_quantity') or not res_data.get('planned_usage_date'):
                continue

            reservation_id = str(uuid.uuid4())

            execute_write("""
                INSERT INTO stock_reservations (
                    id, job_id, quotation_id, job_material_id, stock_id,
                    reserved_quantity, planned_usage_date, notes, created_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                reservation_id,
                job_id,
                quotation_id,
                res_data.get('job_material_id'),
                res_data['stock_id'],
                res_data['reserved_quantity'],
                res_data['planned_usage_date'],
                res_data.get('notes'),
                current_user['id']
            ))

            created_reservations.append(reservation_id)

        return jsonify({
            'message': f'{len(created_reservations)} reservations created successfully',
            'reservation_ids': created_reservations
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =====================================================
# UPDATE RESERVATION
# =====================================================
@stock_reservations_bp.route('/<uuid:reservation_id>', methods=['PATCH'])
@token_required
@permission_required('stocks', 'update')
def update_reservation(reservation_id, current_user):
    """Update a reservation (quantity, date, notes)"""
    try:
        data = request.get_json()

        reservation = execute_query(
            "SELECT status, reserved_quantity, used_quantity FROM stock_reservations WHERE id = %s",
            (str(reservation_id),)
        )

        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404

        if reservation[0]['status'] == 'fully_used':
            return jsonify({'error': 'Cannot update fully used reservation'}), 400

        update_fields = []
        params = []

        if 'reserved_quantity' in data:
            if float(data['reserved_quantity']) < float(reservation[0]['used_quantity']):
                return jsonify({'error': 'Cannot set reserved quantity below used quantity'}), 400
            update_fields.append("reserved_quantity = %s")
            params.append(data['reserved_quantity'])

        if 'planned_usage_date' in data:
            update_fields.append("planned_usage_date = %s")
            params.append(data['planned_usage_date'])

        if 'notes' in data:
            update_fields.append("notes = %s")
            params.append(data['notes'])

        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400

        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(str(reservation_id))

        query = f"UPDATE stock_reservations SET {', '.join(update_fields)} WHERE id = %s"
        execute_write(query, tuple(params))

        return jsonify({'message': 'Reservation updated successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =====================================================
# CANCEL RESERVATION
# =====================================================
@stock_reservations_bp.route('/<uuid:reservation_id>/cancel', methods=['POST'])
@token_required
@permission_required('stocks', 'delete')
def cancel_reservation(reservation_id, current_user):
    """Cancel a reservation"""
    try:
        data = request.get_json()
        cancellation_reason = data.get('reason', '') if data else ''

        reservation = execute_query("""
            SELECT sr.status, sr.used_quantity, j.status as job_status
            FROM stock_reservations sr
            JOIN jobs j ON sr.job_id = j.id
            WHERE sr.id = %s
        """, (str(reservation_id),))

        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404

        if float(reservation[0]['used_quantity']) > 0:
            return jsonify({'error': 'Cannot cancel reservation that has been partially used'}), 400

        execute_write("""
            UPDATE stock_reservations
            SET status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by = %s,
                cancellation_reason = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (current_user['id'], cancellation_reason, str(reservation_id)))

        return jsonify({'message': 'Reservation cancelled successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =====================================================
# GET RESERVATIONS FOR A JOB
# =====================================================
@stock_reservations_bp.route('/job/<uuid:job_id>', methods=['GET'])
@token_required
@permission_required('stocks', 'view')
def get_job_reservations(job_id):
    """Get all reservations for a specific job"""
    try:
        reservations = execute_query("""
            SELECT
                sr.*,
                s.product_code as stock_code,
                s.product_name as stock_name,
                s.unit,
                s.category,
                s.available_quantity,
                u.full_name as created_by_name
            FROM stock_reservations sr
            LEFT JOIN stocks s ON sr.stock_id = s.id
            LEFT JOIN users u ON sr.created_by = u.id
            WHERE sr.job_id = %s
            ORDER BY sr.planned_usage_date, sr.created_at
        """, (str(job_id),))

        result = []
        for res in reservations:
            result.append({
                'id': str(res['id']),
                'stock_id': str(res['stock_id']),
                'stock_code': res.get('stock_code'),
                'stock_name': res.get('stock_name'),
                'unit': res.get('unit'),
                'category': res.get('category'),
                'available_quantity': float(res['available_quantity']) if res.get('available_quantity') else 0,
                'reserved_quantity': float(res['reserved_quantity']),
                'used_quantity': float(res['used_quantity']),
                'remaining_quantity': float(res['reserved_quantity']) - float(res['used_quantity']),
                'planned_usage_date': res['planned_usage_date'].isoformat() if res.get('planned_usage_date') else None,
                'status': res['status'],
                'notes': res.get('notes'),
                'created_by_name': res.get('created_by_name'),
                'created_at': res['created_at'].isoformat() if res.get('created_at') else None
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =====================================================
# GET UPCOMING NEEDS (for purchasing planning)
# =====================================================
@stock_reservations_bp.route('/upcoming-needs', methods=['GET'])
@token_required
@permission_required('stocks', 'view')
def get_upcoming_needs():
    """Get upcoming material needs from the view"""
    try:
        days_ahead = request.args.get('days', 30, type=int)

        needs = execute_query("""
            SELECT *
            FROM upcoming_material_needs
            WHERE planned_usage_date <= CURRENT_DATE + INTERVAL '%s days'
            ORDER BY planned_usage_date, stock_name
        """ % days_ahead)

        result = []
        for need in needs:
            result.append({
                'planned_usage_date': need['planned_usage_date'].isoformat() if need.get('planned_usage_date') else None,
                'job_id': str(need['job_id']),
                'job_number': need.get('job_number'),
                'job_title': need.get('job_title'),
                'job_status': need.get('job_status'),
                'stock_id': str(need['stock_id']),
                'stock_name': need.get('stock_name'),
                'stock_code': need.get('stock_code'),
                'category': need.get('category'),
                'reserved_quantity': float(need['reserved_quantity']),
                'used_quantity': float(need['used_quantity']),
                'remaining_need': float(need['remaining_need']),
                'current_physical_stock': float(need['current_physical_stock']) if need.get('current_physical_stock') else 0,
                'total_reserved': float(need['total_reserved']) if need.get('total_reserved') else 0,
                'total_on_order': float(need['total_on_order']) if need.get('total_on_order') else 0,
                'truly_available': float(need['truly_available']) if need.get('truly_available') else 0,
                'unit': need.get('unit'),
                'reservation_status': need.get('reservation_status')
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
