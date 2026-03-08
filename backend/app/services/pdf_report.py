"""
PDF Report Service
───────────────────
Exports a conversation thread as a formatted PDF using reportlab.
Usage: bytes = await export_conversation_pdf(conversation_id, tenant, db)
"""
from __future__ import annotations
import io
from datetime import datetime
from loguru import logger

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.conversation import Conversation, Message
from app.models.customer import Customer


async def export_conversation_pdf(
    conversation_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> bytes | None:
    """Generate a PDF of the full conversation thread. Returns raw PDF bytes."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
        )
        from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
    except ImportError:
        logger.error("reportlab not installed. Run: pip install reportlab")
        return None

    # ── Fetch data ──────────────────────────────────────────────
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id,
        )
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        return None

    msgs_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msgs_result.scalars().all()

    customer = None
    if conv.customer_id:
        cust_result = await db.execute(
            select(Customer).where(Customer.id == conv.customer_id)
        )
        customer = cust_result.scalar_one_or_none()

    # ── Build PDF ────────────────────────────────────────────────
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Header
    header_style = ParagraphStyle(
        "Header", parent=styles["Heading1"],
        fontSize=18, textColor=colors.HexColor("#0F172A"), spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#64748B"), spaceAfter=2,
    )
    story.append(Paragraph("Conversation Audit Trail", header_style))
    story.append(Paragraph("NexusAI Platform — Exported Report", sub_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=12))

    # Meta table
    meta_data = [
        ["Conversation ID", str(conversation_id)],
        ["Channel", conv.channel or "—"],
        ["Status", conv.status or "—"],
        ["Customer", (customer.name or "Anonymous") if customer else "Anonymous"],
        ["Customer Email", (customer.email or "—") if customer else "—"],
        ["Language", conv.language or "en"],
        ["Sentiment", conv.sentiment or "neutral"],
        ["Annotation", conv.annotation or "—"],
        ["Created", conv.created_at.strftime("%Y-%m-%d %H:%M UTC")],
        ["Exported", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
    ]
    meta_table = Table(meta_data, colWidths=[4 * cm, 13 * cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#0F172A")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))

    # Messages heading
    story.append(Paragraph(f"Messages ({len(messages)} total)", styles["Heading2"]))
    story.append(Spacer(1, 8))

    # Message bubbles as table rows
    user_style = ParagraphStyle(
        "UserMsg", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#1E3A5F"),
        leftIndent=0, spaceAfter=0,
    )
    ai_style = ParagraphStyle(
        "AIMsg", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#1A2E1A"),
        leftIndent=0, spaceAfter=0,
    )
    ts_style = ParagraphStyle(
        "TS", parent=styles["Normal"],
        fontSize=7, textColor=colors.HexColor("#94A3B8"), spaceAfter=0,
    )

    for msg in messages:
        is_user = msg.role == "user"
        bg = colors.HexColor("#EFF6FF") if is_user else colors.HexColor("#F0FDF4")
        border = colors.HexColor("#BFDBFE") if is_user else colors.HexColor("#BBF7D0")
        label = "Customer" if is_user else "AI Agent"
        label_color = colors.HexColor("#1D4ED8") if is_user else colors.HexColor("#15803D")
        msg_style = user_style if is_user else ai_style

        ts = msg.created_at.strftime("%H:%M:%S UTC")
        content_text = (msg.content or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        label_para = Paragraph(f"<b><font color='#{label_color.hexval()[2:]}'>{label}</font></b>", styles["Normal"])
        ts_para = Paragraph(ts, ts_style)
        content_para = Paragraph(content_text, msg_style)

        row_table = Table(
            [[label_para, ts_para], [content_para, ""]],
            colWidths=[None, 3 * cm],
        )
        row_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.75, border),
            ("ROUNDEDCORNERS", [6, 6, 6, 6]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("SPAN", (0, 1), (1, 1)),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(row_table)
        story.append(Spacer(1, 6))

    # Footer
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"Generated by NexusAI Platform · {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} · Confidential",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7,
                       textColor=colors.HexColor("#94A3B8"), alignment=TA_CENTER),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
