
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
engine = create_engine(DATABASE_URL)

def scan_all_tables_for_40():
    with engine.connect() as conn:
        # Get all table names
        tables = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")).fetchall()
        for t in tables:
            table_name = t[0]
            try:
                # Check if table has 'id' column
                cols = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")).fetchall()
                col_names = [c[0] for c in cols]
                
                queries = []
                if "id" in col_names:
                    queries.append(f"SELECT count(*) FROM {table_name} WHERE id = 40")
                if "upload_id" in col_names:
                    queries.append(f"SELECT count(*) FROM {table_name} WHERE upload_id = 40")
                if "dataset_id" in col_names:
                    queries.append(f"SELECT count(*) FROM {table_name} WHERE dataset_id = 40")
                
                for q in queries:
                    cnt = conn.execute(text(q)).fetchone()[0]
                    if cnt > 0:
                        print(f"FOUND {cnt} records with 40 in table {table_name} (query: {q})")
            except Exception as e:
                # Some tables might be weird or dynamic
                pass

if __name__ == "__main__":
    scan_all_tables_for_40()
