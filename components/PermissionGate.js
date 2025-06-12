import React from 'react';
import { useRole } from '../hooks/useRole';

/**
 * 权限门组件
 * 根据用户角色和权限控制子组件的渲染
 */
const PermissionGate = ({ 
  children, 
  requireAdmin = false,
  requireDeptAdmin = false,
  requireManagePermission = false,
  allowedRoles = [],
  minRoleLevel = null,
  fallback = null,
  requireLogin = true
}) => {
  const { 
    isLoggedIn, 
    isAdmin, 
    isDeptAdmin, 
    hasManagePermission, 
    hasAnyRole, 
    hasRoleLevel 
  } = useRole();

  // 检查是否需要登录
  if (requireLogin && !isLoggedIn) {
    return fallback;
  }

  // 检查管理员权限
  if (requireAdmin && !isAdmin) {
    return fallback;
  }

  // 检查部门管理员权限
  if (requireDeptAdmin && !isDeptAdmin) {
    return fallback;
  }

  // 检查管理权限（管理员或部门管理员）
  if (requireManagePermission && !hasManagePermission) {
    return fallback;
  }

  // 检查特定角色
  if (allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return fallback;
  }

  // 检查角色级别
  if (minRoleLevel !== null && !hasRoleLevel(minRoleLevel)) {
    return fallback;
  }

  // 所有检查通过，渲染子组件
  return children;
};

export default PermissionGate;

// 便捷的权限组件
export const AdminOnly = ({ children, fallback = null }) => (
  <PermissionGate requireAdmin={true} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const DeptAdminOnly = ({ children, fallback = null }) => (
  <PermissionGate requireDeptAdmin={true} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const ManagerOnly = ({ children, fallback = null }) => (
  <PermissionGate requireManagePermission={true} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const RoleOnly = ({ roles, children, fallback = null }) => (
  <PermissionGate allowedRoles={roles} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const MinRoleLevel = ({ level, children, fallback = null }) => (
  <PermissionGate minRoleLevel={level} fallback={fallback}>
    {children}
  </PermissionGate>
);