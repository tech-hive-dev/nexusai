"""
Shopify Integration — Product Catalogue Sync
──────────────────────────────────────────────
Syncs Shopify products to the tenant's knowledge base (pgvector) so the
AI agent can answer product questions and inventory lookups.

Usage:
    await sync_shopify_products(tenant_id, shop_url, access_token, db)
"""
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx
import uuid


async def sync_shopify_products(
    tenant_id: str,
    shop_url: str,
    access_token: str,
    db: AsyncSession,
) -> dict:
    """
    Fetch product catalogue from Shopify Admin REST API and upsert into
    knowledge_chunks so the RAG pipeline can answer product questions.
    """
    shop_url = shop_url.rstrip("/")
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }
    products_url = f"{shop_url}/admin/api/2024-01/products.json?limit=250&fields=id,title,body_html,variants,images"

    synced = 0
    errors = 0

    async with httpx.AsyncClient(timeout=30) as client:
        while products_url:
            try:
                resp = await client.get(products_url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.error(f"Shopify API error: {e}")
                return {"success": False, "error": str(e)}

            products = data.get("products", [])
            for product in products:
                try:
                    price = ""
                    if product.get("variants"):
                        price = f"Price: £{product['variants'][0].get('price', 'N/A')}"
                    body = _strip_html(product.get("body_html") or "")
                    text_content = (
                        f"Product: {product['title']}\n"
                        f"{price}\n"
                        f"{body[:1000]}"
                    ).strip()

                    embedding = await _get_embedding(text_content)

                    # Upsert knowledge chunk (source_type = shopify)
                    await db.execute(
                        text("""
                            INSERT INTO knowledge_chunks
                                (id, tenant_id, source_id, content, embedding, metadata)
                            VALUES
                                (:id, :tid, :sid, :content, :emb, :meta::jsonb)
                            ON CONFLICT (tenant_id, content) DO UPDATE
                                SET embedding = EXCLUDED.embedding,
                                    metadata  = EXCLUDED.metadata
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "tid": tenant_id,
                            "sid": f"shopify-{product['id']}",
                            "content": text_content,
                            "emb": str(embedding) if embedding else None,
                            "meta": f'{{"source_type":"shopify","shopify_id":"{product["id"]}"}}',
                        },
                    )
                    synced += 1
                except Exception as e:
                    logger.warning(f"Skipped product {product.get('id')}: {e}")
                    errors += 1

            await db.commit()

            # Pagination — follow Link header
            link_header = resp.headers.get("Link", "")
            products_url = _next_page_url(link_header)

    logger.info(f"Shopify sync: {synced} products synced, {errors} errors (tenant={tenant_id})")
    return {"success": True, "synced": synced, "errors": errors}


async def get_order_status(order_number: str, shop_url: str, access_token: str) -> str:
    """Called by the agent tool to look up a Shopify order."""
    shop_url = shop_url.rstrip("/")
    headers = {"X-Shopify-Access-Token": access_token}
    url = f"{shop_url}/admin/api/2024-01/orders.json?name={order_number}&status=any"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            orders = resp.json().get("orders", [])
        if not orders:
            return f"Order {order_number} not found."
        order = orders[0]
        fulfillment = order.get("fulfillment_status") or "unfulfilled"
        financial = order.get("financial_status") or "pending"
        return f"Order {order_number}: {fulfillment} / payment {financial}."
    except Exception as e:
        return f"Could not retrieve order {order_number}: {e}"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", html).strip()


def _next_page_url(link_header: str) -> str | None:
    """Parse Shopify pagination Link header for next page URL."""
    for part in link_header.split(","):
        part = part.strip()
        if 'rel="next"' in part:
            url = part.split(";")[0].strip().strip("<>")
            return url
    return None


async def _get_embedding(text: str) -> list | None:
    """Get text embedding via the existing knowledge service."""
    try:
        from app.services.knowledge import get_embedding
        return await get_embedding(text)
    except Exception as e:
        logger.warning(f"Embedding skipped for Shopify product: {e}")
        return None
