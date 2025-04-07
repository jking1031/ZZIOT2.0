import axios from 'axios';
import { getAuthToken, saveAuthToken, clearAuthToken } from './storage';
import { BASE_URL, CACHE_KEYS } from './config';
import { EventRegister } from '../utils/EventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 创建axios实例，设置基础URL和超时
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 自动添加认证令牌到每个请求
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    
    // 如果有令牌，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // 增强的令牌调试 - 解析令牌以查看其内容
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          // 尝试解码令牌payload部分
          const base64Decode = (str) => {
            try {
              return atob(str);
            } catch (e) {
              try {
                // 处理可能的URL安全base64编码
                const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                return atob(base64);
              } catch (error) {
                console.error('解码令牌失败:', error);
                return null;
              }
            }
          };
          
          const decodedPayload = base64Decode(parts[1]);
          if (decodedPayload) {
            const payload = JSON.parse(decodedPayload);
            console.log('[令牌解析]', JSON.stringify(payload));
            console.log('[令牌is_admin]', payload.is_admin, '类型:', typeof payload.is_admin);
          }
        }
      } catch (parseError) {
        console.error('[令牌解析错误]', parseError);
      }
    }
    
    // 调试输出 - 方便排查问题
    console.log(`[API请求] ${config.method.toUpperCase()} ${config.url}`, config.params || {});
    
    return config;
  },
  (error) => {
    console.error('[请求拦截器错误]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理响应和错误
api.interceptors.response.use(
  (response) => {
    // 请求成功，记录响应
    console.log(`[API响应] ${response.config.method.toUpperCase()} ${response.config.url} 状态: ${response.status}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      // 服务器返回了错误响应
      console.error(
        `[API错误] ${error.config.method.toUpperCase()} ${error.config.url} 状态: ${error.response.status}`,
        error.response.data
      );
      
      // 处理401未授权错误 - 可能是token过期
      if (error.response.status === 401) {
        console.log('[令牌过期] 尝试刷新令牌');
        
        try {
          // 尝试刷新令牌 - 如果有刷新令牌功能
          const refreshSuccessful = await refreshToken();
          
          if (refreshSuccessful) {
            // 令牌刷新成功，重试原始请求
            console.log('[令牌刷新成功] 重试原始请求');
            
            // 获取新的令牌
            const newToken = await getAuthToken();
            
            // 使用新令牌创建新的请求配置
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // 重试请求
            return axios(originalRequest);
          } else {
            // 令牌刷新失败，通知登录过期
            console.log('[令牌刷新失败] 通知登录过期');
            EventRegister.emit('SESSION_EXPIRED');
          }
        } catch (refreshError) {
          console.error('[令牌刷新错误]', refreshError);
          EventRegister.emit('SESSION_EXPIRED');
        }
      }
      
      // 处理404错误 - 资源不存在
      if (error.response.status === 404) {
        console.error(`[资源不存在] URL: ${error.config.url}`);
        // 可能需要清除本地缓存或通知用户
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('[无响应错误]', error.request);
    } else {
      // 请求配置出错
      console.error('[请求配置错误]', error.message);
    }
    
    return Promise.reject(error);
  }
);

// 令牌刷新函数 - 尝试使用存储的用户信息生成新令牌
async function refreshToken() {
  try {
    // 获取存储的用户信息
    const userData = await AsyncStorage.getItem('user');
    if (!userData) {
      console.log('[令牌刷新] 没有找到用户数据');
      return false;
    }
    
    const user = JSON.parse(userData);
    
    try {
      // 方法1：调用后端刷新令牌接口
      const response = await axios.post(`${BASE_URL}/api/refresh-token`, {
        userId: user.id,
        email: user.email
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.token) {
        await saveAuthToken(response.data.token);
        console.log('[令牌刷新] 成功获取新令牌');
        return true;
      }
    } catch (apiError) {
      console.log('[令牌刷新API] 失败:', apiError.message);
      
      // 方法2：如果API请求失败，创建本地令牌（作为备选）
      const token = createLocalToken(user);
      if (token) {
        await saveAuthToken(token);
        console.log('[令牌刷新] 已创建本地令牌');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[令牌刷新] 错误:', error);
    return false;
  }
}

// 创建本地令牌函数 - 当后端刷新接口不可用时，生成临时令牌
function createLocalToken(user) {
  // 令牌头部
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // 确保管理员信息的正确处理
  const adminValue = user.is_admin_value !== undefined ? user.is_admin_value : 
                    (user.is_admin !== undefined ? user.is_admin : 
                    (user.isAdmin !== undefined ? user.isAdmin : 
                    (user.admin !== undefined ? user.admin : 0)));
  
  console.log('[创建本地令牌] 管理员状态:', adminValue, '类型:', typeof adminValue);
  
  // 令牌有效数据
  const payload = {
    id: user.id,
    username: user.username || user.name,
    email: user.email,
    is_admin: adminValue, // 使用处理过的管理员值
    // 令牌有效期 - 12小时
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };
  
  // 记录完整的payload内容用于调试
  console.log('[创建本地令牌] payload内容:', JSON.stringify(payload));
  
  try {
    // 自定义base64编码函数，支持UTF-8字符
    const base64Encode = (str) => {
      try {
        // 直接使用btoa尝试编码
        return btoa(str);
      } catch (e) {
        // 处理包含非ASCII字符的情况
        // 将字符串转换为UTF-8编码的字节
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
        return btoa(binString);
      }
    };
    
    // 使用增强的base64编码函数
    const encodedHeader = base64Encode(JSON.stringify(header));
    const encodedPayload = base64Encode(JSON.stringify(payload));
    // 简化的签名
    const signature = base64Encode(`${encodedHeader}.${encodedPayload}.secret`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('[创建本地令牌] 错误:', error, '用户数据:', JSON.stringify(user).substring(0, 100));
    
    // 创建一个基础令牌，仅包含必要信息
    try {
      // 仅保留基本信息的简单负载
      const simplePayload = {
        id: user.id,
        exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
      };
      
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(simplePayload));
      const signature = btoa(`${encodedHeader}.${encodedPayload}.secret`);
      
      console.log('[创建本地令牌] 已创建备用简化令牌');
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (backupError) {
      console.error('[创建本地令牌] 创建备用令牌也失败:', backupError);
      return null;
    }
  }
}

// 封装常用API方法
export const apiService = {
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`[GET ${url}] 失败:`, error);
      throw error;
    }
  },
  
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`[POST ${url}] 失败:`, error);
      throw error;
    }
  },
  
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`[PUT ${url}] 失败:`, error);
      throw error;
    }
  },
  
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`[PATCH ${url}] 失败:`, error);
      throw error;
    }
  },
  
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error(`[DELETE ${url}] 失败:`, error);
      throw error;
    }
  }
};

export default api; 