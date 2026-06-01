import psycopg2
import os

DATABASE_URL = "postgresql://postgres:Caldim%402026@localhost:5432/dashboard_app"

try:
    print("Terminating blocking connections...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'dashboard_app' AND pid != pg_backend_pid();")
    conn.close()
    print("Connections terminated.")
except Exception as e:
    print("Failed to drop connections:", e)

# Run migration
os.environ["DB_TYPE"] = "local"
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app.scripts.migrate_orgs import run_migration
print("Running migration...")
run_migration()
