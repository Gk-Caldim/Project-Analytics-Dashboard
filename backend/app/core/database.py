from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# Use QueuePool for local, NullPool for Cloud/Supabase to avoid pooler conflicts
from sqlalchemy.pool import QueuePool, NullPool
from app.core.config import DATABASE_URL, IS_CLOUD_DB

# Create engine with connection pooling
# For Supabase / PgBouncer, we use a small pool size and pool_pre_ping to ensure connection health.
connect_args = {}
if IS_CLOUD_DB:
    connect_args = {
        "sslmode": "require",
        "options": "-c search_path=public -c statement_timeout=15000",  # Add search_path and 15s timeout
        "connect_timeout": 10,  # 10 second timeout for establishing the connection
    }
else:
    # Local PostgreSQL typically doesn't need SSL or special statement cache settings
    connect_args = {
        "connect_timeout": 10
    }

# Use NullPool for Cloud (Supabase) because it already uses PgBouncer (Transaction mode)
# Using client-side pooling on top of PgBouncer can cause connection exhaustion or "prepared statement" errors.
pool_class = NullPool if IS_CLOUD_DB else QueuePool
pool_args = {}

if not IS_CLOUD_DB:
    pool_args = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

print(f"[DB] Initializing engine. IS_CLOUD_DB: {IS_CLOUD_DB}, Pool: {pool_class.__name__}")
try:
    # Basic URL validation for debugging
    if DATABASE_URL:
        scheme = DATABASE_URL.split("://")[0] if "://" in DATABASE_URL else "unknown"
        print(f"[DB] Using URL scheme: {scheme}")
    
    engine = create_engine(
        DATABASE_URL,
        poolclass=pool_class,
        connect_args=connect_args,
        **pool_args
    )
    print(f"[DB] Engine created successfully.")
except Exception as e:
    import traceback
    print(f"[DB] FAILED to create engine: {str(e)}")
    print(f"[DB] Traceback: {traceback.format_exc()}")
    raise


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()