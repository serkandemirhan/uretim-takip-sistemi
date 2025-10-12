from flask import Blueprint, jsonify, request
from app.models.database import get_pool_stats
from app.middleware.auth_middleware import token_required
from app.utils.cache import get_cache_info, clear_cache, clear_cache_by_prefix
import psycopg2

health_bp = Blueprint('health', __name__, url_prefix='/api/health')

@health_bp.route('', methods=['GET'])
def health_check():
    """Basic health check - no auth required"""
    return jsonify({
        'status': 'ok',
        'message': 'API çalışıyor'
    }), 200

@health_bp.route('/db', methods=['GET'])
@token_required
def db_health():
    """Database connection pool health check - auth required"""
    try:
        stats = get_pool_stats()

        # Pool sağlık kontrolü
        health_status = 'healthy'
        warnings = []

        # Kullanımda olan bağlantılar max'a yakınsa uyar
        if stats['in_use'] != 'unknown' and stats['max_connections'] != 'unknown':
            usage_percent = (stats['in_use'] / stats['max_connections']) * 100
            if usage_percent > 80:
                health_status = 'warning'
                warnings.append(f'Pool kullanımı %{usage_percent:.0f} (çok yüksek)')
            elif usage_percent > 60:
                warnings.append(f'Pool kullanımı %{usage_percent:.0f}')

        # Kullanılabilir bağlantı yoksa uyar
        if stats['available'] == 0:
            health_status = 'warning'
            warnings.append('Kullanılabilir bağlantı yok')

        return jsonify({
            'status': health_status,
            'pool_stats': stats,
            'warnings': warnings,
            'recommendations': {
                'optimal_range': '60-80% kullanım',
                'current_config': f"min={stats['min_connections']}, max={stats['max_connections']}"
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@health_bp.route('/db/test', methods=['GET'])
@token_required
def db_connection_test():
    """Test actual database connection - auth required"""
    from app.models.database import execute_query_one

    try:
        result = execute_query_one("SELECT 1 as test, NOW() as current_time")

        return jsonify({
            'status': 'ok',
            'message': 'Database bağlantısı başarılı',
            'test_result': dict(result) if result else None
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Database bağlantısı başarısız: {str(e)}'
        }), 500

@health_bp.route('/cache', methods=['GET'])
@token_required
def cache_stats():
    """Get cache statistics - auth required"""
    try:
        prefix = request.args.get('prefix', None)
        stats = get_cache_info(prefix)

        return jsonify({
            'status': 'ok',
            'cache_stats': stats
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@health_bp.route('/cache/clear', methods=['POST'])
@token_required
def clear_cache_endpoint():
    """Clear cache - auth required"""
    try:
        prefix = request.json.get('prefix', None) if request.json else None

        if prefix:
            cleared = clear_cache_by_prefix(prefix)
            message = f'Cleared {cleared} cache entries with prefix "{prefix}"'
        else:
            cleared = clear_cache()
            message = f'Cleared all {cleared} cache entries'

        return jsonify({
            'status': 'ok',
            'message': message,
            'cleared_count': cleared
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
