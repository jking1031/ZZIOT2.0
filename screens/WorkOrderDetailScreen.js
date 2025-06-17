/**
 * 工单详情屏幕
 * 显示工单详细信息，支持状态更新等操作
 * 不包含工单分类和工单评论功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import WorkOrderService from '../services/WorkOrderService';
import { usePermissionControl } from '../hooks/usePermissionControl';

const WorkOrderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissionControl();
  const commonStyles = createCommonStyles(colors);
  
  const { id } = route.params;
  
  // 状态管理
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [workOrderLogs, setWorkOrderLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // 工单状态颜色映射
  const getStatusColor = (status) => {
    const statusColors = {
      'pending': colors.warning,
      'in_progress': colors.primary,
      'completed': colors.success,
      'cancelled': colors.error,
      'on_hold': colors.text.secondary
    };
    return statusColors[status] || colors.text.secondary;
  };

  // 优先级颜色映射
  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': colors.success,
      'medium': colors.warning,
      'high': colors.error,
      'urgent': colors.error
    };
    return priorityColors[priority] || colors.text.secondary;
  };

  // 加载工单详情
  const loadWorkOrderDetail = useCallback(async (isRefresh = false) => {
    console.log('=== 工单详情页面 - 加载工单详情调试开始 ===');
    console.log('工单ID:', id);
    console.log('是否刷新:', isRefresh);
    console.log('开始时间:', new Date().toISOString());
    
    try {
      if (isRefresh) {
        setRefreshing(true);
        console.log('设置刷新状态为true');
      } else {
        setLoading(true);
        console.log('设置加载状态为true');
      }
      
      console.log('=== 准备调用工单详情API ===');
      console.log('API名称: getWorkOrderDetail');
      console.log('工单ID:', id);
      console.log('是否刷新:', isRefresh);
      console.log('调用时间:', new Date().toISOString());
      
      const detailRes = await WorkOrderService.getWorkOrderDetail(id);
      
      console.log('=== 工单详情API响应分析 ===');
      console.log('响应对象:', detailRes);
      console.log('响应代码:', detailRes?.code);
      console.log('响应数据存在:', !!detailRes?.data);
      if (detailRes?.data) {
        console.log('工单数据:', {
          id: detailRes.data.id,
          title: detailRes.data.title,
          status: detailRes.data.status,
          priority: detailRes.data.priority,
          creatorId: detailRes.data.creatorId,
          assignToId: detailRes.data.assignToId,
          createTime: detailRes.data.createTime
        });
      }
      
      if (detailRes.code === 0) {
        setWorkOrder(detailRes.data);
        console.log('成功设置工单数据到状态');
      } else {
        console.warn('工单详情API返回非0状态码:', detailRes.code);
        console.warn('API错误信息:', detailRes.msg);
      }
    } catch (error) {
      console.error('=== 加载工单详情失败详细信息 ===');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      if (error.response) {
        console.error('HTTP响应状态码:', error.response.status);
        console.error('HTTP响应状态文本:', error.response.statusText);
        console.error('HTTP响应头:', error.response.headers);
        console.error('HTTP响应数据:', error.response.data);
        console.error('请求配置URL:', error.config?.url);
        console.error('请求配置方法:', error.config?.method);
        console.error('请求配置头:', error.config?.headers);
      } else if (error.request) {
        console.error('请求对象:', error.request);
        console.error('可能是网络错误或请求超时');
      } else {
        console.error('其他错误:', error.message);
      }
      console.error('错误堆栈:', error.stack);
      console.error('=== 工单详情错误详情结束 ===');
      
      Alert.alert('错误', '加载工单详情失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('重置加载和刷新状态为false');
      console.log('=== 工单详情页面 - 加载工单详情调试结束 ===');
      console.log('结束时间:', new Date().toISOString());
    }
  }, [id]);

  // 加载选项数据
  const loadOptions = useCallback(async () => {
    console.log('=== 工单详情页面 - 加载选项数据调试开始 ===');
    console.log('开始时间:', new Date().toISOString());
    
    try {
      console.log('准备调用API:');
      console.log('1. getAssignableUsers - 获取可分配用户列表');
      
      const usersRes = await WorkOrderService.getAssignableUsers().catch(error => {
        console.error('=== getAssignableUsers API调用失败 ===');
        console.error('错误类型:', error.constructor.name);
        console.error('错误消息:', error.message);
        if (error.response) {
          console.error('响应状态码:', error.response.status);
          console.error('响应状态文本:', error.response.statusText);
          console.error('响应头:', error.response.headers);
          console.error('响应数据:', error.response.data);
          console.error('请求URL:', error.config?.url);
          console.error('请求方法:', error.config?.method);
          console.error('请求头:', error.config?.headers);
        } else if (error.request) {
          console.error('请求对象:', error.request);
          console.error('网络错误或超时');
        }
        console.error('=== getAssignableUsers 错误详情结束 ===');
        return { code: 500, data: [], error: error.message };
      });
      
      console.log('=== API调用结果分析 ===');
      console.log('getAssignableUsers 响应:', {
        code: usersRes?.code,
        dataLength: usersRes?.data?.length || 0,
        hasError: !!usersRes?.error
      });
      
      if (usersRes.code === 0) {
        setAssignableUsers(usersRes.data || []);
        console.log('成功设置可分配用户数据，数量:', usersRes.data?.length || 0);
      } else {
        console.warn('可分配用户API调用失败，状态码:', usersRes.code, '使用空数组');
        setAssignableUsers([]);
      }
      
    } catch (error) {
      console.error('=== 加载选项数据总体失败 ===');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
      console.error('=== 总体错误详情结束 ===');
    }
    
    console.log('=== 工单详情页面 - 加载选项数据调试结束 ===');
    console.log('结束时间:', new Date().toISOString());
  }, []);

  // 处理comment中的用户ID，替换为用户姓名
  const processCommentUserIds = async (comment) => {
    if (!comment) return comment;
    
    // 匹配"用户ID: 数字"的模式
    const userIdPattern = /用户ID:\s*(\d+)/g;
    let processedComment = comment;
    const matches = [...comment.matchAll(userIdPattern)];
    
    for (const match of matches) {
      const userId = match[1];
      try {
        const userResponse = await WorkOrderService.getUserDetail(userId);
        if (userResponse && userResponse.code === 0 && userResponse.data) {
          const userName = userResponse.data.nickname || userResponse.data.username || '未知用户';
          processedComment = processedComment.replace(match[0], userName);
        }
      } catch (error) {
        console.error('获取comment中用户信息失败:', error);
      }
    }
    
    return processedComment;
  };

  // 加载工单日志
  const loadWorkOrderLogs = useCallback(async () => {
    console.log('=== WorkOrderDetailScreen.loadWorkOrderLogs 调试开始 ===');
    console.log('工单ID:', id);
    console.log('开始时间:', new Date().toISOString());
    
    setLogsLoading(true);
    try {
      console.log('=== 准备调用工单日志API ===');
      console.log('API名称: getWorkOrderLogs');
      console.log('调用时间:', new Date().toISOString());
      
      const logsResponse = await WorkOrderService.getWorkOrderLogs(id);
      
      console.log('=== 工单日志API调用成功 ===');
      console.log('响应数据:', logsResponse);
      console.log('成功时间:', new Date().toISOString());
      
      // 处理响应数据
      if (logsResponse && logsResponse.code === 0 && logsResponse.data) {
        // 获取用户信息并映射operatorId为用户姓名，同时处理comment中的用户ID
        const logsWithUserNames = await Promise.all(
          logsResponse.data.map(async (log) => {
            try {
              let processedLog = { ...log };
              
              // 处理操作人姓名
              if (log.operatorId) {
                const userResponse = await WorkOrderService.getUserDetail(log.operatorId);
                if (userResponse && userResponse.code === 0 && userResponse.data) {
                  processedLog.operatorName = userResponse.data.nickname || userResponse.data.username || '未知用户';
                } else {
                  processedLog.operatorName = '用户ID: ' + log.operatorId;
                }
              } else {
                processedLog.operatorName = '未知操作人';
              }
              
              // 处理comment中的用户ID
              if (log.comment) {
                processedLog.comment = await processCommentUserIds(log.comment);
              }
              
              return processedLog;
            } catch (error) {
              console.error('获取日志用户信息失败:', error);
              return {
                ...log,
                operatorName: log.operatorId ? '用户ID: ' + log.operatorId : '未知操作人'
              };
            }
          })
        );
        
        setWorkOrderLogs(logsWithUserNames);
        console.log('设置工单日志数据（含用户姓名）:', logsWithUserNames);
      } else {
        console.warn('工单日志API调用失败，状态码:', logsResponse?.code);
        setWorkOrderLogs([]);
      }
      
      console.log('=== WorkOrderDetailScreen.loadWorkOrderLogs 调试结束 ===');
      console.log('结束时间:', new Date().toISOString());
    } catch (error) {
      console.error('=== loadWorkOrderLogs 加载失败详细信息 ===');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      
      if (error.response) {
        console.error('HTTP错误响应详情:');
        console.error('- 状态码:', error.response.status);
        console.error('- 状态文本:', error.response.statusText);
        console.error('- 响应头:', error.response.headers);
        console.error('- 响应数据:', error.response.data);
      }
      
      if (error.config) {
        console.error('请求配置详情:');
        console.error('- 请求URL:', error.config.url);
        console.error('- 请求方法:', error.config.method);
        console.error('- 请求头:', error.config.headers);
      }
      
      if (error.request) {
        console.error('请求对象:', error.request);
      }
      
      console.error('错误堆栈:', error.stack);
      console.error('=== loadWorkOrderLogs 错误详情结束 ===');
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkOrderDetail();
    loadOptions();
    loadWorkOrderLogs();
  }, [loadWorkOrderDetail, loadOptions, loadWorkOrderLogs]);

  // 更新工单状态
  const handleUpdateStatus = useCallback(async () => {
    if (!selectedStatus) {
      Alert.alert('提示', '请选择状态');
      return;
    }
    
    try {
      const response = await WorkOrderService.updateWorkOrderStatus(id, selectedStatus);
      if (response.code === 0) {
        Alert.alert('成功', '工单状态已更新');
        setStatusModalVisible(false);
        setSelectedStatus('');
        loadWorkOrderDetail(true);
      } else {
        Alert.alert('错误', response.msg || '更新工单状态失败，请重试');
      }
    } catch (error) {
      console.error('更新工单状态失败:', error);
      Alert.alert('错误', '更新工单状态失败，请重试');
    }
  }, [id, selectedStatus, loadWorkOrderDetail]);

  // 指派工单
  const handleAssignWorkOrder = useCallback(async () => {
    if (!selectedAssignee) {
      Alert.alert('提示', '请选择处理人');
      return;
    }
    
    try {
      console.log('开始指派工单:', { id, selectedAssignee });
      const response = await WorkOrderService.assignWorkOrder(id, selectedAssignee, '');
      console.log('指派工单响应:', response);
      if (response.code === 0) {
        Alert.alert('成功', '工单已指派');
        setAssignModalVisible(false);
        setSelectedAssignee('');
        loadWorkOrderDetail(true);
        loadWorkOrderLogs();
      } else {
        console.log('指派工单失败，响应码:', response.code);
        Alert.alert('错误', response.msg || '指派工单失败，请重试');
      }
    } catch (error) {
      console.error('指派工单失败:', error);
      Alert.alert('错误', '指派工单失败，请重试');
    }
  }, [id, selectedAssignee, loadWorkOrderDetail, loadWorkOrderLogs]);

  // 处理工单
  const handleProcessWorkOrder = useCallback(() => {
    Alert.prompt(
      '处理工单',
      '请输入处理备注：',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async (comment) => {
            try {
              const response = await WorkOrderService.processWorkOrder(id, { comment });
              if (response.code === 0) {
                Alert.alert('成功', '工单处理成功');
                loadWorkOrderDetail(true);
                loadWorkOrderLogs();
              } else {
                Alert.alert('错误', response.msg || '处理工单失败，请重试');
              }
            } catch (error) {
              console.error('处理工单失败:', error);
              Alert.alert('错误', '处理工单失败，请重试');
            }
          }
        }
      ],
      'plain-text'
    );
  }, [id, loadWorkOrderDetail, loadWorkOrderLogs]);

  // 完成工单
  const handleFinishWorkOrder = useCallback(() => {
    Alert.prompt(
      '完成工单',
      '请输入完成备注：',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async (comment) => {
            try {
              const response = await WorkOrderService.finishWorkOrder(id, comment);
              if (response.code === 0) {
                Alert.alert('成功', '工单已完成');
                loadWorkOrderDetail(true);
                loadWorkOrderLogs();
              } else {
                Alert.alert('错误', response.msg || '完成工单失败，请重试');
              }
            } catch (error) {
              console.error('完成工单失败:', error);
              Alert.alert('错误', '完成工单失败，请重试');
            }
          }
        }
      ],
      'plain-text'
    );
  }, [id, loadWorkOrderDetail, loadWorkOrderLogs]);

  // 关闭工单
  const handleCloseWorkOrder = useCallback(() => {
    Alert.prompt(
      '关闭工单',
      '请输入关闭备注：',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async (comment) => {
            try {
              const response = await WorkOrderService.closeWorkOrder(id, comment);
              if (response.code === 0) {
                Alert.alert('成功', '工单已关闭');
                loadWorkOrderDetail(true);
                loadWorkOrderLogs();
              } else {
                Alert.alert('错误', response.msg || '关闭工单失败，请重试');
              }
            } catch (error) {
              console.error('关闭工单失败:', error);
              Alert.alert('错误', '关闭工单失败，请重试');
            }
          }
        }
      ],
      'plain-text'
    );
  }, [id, loadWorkOrderDetail, loadWorkOrderLogs]);

  // 退回工单
  const handleReturnWorkOrder = useCallback(() => {
    Alert.prompt(
      '退回工单',
      '请输入退回原因：',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async (comment) => {
            try {
              const response = await WorkOrderService.returnWorkOrder(id, comment);
              if (response.code === 0) {
                Alert.alert('成功', '工单已退回');
                loadWorkOrderDetail(true);
                loadWorkOrderLogs();
              } else {
                Alert.alert('错误', response.msg || '退回工单失败，请重试');
              }
            } catch (error) {
              console.error('退回工单失败:', error);
              Alert.alert('错误', '退回工单失败，请重试');
            }
          }
        }
      ],
      'plain-text'
    );
  }, [id, loadWorkOrderDetail, loadWorkOrderLogs]);



  // 删除工单
  const handleDeleteWorkOrder = useCallback(() => {
    Alert.alert(
      '确认删除',
      '确定要删除这个工单吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await WorkOrderService.deleteWorkOrder(id);
              if (response.code === 0) {
                Alert.alert('成功', '工单删除成功');
                navigation.goBack();
              } else {
                Alert.alert('错误', response.msg || '删除工单失败，请重试');
              }
            } catch (error) {
              Alert.alert('错误', '删除工单失败，请重试');
            }
          }
        }
      ]
    );
  }, [id, navigation]);

  // 打开附件
  const handleOpenAttachment = useCallback((url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('错误', '无法打开附件');
    });
  }, []);

  // 检查是否可以编辑
  const canEdit = useCallback(() => {
    return isAdmin() || isSuperAdmin() || workOrder?.creatorId === user?.id;
  }, [isAdmin, isSuperAdmin, workOrder, user]);

  // 检查是否可以操作状态
  const canManageStatus = useCallback(() => {
    return isAdmin() || isSuperAdmin() || workOrder?.assigneeId === user?.id;
  }, [isAdmin, isSuperAdmin, workOrder, user]);

  // 检查是否可以指派工单
  const canAssignWorkOrder = useCallback(() => {
    if (!workOrder) return false;
    // 管理员可以指派
    if (isAdmin() || isSuperAdmin()) return true;
    // 部门管理员可以指派同部门创建的工单
    // TODO: 需要实现部门管理员权限检查
    return false;
  }, [isAdmin, isSuperAdmin, workOrder]);

  // 检查是否可以处理工单
  const canProcessWorkOrder = useCallback(() => {
    if (!workOrder || !user) return false;
    // 只有被指派的用户可以处理
    return workOrder.assigneeId === user.id && workOrder.status === 'assigned';
  }, [workOrder, user]);

  // 检查是否可以完成工单
  const canFinishWorkOrder = useCallback(() => {
    if (!workOrder || !user) return false;
    // 只有被指派的用户在处理状态下可以完成
    return workOrder.assigneeId === user.id && workOrder.status === 'processing';
  }, [workOrder, user]);

  // 检查是否可以关闭工单
  const canCloseWorkOrder = useCallback(() => {
    if (!workOrder) return false;
    // 管理员可以关闭已完成的工单
    if ((isAdmin() || isSuperAdmin()) && workOrder.status === 'finished') return true;
    // 部门管理员可以关闭同部门的已完成工单
    // TODO: 需要实现部门管理员权限检查
    return false;
  }, [isAdmin, isSuperAdmin, workOrder]);

  // 检查是否可以退回工单
  const canReturnWorkOrder = useCallback(() => {
    if (!workOrder) return false;
    // 管理员可以退回工单
    if (isAdmin() || isSuperAdmin()) return true;
    // 部门管理员可以退回同部门的工单
    // TODO: 需要实现部门管理员权限检查
    // 被指派的用户可以退回工单
    if (workOrder.assigneeId === user?.id) return true;
    return false;
  }, [isAdmin, isSuperAdmin, workOrder, user]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>加载中...</Text>
      </View>
    );
  }

  if (!workOrder) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text.primary }]}>工单不存在</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.surface }]}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWorkOrderDetail(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* 工单基本信息 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{workOrder.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(workOrder.status) }]}>
              <Text style={styles.statusText}>{workOrder.statusName}</Text>
            </View>
          </View>
          
          <Text style={[styles.description, { color: colors.text.secondary }]}>
            {workOrder.description}
          </Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.metaRow}>
              <Ionicons name="flag-outline" size={16} color={getPriorityColor(workOrder.priority)} />
              <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>优先级:</Text>
              <Text style={[styles.metaValue, { color: colors.text.primary }]}>{workOrder.priorityName}</Text>
            </View>
            

            
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>创建人:</Text>
              <Text style={[styles.metaValue, { color: colors.text.primary }]}>{workOrder.creatorName}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Ionicons name="person-circle-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>处理人:</Text>
              <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                {workOrder.assignToName || '未分配'}
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>创建时间:</Text>
              <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                {workOrder.createTime ? new Date(workOrder.createTime).toLocaleString('zh-CN') : '未知'}
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>更新时间:</Text>
              <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                {workOrder.updateTime ? new Date(workOrder.updateTime).toLocaleString('zh-CN') : '未知'}
              </Text>
            </View>
            
            {workOrder.deadline && (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.warning} />
                <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>截止时间:</Text>
                <Text style={[styles.metaValue, { color: colors.warning }]}>
                  {new Date(workOrder.deadline).toLocaleString('zh-CN')}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* 附件列表 */}
        {workOrder.attachments && workOrder.attachments.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>附件</Text>
            {workOrder.attachments.map((attachmentUrl, index) => {
              const fileName = attachmentUrl.split('/').pop() || `附件${index + 1}`;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.attachmentItem, { borderColor: colors.border }]}
                  onPress={() => handleOpenAttachment(attachmentUrl)}
                >
                  <Ionicons name="document-outline" size={20} color={colors.primary} />
                  <Text style={[styles.attachmentName, { color: colors.text.primary }]}>
                    {fileName}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        
        {/* 工单日志 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>工单日志</Text>
            <TouchableOpacity onPress={loadWorkOrderLogs} disabled={logsLoading}>
              <Ionicons 
                name={logsLoading ? "refresh" : "refresh-outline"} 
                size={20} 
                color={colors.primary} 
                style={logsLoading ? { transform: [{ rotate: '180deg' }] } : {}}
              />
            </TouchableOpacity>
          </View>
          
          {logsLoading ? (
            <View style={styles.logsLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.logsLoadingText, { color: colors.text.secondary }]}>加载日志中...</Text>
            </View>
          ) : workOrderLogs.length > 0 ? (
            <View style={styles.logsContainer}>
              {workOrderLogs.map((log, index) => {
                const actionMap = {
                  'create': '创建工单',
                  'assign': '分配工单',
                  'update': '更新工单',
                  'complete': '完成工单',
                  'close': '关闭工单',
                  'reject': '拒绝工单',
                  'return': '退回工单'
                };
                const actionText = actionMap[log.action] || log.action;
                
                return (
                  <View key={index} style={[styles.logItem, { borderLeftColor: colors.primary }]}>
                    <View style={styles.logHeader}>
                      <Text style={[styles.logAction, { color: colors.text.primary }]}>{actionText}</Text>
                      <Text style={[styles.logTime, { color: colors.text.secondary }]}>
                        {log.operationTime ? new Date(log.operationTime).toLocaleString('zh-CN') : '未知时间'}
                      </Text>
                    </View>
                    <Text style={[styles.logOperator, { color: colors.text.secondary }]}>操作人: {log.operatorName}</Text>
                    {log.comment && (
                      <Text style={[styles.logRemark, { color: colors.text.primary }]}>备注: {log.comment}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyLogsContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.disabled} />
              <Text style={[styles.emptyLogsText, { color: colors.text.secondary }]}>暂无日志记录</Text>
            </View>
          )}
        </View>

      </ScrollView>
      
      {/* 操作按钮 */}
      <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {canAssignWorkOrder() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
            onPress={() => setAssignModalVisible(true)}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>指派</Text>
          </TouchableOpacity>
        )}
        
        {canProcessWorkOrder() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.info }]}
            onPress={handleProcessWorkOrder}
          >
            <Ionicons name="play-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>处理</Text>
          </TouchableOpacity>
        )}
        
        {canFinishWorkOrder() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={handleFinishWorkOrder}
          >
            <Ionicons name="checkmark-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>完成</Text>
          </TouchableOpacity>
        )}
        
        {canEdit() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('WorkOrderEdit', { id })}
          >
            <Ionicons name="create-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>编辑</Text>
          </TouchableOpacity>
        )}
        
        {canEdit() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={handleDeleteWorkOrder}
          >
            <Ionicons name="trash-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>删除</Text>
          </TouchableOpacity>
        )}
        
        {canCloseWorkOrder() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.textSecondary }]}
            onPress={handleCloseWorkOrder}
          >
            <Ionicons name="close-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>关闭</Text>
          </TouchableOpacity>
        )}
        
        {canReturnWorkOrder() && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
            onPress={handleReturnWorkOrder}
          >
            <Ionicons name="return-up-back-outline" size={16} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>退回</Text>
          </TouchableOpacity>
        )}
      </View>
      

      
      {/* 状态更新模态框 */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>更新状态</Text>
            <TouchableOpacity onPress={handleUpdateStatus}>
              <Text style={[styles.modalConfirmText, { color: colors.primary }]}>确定</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {statuses.map(status => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.optionItem,
                  { backgroundColor: selectedStatus === status.value ? colors.primary : colors.surface }
                ]}
                onPress={() => setSelectedStatus(status.value)}
              >
                <Text style={[
                  styles.optionText,
                  { color: selectedStatus === status.value ? colors.surface : colors.text.primary }
                ]}>
                  {status.label}
                </Text>
                {selectedStatus === status.value && (
                  <Ionicons name="checkmark" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      
      {/* 指派模态框 */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>指派工单</Text>
            <TouchableOpacity onPress={handleAssignWorkOrder}>
              <Text style={[styles.modalConfirmText, { color: colors.primary }]}>确定</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {assignableUsers.length > 0 ? assignableUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.optionItem,
                  { backgroundColor: selectedAssignee === user.id ? colors.primary : colors.surface }
                ]}
                onPress={() => setSelectedAssignee(user.id)}
              >
                <View style={styles.userOptionContent}>
                  <Text style={[
                    styles.optionText,
                    { color: selectedAssignee === user.id ? colors.surface : colors.text.primary }
                  ]}>
                    {user.nickname}
                  </Text>
                  {user.deptName && (
                    <Text style={[
                      styles.userDeptText,
                      { color: selectedAssignee === user.id ? colors.surface : colors.text.secondary }
                    ]}>
                      {user.deptName}
                    </Text>
                  )}
                </View>
                {selectedAssignee === user.id && (
                  <Ionicons name="checkmark" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            )) : (
              <View style={styles.emptyUsersContainer}>
                <Text style={[styles.emptyUsersText, { color: colors.text.secondary }]}>暂无可指派用户</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DesignTokens.spacing.xl,
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.lg,
    marginTop: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.xl,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: DesignTokens.spacing.xl,
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
  },
  backButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  section: {
    margin: DesignTokens.spacing.md,
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.lg,
    ...DesignTokens.shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DesignTokens.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: DesignTokens.typography.weights.bold,
    marginRight: DesignTokens.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  description: {
    fontSize: DesignTokens.typography.sizes.md,
    lineHeight: DesignTokens.typography.lineHeights.normal * DesignTokens.typography.sizes.md,
    marginBottom: DesignTokens.spacing.lg,
  },
  metaInfo: {
    gap: DesignTokens.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
  },
  metaLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    minWidth: 60,
  },
  metaValue: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
    flex: 1,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.weights.semibold,
    marginBottom: DesignTokens.spacing.md,
  },

  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: DesignTokens.spacing.sm,
    gap: DesignTokens.spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
  },

  actionBar: {
    flexDirection: 'row',
    padding: DesignTokens.spacing.md,
    borderTopWidth: 1,
    gap: DesignTokens.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    gap: DesignTokens.spacing.xs,
  },
  actionButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  modalCancelText: {
    fontSize: DesignTokens.typography.sizes.md,
  },
  modalConfirmText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  modalContent: {
    flex: 1,
    padding: DesignTokens.spacing.lg,
  },

  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: DesignTokens.spacing.sm,
  },
  optionText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  
  // 工单日志样式
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.md,
  },
  logsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: DesignTokens.spacing.lg,
    gap: DesignTokens.spacing.sm,
  },
  logsLoadingText: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
  logsContainer: {
    gap: DesignTokens.spacing.sm,
  },
  logItem: {
    padding: DesignTokens.spacing.md,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: DesignTokens.borderRadius.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.xs,
  },
  logAction: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  logTime: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
  logOperator: {
    fontSize: DesignTokens.typography.sizes.sm,
    marginBottom: DesignTokens.spacing.xs,
  },
  logRemark: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontStyle: 'italic',
  },
  emptyLogsContainer: {
    alignItems: 'center',
    padding: DesignTokens.spacing.xl,
    gap: DesignTokens.spacing.md,
  },
  emptyLogsText: {
    fontSize: DesignTokens.typography.sizes.md,
    textAlign: 'center',
  },
  
  // 用户选项样式
  userOptionContent: {
    flex: 1,
  },
  userDeptText: {
    fontSize: DesignTokens.typography.sizes.xs,
    marginTop: DesignTokens.spacing.xs,
  },
  emptyUsersContainer: {
    alignItems: 'center',
    padding: DesignTokens.spacing.xl,
  },
  emptyUsersText: {
    fontSize: DesignTokens.typography.sizes.md,
    textAlign: 'center',
  },
});

export default WorkOrderDetailScreen;