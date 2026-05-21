import asyncio
import time
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_async():
    url = "postgresql+asyncpg://postgres.bgxojiuuchfndhdubneq:Caldim%402026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
    print(f"Testing Async Port 6543 with prepared_statement_cache_size=0...")
    try:
        engine = create_async_engine(
            url,
            pool_size=5,
            max_overflow=5,
            pool_recycle=1800,
            pool_pre_ping=True,
            connect_args={
                "server_settings": {"search_path": "public", "statement_timeout": "15000"},
                "prepared_statement_cache_size": 0 # Critical for transaction mode pooler (PgBouncer/Supavisor)
            }
        )
        
        start = time.time()
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            print(f"Async query success! Result: {res.scalar()}")
            print(f"Async connection latency: {time.time() - start:.3f}s")
            
        await engine.dispose()
        return True
    except Exception as e:
        print(f"Async connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_async())
