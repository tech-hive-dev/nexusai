"""
Shopify Integration Service
───────────────────────────
Real-time inventory + product lookups via Shopify Admin REST API.
Tenant must have shopify_store_domain + shopify_access_token configured.
"""
from dataclasses import dataclass, field
from typing import Optional
from loguru import logger
import httpx


@dataclass
class InventoryResult:
    sku: str
    available: int
    status: str          # "in_stock" | "low_stock" | "out_of_stock"
    product_title: str
    variant_title: str
    location: str = "Main Warehouse"


@dataclass
class ProductResult:
    id: str
    title: str
    description: str
    price: str
    currency: str
    images: list = field(default_factory=list)
    variants: list = field(default_factory=list)
    tags: str = ""


def _headers(access_token: str) -> dict:
    return {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }


async def get_inventory(sku: str, tenant) -> Optional[InventoryResult]:
    """
    Look up inventory level for a given SKU.
    Returns None if Shopify is not configured or product not found.
    """
    domain = getattr(tenant, "shopify_store_domain", None)
    token = getattr(tenant, "shopify_access_token", None)
    if not domain or not token:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Search variants by SKU
            resp = await client.get(
                f"https://{domain}/admin/api/2024-01/variants.json",
                headers=_headers(token),
                params={"fields": "id,sku,inventory_quantity,title,product_id,inventory_item_id"},
            )
            if resp.status_code != 200:
                logger.warning(f"Shopify variants API error {resp.status_code}")
                return None

            variants = resp.json().get("variants", [])
            matched = next((v for v in variants if v.get("sku", "").lower() == sku.lower()), None)
            if not matched:
                return None

            # Get product title
            prod_resp = await client.get(
                f"https://{domain}/admin/api/2024-01/products/{matched['product_id']}.json",
                headers=_headers(token),
                params={"fields": "id,title"},
            )
            product_title = prod_resp.json().get("product", {}).get("title", "Unknown product") if prod_resp.status_code == 200 else "Unknown product"

            qty = matched.get("inventory_quantity", 0)
            if qty <= 0:
                status = "out_of_stock"
            elif qty <= 5:
                status = "low_stock"
            else:
                status = "in_stock"

            return InventoryResult(
                sku=sku,
                available=qty,
                status=status,
                product_title=product_title,
                variant_title=matched.get("title", "Default"),
            )
    except Exception as e:
        logger.error(f"Shopify inventory lookup failed: {e}")
        return None


async def get_product(product_id: str, tenant) -> Optional[ProductResult]:
    """
    Fetch full product details by Shopify product ID.
    """
    domain = getattr(tenant, "shopify_store_domain", None)
    token = getattr(tenant, "shopify_access_token", None)
    if not domain or not token:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://{domain}/admin/api/2024-01/products/{product_id}.json",
                headers=_headers(token),
            )
            if resp.status_code != 200:
                return None

            p = resp.json().get("product", {})
            variants = p.get("variants", [])
            price = variants[0].get("price", "0.00") if variants else "0.00"

            return ProductResult(
                id=str(p.get("id", product_id)),
                title=p.get("title", ""),
                description=p.get("body_html", "").replace("<br>", "\n").replace("<p>", "").replace("</p>", "\n").strip(),
                price=price,
                currency="USD",
                images=[img.get("src", "") for img in p.get("images", [])[:3]],
                variants=[{"id": v["id"], "title": v["title"], "price": v["price"], "sku": v.get("sku", "")} for v in variants],
                tags=p.get("tags", ""),
            )
    except Exception as e:
        logger.error(f"Shopify product fetch failed: {e}")
        return None
