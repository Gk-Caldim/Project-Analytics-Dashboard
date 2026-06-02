from unittest.mock import MagicMock
from app.core.config import API_PREFIX
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project

def test_list_projects_as_admin(client, override_dependencies, mock_db):
    """
    Test that an Admin user can see all projects returned by the database.
    """
    # 1. Setup mock data (using actual Project model to pass Pydantic schema validation)
    mock_project = Project(
        id=101,
        project_id="PRJ101",
        name="Project Ares",
        budget=500000.0,
        utilized_budget=120000.0,
        balance_budget=380000.0,
        project_manager="Alice",
        status="Active",
        department="Engineering",
        employee_id="EMP003",
        employee_name="Bob",
        assigned_to_id="EMP002",
        assigned_to_name="Charlie",
        custom_fields={},
        dashboard_config={}
    )
    
    # 2. Mock database query
    mock_query = MagicMock()
    mock_db.query.return_value = mock_query
    mock_query.all.return_value = [mock_project]
    
    # 3. Override dependencies
    override_dependencies(get_db, lambda: mock_db)
    override_dependencies(get_current_user, lambda: {
        "employee_id": "EMP001",
        "role": "Admin",
        "name": "Super Admin"
    })
    
    # 4. Make request
    response = client.get(f"{API_PREFIX}/projects/")
    
    # 5. Assertions
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Project Ares"
    assert data[0]["project_id"] == "PRJ101"

def test_add_project_restricted_for_regular_user(client, override_dependencies, mock_db):
    """
    Test that a regular Employee cannot create a new project (should return 403 Forbidden).
    """
    # 1. Override dependencies (User is not Admin)
    override_dependencies(get_db, lambda: mock_db)
    override_dependencies(get_current_user, lambda: {
        "employee_id": "EMP002",
        "role": "Employee",
        "name": "John Doe"
    })
    
    # 2. Project creation payload
    payload = {
        "project_id": "PRJ102",
        "name": "Forbidden Project",
        "budget": 100000.0,
        "utilized_budget": 0.0,
        "balance_budget": 100000.0,
        "project_manager": "Bob",
        "custom_fields": {}
    }
    
    # 3. Make request
    response = client.post(f"{API_PREFIX}/projects/", json=payload)
    
    # 4. Assertions
    assert response.status_code == 403
    assert response.json()["detail"] == "Only Admins can create projects"
