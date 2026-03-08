"""
Reseller Portal API
────────────────────
Endpoints for white-label resellers to manage their clients.
Auth: JWT bearer or X-Reseller-API-Key header.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.core.reseller_auth import (
    get_current_reseller,
    hash_password,
    verify_password,
    generate_api_key,
    create_access_token,
)
from app.models.reseller import Reseller, ResellerClient
from app.models.tenant import Tenant

router = APIRouter(prefix="/api/reseller", tags=["reseller"])


# ─── SCHEMAS ──────────────────────────────────────────────────

class ResellerRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None


class ResellerLogin(BaseModel):
    email: EmailStr
    password: str


class CreateClientRequest(BaseModel):
    business_name: str
    business_email: EmailStr
    industry: Optional[str] = None
    retail_price: Optional[float] = 97.0
    wholesale_price: Optional[float] = 49.0
    custom_domain: Optional[str] = None
    logo_url: Optional[str] = None
    remove_nexusai_branding: bool = False
    brand_overrides: Optional[dict] = {}


class UpdateClientRequest(BaseModel):
    retail_price: Optional[float] = None
    wholesale_price: Optional[float] = None
    custom_domain: Optional[str] = None
    logo_url: Optional[str] = None
    remove_nexusai_branding: Optional[bool] = None
    brand_overrides: Optional[dict] = None


# ─── AUTH ─────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register_reseller(body: ResellerRegister, db: AsyncSession = Depends(get_db)):
    """Register a new reseller account."""
    existing = await db.execute(select(Reseller).where(Reseller.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    reseller = Reseller(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        company_name=body.company_name,
        api_key=generate_api_key(),
    )
    db.add(reseller)
    await db.commit()
    await db.refresh(reseller)

    return {
        "id": str(reseller.id),
        "email": reseller.email,
        "api_key": reseller.api_key,
        "token": create_access_token(str(reseller.id)),
    }


@router.post("/login")
async def login_reseller(body: ResellerLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reseller).where(Reseller.email == body.email))
    reseller = result.scalar_one_or_none()

    if not reseller or not verify_password(body.password, reseller.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not reseller.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")

    return {
        "token": create_access_token(str(reseller.id)),
        "reseller": {
            "id": str(reseller.id),
            "name": reseller.name,
            "email": reseller.email,
            "company_name": reseller.company_name,
            "api_key": reseller.api_key,
        },
    }


@router.get("/me")
async def get_me(reseller: Reseller = Depends(get_current_reseller)):
    return {
        "id": str(reseller.id),
        "name": reseller.name,
        "email": reseller.email,
        "company_name": reseller.company_name,
        "api_key": reseller.api_key,
        "created_at": reseller.created_at.isoformat(),
    }


@router.post("/rotate-api-key")
async def rotate_api_key(
    reseller: Reseller = Depends(get_current_reseller),
    db: AsyncSession = Depends(get_db),
):
    reseller.api_key = generate_api_key()
    await db.commit()
    return {"api_key": reseller.api_key}


# ─── CLIENTS ─────────────────────────────────────────────────

@router.get("/clients")
async def list_clients(
    reseller: Reseller = Depends(get_current_reseller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResellerClient, Tenant)
        .join(Tenant, ResellerClient.tenant_id == Tenant.id)
        .where(ResellerClient.reseller_id == reseller.id)
        .order_by(ResellerClient.created_at.desc())
    )
    rows = result.all()

    clients = []
    for rc, tenant in rows:
        clients.append({
            "id": str(rc.id),
            "tenant_id": str(tenant.id),
            "business_name": tenant.name,
            "slug": tenant.slug,
            "plan": tenant.plan,
            "plan_status": tenant.plan_status,
            "conversation_count": tenant.conversation_count,
            "retail_price": float(rc.retail_price or 0),
            "wholesale_price": float(rc.wholesale_price or 0),
            "margin": float((rc.retail_price or 0) - (rc.wholesale_price or 0)),
            "custom_domain": rc.custom_domain,
            "logo_url": rc.logo_url,
            "remove_nexusai_branding": rc.remove_nexusai_branding,
            "created_at": rc.created_at.isoformat(),
        })

    return {"clients": clients, "total": len(clients)}


@router.post("/clients", status_code=201)
async def create_client(
    body: CreateClientRequest,
    reseller: Reseller = Depends(get_current_reseller),
    db: AsyncSession = Depends(get_db),
):
    """Create a new white-label client tenant under this reseller."""
    import re, secrets

    # Generate unique slug from business name
    base_slug = re.sub(r"[^a-z0-9]", "-", body.business_name.lower())[:30].strip("-")
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create tenant
    tenant = Tenant(
        name=body.business_name,
        slug=slug,
        industry=body.industry,
    )
    db.add(tenant)
    await db.flush()  # get tenant.id

    # Create reseller_client link
    rc = ResellerClient(
        reseller_id=reseller.id,
        tenant_id=tenant.id,
        retail_price=body.retail_price,
        wholesale_price=body.wholesale_price,
        custom_domain=body.custom_domain,
        logo_url=body.logo_url,
        remove_nexusai_branding=body.remove_nexusai_branding,
        brand_overrides=body.brand_overrides or {},
    )
    db.add(rc)
    await db.commit()

    return {
        "id": str(rc.id),
        "tenant_id": str(tenant.id),
        "slug": slug,
        "dashboard_url": f"/dashboard",
        "embed_script": f'<script src="https://cdn.nexusai.app/widget.js" data-tenant="{slug}"></script>',
    }


@router.patch("/clients/{client_id}")
async def update_client(
    client_id: str,
    body: UpdateClientRequest,
    reseller: Reseller = Depends(get_current_reseller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResellerClient).where(
            ResellerClient.id == client_id,
            ResellerClient.reseller_id == reseller.id,
        )
    )
    rc = result.scalar_one_or_none()
    if not rc:
        raise HTTPException(status_code=404, detail="Client not found")

    if body.retail_price is not None:
        rc.retail_price = body.retail_price
    if body.wholesale_price is not None:
        rc.wholesale_price = body.wholesale_price
    if body.custom_domain is not None:
        rc.custom_domain = body.custom_domain
    if body.logo_url is not None:
        rc.logo_url = body.logo_url
    if body.remove_nexusai_branding is not None:
        rc.remove_nexusai_branding = body.remove_nexusai_branding
    if body.brand_overrides is not None:
        rc.brand_overrides = body.brand_overrides

    await db.commit()
    return {"success": True}


@router.delete("/clients/{client_id}", status_code=204)
async def delete_client(
    client_id: str,
    reseller: Reseller = Depends(get_current_reseller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResellerClient).where(
            ResellerClient.id == client_id,
            ResellerClient.reseller_id == reseller.id,
        )
    )
    rc = result.scalar_one_or_none()
    if not rc:
        raise HTTPException(status_code=404)
    await db.delete(rc)
    await db.commit()


# ─── ANALYTICS ────────────────────────────────────────────────

@router.get("/analytics")
async def reseller_analytics(
    reseller: Reseller = Depends(get_current_reseller),
    db: AsyncSession = Depends(get_db),
):
    """Cross-client analytics for the reseller dashboard."""
    result = await db.execute(
        select(
            func.count(ResellerClient.id).label("total_clients"),
            func.sum(ResellerClient.retail_price).label("total_mrr"),
            func.sum(ResellerClient.retail_price - ResellerClient.wholesale_price).label("total_margin"),
        ).where(ResellerClient.reseller_id == reseller.id)
    )
    row = result.mappings().one()

    # Conversation totals across all clients
    conv_result = await db.execute(
        text("""
            SELECT COALESCE(SUM(t.conversation_count), 0) as total_conversations
            FROM reseller_clients rc
            JOIN tenants t ON rc.tenant_id = t.id
            WHERE rc.reseller_id = :reseller_id
        """),
        {"reseller_id": str(reseller.id)},
    )
    conv_row = conv_result.mappings().one()

    return {
        "total_clients": row["total_clients"] or 0,
        "total_mrr": float(row["total_mrr"] or 0),
        "total_margin": float(row["total_margin"] or 0),
        "total_conversations": int(conv_row["total_conversations"]),
        "avg_margin_per_client": float(row["total_margin"] or 0) / max(row["total_clients"] or 1, 1),
    }
