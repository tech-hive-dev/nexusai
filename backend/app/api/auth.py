from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re

from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_token, get_current_user
from app.models.user import User
from app.models.tenant import Tenant

router = APIRouter()


class RegisterRequest(BaseModel):
    business_name: str
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    industry: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one number")
        if not any(char.isalpha() for char in v):
            raise ValueError("Password must contain at least one letter")
        if not any(not char.isalnum() for char in v):
            raise ValueError("Password must contain at least one special character")
        return v
    industry: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:50]


@router.post("/register")
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create tenant
    base_slug = slugify(request.business_name)
    slug = base_slug
    counter = 1
    while True:
        result = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if not result.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    tenant = Tenant(
        name=request.business_name,
        slug=slug,
        industry=request.industry,
        plan="starter",
        plan_status="trial",
    )
    db.add(tenant)
    await db.flush()

    # Create user
    user = User(
        tenant_id=tenant.id,
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name or request.business_name,
        role="owner",
    )
    db.add(user)
    await db.commit()

    token = create_token({"sub": str(user.id), "tenant_id": str(tenant.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant": {"id": str(tenant.id), "name": tenant.name, "slug": tenant.slug},
        "user": {"id": str(user.id), "email": user.email, "name": user.full_name},
    }


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_token({"sub": str(user.id), "tenant_id": str(user.tenant_id)})

    # Get tenant info
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one()

    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "plan": tenant.plan,
            "onboarding_completed": tenant.onboarding_completed,
            "onboarding_step": tenant.onboarding_step,
        },
        "user": {"id": str(user.id), "email": user.email, "name": user.full_name, "role": user.role},
    }


@router.get("/me")
async def get_me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one()
    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.full_name,
            "role": current_user.role,
        },
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "plan": tenant.plan,
            "plan_status": tenant.plan_status,
            "onboarding_completed": tenant.onboarding_completed,
            "onboarding_step": tenant.onboarding_step,
            "agent_name": tenant.agent_name,
            "brand_color": tenant.brand_color,
            "conversation_count": tenant.conversation_count,
            "conversation_limit": tenant.conversation_limit,
        },
    }
