import socket

def test_conn(host, port, name):
    print(f"Connecting to {name} ({host}:{port}) via socket...")
    try:
        s = socket.create_connection((host, port), timeout=3)
        print(f"  {name} SOCKET CONNECTION SUCCESSFUL!")
        s.close()
        return True
    except Exception as e:
        print(f"  {name} SOCKET CONNECTION FAILED: {e}")
        return False

if __name__ == "__main__":
    cloud_ok = test_conn("aws-1-ap-south-1.pooler.supabase.com", 6543, "Cloud Supabase")
    local_ok = test_conn("localhost", 5432, "Local Postgres")
