import React from 'react';
import { useSelector } from 'react-redux';

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on user permissions.
 * 
 * @param {string} permission - The permission string to check for (e.g., 'Employee Master:ADD')
 * @param {React.ReactNode} children - Elements to show if permission is granted
 * @param {React.ReactNode} fallback - Optional elements to show if permission is denied
 */
const PermissionGuard = ({ permission, children, fallback = null }) => {
    const { user } = useSelector((state) => state.auth);
    const permissions = user?.permissions || [];
    const role = user?.role || '';

    // Super Admin bypass
    if (role === 'Super Admin') {
        return <>{children}</>;
    }

    // Check if user has the specific permission
    const hasPermission = permissions.includes(permission);

    if (hasPermission) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};

export default PermissionGuard;
