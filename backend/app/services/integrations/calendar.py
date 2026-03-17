"""
Google Calendar Integration
────────────────────────────
Creates calendar events and checks availability for appointment booking.

Requires:
    GOOGLE_CALENDAR_CREDENTIALS (JSON string of service account credentials)
    GOOGLE_CALENDAR_ID (calendar ID to book into, e.g. primary)

These are stored as tenant settings: tenant.google_calendar_credentials,
tenant.google_calendar_id.
"""
from loguru import logger
from datetime import datetime, timedelta
from typing import Optional


async def create_calendar_event(
    calendar_id: str,
    credentials_json: str,
    summary: str,
    start_dt: str,
    end_dt: Optional[str] = None,
    attendee_email: Optional[str] = None,
    description: str = "",
) -> dict:
    """
    Create a Google Calendar event.

    Args:
        calendar_id: Google Calendar ID (e.g. "primary" or specific email)
        credentials_json: Service account credentials as JSON string
        summary: Event title
        start_dt: ISO 8601 datetime string (e.g. "2026-03-20T10:00:00")
        end_dt: ISO 8601 datetime string; defaults to start + 1 hour
        attendee_email: Customer email to invite
        description: Optional description

    Returns:
        dict with event id, html_link, or error
    """
    try:
        import json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds_dict = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/calendar"],
        )

        start = datetime.fromisoformat(start_dt)
        end = datetime.fromisoformat(end_dt) if end_dt else (start + timedelta(hours=1))

        event_body = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
        }
        if attendee_email:
            event_body["attendees"] = [{"email": attendee_email}]

        service = build("calendar", "v3", credentials=credentials)
        event = service.events().insert(calendarId=calendar_id, body=event_body).execute()

        return {
            "success": True,
            "event_id": event.get("id"),
            "html_link": event.get("htmlLink"),
        }
    except ImportError:
        logger.warning("google-auth or google-api-python-client not installed — calendar integration unavailable")
        return {"success": False, "error": "Google Calendar library not installed"}
    except Exception as e:
        logger.error(f"Google Calendar event creation failed: {e}")
        return {"success": False, "error": str(e)}


async def check_availability(
    calendar_id: str,
    credentials_json: str,
    date: str,
    slot_duration_minutes: int = 60,
) -> list[str]:
    """
    Return list of available time slots (HH:MM) for a given date.

    Args:
        calendar_id: Google Calendar ID
        credentials_json: Service account credentials as JSON string
        date: Date string "YYYY-MM-DD"
        slot_duration_minutes: Length of each slot

    Returns:
        List of available ISO time strings like ["09:00", "10:00", ...]
    """
    try:
        import json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds_dict = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/calendar.readonly"],
        )

        day_start = datetime.fromisoformat(f"{date}T08:00:00")
        day_end = datetime.fromisoformat(f"{date}T18:00:00")

        service = build("calendar", "v3", credentials=credentials)
        events_result = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=day_start.isoformat() + "Z",
                timeMax=day_end.isoformat() + "Z",
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        booked_slots: list[tuple] = []
        for event in events_result.get("items", []):
            s = event["start"].get("dateTime")
            e = event["end"].get("dateTime")
            if s and e:
                booked_slots.append((datetime.fromisoformat(s), datetime.fromisoformat(e)))

        # Generate candidate slots
        available = []
        slot = day_start
        while slot + timedelta(minutes=slot_duration_minutes) <= day_end:
            slot_end = slot + timedelta(minutes=slot_duration_minutes)
            conflict = any(
                not (slot_end <= bs or slot >= be)
                for bs, be in booked_slots
            )
            if not conflict:
                available.append(slot.strftime("%H:%M"))
            slot += timedelta(minutes=slot_duration_minutes)

        return available
    except ImportError:
        logger.warning("google-auth not installed — calendar availability check unavailable")
        return []
    except Exception as e:
        logger.error(f"Calendar availability check failed: {e}")
        return []
