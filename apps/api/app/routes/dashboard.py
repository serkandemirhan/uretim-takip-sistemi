from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one
from app.middleware.auth_middleware import token_required, role_required
from app.utils.cache import cache_route_with_user

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
@cache_route_with_user(ttl=30)  # Cache for 30 seconds
def get_dashboard_stats():
    """Dashboard istatistiklerini getir - OPTIMIZED: Single query + caching"""
    try:
        user_id = request.current_user['user_id']
        user_role = request.current_user['role']

        # 🚀 OPTIMIZATION: Combined all stats into a single CTE-based query
        # BEFORE: 4 separate queries (jobs, tasks, machines, users)
        # AFTER: 1 query with CTEs → 4x faster!

        if user_role == 'operator':
            # Operator sees their own tasks
            combined_query = """
                WITH
                job_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
                        COUNT(*) FILTER (WHERE status = 'active') as active_count,
                        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                        COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
                        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'canceled')) as overdue_count,
                        COUNT(*) as total_count
                    FROM jobs
                ),
                task_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
                        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                        COUNT(*) as total_count
                    FROM job_steps
                    WHERE assigned_to = %s
                ),
                machine_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'active') as active_count,
                        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
                        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_count,
                        COUNT(*) as total_count,
                        COUNT(*) FILTER (WHERE EXISTS (
                            SELECT 1 FROM job_steps js
                            WHERE js.machine_id = machines.id AND js.status = 'in_progress'
                        )) as busy_count
                    FROM machines
                    WHERE is_active = true
                ),
                user_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE role = 'operator') as operator_count,
                        COUNT(*) FILTER (WHERE role = 'yonetici') as manager_count,
                        COUNT(*) as total_count
                    FROM users
                    WHERE is_active = true
                )
                SELECT
                    json_build_object(
                        'draft', COALESCE(j.draft_count, 0),
                        'active', COALESCE(j.active_count, 0),
                        'in_progress', COALESCE(j.in_progress_count, 0),
                        'completed', COALESCE(j.completed_count, 0),
                        'canceled', COALESCE(j.canceled_count, 0),
                        'overdue', COALESCE(j.overdue_count, 0),
                        'total', COALESCE(j.total_count, 0)
                    ) as jobs,
                    json_build_object(
                        'ready', COALESCE(t.ready_count, 0),
                        'in_progress', COALESCE(t.in_progress_count, 0),
                        'completed', COALESCE(t.completed_count, 0),
                        'total', COALESCE(t.total_count, 0)
                    ) as my_tasks,
                    json_build_object(
                        'active', COALESCE(m.active_count, 0),
                        'maintenance', COALESCE(m.maintenance_count, 0),
                        'inactive', COALESCE(m.inactive_count, 0),
                        'busy', COALESCE(m.busy_count, 0),
                        'total', COALESCE(m.total_count, 0)
                    ) as machines,
                    json_build_object(
                        'operators', COALESCE(u.operator_count, 0),
                        'managers', COALESCE(u.manager_count, 0),
                        'total', COALESCE(u.total_count, 0)
                    ) as users
                FROM job_stats j
                CROSS JOIN task_stats t
                CROSS JOIN machine_stats m
                CROSS JOIN user_stats u
            """
            result = execute_query_one(combined_query, (user_id,))
        else:
            # Non-operator doesn't see task stats
            combined_query = """
                WITH
                job_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
                        COUNT(*) FILTER (WHERE status = 'active') as active_count,
                        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                        COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
                        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'canceled')) as overdue_count,
                        COUNT(*) as total_count
                    FROM jobs
                ),
                machine_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'active') as active_count,
                        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
                        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_count,
                        COUNT(*) as total_count,
                        COUNT(*) FILTER (WHERE EXISTS (
                            SELECT 1 FROM job_steps js
                            WHERE js.machine_id = machines.id AND js.status = 'in_progress'
                        )) as busy_count
                    FROM machines
                    WHERE is_active = true
                ),
                user_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE role = 'operator') as operator_count,
                        COUNT(*) FILTER (WHERE role = 'yonetici') as manager_count,
                        COUNT(*) as total_count
                    FROM users
                    WHERE is_active = true
                )
                SELECT
                    json_build_object(
                        'draft', COALESCE(j.draft_count, 0),
                        'active', COALESCE(j.active_count, 0),
                        'in_progress', COALESCE(j.in_progress_count, 0),
                        'completed', COALESCE(j.completed_count, 0),
                        'canceled', COALESCE(j.canceled_count, 0),
                        'overdue', COALESCE(j.overdue_count, 0),
                        'total', COALESCE(j.total_count, 0)
                    ) as jobs,
                    json_build_object(
                        'active', COALESCE(m.active_count, 0),
                        'maintenance', COALESCE(m.maintenance_count, 0),
                        'inactive', COALESCE(m.inactive_count, 0),
                        'busy', COALESCE(m.busy_count, 0),
                        'total', COALESCE(m.total_count, 0)
                    ) as machines,
                    json_build_object(
                        'operators', COALESCE(u.operator_count, 0),
                        'managers', COALESCE(u.manager_count, 0),
                        'total', COALESCE(u.total_count, 0)
                    ) as users
                FROM job_stats j
                CROSS JOIN machine_stats m
                CROSS JOIN user_stats u
            """
            result = execute_query_one(combined_query)

        # Build response from JSON objects
        stats = {
            'jobs': result['jobs'],
            'machines': result['machines'],
            'users': result['users']
        }

        if user_role == 'operator' and 'my_tasks' in result:
            stats['my_tasks'] = result['my_tasks']

        return jsonify({'data': stats}), 200

    except Exception as e:
        print(f"Error getting dashboard stats: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@dashboard_bp.route('/recent-jobs', methods=['GET'])
@token_required
@cache_route_with_user(ttl=60)  # Cache for 60 seconds
def get_recent_jobs():
    """Son işleri getir - WITH CACHING"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        query = """
            SELECT 
                j.id, j.job_number, j.title, j.status, j.priority, 
                j.due_date, j.created_at, j.revision_no,
                c.name as customer_name,
                u.full_name as created_by_name,
                COUNT(js.id) as total_steps,
                COUNT(js.id) FILTER (WHERE js.status = 'completed') as completed_steps
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            LEFT JOIN users u ON j.created_by = u.id
            LEFT JOIN job_steps js ON j.id = js.job_id
            GROUP BY j.id, c.name, u.full_name
            ORDER BY j.created_at DESC
            LIMIT %s
        """
        
        jobs = execute_query(query, (limit,))
        
        jobs_list = []
        for job in jobs:
            jobs_list.append({
                'id': str(job['id']),
                'job_number': job['job_number'],
                'title': job['title'],
                'status': job['status'],
                'priority': job['priority'],
                'due_date': job['due_date'].isoformat() if job['due_date'] else None,
                'created_at': job['created_at'].isoformat() if job['created_at'] else None,
                'revision_no': job['revision_no'],
                'customer_name': job['customer_name'],
                'created_by_name': job['created_by_name'],
                'total_steps': job['total_steps'],
                'completed_steps': job['completed_steps'],
                'progress': round((job['completed_steps'] / job['total_steps'] * 100) if job['total_steps'] > 0 else 0)
            })
        
        return jsonify({'data': jobs_list}), 200
        
    except Exception as e:
        print(f"Error getting recent jobs: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@dashboard_bp.route('/tasks', methods=['GET'])
@token_required
@role_required(['yonetici'])
def get_all_tasks():
    """Tüm iş adımlarını yönetici için listele"""
    try:
        query = """
            SELECT
                js.id,
                js.status,
                js.order_index,
                js.started_at,
                js.completed_at,
                js.estimated_duration,
                js.actual_duration,
                js.production_quantity,
                js.production_unit,
                js.created_at as step_created_at,
                j.id AS job_id,
                j.job_number,
                j.title AS job_title,
                j.description AS job_description,
                j.created_at AS job_created_at,
                c.name AS customer_name,
                p.id AS process_id,
                p.name AS process_name,
                p.code AS process_code,
                u.id AS assigned_id,
                u.full_name AS assigned_name,
                m.id AS machine_id,
                m.name AS machine_name
            FROM job_steps js
            JOIN jobs j ON js.job_id = j.id
            LEFT JOIN customers c ON j.customer_id = c.id
            JOIN processes p ON js.process_id = p.id
            LEFT JOIN users u ON js.assigned_to = u.id
            LEFT JOIN machines m ON js.machine_id = m.id
            ORDER BY js.created_at DESC
        """

        rows = execute_query(query)

        tasks = []
        for row in rows:
            tasks.append({
                'id': str(row['id']),
                'status': row['status'],
                'order_index': row['order_index'],
                'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                'completed_at': row['completed_at'].isoformat() if row['completed_at'] else None,
                'estimated_duration': row['estimated_duration'],
                'actual_duration': row['actual_duration'],
                'production_quantity': float(row['production_quantity']) if row['production_quantity'] is not None else None,
                'production_unit': row['production_unit'],
                'created_at': row['step_created_at'].isoformat() if row['step_created_at'] else None,
                'job': {
                    'id': str(row['job_id']),
                    'job_number': row['job_number'],
                    'title': row['job_title'],
                    'description': row['job_description'],
                    'created_at': row['job_created_at'].isoformat() if row['job_created_at'] else None,
                    'customer_name': row['customer_name'],
                },
                'process': {
                    'id': str(row['process_id']),
                    'name': row['process_name'],
                    'code': row['process_code'],
                },
                'assigned_to': {
                    'id': str(row['assigned_id']),
                    'name': row['assigned_name'],
                } if row['assigned_id'] else None,
                'machine': {
                    'id': str(row['machine_id']),
                    'name': row['machine_name'],
                } if row['machine_id'] else None,
            })

        return jsonify({'data': tasks}), 200

    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500

@dashboard_bp.route('/activity', methods=['GET'])
@token_required
def get_recent_activity():
    """Son aktiviteleri getir"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        query = """
            SELECT 
                al.id, al.action, al.entity_type, al.created_at,
                u.full_name as user_name,
                j.job_number, j.title as job_title
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN jobs j ON al.entity_type = 'job' AND al.entity_id = j.id
            ORDER BY al.created_at DESC
            LIMIT %s
        """
        
        activities = execute_query(query, (limit,))
        
        activities_list = []
        for activity in activities:
            activities_list.append({
                'id': str(activity['id']),
                'action': activity['action'],
                'entity_type': activity['entity_type'],
                'created_at': activity['created_at'].isoformat() if activity['created_at'] else None,
                'user_name': activity['user_name'],
                'job_number': activity['job_number'],
                'job_title': activity['job_title'],
            })
        
        return jsonify({'data': activities_list}), 200
        
    except Exception as e:
        print(f"Error getting activity: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@dashboard_bp.route('/chart/jobs-by-status', methods=['GET'])
@token_required
@cache_route_with_user(ttl=120)  # Cache for 2 minutes
def get_jobs_by_status_chart():
    """Durum bazlı iş grafiği için veri - WITH CACHING"""
    try:
        query = """
            SELECT 
                status,
                COUNT(*) as count
            FROM jobs
            GROUP BY status
            ORDER BY count DESC
        """
        
        data = execute_query(query)
        
        chart_data = []
        for row in data:
            chart_data.append({
                'status': row['status'],
                'count': row['count']
            })
        
        return jsonify({'data': chart_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@dashboard_bp.route('/chart/jobs-by-month', methods=['GET'])
@token_required
@cache_route_with_user(ttl=300)  # Cache for 5 minutes
def get_jobs_by_month_chart():
    """Aylık iş grafiği için veri - WITH CACHING"""
    try:
        query = """
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as count
            FROM jobs
            WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY month
            ORDER BY month
        """
        
        data = execute_query(query)
        
        chart_data = []
        for row in data:
            chart_data.append({
                'month': row['month'].isoformat() if row['month'] else None,
                'count': row['count']
            })
        
        return jsonify({'data': chart_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
