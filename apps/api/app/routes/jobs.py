from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection, release_db_connection
from app.middleware.auth_middleware import token_required, role_required, permission_required
from datetime import datetime
import uuid
from app.routes.notifications import create_notification
import json as import_json

jobs_bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

@jobs_bp.route('', methods=['GET'])
@token_required
@permission_required('jobs', 'view')
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
        def safe_int(value, default):
            """Convert query param to int, fallback to default on invalid input."""
            try:
                parsed = int(value)
                return parsed if parsed > 0 else default
            except (TypeError, ValueError):
                return default

        page = safe_int(request.args.get('page', 1), 1)
        per_page = safe_int(request.args.get('per_page', 20), 20)
        
        query = """
            SELECT 
                j.id, j.job_number, j.title, j.description, j.status, 
                j.priority, j.due_date, j.created_at, j.revision_no,
                c.id as customer_id, c.name as customer_name,
                d.id as dealer_id, d.name as dealer_name,
                u.full_name as created_by_name,
                COUNT(js.id) as total_steps,
                COUNT(js.id) FILTER (WHERE js.status = 'completed') as completed_steps
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN customer_dealers d ON j.dealer_id = d.id
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
        
        query += " GROUP BY j.id, c.id, d.id, u.full_name"
        query += " ORDER BY j.created_at DESC"
        
        # Toplam sayı
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        count_result = execute_query_one(count_query, tuple(params))
        total = count_result['total'] if count_result else 0
        
        # Pagination
        offset = (page - 1) * per_page
        query += f" LIMIT {per_page} OFFSET {offset}"
        
        jobs = execute_query(query, tuple(params))

        # PERFORMANCE OPTIMIZATION: Fetch all job steps in a single query
        # This eliminates N+1 query problem (was: 1 query per job, now: 1 query total)
        job_ids = [job['id'] for job in jobs]

        all_steps = []
        if job_ids:
            all_steps_query = """
                SELECT
                    js.job_id,
                    js.id,
                    js.process_id,
                    js.status,
                    COALESCE(js.order_index, 0) as order_index,
                    js.assigned_to,
                    js.completed_at,
                    js.production_notes,
                    js.requirements,
                    js.started_at,
                    js.due_date,
                    js.due_time,
                    p.name as process_name,
                    p.code as process_code,
                    p.description as process_description,
                    p.group_id as process_group_id,
                    pg.name as process_group_name,
                    u.full_name as assigned_to_name
                FROM job_steps js
                LEFT JOIN processes p ON js.process_id = p.id
                LEFT JOIN process_groups pg ON p.group_id = pg.id
                LEFT JOIN users u ON js.assigned_to = u.id
                WHERE js.job_id = ANY(%s::uuid[])
                ORDER BY js.job_id, COALESCE(js.order_index, 0)
            """
            try:
                all_steps = execute_query(all_steps_query, (job_ids,))
            except Exception as e:
                print(f"Error fetching all job steps: {str(e)}")
                all_steps = []

        # Group steps by job_id for fast lookup
        steps_by_job = {}
        for step in all_steps:
            job_id = step['job_id']
            if job_id not in steps_by_job:
                steps_by_job[job_id] = []
            steps_by_job[job_id].append(step)

        jobs_list = []
        for job in jobs:
            # Get pre-fetched steps for this job
            job_steps = steps_by_job.get(job['id'], [])

            jobs_list.append({
                'id': str(job['id']),
                'job_number': job['job_number'],
                'title': job['title'],
                'description': job['description'],
                'status': job['status'],
                'priority': job['priority'],
                'due_date': job['due_date'].isoformat() if job['due_date'] else None,
                'delivery_date': job['due_date'].isoformat() if job['due_date'] else None,  # Alias for due_date
                'created_at': job['created_at'].isoformat() if job['created_at'] else None,
                'revision_no': job['revision_no'],
                'customer_id': str(job['customer_id']) if job['customer_id'] else None,
                'customer_name': job['customer_name'],
                'dealer_id': str(job['dealer_id']) if job.get('dealer_id') else None,
                'dealer_name': job.get('dealer_name'),
                'created_by_name': job['created_by_name'],
                'total_steps': job['total_steps'],
                'completed_steps': job['completed_steps'],
                'progress': round((job['completed_steps'] / job['total_steps'] * 100) if job['total_steps'] > 0 else 0),
                'steps': [{
                    'id': str(step['id']),
                    'process_id': str(step['process_id']),
                    'status': step['status'],
                    'order_index': step.get('order_index', 0),
                    'due_date': step['due_date'].isoformat() if step.get('due_date') else None,
                    'due_time': step['due_time'].isoformat() if step.get('due_time') else None,
                    'process_name': step.get('process_name'),
                    'process_code': step.get('process_code'),
                    'process_description': step.get('process_description'),
                    'process_group_id': str(step['process_group_id']) if step.get('process_group_id') else None,
                    'process_group_name': step.get('process_group_name'),
                    'assigned_to': {
                        'id': str(step['assigned_to']) if step.get('assigned_to') else None,
                        'name': step.get('assigned_to_name')
                    } if step.get('assigned_to') else None,
                    'completed_at': step['completed_at'].isoformat() if step.get('completed_at') else None,
                    'production_notes': step.get('production_notes'),
                    'requirements': step.get('requirements'),
                    'started_at': step['started_at'].isoformat() if step.get('started_at') else None,
                } for step in job_steps]
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
                d.id as dealer_id, d.name as dealer_name,
                u.id as created_by_id, u.full_name as created_by_name
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN customer_dealers d ON j.dealer_id = d.id
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
                p.name as process_name, p.code as process_code, p.description as process_description,
                pg.name as process_group_name, pg.order_index as process_group_order_index,
                u.full_name as assigned_to_name,
                m.name as machine_name
            FROM job_steps js
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN process_groups pg ON p.group_id = pg.id
            LEFT JOIN users u ON js.assigned_to = u.id
            LEFT JOIN machines m ON js.machine_id = m.id
            WHERE js.job_id = %s
            ORDER BY js.order_index
        """
        steps = execute_query(steps_query, (job_id,))

        step_ids = [str(step['id']) for step in steps or []]
        notes_by_step = {}
        if step_ids:
            notes_query = """
                SELECT n.id, n.job_step_id, n.user_id, n.note, n.created_at, u.full_name AS author_name
                FROM job_step_notes n
                LEFT JOIN users u ON n.user_id = u.id
                WHERE n.job_step_id = ANY(%s::uuid[])
                ORDER BY n.created_at ASC
            """
            notes_rows = execute_query(notes_query, (step_ids,))
            for note in notes_rows or []:
                key = str(note['job_step_id'])
                notes_by_step.setdefault(key, []).append({
                    'id': str(note['id']),
                    'note': note['note'],
                    'user_id': str(note['user_id']) if note.get('user_id') else None,
                    'created_at': note['created_at'].isoformat() if note.get('created_at') else None,
                    'author_name': note.get('author_name')
                })
        
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
                'dealer': {
                    'id': str(job['dealer_id']) if job.get('dealer_id') else None,
                    'name': job.get('dealer_name')
                } if job.get('dealer_id') else None,
                'created_by': {
                    'id': str(job['created_by_id']) if job['created_by_id'] else None,
                    'name': job['created_by_name']
                } if job['created_by_id'] else None,
                'steps': [{
                    'id': str(step['id']),
                    'process': {
                        'id': str(step['process_id']),
                        'name': step['process_name'],
                        'code': step['process_code'],
                        'description': step['process_description'],
                        'group_name': step.get('process_group_name'),
                        'group_order_index': step.get('process_group_order_index')
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
                    'due_date': step['due_date'].isoformat() if step.get('due_date') else None,
                    'due_time': step['due_time'].isoformat() if step.get('due_time') else None,
                    'estimated_duration': int(step['estimated_duration']) if step.get('estimated_duration') is not None else None,
                    'started_at': step['started_at'].isoformat() if step['started_at'] else None,
                    'completed_at': step['completed_at'].isoformat() if step['completed_at'] else None,
                    'production_quantity': float(step['production_quantity']) if step['production_quantity'] else None,
                    'production_unit': step['production_unit'],
                    'production_notes': step['production_notes'],
                    'requirements': step.get('requirements'),
                    'has_production': step.get('has_production', False),
                    'required_quantity': float(step['required_quantity']) if step.get('required_quantity') else None,
                    'block_reason': step.get('block_reason'),
                    'blocked_at': step['blocked_at'].isoformat() if step.get('blocked_at') else None,
                    'status_before_block': step.get('status_before_block'),
                    'notes': notes_by_step.get(str(step['id']), [])
                } for step in steps]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@jobs_bp.route('', methods=['POST'])
@token_required
@permission_required('jobs', 'create')
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
            INSERT INTO jobs (job_number, customer_id, dealer_id, title, description, status, priority, due_date, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, job_number
        """
        
        customer_id = data.get('customer_id') if data.get('customer_id') else None
        dealer_id = data.get('dealer_id') if data.get('dealer_id') else None
        
        params = (
            job_number,
            customer_id,
            dealer_id,
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
                due_date_value = step.get('due_date')
                due_time_value = step.get('due_time')
                parsed_due_date = None
                parsed_due_time = None

                if due_date_value not in (None, '', 'null'):
                    try:
                        parsed_due_date = datetime.strptime(str(due_date_value).strip(), '%Y-%m-%d').date()
                    except ValueError:
                        conn.close()
                        return jsonify({'error': 'Adım termin tarihi geçersiz'}), 400

                if due_time_value not in (None, '', 'null'):
                    raw_time = str(due_time_value).strip()
                    try:
                        if raw_time.count(':') == 1:
                            parsed_due_time = datetime.strptime(raw_time, '%H:%M').time()
                        else:
                            parsed_due_time = datetime.strptime(raw_time, '%H:%M:%S').time()
                    except ValueError:
                        conn.close()
                        return jsonify({'error': 'Adım termin saati geçersiz'}), 400

                insert_step_query = """
                    INSERT INTO job_steps (
                        job_id, process_id, order_index, assigned_to, machine_id,
                        status, is_parallel, estimated_duration,
                        due_date, due_time, requirements
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                step_params = (
                    job_id,
                    step.get('process_id'),
                    idx,
                    step.get('assigned_to') if step.get('assigned_to') else None,
                    step.get('machine_id') if step.get('machine_id') else None,
                    'pending',  # Tüm süreçler pending başlar
                    step.get('is_parallel', False),
                    step.get('estimated_duration'),
                    parsed_due_date,
                    parsed_due_time,
                    step.get('requirements') if step.get('requirements') else None
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
        cursor.execute(
            """
            SELECT js.id, js.job_id, js.order_index, js.assigned_to,
                   j.job_number, j.title, p.name as process_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            WHERE js.id = %s
        """,
            (step_id,),
        )
        
        step = cursor.fetchone()
        
        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı'}), 404
        
        current_user = getattr(request, 'current_user', None)
        current_role = current_user.get('role') if current_user else None
        current_user_id = current_user.get('user_id') if current_user else None

        if (
            step.get('assigned_to')
            and str(step['assigned_to']) != str(current_user_id)
            and current_role != 'yonetici'
        ):
            conn.close()
            return jsonify({'error': 'Bu adımı tamamlama yetkiniz yok'}), 403

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


@jobs_bp.route('/steps/<step_id>/production', methods=['POST'])
@token_required
def add_production(step_id):
    """Devam eden sürece üretim ekle"""
    try:
        data = request.get_json()

        if not data.get('production_quantity'):
            return jsonify({'error': 'Üretim miktarı gereklidir'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Step bilgilerini al
        cursor.execute(
            """
            SELECT js.id, js.status, js.assigned_to, js.production_quantity,
                   j.job_number, j.title
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            WHERE js.id = %s
        """,
            (step_id,),
        )

        step = cursor.fetchone()

        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı'}), 404

        if step['status'] != 'in_progress':
            conn.close()
            return jsonify({'error': 'Sadece devam eden süreçlere üretim eklenebilir'}), 400

        current_user = getattr(request, 'current_user', None)
        current_role = current_user.get('role') if current_user else None
        current_user_id = current_user.get('user_id') if current_user else None

        if (
            step.get('assigned_to')
            and str(step['assigned_to']) != str(current_user_id)
            and current_role != 'yonetici'
        ):
            conn.close()
            return jsonify({'error': 'Bu adıma üretim ekleme yetkiniz yok'}), 403

        # Mevcut üretim miktarına ekle
        current_production = step.get('production_quantity') or 0
        new_production = float(data.get('production_quantity', 0))
        total_production = current_production + new_production

        # Üretim miktarını güncelle
        cursor.execute("""
            UPDATE job_steps
            SET production_quantity = %s,
                production_notes = CASE
                    WHEN production_notes IS NULL OR production_notes = '' THEN %s
                    WHEN %s IS NULL OR %s = '' THEN production_notes
                    ELSE production_notes || E'\n---\n' || %s
                END
            WHERE id = %s
        """, (
            total_production,
            data.get('production_notes'),
            data.get('production_notes'),
            data.get('production_notes'),
            data.get('production_notes'),
            step_id
        ))

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Üretim kaydedildi!',
            'total_production': total_production
        }), 200

    except Exception as e:
        print(f"Error adding production: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/steps/<step_id>/activate', methods=['POST'])
@token_required
def activate_step(step_id):
    """Beklemedeki süreci hazır statüsüne getir"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT js.id, js.status, js.assigned_to
            FROM job_steps js
            WHERE js.id = %s
            """,
            (step_id,)
        )

        step = cursor.fetchone()

        if not step:
            conn.close()
            return jsonify({'error': 'Süreç adımı bulunamadı'}), 404

        if step['status'] != 'pending':
            conn.close()
            return jsonify({'error': 'Yalnızca beklemedeki süreçler hazır duruma getirilebilir'}), 400

        current_user = getattr(request, 'current_user', None) or {}
        current_role = current_user.get('role')
        current_user_id = current_user.get('user_id')
        is_manager = current_role in ('yonetici', 'admin')
        assigned_to = step.get('assigned_to')

        if not is_manager:
            if not assigned_to or not current_user_id or str(assigned_to) != str(current_user_id):
                conn.close()
                return jsonify({'error': 'Bu adımı hazır duruma getirme yetkiniz yok'}), 403

        cursor.execute(
            """
            UPDATE job_steps
            SET status = 'ready',
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            (step_id,),
        )

        updated = cursor.fetchone()
        conn.commit()
        conn.close()

        if not updated:
            return jsonify({'error': 'Süreç güncellenemedi'}), 500

        return jsonify({'message': 'Süreç hazır duruma getirildi'}), 200

    except Exception as e:
        print(f"Error activating step: {str(e)}")
        try:
            if 'conn' in locals() and conn:
                conn.rollback()
                conn.close()
        except Exception:
            pass
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@jobs_bp.route('/steps/<step_id>/start', methods=['POST'])
@token_required
def start_step(step_id):
    """Süreci başlat"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT js.id, js.job_id, js.assigned_to, j.job_number, j.title,
                   p.name AS process_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            WHERE js.id = %s AND js.status IN ('ready', 'pending')
            """,
            (step_id,),
        )
        
        step = cursor.fetchone()
        
        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı veya başlatılamaz'}), 400
        
        current_user = getattr(request, 'current_user', None)
        current_role = current_user.get('role') if current_user else None
        current_user_id = current_user.get('user_id') if current_user else None

        if (
            step.get('assigned_to')
            and str(step['assigned_to']) != str(current_user_id)
            and current_role != 'yonetici'
        ):
            conn.close()
            return jsonify({'error': 'Bu adımı başlatma yetkiniz yok'}), 403
        
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


@jobs_bp.route('/steps/<step_id>/pause', methods=['POST'])
@token_required
def pause_step(step_id):
    """Süreci durdur (blocked)"""
    try:
        data = request.get_json() or {}
        reason = (data.get('reason') or '').strip()

        if not reason:
            return jsonify({'error': 'Durdurma sebebi gerekli'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT js.id, js.status, js.assigned_to, js.status_before_block
            FROM job_steps js
            WHERE js.id = %s
            """,
            (step_id,),
        )

        step = cursor.fetchone()

        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı'}), 404

        if step['status'] == 'blocked':
            conn.close()
            return jsonify({'error': 'Süreç zaten durdurulmuş'}), 400

        if step['status'] in ('completed', 'canceled'):
            conn.close()
            return jsonify({'error': 'Tamamlanan veya iptal edilen süreç durdurulamaz'}), 400

        current_user = getattr(request, 'current_user', None)
        current_role = current_user.get('role') if current_user else None
        current_user_id = current_user.get('user_id') if current_user else None

        if (
            step.get('assigned_to')
            and str(step['assigned_to']) != str(current_user_id)
            and current_role != 'yonetici'
        ):
            conn.close()
            return jsonify({'error': 'Bu adımı durdurma yetkiniz yok'}), 403

        previous_status = step['status_before_block'] if step.get('status_before_block') else step['status']

        cursor.execute(
            """
            UPDATE job_steps
            SET status = 'blocked',
                status_before_block = %s,
                block_reason = %s,
                blocked_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
            RETURNING job_id
            """,
            (previous_status, reason, step_id),
        )

        updated = cursor.fetchone()
        conn.commit()
        conn.close()

        if not updated:
            return jsonify({'error': 'Süreç durdurulamadı'}), 500

        return jsonify({'message': 'Süreç durduruldu'}), 200

    except Exception as e:
        print(f"Error pausing step: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/steps/<step_id>/resume', methods=['POST'])
@token_required
def resume_step(step_id):
    """Durdurulan süreci devam ettir"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT js.id, js.status, js.assigned_to, js.status_before_block
            FROM job_steps js
            WHERE js.id = %s
            """,
            (step_id,),
        )

        step = cursor.fetchone()

        if not step:
            conn.close()
            return jsonify({'error': 'Adım bulunamadı'}), 404

        if step['status'] != 'blocked':
            conn.close()
            return jsonify({'error': 'Süreç durdurulmuş değil'}), 400

        current_user = getattr(request, 'current_user', None)
        current_role = current_user.get('role') if current_user else None
        current_user_id = current_user.get('user_id') if current_user else None

        if (
            step.get('assigned_to')
            and str(step['assigned_to']) != str(current_user_id)
            and current_role != 'yonetici'
        ):
            conn.close()
            return jsonify({'error': 'Bu adımı devam ettirme yetkiniz yok'}), 403

        new_status = step.get('status_before_block') or 'ready'
        if new_status == 'blocked':
            new_status = 'ready'

        cursor.execute(
            """
            UPDATE job_steps
            SET status = %s,
                status_before_block = NULL,
                block_reason = NULL,
                blocked_at = NULL,
                updated_at = NOW()
            WHERE id = %s
            RETURNING job_id
            """,
            (new_status, step_id),
        )

        updated = cursor.fetchone()
        conn.commit()
        conn.close()

        if not updated:
            return jsonify({'error': 'Süreç güncellenemedi'}), 500

        return jsonify({'message': 'Süreç devam ettirildi'}), 200

    except Exception as e:
        print(f"Error resuming step: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/steps/<step_id>/reopen', methods=['POST'])
@token_required
def reopen_step(step_id):
    """Tamamlanan süreci yeniden aç"""
    try:
        data = request.get_json() or {}
        reason = (data.get('reason') or '').strip()
        if not reason:
            reason = 'Süreç yeniden açıldı'

        current_user = getattr(request, 'current_user', None) or {}
        user_id = current_user.get('user_id')
        current_role = current_user.get('role')
        is_manager = current_role in ('yonetici', 'admin')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT js.id, js.job_id, js.status, js.assigned_to, js.started_at, js.completed_at,
                   js.actual_duration, js.production_quantity, js.production_unit, js.production_notes,
                   j.revision_no, j.status AS job_status, j.title AS job_title,
                   j.description AS job_description, j.due_date AS job_due_date, j.priority AS job_priority
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            WHERE js.id = %s
            """,
            (step_id,),
        )

        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Süreç adımı bulunamadı'}), 404

        if row['status'] != 'completed':
            conn.close()
            return jsonify({'error': 'Sadece tamamlanan süreçler yeniden açılabilir'}), 400

        assigned_to = row.get('assigned_to')

        if not is_manager:
            if not assigned_to or not user_id or str(assigned_to) != str(user_id):
                conn.close()
                return jsonify({'error': 'Bu adımı yeniden açma yetkiniz yok'}), 403

        job_id = row['job_id']
        current_revision = row['revision_no'] or 0
        new_revision = current_revision + 1

        new_job_status = row['job_status']
        if new_job_status in ('completed', 'canceled'):
            new_job_status = 'active'

        cursor.execute(
            """
            UPDATE jobs
            SET revision_no = %s,
                status = %s
            WHERE id = %s
            RETURNING id
            """,
            (new_revision, new_job_status, job_id),
        )

        if not cursor.fetchone():
            conn.rollback()
            conn.close()
            return jsonify({'error': 'İş güncellenemedi'}), 500

        cursor.execute(
            """
            UPDATE job_steps
            SET status = 'ready',
                started_at = NULL,
                completed_at = NULL,
                actual_duration = NULL,
                production_quantity = NULL,
                production_unit = NULL,
                production_notes = NULL,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            (step_id,),
        )

        if not cursor.fetchone():
            conn.rollback()
            conn.close()
            return jsonify({'error': 'Süreç güncellenemedi'}), 500

        if user_id:
            change_payload = {
                'revision_no': new_revision,
                'reason': reason,
                'step_id': str(step_id),
                'step_status': {'old': 'completed', 'new': 'ready'},
            }

            previous_job_status = row['job_status']
            if previous_job_status != new_job_status:
                change_payload['job_status'] = {
                    'old': previous_job_status,
                    'new': new_job_status,
                }

            if row.get('completed_at'):
                change_payload['previous_completed_at'] = row['completed_at'].isoformat()

            cursor.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    'step_reopened',
                    'job',
                    job_id,
                    import_json.dumps(change_payload),
                ),
            )

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Süreç yeniden açıldı. Yeni revizyon oluşturuldu.',
            'data': {
                'revision_no': new_revision,
                'job_status': new_job_status,
            },
        }), 200

    except Exception as e:
        print(f"Error reopening step: {str(e)}")
        try:
            if 'conn' in locals() and conn:
                conn.rollback()
                conn.close()
        except Exception:
            pass
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/steps/<step_id>/notes', methods=['GET'])
@token_required
def list_step_notes(step_id):
    """Süreç notlarını listele"""
    try:
        notes_query = """
            SELECT n.id, n.note, n.created_at, u.full_name AS author_name
            FROM job_step_notes n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE n.job_step_id = %s
            ORDER BY n.created_at ASC
        """
        notes = execute_query(notes_query, (step_id,))
        return jsonify({
            'data': [
                {
                    'id': str(note['id']),
                    'note': note['note'],
                    'created_at': note['created_at'].isoformat() if note.get('created_at') else None,
                    'author_name': note.get('author_name'),
                }
                for note in notes or []
            ]
        }), 200
    except Exception as e:
        print(f"Error listing step notes: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/steps/<step_id>/notes', methods=['POST'])
@token_required
def add_step_note(step_id):
    """Süreç notu ekle"""
    try:
        data = request.get_json() or {}
        note = (data.get('note') or '').strip()
        if not note:
            return jsonify({'error': 'Not içeriği gerekli'}), 400

        current_user = getattr(request, 'current_user', None)
        user_id = current_user.get('user_id') if current_user else None
        username = current_user.get('username') if current_user else None

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO job_step_notes (job_step_id, user_id, note)
            VALUES (%s, %s, %s)
            RETURNING id, created_at
            """,
            (step_id, user_id, note),
        )
        note_row = cursor.fetchone()
        conn.commit()
        conn.close()

        # Bildirim gönder (atanan kullanıcıya)
        try:
            step_info = execute_query_one(
                """
                SELECT js.assigned_to, j.job_number, j.title, p.name AS process_name
                FROM job_steps js
                JOIN jobs j ON js.job_id = j.id
                JOIN processes p ON js.process_id = p.id
                WHERE js.id = %s
                """,
                (step_id,),
            )

            assigned_to = step_info.get('assigned_to') if step_info else None
            if assigned_to and str(assigned_to) != str(user_id):
                message = (
                    f"{step_info['job_number']} - {step_info['title']} işi için "
                    f"{step_info['process_name']} sürecine yeni bir not eklendi."
                )
                note_preview = note[:120]
                if note_preview:
                    message += f" Not: {note_preview}"
                create_notification(
                    user_id=assigned_to,
                    title='Yeni Üretim Notu',
                    message=message,
                    notif_type='info',
                    ref_type='job_step',
                    ref_id=step_id,
                )
        except Exception as notify_error:
            print(f"Warning: failed to send note notification: {notify_error}")

        return jsonify({
            'message': 'Not eklendi',
            'data': {
                'id': str(note_row['id']),
                'note': note,
                'created_at': note_row['created_at'].isoformat() if note_row.get('created_at') else None,
                'author_name': (current_user.get('full_name') or current_user.get('username')) if current_user else None,
            }
        }), 201
    except Exception as e:
        print(f"Error adding step note: {str(e)}")
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
            payload = rev['changes'] or {}
            revision_no = payload.get('revision_no')
            revision_reason = payload.get('revision_reason')
            field_changes = payload.get('changes') or {}

            revisions_list.append({
                'id': str(rev['id']),
                'action': rev['action'],
                'revision_no': revision_no,
                'revision_reason': revision_reason,
                'changes': field_changes,
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
        data = request.get_json(force=True) or {}
        user_id = request.current_user['user_id']

        revision_reason = (
            data.get('revision_reason')
            or data.get('revision_description')
            or data.get('reason')
        )
        raw_description = data.get('description')

        if not revision_reason and raw_description:
            revision_reason = raw_description

        if not revision_reason:
            return jsonify({'error': 'Revizyon açıklaması gerekli'}), 400

        job_description = data.get('job_description')
        if job_description is None and raw_description and raw_description != revision_reason:
            job_description = raw_description

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mevcut revision_no ve alanları al
        cursor.execute(
            """
            SELECT revision_no, title, description, due_date, priority
            FROM jobs
            WHERE id = %s
            """,
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
        changed_labels = []
        changes = {}
        
        current_title = result['title'] or ''
        current_description = result['description'] or ''
        current_due_date = (
            result['due_date'].strftime('%Y-%m-%d') if result['due_date'] else None
        )
        current_priority = result['priority'] or 'normal'

        # Revision no'yu her zaman artır
        update_fields.append("revision_no = %s")
        params.append(new_revision_no)
        
        # Değişen alanları kontrol et
        if 'title' in data and data['title'] is not None:
            new_title = data['title']
            if new_title != current_title:
                update_fields.append("title = %s")
                params.append(new_title)
                changes['title'] = {'old': current_title, 'new': new_title}
        
        if job_description is not None and job_description != current_description:
            update_fields.append("description = %s")
            params.append(job_description)
            changes['description'] = {
                'old': current_description,
                'new': job_description
            }
        
        if 'due_date' in data:
            new_due = data['due_date']
            if new_due in ('', None):
                new_due = None
            if new_due != current_due_date:
                update_fields.append("due_date = %s")
                params.append(new_due)
                changes['due_date'] = {
                    'old': current_due_date,
                    'new': new_due
                }
        
        if 'priority' in data and data['priority'] is not None:
            new_priority = data['priority']
            if new_priority != current_priority:
                update_fields.append("priority = %s")
                params.append(new_priority)
                changes['priority'] = {
                    'old': current_priority,
                    'new': new_priority
                }
        
        if update_fields:
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
                'revision_reason': revision_reason,
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
        
        if 'dealer_id' in data:
            update_fields.append("dealer_id = %s")
            params.append(data['dealer_id'] if data['dealer_id'] else None)
        
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


@jobs_bp.route('/steps/<step_id>', methods=['PATCH'])
@token_required
def update_job_step(step_id):
    """Süreç adımını güncelle (atanan kişi, makine, paralellik vb.)"""
    try:
        data = request.get_json(force=True) or {}

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT status, assigned_to
            FROM job_steps
            WHERE id = %s
            """,
            (step_id,)
        )
        step = cursor.fetchone()

        if not step:
            conn.close()
            return jsonify({'error': 'Süreç adımı bulunamadı'}), 404

        if step['status'] in ('completed', 'canceled'):
            conn.close()
            return jsonify({'error': 'Bu süreç adımı güncellenemez'}), 400

        current_user = getattr(request, 'current_user', None) or {}
        current_role = current_user.get('role')
        current_user_id = current_user.get('user_id')
        is_manager = current_role in ('yonetici', 'admin')
        assigned_to = step.get('assigned_to')

        if not is_manager:
            if not assigned_to or not current_user_id or str(assigned_to) != str(current_user_id):
                conn.close()
                return jsonify({'error': 'Bu işlem için yetkiniz yok'}), 403

        def _nullable(value):
            if value is None:
                return None
            if isinstance(value, str) and value.strip() == '':
                return None
            return value

        def _to_bool(value):
            if isinstance(value, bool):
                return value
            if value is None:
                return None
            return str(value).strip().lower() in ('1', 'true', 'yes', 'on')

        update_fields = []
        params = []
        changed_labels = []

        if 'process_id' in data and data.get('process_id'):
            update_fields.append("process_id = %s")
            params.append(data.get('process_id'))
            changed_labels.append('Süreç')

        if 'assigned_to' in data:
            update_fields.append("assigned_to = %s")
            params.append(_nullable(data.get('assigned_to')))
            changed_labels.append('Atanan kişi')

        if 'machine_id' in data:
            update_fields.append("machine_id = %s")
            params.append(_nullable(data.get('machine_id')))
            changed_labels.append('Makine')

        if 'is_parallel' in data:
            is_parallel = _to_bool(data.get('is_parallel'))
            if is_parallel is not None:
                update_fields.append("is_parallel = %s")
                params.append(is_parallel)
                changed_labels.append('Paralel durum')

        if 'estimated_duration' in data:
            duration = data.get('estimated_duration')
            if duration in (None, '', 'null'):
                update_fields.append("estimated_duration = %s")
                params.append(None)
            else:
                try:
                    duration_int = int(duration)
                except (TypeError, ValueError):
                    conn.close()
                    return jsonify({'error': 'estimated_duration geçersiz'}), 400
                update_fields.append("estimated_duration = %s")
                params.append(duration_int)
                changed_labels.append('Tahmini süre')

        if 'due_date' in data:
            due_date_value = data.get('due_date')
            if due_date_value in (None, '', 'null'):
                update_fields.append("due_date = %s")
                params.append(None)
            else:
                try:
                    parsed_due_date = datetime.strptime(str(due_date_value).strip(), '%Y-%m-%d').date()
                except ValueError:
                    conn.close()
                    return jsonify({'error': 'due_date geçersiz'}), 400
                update_fields.append("due_date = %s")
                params.append(parsed_due_date)
                changed_labels.append('Termin tarihi')

        if 'due_time' in data:
            due_time_value = data.get('due_time')
            if due_time_value in (None, '', 'null'):
                update_fields.append("due_time = %s")
                params.append(None)
            else:
                raw_time = str(due_time_value).strip()
                try:
                    if raw_time.count(':') == 1:
                        parsed_due_time = datetime.strptime(raw_time, '%H:%M').time()
                    else:
                        parsed_due_time = datetime.strptime(raw_time, '%H:%M:%S').time()
                except ValueError:
                    conn.close()
                    return jsonify({'error': 'due_time geçersiz'}), 400
                update_fields.append("due_time = %s")
                params.append(parsed_due_time)
                changed_labels.append('Termin saati')

        if 'order_index' in data:
            try:
                new_index = int(data.get('order_index'))
            except (TypeError, ValueError):
                conn.close()
                return jsonify({'error': 'order_index geçersiz'}), 400
            update_fields.append("order_index = %s")
            params.append(new_index)
            changed_labels.append('Sıra')

        if 'requirements' in data:
            requirements_value = data.get('requirements')
            update_fields.append("requirements = %s")
            params.append(_nullable(requirements_value))
            changed_labels.append('Şartlar')

        if 'has_production' in data:
            has_production = _to_bool(data.get('has_production'))
            if has_production is not None:
                update_fields.append("has_production = %s")
                params.append(has_production)
                changed_labels.append('Üretim takibi')

        if 'required_quantity' in data:
            required_quantity = data.get('required_quantity')
            if required_quantity in (None, '', 'null'):
                update_fields.append("required_quantity = %s")
                params.append(None)
            else:
                try:
                    required_quantity_val = float(required_quantity)
                except (TypeError, ValueError):
                    conn.close()
                    return jsonify({'error': 'required_quantity geçersiz'}), 400
                update_fields.append("required_quantity = %s")
                params.append(required_quantity_val)
                changed_labels.append('Üretim hedefi')

        if not update_fields:
            conn.close()
            return jsonify({'error': 'Güncellenecek alan bulunamadı'}), 400

        update_fields.append("updated_at = NOW()")
        params.append(step_id)

        cursor.execute(
            f"""
            UPDATE job_steps
               SET {', '.join(update_fields)}
             WHERE id = %s
             RETURNING id
            """,
            tuple(params)
        )

        result = cursor.fetchone()
        conn.commit()
        conn.close()

        if not result:
            return jsonify({'error': 'Süreç adımı güncellenemedi'}), 404

        try:
            step_info = execute_query_one(
                """
                SELECT js.assigned_to, j.job_number, j.title, p.name AS process_name
                FROM job_steps js
                JOIN jobs j ON js.job_id = j.id
                JOIN processes p ON js.process_id = p.id
                WHERE js.id = %s
                """,
                (step_id,),
            )

            if step_info:
                message_suffix = ', '.join(changed_labels) if changed_labels else 'Süreç bilgileri'
                new_assigned = step_info.get('assigned_to')

                if new_assigned and str(new_assigned) != str(current_user_id):
                    create_notification(
                        user_id=new_assigned,
                        title='Süreç Güncellendi',
                        message=(
                            f"{step_info['job_number']} - {step_info['title']} işi için "
                            f"{step_info['process_name']} süreci güncellendi ({message_suffix})."
                        ),
                        notif_type='info',
                        ref_type='job_step',
                        ref_id=step_id,
                    )

                if (
                    'assigned_to' in data
                    and assigned_to
                    and str(assigned_to) != str(new_assigned)
                    and str(assigned_to) != str(current_user_id)
                ):
                    create_notification(
                        user_id=assigned_to,
                        title='Görev Güncellendi',
                        message=(
                            f"{step_info['job_number']} - {step_info['title']} işi için "
                            f"{step_info['process_name']} sürecindeki göreviniz güncellendi veya başka bir kullanıcıya devredildi."
                        ),
                        notif_type='warning',
                        ref_type='job_step',
                        ref_id=step_id,
                    )
        except Exception as notify_error:
            print(f"Warning: failed to send update notification: {notify_error}")

        return jsonify({
            'message': 'Süreç adımı güncellendi',
            'data': {'id': str(result['id'])}
        }), 200

    except Exception as e:
        print(f"Error updating step: {str(e)}")
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

        due_date_value = data.get('due_date')
        due_time_value = data.get('due_time')
        parsed_due_date = None
        parsed_due_time = None

        if due_date_value not in (None, '', 'null'):
            try:
                parsed_due_date = datetime.strptime(str(due_date_value).strip(), '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'due_date geçersiz'}), 400

        if due_time_value not in (None, '', 'null'):
            raw_time = str(due_time_value).strip()
            try:
                if raw_time.count(':') == 1:
                    parsed_due_time = datetime.strptime(raw_time, '%H:%M').time()
                else:
                    parsed_due_time = datetime.strptime(raw_time, '%H:%M:%S').time()
            except ValueError:
                return jsonify({'error': 'due_time geçersiz'}), 400
        
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
                machine_id, status, is_parallel, estimated_duration,
                due_date, due_time, requirements
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            job_id,
            data.get('process_id'),
            next_order,
            data.get('assigned_to'),
            data.get('machine_id'),
            'pending',
            data.get('is_parallel', False),
            data.get('estimated_duration'),
            parsed_due_date,
            parsed_due_time,
            data.get('requirements') if data.get('requirements') else None
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


@jobs_bp.route('/<job_id>/material-tracking', methods=['GET'])
@token_required
def get_job_material_tracking(job_id):
    """İş için malzeme takibi: planlanan vs kullanılan malzemeler (planlı ve plansız)"""
    try:
        query = """
            WITH planned_materials AS (
                SELECT
                    qi.stock_id,
                    qi.product_code,
                    qi.product_name,
                    qi.unit,
                    SUM(qi.quantity) as planned_quantity
                FROM quotation_items qi
                JOIN quotations q ON qi.quotation_id = q.id
                WHERE q.job_id = %s
                AND q.status = 'approved'
                AND qi.stock_id IS NOT NULL
                GROUP BY qi.stock_id, qi.product_code, qi.product_name, qi.unit
            ),
            used_materials AS (
                SELECT
                    sm.stock_id,
                    SUM(sm.quantity) as used_quantity
                FROM stock_movements sm
                WHERE sm.job_id = %s
                AND sm.movement_type = 'OUT'
                GROUP BY sm.stock_id
            ),
            reserved_materials AS (
                SELECT
                    sr.stock_id,
                    SUM(sr.reserved_quantity) as reserved_quantity,
                    SUM(sr.used_quantity) as reserved_used_quantity
                FROM stock_reservations sr
                WHERE sr.job_id = %s
                AND sr.status IN ('active', 'partially_used')
                GROUP BY sr.stock_id
            ),
            all_stock_ids AS (
                SELECT stock_id FROM planned_materials
                UNION
                SELECT stock_id FROM used_materials
                UNION
                SELECT stock_id FROM reserved_materials
            )
            SELECT
                asi.stock_id,
                COALESCE(pm.product_code, s.product_code) as product_code,
                COALESCE(pm.product_name, s.product_name) as product_name,
                COALESCE(pm.unit, s.unit) as unit,
                COALESCE(pm.planned_quantity, 0) as planned_quantity,
                COALESCE(um.used_quantity, 0) as used_quantity,
                COALESCE(rm.reserved_quantity, 0) as reserved_quantity,
                COALESCE(rm.reserved_used_quantity, 0) as reserved_used_quantity,
                COALESCE(s.current_quantity, 0) as stock_current_quantity
            FROM all_stock_ids asi
            LEFT JOIN planned_materials pm ON asi.stock_id = pm.stock_id
            LEFT JOIN used_materials um ON asi.stock_id = um.stock_id
            LEFT JOIN reserved_materials rm ON asi.stock_id = rm.stock_id
            JOIN stocks s ON asi.stock_id = s.id
            ORDER BY COALESCE(pm.product_name, s.product_name)
        """

        materials = execute_query(query, (job_id, job_id, job_id))

        materials_list = []
        for material in materials:
            planned = float(material['planned_quantity'])
            used = float(material['used_quantity'])
            reserved = float(material['reserved_quantity'])
            reserved_used = float(material['reserved_used_quantity'])

            # Kalan kullanılacak miktar
            remaining = planned - used

            # Henüz kullanılmamış rezervasyon
            unused_reservation = reserved - reserved_used

            # Durum hesaplama
            if planned == 0:
                # Planlanmamış ama kullanılmış malzeme
                if used > 0:
                    status = 'unplanned'  # Plansız kullanım
                else:
                    status = 'not_started'
            elif used >= planned:
                if used > planned:
                    status = 'exceeded'  # Planlananın üzerinde kullanıldı
                else:
                    status = 'completed'  # Tam olarak planlanan kadar kullanıldı
            elif used > 0:
                status = 'in_progress'  # Kısmen kullanıldı
            else:
                status = 'not_started'  # Hiç kullanılmadı

            materials_list.append({
                'stock_id': str(material['stock_id']),
                'product_code': material['product_code'],
                'product_name': material['product_name'],
                'unit': material['unit'],
                'planned_quantity': planned,
                'used_quantity': used,
                'remaining_quantity': remaining,
                'reserved_quantity': reserved,
                'reserved_used_quantity': reserved_used,
                'unused_reservation': unused_reservation,
                'stock_current_quantity': float(material['stock_current_quantity']),
                'usage_percentage': round((used / planned * 100) if planned > 0 else 100, 1),
                'status': status
            })

        return jsonify({'data': materials_list}), 200

    except Exception as e:
        print(f"Error getting material tracking: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@jobs_bp.route('/<job_id>/timeline', methods=['GET'])
@token_required
def get_job_timeline(job_id):
    """İşin zaman çizelgeli hikayesini getir (audit_logs + job_step_notes + step transitions)"""
    try:
        # Audit logs, step notes ve step transitions'ı birleştir
        query = """
            -- Audit logs
            SELECT
                'audit' as source,
                al.created_at as timestamp,
                al.action as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                al.changes as details,
                NULL as step_id,
                NULL as process_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.entity_id = %s AND al.entity_type = 'job'

            UNION ALL

            -- Job step notes
            SELECT
                'note' as source,
                jsn.created_at as timestamp,
                'note_added' as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                jsonb_build_object('note', jsn.note) as details,
                js.id as step_id,
                p.name as process_name
            FROM job_step_notes jsn
            LEFT JOIN users u ON jsn.user_id = u.id
            LEFT JOIN job_steps js ON jsn.job_step_id = js.id
            LEFT JOIN processes p ON js.process_id = p.id
            WHERE js.job_id = %s

            UNION ALL

            -- Job level file uploads
            SELECT
                'file_uploaded' as source,
                f.created_at as timestamp,
                'file_uploaded' as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                jsonb_build_object(
                    'filename', f.filename,
                    'file_id', f.id,
                    'ref_type', f.ref_type,
                    'ref_id', f.ref_id
                ) as details,
                NULL as step_id,
                NULL as process_name
            FROM files f
            LEFT JOIN users u ON f.uploaded_by = u.id
            WHERE f.ref_type = 'job' AND f.ref_id = %s

            UNION ALL

            -- Step file uploads
            SELECT
                'file_uploaded' as source,
                f.created_at as timestamp,
                'file_uploaded' as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                jsonb_build_object(
                    'filename', f.filename,
                    'file_id', f.id,
                    'ref_type', f.ref_type,
                    'ref_id', f.ref_id
                ) as details,
                js.id as step_id,
                p.name as process_name
            FROM files f
            JOIN job_steps js ON f.ref_type = 'job_step' AND f.ref_id::uuid = js.id
            LEFT JOIN users u ON f.uploaded_by = u.id
            LEFT JOIN processes p ON js.process_id = p.id
            WHERE js.job_id = %s

            UNION ALL

            -- Step started events
            SELECT
                'step_started' as source,
                js.started_at as timestamp,
                'step_started' as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                jsonb_build_object(
                    'process', p.name,
                    'process_code', p.code,
                    'machine', m.name
                ) as details,
                js.id as step_id,
                p.name as process_name
            FROM job_steps js
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN users u ON js.assigned_to = u.id
            LEFT JOIN machines m ON js.machine_id = m.id
            WHERE js.job_id = %s AND js.started_at IS NOT NULL

            UNION ALL

            -- Step completed events
            SELECT
                'step_completed' as source,
                js.completed_at as timestamp,
                'step_completed' as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                jsonb_build_object(
                    'process', p.name,
                    'process_code', p.code,
                    'production_quantity', js.production_quantity,
                    'production_unit', js.production_unit,
                    'production_notes', js.production_notes,
                    'machine', m.name
                ) as details,
                js.id as step_id,
                p.name as process_name
            FROM job_steps js
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN users u ON js.assigned_to = u.id
            LEFT JOIN machines m ON js.machine_id = m.id
            WHERE js.job_id = %s AND js.completed_at IS NOT NULL

            UNION ALL

            -- Step blocked events
            SELECT
                'step_blocked' as source,
                js.blocked_at as timestamp,
                'step_blocked' as event_type,
                u.full_name as actor_name,
                u.username as actor_username,
                jsonb_build_object(
                    'process', p.name,
                    'process_code', p.code,
                    'block_reason', js.block_reason
                ) as details,
                js.id as step_id,
                p.name as process_name
            FROM job_steps js
            LEFT JOIN processes p ON js.process_id = p.id
            LEFT JOIN users u ON js.assigned_to = u.id
            WHERE js.job_id = %s AND js.status = 'blocked' AND js.blocked_at IS NOT NULL

            ORDER BY timestamp DESC
        """

        timeline = execute_query(
            query,
            (job_id, job_id, job_id, job_id, job_id, job_id, job_id),
        )

        timeline_list = []
        for event in timeline:
            timeline_list.append({
                'source': event['source'],
                'timestamp': event['timestamp'].isoformat() if event['timestamp'] else None,
                'event_type': event['event_type'],
                'actor_name': event['actor_name'],
                'actor_username': event['actor_username'],
                'details': event['details'] or {},
                'step_id': str(event['step_id']) if event['step_id'] else None,
                'process_name': event['process_name']
            })

        return jsonify({'data': timeline_list}), 200

    except Exception as e:
        print(f"Error getting job timeline: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
