"""
Analytics Rollup Service
─────────────────────────
Rolls up daily statistics into the analytics_daily table.
Runs nightly for the previous day via Celery beat.
"""
from loguru import logger
from sqlalchemy import text
from datetime import date

async def rollup_for_date(target_date: date, AsyncSessionLocal):
    """
    Computes totals for a given date and tenant, then stores in analytics_daily.
    """
    async with AsyncSessionLocal() as db:
        # 1. Get all active tenants
        tenants_result = await db.execute(text("SELECT id FROM tenants WHERE is_active = True"))
        tenant_ids = [str(r[0]) for r in tenants_result.all()]

        for t_id in tenant_ids:
            try:
                # 2. Query stats for the day
                # Conversations total
                conv_res = await db.execute(
                    text("SELECT COUNT(*) FROM conversations WHERE tenant_id = :t_id AND created_at::date = :d"),
                    {"t_id": t_id, "d": target_date}
                )
                total_convs = conv_res.scalar() or 0

                # Resolved conversations
                res_res = await db.execute(
                    text("SELECT COUNT(*) FROM conversations WHERE tenant_id = :t_id AND resolved_at::date = :d"),
                    {"t_id": t_id, "d": target_date}
                )
                resolved_convs = res_res.scalar() or 0

                # Escalated
                esc_res = await db.execute(
                    text("SELECT COUNT(*) FROM conversations WHERE tenant_id = :t_id AND status = 'escalated' AND updated_at::date = :d"),
                    {"t_id": t_id, "d": target_date}
                )
                escalated_convs = esc_res.scalar() or 0

                # Leads captured
                leads_res = await db.execute(
                    text("SELECT COUNT(*) FROM customers WHERE tenant_id = :t_id AND created_at::date = :d"),
                    {"t_id": t_id, "d": target_date}
                )
                leads_captured = leads_res.scalar() or 0

                # Appointments booked
                appt_res = await db.execute(
                    text("SELECT COUNT(*) FROM appointments WHERE tenant_id = :t_id AND created_at::date = :d"),
                    {"t_id": t_id, "d": target_date}
                )
                appts_booked = appt_res.scalar() or 0

                # Messages total
                msg_res = await db.execute(
                    text("SELECT COUNT(*) FROM messages WHERE tenant_id = :t_id AND created_at::date = :d"),
                    {"t_id": t_id, "d": target_date}
                )
                total_msgs = msg_res.scalar() or 0

                # 3. Upsert into analytics_daily
                await db.execute(
                    text("""
                        INSERT INTO analytics_daily (tenant_id, date, conversations_total, conversations_resolved, 
                                                   conversations_escalated, leads_captured, appointments_booked, 
                                                   messages_total)
                        VALUES (:t_id, :d, :tc, :cr, :ce, :lc, :ab, :tm)
                        ON CONFLICT (tenant_id, date) DO UPDATE SET
                            conversations_total = EXCLUDED.conversations_total,
                            conversations_resolved = EXCLUDED.conversations_resolved,
                            conversations_escalated = EXCLUDED.conversations_escalated,
                            leads_captured = EXCLUDED.leads_captured,
                            appointments_booked = EXCLUDED.appointments_booked,
                            messages_total = EXCLUDED.messages_total
                    """),
                    {
                        "t_id": t_id, "d": target_date,
                        "tc": total_convs, "cr": resolved_convs, "ce": escalated_convs,
                        "lc": leads_captured, "ab": appts_booked, "tm": total_msgs
                    }
                )
                await db.commit()

            except Exception as e:
                logger.error(f"Failed analytics rollup for tenant {t_id} on {target_date}: {e}")

        logger.info(f"Analytics rollup complete for {target_date} across {len(tenant_ids)} tenants")
