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
# Primary method: Use DATABASE_URL directly (recommended for Supabase / Render)
DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback method: Build URL from individual components (optional)
if not DATABASE_URL:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")

    DATABASE_URL = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

# Ensure DATABASE_URL exists
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")
