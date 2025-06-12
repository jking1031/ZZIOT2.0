// API使用示例
// 展示如何在React Native组件中使用新的API管理系统

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl
} from 'react-native';

// 导入新的API服务
import {
  userApi,
  ticketApi,
  reportApi,
  dataApi,
  siteApi,
  statsApi
} from '../api/apiService';

// 导入API管理器（用于配置切换）
import {
  getApiConfig,
  switchApiBackend,
  getApiUrl
} from '../api/apiManager';

// 导入直接API服务（用于自定义请求）
import apiService from '../api/apiService';

const ApiUsageExample = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentExample, setCurrentExample] = useState('users');

  useEffect(() => {
    loadData();
  }, [currentExample]);

  const loadData = async () => {
    setLoading(true);
    try {
      let result;
      
      switch (currentExample) {
        case 'users':
          result = await loadUsers();
          break;
        case 'tickets':
          result = await loadTickets();
          break;
        case 'reports':
          result = await loadReports();
          break;
        case 'sites':
          result = await loadSites();
          break;
        case 'stats':
          result = await loadStats();
          break;
        case 'data':
          result = await loadData();
          break;
        default:
          result = [];
      }
      
      setData(result);
    } catch (error) {
      console.error('加载数据失败:', error);
      Alert.alert('错误', '加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 用户管理示例
  const loadUsers = async () => {
    try {
      // 方法1: 使用专门的用户API
      const users = await userApi.getUsers({ page: 1, limit: 20 });
      
      // 方法2: 获取公司列表
      const companies = await userApi.getCompanies();
      
      console.log('用户列表:', users);
      console.log('公司列表:', companies);
      
      return users.data || users;
    } catch (error) {
      console.error('加载用户失败:', error);
      throw error;
    }
  };

  // 工单管理示例
  const loadTickets = async () => {
    try {
      // 获取工单列表
      const tickets = await ticketApi.getTickets({
        status: 'open',
        page: 1,
        limit: 10
      });
      
      // 获取工单统计
      const stats = await ticketApi.getStats();
      
      console.log('工单列表:', tickets);
      console.log('工单统计:', stats);
      
      return tickets.data || tickets;
    } catch (error) {
      console.error('加载工单失败:', error);
      throw error;
    }
  };

  // 报告系统示例
  const loadReports = async () => {
    try {
      // 获取普通报告
      const reports = await reportApi.getReports({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
      
      // 获取5000报告
      const reports5000 = await reportApi.getReports5000({
        operator: 'admin'
      });
      
      // 获取污泥报告
      const sludgeReports = await reportApi.getReportsSludge({
        date: '2024-01-01'
      });
      
      console.log('普通报告:', reports);
      console.log('5000报告:', reports5000);
      console.log('污泥报告:', sludgeReports);
      
      return reports.data || reports;
    } catch (error) {
      console.error('加载报告失败:', error);
      throw error;
    }
  };

  // 站点管理示例
  const loadSites = async () => {
    try {
      // 获取站点列表
      const sites = await siteApi.getSites();
      
      console.log('站点列表:', sites);
      
      return sites.data || sites;
    } catch (error) {
      console.error('加载站点失败:', error);
      throw error;
    }
  };

  // 统计数据示例
  const loadStats = async () => {
    try {
      // 获取概览统计
      const overview = await statsApi.getOverview();
      
      console.log('统计概览:', overview);
      
      return [overview]; // 包装成数组以便显示
    } catch (error) {
      console.error('加载统计失败:', error);
      throw error;
    }
  };

  // 数据查询示例
  const loadDataQuery = async () => {
    try {
      // 查询表数据
      const tableData = await dataApi.queryData('sensor_data', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        interval: 'hour'
      });
      
      // 查询历史数据
      const historyData = await dataApi.historyQuery({
        table: 'history_table',
        conditions: { status: 'active' }
      });
      
      // 查询AO数据
      const aoData = await dataApi.queryAOData({
        aoName: 'AO1',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      
      console.log('表数据:', tableData);
      console.log('历史数据:', historyData);
      console.log('AO数据:', aoData);
      
      return tableData.data || tableData;
    } catch (error) {
      console.error('加载数据查询失败:', error);
      throw error;
    }
  };

  // 自定义API请求示例
  const customApiExample = async () => {
    try {
      // 方法1: 使用分类和端点
      const result1 = await apiService.get('USERS', 'LIST', {
        params: { page: 1, limit: 10 }
      });
      
      // 方法2: 使用直接URL请求（兼容旧代码）
      const result2 = await apiService.directRequest(
        'https://nodered.jzz77.cn:9003/api/users',
        { method: 'GET' }
      );
      
      // 方法3: 获取API URL然后自定义请求
      const apiUrl = getApiUrl('TICKETS', 'LIST');
      console.log('工单API URL:', apiUrl);
      
      console.log('自定义请求结果1:', result1);
      console.log('自定义请求结果2:', result2);
      
      return result1;
    } catch (error) {
      console.error('自定义API请求失败:', error);
      throw error;
    }
  };

  // 后端切换示例
  const switchBackendExample = () => {
    Alert.alert(
      '切换后端',
      '选择要切换的后端',
      [
        {
          text: 'NODERED',
          onPress: () => {
            switchApiBackend('NODERED');
            Alert.alert('成功', '已切换到 NODERED 后端');
          }
        },
        {
          text: 'ZZIOT',
          onPress: () => {
            switchApiBackend('ZZIOT');
            Alert.alert('成功', '已切换到 ZZIOT 后端');
          }
        },
        { text: '取消', style: 'cancel' }
      ]
    );
  };

  // 显示API配置
  const showApiConfig = () => {
    const config = getApiConfig();
    Alert.alert(
      'API配置',
      JSON.stringify(config, null, 2),
      [{ text: '确定' }]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const examples = [
    { key: 'users', title: '用户管理' },
    { key: 'tickets', title: '工单系统' },
    { key: 'reports', title: '报告系统' },
    { key: 'sites', title: '站点管理' },
    { key: 'stats', title: '统计数据' },
    { key: 'data', title: '数据查询' }
  ];

  const renderDataItem = ({ item, index }) => (
    <View style={styles.dataItem}>
      <Text style={styles.dataIndex}>#{index + 1}</Text>
      <Text style={styles.dataContent}>
        {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>API使用示例</Text>
        <TouchableOpacity onPress={showApiConfig}>
          <Text style={styles.configButton}>配置</Text>
        </TouchableOpacity>
      </View>

      {/* 示例选择器 */}
      <View style={styles.exampleSelector}>
        <FlatList
          horizontal
          data={examples}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.exampleButton,
                currentExample === item.key && styles.activeExampleButton
              ]}
              onPress={() => setCurrentExample(item.key)}
            >
              <Text
                style={[
                  styles.exampleButtonText,
                  currentExample === item.key && styles.activeExampleButtonText
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* 操作按钮 */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={loadData}>
          <Text style={styles.actionButtonText}>重新加载</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={switchBackendExample}>
          <Text style={styles.actionButtonText}>切换后端</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={customApiExample}>
          <Text style={styles.actionButtonText}>自定义请求</Text>
        </TouchableOpacity>
      </View>

      {/* 数据显示 */}
      <View style={styles.dataContainer}>
        <Text style={styles.dataTitle}>数据结果 ({currentExample})</Text>
        
        {loading ? (
          <Text style={styles.loadingText}>加载中...</Text>
        ) : (
          <FlatList
            data={data || []}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderDataItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>暂无数据</Text>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  configButton: {
    fontSize: 16,
    color: '#007AFF'
  },
  exampleSelector: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  exampleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0'
  },
  activeExampleButton: {
    backgroundColor: '#007AFF'
  },
  exampleButtonText: {
    fontSize: 14,
    color: '#666'
  },
  activeExampleButtonText: {
    color: '#fff'
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  dataContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20
  },
  dataItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  dataIndex: {
    fontSize: 12,
    color: '#999',
    width: 30
  },
  dataContent: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace'
  }
});

export default ApiUsageExample;