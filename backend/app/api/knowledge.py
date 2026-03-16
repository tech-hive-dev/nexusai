from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import os, re, aiofiles

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
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
        "application/msword": "word",
    }

    # Also detect by file extension for browsers that send wrong MIME type
    ext = os.path.splitext(file.filename or "")[1].lower()
    ext_map = {".pdf": "pdf", ".xlsx": "excel", ".xls": "excel", ".csv": "excel",
               ".docx": "word", ".doc": "word"}
    file_type = allowed_types.get(file.content_type) or ext_map.get(ext)
    if not file_type:
        raise HTTPException(status_code=400, detail=f"File type not supported: {file.content_type}")

    # 1. Save file locally (always, for backup or immediate ingestion)
    upload_dir = f"uploads/{tenant.id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Sanitize filename to prevent path traversal attacks
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", os.path.basename(file.filename or "upload"))
    file_path = os.path.join(upload_dir, safe_name)

    MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")

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
        url=file_url,   # url column stores the cloud URL if available
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


# ─── AI Auto-Discovery ────────────────────────────────────────────────────────

class AutoDiscoverRequest(BaseModel):
    url: str
    business_name: Optional[str] = None


class AutoDiscoverConfirmRequest(BaseModel):
    url: str
    business_name: Optional[str] = None
    approved_items: list  # list of {title, content} dicts to save


@router.post("/auto-discover")
async def auto_discover(
    request: AutoDiscoverRequest,
    tenant=Depends(get_current_tenant),
    current_user=Depends(get_current_user),
):
    """Use Anthropic to analyze a website and return structured business knowledge preview."""
    import httpx, os

    # Step 1: Fetch website HTML (best-effort)
    website_text = ""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            resp = await client.get(request.url, headers={"User-Agent": "NexusAI/1.0 (business indexer)"})
            # Strip HTML tags roughly
            import re as _re
            website_text = _re.sub(r'<[^>]+>', ' ', resp.text)
            website_text = _re.sub(r'\s+', ' ', website_text)[:8000]  # limit context
    except Exception as e:
        website_text = f"Could not fetch website: {str(e)}"

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        # Fallback: return minimal info from the URL
        return {
            "items": [
                {"title": "Business Website", "content": f"Website: {request.url}\nBusiness: {request.business_name or 'Unknown'}"},
                {"title": "About Us", "content": "Add your business description here."},
                {"title": "Contact", "content": "Add your contact information here."},
            ],
            "ai_powered": False,
        }

    prompt = f"""You are analyzing a business website to build a knowledge base for an AI customer service agent.

Business name: {request.business_name or "Unknown"}
Website URL: {request.url}
Website content (first 8000 chars):
{website_text}

Extract the following information as a JSON array of objects with "title" and "content" fields:
1. Business description (what they do, their mission)
2. Products/Services/Menu (list with prices if available)
3. Opening hours / availability
4. Contact information (phone, email, address)
5. FAQs (common questions and answers)
6. Policies (returns, cancellations, etc.) if present
7. Team/About if present

Only include items where you found real information. Skip items with no data.
Return ONLY valid JSON array, no explanation. Example:
[{{"title": "About", "content": "We are..."}}, {{"title": "Hours", "content": "Mon-Fri 9am-6pm"}}]"""

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={
                    "model": "claude-haiku-20240307",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=30,
            )
        text = resp.json().get("content", [{}])[0].get("text", "[]").strip()
        import json as _json
        # Extract JSON from the response
        start = text.find("[")
        end = text.rfind("]") + 1
        items = _json.loads(text[start:end]) if start >= 0 else []
        return {"items": items, "ai_powered": True}
    except Exception as e:
        return {
            "items": [
                {"title": "Business Website", "content": f"Website: {request.url}"},
                {"title": "About", "content": f"{request.business_name or 'This business'} — add description here."},
            ],
            "ai_powered": False,
            "error": str(e),
        }


@router.post("/auto-discover/confirm")
async def auto_discover_confirm(
    request: AutoDiscoverConfirmRequest,
    background_tasks: BackgroundTasks,
    tenant=Depends(get_current_tenant),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save approved knowledge items from auto-discovery to the knowledge base."""
    saved_ids = []

    # First, add the website itself as a source
    website_source = KnowledgeSource(
        tenant_id=tenant.id,
        type="website",
        name=request.business_name or "Business Website",
        url=request.url,
        status="pending",
    )
    db.add(website_source)
    await db.flush()
    background_tasks.add_task(_run_ingestion, str(website_source.id))
    saved_ids.append(str(website_source.id))

    # Then save each approved item as a manual knowledge source
    for item in request.approved_items:
        title = item.get("title", "Info")
        content = item.get("content", "")
        if not content.strip():
            continue
        source = KnowledgeSource(
            tenant_id=tenant.id,
            type="manual",
            name=title,
            url=f"{title}: {content[:100]}",
            status="indexed",  # manually typed = immediately available
            chunk_count=1,
        )
        db.add(source)

    await db.commit()
    return {"success": True, "sources_created": len(saved_ids) + len(request.approved_items), "message": "Knowledge base populated!"}

