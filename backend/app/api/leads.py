## leads.py
import csv
import io
import json as _json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.models.customer import Customer

router = APIRouter()

@router.get("/")
async def get_leads(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer)
        .where(Customer.tenant_id == tenant.id)
        .order_by(Customer.created_at.desc())
    )
    customers = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "channel": c.channel,
            "language": c.language,
            "total_conversations": c.total_conversations,
            "last_seen_at": c.last_seen_at.isoformat() if c.last_seen_at else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in customers
    ]


@router.get("/export")
async def export_leads(
    format: str = "csv",
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """GDPR-compliant data export. format=csv|json"""
    result = await db.execute(
        select(Customer)
        .where(Customer.tenant_id == tenant.id)
        .order_by(Customer.created_at.desc())
    )
    customers = result.scalars().all()

    rows = [
        {
            "id": str(c.id),
            "name": c.name or "",
            "email": c.email or "",
            "phone": c.phone or "",
            "channel": c.channel or "",
            "language": c.language or "",
            "total_conversations": c.total_conversations,
            "last_seen_at": c.last_seen_at.isoformat() if c.last_seen_at else "",
            "created_at": c.created_at.isoformat(),
        }
        for c in customers
    ]

    if format == "json":
        content = _json.dumps(rows, indent=2, ensure_ascii=False)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=leads.json"},
        )

    # Default: CSV
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    else:
        output.write("id,name,email,phone,channel,language,total_conversations,last_seen_at,created_at\n")

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )


@router.delete("/{customer_id}")
async def delete_lead(
    customer_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """GDPR right to erasure — permanently delete a customer and their data."""
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant.id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.execute(
        delete(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant.id,
        )
    )
    await db.commit()
    return {"success": True, "message": "Customer data permanently deleted"}
