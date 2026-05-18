from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
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

# Use QueuePool for both local and cloud databases.
# When using Supabase Cloud via PgBouncer/Supavisor Transaction Mode (port 6543),
# persistent QueuePool delivers ultra-low latency (50-60ms vs 500ms handshake time)
# while PgBouncer multiplexes active server connections to prevent EMAXCONNSESSION limits.
pool_class = QueuePool
if IS_CLOUD_DB:
    pool_args = {
        "pool_size": 10,          # Persistent baseline connections for cloud reuse
        "max_overflow": 15,       # Allow burst capacity
        "pool_timeout": 15,       # Prevent hanging if connections are exhausted
        "pool_recycle": 1800,     # Recycle every 30m to avoid stale firewall disconnects
        "pool_pre_ping": True,    # Check health before utilizing
    }
else:
    pool_args = {
        "pool_size": 20,          # Local connection pool
        "max_overflow": 30,
        "pool_timeout": 15,
        "pool_recycle": 1800,
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

# --- ASYNC DB SETUP ---
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if DATABASE_URL else None
async_engine = None
AsyncSessionLocal = None

if ASYNC_DATABASE_URL:
    try:
        # Avoid passing `connect_args` specific to psycopg2 (like options search_path) if it fails in asyncpg, 
        # but asyncpg accepts server_settings. We will simplify for now.
        async_connect_args = {}
        if IS_CLOUD_DB:
            async_connect_args = {
                "server_settings": {"search_path": "public", "statement_timeout": "15000"}
            }
        
        async_kwargs = {
            "connect_args": async_connect_args,
            "pool_recycle": 1800,
            "pool_pre_ping": True
        }
        
        if IS_CLOUD_DB:
            async_kwargs["pool_size"] = 10
            async_kwargs["max_overflow"] = 15
            async_kwargs["pool_timeout"] = 15
            # Critical: Disable prepared statement caching for transaction mode pooler (PgBouncer/Supavisor)
            async_kwargs["prepared_statement_cache_size"] = 0
        else:
            async_kwargs["pool_size"] = 20
            async_kwargs["max_overflow"] = 30
            async_kwargs["pool_timeout"] = 15

        async_engine = create_async_engine(
            ASYNC_DATABASE_URL,
            **async_kwargs
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=async_engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
        print(f"[DB] Async Engine created successfully.")
    except Exception as e:
        print(f"[DB] FAILED to create Async engine: {str(e)}")

Base = declarative_base()

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    if not AsyncSessionLocal:
        raise Exception("Async DB is not configured.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()