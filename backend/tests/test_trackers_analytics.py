from unittest.mock import MagicMock
from app.core.config import API_PREFIX
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project
import datetime

def test_get_trackers_analytics_success(client, override_dependencies, mock_db):
    """
    Test that trackers analytics endpoint returns compiled stats.
    """
    # 1. Setup mock upload metadata objects
    mock_upload1 = MagicMock()
    mock_upload1.id = 1
    mock_upload1.project_id = 10
    mock_upload1.file_name = "Tracker1.xlsx"
    mock_upload1.department = "Design"
    mock_upload1.industry = None
    mock_upload1.row_count = 10
    mock_upload1.valid_row_count = 10
    mock_upload1.status = "Completed"
    mock_upload1.uploaded_by = "Alice"
    mock_upload1.uploaded_at = datetime.datetime(2026, 6, 18, 12, 0, 0)

    mock_upload2 = MagicMock()
    mock_upload2.id = 2
    mock_upload2.project_id = 10
    mock_upload2.file_name = "ManualTracker"
    mock_upload2.department = "Quality"
    mock_upload2.industry = "MANUAL"
    mock_upload2.row_count = 5
    mock_upload2.valid_row_count = 5
    mock_upload2.status = "Completed"
    mock_upload2.uploaded_by = "Bob"
    mock_upload2.uploaded_at = datetime.datetime(2026, 6, 18, 13, 0, 0)

    mock_project = Project(
        id=10,
        project_id="PRJ10",
        name="Tata Punch",
        status="Active"
    )

    # 2. Mock DB queries
    mock_query_upload = MagicMock()
    mock_db.query.return_value = mock_query_upload
    mock_query_upload.filter.return_value = mock_query_upload
    mock_query_upload.order_by.return_value = mock_query_upload
    
    mock_query_upload.all.side_effect = [
        [mock_upload1, mock_upload2],  # uploads list
        [mock_project]                 # projects list
    ]

    # 3. Override dependencies
    override_dependencies(get_db, lambda: mock_db)
    override_dependencies(get_current_user, lambda: {
        "employee_id": "EMP001",
        "role": "Admin",
        "name": "Super Admin"
    })

    # 4. Make request
    response = client.get(f"{API_PREFIX}/dashboard/trackers/analytics")

    # 5. Assertions
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "trackers" in data
    assert "by_project" in data
    assert "by_status" in data

    kpis = data["kpis"]
    assert kpis["total_trackers"] == 2
    assert kpis["manual_trackers"] == 1
    assert kpis["uploaded_trackers"] == 1
    assert kpis["active_projects"] == 1

    by_status = data["by_status"]
    assert len(by_status) == 1
    assert by_status[0]["status"] == "Completed"
    assert by_status[0]["count"] == 2
