import os, re
import botocore
import boto3
from botocore.config import Config

def _bool(v, default=False):
    if v is None:
        return default
    return str(v).strip().lower() in ('1','true','yes','on')

def _clean_hostport(ep: str) -> str:
    ep = (ep or '').strip()
    ep = re.sub(r'^https?://', '', ep, flags=re.I)  # varsa şemayı at
    return ep.split('/')[0]                         # varsa path'i at

def get_s3():
    """
    S3-compatible storage'a (MinIO veya Cloudflare R2) boto3 ile bağlanır.

    Local development: MinIO (localhost:9000)
    Production: Cloudflare R2 (<account-id>.r2.cloudflarestorage.com)

    endpoint_url: http/https + host:port (PATH YOK)
    """
    hostport = _clean_hostport(os.environ.get('MINIO_ENDPOINT', 'localhost:9000'))
    secure = _bool(os.environ.get('MINIO_SECURE'), False)

    scheme = 'https' if secure else 'http'
    endpoint_url = f'{scheme}://{hostport}'

    return boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=os.environ.get('MINIO_ACCESS_KEY'),
        aws_secret_access_key=os.environ.get('MINIO_SECRET_KEY'),
        region_name=os.environ.get('AWS_REGION', 'us-east-1'),
        verify=_bool(os.environ.get('MINIO_VERIFY_SSL'), True) if secure else False,
        config=Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'}  # MinIO ile uyumlu
        )
    )
