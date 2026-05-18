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
    
    mock_query = MagicMock()
    mock_query.outerjoin.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.offset.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.all.return_value = [(mock_emp, "Engineering Projects")]
    
    mock_db.query.return_value = mock_query
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
    
    mock_query = MagicMock()
    mock_query.outerjoin.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.first.return_value = (mock_emp, "HR Project")
    
    mock_db.query.return_value = mock_query
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
    mock_query = MagicMock()
    mock_query.outerjoin.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.first.return_value = None
    
    mock_db.query.return_value = mock_query
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
