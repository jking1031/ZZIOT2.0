// 兼容性配置 - 保持向后兼容
// 推荐使用新的 apiManager.js 进行API管理

// 导入新的API管理系统
import { API_BASE_URLS, getApiUrl } from './apiManager';

// API基础URL (兼容性保留)
export const BASE_URL = API_BASE_URLS.NODERED?.url || 'https://nodered.jzz77.cn:9003';

// API请求超时时间 (毫秒)
export const REQUEST_TIMEOUT = 10000;

// API响应代码
export const API_RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201, 
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// 缓存Key
export const CACHE_KEYS = {
  TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  // 工单系统缓存键已删除
  API_CONFIG: 'api_config',
  API_TEST_RESULTS: 'api_test_results'
};

// API端点 (兼容性保留，推荐使用 apiManager.js)
export const API_ENDPOINTS = {
  // 工单相关API已删除
};

// 新的API URL获取方法 (推荐使用)
// 工单API URL生成函数已删除

// 获取不同后端的基础URL
export const getBackendUrl = (backend = 'NODERED') => {
  return API_BASE_URLS[backend]?.url || API_BASE_URLS.NODERED?.url || 'https://nodered.jzz77.cn:9003';
}; 

// HTTP请求的简单验证中间件
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: true, message: '未授权访问' });
    }
    
    // 从App发送的令牌中提取用户信息
    const token = authHeader.split(' ')[1];
    
    try {
        // 这里不再需要验证令牌的有效性和签名
        // 只需要从令牌中提取用户信息
        const tokenParts = token.split('.');
        if (tokenParts.length >= 2) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            req.user = {
                id: payload.id,
                username: payload.username,
                is_admin: payload.is_admin || payload.role
            };
        } else {
            // 如果不是标准JWT格式，可能是自定义令牌
            // 根据App的令牌格式进行解析
            req.user = { id: 1, is_admin: 1 }; // 临时解决方案
        }
        
        next();
    } catch (error) {
        return res.status(401).json({ error: true, message: '令牌解析失败' });
    }
}