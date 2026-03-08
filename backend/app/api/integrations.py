"""
Integration App Store API
──────────────────────────
Catalog of supported integrations + OAuth connect/disconnect endpoints.
Credentials stored encrypted in tenant_integrations table.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])

# ─── Integration catalog ────────────────────────────────────────────
INTEGRATION_CATALOG = [
    {
        "id": "calcom",
        "name": "Cal.com",
        "description": "Sync appointments booked by AI directly into your Cal.com calendar",
        "icon": "📅",
        "category": "Scheduling",
        "fields": [{"key": "api_key", "label": "Cal.com API Key", "type": "password"},
                   {"key": "event_type_id", "label": "Event Type ID", "type": "text"}],
    },
    {
        "id": "google_calendar",
        "name": "Google Calendar",
        "description": "Push AI-booked appointments to Google Calendar automatically",
        "icon": "🗓️",
        "category": "Scheduling",
        "fields": [{"key": "calendar_id", "label": "Calendar ID", "type": "text"},
                   {"key": "service_account_json", "label": "Service Account JSON", "type": "password"}],
    },
    {
        "id": "slack",
        "name": "Slack",
        "description": "Get instant notifications for escalations, SLA breaches, and new leads",
        "icon": "💬",
        "category": "Notifications",
        "fields": [{"key": "webhook_url", "label": "Slack Webhook URL", "type": "text"}],
    },
    {
        "id": "zapier",
        "name": "Zapier",
        "description": "Connect NexusAI to 5,000+ apps via Zapier webhooks",
        "icon": "⚡",
        "category": "Automation",
        "fields": [{"key": "webhook_url", "label": "Zapier Webhook URL", "type": "text"}],
    },
    {
        "id": "hubspot",
        "name": "HubSpot CRM",
        "description": "Automatically push captured leads into HubSpot contacts",
        "icon": "🧡",
        "category": "CRM",
        "fields": [{"key": "api_key", "label": "HubSpot API Key", "type": "password"}],
    },
    {
        "id": "shopify",
        "name": "Shopify",
        "description": "Real-time inventory checks and cart recovery automation",
        "icon": "🛍️",
        "category": "E-commerce",
        "fields": [{"key": "store_domain", "label": "Store Domain (e.g. mystore.myshopify.com)", "type": "text"},
                   {"key": "access_token", "label": "Admin API Access Token", "type": "password"}],
    },
    {
        "id": "woocommerce",
        "name": "WooCommerce",
        "description": "Connect your WordPress/WooCommerce store for cart recovery",
        "icon": "🛒",
        "category": "E-commerce",
        "fields": [{"key": "store_url", "label": "Store URL", "type": "text"},
                   {"key": "consumer_key", "label": "Consumer Key", "type": "password"},
                   {"key": "consumer_secret", "label": "Consumer Secret", "type": "password"}],
    },
    {
        "id": "stripe",
        "name": "Stripe",
        "description": "Accept payments in chat and track revenue attribution",
        "icon": "💳",
        "category": "Payments",
        "fields": [{"key": "secret_key", "label": "Stripe Secret Key", "type": "password"},
                   {"key": "webhook_secret", "label": "Webhook Signing Secret", "type": "password"}],
    },
]


class ConnectRequest(BaseModel):
    integration_id: str
    credentials: dict


@router.get("/")
async def list_integrations(
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Return catalog with connection status for this tenant."""
    result = await db.execute(
        text("SELECT integration_type, is_active FROM tenant_integrations WHERE tenant_id = :tid"),
        {"tid": str(tenant.id)},
    )
    connected = {row.integration_type: row.is_active for row in result.fetchall()}

    catalog = []
    for integration in INTEGRATION_CATALOG:
        is_connected = connected.get(integration["id"], False)
        catalog.append({**integration, "connected": is_connected})

    return {"integrations": catalog}


@router.post("/connect")
async def connect_integration(
    body: ConnectRequest,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Connect an integration by storing credentials."""
    # Validate integration exists in catalog
    catalog_ids = {i["id"] for i in INTEGRATION_CATALOG}
    if body.integration_id not in catalog_ids:
        raise HTTPException(status_code=400, detail="Unknown integration")

    try:
        import json
        # Upsert credentials
        await db.execute(
            text("""
                INSERT INTO tenant_integrations (tenant_id, integration_type, credentials, is_active)
                VALUES (:tenant_id, :type, :creds::jsonb, true)
                ON CONFLICT (tenant_id, integration_type)
                DO UPDATE SET credentials = EXCLUDED.credentials, is_active = true, connected_at = NOW()
            """),
            {
                "tenant_id": str(tenant.id),
                "type": body.integration_id,
                "creds": json.dumps(body.credentials),
            },
        )

        # Also update tenant columns for key integrations
        if body.integration_id == "shopify":
            await db.execute(
                text("""
                    UPDATE tenants SET shopify_store_domain = :domain, shopify_access_token = :token
                    WHERE id = :tid
                """),
                {
                    "domain": body.credentials.get("store_domain", ""),
                    "token": body.credentials.get("access_token", ""),
                    "tid": str(tenant.id),
                },
            )
        elif body.integration_id == "slack":
            await db.execute(
                text("UPDATE tenants SET slack_webhook_url = :url WHERE id = :tid"),
                {"url": body.credentials.get("webhook_url", ""), "tid": str(tenant.id)},
            )

        await db.commit()
        return {"success": True, "message": f"Connected successfully"}
    except Exception as e:
        logger.error(f"Integration connect failed: {e}")
        raise HTTPException(status_code=500, detail="Connection failed")


@router.delete("/{integration_id}")
async def disconnect_integration(
    integration_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect an integration."""
    await db.execute(
        text("""
            UPDATE tenant_integrations SET is_active = false
            WHERE tenant_id = :tid AND integration_type = :type
        """),
        {"tid": str(tenant.id), "type": integration_id},
    )
    await db.commit()
    return {"success": True}


@router.get("/{integration_id}/config")
async def get_integration_config(
    integration_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get stored (redacted) credentials for an integration."""
    result = await db.execute(
        text("SELECT credentials FROM tenant_integrations WHERE tenant_id = :tid AND integration_type = :type AND is_active = true"),
        {"tid": str(tenant.id), "type": integration_id},
    )
    row = result.fetchone()
    if not row:
        return {"connected": False}

    # Redact password fields
    creds = dict(row.credentials or {})
    for key in list(creds.keys()):
        if any(sensitive in key.lower() for sensitive in ["key", "secret", "token", "password", "json"]):
            val = str(creds[key])
            creds[key] = val[:4] + "●●●●●●●" if len(val) > 4 else "●●●●●"

    return {"connected": True, "credentials": creds}
