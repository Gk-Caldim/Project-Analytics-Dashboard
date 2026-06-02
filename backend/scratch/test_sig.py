import inspect
import asyncpg
sig = inspect.signature(asyncpg.connect)
print("prepared_statement_cache_size in connect:", "prepared_statement_cache_size" in sig.parameters)
print("statement_cache_size in connect:", "statement_cache_size" in sig.parameters)
