"""
Reseller Authentication
────────────────────────
JWT + API key auth for the reseller portal.
Separate from tenant/user auth — resellers have their own context.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.reseller import Reseller

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-Reseller-API-Key", auto_error=False)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_api_key() -> str:
    return "rsk_" + secrets.token_urlsafe(32)


def create_access_token(reseller_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": reseller_id, "type": "reseller", "exp": expire},
        settings.JWT_SECRET,
        algorithm=ALGORITHM,
    )


async def get_current_reseller(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
    db: AsyncSession = Depends(get_db),
) -> Reseller:
    """Dependency: resolves reseller from JWT bearer token or API key."""
    reseller = None

    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, settings.JWT_SECRET, algorithms=[ALGORITHM])
            if payload.get("type") != "reseller":
                raise JWTError("Wrong token type")
            reseller_id = payload.get("sub")
            result = await db.execute(select(Reseller).where(Reseller.id == reseller_id))
            reseller = result.scalar_one_or_none()
        except JWTError:
            pass

    if not reseller and api_key:
        result = await db.execute(select(Reseller).where(Reseller.api_key == api_key))
        reseller = result.scalar_one_or_none()

    if not reseller or not reseller.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired reseller credentials",
        )

    return reseller
