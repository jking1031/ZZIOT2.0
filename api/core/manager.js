// API统一管理配置
// 支持多后端配置和动态管理，便于对接不同的后端服务（如Node-RED等）

import AsyncStorage from '@react-native-async-storage/async-storage';

// 默认基础URL配置
const DEFAULT_API_BASE_URLS = {
  // Node-RED 后端 - 统一业务API服务器
  NODERED: {
    name: 'Node-RED服务器',
    url: 'https://nodered.jzz77.cn:9003',
    enabled: true,
    description: '统一业务API服务器（已迁移所有ZZIOT服务）',
    priority: 1
  },
};

// 运行时API配置（可动态修改）
let API_BASE_URLS = { ...DEFAULT_API_BASE_URLS };

// 配置存储键
const API_CONFIG_STORAGE_KEY = 'api_backend_config';

// 加载保存的配置
export const loadApiConfig = async () => {
  try {
    const savedConfig = await AsyncStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      API_BASE_URLS = { ...DEFAULT_API_BASE_URLS, ...parsedConfig };
      console.log('[API管理] 已加载保存的配置:', Object.keys(API_BASE_URLS));
    }
  } catch (error) {
    console.error('[API管理] 加载配置失败:', error);
    API_BASE_URLS = { ...DEFAULT_API_BASE_URLS };
  }
};

// 保存配置
export const saveApiConfig = async () => {
  try {
    await AsyncStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(API_BASE_URLS));
    console.log('[API管理] 配置已保存');
  } catch (error) {
    console.error('[API管理] 保存配置失败:', error);
  }
};

// 获取所有可用的后端配置
export const getAvailableBackends = () => {
  return Object.entries(API_BASE_URLS)
    .filter(([key, config]) => config.enabled)
    .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999))
    .map(([key, config]) => ({ key, ...config }));
};

// 获取启用的后端URL映射（向后兼容）
export const getEnabledBackendUrls = () => {
  const urls = {};
  Object.entries(API_BASE_URLS).forEach(([key, config]) => {
    if (config.enabled) {
      urls[key] = config.url;
    }
  });
  return urls;
};

// API端点分类管理
export const API_ENDPOINTS = {
  // 认证相关 - 使用NODERED后端
  AUTH: {
    baseUrl: 'NODERED',
    endpoints: {
      LOGIN: '/api/auth/login/',
      REGISTER: '/api/auth/register/',
      REFRESH_TOKEN: '/api/auth/refresh-token/',
      LOGOUT: '/api/auth/logout/',
      CHECK_ADMIN: '/api/auth/check-admin/',
      GET_PERMISSION_INFO: '/admin-api/system/auth/get-permission-info' // 若依后端权限信息接口
    }
  },

  // 用户管理 - 使用NODERED后端
  USERS: {
    baseUrl: 'NODERED',
    endpoints: {
      LIST: '/api/users',
      BY_ID: (id) => `/api/users/${id}`,
      UPDATE: (id) => `/api/users/${id}`,
      ROLE: (id) => `/api/users/${id}/role`,
      DELETE: (id) => `/api/users/${id}`,
      ROLES: '/api/users/roles',
      COMPANIES: '/api/companies',
      ASSIGN_ROLE: '/api/users/assign-role',
      REMOVE_ROLE: '/api/users/remove-role',
      TOGGLE_ADMIN: '/api/users/toggle-admin',
      TOGGLE_STATUS: '/api/users/toggle-status'
    }
  },

  // 工单系统API配置已删除

  // 站点管理 - 使用NODERED后端
  SITES: {
    baseUrl: 'NODERED',
    endpoints: {
      LIST: '/api/site/sites',
      BY_ID: (id) => `/api/sites/site/${id}`,
      COMMAND: (id) => `/api/site/${id}/command`,
      LOGS: '/api/logs'
    }
  },

  // 报告系统 - 使用NODERED后端
  REPORTS: {
    baseUrl: 'NODERED',
    endpoints: {
      // 普通报告
      LIST: '/api/reports',
      CREATE: '/api/reports',
      EXISTS: '/api/reports/exists',
      QUERY: '/api/reports/query',
      
      // 5000报告
      LIST_5000: '/api/reports5000',
      CREATE_5000: '/api/reports5000',
      EXISTS_5000: '/api/reports5000/exists',
      QUERY_5000: '/api/reports5000/query',
      
      // 污泥报告
      LIST_SLUDGE: '/api/ReportsSludge',
      CREATE_SLUDGE: '/api/ReportsSludge',
      EXISTS_SLUDGE: '/api/ReportsSludge/exists',
      QUERY_SLUDGE: '/api/ReportsSludge/query',
      
      // 泵站报告
      PUMP_STATIONS: '/api/pumpstations',
      PUMP_REPORTS: '/api/pumpreports',
      
      // 动态报告
      STYLES: '/api/reportStyles/get',
      TYPES: '/api/reportTypes/get',
      DYNAMIC_QUERY: '/api/reports/dynamicQuery'
    }
  },

  // 数据查询 - 统一使用NODERED后端
  DATA: {
    endpoints: {
      // 原ZZIOT数据查询已迁移到NODERED
      QUERY_DATA: {
        baseUrl: 'NODERED',
        endpoint: (tableName) => `/api/query-data/${tableName}`
      },
      HISTORY_QUERY: {
        baseUrl: 'NODERED',
        endpoint: (tableName) => `/api/query-data/${tableName}`
      },
      AO_QUERY: {
        baseUrl: 'NODERED',
        endpoint: '/api/sub-pools'
      },
      
      // NODERED后端的数据查询
      WUNI_DATA: {
        baseUrl: 'NODERED',
        endpoint: '/api/wunidata/query'
      },
      WUNI_LATEST: {
        baseUrl: 'NODERED',
        endpoint: '/api/wuni/latest'
      }
    }
  },

  // 数据提交 - 统一使用NODERED后端
  SUBMIT: {
    endpoints: {
      // 原ZZIOT数据提交已迁移到NODERED
      LAB_DATA: {
        baseUrl: 'NODERED',
        endpoint: '/submit'
      },
      AO_DATA: {
        baseUrl: 'NODERED',
        endpoint: '/submit_ao'
      },
      CARBON_CALC: {
        baseUrl: 'NODERED',
        endpoint: '/api/calculateCarbon'
      },
      
      // NODERED后端的数据提交
      WUNI_DATA: {
        baseUrl: 'NODERED',
        endpoint: '/api/wuni'
      }
    }
  },

  // 文件管理 - 使用NODERED后端
  FILES: {
    baseUrl: 'NODERED',
    endpoints: {
      UPLOAD: (folder) => `/api/upload/${folder}`,
      LIST: (folder) => `/api/files/${folder}`,
      DELETE: (folder, filename) => `/api/files/${folder}/${filename}`,
      BASE_PATH: (folder) => `/files/${folder}`
    }
  },

  // 消息系统 - 使用NODERED后端
  MESSAGES: {
    baseUrl: 'NODERED',
    endpoints: {
      LIST: '/api/messages',
      QUERY: '/api/messagesquery'
    }
  },

  // 统计数据 - 使用NODERED后端
  STATS: {
    baseUrl: 'NODERED',
    endpoints: {
      OVERVIEW: '/api/stats/overview'
    }
  },

  // 系统管理 - 使用NODERED后端
  SYSTEM: {
    baseUrl: 'NODERED',
    endpoints: {
      OTA_URL: '/api/ota/url'
    }
  }
};

// 获取完整的API URL
export const getApiUrl = (category, endpointKey, ...params) => {
  const categoryConfig = API_ENDPOINTS[category];
  
  if (!categoryConfig) {
    throw new Error(`API分类 '${category}' 不存在`);
  }

  // 处理不同的配置结构
  let baseUrl, endpoint;
  
  if (categoryConfig.baseUrl) {
    // 简单结构：category直接包含baseUrl和endpoints
    const backendConfig = API_BASE_URLS[categoryConfig.baseUrl];
    baseUrl = backendConfig ? backendConfig.url : null;
    const endpointConfig = categoryConfig.endpoints[endpointKey];
    
    if (typeof endpointConfig === 'function') {
      endpoint = endpointConfig(...params);
    } else {
      endpoint = endpointConfig;
    }
  } else {
    // 复杂结构：endpoints中每个项目都有自己的baseUrl
    const endpointConfig = categoryConfig.endpoints[endpointKey];
    
    if (!endpointConfig) {
      throw new Error(`端点 '${endpointKey}' 在分类 '${category}' 中不存在`);
    }
    
    const backendConfig = API_BASE_URLS[endpointConfig.baseUrl];
    baseUrl = backendConfig ? backendConfig.url : null;
    
    if (typeof endpointConfig.endpoint === 'function') {
      endpoint = endpointConfig.endpoint(...params);
    } else {
      endpoint = endpointConfig.endpoint;
    }
  }

  if (!baseUrl) {
    throw new Error(`基础URL配置错误或后端未启用`);
  }

  if (!endpoint) {
    throw new Error(`端点 '${endpointKey}' 在分类 '${category}' 中不存在`);
  }

  return `${baseUrl}${endpoint}`;
};

// 获取基础URL（向后兼容）
export const getBaseUrl = (key) => {
  const config = API_BASE_URLS[key];
  if (config && config.enabled) {
    return config.url;
  }
  
  // 如果指定的后端不可用，返回第一个可用的后端
  const availableBackends = getAvailableBackends();
  return availableBackends.length > 0 ? availableBackends[0].url : null;
};

// 添加新的API后端
export const addApiBackend = async (key, config) => {
  const backendConfig = {
    name: config.name || key,
    url: config.url,
    enabled: config.enabled !== false,
    description: config.description || '',
    priority: config.priority || Object.keys(API_BASE_URLS).length + 1
  };
  
  API_BASE_URLS[key] = backendConfig;
  await saveApiConfig();
  console.log(`[API管理] 添加新后端: ${key} = ${backendConfig.url}`);
};

// 更新API后端配置
export const updateApiBackend = async (key, updates) => {
  if (!API_BASE_URLS[key]) {
    throw new Error(`API后端 '${key}' 不存在`);
  }
  
  API_BASE_URLS[key] = { ...API_BASE_URLS[key], ...updates };
  await saveApiConfig();
  console.log(`[API管理] 更新后端配置: ${key}`);
};

// 删除API后端
export const removeApiBackend = async (key) => {
  if (!API_BASE_URLS[key]) {
    throw new Error(`API后端 '${key}' 不存在`);
  }
  
  delete API_BASE_URLS[key];
  await saveApiConfig();
  console.log(`[API管理] 删除后端: ${key}`);
};

// 启用/禁用后端
export const toggleBackend = async (key, enabled) => {
  if (!API_BASE_URLS[key]) {
    throw new Error(`API后端 '${key}' 不存在`);
  }
  
  API_BASE_URLS[key].enabled = enabled;
  await saveApiConfig();
  console.log(`[API管理] ${enabled ? '启用' : '禁用'}后端: ${key}`);
};

// 重置为默认配置
export const resetToDefaultConfig = async () => {
  API_BASE_URLS = { ...DEFAULT_API_BASE_URLS };
  await saveApiConfig();
  console.log('[API管理] 已重置为默认配置');
};

// 获取当前配置信息
export const getApiConfig = () => {
  return {
    backends: API_BASE_URLS,
    availableBackends: getAvailableBackends(),
    endpoints: API_ENDPOINTS,
    endpointCategories: Object.keys(API_ENDPOINTS)
  };
};

// ==================== 端点管理功能 ====================

// 获取所有端点的详细信息
export const getAllEndpoints = () => {
  const allEndpoints = [];
  
  Object.entries(API_ENDPOINTS).forEach(([category, config]) => {
    if (config.baseUrl) {
      // 简单结构：category直接包含baseUrl和endpoints
      Object.entries(config.endpoints).forEach(([key, endpoint]) => {
        allEndpoints.push({
          id: `${category}.${key}`,
          category,
          key,
          endpoint: typeof endpoint === 'function' ? endpoint.toString() : endpoint,
          baseUrl: config.baseUrl,
          type: typeof endpoint === 'function' ? 'dynamic' : 'static',
          description: `${category} - ${key}`
        });
      });
    } else {
      // 复杂结构：endpoints中每个项目都有自己的baseUrl
      Object.entries(config.endpoints).forEach(([key, endpointConfig]) => {
        allEndpoints.push({
          id: `${category}.${key}`,
          category,
          key,
          endpoint: typeof endpointConfig.endpoint === 'function' ? 
            endpointConfig.endpoint.toString() : endpointConfig.endpoint,
          baseUrl: endpointConfig.baseUrl,
          type: typeof endpointConfig.endpoint === 'function' ? 'dynamic' : 'static',
          description: `${category} - ${key}`
        });
      });
    }
  });
  
  return allEndpoints;
};

// 获取指定分类的端点
export const getEndpointsByCategory = (category) => {
  const categoryConfig = API_ENDPOINTS[category];
  if (!categoryConfig) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const endpoints = [];
  
  if (categoryConfig.baseUrl) {
    // 简单结构
    Object.entries(categoryConfig.endpoints).forEach(([key, endpoint]) => {
      endpoints.push({
        id: `${category}.${key}`,
        category,
        key,
        endpoint: typeof endpoint === 'function' ? endpoint.toString() : endpoint,
        baseUrl: categoryConfig.baseUrl,
        type: typeof endpoint === 'function' ? 'dynamic' : 'static'
      });
    });
  } else {
    // 复杂结构
    Object.entries(categoryConfig.endpoints).forEach(([key, endpointConfig]) => {
      endpoints.push({
        id: `${category}.${key}`,
        category,
        key,
        endpoint: typeof endpointConfig.endpoint === 'function' ? 
          endpointConfig.endpoint.toString() : endpointConfig.endpoint,
        baseUrl: endpointConfig.baseUrl,
        type: typeof endpointConfig.endpoint === 'function' ? 'dynamic' : 'static'
      });
    });
  }
  
  return endpoints;
};

// 添加新的端点
export const addEndpoint = async (category, key, endpointConfig) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const categoryConfig = API_ENDPOINTS[category];
  
  if (categoryConfig.baseUrl) {
    // 简单结构
    if (categoryConfig.endpoints[key]) {
      throw new Error(`端点 '${key}' 在分类 '${category}' 中已存在`);
    }
    
    categoryConfig.endpoints[key] = endpointConfig.endpoint;
  } else {
    // 复杂结构
    if (categoryConfig.endpoints[key]) {
      throw new Error(`端点 '${key}' 在分类 '${category}' 中已存在`);
    }
    
    categoryConfig.endpoints[key] = {
      baseUrl: endpointConfig.baseUrl,
      endpoint: endpointConfig.endpoint
    };
  }
  
  await saveEndpointConfig();
  console.log(`[端点管理] 添加新端点: ${category}.${key}`);
};

// 更新端点配置
export const updateEndpoint = async (category, key, endpointConfig) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const categoryConfig = API_ENDPOINTS[category];
  
  if (categoryConfig.baseUrl) {
    // 简单结构
    if (!categoryConfig.endpoints[key]) {
      throw new Error(`端点 '${key}' 在分类 '${category}' 中不存在`);
    }
    
    categoryConfig.endpoints[key] = endpointConfig.endpoint;
  } else {
    // 复杂结构
    if (!categoryConfig.endpoints[key]) {
      throw new Error(`端点 '${key}' 在分类 '${category}' 中不存在`);
    }
    
    categoryConfig.endpoints[key] = {
      baseUrl: endpointConfig.baseUrl || categoryConfig.endpoints[key].baseUrl,
      endpoint: endpointConfig.endpoint
    };
  }
  
  await saveEndpointConfig();
  console.log(`[端点管理] 更新端点: ${category}.${key}`);
};

// 删除端点
export const removeEndpoint = async (category, key) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const categoryConfig = API_ENDPOINTS[category];
  
  if (!categoryConfig.endpoints[key]) {
    throw new Error(`端点 '${key}' 在分类 '${category}' 中不存在`);
  }
  
  delete categoryConfig.endpoints[key];
  
  await saveEndpointConfig();
  console.log(`[端点管理] 删除端点: ${category}.${key}`);
};

// 添加新的端点分类
export const addEndpointCategory = async (category, config = {}) => {
  if (API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 已存在`);
  }
  
  // 完善的分类配置结构
  API_ENDPOINTS[category] = {
    name: config.name || category,
    description: config.description || `${category}相关的API端点`,
    baseUrl: config.baseUrl || 'NODERED', // 默认使用NODERED后端
    enabled: config.enabled !== undefined ? config.enabled : true,
    version: config.version || '1.0.0',
    tags: config.tags || [],
    endpoints: config.endpoints || {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: config.author || 'system'
    }
  };
  
  await saveEndpointConfig();
  console.log(`[端点管理] 添加新分类: ${category}`);
};

// 更新端点分类信息
export const updateEndpointCategory = async (category, updates) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const currentConfig = API_ENDPOINTS[category];
  
  API_ENDPOINTS[category] = {
    ...currentConfig,
    ...updates,
    metadata: {
      ...currentConfig.metadata,
      updatedAt: new Date().toISOString()
    }
  };
  
  await saveEndpointConfig();
  console.log(`[端点管理] 更新分类: ${category}`);
};

// 获取分类详细信息
export const getCategoryInfo = (category) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const config = API_ENDPOINTS[category];
  return {
    name: config.name || category,
    description: config.description || '',
    baseUrl: config.baseUrl,
    enabled: config.enabled !== undefined ? config.enabled : true,
    version: config.version || '1.0.0',
    tags: config.tags || [],
    endpointCount: Object.keys(config.endpoints || {}).length,
    metadata: config.metadata || {}
  };
};

// 获取所有分类的概览信息
export const getAllCategoriesInfo = () => {
  return Object.keys(API_ENDPOINTS).map(category => {
    try {
      return {
        category,
        ...getCategoryInfo(category)
      };
    } catch (error) {
      return {
        category,
        name: category,
        description: '分类信息获取失败',
        enabled: false,
        endpointCount: 0,
        error: error.message
      };
    }
  });
};

// 启用/禁用分类
export const toggleCategoryStatus = async (category) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  const currentStatus = API_ENDPOINTS[category].enabled !== undefined ? 
    API_ENDPOINTS[category].enabled : true;
  
  await updateEndpointCategory(category, { enabled: !currentStatus });
  console.log(`[端点管理] 分类 ${category} ${!currentStatus ? '已启用' : '已禁用'}`);
};

// 按标签筛选分类
export const getCategoriesByTag = (tag) => {
  return Object.keys(API_ENDPOINTS).filter(category => {
    const config = API_ENDPOINTS[category];
    return config.tags && config.tags.includes(tag);
  });
};

// 搜索分类
export const searchCategories = (query) => {
  const lowerQuery = query.toLowerCase();
  return Object.keys(API_ENDPOINTS).filter(category => {
    const config = API_ENDPOINTS[category];
    const name = (config.name || category).toLowerCase();
    const description = (config.description || '').toLowerCase();
    const tags = (config.tags || []).join(' ').toLowerCase();
    
    return name.includes(lowerQuery) || 
           description.includes(lowerQuery) || 
           tags.includes(lowerQuery) ||
           category.toLowerCase().includes(lowerQuery);
  });
};

// 删除端点分类
export const removeEndpointCategory = async (category) => {
  if (!API_ENDPOINTS[category]) {
    throw new Error(`API分类 '${category}' 不存在`);
  }
  
  delete API_ENDPOINTS[category];
  
  await saveEndpointConfig();
  console.log(`[端点管理] 删除分类: ${category}`);
};

// 保存端点配置
const saveEndpointConfig = async () => {
  try {
    await AsyncStorage.setItem('api_endpoints_config', JSON.stringify(API_ENDPOINTS));
    console.log('[端点管理] 端点配置已保存');
  } catch (error) {
    console.error('[端点管理] 保存端点配置失败:', error);
    throw error;
  }
};

// 加载端点配置
export const loadEndpointConfig = async () => {
  try {
    const savedConfig = await AsyncStorage.getItem('api_endpoints_config');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      // 合并保存的配置和默认配置
      Object.assign(API_ENDPOINTS, parsedConfig);
      console.log('[端点管理] 已加载保存的端点配置');
    }
  } catch (error) {
    console.error('[端点管理] 加载端点配置失败:', error);
  }
};

// 重置端点配置为默认值
export const resetEndpointConfig = async () => {
  try {
    await AsyncStorage.removeItem('api_endpoints_config');
    // 这里需要重新加载默认配置
    console.log('[端点管理] 端点配置已重置为默认值');
  } catch (error) {
    console.error('[端点管理] 重置端点配置失败:', error);
    throw error;
  }
};

// 测试端点连接
export const testEndpoint = async (category, key, params = []) => {
  try {
    const fullUrl = getApiUrl(category, key, ...params);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: response.ok,
      status: response.status,
      url: fullUrl,
      message: response.ok ? '端点可访问' : `HTTP ${response.status}`,
      responseTime: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      url: '',
      message: error.message || '端点测试失败',
      responseTime: Date.now()
    };
  }
};

// 验证API配置
export const validateApiConfig = () => {
  const errors = [];
  
  // 检查基础URL
  Object.entries(API_BASE_URLS).forEach(([key, config]) => {
    if (!config.url || !config.url.startsWith('http')) {
      errors.push(`无效的基础URL: ${key} = ${config.url}`);
    }
  });
  
  // 检查是否至少有一个启用的后端
  const enabledBackends = getAvailableBackends();
  if (enabledBackends.length === 0) {
    errors.push('至少需要启用一个API后端');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 测试后端连接
export const testBackendConnection = async (key) => {
  const config = API_BASE_URLS[key];
  if (!config) {
    throw new Error(`API后端 '${key}' 不存在`);
  }
  
  try {
    const response = await fetch(`${config.url}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? '连接成功' : `HTTP ${response.status}`,
      responseTime: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      message: error.message || '连接失败',
      responseTime: Date.now()
    };
  }
};

export default {
  // 核心功能
  getApiUrl,
  getBaseUrl,
  
  // 配置管理
  loadApiConfig,
  saveApiConfig,
  getApiConfig,
  validateApiConfig,
  resetToDefaultConfig,
  
  // 后端管理
  getAvailableBackends,
  getEnabledBackendUrls,
  addApiBackend,
  updateApiBackend,
  removeApiBackend,
  toggleBackend,
  testBackendConnection,
  
  // 端点管理
  getAllEndpoints,
  getEndpointsByCategory,
  addEndpoint,
  updateEndpoint,
  removeEndpoint,
  addEndpointCategory,
  updateEndpointCategory,
  removeEndpointCategory,
  getCategoryInfo,
  getAllCategoriesInfo,
  toggleCategoryStatus,
  getCategoriesByTag,
  searchCategories,
  loadEndpointConfig,
  resetEndpointConfig,
  testEndpoint,
  
  // 数据访问
  API_BASE_URLS,
  API_ENDPOINTS
};

// 导出API_BASE_URLS供其他模块使用
export { API_BASE_URLS };