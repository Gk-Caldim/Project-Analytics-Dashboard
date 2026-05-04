import os
import sys
import psycopg2
from sqlalchemy import create_engine, MetaData, Table, inspect, text
from sqlalchemy.schema import CreateTable
from urllib.parse import urlparse
from dotenv import load_dotenv

def replicate():
    # Load .env
    if os.path.exists(".env"):
        load_dotenv(".env")
    elif os.path.exists("../.env"):
        load_dotenv("../.env")
    else:
        print("Error: .env file not found.")
        return

    cloud_url = os.getenv("CLOUD_DATABASE_URL")
    local_host = os.getenv("LOCAL_DB_HOST", "localhost")
    local_port = os.getenv("LOCAL_DB_PORT", "5432")
    local_name = os.getenv("LOCAL_DB_NAME", "postgres")
    local_user = os.getenv("LOCAL_DB_USER", "postgres")
    local_pass = os.getenv("LOCAL_DB_PASSWORD", "")

    if not cloud_url:
        print("Error: CLOUD_DATABASE_URL not found in .env")
        return

    local_url = f"postgresql://{local_user}:{local_pass}@{local_host}:{local_port}/{local_name}"

    print(f"--- Version-Agnostic Database Replication Started ---")
    print(f"Source: Supabase Cloud")
    print(f"Target: Local ({local_host}:{local_port}/{local_name})")

    try:
        # 1. Connect to both databases
        print("\n[1/6] Connecting to source and target databases...")
        src_engine = create_engine(cloud_url)
        dst_engine = create_engine(local_url)
        
        # Force the destination dialect to think it's version 14
        # This helps the compiler know which features to avoid
        dst_engine.dialect.server_version_info = (14, 0)

        # 2. Clear local 'public' schema
        print("\n[2/6] Cleaning local 'public' schema...")
        with dst_engine.connect() as conn:
            conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            conn.commit()

        # 3. Reflect source metadata
        print("\n[3/6] Reflecting source schema (this may take a minute)...")
        metadata = MetaData()
        metadata.reflect(bind=src_engine, schema='public')

        # 4. Clean up metadata for PostgreSQL 14 compatibility
        print("\n[4/6] Adjusting schema for PostgreSQL 14 compatibility...")
        from sqlalchemy import UniqueConstraint, Index
        for table in metadata.tables.values():
            # Check unique constraints
            for const in list(table.constraints):
                if isinstance(const, UniqueConstraint):
                    # Remove the property from the object itself
                    if hasattr(const, 'nulls_distinct'):
                        const.nulls_distinct = None
                
                # IMPORTANT: If we keep the 'postgresql' dict, we MUST have the keys 
                # that the PG compiler expects, but set them to None/False.
                # Alternatively, removing the 'postgresql' key entirely forces 
                # fallback to standard UNIQUE compilation.
                if hasattr(const, 'dialect_options') and 'postgresql' in const.dialect_options:
                    # Remove PG-specific options to avoid v15+ syntax triggers
                    del const.dialect_options['postgresql']
            
            # Check indexes
            for idx in list(table.indexes):
                if hasattr(idx, 'nulls_distinct'):
                    idx.nulls_distinct = None
                    
                if hasattr(idx, 'dialect_options') and 'postgresql' in idx.dialect_options:
                    del idx.dialect_options['postgresql']

        # 5. Create tables locally
        print("\n[5/6] Creating tables locally...")
        try:
            # We use the metadata directly. sorted_tables ensures foreign key order.
            metadata.create_all(bind=dst_engine)
        except Exception as e:
            print(f"  Error creating tables: {e}")
            print("  Attempting to create tables one by one to isolate the issue...")
            # If create_all fails, we try one by one. 
            # Note: Dependency order is important here.
            for table in metadata.sorted_tables:
                try:
                    table.create(bind=dst_engine)
                    print(f"  - Created table '{table.name}'")
                except Exception as te:
                    if "already exists" in str(te):
                        continue
                    print(f"  - Failed to create table '{table.name}': {te}")
            # We don't raise here yet, let's see if we can proceed to data copy
            # if the main tables were created.

        # 6. Copy data using psycopg2 COPY (very fast)
        print("\n[6/6] Transferring data table by table...")
        
        # We use raw psycopg2 for the fast COPY command
        src_conn = psycopg2.connect(cloud_url)
        dst_conn = psycopg2.connect(local_url)
        
        # Optimization: Disable constraints during copy
        with dst_conn.cursor() as cur:
            cur.execute("SET session_replication_role = 'replica';")
        
        src_cur = src_conn.cursor()
        dst_cur = dst_conn.cursor()

        # Get table names
        for table in metadata.sorted_tables:
            table_name = table.name
            print(f"  - Copying table: {table_name}...", end="", flush=True)
            
            try:
                # Command to export from source
                copy_src_query = f'COPY public."{table_name}" TO STDOUT WITH BINARY'
                # Command to import to destination
                copy_dst_query = f'COPY public."{table_name}" FROM STDIN WITH BINARY'

                import io
                buf = io.BytesIO()
                src_cur.copy_expert(copy_src_query, buf)
                buf.seek(0)
                dst_cur.copy_expert(copy_dst_query, buf)
                
                print(" Done.")
            except Exception as e:
                print(f" Failed: {e}")
                dst_conn.rollback() 
                # Re-enable if we fail
                with dst_conn.cursor() as cur:
                    cur.execute("SET session_replication_role = 'replica';")
                continue

        # Re-enable constraints
        dst_cur.execute("SET session_replication_role = 'origin';")
        dst_conn.commit()
        
        # 6. Reset Sequences (Very important for Postgres AI columns)
        print("\n[Bonus] Resetting sequences...")
        with dst_engine.connect() as conn:
            # This query finds all sequences and sets their current value to the max(id)
            seq_reset_query = """
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT table_name, column_name, column_default 
                          FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND column_default LIKE 'nextval%') 
                LOOP
                    EXECUTE 'SELECT setval(pg_get_serial_sequence(''public.' || r.table_name || ''', ''' || r.column_name || '''), COALESCE(MAX(' || r.column_name || '), 1)) FROM public.' || r.table_name;
                END LOOP;
            END $$;
            """
            conn.execute(text(seq_reset_query))
            conn.commit()

        print(f"\n--- Replication Finished Successfully ---")
        print(f"Note: Used version-agnostic Python transfer to bypass pg_dump mismatch.")

    except Exception as e:
        print(f"\nCritical Error during replication: {e}")
        import traceback
        traceback.print_exc()

    finally:
        if 'src_conn' in locals(): src_conn.close()
        if 'dst_conn' in locals(): dst_conn.close()

if __name__ == "__main__":
    replicate()
