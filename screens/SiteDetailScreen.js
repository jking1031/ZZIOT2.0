import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Modal, TextInput, TouchableOpacity, AppState, Platform, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; // 导入Ionicons图标
import axios from 'axios';
import * as Device from 'expo-device'; // 导入设备信息模块
import AsyncStorage from '@react-native-async-storage/async-storage'; // 导入AsyncStorage

// 添加全局引用，解决组件重复挂载问题
const globalWSRef = { current: null };
const globalHeartbeatRef = { current: null };
const globalReconnectTimeoutRef = { current: null };
const globalConnected = { current: false };

function SiteDetailScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { siteId, siteName, departments = [] } = route.params;
  const { user, userRoles } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [inData, setInData] = useState([]);
  const [outData, setOutData] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceFrequency, setDeviceFrequency] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newFrequency, setNewFrequency] = useState('');
  const [isValve, setIsValve] = useState([]);
  const [updateTimer, setUpdateTimer] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [siteDepartments, setSiteDepartments] = useState(departments);
  const [hasControlPermission, setHasControlPermission] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false); // 添加手动刷新状态
  
  // WebSocket相关状态
  const [wsConnected, setWsConnected] = useState(globalConnected.current);
  const [pendingCommands, setPendingCommands] = useState({});
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // 引用 - 保留本地引用但优先使用全局引用
  const currentAppState = useRef(AppState.currentState);
  const timerRef = useRef(null);
  const controllerRef = useRef(null);
  const wsRef = useRef(globalWSRef.current); // 使用全局WS引用
  const heartbeatIntervalRef = useRef(globalHeartbeatRef.current);
  const reconnectTimeoutRef = useRef(globalReconnectTimeoutRef.current);

  // 添加flow引用作为组件状态
  const [wsStatusTimeout, setWsStatusTimeout] = useState(null);

  // 检查用户是否有权限控制设备
  const checkControlPermission = useCallback(() => {
    // 检查是否有userRoles和siteDepartments
    if (!userRoles || !siteDepartments || siteDepartments.length === 0) {
      console.log('无法检查权限: 缺少角色或部门信息');
      setHasControlPermission(false);
      return false;
    }
    
    // 管理员始终有权限
    if (user && (user.is_admin === 1 || user.isAdmin === true)) {
      console.log('管理员拥有完全控制权限');
      setHasControlPermission(true);
      return true;
    }
    
    // 从userRoles中提取角色名称
    const userRoleNames = userRoles.map(role => {
      // role可能是对象或直接是ID
      if (typeof role === 'object' && role !== null) {
        // 从roleMap中获取角色名称
        const roleId = role.id || role.role_id;
        // 在这里确保通过ID找到正确的角色名
        if (roleId) {
          // 角色映射示例（在实际实现中，这应该是从Context或API获取）
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
          return roleMap[roleId] || role.name;
        }
        return role.name;
      }
      return role; // 如果role直接是名称字符串
    }).filter(name => name); // 移除undefined或null
    
    console.log('用户角色:', userRoleNames);
    console.log('站点部门:', siteDepartments);
    
    // 检查用户角色是否与站点部门匹配
    const hasPermission = userRoleNames.some(roleName => 
      siteDepartments.includes(roleName)
    );
    
    console.log('控制权限检查结果:', hasPermission);
    setHasControlPermission(hasPermission);
    return hasPermission;
  }, [user, userRoles, siteDepartments]);

  // 在siteDepartments改变时检查权限
  useEffect(() => {
    checkControlPermission();
  }, [siteDepartments, userRoles, checkControlPermission]);

  // 首先声明fetchSiteDetailHttp函数
  const fetchSiteDetailHttp = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await axios.get(`https://nodered.jzz77.cn:9003/api/sites/site/${siteId}`, {
        signal: controller.signal,
        timeout: 10000
      });

      if (response.data) {
        const data = response.data;
        if (data.indata) setInData(data.indata);
        if (data.outdata) setOutData(data.outdata);
        if (data.devices) setDevices(data.devices);
        if (data.deviceFrequency) setDeviceFrequency(data.deviceFrequency);
        if (data.isValve) setIsValve(data.isValve);
        if (data.departments) setSiteDepartments(data.departments);
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        // 请求被取消，不需要记录日志
      } else {
        console.error('获取站点数据失败:', error);
      }
    }
  }, [siteId]);

  // 然后声明fetchSiteDetail函数
  const fetchSiteDetail = useCallback(async () => {
    // 如果WebSocket已连接，优先通过WebSocket请求最新状态
    if (wsConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'get_device_status',
          siteId,
          timestamp: Date.now()
        }));
        
        // 设置短暂的超时，如果WebSocket响应太慢则回退到HTTP
        const timeout = setTimeout(() => {
          fetchSiteDetailHttp();
        }, 5000); // 5秒超时
        
        // 保存超时引用以便取消
        setWsStatusTimeout(timeout);
        
        // 直接返回，等待WebSocket推送
        return;
      } catch (e) {
        console.error('通过WebSocket请求设备状态失败:', e);
        // 失败时继续使用HTTP
      }
    }
    
    // WebSocket不可用或请求失败时，使用HTTP API
    fetchSiteDetailHttp();
  }, [siteId, wsConnected, wsRef, fetchSiteDetailHttp]);

  const startDataFetching = useCallback(() => {
    // 避免重复调用
    if (!timerRef.current) {
      fetchSiteDetail();
      timerRef.current = setInterval(() => fetchSiteDetail(), 30000);
      setUpdateTimer(timerRef.current);
    }
  }, [fetchSiteDetail]);

  const stopDataFetching = useCallback(() => {
    // 清除定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setUpdateTimer(null);
    }
    
    // 取消正在进行的请求
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  // 添加操作日志记录函数
  const logOperation = useCallback(async (deviceName, operationType, operationContent) => {
    try {
      // 准备客户端信息
      let deviceInfo = "Unknown Device";
      try {
        if (Device && typeof Device.getDeviceTypeAsync === 'function') {
          const deviceType = await Device.getDeviceTypeAsync();
          const brand = Device.brand || '';
          deviceInfo = `${brand} (${deviceType})`;
        }
      } catch (deviceError) {
        console.log('获取设备信息失败:', deviceError);
      }
      
      const osVersion = `${Platform.OS} ${Platform.Version}`;
      const clientInfo = `${deviceInfo} - ${osVersion}`;
      
      // 准备日志数据
      const logData = {
        user_id: user?.id || 0,
        username: user?.username || '未知用户',
        site_id: siteId,
        site_name: siteName,
        device_name: deviceName,
        operation_type: operationType,
        operation_content: operationContent,
        operation_time: new Date().toISOString(), // 添加客户端时间
        client_info: clientInfo
      };
      
      console.log('准备发送日志数据:', JSON.stringify(logData));
      
      // 发送日志到服务器
      try {
        const response = await axios.post('https://nodered.jzz77.cn:9003/api/logs', logData, {
          timeout: 10000, // 增加超时时间
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log('操作日志已记录:', response.status);
      } catch (apiError) {
        console.error('发送日志到服务器失败:', apiError.message);
        
        // 将失败的日志保存到本地，后续可以实现自动重发机制
        try {
          // 获取现有失败日志
          const existingLogsStr = await AsyncStorage.getItem('failed_operation_logs');
          let existingLogs = [];
          if (existingLogsStr) {
            existingLogs = JSON.parse(existingLogsStr);
          }
          
          // 添加新的失败日志
          existingLogs.push({
            ...logData,
            failed_at: new Date().toISOString()
          });
          
          // 只保留最近的50条记录，避免存储过多
          if (existingLogs.length > 50) {
            existingLogs = existingLogs.slice(existingLogs.length - 50);
          }
          
          // 保存回本地存储
          await AsyncStorage.setItem('failed_operation_logs', JSON.stringify(existingLogs));
          console.log('已将失败的日志保存到本地');
        } catch (storageError) {
          console.error('保存日志到本地存储失败:', storageError);
        }
      }
    } catch (error) {
      // 记录日志失败不应影响主要功能
      console.error('记录操作日志失败:', error);
    }
  }, [user, siteId, siteName]);

  // 修改心跳机制使用全局引用
  const setupHeartbeat = useCallback(() => {
    if (globalHeartbeatRef.current) {
      clearInterval(globalHeartbeatRef.current);
    }
    
    globalHeartbeatRef.current = setInterval(() => {
      if (globalWSRef.current && globalWSRef.current.readyState === WebSocket.OPEN) {
        try {
          globalWSRef.current.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: Date.now(),
            siteId,
            clientId: `mobile_${Platform.OS}_${Math.random().toString(36).substring(7)}`
          }));
        } catch (e) {
          console.error('发送心跳失败:', e);
          // 心跳失败，尝试重新连接
          if (globalWSRef.current) {
            globalWSRef.current.close();
          }
        }
      }
    }, 15000); // 降低到15秒发送一次心跳
    
    heartbeatIntervalRef.current = globalHeartbeatRef.current;
  }, [siteId]);
  
  // 处理设备状态更新
  const handleDeviceStatusUpdate = useCallback((data) => {
    // 处理设备运行状态更新
    if (data.devices && Array.isArray(data.devices)) {
      setDevices(prevDevices => {
        // 创建设备映射，提高更新效率
        const deviceMap = {};
        prevDevices.forEach(device => {
          deviceMap[device.name] = device;
        });
        
        // 将新状态合并到映射中
        data.devices.forEach(updatedDevice => {
          if (deviceMap[updatedDevice.name]) {
            deviceMap[updatedDevice.name] = { ...deviceMap[updatedDevice.name], ...updatedDevice };
          } else {
            // 如果是新设备，直接添加
            deviceMap[updatedDevice.name] = updatedDevice;
          }
        });
        
        // 转换回数组
        return Object.values(deviceMap);
      });
    }
    
    // 处理阀门状态更新
    if (data.valves && Array.isArray(data.valves)) {
      setIsValve(prevValves => {
        // 创建阀门映射
        const valveMap = {};
        prevValves.forEach(valve => {
          valveMap[valve.name] = valve;
        });
        
        // 合并新状态
        data.valves.forEach(updatedValve => {
          if (valveMap[updatedValve.name]) {
            valveMap[updatedValve.name] = { ...valveMap[updatedValve.name], ...updatedValve };
          } else {
            valveMap[updatedValve.name] = updatedValve;
          }
        });
        
        return Object.values(valveMap);
      });
    }
    
    // 处理频率设备更新
    if (data.frequencies && Array.isArray(data.frequencies)) {
      setDeviceFrequency(prevFreq => {
        // 创建频率设备映射
        const freqMap = {};
        prevFreq.forEach(freq => {
          freqMap[freq.name] = freq;
        });
        
        // 合并新状态
        data.frequencies.forEach(updatedFreq => {
          if (freqMap[updatedFreq.name]) {
            freqMap[updatedFreq.name] = { ...freqMap[updatedFreq.name], ...updatedFreq };
          } else {
            freqMap[updatedFreq.name] = updatedFreq;
          }
        });
        
        return Object.values(freqMap);
      });
    }
    
    // 处理传感器数据点更新
    if (data.indata && Array.isArray(data.indata)) {
      setInData(prevData => {
        const dataMap = {};
        prevData.forEach(point => {
          dataMap[point.name] = point;
        });
        
        data.indata.forEach(updatedPoint => {
          if (dataMap[updatedPoint.name]) {
            dataMap[updatedPoint.name] = { ...dataMap[updatedPoint.name], ...updatedPoint };
          } else {
            dataMap[updatedPoint.name] = updatedPoint;
          }
        });
        
        return Object.values(dataMap);
      });
    }
    
    if (data.outdata && Array.isArray(data.outdata)) {
      setOutData(prevData => {
        const dataMap = {};
        prevData.forEach(point => {
          dataMap[point.name] = point;
        });
        
        data.outdata.forEach(updatedPoint => {
          if (dataMap[updatedPoint.name]) {
            dataMap[updatedPoint.name] = { ...dataMap[updatedPoint.name], ...updatedPoint };
          } else {
            dataMap[updatedPoint.name] = updatedPoint;
          }
        });
        
        return Object.values(dataMap);
      });
    }
    
    // 清除WebSocket超时定时器
    if (wsStatusTimeout) {
      clearTimeout(wsStatusTimeout);
      setWsStatusTimeout(null);
    }
  }, [wsStatusTimeout]);
  
  // 处理命令反馈
  const handleCommandFeedback = useCallback((data) => {
    const deviceId = data.deviceId || data.deviceName || data.valveName;
    
    if (deviceId) {
      // 更新命令状态
      setPendingCommands(prev => ({
        ...prev,
        [deviceId]: {
          status: data.success ? 'success' : 'error',
          message: data.message,
          timestamp: Date.now()
        }
      }));
      
      // 如果是成功的反馈，3秒后自动清除状态显示
      if (data.success) {
        setTimeout(() => {
          setPendingCommands(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
          });
        }, 3000);
      }
    }
  }, []);
  
  // 修改setupWebSocket以使用全局引用
  const setupWebSocket = useCallback(() => {
    // 严格检查，不允许在未进入页面的状态下建立连接
    if (!navigation.isFocused()) {
      return;
    }
    
    // 防止重复连接 - 更全面的状态检查
    if (globalWSRef.current) {
      // 使用全局引用检查连接状态
      if (globalWSRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current = globalWSRef.current; // 确保本地引用同步
        return;
      }
      
      if (globalWSRef.current.readyState === WebSocket.OPEN) {
        wsRef.current = globalWSRef.current; // 确保本地引用同步
        
        // 如果全局连接已存在，但本地状态未更新，则更新本地状态
        if (!wsConnected) {
          setWsConnected(true);
          globalConnected.current = true;
        }
        return;
      }
      
      // 重要: 移除所有旧事件监听器
      const oldSocket = globalWSRef.current;
      oldSocket.onclose = null; // 阻止旧连接触发重连
      oldSocket.onerror = null;
      oldSocket.onopen = null;
      oldSocket.onmessage = null;
      
      try {
        if (oldSocket.readyState === WebSocket.CONNECTING || 
            oldSocket.readyState === WebSocket.OPEN) {
          oldSocket.close();
        }
      } catch (e) {
        console.error('关闭旧连接时出错:', e);
      }
      
      globalWSRef.current = null;
      wsRef.current = null;
    }
    
    // 清除任何现有重连计时器
    if (globalReconnectTimeoutRef.current) {
      clearTimeout(globalReconnectTimeoutRef.current);
      globalReconnectTimeoutRef.current = null;
      reconnectTimeoutRef.current = null;
    }
    
    // 如果重连次数过多，延长等待时间并限制最大尝试次数
    if (reconnectAttempts > 10) {
      setWsConnected(false);
      return;
    }
    
    // 创建新连接
    try {
      // 添加时间戳和随机数，避免缓存问题
      const socket = new WebSocket(`wss://nodered.jzz77.cn:9003/ws/device${siteId}?t=${Date.now()}&client=mobile`);
      
      socket.onopen = () => {
        setWsConnected(true);
        globalConnected.current = true;
        setReconnectAttempts(0); // 重置重连计数
        
        // 连接建立后立即发送一个初始化消息，帮助服务器识别连接
        try {
          socket.send(JSON.stringify({
            type: 'init',
            siteId,
            clientInfo: {
              platform: Platform.OS,
              version: Platform.Version,
              timestamp: Date.now()
            }
          }));
        } catch (e) {
          console.error('发送初始化消息失败:', e);
        }
        
        // 连接成功后延迟1秒再请求设备状态
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({
                type: 'get_device_status',
                siteId
              }));
            } catch (e) {
              console.error('发送状态请求失败:', e);
            }
          }
        }, 1000);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            // 处理心跳响应
            return;
          }
          
          if (data.type === 'device_status') {
            // 设备状态完整更新 - 交由专门函数处理
            handleDeviceStatusUpdate(data);
            
            // 更新最后一次更新时间
            setLastUpdateTime(new Date());
          }
          
          if (data.type === 'device_status_change') {
            // 处理增量设备状态更新
            handleDeviceStatusUpdate(data);
            
            // 更新最后一次更新时间
            setLastUpdateTime(new Date());
          }
          
          if (data.type === 'command_feedback') {
            // 处理命令反馈
            handleCommandFeedback(data);
          }
          
          // 处理设备事件消息
          if (data.type === 'device_event') {
            // 设备事件(报警、故障等)
            
            // 如果是报警事件，可以触发UI提示
            if (data.eventType === 'alarm' && data.alarmDetails) {
              // 这里可以添加报警通知逻辑
            }
            
            // 如果事件包含状态更新，同样更新设备状态
            if (data.devices || data.valves || data.frequencies) {
              handleDeviceStatusUpdate(data);
            }
          }
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };
      
      socket.onclose = (event) => {
        setWsConnected(false);
        
        // 清理心跳定时器
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // 仅在应用前台且页面焦点在当前页面且未达到最大重试次数时重连
        if (AppState.currentState === 'active' && navigation.isFocused()) {
          // 正常关闭(1000)或未授权(1003)不需要重试
          if (event.code === 1000 || event.code === 1003) {
            return;
          }
          
          // 如果服务器回复502等错误，使用更长的重连延迟
          let baseDelay = 1000;
          if (event.reason && event.reason.includes('502')) {
            baseDelay = 5000;
          }
          
          const maxReconnectDelay = 60000; // 最大60秒重连间隔
          const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts), maxReconnectDelay);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // 再次检查页面是否仍然可见
            if (navigation.isFocused()) {
              setReconnectAttempts(prev => prev + 1);
              setupWebSocket();
            }
          }, delay);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
      };
      
      // 使用全局引用保存socket
      globalWSRef.current = socket;
      wsRef.current = socket;
      
      // 设置心跳
      setupHeartbeat();
      
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      setWsConnected(false);
      
      // 连接失败也增加重试计数，但仅在页面可见时
      if (navigation.isFocused()) {
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          setupWebSocket();
        }, delay);
      }
    }
  }, [siteId, reconnectAttempts, navigation, handleDeviceStatusUpdate, handleCommandFeedback, setupHeartbeat]);
  
  // 修改WebSocket发送命令函数使用全局引用
  const sendCommandWs = useCallback((command) => {
    // 优先使用全局引用
    const activeWS = globalWSRef.current || wsRef.current;
    
    if (!activeWS || activeWS.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法发送命令');
      return Promise.reject(new Error('WebSocket未连接'));
    }
    
    // 显示处理中状态
    setPendingCommands(prev => ({
      ...prev,
      [command.deviceName || command.valveName]: {
        status: 'pending',
        timestamp: Date.now()
      }
    }));
    
    // 发送命令
    activeWS.send(JSON.stringify({
      ...command,
      type: 'command',
      siteId,
      timestamp: Date.now()
    }));
    
    // 设置5秒超时
    setTimeout(() => {
      setPendingCommands(prev => {
        // 如果5秒后仍是pending状态，显示超时
        if (prev[command.deviceName || command.valveName]?.status === 'pending') {
          return {
            ...prev,
            [command.deviceName || command.valveName]: { 
              status: 'timeout', 
              message: '响应超时，请检查设备状态',
              timestamp: Date.now() 
            }
          };
        }
        return prev;
      });
    }, 5000);
    
    return Promise.resolve();
  }, [siteId]);

  // 统一处理组件挂载、页面焦点变化和应用状态变化
  useEffect(() => {
    // 设置页面标题
    navigation.setOptions({
      title: siteName || '站点详情'
    });

    // 初始获取数据并开始定时更新
    startDataFetching();
    
    // 检查是否已有全局连接
    if (globalWSRef.current && globalWSRef.current.readyState === WebSocket.OPEN) {
      wsRef.current = globalWSRef.current;
      setWsConnected(true);
    }
    
    // 初始检查权限
    checkControlPermission();
    
    // 仅当页面获得焦点时处理WebSocket连接
    let hadFocus = false; // 记录是否曾经获得过焦点
    
    // 处理页面焦点变化
    const focusUnsubscribe = navigation.addListener('focus', () => {
      startDataFetching();
      
      // 确保只有在实际用户交互导致的焦点变化才连接WebSocket
      // 延迟连接以避免启动时的自动连接
      setTimeout(() => {
        if (navigation.isFocused()) {
          hadFocus = true;
          
          // 只有在WebSocket未连接时才尝试连接
          if (!globalConnected.current && !globalWSRef.current) {
            setupWebSocket();
          } else if (globalWSRef.current && globalWSRef.current.readyState === WebSocket.OPEN) {
            wsRef.current = globalWSRef.current;
            setWsConnected(true);
          }
        }
      }, 500);
    });
    
    const blurUnsubscribe = navigation.addListener('blur', () => {
      stopDataFetching();
      // 页面失去焦点时不关闭WebSocket
    });

    // 处理应用状态变化
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (currentAppState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 应用从后台恢复
        
        if (navigation.isFocused()) {
          startDataFetching();
          
          // 只有在WebSocket未连接且页面曾经获得过焦点时才尝试连接
          if (!globalConnected.current && !globalWSRef.current && hadFocus) {
            setupWebSocket();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // 应用进入后台
        stopDataFetching();
        // 不关闭WebSocket连接，允许后台接收推送
      }
      currentAppState.current = nextAppState;
    });

    // 重要修改：清理函数不再立即关闭WebSocket
    return () => {
      stopDataFetching();
      focusUnsubscribe();
      blurUnsubscribe();
      appStateSubscription.remove();
      
      // 关键变化：不立即关闭WebSocket，而是保留给其他实例使用
      // 只清除本地引用，但保留全局引用
      wsRef.current = null;
      
      // 仅清除本地计时器引用
      heartbeatIntervalRef.current = null;
      reconnectTimeoutRef.current = null;
    };
  }, [navigation, siteName, startDataFetching, stopDataFetching, setupWebSocket, wsConnected]);

  // 添加一个组件卸载前的清理函数，只在应用真正退出时执行
  useEffect(() => {
    // 此效果仅处理应用退出时的清理
    return () => {
      // 应用退出时才清理全局资源
      const isLastInstance = navigation.getState().routes.findIndex(
        route => route.name === 'SiteDetailScreen'
      ) === -1;
      
      if (isLastInstance && globalWSRef.current) {
        if (globalWSRef.current.readyState === WebSocket.OPEN) {
          try {
            // 发送关闭消息
            globalWSRef.current.send(JSON.stringify({
              type: 'client_close',
              siteId,
              reason: 'app_exit'
            }));
          } catch (e) {
            console.error('发送关闭消息失败:', e);
          }
        }
        
        // 移除所有事件监听器
        globalWSRef.current.onclose = null;
        globalWSRef.current.onerror = null;
        globalWSRef.current.onopen = null;
        globalWSRef.current.onmessage = null;
        
        try {
          globalWSRef.current.close(1000, "Normal closure");
        } catch (e) {
          console.error('关闭WebSocket连接错误:', e);
        }
        
        globalWSRef.current = null;
        globalConnected.current = false;
      }
      
      if (globalHeartbeatRef.current) {
        clearInterval(globalHeartbeatRef.current);
        globalHeartbeatRef.current = null;
      }
      
      if (globalReconnectTimeoutRef.current) {
        clearTimeout(globalReconnectTimeoutRef.current);
        globalReconnectTimeoutRef.current = null;
      }
    };
  }, [navigation, siteId]);

  // 保留原有HTTP控制命令逻辑作为备份
  const sendCommand = async (command) => {
    try {
      const response = await axios.post(`https://nodered.jzz77.cn:9003/api/site/${siteId}/command`, command, {
        timeout: 10000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });
      
      // 发送命令后立即获取最新数据
      await fetchSiteDetail();
      return response.data;
    } catch (error) {
      console.error('发送控制命令失败:', error);
      throw error;
    }
  };

  // 修改设备控制函数使用WebSocket
  const handleDeviceControl = async (deviceName, action) => {
    // 权限检查
    if (!hasControlPermission) {
      Alert.alert('权限不足', '您没有控制此设备的权限');
      return;
    }

    try {
      // 记录操作日志
      const operationContent = `${action === 'start' ? '启动' : '停止'}设备`;
      logOperation(deviceName, '设备控制', operationContent);
      
      // 使用WebSocket发送命令
      await sendCommandWs({
        type: 'device_control',
        deviceName,
        action
      });
    } catch (error) {
      console.error('设备控制失败:', error);
      // 如果WebSocket失败，尝试回退到HTTP
      try {
        await sendCommand({
          type: 'device_control',
          deviceName,
          action
        });
      } catch (httpError) {
        console.error('HTTP设备控制也失败:', httpError);
      }
    }
  };

  // 修改阀门控制函数使用WebSocket
  const handleValveControl = async (valveName, action, openKey, closeKey) => {
    // 权限检查
    if (!hasControlPermission) {
      Alert.alert('权限不足', '您没有控制此阀门的权限');
      return;
    }

    try {
      // 记录操作日志
      const operationContent = `${action === 'open' ? '打开' : '关闭'}阀门`;
      logOperation(valveName, '阀门控制', operationContent);
      
      // 使用WebSocket发送命令
      await sendCommandWs({
        type: 'valve_control',
        valveName,
        action,
        openKey,
        closeKey
      });
    } catch (error) {
      console.error('阀门控制失败:', error);
      // 如果WebSocket失败，尝试回退到HTTP
      try {
        await sendCommand({
          type: 'valve_control',
          valveName,
          action,
          openKey,
          closeKey
        });
      } catch (httpError) {
        console.error('HTTP阀门控制也失败:', httpError);
      }
    }
  };

  // 修改频率设置函数使用WebSocket
  const handleSetFrequency = async (deviceName, frequency) => {
    // 权限检查
    if (!hasControlPermission) {
      Alert.alert('权限不足', '您没有设置此设备频率的权限');
      return;
    }

    try {
      // 记录操作日志
      const operationContent = `设置频率为 ${frequency} Hz`;
      logOperation(deviceName, '频率设置', operationContent);
      
      // 使用WebSocket发送命令
      await sendCommandWs({
        type: 'set_frequency',
        deviceName,
        frequency: parseFloat(frequency)
      });
    } catch (error) {
      console.error('设置频率失败:', error);
      // 如果WebSocket失败，尝试回退到HTTP
      try {
        await sendCommand({
          type: 'set_frequency',
          deviceName,
          frequency: parseFloat(frequency)
        });
      } catch (httpError) {
        console.error('HTTP设置频率也失败:', httpError);
      }
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchSiteDetail();
    setRefreshing(false);
  }, []);
  
  // 添加手动刷新函数，与下拉刷新功能区分
  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshing) return; // 防止重复刷新
    
    setManualRefreshing(true);
    try {
      await fetchSiteDetail();
    } catch (error) {
      console.error('手动刷新数据失败:', error);
    } finally {
      // 延迟关闭刷新状态，提供更好的视觉反馈
      setTimeout(() => {
        setManualRefreshing(false);
      }, 600);
    }
  }, [manualRefreshing, fetchSiteDetail]);

  // 操作状态显示组件
  const CommandStatusDisplay = ({ deviceId }) => {
    const command = pendingCommands[deviceId];
    
    if (!command) return null;
    
    let statusColor, statusText, icon;
    
    switch (command.status) {
      case 'pending':
        statusColor = '#FFA000';
        statusText = '处理中...';
        icon = '⏳';
        break;
      case 'success':
        statusColor = '#4CAF50';
        statusText = command.message || '操作成功';
        icon = '✓';
        break;
      case 'error':
        statusColor = '#FF5252';
        statusText = command.message || '操作失败';
        icon = '⚠️';
        break;
      case 'timeout':
        statusColor = '#FF9800';
        statusText = '响应超时';
        icon = '⏱️';
        break;
      default:
        return null;
    }
    
    return (
      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
        <Text style={{ color: statusColor }}>{icon} {statusText}</Text>
      </View>
    );
  };

  // 连接状态组件
  const ConnectionStatus = () => (
    <View style={styles.connectionRow}>
      <View style={[styles.connectionStatus, { backgroundColor: wsConnected ? '#4CAF50' : '#FF5252' }]} />
      <Text style={[styles.connectionText, { color: colors.text }]}>
        {wsConnected 
          ? '设备控制已连接' 
          : '设备控制未连接'}
      </Text>
    </View>
  );

  const renderDataCard = (item, index) => (
    <View
      key={`${item.name}-${index}`}
      style={[
        styles.card,
        { backgroundColor: colors.card },
        item.alarm === 1 && styles.alarmCard
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <View style={styles.dataContainer}>
        <Text style={[styles.dataValue, { color: item.alarm === 1 ? '#FF5252' : colors.text }]}>
          {item.data.toFixed(2)}
        </Text>
        <Text style={[styles.dataUnit, { color: colors.text }]}>{item.dw}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor={colors.text}
          />
        }
      >
      <View style={[styles.connectionStatusContainer, { backgroundColor: colors.card }]}>
        <View style={styles.connectionHeader}>
          <View style={styles.statusGroup}>
            <View style={styles.connectionRow}>
              <View style={[styles.connectionStatus, { backgroundColor: updateTimer ? '#4CAF50' : '#FF5252' }]} />
              <Text style={[styles.connectionText, { color: colors.text }]}>
                {updateTimer ? '自动更新已开启' : '自动更新已关闭'}
              </Text>
            </View>
            
            <ConnectionStatus />
          </View>
          
          <View style={styles.timeAndRefreshContainer}>
            {lastUpdateTime && (
              <Text style={[styles.lastUpdateText, { color: colors.text }]}>
                更新时间：{lastUpdateTime.toLocaleString('zh-CN', { hour12: false })}
              </Text>
            )}
            
            <TouchableOpacity 
              style={[styles.refreshButton, manualRefreshing && styles.refreshingButton]}
              onPress={handleManualRefresh}
              disabled={manualRefreshing}
            >
              {manualRefreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="refresh" size={18} color="#2196F3" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {inData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>进水数据</Text>
          <View style={styles.cardGrid}>
            {inData.map(renderDataCard)}
          </View>
        </View>
      )}

      {outData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>出水数据</Text>
          <View style={styles.cardGrid}>
            {outData.map(renderDataCard)}
          </View>
        </View>
      )}

      {deviceFrequency.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>设备频率</Text>
          <View style={styles.cardGrid}>
            {deviceFrequency.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => {
                  if (!hasControlPermission) {
                    Alert.alert('权限不足', '您没有设置此设备频率的权限');
                    return;
                  }
                  setSelectedDevice(item);
                  setNewFrequency(item.sethz?.toString() || '');
                  setModalVisible(true);
                }}
                disabled={pendingCommands[item.name]?.status === 'pending' || !hasControlPermission}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                <View style={styles.dataContainer}>
                  <Text style={[styles.dataValue, { color: colors.text }]}>
                    {item.hz?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={[styles.dataUnit, { color: colors.text }]}>Hz</Text>
                </View>
                {item.sethz !== undefined && (
                  <Text style={[styles.frequencySetpoint, { color: colors.text }]}>
                    设定值: {item.sethz?.toFixed(2) || '0.00'} Hz
                  </Text>
                )}
                <CommandStatusDisplay deviceId={item.name} />
                {!hasControlPermission && (
                  <View style={styles.noPermissionBadge}>
                    <Text style={styles.noPermissionText}>无控制权限</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {devices.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>设备控制</Text>
          <View style={styles.cardGrid}>
            {devices.map((device) => (
              <View
                key={device.name}
                style={[styles.card, { backgroundColor: colors.card }, device.fault === 1 && styles.alarmCard]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{device.name}</Text>
                <View style={styles.deviceControlContainer}>
                  <View style={styles.statusContainer}>
                    <Text style={[styles.deviceStatus, { color: device.run ? '#4CAF50' : '#FF5252' }]}>
                      {device.run ? '运行中' : '已停止'}
                    </Text>
                    {device.fault === 1 && (
                      <Text style={styles.alarmStatus}>报警</Text>
                    )}
                  </View>
                  <View style={styles.controlButtonContainer}>
                    <TouchableOpacity
                      onPress={() => handleDeviceControl(device.name, device.run ? 'stop' : 'start')}
                      disabled={pendingCommands[device.name]?.status === 'pending' || !hasControlPermission}
                    >
                      <Text
                        style={[
                          styles.controlButton, 
                          { backgroundColor: device.run ? '#FF5252' : '#4CAF50' },
                          (pendingCommands[device.name]?.status === 'pending' || !hasControlPermission) && { opacity: 0.6 }
                        ]}
                      >
                        {pendingCommands[device.name]?.status === 'pending' 
                          ? '处理中...' 
                          : device.run ? '停止' : '启动'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <CommandStatusDisplay deviceId={device.name} />
                {!hasControlPermission && (
                  <View style={styles.noPermissionBadge}>
                    <Text style={styles.noPermissionText}>无控制权限</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
      {isValve.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>阀门控制</Text>
          <View style={styles.cardGrid}>
            {isValve.map((valve) => (
              <View
                key={valve.name}
                style={[styles.card, { backgroundColor: colors.card }, valve.fault === 1 && styles.alarmCard]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{valve.name}</Text>
                <View style={styles.deviceControlContainer}>
                  <View style={styles.statusContainer}>
                    <Text style={[styles.deviceStatus, { color: valve.open ? '#4CAF50' : valve.close ? '#FF5252' : '#FFA000' }]}>
                      {valve.open ? '开到位' : valve.close ? '关到位' : '状态未知'}
                    </Text>
                    {valve.fault === 1 && (
                      <Text style={styles.alarmStatus}>故障</Text>
                    )}
                  </View>
                  <View style={styles.controlButtonContainer}>
                    <TouchableOpacity
                      onPress={() => handleValveControl(
                        valve.name,
                        valve.open ? 'close' : 'open',
                        valve.openKey,
                        valve.closeKey
                      )}
                      disabled={valve.fault === 1 || pendingCommands[valve.name]?.status === 'pending' || !hasControlPermission}
                    >
                      <Text
                        style={[
                          styles.controlButton,
                          { backgroundColor: valve.open ? '#FF5252' : '#4CAF50' },
                          (valve.fault === 1 || pendingCommands[valve.name]?.status === 'pending' || !hasControlPermission) && { opacity: 0.5 }
                        ]}
                      >
                        {pendingCommands[valve.name]?.status === 'pending' 
                          ? '处理中...' 
                          : valve.open ? '关闭' : '开启'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <CommandStatusDisplay deviceId={valve.name} />
                {!hasControlPermission && (
                  <View style={styles.noPermissionBadge}>
                    <Text style={styles.noPermissionText}>无控制权限</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedDevice?.name} - 频率设定
            </Text>
            <TextInput
              style={[styles.frequencyInput, { 
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text
              }]}
              placeholder="请输入频率值"
              placeholderTextColor={colors.text}
              keyboardType="numeric"
              value={newFrequency}
              onChangeText={setNewFrequency}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  if (selectedDevice && newFrequency) {
                    handleSetFrequency(selectedDevice.name, newFrequency);
                    setModalVisible(false);
                  }
                }}
                disabled={pendingCommands[selectedDevice?.name]?.status === 'pending'}
              >
                <Text style={styles.modalButtonText}>
                  {pendingCommands[selectedDevice?.name]?.status === 'pending' ? '处理中...' : '确认'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  connectionStatusContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusGroup: {
    flex: 1,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectionStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666666',
    marginRight: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  dataContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dataValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 3,
    letterSpacing: 0.3,
  },
  dataUnit: {
    fontSize: 11,
    opacity: 0.8,
  },
  deviceControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deviceStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
    letterSpacing: 0.2,
  },
  alarmStatus: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  frequencySetpoint: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
    letterSpacing: 0.1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  frequencyInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF5252',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  // 新增样式
  wsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  },
  noPermissionBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF5252',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 82, 82, 0.1)'
  },
  noPermissionText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 36,
  },
  refreshingButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.6)',
  },
  timeAndRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SiteDetailScreen;