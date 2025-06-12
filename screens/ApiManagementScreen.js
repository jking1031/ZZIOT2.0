import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApiConfig,
  validateApiConfig,
  loadApiConfig,
  saveApiConfig,
  addApiBackend,
  updateApiBackend,
  removeApiBackend,
  toggleBackend,
  testBackendConnection,
  resetToDefaultConfig,
  getAvailableBackends,
  getAllEndpoints,
  getEndpointsByCategory,
  addEndpoint,
  updateEndpoint,
  removeEndpoint,
  addEndpointCategory,
  updateEndpointCategory,
  removeEndpointCategory,
  getCategoryInfo,
  getAllCategoriesInfo,
  toggleCategoryStatus,
  getCategoriesByTag,
  searchCategories,
  loadEndpointConfig,
  testEndpoint
} from '../api/apiManager';
import apiService from '../api/apiService';

const ApiManagementScreen = ({ navigation }) => {
  const [config, setConfig] = useState(null);
  const [validation, setValidation] = useState({ isValid: true, errors: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingBackend, setEditingBackend] = useState(null);
  const [newBackend, setNewBackend] = useState({
    key: '',
    name: '',
    url: '',
    description: '',
    enabled: true,
    priority: 1
  });
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState({});
  
  // 端点管理相关状态
  const [activeTab, setActiveTab] = useState('backends'); // 'backends' | 'endpoints'
  const [endpoints, setEndpoints] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryDetailModal, setShowCategoryDetailModal] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newEndpoint, setNewEndpoint] = useState({
    category: '',
    key: '',
    endpoint: '',
    baseUrl: '',
    type: 'static',
    description: ''
  });
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryConfig, setNewCategoryConfig] = useState({
    name: '',
    baseUrl: '',
    description: ''
  });
  const [endpointTestResults, setEndpointTestResults] = useState({});
  const [testingEndpoints, setTestingEndpoints] = useState({});
  const [categoriesInfo, setCategoriesInfo] = useState([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    initializeConfig();
  }, []);

  const initializeConfig = async () => {
    try {
      await loadApiConfig();
      await loadEndpointConfig();
      await loadConfig();
      await loadEndpoints();
      await loadCategoriesInfo();
      await loadAvailableTags();
    } catch (error) {
      console.error('初始化API配置失败:', error);
      Alert.alert('错误', '初始化API配置失败');
    }
  };

  // 加载分类信息
  const loadCategoriesInfo = async () => {
    try {
      const info = getAllCategoriesInfo();
      setCategoriesInfo(info);
    } catch (error) {
      console.error('加载分类信息失败:', error);
    }
  };

  // 加载可用标签
  const loadAvailableTags = async () => {
    try {
      const info = getAllCategoriesInfo();
      const tags = new Set();
      info.forEach(category => {
        if (category.tags) {
          category.tags.forEach(tag => tags.add(tag));
        }
      });
      setAvailableTags([...tags]);
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const apiConfig = getApiConfig();
      setConfig(apiConfig);
      
      const validationResult = validateApiConfig();
      setValidation(validationResult);
      
      // 加载测试结果
      const savedResults = await AsyncStorage.getItem('api_test_results');
      if (savedResults) {
        setTestResults(JSON.parse(savedResults));
      }
    } catch (error) {
      console.error('加载API配置失败:', error);
      Alert.alert('错误', '加载API配置失败');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadConfig();
      await loadEndpoints();
      await loadCategoriesInfo();
      await loadAvailableTags();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ==================== 端点管理功能 ====================
  
  const loadEndpoints = async () => {
    try {
      // 从API_ENDPOINTS中提取完整的端点信息
      const { API_ENDPOINTS, API_BASE_URLS } = await import('../api/apiManager.js');
      const endpointsData = [];
      
      // 定义每个分类对应的应用页面
      const categoryPages = {
        USERS: ['用户管理页面', 'ProfileScreen'],
        // TICKETS: 工单系统已删除
        SITES: ['站点管理页面', 'SiteListScreen', 'SiteDetailScreen'],
        REPORTS: ['报告页面', 'ReportScreen', 'ReportFormScreen', 'ReportForm5000Screen', 'ReportFormSludgeScreen', 'ReportFormPumpStationScreen', 'DynamicReportsScreen'],
        DATA: ['数据查询页面', 'DataQueryScreen', 'DataQueryCenterScreen', 'HistoryDataQueryScreen', 'AODataQueryScreen'],
        SUBMIT: ['数据提交页面', 'LabDataEntryScreen', 'AODataEntryScreen', 'SludgeDataEntryScreen', 'CarbonCalcScreen'],
        FILES: ['文件管理页面', 'FileUploadScreen'],
        MESSAGES: ['消息页面', 'MessageScreen', 'MessageQueryScreen'],
        STATS: ['统计页面', 'DataCenterScreen'],
        SYSTEM: ['系统管理页面', 'ApiManagementScreen']
      };
      
      // 定义数据格式说明
      const dataFormats = {
        USERS: 'JSON格式用户数据，包含用户信息、权限等',
        // TICKETS: 工单系统已删除
        SITES: 'JSON格式站点数据，包含站点信息、命令、日志等',
        REPORTS: 'JSON格式报告数据，支持多种报告类型',
        DATA: 'JSON格式查询数据，支持表格数据、历史数据等',
        SUBMIT: 'JSON格式提交数据，包含实验室数据、AO数据等',
        FILES: 'multipart/form-data文件上传格式',
        MESSAGES: 'JSON格式消息数据',
        STATS: 'JSON格式统计数据',
        SYSTEM: 'JSON格式系统配置数据'
      };
      
      Object.entries(API_ENDPOINTS).forEach(([category, categoryConfig]) => {
        if (categoryConfig.baseUrl) {
          // 简单结构：category直接包含baseUrl和endpoints
          const backendConfig = API_BASE_URLS[categoryConfig.baseUrl];
          const baseUrl = backendConfig ? backendConfig.url : categoryConfig.baseUrl;
          
          Object.entries(categoryConfig.endpoints).forEach(([key, endpoint]) => {
            const endpointPath = typeof endpoint === 'function' ? endpoint.toString() : endpoint;
            
            endpointsData.push({
              category,
              key,
              path: endpointPath,
              baseUrl: categoryConfig.baseUrl,
              fullUrl: baseUrl,
              usedInPages: categoryPages[category] || ['未指定页面'],
              dataFormat: dataFormats[category] || 'JSON格式数据',
              debugInfo: {
                method: key.includes('CREATE') || key.includes('SUBMIT') ? 'POST' : 'GET',
                requiresAuth: true,
                responseType: 'application/json',
                timeout: 30000
              },
              description: `${category}分类下的${key}端点`,
              enabled: backendConfig ? backendConfig.enabled : true
            });
          });
        } else {
          // 复杂结构：endpoints中每个项目都有自己的baseUrl
          Object.entries(categoryConfig.endpoints).forEach(([key, endpointConfig]) => {
            const backendConfig = API_BASE_URLS[endpointConfig.baseUrl];
            const baseUrl = backendConfig ? backendConfig.url : endpointConfig.baseUrl;
            const endpointPath = typeof endpointConfig.endpoint === 'function' ? 
              endpointConfig.endpoint.toString() : endpointConfig.endpoint;
            
            endpointsData.push({
              category,
              key,
              path: endpointPath,
              baseUrl: endpointConfig.baseUrl,
              fullUrl: baseUrl,
              usedInPages: categoryPages[category] || ['未指定页面'],
              dataFormat: dataFormats[category] || 'JSON格式数据',
              debugInfo: {
                method: key.includes('CREATE') || key.includes('SUBMIT') ? 'POST' : 'GET',
                requiresAuth: true,
                responseType: 'application/json',
                timeout: 30000
              },
              description: `${category}分类下的${key}端点`,
              enabled: backendConfig ? backendConfig.enabled : true
            });
          });
        }
      });
      
      setEndpoints(endpointsData);
    } catch (error) {
      console.error('加载端点失败:', error);
      // 如果导入失败，尝试使用原有方法
      try {
        const endpointsData = await getAllEndpoints();
        setEndpoints(endpointsData);
      } catch (fallbackError) {
        console.error('备用加载方法也失败:', fallbackError);
      }
    }
  };

  const getFilteredEndpoints = () => {
    if (selectedCategory === 'ALL') {
      return endpoints;
    }
    return endpoints.filter(endpoint => endpoint.category === selectedCategory);
  };

  const handleAddEndpoint = async () => {
    if (!newEndpoint.category || !newEndpoint.key || !newEndpoint.endpoint) {
      Alert.alert('错误', '请填写完整的端点信息');
      return;
    }

    try {
      await addEndpoint(newEndpoint.category, newEndpoint.key, {
        endpoint: newEndpoint.endpoint,
        baseUrl: newEndpoint.baseUrl
      });
      
      setNewEndpoint({
        category: '',
        key: '',
        endpoint: '',
        baseUrl: '',
        type: 'static',
        description: ''
      });
      setShowEndpointModal(false);
      await loadEndpoints();
      Alert.alert('成功', '端点添加成功');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleEditEndpoint = async () => {
    if (!editingEndpoint.category || !editingEndpoint.key || !editingEndpoint.endpoint) {
      Alert.alert('错误', '请填写完整的端点信息');
      return;
    }

    try {
      await updateEndpoint(editingEndpoint.category, editingEndpoint.key, {
        endpoint: editingEndpoint.endpoint,
        baseUrl: editingEndpoint.baseUrl
      });
      
      setEditingEndpoint(null);
      setShowEndpointModal(false);
      await loadEndpoints();
      Alert.alert('成功', '端点更新成功');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleDeleteEndpoint = (endpoint) => {
    Alert.alert(
      '确认删除',
      `确定要删除端点 "${endpoint.category}.${endpoint.key}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEndpoint(endpoint.category, endpoint.key);
              await loadEndpoints();
              Alert.alert('成功', '端点删除成功');
            } catch (error) {
              Alert.alert('错误', error.message);
            }
          }
        }
      ]
    );
  };

  const handleTestEndpoint = async (endpoint) => {
    const endpointId = endpoint.id;
    setTestingEndpoints(prev => ({ ...prev, [endpointId]: true }));
    
    try {
      const result = await testEndpoint(endpoint.category, endpoint.key);
      setEndpointTestResults(prev => ({ ...prev, [endpointId]: result }));
    } catch (error) {
      setEndpointTestResults(prev => ({
        ...prev,
        [endpointId]: {
          success: false,
          message: error.message,
          responseTime: Date.now()
        }
      }));
    } finally {
      setTestingEndpoints(prev => ({ ...prev, [endpointId]: false }));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryConfig.name || !newCategoryConfig.baseUrl) {
      Alert.alert('错误', '请填写完整的分类信息');
      return;
    }

    try {
      const config = {
        ...newCategoryConfig,
        tags: newCategoryConfig.tags || []
      };
      
      await addEndpointCategory(newCategoryConfig.name, config);
      await loadEndpoints();
      await loadCategoriesInfo();
      await loadAvailableTags();
      
      setNewCategoryConfig({ name: '', description: '', baseUrl: 'NODERED', tags: [] });
      setShowCategoryModal(false);
      Alert.alert('成功', '分类添加成功');
    } catch (error) {
      Alert.alert('错误', '添加分类失败: ' + error.message);
    }
  };

  // 处理分类编辑
  const handleEditCategory = async () => {
    if (!editingCategory) return;

    try {
      await updateEndpointCategory(editingCategory.category, newCategoryConfig);
      await loadCategoriesInfo();
      await loadAvailableTags();
      
      setEditingCategory(null);
      setNewCategoryConfig({ name: '', description: '', baseUrl: 'NODERED', tags: [] });
      setShowCategoryDetailModal(false);
      Alert.alert('成功', '分类更新成功');
    } catch (error) {
      Alert.alert('错误', '更新分类失败: ' + error.message);
    }
  };

  // 处理分类状态切换
  const handleToggleCategoryStatus = async (category) => {
    try {
      await toggleCategoryStatus(category);
      await loadCategoriesInfo();
      Alert.alert('成功', '分类状态已更新');
    } catch (error) {
      Alert.alert('错误', '更新分类状态失败: ' + error.message);
    }
  };

  // 获取筛选后的分类
  const getFilteredCategories = () => {
    let filtered = categoriesInfo;
    
    // 按搜索查询筛选
    if (categorySearchQuery.trim()) {
      const searchResults = searchCategories(categorySearchQuery);
      filtered = filtered.filter(info => searchResults.includes(info.category));
    }
    
    // 按标签筛选
    if (selectedTag) {
      filtered = filtered.filter(info => 
        info.tags && info.tags.includes(selectedTag)
      );
    }
    
    return filtered;
  };

  // 渲染端点列表项
  const renderEndpointItem = ({ item }) => {
    const testResult = endpointTestResults[`${item.category}-${item.key}`];
    
    return (
      <View style={styles.endpointItem}>
        <View style={styles.endpointHeader}>
          <View style={styles.endpointInfo}>
            <View style={styles.endpointTitleRow}>
              <Text style={styles.endpointName}>{item.key}</Text>
              <View style={styles.endpointBadge}>
                <Text style={styles.endpointBadgeText}>{item.method || 'GET'}</Text>
              </View>
            </View>
            
            {/* API路径信息 */}
            <View style={styles.endpointDetail}>
              <Text style={styles.endpointLabel}>API路径:</Text>
              <Text style={styles.endpointValue}>{item.path}</Text>
            </View>
            
            {/* 后端URL信息 */}
            <View style={styles.endpointDetail}>
              <Text style={styles.endpointLabel}>后端URL:</Text>
              <Text style={styles.endpointValue}>{item.backendUrl}</Text>
            </View>
            
            {/* 完整URL */}
            <View style={styles.endpointDetail}>
              <Text style={styles.endpointLabel}>完整地址:</Text>
              <Text style={styles.endpointValue}>{item.fullUrl}</Text>
            </View>
            
            {/* 应用页面 */}
            {item.usedInPages && item.usedInPages.length > 0 && (
              <View style={styles.endpointDetail}>
                <Text style={styles.endpointLabel}>应用页面:</Text>
                <Text style={styles.endpointValue}>{item.usedInPages.join(', ')}</Text>
              </View>
            )}
            
            {/* 数据格式 */}
            {item.dataFormat && (
              <View style={styles.endpointDetail}>
                <Text style={styles.endpointLabel}>数据格式:</Text>
                <Text style={styles.endpointValue}>{item.dataFormat}</Text>
              </View>
            )}
            
            {/* 描述信息 */}
            {item.description && (
              <View style={styles.endpointDetail}>
                <Text style={styles.endpointLabel}>描述:</Text>
                <Text style={styles.endpointValue}>{item.description}</Text>
              </View>
            )}
            
            {/* 调试信息 */}
            {item.debugInfo && (
              <View style={styles.endpointDetail}>
                <Text style={styles.endpointLabel}>调试信息:</Text>
                <Text style={styles.endpointDebugInfo}>
                  方法: {item.debugInfo.method || 'GET'} | 
                  认证: {item.debugInfo.requiresAuth ? '需要' : '不需要'} | 
                  超时: {item.debugInfo.timeout || 30000}ms
                </Text>
              </View>
            )}
            
            <Text style={styles.endpointCategory}>分类: {item.category}</Text>
          </View>
          
          <View style={styles.endpointActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.testButton]}
              onPress={() => handleTestEndpoint(item)}
            >
              <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>测试</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => {
                setEditingEndpoint({ ...item });
                setShowEndpointModal(true);
              }}
            >
              <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>编辑</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                Alert.alert(
                  '确认删除',
                  `确定要删除端点 "${item.key}" 吗？`,
                  [
                    { text: '取消', style: 'cancel' },
                    { text: '删除', style: 'destructive', onPress: () => handleDeleteEndpoint(item.category, item.key) }
                  ]
                );
              }}
            >
              <Text style={[styles.actionButtonText, { color: '#F44336' }]}>删除</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {testResult && (
          <View style={[
            styles.testResult,
            testResult.success ? styles.testSuccess : styles.testError
          ]}>
            <Text style={{
              color: testResult.success ? "#4CAF50" : "#f44336",
              fontWeight: 'bold',
              marginRight: 5
            }}>
              {testResult.success ? '✓' : '✗'}
            </Text>
            <Text style={[
              styles.testResultText,
              testResult.success ? styles.testSuccessText : styles.testErrorText
            ]}>
              {testResult.message}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // 渲染后端管理标签页
  const renderBackendsTab = () => {
    return (
      <>
        {/* 后端列表 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>后端配置</Text>
            <Text style={styles.sectionSubtitle}>
              已启用: {config.availableBackends.length} / {Object.keys(config.backends).length}
            </Text>
          </View>
          
          <FlatList
            data={Object.entries(config.backends).map(([key, backend]) => ({ key, ...backend }))}
            renderItem={renderBackendItem}
            keyExtractor={(item) => item.key}
            scrollEnabled={false}
          />
        </View>

        {/* 操作按钮 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>管理操作</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.buttonText}>添加新后端</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleResetConfig}
          >
            <Text style={styles.buttonText}>重置为默认配置</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // 渲染端点管理标签页
  const renderEndpointsTab = () => {
    const filteredCategories = getFilteredCategories();
    const categories = [...new Set(Object.keys(endpoints))];
    
    return (
      <>
        {/* 分类搜索和筛选 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>分类管理</Text>
          
          {/* 搜索框 */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索分类..."
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
            />
          </View>
          
          {/* 标签筛选 */}
          {availableTags.length > 0 && (
            <View style={styles.tagContainer}>
              <Text style={styles.tagLabel}>按标签筛选:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                <TouchableOpacity
                  style={[styles.tagChip, !selectedTag && styles.activeTagChip]}
                  onPress={() => setSelectedTag('')}
                >
                  <Text style={[styles.tagChipText, !selectedTag && styles.activeTagChipText]}>
                    全部
                  </Text>
                </TouchableOpacity>
                {availableTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, selectedTag === tag && styles.activeTagChip]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Text style={[styles.tagChipText, selectedTag === tag && styles.activeTagChipText]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 分类列表 - 点击分类显示该分类的端点 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>API分类</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredCategories.length}个分类
            </Text>
          </View>
          
          <FlatList
            data={filteredCategories}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItemClickable,
                  selectedCategory === item.category && styles.selectedCategoryItem
                ]}
                onPress={() => {
                  setSelectedCategory(selectedCategory === item.category ? '' : item.category);
                }}
              >
                {renderCategoryItem({ item })}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.category}
            scrollEnabled={false}
          />
        </View>

        {/* 当选择了分类时，显示该分类下的端点 */}
        {selectedCategory && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{selectedCategory} - API端点</Text>
              <Text style={styles.sectionSubtitle}>
                {getFilteredEndpoints().length}个端点
              </Text>
            </View>
            
            <FlatList
              data={getFilteredEndpoints()}
              renderItem={renderEndpointItem}
              keyExtractor={(item) => `${item.category}-${item.key}`}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* 当没有选择分类时，显示所有分类的概览 */}
        {!selectedCategory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>所有API端点概览</Text>
            <Text style={styles.sectionSubtitle}>点击上方分类查看详细端点信息</Text>
            
            {categories.map(category => {
              const categoryEndpoints = endpoints[category] || [];
              const categoryInfo = categoriesInfo.find(info => info.category === category);
              
              return (
                <View key={category} style={styles.categoryOverview}>
                  <TouchableOpacity
                    style={styles.categoryOverviewHeader}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={styles.categoryOverviewName}>
                      {categoryInfo?.name || category}
                    </Text>
                    <Text style={styles.categoryOverviewCount}>
                      {categoryEndpoints.length}个端点
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  
                  {categoryInfo?.description && (
                    <Text style={styles.categoryOverviewDescription}>
                      {categoryInfo.description}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>管理操作</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowEndpointModal(true)}
          >
            <Text style={styles.buttonText}>添加新端点</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.buttonText, { color: '#007AFF' }]}>添加新分类</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // 渲染分类列表项
  const renderCategoryItem = ({ item }) => {
    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={styles.categoryTitleRow}>
              <Text style={styles.categoryName}>{item.name || item.category}</Text>
              <View style={[styles.statusBadge, item.enabled ? styles.enabledBadge : styles.disabledBadge]}>
                <Text style={[styles.statusText, item.enabled ? styles.enabledText : styles.disabledText]}>
                  {item.enabled ? '启用' : '禁用'}
                </Text>
              </View>
            </View>
            <Text style={styles.categoryDescription}>{item.description}</Text>
            <Text style={styles.categoryMeta}>
              后端: {item.baseUrl} | 端点数: {item.endpointCount} | 版本: {item.version}
            </Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.categoryTags}>
                {item.tags.map(tag => (
                  <View key={tag} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.categoryActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.toggleButton]}
              onPress={() => handleToggleCategoryStatus(item.category)}
            >
              <Text style={[styles.actionButtonText, { color: item.enabled ? "#FF9800" : "#4CAF50" }]}>
                {item.enabled ? '暂停' : '启用'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => {
                setEditingCategory(item);
                setNewCategoryConfig({
                  name: item.name || item.category,
                  description: item.description || '',
                  baseUrl: item.baseUrl || 'NODERED',
                  tags: item.tags || []
                });
                setShowCategoryDetailModal(true);
              }}
            >
              <Text style={[styles.actionButtonText, { color: "#2196F3" }]}>编辑</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                Alert.alert(
                  '确认删除',
                  `确定要删除分类 "${item.name || item.category}" 吗？这将删除该分类下的所有端点。`,
                  [
                    { text: '取消', style: 'cancel' },
                    { 
                      text: '删除', 
                      style: 'destructive', 
                      onPress: async () => {
                        try {
                          await removeEndpointCategory(item.category);
                          await loadEndpoints();
                          await loadCategoriesInfo();
                          Alert.alert('成功', '分类删除成功');
                        } catch (error) {
                          Alert.alert('错误', '删除分类失败: ' + error.message);
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={[styles.actionButtonText, { color: "#F44336" }]}>删除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleAddBackend = async () => {
    if (!newBackend.key || !newBackend.url || !newBackend.name) {
      Alert.alert('错误', '请填写完整的后端信息');
      return;
    }

    if (!newBackend.url.startsWith('http')) {
      Alert.alert('错误', 'URL必须以http或https开头');
      return;
    }

    try {
      await addApiBackend(newBackend.key, {
        name: newBackend.name,
        url: newBackend.url,
        description: newBackend.description,
        enabled: newBackend.enabled,
        priority: newBackend.priority
      });
      
      setNewBackend({
        key: '',
        name: '',
        url: '',
        description: '',
        enabled: true,
        priority: 1
      });
      setShowAddModal(false);
      await loadConfig();
      Alert.alert('成功', '后端添加成功');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleEditBackend = async () => {
    if (!editingBackend.name || !editingBackend.url) {
      Alert.alert('错误', '请填写完整的后端信息');
      return;
    }

    if (!editingBackend.url.startsWith('http')) {
      Alert.alert('错误', 'URL必须以http或https开头');
      return;
    }

    try {
      await updateApiBackend(editingBackend.key, {
        name: editingBackend.name,
        url: editingBackend.url,
        description: editingBackend.description,
        enabled: editingBackend.enabled,
        priority: editingBackend.priority
      });
      
      setEditingBackend(null);
      setShowEditModal(false);
      await loadConfig();
      Alert.alert('成功', '后端更新成功');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleDeleteBackend = (key) => {
    Alert.alert(
      '确认删除',
      `确定要删除后端 "${key}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeApiBackend(key);
              await loadConfig();
              Alert.alert('成功', '后端删除成功');
            } catch (error) {
              Alert.alert('错误', error.message);
            }
          }
        }
      ]
    );
  };

  const handleToggleBackend = async (key, enabled) => {
    try {
      await toggleBackend(key, enabled);
      await loadConfig();
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleTestBackend = async (key) => {
    setTesting(prev => ({ ...prev, [key]: true }));
    
    try {
      const result = await testBackendConnection(key);
      
      const newResults = {
        ...testResults,
        [key]: {
          ...result,
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResults(newResults);
      await AsyncStorage.setItem('api_test_results', JSON.stringify(newResults));
      
      Alert.alert(
        result.success ? '连接成功' : '连接失败',
        result.message
      );
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setTesting(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleResetConfig = () => {
    Alert.alert(
      '重置配置',
      '确定要重置为默认配置吗？这将删除所有自定义后端配置。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToDefaultConfig();
              await loadConfig();
              Alert.alert('成功', '已重置为默认配置');
            } catch (error) {
              Alert.alert('错误', error.message);
            }
          }
        }
      ]
    );
  };

  const openEditModal = (backend) => {
    setEditingBackend({ ...backend });
    setShowEditModal(true);
  };

  const renderBackendItem = ({ item }) => {
    const testResult = testResults[item.key];
    const isTestingThis = testing[item.key];
    
    return (
      <View style={styles.backendItem}>
        <View style={styles.backendHeader}>
          <View style={styles.backendInfo}>
            <Text style={styles.backendName}>{item.name}</Text>
            <Text style={styles.backendKey}>({item.key})</Text>
            <Text style={styles.backendUrl}>{item.url}</Text>
            {item.description ? (
              <Text style={styles.backendDescription}>{item.description}</Text>
            ) : null}
          </View>
          
          <View style={styles.backendControls}>
            <Switch
              value={item.enabled}
              onValueChange={(enabled) => handleToggleBackend(item.key, enabled)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={item.enabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.backendActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={() => handleTestBackend(item.key)}
            disabled={isTestingThis}
          >
            {isTestingThis ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="wifi-outline" size={18} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>
              {isTestingThis ? '测试中...' : '测试连接'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.actionButtonText}>编辑</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteBackend(item.key)}
          >
            <Text style={styles.actionButtonText}>删除</Text>
          </TouchableOpacity>
        </View>
        
        {testResult && (
          <View style={[
            styles.testResult,
            testResult.success ? styles.testSuccess : styles.testFailure
          ]}>
            <Text style={{
              color: testResult.success ? "#4CAF50" : "#f44336",
              fontWeight: 'bold',
              marginRight: 5
            }}>
              {testResult.success ? '✓' : '✗'}
            </Text>
            <Text style={styles.testResultText}>
              {typeof testResult.message === 'string' ? testResult.message : JSON.stringify(testResult.message)} - {new Date(testResult.timestamp).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderBackendForm = (backend, isEdit = false) => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>{isEdit ? '编辑后端' : '添加新后端'}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>后端标识 *</Text>
        <TextInput
          style={[styles.input, isEdit && styles.disabledInput]}
          value={backend.key}
          onChangeText={(text) => {
            if (isEdit) {
              setEditingBackend(prev => ({ ...prev, key: text }));
            } else {
              setNewBackend(prev => ({ ...prev, key: text }));
            }
          }}
          placeholder="例如: CUSTOM_API"
          editable={!isEdit}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>显示名称 *</Text>
        <TextInput
          style={styles.input}
          value={backend.name}
          onChangeText={(text) => {
            if (isEdit) {
              setEditingBackend(prev => ({ ...prev, name: text }));
            } else {
              setNewBackend(prev => ({ ...prev, name: text }));
            }
          }}
          placeholder="例如: 自定义API服务器"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>服务器URL *</Text>
        <TextInput
          style={styles.input}
          value={backend.url}
          onChangeText={(text) => {
            if (isEdit) {
              setEditingBackend(prev => ({ ...prev, url: text }));
            } else {
              setNewBackend(prev => ({ ...prev, url: text }));
            }
          }}
          placeholder="https://api.example.com"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>描述</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={backend.description}
          onChangeText={(text) => {
            if (isEdit) {
              setEditingBackend(prev => ({ ...prev, description: text }));
            } else {
              setNewBackend(prev => ({ ...prev, description: text }));
            }
          }}
          placeholder="后端服务器的描述信息"
          multiline
          numberOfLines={3}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>优先级</Text>
        <TextInput
          style={styles.input}
          value={String(backend.priority)}
          onChangeText={(text) => {
            const priority = parseInt(text) || 1;
            if (isEdit) {
              setEditingBackend(prev => ({ ...prev, priority }));
            } else {
              setNewBackend(prev => ({ ...prev, priority }));
            }
          }}
          placeholder="1"
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.switchGroup}>
        <Text style={styles.inputLabel}>启用状态</Text>
        <Switch
          value={backend.enabled}
          onValueChange={(enabled) => {
            if (isEdit) {
              setEditingBackend(prev => ({ ...prev, enabled }));
            } else {
              setNewBackend(prev => ({ ...prev, enabled }));
            }
          }}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={backend.enabled ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  if (!config) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载配置中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 标签页切换 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'backends' && styles.activeTab]}
          onPress={() => setActiveTab('backends')}
        >
          <Ionicons 
            name="server" 
            size={20} 
            color={activeTab === 'backends' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'backends' && styles.activeTabText]}>
            后端管理
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'endpoints' && styles.activeTab]}
          onPress={() => setActiveTab('endpoints')}
        >
          <Ionicons 
            name="link" 
            size={20} 
            color={activeTab === 'endpoints' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'endpoints' && styles.activeTabText]}>
            端点管理
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 配置状态 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>配置状态</Text>
          <View style={[
            styles.statusCard,
            validation.isValid ? styles.statusSuccess : styles.statusError
          ]}>
            <Text style={{
              color: validation.isValid ? "#4CAF50" : "#f44336",
              fontWeight: 'bold',
              fontSize: 18,
              marginRight: 8
            }}>
              {validation.isValid ? '✓' : '⚠'}
            </Text>
            <Text style={styles.statusText}>
              {validation.isValid ? '配置正常' : '配置有误'}
            </Text>
          </View>
          
          {!validation.isValid && (
            <View style={styles.errorList}>
              {validation.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>• {error}</Text>
              ))}
            </View>
          )}
        </View>
        
        {activeTab === 'backends' ? renderBackendsTab() : renderEndpointsTab()}
      </ScrollView>

      {/* 添加后端模态框 */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>添加新后端</Text>
            <TouchableOpacity onPress={handleAddBackend}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {renderBackendForm(newBackend, false)}
          </ScrollView>
        </View>
      </Modal>

      {/* 编辑后端模态框 */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>编辑后端</Text>
            <TouchableOpacity onPress={handleEditBackend}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {editingBackend && renderBackendForm(editingBackend, true)}
          </ScrollView>
        </View>
      </Modal>

      {/* 端点管理模态框 */}
      <Modal
        visible={showEndpointModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowEndpointModal(false);
              setEditingEndpoint(null);
              setNewEndpoint({ category: '', key: '', path: '' });
            }}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEndpoint ? '编辑端点' : '添加新端点'}
            </Text>
            <TouchableOpacity onPress={editingEndpoint ? () => handleEditEndpoint(editingEndpoint) : handleAddEndpoint}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>分类</Text>
              <TextInput
                style={styles.input}
                value={editingEndpoint ? editingEndpoint.category : newEndpoint.category}
                onChangeText={(text) => {
                  if (editingEndpoint) {
                    setEditingEndpoint(prev => ({ ...prev, category: text }));
                  } else {
                    setNewEndpoint(prev => ({ ...prev, category: text }));
                  }
                }}
                placeholder="端点分类，如：USERS, TICKETS等"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>端点键名</Text>
              <TextInput
                style={styles.input}
                value={editingEndpoint ? editingEndpoint.key : newEndpoint.key}
                onChangeText={(text) => {
                  if (editingEndpoint) {
                    setEditingEndpoint(prev => ({ ...prev, key: text }));
                  } else {
                    setNewEndpoint(prev => ({ ...prev, key: text }));
                  }
                }}
                placeholder="端点键名，如：login, getUserInfo等"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>端点路径</Text>
              <TextInput
                style={styles.input}
                value={editingEndpoint ? editingEndpoint.path : newEndpoint.path}
                onChangeText={(text) => {
                  if (editingEndpoint) {
                    setEditingEndpoint(prev => ({ ...prev, path: text }));
                  } else {
                    setNewEndpoint(prev => ({ ...prev, path: text }));
                  }
                }}
                placeholder="API路径，如：/api/v1/login"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 分类管理模态框 */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCategoryModal(false);
              setNewCategoryConfig({ name: '', description: '', baseUrl: 'NODERED', tags: [] });
            }}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>添加新分类</Text>
            <TouchableOpacity onPress={handleAddCategory}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>分类名称</Text>
              <TextInput
                style={styles.input}
                value={newCategoryConfig.name}
                onChangeText={(text) => setNewCategoryConfig(prev => ({ ...prev, name: text }))}
                placeholder="输入分类名称"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>描述</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newCategoryConfig.description}
                onChangeText={(text) => setNewCategoryConfig(prev => ({ ...prev, description: text }))}
                placeholder="输入分类描述"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>后端URL</Text>
              <TextInput
                style={styles.input}
                value={newCategoryConfig.baseUrl}
                onChangeText={(text) => setNewCategoryConfig(prev => ({ ...prev, baseUrl: text }))}
                placeholder="输入后端URL或选择已有后端"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>标签 (用逗号分隔)</Text>
              <TextInput
                style={styles.input}
                value={newCategoryConfig.tags ? newCategoryConfig.tags.join(', ') : ''}
                onChangeText={(text) => {
                  const tags = text.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                  setNewCategoryConfig(prev => ({ ...prev, tags }));
                }}
                placeholder="输入标签，用逗号分隔"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 分类详情模态框 */}
      <Modal
        visible={showCategoryDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCategoryDetailModal(false);
              setEditingCategory(null);
              setNewCategoryConfig({ name: '', description: '', baseUrl: 'NODERED', tags: [] });
            }}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCategory ? '编辑分类' : '分类详情'}
            </Text>
            <TouchableOpacity onPress={editingCategory ? handleEditCategory : handleAddCategory}>
              <Text style={styles.modalSave}>
                {editingCategory ? '保存' : '添加'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>分类名称</Text>
              <TextInput
                style={styles.input}
                value={newCategoryConfig.name}
                onChangeText={(text) => setNewCategoryConfig(prev => ({ ...prev, name: text }))}
                placeholder="输入分类名称"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>描述</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newCategoryConfig.description}
                onChangeText={(text) => setNewCategoryConfig(prev => ({ ...prev, description: text }))}
                placeholder="输入分类描述"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>后端URL</Text>
              <TextInput
                style={styles.input}
                value={newCategoryConfig.baseUrl}
                onChangeText={(text) => setNewCategoryConfig(prev => ({ ...prev, baseUrl: text }))}
                placeholder="输入后端URL或选择已有后端"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>标签 (用逗号分隔)</Text>
              <TextInput
                style={styles.input}
                value={newCategoryConfig.tags ? newCategoryConfig.tags.join(', ') : ''}
                onChangeText={(text) => {
                  const tags = text.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                  setNewCategoryConfig(prev => ({ ...prev, tags }));
                }}
                placeholder="输入标签，用逗号分隔"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF'
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666'
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600'
  },
  categoryScroll: {
    marginTop: 10
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10
  },
  activeCategoryChip: {
    backgroundColor: '#007AFF'
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666'
  },
  activeCategoryChipText: {
    color: '#fff',
    fontWeight: '500'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  scrollView: {
    flex: 1
  },
  section: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666'
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  statusSuccess: {
    backgroundColor: '#e8f5e8'
  },
  statusError: {
    backgroundColor: '#ffeaea'
  },
  statusText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500'
  },
  errorList: {
    marginTop: 10
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 5
  },
  backendItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10
  },
  backendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  backendInfo: {
    flex: 1
  },
  backendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  backendKey: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  backendUrl: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4
  },
  backendDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic'
  },
  backendControls: {
    alignItems: 'flex-end'
  },
  backendActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 85,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  testButton: {
    backgroundColor: '#4CAF50'
  },
  editButton: {
    backgroundColor: '#2196F3'
  },
  deleteButton: {
    backgroundColor: '#F44336'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 4
  },
  testSuccess: {
    backgroundColor: '#e8f5e8'
  },
  testFailure: {
    backgroundColor: '#ffeaea'
  },
  testResultText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  primaryButton: {
    backgroundColor: '#2196F3'
  },
  warningButton: {
    backgroundColor: '#FF9800'
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalCancel: {
    fontSize: 16,
    color: '#666'
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500'
  },
  modalContent: {
    flex: 1,
    padding: 15
  },
  formContainer: {
    flex: 1
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 15
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  // 搜索和筛选样式
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  tagContainer: {
    marginBottom: 8,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tagScroll: {
    flexDirection: 'row',
  },
  tagChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeTagChip: {
    backgroundColor: '#34C759',
  },
  tagChipText: {
    fontSize: 12,
    color: '#666',
  },
  activeTagChipText: {
    color: '#fff',
  },
  // 分类列表项样式
  categoryItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  enabledBadge: {
    backgroundColor: '#e8f5e8',
  },
  disabledBadge: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  enabledText: {
    color: '#4CAF50',
  },
  disabledText: {
    color: '#f44336',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  categoryTagText: {
    fontSize: 10,
    color: '#007AFF',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  editButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  
  // 新增端点详细信息样式
  endpointItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  endpointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  endpointInfo: {
    flex: 1,
    marginRight: 12,
  },
  endpointTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  endpointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  endpointBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endpointBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  endpointDetail: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  endpointLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    minWidth: 80,
  },
  endpointValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  endpointDebugInfo: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 8,
  },
  endpointCategory: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  endpointActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 分类点击样式
  categoryItemClickable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedCategoryItem: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  
  // 分类概览样式
  categoryOverview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  categoryOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryOverviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  categoryOverviewCount: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  categoryOverviewDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
});

export default ApiManagementScreen;