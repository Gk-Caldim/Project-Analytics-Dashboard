
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import json

load_dotenv()
DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_projects_config():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, name, dashboard_config FROM projects")).fetchall()
        for r in res:
            config = r[2]
            if config:
                config_str = json.dumps(config)
                if "40" in config_str:
                    print(f"Project {r[1]} (id={r[0]}) has '40' in dashboard_config:")
                    print(config_str)

if __name__ == "__main__":
    check_projects_config()
