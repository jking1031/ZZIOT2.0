/**
 * App权限管理React Hooks V2.0
 * 基于ruoyi用户系统集成的权限管理设计
 * 移除独立用户表，直接使用ruoyi用户ID
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  PermissionModuleService,
  PagePermissionService,
  DepartmentService,
  UserPermissionService,
  PermissionStatsService,
  UserDepartmentPermissionService,
  PERMISSION_LEVELS
} from '../api/permissionService';
import OAuth2Service from '../api/oauth2Service';

// 权限缓存键
const CACHE_KEYS = {
  USER_PERMISSIONS: 'app_user_permissions_v2',
  USER_DEPARTMENTS: 'app_user_departments_v2',
  ACCESSIBLE_PAGES: 'app_accessible_pages_v2',
  PERMISSION_CACHE_TIME: 'app_permission_cache_time_v2',
  RUOYI_USER_ID: 'app_ruoyi_user_id'
};

// 缓存有效期（毫秒）
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟

/**
 * 主要的权限管理Hook
 * 基于ruoyi用户系统的权限管理功能
 */
export const useAppPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [accessiblePages, setAccessiblePages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheTime, setCacheTime] = useState(null);
  const [ruoyiUserId, setRuoyiUserId] = useState(null);

  // 获取当前ruoyi用户ID
  const getCurrentRuoyiUserId = useCallback(async () => {
    try {
      // 先从缓存获取
      const cachedUserId = await AsyncStorage.getItem(CACHE_KEYS.RUOYI_USER_ID);
      if (cachedUserId) {
        setRuoyiUserId(cachedUserId);
        return cachedUserId;
      }

      // 从OAuth2服务获取当前用户信息
      const oauth2Enabled = await AsyncStorage.getItem('oauth2_enabled');
      if (oauth2Enabled === 'true') {
        const savedConfig = await AsyncStorage.getItem('oauth2_config');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          const oauth2Service = new OAuth2Service(config.baseUrl, config.clientId, config.clientSecret);
          const userInfo = await oauth2Service.getUserInfo();
          if (userInfo.success && userInfo.data.id) {
            const userId = userInfo.data.id.toString();
            await AsyncStorage.setItem(CACHE_KEYS.RUOYI_USER_ID, userId);
            setRuoyiUserId(userId);
            return userId;
          }
        }
      }
      
      throw new Error('无法获取用户ID');
    } catch (error) {
      console.error('获取ruoyi用户ID失败:', error);
      setError(error.message);
      return null;
    }
  }, []);

  // 基于部门加载权限
  const loadDepartmentPermissions = useCallback(async (userDepartments) => {
    try {
      console.log('[useAppPermissions] 基于部门加载权限');
      
      // 收集所有部门的权限
      const allPermissions = new Map();
      
      for (const department of userDepartments) {
        try {
          const deptPermissionsResult = await DepartmentService.getDepartmentPermissions(department.id);
          
          if (deptPermissionsResult.success && deptPermissionsResult.data) {
            const deptPermissions = deptPermissionsResult.data;
            
            // 合并部门权限，取最高权限级别
            deptPermissions.forEach(permission => {
              const key = permission.permission_key || permission.permission_id;
              const existing = allPermissions.get(key);
              
              if (!existing || permission.permission_level > existing.permission_level) {
                allPermissions.set(key, {
                  permission_key: key,
                  permission_name: permission.permission_name,
                  route_path: permission.route_path,
                  module_name: permission.module_name,
                  permission_level: permission.permission_level,
                  department_name: department.department_name
                });
              }
            });
          }
        } catch (error) {
          console.warn(`[useAppPermissions] 获取部门 ${department.department_name} 权限失败:`, error);
        }
      }
      
      // 转换为数组并过滤有效权限
      const permissions = Array.from(allPermissions.values())
        .filter(p => p.route_path && p.permission_level > 0);
      
      console.log(`[useAppPermissions] 从 ${userDepartments.length} 个部门加载了 ${permissions.length} 个权限`);
      
      return permissions;
      
    } catch (error) {
      console.error('[useAppPermissions] 加载部门权限失败:', error);
      return [];
    }
  }, []);

  // 从缓存加载权限数据
  const loadFromCache = useCallback(async (userId) => {
    try {
      const cacheKey = `${CACHE_KEYS.USER_PERMISSIONS}_${userId}`;
      const deptCacheKey = `${CACHE_KEYS.USER_DEPARTMENTS}_${userId}`;
      const pagesCacheKey = `${CACHE_KEYS.ACCESSIBLE_PAGES}_${userId}`;
      const timeCacheKey = `${CACHE_KEYS.PERMISSION_CACHE_TIME}_${userId}`;
      
      const [cachedPermissions, cachedDepartments, cachedPages, cachedTime] = await Promise.all([
        AsyncStorage.getItem(cacheKey),
        AsyncStorage.getItem(deptCacheKey),
        AsyncStorage.getItem(pagesCacheKey),
        AsyncStorage.getItem(timeCacheKey)
      ]);

      if (cachedTime) {
        const cacheTimestamp = parseInt(cachedTime);
        const now = Date.now();
        
        // 检查缓存是否过期
        if (now - cacheTimestamp < CACHE_DURATION) {
          if (cachedPermissions) setPermissions(JSON.parse(cachedPermissions));
          if (cachedDepartments) setDepartments(JSON.parse(cachedDepartments));
          if (cachedPages) setAccessiblePages(JSON.parse(cachedPages));
          setCacheTime(cacheTimestamp);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('加载权限缓存失败:', error);
      return false;
    }
  }, []);

  // 保存权限数据到缓存
  const saveToCache = useCallback(async (userId, permissionsData, departmentsData, pagesData) => {
    try {
      const timestamp = Date.now();
      const cacheKey = `${CACHE_KEYS.USER_PERMISSIONS}_${userId}`;
      const deptCacheKey = `${CACHE_KEYS.USER_DEPARTMENTS}_${userId}`;
      const pagesCacheKey = `${CACHE_KEYS.ACCESSIBLE_PAGES}_${userId}`;
      const timeCacheKey = `${CACHE_KEYS.PERMISSION_CACHE_TIME}_${userId}`;
      
      await Promise.all([
        AsyncStorage.setItem(cacheKey, JSON.stringify(permissionsData)),
        AsyncStorage.setItem(deptCacheKey, JSON.stringify(departmentsData)),
        AsyncStorage.setItem(pagesCacheKey, JSON.stringify(pagesData)),
        AsyncStorage.setItem(timeCacheKey, timestamp.toString())
      ]);
      setCacheTime(timestamp);
    } catch (error) {
      console.warn('保存权限缓存失败:', error);
    }
  }, []);

  // 清除权限缓存
  const clearCache = useCallback(async (userId = null) => {
    try {
      if (userId) {
        // 清除特定用户的缓存
        const cacheKey = `${CACHE_KEYS.USER_PERMISSIONS}_${userId}`;
        const deptCacheKey = `${CACHE_KEYS.USER_DEPARTMENTS}_${userId}`;
        const pagesCacheKey = `${CACHE_KEYS.ACCESSIBLE_PAGES}_${userId}`;
        const timeCacheKey = `${CACHE_KEYS.PERMISSION_CACHE_TIME}_${userId}`;
        
        await Promise.all([
          AsyncStorage.removeItem(cacheKey),
          AsyncStorage.removeItem(deptCacheKey),
          AsyncStorage.removeItem(pagesCacheKey),
          AsyncStorage.removeItem(timeCacheKey)
        ]);
      } else {
        // 清除所有权限相关缓存
        const keys = await AsyncStorage.getAllKeys();
        const permissionKeys = keys.filter(key => 
          key.startsWith(CACHE_KEYS.USER_PERMISSIONS) ||
          key.startsWith(CACHE_KEYS.USER_DEPARTMENTS) ||
          key.startsWith(CACHE_KEYS.ACCESSIBLE_PAGES) ||
          key.startsWith(CACHE_KEYS.PERMISSION_CACHE_TIME)
        );
        await AsyncStorage.multiRemove(permissionKeys);
        await AsyncStorage.removeItem(CACHE_KEYS.RUOYI_USER_ID);
      }
      setCacheTime(null);
    } catch (error) {
      console.warn('清除权限缓存失败:', error);
    }
  }, []);

  // 加载用户权限（基于部门权限）
  const loadUserPermissions = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // 获取当前ruoyi用户ID
      const currentUserId = await getCurrentRuoyiUserId();
      if (!currentUserId) {
        throw new Error('无法获取用户ID');
      }

      // 如果不强制刷新，先尝试从缓存加载
      if (!forceRefresh) {
        const cacheLoaded = await loadFromCache(currentUserId);
        if (cacheLoaded) {
          setLoading(false);
          return;
        }
      }

      // 获取用户部门信息
      const departmentsResult = await UserPermissionService.getUserDepartments(currentUserId);

      if (departmentsResult.success) {
        const userDepartments = departmentsResult.data || [];
        
        // 基于用户部门信息获取权限
        const permissionsResult = await UserDepartmentPermissionService.getUserPermissionsByDepartment(userDepartments);
        
        if (permissionsResult.success && permissionsResult.data) {
          const departmentPermissions = permissionsResult.data;
          const departmentResults = permissionsResult.departments || userDepartments;
          
          setPermissions(departmentPermissions);
          setAccessiblePages(departmentPermissions);
          setDepartments(departmentResults);
          
          // 保存到缓存
          await saveToCache(
            currentUserId,
            departmentPermissions,
            departmentResults,
            departmentPermissions
          );
        } else {
          throw new Error(permissionsResult.error || '获取部门权限失败');
        }
      } else {
        throw new Error(departmentsResult.error || '获取用户部门失败');
      }

    } catch (error) {
      console.error('加载用户权限失败:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [getCurrentRuoyiUserId, loadFromCache, saveToCache]);

  // 检查页面权限
  const checkPagePermission = useCallback((pageRoute, requiredLevel = PERMISSION_LEVELS.READ) => {
    const page = accessiblePages.find(p => p.route_path === pageRoute);
    if (!page) return false;
    
    return page.permission_level >= requiredLevel;
  }, [accessiblePages]);

  // 检查路由权限
  const checkRoutePermission = useCallback((routePath, requiredLevel = PERMISSION_LEVELS.READ) => {
    // 支持通配符匹配
    const matchingPage = accessiblePages.find(page => {
      if (page.route_path === routePath) return true;
      
      // 简单的通配符匹配
      const pattern = page.route_path.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(routePath);
    });
    
    if (!matchingPage) return false;
    return matchingPage.permission_level >= requiredLevel;
  }, [accessiblePages]);

  // 获取权限级别
  const getPermissionLevel = useCallback((permissionKey) => {
    const permission = permissions.find(p => p.permission_key === permissionKey);
    return permission ? permission.effective_level : PERMISSION_LEVELS.NONE;
  }, [permissions]);

  // 检查用户是否属于特定部门
  const isInDepartment = useCallback((departmentKey) => {
    return departments.some(dept => dept.department_key === departmentKey);
  }, [departments]);

  // 获取用户部门列表
  const getUserDepartments = useCallback(() => {
    return departments.map(dept => ({
      id: dept.id,
      key: dept.department_key,
      name: dept.department_name,
      role: dept.role,
      isPrimary: dept.is_primary
    }));
  }, [departments]);

  // 获取可访问页面列表
  const getAccessiblePages = useCallback((minLevel = PERMISSION_LEVELS.READ) => {
    return accessiblePages
      .filter(page => page.permission_level >= minLevel)
      .map(page => ({
        key: page.permission_key,
        name: page.permission_name,
        route: page.route_path,
        module: page.module_name,
        level: page.permission_level
      }));
  }, [accessiblePages]);

  // 刷新权限数据
  const refreshPermissions = useCallback(() => {
    return loadUserPermissions(true);
  }, [loadUserPermissions]);

  // 检查特定权限（直接调用API）
  const checkPermission = useCallback(async (permissionKey, requiredLevel = PERMISSION_LEVELS.READ) => {
    try {
      const currentUserId = ruoyiUserId || await getCurrentRuoyiUserId();
      if (!currentUserId) return false;
      
      const result = await UserPermissionService.checkUserPermission(currentUserId, permissionKey, requiredLevel);
      return result.success ? result.data.hasPermission : false;
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  }, [ruoyiUserId, getCurrentRuoyiUserId]);

  // 初始化时加载权限
  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  return {
    // 状态
    permissions,
    departments,
    accessiblePages,
    loading,
    error,
    cacheTime,
    ruoyiUserId,
    
    // 方法
    loadUserPermissions,
    refreshPermissions,
    checkPagePermission,
    checkRoutePermission,
    checkPermission,
    getPermissionLevel,
    isInDepartment,
    getUserDepartments,
    getAccessiblePages,
    clearCache,
    getCurrentRuoyiUserId
  };
};

/**
 * 部门权限管理Hook
 */
export const useDepartmentPermissions = () => {
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 加载所有部门和权限数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [departmentsResult, permissionsResult, modulesResult] = await Promise.all([
        DepartmentService.getAllDepartments(),
        PagePermissionService.getAllPermissions(),
        PermissionModuleService.getAllModules()
      ]);

      if (departmentsResult.success) {
        setDepartments(departmentsResult.data || []);
      } else {
        throw new Error(departmentsResult.error || '获取部门列表失败');
      }

      if (permissionsResult.success) {
        setPermissions(permissionsResult.data || []);
      } else {
        throw new Error(permissionsResult.error || '获取权限列表失败');
      }

      if (modulesResult.success) {
        setModules(modulesResult.data || []);
      } else {
        throw new Error(modulesResult.error || '获取模块列表失败');
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取部门权限配置
  const getDepartmentPermissions = useCallback(async (departmentId) => {
    try {
      const result = await DepartmentService.getDepartmentPermissions(departmentId);
      return result.success ? result.data : [];
    } catch (error) {
      console.error('获取部门权限配置失败:', error);
      return [];
    }
  }, []);

  // 更新部门权限
  const updateDepartmentPermissions = useCallback(async (departmentId, permissionUpdates, grantedBy) => {
    setLoading(true);
    setError(null);

    try {
      const result = await DepartmentService.updatePermissions(departmentId, permissionUpdates, grantedBy);
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.error || '更新部门权限失败');
      }
    } catch (error) {
      console.error('更新部门权限失败:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建部门
  const createDepartment = useCallback(async (departmentData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await DepartmentService.createDepartment(departmentData);
      
      if (result.success) {
        await loadData();
        return result.data;
      } else {
        throw new Error(result.error || '创建部门失败');
      }
    } catch (error) {
      console.error('创建部门失败:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // 更新部门信息
  const updateDepartment = useCallback(async (departmentId, departmentData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await DepartmentService.updateDepartment(departmentId, departmentData);
      
      if (result.success) {
        await loadData();
        return true;
      } else {
        throw new Error(result.error || '更新部门失败');
      }
    } catch (error) {
      console.error('更新部门失败:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // 删除部门
  const deleteDepartment = useCallback(async (departmentId) => {
    setLoading(true);
    setError(null);

    try {
      const result = await DepartmentService.deleteDepartment(departmentId);
      
      if (result.success) {
        await loadData();
        return true;
      } else {
        throw new Error(result.error || '删除部门失败');
      }
    } catch (error) {
      console.error('删除部门失败:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // 初始化时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    departments,
    permissions,
    modules,
    loading,
    error,
    loadData,
    getDepartmentPermissions,
    updateDepartmentPermissions,
    createDepartment,
    updateDepartment,
    deleteDepartment
  };
};

/**
 * 权限验证Hook
 * 提供组件级别的权限验证功能
 */
export const usePermissionGuard = (permissionKey, requiredLevel = PERMISSION_LEVELS.READ) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ruoyiUserId, setRuoyiUserId] = useState(null);

  const checkPermission = useCallback(async () => {
    if (!permissionKey) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 获取当前ruoyi用户ID
      const oauth2Enabled = await AsyncStorage.getItem('oauth2_enabled');
      if (oauth2Enabled !== 'true') {
        throw new Error('OAuth2未启用');
      }

      const savedConfig = await AsyncStorage.getItem('oauth2_config');
      if (!savedConfig) {
        throw new Error('未找到OAuth2配置');
      }

      const config = JSON.parse(savedConfig);
      const oauth2Service = new OAuth2Service(config.baseUrl, config.clientId, config.clientSecret);
      const userInfo = await oauth2Service.getUserInfo();
      if (!userInfo.success || !userInfo.data.id) {
        throw new Error('无法获取用户信息');
      }

      const userId = userInfo.data.id.toString();
      setRuoyiUserId(userId);

      const result = await UserPermissionService.checkUserPermission(userId, permissionKey, requiredLevel);
      
      if (result.success) {
        setHasPermission(result.data.hasPermission);
      } else {
        setHasPermission(false);
        setError(result.error);
      }
    } catch (error) {
      console.error('权限验证失败:', error);
      setHasPermission(false);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [permissionKey, requiredLevel]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    hasPermission,
    loading,
    error,
    ruoyiUserId,
    recheckPermission: checkPermission
  };
};

export default useAppPermissions;