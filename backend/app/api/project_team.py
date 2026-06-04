from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.employee_project import EmployeeProjectCreate, EmployeeProjectResponse, EmployeeProjectUpdate
from app.models.employee_project import EmployeeProjectMap
from app.models.employee import Employee
from app.core.database import get_db
from app.core.security import get_current_user
from app.utils.audit import log_activity
from datetime import datetime

router = APIRouter(
    prefix="/projects",
    tags=["Project Team"]
)

@router.get("/{project_id}/team", response_model=List[EmployeeProjectResponse])
def get_project_team(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all team members assigned to a specific project including Manager, Lead and Assigned Employees"""
    from app.models.project import Project
    from sqlalchemy import or_

    project = db.query(Project).filter(Project.project_id == project_id).first()
    allocations = db.query(EmployeeProjectMap).filter(EmployeeProjectMap.project_id == project_id).all()

    # Collect IDs and names to batch query
    alloc_emp_ids = [a.employee_id for a in allocations if a.employee_id]
    names_to_fetch = []
    ids_to_fetch = list(alloc_emp_ids)

    if project:
        if project.project_manager:
            names_to_fetch.append(project.project_manager)
        if project.employee_id:
            ids_to_fetch.append(project.employee_id)
        if project.assigned_to_name:
            names_to_fetch.extend([n.strip() for n in project.assigned_to_name.split(",") if n.strip()])

    # Run batch query for employees
    conditions = []
    if ids_to_fetch:
        conditions.append(Employee.employee_id.in_(ids_to_fetch))
    if names_to_fetch:
        conditions.append(Employee.name.in_(names_to_fetch))

    employees = []
    if conditions:
        employees = db.query(Employee).filter(or_(*conditions)).all()

    # Create memory lookups
    emp_by_id = {e.employee_id: e for e in employees if e.employee_id}
    emp_by_name = {e.name: e for e in employees if e.name}

    result = []
    seen_ids = set()
    virtual_id_counter = -1

    # Helper function to append or update employee info
    def add_team_member(employee_id, role, name_fallback=None):
        nonlocal virtual_id_counter
        if employee_id in seen_ids:
            return

        emp = emp_by_id.get(employee_id)
        if not emp and name_fallback:
            emp = emp_by_name.get(name_fallback)

        emp_id = employee_id or (emp.employee_id if emp else None)
        if emp_id and emp_id in seen_ids:
            return

        name = emp.name if emp else name_fallback
        email = emp.email if emp else None
        dept = emp.department if emp else None
        emp_role = emp.role if emp else None

        result.append({
            "id": virtual_id_counter,
            "employee_id": emp_id or "UNKNOWN",
            "project_id": project_id,
            "role": role,
            "allocation_percentage": 100.0,
            "start_date": None,
            "end_date": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "employee_name": name or "Unknown Employee",
            "employee_email": email or "-",
            "employee_department": dept or "-",
            "employee_role": emp_role or "-"
        })
        if emp_id:
            seen_ids.add(emp_id)
        virtual_id_counter -= 1

    # 1. Project Manager precedence
    if project and project.project_manager:
        pm_emp = emp_by_name.get(project.project_manager)
        pm_id = pm_emp.employee_id if pm_emp else None
        add_team_member(pm_id, "Project Manager", name_fallback=project.project_manager)

    # 2. Team Lead precedence
    if project and project.employee_id:
        add_team_member(project.employee_id, "Team Lead", name_fallback=project.employee_name)

    # 3. Assigned Employees precedence
    if project and project.assigned_to_name:
        names = [n.strip() for n in project.assigned_to_name.split(",") if n.strip()]
        for name in names:
            emp = emp_by_name.get(name)
            emp_id = emp.employee_id if emp else None
            add_team_member(emp_id, "Employee", name_fallback=name)

    # 4. Junction allocations (EmployeeProjectMap)
    for alloc in allocations:
        if alloc.employee_id not in seen_ids:
            emp = emp_by_id.get(alloc.employee_id)
            result.append({
                "id": alloc.id,
                "employee_id": alloc.employee_id,
                "project_id": alloc.project_id,
                "role": alloc.role,
                "allocation_percentage": alloc.allocation_percentage,
                "start_date": alloc.start_date,
                "end_date": alloc.end_date,
                "created_at": alloc.created_at,
                "updated_at": alloc.updated_at,
                "employee_name": emp.name if emp else None,
                "employee_email": emp.email if emp else None,
                "employee_department": emp.department if emp else None,
                "employee_role": emp.role if emp else None
            })
            seen_ids.add(alloc.employee_id)

    return result

@router.post("/{project_id}/team", response_model=EmployeeProjectResponse)
def assign_team_member(
    project_id: str,
    assignment: EmployeeProjectCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Assign an employee to a project with a specific role"""
    if str(project_id) != str(assignment.project_id):
        raise HTTPException(status_code=400, detail="Project ID mismatch")
        
    existing = db.query(EmployeeProjectMap).filter(
        EmployeeProjectMap.project_id == project_id,
        EmployeeProjectMap.employee_id == assignment.employee_id,
        EmployeeProjectMap.role == assignment.role
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Employee already assigned with this role")

    new_alloc = EmployeeProjectMap(
        employee_id=assignment.employee_id,
        project_id=assignment.project_id,
        role=assignment.role,
        allocation_percentage=assignment.allocation_percentage,
        start_date=assignment.start_date,
        end_date=assignment.end_date
    )
    db.add(new_alloc)
    db.commit()
    db.refresh(new_alloc)
    
    emp = db.query(Employee).filter(Employee.employee_id == new_alloc.employee_id).first()
    alloc_dict = new_alloc.__dict__.copy()
    if emp:
        alloc_dict['employee_name'] = emp.name
        alloc_dict['employee_email'] = emp.email
        alloc_dict['employee_department'] = emp.department
        alloc_dict['employee_role'] = emp.role
        
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="ASSIGN TEAM MEMBER",
        module="Team Management",
        entity_id=str(project_id),
        details={
            "targetRole": assignment.role,
            "summary": f"Assigned {emp.name if emp else 'Employee ' + str(assignment.employee_id)} to project",
            "details": f"Role: {assignment.role} | Project ID: {project_id}"
        }
    )
    db.commit()
    
    return alloc_dict

@router.delete("/{project_id}/team/{allocation_id}")
def remove_team_member(
    project_id: str,
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove team member allocation"""
    alloc = db.query(EmployeeProjectMap).filter(EmployeeProjectMap.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
        
    emp_id = alloc.employee_id
    role = alloc.role
    
    db.delete(alloc)
    db.commit()
    
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="REMOVE TEAM MEMBER",
        module="Team Management",
        entity_id=str(project_id),
        details={
            "targetRole": role,
            "summary": f"Removed member from project team",
            "details": f"Allocation ID: {allocation_id} | Employee ID: {emp_id} | Role: {role}"
        }
    )
    db.commit()
    
    return {"message": "Team member removed successfully"}
