import os
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.core.database import engine, Base, get_db
from app.core.config import FRONTEND_URL, API_PREFIX
from app.middleware.logging_middleware import ForbiddenLoggingMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import secure
from app.core.limiter import limiter



# Import models for table creation
from app.models import user  # noqa: F401
from app.models import employee  # noqa: F401
from app.models import employee_column  # noqa: F401
from app.models import project  # noqa: F401
from app.models import upload_tracker # noqa: F401
from app.models import budget # noqa: F401  ← registers budget_summaries + budget_revisions tables
from app.models import project_sub_category # noqa: F401
from app.models import meeting # noqa: F401
from app.models import user_session # noqa: F401
from app.models import settings # noqa: F401
from app.models import google_token  # noqa: F401  ← registers google_tokens table
from app.models import access_request # noqa: F401
from app.models.role import Role  # noqa: F401
from app.models import employee_project # noqa: F401
from app.models import project_permission # noqa: F401
from app.models import audit_log # noqa: F401
from app.models.department import Department # noqa: F401
from app.models.tracker import TrackerData # noqa: F401
from app.models.upload import Upload # noqa: F401
from app.models.import_error import ImportError  # noqa: F401
from app.models.issue import Issue, IssueAction, IssueComment, IssueEscalation  # noqa: F401
from app.models.transcript import Transcript  # noqa: F401
from app.models.mom import MOMSession  # noqa: F401
from app.models.mom_sync_history import MomSyncHistory # noqa: F401
from app.models.chat_history import ChatHistory
from app.models.tracker_ingestion import TrackerIngestion
 # noqa: F401

# Import routers
from app.api.auth import router as auth_router
from app.api.employees import router as employee_router
from app.api.employees import router as employee_router
from app.api import project as project_router

from app.api.datasets import router as datasets_router
from app.api.email import router as email_router  # Added email router
from app.api import budget as budget_router
from app.api.project_sub_category import router as sub_category_router
from app.api.settings import router as settings_router
from app.api.roles import router as role_router
from app.api.meetings import router as meetings_router
from app.api.project_team import router as project_team_router
from app.api.audit_logs import router as audit_logs_router
from app.api.teams import router as teams_router
from app.api.application_access import router as application_access_router
from app.api.chats import router as chat_router
from app.api.enterprise import router as enterprise_router
from app.api.currency import router as currency_router
from app.crud.role import seed_default_roles

app = FastAPI(
    title="Industrial Analytics Platform",
    version="1.0.0",
)

# Add Rate Limiting state and handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# Security Headers using 'secure' library
secure_headers = secure.Secure()

@app.middleware("http")
async def set_secure_headers(request: Request, call_next):
    response = await call_next(request)
    secure_headers.framework.fastapi(response)
    # Additional manual headers for industrial security
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Updated CSP to allow connections to Render backend and Vercel frontend
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' ws: wss: https://project-analytics-dashboard.onrender.com https://project-analytics-dashboard.vercel.app;"
    )
    return response

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://project-analytics-dashboard.vercel.app",
]
if FRONTEND_URL and FRONTEND_URL not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(FRONTEND_URL)

def add_cors_headers(response: JSONResponse, request: Request):
    """Helper to add CORS headers to manual responses (like exception handlers)"""
    origin = request.headers.get("origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = FRONTEND_URL
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# Production Check for JWT_SECRET
from app.core.config import JWT_SECRET
if JWT_SECRET == "supersecret":
    logger.warning("⚠️ SECURITY WARNING: JWT_SECRET is using the default 'supersecret' value. Please change this in production .env file.")


@app.websocket("/ws/test/{client_id}")
async def test_websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    logger.info(f"📡 TEST WS CONNECTED: {client_id}")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info(f"🔌 TEST WS DISCONNECTED: {client_id}")

@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_default_roles(db)
    finally:
        db.close()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    logger.error(f"Request body: {exc.body}")
    
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )
    return add_cors_headers(response, request)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Unhandled Exception: {str(exc)}\n{traceback.format_exc()}"
    logger.error(error_msg)
    
    # Return a JSON response with CORS headers if possible
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )
    return add_cors_headers(response, request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(employee_router, prefix=API_PREFIX)
app.include_router(project_router.router, prefix=API_PREFIX)

app.include_router(datasets_router, prefix=API_PREFIX)
app.include_router(email_router, prefix=f"{API_PREFIX}/email", tags=["Email"]) # Added email route
app.include_router(budget_router.router, prefix=f"{API_PREFIX}/budget", tags=["Budget"])
app.include_router(sub_category_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)
app.include_router(role_router, prefix=API_PREFIX)
app.include_router(meetings_router, prefix=f"{API_PREFIX}/meetings", tags=["Meetings"])
app.include_router(project_team_router, prefix=API_PREFIX)
app.include_router(audit_logs_router, prefix=API_PREFIX)
app.include_router(teams_router)  # prefix already set to /api/teams inside the router
app.include_router(application_access_router, prefix=API_PREFIX)
app.include_router(chat_router, prefix=API_PREFIX)
from app.api.departments import router as departments_router
app.include_router(departments_router, prefix=API_PREFIX)
app.include_router(enterprise_router, prefix=API_PREFIX)
app.include_router(currency_router, prefix=API_PREFIX)

from app.api.transcript import router as transcript_router
app.include_router(transcript_router, prefix=f"{API_PREFIX}/transcript", tags=["Transcript"])

from app.api.transcribe import router as transcribe_router
app.include_router(transcribe_router, prefix=f"{API_PREFIX}/transcribe", tags=["Transcribe"])

from app.api.tracker_api import router as tracker_router
app.include_router(tracker_router, prefix=API_PREFIX, tags=["Tracker"])

from app.api.dashboard_api import router as dashboard_router
app.include_router(dashboard_router, prefix=API_PREFIX)

from app.api.issues import router as issues_router
app.include_router(issues_router, prefix=API_PREFIX, tags=["Issues"])

from app.routers.mom import router as mom_router
app.include_router(mom_router, prefix=f"{API_PREFIX}/mom", tags=["MOM"])

from app.api.websockets import router as websockets_router
app.include_router(websockets_router, prefix=API_PREFIX)

# Static Files
UPLOAD_DIR = "static/uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


#testing routes
@app.get("/test-db")
async def test_db(db=Depends(get_db)): 
    from sqlalchemy import text
    try:
        result = db.execute(text("SELECT 1"))
        return {"status": "ok", "result": result.scalar()}
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        return {"status": "error", "detail": str(e)}

@app.get("/healthz")
def health_check():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Backend is running successfully  - Welcome to the Industrial Analytics Platform API"}
