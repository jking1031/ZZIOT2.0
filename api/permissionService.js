import { apiService } from './interceptors';
import { getStoredToken } from './storage';

/**
 * 权限服务类 - 基于ruoyi用户系统的权限管理
 * 通过Node-RED API接口调用数据库
 */
class PermissionService {
  constructor() {
    this.baseURL = '/api'; // Node-RED API基础路径
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 获取权限模块列表
   */
  async getPermissionModules() {
    const cacheKey = 'permission_modules';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`${this.baseURL}/permission-modules`);
      
      // 检查响应格式，如果已经包含success属性则直接返回，否则包装数据
      if (response && typeof response === 'object' && 'success' in response) {
        this.cache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
        return response;
      } else {
        // 包装为标准格式
        const formattedResponse = {
          success: true,
          data: response || [],
          message: '获取权限模块成功',
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(cacheKey, {
          data: formattedResponse,
          timestamp: Date.now()
        });
        
        return formattedResponse;
      }
    } catch (error) {
      console.error('获取权限模块失败:', error);
      const errorResponse = {
        success: false,
        data: [],
        error: error.message || '获取权限模块失败',
        timestamp: new Date().toISOString()
      };
      return errorResponse;
    }
  }

  /**
   * 获取页面权限列表
   * @param {number} moduleId - 模块ID（可选）
   */
  async getPagePermissions(moduleId = null) {
    const cacheKey = `page_permissions_${moduleId || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = moduleId 
        ? `${this.baseURL}/page-permissions?moduleId=${moduleId}`
        : `${this.baseURL}/page-permissions`;
      
      const response = await apiService.get(url);
      
      // 检查响应格式，如果已经包含success属性则直接返回，否则包装数据
      if (response && typeof response === 'object' && 'success' in response) {
        this.cache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
        return response;
      } else {
        // 包装为标准格式
        const formattedResponse = {
          success: true,
          data: response || [],
          message: '获取页面权限成功',
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(cacheKey, {
          data: formattedResponse,
          timestamp: Date.now()
        });
        
        return formattedResponse;
      }
    } catch (error) {
      console.error('获取页面权限失败:', error);
      const errorResponse = {
        success: false,
        data: [],
        error: error.message || '获取页面权限失败',
        timestamp: new Date().toISOString()
      };
      return errorResponse;
    }
  }

  /**
   * 获取部门列表
   */
  async getDepartments() {
    const cacheKey = 'departments';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`${this.baseURL}/departments`);
      
      // 检查响应格式，如果已经包含success属性则直接返回，否则包装数据
      if (response && typeof response === 'object' && 'success' in response) {
        this.cache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
        return response;
      } else {
        // 包装为标准格式
        const formattedResponse = {
          success: true,
          data: response || [],
          message: '获取部门列表成功',
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(cacheKey, {
          data: formattedResponse,
          timestamp: Date.now()
        });
        
        return formattedResponse;
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
      const errorResponse = {
        success: false,
        data: [],
        error: error.message || '获取部门列表失败',
        timestamp: new Date().toISOString()
      };
      return errorResponse;
    }
  }

  /**
   * 获取用户权限（基于ruoyi用户ID）
   * @param {string} ruoyiUserId - ruoyi用户ID
   */
  async getUserPermissions(ruoyiUserId) {
    if (!ruoyiUserId) {
      throw new Error('ruoyi用户ID不能为空');
    }

    const cacheKey = `user_permissions_${ruoyiUserId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`${this.baseURL}/user-permissions/${ruoyiUserId}`);
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('获取用户权限失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户权限
   * @param {string} ruoyiUserId - ruoyi用户ID
   * @param {string} permissionId - 权限ID
   * @param {number} requiredLevel - 所需权限级别
   */
  async checkPermission(ruoyiUserId, permissionId, requiredLevel = 1) {
    if (!ruoyiUserId || !permissionId) {
      throw new Error('用户ID和权限ID不能为空');
    }

    try {
      const response = await apiService.post(`${this.baseURL}/check-permission`, {
        ruoyiUserId,
        permissionId,
        requiredLevel
      });
      
      return response.data;
    } catch (error) {
      console.error('权限检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门权限
   * @param {number} departmentId - 部门ID
   */
  async getDepartmentPermissions(departmentId) {
    if (!departmentId) {
      throw new Error('部门ID不能为空');
    }

    const cacheKey = `department_permissions_${departmentId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`${this.baseURL}/department-permissions/${departmentId}`);
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('获取部门权限失败:', error);
      throw error;
    }
  }

  /**
   * 更新部门权限
   * @param {number} departmentId - 部门ID
   * @param {Array} permissions - 权限列表
   * @param {string} grantedBy - 授权人ruoyi用户ID
   */
  async updateDepartmentPermissions(departmentId, permissions, grantedBy) {
    if (!departmentId || !permissions) {
      throw new Error('部门ID和权限列表不能为空');
    }

    try {
      const response = await apiService.put(`${this.baseURL}/department-permissions/${departmentId}`, {
        permissions,
        grantedBy
      });
      
      // 清除相关缓存
      this.clearDepartmentCache(departmentId);
      
      // 确保返回标准格式的响应
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      } else {
        // 如果响应格式不标准，包装为标准格式
        return {
          success: true,
          data: response.data,
          message: '部门权限更新成功',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('更新部门权限失败:', error);
      // 返回标准错误格式
      return {
        success: false,
        error: error.message || '更新部门权限失败',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取用户所属部门
   * @param {string} ruoyiUserId - ruoyi用户ID
   */
  async getUserDepartments(ruoyiUserId) {
    if (!ruoyiUserId) {
      throw new Error('ruoyi用户ID不能为空');
    }

    const cacheKey = `user_departments_${ruoyiUserId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`${this.baseURL}/user-departments/${ruoyiUserId}`);
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('获取用户部门失败:', error);
      throw error;
    }
  }

  /**
   * 分配用户到部门
   * @param {string} ruoyiUserId - ruoyi用户ID
   * @param {number} departmentId - 部门ID
   * @param {string} role - 角色 (member, leader, admin)
   * @param {boolean} isPrimary - 是否为主要部门
   */
  async assignUserToDepartment(ruoyiUserId, departmentId, role = 'member', isPrimary = false) {
    if (!ruoyiUserId || !departmentId) {
      throw new Error('用户ID和部门ID不能为空');
    }

    try {
      const response = await apiService.post(`${this.baseURL}/user-departments`, {
        ruoyiUserId,
        departmentId,
        role,
        isPrimary
      });
      
      // 清除相关缓存
      this.clearUserCache(ruoyiUserId);
      
      return response.data;
    } catch (error) {
      console.error('分配用户部门失败:', error);
      throw error;
    }
  }

  /**
   * 创建部门
   * @param {Object} departmentData - 部门数据
   * @param {string} departmentData.department_key - 部门键
   * @param {string} departmentData.department_name - 部门名称
   * @param {string} departmentData.description - 部门描述（可选）
   * @param {string} departmentData.color - 部门颜色（可选）
   * @param {number} departmentData.parent_id - 父部门ID（可选）
   * @param {number} departmentData.sort_order - 排序（可选）
   */
  async createDepartment(departmentData) {
    if (!departmentData || !departmentData.department_key || !departmentData.department_name) {
      throw new Error('部门键和部门名称不能为空');
    }

    try {
      const response = await apiService.post(`${this.baseURL}/departments`, departmentData);
      
      // 清除部门列表缓存
      this.cache.delete('departments');
      
      // 检查响应格式，如果已经包含success属性则直接返回，否则包装数据
      if (response && typeof response === 'object' && 'success' in response) {
        return response;
      } else {
        // 包装为标准格式
        return {
          success: true,
          data: response || {},
          message: '创建部门成功',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('创建部门失败:', error);
      const errorResponse = {
        success: false,
        data: null,
        error: error.message || '创建部门失败',
        timestamp: new Date().toISOString()
      };
      throw errorResponse;
    }
  }

  /**
   * 获取权限统计信息
   */
  async getPermissionStats() {
    const cacheKey = 'permission_stats';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await apiService.get(`${this.baseURL}/permission-stats`);
      const data = response.data;
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('获取权限统计失败:', error);
      throw error;
    }
  }

  /**
   * 清除用户相关缓存
   * @param {string} ruoyiUserId - ruoyi用户ID
   */
  clearUserCache(ruoyiUserId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`user_${ruoyiUserId}`) || key.includes(`user_permissions_${ruoyiUserId}`) || key.includes(`user_departments_${ruoyiUserId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 清除部门相关缓存
   * @param {number} departmentId - 部门ID
   */
  clearDepartmentCache(departmentId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`department_${departmentId}`) || key.includes('permission_stats')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    this.cache.clear();
    console.log('权限服务缓存已清除');
  }

  /**
   * 获取权限级别文本
   * @param {number} level - 权限级别
   * @returns {string} 权限级别文本
   */
  static getPermissionLevelText(level) {
    return PermissionService.PERMISSION_LEVEL_TEXT[level] || '未知';
  }

  /**
   * 获取权限级别颜色
   * @param {number} level - 权限级别
   * @returns {string} 权限级别颜色
   */
  static getPermissionLevelColor(level) {
    return PermissionService.PERMISSION_LEVEL_COLORS[level] || '#9E9E9E';
  }

  /**
   * 验证权限级别
   * @param {number} level - 权限级别
   * @returns {boolean} 是否有效
   */
  static isValidPermissionLevel(level) {
    return typeof level === 'number' && level >= 0 && level <= 3;
  }

  /**
   * 格式化API响应
   * @param {Object} response - API响应
   * @returns {Object} 格式化后的响应
   */
  formatApiResponse(response) {
    // 确保响应包含必要的字段
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        data: [],
        error: '无效的API响应格式',
        timestamp: new Date().toISOString()
      };
    }

    // 如果响应已经是标准格式，直接返回
    if (response.hasOwnProperty('success')) {
      return response;
    }

    // 如果响应是数组，包装为标准格式
    if (Array.isArray(response)) {
      return {
        success: true,
        data: response,
        message: '获取数据成功',
        timestamp: new Date().toISOString()
      };
    }

    // 其他情况，尝试提取数据
    return {
      success: true,
      data: response.data || response,
      message: response.message || '操作成功',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 权限级别常量 - 与后端保持一致
   */
  static PERMISSION_LEVELS = {
    NONE: 0,     // 无权限
    READ: 1,     // 只读权限
    WRITE: 2,    // 读写权限
    ADMIN: 3     // 管理员权限
  };

  /**
   * 权限级别文本映射
   */
  static PERMISSION_LEVEL_TEXT = {
    0: '无权限',
    1: '只读',
    2: '读写',
    3: '管理员'
  };

  /**
   * 权限级别颜色映射
   */
  static PERMISSION_LEVEL_COLORS = {
    0: '#9E9E9E',  // 灰色
    1: '#2196F3',  // 蓝色
    2: '#4CAF50',  // 绿色
    3: '#FF5722'   // 红色
  };

  /**
   * 部门角色常量
   */
  static DEPARTMENT_ROLES = {
    MEMBER: 'member',
    LEADER: 'leader',
    ADMIN: 'admin'
  };
}

// 创建权限服务实例
const permissionService = new PermissionService();

// 为了向后兼容，创建各种服务的别名
export const PermissionModuleService = {
  getAllModules: () => permissionService.getPermissionModules()
};

export const PagePermissionService = {
  getAllPermissions: (moduleId) => permissionService.getPagePermissions(moduleId)
};

export const DepartmentService = {
  getAllDepartments: () => permissionService.getDepartments(),
  getPermissions: (departmentId) => permissionService.getDepartmentPermissions(departmentId),
  updatePermissions: (departmentId, permissions, grantedBy) => permissionService.updateDepartmentPermissions(departmentId, permissions, grantedBy),
  createDepartment: (departmentData) => permissionService.createDepartment(departmentData)
};

export const UserPermissionService = {
  getUserPermissions: (ruoyiUserId) => permissionService.getUserPermissions(ruoyiUserId),
  checkPermission: (ruoyiUserId, pageId, requiredLevel) => permissionService.checkPermission(ruoyiUserId, pageId, requiredLevel)
};

export const PermissionStatsService = {
  getStats: () => permissionService.getPermissionStats()
};

// 为了向后兼容，也导出 API 别名
export const DepartmentAPI = DepartmentService;
export const PagePermissionAPI = {
  getModules: () => permissionService.getPermissionModules(),
  getAllPermissions: (moduleId) => permissionService.getPagePermissions(moduleId)
};

// 导出权限级别常量
export const PERMISSION_LEVELS = PermissionService.PERMISSION_LEVELS;
export const DEPARTMENT_ROLES = PermissionService.DEPARTMENT_ROLES;

// 导出 PermissionService 类
export { PermissionService };

// 默认导出
export default permissionService;