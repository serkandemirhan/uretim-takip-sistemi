import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    # Seçenek 1: DATABASE_URL (Supabase/Production için önerilen)
    DATABASE_URL = os.getenv('DATABASE_URL', None)

    # Seçenek 2: Ayrı parametreler (Local development için)
    DATABASE_HOST = os.getenv('DATABASE_HOST', 'localhost')
    DATABASE_PORT = os.getenv('DATABASE_PORT', '5432')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'reklam_db')
    DATABASE_USER = os.getenv('DATABASE_USER', 'reklam_user')
    DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD', 'reklam_pass_123')

    # Eğer DATABASE_URL yoksa, parametrelerden oluştur
    if not DATABASE_URL:
        DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

    # Database Connection Pool
    DB_POOL_MIN_CONNECTIONS = int(os.getenv('DB_POOL_MIN_CONNECTIONS', '2'))
    DB_POOL_MAX_CONNECTIONS = int(os.getenv('DB_POOL_MAX_CONNECTIONS', '10'))

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-this-secret-key')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', 24))
    
    # S3 / Cloudflare R2 Storage
    # For local development, use MinIO (localhost:9000)
    # For production, use Cloudflare R2 endpoint (e.g., <account-id>.r2.cloudflarestorage.com)
    MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
    MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'reklampro-files')
    MINIO_SECURE = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
    MINIO_VERIFY_SSL = os.getenv('MINIO_VERIFY_SSL', 'true').lower() == 'true'

    # Flask
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', '1') == '1'
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
