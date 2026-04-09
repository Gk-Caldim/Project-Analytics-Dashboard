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
    """Get all team members assigned to a specific project"""
    # Should probably check project permission first as in project.py
    allocations = db.query(EmployeeProjectMap).filter(EmployeeProjectMap.project_id == project_id).all()
    
    # Manually attach employee name/email for UI convenience
    result = []
    for alloc in allocations:
        emp = db.query(Employee).filter(Employee.employee_id == alloc.employee_id).first()
        alloc_dict = alloc.__dict__.copy()
        if emp:
            alloc_dict['employee_name'] = emp.name
            alloc_dict['employee_email'] = emp.email
            alloc_dict['employee_department'] = emp.department
            alloc_dict['employee_role'] = emp.role
        result.append(alloc_dict)
        
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
