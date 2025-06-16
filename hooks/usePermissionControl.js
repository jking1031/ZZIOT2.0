/**
 * 权限控制Hook
 * 提供统一的权限检查和控制接口
 * 在应用中使用权限控制的主要入口
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { EventRegister } from '../utils/EventEmitter';
import permissionInitService, { PERMISSION_LEVELS } from '../services/PermissionInitService';
import { AuthContext } from '../context/AuthContext';

/**
 * 权限控制主Hook
 */
export const usePermissionControl = () => {
  const { user } = useContext(AuthContext);
  const [permissionInfo, setPermissionInfo] = useState({
    initialized: false,
    user: null,
    permissions: [],
    departments: [],
    accessiblePages: [],
    isGuest: true
  });
  const [loading, setLoading] = useState(true);

  // 监听权限更新事件
  useEffect(() => {
    const permissionUpdateListener = EventRegister.addEventListener(
      'PERMISSION_UPDATED',
      (newPermissionInfo) => {
        setPermissionInfo(newPermissionInfo);
        setLoading(false);
      }
    );

    // 初始化权限信息
    const currentInfo = permissionInitService.getUserPermissionInfo();
    setPermissionInfo(currentInfo);
    setLoading(!currentInfo.initialized);

    return () => {
      EventRegister.removeEventListener(permissionUpdateListener);
    };
  }, []);

  // 当用户登录状态变化时，重新初始化权限
  useEffect(() => {
    if (user) {
      setLoading(true);
      permissionInitService.initializeUserPermissions(user);
    } else {
      // 用户登出时重置权限
      permissionInitService.reset();
      setPermissionInfo({
        initialized: false,
        user: null,
        permissions: [],
        departments: [],
        accessiblePages: [],
        isGuest: true
      });
      setLoading(false);
    }
  }, [user]);

  // 检查页面权限
  const checkPagePermission = useCallback((routePath, requiredLevel = PERMISSION_LEVELS.READ) => {
    return permissionInitService.checkPagePermission(routePath, requiredLevel);
  }, []);

  // 检查功能权限
  const checkFeaturePermission = useCallback((permissionKey, requiredLevel = PERMISSION_LEVELS.READ) => {
    return permissionInitService.checkFeaturePermission(permissionKey, requiredLevel);
  }, []);

  // 检查部门权限
  const checkDepartmentAccess = useCallback((departmentKey) => {
    return permissionInitService.checkDepartmentAccess(departmentKey);
  }, []);

  // 获取权限级别
  const getPermissionLevel = useCallback((permissionKey) => {
    const permission = permissionInfo.permissions.find(p => p.permission_key === permissionKey);
    return permission ? permission.effective_level : PERMISSION_LEVELS.NONE;
  }, [permissionInfo.permissions]);

  // 获取可访问页面列表
  const getAccessiblePages = useCallback((minLevel = PERMISSION_LEVELS.READ) => {
    return permissionInfo.accessiblePages
      .filter(page => page.permission_level >= minLevel)
      .map(page => ({
        key: page.permission_key,
        name: page.permission_name,
        route: page.route_path,
        module: page.module_name,
        level: page.permission_level
      }));
  }, [permissionInfo.accessiblePages]);

  // 获取用户部门列表
  const getUserDepartments = useCallback(() => {
    return permissionInfo.departments.map(dept => ({
      id: dept.id,
      key: dept.department_key,
      name: dept.department_name,
      role: dept.role,
      isPrimary: dept.is_primary,
      color: dept.color
    }));
  }, [permissionInfo.departments]);

  // 刷新权限
  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    await permissionInitService.refreshPermissions();
  }, []);

  // 检查是否为管理员
  const isAdmin = useCallback(() => {
    return permissionInfo.departments.some(dept => dept.role === 'admin');
  }, [permissionInfo.departments]);

  // 检查是否为部门领导
  const isDepartmentLeader = useCallback((departmentKey = null) => {
    if (departmentKey) {
      return permissionInfo.departments.some(dept => 
        dept.department_key === departmentKey && dept.role === 'leader'
      );
    }
    return permissionInfo.departments.some(dept => dept.role === 'leader');
  }, [permissionInfo.departments]);

  return {
    // 状态
    loading,
    initialized: permissionInfo.initialized,
    isGuest: permissionInfo.isGuest,
    user: permissionInfo.user,
    permissions: permissionInfo.permissions,
    departments: permissionInfo.departments,
    accessiblePages: permissionInfo.accessiblePages,

    // 权限检查方法
    checkPagePermission,
    checkFeaturePermission,
    checkDepartmentAccess,
    getPermissionLevel,
    getAccessiblePages,
    getUserDepartments,
    isAdmin,
    isDepartmentLeader,

    // 操作方法
    refreshPermissions
  };
};

/**
 * 页面权限Hook
 * 专门用于页面级别的权限控制
 */
export const usePagePermission = (routePath, requiredLevel = PERMISSION_LEVELS.READ) => {
  const { checkPagePermission, loading, initialized } = usePermissionControl();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (initialized && !loading) {
      const permission = checkPagePermission(routePath, requiredLevel);
      setHasPermission(permission);
    }
  }, [checkPagePermission, routePath, requiredLevel, initialized, loading]);

  return {
    hasPermission,
    loading: loading || !initialized,
    checkPermission: () => checkPagePermission(routePath, requiredLevel)
  };
};

/**
 * 功能权限Hook
 * 专门用于功能级别的权限控制
 */
export const useFeaturePermission = (permissionKey, requiredLevel = PERMISSION_LEVELS.READ) => {
  const { checkFeaturePermission, getPermissionLevel, loading, initialized } = usePermissionControl();
  const [hasPermission, setHasPermission] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(PERMISSION_LEVELS.NONE);

  useEffect(() => {
    if (initialized && !loading) {
      const permission = checkFeaturePermission(permissionKey, requiredLevel);
      const level = getPermissionLevel(permissionKey);
      setHasPermission(permission);
      setCurrentLevel(level);
    }
  }, [checkFeaturePermission, getPermissionLevel, permissionKey, requiredLevel, initialized, loading]);

  return {
    hasPermission,
    currentLevel,
    loading: loading || !initialized,
    canRead: currentLevel >= PERMISSION_LEVELS.READ,
    canWrite: currentLevel >= PERMISSION_LEVELS.WRITE,
    canAdmin: currentLevel >= PERMISSION_LEVELS.ADMIN
  };
};

/**
 * 部门权限Hook
 * 专门用于部门级别的权限控制
 */
export const useDepartmentPermission = (departmentKey = null) => {
  const { 
    checkDepartmentAccess, 
    getUserDepartments, 
    isDepartmentLeader, 
    isAdmin,
    loading, 
    initialized 
  } = usePermissionControl();
  
  const [hasAccess, setHasAccess] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [userDepartments, setUserDepartments] = useState([]);

  useEffect(() => {
    if (initialized && !loading) {
      if (departmentKey) {
        setHasAccess(checkDepartmentAccess(departmentKey));
        setIsLeader(isDepartmentLeader(departmentKey));
      }
      setUserDepartments(getUserDepartments());
    }
  }, [checkDepartmentAccess, getUserDepartments, isDepartmentLeader, departmentKey, initialized, loading]);

  return {
    hasAccess,
    isLeader,
    isAdmin: isAdmin(),
    userDepartments,
    loading: loading || !initialized,
    isInDepartment: (deptKey) => checkDepartmentAccess(deptKey)
  };
};

/**
 * 权限守卫Hook
 * 提供通用的权限守卫功能
 */
export const usePermissionGuard = (config) => {
  const {
    type = 'page', // 'page', 'feature', 'department'
    permission,
    requiredLevel = PERMISSION_LEVELS.READ,
    departmentKey = null
  } = config;

  const { 
    checkPagePermission, 
    checkFeaturePermission, 
    checkDepartmentAccess,
    loading, 
    initialized 
  } = usePermissionControl();

  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (initialized && !loading) {
      let hasPermission = false;
      
      switch (type) {
        case 'page':
          hasPermission = checkPagePermission(permission, requiredLevel);
          break;
        case 'feature':
          hasPermission = checkFeaturePermission(permission, requiredLevel);
          break;
        case 'department':
          hasPermission = checkDepartmentAccess(departmentKey || permission);
          break;
        default:
          hasPermission = false;
      }
      
      setCanAccess(hasPermission);
    }
  }, [type, permission, requiredLevel, departmentKey, checkPagePermission, checkFeaturePermission, checkDepartmentAccess, initialized, loading]);

  return {
    canAccess,
    loading: loading || !initialized
  };
};

export { PERMISSION_LEVELS };
export default usePermissionControl;