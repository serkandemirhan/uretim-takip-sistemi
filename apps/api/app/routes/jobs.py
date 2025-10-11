from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one
from app.middleware.auth_middleware import token_required, role_required
from datetime import datetime
import uuid
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.routes.notifications import create_notification
import json as import_json

jobs_bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

@jobs_bp.route('', methods=['GET'])
@token_required
def get_jobs():
    """İşleri listele (arama ve filtreleme ile)"""
    try:
        # Query params
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        customer_id = request.args.get('customer_id', '')
        priority = request.args.get('priority', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        query = """
            SELECT 
                j.id, j.job_number, j.title, j.description, j.status, 
                j.priority, j.due_date, j.created_at, j.revision_no,
                c.id as customer_id, c.name as customer_name,
                u.full_name as created_by_name,
                COUNT(js.id) as total_steps,
                COUNT(js.id) FILTER (WHERE js.status = 'completed') as completed_steps
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.created_by = u.id
            LEFT JOIN job_steps js ON j.id = js.job_id
            WHERE 1=1
        """
        
        params = []
        
        # Arama
        if search:
            query += """ AND (
                j.title ILIKE %s OR 
                j.job_number ILIKE %s OR 
                c.name ILIKE %s
            )"""
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern, search_pattern])
        
        # Durum filtresi
        if status:
            query += " AND j.status = %s"
            params.append(status)
        
        # Müşteri filtresi
        if customer_id:
            query += " AND j.customer_id = %s"
            params.append(customer_id)
        
        # Öncelik filtresi
        if priority:
            query += " AND j.priority = %s"
            params.append(priority)
        
        # Tarih filtresi
        if date_from:
            query += " AND j.created_at >= %s"
            params.append(date_from)
        
        if date_to:
            query += " AND j.created_at <= %s"
            params.append(date_to + ' 23:59:59')
        
        query += " GROUP BY j.id, c.id, u.full_name"
        query += " ORDER BY j.created_at DESC"
        
        # Toplam sayı
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        count_result = execute_query_one(count_query, tuple(params))
        total = count_result['total'] if count_result else 0
        
        # Pagination
        offset = (page - 1) * per_page
        query += f" LIMIT {per_page} OFFSET {offset}"
        
        jobs = execute_query(query, tuple(params))
        
        jobs_list = []
        for job in jobs:
            jobs_list.append({
                'id': str(job['id']),
                'job_number': job['job_number'],
                'title': job['title'],
                'description': job['description'],
                'status': job['status'],
                'priority': job['priority'],
                'due_date': job['due_date'].isoformat() if job['due_date'] else None,
                'created_at': job['created_at'].isoformat() if job['created_at'] else None,
                'revision_no': job['revision_no'],
                'customer_id': str(job['customer_id']) if job['customer_id'] else None,
                'customer_name': job['customer_name'],
                'created_by_name': job['created_by_name'],
                'total_steps': job['total_steps'],
                'completed_steps': job['completed_steps'],
                'progress': round((job['completed_steps'] / job['total_steps'] * 100) if job['total_steps'] > 0 else 0)
            })
        
        return jsonify({
            'data': jobs_list,
            'meta': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting jobs: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500



@jobs_bp.route('/<job_id>', methods=['GET'])
@token_required
def get_job(job_id):
    """Tek iş detayı"""
    try:
        query = """
            SELECT 
                j.*,
                c.id as customer_id, c.name as customer_name,
                u.id as created_by_id, u.full_name as created_by_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.created_by = u.id
            WHERE j.id = %s
        """
        job = execute_query_one(query, (job_id,))
        
        if not job:
            return jsonify({'error': 'İş bulunamadı'}), 404
        
        # Job steps
        steps_query = """
            SELECT 
                js.*,
                p.name as process_name, p.code as process_code,
                u.full_name as assigned_to_name,
                m.name as machine_name
            FROM job_steps js
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN users u ON js.assigned_to = u.id
            LEFT JOIN machines m ON js.machine_id = m.id
            WHERE js.job_id = %s
            ORDER BY js.order_index
        """
        steps = execute_query(steps_query, (job_id,))
        
        return jsonify({
            'data': {
                'id': str(job['id']),
                'job_number': job['job_number'],
                'title': job['title'],
                'description': job['description'],
                'status': job['status'],
                'priority': job['priority'],
                'due_date': job['due_date'].isoformat() if job['due_date'] else None,
                'revision_no': job['revision_no'],
                'created_at': job['created_at'].isoformat() if job['created_at'] else None,
                'customer': {
                    'id': str(job['customer_id']) if job['customer_id'] else None,
                    'name': job['customer_name']
                } if job['customer_id'] else None,
                'created_by': {
                    'id': str(job['created_by_id']) if job['created_by_id'] else None,
                    'name': job['created_by_name']
                } if job['created_by_id'] else None,
                'steps': [{
                    'id': str(step['id']),
                    'process': {
                        'id': str(step['process_id']),
                        'name': step['process_name'],
                        'code': step['process_code']
                    },
                    'order_index': step['order_index'],
                    'status': step['status'],
                    'assigned_to': {
                        'id': str(step['assigned_to']) if step['assigned_to'] else None,
                        'name': step['assigned_to_name']
                    } if step['assigned_to'] else None,
                    'machine': {
                        'id': str(step['machine_id']) if step['machine_id'] else None,
                        'name': step['machine_name']
                    } if step['machine_id'] else None,
                    'started_at': step['started_at'].isoformat() if step['started_at'] else None,
                    'completed_at': step['completed_at'].isoformat() if step['completed_at'] else None,
                    'production_quantity': float(step['production_quantity']) if step['production_quantity'] else None,
                    'production_unit': step['production_unit'],
                    'production_notes': step['production_notes']
                } for step in steps]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@jobs_bp.route('', methods=['POST'])
@token_required
@role_required(['yonetici', 'musteri_temsilcisi'])
def create_job():
    """Yeni iş oluştur"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        if not data.get('title'):
            return jsonify({'error': 'Başlık gerekli'}), 400
        
        # Job number oluştur
        from datetime import datetime
        year = datetime.now().year
        count_query = f"SELECT COUNT(*) as count FROM jobs WHERE job_number LIKE 'TLP-{year}-%'"
        count_result = execute_query_one(count_query)
        next_number = count_result['count'] + 1
        job_number = f"TLP-{year}-{next_number:04d}"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert job
        insert_job_query = """
            INSERT INTO jobs (job_number, customer_id, title, description, status, priority, due_date, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, job_number
        """
        
        customer_id = data.get('customer_id') if data.get('customer_id') else None
        
        params = (
            job_number,
            customer_id,
            data.get('title'),
            data.get('description'),
            'draft',  # Her zaman draft olarak başlar
            data.get('priority', 'normal'),
            data.get('due_date') if data.get('due_date') else None,
            user_id
        )
        
        cursor.execute(insert_job_query, params)
        result = cursor.fetchone()
        job_id = result['id']
        
        # Süreçleri ekle (eğer varsa)
        if data.get('steps'):
            for idx, step in enumerate(data['steps']):
                insert_step_query = """
                    INSERT INTO job_steps (
                        job_id, process_id, order_index, assigned_to, machine_id, 
                        status, is_parallel, estimated_duration
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                step_params = (
                    job_id,
                    step.get('process_id'),
                    idx,
                    step.get('assigned_to') if step.get('assigned_to') else None,
                    step.get('machine_id') if step.get('machine_id') else None,
                    'pending',  # Tüm süreçler pending başlar
                    step.get('is_parallel', False),
                    step.get('estimated_duration')
                )
                cursor.execute(insert_step_query, step_params)
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'İş başarıyla oluşturuldu',
            'data': {
                'id': str(job_id),
                'job_number': job_number
            }
        }), 201
        
    except Exception as e:
        print(f"Error creating job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/activate', methods=['POST'])
@token_required
@role_required(['yonetici'])
def activate_job(job_id):
    """İşi aktif et ve ilk süreci başlat"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # İş bilgilerini al
        cursor.execute("""
            SELECT j.id, j.title, j.job_number, j.created_by
            FROM jobs j
            WHERE j.id = %s AND j.status = 'draft'
        """, (job_id,))
        job = cursor.fetchone()
        
        if not job:
            conn.close()
            return jsonify({'error': 'İş bulunamadı veya zaten aktif'}), 400
        
        # İşi aktif et
        cursor.execute(
            "UPDATE jobs SET status = 'active' WHERE id = %s RETURNING id",
            (job_id,)
        )
        
        # İlk süreci (order_index = 0) ready yap
        cursor.execute("""
            UPDATE job_steps 
            SET status = 'ready'
            WHERE job_id = %s AND order_index = 0 AND status = 'pending'
            RETURNING id, assigned_to, process_id
        """, (job_id,))
        
        first_step = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        # Bildirim gönder
        if first_step and first_step['assigned_to']:
            create_notification(
                user_id=first_step['assigned_to'],
                title='Yeni Görev Atandı',
                message=f"{job['job_number']} - {job['title']} işi için yeni bir görev atandı.",
                notif_type='task_assigned',
                ref_type='job',
                ref_id=job_id
            )
        
        return jsonify({'message': 'İş aktif edildi, ilk süreç hazır!'}), 200
        
    except Exception as e:
        print(f"Error activating job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    
    
@jobs_bp.route('/steps/<step_id>/complete', methods=['POST'])
@token_required
def complete_step(step_id):
    """Süreci tamamla ve bir sonrakini aktif et"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Step bilgilerini al
        cursor.execute("""
            SELECT js.id, js.job_id, js.order_index, js.assigned_to,
                   j.job_number, j.title, p.name as process_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            WHERE js.id = %s
        """, (step_id,))
        
        step = cursor.fetchone()
        
        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı'}), 404
        
        # Adımı tamamla
        cursor.execute("""
            UPDATE job_steps 
            SET status = 'completed',
                completed_at = NOW(),
                production_quantity = %s,
                production_unit = %s,
                production_notes = %s
            WHERE id = %s
            RETURNING job_id, order_index
        """, (
            data.get('production_quantity'),
            data.get('production_unit'),
            data.get('production_notes'),
            step_id
        ))
        
        result = cursor.fetchone()
        job_id = result['job_id']
        current_order = result['order_index']
        
        # Bir sonraki adımı ready yap
        cursor.execute("""
            UPDATE job_steps 
            SET status = 'ready'
            WHERE job_id = %s 
            AND order_index = %s 
            AND status = 'pending'
            RETURNING id, assigned_to
        """, (job_id, current_order + 1))
        
        next_step = cursor.fetchone()
        
        # Tüm adımlar tamamlandı mı kontrol et
        cursor.execute("""
            SELECT COUNT(*) as pending_count
            FROM job_steps
            WHERE job_id = %s AND status != 'completed'
        """, (job_id,))
        
        pending_result = cursor.fetchone()
        
        # Eğer tüm adımlar tamamlandıysa işi completed yap
        if pending_result['pending_count'] == 0:
            cursor.execute("""
                UPDATE jobs 
                SET status = 'completed'
                WHERE id = %s
            """, (job_id,))
        
        conn.commit()
        conn.close()
        
        # Bildirim gönder - Bir sonraki görev sahibine
        if next_step and next_step['assigned_to']:
            create_notification(
                user_id=next_step['assigned_to'],
                title='Yeni Görev Hazır',
                message=f"{step['job_number']} - {step['title']} işi için yeni bir görev hazır.",
                notif_type='task_ready',
                ref_type='job',
                ref_id=job_id
            )
        
        return jsonify({'message': 'Süreç tamamlandı!'}), 200
        
    except Exception as e:
        print(f"Error completing step: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@jobs_bp.route('/steps/<step_id>/start', methods=['POST'])
@token_required
def start_step(step_id):
    """Süreci başlat"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Step bilgilerini al
        cursor.execute("""
            SELECT js.id, js.assigned_to, j.job_number, j.title, p.name as process_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            WHERE js.id = %s AND js.status = 'ready'
        """, (step_id,))
        
        step = cursor.fetchone()
        
        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı veya başlatılamaz'}), 400
        
        cursor.execute("""
            UPDATE job_steps 
            SET status = 'in_progress',
                started_at = NOW()
            WHERE id = %s
            RETURNING id
        """, (step_id,))
        
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        # Bildirim gönder (yöneticiye)
        # TODO: Yönetici kullanıcılarını bul ve bildir
        
        return jsonify({'message': 'Süreç başlatıldı!'}), 200
        
    except Exception as e:
        print(f"Error starting step: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/revisions', methods=['GET'])
@token_required
def get_job_revisions(job_id):
    """İşin revizyon geçmişini getir"""
    try:
        query = """
            SELECT 
                al.id,
                al.action,
                al.changes,
                al.created_at,
                u.full_name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.entity_type = 'job' 
            AND al.entity_id = %s
            ORDER BY al.created_at DESC
        """
        
        revisions = execute_query(query, (job_id,))
        
        revisions_list = []
        for rev in revisions:
            revisions_list.append({
                'id': str(rev['id']),
                'action': rev['action'],
                'changes': rev['changes'],
                'created_at': rev['created_at'].isoformat() if rev['created_at'] else None,
                'user_name': rev['user_name']
            })
        
        return jsonify({'data': revisions_list}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/revise', methods=['POST'])
@token_required
@role_required(['yonetici'])
def create_job_revision(job_id):
    """Yeni revizyon oluştur"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        if not data.get('description'):
            return jsonify({'error': 'Revizyon açıklaması gerekli'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mevcut revision_no'yu al
        cursor.execute(
            "SELECT revision_no FROM jobs WHERE id = %s",
            (job_id,)
        )
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'İş bulunamadı'}), 404
        
        new_revision_no = result['revision_no'] + 1
        
        # Job'ı güncelle
        update_fields = []
        params = []
        changes = {}
        
        # Revision no'yu her zaman artır
        update_fields.append("revision_no = %s")
        params.append(new_revision_no)
        changes['revision_no'] = {'old': result['revision_no'], 'new': new_revision_no}
        
        # Değişen alanları kontrol et
        if 'title' in data:
            update_fields.append("title = %s")
            params.append(data['title'])
            changes['title'] = {'new': data['title']}
        
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])
            changes['description'] = {'new': data['description']}
        
        if 'due_date' in data:
            update_fields.append("due_date = %s")
            params.append(data['due_date'])
            changes['due_date'] = {'new': data['due_date']}
        
        if 'priority' in data:
            update_fields.append("priority = %s")
            params.append(data['priority'])
            changes['priority'] = {'new': data['priority']}
        
        params.append(job_id)
        
        update_query = f"""
            UPDATE jobs
            SET {', '.join(update_fields)}
            WHERE id = %s
        """
        
        cursor.execute(update_query, tuple(params))
        
        # Audit log'a kaydet
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id,
            'revision_created',
            'job',
            job_id,
            import_json.dumps({
                'revision_no': new_revision_no,
                'description': data.get('description'),
                'changes': changes
            })
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': f'Revizyon {new_revision_no} oluşturuldu',
            'data': {
                'revision_no': new_revision_no
            }
        }), 201
        
    except Exception as e:
        print(f"Error creating revision: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500




@jobs_bp.route('/<job_id>', methods=['PATCH'])
@token_required
@role_required(['yonetici'])
def update_job(job_id):
    """İşi güncelle"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        update_fields = []
        params = []
        
        if 'title' in data:
            update_fields.append("title = %s")
            params.append(data['title'])
        
        if 'description' in data:
            update_fields.append("description = %s")
            params.append(data['description'])
        
        if 'customer_id' in data:
            update_fields.append("customer_id = %s")
            params.append(data['customer_id'] if data['customer_id'] else None)
        
        if 'due_date' in data:
            update_fields.append("due_date = %s")
            params.append(data['due_date'] if data['due_date'] else None)
        
        if 'priority' in data:
            update_fields.append("priority = %s")
            params.append(data['priority'])
        
        if not update_fields:
            conn.close()
            return jsonify({'error': 'Güncellenecek alan bulunamadı'}), 400
        
        params.append(job_id)
        
        update_query = f"""
            UPDATE jobs
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, title
        """
        
        cursor.execute(update_query, tuple(params))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'İş bulunamadı'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'İş başarıyla güncellendi',
            'data': {
                'id': str(result['id']),
                'title': result['title']
            }
        }), 200
        
    except Exception as e:
        print(f"Error updating job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/hold', methods=['POST'])
@token_required
@role_required(['yonetici'])
def hold_job(job_id):
    """İşi dondur (on_hold)"""
    try:
        data = request.get_json()
        reason = data.get('reason', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # İşi dondur
        cursor.execute("""
            UPDATE jobs 
            SET status = 'on_hold'
            WHERE id = %s AND status NOT IN ('completed', 'canceled')
            RETURNING id, title, job_number
        """, (job_id,))
        
        job = cursor.fetchone()
        
        if not job:
            conn.close()
            return jsonify({'error': 'İş bulunamadı veya dondurulamaz'}), 400
        
        # Tüm aktif adımları dondur
        cursor.execute("""
            UPDATE job_steps
            SET status = 'on_hold'
            WHERE job_id = %s 
            AND status IN ('ready', 'in_progress')
            RETURNING id, assigned_to
        """, (job_id,))
        
        affected_steps = cursor.fetchall()
        
        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            request.current_user['user_id'],
            'job_held',
            'job',
            job_id,
            import_json.dumps({'reason': reason})
        ))
        
        conn.commit()
        conn.close()
        
        # Bildirimleri gönder
        for step in affected_steps:
            if step['assigned_to']:
                create_notification(
                    user_id=step['assigned_to'],
                    title='İş Donduruldu',
                    message=f"{job['job_number']} - {job['title']} işi donduruldu. Sebep: {reason or 'Belirtilmedi'}",
                    notif_type='job_held',
                    ref_type='job',
                    ref_id=job_id
                )
        
        return jsonify({
            'message': 'İş donduruldu',
            'data': {
                'affected_steps': len(affected_steps)
            }
        }), 200
        
    except Exception as e:
        print(f"Error holding job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/resume', methods=['POST'])
@token_required
@role_required(['yonetici'])
def resume_job(job_id):
    """Dondurulan işi devam ettir"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # İşi aktif et
        cursor.execute("""
            UPDATE jobs 
            SET status = 'active'
            WHERE id = %s AND status = 'on_hold'
            RETURNING id, title, job_number
        """, (job_id,))
        
        job = cursor.fetchone()
        
        if not job:
            conn.close()
            return jsonify({'error': 'İş bulunamadı veya devam ettirilemez'}), 400
        
        # Dondurulmuş adımları eski durumlarına getir
        cursor.execute("""
            UPDATE job_steps
            SET status = CASE 
                WHEN started_at IS NULL THEN 'ready'
                ELSE 'in_progress'
            END
            WHERE job_id = %s 
            AND status = 'on_hold'
            RETURNING id, assigned_to
        """, (job_id,))
        
        affected_steps = cursor.fetchall()
        
        conn.commit()
        conn.close()
        
        # Bildirimleri gönder
        for step in affected_steps:
            if step['assigned_to']:
                create_notification(
                    user_id=step['assigned_to'],
                    title='İş Devam Ediyor',
                    message=f"{job['job_number']} - {job['title']} işi tekrar aktif edildi.",
                    notif_type='job_resumed',
                    ref_type='job',
                    ref_id=job_id
                )
        
        return jsonify({
            'message': 'İş devam ettirildi',
            'data': {
                'affected_steps': len(affected_steps)
            }
        }), 200
        
    except Exception as e:
        print(f"Error resuming job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/cancel', methods=['POST'])
@token_required
@role_required(['yonetici'])
def cancel_job(job_id):
    """İşi iptal et"""
    try:
        data = request.get_json()
        reason = data.get('reason', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # İşi iptal et
        cursor.execute("""
            UPDATE jobs 
            SET status = 'canceled'
            WHERE id = %s AND status NOT IN ('completed')
            RETURNING id, title, job_number
        """, (job_id,))
        
        job = cursor.fetchone()
        
        if not job:
            conn.close()
            return jsonify({'error': 'İş bulunamadı veya iptal edilemez'}), 400
        
        # Tüm tamamlanmamış adımları iptal et
        cursor.execute("""
            UPDATE job_steps
            SET status = 'canceled'
            WHERE job_id = %s 
            AND status != 'completed'
            RETURNING id, assigned_to
        """, (job_id,))
        
        affected_steps = cursor.fetchall()
        
        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            request.current_user['user_id'],
            'job_canceled',
            'job',
            job_id,
            import_json.dumps({'reason': reason})
        ))
        
        conn.commit()
        conn.close()
        
        # Bildirimleri gönder
        for step in affected_steps:
            if step['assigned_to']:
                create_notification(
                    user_id=step['assigned_to'],
                    title='İş İptal Edildi',
                    message=f"{job['job_number']} - {job['title']} işi iptal edildi. Sebep: {reason or 'Belirtilmedi'}",
                    notif_type='job_canceled',
                    ref_type='job',
                    ref_id=job_id
                )
        
        return jsonify({
            'message': 'İş iptal edildi',
            'data': {
                'affected_steps': len(affected_steps)
            }
        }), 200
        
    except Exception as e:
        print(f"Error canceling job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/steps', methods=['POST'])
@token_required
@role_required(['yonetici'])
def add_job_step(job_id):
    """İşe yeni süreç adımı ekle"""
    try:
        data = request.get_json()
        
        if not data.get('process_id'):
            return jsonify({'error': 'Süreç ID gerekli'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mevcut en yüksek order_index'i al
        cursor.execute("""
            SELECT COALESCE(MAX(order_index), -1) as max_order
            FROM job_steps
            WHERE job_id = %s
        """, (job_id,))
        
        result = cursor.fetchone()
        next_order = result['max_order'] + 1
        
        # Yeni adım ekle
        cursor.execute("""
            INSERT INTO job_steps (
                job_id, process_id, order_index, assigned_to, 
                machine_id, status, is_parallel, estimated_duration
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            job_id,
            data.get('process_id'),
            next_order,
            data.get('assigned_to'),
            data.get('machine_id'),
            'pending',
            data.get('is_parallel', False),
            data.get('estimated_duration')
        ))
        
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Süreç eklendi',
            'data': {
                'id': str(result['id'])
            }
        }), 201
        
    except Exception as e:
        print(f"Error adding step: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/steps/<step_id>', methods=['DELETE'])
@token_required
@role_required(['yonetici'])
def delete_job_step(step_id):
    """Süreç adımını sil"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Adımı sil (sadece pending veya ready olanlar)
        cursor.execute("""
            DELETE FROM job_steps
            WHERE id = %s AND status IN ('pending', 'ready')
            RETURNING id
        """, (step_id,))
        
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı veya silinemez (devam ediyor/tamamlanmış)'}), 400
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Süreç silindi'}), 200
        
    except Exception as e:
        print(f"Error deleting step: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500