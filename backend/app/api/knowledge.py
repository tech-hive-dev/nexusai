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
    url: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    instagram_handle: Optional[str] = None
    facebook_handle: Optional[str] = None


class AutoDiscoverConfirmRequest(BaseModel):
    url: Optional[str] = None
    business_name: Optional[str] = None
    approved_items: list  # list of {title, content} dicts to save


@router.post("/auto-discover")
async def auto_discover(
    request: AutoDiscoverRequest,
    tenant=Depends(get_current_tenant),
    current_user=Depends(get_current_user),
):
    """
    Multi-source business discovery:
    - Fetches website HTML
    - Looks up Google Places using phone/address/name (most accurate with phone)
    - Fetches explicit social profiles (Instagram/Facebook handles if provided)
    - Returns KB items + a business_card for identity verification
    """
    import httpx, re as _re, json as _json
    from app.core.config import settings

    sources_used: list[str] = []
    website_text = ""
    places_data: dict = {}
    social_text = ""

    # ── 1. Website ─────────────────────────────────────────────────
    if request.url:
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=12) as client:
                resp = await client.get(request.url, headers={"User-Agent": "NexusAI/1.0 (business indexer)"})
                website_text = _re.sub(r'<[^>]+>', ' ', resp.text)
                website_text = _re.sub(r'\s+', ' ', website_text)[:8000]
            sources_used.append("website")
        except Exception as e:
            website_text = f"Could not fetch website: {str(e)}"

    # ── 2. Google Places — phone first, then address+name ──────────
    if settings.GOOGLE_PLACES_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # Build the best search query from what the user provided
                if request.phone:
                    search_query = request.phone
                elif request.address and request.business_name:
                    search_query = f"{request.business_name} {request.address}"
                elif request.business_name:
                    search_query = request.business_name
                else:
                    search_query = None

                if search_query:
                    search_resp = await client.get(
                        "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
                        params={
                            "input": search_query,
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
                                "fields": "name,formatted_address,formatted_phone_number,opening_hours,rating,website,types,editorial_summary",
                                "key": settings.GOOGLE_PLACES_API_KEY,
                            },
                        )
                        result = detail_resp.json().get("result", {})
                        if result:
                            places_data = result
                            sources_used.append("google_places")
        except Exception:
            pass

    # ── 3. Social profiles (explicit handles preferred over guessing) ─
    social_urls_to_fetch: list[tuple[str, str]] = []
    if request.instagram_handle:
        handle = request.instagram_handle.lstrip("@").strip()
        social_urls_to_fetch.append(("instagram", f"https://www.instagram.com/{handle}/"))
    if request.facebook_handle:
        handle = request.facebook_handle.lstrip("@").strip()
        social_urls_to_fetch.append(("facebook", f"https://www.facebook.com/{handle}"))

    # If no handles provided, try guessing from name (fallback)
    if not social_urls_to_fetch and request.business_name:
        slug = _re.sub(r'[^a-z0-9]', '', request.business_name.lower())
        if slug:
            social_urls_to_fetch = [
                ("facebook", f"https://www.facebook.com/{slug}"),
                ("instagram", f"https://www.instagram.com/{slug}/"),
            ]

    for platform, surl in social_urls_to_fetch:
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=8) as client:
                sresp = await client.get(surl, headers={"User-Agent": "Mozilla/5.0 (compatible; NexusAI/1.0)"})
                if sresp.status_code == 200:
                    stext = _re.sub(r'<[^>]+>', ' ', sresp.text)
                    stext = _re.sub(r'\s+', ' ', stext)[:2000]
                    social_text += f"\n[{platform} — {surl}]: {stext}"
                    if "social" not in sources_used:
                        sources_used.append("social")
        except Exception:
            pass

    # ── 4. Build business_card from Places data ────────────────────
    business_card: dict = {
        "name": places_data.get("name") or request.business_name or "",
        "address": places_data.get("formatted_address") or request.address or "",
        "phone": places_data.get("formatted_phone_number") or request.phone or "",
        "rating": places_data.get("rating"),
        "website": places_data.get("website") or request.url or "",
        "description": (places_data.get("editorial_summary") or {}).get("overview", ""),
        "hours": (places_data.get("opening_hours") or {}).get("weekday_text", []),
        "types": places_data.get("types", []),
        "sources": sources_used,
        "verified_via_google": "google_places" in sources_used,
    }

    # ── 5. LLM extraction ─────────────────────────────────────────
    anthropic_key = settings.ANTHROPIC_API_KEY
    if not anthropic_key:
        # No AI key — return minimal items from what we know
        items = []
        if request.business_name or request.url:
            items.append({"title": "Business", "content": f"Business: {request.business_name or ''}\nWebsite: {request.url or ''}\nPhone: {request.phone or ''}\nAddress: {request.address or ''}", "source": "website"})
        if places_data:
            parts = []
            if business_card["address"]: parts.append(f"Address: {business_card['address']}")
            if business_card["phone"]: parts.append(f"Phone: {business_card['phone']}")
            if business_card["rating"]: parts.append(f"Google Rating: {business_card['rating']}/5")
            if business_card["hours"]: parts.append("Hours:\n" + "\n".join(business_card["hours"]))
            if parts:
                items.append({"title": "Location & Contact", "content": "\n".join(parts), "source": "google_places"})
        if not items:
            items = [{"title": "Business Info", "content": "Add your business description here.", "source": "website"}]
        return {"items": items, "ai_powered": False, "business_card": business_card, "sources_used": sources_used}

    context_parts = []
    if website_text:
        context_parts.append(f"WEBSITE CONTENT:\n{website_text}")
    if places_data:
        places_summary = []
        if business_card["address"]: places_summary.append(f"Address: {business_card['address']}")
        if business_card["phone"]: places_summary.append(f"Phone: {business_card['phone']}")
        if business_card["rating"]: places_summary.append(f"Google Rating: {business_card['rating']}/5")
        if business_card["description"]: places_summary.append(f"Description: {business_card['description']}")
        if business_card["hours"]: places_summary.append("Opening Hours:\n" + "\n".join(business_card["hours"]))
        context_parts.append("GOOGLE PLACES DATA:\n" + "\n".join(places_summary))
    if social_text:
        context_parts.append(f"SOCIAL PROFILES:\n{social_text[:3000]}")

    prompt = f"""You are building a knowledge base for an AI customer service agent for this business.

Business name: {request.business_name or business_card.get("name") or "Unknown"}
Website: {request.url or "not provided"}
Phone: {request.phone or business_card.get("phone") or "not provided"}
Address: {request.address or business_card.get("address") or "not provided"}

{chr(10).join(context_parts)}

Extract structured knowledge as a JSON object with two keys:
1. "items" — array of knowledge base entries, each with "title", "content", "source"
   - source must be one of: "website", "google_places", "social"
   - Include: business description, products/services, pricing, hours, contact info, FAQs, policies, team
   - Only include items with real extracted data — skip generic placeholder text
2. "summary" — one paragraph describing what this business does (used for agent persona)

Return ONLY valid JSON, no explanation:
{{"items": [...], "summary": "..."}}"""

    try:
        async with httpx.AsyncClient(timeout=35) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={
                    "model": settings.AUTO_DISCOVER_MODEL,
                    "max_tokens": 2500,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
        raw = resp.json().get("content", [{}])[0].get("text", "{}").strip()
        # Extract JSON object
        start = raw.find("{")
        end = raw.rfind("}") + 1
        parsed = _json.loads(raw[start:end]) if start >= 0 else {}
        items = parsed.get("items", [])
        summary = parsed.get("summary", "")
        for item in items:
            item.setdefault("source", "website")
        if summary:
            business_card["description"] = business_card["description"] or summary
        return {
            "items": items,
            "ai_powered": True,
            "business_card": business_card,
            "sources_used": sources_used,
            "summary": summary,
        }
    except Exception as e:
        return {
            "items": [{"title": "Business Info", "content": f"{request.business_name or 'Business'} — {request.url or ''}", "source": "website"}],
            "ai_powered": False,
            "business_card": business_card,
            "sources_used": sources_used,
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

