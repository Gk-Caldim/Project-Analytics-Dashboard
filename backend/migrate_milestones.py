import logging
from sqlalchemy import text
from app.core.database import SessionLocal, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_milestones")

def run_migration():
    db = SessionLocal()
    try:
        logger.info("Starting milestone hierarchy and assignment relational migration...")

        # 1. Add parent_id column if not exists
        db.execute(text(
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES project_milestones(id)"
        ))
        db.commit()
        logger.info("Ensured 'parent_id' column exists on 'project_milestones' table.")

        # 2. Add task_type column if not exists
        db.execute(text(
            "ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)"
        ))
        db.commit()
        logger.info("Ensured 'task_type' column exists on 'project_milestones' table.")

        # 3. Create milestone_assignments table if not exists
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS milestone_assignments (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
                employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE
            )
        """))
        db.commit()
        logger.info("Ensured 'milestone_assignments' table exists.")

        # 4. Fetch all employees to resolve names/IDs correctly during assignment migration
        employees = db.execute(text("SELECT employee_id, name FROM employees")).fetchall()
        emp_id_set = {row[0] for row in employees if row[0]}
        emp_name_to_id = {row[1].lower(): row[0] for row in employees if row[1] and row[0]}

        # 5. Migrate existing assignments from JSON to relational table
        milestones = db.execute(text("SELECT id, assigned_to FROM project_milestones")).fetchall()
        
        migrated_count = 0
        for m_id, assigned_to_json in milestones:
            if not assigned_to_json:
                continue
            
            # Check if it is a list
            import json
            try:
                if isinstance(assigned_to_json, str):
                    emp_list = json.loads(assigned_to_json)
                else:
                    emp_list = assigned_to_json
            except Exception:
                logger.warning(f"Failed to parse assigned_to JSON for milestone ID {m_id}: {assigned_to_json}")
                continue
                
            if not isinstance(emp_list, list):
                continue
                
            for emp_ref in emp_list:
                emp_ref_str = str(emp_ref).strip()
                emp_id = None
                
                if emp_ref_str in emp_id_set:
                    emp_id = emp_ref_str
                elif emp_ref_str.lower() in emp_name_to_id:
                    emp_id = emp_name_to_id[emp_ref_str.lower()]
                
                if emp_id:
                    # Check if already exists in milestone_assignments
                    exists = db.execute(
                        text("SELECT 1 FROM milestone_assignments WHERE task_id = :task_id AND employee_id = :employee_id"),
                        {"task_id": m_id, "employee_id": emp_id}
                    ).first()
                    
                    if not exists:
                        db.execute(
                            text("INSERT INTO milestone_assignments (task_id, employee_id) VALUES (:task_id, :employee_id)"),
                            {"task_id": m_id, "employee_id": emp_id}
                        )
                        migrated_count += 1

        db.commit()
        logger.info(f"Migrated {migrated_count} task assignment records to 'milestone_assignments' table.")

        # 6. Backfill task_type column based on item_type and legacy structure
        # Fetch all milestones sorted by row_order
        milestones_all = db.execute(
            text("SELECT id, project_id, item_type, indent_level, row_order FROM project_milestones ORDER BY project_id, row_order ASC")
        ).fetchall()
        
        # Group by project to perform dynamic hierarchy resolution
        projects_tasks = {}
        for row in milestones_all:
            projects_tasks.setdefault(row[1], []).append({
                "id": row[0],
                "item_type": row[2],
                "indent_level": row[3],
                "row_order": row[4],
                "parent_id": None,
                "task_type": None
            })
            
        for proj_id, tasks in projects_tasks.items():
            # Build hierarchy parent-child mapping using stack-based fallback
            stack = []
            parent_to_children = {}
            child_to_parent = {}
            for t in tasks:
                while stack and stack[-1]["indent_level"] >= t["indent_level"]:
                    stack.pop()
                if stack:
                    parent_id = stack[-1]["id"]
                    t["parent_id"] = parent_id
                    parent_to_children.setdefault(parent_id, []).append(t["id"])
                    child_to_parent[t["id"]] = parent_id
                stack.append(t)
            
            # Now assign task_type
            for t in tasks:
                has_children = t["id"] in parent_to_children
                has_parent = t["parent_id"] is not None
                
                if t["item_type"] == "Phase":
                    t["task_type"] = "phase"
                elif t["item_type"] in ("Milestone", "Approval Gate"):
                    t["task_type"] = "milestone"
                elif has_children:
                    t["task_type"] = "activity"
                elif has_parent:
                    t["task_type"] = "sub_activity"
                else:
                    t["task_type"] = "activity"
                    
                # Update DB and set parent_id as well for clean initial tree
                db.execute(
                    text("UPDATE project_milestones SET task_type = :task_type, parent_id = :parent_id WHERE id = :id"),
                    {"task_type": t["task_type"], "parent_id": t["parent_id"], "id": t["id"]}
                )

        db.commit()
        logger.info("Successfully backfilled 'task_type' and initial 'parent_id' values for all project milestones.")

        # 7. Add CHECK constraint on task_type column
        db.execute(text(
            "ALTER TABLE project_milestones DROP CONSTRAINT IF EXISTS check_task_type"
        ))
        db.execute(text(
            "ALTER TABLE project_milestones ADD CONSTRAINT check_task_type CHECK (task_type IN ('phase', 'activity', 'sub_activity', 'milestone'))"
        ))
        db.commit()
        logger.info("Added CHECK constraint 'check_task_type' to enforce valid task types in 'project_milestones'.")
        logger.info("Migration completed successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Migration failed: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
