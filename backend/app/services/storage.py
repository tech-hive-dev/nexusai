"""
Cloud Storage Service (R2/S3)
──────────────────────────────
Handles file uploads to Cloudflare R2 or AWS S3.
Requires R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY in settings.
"""
import boto3
from botocore.exceptions import ClientError
from loguru import logger
import uuid
from typing import Optional
from app.core.config import settings

def get_s3_client():
    """Builds a boto3 client for R2/S3."""
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT,
        aws_access_key_id=settings.R2_ACCESS_KEY,
        aws_secret_access_key=settings.R2_SECRET_KEY,
        region_name="auto", # R2 uses 'auto'
    )

async def upload_file(file_content: bytes, filename: str, content_type: str = "image/jpeg") -> Optional[str]:
    """
    Uploads bytes to the configured bucket and returns the public URL.
    Generates a unique path to avoid collisions.
    """
    if not all([settings.R2_BUCKET, settings.R2_ACCESS_KEY, settings.R2_SECRET_KEY]):
        logger.warning("Cloud storage not configured, skipping upload")
        return None

    s3 = get_s3_client()
    unique_filename = f"{uuid.uuid4()}-{filename}"
    
    try:
        s3.put_object(
            Bucket=settings.R2_BUCKET,
            Key=unique_filename,
            Body=file_content,
            ContentType=content_type,
            # If the bucket is public, we don't need ACL. 
            # If not, we might need to handle presigned URLs.
        )
        
        # Build URL (assumes the endpoint is public or uses a custom domain)
        # For R2, it's often https://<bucket>.<account_id>.r2.cloudflarestorage.com/<key>
        # or a custom public domain configured in the R2 dashboard.
        base_url = settings.R2_ENDPOINT.replace("https://", f"https://{settings.R2_BUCKET}.")
        if "cloudflarestorage.com" in base_url:
            return f"{base_url}/{unique_filename}"
        
        # Fallback if custom domain is provided in endpoint
        return f"{settings.R2_ENDPOINT}/{unique_filename}"

    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        return None

async def get_presigned_url(key: str, expires_in: int = 3600) -> Optional[str]:
    """Generates a temporary download link for private objects."""
    s3 = get_s3_client()
    try:
        response = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.R2_BUCKET, 'Key': key},
            ExpiresIn=expires_in
        )
        return response
    except ClientError as e:
        logger.error(f"Presigned URL generation failed: {e}")
        return None
