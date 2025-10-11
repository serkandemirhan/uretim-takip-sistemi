import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    DATABASE_HOST = os.getenv('DATABASE_HOST', 'localhost')
    DATABASE_PORT = os.getenv('DATABASE_PORT', '5432')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'reklam_db')
    DATABASE_USER = os.getenv('DATABASE_USER', 'reklam_user')
    DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD', 'reklam_pass_123')
    
    DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-this-secret-key')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', 24))
    
    # MinIO
    MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
    MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'reklam-files')
    MINIO_USE_SSL = os.getenv('MINIO_USE_SSL', 'false').lower() == 'true'
    
    # Redis
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 0))
    
    # Flask
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', '1') == '1'
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
        
    # MinIO / S3 Settings
    MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'http://localhost:9000')
    MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'reklam-files')
    MINIO_USE_SSL = os.getenv('MINIO_USE_SSL', 'false').lower() == 'true'