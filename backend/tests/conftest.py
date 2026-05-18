import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

# --- SERVERLESS TESTING INTERCEPTOR ---
# Mock the database engine and SessionLocal before importing app.main
# to prevent tests from attempting to connect to live Supabase during startup events.
import app.core.database as db_module
db_module.engine = MagicMock()
db_module.SessionLocal = MagicMock()
db_module.async_engine = MagicMock()
db_module.AsyncSessionLocal = MagicMock()

# Import the main FastAPI app and get_db / get_current_user dependencies
from app.main import app
from app.core.database import get_db
from app.core.security import get_current_user

@pytest.fixture(scope="module")
def client():
    """
    Fixture that returns a FastAPI TestClient.
    """
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def mock_db():
    """
    Fixture that returns a mocked SQLAlchemy database Session.
    """
    db_session = MagicMock()
    return db_session

@pytest.fixture
def override_dependencies(mock_db):
    """
    Fixture that simplifies overriding FastAPI dependencies (database & auth).
    Yields a helper function that registers overrides, and automatically
    clears all overrides when the test finishes.
    """
    overrides = {}
    
    def _override(dependency, replacement):
        app.dependency_overrides[dependency] = replacement
        overrides[dependency] = replacement
        
    yield _override
    
    # Clean up overrides after the test is complete
    for dep in overrides:
        if dep in app.dependency_overrides:
            del app.dependency_overrides[dep]
