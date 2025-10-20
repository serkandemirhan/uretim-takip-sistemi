from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one
from app.middleware.auth_middleware import token_required

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')

@tasks_bp.route('', methods=['GET'])
@token_required
def get_my_tasks():
    """Kullanıcıya atanan görevleri getir"""
    try:
        user_id = request.current_user['user_id']
        
        query = """
            SELECT 
                js.*,
                j.id as job_id,
                j.job_number,
                j.title as job_title,
                j.status as job_status,
                j.due_date,
                p.id as process_id,
                p.name as process_name,
                p.code as process_code,
                m.id as machine_id,
                m.name as machine_name,
                c.name as customer_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            LEFT JOIN machines m ON js.machine_id = m.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE js.assigned_to = %s
            AND js.status IN ('ready', 'in_progress', 'completed')
            ORDER BY 
                CASE js.status
                    WHEN 'in_progress' THEN 1
                    WHEN 'ready' THEN 2
                    WHEN 'completed' THEN 3
                END,
                j.due_date ASC NULLS LAST,
                js.order_index
        """
        
        tasks = execute_query(query, (user_id,))
        
        tasks_list = []
        for task in tasks:
            tasks_list.append({
                'id': str(task['id']),
                'status': task['status'],
                'order_index': task['order_index'],
                'started_at': task['started_at'].isoformat() if task['started_at'] else None,
                'completed_at': task['completed_at'].isoformat() if task['completed_at'] else None,
                'estimated_duration': task['estimated_duration'],
                'production_quantity': float(task['production_quantity']) if task['production_quantity'] else None,
                'production_unit': task['production_unit'],
                'production_notes': task['production_notes'],
                'job': {
                    'id': str(task['job_id']),
                    'job_number': task['job_number'],
                    'title': task['job_title'],
                    'status': task['job_status'],
                    'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                    'customer_name': task['customer_name']
                },
                'process': {
                    'id': str(task['process_id']),
                    'name': task['process_name'],
                    'code': task['process_code']
                },
                'machine': {
                    'id': str(task['machine_id']) if task['machine_id'] else None,
                    'name': task['machine_name']
                } if task['machine_id'] else None
            })
        
        return jsonify({'data': tasks_list}), 200
        
    except Exception as e:
        print(f"Error getting tasks: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@tasks_bp.route('/<task_id>', methods=['GET'])
@token_required
def get_task(task_id):
    """Tek görev detayı:
       - admin/yonetici: kısıtsız
       - diğerleri: assigned_to = user
    """
    try:
        user_id = request.current_user['user_id']
        role    = request.current_user.get('role')

        base_sql = """
            SELECT 
                js.*,
                j.id as job_id,
                j.job_number,
                j.title as job_title,
                j.description as job_description,
                j.status as job_status,
                j.due_date,
                p.id as process_id,
                p.name as process_name,
                p.code as process_code,
                m.id as machine_id,
                m.name as machine_name,
                m.code as machine_code,
                c.name as customer_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            LEFT JOIN machines m ON js.machine_id = m.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE js.id = %s
        """

        params = [task_id]

        if role not in ('admin', 'yonetici'):
            base_sql += " AND js.assigned_to = %s"
            params.append(user_id)

        task = execute_query_one(base_sql, tuple(params))

        if not task:
            return jsonify({'error': 'Görev bulunamadı'}), 404

        return jsonify({
            'data': {
                'id': str(task['id']),
                'status': task['status'],
                'order_index': task['order_index'],
                'started_at': task['started_at'].isoformat() if task['started_at'] else None,
                'completed_at': task['completed_at'].isoformat() if task['completed_at'] else None,
                'estimated_duration': task['estimated_duration'],
                'production_quantity': float(task['production_quantity']) if task['production_quantity'] else None,
                'production_unit': task['production_unit'],
                'production_notes': task['production_notes'],
                'job': {
                    'id': str(task['job_id']),
                    'job_number': task['job_number'],
                    'title': task['job_title'],
                    'description': task['job_description'],
                    'status': task['job_status'],
                    'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                    'customer_name': task['customer_name']
                },
                'process': {
                    'id': str(task['process_id']),
                    'name': task['process_name'],
                    'code': task['process_code']
                },
                'machine': {
                    'id': str(task['machine_id']) if task['machine_id'] else None,
                    'name': task['machine_name'],
                    'code': task['machine_code']
                } if task['machine_id'] else None
            }
        }), 200

    except Exception as e:
        print(f"Error getting task: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


    
@tasks_bp.route('/history', methods=['GET'])
@token_required
def get_production_history():
    """Kullanıcının üretim geçmişi"""
    try:
        user_id = request.current_user['user_id']
        
        # Query params
        limit = request.args.get('limit', 50, type=int)
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        
        query = """
            SELECT 
                js.id,
                js.started_at,
                js.completed_at,
                js.production_quantity,
                js.production_unit,
                js.production_notes,
                js.estimated_duration,
                j.id as job_id,
                j.job_number,
                j.title as job_title,
                p.name as process_name,
                p.code as process_code,
                m.name as machine_name,
                c.name as customer_name,
                EXTRACT(EPOCH FROM (js.completed_at - js.started_at))/60 as actual_duration_minutes
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            LEFT JOIN machines m ON js.machine_id = m.id
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE js.assigned_to = %s
            AND js.status = 'completed'
        """
        
        params = [user_id]
        
        if date_from:
            query += " AND js.completed_at >= %s"
            params.append(date_from)
        
        if date_to:
            query += " AND js.completed_at <= %s"
            params.append(date_to + ' 23:59:59')
        
        query += " ORDER BY js.completed_at DESC LIMIT %s"
        params.append(limit)
        
        history = execute_query(query, tuple(params))
        
        history_list = []
        for item in history:
            history_list.append({
                'id': str(item['id']),
                'started_at': item['started_at'].isoformat() if item['started_at'] else None,
                'completed_at': item['completed_at'].isoformat() if item['completed_at'] else None,
                'production_quantity': float(item['production_quantity']) if item['production_quantity'] else None,
                'production_unit': item['production_unit'],
                'production_notes': item['production_notes'],
                'estimated_duration': item['estimated_duration'],
                'actual_duration_minutes': round(item['actual_duration_minutes']) if item['actual_duration_minutes'] else None,
                'job': {
                    'id': str(item['job_id']),
                    'job_number': item['job_number'],
                    'title': item['job_title']
                },
                'process': {
                    'name': item['process_name'],
                    'code': item['process_code']
                },
                'machine_name': item['machine_name'],
                'customer_name': item['customer_name']
            })
        
        return jsonify({'data': history_list}), 200
        
    except Exception as e:
        print(f"Error getting production history: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@tasks_bp.route('/stats', methods=['GET'])
@token_required
def get_production_stats():
    """Kullanıcının üretim istatistikleri"""
    try:
        user_id = request.current_user['user_id']
        
        # Son 30 gün
        query = """
            SELECT 
                COUNT(*) as total_completed,
                SUM(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) as total_hours,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes,
                COUNT(DISTINCT job_id) as total_jobs
            FROM job_steps
            WHERE assigned_to = %s
            AND status = 'completed'
            AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
        """
        
        stats = execute_query_one(query, (user_id,))
        
        # Süreç bazlı dağılım
        process_query = """
            SELECT 
                p.name as process_name,
                COUNT(*) as count
            FROM job_steps js
            JOIN processes p ON js.process_id = p.id
            WHERE js.assigned_to = %s
            AND js.status = 'completed'
            AND js.completed_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY p.name
            ORDER BY count DESC
        """
        
        process_stats = execute_query(process_query, (user_id,))
        
        return jsonify({
            'data': {
                'total_completed': stats['total_completed'] if stats else 0,
                'total_hours': round(float(stats['total_hours']), 1) if stats and stats['total_hours'] else 0,
                'avg_duration_minutes': round(float(stats['avg_duration_minutes'])) if stats and stats['avg_duration_minutes'] else 0,
                'total_jobs': stats['total_jobs'] if stats else 0,
                'by_process': [
                    {
                        'process_name': p['process_name'],
                        'count': p['count']
                    }
                    for p in process_stats
                ]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@tasks_bp.route('/performance', methods=['GET'])
@token_required
def get_performance_metrics():
    """Gelişmiş performans metrikleri (Dashboard için)"""
    try:
        user_id = request.current_user['user_id']
        period = request.args.get('period', '30')  # 7, 30, 90 gün

        # Toplam istatistikler
        stats_query = """
            SELECT
                COUNT(*) as total_completed,
                SUM(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) as total_hours,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes,
                COUNT(DISTINCT job_id) as total_jobs,
                SUM(production_quantity) as total_production
            FROM job_steps
            WHERE assigned_to = %s
            AND status = 'completed'
            AND completed_at >= CURRENT_DATE - INTERVAL '%s days'
        """

        stats = execute_query_one(stats_query, (user_id, int(period)))

        # En hızlı ve en yavaş görevler
        fastest_query = """
            SELECT
                js.id,
                p.name as process_name,
                j.job_number,
                EXTRACT(EPOCH FROM (js.completed_at - js.started_at))/3600 as duration_hours
            FROM job_steps js
            JOIN processes p ON js.process_id = p.id
            JOIN jobs j ON js.job_id = j.id
            WHERE js.assigned_to = %s
            AND js.status = 'completed'
            AND js.completed_at >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY duration_hours ASC
            LIMIT 1
        """

        slowest_query = """
            SELECT
                js.id,
                p.name as process_name,
                j.job_number,
                EXTRACT(EPOCH FROM (js.completed_at - js.started_at))/3600 as duration_hours
            FROM job_steps js
            JOIN processes p ON js.process_id = p.id
            JOIN jobs j ON js.job_id = j.id
            WHERE js.assigned_to = %s
            AND js.status = 'completed'
            AND js.completed_at >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY duration_hours DESC
            LIMIT 1
        """

        fastest = execute_query_one(fastest_query, (user_id, int(period)))
        slowest = execute_query_one(slowest_query, (user_id, int(period)))

        # Trend analizi (haftalık karşılaştırma)
        trend_query = """
            SELECT
                COUNT(*) as this_period_count,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as this_period_avg
            FROM job_steps
            WHERE assigned_to = %s
            AND status = 'completed'
            AND completed_at >= CURRENT_DATE - INTERVAL '%s days'
        """

        previous_trend_query = """
            SELECT
                COUNT(*) as prev_period_count,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as prev_period_avg
            FROM job_steps
            WHERE assigned_to = %s
            AND status = 'completed'
            AND completed_at >= CURRENT_DATE - INTERVAL '%s days'
            AND completed_at < CURRENT_DATE - INTERVAL '%s days'
        """

        this_period = execute_query_one(trend_query, (user_id, int(period)))
        prev_period = execute_query_one(previous_trend_query, (user_id, int(period) * 2, int(period)))

        # Trend hesaplama
        speed_trend = None
        if this_period and prev_period and prev_period.get('prev_period_avg'):
            this_avg = float(this_period.get('this_period_avg', 0))
            prev_avg = float(prev_period.get('prev_period_avg', 0))
            if prev_avg > 0:
                speed_trend = round(((prev_avg - this_avg) / prev_avg) * 100, 1)  # Pozitif = daha hızlı

        # Başarı oranı (estimated vs actual)
        success_query = """
            SELECT
                COUNT(*) FILTER (WHERE
                    estimated_duration IS NOT NULL AND
                    EXTRACT(EPOCH FROM (completed_at - started_at))/60 <= estimated_duration
                )::float / NULLIF(COUNT(*), 0) * 100 as success_rate
            FROM job_steps
            WHERE assigned_to = %s
            AND status = 'completed'
            AND completed_at >= CURRENT_DATE - INTERVAL '%s days'
            AND estimated_duration IS NOT NULL
        """

        success = execute_query_one(success_query, (user_id, int(period)))

        return jsonify({
            'data': {
                'total_completed': stats['total_completed'] if stats else 0,
                'total_hours': round(float(stats['total_hours']), 1) if stats and stats['total_hours'] else 0,
                'avg_duration_minutes': round(float(stats['avg_duration_minutes'])) if stats and stats['avg_duration_minutes'] else 0,
                'total_jobs': stats['total_jobs'] if stats else 0,
                'total_production': float(stats['total_production']) if stats and stats['total_production'] else 0,
                'fastest_task': {
                    'process_name': fastest['process_name'],
                    'job_number': fastest['job_number'],
                    'duration_hours': round(float(fastest['duration_hours']), 1)
                } if fastest else None,
                'slowest_task': {
                    'process_name': slowest['process_name'],
                    'job_number': slowest['job_number'],
                    'duration_hours': round(float(slowest['duration_hours']), 1)
                } if slowest else None,
                'speed_trend_percentage': speed_trend,
                'success_rate': round(float(success['success_rate'])) if success and success['success_rate'] else None,
                'period_days': int(period)
            }
        }), 200

    except Exception as e:
        print(f"Error getting performance metrics: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@tasks_bp.route('', methods=['GET'])
@token_required
def list_tasks():
    """Görevleri listele:
       - admin/yonetici: tüm görevler
       - diğerleri: sadece kendisine atanmış
       Filtreler: status, job_id, customer_id
    """
    try:
        user_id = request.current_user['user_id']
        role    = request.current_user.get('role')  # auth_middleware bunu set etmeli

        status       = request.args.get('status')        # 'ready','in_progress','completed' vb.
        job_id       = request.args.get('job_id')
        customer_id  = request.args.get('customer_id')

        where = []
        params = []

        # Rol tabanlı görünürlük
        if role not in ('admin', 'yonetici'):
            where.append("js.assigned_to = %s")
            params.append(user_id)

        # Eski kısıt: sadece bu statüler
        where.append("js.status IN ('ready','in_progress','completed')")

        # Filtreler
        if status:
            where.append("js.status = %s")
            params.append(status)
        if job_id:
            where.append("js.job_id = %s")
            params.append(job_id)
        if customer_id:
            where.append("j.customer_id = %s")
            params.append(customer_id)

        where_sql = ("WHERE " + " AND ".join(where)) if where else ""

        query = f"""
            SELECT 
                js.*,
                j.id as job_id,
                j.job_number,
                j.title as job_title,
                j.status as job_status,
                j.due_date,
                p.id as process_id,
                p.name as process_name,
                p.code as process_code,
                m.id as machine_id,
                m.name as machine_name,
                c.name as customer_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            JOIN processes p ON js.process_id = p.id
            LEFT JOIN machines m ON js.machine_id = m.id
            LEFT JOIN customers c ON j.customer_id = c.id
            {where_sql}
            ORDER BY 
                CASE js.status
                    WHEN 'in_progress' THEN 1
                    WHEN 'ready' THEN 2
                    WHEN 'completed' THEN 3
                END,
                j.due_date ASC NULLS LAST,
                js.order_index
        """

        tasks = execute_query(query, tuple(params))

        tasks_list = []
        for task in tasks:
            tasks_list.append({
                'id': str(task['id']),
                'status': task['status'],
                'order_index': task['order_index'],
                'started_at': task['started_at'].isoformat() if task['started_at'] else None,
                'completed_at': task['completed_at'].isoformat() if task['completed_at'] else None,
                'estimated_duration': task['estimated_duration'],
                'production_quantity': float(task['production_quantity']) if task['production_quantity'] else None,
                'production_unit': task['production_unit'],
                'production_notes': task['production_notes'],
                'job': {
                    'id': str(task['job_id']),
                    'job_number': task['job_number'],
                    'title': task['job_title'],
                    'status': task['job_status'],
                    'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                    'customer_name': task['customer_name']
                },
                'process': {
                    'id': str(task['process_id']),
                    'name': task['process_name'],
                    'code': task['process_code']
                },
                'machine': {
                    'id': str(task['machine_id']) if task['machine_id'] else None,
                    'name': task['machine_name']
                } if task['machine_id'] else None
            })

        return jsonify({'data': tasks_list}), 200

    except Exception as e:
        print(f"Error getting tasks: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
