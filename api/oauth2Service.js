// OAuth2.0 认证服务 - 对接ruoyi项目
// 基于oauth.md文档实现完整的OAuth2.0客户端

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getApiUrl } from './apiManager';
import { REQUEST_TIMEOUT } from './config';
import OAuth2Config from '../config/oauth2Config';

/**
 * OAuth2.0 认证服务类
 * 实现密码模式(Resource Owner Password Credentials)认证
 * 支持令牌自动刷新和安全存储
 */
class OAuth2Service {
  constructor(baseUrl = OAuth2Config.baseUrl, clientId = OAuth2Config.client.id, clientSecret = OAuth2Config.client.secret) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.config = OAuth2Config;
    
    // 创建Base64编码的客户端凭证
    this.credentials = this.base64Encode(`${clientId}:${clientSecret}`);
    
    // 创建专用的axios实例
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: OAuth2Config.request.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // 添加响应拦截器处理令牌过期
    this.setupInterceptors();
  }
  
  /**
   * 安全的Base64编码函数
   * 支持UTF-8字符
   */
  base64Encode(str) {
    try {
      // 对于React Native环境，使用btoa
      return btoa(str);
    } catch (e) {
      // 处理包含非ASCII字符的情况
      const bytes = new TextEncoder().encode(str);
      const binString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
      return btoa(binString);
    }
  }
  
  /**
   * 设置axios拦截器
   */
  setupInterceptors() {
    // 请求拦截器 - 自动添加访问令牌
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // 对于令牌相关的请求，使用客户端凭证
        if (config.url.includes('/oauth2/token') || config.url.includes('/oauth2/check-token')) {
          if (config.url.includes('/oauth2/token')) {
            config.headers.Authorization = `Basic ${this.credentials}`;
          }
        } else {
          // 其他API请求使用访问令牌
          const token = await this.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        // console.log(`[OAuth2] 请求: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[OAuth2] 请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器 - 处理令牌过期
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // console.log(`[OAuth2] 响应: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // console.log('[OAuth2] 检测到401错误，尝试刷新令牌');
          
          try {
            await this.refreshToken();
            // 重试原请求
            const token = await this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.axiosInstance.request(originalRequest);
          } catch (refreshError) {
            console.error('[OAuth2] 刷新令牌失败:', refreshError);
            // 清除所有令牌，需要重新登录
            await this.clearTokens();
            throw new Error('需要重新登录');
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * 密码模式登录
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} scope 权限范围，默认为 'user.read user.write'
   * @returns {Promise<Object>} 令牌数据
   */
  async login(username, password, scope = 'user.read user.write') {
    try {
      // console.log(`[OAuth2] 开始登录: ${username}`);
      
      // 使用配置中的端点，保持与passwordLogin一致
      const response = await this.axiosInstance.post(this.config.endpoints.token, 
        new URLSearchParams({
          grant_type: 'password',
          username: username,
          password: password,
          scope: scope
        }),
        {
          headers: {
            'Authorization': `Basic ${this.credentials}`,
            'tenant-id': this.config.tenant.id,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const result = response.data;
      
      if (result.code === 0 && result.data && result.data.access_token) {
        // console.log('[OAuth2] 登录成功，保存令牌');
        await this.saveTokens(result.data);
        return result.data;
      } else {
        throw new Error(result.msg || '服务器未返回访问令牌');
      }
    } catch (error) {
      console.error('[OAuth2] 登录失败:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.msg || error.response?.data?.error_description || error.message || '登录失败';
      throw new Error(errorMsg);
    }
  }
  
  /**
   * 刷新访问令牌
   * @returns {Promise<Object>} 新的令牌数据
   */
  async refreshToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('没有可用的刷新令牌');
      }
      
      // console.log('[OAuth2] 开始刷新令牌');
      
      const response = await this.axiosInstance.post(this.config.endpoints.token,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Authorization': `Basic ${this.credentials}`,
            'tenant-id': this.config.tenant.id,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const result = response.data;
      
      if (result.code === 0 && result.data && result.data.access_token) {
        // console.log('[OAuth2] 令牌刷新成功');
        await this.saveTokens(result.data);
        return result.data;
      } else {
        throw new Error(result.msg || '服务器未返回新的访问令牌');
      }
    } catch (error) {
      console.error('[OAuth2] 刷新令牌失败:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.msg || error.response?.data?.error_description || error.message || '刷新令牌失败';
      throw new Error(errorMsg);
    }
  }
  
  /**
   * 校验访问令牌
   * @param {string} token 要校验的令牌，如果不提供则使用当前存储的令牌
   * @returns {Promise<Object>} 令牌信息
   */
  async checkToken(token = null) {
    try {
      const tokenToCheck = token || await this.getStoredAccessToken();
      
      if (!tokenToCheck) {
        throw new Error('没有可用的令牌进行校验');
      }
      
      const response = await this.axiosInstance.post(this.config.endpoints.checkToken || '/admin-api/system/oauth2/check-token',
        new URLSearchParams({
          token: tokenToCheck
        }),
        {
          headers: {
            'Authorization': `Basic ${this.credentials}`,
            'tenant-id': this.config.tenant.id,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[OAuth2] 令牌校验失败:', error.response?.data || error.message);
      throw new Error('令牌校验失败');
    }
  }
  
  /**
   * 保存令牌到本地存储
   * @param {Object} tokenData 令牌数据
   */
  async saveTokens(tokenData) {
    try {
      const promises = [
        AsyncStorage.setItem('oauth2_access_token', tokenData.access_token),
        AsyncStorage.setItem('oauth2_token_type', tokenData.token_type || 'Bearer'),
        AsyncStorage.setItem('oauth2_expires_at', 
          String(Date.now() + (tokenData.expires_in * 1000))
        )
      ];
      
      // 保存刷新令牌（如果存在）
      if (tokenData.refresh_token) {
        promises.push(
          AsyncStorage.setItem('oauth2_refresh_token', tokenData.refresh_token)
        );
      }
      
      // 保存权限范围（如果存在）
      if (tokenData.scope) {
        promises.push(
          AsyncStorage.setItem('oauth2_scope', tokenData.scope)
        );
      }
      
      await Promise.all(promises);
      // console.log('[OAuth2] 令牌已保存到本地存储');
    } catch (error) {
      console.error('[OAuth2] 保存令牌失败:', error);
      throw new Error('保存令牌失败');
    }
  }
  
  /**
   * 获取有效的访问令牌
   * 如果令牌过期，自动尝试刷新
   * @returns {Promise<string>} 访问令牌
   */
  async getAccessToken() {
    try {
      const token = await this.getStoredAccessToken();
      const expiresAt = await AsyncStorage.getItem('oauth2_expires_at');
      
      if (token && expiresAt && Date.now() < parseInt(expiresAt)) {
        return token;
      }
      
      // 令牌过期或不存在，尝试刷新
      // console.log('[OAuth2] 令牌过期，尝试刷新');
      
      try {
        const newTokenData = await this.refreshToken();
        return newTokenData.access_token;
      } catch (refreshError) {
        // 刷新失败，清除所有令牌
        await this.clearTokens();
        throw new Error('需要重新登录');
      }
    } catch (error) {
      console.error('[OAuth2] 获取访问令牌失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取存储的访问令牌（不进行有效性检查）
   * @returns {Promise<string|null>} 访问令牌
   */
  async getStoredAccessToken() {
    return await AsyncStorage.getItem('oauth2_access_token');
  }
  
  /**
   * 获取刷新令牌
   * @returns {Promise<string|null>} 刷新令牌
   */
  async getRefreshToken() {
    return await AsyncStorage.getItem('oauth2_refresh_token');
  }
  
  /**
   * 调用受保护的API
   * @param {string} url API地址
   * @param {Object} options 请求选项
   * @returns {Promise<Response>} 响应对象
   */
  async apiCall(url, options = {}) {
    try {
      const token = await this.getAccessToken();
      
      const config = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      };
      
      // 如果URL是相对路径，使用axios实例；否则使用fetch
      if (url.startsWith('http')) {
        return fetch(url, config);
      } else {
        // 使用axios实例，会自动添加baseURL
        return this.axiosInstance.request({
          url,
          ...config
        });
      }
    } catch (error) {
      console.error('[OAuth2] API调用失败:', error);
      throw error;
    }
  }
  
  /**
   * 登出
   * 清除所有本地存储的令牌
   */
  async logout() {
    try {
      // console.log('[OAuth2] 开始登出');
      await this.clearTokens();
      // console.log('[OAuth2] 登出完成');
    } catch (error) {
      console.error('[OAuth2] 登出失败:', error);
      throw error;
    }
  }
  
  /**
   * 清除所有令牌
   */
  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        'oauth2_access_token',
        'oauth2_refresh_token', 
        'oauth2_expires_at',
        'oauth2_token_type',
        'oauth2_scope'
      ]);
      // console.log('[OAuth2] 所有令牌已清除');
    } catch (error) {
      console.error('[OAuth2] 清除令牌失败:', error);
      throw error;
    }
  }
  
  /**
   * 密码模式登录（兼容若依框架）
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} clientId 客户端ID，默认使用实例配置
   * @param {string} clientSecret 客户端密钥，默认使用实例配置
   * @param {string} scope 权限范围
   * @returns {Promise<Object>} 登录结果
   */
  async passwordLogin(username, password, clientId = null, clientSecret = null, scope = null, tenantId = null) {
    try {
      if (this.config.development.enableDebugLog) {
        // console.log(`[OAuth2] 密码模式登录: ${username}`);
      }
      
      // 使用传入的客户端凭证或默认凭证
      const actualClientId = clientId || this.clientId;
      const actualClientSecret = clientSecret || this.clientSecret;
      const actualScope = scope || this.config.client.scope;
      const actualTenantId = tenantId || this.config.tenant.id;
      const credentials = this.base64Encode(`${actualClientId}:${actualClientSecret}`);
      
      const response = await this.axiosInstance.post(this.config.endpoints.token, 
        new URLSearchParams({
          grant_type: 'password',
          username: username,
          password: password,
          scope: actualScope
        }),
        {
          headers: {
             'Authorization': `Basic ${credentials}`,
             'tenant-id': actualTenantId,
             'Content-Type': 'application/x-www-form-urlencoded'
           }
        }
      );
      
      const result = response.data;
      
      if (result.code === 0 && result.data) {
        if (this.config.development.enableDebugLog) {
          // console.log('[OAuth2] 密码模式登录成功');
        }
        await this.saveTokens(result.data);
        return { success: true, data: result.data };
      } else {
        if (this.config.development.enableDebugLog) {
          console.error('[OAuth2] 登录失败:', result.msg);
        }
        return { success: false, error: result.msg || '登录失败' };
      }
    } catch (error) {
      if (this.config.development.enableDebugLog) {
        console.error('[OAuth2] 密码模式登录异常:', error.response?.data || error.message);
      }
      const errorMsg = error.response?.data?.msg || error.response?.data?.error_description || error.message || '登录失败';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 获取用户信息（若依框架）
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(tenantId = null) {
    try {
      const actualTenantId = tenantId || this.config.tenant.id;
      const response = await this.axiosInstance.get(this.config.endpoints.userInfo, {
        headers: {
          'tenant-id': actualTenantId
        }
      });
      
      const result = response.data;
      
      if (result.code === 0) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.msg || '获取用户信息失败' };
      }
    } catch (error) {
      if (this.config.development.enableDebugLog) {
        console.error('[OAuth2] 获取用户信息失败:', error);
      }
      return { success: false, error: error.message || '获取用户信息失败' };
    }
  }

  /**
   * 获取令牌信息
   * @returns {Promise<Object>} 令牌信息
   */
  async getTokenInfo() {
    try {
      const [
        accessToken,
        refreshToken,
        tokenType,
        expiresAtStr,
        scope
      ] = await AsyncStorage.multiGet([
        'oauth2_access_token',
        'oauth2_refresh_token',
        'oauth2_token_type',
        'oauth2_expires_at',
        'oauth2_scope'
      ]);

      const expiresAt = expiresAtStr[1] ? parseInt(expiresAtStr[1]) : null;
      const now = Date.now();
      const isExpired = expiresAt ? now >= expiresAt : false;

      return {
        accessToken: accessToken[1],
        refreshToken: refreshToken[1],
        tokenType: tokenType[1] || 'Bearer',
        expiresAt: expiresAt,
        scope: scope[1],
        isExpired: isExpired,
        expiresIn: expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0
      };
    } catch (error) {
      console.error('[OAuth2] 获取令牌信息失败:', error);
      throw error;
    }
  }
  
  /**
   * 检查是否已登录
   * @returns {Promise<boolean>} 是否已登录
   */
  async isLoggedIn() {
    try {
      const token = await this.getStoredAccessToken();
      const expiresAt = await AsyncStorage.getItem('oauth2_expires_at');
      
      return token && expiresAt && Date.now() < parseInt(expiresAt);
    } catch (error) {
      console.error('[OAuth2] 检查登录状态失败:', error);
      return false;
    }
  }
  

}

export default OAuth2Service;

// 导出单例实例（可选）
export const createOAuth2Service = (baseUrl, clientId, clientSecret) => {
  return new OAuth2Service(baseUrl, clientId, clientSecret);
};

// 默认配置（需要根据实际ruoyi项目配置修改）
export const DEFAULT_OAUTH2_CONFIG = {
  // ruoyi项目的OAuth2服务器地址
  baseUrl: 'http://localhost:8080', // 需要修改为实际的ruoyi服务器地址
  clientId: 'zziot-mobile-app',      // 需要在ruoyi后台创建的客户端ID
  clientSecret: 'your-client-secret', // 需要在ruoyi后台创建的客户端密钥
  scope: 'user.read user.write'       // 默认权限范围
};