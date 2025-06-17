/**
 * 工单系统服务
 * 提供工单相关的API调用功能
 */

import { getApiUrl } from '../api/apiManager';
import { getAuthToken } from '../api/storage';
import axios from 'axios';
import { REQUEST_TIMEOUT } from '../api/config';
import OAuth2Config from '../config/oauth2Config';

class WorkOrderService {
  constructor() {
    this.baseURL = 'https://office.jzz77.cn:9003';
    this.apiPrefix = '/admin-api';
    
    // 调试信息：输出配置
    console.log('=== WorkOrderService 初始化调试 ===');
    console.log('Base URL:', this.baseURL);
    console.log('API Prefix:', this.apiPrefix);
    console.log('=== 初始化调试结束 ===');
  }

  // 创建axios实例
  createAxiosInstance = () => {
    return axios.create({
      baseURL: this.baseURL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  // 添加请求拦截器
  setupInterceptors = async (axiosInstance) => {
    const token = await getAuthToken();
    
    console.log('=== 认证Token调试信息 ===');
    console.log('获取到的Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('Token是否存在:', !!token);
    
    if (token) {
      axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
      console.log('已设置Authorization头');
    } else {
      console.log('警告：未找到认证Token');
    }
    
    // 设置租户ID
    axiosInstance.defaults.headers['tenant-id'] = '1';
    console.log('已设置tenant-id头: 1');
    
    console.log('=== 认证Token调试结束 ===');
    
    return axiosInstance;
  };

  /**
   * 获取工单分页
   * @param {string} title - 工单标题
   * @param {string} status - 状态
   * @param {string} priority - 优先级
   * @param {string} creatorId - 创建人ID
   * @param {string} assignToId - 指派给
   * @param {string} createTime - 创建时间
   * @param {string} pageNo - 页码，从 1 开始
   * @param {string} pageSize - 每页条数，最大值为 100
   * @returns {Promise} API响应数据
   */
  getWorkOrderPage = async (title, status, priority, creatorId, assignToId, createTime, pageNo = '1', pageSize = '20') => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (title) queryParams.append('title', title);
      if (status) queryParams.append('status', status);
      if (priority) queryParams.append('priority', priority);
      if (creatorId) queryParams.append('creatorId', creatorId);
      if (assignToId) queryParams.append('assignToId', assignToId);
      if (createTime) queryParams.append('createTime', createTime);
      queryParams.append('pageNo', pageNo);
      queryParams.append('pageSize', pageSize);
      
      const apiPath = `/admin-api/workorder/work-order/page?${queryParams.toString()}`;
      
      console.log('=== 工单分页API调试信息 ===');
      console.log('Base URL:', this.baseURL);
      console.log('API Path:', apiPath);
      console.log('完整请求URL:', `${this.baseURL}${apiPath}`);
      console.log('查询参数:', Object.fromEntries(queryParams));
      
      const response = await axiosInstance.get(apiPath);
      
      console.log('响应状态:', response.status);
      console.log('响应数据:', response.data);
      console.log('=== 调试信息结束 ===');
      
      return response.data;
    } catch (error) {
      console.error('=== 工单分页API错误详情 ===');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('请求URL:', error.config?.url);
      console.error('响应状态:', error.response?.status);
      console.error('响应数据:', error.response?.data);
      console.error('=== 错误详情结束 ===');
      throw error;
    }
  };

  /**
   * 获取工单列表（兼容旧版本）
   * @param {Object} params - 查询参数
   * @param {string} params.pageNo - 页码，从 1 开始
   * @param {string} params.pageSize - 每页条数，最大值为 100
   * @param {string} params.title - 工单标题
   * @param {string} params.status - 状态
   * @param {string} params.priority - 优先级
   * @param {string} params.creatorId - 创建人ID
   * @param {string} params.assignToId - 指派给
   * @param {string} params.createTime - 创建时间
   */
  getWorkOrders = async (params = {}) => {
    const {
      title,
      status,
      priority,
      creatorId,
      assignToId,
      createTime,
      pageNo = '1',
      pageSize = '20'
    } = params;
    
    return this.getWorkOrderPage(title, status, priority, creatorId, assignToId, createTime, pageNo, pageSize);
  };

  /**
   * 获取工单详情
   */
  getWorkOrderDetail = async (id) => {
    console.log('=== WorkOrderService.getWorkOrderDetail 调试开始 ===');
    console.log('工单ID:', id);
    console.log('开始时间:', new Date().toISOString());
    
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.get(`${this.apiPrefix}/workorder/work-order/get?id=${id}`);
      console.log('工单详情响应:', response.data);
      console.log('=== WorkOrderService.getWorkOrderDetail 调试结束 ===');
      return response.data;
    } catch (error) {
      console.error('获取工单详情失败:', error);
      throw error;
    }
  };

  /**
   * 创建工单
   * @param {Object} workOrderData - 工单数据
   * @param {string} workOrderData.title - 工单标题
   * @param {string} workOrderData.description - 工单描述
   * @param {string} workOrderData.priority - 优先级 (low/medium/high/urgent)
   * @param {string} workOrderData.category - 分类
   * @param {string} workOrderData.assigneeId - 处理人ID
   * @param {string} workOrderData.dueDate - 截止日期
   * @param {Array} workOrderData.attachments - 附件列表
   * @param {Object} workOrderData.customFields - 自定义字段
   */
  createWorkOrder = async (workOrderData) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/work-order/create`, workOrderData);
      return response.data;
    } catch (error) {
      console.error('创建工单失败:', error);
      throw error;
    }
  };

  /**
   * 更新工单
   * @param {Object} workOrderData - 工单数据（包含ID）
   */
  updateWorkOrder = async (workOrderData) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.put(`${this.apiPrefix}/workorder/work-order/update`, workOrderData);
      return response.data;
    } catch (error) {
      console.error('更新工单失败:', error);
      throw error;
    }
  };

  /**
   * 删除工单
   * @param {string} workOrderId - 工单ID
   */
  deleteWorkOrder = async (workOrderId) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.delete(`${this.apiPrefix}/workorder/work-order/delete?id=${workOrderId}`);
      return response.data;
    } catch (error) {
      console.error('删除工单失败:', error);
      throw error;
    }
  };

  /**
   * 处理工单
   * @param {string} id - 工单ID
   * @param {Object} processData - 处理数据
   */
  processWorkOrder = async (id, processData) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/work-order/process`, {
        id,
        ...processData
      });
      return response.data;
    } catch (error) {
      console.error('处理工单失败:', error);
      throw error;
    }
  };

  /**
   * 完成工单
   * @param {string} id - 工单ID
   * @param {string} comment - 完成备注
   */
  finishWorkOrder = async (id, comment) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/work-order/finish`, {
        id,
        comment
      });
      return response.data;
    } catch (error) {
      console.error('完成工单失败:', error);
      throw error;
    }
  };

  /**
   * 完成工单（兼容旧版本）
   * @param {string} id - 工单ID
   * @param {string} comment - 完成备注
   */
  completeWorkOrder = async (id, comment) => {
    return this.finishWorkOrder(id, comment);
  };

  /**
   * 关闭工单
   * @param {string} id - 工单ID
   * @param {string} comment - 关闭备注
   */
  closeWorkOrder = async (id, comment) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/work-order/close`, {
        id,
        comment
      });
      return response.data;
    } catch (error) {
      console.error('关闭工单失败:', error);
      throw error;
    }
  };

  /**
   * 退回工单
   * @param {string} id - 工单ID
   * @param {string} comment - 退回备注
   */
  returnWorkOrder = async (id, comment) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/work-order/return`, {
        id,
        comment
      });
      return response.data;
    } catch (error) {
      console.error('退回工单失败:', error);
      throw error;
    }
  };

  /**
   * 退回工单（兼容旧版本）
   * @param {string} id - 工单ID
   * @param {string} comment - 退回备注
   */
  rejectWorkOrder = async (id, comment) => {
    return this.returnWorkOrder(id, comment);
  };

  /**
   * 获取用户详情
   * @param {string} userId - 用户ID
   */
  getUserDetail = async (userId) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.get(`${this.apiPrefix}/system/user/get?id=${userId}`);
      
      console.log('=== 获取用户详情调试信息 ===');
      console.log('用户ID:', userId);
      console.log('响应数据:', response.data);
      console.log('=== 用户详情调试结束 ===');
      
      return response.data;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  };

  /**
   * 指派工单
   * @param {string} id - 工单ID
   * @param {string} assigneeId - 指派给的用户ID
   * @param {string} remark - 指派备注
   */
  assignWorkOrder = async (id, assigneeId, remark = '') => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/work-order/assign`, {
        id,
        assignToId: assigneeId
      });
      return response.data;
    } catch (error) {
      console.error('指派工单失败:', error);
      throw error;
    }
  };

  /**
   * 获取工单日志
   * @param {string} workOrderId - 工单ID
   */
  getWorkOrderLogs = async (workOrderId) => {
    console.log('=== WorkOrderService.getWorkOrderLogs 调试开始 ===');
    console.log('工单ID:', workOrderId);
    console.log('开始时间:', new Date().toISOString());
    
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.get(`${this.apiPrefix}/workorder/work-order/logs?workOrderId=${workOrderId}`);
      console.log('工单日志响应:', response.data);
      console.log('=== WorkOrderService.getWorkOrderLogs 调试结束 ===');
      return response.data;
    } catch (error) {
      console.error('获取工单日志失败:', error);
      throw error;
    }
  };

  /**
   * 获取用户精简信息列表
   * 只包含被开启的用户，主要用于前端的下拉选项
   * @returns {Promise} API响应
   */
  getUserSimpleList = async () => {
    try {
      console.log('[WorkOrderService] 获取用户精简信息列表');
      
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.get(`${this.apiPrefix}/system/user/list-all-simple`);
      
      console.log('[WorkOrderService] 用户精简信息列表响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('[WorkOrderService] 获取用户精简信息列表失败:', error);
      throw error;
    }
  };

  /**
   * 更新工单状态
   * @param {string} workOrderId - 工单ID
   * @param {string} status - 新状态 (open/in_progress/resolved/closed)
   * @param {string} comment - 状态变更备注
   */
  updateWorkOrderStatus = async (workOrderId, status, comment = '') => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.put(`${this.apiPrefix}/workorder/${workOrderId}/status`, {
        status,
        comment
      });
      
      // 预留状态同步到Node-RED的功能
      await this.syncStatusToNodeRED(workOrderId, status, comment);
      
      return response.data;
    } catch (error) {
      console.error('更新工单状态失败:', error);
      throw error;
    }
  };



  /**
   * 获取工单历史记录（使用工单日志接口）
   * @param {string} workOrderId - 工单ID
   */
  getWorkOrderHistory = async (workOrderId) => {
    try {
      // 使用工单日志接口获取历史记录
      return await this.getWorkOrderLogs(workOrderId);
    } catch (error) {
      console.error('获取工单历史记录失败:', error);
      throw error;
    }
  };

  /**
   * 错误处理方法
   * @param {Error} error - 错误对象
   */
  handleError = (error) => {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(data.msg || `请求失败 (${status})`);
    }
    return new Error('网络连接失败');
  };

  /**
   * 添加工单评论
   * @param {string} workOrderId - 工单ID
   * @param {string} comment - 评论内容
   * @param {Array} attachments - 附件列表
   */
  addWorkOrderComment = async (workOrderId, comment, attachments = []) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/${workOrderId}/comments`, {
        comment,
        attachments
      });
      return response.data;
    } catch (error) {
      console.error('添加工单评论失败:', error);
      throw error;
    }
  };

  /**
   * 获取工单评论列表
   * @param {string} workOrderId - 工单ID
   */
  getWorkOrderComments = async (workOrderId) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.get(`${this.apiPrefix}/workorder/${workOrderId}/comments`);
      return response.data;
    } catch (error) {
      console.error('获取工单评论失败:', error);
      throw error;
    }
  };

  /**
   * 上传工单附件
   * @param {string} workOrderId - 工单ID
   * @param {Object} file - 文件对象
   */
  uploadWorkOrderAttachment = async (workOrderId, file) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workOrderId', workOrderId);
      
      const response = await axiosInstance.post(`${this.apiPrefix}/workorder/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('上传工单附件失败:', error);
      throw error;
    }
  };

  /**
   * 获取工单统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.groupBy - 分组方式 (status/priority/assignee/category)
   */
  getWorkOrderStats = async (params = {}) => {
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const response = await axiosInstance.get(`${this.apiPrefix}/workorder/stats`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('获取工单统计数据失败:', error);
      throw error;
    }
  };



  /**
   * 获取可分配的用户列表（使用正确的API端点）
   */
  getAssignableUsers = async () => {
    console.log('=== WorkOrderService.getAssignableUsers 调试开始 ===');
    console.log('开始时间:', new Date().toISOString());
    
    try {
      const axiosInstance = await this.setupInterceptors(this.createAxiosInstance());
      const apiPath = `${this.apiPrefix}/system/user/list-all-simple`;
      const fullUrl = `${this.baseURL}${apiPath}`;
      
      console.log('=== 可分配用户API请求信息 ===');
      console.log('Base URL:', this.baseURL);
      console.log('API Prefix:', this.apiPrefix);
      console.log('API Path:', apiPath);
      console.log('完整请求URL:', fullUrl);
      console.log('请求方法: GET');
      console.log('请求头:', axiosInstance.defaults.headers);
      
      console.log('发送请求...');
      const response = await axiosInstance.get(apiPath);
      
      console.log('=== 可分配用户API响应信息 ===');
      console.log('响应状态码:', response.status);
      console.log('响应状态文本:', response.statusText);
      console.log('响应头:', response.headers);
      console.log('响应数据:', response.data);
      console.log('响应数据类型:', typeof response.data);
      console.log('响应数据结构:', {
        hasCode: 'code' in (response.data || {}),
        hasData: 'data' in (response.data || {}),
        hasMessage: 'message' in (response.data || {})
      });
      
      console.log('=== WorkOrderService.getAssignableUsers 调试结束 ===');
      return response.data;
    } catch (error) {
      console.error('=== 获取可分配用户列表失败详细信息 ===');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      
      if (error.response) {
        console.error('HTTP错误响应:');
        console.error('- 状态码:', error.response.status);
        console.error('- 状态文本:', error.response.statusText);
        console.error('- 响应头:', error.response.headers);
        console.error('- 响应数据:', error.response.data);
        console.error('- 请求URL:', error.config?.url);
        console.error('- 请求方法:', error.config?.method);
        console.error('- 请求头:', error.config?.headers);
        console.error('- 请求数据:', error.config?.data);
      } else if (error.request) {
        console.error('网络请求错误:');
        console.error('- 请求对象:', error.request);
        console.error('- 可能原因: 网络连接问题、服务器无响应、超时等');
      } else {
        console.error('其他错误:', error.message);
      }
      
      console.error('错误堆栈:', error.stack);
      console.error('=== 可分配用户错误详情结束 ===');
      throw error;
    }
  };

  /**
   * 预留功能：同步状态信息到Node-RED
   * 用于调用微信公众号进行用户通知
   * @param {string} workOrderId - 工单ID
   * @param {string} status - 工单状态
   * @param {string} comment - 备注
   */
  syncStatusToNodeRED = async (workOrderId, status, comment) => {
    try {
      // TODO: 实现与Node-RED的集成
      // 这里预留接口，后续可以调用Node-RED的API
      // 用于触发微信公众号通知功能
      console.log('预留功能：同步状态到Node-RED', {
        workOrderId,
        status,
        comment,
        timestamp: new Date().toISOString()
      });
      
      // 示例实现（需要根据实际Node-RED配置调整）
      // const nodeRedInstance = this.createAxiosInstance();
      // await nodeRedInstance.post('/node-red/workorder/status-sync', {
      //   workOrderId,
      //   status,
      //   comment,
      //   timestamp: new Date().toISOString()
      // });
    } catch (error) {
      console.warn('同步状态到Node-RED失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  };
}

export default new WorkOrderService();