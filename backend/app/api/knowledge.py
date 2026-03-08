from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import os, aiofiles

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.models.knowledge import KnowledgeSource
from app.services.knowledge import ingest_source

router = APIRouter()


class AddSourceRequest(BaseModel):
    type: str          # website | youtube | manual
    name: str
    url: Optional[str] = None
    content: Optional[str] = None  # for manual type


@router.get("/sources")
async def list_sources(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeSource)
        .where(KnowledgeSource.tenant_id == tenant.id)
        .order_by(KnowledgeSource.created_at.desc())
    )
    sources = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "type": s.type,
            "name": s.name,
            "url": s.url,
            "status": s.status,
            "chunk_count": s.chunk_count,
            "last_synced_at": s.last_synced_at.isoformat() if s.last_synced_at else None,
            "error_message": s.error_message,
            "created_at": s.created_at.isoformat(),
        }
        for s in sources
    ]


@router.post("/sources")
async def add_source(
    request: AddSourceRequest,
    background_tasks: BackgroundTasks,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Add a URL, YouTube, or manual text source"""
    source = KnowledgeSource(
        tenant_id=tenant.id,
        type=request.type,
        name=request.name,
        url=request.url or request.content,
        status="pending",
    )
    db.add(source)
    await db.commit()

    # Start ingestion in background
    background_tasks.add_task(_run_ingestion, str(source.id))

    return {"id": str(source.id), "status": "pending", "message": "Ingestion started"}


@router.post("/sources/upload")
async def upload_file_source(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant=Depends(get_current_tenant),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload PDF, Excel, or Word file"""
    allowed_types = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
        "application/vnd.ms-excel": "excel",
        "text/csv": "excel",
    }

    file_type = allowed_types.get(file.content_type)
    if not file_type:
        raise HTTPException(status_code=400, detail=f"File type not supported: {file.content_type}")

    # 1. Save file locally (always, for backup or immediate ingestion)
    upload_dir = f"uploads/{tenant.id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"
    
    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # 2. Attempt Cloud Storage upload
    file_url = None
    try:
        from app.services.storage import upload_file
        file_url = await upload_file(content, file.filename, file.content_type)
    except Exception as se:
        from loguru import logger
        logger.warning(f"Cloud upload failed, using local fallback: {se}")

    # 3. Create source record
    source = KnowledgeSource(
        tenant_id=tenant.id,
        type=file_type,
        name=file.filename,
        file_path=file_path,
        file_url=file_url,
        status="pending",
    )
    db.add(source)
    await db.commit()

    background_tasks.add_task(_run_ingestion, str(source.id))

    return {"id": str(source.id), "status": "pending", "filename": file.filename}


@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: str,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == source_id,
            KnowledgeSource.tenant_id == tenant.id,
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    await db.delete(source)
    await db.commit()
    return {"success": True}


@router.post("/sources/{source_id}/resync")
async def resync_source(
    source_id: str,
    background_tasks: BackgroundTasks,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == source_id,
            KnowledgeSource.tenant_id == tenant.id,
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    source.status = "pending"
    await db.commit()
    background_tasks.add_task(_run_ingestion, source_id)
    return {"success": True, "message": "Re-sync started"}


async def _run_ingestion(source_id: str):
    """Run ingestion in background with own DB session"""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await ingest_source(source_id, db)
