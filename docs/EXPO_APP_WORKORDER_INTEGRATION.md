# Expo App 工单系统集成文档

## 概述

本文档详细介绍如何在 Expo 开发的移动应用中集成若依工单系统，包括认证、API 调用、UI 组件实现等完整方案。

## 目录

- [前期准备](#前期准备)
- [项目配置](#项目配置)
- [认证集成](#认证集成)
- [工单 API 集成](#工单-api-集成)
- [UI 组件实现](#ui-组件实现)
- [状态管理](#状态管理)
- [错误处理](#错误处理)
- [安全考虑](#安全考虑)
- [测试指南](#测试指南)

## 前期准备

### 1. 后端配置

确保若依后端已启动并配置好工单模块：

- 工单系统模块已部署
- OAuth2 认证已配置
- 跨域设置已开启
- API 接口可正常访问

### 2. Expo 项目依赖

安装必要的依赖包：

```bash
# 核心依赖
npm install axios react-query @react-native-async-storage/async-storage

# UI 组件库（可选）
npm install react-native-elements react-native-vector-icons

# 表单处理
npm install react-hook-form

# 日期选择器
npm install @react-native-community/datetimepicker

# 文件选择器
npm install expo-document-picker expo-file-system
```
### 2. API 客户端配置

创建 `services/apiClient.js`：

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证令牌
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理令牌过期
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await refreshAccessToken(refreshToken);
          const { access_token } = response.data;
          
          await AsyncStorage.setItem('access_token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失败，跳转到登录页
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        // 这里可以触发导航到登录页面
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```


## 工单 API 集成

### 1. 工单服务

创建 `services/workOrderService.js`：

```javascript
import apiClient from './apiClient';

class WorkOrderService {
  // 获取工单列表
  async getWorkOrders(params = {}) {
    try {
      const response = await apiClient.get('/workorder/work-order/page', {
        params: {
          pageNo: 1,
          pageSize: 20,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 获取工单详情
  async getWorkOrderById(id) {
    try {
      const response = await apiClient.get(`/workorder/work-order/get?id=${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 创建工单
  async createWorkOrder(workOrderData) {
    try {
      const response = await apiClient.post('/workorder/work-order/create', workOrderData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 更新工单
  async updateWorkOrder(workOrderData) {
    try {
      const response = await apiClient.put('/workorder/work-order/update', workOrderData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 处理工单
  async processWorkOrder(id, processData) {
    try {
      const response = await apiClient.put('/workorder/work-order/process', {
        id,
        ...processData
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 完成工单
  async completeWorkOrder(id, remark) {
    try {
      const response = await apiClient.put('/workorder/work-order/complete', {
        id,
        remark
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 关闭工单
  async closeWorkOrder(id, remark) {
    try {
      const response = await apiClient.put('/workorder/work-order/close', {
        id,
        remark
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 退回工单
  async rejectWorkOrder(id, remark) {
    try {
      const response = await apiClient.put('/workorder/work-order/reject', {
        id,
        remark
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 获取工单日志
  async getWorkOrderLogs(workOrderId) {
    try {
      const response = await apiClient.get('/workorder/work-order-log/page', {
        params: {
          workOrderId,
          pageNo: 1,
          pageSize: 100
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  // 错误处理
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(data.msg || `请求失败 (${status})`);
    }
    return new Error('网络连接失败');
  }
}

export default new WorkOrderService();
```

### 2. 数据模型

创建 `models/WorkOrder.js`：

```javascript
// 工单状态枚举
export const WorkOrderStatus = {
  PENDING: 0,      // 待处理
  ASSIGNED: 1,     // 已指派
  IN_PROGRESS: 2,  // 处理中
  COMPLETED: 3,    // 已完成
  CLOSED: 4,       // 已关闭
  REJECTED: 5      // 退回重处理
};

// 工单优先级枚举
export const WorkOrderPriority = {
  LOW: 0,      // 低
  MEDIUM: 1,   // 中
  HIGH: 2,     // 高
  URGENT: 3    // 紧急
};

// 状态标签映射
export const StatusLabels = {
  [WorkOrderStatus.PENDING]: '待处理',
  [WorkOrderStatus.ASSIGNED]: '已指派',
  [WorkOrderStatus.IN_PROGRESS]: '处理中',
  [WorkOrderStatus.COMPLETED]: '已完成',
  [WorkOrderStatus.CLOSED]: '已关闭',
  [WorkOrderStatus.REJECTED]: '退回重处理'
};

// 优先级标签映射
export const PriorityLabels = {
  [WorkOrderPriority.LOW]: '低',
  [WorkOrderPriority.MEDIUM]: '中',
  [WorkOrderPriority.HIGH]: '高',
  [WorkOrderPriority.URGENT]: '紧急'
};

// 状态颜色映射
export const StatusColors = {
  [WorkOrderStatus.PENDING]: '#f39c12',
  [WorkOrderStatus.ASSIGNED]: '#3498db',
  [WorkOrderStatus.IN_PROGRESS]: '#9b59b6',
  [WorkOrderStatus.COMPLETED]: '#27ae60',
  [WorkOrderStatus.CLOSED]: '#95a5a6',
  [WorkOrderStatus.REJECTED]: '#e74c3c'
};

// 优先级颜色映射
export const PriorityColors = {
  [WorkOrderPriority.LOW]: '#27ae60',
  [WorkOrderPriority.MEDIUM]: '#f39c12',
  [WorkOrderPriority.HIGH]: '#e67e22',
  [WorkOrderPriority.URGENT]: '#e74c3c'
};
```

## UI 组件实现

### 1. 工单列表组件

创建 `components/WorkOrderList.js`：

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { useQuery } from 'react-query';
import workOrderService from '../services/workOrderService';
import { StatusLabels, PriorityLabels, StatusColors, PriorityColors } from '../models/WorkOrder';

const WorkOrderList = ({ navigation, filters = {} }) => {
  const [refreshing, setRefreshing] = useState(false);
  
  const {
    data: workOrders,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['workOrders', filters],
    () => workOrderService.getWorkOrders(filters),
    {
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
    }
  );
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  const handleWorkOrderPress = (workOrder) => {
    navigation.navigate('WorkOrderDetail', { workOrderId: workOrder.id });
  };
  
  const renderWorkOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.workOrderItem}
      onPress={() => handleWorkOrderPress(item)}
    >
      <View style={styles.workOrderHeader}>
        <Text style={styles.workOrderTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: StatusColors[item.status] }]}>
          <Text style={styles.statusText}>{StatusLabels[item.status]}</Text>
        </View>
      </View>
      
      <Text style={styles.workOrderDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.workOrderFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: PriorityColors[item.priority] }]}>
          <Text style={styles.priorityText}>{PriorityLabels[item.priority]}</Text>
        </View>
        
        <Text style={styles.createTime}>
          {new Date(item.createTime).toLocaleDateString()}
        </Text>
      </View>
      
      {item.assigneeNickname && (
        <Text style={styles.assignee}>指派给: {item.assigneeNickname}</Text>
      )}
    </TouchableOpacity>
  );
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>加载失败: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <FlatList
      data={workOrders?.data?.list || []}
      renderItem={renderWorkOrderItem}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  workOrderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  workOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workOrderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workOrderDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  workOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  createTime: {
    fontSize: 12,
    color: '#999',
  },
  assignee: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default WorkOrderList;
```

### 2. 创建工单组件

创建 `components/CreateWorkOrder.js`：

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import workOrderService from '../services/workOrderService';
import { WorkOrderPriority, PriorityLabels } from '../models/WorkOrder';

const CreateWorkOrder = ({ navigation }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const queryClient = useQueryClient();
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      priority: WorkOrderPriority.MEDIUM,
      dueDate: new Date(),
      remark: ''
    }
  });
  
  const createMutation = useMutation(
    (data) => workOrderService.createWorkOrder(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('workOrders');
        Alert.alert('成功', '工单创建成功', [
          { text: '确定', onPress: () => navigation.goBack() }
        ]);
      },
      onError: (error) => {
        Alert.alert('错误', error.message);
      }
    }
  );
  
  const onSubmit = (data) => {
    const submitData = {
      ...data,
      dueDate: data.dueDate.toISOString().split('T')[0] // 格式化日期
    };
    createMutation.mutate(submitData);
  };
  
  const onDateChange = (event, selectedDate, onChange) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(selectedDate);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* 标题 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>工单标题 *</Text>
          <Controller
            control={control}
            name="title"
            rules={{ required: '请输入工单标题' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="请输入工单标题"
                maxLength={100}
              />
            )}
          />
          {errors.title && (
            <Text style={styles.errorText}>{errors.title.message}</Text>
          )}
        </View>
        
        {/* 描述 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>工单描述 *</Text>
          <Controller
            control={control}
            name="description"
            rules={{ required: '请输入工单描述' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.textArea, errors.description && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="请详细描述工单内容"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            )}
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description.message}</Text>
          )}
        </View>
        
        {/* 优先级 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>优先级</Text>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={value}
                  onValueChange={onChange}
                  style={styles.picker}
                >
                  {Object.entries(PriorityLabels).map(([key, label]) => (
                    <Picker.Item
                      key={key}
                      label={label}
                      value={parseInt(key)}
                    />
                  ))}
                </Picker>
              </View>
            )}
          />
        </View>
        
        {/* 截止日期 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>截止日期</Text>
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { onChange, value } }) => (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {value.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={value}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) =>
                      onDateChange(event, selectedDate, onChange)
                    }
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          />
        </View>
        
        {/* 备注 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>备注</Text>
          <Controller
            control={control}
            name="remark"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.textArea}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="可选备注信息"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            )}
          />
        </View>
        
        {/* 提交按钮 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            createMutation.isLoading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={createMutation.isLoading}
        >
          <Text style={styles.submitButtonText}>
            {createMutation.isLoading ? '创建中...' : '创建工单'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateWorkOrder;
```

## 状态管理

### 1. React Query 配置

创建 `config/queryClient.js`：

```javascript
import { QueryClient } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default queryClient;
```

### 2. 应用入口配置

在 `App.js` 中配置：

```javascript
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import queryClient from './config/queryClient';

// 导入页面组件
import LoginScreen from './screens/LoginScreen';
import WorkOrderListScreen from './screens/WorkOrderListScreen';
import WorkOrderDetailScreen from './screens/WorkOrderDetailScreen';
import CreateWorkOrderScreen from './screens/CreateWorkOrderScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="WorkOrderList" 
            component={WorkOrderListScreen}
            options={{ title: '工单列表' }}
          />
          <Stack.Screen 
            name="WorkOrderDetail" 
            component={WorkOrderDetailScreen}
            options={{ title: '工单详情' }}
          />
          <Stack.Screen 
            name="CreateWorkOrder" 
            component={CreateWorkOrderScreen}
            options={{ title: '创建工单' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
```

## 错误处理

### 1. 全局错误处理

创建 `utils/errorHandler.js`：

```javascript
import { Alert } from 'react-native';

class ErrorHandler {
  // 处理 API 错误
  static handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return data.msg || '请求参数错误';
        case 401:
          return '认证失败，请重新登录';
        case 403:
          return '没有访问权限';
        case 404:
          return '请求的资源不存在';
        case 500:
          return '服务器内部错误';
        default:
          return data.msg || `请求失败 (${status})`;
      }
    } else if (error.request) {
      return '网络连接失败，请检查网络设置';
    } else {
      return error.message || '未知错误';
    }
  }
  
  // 显示错误提示
  static showError(error, title = '错误') {
    const message = this.handleApiError(error);
    Alert.alert(title, message);
  }
  
  // 记录错误日志
  static logError(error, context = '') {
    console.error(`[${context}] Error:`, error);
    
    // 这里可以集成错误监控服务，如 Sentry
    // Sentry.captureException(error);
  }
}

export default ErrorHandler;
```

## 测试指南

### 1. 单元测试示例

创建 `__tests__/workOrderService.test.js`：

```javascript
import workOrderService from '../services/workOrderService';
import apiClient from '../services/apiClient';

// Mock API client
jest.mock('../services/apiClient');

describe('WorkOrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should get work orders successfully', async () => {
    const mockResponse = {
      data: {
        code: 0,
        data: {
          list: [
            {
              id: 1,
              title: 'Test Work Order',
              description: 'Test Description',
              status: 0,
              priority: 1
            }
          ],
          total: 1
        }
      }
    };
    
    apiClient.get.mockResolvedValue(mockResponse);
    
    const result = await workOrderService.getWorkOrders();
    
    expect(apiClient.get).toHaveBeenCalledWith('/workorder/work-order/page', {
      params: {
        pageNo: 1,
        pageSize: 20
      }
    });
    expect(result).toEqual(mockResponse.data);
  });
  
  test('should handle API error', async () => {
    const mockError = {
      response: {
        status: 500,
        data: { msg: 'Internal Server Error' }
      }
    };
    
    apiClient.get.mockRejectedValue(mockError);
    
    await expect(workOrderService.getWorkOrders()).rejects.toThrow('Internal Server Error');
  });
});
```

### 2. 集成测试

```javascript
// 测试完整的工单创建流程
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateWorkOrder from '../components/CreateWorkOrder';

describe('CreateWorkOrder Integration', () => {
  test('should create work order successfully', async () => {
    const mockNavigation = { goBack: jest.fn() };
    
    const { getByPlaceholderText, getByText } = render(
      <CreateWorkOrder navigation={mockNavigation} />
    );
    
    // 填写表单
    fireEvent.changeText(
      getByPlaceholderText('请输入工单标题'),
      'Test Work Order'
    );
    fireEvent.changeText(
      getByPlaceholderText('请详细描述工单内容'),
      'Test Description'
    );
    
    // 提交表单
    fireEvent.press(getByText('创建工单'));
    
    // 验证结果
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
```


### 2. 构建配置

在 `app.json` 中配置：

```json
{
  "expo": {
    "name": "WorkOrder App",
    "slug": "workorder-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.workorderapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yourcompany.workorderapp"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 总结

本文档提供了在 Expo 应用中集成若依工单系统的完整方案，包括：

1. **认证集成**：OAuth2 密码模式认证，自动令牌刷新
2. **API 集成**：完整的工单 CRUD 操作和状态管理
3. **UI 组件**：工单列表、创建表单、详情页面等
4. **状态管理**：使用 React Query 进行数据缓存和同步
5. **错误处理**：统一的错误处理和用户提示
7. **测试策略**：单元测试和集成测试示例

通过遵循本文档的指导，您可以快速在 Expo 应用中集成功能完整的工单系统，为用户提供便捷的移动端工单管理体验。

## 相关资源

- [Expo 官方文档](https://docs.expo.dev/)
- [React Query 文档](https://react-query.tanstack.com/)
- [React Hook Form 文档](https://react-hook-form.com/)
- [若依框架文档](http://doc.ruoyi.vip/)

