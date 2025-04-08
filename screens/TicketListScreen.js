import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles } from '../styles/StyleGuide';
import { getTickets, deleteTicket } from '../api/ticketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from '../api/config';
import { EventRegister } from '../utils/EventEmitter';
import { getAuthToken, refreshToken } from '../api/storage';

// 工单卡片组件
const TicketCard = ({ ticket, onPress, onDelete, isAdmin }) => {
  const { colors, isDarkMode } = useTheme();
  const statusColors = {
    pending: '#FFA000',    // 黄色
    approved: '#2196F3',   // 蓝色
    assigned: '#9C27B0',   // 紫色
    inProgress: '#4CAF50', // 绿色
    completed: '#8BC34A',  // 浅绿色
    rejected: '#F44336',   // 红色
    closed: '#9E9E9E'      // 灰色
  };
  
  // 删除工单确认
  const confirmDelete = () => {
    Alert.alert(
      '删除工单',
      `确定要删除工单 "${ticket.title}" 吗？此操作不可撤销。`,
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDelete(ticket.id)
        }
      ],
      { cancelable: true }
    );
  };
  
  // 获取状态显示名称
  const getStatusName = (status) => {
    const statusMap = {
      pending: '待审核',
      approved: '已审核',
      assigned: '已分配',
      inProgress: '处理中',
      completed: '已完成',
      completionReview: '部门审核通过',
      rejected: '已拒绝',
      closed: '已关闭'
    };
    return statusMap[status] || status;
  };
  
  // 获取角色名称
  const getRoleName = (roleId) => {
    const roleMap = {
      1: '管理员',
      2: '部门管理员',
      3: '运行班组',
      4: '化验班组',
      5: '机电班组',
      6: '污泥车间',
      7: '5000吨处理站',
      8: '附属设施',
      9: '备用权限'
    };
    return roleMap[roleId] || '未知角色';
  };
  
  // 处理不同的字段命名
  const title = ticket.title;
  const description = ticket.description;
  const status = ticket.status || "pending"; // 设置默认状态
  const createdAt = ticket.created_at || ticket.createdAt; // 同时支持snake_case和camelCase
  
  // 处理分配角色信息
  const assignedRole = ticket.assigned_to_role || 
                      (ticket.assignedTo && ticket.assignedTo.role) || 
                      null;

  // 创建者角色ID
  const creatorRole = ticket.creator_role || ticket.creatorRole;
  // 创建者ID
  const creatorId = ticket.creator_id || ticket.creatorId;
                      
  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={confirmDelete}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#F44336" />
            </TouchableOpacity>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColors[status] }]}>
            <Text style={styles.statusText}>{getStatusName(status)}</Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
        {description}
      </Text>
      
      <View style={styles.ticketFooter}>
        <View style={styles.metaContainer}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            创建: {new Date(createdAt).toLocaleDateString()}
          </Text>
          
          {creatorRole && (
            <View style={[styles.creatorBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.creatorBadgeText, { color: colors.textSecondary }]}>
                由 {getRoleName(creatorRole)} 创建
              </Text>
            </View>
          )}
        </View>
        
        {assignedRole && (
          <Text style={[styles.assignedText, { color: colors.primary }]}>
            {getRoleName(assignedRole)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const TicketListScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  
  const [activeTab, setActiveTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  
  // 获取工单列表
  useEffect(() => {
    fetchTickets();
  }, [activeTab, statusFilter]);
  
  const fetchTickets = async () => {
    if (refreshing) return;
    
    setLoading(true);
    try {
      // 根据不同的筛选器获取工单
      let filter = {};
      
      // 获取用户实际角色ID
      // 优先使用is_admin_value字段，如果is_admin是布尔值且is_admin_value存在
      let userRoleId = user.is_admin;
      if (typeof user.is_admin === 'boolean' && user.is_admin_value !== undefined) {
        userRoleId = user.is_admin_value;
        console.log(`使用is_admin_value作为用户角色ID: ${userRoleId}`);
      } else if (typeof user.is_admin === 'boolean') {
        // 如果只有布尔值，转换为合理的默认值
        userRoleId = user.is_admin === true ? 1 : 9;
        console.log(`将布尔型is_admin转换为角色ID: ${userRoleId}`);
      }
      
      // 主标签筛选
      if (activeTab === 'pending') {
        filter.status = 'pending';
      } else if (activeTab === 'approved') {
        filter.status = 'approved';
      } else if (activeTab === 'assigned') {
        // 使用正确的用户角色ID
        filter.assignedToRole = userRoleId;
        console.log(`查询分配给角色ID ${userRoleId} 的工单`);
      } else if (activeTab === 'created') {
        filter.creatorId = user.id;
      } 
      // 应用状态过滤器（当在全部工单标签下）
      else if (activeTab === 'all' && statusFilter) {
        filter.status = statusFilter;
      }
      
      const token = await getAuthToken();
      console.log('使用筛选条件获取工单:', filter);
      const response = await getTickets(filter, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // 修改这里: 检查返回格式并获取正确的工单数组
      if (response && response.success && Array.isArray(response.tickets)) {
        console.log(`获取到 ${response.tickets.length} 个工单`);
        setTickets(response.tickets);
      } else if (Array.isArray(response)) {
        console.log(`获取到 ${response.length} 个工单`);
        setTickets(response);
      } else {
        console.warn('意外的工单数据格式:', response);
        setTickets([]);
      }
    } catch (error) {
      console.error('获取工单失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };
  
  // 处理标签切换
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // 切换标签时清除状态过滤器
    setStatusFilter(null);
    // 关闭状态子菜单
    setShowStatusSubmenu(false);
  };
  
  // 处理状态过滤器切换
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    // 关闭状态子菜单
    setShowStatusSubmenu(false);
  };
  
  // 处理删除工单
  const handleDeleteTicket = async (ticketId) => {
    try {
      setLoading(true);
      console.log(`正在删除工单 ID: ${ticketId}`);
      
      // 调用删除工单API
      const response = await deleteTicket(ticketId);
      console.log('删除工单响应:', response);
      
      // 从列表中移除被删除的工单
      setTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== ticketId));
      
      // 显示成功消息
      Alert.alert('成功', '工单已成功删除');
    } catch (error) {
      console.error('删除工单失败:', error);
      Alert.alert('错误', '删除工单失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 根据用户角色渲染不同的标签页
  const renderTabs = () => {
    // 管理员角色
    if (user.is_admin === 1) {
      return (
        <View>
          <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => {
                handleTabChange('all');
                setShowStatusSubmenu(!showStatusSubmenu);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.tabText, { color: activeTab === 'all' ? '#FF6700' : colors.text }]}>
                  {statusFilter ? getStatusName(statusFilter) : '全部工单'}
                </Text>
                <Ionicons 
                  name={showStatusSubmenu ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color={activeTab === 'all' ? '#FF6700' : colors.text} 
                  style={{ marginLeft: 3 }}
                />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'created' && styles.activeTab]}
              onPress={() => handleTabChange('created')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'created' ? '#FF6700' : colors.text }]}>
                我创建的
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
              onPress={() => handleTabChange('approved')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'approved' ? '#FF6700' : colors.text }]}>
                已审核
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => handleTabChange('pending')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'pending' ? '#FF6700' : colors.text }]}>
                待审核
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 状态过滤子菜单 */}
          {showStatusSubmenu && activeTab === 'all' && (
            <View style={[styles.statusSubMenu, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === null && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange(null)}
              >
                <Text style={[styles.statusItemText, { color: colors.text }]}>全部状态</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'pending' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('pending')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#FFA000' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>待审核</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'approved' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('approved')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已审核</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'assigned' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('assigned')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#9C27B0' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已分配</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'inProgress' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('inProgress')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>处理中</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'completed' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('completed')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#8BC34A' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已完成</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'completionReview' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('completionReview')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#3F51B5' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>部门审核通过</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'rejected' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('rejected')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已拒绝</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'closed' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('closed')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已关闭</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    // 部门管理员角色 - 同样添加状态过滤
    else if (user.is_admin === 2) {
      return (
        <View>
          <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => {
                handleTabChange('all');
                setShowStatusSubmenu(!showStatusSubmenu);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.tabText, { color: activeTab === 'all' ? '#FF6700' : colors.text }]}>
                  {statusFilter ? getStatusName(statusFilter) : '全部工单'}
                </Text>
                <Ionicons 
                  name={showStatusSubmenu ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color={activeTab === 'all' ? '#FF6700' : colors.text} 
                  style={{ marginLeft: 3 }}
                />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'created' && styles.activeTab]}
              onPress={() => handleTabChange('created')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'created' ? '#FF6700' : colors.text }]}>
                我创建的
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
              onPress={() => handleTabChange('approved')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'approved' ? '#FF6700' : colors.text }]}>
                已审核
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'assigned' && styles.activeTab]}
              onPress={() => handleTabChange('assigned')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'assigned' ? '#FF6700' : colors.text }]}>
                分配给我的
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => handleTabChange('pending')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'pending' ? '#FF6700' : colors.text }]}>
                待审核
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 部门管理员的状态过滤子菜单 */}
          {showStatusSubmenu && activeTab === 'all' && (
            <View style={[styles.statusSubMenu, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === null && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange(null)}
              >
                <Text style={[styles.statusItemText, { color: colors.text }]}>全部状态</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'pending' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('pending')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#FFA000' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>待审核</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'approved' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('approved')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已审核</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'assigned' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('assigned')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#9C27B0' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已分配</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'inProgress' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('inProgress')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>处理中</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'completed' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('completed')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#8BC34A' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已完成</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'rejected' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('rejected')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已拒绝</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'closed' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('closed')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已关闭</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    // 其他角色 - 同样添加状态过滤
    else {
      return (
        <View>
          <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => {
                handleTabChange('all');
                setShowStatusSubmenu(!showStatusSubmenu);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.tabText, { color: activeTab === 'all' ? '#FF6700' : colors.text }]}>
                  {statusFilter ? getStatusName(statusFilter) : '全部工单'}
                </Text>
                <Ionicons 
                  name={showStatusSubmenu ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color={activeTab === 'all' ? '#FF6700' : colors.text} 
                  style={{ marginLeft: 3 }}
                />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'created' && styles.activeTab]}
              onPress={() => handleTabChange('created')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'created' ? '#FF6700' : colors.text }]}>
                我创建的
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'assigned' && styles.activeTab]}
              onPress={() => handleTabChange('assigned')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'assigned' ? '#FF6700' : colors.text }]}>
                分配给我的
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 处理角色的状态过滤子菜单 */}
          {showStatusSubmenu && activeTab === 'all' && (
            <View style={[styles.statusSubMenu, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === null && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange(null)}
              >
                <Text style={[styles.statusItemText, { color: colors.text }]}>全部状态</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'assigned' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('assigned')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#9C27B0' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已分配</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'inProgress' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('inProgress')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>处理中</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'completed' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('completed')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#8BC34A' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已完成</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusItem, statusFilter === 'closed' && styles.selectedStatusItem]}
                onPress={() => handleStatusFilterChange('closed')}
              >
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
                  <Text style={[styles.statusItemText, { color: colors.text }]}>已关闭</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
  };
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          notifySessionExpired();
          return;
        }
        
        // 解析令牌并检查是否过期
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            // 增强的Base64解码函数，处理可能包含非ASCII字符的令牌
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
            
            // 解析载荷
            const decoded = base64Decode(parts[1]);
            if (!decoded) {
              notifySessionExpired();
              return;
            }
            
            const payload = JSON.parse(decoded);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
              console.log('令牌已过期，尝试刷新');
              
              // 尝试刷新令牌
              const refreshSuccessful = await refreshToken();
              if (!refreshSuccessful) {
                notifySessionExpired();
              }
            }
          } else {
            // 令牌格式不正确
            notifySessionExpired();
          }
        } catch (parseError) {
          console.error('解析令牌失败:', parseError);
          notifySessionExpired();
        }
      } catch (error) {
        console.error('会话检查失败:', error);
        notifySessionExpired();
      }
    };
    
    // 通知会话过期并显示提示
    const notifySessionExpired = () => {
      // 触发HomeScreen中的登录弹窗
      EventRegister.emit('SESSION_EXPIRED');
      Alert.alert(
        '会话已过期',
        '请重新登录以继续',
        [
          {
            text: '确定',
            onPress: () => {}  // 用户点击确定按钮后不做额外操作
          }
        ]
      );
    };
    
    // 启动时检查会话
    checkSession();
    
    // 设置定期检查
    const sessionCheckInterval = setInterval(checkSession, 15 * 60 * 1000); // 每15分钟检查一次
    
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, []);
  
  // 设置状态栏颜色
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    }
  }, [isDarkMode]);
  
  // 设置导航标题
  useEffect(() => {
    // 为所有平台设置导航标题和右侧按钮
    navigation.setOptions({
      title: '工单管理',
      headerTintColor: colors.text,
      headerStyle: {
        backgroundColor: colors.card,
        shadowOpacity: 0,
        elevation: 0,
        borderBottomWidth: 0,
      },
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={() => navigation.navigate('创建工单')}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);
  
  // 渲染工单卡片
  const renderTicketItem = ({ item }) => (
    <TicketCard 
      ticket={item} 
      onPress={() => navigation.navigate('工单详情', { id: item.id })}
      onDelete={handleDeleteTicket}
      isAdmin={user && (user.is_admin === 1 || user.is_admin === true)}
    />
  );
  
  // 渲染空列表
  const renderEmptyList = () => (
    <View style={commonStyles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color={colors.textSecondary} />
      <Text style={commonStyles.emptyText}>暂无工单</Text>
    </View>
  );
  
  return (
    <View style={commonStyles.container}>
      {/* 根据用户角色渲染标签栏 */}
      {renderTabs()}
      
      {loading && !refreshing ? (
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6700" />
          <Text style={commonStyles.loadingText}>加载工单中...</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContainer,
            activeTab === 'all' && showStatusSubmenu && { paddingTop: 8 } // 当显示子菜单时调整下内容
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyList}
        />
      )}
      
      {/* 浮动创建按钮 */}
      <TouchableOpacity
        style={[styles.fabButton, { backgroundColor: '#FF6700' }]}
        onPress={() => navigation.navigate('创建工单')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    flexWrap: 'wrap', // 支持标签换行
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    minWidth: 80, // 确保标签有最小宽度
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6700',
  },
  tabText: {
    fontSize: 13, // 减小字体大小以适应更多标签
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginRight: 8,
    padding: 2,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  metaText: {
    fontSize: 12,
    marginBottom: 4,
  },
  creatorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusSubMenu: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    flexWrap: 'wrap', // 支持换行显示
    justifyContent: 'space-between',
  },
  statusItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    width: '48%', // 两列布局
  },
  selectedStatusItem: {
    backgroundColor: 'rgba(255,103,0,0.1)',
  },
  statusItemText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
});

export default TicketListScreen; 