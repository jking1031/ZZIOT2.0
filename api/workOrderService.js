/**
 * 工单系统API服务
 * 根据EXPO_APP_WORKORDER_INTEGRATION.md文档实现
 */

import { getApiUrl } from './apiManager';
import { getAuthToken } from './storage';
import { API_RESPONSE_CODES } from './config';
import OAuth2Config from '../config/oauth2Config';

// 工单API基础路径
const WORK_ORDER_BASE_PATH = '/admin-api/workorder';

// 获取完整的API URL
const getWorkOrderApiUrl = (endpoint) => {
  return `${OAuth2Config.baseUrl}${WORK_ORDER_BASE_PATH}${endpoint}`;
};

// 通用请求方法
const makeRequest = async (url, options = {}) => {
  try {
    const token = await getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    };

    console.log(`[工单API请求] ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    
    console.log(`[工单API响应] 状态: ${response.status}`, data);
    
    if (!response.ok) {
      throw new Error(data.msg || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('[工单API错误]', error);
    throw error;
  }
};

// 工单服务API
export const workOrderApi = {
  // 获取工单列表
  getWorkOrders: async (params = {}) => {
    const queryParams = new URLSearchParams({
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 10,
      ...(params.status && { status: params.status }),
      ...(params.priority && { priority: params.priority }),
      ...(params.category && { category: params.category }),
      ...(params.keyword && { keyword: params.keyword }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate })
    }).toString();
    
    const url = getWorkOrderApiUrl(`/list?${queryParams}`);
    return await makeRequest(url);
  },

  // 获取工单详情
  getWorkOrderDetail: async (id) => {
    const url = getWorkOrderApiUrl(`/${id}`);
    return await makeRequest(url);
  },

  // 创建工单
  createWorkOrder: async (workOrderData) => {
    const url = getWorkOrderApiUrl('');
    return await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(workOrderData)
    });
  },

  // 更新工单
  updateWorkOrder: async (id, workOrderData) => {
    const url = getWorkOrderApiUrl(`/${id}`);
    return await makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(workOrderData)
    });
  },

  // 删除工单
  deleteWorkOrder: async (id) => {
    const url = getWorkOrderApiUrl(`/${id}`);
    return await makeRequest(url, {
      method: 'DELETE'
    });
  },

  // 批量删除工单
  batchDeleteWorkOrders: async (ids) => {
    const url = getWorkOrderApiUrl('/batch');
    return await makeRequest(url, {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  },

  // 更新工单状态
  updateWorkOrderStatus: async (id, status, comment = '') => {
    const url = getWorkOrderApiUrl(`/${id}/status`);
    return await makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify({ status, comment })
    });
  },

  // 分配工单
  assignWorkOrder: async (id, assigneeId, comment = '') => {
    const url = getWorkOrderApiUrl(`/${id}/assign`);
    return await makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify({ assigneeId, comment })
    });
  },

  // 添加工单评论
  addWorkOrderComment: async (id, comment, attachments = []) => {
    const url = getWorkOrderApiUrl(`/${id}/comments`);
    return await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ comment, attachments })
    });
  },

  // 获取工单评论
  getWorkOrderComments: async (id) => {
    const url = getWorkOrderApiUrl(`/${id}/comments`);
    return await makeRequest(url);
  },

  // 上传附件
  uploadAttachment: async (file) => {
    const url = getWorkOrderApiUrl('/upload');
    const formData = new FormData();
    formData.append('file', file);
    
    const token = await getAuthToken();
    return await makeRequest(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
        // 不设置Content-Type，让浏览器自动设置multipart/form-data
      },
      body: formData
    });
  },

  // 获取工单统计
  getWorkOrderStats: async (params = {}) => {
    const queryParams = new URLSearchParams({
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
      ...(params.groupBy && { groupBy: params.groupBy })
    }).toString();
    
    const url = getWorkOrderApiUrl(`/stats?${queryParams}`);
    return await makeRequest(url);
  },

  // 获取工单类别
  getWorkOrderCategories: async () => {
    const url = getWorkOrderApiUrl('/categories');
    return await makeRequest(url);
  },

  // 获取工单优先级选项
  getWorkOrderPriorities: async () => {
    const url = getWorkOrderApiUrl('/priorities');
    return await makeRequest(url);
  },

  // 获取工单状态选项
  getWorkOrderStatuses: async () => {
    const url = getWorkOrderApiUrl('/statuses');
    return await makeRequest(url);
  },

  // 同步状态到Node-RED（预留功能）
  syncStatusToNodeRed: async (workOrderId, status, data = {}) => {
    const url = getWorkOrderApiUrl(`/${workOrderId}/sync-nodered`);
    return await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ status, data })
    });
  },

  // 获取我的工单（当前用户相关的工单）
  getMyWorkOrders: async (params = {}) => {
    const queryParams = new URLSearchParams({
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 10,
      ...(params.status && { status: params.status }),
      ...(params.type && { type: params.type }) // created, assigned, participated
    }).toString();
    
    const url = getWorkOrderApiUrl(`/my?${queryParams}`);
    return await makeRequest(url);
  }
};

export default workOrderApi;