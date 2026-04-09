from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# Use QueuePool for connection pooling to speed up queries
from sqlalchemy.pool import QueuePool
from app.core.config import DATABASE_URL

# Create engine with connection pooling
# For Supabase / PgBouncer, we use a small pool size and pool_pre_ping to ensure connection health.
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,          # Maintain up to 5 permanent connections
    max_overflow=10,      # Allow up to 10 extra temporary connections
    pool_timeout=30,      # Wait up to 30s for a connection from the pool
    pool_recycle=1800,    # Recycle connections after 30 minutes
    pool_pre_ping=True,   # Check connection health before using it
    connect_args={
        "sslmode": "require",
        "options": "-c statement_cache_size=0 -c statement_timeout=15000",  # DISABLE prepared statements & add 15s timeout
        "connect_timeout": 10,  # 10 second timeout for establishing the connection
    },
)

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
