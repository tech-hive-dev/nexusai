"""
LTV & Churn Analytics Service
────────────────────────────────
Updates Lifetime Value (LTV) and Churn Risk scores for all customers.
Runs nightly via Celery beat.
"""
from loguru import logger
from sqlalchemy import text
from datetime import datetime

async def update_all_customer_scores(AsyncSessionLocal):
    """
    Nightly job to recalculate LTV and churn risk for every customer.
    LTV = Sum of all successful orders.
    Churn Risk = Heuristic based on days since last activity and sentiment history.
    """
    async with AsyncSessionLocal() as db:
        # 1. Update LTV from successful orders
        # Using a single query to update the 'ltv' (assuming preferences->'ltv' for now, 
        # or we could add a column. init.sql didn't show an LTV column but showed orders.)
        
        # Actually, let's just calculate it and store in customer notes or a metadata field if available.
        # Looking at init.sql, customers has 'preferences' JSONB.
        
        customers_query = text("""
            SELECT c.id, c.tenant_id, 
                   COALESCE(SUM(o.total_amount), 0) as calculated_ltv,
                   MAX(c.last_seen_at) as last_seen,
                   COUNT(DISTINCT conv.id) as conv_count
            FROM customers c
            LEFT JOIN orders o ON o.customer_id = c.id AND o.status IN ('paid', 'succeeded', 'delivered')
            LEFT JOIN conversations conv ON conv.customer_id = c.id
            GROUP BY c.id
        """)
        
        result = await db.execute(customers_query)
        rows = result.mappings().all()

        for idx, row in enumerate(rows):
            # Calculate churn risk (0 to 1)
            churn_risk = 0.0
            if row["last_seen"]:
                days_inactive = (datetime.utcnow() - row["last_seen"].replace(tzinfo=None)).days
                if days_inactive > 30:
                    churn_risk = min(1.0, 0.5 + (days_inactive - 30) * 0.01)
                elif days_inactive > 7:
                    churn_risk = 0.2
            else:
                churn_risk = 0.8 # Never seen? High risk or lead.

            # Update customer record
            # We'll store this in the 'preferences' JSONB column as 'analytics'
            await db.execute(
                text("""
                    UPDATE customers 
                    SET preferences = jsonb_set(
                        jsonb_set(COALESCE(preferences, '{}'), '{ltv}', :ltv),
                        '{churn_risk}', :risk
                    )
                    WHERE id = :id
                """),
                {
                    "ltv": str(row["calculated_ltv"]),
                    "risk": str(churn_risk),
                    "id": row["id"]
                }
            )
            
            if idx % 100 == 0:
                await db.commit()

        await db.commit()
        logger.info(f"Updated LTV and Churn Risk for {len(rows)} customers")
