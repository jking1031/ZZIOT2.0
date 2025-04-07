import axios from 'axios';
import { BASE_URL, API_ENDPOINTS } from './config';
import { getAuthToken } from './storage';
import api, { apiService } from './interceptors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 辅助函数 - 获取当前用户信息
const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
};

// 辅助函数 - 添加用户ID和管理员信息到请求头
const addUserInfoToHeaders = async () => {
  const user = await getCurrentUser();
  const headers = {};
  
  if (user && user.id) {
    headers['user-id'] = user.id;
    
    // 记录原始is_admin值
    console.log('原始用户信息:', JSON.stringify(user, null, 2));
    console.log('原始is_admin值:', user.is_admin, '类型:', typeof user.is_admin);
    
    // 确保is_admin是数字(1-9)
    let adminValue = 0; // 默认非管理员
    
    // 检查is_admin是否已定义
    if (user.is_admin !== undefined && user.is_admin !== null) {
      // 如果是布尔值true，转换为数字1(管理员)
      if (typeof user.is_admin === 'boolean') {
        adminValue = user.is_admin === true ? 1 : 0;
        console.log('将布尔值is_admin转换为数字:', adminValue);
      } 
      // 如果已经是数字，直接使用
      else if (typeof user.is_admin === 'number') {
        adminValue = user.is_admin;
        console.log('使用数字is_admin:', adminValue);
      }
      // 如果是字符串，尝试转换为数字
      else if (typeof user.is_admin === 'string') {
        const numValue = parseInt(user.is_admin, 10);
        adminValue = isNaN(numValue) ? 0 : numValue;
        console.log('将字符串is_admin转换为数字:', adminValue);
      }
    }
    // 尝试用is_admin_value或role_id作为后备
    else if (user.is_admin_value !== undefined && user.is_admin_value !== null) {
      if (typeof user.is_admin_value === 'number') {
        adminValue = user.is_admin_value;
      } else {
        const numValue = parseInt(user.is_admin_value, 10);
        adminValue = isNaN(numValue) ? 0 : numValue;
      }
      console.log('使用is_admin_value:', adminValue);
    }
    else if (user.role_id !== undefined && user.role_id !== null) {
      if (typeof user.role_id === 'number') {
        adminValue = user.role_id;
      } else {
        const numValue = parseInt(user.role_id, 10);
        adminValue = isNaN(numValue) ? 0 : numValue;
      }
      console.log('使用role_id:', adminValue);
    }
    
    // 确保adminValue是1-9之间的整数
    adminValue = Math.round(adminValue); // 确保是整数
    
    // 验证是否在1-9范围内
    if (adminValue < 1 || adminValue > 9 || isNaN(adminValue)) {
      // 如果不在范围内，根据以下逻辑设置默认值:
      // - 如果布尔值is_admin为true，设为1(管理员)
      if (user.is_admin === true) {
        adminValue = 1;
        console.log('is_admin为true，设置为管理员角色1');
      }
      // - 尝试使用用户名或邮箱判断是否为管理员
      else if (user.username && 
              (user.username.toLowerCase().includes('admin') || 
               user.username.toLowerCase().includes('管理'))) {
        adminValue = 1;
        console.log('用户名包含admin或管理，设置为管理员角色1');
      }
      else if (user.email && user.email.toLowerCase().includes('admin')) {
        adminValue = 1;
        console.log('邮箱包含admin，设置为管理员角色1');
      }
      // - 否则设为9(普通用户)
      else {
        adminValue = 9;
        console.log('无法确定角色，设置为普通用户角色9');
      }
    }
    
    // 设置最终的is-admin头部值
    headers['is-admin'] = adminValue;
    console.log('最终发送的is-admin值:', headers['is-admin'], '类型:', typeof headers['is-admin']);
  }
  
  return headers;
};

// 获取工单列表
export const getTickets = async (filters = {}) => {
  // 获取用户信息头
  const headers = await addUserInfoToHeaders();
  
  try {
    const result = await apiService.get('/api/tickets', { 
      params: filters,
      headers
    });
    return result;
  } catch (error) {
    console.error('获取工单列表失败:', error);
    throw error;
  }
};

// 获取单个工单详情
export const getTicketById = async (ticketId) => {
  const headers = await addUserInfoToHeaders();
  
  try {
    const result = await apiService.get(`/api/tickets/${ticketId}`, {
      headers
    });
    return result;
  } catch (error) {
    console.error(`获取工单 ${ticketId} 详情失败:`, error);
    throw error;
  }
};

// 创建新工单
export const createTicket = async (ticketData) => {
  const headers = await addUserInfoToHeaders();
  
  try {
    const result = await apiService.post('/api/tickets', ticketData, {
      headers
    });
    return result;
  } catch (error) {
    console.error('创建工单失败:', error);
    throw error;
  }
};

// 更新工单状态
export const updateTicketStatus = async (id, data) => {
  try {
    // 获取用户信息头并添加到请求中
    const headers = await addUserInfoToHeaders();
    const user = await getCurrentUser();
    
    console.log(`正在更新工单 ${id} 状态为 ${data.status}`, data);
    
    // 首先尝试标准API端点
    let url = API_ENDPOINTS.TICKET_STATUS(id);
    console.log('尝试请求URL:', BASE_URL + url);
    
    // 准备不同格式的请求数据，以适应可能的后端API期望
    const formatA = { ...data }; // 原始格式，保持所有字段
    const formatB = { status: data.status }; // 简化格式，只包含状态
    const formatC = { 
      status: data.status, 
      comment: data.comment,
      user_id: user?.id
    }; // 添加用户ID
    
    try {
      // 首先尝试PUT方法 + 原始格式
      console.log('尝试 PUT + 原始格式A', formatA);
      return await apiService.put(url, formatA, { headers });
    } catch (error1) {
      if (error1.response && error1.response.status === 404) {
        try {
          // 尝试 PUT + 简化格式B
          console.log('尝试 PUT + 简化格式B', formatB);
          return await apiService.put(url, formatB, { headers });
        } catch (error2) {
          if (error2.response && error2.response.status === 404) {
            try {
              // 尝试 POST + 原始格式A
              console.log('尝试 POST + 原始格式A', formatA);
              return await apiService.post(url, formatA, { headers });
            } catch (error3) {
              if (error3.response && error3.response.status === 404) {
                try {
                  // 尝试 POST + 简化格式B
                  console.log('尝试 POST + 简化格式B', formatB);
                  return await apiService.post(url, formatB, { headers });
                } catch (error4) {
                  if (error4.response && error4.response.status === 404) {
                    try {
                      // 尝试 PUT + 用户ID格式C
                      console.log('尝试 PUT + 用户ID格式C', formatC);
                      return await apiService.put(url, formatC, { headers });
                    } catch (error5) {
                      if (error5.response && error5.response.status === 404) {
                        try {
                          // 尝试备用URL 1 (不带/status)
                          const altUrl = `/api/tickets/${id}`;
                          console.log('尝试备用URL:', BASE_URL + altUrl);
                          return await apiService.put(altUrl, formatA, { headers });
                        } catch (error6) {
                          // 最后一次尝试，使用PATCH方法
                          console.log('尝试最后选项: PATCH方法');
                          return await apiService.patch(url, formatA, { headers });
                        }
                      } else {
                        throw error5;
                      }
                    }
                  } else {
                    throw error4;
                  }
                }
              } else {
                throw error3;
              }
            }
          } else {
            throw error2;
          }
        }
      } else {
        throw error1;
      }
    }
  } catch (error) {
    console.error('更新工单状态失败:', error);
    
    // 提供更详细的错误信息
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    
    throw error;
  }
};

// 添加工单评论
export const addTicketComment = async (id, data) => {
  try {
    // 获取用户信息头并添加到请求中
    const headers = await addUserInfoToHeaders();
    
    return await apiService.post(API_ENDPOINTS.TICKET_COMMENTS(id), data, { headers });
  } catch (error) {
    console.error('添加评论失败:', error);
    throw error;
  }
};

// 分配工单
export const assignTicket = async (id, data) => {
  try {
    // 获取用户信息头并添加到请求中
    const headers = await addUserInfoToHeaders();
    
    return await apiService.patch(API_ENDPOINTS.TICKET_ASSIGN(id), data, { headers });
  } catch (error) {
    console.error('分配工单失败:', error);
    throw error;
  }
};

// 获取过滤选项
export const getTicketFilters = async () => {
  try {
    return await apiService.get(API_ENDPOINTS.TICKET_FILTERS);
  } catch (error) {
    console.error('获取过滤选项失败:', error);
    throw error;
  }
};

// 获取工单统计数据
export const getTicketStats = async () => {
  try {
    return await apiService.get(API_ENDPOINTS.TICKET_STATS);
  } catch (error) {
    console.error('获取工单统计数据失败:', error);
    throw error;
  }
};

// 删除工单
export const deleteTicket = async (id) => {
  try {
    // 获取用户信息头并添加到请求中
    const headers = await addUserInfoToHeaders();
    const user = await getCurrentUser();
    
    console.log(`正在删除工单 ${id}`);
    
    // 构建删除工单的URL
    const url = API_ENDPOINTS.TICKET_BY_ID(id);
    console.log('删除工单URL:', BASE_URL + url);
    
    // 准备请求数据（多种格式以适应不同后端）
    const deleteData = { 
      ticket_id: id,
      user_id: user?.id
    };
    
    console.log('删除工单数据:', deleteData);
    
    try {
      // 首先尝试标准DELETE方法（带数据）
      console.log('尝试 DELETE 方法（带数据）');
      return await apiService.delete(url, { 
        headers,
        data: deleteData,  // DELETE请求的数据要放在data属性中
        timeout: 30000     // 增加超时时间到30秒
      });
    } catch (error1) {
      if (error1.response && error1.response.status === 404 || error1.code === 'ECONNABORTED') {
        try {
          // 尝试 POST 到删除端点
          const altUrl = `/api/tickets/${id}/delete`;
          console.log('尝试 POST 到备用URL:', BASE_URL + altUrl);
          return await apiService.post(altUrl, deleteData, { 
            headers,
            timeout: 30000
          });
        } catch (error2) {
          if (error2.response && error2.response.status === 404 || error2.code === 'ECONNABORTED') {
            try {
              // 尝试使用API_ENDPOINTS.TICKETS + DELETE方法
              const altUrl2 = API_ENDPOINTS.TICKETS + `/${id}`;
              console.log('尝试备用URL2:', BASE_URL + altUrl2);
              return await apiService.delete(altUrl2, { 
                headers,
                data: deleteData,
                timeout: 30000
              });
            } catch (error3) {
              // 最终尝试：使用表单数据格式，并添加_method=DELETE
              console.log('尝试最终方法: POST + _method=DELETE');
              const formData = new FormData();
              formData.append('_method', 'DELETE');
              formData.append('ticket_id', id);
              formData.append('user_id', user?.id);
              if (user?.is_admin !== undefined) {
                formData.append('is_admin', user.is_admin);
              }
              
              return await apiService.post(url, formData, {
                headers: {
                  ...headers,
                  'Content-Type': 'multipart/form-data',
                },
                timeout: 30000
              });
            }
          } else {
            throw error2;
          }
        }
      } else {
        throw error1;
      }
    }
  } catch (error) {
    console.error('删除工单失败:', error);
    
    // 提供更详细的错误信息
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    
    throw error;
  }
};

// 上传工单图片
export const uploadTicketImages = async (ticketId, formData) => {
  try {
    const token = await getAuthToken();
    // 使用原始 axios 处理文件上传，因为需要特殊的 Content-Type
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.TICKETS}/${ticketId}/images`, 
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('上传工单图片失败:', error);
    throw error;
  }
}; 