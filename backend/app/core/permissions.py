from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.employee import Employee
from app.models.role import Role

def check_permissions(required_permission: str):
    """
    Factory function that returns a dependency for checking permissions.
    Usage: Depends(check_permissions("PermissionName"))
    """
    async def permission_dependency(
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # 1. Fetch user/employee details to get their current role
        user_id = int(current_user.get("sub"))
        employee = db.query(Employee).filter(Employee.id == user_id).first()
        
        if not employee:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or not associated with an employee profile"
                )
            current_role = "User"
        else:
            current_role = employee.role
        
        # 2. Super Admin bypass
        if current_role == "Super Admin":
            return True
            
        # 3. Fetch permissions for the assigned role
        role_obj = db.query(Role).filter(Role.name == current_role).first()
        if not role_obj:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_role}' not found in the system"
            )
            
        # 4. Validate permission
        permissions = role_obj.permissions or []
        if required_permission not in permissions:
            print(f"PERMISSION DENIED: User {current_user.get('email')} (Role: {current_role}) lacks '{required_permission}'.")
            print(f"User Permissions: {permissions}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_permission}"
            )
            
        return True
    
    return permission_dependency
