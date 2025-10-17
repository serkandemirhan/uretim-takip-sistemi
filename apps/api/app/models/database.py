import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from app.config import Config
import logging

logger = logging.getLogger(__name__)

# Global connection pool
_connection_pool = None
_pool_shutting_down = False


class PooledConnection:
    __slots__ = ('_conn', '_pool', '_closed')

    def __init__(self, conn, pool_ref):
        self._conn = conn
        self._pool = pool_ref
        self._closed = False

    def close(self):
        if self._closed:
            return
        if _pool_shutting_down:
            try:
                self._conn.close()
            finally:
                self._closed = True
        else:
            self._pool.putconn(self._conn)
            self._closed = True

    def __getattr__(self, item):
        return getattr(self._conn, item)

def get_connection_pool():
    """
    Singleton pattern ile connection pool döndür.
    İlk çağrıda pool oluşturulur, sonraki çağrılarda aynı pool kullanılır.
    """
    global _connection_pool

    if _connection_pool is None:
        try:
            database_url = getattr(Config, 'DATABASE_URL', None)

            # Pool parametreleri
            minconn = Config.DB_POOL_MIN_CONNECTIONS
            maxconn = Config.DB_POOL_MAX_CONNECTIONS

            if database_url:
                # DATABASE_URL ile pool oluştur (Supabase/Production)
                _connection_pool = pool.ThreadedConnectionPool(
                    minconn,
                    maxconn,
                    database_url,
                    cursor_factory=RealDictCursor,
                    sslmode='prefer'
                )
            else:
                # Ayrı parametreler ile pool oluştur (Local development)
                _connection_pool = pool.ThreadedConnectionPool(
                    minconn,
                    maxconn,
                    host=Config.DATABASE_HOST,
                    port=Config.DATABASE_PORT,
                    database=Config.DATABASE_NAME,
                    user=Config.DATABASE_USER,
                    password=Config.DATABASE_PASSWORD,
                    cursor_factory=RealDictCursor
                )

            logger.info(f"✅ Database connection pool created: min={minconn}, max={maxconn}")
        except Exception as e:
            logger.error(f"❌ Failed to create connection pool: {e}")
            raise

    return _connection_pool

def get_db_connection():
    """
    Connection pool'dan bir bağlantı al.
    Kullanım sonrası mutlaka putconn() ile geri koy!
    """
    try:
        pool_ref = get_connection_pool()
        raw_conn = pool_ref.getconn()
        return PooledConnection(raw_conn, pool_ref)
    except Exception as e:
        logger.error(f"❌ Failed to get connection from pool: {e}")
        raise

def release_db_connection(conn):
    """
    Bağlantıyı pool'a geri koy (close değil!)
    """
    try:
        if conn:
            if isinstance(conn, PooledConnection):
                conn.close()
            else:
                if _pool_shutting_down:
                    try:
                        conn.close()
                    except Exception as inner_e:
                        logger.debug(f"Ignored error while closing raw connection during shutdown: {inner_e}")
                else:
                    pool_ref = get_connection_pool()
                    pool_ref.putconn(conn)
    except Exception as e:
        logger.error(f"❌ Failed to release connection to pool: {e}")

def close_connection_pool():
    """
    Connection pool'u tamamen kapat (uygulama shutdown'da kullanılır)
    """
    global _connection_pool
    global _pool_shutting_down
    if _connection_pool:
        _pool_shutting_down = True
        try:
            _connection_pool.closeall()
        finally:
            _pool_shutting_down = False
        _connection_pool = None
        logger.info("✅ Connection pool closed")

def get_pool_stats():
    """
    Pool istatistiklerini döndür (monitoring için)
    """
    pool = get_connection_pool()
    # ThreadedConnectionPool'da _used ve _pool private attributes'lar
    # Bu bilgiyi almak için biraz workaround gerekir
    try:
        # pool._pool: kullanılabilir bağlantılar
        # pool._used: kullanımda olan bağlantılar
        return {
            'min_connections': Config.DB_POOL_MIN_CONNECTIONS,
            'max_connections': Config.DB_POOL_MAX_CONNECTIONS,
            'available': len(pool._pool),
            'in_use': len(pool._used),
            'total': len(pool._pool) + len(pool._used)
        }
    except Exception as e:
        logger.warning(f"Could not get pool stats: {e}")
        return {
            'min_connections': Config.DB_POOL_MIN_CONNECTIONS,
            'max_connections': Config.DB_POOL_MAX_CONNECTIONS,
            'available': 'unknown',
            'in_use': 'unknown',
            'total': 'unknown'
        }

def execute_query(query, params=None, fetch=True):
    """
    SQL sorgusu çalıştır (connection pool kullanarak)

    Args:
        query: SQL sorgusu
        params: Parametreler (tuple veya dict)
        fetch: True ise sonuçları getir, False ise sadece commit

    Returns:
        fetch=True ise sonuçlar, False ise None
    """
    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(query, params)

        if fetch:
            results = cursor.fetchall()
            return results
        else:
            conn.commit()
            return None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        release_db_connection(conn)

def execute_query_one(query, params=None):
    """Tek satır sonuç döndür (connection pool kullanarak)"""
    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        return result
    except Exception as e:
        raise e
    finally:
        if cursor:
            cursor.close()
        release_db_connection(conn)
    


def execute_write(sql, params=None):
    """
    INSERT/UPDATE/DELETE + RETURNING için helper (connection pool kullanarak)
    - Transaction'ı COMMIT eder.
    - RETURNING varsa satırları döndürür.
    """
    conn = get_db_connection()
    cur = None
    try:
        cur = conn.cursor()
        cur.execute(sql, params or ())
        rows = cur.fetchall() if cur.description is not None else []
        conn.commit()
        return rows
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        if cur:
            cur.close()
        release_db_connection(conn)
