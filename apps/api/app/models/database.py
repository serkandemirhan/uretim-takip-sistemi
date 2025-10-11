import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import Config

def get_db_connection():
    """PostgreSQL bağlantısı oluştur"""
    conn = psycopg2.connect(
        host=Config.DATABASE_HOST,
        port=Config.DATABASE_PORT,
        database=Config.DATABASE_NAME,
        user=Config.DATABASE_USER,
        password=Config.DATABASE_PASSWORD,
        cursor_factory=RealDictCursor
    )
    return conn

def execute_query(query, params=None, fetch=True):
    """
    SQL sorgusu çalıştır
    
    Args:
        query: SQL sorgusu
        params: Parametreler (tuple veya dict)
        fetch: True ise sonuçları getir, False ise sadece commit
    
    Returns:
        fetch=True ise sonuçlar, False ise None
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(query, params)
        
        if fetch:
            results = cursor.fetchall()
            conn.close()
            return results
        else:
            conn.commit()
            conn.close()
            return None
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

def execute_query_one(query, params=None):
    """Tek satır sonuç döndür"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(query, params)
        result = cursor.fetchone()
        conn.close()
        return result
    except Exception as e:
        conn.close()
        raise e