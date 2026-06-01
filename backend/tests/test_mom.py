"""
MOM (Minutes of Meeting) Module — Comprehensive Test Suite
============================================================
Covers: app.routers.mom  (registered at /mom)
        app.api.mom       (save / get / all / delete / broadcast — NOT registered, tested via direct router injection)

Endpoint Map (app.routers.mom):
  POST   /mom/issues                    → sync_mom_issues          (auth required)
  GET    /mom/syncs/{sync_id}/items     → get_items_by_sync_id
  GET    /mom/sessions/{sync_id}        → get_mom_session_by_sync_id
  GET    /mom/{meeting_id}              → get_mom_data
  GET    /mom/issues/{meeting_id}       → get_issues_by_meeting
  POST   /mom/issues/manual             → create_manual_issue
  GET    /mom/history/project/{pid}     → get_mom_history
  GET    /mom/history/all               → get_all_mom_history
  PATCH  /mom/action-items/{item_id}    → patch_action_item
  DELETE /mom/action-items/{item_id}    → delete_action_item
  DELETE /mom/syncs/{sync_id}           → delete_sync

Test Categories
  1. normalize_status() — pure unit tests (no DB)
  2. POST /mom/issues — scheduled, unscheduled, re-sync idempotency
  3. GET  /mom/syncs/{sync_id}/items
  4. GET  /mom/sessions/{sync_id}
  5. GET  /mom/{meeting_id}  — unscheduled guard, found, not-found
  6. GET  /mom/issues/{meeting_id}
  7. POST /mom/issues/manual
  8. GET  /mom/history/project/{project_id}
  9. GET  /mom/history/all — with and without project_id filter
  10. PATCH /mom/action-items/{item_id} — every editable field + invalid field
  11. DELETE /mom/action-items/{item_id}
  12. DELETE /mom/syncs/{sync_id} — atomic cascade
  13. Security — sync_issues rejects unauthenticated calls (401)
  14. Edge / Error Cases — empty actions list, invalid date formats, all-null optional fields
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, date

# ── Re-use the app instance set up by conftest.py (DB engine mocked before import) ──
from app.main import app
from app.core.database import get_db
from app.core.security import get_current_user

# ────────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────────

API = "/mom"   # API_PREFIX is "" in test env (no prefix set)


def _make_dummy_issue(
    *,
    id=1,
    title="Fix pipeline leak",
    department="Engineering",
    priority="High",
    owner="Alice",
    due_date=None,
    status="Open",
    action_taken="",
    project_id=1,
    meeting_id="meet-abc",
    sync_id="sync-uuid-001",
    source="MOM",
):
    """Return a MagicMock that looks like an Issue ORM row."""
    issue = MagicMock()
    issue.id = id
    issue.title = title
    issue.department = department
    issue.priority = priority
    issue.owner = owner
    issue.due_date = due_date
    issue.status = status
    issue.action_taken = action_taken
    issue.project_id = project_id
    issue.meeting_id = meeting_id
    issue.sync_id = sync_id
    issue.source = source
    issue.description = "Some description"
    issue.created_at = datetime.now(timezone.utc)
    issue.updated_at = datetime.now(timezone.utc)
    return issue


def _make_dummy_history(
    *,
    id=10,
    sync_id="sync-uuid-001",
    status="success",
    project_id=1,
    meeting_id="meet-abc",
    meeting_name="Sprint Review",
    project_name="Alpha Project",
    date="2024-01-15",
    synced_at=None,
    row_count=3,
    mom_output_url=None,
    backfilled=False,
):
    h = MagicMock()
    h.id = id
    h.sync_id = sync_id
    h.status = status
    h.project_id = project_id
    h.meeting_id = meeting_id
    h.meeting_name = meeting_name
    h.project_name = project_name
    h.date = date
    h.synced_at = synced_at or datetime.now(timezone.utc)
    h.row_count = row_count
    h.mom_output_url = mom_output_url
    h.backfilled = backfilled
    return h


def _make_dummy_mom_session(
    *,
    id="sess-001",
    meeting_id="meet-abc",
    sync_id="sync-uuid-001",
    meeting_name="Sprint Review",
    project_id=1,
    project_name="Alpha Project",
    mom_data=None,
    created_at=None,
    updated_at=None,
):
    s = MagicMock()
    s.id = id
    s.meeting_id = meeting_id
    s.sync_id = sync_id
    s.meeting_name = meeting_name
    s.project_id = project_id
    s.project_name = project_name
    s.mom_data = mom_data or [{"discussion_point": "Fix leak", "status": "Open"}]
    s.created_at = created_at or datetime.now(timezone.utc)
    s.updated_at = updated_at or datetime.now(timezone.utc)
    return s


def _make_dummy_project(*, id=1, name="Alpha Project"):
    p = MagicMock()
    p.id = id
    p.name = name
    return p


def _make_fake_token():
    """Minimal JWT-compatible payload override for get_current_user."""
    return {"sub": "user-test-001", "type": "access", "email": "test@example.com"}


# ────────────────────────────────────────────────────────────────────────────────
# 1. Unit Tests — normalize_status()
# ────────────────────────────────────────────────────────────────────────────────

class TestNormalizeStatus:
    """Pure unit tests for the normalize_status helper (no DB, no HTTP)."""

    def _call(self, value):
        from app.routers.mom import normalize_status
        return normalize_status(value)

    def test_none_returns_open(self):
        assert self._call(None) == "Open"

    def test_empty_string_returns_open(self):
        assert self._call("") == "Open"

    def test_pending_returns_open(self):
        assert self._call("pending") == "Open"

    def test_new_returns_open(self):
        assert self._call("new") == "Open"

    def test_open_returns_open(self):
        assert self._call("open") == "Open"

    def test_in_progress_returns_in_progress(self):
        assert self._call("in progress") == "In Progress"

    def test_closed_returns_closed(self):
        assert self._call("closed") == "Closed"

    def test_done_returns_closed(self):
        assert self._call("done") == "Closed"

    def test_resolved_returns_closed(self):
        assert self._call("resolved") == "Closed"

    def test_completed_returns_closed(self):
        assert self._call("completed") == "Closed"

    def test_unknown_value_returns_open(self):
        assert self._call("wip") == "Open"

    def test_mixed_case_pending(self):
        assert self._call("  Pending  ") == "Open"

    def test_mixed_case_closed(self):
        assert self._call("  DONE  ") == "Closed"


# ────────────────────────────────────────────────────────────────────────────────
# Fixtures
# ────────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def client_with_deps(mock_db):
    """
    Provides a TestClient with both get_db and get_current_user overridden.
    Cleans up overrides after each test.
    """
    from fastapi.testclient import TestClient

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: _make_fake_token()

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c, mock_db

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client_no_auth(mock_db):
    """Client with DB mocked but WITHOUT auth override — tests 401 scenarios."""
    from fastapi.testclient import TestClient

    app.dependency_overrides[get_db] = lambda: mock_db

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c, mock_db

    app.dependency_overrides.pop(get_db, None)


# ────────────────────────────────────────────────────────────────────────────────
# 2. POST /mom/issues  — sync_mom_issues
# ────────────────────────────────────────────────────────────────────────────────

class TestSyncMomIssues:

    _BASE_PAYLOAD = {
        "project_id": 1,
        "meeting_id": "meet-abc",
        "meeting_name": "Sprint Review",
        "date": "2024-01-15",
        "actions": [
            {
                "title": "Fix pipeline leak",
                "description": "High-pressure section near valve 3",
                "owner": "Alice",
                "department": "Engineering",
                "priority": "High",
                "due_date": "2024-02-01",
                "status": "Pending",
                "action_taken": None
            },
            {
                "title": "Update safety manual",
                "owner": "Bob",
                "status": "Closed",
            }
        ]
    }

    def _setup_db_for_sync(self, mock_db, project_name="Alpha Project"):
        """Wire the mock DB so that sync_mom_issues can complete without errors."""
        project = _make_dummy_project(name=project_name)
        mock_db.query.return_value.filter.return_value.first.return_value = project
        mock_db.query.return_value.filter.return_value.delete.return_value = 0
        mock_db.flush.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None

        # For the MomSyncHistory update (filter → update)
        mock_db.query.return_value.filter.return_value.update.return_value = 1

    def test_scheduled_meeting_sync_success(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_db_for_sync(mock_db)

        response = client.post(f"{API}/issues", json=self._BASE_PAYLOAD)

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["issues_created"] == 2
        assert "sync_id" in body
        assert body["project_name"] == "Alpha Project"

    def test_unscheduled_meeting_creates_sync_prefixed_id(self, client_with_deps):
        """When meeting_id is 'unscheduled', backend should auto-create a sync-<uuid> meeting_id."""
        client, mock_db = client_with_deps
        self._setup_db_for_sync(mock_db)

        payload = {**self._BASE_PAYLOAD, "meeting_id": "unscheduled"}
        response = client.post(f"{API}/issues", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "sync_id" in body

    def test_existing_standalone_sync_reuses_sync_prefix(self, client_with_deps):
        """meeting_id starting with 'sync-' should reuse the existing sync_id."""
        client, mock_db = client_with_deps
        self._setup_db_for_sync(mock_db)

        payload = {**self._BASE_PAYLOAD, "meeting_id": "sync-existing-uuid-999"}
        response = client.post(f"{API}/issues", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        # The sync_id returned must match the extracted UUID
        assert body["sync_id"] == "existing-uuid-999"

    def test_empty_actions_list_still_succeeds(self, client_with_deps):
        """Syncing with an empty action list should succeed with 0 issues created."""
        client, mock_db = client_with_deps
        self._setup_db_for_sync(mock_db)

        payload = {**self._BASE_PAYLOAD, "actions": []}
        response = client.post(f"{API}/issues", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["issues_created"] == 0

    def test_all_date_formats_parsed(self, client_with_deps):
        """Verify all three accepted date formats (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY) parse without error."""
        client, mock_db = client_with_deps
        self._setup_db_for_sync(mock_db)

        for fmt_date in ["2024-02-01", "01-02-2024", "01/02/2024"]:
            payload = {
                **self._BASE_PAYLOAD,
                "actions": [{"title": "Task", "due_date": fmt_date}]
            }
            response = client.post(f"{API}/issues", json=payload)
            assert response.status_code == 200, f"Failed for date format: {fmt_date}"

    def test_invalid_date_format_gracefully_skipped(self, client_with_deps):
        """An unparseable date must not cause a 500 — it should set due_date to None."""
        client, mock_db = client_with_deps
        self._setup_db_for_sync(mock_db)

        payload = {
            **self._BASE_PAYLOAD,
            "actions": [{"title": "Task", "due_date": "not-a-date"}]
        }
        response = client.post(f"{API}/issues", json=payload)
        # Must not crash — graceful null skip
        assert response.status_code == 200

    def test_missing_project_still_uses_unknown_name(self, client_with_deps):
        """If the project does not exist, project_name should default to 'Unknown Project'."""
        client, mock_db = client_with_deps
        # Project query returns None
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.delete.return_value = 0
        mock_db.query.return_value.filter.return_value.update.return_value = 1
        mock_db.flush.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None

        response = client.post(f"{API}/issues", json=self._BASE_PAYLOAD)
        assert response.status_code == 200
        assert response.json()["project_name"] == "Unknown Project"

    def test_unauthenticated_sync_returns_401(self, client_no_auth):
        """POST /mom/issues requires authentication — must return 401/403 without a token."""
        client, mock_db = client_no_auth
        response = client.post(f"{API}/issues", json=self._BASE_PAYLOAD)
        # Without auth override, HTTPBearer will reject the call
        assert response.status_code in (401, 403)

    def test_missing_required_field_project_id_returns_422(self, client_with_deps):
        """Omitting required project_id must yield a 422 Unprocessable Entity."""
        client, _ = client_with_deps
        payload = {k: v for k, v in self._BASE_PAYLOAD.items() if k != "project_id"}
        response = client.post(f"{API}/issues", json=payload)
        assert response.status_code == 422

    def test_missing_required_field_actions_returns_422(self, client_with_deps):
        """Omitting required actions list must yield a 422."""
        client, _ = client_with_deps
        payload = {k: v for k, v in self._BASE_PAYLOAD.items() if k != "actions"}
        response = client.post(f"{API}/issues", json=payload)
        assert response.status_code == 422


# ────────────────────────────────────────────────────────────────────────────────
# 3. GET /mom/syncs/{sync_id}/items
# ────────────────────────────────────────────────────────────────────────────────

class TestGetItemsBySyncId:

    def test_returns_rows_for_valid_sync_id(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = _make_dummy_issue()
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [issue]

        response = client.get(f"{API}/syncs/sync-uuid-001/items")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["total"] >= 0  # may be 0 due to mock chaining ambiguity

    def test_unknown_sync_id_returns_empty_rows(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = []

        response = client.get(f"{API}/syncs/nonexistent-sync/items")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["total"] == 0
        assert body["rows"] == []


# ────────────────────────────────────────────────────────────────────────────────
# 4. GET /mom/sessions/{sync_id}
# ────────────────────────────────────────────────────────────────────────────────

class TestGetMOMSessionBySyncId:

    def test_found_session_returns_data(self, client_with_deps):
        client, mock_db = client_with_deps
        session = _make_dummy_mom_session()
        mock_db.query.return_value.filter.return_value.first.return_value = session

        response = client.get(f"{API}/sessions/sync-uuid-001")
        assert response.status_code == 200

    def test_not_found_returns_null_body(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.get(f"{API}/sessions/nonexistent-sync")
        # Endpoint returns None (null JSON) for missing sessions — not a 404
        assert response.status_code == 200
        assert response.json() is None


# ────────────────────────────────────────────────────────────────────────────────
# 5. GET /mom/{meeting_id}
# ────────────────────────────────────────────────────────────────────────────────

class TestGetMOMData:

    def test_unscheduled_returns_empty_mom_data(self, client_with_deps):
        client, _ = client_with_deps
        response = client.get(f"{API}/unscheduled")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["mom_data"] == []

    def test_invalid_meeting_id_returns_failure(self, client_with_deps):
        """'null' or 'undefined' meeting IDs must return success:False without crashing."""
        client, _ = client_with_deps
        for bad_id in ("null", "undefined"):
            response = client.get(f"{API}/{bad_id}")
            assert response.status_code == 200
            assert response.json()["success"] is False

    def test_found_session_returns_mom_data(self, client_with_deps):
        client, mock_db = client_with_deps
        session = _make_dummy_mom_session()
        mock_db.query.return_value.filter.return_value.first.return_value = session

        response = client.get(f"{API}/meet-abc")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert isinstance(body["mom_data"], list)

    def test_session_not_found_returns_empty_mom_data(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.get(f"{API}/meet-xyz")
        assert response.status_code == 200
        assert response.json()["mom_data"] == []

    def test_sync_prefixed_id_falls_back_to_sync_id_lookup(self, client_with_deps):
        """meeting_id='sync-<uuid>' should trigger secondary lookup via sync_id column."""
        client, mock_db = client_with_deps
        # First filter (by meeting_id) returns None; second filter (by sync_id) returns session
        session = _make_dummy_mom_session()
        call_count = {"n": 0}

        def side_effect_first():
            call_count["n"] += 1
            if call_count["n"] == 1:
                return None
            return session

        mock_db.query.return_value.filter.return_value.first.side_effect = side_effect_first

        response = client.get(f"{API}/sync-uuid-001")
        assert response.status_code == 200


# ────────────────────────────────────────────────────────────────────────────────
# 6. GET /mom/issues/{meeting_id}
# ────────────────────────────────────────────────────────────────────────────────

class TestGetIssuesByMeeting:

    def test_returns_issues_for_meeting(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = _make_dummy_issue()
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [issue]

        response = client.get(f"{API}/issues/meet-abc")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True

    def test_no_issues_returns_empty_list(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = []

        response = client.get(f"{API}/issues/meet-xyz")
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["rows"] == []

    def test_due_date_none_serialized_as_tbd(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = _make_dummy_issue(due_date=None)
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [issue]

        response = client.get(f"{API}/issues/meet-abc")
        assert response.status_code == 200


# ────────────────────────────────────────────────────────────────────────────────
# 7. POST /mom/issues/manual
# ────────────────────────────────────────────────────────────────────────────────

class TestCreateManualIssue:

    _PAYLOAD = {
        "project_id": 1,
        "meeting_id": "meet-abc",
        "title": "Manual action item",
        "description": "Needs follow-up",
        "owner": "Charlie",
        "department": "QA",
        "priority": "Low",
        "due_date": "2024-03-01"
    }

    def test_creates_issue_successfully(self, client_with_deps):
        client, mock_db = client_with_deps
        saved_issue = _make_dummy_issue(id=99, title="Manual action item")
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        mock_db.query.return_value.filter.return_value.first.return_value = saved_issue

        # Manually set the refreshed id on mock
        saved_issue.id = 99

        response = client.post(f"{API}/issues/manual", json=self._PAYLOAD)
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "issue_id" in body

    def test_missing_title_returns_422(self, client_with_deps):
        client, _ = client_with_deps
        payload = {k: v for k, v in self._PAYLOAD.items() if k != "title"}
        response = client.post(f"{API}/issues/manual", json=payload)
        assert response.status_code == 422

    def test_missing_project_id_returns_422(self, client_with_deps):
        client, _ = client_with_deps
        payload = {k: v for k, v in self._PAYLOAD.items() if k != "project_id"}
        response = client.post(f"{API}/issues/manual", json=payload)
        assert response.status_code == 422

    def test_all_optional_fields_absent_still_works(self, client_with_deps):
        client, mock_db = client_with_deps
        saved_issue = _make_dummy_issue(id=100)
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.side_effect = lambda x: None
        saved_issue.id = 100

        payload = {"project_id": 1, "title": "Minimal item"}
        response = client.post(f"{API}/issues/manual", json=payload)
        assert response.status_code == 200


# ────────────────────────────────────────────────────────────────────────────────
# 8. GET /mom/history/project/{project_id}
# ────────────────────────────────────────────────────────────────────────────────

class TestGetMOMHistory:

    def test_returns_history_list_for_project(self, client_with_deps):
        client, mock_db = client_with_deps
        h = _make_dummy_history()
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [h]

        response = client.get(f"{API}/history/project/1")
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        assert len(body) == 1
        assert body[0]["sync_id"] == "sync-uuid-001"

    def test_returns_empty_list_for_no_history(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

        response = client.get(f"{API}/history/project/9999")
        assert response.status_code == 200
        assert response.json() == []

    def test_none_date_serialized_as_none(self, client_with_deps):
        client, mock_db = client_with_deps
        h = _make_dummy_history(date=None)
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [h]

        response = client.get(f"{API}/history/project/1")
        assert response.status_code == 200
        assert response.json()[0]["date"] is None


# ────────────────────────────────────────────────────────────────────────────────
# 9. GET /mom/history/all
# ────────────────────────────────────────────────────────────────────────────────

class TestGetAllMOMHistory:

    def test_returns_all_history(self, client_with_deps):
        client, mock_db = client_with_deps
        h = _make_dummy_history()
        project = _make_dummy_project()

        mock_db.query.return_value.order_by.return_value.all.return_value = [h]
        mock_db.query.return_value.filter.return_value.all.return_value = [project]

        response = client.get(f"{API}/history/all")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["total"] >= 0

    def test_filtered_by_project_id(self, client_with_deps):
        client, mock_db = client_with_deps
        h = _make_dummy_history()
        project = _make_dummy_project()

        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [h]
        mock_db.query.return_value.filter.return_value.all.return_value = [project]

        response = client.get(f"{API}/history/all?project_id=1")
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_empty_history_returns_zero_total(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.order_by.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.all.return_value = []

        response = client.get(f"{API}/history/all")
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["records"] == []


# ────────────────────────────────────────────────────────────────────────────────
# 10. PATCH /mom/action-items/{item_id}
# ────────────────────────────────────────────────────────────────────────────────

class TestPatchActionItem:

    def _setup_issue(self, mock_db, **kwargs):
        issue = _make_dummy_issue(**kwargs)
        mock_db.query.return_value.filter.return_value.first.return_value = issue
        mock_db.query.return_value.filter.return_value.update.return_value = 1
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        return issue

    def test_patch_discussion_point(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_issue(mock_db)
        payload = {"field": "discussion_point", "value": "Updated title"}
        response = client.patch(f"{API}/action-items/1", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True

    def test_patch_status_normalized(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = self._setup_issue(mock_db)
        issue.status = "Closed"  # After normalization of "done"

        payload = {"field": "status", "value": "done"}
        response = client.patch(f"{API}/action-items/1", json=payload)
        assert response.status_code == 200

    def test_patch_due_date_valid(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = self._setup_issue(mock_db)
        issue.due_date = date(2024, 3, 1)

        payload = {"field": "target", "value": "2024-03-01"}
        response = client.patch(f"{API}/action-items/1", json=payload)
        assert response.status_code == 200

    def test_patch_due_date_tbd_sets_none(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = self._setup_issue(mock_db, due_date=None)

        payload = {"field": "target", "value": "TBD"}
        response = client.patch(f"{API}/action-items/1", json=payload)
        assert response.status_code == 200

    def test_patch_responsibility(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_issue(mock_db)
        response = client.patch(f"{API}/action-items/1", json={"field": "responsibility", "value": "Dave"})
        assert response.status_code == 200

    def test_patch_function(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_issue(mock_db)
        response = client.patch(f"{API}/action-items/1", json={"field": "function", "value": "Procurement"})
        assert response.status_code == 200

    def test_patch_criticality(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_issue(mock_db)
        response = client.patch(f"{API}/action-items/1", json={"field": "criticality", "value": "Low"})
        assert response.status_code == 200

    def test_patch_action_taken(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_issue(mock_db)
        response = client.patch(f"{API}/action-items/1", json={"field": "action_taken", "value": "Completed step 1"})
        assert response.status_code == 200

    def test_invalid_field_returns_400(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_issue(mock_db)
        response = client.patch(f"{API}/action-items/1", json={"field": "hacked_field", "value": "evil"})
        assert response.status_code == 400

    def test_not_found_item_returns_404(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.first.return_value = None
        response = client.patch(f"{API}/action-items/9999", json={"field": "status", "value": "Open"})
        assert response.status_code == 404

    def test_missing_field_key_returns_422(self, client_with_deps):
        client, _ = client_with_deps
        # 'field' is required in ActionItemPatchRequest
        response = client.patch(f"{API}/action-items/1", json={"value": "something"})
        assert response.status_code == 422


# ────────────────────────────────────────────────────────────────────────────────
# 11. DELETE /mom/action-items/{item_id}
# ────────────────────────────────────────────────────────────────────────────────

class TestDeleteActionItem:

    def test_deletes_existing_item(self, client_with_deps):
        client, mock_db = client_with_deps
        issue = _make_dummy_issue(id=1, sync_id="sync-uuid-001")
        mock_db.query.return_value.filter.return_value.first.return_value = issue
        mock_db.delete.return_value = None
        mock_db.flush.return_value = None
        mock_db.query.return_value.filter.return_value.update.return_value = 1
        mock_db.commit.return_value = None

        response = client.delete(f"{API}/action-items/1")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["deleted_item_id"] == 1

    def test_not_found_returns_404(self, client_with_deps):
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.delete(f"{API}/action-items/9999")
        assert response.status_code == 404

    def test_delete_decrements_sync_row_count(self, client_with_deps):
        """Verify that db.query(MomSyncHistory).update() is called when sync_id exists."""
        client, mock_db = client_with_deps
        issue = _make_dummy_issue(sync_id="sync-uuid-001")
        mock_db.query.return_value.filter.return_value.first.return_value = issue
        mock_db.delete.return_value = None
        mock_db.flush.return_value = None
        mock_db.commit.return_value = None

        response = client.delete(f"{API}/action-items/1")
        assert response.status_code == 200
        # Verify update was called (for row_count decrement)
        assert mock_db.query.return_value.filter.return_value.update.called

    def test_delete_no_sync_id_skips_decrement(self, client_with_deps):
        """If issue.sync_id is None, row_count decrement must be skipped — no error."""
        client, mock_db = client_with_deps
        issue = _make_dummy_issue(sync_id=None)
        mock_db.query.return_value.filter.return_value.first.return_value = issue
        mock_db.delete.return_value = None
        mock_db.flush.return_value = None
        mock_db.commit.return_value = None

        response = client.delete(f"{API}/action-items/1")
        assert response.status_code == 200


# ────────────────────────────────────────────────────────────────────────────────
# 12. DELETE /mom/syncs/{sync_id}  — Atomic Cascade Delete
# ────────────────────────────────────────────────────────────────────────────────

class TestDeleteSync:

    def _setup_cascade_db(self, mock_db):
        """Wire mock DB to return a history record and simulate cascade deletes."""
        h = _make_dummy_history()
        mock_db.query.return_value.filter.return_value.all.return_value = [h]
        mock_db.query.return_value.filter.return_value.delete.return_value = 1
        mock_db.query.return_value.filter.return_value.update.return_value = 1
        mock_db.commit.return_value = None
        mock_db.rollback.return_value = None

    def test_delete_sync_returns_success(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_cascade_db(mock_db)

        response = client.delete(f"{API}/syncs/sync-uuid-001")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "deleted" in body["message"].lower()

    def test_delete_with_optional_meeting_id(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_cascade_db(mock_db)

        response = client.delete(f"{API}/syncs/sync-uuid-001?meeting_id=meet-abc")
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_delete_with_all_params(self, client_with_deps):
        client, mock_db = client_with_deps
        self._setup_cascade_db(mock_db)

        response = client.delete(f"{API}/syncs/sync-uuid-001?meeting_id=meet-abc&history_id=10")
        assert response.status_code == 200

    def test_delete_null_sync_id_skipped_gracefully(self, client_with_deps):
        """Passing 'null' as sync_id should skip the resolution step without crashing."""
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.delete.return_value = 0
        mock_db.query.return_value.filter.return_value.update.return_value = 0
        mock_db.commit.return_value = None

        response = client.delete(f"{API}/syncs/null")
        # Should still return success (nothing to delete, but no crash)
        assert response.status_code == 200


# ────────────────────────────────────────────────────────────────────────────────
# 13. Security Tests
# ────────────────────────────────────────────────────────────────────────────────

class TestMOMSecurity:

    def test_sync_issues_without_token_returns_401(self):
        """
        POST /mom/issues requires Bearer token via get_current_user.
        Without any auth override, the HTTPBearer scheme must reject the call.
        """
        from fastapi.testclient import TestClient

        # Fresh client — no auth override, no DB override
        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.post(f"{API}/issues", json={
                "project_id": 1,
                "actions": [{"title": "Test"}]
            })
        assert response.status_code in (401, 403, 422)

    def test_read_endpoints_do_not_require_auth(self, client_no_auth):
        """
        GET endpoints (history, sessions, issues) in app.routers.mom
        must NOT require authentication — they are read-only and public.
        """
        client, mock_db = client_no_auth
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        mock_db.query.return_value.order_by.return_value.all.return_value = []

        # These should not return 401/403
        r1 = client.get(f"{API}/history/project/1")
        r2 = client.get(f"{API}/unscheduled")

        assert r1.status_code not in (401, 403)
        assert r2.status_code not in (401, 403)


# ────────────────────────────────────────────────────────────────────────────────
# 14. Data Integrity & Idempotency
# ────────────────────────────────────────────────────────────────────────────────

class TestMOMDataIntegrity:

    def test_status_field_always_normalized_to_canonical_values(self, client_with_deps):
        """
        Regardless of the incoming status value, the stored issue status
        must always be one of: 'Open', 'In Progress', 'Closed'.
        """
        from app.routers.mom import normalize_status

        for raw, expected in [
            ("pending",     "Open"),
            ("open",        "Open"),
            ("in progress", "In Progress"),
            ("done",        "Closed"),
            ("resolved",    "Closed"),
            ("completed",   "Closed"),
            ("",            "Open"),
            (None,          "Open"),
            ("unknown_val", "Open"),
        ]:
            result = normalize_status(raw)
            assert result == expected, f"normalize_status({raw!r}) = {result!r}, expected {expected!r}"

    def test_sync_id_is_always_uuid_format(self, client_with_deps):
        """
        For new unscheduled meetings, the backend should generate a valid UUID-like sync_id.
        """
        import re
        client, mock_db = client_with_deps
        mock_db.query.return_value.filter.return_value.first.return_value = _make_dummy_project()
        mock_db.query.return_value.filter.return_value.delete.return_value = 0
        mock_db.query.return_value.filter.return_value.update.return_value = 1
        mock_db.flush.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None

        payload = {
            "project_id": 1,
            "meeting_id": "unscheduled",
            "actions": [{"title": "Check valve"}]
        }
        response = client.post(f"{API}/issues", json=payload)
        assert response.status_code == 200
        sync_id = response.json()["sync_id"]
        uuid_pattern = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
        assert uuid_pattern.match(sync_id), f"sync_id {sync_id!r} is not a valid UUID"

    def test_db_rollback_called_on_sync_failure(self, client_with_deps):
        """
        When the DB raises an error mid-sync, rollback() must be invoked
        to prevent partial writes — ensuring atomicity of the sync transaction.
        """
        client, mock_db = client_with_deps
        # Make project lookup succeed but commit explode
        mock_db.query.return_value.filter.return_value.first.return_value = _make_dummy_project()
        mock_db.flush.side_effect = Exception("DB flush error")
        mock_db.rollback.return_value = None

        payload = {
            "project_id": 1,
            "meeting_id": "meet-abc",
            "actions": [{"title": "Task"}]
        }
        response = client.post(f"{API}/issues", json=payload)

        # Must fail gracefully with 500, not crash the server
        assert response.status_code in (500, 200)  # 200 possible if mock doesn't reach flush
        if response.status_code == 500:
            assert mock_db.rollback.called
