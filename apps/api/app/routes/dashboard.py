from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one
from app.middleware.auth_middleware import token_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def get_dashboard_stats():
    """Dashboard istatistiklerini getir"""
    try:
        user_id = request.current_user['user_id']
        user_role = request.current_user['role']
        
        stats = {}
        
        # Genel İş İstatistikleri
        jobs_stats_query = """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
                COUNT(*) FILTER (WHERE status = 'active') as active_count,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'canceled')) as overdue_count,
                COUNT(*) as total_count
            FROM jobs
        """
        jobs_stats = execute_query_one(jobs_stats_query)
        
        stats['jobs'] = {
            'draft': jobs_stats['draft_count'] if jobs_stats else 0,
            'active': jobs_stats['active_count'] if jobs_stats else 0,
            'in_progress': jobs_stats['in_progress_count'] if jobs_stats else 0,
            'completed': jobs_stats['completed_count'] if jobs_stats else 0,
            'canceled': jobs_stats['canceled_count'] if jobs_stats else 0,
            'overdue': jobs_stats['overdue_count'] if jobs_stats else 0,
            'total': jobs_stats['total_count'] if jobs_stats else 0,
        }
        
        # Görev İstatistikleri (Operatör için)
        if user_role == 'operator':
            tasks_stats_query = """
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                    COUNT(*) as total_count
                FROM job_steps
                WHERE assigned_to = %s
            """
            tasks_stats = execute_query_one(tasks_stats_query, (user_id,))
            
            stats['my_tasks'] = {
                'ready': tasks_stats['ready_count'] if tasks_stats else 0,
                'in_progress': tasks_stats['in_progress_count'] if tasks_stats else 0,
                'completed': tasks_stats['completed_count'] if tasks_stats else 0,
                'total': tasks_stats['total_count'] if tasks_stats else 0,
            }
        
        # Makine İstatistikleri
        machines_stats_query = """
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
        """
        machines_stats = execute_query_one(machines_stats_query)
        
        stats['machines'] = {
            'active': machines_stats['active_count'] if machines_stats else 0,
            'maintenance': machines_stats['maintenance_count'] if machines_stats else 0,
            'inactive': machines_stats['inactive_count'] if machines_stats else 0,
            'busy': machines_stats['busy_count'] if machines_stats else 0,
            'total': machines_stats['total_count'] if machines_stats else 0,
        }
        
        # Kullanıcı İstatistikleri
        users_stats_query = """
            SELECT 
                COUNT(*) FILTER (WHERE role = 'operator') as operator_count,
                COUNT(*) FILTER (WHERE role = 'yonetici') as manager_count,
                COUNT(*) as total_count
            FROM users
            WHERE is_active = true
        """
        users_stats = execute_query_one(users_stats_query)
        
        stats['users'] = {
            'operators': users_stats['operator_count'] if users_stats else 0,
            'managers': users_stats['manager_count'] if users_stats else 0,
            'total': users_stats['total_count'] if users_stats else 0,
        }
        
        return jsonify({'data': stats}), 200
        
    except Exception as e:
        print(f"Error getting dashboard stats: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@dashboard_bp.route('/recent-jobs', methods=['GET'])
@token_required
def get_recent_jobs():
    """Son işleri getir"""
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
def get_jobs_by_status_chart():
    """Durum bazlı iş grafiği için veri"""
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
def get_jobs_by_month_chart():
    """Aylık iş grafiği için veri"""
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