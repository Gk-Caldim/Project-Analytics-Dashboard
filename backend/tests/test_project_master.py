from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
from app.core.config import API_PREFIX
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project
from app.api.project import check_project_permission, structure_cache

def test_check_project_permission_admin():
    """
    Test that users with administrative roles automatically get permissions.
    """
    project = MagicMock()
    # Admins get true automatically
    admin_user = {"role": "Admin", "employee_id": "EMP001"}
    assert check_project_permission(project, admin_user, "view") is True

    finance_user = {"role": "Finance", "employee_id": "EMP002"}
    assert check_project_permission(project, finance_user, "edit") is True

def test_check_project_permission_assigned_employee():
    """
    Test direct employee assignment mapping checks.
    """
    # Project assigned directly to EMP005
    project = Project(employee_id="EMP005", assigned_to_id="EMP006")
    
    # 1. Matching employee_id
    user_1 = {"role": "Employee", "employee_id": "EMP005"}
    assert check_project_permission(project, user_1, "view") is True
    
    # 2. Matching assigned_to_id
    user_2 = {"role": "Employee", "employee_id": "EMP006"}
    assert check_project_permission(project, user_2, "view") is True
    
    # 3. Non-assigned employee gets False
    stranger = {"role": "Employee", "employee_id": "EMP999"}
    assert check_project_permission(project, stranger, "view") is False

def test_check_project_permission_allocation_map():
    """
    Test permission resolution when the user is mapped inside allocations (EmployeeProjectMap).
    """
    project = Project(employee_id="EMP001", assigned_to_id="EMP002")
    
    # Create allocation mock representing a relationship
    alloc_mock = MagicMock()
    alloc_mock.employee_id = "EMP111"
    project.allocations = [alloc_mock]
    
    user = {"role": "Employee", "employee_id": "EMP111"}
    assert check_project_permission(project, user, "view") is True

def test_get_next_project_id_suggestion(client, override_dependencies, mock_db):
    """
    Test generating suggestions for the next project ID.
    Assert that it extracts numbers, finds the maximum, and increments properly.
    """
    # Mocking projects in DB: PRJ001, PRJ012, PRJ003
    mock_db_result = [
        ("PRJ001",),
        ("PRJ012",),
        ("PRJ003",),
        (None,),       # Null check
        ("INVALID",),  # Bad format check
    ]
    
    mock_db.query.return_value.all.return_value = mock_db_result
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/projects/next-id")
    assert response.status_code == 200
    data = response.json()
    # Maximum was 12, so next suggestions should be PRJ013
    assert data["next_id"] == "PRJ013"

def test_get_all_project_structures_with_caching(client, override_dependencies, mock_db):
    """
    Test sidebar lightweight structures endpoint (/all/structures).
    Verify that cache is updated and subsequent requests read from the cache directly,
    avoiding redundant database roundtrips.
    """
    # 1. Clear cache to ensure a fresh cache miss
    structure_cache.clear()
    
    mock_proj = Project(
        id=55,
        name="Cache Project",
        budget=1000.0,
        utilized_budget=0.0,
        balance_budget=1000.0,
        project_manager="John",
        dashboard_config={}
    )
    
    # Mocking database query for projects and uploads
    mock_upload = MagicMock()
    mock_upload.id = 101
    mock_upload.project_id = 55
    mock_upload.file_name = "test_data.xlsx"
    mock_upload.uploaded_at = None
    mock_upload.status = "Completed"
    mock_upload.row_count = 100
    mock_upload.valid_row_count = 95
    mock_upload.invalid_row_count = 5

    mock_db.query.return_value.all.side_effect = [
        [mock_proj],     # First call (projects)
        [mock_upload],   # First call (uploads)
    ]
    
    override_dependencies(get_db, lambda: mock_db)
    override_dependencies(get_current_user, lambda: {"employee_id": "EMP001", "role": "Admin"})
    
    # First call: Cache miss, hits DB
    response_1 = client.get(f"{API_PREFIX}/projects/all/structures")
    assert response_1.status_code == 200
    data_1 = response_1.json()
    assert len(data_1) == 1
    assert data_1[0]["project_name"] == "Cache Project"
    
    # Second call: Cache hit!
    # If it hits cache, it will NOT query the DB again.
    # We alter mock_db to raise an exception to guarantee it isn't queried.
    mock_db.query.side_effect = Exception("DB should not be contacted due to caching!")
    
    response_2 = client.get(f"{API_PREFIX}/projects/all/structures")
    assert response_2.status_code == 200
    data_2 = response_2.json()
    assert data_2 == data_1  # Returns exactly the same data instantly
