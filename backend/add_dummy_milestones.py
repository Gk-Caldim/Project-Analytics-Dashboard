import logging
import sys
from datetime import datetime, timedelta
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.project import Project
from app.models.project_milestone import ProjectMilestone, MilestoneAssignment, ProjectDependency
from app.services.project_milestone_service import recalculate_project_schedule

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("add_dummy_milestones")

def populate_dummy_milestones():
    db = SessionLocal()
    try:
        # 1. Fetch available projects
        projects = db.query(Project).all()
        if not projects:
            logger.error("No projects found in the database. Please create a project first.")
            return

        print("\nAvailable Projects:")
        for idx, p in enumerate(projects):
            print(f"[{idx + 1}] ID: {p.project_id} | Name: {p.name}")

        selected_idx = 0
        if len(projects) > 1:
            try:
                val = input(f"\nSelect a project [1-{len(projects)}] (default 1): ").strip()
                if val:
                    selected_idx = int(val) - 1
            except Exception:
                selected_idx = 0
        
        project = projects[selected_idx]
        logger.info(f"Targeting Project: {project.name} ({project.project_id})")

        # 2. Fetch available employees to assign
        employees = db.execute(text("SELECT employee_id, name FROM employees")).fetchall()
        employee_ids = [row[0] for row in employees if row[0]]
        if not employee_ids:
            logger.warning("No employees found in the database. Milestones will be unassigned.")

        # 3. Clean up existing milestones, dependencies, and assignments for this project
        logger.info("Cleaning up existing milestone data for this project...")
        # Get list of milestone IDs for this project
        m_ids = [m.id for m in db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project.project_id).all()]
        if m_ids:
            # Delete milestones (cascades assignments and dependencies if configured, else clean up explicitly)
            db.query(ProjectDependency).filter(ProjectDependency.project_id == project.project_id).delete()
            db.query(MilestoneAssignment).filter(MilestoneAssignment.task_id.in_(m_ids)).delete(synchronize_session=False)
            db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project.project_id).delete()
            db.commit()
            logger.info(f"Cleared {len(m_ids)} existing milestones.")

        # 4. Generate high-fidelity WBS tree spanning 6+ months
        # Let's set project start date to today
        proj_start = datetime.utcnow().replace(hour=8, minute=0, second=0, microsecond=0)
        
        # Helper to assign random employee
        def get_random_assignees():
            import random
            if not employee_ids:
                return []
            # Assign 1 to 2 random employees
            k = random.randint(0, min(2, len(employee_ids)))
            return random.sample(employee_ids, k)

        # Structure of dummy tasks
        # Each phase/task has name, type, indent_level, offset days from project start, and duration
        dummy_def = [
            # PHASE 1: Proposal & Contract Execution (Month 1)
            {"name": "Phase 1: Initiation & Contract Signing", "item_type": "Phase", "task_type": "phase", "indent": 0, "offset": 0, "duration": 15},
            {"name": "Finalize Proposal & Scope Definition", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 0, "duration": 10},
            {"name": "Draft Proposal Agreement", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 0, "duration": 4},
            {"name": "Scope Technical Specifications Review", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 3, "duration": 5},
            {"name": "Legal Department Contract Review", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 7, "duration": 3},
            {"name": "Client Kick-off Meeting & Alignment", "item_type": "Milestone", "task_type": "milestone", "indent": 1, "offset": 12, "duration": 0},
            {"name": "Contract Signed Milestone", "item_type": "Milestone", "task_type": "milestone", "indent": 1, "offset": 15, "duration": 0},

            # PHASE 2: Engineering Layout & Design (Months 2-3)
            {"name": "Phase 2: Detailed Engineering Design", "item_type": "Phase", "task_type": "phase", "indent": 0, "offset": 15, "duration": 45},
            {"name": "Engineering Layout Drawings", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 15, "duration": 25},
            {"name": "Architectural Layout Modeling", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 15, "duration": 14},
            {"name": "Structural Load & Stress Calculations", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 22, "duration": 10},
            {"name": "Electrical Conduit Routing Diagrams", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 28, "duration": 8},
            {"name": "P&ID Drawings & Spec Sheets", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 30, "duration": 30},
            {"name": "Draft P&ID Diagram Modeling", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 30, "duration": 15},
            {"name": "Procurement Spec Sheets Compilation", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 40, "duration": 15},
            {"name": "Design Review Board Sign-off", "item_type": "Milestone", "task_type": "milestone", "indent": 1, "offset": 60, "duration": 0},

            # PHASE 3: Procurement & Fabrication (Months 3-5)
            {"name": "Phase 3: Procurement & Fabrication", "item_type": "Phase", "task_type": "phase", "indent": 0, "offset": 60, "duration": 75},
            {"name": "Material Procurement Campaign", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 60, "duration": 60},
            {"name": "Purchase Order Generation & Issue", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 60, "duration": 10},
            {"name": "Long-lead Item Manufacturing & Shipping", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 70, "duration": 50},
            {"name": "Metal Fabrication & Shop Pre-Assembly", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 90, "duration": 40},
            {"name": "Frame Welding & Assembly", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 90, "duration": 25},
            {"name": "Corrosion Coating & Finishing", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 110, "duration": 15},
            {"name": "Factory Acceptance Testing (FAT)", "item_type": "Milestone", "task_type": "milestone", "indent": 1, "offset": 135, "duration": 0},

            # PHASE 4: Installation & Commissioning (Months 5-6)
            {"name": "Phase 4: Site Installation & Commissioning", "item_type": "Phase", "task_type": "phase", "indent": 0, "offset": 135, "duration": 45},
            {"name": "Mechanical Site Installation", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 135, "duration": 25},
            {"name": "Civil Foundation Pouring & Curing", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 135, "duration": 12},
            {"name": "Equipment Anchoring & Piping Tie-ins", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 145, "duration": 15},
            {"name": "Commissioning Runs & Startup Checks", "item_type": "Task", "task_type": "activity", "indent": 1, "offset": 155, "duration": 20},
            {"name": "Cold Loop Tests & Calibrations", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 155, "duration": 10},
            {"name": "Hot Commissioning & Performance Run", "item_type": "Sub Task", "task_type": "sub_activity", "indent": 2, "offset": 163, "duration": 10},
            {"name": "Operations Handover & Project Closeout", "item_type": "Milestone", "task_type": "milestone", "indent": 1, "offset": 180, "duration": 0}
        ]

        logger.info(f"Generating {len(dummy_def)} milestone entries...")

        # Keep a list of created milestones to wire up parent-child relationships and dependencies
        db_milestones = []
        for idx, item in enumerate(dummy_def):
            # Calculate dates
            start_dt = proj_start + timedelta(days=item["offset"])
            end_dt = start_dt + timedelta(days=item["duration"])
            
            # Setup departments
            dept = "Engineering"
            if item["name"].lower().startswith("phase"):
                dept = None
            elif "procurement" in item["name"].lower() or "purchase" in item["name"].lower():
                dept = "Procurement"
            elif "fabrication" in item["name"].lower() or "welding" in item["name"].lower() or "coating" in item["name"].lower():
                dept = "Manufacturing"
            elif "civil" in item["name"].lower() or "anchoring" in item["name"].lower() or "installation" in item["name"].lower():
                dept = "Installation"
            elif "commissioning" in item["name"].lower() or "loop" in item["name"].lower():
                dept = "Commissioning"
            
            m = ProjectMilestone(
                project_id=project.project_id,
                activity_name=item["name"],
                item_type=item["item_type"],
                task_type=item["task_type"],
                row_order=idx,
                indent_level=item["indent"],
                department=dept,
                start_date=start_dt,
                end_date=end_dt,
                complete_percent=0.0,
                status="Not Started",
                custom_values={}
            )
            db.add(m)
            db_milestones.append(m)
        
        db.flush()

        # 5. Wire up parent-child relationships (parent_id)
        logger.info("Setting parent-child hierarchy linkages...")
        stack = []
        for m in db_milestones:
            while stack and stack[-1].indent_level >= m.indent_level:
                stack.pop()
            
            if stack:
                m.parent_id = stack[-1].id
            
            stack.append(m)
        
        # Flush to persist parent_id values
        db.flush()

        # 6. Rebuild assignments using real database employee IDs
        logger.info("Populating task assignments...")
        for m in db_milestones:
            # Summary phases do not get individual assignments, but child tasks do
            if m.task_type in ("activity", "sub_activity", "milestone"):
                assignees = get_random_assignees()
                for emp_id in assignees:
                    assignment = MilestoneAssignment(task_id=m.id, employee_id=emp_id)
                    db.add(assignment)

        # 7. Add typical critical path dependencies (Predecessors)
        logger.info("Configuring predecessor relationships for critical path flow...")
        # Map some tasks to successors
        # e.g., Task index 1.1 Draft Proposal (idx 2) is predecessor to Review (idx 3)
        # We find their generated DB IDs
        deps_to_add = [
            (2, 3, "FS", 0),  # Draft Proposal -> Spec Review
            (3, 4, "FS", 0),  # Spec Review -> Legal Review
            (4, 5, "FS", 1),  # Legal Review -> Kick-off Meeting
            (5, 6, "FS", 0),  # Kick-off -> Contract Signed
            
            (6, 9, "FS", 0),  # Contract Signed -> Architectural Layout
            (9, 10, "FS", 0), # Arch Layout -> Structural load calculations
            (10, 11, "FS", 0),# Structural calculations -> Electrical conduit
            (11, 15, "FS", 2),# Electrical routing -> Design Board sign-off
            
            (15, 18, "FS", 0),# Design Sign-off -> PO Generation
            (18, 19, "FS", 0),# PO Generation -> Manufacturing long-lead
            (19, 21, "SS", 15),# Manufacturing shipping -> Metal fabrication (SS with 15 days lag)
            (21, 22, "FS", 0),# Fabricate -> Coat
            (22, 23, "FS", 2),# Coat -> Factory Acceptance Test
            
            (23, 26, "FS", 0),# FAT -> Foundation Pouring
            (26, 27, "FS", 5),# Foundation pour -> Equipment Anchoring (FS with 5 days concrete curing lag)
            (27, 29, "FS", 0),# Anchoring -> Cold Loop Test
            (29, 30, "FS", 0),# Loop Test -> Hot Commissioning Run
            (30, 31, "FS", 0) # Commissioning -> Closeout Handover
        ]

        for p_idx, s_idx, d_type, lag in deps_to_add:
            if p_idx < len(db_milestones) and s_idx < len(db_milestones):
                dep = ProjectDependency(
                    project_id=project.project_id,
                    predecessor_task_id=db_milestones[p_idx].id,
                    successor_task_id=db_milestones[s_idx].id,
                    type=d_type,
                    lag_days=lag
                )
                db.add(dep)

        db.commit()

        # 8. Recalculate schedule (run CPM critical path and parent rollups)
        logger.info("Recalculating project schedule (CPM critical path and parent date/completeness rollups)...")
        recalculate_project_schedule(db, project.project_id)
        
        logger.info("Successfully populated project milestones with high-fidelity, long-term dummy WBS timeline!")
        print("\nDummy milestones generation completed successfully! You can now load the Gantt chart in the app.")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to generate dummy milestones: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    populate_dummy_milestones()
