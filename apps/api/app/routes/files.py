from flask import Blueprint, request, jsonify
from app.models.database import execute_query, execute_query_one, get_db_connection
from app.middleware.auth_middleware import token_required
from app.config import Config
import boto3
from botocore.client import Config as BotoConfig
from datetime import datetime, timedelta
import hashlib
import os
import re

files_bp = Blueprint('files', __name__, url_prefix='/api/files')

# MinIO Client
s3_client = boto3.client(
    's3',
    endpoint_url=Config.MINIO_ENDPOINT,
    aws_access_key_id=Config.MINIO_ACCESS_KEY,
    aws_secret_access_key=Config.MINIO_SECRET_KEY,
    config=BotoConfig(signature_version='s3v4'),
    region_name='us-east-1'
)

BUCKET_NAME = Config.MINIO_BUCKET


def slugify(text):
    """Text'i dosya adı için uygun hale getir"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text[:50]  # Max 50 karakter


def get_folder_path(ref_type, ref_id, process_code=None):
    """Klasör yolunu oluştur"""
    try:
        if ref_type == 'job':
            # Job bilgilerini al
            query = """
                SELECT 
                    j.id, j.title, j.customer_id,
                    c.id as customer_id, c.name as customer_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                WHERE j.id = %s
            """
            job = execute_query_one(query, (ref_id,))
            
            if not job:
                return None
            
            # Müşteri klasörü
            customer_folder = f"customer_{job['customer_id']}" if job['customer_id'] else "no_customer"
            
            # İş klasörü
            job_slug = slugify(job['title'])
            job_folder = f"job_{ref_id[:8]}_{job_slug}"
            
            # Temel path
            base_path = f"{customer_folder}/{job_folder}"
            
            return base_path
            
        elif ref_type == 'job_step':
            # Job step bilgilerini al
            query = """
                SELECT 
                    js.id, js.job_id,
                    j.title as job_title, j.customer_id,
                    p.code as process_code, p.name as process_name
                FROM job_steps js
                JOIN jobs j ON js.job_id = j.id
                JOIN processes p ON js.process_id = p.id
                WHERE js.id = %s
            """
            step = execute_query_one(query, (ref_id,))
            
            if not step:
                return None
            
            # Müşteri klasörü
            customer_folder = f"customer_{step['customer_id']}" if step['customer_id'] else "no_customer"
            
            # İş klasörü
            job_slug = slugify(step['job_title'])
            job_folder = f"job_{step['job_id'][:8]}_{job_slug}"
            
            # Süreç klasörü
            process_folder = f"process_{step['process_code']}"
            
            base_path = f"{customer_folder}/{job_folder}/{process_folder}"
            
            return base_path
        
        # Diğer tipler için basit klasör
        return f"{ref_type}/{ref_id}"
        
    except Exception as e:
        print(f"Error getting folder path: {str(e)}")
        return None


@files_bp.route('/upload-url', methods=['POST'])
@token_required
def get_upload_url():
    """Dosya yükleme için signed URL oluştur"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        if not data.get('filename'):
            return jsonify({'error': 'Dosya adı gerekli'}), 400
        
        filename = data.get('filename')
        content_type = data.get('content_type', 'application/octet-stream')
        ref_type = data.get('ref_type')  # 'job' veya 'job_step'
        ref_id = data.get('ref_id')
        
        # Klasör yolunu oluştur
        folder_path = get_folder_path(ref_type, ref_id)
        
        if not folder_path:
            return jsonify({'error': 'Klasör yolu oluşturulamadı'}), 400
        
        # Dosya adını temizle
        safe_filename = slugify(os.path.splitext(filename)[0])
        file_extension = os.path.splitext(filename)[1]
        
        # Unique dosya adı oluştur
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{safe_filename}_{timestamp}{file_extension}"
        
        # Object key oluştur
        object_key = f"{folder_path}/{unique_filename}"
        
        # Presigned URL oluştur (15 dakika geçerli)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': object_key,
                'ContentType': content_type
            },
            ExpiresIn=900  # 15 dakika
        )
        
        return jsonify({
            'data': {
                'upload_url': presigned_url,
                'object_key': object_key,
                'filename': filename,
                'unique_filename': unique_filename,
                'folder_path': folder_path
            }
        }), 200
        
    except Exception as e:
        print(f"Error generating upload URL: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@files_bp.route('/link', methods=['POST'])
@token_required
def link_file():
    """Yüklenen dosyayı veritabanına kaydet"""
    try:
        data = request.get_json()
        user_id = request.current_user['user_id']
        
        required_fields = ['object_key', 'filename', 'ref_type', 'ref_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} gerekli'}), 400
        
        insert_query = """
            INSERT INTO files (
                object_key, filename, file_size, content_type, 
                ref_type, ref_id, uploaded_by, folder_path
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, object_key, filename
        """
        
        params = (
            data.get('object_key'),
            data.get('filename'),
            data.get('file_size', 0),
            data.get('content_type', 'application/octet-stream'),
            data.get('ref_type'),
            data.get('ref_id'),
            user_id,
            data.get('folder_path')
        )
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(insert_query, params)
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Dosya başarıyla kaydedildi',
            'data': {
                'id': str(result['id']),
                'object_key': result['object_key'],
                'filename': result['filename']
            }
        }), 201
        
    except Exception as e:
        print(f"Error linking file: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@files_bp.route('', methods=['GET'])
@token_required
def get_files():
    """Dosyaları listele"""
    try:
        ref_type = request.args.get('ref_type')
        ref_id = request.args.get('ref_id')
        
        query = """
            SELECT 
                f.id, f.object_key, f.filename, f.file_size, 
                f.content_type, f.ref_type, f.ref_id, f.created_at,
                f.folder_path,
                u.full_name as uploaded_by_name
            FROM files f
            LEFT JOIN users u ON f.uploaded_by = u.id
            WHERE 1=1
        """
        
        params = []
        
        if ref_type:
            query += " AND f.ref_type = %s"
            params.append(ref_type)
        
        if ref_id:
            query += " AND f.ref_id = %s"
            params.append(ref_id)
        
        query += " ORDER BY f.created_at DESC"
        
        files = execute_query(query, tuple(params) if params else None)
        
        files_list = []
        for file in files:
            files_list.append({
                'id': str(file['id']),
                'object_key': file['object_key'],
                'filename': file['filename'],
                'file_size': file['file_size'],
                'content_type': file['content_type'],
                'ref_type': file['ref_type'],
                'ref_id': str(file['ref_id']),
                'folder_path': file['folder_path'],
                'created_at': file['created_at'].isoformat() if file['created_at'] else None,
                'uploaded_by_name': file['uploaded_by_name']
            })
        
        return jsonify({'data': files_list}), 200
        
    except Exception as e:
        print(f"Error getting files: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@files_bp.route('/by-job/<job_id>', methods=['GET'])
@token_required
def get_files_by_job(job_id):
    """İşe ait tüm dosyaları süreçlere göre grupla"""
    try:
        query = """
            SELECT 
                f.id, f.object_key, f.filename, f.file_size, 
                f.content_type, f.ref_type, f.ref_id, f.created_at,
                f.folder_path,
                u.full_name as uploaded_by_name,
                js.process_id,
                p.name as process_name,
                p.code as process_code
            FROM files f
            LEFT JOIN users u ON f.uploaded_by = u.id
            LEFT JOIN job_steps js ON f.ref_type = 'job_step' AND f.ref_id = js.id
            LEFT JOIN processes p ON js.process_id = p.id
            WHERE (f.ref_type = 'job' AND f.ref_id = %s)
            OR (f.ref_type = 'job_step' AND js.job_id = %s)
            ORDER BY f.created_at DESC
        """
        
        files = execute_query(query, (job_id, job_id))
        
        # Süreçlere göre grupla
        job_files = []
        process_files = {}
        
        for file in files:
            file_data = {
                'id': str(file['id']),
                'object_key': file['object_key'],
                'filename': file['filename'],
                'file_size': file['file_size'],
                'content_type': file['content_type'],
                'folder_path': file['folder_path'],
                'created_at': file['created_at'].isoformat() if file['created_at'] else None,
                'uploaded_by_name': file['uploaded_by_name']
            }
            
            if file['ref_type'] == 'job':
                job_files.append(file_data)
            elif file['ref_type'] == 'job_step' and file['process_id']:
                process_key = str(file['process_id'])
                if process_key not in process_files:
                    process_files[process_key] = {
                        'process_id': process_key,
                        'process_name': file['process_name'],
                        'process_code': file['process_code'],
                        'files': []
                    }
                process_files[process_key]['files'].append(file_data)
        
        return jsonify({
            'data': {
                'job_files': job_files,
                'process_files': list(process_files.values())
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting files by job: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@files_bp.route('/<file_id>/download-url', methods=['GET'])
@token_required
def get_download_url(file_id):
    """Dosya indirme için signed URL oluştur"""
    try:
        query = "SELECT object_key, filename FROM files WHERE id = %s"
        file = execute_query_one(query, (file_id,))
        
        if not file:
            return jsonify({'error': 'Dosya bulunamadı'}), 404
        
        # Presigned URL oluştur (1 saat geçerli)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': file['object_key'],
                'ResponseContentDisposition': f'attachment; filename="{file["filename"]}"'
            },
            ExpiresIn=3600  # 1 saat
        )
        
        return jsonify({
            'data': {
                'download_url': presigned_url,
                'filename': file['filename']
            }
        }), 200
        
    except Exception as e:
        print(f"Error generating download URL: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500


@files_bp.route('/<file_id>', methods=['DELETE'])
@token_required
def delete_file(file_id):
    """Dosyayı sil"""
    try:
        query = "SELECT object_key FROM files WHERE id = %s"
        file = execute_query_one(query, (file_id,))
        
        if not file:
            return jsonify({'error': 'Dosya bulunamadı'}), 404
        
        # MinIO'dan sil
        try:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=file['object_key'])
        except Exception as s3_error:
            print(f"S3 delete error: {str(s3_error)}")
            # MinIO'dan silinemese bile veritabanından silelim
        
        # Veritabanından sil
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM files WHERE id = %s", (file_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Dosya başarıyla silindi'}), 200
        
    except Exception as e:
        print(f"Error deleting file: {str(e)}")
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500
    
    
@files_bp.route('', methods=['GET'])
@token_required
def list_files():
    ref_type = request.args.get('refType')  # 'job' | 'job_step' vb.
    ref_id   = request.args.get('refId')    # job uuid
    if not ref_type or not ref_id:
        return jsonify({'error': 'refType ve refId gerekli'}), 400

    # job'a ait dosyalar
    job_files = execute_query("""
      SELECT id, filename AS name, url, created_at
      FROM files
      WHERE ref_type = 'job' AND ref_id = %s
      ORDER BY created_at DESC
    """, (str(ref_id),))

    # job_step dosyalarını proses bazında grupla
    rows = execute_query("""
      SELECT js.process_id,
             f.id, f.filename AS name, f.url, f.created_at
      FROM job_steps js
      JOIN files f ON f.ref_type = 'job_step' AND f.ref_id = js.id
      WHERE js.job_id = %s
      ORDER BY f.created_at DESC
    """, (str(ref_id),))

    grouped = {}
    for r in rows:
        pid = str(r['process_id'])
        grouped.setdefault(pid, []).append({
            'id': str(r['id']),
            'name': r['name'],
            'url': r['url'],
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None
        })

    process_files = [{'process_id': k, 'files': v} for k, v in grouped.items()]

    return jsonify({
        'data': {
            'job_files': [
              { 'id': str(x['id']), 'name': x['name'], 'url': x['url'],
                'created_at': x['created_at'].isoformat() if x.get('created_at') else None
              } for x in job_files
            ],
            'process_files': process_files
        }
    }), 200
