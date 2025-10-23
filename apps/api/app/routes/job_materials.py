from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_write, execute_query_one
from app.middleware.auth_middleware import token_required
from decimal import Decimal

job_materials_bp = Blueprint('job_materials', __name__, url_prefix='/api/jobs')

def _s(v):
    """Boş/whitespace string -> None."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s != '' else None

def _decimal(v):
    """Convert to Decimal or None."""
    if v is None or v == '':
        return None
    try:
        return Decimal(str(v))
    except:
        return None


@job_materials_bp.route('/<uuid:job_id>/materials', methods=['GET'])
@token_required
def get_job_materials(job_id):
    """İşe ait malzemeleri listele"""
    try:
        materials = execute_query("""
            SELECT
                jm.id, jm.product_id, jm.required_quantity,
                jm.allocated_quantity, jm.consumed_quantity,
                jm.unit, jm.status, jm.notes,
                jm.created_at, jm.updated_at,
                s.product_code, s.product_name, s.current_quantity as stock_quantity,
                s.reserved_quantity, s.available_quantity,
                s.category, s.unit_price, s.supplier_name
            FROM job_materials jm
            LEFT JOIN stocks s ON jm.product_id = s.id
            WHERE jm.job_id = %s
            ORDER BY jm.created_at
        """, (str(job_id),))

        data = [{
            'id': str(m['id']),
            'product_id': str(m['product_id']) if m.get('product_id') else None,
            'product_code': m.get('product_code'),
            'product_name': m.get('product_name'),
            'category': m.get('category'),
            'required_quantity': float(m['required_quantity']) if m.get('required_quantity') else 0,
            'allocated_quantity': float(m['allocated_quantity']) if m.get('allocated_quantity') else 0,
            'consumed_quantity': float(m['consumed_quantity']) if m.get('consumed_quantity') else 0,
            'remaining_quantity': float(m['required_quantity'] or 0) - float(m['consumed_quantity'] or 0),
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

        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials', methods=['POST'])
@token_required
def add_job_material(job_id):
    """İşe malzeme ekle"""
    try:
        data = request.get_json()

        # Job kontrolü
        job = execute_query_one("SELECT id FROM jobs WHERE id = %s", (str(job_id),))
        if not job:
            return jsonify({'error': 'İş bulunamadı'}), 404

        product_id = _s(data.get('product_id'))
        if not product_id:
            return jsonify({'error': 'Ürün gerekli'}), 400

        # Ürün kontrolü
        product = execute_query_one("""
            SELECT id, unit FROM stocks WHERE id = %s
        """, (product_id,))
        if not product:
            return jsonify({'error': 'Ürün bulunamadı'}), 404

        required_quantity = _decimal(data.get('required_quantity', 0))
        unit = _s(data.get('unit')) or product.get('unit', 'adet')
        notes = _s(data.get('notes'))

        # Aynı ürün zaten eklenmişse kontrol et
        existing = execute_query_one("""
            SELECT id FROM job_materials WHERE job_id = %s AND product_id = %s
        """, (str(job_id), product_id))

        if existing:
            return jsonify({'error': 'Bu ürün zaten işe eklenmiş'}), 400

        # Malzeme ekle
        jm_result = execute_write("""
            INSERT INTO job_materials
            (job_id, product_id, required_quantity, unit, notes, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
            RETURNING id
        """, (str(job_id), product_id, required_quantity, unit, notes))
        jm_id = str(jm_result[0]['id']) if jm_result else None

        return jsonify({
            'message': 'Malzeme eklendi',
            'id': jm_id
        }), 201
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials/<uuid:material_id>', methods=['PUT'])
@token_required
def update_job_material(job_id, material_id):
    """İş malzemesini güncelle"""
    try:
        data = request.get_json()

        # Malzeme kontrolü
        material = execute_query_one("""
            SELECT id, status FROM job_materials WHERE id = %s AND job_id = %s
        """, (str(material_id), str(job_id)))

        if not material:
            return jsonify({'error': 'Malzeme bulunamadı'}), 404

        required_quantity = _decimal(data.get('required_quantity'))
        notes = _s(data.get('notes'))

        execute_write("""
            UPDATE job_materials
            SET required_quantity = COALESCE(%s, required_quantity),
                notes = COALESCE(%s, notes)
            WHERE id = %s
        """, (required_quantity, notes, str(material_id)))

        return jsonify({'message': 'Malzeme güncellendi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials/<uuid:material_id>', methods=['DELETE'])
@token_required
def delete_job_material(job_id, material_id):
    """İşten malzeme sil (rezervasyonu iptal et)"""
    try:
        # Malzeme kontrolü
        material = execute_query_one("""
            SELECT id, product_id, status, consumed_quantity, allocated_quantity
            FROM job_materials
            WHERE id = %s AND job_id = %s
        """, (str(material_id), str(job_id)))

        if not material:
            return jsonify({'error': 'Malzeme bulunamadı'}), 404

        # Eğer tüketilmişse silinemesin
        if material.get('consumed_quantity') and float(material['consumed_quantity']) > 0:
            return jsonify({'error': 'Tüketilmiş malzeme silinemez'}), 400

        # Eğer rezerve edilmişse (allocated_quantity > 0), reserved_quantity'yi azalt
        allocated_qty = float(material.get('allocated_quantity') or 0)
        if allocated_qty > 0 and material.get('product_id'):
            execute_write("""
                UPDATE stocks
                SET reserved_quantity = GREATEST(0, reserved_quantity - %s)
                WHERE id = %s
            """, (allocated_qty, material['product_id']))

        execute_write("DELETE FROM job_materials WHERE id = %s", (str(material_id),))
        return jsonify({'message': 'Malzeme silindi ve rezervasyon iptal edildi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials/check-availability', methods=['POST'])
@token_required
def check_materials_availability(job_id):
    """İş için gerekli malzemelerin stok durumunu kontrol et"""
    try:
        materials = execute_query("""
            SELECT
                jm.id, jm.product_id, jm.required_quantity, jm.unit,
                s.product_code, s.product_name, s.current_quantity,
                (jm.required_quantity - COALESCE(s.current_quantity, 0)) as shortage
            FROM job_materials jm
            LEFT JOIN stocks s ON jm.product_id = s.id
            WHERE jm.job_id = %s
        """, (str(job_id),))

        availability = []
        has_shortage = False

        for m in materials:
            required = float(m['required_quantity'] or 0)
            available = float(m['current_quantity'] or 0)
            shortage = max(0, required - available)

            if shortage > 0:
                has_shortage = True

            availability.append({
                'product_id': str(m['product_id']) if m.get('product_id') else None,
                'product_code': m.get('product_code'),
                'product_name': m.get('product_name'),
                'required_quantity': required,
                'available_quantity': available,
                'shortage': shortage,
                'unit': m.get('unit', 'adet'),
                'is_available': shortage == 0
            })

        return jsonify({
            'has_shortage': has_shortage,
            'all_available': not has_shortage,
            'materials': availability
        }), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials/allocate', methods=['POST'])
@token_required
def allocate_materials(job_id):
    """İş için malzemeleri rezerve et (available_quantity azalır, reserved_quantity artar)"""
    try:
        # Önce stok kontrolü
        materials = execute_query("""
            SELECT
                jm.id, jm.product_id, jm.required_quantity,
                jm.allocated_quantity, jm.status,
                s.current_quantity, s.reserved_quantity, s.available_quantity
            FROM job_materials jm
            LEFT JOIN stocks s ON jm.product_id = s.id
            WHERE jm.job_id = %s AND jm.status = 'pending'
        """, (str(job_id),))

        # Yeterli available_quantity var mı kontrol et
        for m in materials:
            required = float(m['required_quantity'] or 0)
            already_allocated = float(m['allocated_quantity'] or 0)
            available = float(m['available_quantity'] or 0)
            needed = required - already_allocated

            if needed > available:
                return jsonify({
                    'error': f'Yetersiz kullanılabilir stok',
                    'product_id': str(m['product_id']),
                    'needed': float(needed),
                    'available': float(available)
                }), 400

        # Malzemeleri allocated olarak işaretle ve reserved_quantity artır
        for m in materials:
            required = float(m['required_quantity'] or 0)
            already_allocated = float(m['allocated_quantity'] or 0)
            needed = required - already_allocated

            if needed > 0:
                # reserved_quantity artır
                execute_write("""
                    UPDATE stocks
                    SET reserved_quantity = reserved_quantity + %s
                    WHERE id = %s
                """, (needed, m['product_id']))

                # job_materials'da allocated olarak işaretle
                execute_write("""
                    UPDATE job_materials
                    SET allocated_quantity = required_quantity,
                        status = 'allocated'
                    WHERE id = %s
                """, (m['id'],))

        return jsonify({'message': 'Malzemeler rezerve edildi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials/consume', methods=['POST'])
@token_required
def consume_materials(job_id):
    """
    İş malzemelerini tüket (stoktan düş, consumed_quantity artar)
    Body: [{"material_id": "uuid", "consumed_quantity": 10}]
    """
    try:
        data = request.get_json()
        consumptions = data.get('consumptions', [])

        for consumption in consumptions:
            material_id = _s(consumption.get('material_id'))
            consumed_qty = _decimal(consumption.get('consumed_quantity', 0))

            if not material_id or not consumed_qty or consumed_qty <= 0:
                continue

            # Malzeme bilgisi
            material = execute_query_one("""
                SELECT jm.id, jm.product_id, jm.required_quantity, jm.allocated_quantity,
                       jm.consumed_quantity, jm.unit, s.current_quantity, s.reserved_quantity
                FROM job_materials jm
                LEFT JOIN stocks s ON jm.product_id = s.id
                WHERE jm.id = %s AND jm.job_id = %s
            """, (material_id, str(job_id)))

            if not material:
                return jsonify({'error': f'Malzeme bulunamadı: {material_id}'}), 404

            # Stok kontrolü
            current_stock = float(material['current_quantity'] or 0)
            if consumed_qty > current_stock:
                return jsonify({
                    'error': 'Yetersiz stok',
                    'material_id': material_id,
                    'requested': float(consumed_qty),
                    'available': current_stock
                }), 400

            # consumed_quantity güncelle
            execute_write("""
                UPDATE job_materials
                SET consumed_quantity = consumed_quantity + %s,
                    status = CASE
                        WHEN consumed_quantity + %s >= required_quantity THEN 'consumed'
                        ELSE 'allocated'
                    END
                WHERE id = %s
            """, (consumed_qty, consumed_qty, material_id))

            # Stoktan düş (stock_movements ile)
            execute_write("""
                INSERT INTO stock_movements
                (stock_id, movement_type, quantity, job_id, purpose, notes)
                VALUES (%s, 'OUT', %s, %s, 'İş malzeme tüketimi', 'Job Materials - Otomatik tüketim')
            """, (material['product_id'], consumed_qty, str(job_id)))

            # Stok güncelle: hem current_quantity hem de reserved_quantity azalt
            execute_write("""
                UPDATE stocks
                SET current_quantity = current_quantity - %s,
                    reserved_quantity = GREATEST(0, reserved_quantity - %s)
                WHERE id = %s
            """, (consumed_qty, consumed_qty, material['product_id']))

        return jsonify({'message': 'Malzemeler tüketildi ve stok güncellendi'}), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@job_materials_bp.route('/<uuid:job_id>/materials/summary', methods=['GET'])
@token_required
def get_job_materials_summary(job_id):
    """İş malzemeleri özeti"""
    try:
        summary = execute_query_one("""
            SELECT
                COUNT(*) as total_materials,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'allocated' THEN 1 ELSE 0 END) as allocated_count,
                SUM(CASE WHEN status = 'consumed' THEN 1 ELSE 0 END) as consumed_count,
                SUM(required_quantity) as total_required,
                SUM(allocated_quantity) as total_allocated,
                SUM(consumed_quantity) as total_consumed
            FROM job_materials
            WHERE job_id = %s
        """, (str(job_id),))

        data = {
            'total_materials': int(summary['total_materials']) if summary.get('total_materials') else 0,
            'pending_count': int(summary['pending_count']) if summary.get('pending_count') else 0,
            'allocated_count': int(summary['allocated_count']) if summary.get('allocated_count') else 0,
            'consumed_count': int(summary['consumed_count']) if summary.get('consumed_count') else 0,
            'total_required': float(summary['total_required']) if summary.get('total_required') else 0,
            'total_allocated': float(summary['total_allocated']) if summary.get('total_allocated') else 0,
            'total_consumed': float(summary['total_consumed']) if summary.get('total_consumed') else 0,
            'completion_percentage': (
                (float(summary['total_consumed']) / float(summary['total_required']) * 100)
                if summary.get('total_required') and float(summary['total_required']) > 0
                else 0
            )
        }

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
