import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getDepartmentRolePermissions, // Changed from getDepartmentPermissions
  hasDepartmentPagePermission, // This will now accept roleName
  hasDepartmentButtonPermission, // This will now accept roleName
  SUPER_ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS
} from '../config/departmentPermissions';

/**
 * 部门权限管理钩子
 * 基于用户所属部门提供权限检查功能
 */
export const useDepartmentPermission = () => {
  const { user, loading } = useContext(AuthContext); // Added loading from context

  // 获取用户部门信息
  const getUserDepartment = () => {
    if (!user) return null;
    
    // 从多个可能的字段中获取部门信息
    const dept = user.dept || user.department || user.deptName;
    
    if (typeof dept === 'object' && dept !== null) {
      // 如果部门是对象，尝试获取部门名称
      return dept.name || dept.deptName || dept.departmentName || null;
    }
    
    if (typeof dept === 'string') {
      return dept;
    }
    
    return null;
  };

  // 获取用户权限
  const getUserPermissions = () => {
    if (!user) {
      return {
        pages: [],
        buttons: []
      };
    }

    // New logic to determine if user is a super admin based on role_name or username
    // This should be configured based on how super admins are identified in your system
    const isSuperAdminUser = () => {
      // Example: role_name '超级系统管理员' or username 'superadmin' signifies super admin
      // Adjust this logic as per your application's super admin definition
      return user?.role_name === '超级系统管理员' || user?.username === 'superadmin';
    };

    if (isSuperAdminUser()) {
      return SUPER_ADMIN_PERMISSIONS;
    }

    const departmentName = getUserDepartment();
    const roleName = user?.role_name || ''; // Get role_name from user object

    if (departmentName) {
      // Use getDepartmentRolePermissions with departmentName and roleName
      const rolePermissions = getDepartmentRolePermissions(departmentName, roleName);
      // Combine role-specific permissions with global default permissions
      // Ensure no duplicates and that role permissions take precedence
      const finalPages = Array.from(new Set([...(rolePermissions.pages || []), ...DEFAULT_PERMISSIONS.pages]));
      const finalButtons = Array.from(new Set([...(rolePermissions.buttons || []), ...DEFAULT_PERMISSIONS.buttons]));
      return {
        pages: finalPages,
        buttons: finalButtons
      };
    }

    // If no department or specific role permissions, return global default permissions
    return DEFAULT_PERMISSIONS;
  };

  // 检查页面权限
  const hasPagePermission = (pagePermission) => {
    if (loading || !user) return false; // Check loading state

    const isSuperAdminUser = () => {
      return user?.role_name === '超级系统管理员' || user?.username === 'superadmin';
    };

    if (isSuperAdminUser()) return true;

    const departmentName = getUserDepartment();
    const roleName = user?.role_name || '';

    if (!departmentName) {
      return DEFAULT_PERMISSIONS.pages.includes(pagePermission);
    }
    // Pass roleName to hasDepartmentPagePermission
    return hasDepartmentPagePermission(departmentName, roleName, pagePermission) || 
           DEFAULT_PERMISSIONS.pages.includes(pagePermission);
  };

  // 检查按钮权限
  const hasButtonPermission = (buttonPermission) => {
    if (loading || !user) return false; // Check loading state

    const isSuperAdminUser = () => {
      return user?.role_name === '超级系统管理员' || user?.username === 'superadmin';
    };

    if (isSuperAdminUser()) return true;

    const departmentName = getUserDepartment();
    const roleName = user?.role_name || '';

    if (!departmentName) {
      return DEFAULT_PERMISSIONS.buttons.includes(buttonPermission);
    }
    // Pass roleName to hasDepartmentButtonPermission
    return hasDepartmentButtonPermission(departmentName, roleName, buttonPermission) || 
           DEFAULT_PERMISSIONS.buttons.includes(buttonPermission);
  };

  // 检查多个页面权限（任一满足即可）
  const hasAnyPagePermission = (pagePermissions) => {
    return pagePermissions.some(permission => hasPagePermission(permission));
  };

  // 检查多个按钮权限（任一满足即可）
  const hasAnyButtonPermission = (buttonPermissions) => {
    return buttonPermissions.some(permission => hasButtonPermission(permission));
  };

  // 检查所有页面权限（全部满足才通过）
  const hasAllPagePermissions = (pagePermissions) => {
    return pagePermissions.every(permission => hasPagePermission(permission));
  };

  // 检查所有按钮权限（全部满足才通过）
  const hasAllButtonPermissions = (buttonPermissions) => {
    return buttonPermissions.every(permission => hasButtonPermission(permission));
  };

  // 获取部门信息 (now considers role)
  const getDepartmentInfo = () => {
    const departmentName = getUserDepartment();
    const roleName = user?.role_name || '';

    const isSuperAdminUser = () => {
      return user?.role_name === '超级系统管理员' || user?.username === 'superadmin';
    };

    if (isSuperAdminUser()) {
      return {
        name: '超级系统管理员',
        description: '拥有所有权限',
        isSuperAdmin: true, // Add a flag for super admin status
        permissions: SUPER_ADMIN_PERMISSIONS
      };
    }

    if (!departmentName) {
      return {
        name: '未分配部门',
        description: '用户未分配到具体部门',
        isSuperAdmin: false,
        permissions: DEFAULT_PERMISSIONS
      };
    }
    // Use getDepartmentRolePermissions to get role-specific info
    const deptRolePerms = getDepartmentRolePermissions(departmentName, roleName);
    return {
      name: deptRolePerms.name || departmentName, // Display role-specific name if available
      description: deptRolePerms.description || '无部门或角色描述',
      isSuperAdmin: false,
      permissions: {
        pages: Array.from(new Set([...(deptRolePerms.pages || []), ...DEFAULT_PERMISSIONS.pages])),
        buttons: Array.from(new Set([...(deptRolePerms.buttons || []), ...DEFAULT_PERMISSIONS.buttons]))
      }
    };
  };

  // 获取用户权限摘要
  const getPermissionSummary = () => {
    if (loading) return { summaryText: '权限加载中...', isLoggedIn: !!user }; // Handle loading state
    
    const permissions = getUserPermissions(); // Already role-aware
    const deptInfo = getDepartmentInfo(); // Already role-aware and includes super admin check
    const roleName = user?.role_name || '无角色';

    let summaryText = `${deptInfo.name}`;
    if (deptInfo.isSuperAdmin) {
      summaryText = '超级系统管理员 (所有权限)';
    } else if (deptInfo.name !== '未分配部门' && roleName !== '无角色' && deptInfo.name.includes(roleName)) {
      // If getDepartmentInfo already includes role in its name, use it directly
      summaryText = `${deptInfo.name} - 页面: ${permissions.pages.length}, 功能: ${permissions.buttons.length}`;
    } else if (deptInfo.name !== '未分配部门') {
        summaryText = `${deptInfo.name} (${roleName}) - 页面: ${permissions.pages.length}, 功能: ${permissions.buttons.length}`;
    } else {
        summaryText = `未分配部门 (${roleName}) - 页面: ${permissions.pages.length}, 功能: ${permissions.buttons.length}`;
    }
    
    return {
      user: {
        id: user?.id,
        username: user?.username,
        name: user?.nickname || user?.name,
        role_name: user?.role_name
      },
      department: {
        name: deptInfo.name, // Use name from getDepartmentInfo
        info: deptInfo
      },
      permissions: {
        pageCount: permissions.pages.length,
        buttonCount: permissions.buttons.length,
        pages: permissions.pages,
        buttons: permissions.buttons
      },
      isLoggedIn: !!user,
      summaryText,
      isSuperAdmin: deptInfo.isSuperAdmin || false
    };
  };

  const isSuperAdminCurrent = () => {
      if (!user) return false;
      return user?.role_name === '超级系统管理员' || user?.username === 'superadmin';
  };

  return {
    user,
    loading, // Expose loading state
    isLoggedIn: !!user,
    department: getUserDepartment(),
    role_name: user?.role_name || '', // Expose role_name
    departmentInfo: getDepartmentInfo(), // Now role-aware
    isSuperAdmin: isSuperAdminCurrent(), // Expose super admin status directly
    
    hasPagePermission,
    hasButtonPermission,
    hasAnyPagePermission,
    hasAnyButtonPermission,
    hasAllPagePermissions,
    hasAllButtonPermissions,
    
    permissions: getUserPermissions(), // Now role-aware
    permissionSummary: getPermissionSummary(), // Now role-aware

    // Exposing these raw getters might be useful for some components
    getUserDepartment,
    getUserRoleName: () => user?.role_name || ''
  };
};

export default useDepartmentPermission;