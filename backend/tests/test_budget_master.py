from unittest.mock import MagicMock
from datetime import datetime
from fastapi import status
from app.core.config import API_PREFIX
from app.core.database import get_db
from app.models.budget import BudgetSummary, BudgetRevision
from app.models.project import Project

def test_proposal_engine_normal_utilization(client, override_dependencies, mock_db):
    """
    Test recommendation engine suggestions under normal budget utilization (<80%).
    """
    mock_budget = BudgetSummary(
        id=1,
        project_name="Delta Project",
        overall_budget=100000.0,
        budget_data=[
            {"Utilized": 40000.0, "Commitment": 10000.0}
        ]
    )
    
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.first.return_value = mock_budget
    
    mock_db.query.return_value = mock_query
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/budget/proposal/Delta%20Project")
    assert response.status_code == 200
    data = response.json()
    
    assert data["current_overall_budget"] == 100000.0
    assert data["total_utilized"] == 50000.0
    assert data["remaining_balance"] == 50000.0
    assert data["utilization_ratio"] == 0.5
    assert data["delta"] == 2475.0
    assert data["suggested_overall_budget"] == 102475.0

def test_proposal_engine_high_utilization_buffer(client, override_dependencies, mock_db):
    """
    Test recommendation engine suggestions under high budget utilization (>80%).
    """
    mock_budget = BudgetSummary(
        id=2,
        project_name="High Risk Project",
        overall_budget=100000.0,
        budget_data=[
            {"Utilized": 85000.0, "Commitment": 0.0}
        ]
    )
    
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.first.return_value = mock_budget
    
    mock_db.query.return_value = mock_query
    override_dependencies(get_db, lambda: mock_db)
    
    response = client.get(f"{API_PREFIX}/budget/proposal/High%20Risk%20Project")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_utilized"] == 85000.0
    assert data["utilization_ratio"] == 0.85
    assert data["delta"] == 5742.5
    assert data["suggested_overall_budget"] == 105742.5

def test_budget_revision_approval_and_project_sync(client, override_dependencies, mock_db):
    """
    Test the critical revision approval cross-module syncing.
    Asserts that:
    1. The revision status is updated.
    2. The latest overall budget on the BudgetSummary record is updated.
    3. The budget is synced to the Project Master Project record.
    4. The Project's balance_budget is recalculated: revised_budget - utilized_budget.
    """
    mock_revision = BudgetRevision(
        id=44,
        project_id="PRJ099",
        project_name="Sync Project",
        pm_name="Jane PM",
        previous_budget=100000.0,
        revised_budget=130000.0,
        reasons="Scope expansion",
        status="Pending Head",
        attachment_name="document.pdf",
        attachment_data=None,
        waiting_until=None
    )
    
    mock_budget = BudgetSummary(
        id=12,
        project_name="Sync Project",
        overall_budget=100000.0,
        uploaded_by="PM Jane",
        department="Engineering",
        budget_data=[]
    )
    
    mock_project = Project(
        id=99,
        name="Sync Project",
        budget=100000.0,
        utilized_budget=40000.0,
        balance_budget=60000.0
    )
    
    # 4. Setup intermediate mock chains
    mock_revision_query = MagicMock()
    mock_revision_query.filter.return_value = mock_revision_query
    mock_revision_query.first.return_value = mock_revision
    
    mock_budget_query = MagicMock()
    mock_budget_query.filter.return_value = mock_budget_query
    mock_budget_query.order_by.return_value = mock_budget_query
    mock_budget_query.first.return_value = mock_budget
    
    mock_project_query = MagicMock()
    mock_project_query.filter.return_value = mock_project_query
    mock_project_query.first.return_value = mock_project
    
    def mock_db_query_routing(model_class):
        if model_class == BudgetRevision:
            return mock_revision_query
        elif model_class == BudgetSummary:
            return mock_budget_query
        elif model_class == Project:
            return mock_project_query
        return MagicMock()
        
    mock_db.query.side_effect = mock_db_query_routing
    override_dependencies(get_db, lambda: mock_db)
    
    payload = {
        "status": "Approved",
        "waiting_until": None
    }
    
    response = client.patch(f"{API_PREFIX}/budget/revisions/44", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "Approved"
    assert mock_budget.overall_budget == 130000.0
    assert mock_project.budget == 130000.0
    assert mock_project.balance_budget == 90000.0
