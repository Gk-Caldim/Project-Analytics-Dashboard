import time
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool

def test_connection(url, port_name):
    print(f"\n--- Testing {port_name} ---")
    try:
        engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=5,
            pool_timeout=10,
            connect_args={"sslmode": "require"}
        )
        
        # Test latency for first connection (handshake)
        start = time.time()
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1")).scalar()
            first_time = time.time() - start
            print(f"First connection latency: {first_time:.3f}s")
            
        # Test latency for second connection (pooled/reused)
        start = time.time()
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1")).scalar()
            second_time = time.time() - start
            print(f"Pooled connection latency: {second_time:.3f}s")
            
        engine.dispose()
        return True
    except Exception as e:
        print(f"Failed to connect: {e}")
        return False

if __name__ == "__main__":
    # Base URL from .env
    base_url = "postgresql://postgres.bgxojiuuchfndhdubneq:Caldim%402026@aws-1-ap-south-1.pooler.supabase.com"
    
    url_5432 = f"{base_url}:5432/postgres"
    url_6543 = f"{base_url}:6543/postgres"
    
    test_connection(url_5432, "Port 5432 (Session Mode)")
    test_connection(url_6543, "Port 6543 (Transaction Mode)")
