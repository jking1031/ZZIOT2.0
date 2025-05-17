import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Modal, TextInput, TouchableOpacity, AppState, Platform, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; // 导入Ionicons图标
import axios from 'axios';
import * as Device from 'expo-device'; // 导入设备信息模块
import AsyncStorage from '@react-native-async-storage/async-storage'; // 导入AsyncStorage

// 添加安全的toFixed函数
const safeToFixed = (value, digits = 2) => {
  if (value === undefined || value === null) return '0.' + '0'.repeat(digits);
  
  // 确保转换为数字类型
  const num = Number(value);
  
  // 检查是否为有效数字
  if (isNaN(num)) return '0.' + '0'.repeat(digits);
  
  try {
    return num.toFixed(digits);
  } catch (e) {
    console.log('toFixed错误:', e, '值:', value);
    return '0.' + '0'.repeat(digits);
  }
};

// 添加全局引用，解决组件重复挂载问题
const globalWSRef = { current: null };
const globalHeartbeatRef = { current: null };
const globalReconnectTimeoutRef = { current: null };
const globalConnected = { current: false };

function SiteDetailScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { siteId, siteName, departments = [] } = route.params;
  const { user, userRoles = [], getUserRoles } = useAuth();
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
  
  // 添加数据分组状态
  const [dataGroups, setDataGroups] = useState([]);
  
  // 添加分组可见性状态
  const [visibleGroups, setVisibleGroups] = useState({});
  
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

  // 添加检查权限的ref，防止重复检查
  const checkingPermissionRef = useRef(false);
  const permissionRetryCountRef = useRef(0);
  
  // 添加一个时间戳跟踪上次权限检查的时间
  const lastPermissionCheckRef = useRef(0);
  
  // 添加本地存储的角色数据，用于直接访问
  const [localUserRoles, setLocalUserRoles] = useState(userRoles);
  
  // 添加一个权限已检查完成的标志
  const permissionCheckedRef = useRef(false);
  
  // 添加工艺参数设置相关的状态
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [lowerLimit, setLowerLimit] = useState('');
  const [upperLimit, setUpperLimit] = useState('');
  const [coefficient, setCoefficient] = useState('');
  
  // 监听全局userRoles变化，更新本地状态
  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      setLocalUserRoles(userRoles);
      
      // 重要：当角色信息发生变化时，重置权限检查完成标志
      if (permissionCheckedRef.current) {
        permissionCheckedRef.current = false;
        permissionRetryCountRef.current = 0;
      }
    }
  }, [userRoles]);
  
  // 监听部门数据变化，在变化时重置权限检查状态
  useEffect(() => {
    // 仅在有实际部门数据时执行，避免组件初始化时的无效触发
    if (siteDepartments && siteDepartments.length > 0 && permissionCheckedRef.current) {
      permissionCheckedRef.current = false;
      permissionRetryCountRef.current = 0;
    }
  }, [siteDepartments]);
  
  // 检查用户是否有权限控制设备 - 增强版本，避免重复检查
  const checkControlPermission = useCallback(async (forceCheck = false) => {
    // 如果已经检查完成且有权限，非强制模式下直接返回
    if (!forceCheck && permissionCheckedRef.current && hasControlPermission) {
      // 去掉冗余日志
      return hasControlPermission;
    }
    
    // 如果正在检查权限，则返回
    if (checkingPermissionRef.current) {
      // 去掉冗余日志
      return hasControlPermission; // 直接返回当前状态
    }
    
    // 非强制检查时，如果权限已经有了，且距离上次检查不超过3秒，则跳过
    const now = Date.now();
    if (!forceCheck && hasControlPermission && (now - lastPermissionCheckRef.current < 3000)) {
      return hasControlPermission;
    }
    
    // 最多重试3次
    if (permissionRetryCountRef.current >= 3) {
      console.log('已达到最大权限检查重试次数');
      return hasControlPermission;
    }
    
    checkingPermissionRef.current = true;
    permissionRetryCountRef.current++;
    lastPermissionCheckRef.current = now;
    
    try {
      // 简化第N次开始日志
      if (permissionRetryCountRef.current > 1) {
        console.log(`权限检查 (第${permissionRetryCountRef.current}次)`);
      }
      
      // 首先尝试从缓存直接获取角色信息
      let currentRoles = localUserRoles;
      
      // 如果没有本地数据，尝试从AsyncStorage获取
      if ((!currentRoles || currentRoles.length === 0) && user?.id) {
        try {
          const cachedRoles = await AsyncStorage.getItem('userRoles_cache');
          if (cachedRoles) {
            const rolesData = JSON.parse(cachedRoles);
            if (rolesData.userId === user.id && rolesData.roles && rolesData.roles.length > 0) {
              currentRoles = rolesData.roles;
              setLocalUserRoles(currentRoles);
              // 去掉缓存加载日志
            }
          }
        } catch (cacheError) {
          // 简化错误日志
          console.log('获取角色缓存失败');
        }
      }
      
      // 检查是否有角色信息
      if (!currentRoles || currentRoles.length === 0) {
        console.log('无法检查权限: 缺少角色信息');
        
        // 使用getUserRoles获取最新角色信息
        if (getUserRoles && user && user.id) {
          try {
            const roles = await getUserRoles(user.id, true); // 强制刷新
            if (roles && roles.length > 0) {
              setLocalUserRoles(roles); // 更新本地角色
              currentRoles = roles;
              // 去掉成功获取角色的日志
            } else {
              console.log('获取角色信息成功但为空');
            }
          } catch (roleError) {
            console.error('获取用户角色失败');
          }
        }
        
        // 如果仍然没有角色，返回失败
        if (!currentRoles || currentRoles.length === 0) {
          setHasControlPermission(false);
          checkingPermissionRef.current = false;
          return false;
        }
      }
      
      // 检查是否有siteDepartments
      let currentDepartments = siteDepartments;
      if (!currentDepartments || currentDepartments.length === 0) {
        console.log('无法检查权限: 缺少站点部门信息');
        
        // 尝试从缓存获取站点部门信息
        try {
          const cachedDepartments = await AsyncStorage.getItem(`site_departments_${siteId}`);
          if (cachedDepartments) {
            const deptData = JSON.parse(cachedDepartments);
            if (deptData.departments && deptData.departments.length > 0) {
              // 简化部门信息日志
              setSiteDepartments(deptData.departments);
              currentDepartments = deptData.departments;
            }
          }
        } catch (cacheError) {
          console.log('获取站点部门缓存失败');
        }
        
        // 如果仍然没有部门信息，尝试重新获取站点详情
        if (!currentDepartments || currentDepartments.length === 0) {
          console.log('正在尝试重新获取站点详情...');
          try {
            await fetchSiteDetail();
            
            // 直接检查是否有了新数据
            if (siteDepartments && siteDepartments.length > 0) {
              currentDepartments = siteDepartments;
            } else {
              // 使用传入的部门数据作为最后的备份
              if (departments && departments.length > 0) {
                setSiteDepartments(departments);
                currentDepartments = departments;
                // 去掉使用路由参数的日志
              }
            }
          } catch (fetchError) {
            console.error('获取站点详情失败');
            // 使用传入的部门数据作为最后的备份
            if (departments && departments.length > 0) {
              setSiteDepartments(departments);
              currentDepartments = departments;
              // 去掉使用路由参数的日志
            }
          }
        }
        
        // 如果仍然没有部门信息
        if (!currentDepartments || currentDepartments.length === 0) {
          setHasControlPermission(false);
          checkingPermissionRef.current = false;
          return false;
        }
      }
      
      // 管理员始终有权限
      if (user && (user.is_admin === 1 || user.isAdmin === true)) {
        console.log('管理员拥有完全控制权限');
        setHasControlPermission(true);
        checkingPermissionRef.current = false;
        return true;
      }
      
      // 从userRoles中提取角色名称
      const userRoleNames = currentRoles.map(role => {
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
      
      // 简化角色和部门日志，只保留权限检查结果
      /*console.log('用户角色:', userRoleNames);
      console.log('站点部门:', currentDepartments);*/
      
      // 检查用户角色是否与站点部门匹配
      const hasPermission = userRoleNames.some(roleName => 
        currentDepartments.includes(roleName)
      );
      
      console.log('权限检查结果:', hasPermission ? '有权限' : '无权限');
      setHasControlPermission(hasPermission);
      checkingPermissionRef.current = false;
      
      // 最后重置重试计数，设置检查完成标志
      if (hasPermission) {
        permissionRetryCountRef.current = 0;
        permissionCheckedRef.current = true; // 标记为已完成成功检查
      }
      
      return hasPermission;
    } catch (error) {
      console.error('检查权限出错:', error);
      setHasControlPermission(false);
      checkingPermissionRef.current = false;
      return false;
    }
  }, [user, localUserRoles, userRoles, siteDepartments, fetchSiteDetail, siteId, hasControlPermission, getUserRoles, departments]);

  // 在siteDepartments改变时检查权限，但不重复检查
  useEffect(() => {
    // 不需要每次都检查，只有当状态关键值改变且未完成检查时才检查
    if (siteDepartments?.length > 0 && userRoles?.length > 0 && !permissionCheckedRef.current) {
      // 使用setTimeout确保其他状态更新已完成
      const timer = setTimeout(() => checkControlPermission(), 500);
      return () => clearTimeout(timer);
    }
  }, [siteDepartments, userRoles, checkControlPermission]);

  // 优化初始加载权限检查
  useEffect(() => {
    // 重置权限检查计数器，避免重复初始化
    if (permissionRetryCountRef.current > 0) {
      return; // 如果已经开始检查过，就不再重复执行初始检查
    }
    
    permissionRetryCountRef.current = 0;
    checkingPermissionRef.current = false;
    
    // 设置一个递增的延迟检查序列
    const initialPermissionCheck = async () => {
      // 简化初始检查日志
      
      // 首先检查是否有部门信息，如果没有则直接使用路由参数的部门数据
      if (!siteDepartments || siteDepartments.length === 0) {
        if (departments && departments.length > 0) {
          setSiteDepartments(departments);
          // 去掉初始化部门数据的日志
        }
      }
      
      // 尝试预先确保有角色信息
      if ((!localUserRoles || localUserRoles.length === 0) && getUserRoles && user?.id) {
        try {
          // 去掉预先获取角色信息的日志
          const roles = await getUserRoles(user.id, true); // 使用强制刷新模式
          if (roles && roles.length > 0) {
            setLocalUserRoles(roles);
            // 去掉成功获取角色的日志
          }
          // 不管获取结果如何，等待短暂时间让状态更新
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.log('预加载角色失败');
        }
      }
      
      // 立即执行一次权限检查
      try {
        const hasPermission = await checkControlPermission(true); // 强制执行初始检查
        
        // 如果获取到了权限，就不需要继续了
        if (hasPermission) {
          // 去掉初始权限检查成功的日志
          permissionCheckedRef.current = true;
          return;
        }
        
        // 如果没有权限并且没有提前返回，只做一次最终检查
        if (!permissionCheckedRef.current) {
          // 去掉安排最终检查的日志
          
          // 延迟5秒进行最后一次检查
          setTimeout(async () => {
            // 如果在这段时间内已经获取到权限，跳过最终检查
            if (permissionCheckedRef.current || hasControlPermission) {
              // 去掉已获取权限跳过检查的日志
              return;
            }
            
            try {
              // 重置标志以确保可以进行新的检查
              checkingPermissionRef.current = false;
              permissionRetryCountRef.current = 0; // 重置以便可以再尝试3次
              
              // 去掉执行最终权限检查的日志
              await checkControlPermission(true);
            } catch (error) {
              console.error('权限检查出错');
            }
          }, 5000);
        }
      } catch (error) {
        console.error('权限检查过程出错');
      }
    };
    
    // 延迟执行初始检查，避免与其他useEffect中的检查冲突
    const timer = setTimeout(initialPermissionCheck, 300);
    return () => clearTimeout(timer);
  }, []);  // 减少依赖，只在组件挂载时执行一次

  // 优化页面焦点变化时的权限检查
  useEffect(() => {
    const focusListener = navigation.addListener('focus', () => {
      // 简化焦点变化日志
      
      // 如果已经有权限，就不再重复检查
      if (hasControlPermission || permissionCheckedRef.current) {
        // 去掉已有权限的日志
        return;
      }
      
      // 优先尝试加载角色数据
      const loadRolesAndCheck = async () => {
        try {
          // 重置检查标志
          checkingPermissionRef.current = false;
          
          // 如果没有角色数据，先尝试获取
          if ((!localUserRoles || localUserRoles.length === 0) && getUserRoles && user?.id) {
            // 去掉焦点检查预加载日志
            const roles = await getUserRoles(user.id);
            if (roles && roles.length > 0) {
              setLocalUserRoles(roles);
              // 去掉焦点检查成功获取日志
            }
          }
          
          // 如果已经完成了权限检查，跳过
          if (permissionCheckedRef.current) {
            // 去掉焦点检查已完成的日志
            return;
          }
          
          // 延迟检查权限以确保数据已更新
          setTimeout(() => {
            // 再次检查当前是否已经完成权限验证
            if (!permissionCheckedRef.current && !hasControlPermission) {
              checkControlPermission(true);
            }
          }, 800);
        } catch (error) {
          console.error('焦点变化权限检查错误');
          // 尽管出错，仍尝试检查权限
          if (!permissionCheckedRef.current) {
            setTimeout(() => checkControlPermission(true), 800);
          }
        }
      };
      
      // 执行加载和检查
      loadRolesAndCheck();
    });
    
    return () => {
      focusListener();
    };
  }, [navigation, checkControlPermission, hasControlPermission, user, getUserRoles, localUserRoles]);

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
        
        // 处理数据分组定义
        if (data.dataGroups) {
          // 如果后端直接提供了分组定义，直接使用
          setDataGroups(data.dataGroups);
        } else {
          // 如果后端没有提供分组，则构建默认分组
          const defaultGroups = [];
          
          if (data.indata && data.indata.length > 0) {
            defaultGroups.push({
              id: 'indata',
              name: '进水数据',
              type: 'sensor',
              data: data.indata
            });
          }
          
          if (data.outdata && data.outdata.length > 0) {
            defaultGroups.push({
              id: 'outdata',
              name: '出水数据',
              type: 'sensor',
              data: data.outdata
            });
          }
          
          if (data.deviceFrequency && data.deviceFrequency.length > 0) {
            defaultGroups.push({
              id: 'deviceFrequency',
              name: '设备频率',
              type: 'frequency',
              data: data.deviceFrequency
            });
          }
          
          if (data.devices && data.devices.length > 0) {
            defaultGroups.push({
              id: 'devices',
              name: '设备控制',
              type: 'device',
              data: data.devices
            });
          }
          
          if (data.isValve && data.isValve.length > 0) {
            defaultGroups.push({
              id: 'isValve',
              name: '阀门控制',
              type: 'valve',
              data: data.isValve
            });
          }
          
          setDataGroups(defaultGroups);
        }
        
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
    await fetchSiteDetailHttp();
    
    // 只有当没有权限且未完成权限检查时才在获取数据后检查权限
    if (!hasControlPermission && !permissionCheckedRef.current && siteDepartments && siteDepartments.length > 0) {
      // 延迟检查以确保状态已更新，但不添加日志
      setTimeout(() => {
        // 再次检查，确保仍然需要检查权限
        if (!hasControlPermission && !permissionCheckedRef.current) {
          checkControlPermission();
        }
      }, 500);
    }
  }, [siteId, wsConnected, wsRef, fetchSiteDetailHttp, hasControlPermission, siteDepartments, checkControlPermission, permissionCheckedRef]);

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
    
    // 如果有数据分组更新，处理数据分组
    if (data.dataGroups) {
      setDataGroups(data.dataGroups);
    } else {
      // 如果没有分组更新，但有单独数据更新，则更新对应分组的数据
      setDataGroups(prevGroups => {
        if (!prevGroups || prevGroups.length === 0) return prevGroups;
        
        // 创建分组的深拷贝
        const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
        
        // 更新每个分组内的数据
        updatedGroups.forEach(group => {
          // 根据分组类型和ID更新数据
          if (group.type === 'sensor') {
            if (group.id === 'indata' && data.indata) {
              // 更新进水数据
              group.data = data.indata;
            } else if (group.id === 'outdata' && data.outdata) {
              // 更新出水数据
              group.data = data.outdata;
            }
          } else if (group.type === 'frequency' && data.frequencies) {
            // 更新频率数据
            group.data = data.frequencies;
          } else if (group.type === 'device' && data.devices) {
            // 更新设备数据
            group.data = data.devices;
          } else if (group.type === 'valve' && data.valves) {
            // 更新阀门数据
            group.data = data.valves;
          }
          // 添加工业数据类型的更新逻辑
          else if (group.type === 'energy' && data.energy) {
            // 更新能耗数据
            group.data = data.energy;
          } 
          else if (group.type === 'runtime' && data.runtime) {
            // 更新运行时间数据
            group.data = data.runtime;
          }
          else if (group.type === 'process' && data.process) {
            // 更新工艺参数数据
            group.data = data.process;
          }
          else if (group.type === 'alarm' && data.alarms) {
            // 更新报警信息数据
            group.data = data.alarms;
          }
          else if (group.type === 'laboratory' && data.laboratory) {
            // 更新化验数据
            group.data = data.laboratory;
          }
          else if (group.type === 'health' && data.health) {
            // 更新设备健康状态
            group.data = data.health;
          }
          else if (group.type === 'production' && data.production) {
            // 更新生产指标
            group.data = data.production;
          }
          
          // 对于兼容原有格式，同样处理deviceFrequency和isValve
          if (group.id === 'deviceFrequency' && data.deviceFrequency) {
            group.data = data.deviceFrequency;
          } else if (group.id === 'isValve' && data.isValve) {
            group.data = data.isValve;
          }
        });
        
        return updatedGroups;
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

  // 渲染数据点卡片
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
          {safeToFixed(item.data, 2)}
        </Text>
        <Text style={[styles.dataUnit, { color: colors.text }]}>{item.dw}</Text>
      </View>
    </View>
  );
  
  // 渲染频率设备卡片
  const renderFrequencyCard = (item) => (
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
          {safeToFixed(item.hz, 2)}
        </Text>
        <Text style={[styles.dataUnit, { color: colors.text }]}>Hz</Text>
      </View>
      {item.sethz !== undefined && (
        <Text style={[styles.frequencySetpoint, { color: colors.text }]}>
          设定值: {safeToFixed(item.sethz, 2)} Hz
        </Text>
      )}
      <CommandStatusDisplay deviceId={item.name} />
      {!hasControlPermission && (
        <View style={styles.noPermissionBadge}>
          <Text style={styles.noPermissionText}>无控制权限</Text>
        </View>
      )}
    </TouchableOpacity>
  );
  
  // 渲染设备控制卡片
  const renderDeviceCard = (device) => (
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
  );
  
  // 渲染阀门控制卡片
  const renderValveCard = (valve) => (
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
  );
  
  // 渲染能耗监测卡片
  const renderEnergyCard = (item) => (
    <View
      key={item.name}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <View style={styles.dataContainer}>
        <Text style={[styles.dataValue, { color: colors.text }]}>
          {safeToFixed(item.value, 2)}
        </Text>
        <Text style={[styles.dataUnit, { color: colors.text }]}>{item.unit || 'kWh'}</Text>
      </View>
      {item.trend && (
        <View style={[
          styles.trendBadge, 
          { backgroundColor: item.trend > 0 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(76, 175, 80, 0.1)' }
        ]}>
          <Text style={{ 
            color: item.trend > 0 ? '#FF5252' : '#4CAF50',
            fontSize: 12 
          }}>
            {item.trend > 0 ? '↑' : '↓'} {Math.abs(item.trend || 0).toFixed(1)}%
          </Text>
        </View>
      )}
      {item.threshold && item.value > item.threshold && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>超出预警值</Text>
        </View>
      )}
    </View>
  );

  // 设备运行时间卡片
  const renderRuntimeCard = (item) => (
    <View
      key={item.name}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <View style={styles.runtimeContainer}>
        <View style={styles.runtimeItem}>
          <Text style={styles.runtimeValue}>{item.dailyHours || 0}</Text>
          <Text style={styles.runtimeLabel}>今日运行(小时)</Text>
        </View>
        <View style={styles.runtimeDivider} />
        <View style={styles.runtimeItem}>
          <Text style={styles.runtimeValue}>{item.totalHours || 0}</Text>
          <Text style={styles.runtimeLabel}>总运行(小时)</Text>
        </View>
      </View>
      {item.nextMaintenance && (
        <View style={[
          styles.maintenanceBadge, 
          { backgroundColor: item.nextMaintenance < 100 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(33, 150, 243, 0.1)' }
        ]}>
          <Text style={{ 
            color: item.nextMaintenance < 100 ? '#FF9800' : '#2196F3',
            fontSize: 12 
          }}>
            距下次维护: {item.nextMaintenance}小时
          </Text>
        </View>
      )}
    </View>
  );

  // 修改工艺参数控制函数使用WebSocket
  const handleProcessControl = async (processName, action, params = {}) => {
    // 权限检查
    if (!hasControlPermission) {
      Alert.alert('权限不足', '您没有设置工艺参数的权限');
      return;
    }

    try {
      // 记录操作日志
      const operationContent = `${action} - ${JSON.stringify(params)}`;
      logOperation(processName, '工艺参数设置', operationContent);
      
      // 使用WebSocket发送命令
      await sendCommandWs({
        type: 'process_control',
        processName,
        action,
        ...params
      });
    } catch (error) {
      console.error('工艺参数设置失败:', error);
      // 如果WebSocket失败，尝试回退到HTTP
      try {
        await sendCommand({
          type: 'process_control',
          processName,
          action,
          ...params
        });
      } catch (httpError) {
        console.error('HTTP工艺参数设置也失败:', httpError);
      }
    }
  };

  // 处理工艺参数点击，打开设置窗口
  const handleProcessClick = (process) => {
    if (!hasControlPermission) {
      Alert.alert('权限不足', '您没有设置工艺参数的权限');
      return;
    }
    
    setSelectedProcess(process);
    setLowerLimit(process.lowerLimit?.toString() || '');
    setUpperLimit(process.upperLimit?.toString() || '');
    setCoefficient(process.coefficient?.toString() || '1');  // 默认系数为1
    setProcessModalVisible(true);
  };

  // 保存工艺参数设置
  const saveProcessSettings = async () => {
    if (!selectedProcess) return;
    
    try {
      // 发送设置到服务器
      await handleProcessControl(selectedProcess.name, 'set_parameters', {
        lowerLimit: parseFloat(lowerLimit) || selectedProcess.lowerLimit,
        upperLimit: parseFloat(upperLimit) || selectedProcess.upperLimit,
        coefficient: parseFloat(coefficient) || 1
      });
      
      // 关闭模态窗口
      setProcessModalVisible(false);
      
      // 提示用户设置成功
      Alert.alert('设置成功', '工艺参数设置已更新');
      
      // 刷新数据
      fetchSiteDetail();
    } catch (error) {
      console.error('保存工艺参数设置失败:', error);
      Alert.alert('设置失败', '请稍后再试');
    }
  };

  // 修改工艺参数监控卡片的渲染，添加点击事件
  const renderProcessCard = (item) => (
    <TouchableOpacity
      key={item.name}
      style={[
        styles.card, 
        { backgroundColor: colors.card },
        item.status === 'abnormal' && styles.abnormalCard
      ]}
      onPress={() => handleProcessClick(item)}
      disabled={!hasControlPermission}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <View style={styles.processDataRow}>
        <Text style={styles.processLabel}>当前值：</Text>
        <Text style={[
          styles.processValue, 
          { 
            color: item.status === 'abnormal' ? '#FF5252' : 
                  item.value > item.upperLimit || item.value < item.lowerLimit ? '#FF9800' : '#2196F3',
            marginLeft: 0,
            fontWeight: '700'
          }
        ]}>
          {safeToFixed(item.value, 2)}{item.unit}
        </Text>
      </View>
      
      <View style={styles.processDataRow}>
        <Text style={styles.processLabel}>正常范围：</Text>
        <Text style={styles.processRange}>
          {safeToFixed(item.lowerLimit, 1)}-{safeToFixed(item.upperLimit, 1)}{item.unit}
        </Text>
      </View>
      
      {item.coefficient && item.coefficient !== 1 && (
        <View style={styles.processDataRow}>
          <Text style={styles.processLabel}>系数：</Text>
          <Text style={styles.processCoefficient}>
            {safeToFixed(item.coefficient, 2)}
          </Text>
        </View>
      )}
      
      {item.status === 'abnormal' && (
        <View style={styles.alarmBadge}>
          <Text style={styles.alarmText}>工艺参数异常</Text>
        </View>
      )}
      
      {!hasControlPermission && (
        <View style={styles.noPermissionBadge}>
          <Text style={styles.noPermissionText}>无设置权限</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // 报警信息卡片
  const renderAlarmCard = (item) => (
    <View
      key={item.id || item.name}
      style={[styles.card, { backgroundColor: colors.card }, styles.alarmCard]}
    >
      <View style={styles.alarmHeader}>
        <View style={[styles.alarmDot, { 
          backgroundColor: item.level === 'high' ? '#FF5252' : 
                           item.level === 'medium' ? '#FF9800' : '#2196F3' 
        }]} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      </View>
      
      <Text style={styles.alarmMessage}>{item.message}</Text>
      
      <View style={styles.alarmFooter}>
        <Text style={styles.alarmTime}>
          {new Date(item.timestamp).toLocaleString('zh-CN', { hour12: false })}
        </Text>
        
        {item.status === 'unconfirmed' && hasControlPermission && (
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={() => handleAlarmConfirm(item.id)}
          >
            <Text style={styles.confirmButtonText}>确认</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={[styles.alarmLevelBadge, { 
        backgroundColor: item.level === 'high' ? 'rgba(255, 82, 82, 0.1)' : 
                          item.level === 'medium' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(33, 150, 243, 0.1)',
        borderColor: item.level === 'high' ? '#FF5252' : 
                      item.level === 'medium' ? '#FF9800' : '#2196F3'
      }]}>
        <Text style={[styles.alarmLevelText, { 
          color: item.level === 'high' ? '#FF5252' : 
                 item.level === 'medium' ? '#FF9800' : '#2196F3' 
        }]}>
          {item.level === 'high' ? '高级报警' : item.level === 'medium' ? '中级报警' : '低级报警'}
        </Text>
      </View>
    </View>
  );

  // 化验数据卡片的优化
  const renderLabCard = (item) => (
    <View
      key={item.name}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <View style={styles.labDataContainer}>
        <View style={styles.labDataRow}>
          <Text style={styles.labDataLabel}>检测值：</Text>
          <Text style={[
            styles.labDataValue, 
            { 
              color: item.isQualified ? '#4CAF50' : '#FF5252',
              fontWeight: '700' // 更粗的字体
            }
          ]}>
            {Number(item.value || 0).toFixed(2)}{item.unit}
          </Text>
        </View>
        
        <View style={styles.labDataRow}>
          <Text style={styles.labDataLabel}>标准值：</Text>
          <Text style={styles.labDataStandard}>
            {item.standard}
          </Text>
        </View>
        
        <View style={styles.labDataRow}>
          <Text style={styles.labDataLabel}>采样时间：</Text>
          <Text style={styles.labDataTime}>
            {new Date(item.sampleTime).toLocaleString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      
      <View style={[
        styles.qualificationBadge, 
        { backgroundColor: item.isQualified ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 82, 82, 0.1)' }
      ]}>
        <Text style={{ 
          color: item.isQualified ? '#4CAF50' : '#FF5252',
          fontSize: 12,
          fontWeight: '600'
        }}>
          {item.isQualified ? '合格' : '不合格'}
        </Text>
      </View>
    </View>
  );

  // 设备健康状态卡片
  const renderHealthCard = (item) => {
    // 计算健康状态百分比
    const healthPercent = item.healthScore || 0;
    let healthColor = '#4CAF50'; // 绿色 (良好)
    let statusText = '状态良好';
    
    if (healthPercent < 50) {
      healthColor = '#FF5252'; // 红色 (差)
      statusText = '需要维修';
    } else if (healthPercent < 80) {
      healthColor = '#FF9800'; // 橙色 (一般)
      statusText = '需要关注';
    }
    
    // 格式化上次维护时间
    const formatMaintenanceDate = (timestamp) => {
      if (!timestamp) return '无记录';
      try {
        return new Date(timestamp).toLocaleDateString('zh-CN');
      } catch (e) {
        return '日期错误';
      }
    };
    
    return (
      <View
        key={item.name}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
        
        <View style={styles.healthContainer}>
          <View style={[styles.healthCircle, { borderColor: healthColor }]}>
            <Text style={[styles.healthPercent, { color: healthColor }]}>
              {healthPercent}%
            </Text>
          </View>
          
          <View style={styles.healthInfo}>
            <Text style={[styles.healthStatus, { color: healthColor }]}>
              {statusText}
            </Text>
            
            {item.lastMaintenance && (
              <Text style={styles.healthDetail}>
                上次维护: {formatMaintenanceDate(item.lastMaintenance)}
              </Text>
            )}
            
            {item.issues && item.issues.length > 0 && (
              <Text style={styles.healthIssue}>
                存在 {item.issues.length} 个问题
              </Text>
            )}
          </View>
        </View>
        
        {hasControlPermission && (
          <TouchableOpacity 
            style={[styles.maintenanceButton, { backgroundColor: '#2196F3' }]}
            onPress={() => handleShowMaintenanceDetail(item)}
          >
            <Text style={styles.maintenanceButtonText}>查看详情</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 生产指标卡片
  const renderProductionCard = (item) => {
    // 安全处理数值
    const current = Number(item.current || 0);
    const target = Math.max(Number(item.target || 1), 1); // 避免除以零
    const efficiency = Number(item.efficiency || 0);
    
    // 计算完成百分比，限制最大值为100
    const completionPercent = Math.min(100, (current / target) * 100);
    
    // 确定效率文本颜色
    let efficiencyColor = '#FF9800'; // 默认橙色(低效率)
    if (efficiency >= 90) {
      efficiencyColor = '#4CAF50'; // 绿色(高效率) 
    } else if (efficiency >= 70) {
      efficiencyColor = '#2196F3'; // 蓝色(中等效率)
    }
    
    return (
      <View
        key={item.name}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
        
        <View style={styles.productionRow}>
          <View style={styles.productionItem}>
            <Text style={styles.productionValue}>{current}</Text>
            <Text style={styles.productionLabel}>当前产量</Text>
          </View>
          
          <View style={styles.productionDivider} />
          
          <View style={styles.productionItem}>
            <Text style={styles.productionValue}>{target}</Text>
            <Text style={styles.productionLabel}>目标产量</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${completionPercent}%`,
                  backgroundColor: completionPercent >= 100 ? '#4CAF50' : '#2196F3'
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {safeToFixed(completionPercent, 1)}%
          </Text>
        </View>
        
        {efficiency > 0 && (
          <View style={[
            styles.efficiencyBadge, 
            { backgroundColor: `${efficiencyColor}20` } // 20是透明度16进制
          ]}>
            <Text style={{ 
              color: efficiencyColor,
              fontSize: 12,
              fontWeight: '600'
            }}>
              生产效率: {efficiency}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  // 报警确认处理函数
  const handleAlarmConfirm = useCallback(async (alarmId) => {
    if (!hasControlPermission) {
      Alert.alert('权限不足', '您没有确认报警的权限');
      return;
    }

    try {
      // 记录操作日志
      logOperation(alarmId, '报警管理', '确认报警');
      
      // 使用WebSocket发送确认命令
      await sendCommandWs({
        type: 'alarm_control',
        action: 'confirm',
        alarmId
      });
    } catch (error) {
      console.error('报警确认失败:', error);
      try {
        // 回退到HTTP
        await sendCommand({
          type: 'alarm_control',
          action: 'confirm',
          alarmId
        });
      } catch (httpError) {
        console.error('HTTP报警确认也失败:', httpError);
      }
    }
  }, [hasControlPermission, sendCommandWs, sendCommand, logOperation]);

  // 设备维护详情处理函数
  const handleShowMaintenanceDetail = useCallback((device) => {
    // 可以显示一个详情模态框
    Alert.alert(
      `${device.name} 维护信息`, 
      `健康得分: ${device.healthScore}%\n` +
      `上次维护: ${device.lastMaintenance ? new Date(device.lastMaintenance).toLocaleDateString('zh-CN') : '无记录'}\n` +
      `${device.issues && device.issues.length > 0 ? 
        `问题列表:\n${device.issues.map((issue, index) => ` - ${issue}`).join('\n')}` : 
        '当前无问题记录'}`
    );
  }, []);
  
  // 根据组类型渲染对应的卡片组件
  const renderGroupContent = (group) => {
    if (!group || !group.data || group.data.length === 0) {
      return null;
    }

    switch (group.type) {
      case 'sensor':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderDataCard)}
          </View>
        );
      case 'frequency':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderFrequencyCard)}
          </View>
        );
      case 'device':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderDeviceCard)}
          </View>
        );
      case 'valve':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderValveCard)}
          </View>
        );
      // 添加工业数据类型的渲染支持
      case 'energy':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderEnergyCard)}
          </View>
        );
      case 'runtime':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderRuntimeCard)}
          </View>
        );
      case 'process':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderProcessCard)}
          </View>
        );
      case 'alarm':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderAlarmCard)}
          </View>
        );
      case 'laboratory':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderLabCard)}
          </View>
        );
      case 'health':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderHealthCard)}
          </View>
        );
      case 'production':
        return (
          <View style={styles.cardGrid}>
            {group.data.map(renderProductionCard)}
          </View>
        );
      // 添加通用处理器，用于未知类型
      default:
        return (
          <View style={styles.cardGrid}>
            {group.data.map((item, index) => (
              <View key={`unknown-${index}`} style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name || `数据项 ${index+1}`}</Text>
                <Text style={{ fontSize: 12, color: colors.text }}>未识别的数据类型: {group.type}</Text>
                <Text style={{ fontSize: 10, color: colors.secondaryText || '#666666', marginTop: 5 }}>
                  {JSON.stringify(item)}
                </Text>
              </View>
            ))}
          </View>
        );
    }
  };

  // 从AsyncStorage加载分组可见性设置
  const loadVisibilitySettings = useCallback(async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(`site_visibility_${siteId}`);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setVisibleGroups(parsedSettings);
      }
    } catch (error) {
      console.error('加载分组可见性设置失败:', error);
    }
  }, [siteId]);

  // 保存分组可见性设置到AsyncStorage
  const saveVisibilitySettings = useCallback(async (newSettings) => {
    try {
      await AsyncStorage.setItem(`site_visibility_${siteId}`, JSON.stringify(newSettings));
    } catch (error) {
      console.error('保存分组可见性设置失败:', error);
    }
  }, [siteId]);

  // 切换分组可见性
  const toggleGroupVisibility = useCallback((groupId) => {
    setVisibleGroups(prev => {
      const newVisibility = {
        ...prev,
        [groupId]: prev[groupId] === false ? undefined : false
      };
      
      // 保存到AsyncStorage
      saveVisibilitySettings(newVisibility);
      
      return newVisibility;
    });
  }, [saveVisibilitySettings]);
  
  // 检查分组是否有报警数据，有报警时不允许隐藏
  const hasGroupAlarm = useCallback((group) => {
    if (group.type === 'alarm' && group.data && group.data.length > 0) {
      return true;
    }
    
    if (group.data && Array.isArray(group.data)) {
      // 检查sensor类型是否有alarm=1的数据
      if (group.type === 'sensor') {
        return group.data.some(item => item.alarm === 1);
      }
      
      // 检查process类型是否有status=abnormal的数据
      if (group.type === 'process') {
        return group.data.some(item => item.status === 'abnormal');
      }
      
      // 检查device和valve类型是否有fault=1的数据
      if (group.type === 'device' || group.type === 'valve') {
        return group.data.some(item => item.fault === 1);
      }
    }
    
    return false;
  }, []);

  // 组件挂载时加载可见性设置
  useEffect(() => {
    loadVisibilitySettings();
  }, [loadVisibilitySettings]);

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

      {/* 使用动态分组渲染数据 */}
      {dataGroups.length > 0 ? (
        // 如果有分组数据，使用分组渲染
        dataGroups.map((group, index) => {
          // 为每个分组生成唯一key
          const groupKey = `group-section-${group.id}-${index}-${Math.random().toString(36).substring(2, 9)}`;
          
          return (
            <View key={groupKey} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{group.name}</Text>
                <TouchableOpacity
                  onPress={() => toggleGroupVisibility(group.id)}
                  disabled={hasGroupAlarm(group)}
                  style={styles.visibilityToggle}
                >
                  <Text style={[
                    styles.visibilityText,
                    hasGroupAlarm(group) ? styles.visibilityTextDisabled : null
                  ]}>
                    {visibleGroups[group.id] === false ? "显示" : "隐藏"}
                  </Text>
                </TouchableOpacity>
              </View>
              {visibleGroups[group.id] !== false && renderGroupContent(group)}
            </View>
          );
        })
      ) : (
        // 如果没有分组数据，回退到原来的渲染方式
        <>
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
                    {safeToFixed(item.hz, 2)}
                  </Text>
                  <Text style={[styles.dataUnit, { color: colors.text }]}>Hz</Text>
                </View>
                {item.sethz !== undefined && (
                  <Text style={[styles.frequencySetpoint, { color: colors.text }]}>
                    设定值: {safeToFixed(item.sethz, 2)} Hz
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
        </>
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
      
      {/* 添加工艺参数设置模态窗口 */}
      <Modal
        visible={processModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProcessModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, width: '85%' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedProcess?.name || ''} - 参数设置
              </Text>
              
              <Text style={[styles.modalLabel, { color: colors.text }]}>下限值:</Text>
              <TextInput
                style={[styles.frequencyInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text
                }]}
                placeholder="请输入下限值"
                placeholderTextColor={colors.secondaryText || '#666666'}
                keyboardType="numeric"
                value={lowerLimit}
                onChangeText={setLowerLimit}
              />
              
              <Text style={[styles.modalLabel, { color: colors.text }]}>上限值:</Text>
              <TextInput
                style={[styles.frequencyInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text
                }]}
                placeholder="请输入上限值"
                placeholderTextColor={colors.secondaryText || '#666666'}
                keyboardType="numeric"
                value={upperLimit}
                onChangeText={setUpperLimit}
              />
              
              <Text style={[styles.modalLabel, { color: colors.text }]}>系数:</Text>
              <TextInput
                style={[styles.frequencyInput, { 
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text
                }]}
                placeholder="请输入系数"
                placeholderTextColor={colors.secondaryText || '#666666'}
                keyboardType="numeric"
                value={coefficient}
                onChangeText={setCoefficient}
              />

              {selectedProcess && (
                <Text style={[styles.coefficientInfo, { color: colors.secondaryText || '#666666' }]}>
                  原始值 {selectedProcess.rawValue ? selectedProcess.rawValue.toFixed(2) : selectedProcess.value?.toFixed(2) || '0'}{selectedProcess.unit} × 系数 = 显示值
                </Text>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setProcessModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={saveProcessSettings}
                >
                  <Text style={styles.modalButtonText}>确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  trendBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  warningBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 152, 0, 0.1)'
  },
  warningText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
  },
  runtimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  runtimeItem: {
    flex: 1,
    alignItems: 'center',
  },
  runtimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  runtimeLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  runtimeDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 8,
    height: 30,
  },
  maintenanceBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  abnormalCard: {
    borderColor: '#FF5252',
    borderWidth: 1,
  },
  processDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  processLabel: {
    fontSize: 12,
    color: '#666666',
  },
  processValue: {
    fontSize: 16, // 更大的字体
    fontWeight: '600',
    marginLeft: 4, // 轻微间隔
  },
  processRange: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  alarmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  alarmText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  alarmMessage: {
    fontSize: 13,
    marginTop: 4,
    color: '#FF5252',
  },
  alarmFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  alarmTime: {
    fontSize: 11,
    color: '#666666',
  },
  alarmLevelBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  alarmLevelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  labDataContainer: {
    marginTop: 4,
  },
  labDataRow: {
    flexDirection: 'row',
    marginTop: 2,
    alignItems: 'center',
  },
  labDataLabel: {
    fontSize: 12,
    color: '#666666',
  },
  labDataValue: {
    fontSize: 16, // 更大的字体
    fontWeight: '600',
    marginLeft: 4, // 轻微间隔
  },
  labDataStandard: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  labDataTime: {
    fontSize: 11,
    color: '#666666',
    marginLeft: 4,
  },
  qualificationBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  healthCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  healthPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  healthInfo: {
    flex: 1,
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  healthDetail: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  healthIssue: {
    fontSize: 11,
    color: '#FF5252',
    marginTop: 2,
  },
  maintenanceButton: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  maintenanceButtonText: {
    fontSize: 12,
    color: 'white',
  },
  productionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  productionItem: {
    alignItems: 'center',
  },
  productionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  productionLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  productionDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 10,
    height: 30,
  },
  progressContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 11,
    color: '#666666',
    width: 40,
  },
  efficiencyBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visibilityToggle: {
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  visibilityText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  visibilityTextDisabled: {
    color: '#FF5252',
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 4,
  },
  processCoefficient: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  coefficientInfo: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center'
  },
});

export default SiteDetailScreen;