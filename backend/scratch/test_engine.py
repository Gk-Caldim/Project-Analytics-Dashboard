import sqlalchemy
print("SQLAlchemy version:", sqlalchemy.__version__)
from sqlalchemy.ext.asyncio import create_async_engine
try:
    engine = create_async_engine("postgresql+asyncpg://localhost/db", prepared_statement_cache_size=0)
    print("SUCCESS with direct keyword argument")
except Exception as e:
    print("FAILED with direct keyword argument:", e)

try:
    engine = create_async_engine("postgresql+asyncpg://localhost/db", connect_args={"prepared_statement_cache_size": 0})
    print("SUCCESS with connect_args")
except Exception as e:
    print("FAILED with connect_args:", e)
