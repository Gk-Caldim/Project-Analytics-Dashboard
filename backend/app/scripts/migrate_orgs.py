import os
import sys

# Force local DB for migration script
os.environ["DB_TYPE"] = "local"

# Add the root project directory to the path so we can import 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import DATABASE_URL, IS_CLOUD_DB

def run_migration():
    if IS_CLOUD_DB:
        print("Skipping local migration because IS_CLOUD_DB is True.")
        return

    print("Connecting to local database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Create organizations table
        print("Creating organizations table if it does not exist...")
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS organizations (
                org_id SERIAL PRIMARY KEY,
                org_name VARCHAR NOT NULL UNIQUE
            );
        """))
        session.commit()

        # 2. Insert organizations "TATA" and "ASHOK LEYLAND"
        print("Seeding organizations...")
        session.execute(text("""
            INSERT INTO organizations (org_name)
            VALUES ('TATA'), ('ASHOK LEYLAND')
            ON CONFLICT (org_name) DO NOTHING;
        """))
        session.commit()

        # Get the IDs
        tata_id = session.execute(text("SELECT org_id FROM organizations WHERE org_name = 'TATA'")).scalar()
        ashok_id = session.execute(text("SELECT org_id FROM organizations WHERE org_name = 'ASHOK LEYLAND'")).scalar()
        print(f"TATA org_id: {tata_id}, ASHOK LEYLAND org_id: {ashok_id}")

        # 3. Add org_id to target tables and migrate data safely
        target_tables = [
            "employees",
            "projects",
            "budget_summaries",
            "budget_revisions",
            "issues"
        ]

        for table in target_tables:
            print(f"Migrating table: {table}")
            
            # Check if column exists
            result = session.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{table}' and column_name='org_id';
            """))
            if not result.fetchone():
                print(f"Adding org_id column to {table}...")
                session.execute(text(f"""
                    ALTER TABLE {table} 
                    ADD COLUMN org_id INTEGER REFERENCES organizations(org_id);
                """))
                session.commit()
            
            # Distribute existing data randomly (odd id to TATA, even id to ASHOK) or just split in half
            # But wait, employees is the key one.
            # If a table has `id` column, we can do id % 2
            
            # Check if id column exists to distribute
            has_id = session.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{table}' and column_name='id';
            """)).fetchone()

            if has_id:
                print(f"Distributing data for {table}...")
                session.execute(text(f"""
                    UPDATE {table} 
                    SET org_id = CASE 
                        WHEN id % 2 = 0 THEN :tata_id 
                        ELSE :ashok_id 
                    END
                    WHERE org_id IS NULL;
                """), {"tata_id": tata_id, "ashok_id": ashok_id})
                session.commit()
            else:
                print(f"Table {table} does not have 'id', setting all to TATA for safety.")
                session.execute(text(f"""
                    UPDATE {table} SET org_id = :tata_id WHERE org_id IS NULL;
                """), {"tata_id": tata_id})
                session.commit()

        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration failed: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    run_migration()
