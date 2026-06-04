from unittest.mock import MagicMock, patch
from datetime import datetime
from fastapi import status
from app.core.config import API_PREFIX
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.employee import Employee
from app.models.employee_column import EmployeeColumn

def test_get_all_employees(client, override_dependencies, mock_db):
    """
    Test listing employees.
    """
    mock_emp = Employee(
        id=1,
        employee_id="EMP001",
        name="John Doe",
        email="john@example.com",
        department="Engineering",
        role="Employee",
        status="Active",
        modules=[],
        custom_fields={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    mock_emp_query = MagicMock()
    mock_emp_query.offset.return_value = mock_emp_query
    mock_emp_query.limit.return_value = mock_emp_query
    mock_emp_query.all.return_value = [mock_emp]
    
    mock_proj_query = MagicMock()
    mock_proj_query.all.return_value = []
    
    mock_alloc_query = MagicMock()
    mock_alloc_query.all.return_value = []
    
    def q_side_effect(*args):
        if len(args) == 1 and args[0] is Employee:
            return mock_emp_query
        return mock_proj_query
        
    mock_db.query.side_effect = q_side_effect
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/employees")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "John Doe"
    assert data[0]["employee_id"] == "EMP001"

def test_get_single_employee_found(client, override_dependencies, mock_db):
    """
    Test getting a single employee by ID.
    """
    mock_emp = Employee(
        id=22,
        employee_id="EMP022",
        name="Jane Smith",
        email="jane@example.com",
        department="HR",
        role="Employee",
        status="Active",
        modules=[],
        custom_fields={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    mock_emp_query = MagicMock()
    mock_emp_query.filter.return_value = mock_emp_query
    mock_emp_query.first.return_value = mock_emp
    
    mock_proj_query = MagicMock()
    mock_proj_query.all.return_value = []
    
    mock_alloc_query = MagicMock()
    mock_alloc_query.filter.return_value = mock_alloc_query
    mock_alloc_query.all.return_value = []
    
    def q_side_effect(*args):
        if len(args) == 1 and args[0] is Employee:
            return mock_emp_query
        return mock_proj_query
        
    mock_db.query.side_effect = q_side_effect
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/employees/22")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Jane Smith"
    assert data["email"] == "jane@example.com"

def test_get_single_employee_not_found(client, override_dependencies, mock_db):
    """
    Test 404 behavior for non-existent employees.
    """
    mock_emp_query = MagicMock()
    mock_emp_query.filter.return_value = mock_emp_query
    mock_emp_query.first.return_value = None
    
    mock_db.query.return_value = mock_emp_query
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/employees/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

def test_create_employee_success(client, override_dependencies, mock_db):
    """
    Test creating an employee successfully.
    """
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None
    mock_db.query.return_value = mock_query
    
    mock_new_emp = Employee(
        id=123,
        employee_id="EMP123",
        name="Alex Mercer",
        email="alex@example.com",
        department="Operations",
        role="Employee",
        status="Active",
        modules=[],
        custom_fields={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    override_dependencies(get_db, lambda: mock_db)
    override_dependencies(get_current_user, lambda: {
        "employee_id": "EMP100",
        "role": "Admin",
        "name": "HR Manager"
    })
    
    payload = {
        "employee_id": "EMP123",
        "name": "Alex Mercer",
        "email": "alex@example.com",
        "department": "Operations",
        "role": "Employee",
        "status": "Active",
        "custom_fields": {}
    }
    
    with patch("app.api.employees.employee_crud.create_employee", return_value=mock_new_emp):
        response = client.post(f"{API_PREFIX}/employees", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["employee_id"] == "EMP123"
        assert data["name"] == "Alex Mercer"

def test_create_employee_duplicate_email(client, override_dependencies, mock_db):
    """
    Test creating an employee fails if email already exists.
    """
    mock_duplicate = Employee(
        id=2,
        employee_id="EMP002",
        name="Duplicate Guy",
        email="duplicate@example.com",
        modules=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = mock_duplicate
    mock_db.query.return_value = mock_query
    
    override_dependencies(get_db, lambda: mock_db)
    override_dependencies(get_current_user, lambda: {"employee_id": "EMP001"})
    
    payload = {
        "employee_id": "EMP124",
        "name": "Failed Guy",
        "email": "duplicate@example.com",
        "department": "Sales",
        "role": "Employee",
        "status": "Active",
        "custom_fields": {}
    }
    
    response = client.post(f"{API_PREFIX}/employees", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_employee_statistics(client, override_dependencies, mock_db):
    """
    Test fetching employee breakdown statistics.
    """
    mock_stats = {
        "Admin": 2,
        "Employee": 15,
        "Finance": 1
    }
    
    with patch("app.api.employees.employee_crud.get_employee_statistics", return_value=mock_stats):
        override_dependencies(get_db, lambda: mock_db)
        response = client.get(f"{API_PREFIX}/employees/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "statistics" in data
        assert data["statistics"]["Admin"] == 2

def test_get_all_custom_columns(client, override_dependencies, mock_db):
    """
    Test fetching custom employee columns schema.
    """
    mock_col = EmployeeColumn(
        id=5,
        column_name="personal_phone",
        column_label="Personal Phone",
        data_type="phone",
        is_required=True,
        validation_rules={},
        created_at=datetime.utcnow()
    )
    
    mock_query = MagicMock()
    mock_query.order_by.return_value = mock_query
    mock_query.all.return_value = [mock_col]
    
    mock_db.query.return_value = mock_query
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/employees/columns/all")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["column_name"] == "personal_phone"
    assert data[0]["data_type"] == "phone"

def test_employee_project_matching_edge_cases():
    from app.crud.employee import get_employees
    from app.models.employee import Employee
    from app.models.project import Project
    from app.models.employee_project import EmployeeProjectMap
    
    # Create mock session
    db = MagicMock()
    
    # 1. Setup Employees (including similar names and duplicate names)
    employees = [
        Employee(id=1, employee_id="EMP_ANN", name="Ann", email="ann@test.com"),
        Employee(id=2, employee_id="EMP_JOANN", name="Joann", email="joann@test.com"),
        Employee(id=3, employee_id="EMP_RAJ", name="Raj", email="raj@test.com"),
        Employee(id=4, employee_id="EMP_RAJESH", name="Rajesh", email="rajesh@test.com"),
        # Duplicate names
        Employee(id=5, employee_id="EMP_DUP1", name="Duplicate Name", email="dup1@test.com"),
        Employee(id=6, employee_id="EMP_DUP2", name="Duplicate Name", email="dup2@test.com"),
        # matched through multiple assignment mechanisms
        Employee(id=7, employee_id="EMP_MULTI", name="Multi Assign", email="multi@test.com"),
    ]
    
    # 2. Setup Projects
    # We want to test similar name matching
    # Project 1: PM is "Ann" (Ann matches exactly, Joann should not)
    # Project 2: Assigned Employees is "Joann, Preethy" (Joann matches exactly, Ann should not)
    # Project 3: PM is "Raj" (Raj matches exactly, Rajesh should not)
    # Project 4: PM is "Duplicate Name" (both duplicate employees match this PM project)
    # Project 5: Multi Assign matches via EmployeeProjectMap AND as Team Lead (employee_id)
    # Project 6: PM is "Missing Employee" (does not exist in employee list)
    projects = [
        Project(
            project_id="PRJ_A",
            name="Project Ann PM",
            project_manager="Ann",
            employee_id=None,
            assigned_to_id=None,
            assigned_to_name=None
        ),
        Project(
            project_id="PRJ_B",
            name="Project Joann Assigned",
            project_manager=None,
            employee_id=None,
            assigned_to_id=None,
            assigned_to_name="Joann, Preethy"
        ),
        Project(
            project_id="PRJ_C",
            name="Project Raj PM",
            project_manager="Raj",
            employee_id=None,
            assigned_to_id=None,
            assigned_to_name=None
        ),
        Project(
            project_id="PRJ_D",
            name="Project Dup PM",
            project_manager="Duplicate Name",
            employee_id=None,
            assigned_to_id=None,
            assigned_to_name=None
        ),
        Project(
            project_id="PRJ_E",
            name="Project Multi",
            project_manager=None,
            employee_id="EMP_MULTI",
            assigned_to_id=None,
            assigned_to_name=None
        ),
        Project(
            project_id="PRJ_F",
            name="Project Missing PM",
            project_manager="Missing Employee Name",
            employee_id=None,
            assigned_to_id=None,
            assigned_to_name=None
        )
    ]
    
    # 3. Setup Allocations (EmployeeProjectMap)
    # Multi Assign is allocated to Project Multi (already Team Lead of Project Multi)
    allocations = [
        EmployeeProjectMap(
            employee_id="EMP_MULTI",
            project_id="PRJ_E",
            role="Team Lead"
        )
    ]
    
    # Mock db queries for get_employees
    mock_emp_query = MagicMock()
    mock_emp_query.offset.return_value = mock_emp_query
    mock_emp_query.limit.return_value = mock_emp_query
    mock_emp_query.all.return_value = employees
    
    mock_proj_query = MagicMock()
    mock_proj_query.all.return_value = projects
    
    mock_alloc_query = MagicMock()
    mock_alloc_query.all.return_value = allocations
    
    def q_side_effect(*args):
        if not args:
            return MagicMock()
        first_arg = args[0]
        if first_arg is Employee:
            return mock_emp_query
        # check if Project columns are queried
        if hasattr(first_arg, 'class_') and first_arg.class_ is Project:
            return mock_proj_query
        # check if EmployeeProjectMap columns are queried
        if hasattr(first_arg, 'class_') and first_arg.class_ is EmployeeProjectMap:
            return mock_alloc_query
        return mock_proj_query
        
    db.query.side_effect = q_side_effect
    
    # Call get_employees
    res = get_employees(db)
    
    # Map results by employee_id for easy assertion
    res_map = {e.employee_id: e for e in res}
    
    # Assertions:
    # 1. Ann is matched with "Project Ann PM", NOT Joann's project
    assert res_map["EMP_ANN"].project_name == "Project Ann PM"
    
    # 2. Joann is matched with "Project Joann Assigned", NOT Ann's project
    assert res_map["EMP_JOANN"].project_name == "Project Joann Assigned"
    
    # 3. Raj is matched with "Project Raj PM", NOT Rajesh's project
    assert res_map["EMP_RAJ"].project_name == "Project Raj PM"
    
    # 4. Rajesh has no project matched
    assert res_map["EMP_RAJESH"].project_name == "not assigned"
    
    # 5. Duplicate employee names are both resolved to the PM project
    assert res_map["EMP_DUP1"].project_name == "Project Dup PM"
    assert res_map["EMP_DUP2"].project_name == "Project Dup PM"
    
    # 6. Multi Assign is matched to "Project Multi" via both Team Lead (employee_id) and allocation,
    # but the name is deduplicated (only listed once)
    assert res_map["EMP_MULTI"].project_name == "Project Multi"
