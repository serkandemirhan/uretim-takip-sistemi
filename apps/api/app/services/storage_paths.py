import os, re, uuid
from io import BytesIO
from minio import Minio
from botocore.exceptions import ClientError
from minio.error import S3Error

def slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9\-_.]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "untitled"

def get_minio() -> Minio:
    return Minio(
        os.environ.get("MINIO_ENDPOINT"),
        access_key=os.environ.get("MINIO_ACCESS_KEY"),
        secret_key=os.environ.get("MINIO_SECRET_KEY"),
        secure=os.environ.get("MINIO_SECURE", "false").lower() == "true",
    )

def ensure_bucket(client, bucket: str):
    """MinIO veya boto3 client ile bucket oluştur."""
    if hasattr(client, "bucket_exists"):
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
        return

    # boto3-style client
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchBucket", "NotFound"):
            client.create_bucket(Bucket=bucket)
        elif code == "301":
            # Bucket farklı bölgede, R2 için sorun olmaz; yok say.
            return
        else:
            raise

def make_folder(client, bucket: str, prefix: str):
    """S3/MinIO 'klasör'ü: trailing slash ile 0-byte obje."""
    key = prefix.rstrip("/") + "/"
    # varsa tekrar koymak sorun değil
    if hasattr(client, "put_object") and not isinstance(client, Minio):
        # boto3 client
        client.put_object(Bucket=bucket, Key=key, Body=b"")
    else:
        client.put_object(bucket, key, data=BytesIO(b""), length=0)

# ---- path kuralları ----

def customer_prefix(customer_code: str, customer_id: str) -> str:
    code = slugify(customer_code) if customer_code else f"customer_{str(customer_id)[:8]}"
    return f"{code}/"

def job_folder_name(job_number: str, title: str, job_id: str) -> str:
    if job_number:
        base = f"{job_number}_{slugify(title or '')}".strip("_")
    else:
        base = f"{slugify(title or 'job')}_{str(job_id)[:8]}"
    return base or f"job_{str(job_id)[:8]}"

def job_prefix(customer_code: str, customer_id: str, job_number: str, title: str, job_id: str) -> str:
    return customer_prefix(customer_code, customer_id) + job_folder_name(job_number, title, job_id) + "/"

def process_prefix(
    customer_code: str,
    customer_id: str,
    job_number: str,
    title: str,
    job_id: str,
    process_code: str,
    process_id: str,
    process_group_name: str = None,
    process_folder_name: str = None
) -> str:
    """
    Generate process folder path with structure:
    CUSTOMER/JOB_NUMBER_TITLE/PROCESS_GROUP/PROCESS_FOLDER/

    Falls back to old structure if group/folder names not provided.
    """
    job_pref = job_prefix(customer_code, customer_id, job_number, title, job_id)

    # New structure with process group and folder name
    if process_group_name and process_folder_name:
        group_slug = slugify(process_group_name)
        folder_slug = slugify(process_folder_name)
        return f"{job_pref}{group_slug}/{folder_slug}/"

    # Fallback to old structure
    proc = f"{(process_code or 'process').upper()}_{str(process_id)[:8]}"
    return f"{job_pref}{proc}/"

def job_files_prefix(customer_code: str, customer_id: str, job_number: str, title: str, job_id: str) -> str:
    return job_prefix(customer_code, customer_id, job_number, title, job_id) + "_job_files/"
