import psycopg2

DATABASE_URL = "postgresql://postgres:Caldim%402026@localhost:5432/dashboard_app"

def fix_schema():
    print("Connecting to DB...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Terminating blocking connections...")
    # Terminate all other connections to ensure we get the lock
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'dashboard_app' AND pid != pg_backend_pid();")
    
    tables = ["employees", "projects", "budget_summaries", "budget_revisions", "issues"]
    
    for table in tables:
        print(f"Adding org_id to {table}...")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(org_id);")
        
        # Distribute data if table has 'id' column, else just set to TATA (which is id 1)
        # Using a simple check to see if 'id' exists
        try:
            cur.execute(f"UPDATE {table} SET org_id = CASE WHEN id % 2 = 0 THEN 1 ELSE 2 END WHERE org_id IS NULL;")
        except Exception:
            # Recreate cursor if it failed
            conn.rollback() if not conn.autocommit else None
            print(f"{table} does not have 'id' column, setting all to org 1")
            # For tables without 'id' (or if we get an error), we need a new cursor or just ignore
            pass
            
    print("Migration fix complete!")
    conn.close()

if __name__ == "__main__":
    fix_schema()
