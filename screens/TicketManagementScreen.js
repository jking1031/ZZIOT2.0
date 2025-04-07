import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, 
  Platform, StatusBar, Alert, RefreshControl, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles } from '../styles/StyleGuide';
import { getTickets, updateTicketStatus, assignTicket } from '../api/ticketService';
import { EventRegister } from '../utils/EventEmitter';
import { getAuthToken, refreshToken } from '../api/storage';

// 角色选项
const ROLE_OPTIONS = [
  { id: 0, name: '全部角色' },
  { id: 3, name: '运行班组' },
  { id: 4, name: '化验班组' },
  { id: 5, name: '机电班组' },
  { id: 6, name: '污泥车间' },
  { id: 7, name: '5000吨处理站' },
  { id: 8, name: '附属设施' },
];

// 状态选项
const STATUS_OPTIONS = [
  { id: 'all', name: '全部状态' },
  { id: 'pending', name: '待审核' },
  { id: 'approved', name: '已审核' },
  { id: 'assigned', name: '已分配' },
  { id: 'inProgress', name: '处理中' },
  { id: 'completed', name: '已完成' },
  { id: 'rejected', name: '已拒绝' },
  { id: 'closed', name: '已关闭' },
];

const TicketManagementScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  
  // 状态
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRole, setSelectedRole] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    closed: 0,
  });
  
  // 获取工单列表
  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedRole]);
  
  const fetchTickets = async () => {
    if (refreshing) return;
    
    setLoading(true);
    try {
      // 构建查询参数
      const params = {};
      
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      
      if (selectedRole !== 0) {
        params.role = selectedRole;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const response = await getTickets(params);
      setTickets(response.tickets || []);
      setStats(response.stats || {});
    } catch (error) {
      console.error('获取工单列表失败:', error);
      Alert.alert('获取失败', '无法加载工单列表，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // 刷新列表
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };
  
  // 搜索工单
  const handleSearch = () => {
    fetchTickets();
  };
  
  // 进入工单详情
  const handleTicketPress = (ticket) => {
    navigation.navigate('TicketDetailScreen', { id: ticket.id });
  };
  
  // 批量审批工单
  const handleBatchApprove = () => {
    if (!hasSelectedTickets() || !hasPendingTickets()) {
      Alert.alert('无法批量审批', '没有选中的待审核工单');
      return;
    }
    
    Alert.alert(
      '批量审批工单',
      '确定要审批所有选中的待审核工单吗？',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: confirmBatchApprove }
      ]
    );
  };
  
  // 确认批量审批
  const confirmBatchApprove = async () => {
    setLoading(true);
    try {
      const selectedPendingTickets = tickets.filter(
        ticket => ticket.selected && ticket.status === 'pending'
      );
      
      // 顺序处理所有选中的待审核工单
      for (let ticket of selectedPendingTickets) {
        await updateTicketStatus(ticket.id, {
          status: 'approved',
          comment: '批量审批通过',
        });
      }
      
      Alert.alert('批量审批成功', '所有选中的待审核工单已审批通过');
      fetchTickets();
    } catch (error) {
      console.error('批量审批失败:', error);
      Alert.alert('批量审批失败', '处理过程中出现错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 批量分配工单
  const handleBatchAssign = (roleId) => {
    if (!hasSelectedTickets() || !hasApprovedTickets()) {
      Alert.alert('无法批量分配', '没有选中的已审核工单');
      return;
    }
    
    Alert.alert(
      '批量分配工单',
      `确定将所有选中的已审核工单分配给${getRoleName(roleId)}吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: () => confirmBatchAssign(roleId)
        }
      ]
    );
  };
  
  // 确认批量分配
  const confirmBatchAssign = async (roleId) => {
    setLoading(true);
    try {
      const selectedApprovedTickets = tickets.filter(
        ticket => ticket.selected && ticket.status === 'approved'
      );
      
      // 顺序处理所有选中的已审核工单
      for (let ticket of selectedApprovedTickets) {
        await assignTicket(ticket.id, {
          roleId,
          comment: `批量分配给${getRoleName(roleId)}`,
        });
      }
      
      Alert.alert('批量分配成功', `所有选中的已审核工单已分配给${getRoleName(roleId)}`);
      fetchTickets();
    } catch (error) {
      console.error('批量分配失败:', error);
      Alert.alert('批量分配失败', '处理过程中出现错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 检查是否有选中的工单
  const hasSelectedTickets = () => {
    return tickets.some(ticket => ticket.selected);
  };
  
  // 检查是否有待审核的选中工单
  const hasPendingTickets = () => {
    return tickets.some(ticket => ticket.selected && ticket.status === 'pending');
  };
  
  // 检查是否有已审核的选中工单
  const hasApprovedTickets = () => {
    return tickets.some(ticket => ticket.selected && ticket.status === 'approved');
  };
  
  // 选择/取消选择工单
  const toggleTicketSelection = (ticketId) => {
    setTickets(prevTickets => 
      prevTickets.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, selected: !ticket.selected } 
          : ticket
      )
    );
  };
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    const areAllSelected = tickets.every(ticket => ticket.selected);
    setTickets(prevTickets => 
      prevTickets.map(ticket => ({ ...ticket, selected: !areAllSelected }))
    );
  };
  
  // 获取角色名称
  const getRoleName = (roleId) => {
    const role = ROLE_OPTIONS.find(r => r.id === roleId);
    return role ? role.name : '未知角色';
  };
  
  // 获取状态名称
  const getStatusName = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.id === status);
    return statusOption ? statusOption.name : status;
  };
  
  // 获取状态颜色
  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#FFA000',  // 黄色
      approved: '#2196F3', // 蓝色
      assigned: '#9C27B0', // 紫色
      inProgress: '#4CAF50', // 绿色
      completed: '#8BC34A', // 浅绿色
      rejected: '#F44336', // 红色
      closed: '#9E9E9E',   // 灰色
    };
    return statusColors[status] || '#9E9E9E';
  };
  
  // 安卓标题栏组件
  const AndroidHeader = () => (
    <View style={commonStyles.androidHeader}>
      <TouchableOpacity 
        style={commonStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={commonStyles.headerTitle}>工单管理</Text>
      <View style={{ width: 40 }} />
    </View>
  );
  
  // 设置状态栏颜色
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    }
  }, [isDarkMode]);
  
  // 设置导航标题
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        title: '工单管理',
        headerTintColor: colors.text,
        headerStyle: {
          backgroundColor: colors.card,
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 0,
        },
      });
    }
  }, [navigation, colors]);
  
  // 检查会话有效性
  React.useEffect(() => {
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
  }, []);
  
  // 渲染工单卡片
  const renderTicketItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.ticketCard, { backgroundColor: colors.card }]}
      onPress={() => handleTicketPress(item)}
    >
      <View style={styles.ticketHeader}>
        <TouchableOpacity
          style={styles.selectCheckbox}
          onPress={() => toggleTicketSelection(item.id)}
        >
          <Ionicons 
            name={item.selected ? "checkbox" : "square-outline"} 
            size={22} 
            color={item.selected ? "#FF6700" : colors.textSecondary} 
          />
        </TouchableOpacity>
        
        <Text 
          style={[styles.ticketTitle, { color: colors.text }]} 
          numberOfLines={1}
        >
          {item.title}
        </Text>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusName(item.status)}</Text>
        </View>
      </View>
      
      <Text 
        style={[styles.ticketDescription, { color: colors.textSecondary }]} 
        numberOfLines={2}
      >
        {item.description}
      </Text>
      
      <View style={styles.ticketMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {item.creator?.name || '未知'}
          </Text>
        </View>
        
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        {item.assignedTo && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {getRoleName(item.assignedTo.role)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
  
  // 渲染过滤器
  const renderFilters = () => (
    <View style={[styles.filtersContainer, { backgroundColor: colors.card }]}>
      <View style={styles.filterRow}>
        <Text style={[styles.filterTitle, { color: colors.text }]}>状态:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterOption,
                selectedStatus === option.id && styles.filterOptionSelected,
                { borderColor: selectedStatus === option.id ? '#FF6700' : colors.border }
              ]}
              onPress={() => setSelectedStatus(option.id)}
            >
              <Text 
                style={[
                  styles.filterOptionText, 
                  { color: selectedStatus === option.id ? '#FF6700' : colors.text }
                ]}
              >
                {option.name}
                {option.id !== 'all' && stats[option.id] > 0 && ` (${stats[option.id]})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.filterRow}>
        <Text style={[styles.filterTitle, { color: colors.text }]}>角色:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
          {ROLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterOption,
                selectedRole === option.id && styles.filterOptionSelected,
                { borderColor: selectedRole === option.id ? '#FF6700' : colors.border }
              ]}
              onPress={() => setSelectedRole(option.id)}
            >
              <Text 
                style={[
                  styles.filterOptionText, 
                  { color: selectedRole === option.id ? '#FF6700' : colors.text }
                ]}
              >
                {option.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
  
  // 渲染搜索框
  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
      <View style={[
        styles.searchInputContainer, 
        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
      ]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索工单"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              fetchTickets();
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons 
          name={showFilters ? "options" : "options-outline"} 
          size={22} 
          color={showFilters ? "#FF6700" : colors.text} 
        />
      </TouchableOpacity>
    </View>
  );
  
  // 渲染批处理按钮
  const renderBatchActions = () => {
    if (!hasSelectedTickets()) return null;
    
    return (
      <View style={[styles.batchActionsContainer, { backgroundColor: colors.card }]}>
        {hasPendingTickets() && (
          <TouchableOpacity
            style={[styles.batchButton, { backgroundColor: '#2196F3' }]}
            onPress={handleBatchApprove}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.batchIcon} />
            <Text style={styles.batchButtonText}>批量审批</Text>
          </TouchableOpacity>
        )}
        
        {hasApprovedTickets() && (
          <View style={styles.assignDropdown}>
            <TouchableOpacity
              style={[styles.batchButton, { backgroundColor: '#9C27B0' }]}
              onPress={() => setDropdownVisible(!dropdownVisible)}
            >
              <Ionicons name="people" size={16} color="#fff" style={styles.batchIcon} />
              <Text style={styles.batchButtonText}>批量分配</Text>
              <Ionicons 
                name={dropdownVisible ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#fff" 
                style={styles.dropdownIcon} 
              />
            </TouchableOpacity>
            
            {dropdownVisible && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card }]}>
                {ROLE_OPTIONS.filter(role => role.id !== 0).map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      handleBatchAssign(role.id);
                      setDropdownVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.batchButton, { backgroundColor: '#F44336' }]}
          onPress={() => setTickets(tickets.map(ticket => ({ ...ticket, selected: false })))}
        >
          <Ionicons name="close-circle" size={16} color="#fff" style={styles.batchIcon} />
          <Text style={styles.batchButtonText}>取消选择</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // 渲染列表头部
  const renderListHeader = () => (
    <>
      {renderSearchBar()}
      {showFilters && renderFilters()}
      
      {tickets.length > 0 && (
        <View style={[styles.listHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.selectAllContainer}
            onPress={toggleSelectAll}
          >
            <Ionicons 
              name={tickets.every(t => t.selected) ? "checkbox" : "square-outline"} 
              size={20} 
              color={tickets.every(t => t.selected) ? "#FF6700" : colors.textSecondary} 
            />
            <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>全选</Text>
          </TouchableOpacity>
          
          <Text style={[styles.ticketCount, { color: colors.textSecondary }]}>
            共 {tickets.length} 个工单
          </Text>
        </View>
      )}
    </>
  );
  
  // 渲染空状态
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无工单</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery.trim()
          ? '没有找到匹配的工单，请尝试其他搜索条件'
          : selectedStatus !== 'all' || selectedRole !== 0
            ? '没有符合筛选条件的工单，请尝试其他筛选条件'
            : '当前没有需要处理的工单'
        }
      </Text>
    </View>
  );
  
  return (
    <View style={commonStyles.container}>
      {Platform.OS === 'android' && <AndroidHeader />}
      
      <FlatList
        data={tickets}
        renderItem={renderTicketItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={!loading && renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6700']}
            tintColor={colors.text}
          />
        }
      />
      
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6700" />
        </View>
      )}
      
      {renderBatchActions()}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
  },
  filtersContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '500',
    width: 45,
  },
  filterOptions: {
    flex: 1,
  },
  filterOption: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(255,103,0,0.1)',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    marginLeft: 6,
  },
  ticketCount: {
    fontSize: 14,
  },
  ticketCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectCheckbox: {
    marginRight: 8,
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
  ticketDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  batchActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  batchIcon: {
    marginRight: 6,
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  assignDropdown: {
    position: 'relative',
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
  },
});

export default TicketManagementScreen; 