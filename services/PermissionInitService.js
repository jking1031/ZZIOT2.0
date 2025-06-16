/**
 * 权限初始化服务
 * 用户登录后自动检测用户部门信息并匹配部门权限
 * 实现权限控制的核心逻辑
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPermissionService, DepartmentService, UserDepartmentPermissionService } from '../api/permissionService';
import OAuth2Service from '../api/oauth2Service';
import { EventRegister } from '../utils/EventEmitter';

// 权限级别常量
export const PERMISSION_LEVELS = {
  NONE: 0,      // 无权限
  READ: 1,      // 只读
  WRITE: 2,     // 读写
  ADMIN: 3      // 管理员
};

// 默认访客权限配置
const GUEST_PERMISSIONS = {
  pages: [
    {
      permission_key: 'home_view',
      permission_name: '首页查看',
      route_path: '/home',
      module_name: '基础功能',
      permission_level: PERMISSION_LEVELS.READ
    },
    {
      permission_key: 'profile_view',
      permission_name: '个人资料查看',
      route_path: '/profile',
      module_name: '用户管理',
      permission_level: PERMISSION_LEVELS.READ
    }
  ],
  departments: [{
    id: 0,
    department_key: 'guest',
    department_name: '访客',
    description: '未分配部门的访客用户',
    color: '#999999',
    role: 'guest',
    is_primary: true
  }]
};

class PermissionInitService {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.userDepartments = [];
    this.accessiblePages = [];
  }

  /**
   * 初始化用户权限系统
   * 在用户登录后调用
   * @param {Object|boolean} userInfoOrForceRefresh - 用户信息对象或强制刷新标志
   * @param {boolean} forceRefresh - 强制刷新标志（当第一个参数是用户信息时使用）
   */
  async initializeUserPermissions(userInfoOrForceRefresh = false, forceRefresh = false) {
    try {
      console.log('[PermissionInit] 开始初始化用户权限系统');
      
      let userInfo;
      let shouldForceRefresh;
      
      // 判断第一个参数是用户信息对象还是布尔值
      if (typeof userInfoOrForceRefresh === 'object' && userInfoOrForceRefresh !== null) {
        // 第一个参数是用户信息对象
        userInfo = userInfoOrForceRefresh;
        shouldForceRefresh = forceRefresh;
        console.log('[PermissionInit] 使用传入的用户信息:', userInfo.id || userInfo.userId);
      } else {
        // 第一个参数是布尔值（向后兼容）
        shouldForceRefresh = userInfoOrForceRefresh;
        userInfo = await this.getCurrentUserInfo();
        if (!userInfo) {
          console.warn('[PermissionInit] 无法获取用户信息，使用访客权限');
          await this.setGuestPermissions();
          return false;
        }
      }

      // 标准化用户ID字段
      const userId = userInfo.id || userInfo.userId;
      if (!userId) {
        console.warn('[PermissionInit] 用户信息中缺少ID字段，使用访客权限');
        await this.setGuestPermissions();
        return false;
      }

      this.currentUser = { ...userInfo, userId };
      console.log('[PermissionInit] 当前用户ID:', userId);

      // 检查缓存
      if (!shouldForceRefresh) {
        const cached = await this.loadPermissionsFromCache(userId);
        if (cached) {
          console.log('[PermissionInit] 从缓存加载权限成功');
          this.initialized = true;
          this.emitPermissionUpdate();
          return true;
        }
      }

      // 从服务器加载权限
      await this.loadPermissionsFromServer(userId);
      
      this.initialized = true;
      this.emitPermissionUpdate();
      console.log('[PermissionInit] 权限初始化完成');
      return true;

    } catch (error) {
      console.error('[PermissionInit] 权限初始化失败:', error);
      await this.setGuestPermissions();
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUserInfo() {
    try {
      // 从 AsyncStorage 获取 OAuth2 配置并创建服务实例
      const oauth2Enabled = await AsyncStorage.getItem('oauth2_enabled');
      if (oauth2Enabled !== 'true') {
        console.log('[PermissionInit] OAuth2未启用');
        return null;
      }

      const savedConfig = await AsyncStorage.getItem('oauth2_config');
      if (!savedConfig) {
        console.log('[PermissionInit] 未找到OAuth2配置');
        return null;
      }

      const config = JSON.parse(savedConfig);
      const oauth2Service = new OAuth2Service(config.baseUrl, config.clientId, config.clientSecret);
      
      const result = await oauth2Service.getUserInfo();
      if (result.success) {
        return result.data;
      } else {
        console.error('[PermissionInit] 获取用户信息失败:', result.error);
        return null;
      }
    } catch (error) {
      console.error('[PermissionInit] 获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 从服务器加载用户权限（基于部门权限）
   */
  async loadPermissionsFromServer(userId) {
    try {
      console.log('[PermissionInit] 从服务器加载权限（基于部门）:', userId);
      
      // 获取用户信息中的部门字段
      const userInfo = this.currentUser;
      console.log('[PermissionInit] 调试 - 完整用户信息:', JSON.stringify(userInfo, null, 2));
      
      // 尝试多种可能的部门字段名称
      let userDepartments = null;
      
      // 检查各种可能的部门字段
      if (userInfo.departments) {
        userDepartments = userInfo.departments;
        console.log('[PermissionInit] 调试 - 从departments字段获取部门:', userDepartments);
      } else if (userInfo.department) {
        userDepartments = userInfo.department;
        console.log('[PermissionInit] 调试 - 从department字段获取部门:', userDepartments);
      } else if (userInfo.dept) {
        // OAuth2返回的用户信息中部门字段是dept
        userDepartments = userInfo.dept.name || userInfo.dept;
        console.log('[PermissionInit] 调试 - 从dept字段获取部门:', userDepartments);
      } else if (userInfo.userInfo && userInfo.userInfo.dept) {
        // 嵌套在userInfo中的dept字段
        userDepartments = userInfo.userInfo.dept.name || userInfo.userInfo.dept;
        console.log('[PermissionInit] 调试 - 从userInfo.dept字段获取部门:', userDepartments);
      }
      
      console.log('[PermissionInit] 调试 - 最终提取的部门信息:', userDepartments);
      
      if (!userDepartments) {
        console.log('[PermissionInit] 用户无部门信息，设置为访客权限');
        console.log('[PermissionInit] 调试 - 可用的用户信息字段:', Object.keys(userInfo));
        await this.setGuestPermissions();
        return;
      }

      // 基于用户部门信息获取权限
      await this.loadDepartmentPermissions(userDepartments);

      // 保存到缓存
      await this.savePermissionsToCache(userId);
      
      console.log('[PermissionInit] 权限加载完成:', {
        departments: this.userDepartments.length,
        pages: this.accessiblePages.length
      });

    } catch (error) {
      console.error('[PermissionInit] 从服务器加载权限失败:', error);
      throw error;
    }
  }

  /**
   * 设置访客权限
   */
  async setGuestPermissions() {
    console.log('[PermissionInit] 设置访客权限');
    this.userPermissions = [];
    this.userDepartments = GUEST_PERMISSIONS.departments;
    this.accessiblePages = GUEST_PERMISSIONS.pages;
    this.initialized = true;
    this.emitPermissionUpdate();
  }

  /**
   * 从缓存加载权限
   */
  async loadPermissionsFromCache(userId) {
    try {
      const cacheKey = `user_permissions_cache_${userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return false;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // 检查缓存是否过期（30分钟）
      if (now - data.timestamp > 30 * 60 * 1000) {
        return false;
      }
      
      this.userDepartments = data.departments || [];
      this.accessiblePages = data.pages || [];
      
      return true;
    } catch (error) {
      console.warn('[PermissionInit] 加载缓存失败:', error);
      return false;
    }
  }

  /**
   * 保存权限到缓存
   */
  async savePermissionsToCache(userId) {
    try {
      const cacheKey = `user_permissions_cache_${userId}`;
      const data = {
        departments: this.userDepartments,
        pages: this.accessiblePages,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('[PermissionInit] 保存缓存失败:', error);
    }
  }

  /**
   * 清除权限缓存
   */
  async clearPermissionsCache(userId = null) {
    try {
      if (userId) {
        const cacheKey = `user_permissions_cache_${userId}`;
        await AsyncStorage.removeItem(cacheKey);
      } else {
        // 清除所有权限缓存
        const keys = await AsyncStorage.getAllKeys();
        const permissionKeys = keys.filter(key => key.startsWith('user_permissions_cache_'));
        await AsyncStorage.multiRemove(permissionKeys);
      }
    } catch (error) {
      console.warn('[PermissionInit] 清除缓存失败:', error);
    }
  }

  /**
   * 检查页面权限
   */
  checkPagePermission(routePath, requiredLevel = PERMISSION_LEVELS.READ) {
    if (!this.initialized) {
      console.warn('[PermissionInit] 权限系统未初始化');
      return false;
    }

    const page = this.accessiblePages.find(p => {
      // 精确匹配
      if (p.route_path === routePath) return true;
      
      // 通配符匹配
      const pattern = p.route_path.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(routePath);
    });
    
    if (!page) return false;
    return page.permission_level >= requiredLevel;
  }

  /**
   * 检查功能权限（基于部门权限）
   */
  checkFeaturePermission(permissionKey, requiredLevel = PERMISSION_LEVELS.READ) {
    if (!this.initialized) {
      console.warn('[PermissionInit] 权限系统未初始化');
      return false;
    }

    // 在可访问页面中查找权限
    const permission = this.accessiblePages.find(p => p.permission_key === permissionKey);
    if (!permission) return false;
    
    return permission.permission_level >= requiredLevel;
  }

  /**
   * 检查部门权限
   */
  checkDepartmentAccess(departmentKey) {
    if (!this.initialized) {
      console.warn('[PermissionInit] 权限系统未初始化');
      return false;
    }

    return this.userDepartments.some(dept => dept.department_key === departmentKey);
  }

  /**
   * 获取用户权限信息
   */
  getUserPermissionInfo() {
    return {
      initialized: this.initialized,
      user: this.currentUser,
      departments: this.userDepartments,
      accessiblePages: this.accessiblePages,
      isGuest: this.userDepartments.length === 1 && this.userDepartments[0].department_key === 'guest'
    };
  }

  /**
   * 刷新权限
   */
  async refreshPermissions() {
    if (!this.currentUser) {
      console.warn('[PermissionInit] 无当前用户信息，无法刷新权限');
      return false;
    }

    return await this.initializeUserPermissions(true);
  }

  /**
   * 发送权限更新事件
   */
  emitPermissionUpdate() {
    EventRegister.emit('PERMISSION_UPDATED', this.getUserPermissionInfo());
  }

  /**
   * 基于用户信息中的部门字段加载权限
   * @param {string|Array} userDepartments - 用户部门信息
   */
  async loadDepartmentPermissions(userDepartments) {
    try {
      console.log('[PermissionInit] 基于用户部门信息加载权限:', userDepartments);
      console.log('[PermissionInit] 调试 - 部门信息类型:', typeof userDepartments);
      console.log('[PermissionInit] 调试 - 部门信息详情:', JSON.stringify(userDepartments, null, 2));
      
      // 使用新的权限服务方法
      console.log('[PermissionInit] 调试 - 开始调用UserDepartmentPermissionService.getUserPermissionsByDepartment');
      const permissionsResult = await UserDepartmentPermissionService.getUserPermissionsByDepartment(userDepartments);
      console.log('[PermissionInit] 调试 - 权限服务返回结果:', JSON.stringify(permissionsResult, null, 2));
      
      if (permissionsResult.success && permissionsResult.data) {
        this.accessiblePages = permissionsResult.data;
        // 设置用户部门信息（从权限服务返回的数据中获取）
        this.userDepartments = permissionsResult.departments || [];
        console.log(`[PermissionInit] 成功加载了 ${this.accessiblePages.length} 个权限`);
        console.log('[PermissionInit] 部门权限详情:', permissionsResult.departments);
        console.log('[PermissionInit] 调试 - 可访问页面列表:', this.accessiblePages.map(p => p.permission_name));
      } else {
        console.warn('[PermissionInit] 获取部门权限失败:', permissionsResult.error);
        console.log('[PermissionInit] 调试 - 权限服务失败详情:', permissionsResult);
        this.accessiblePages = [];
        this.userDepartments = [];
      }
      
    } catch (error) {
      console.error('[PermissionInit] 加载部门权限失败:', error);
      console.error('[PermissionInit] 调试 - 错误堆栈:', error.stack);
      this.accessiblePages = [];
      this.userDepartments = [];
    }
  }

  /**
   * 重置权限系统
   */
  reset() {
    this.initialized = false;
    this.currentUser = null;
    this.userDepartments = [];
    this.accessiblePages = [];
  }
}

// 创建单例实例
const permissionInitService = new PermissionInitService();

export default permissionInitService;
export { PermissionInitService };