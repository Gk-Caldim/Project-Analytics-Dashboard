from abc import ABC, abstractmethod
import requests
from datetime import datetime, timedelta
import uuid


class MeetingCreator(ABC):
    """Base class for creating meetings on different platforms"""

    @abstractmethod
    def create_meeting(self, meeting_data: dict) -> dict:
        """Create meeting and return {join_url, meeting_code}"""
        pass


class GoogleMeetCreator(MeetingCreator):
    """
    Create a Google Calendar event with an attached Meet link.

    The caller is responsible for supplying a *fresh* access_token
    (obtained via GoogleTokenService.get_fresh_access_token()).
    This class no longer does its own token refresh so all token
    management is centralised in GoogleTokenService.
    """

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.calendar_api = "https://www.googleapis.com/calendar/v3"

    def create_meeting(self, meeting_data: dict) -> dict:
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        # ── Parse date/time robustly ──────────────────────────────────
        time_str = meeting_data["time"]
        try:
            if "AM" in time_str.upper() or "PM" in time_str.upper():
                dt_obj = datetime.strptime(
                    f"{meeting_data['date']} {time_str}", "%Y-%m-%d %I:%M %p"
                )
            else:
                dt_obj = datetime.strptime(
                    f"{meeting_data['date']} {time_str}", "%Y-%m-%d %H:%M"
                )
        except ValueError:
            dt_obj = datetime.fromisoformat(
                f"{meeting_data['date']}T{time_str.split(' ')[0]}:00"
            )

        start_dt = dt_obj
        end_dt = start_dt + timedelta(minutes=meeting_data.get("duration_minutes", 60))

        # ── Build Calendar event payload ──────────────────────────────
        event = {
            "summary": meeting_data.get("title", "Scheduled Meeting"),
            "description": meeting_data.get("description", ""),
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": meeting_data.get("timezone_name", "UTC"),
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": meeting_data.get("timezone_name", "UTC"),
            },
            "attendees": [
                {"email": email.strip()}
                for email in meeting_data.get("attendees", [])
            ],
            "conferenceData": {
                "createRequest": {
                    "requestId": str(uuid.uuid4()),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 30},
                    {"method": "popup", "minutes": 10},
                ],
            },
        }

        response = requests.post(
            f"{self.calendar_api}/calendars/primary/events",
            headers=headers,
            json=event,
            params={"conferenceDataVersion": 1, "sendUpdates": "all"},
        )

        if response.status_code not in (200, 201):
            raise Exception(f"Failed to create Google Meet: {response.text}")

        event_data = response.json()

        # ── Extract Meet join URL ─────────────────────────────────────
        meet_link = None
        for ep in event_data.get("conferenceData", {}).get("entryPoints", []):
            if ep.get("entryPointType") == "video":
                meet_link = ep.get("uri")
                break
        if not meet_link:
            meet_link = event_data.get("htmlLink")

        return {
            "join_url": meet_link,
            "meeting_code": event_data.get("id"),
            "attendees_invited": True,
        }


class MicrosoftTeamsCreator(MeetingCreator):
    """Create Microsoft Teams meeting"""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.graph_api = "https://graph.microsoft.com/v1.0"

    def create_meeting(self, meeting_data: dict) -> dict:
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        time_str = meeting_data["time"]
        try:
            if "AM" in time_str.upper() or "PM" in time_str.upper():
                dt_obj = datetime.strptime(
                    f"{meeting_data['date']} {time_str}", "%Y-%m-%d %I:%M %p"
                )
            else:
                dt_obj = datetime.strptime(
                    f"{meeting_data['date']} {time_str}", "%Y-%m-%d %H:%M"
                )
        except ValueError:
            dt_obj = datetime.fromisoformat(
                f"{meeting_data['date']}T{time_str.split(' ')[0]}:00"
            )

        start_dt = dt_obj
        end_dt = start_dt + timedelta(minutes=meeting_data.get("duration_minutes", 60))

        event = {
            "subject": meeting_data.get("title", "Scheduled Meeting"),
            "body": {
                "contentType": "HTML",
                "content": meeting_data.get("description", ""),
            },
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": meeting_data.get("timezone_name", "UTC"),
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": meeting_data.get("timezone_name", "UTC"),
            },
            "attendees": [
                {
                    "emailAddress": {"address": email.strip()},
                    "type": "required",
                }
                for email in meeting_data.get("attendees", [])
            ],
            "isOnlineMeeting": True,
            "onlineMeetingProvider": "teamsForBusiness",
            "allowNewTimeProposals": False,
        }

        response = requests.post(
            f"{self.graph_api}/me/events", headers=headers, json=event
        )

        if response.status_code != 201:
            raise Exception(f"Failed to create Teams meeting: {response.text}")

        event_data = response.json()
        join_url = event_data.get("onlineMeeting", {}).get("joinUrl")

        return {
            "join_url": join_url,
            "meeting_code": event_data.get("id"),
            "attendees_invited": True,
        }


class ZoomMeetingCreator(MeetingCreator):
    """
    Create a Zoom meeting using Server-to-Server OAuth credentials.
    Requires account_id, client_id, and client_secret to fetch a machine-to-machine token.
    """

    def __init__(self, account_id: str, client_id: str, client_secret: str):
        self.account_id = account_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.zoom_api_base = "https://api.zoom.us/v2"

    def _get_access_token(self) -> str:
        """Fetch Server-to-Server OAuth access token from Zoom"""
        import base64
        if not self.account_id or not self.client_id or not self.client_secret:
            raise Exception("Zoom Server-to-Server OAuth credentials (Account ID/Client ID/Secret) are missing")

        token_url = "https://zoom.us/oauth/token"
        params = {
            "grant_type": "account_credentials",
            "account_id": self.account_id
        }
        
        # Base64 encode client_id:client_secret for Basic Auth
        auth_str = f"{self.client_id}:{self.client_secret}"
        b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
        
        headers = {
            "Authorization": f"Basic {b64_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        response = requests.post(token_url, params=params, headers=headers, timeout=10)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch Zoom OAuth token: {response.text}")

        return response.json()["access_token"]

    def create_meeting(self, meeting_data: dict) -> dict:
        access_token = self._get_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        # ── Parse date/time robustly ──────────────────────────────────
        time_str = meeting_data["time"]
        try:
            if "AM" in time_str.upper() or "PM" in time_str.upper():
                dt_obj = datetime.strptime(
                    f"{meeting_data['date']} {time_str}", "%Y-%m-%d %I:%M %p"
                )
            else:
                dt_obj = datetime.strptime(
                    f"{meeting_data['date']} {time_str}", "%Y-%m-%d %H:%M"
                )
        except ValueError:
            dt_obj = datetime.fromisoformat(
                f"{meeting_data['date']}T{time_str.split(' ')[0]}:00"
            )

        # Zoom expects ISO 8601 string format, e.g. "2026-05-28T10:00:00"
        start_time_iso = dt_obj.strftime("%Y-%m-%dT%H:%M:%S")

        payload = {
            "topic": meeting_data.get("title", "Scheduled Meeting"),
            "type": 2,  # Scheduled Meeting
            "start_time": start_time_iso,
            "duration": meeting_data.get("duration_minutes", 60),
            "timezone": meeting_data.get("timezone_name", "UTC"),
            "agenda": meeting_data.get("description", ""),
            "settings": {
                "join_before_host": True,
                "jbh_time": 0,
                "mute_upon_entry": True,
                "waiting_room": False,
                "host_video": True,
                "participant_video": True,
            }
        }

        # Use 'me' to create meeting under the credentials owner
        response = requests.post(
            f"{self.zoom_api_base}/users/me/meetings",
            headers=headers,
            json=payload,
            timeout=10
        )

        if response.status_code != 201:
            raise Exception(f"Failed to create Zoom meeting: {response.text}")

        event_data = response.json()
        
        return {
            "join_url": event_data.get("join_url"),
            "meeting_code": str(event_data.get("id")),
            "attendees_invited": True,
        }




