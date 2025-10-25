"""
Stock Reservations API Routes
Handles material reservations for jobs with planned usage dates
"""

from flask import Blueprint, request, jsonify
from app.utils.auth import token_required, permission_required
from app.utils.db import get_db_connection
from datetime import datetime
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
        # Get query parameters for filtering
        job_id = request.args.get('job_id')
        stock_id = request.args.get('stock_id')
        status = request.args.get('status')
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')

        conn = get_db_connection()
        cursor = conn.cursor()

        # Build dynamic query
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

        cursor.execute(query, params)
        reservations = cursor.fetchall()

        result = []
        for res in reservations:
            result.append({
                'id': str(res['id']),
                'job_id': str(res['job_id']),
                'job_number': res['job_number'],
                'job_title': res['job_title'],
                'job_status': res['job_status'],
                'quotation_id': str(res['quotation_id']) if res['quotation_id'] else None,
                'job_material_id': str(res['job_material_id']) if res['job_material_id'] else None,
                'stock_id': str(res['stock_id']),
                'stock_code': res['stock_code'],
                'stock_name': res['stock_name'],
                'unit': res['unit'],
                'category': res['category'],
                'reserved_quantity': float(res['reserved_quantity']),
                'used_quantity': float(res['used_quantity']),
                'remaining_quantity': float(res['reserved_quantity']) - float(res['used_quantity']),
                'planned_usage_date': res['planned_usage_date'].isoformat() if res['planned_usage_date'] else None,
                'status': res['status'],
                'notes': res['notes'],
                'created_by': str(res['created_by']) if res['created_by'] else None,
                'created_by_name': res['created_by_name'],
                'created_at': res['created_at'].isoformat() if res['created_at'] else None,
                'updated_at': res['updated_at'].isoformat() if res['updated_at'] else None,
                'cancelled_at': res['cancelled_at'].isoformat() if res['cancelled_at'] else None,
                'cancelled_by': str(res['cancelled_by']) if res['cancelled_by'] else None,
                'cancelled_by_name': res['cancelled_by_name'],
                'cancellation_reason': res['cancellation_reason']
            })

        cursor.close()
        conn.close()

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =====================================================
# GET SINGLE RESERVATION
# =====================================================
@stock_reservations_bp.route('/<uuid:reservation_id>', methods=['GET'])
@token_required
@permission_required('stocks', 'view')
def get_reservation(reservation_id):
    """Get a single reservation by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                sr.*,
                j.job_number, j.title as job_title, j.status as job_status,
                s.product_code as stock_code, s.product_name as stock_name,
                s.unit, s.category, s.available_quantity,
                u_created.full_name as created_by_name,
                u_cancelled.full_name as cancelled_by_name
            FROM stock_reservations sr
            LEFT JOIN jobs j ON sr.job_id = j.id
            LEFT JOIN stocks s ON sr.stock_id = s.id
            LEFT JOIN users u_created ON sr.created_by = u_created.id
            LEFT JOIN users u_cancelled ON sr.cancelled_by = u_cancelled.id
            WHERE sr.id = %s
        """, (str(reservation_id),))

        res = cursor.fetchone()

        if not res:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Reservation not found'}), 404

        result = {
            'id': str(res['id']),
            'job_id': str(res['job_id']),
            'job_number': res['job_number'],
            'job_title': res['job_title'],
            'job_status': res['job_status'],
            'quotation_id': str(res['quotation_id']) if res['quotation_id'] else None,
            'job_material_id': str(res['job_material_id']) if res['job_material_id'] else None,
            'stock_id': str(res['stock_id']),
            'stock_code': res['stock_code'],
            'stock_name': res['stock_name'],
            'unit': res['unit'],
            'category': res['category'],
            'available_quantity': float(res['available_quantity']) if res['available_quantity'] else 0,
            'reserved_quantity': float(res['reserved_quantity']),
            'used_quantity': float(res['used_quantity']),
            'remaining_quantity': float(res['reserved_quantity']) - float(res['used_quantity']),
            'planned_usage_date': res['planned_usage_date'].isoformat() if res['planned_usage_date'] else None,
            'status': res['status'],
            'notes': res['notes'],
            'created_by': str(res['created_by']) if res['created_by'] else None,
            'created_by_name': res['created_by_name'],
            'created_at': res['created_at'].isoformat() if res['created_at'] else None,
            'updated_at': res['updated_at'].isoformat() if res['updated_at'] else None,
            'cancelled_at': res['cancelled_at'].isoformat() if res['cancelled_at'] else None,
            'cancelled_by': str(res['cancelled_by']) if res['cancelled_by'] else None,
            'cancelled_by_name': res['cancelled_by_name'],
            'cancellation_reason': res['cancellation_reason']
        }

        cursor.close()
        conn.close()

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
    """Create multiple reservations for a job (typically from job materials list)"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('job_id'):
            return jsonify({'error': 'job_id is required'}), 400

        if not data.get('reservations') or not isinstance(data['reservations'], list):
            return jsonify({'error': 'reservations array is required'}), 400

        job_id = data['job_id']
        quotation_id = data.get('quotation_id')
        reservations_data = data['reservations']

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify job exists
        cursor.execute("SELECT id, status FROM jobs WHERE id = %s", (job_id,))
        job = cursor.fetchone()
        if not job:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Job not found'}), 404

        created_reservations = []

        for res_data in reservations_data:
            # Validate each reservation
            if not res_data.get('stock_id') or not res_data.get('reserved_quantity') or not res_data.get('planned_usage_date'):
                continue  # Skip invalid entries

            reservation_id = str(uuid.uuid4())

            cursor.execute("""
                INSERT INTO stock_reservations (
                    id, job_id, quotation_id, job_material_id, stock_id,
                    reserved_quantity, planned_usage_date, notes, created_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
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

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': f'{len(created_reservations)} reservations created successfully',
            'reservation_ids': created_reservations
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
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

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if reservation exists and is not fully used
        cursor.execute("""
            SELECT status, reserved_quantity, used_quantity
            FROM stock_reservations
            WHERE id = %s
        """, (str(reservation_id),))

        reservation = cursor.fetchone()
        if not reservation:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Reservation not found'}), 404

        if reservation['status'] == 'fully_used':
            cursor.close()
            conn.close()
            return jsonify({'error': 'Cannot update fully used reservation'}), 400

        # Build update query dynamically
        update_fields = []
        params = []

        if 'reserved_quantity' in data:
            # Cannot reduce below used_quantity
            if float(data['reserved_quantity']) < float(reservation['used_quantity']):
                cursor.close()
                conn.close()
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
            cursor.close()
            conn.close()
            return jsonify({'error': 'No fields to update'}), 400

        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        # Execute update
        params.append(str(reservation_id))
        query = f"""
            UPDATE stock_reservations
            SET {', '.join(update_fields)}
            WHERE id = %s
        """

        cursor.execute(query, params)
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Reservation updated successfully'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500


# =====================================================
# CANCEL RESERVATION
# =====================================================
@stock_reservations_bp.route('/<uuid:reservation_id>/cancel', methods=['POST'])
@token_required
@permission_required('stocks', 'delete')
def cancel_reservation(reservation_id, current_user):
    """Cancel a reservation (only if not used yet or job not started)"""
    try:
        data = request.get_json()
        cancellation_reason = data.get('reason', '')

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if reservation can be cancelled
        cursor.execute("""
            SELECT sr.status, sr.used_quantity, j.status as job_status
            FROM stock_reservations sr
            JOIN jobs j ON sr.job_id = j.id
            WHERE sr.id = %s
        """, (str(reservation_id),))

        reservation = cursor.fetchone()
        if not reservation:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Reservation not found'}), 404

        # Cannot cancel if already used
        if float(reservation['used_quantity']) > 0:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Cannot cancel reservation that has been partially used'}), 400

        # Update to cancelled status
        cursor.execute("""
            UPDATE stock_reservations
            SET
                status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by = %s,
                cancellation_reason = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (current_user['id'], cancellation_reason, str(reservation_id)))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Reservation cancelled successfully'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
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
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
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

        reservations = cursor.fetchall()

        result = []
        for res in reservations:
            result.append({
                'id': str(res['id']),
                'stock_id': str(res['stock_id']),
                'stock_code': res['stock_code'],
                'stock_name': res['stock_name'],
                'unit': res['unit'],
                'category': res['category'],
                'available_quantity': float(res['available_quantity']) if res['available_quantity'] else 0,
                'reserved_quantity': float(res['reserved_quantity']),
                'used_quantity': float(res['used_quantity']),
                'remaining_quantity': float(res['reserved_quantity']) - float(res['used_quantity']),
                'planned_usage_date': res['planned_usage_date'].isoformat() if res['planned_usage_date'] else None,
                'status': res['status'],
                'notes': res['notes'],
                'created_by_name': res['created_by_name'],
                'created_at': res['created_at'].isoformat() if res['created_at'] else None
            })

        cursor.close()
        conn.close()

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
    """Get upcoming material needs from the view (for purchasing manager)"""
    try:
        days_ahead = request.args.get('days', 30, type=int)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM upcoming_material_needs
            WHERE planned_usage_date <= CURRENT_DATE + INTERVAL '%s days'
            ORDER BY planned_usage_date, stock_name
        """ % days_ahead)

        needs = cursor.fetchall()

        result = []
        for need in needs:
            result.append({
                'planned_usage_date': need['planned_usage_date'].isoformat() if need['planned_usage_date'] else None,
                'job_id': str(need['job_id']),
                'job_number': need['job_number'],
                'job_title': need['job_title'],
                'job_status': need['job_status'],
                'stock_id': str(need['stock_id']),
                'stock_name': need['stock_name'],
                'stock_code': need['stock_code'],
                'category': need['category'],
                'reserved_quantity': float(need['reserved_quantity']),
                'used_quantity': float(need['used_quantity']),
                'remaining_need': float(need['remaining_need']),
                'current_physical_stock': float(need['current_physical_stock']) if need['current_physical_stock'] else 0,
                'total_reserved': float(need['total_reserved']) if need['total_reserved'] else 0,
                'total_on_order': float(need['total_on_order']) if need['total_on_order'] else 0,
                'truly_available': float(need['truly_available']) if need['truly_available'] else 0,
                'unit': need['unit'],
                'reservation_status': need['reservation_status']
            })

        cursor.close()
        conn.close()

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
