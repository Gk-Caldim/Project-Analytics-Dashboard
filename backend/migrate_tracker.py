from app.core.database import engine
from sqlalchemy import text

def add_upload_id_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE trackers_data ADD COLUMN upload_id INTEGER REFERENCES uploads(id) ON DELETE CASCADE;"))
            conn.commit()
            print("Column 'upload_id' added successfully.")
        except Exception as e:
            if "already exists" in str(e) or "Duplicate column" in str(e):
                print("Column 'upload_id' already exists.")
            else:
                print(f"Error checking/adding column: {e}")

if __name__ == "__main__":
    add_upload_id_column()
