import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * 角色管理钩子
 * 提供简化的角色检查和权限验证功能
 */
export const useRole = () => {
  const { user, isAdmin } = useContext(AuthContext);

  // 角色映射定义
  const ROLE_MAPPING = {
    1: { name: '超级管理员', isAdmin: true, isDeptAdmin: false },
    2: { name: '系统管理员', isAdmin: true, isDeptAdmin: false },
    3: { name: '部门管理员', isAdmin: false, isDeptAdmin: true },
    4: { name: '技术人员', isAdmin: false, isDeptAdmin: false },
    5: { name: '操作员', isAdmin: false, isDeptAdmin: false },
    6: { name: '查看者', isAdmin: false, isDeptAdmin: false },
    7: { name: '客户', isAdmin: false, isDeptAdmin: false },
    8: { name: '访客', isAdmin: false, isDeptAdmin: false },
    9: { name: '普通用户', isAdmin: false, isDeptAdmin: false }
  };

  // 获取当前用户角色ID
  const getCurrentRoleId = () => {
    if (!user) return 9;
    return user.role_id || user.is_admin || 9;
  };

  // 获取当前用户角色信息
  const getCurrentRole = () => {
    const roleId = getCurrentRoleId();
    return ROLE_MAPPING[roleId] || ROLE_MAPPING[9];
  };

  // 检查是否为管理员
  const checkIsAdmin = () => {
    if (!user) return false;
    return user.isAdmin || isAdmin || getCurrentRole().isAdmin;
  };

  // 检查是否为部门管理员
  const checkIsDeptAdmin = () => {
    if (!user) return false;
    return user.isDeptAdmin || getCurrentRole().isDeptAdmin;
  };

  // 检查是否有管理权限（管理员或部门管理员）
  const checkHasManagePermission = () => {
    return checkIsAdmin() || checkIsDeptAdmin();
  };

  // 检查是否有特定角色
  const checkHasRole = (roleId) => {
    return getCurrentRoleId() === roleId;
  };

  // 检查是否有任一指定角色
  const checkHasAnyRole = (roleIds) => {
    const currentRoleId = getCurrentRoleId();
    return roleIds.includes(currentRoleId);
  };

  // 检查角色级别（数字越小权限越高）
  const checkRoleLevel = (minLevel) => {
    const currentRoleId = getCurrentRoleId();
    return currentRoleId <= minLevel;
  };

  // 获取角色显示名称
  const getRoleName = () => {
    return getCurrentRole().name;
  };

  // 获取用户显示信息
  const getUserDisplayInfo = () => {
    if (!user) return { name: '未登录', role: '无' };
    
    return {
      name: user.username || user.name || user.email || '未知用户',
      role: getRoleName(),
      isAdmin: checkIsAdmin(),
      isDeptAdmin: checkIsDeptAdmin()
    };
  };

  return {
    // 基础信息
    user,
    isLoggedIn: !!user,
    
    // 角色信息
    roleId: getCurrentRoleId(),
    roleName: getRoleName(),
    roleInfo: getCurrentRole(),
    
    // 权限检查
    isAdmin: checkIsAdmin(),
    isDeptAdmin: checkIsDeptAdmin(),
    hasManagePermission: checkHasManagePermission(),
    
    // 角色检查方法
    hasRole: checkHasRole,
    hasAnyRole: checkHasAnyRole,
    hasRoleLevel: checkRoleLevel,
    
    // 显示信息
    userDisplayInfo: getUserDisplayInfo(),
    
    // 角色映射（只读）
    ROLES: ROLE_MAPPING
  };
};

export default useRole;