// 统一API服务层
// 提供统一的HTTP请求接口，支持多后端切换

import axios from 'axios';
import { getApiUrl, getBaseUrl, API_BASE_URLS } from './apiManager';
import { getAuthToken, saveAuthToken, clearAuthToken } from './storage';
import { REQUEST_TIMEOUT, API_RESPONSE_CODES } from './config';

// 创建axios实例映射
const axiosInstances = {};

// 为每个后端创建独立的axios实例
Object.keys(API_BASE_URLS).forEach(key => {
  axiosInstances[key] = axios.create({
    baseURL: API_BASE_URLS[key]?.url || API_BASE_URLS[key],
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // 为每个实例添加请求拦截器
  axiosInstances[key].interceptors.request.use(
    async (config) => {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      console.log(`[${key} API请求] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error(`[${key} 请求拦截器错误]`, error);
      return Promise.reject(error);
    }
  );

  // 为每个实例添加响应拦截器
  axiosInstances[key].interceptors.response.use(
    (response) => {
      console.log(`[${key} API响应] ${response.config.method.toUpperCase()} ${response.config.url} 状态: ${response.status}`);
      return response;
    },
    async (error) => {
      if (error.response) {
        console.error(`[${key} API错误] 状态: ${error.response.status}`, error.response.data);
        
        // 处理401未授权错误
        if (error.response.status === 401) {
          // console.log(`[${key}] 令牌过期，尝试刷新`);
          // 这里可以添加令牌刷新逻辑
        }
      } else {
        console.error(`[${key} 网络错误]`, error.message);
      }
      return Promise.reject(error);
    }
  );
});

// 获取指定后端的axios实例
const getAxiosInstance = (backendKey) => {
  const instance = axiosInstances[backendKey];
  if (!instance) {
    throw new Error(`后端 '${backendKey}' 的axios实例不存在`);
  }
  return instance;
};

// 统一的API请求方法
class ApiService {
  // 通用请求方法
  async request(category, endpointKey, options = {}) {
    try {
      const { method = 'GET', data, params, headers, ...otherOptions } = options;
      
      // 获取完整URL和对应的后端
      const fullUrl = await getApiUrl(category, endpointKey, ...(options.urlParams || []));
      
      // 从URL中提取后端类型
      let backendKey = null;
      Object.entries(API_BASE_URLS).forEach(([key, config]) => {
        const baseUrl = config?.url || config;
        if (fullUrl.startsWith(baseUrl)) {
          backendKey = key;
        }
      });
      
      if (!backendKey) {
        throw new Error(`无法确定API后端类型: ${fullUrl}`);
      }
      
      const axiosInstance = getAxiosInstance(backendKey);
      
      // 从完整URL中提取相对路径
      const baseUrl = API_BASE_URLS[backendKey]?.url || API_BASE_URLS[backendKey];
      const relativePath = fullUrl.replace(baseUrl, '');
      
      const config = {
        method: method.toLowerCase(),
        url: relativePath,
        ...otherOptions
      };
      
      if (data) config.data = data;
      if (params) config.params = params;
      if (headers) config.headers = { ...config.headers, ...headers };
      
      const response = await axiosInstance(config);
      return response.data;
    } catch (error) {
      console.error(`[API服务] 请求失败:`, error);
      throw error;
    }
  }

  // GET请求
  async get(category, endpointKey, options = {}) {
    return this.request(category, endpointKey, { ...options, method: 'GET' });
  }

  // POST请求
  async post(category, endpointKey, data, options = {}) {
    return this.request(category, endpointKey, { ...options, method: 'POST', data });
  }

  // PUT请求
  async put(category, endpointKey, data, options = {}) {
    return this.request(category, endpointKey, { ...options, method: 'PUT', data });
  }

  // PATCH请求
  async patch(category, endpointKey, data, options = {}) {
    return this.request(category, endpointKey, { ...options, method: 'PATCH', data });
  }

  // DELETE请求
  async delete(category, endpointKey, options = {}) {
    return this.request(category, endpointKey, { ...options, method: 'DELETE' });
  }

  // 文件上传
  async upload(category, endpointKey, formData, options = {}) {
    const headers = {
      'Content-Type': 'multipart/form-data',
      ...options.headers
    };
    
    return this.request(category, endpointKey, {
      ...options,
      method: 'POST',
      data: formData,
      headers
    });
  }

  // 直接使用URL的请求（兼容旧代码）
  async directRequest(url, options = {}) {
    try {
      const { method = 'GET', data, params, headers, ...otherOptions } = options;
      
      // 确定使用哪个后端
      let backendKey = null;
      Object.entries(API_BASE_URLS).forEach(([key, baseUrl]) => {
        if (url.startsWith(baseUrl)) {
          backendKey = key;
        }
      });
      
      if (!backendKey) {
        // 如果URL不匹配任何已知后端，使用默认的axios
        console.warn(`[API服务] 未知后端URL: ${url}，使用默认配置`);
        const response = await axios({
          url,
          method: method.toLowerCase(),
          data,
          params,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          timeout: REQUEST_TIMEOUT,
          ...otherOptions
        });
        return response.data;
      }
      
      const axiosInstance = getAxiosInstance(backendKey);
      const relativePath = url.replace(API_BASE_URLS[backendKey], '');
      
      const config = {
        method: method.toLowerCase(),
        url: relativePath,
        ...otherOptions
      };
      
      if (data) config.data = data;
      if (params) config.params = params;
      if (headers) config.headers = { ...config.headers, ...headers };
      
      const response = await axiosInstance(config);
      return response.data;
    } catch (error) {
      console.error(`[API服务] 直接请求失败:`, error);
      throw error;
    }
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 具体业务API方法
export const authApi = {
  login: (credentials) => apiService.post('AUTH', 'LOGIN', credentials),
  register: (userData) => apiService.post('AUTH', 'REGISTER', userData),
  refreshToken: (tokenData) => apiService.post('AUTH', 'REFRESH_TOKEN', tokenData),
  logout: () => apiService.post('AUTH', 'LOGOUT', {}),
  checkAdmin: (data) => apiService.post('AUTH', 'CHECK_ADMIN', data),
  checkAdminStatus: (data) => apiService.post('AUTH', 'CHECK_ADMIN', data),
  getPermissionInfo: () => apiService.get('AUTH', 'GET_PERMISSION_INFO') // 获取用户权限信息
};

export const userApi = {
  getUsers: (params) => apiService.get('USERS', 'LIST', { params }),
  getUserById: (id) => apiService.get('USERS', 'BY_ID', { urlParams: [id] }),
  updateUser: (id, userData) => apiService.put('USERS', 'UPDATE', userData, { urlParams: [id] }),
  updateUserRole: (id, roleData) => apiService.put('USERS', 'ROLE', roleData, { urlParams: [id] }),
  deleteUser: (id) => apiService.delete('USERS', 'DELETE', { urlParams: [id] }),
  getRoles: (params) => apiService.get('USERS', 'ROLES', { params }),
  getCompanies: (params) => apiService.get('USERS', 'COMPANIES', { params }),
  assignRole: (data) => apiService.post('USERS', 'ASSIGN_ROLE', data),
  removeRole: (data) => apiService.post('USERS', 'REMOVE_ROLE', data),
  toggleAdmin: (data) => apiService.post('USERS', 'TOGGLE_ADMIN', data),
  toggleStatus: (data) => apiService.post('USERS', 'TOGGLE_STATUS', data)
};

// 工单系统API服务已删除

export const siteApi = {
  getSites: (params) => apiService.get('SITES', 'LIST', { params }),
  getSiteById: (id) => apiService.get('SITES', 'BY_ID', { urlParams: [id] }),
  getSiteDetail: (id) => apiService.get('SITES', 'BY_ID', { urlParams: [id] }),
  sendCommand: (id, command) => apiService.post('SITES', 'COMMAND', command, { urlParams: [id] }),
  addLog: (logData) => apiService.post('SITES', 'LOGS', logData)
};

export const reportApi = {
  // 普通报告
  getReports: (params) => apiService.get('REPORTS', 'QUERY', { params }),
  createReport: (data) => apiService.post('REPORTS', 'CREATE', data),
  checkReportExists: (params) => apiService.get('REPORTS', 'EXISTS', { params }),
  
  // 5000报告
  getReports5000: (params) => apiService.get('REPORTS', 'QUERY_5000', { params }),
  createReport5000: (data) => apiService.post('REPORTS', 'CREATE_5000', data),
  checkReport5000Exists: (params) => apiService.get('REPORTS', 'EXISTS_5000', { params }),
  
  // 污泥报告
  getReportsSludge: (params) => apiService.get('REPORTS', 'QUERY_SLUDGE', { params }),
  createReportSludge: (data) => apiService.post('REPORTS', 'CREATE_SLUDGE', data),
  checkReportSludgeExists: (params) => apiService.get('REPORTS', 'EXISTS_SLUDGE', { params }),
  
  // 泵站报告
  getPumpStations: () => apiService.get('REPORTS', 'PUMP_STATIONS'),
  getPumpReports: (params) => apiService.get('REPORTS', 'PUMP_REPORTS', { params }),
  createPumpReport: (data) => apiService.post('REPORTS', 'PUMP_REPORTS', data),
  
  // 动态报告
  getReportStyles: () => apiService.get('REPORTS', 'STYLES'),
  getReportTypes: (params) => apiService.get('REPORTS', 'TYPES', { params }),
  getDynamicReports: (params) => apiService.get('REPORTS', 'DYNAMIC_QUERY', { params }),
  dynamicQuery: (params) => apiService.get('REPORTS', 'DYNAMIC_QUERY', { params })
};

export const dataApi = {
  // 数据查询
  queryData: (table, params) => apiService.get('DATA', 'QUERY_DATA', { urlParams: [table], params }),
  historyQuery: (params) => {
    const { tableName, ...queryParams } = params;
    return apiService.get('DATA', 'HISTORY_QUERY', { urlParams: [tableName], params: queryParams });
  },
  queryAOData: (params) => apiService.get('DATA', 'AO_QUERY', { params }),
  queryWuniData: (params) => apiService.get('DATA', 'WUNI_DATA', { params }),
  getWuniLatest: (params) => apiService.get('DATA', 'WUNI_LATEST', { params }),
  
  // 数据提交
  submitLabData: (data) => apiService.post('SUBMIT', 'LAB_DATA', data),
  submitAOData: (data) => apiService.post('SUBMIT', 'AO_DATA', data),
  calculateCarbon: (data) => apiService.post('SUBMIT', 'CARBON_CALC', data),
  submitWuniData: (data) => apiService.post('SUBMIT', 'WUNI_DATA', data)
};

export const fileApi = {
  uploadFile: (folder, formData) => apiService.upload('FILES', 'UPLOAD', formData, { urlParams: [folder] }),
  getFileList: (folder, params) => apiService.get('FILES', 'LIST', { urlParams: [folder], params })
};

export const messageApi = {
  getMessages: (params) => apiService.get('MESSAGES', 'LIST', { params }),
  queryMessages: (params) => apiService.get('MESSAGES', 'QUERY', { params })
};

export const statsApi = {
  getOverview: (params) => apiService.get('STATS', 'OVERVIEW', { params })
};

export const systemApi = {
  getOtaUrl: () => apiService.get('SYSTEM', 'OTA_URL')
};

export const otaApi = {
  getDownloadUrls: () => apiService.get('SYSTEM', 'OTA_URL')
};

export const logApi = {
  createLog: (logData) => siteApi.addLog(logData)
};

// 导出主要服务
export default apiService;
export { apiService, getAxiosInstance };