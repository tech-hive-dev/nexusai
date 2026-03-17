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
    """Use Anthropic to analyze a website + Google Places + social and return structured business knowledge preview."""
    import httpx, os, re as _re, json as _json
    from app.core.config import settings

    # ── Step 1: Fetch website HTML (best-effort) ───────────────────
    website_text = ""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            resp = await client.get(request.url, headers={"User-Agent": "NexusAI/1.0 (business indexer)"})
            website_text = _re.sub(r'<[^>]+>', ' ', resp.text)
            website_text = _re.sub(r'\s+', ' ', website_text)[:8000]
    except Exception as e:
        website_text = f"Could not fetch website: {str(e)}"

    # ── Step 2: Google Places enrichment (gated on API key) ────────
    places_text = ""
    if settings.GOOGLE_PLACES_API_KEY and request.business_name:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                search_resp = await client.get(
                    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
                    params={
                        "input": request.business_name,
                        "inputtype": "textquery",
                        "fields": "place_id,name",
                        "key": settings.GOOGLE_PLACES_API_KEY,
                    },
                )
                candidates = search_resp.json().get("candidates", [])
                if candidates:
                    place_id = candidates[0]["place_id"]
                    detail_resp = await client.get(
                        "https://maps.googleapis.com/maps/api/place/details/json",
                        params={
                            "place_id": place_id,
                            "fields": "name,formatted_address,formatted_phone_number,opening_hours,rating,website,types",
                            "key": settings.GOOGLE_PLACES_API_KEY,
                        },
                    )
                    result = detail_resp.json().get("result", {})
                    parts = []
                    if result.get("formatted_address"):
                        parts.append(f"Address: {result['formatted_address']}")
                    if result.get("formatted_phone_number"):
                        parts.append(f"Phone: {result['formatted_phone_number']}")
                    if result.get("rating"):
                        parts.append(f"Google Rating: {result['rating']}/5")
                    if result.get("opening_hours", {}).get("weekday_text"):
                        parts.append("Hours:\n" + "\n".join(result["opening_hours"]["weekday_text"]))
                    places_text = "\n".join(parts)
        except Exception:
            pass  # graceful skip

    # ── Step 3: Social enrichment (best-effort) ────────────────────
    social_text = ""
    if request.business_name:
        slug = _re.sub(r'[^a-z0-9]', '', request.business_name.lower())
        social_urls = [
            f"https://www.facebook.com/{slug}",
            f"https://www.instagram.com/{slug}/",
        ]
        for surl in social_urls:
            try:
                async with httpx.AsyncClient(follow_redirects=True, timeout=6) as client:
                    sresp = await client.get(surl, headers={"User-Agent": "Mozilla/5.0"})
                    if sresp.status_code == 200:
                        stext = _re.sub(r'<[^>]+>', ' ', sresp.text)
                        stext = _re.sub(r'\s+', ' ', stext)[:2000]
                        social_text += f"\n[{surl}]: {stext}"
            except Exception:
                pass

    anthropic_key = settings.ANTHROPIC_API_KEY
    if not anthropic_key:
        return {
            "items": [
                {"title": "Business Website", "content": f"Website: {request.url}\nBusiness: {request.business_name or 'Unknown'}", "source": "website"},
                {"title": "About Us", "content": "Add your business description here.", "source": "website"},
                {"title": "Contact", "content": "Add your contact information here.", "source": "website"},
            ],
            "ai_powered": False,
        }

    # ── Step 4: LLM extraction ─────────────────────────────────────
    context_parts = [f"Website content:\n{website_text}"]
    if places_text:
        context_parts.append(f"Google Places data:\n{places_text}")
    if social_text:
        context_parts.append(f"Social pages (best-effort):\n{social_text[:3000]}")

    prompt = f"""You are analyzing a business to build a knowledge base for an AI customer service agent.

Business name: {request.business_name or "Unknown"}
Website URL: {request.url}

{chr(10).join(context_parts)}

Extract real information as a JSON array of objects with "title", "content", and "source" fields.
"source" must be one of: "website", "places", "social".
Include: description, products/services, hours, contact, FAQs, policies, team info.
Only include items where you found real data. Skip anything empty or generic.
Return ONLY a valid JSON array, no explanation."""

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={
                    "model": settings.AUTO_DISCOVER_MODEL,
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=30,
            )
        text = resp.json().get("content", [{}])[0].get("text", "[]").strip()
        start = text.find("[")
        end = text.rfind("]") + 1
        items = _json.loads(text[start:end]) if start >= 0 else []
        # Ensure every item has a source field
        for item in items:
            item.setdefault("source", "website")
        return {"items": items, "ai_powered": True, "sources_used": ["website"] + (["places"] if places_text else []) + (["social"] if social_text else [])}
    except Exception as e:
        return {
            "items": [
                {"title": "Business Website", "content": f"Website: {request.url}", "source": "website"},
                {"title": "About", "content": f"{request.business_name or 'This business'} — add description here.", "source": "website"},
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
        source_meta = {"auto_discovered": True, "discovery_source": item.get("source", "website")}
        source = KnowledgeSource(
            tenant_id=tenant.id,
            type="manual",
            name=title,
            url=f"{title}: {content[:100]}",
            status="indexed",
            chunk_count=1,
            source_meta=source_meta,
        )
        db.add(source)

    await db.commit()
    return {"success": True, "sources_created": len(saved_ids) + len(request.approved_items), "message": "Knowledge base populated!"}

