import os
from dotenv import load_dotenv

# Load .env file (optional, for local development)
load_dotenv()

# ------------------------
# API & Frontend Settings
# ------------------------
API_PREFIX = os.getenv("API_PREFIX", "/api")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ------------------------
# Auth / JWT Settings
# ------------------------
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")  # Make sure to set a strong secret in production
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", 7))

# ------------------------
# Database Settings
# ------------------------
DB_TYPE = os.getenv("DB_TYPE", "cloud").lower()

# Cloud Database URL (Supabase)
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL") or os.getenv("DATABASE_URL")

# Local Database Settings (PostgreSQL)
LOCAL_DB_HOST = os.getenv("LOCAL_DB_HOST", "localhost")
LOCAL_DB_PORT = os.getenv("LOCAL_DB_PORT", "5432")
LOCAL_DB_NAME = os.getenv("LOCAL_DB_NAME", "postgres")
LOCAL_DB_USER = os.getenv("LOCAL_DB_USER", "postgres")
LOCAL_DB_PASSWORD = os.getenv("LOCAL_DB_PASSWORD", "password")

LOCAL_DATABASE_URL = (
    f"postgresql://{LOCAL_DB_USER}:{LOCAL_DB_PASSWORD}"
    f"@{LOCAL_DB_HOST}:{LOCAL_DB_PORT}/{LOCAL_DB_NAME}"
)

# Determine final DATABASE_URL
if DB_TYPE == "local":
    DATABASE_URL = LOCAL_DATABASE_URL
    print("\n[DB CONFIG] Mode: LOCAL (PostgreSQL)")
else:
    DATABASE_URL = CLOUD_DATABASE_URL
    print("\n[DB CONFIG] Mode: CLOUD (Supabase)")

# Flag for database-specific engine configurations (like SSL for Supabase)
IS_CLOUD_DB = (DB_TYPE == "cloud")

# Ensure DATABASE_URL exists for the selected type
if not DATABASE_URL:
    raise ValueError(f"DATABASE_URL for '{DB_TYPE}' environment is not set!")