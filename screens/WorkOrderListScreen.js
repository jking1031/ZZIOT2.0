/**
 * 工单列表屏幕
 * 显示工单列表，支持筛选、搜索和状态管理
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import WorkOrderService from '../services/WorkOrderService';

const WorkOrderListScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors);
  
  // 状态管理
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigneeId: '',
    creatorId: ''
  });

  // 工单状态映射（中文）
  const statusMap = {
    // 数字状态码
    0: { label: '待处理', color: colors.warning },
    1: { label: '处理中', color: colors.info },
    2: { label: '已解决', color: colors.success },
    3: { label: '已关闭', color: colors.textSecondary },
    // 英文状态值
    pending: { label: '待处理', color: colors.warning },
    assigned: { label: '已指派', color: colors.info },
    processing: { label: '处理中', color: colors.info },
    finished: { label: '已完成', color: colors.success },
    closed: { label: '已关闭', color: colors.textSecondary },
    returned: { label: '退回重处理', color: colors.error },
    // 兼容旧的状态值
    open: { label: '待处理', color: colors.warning },
    in_progress: { label: '处理中', color: colors.info },
    resolved: { label: '已解决', color: colors.success }
  };

  // 优先级映射
  const priorityMap = {
    low: { label: '低', color: colors.success },
    medium: { label: '中', color: colors.warning },
    high: { label: '高', color: colors.error },
    urgent: { label: '紧急', color: colors.error }
  };

  // 获取工单列表
  const fetchWorkOrders = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
      } else if (page === 1) {
        setLoading(true);
      }

      const params = {
        pageNum: page,
        pageSize: 20,
        keyword: searchText,
        ...filters
      };

      const response = await WorkOrderService.getWorkOrders(params);
      
      console.log('=== WorkOrderListScreen 调试信息 ===');
      console.log('API响应:', JSON.stringify(response, null, 2));
      console.log('响应类型:', typeof response);
      console.log('响应code:', response?.code);
      console.log('响应data:', response?.data);
      console.log('=== 调试信息结束 ===');
      
      // 根据实际API响应格式处理数据
      // API返回格式: {code: 0, data: {list: [...], total: number}, msg: ""}
      if (response && response.code === 0) {
        const newWorkOrders = response.data?.list || [];
        const total = response.data?.total || 0;
        
        console.log('=== 工单数据处理 ===');
        console.log('工单列表:', newWorkOrders);
        console.log('工单数量:', newWorkOrders.length);
        console.log('总数:', total);
        console.log('=== 数据处理结束 ===');
        
        // 获取用户信息并映射assignToId为用户姓名
        const workOrdersWithUserNames = await Promise.all(
          newWorkOrders.map(async (workOrder) => {
            try {
              if (workOrder.assignToId) {
                const userResponse = await WorkOrderService.getUserDetail(workOrder.assignToId);
                if (userResponse && userResponse.code === 0 && userResponse.data) {
                  return {
                    ...workOrder,
                    assignToName: userResponse.data.nickname || userResponse.data.username || '未知用户'
                  };
                }
              }
              return {
                ...workOrder,
                assignToName: workOrder.assignToId ? '用户ID: ' + workOrder.assignToId : '未分配'
              };
            } catch (error) {
              console.error('获取用户信息失败:', error);
              return {
                ...workOrder,
                assignToName: workOrder.assignToId ? '用户ID: ' + workOrder.assignToId : '未分配'
              };
            }
          })
        );
        
        if (page === 1) {
          setWorkOrders(workOrdersWithUserNames);
        } else {
          setWorkOrders(prev => [...prev, ...workOrdersWithUserNames]);
        }
        
        setTotalCount(total);
        setHasMore(newWorkOrders.length === 20);
        setCurrentPage(page);
      } else {
        console.error('API响应格式错误或失败:', response);
        Alert.alert('错误', response?.msg || '获取工单列表失败');
      }
    } catch (error) {
      console.error('获取工单列表失败:', error);
      Alert.alert('错误', '获取工单列表失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, filters]);

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      fetchWorkOrders(1);
    }, [fetchWorkOrders])
  );

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== undefined) {
        fetchWorkOrders(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // 筛选变化时重新加载
  useEffect(() => {
    fetchWorkOrders(1);
  }, [filters]);

  // 下拉刷新
  const onRefresh = useCallback(() => {
    fetchWorkOrders(1, true);
  }, [fetchWorkOrders]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchWorkOrders(currentPage + 1);
    }
  }, [loading, hasMore, currentPage, fetchWorkOrders]);

  // 更新工单状态
  const updateWorkOrderStatus = async (workOrderId, newStatus) => {
    try {
      const response = await WorkOrderService.updateWorkOrderStatus(workOrderId, newStatus);
      if (response && response.code === 0) {
        // 更新本地状态
        setWorkOrders(prev => 
          prev.map(item => 
            item.id === workOrderId 
              ? { ...item, status: newStatus }
              : item
          )
        );
        Alert.alert('成功', '工单状态已更新');
      }
    } catch (error) {
      console.error('更新工单状态失败:', error);
      Alert.alert('错误', '更新工单状态失败，请重试');
    }
  };

  // 渲染工单项
  const renderWorkOrderItem = ({ item }) => {
    console.log('=== 渲染工单项 ===');
    console.log('工单数据:', JSON.stringify(item, null, 2));
    console.log('=== 渲染结束 ===');
    
    const status = statusMap[item.status] || { label: item.status, color: colors.textSecondary };
    const priority = priorityMap[item.priority] || { label: item.priority, color: colors.textSecondary };
    
    return (
      <TouchableOpacity
        style={[styles.workOrderItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('工单详情', { id: item.id })}
      >
        <View style={styles.workOrderHeader}>
          <Text style={[styles.workOrderTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title || '无标题'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.workOrderDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description || '无描述'}
        </Text>
        
        <View style={styles.workOrderMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="flag" size={14} color={priority.color} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{priority.label}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.assignToName ? `分配给: ${item.assignToName}` : '未分配'}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="time" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.createTime ? new Date(item.createTime).toLocaleDateString() : '无日期'}
            </Text>
          </View>
        </View>
        
        {item.deadline && (
          <View style={styles.dueDateContainer}>
            <Ionicons name="calendar" size={14} color={colors.warning} />
            <Text style={[styles.dueDateText, { color: colors.warning }]}>
              截止: {new Date(item.deadline).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // 渲染筛选模态框
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>筛选工单</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* 状态筛选 */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>状态</Text>
            <View style={styles.filterOptions}>
              {Object.entries(statusMap).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    filters.status === key && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, status: prev.status === key ? '' : key }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filters.status === key ? colors.surface : colors.text }
                  ]}>
                    {value.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* 优先级筛选 */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>优先级</Text>
            <View style={styles.filterOptions}>
              {Object.entries(priorityMap).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    filters.priority === key && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, priority: prev.priority === key ? '' : key }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filters.priority === key ? colors.surface : colors.text }
                  ]}>
                    {value.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={() => setFilters({ status: '', priority: '', assigneeId: '', creatorId: '' })}
            >
              <Text style={[styles.resetButtonText, { color: colors.text }]}>重置</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>应用</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 渲染空状态
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        暂无工单数据
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('工单创建')}
      >
        <Text style={styles.createButtonText}>创建工单</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* 搜索和筛选栏 */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索工单标题或描述"
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.primary }]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color={colors.surface} />
        </TouchableOpacity>
      </View>
      
      {/* 统计信息 */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>共 {totalCount} 个工单</Text>
      </View>
      
      {/* 工单列表 */}
      {loading && workOrders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={workOrders}
          renderItem={renderWorkOrderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={workOrders.length === 0 ? styles.emptyContainer : styles.listContainer}
        />
      )}
      
      {/* 创建工单按钮 */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('工单创建')}
      >
        <Ionicons name="add" size={24} color={colors.surface} />
      </TouchableOpacity>
      
      {/* 筛选模态框 */}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.md,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    marginRight: DesignTokens.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: DesignTokens.spacing.sm,
    fontSize: DesignTokens.typography.sizes.md,
  },
  filterButton: {
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
  },
  statsContainer: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.sm,
    borderBottomWidth: 1,
  },
  statsText: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
  listContainer: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  workOrderItem: {
    padding: DesignTokens.spacing.lg,
    marginVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  workOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DesignTokens.spacing.sm,
  },
  workOrderTitle: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.weights.semibold,
    marginRight: DesignTokens.spacing.md,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.sm,
  },
  statusText: {
    color: '#fff',
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  workOrderDescription: {
    fontSize: DesignTokens.typography.sizes.md,
    lineHeight: DesignTokens.typography.lineHeights.normal * DesignTokens.typography.sizes.md,
    marginBottom: DesignTokens.spacing.md,
  },
  workOrderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    fontSize: DesignTokens.typography.sizes.sm,
    marginLeft: DesignTokens.spacing.xs,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: DesignTokens.typography.sizes.sm,
    marginLeft: DesignTokens.spacing.xs,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  fab: {
    position: 'absolute',
    right: DesignTokens.spacing.lg,
    bottom: DesignTokens.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.xl,
  },
  emptyStateText: {
    fontSize: DesignTokens.typography.sizes.lg,
    marginTop: DesignTokens.spacing.lg,
    marginBottom: DesignTokens.spacing.xl,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: DesignTokens.spacing.xl,
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
  },
  createButtonText: {
    color: '#fff',
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: DesignTokens.borderRadius.xl,
    borderTopRightRadius: DesignTokens.borderRadius.xl,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: DesignTokens.spacing.lg,
  },
  modalTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  filterSection: {
    marginBottom: DesignTokens.spacing.xl,
  },
  filterLabel: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.weights.medium,
    marginBottom: DesignTokens.spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DesignTokens.spacing.sm,
  },
  filterOption: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: DesignTokens.typography.sizes.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: DesignTokens.spacing.lg,
  },
  resetButton: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    marginRight: DesignTokens.spacing.md,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  applyButton: {
    flex: 1,
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
  },
});

export default WorkOrderListScreen;