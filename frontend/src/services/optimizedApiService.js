/**
 * 优化后的API服务类
 * 包含错误处理、重试机制、缓存、性能监控等功能
 */

import axios from 'axios';
import { 
  API_CONFIG, 
  CACHE_CONFIG, 
  ERROR_CONFIG, 
  PERFORMANCE_CONFIG,
  getEnvironmentConfig 
} from '../config/optimization';

// 缓存管理器
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanExpiredCache();
    }, CACHE_CONFIG.MEMORY_CACHE.CHECK_INTERVAL);
  }
  
  // 生成缓存键
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${url}:${JSON.stringify(sortedParams)}`;
  }
  
  // 获取缓存
  get(key) {
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }
    
    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      this.cacheStats.misses++;
      return null;
    }
    
    this.cacheStats.hits++;
    return cached.data;
  }
  
  // 设置缓存
  set(key, data, ttl = CACHE_CONFIG.MEMORY_CACHE.TTL) {
    // 检查缓存大小限制
    if (this.memoryCache.size >= CACHE_CONFIG.MEMORY_CACHE.MAX_ENTRIES) {
      // 删除最旧的缓存项
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, {
      data,
      expiry: Date.now() + ttl,
      timestamp: Date.now()
    });
    
    this.cacheStats.sets++;
  }
  
  // 删除缓存
  delete(key) {
    return this.memoryCache.delete(key);
  }
  
  // 清空缓存
  clear() {
    this.memoryCache.clear();
  }
  
  // 清理过期缓存
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now > value.expiry) {
        this.memoryCache.delete(key);
      }
    }
  }
  
  // 获取缓存统计
  getStats() {
    return {
      ...this.cacheStats,
      size: this.memoryCache.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }
}

// 性能监控器
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: [],
      errors: [],
      slowRequests: []
    };
  }
  
  // 记录API调用
  recordApiCall(url, method, duration, status) {
    if (!PERFORMANCE_CONFIG.ENABLED) return;
    
    const metric = {
      url,
      method,
      duration,
      status,
      timestamp: Date.now()
    };
    
    this.metrics.apiCalls.push(metric);
    
    // 检查是否为慢请求
    if (duration > PERFORMANCE_CONFIG.THRESHOLDS.API_SLOW) {
      this.metrics.slowRequests.push(metric);
      console.warn(`慢请求检测: ${method} ${url} 耗时 ${duration}ms`);
    }
    
    // 限制数组大小
    if (this.metrics.apiCalls.length > 1000) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-500);
    }
  }
  
  // 记录错误
  recordError(error, context) {
    if (!PERFORMANCE_CONFIG.ENABLED) return;
    
    const errorMetric = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    };
    
    this.metrics.errors.push(errorMetric);
    
    // 限制数组大小
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
  }
  
  // 获取性能统计
  getStats() {
    const recentCalls = this.metrics.apiCalls.filter(
      call => Date.now() - call.timestamp < 60000 // 最近1分钟
    );
    
    return {
      totalCalls: this.metrics.apiCalls.length,
      recentCalls: recentCalls.length,
      averageResponseTime: recentCalls.reduce((sum, call) => sum + call.duration, 0) / recentCalls.length || 0,
      errorRate: this.metrics.errors.length / this.metrics.apiCalls.length || 0,
      slowRequestCount: this.metrics.slowRequests.length
    };
  }
}

// 请求队列管理器
class RequestQueue {
  constructor() {
    this.queue = [];
    this.activeRequests = 0;
    this.maxConcurrent = API_CONFIG.CONCURRENCY.MAX_PARALLEL;
  }
  
  // 添加请求到队列
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }
  
  // 处理队列
  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const { requestFn, resolve, reject } = this.queue.shift();
    this.activeRequests++;
    
    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue(); // 处理下一个请求
    }
  }
}

// 优化后的API服务类
class OptimizedApiService {
  constructor() {
    this.cache = new CacheManager();
    this.monitor = new PerformanceMonitor();
    this.requestQueue = new RequestQueue();
    this.envConfig = getEnvironmentConfig();
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.envConfig.API_BASE_URL,
      timeout: API_CONFIG.TIMEOUT.DEFAULT,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }
  
  // 设置拦截器
  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // 记录请求开始时间
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => {
        this.monitor.recordError(error, 'request_interceptor');
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        // 记录性能指标
        const duration = Date.now() - response.config.metadata.startTime;
        this.monitor.recordApiCall(
          response.config.url,
          response.config.method.toUpperCase(),
          duration,
          response.status
        );
        
        return response;
      },
      async (error) => {
        // 记录错误
        this.monitor.recordError(error, 'response_interceptor');
        
        // 记录失败的API调用
        if (error.config && error.config.metadata) {
          const duration = Date.now() - error.config.metadata.startTime;
          this.monitor.recordApiCall(
            error.config.url,
            error.config.method.toUpperCase(),
            duration,
            error.response?.status || 0
          );
        }
        
        // 处理特定错误
        if (error.response?.status === 401) {
          // Token过期，清除本地存储并重定向到登录页
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return Promise.reject(new Error('认证已过期，请重新登录'));
        }
        
        return Promise.reject(this.formatError(error));
      }
    );
  }
  
  // 格式化错误信息
  formatError(error) {
    if (error.code === 'ECONNABORTED') {
      return new Error(ERROR_CONFIG.MESSAGES.TIMEOUT_ERROR);
    }
    
    if (!error.response) {
      return new Error(ERROR_CONFIG.MESSAGES.NETWORK_ERROR);
    }
    
    const status = error.response.status;
    
    switch (status) {
      case 400:
        return new Error(ERROR_CONFIG.MESSAGES.VALIDATION_ERROR);
      case 403:
        return new Error(ERROR_CONFIG.MESSAGES.PERMISSION_ERROR);
      case 500:
      case 502:
      case 503:
        return new Error(ERROR_CONFIG.MESSAGES.SERVER_ERROR);
      default:
        return new Error(error.response.data?.message || '未知错误');
    }
  }
  
  // 重试机制
  async retryRequest(requestFn, maxAttempts = API_CONFIG.RETRY.MAX_ATTEMPTS) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // 检查是否应该重试
        if (!this.shouldRetry(error) || attempt === maxAttempts) {
          break;
        }
        
        // 计算延迟时间（指数退避）
        const delay = API_CONFIG.RETRY.DELAY * Math.pow(API_CONFIG.RETRY.BACKOFF_FACTOR, attempt - 1);
        await this.sleep(delay);
        
        console.warn(`请求重试 ${attempt}/${maxAttempts}, 延迟 ${delay}ms`);
      }
    }
    
    throw lastError;
  }
  
  // 判断是否应该重试
  shouldRetry(error) {
    if (error.code === 'ECONNABORTED') {
      return ERROR_CONFIG.RETRY.TIMEOUT_ERROR;
    }
    
    if (!error.response) {
      return ERROR_CONFIG.RETRY.NETWORK_ERROR;
    }
    
    const status = error.response.status;
    return status >= 500 && ERROR_CONFIG.RETRY.SERVER_ERROR;
  }
  
  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 通用GET请求
  async get(url, params = {}, options = {}) {
    const cacheKey = this.cache.generateKey(url, params);
    
    // 检查缓存
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const requestFn = () => this.requestQueue.enqueue(() => 
      this.client.get(url, { 
        params, 
        timeout: options.timeout || API_CONFIG.TIMEOUT.DEFAULT 
      })
    );
    
    const response = await this.retryRequest(requestFn);
    
    // 缓存响应数据
    if (options.useCache !== false && response.status === 200) {
      this.cache.set(cacheKey, response.data, options.cacheTtl);
    }
    
    return response.data;
  }
  
  // 通用POST请求
  async post(url, data = {}, options = {}) {
    const requestFn = () => this.requestQueue.enqueue(() => 
      this.client.post(url, data, {
        timeout: options.timeout || API_CONFIG.TIMEOUT.DEFAULT
      })
    );
    
    const response = await this.retryRequest(requestFn);
    
    // 清除相关缓存
    this.invalidateCache(url);
    
    return response.data;
  }
  
  // 通用PUT请求
  async put(url, data = {}, options = {}) {
    const requestFn = () => this.requestQueue.enqueue(() => 
      this.client.put(url, data, {
        timeout: options.timeout || API_CONFIG.TIMEOUT.DEFAULT
      })
    );
    
    const response = await this.retryRequest(requestFn);
    
    // 清除相关缓存
    this.invalidateCache(url);
    
    return response.data;
  }
  
  // 通用DELETE请求
  async delete(url, options = {}) {
    const requestFn = () => this.requestQueue.enqueue(() => 
      this.client.delete(url, {
        timeout: options.timeout || API_CONFIG.TIMEOUT.DEFAULT
      })
    );
    
    const response = await this.retryRequest(requestFn);
    
    // 清除相关缓存
    this.invalidateCache(url);
    
    return response.data;
  }
  
  // 文件上传
  async upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      timeout: API_CONFIG.TIMEOUT.UPLOAD,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }
    
    const response = await this.client.post(url, formData, config);
    return response.data;
  }
  
  // 批量请求
  async batch(requests) {
    const promises = requests.map(request => {
      const { method, url, data, params } = request;
      
      switch (method.toLowerCase()) {
        case 'get':
          return this.get(url, params);
        case 'post':
          return this.post(url, data);
        case 'put':
          return this.put(url, data);
        case 'delete':
          return this.delete(url);
        default:
          throw new Error(`不支持的请求方法: ${method}`);
      }
    });
    
    return Promise.allSettled(promises);
  }
  
  // 清除缓存
  invalidateCache(pattern) {
    if (typeof pattern === 'string') {
      // 清除包含特定URL的缓存
      for (const key of this.cache.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }
  
  // 获取服务统计信息
  getStats() {
    return {
      cache: this.cache.getStats(),
      performance: this.monitor.getStats(),
      queue: {
        pending: this.requestQueue.queue.length,
        active: this.requestQueue.activeRequests
      }
    };
  }
  
  // 健康检查
  async healthCheck() {
    try {
      const response = await this.get('/health', {}, { useCache: false, timeout: 5000 });
      return { status: 'healthy', data: response };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// 创建单例实例
const apiService = new OptimizedApiService();

// 导出API方法
export default apiService;

// 导出特定的API方法供组件使用
export const {
  get,
  post,
  put,
  delete: del,
  upload,
  batch,
  invalidateCache,
  getStats,
  healthCheck
} = apiService;