// API基础URL
export const BASE_URL = 'https://nodered.jzz77.cn:9003';

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
  TICKETS: 'cached_tickets',
  TICKET_DETAIL: 'ticket_detail_'
};

// API端点
export const API_ENDPOINTS = {

  
  // 工单相关
  TICKETS: '/api/tickets',
  TICKET_BY_ID: (id) => `/api/tickets/${id}`,
  TICKET_STATUS: (id) => `/api/tickets/${id}/status`,
  TICKET_COMMENTS: (id) => `/api/tickets/${id}/comments`,
  TICKET_ASSIGN: (id) => `/api/tickets/${id}/assign`,
  TICKET_FILTERS: '/api/tickets/filters',
  TICKET_STATS: '/api/tickets/stats',
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