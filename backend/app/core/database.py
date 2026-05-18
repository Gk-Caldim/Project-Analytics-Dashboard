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

# Use QueuePool for both local and cloud when using direct connection (port 5432)
# To handle higher scalability without PgBouncer, we increase pool size and max overflow,
# while keeping pool_timeout reasonable to fail fast if connections are exhausted.
pool_class = QueuePool
pool_args = {
    "pool_size": 20,          # Increased from 5: Allow more baseline concurrent connections per worker
    "max_overflow": 30,       # Increased from 10: Allow temporary bursts
    "pool_timeout": 15,       # Decreased from 30: Fail faster instead of hanging requests if pool is empty
    "pool_recycle": 1800,     # Recycle connections every 30 mins to prevent stale/dropped connections by firewall
    "pool_pre_ping": True,    # Essential for cloud DBs to check connection health before using
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