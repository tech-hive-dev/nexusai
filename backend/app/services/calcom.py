"""
Cal.com Integration Service
────────────────────────────
Handles real-time appointment booking via Cal.com API.
Requires CAL_API_KEY in settings.
"""
import httpx
from loguru import logger
from datetime import datetime
from typing import Optional, List, Dict
from app.core.config import settings

CALCOM_API_BASE = "https://api.cal.com/v1"

async def get_available_slots(event_type_id: int, start_date: str, end_date: str) -> List[str]:
    """
    Fetch available time slots for a specific event type.
    """
    if not settings.CAL_API_KEY:
        logger.warning("CAL_API_KEY not configured")
        return []

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{CALCOM_API_BASE}/slots",
                params={
                    "apiKey": settings.CAL_API_KEY,
                    "eventTypeId": event_type_id,
                    "startTime": f"{start_date}T00:00:00Z",
                    "endTime": f"{end_date}T23:59:59Z",
                }
            )
            if resp.status_code != 200:
                logger.error(f"Cal.com slots error: {resp.status_code} - {resp.text}")
                return []
            
            # API returns a dict with 'slots' key
            data = resp.json()
            slots_dict = data.get("slots", {})
            
            # Flatten all slots from the dictionary (keyed by date)
            all_slots = []
            for date_str, slots in slots_dict.items():
                all_slots.extend([s["time"] for s in slots])
            
            return sorted(all_slots)
    except Exception as e:
        logger.error(f"Cal.com slot lookup failed: {e}")
        return []

async def create_booking(
    event_type_id: int,
    start_time: str,
    customer_name: str,
    customer_email: str,
    notes: Optional[str] = None
) -> Optional[Dict]:
    """
    Create a booking on Cal.com.
    """
    if not settings.CAL_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{CALCOM_API_BASE}/bookings",
                params={"apiKey": settings.CAL_API_KEY},
                json={
                    "eventTypeId": event_type_id,
                    "start": start_time,
                    "responses": {
                        "name": customer_name,
                        "email": customer_email,
                        "notes": notes or ""
                    },
                    "timeZone": "UTC",
                    "language": "en"
                }
            )
            if resp.status_code in (200, 201):
                return resp.json().get("booking")
            
            logger.error(f"Cal.com booking error: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        logger.error(f"Cal.com booking creation failed: {e}")
        return None
