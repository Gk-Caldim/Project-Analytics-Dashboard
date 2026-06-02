import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def test():
    print("Testing Attempt 1: prepared_statement_cache_size in connect_args")
    try:
        engine = create_async_engine(
            "postgresql+asyncpg://invalid_user:invalid_pass@localhost:5432/postgres",
            connect_args={"prepared_statement_cache_size": 0}
        )
        async with engine.connect() as conn:
            pass
    except Exception as e:
        print("ATTEMPT 1 result:", type(e).__name__, "-", str(e))

    print("\nTesting Attempt 2: statement_cache_size in connect_args")
    try:
        engine = create_async_engine(
            "postgresql+asyncpg://invalid_user:invalid_pass@localhost:5432/postgres",
            connect_args={"statement_cache_size": 0}
        )
        async with engine.connect() as conn:
            pass
    except Exception as e:
        print("ATTEMPT 2 result:", type(e).__name__, "-", str(e))

if __name__ == "__main__":
    asyncio.run(test())
