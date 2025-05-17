import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput, Switch, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { EventRegister } from '../utils/EventEmitter';
import ProfileScreen from './ProfileScreen';
import SiteListScreen from './SiteListScreen';
import MessageScreen from './MessageScreen';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import TabBar from '../components/TabBar';
import SafeHeader from '../components/SafeHeader';

const Tab = createBottomTabNavigator();

// 将 styles 定义移到组件外部
const createStyles = (isDarkMode, colors) => StyleSheet.create({
    container: {
      flex: 1,
    backgroundColor: '#f5f5f5',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    paddingTop: 10,
    },
    header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderRadius: 12,
    marginHorizontal: 12,
      marginTop: Platform.OS === 'android' ? -10 : 8,
    marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.06,
      shadowRadius: 3,
      elevation: isDarkMode ? 4 : 2,
      borderWidth: isDarkMode ? 0 : 0.5,
      borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.03)',
    },
    headerSubtitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      opacity: 0.85,
      textAlign: 'center',
    },
    sectionContainer: {
      marginBottom: 6,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 10,
    },
    sectionIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.2)' : 'rgba(255,103,0,0.1)',
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    paddingHorizontal: 12,
      marginBottom: 5,
    },
    statsCardContainer: {
      width: '48%',
      marginBottom: 10,
    },
    statsCard: {
      flex: 1,
      padding: 12,
      paddingTop: 10,
      paddingBottom: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.06,
      shadowRadius: 3,
      elevation: isDarkMode ? 4 : 2,
      borderWidth: isDarkMode ? 0 : 0.5,
      borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.03)',
    },
    statsValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    statsLabel: {
      fontSize: 12,
      lineHeight: 16,
      color: isDarkMode ? colors.text : '#666',
      textAlign: 'center',
      maxWidth: '95%',
      opacity: isDarkMode ? 0.7 : 1,
    },
    functionCard: {
      height: 120,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 5,
      paddingBottom: 0,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      marginTop: -5,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)',
      borderWidth: 0,
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      marginVertical: 6,
    marginHorizontal: 12,
    },
    customShortcutsContainer: {
      marginTop: Platform.OS === 'android' ? 4 : 8,
      marginBottom: 12,
    },
    customShortcutsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    paddingHorizontal: 12,
    },
    customShortcutsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.2)' : 'rgba(255,103,0,0.08)',
      borderRadius: 18,
    },
    editButtonText: {
      fontSize: 14,
      color: '#FF6700',
      marginLeft: 6,
      fontWeight: '500',
    },
    shortcutsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    paddingHorizontal: 8,
    },
    shortcutItem: {
      width: '25%',
      alignItems: 'center',
      marginBottom: 12,
    },
    shortcutIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.06,
      shadowRadius: 3,
      elevation: isDarkMode ? 4 : 2,
      marginBottom: 10,
      borderWidth: isDarkMode ? 0 : 0.5,
      borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.03)',
    },
    shortcutText: {
      fontSize: 13,
      textAlign: 'center',
      color: colors.text,
      maxWidth: 72,
      marginTop: 4,
    },
    addShortcutIcon: {
      borderStyle: 'dashed',
      borderWidth: 1.5,
      borderColor: '#FF6700',
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.1)' : 'rgba(255,103,0,0.04)',
    },
    removeButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: '#FF6700',
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      elevation: 3,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    adminMenuItem: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2196F3',
      padding: 12,
      borderRadius: 8,
      width: '31%',
      aspectRatio: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    adminMenuItemText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    adminMenuContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    paddingHorizontal: 12,
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    refreshButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      marginLeft: 8,
    },
    refreshIcon: {
      width: 24,
      height: 24,
    },
  });

// 主页面组件
const MainTab = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { isAdmin } = useAuth();
  const styles = createStyles(isDarkMode, colors);
  const [stats, setStats] = useState({
    totalProcessing_in: 0,
    totalProcessing_out: 0,
    chemicalUsage: 0,
    energyConsumption: 0,
    sludgeProduction: 0,
    carbonUsage: 0,
    phosphorusRemoval: 0,
    disinfectant: 0,
    electricity: 0,
    pacUsage: 0,
    pamUsage: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [deviceStats, setDeviceStats] = useState({
    alarmCount: 0,
    offlineSites: 0,
    totalDevices: 0,
    runningDevices: 0
  });

  // 使用useEffect设置状态栏
  useEffect(() => {
    // 移除此处的StatusBar设置，使用App.js中的全局设置
    // 避免与全局StatusBar设置冲突
  }, [colors, isDarkMode]);

  // 添加调试日志
  useEffect(() => {
    console.log('Current isAdmin status:', isAdmin);
  }, [isAdmin]);

  // 添加获取统计数据的函数
  const fetchStats = useCallback(async () => {
    try {
      console.log('开始获取统计数据...');
      const response = await axios.get('https://nodered.jzz77.cn:9003/api/stats/overview', {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data) {
        console.log('获取统计数据成功:', response.data);
        const data = response.data;
        // 更新运营统计数据
        setStats({
          totalProcessing_in: data.totalProcessing_in || 0,
          totalProcessing_out: data.totalProcessing_out || 0,
          chemicalUsage: data.chemicalUsage || 0,
          energyConsumption: data.energyConsumption || 0,
          sludgeProduction: data.sludgeProduction || 0,
          carbonUsage: data.carbonUsage || 0,
          phosphorusRemoval: data.phosphorusRemoval || 0,
          disinfectant: data.disinfectant || 0,
          electricity: data.electricity || 0,
          pacUsage: data.pacUsage || 0,
          pamUsage: data.pamUsage || 0
        });

        // 更新设备统计数据
        setDeviceStats({
          alarmCount: data.alarmCount || 0,
          offlineSites: data.offlineSites || 0,
          totalDevices: data.totalDevices || 0,
          runningDevices: data.runningDevices || 0
        });
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 如果请求失败，设置默认值
      setStats({
        totalProcessing_in: 0,
        totalProcessing_out: 0,
        chemicalUsage: 0,
        energyConsumption: 0,
        sludgeProduction: 0,
        carbonUsage: 0,
        phosphorusRemoval: 0,
        disinfectant: 0,
        electricity: 0,
        pacUsage: 0,
        pamUsage: 0
      });
      setDeviceStats({
        alarmCount: 0,
        offlineSites: 0,
        totalDevices: 0,
        runningDevices: 0
      });
    }
  }, []);

  // 添加定时获取数据的逻辑
  useEffect(() => {
    // 首次加载时获取数据
    fetchStats();

    // 设置定时器，每5分钟更新一次数据
    const timer = setInterval(fetchStats, 300000);

    // 监听页面焦点变化
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('页面获得焦点，刷新数据');
      fetchStats();
    });

    // 清理函数
    return () => {
      console.log('清理定时器和事件监听');
      clearInterval(timer);
      unsubscribe();
    };
  }, [navigation, fetchStats]);

  // 自定义快捷方式的状态
  const [shortcuts, setShortcuts] = useState([
    { id: '1', name: '站点列表', icon: 'location', color: '#2196F3', route: '站点列表' },
    { id: '2', name: '数据中心', icon: 'analytics', color: '#4CAF50', route: '数据中心' },
    { id: '3', name: '数据查询', icon: 'timer', color: '#FF9800', route: '数据查询' },
    { id: '4', name: '报告查询', icon: 'document-text', color: '#E91E63', route: '报告查询' },
    { id: '5', name: '工单系统', icon: 'clipboard', color: '#9C27B0', route: '工单列表' },
  ]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  // 从AsyncStorage加载保存的快捷方式
  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const savedShortcuts = await AsyncStorage.getItem('userShortcuts');
        if (savedShortcuts) {
          setShortcuts(JSON.parse(savedShortcuts));
        }
      } catch (error) {
        console.error('加载快捷方式失败:', error);
      }
    };
    
    loadShortcuts();
  }, []);

  // 保存快捷方式到AsyncStorage
  const saveShortcuts = async (newShortcuts) => {
    try {
      await AsyncStorage.setItem('userShortcuts', JSON.stringify(newShortcuts));
    } catch (error) {
      console.error('保存快捷方式失败:', error);
    }
  };

  // 删除快捷方式
  const removeShortcut = (id) => {
    const newShortcuts = shortcuts.filter(item => item.id !== id);
    setShortcuts(newShortcuts);
    saveShortcuts(newShortcuts);
  };

  // 添加快捷方式 - 显示自定义模态框
  const addShortcut = () => {
    setShowShortcutModal(true);
  };

  // 关闭快捷方式模态框
  const closeShortcutModal = () => {
    setShowShortcutModal(false);
  };

  // 添加新的快捷方式
  const addNewShortcut = (name, icon, color, route) => {
    // 检查是否已存在
    if (shortcuts.some(item => item.name === name)) {
      Alert.alert('提示', '该快捷方式已存在');
      return;
    }
    
    // 限制最多10个快捷方式
    if (shortcuts.length >= 10) {
      Alert.alert('提示', '快捷方式最多只能添加10个');
      return;
    }
    
    const newShortcut = {
      id: Date.now().toString(),
      name,
      icon,
      color,
      route
    };
    
    const newShortcuts = [...shortcuts, newShortcut];
    setShortcuts(newShortcuts);
    saveShortcuts(newShortcuts);
    closeShortcutModal();
  };

  // 添加快捷方式选项数据
  const shortcutOptions = [
    { name: '站点列表', icon: 'location', color: '#2196F3', route: '站点列表' },
    { name: '数据中心', icon: 'analytics', color: '#4CAF50', route: '数据中心' },
    { name: '消息中心', icon: 'notifications', color: '#E91E63', route: '消息中心' },
    { name: '工具箱', icon: 'construct', color: '#9C27B0', route: '工具箱' },
    { name: '设备管理', icon: 'hardware-chip', color: '#FF9800', route: '设备管理' },
    { name: '报告查询', icon: 'document-text', color: '#E91E63', route: '报告查询' },
    { name: '告警信息', icon: 'warning', color: '#FF4444', route: '告警信息' },
    { name: '个人中心', icon: 'person', color: '#2196F3', route: '个人中心' },
    { name: '工单系统', icon: 'clipboard', color: '#9C27B0', route: '工单列表' },
    { name: '数据填报', icon: 'document-text-outline', color: '#009688', route: '数据填报中心' },
  ];

  // 为选择快捷方式模态框添加样式
  const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    modalContent: {
      width: '88%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 28,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 15,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
      color: colors.text,
      letterSpacing: 0.5,
    },
    optionsList: {
      width: '100%',
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 20,
    },
    optionText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    closeButton: {
      marginTop: 24,
      padding: 16,
      backgroundColor: '#FF6700',
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
    closeButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
  });

  // 监听会话过期事件
  useEffect(() => {
    // 注册会话过期监听
    const sessionExpiredListener = EventRegister.addEventListener('SESSION_EXPIRED', () => {
      // 显示登录弹窗
      setShowLoginModal(true);
    });
    
    return () => {
      // 清理事件监听
      EventRegister.removeEventListener(sessionExpiredListener);
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#FF6700',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        }
      }}
      tabBar={props => <TabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabContent}
        options={{
          tabBarLabel: '首页',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SiteList"
        component={SiteListScreen}
        options={{
          tabBarLabel: '站点',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessageScreen}
        options={{
          tabBarLabel: '消息',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 主页Tab内容
const HomeTabContent = () => {
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation();
  const { user, loading, isAdmin } = useAuth();
  const styles = createStyles(isDarkMode, colors);
  const [isEditMode, setIsEditMode] = useState(false);
  const [shortcuts, setShortcuts] = useState([
    { id: '1', name: '站点列表', icon: 'location', color: '#2196F3', route: '站点列表' },
    { id: '2', name: '数据中心', icon: 'analytics', color: '#4CAF50', route: '数据中心' },
    { id: '3', name: '数据查询', icon: 'timer', color: '#FF9800', route: '数据查询' },
    { id: '4', name: '报告查询', icon: 'document-text', color: '#E91E63', route: '报告查询' },
    { id: '5', name: '工单系统', icon: 'clipboard', color: '#9C27B0', route: '工单列表' },
  ]);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [stats, setStats] = useState({
    totalProcessing_in: 0,
    totalProcessing_out: 0,
    chemicalUsage: 0,
    energyConsumption: 0,
    sludgeProduction: 0,
    carbonUsage: 0,
    phosphorusRemoval: 0,
    disinfectant: 0,
    electricity: 0,
    pacUsage: 0,
    pamUsage: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 添加调试日志
  useEffect(() => {
    console.log('HomeScreen - Current user:', user);
    console.log('HomeScreen - Current isAdmin status:', isAdmin);
  }, [user, isAdmin]);

  // 添加兼容性代码，处理未登录状态
  useEffect(() => {
    if (!user && !loading) {
      console.log('HomeScreen - 用户未登录，重定向到认证流程');
      // 这种情况下不应该出现，因为App.js中的导航已经处理了认证路由
      // 但作为兼容措施，如果HomeScreen在未登录状态下被访问，主动重置导航到Auth
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }]
      });
    }
  }, [user, loading, navigation]);

  // 加载快捷方式
  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const savedShortcuts = await AsyncStorage.getItem('userShortcuts');
        if (savedShortcuts) {
          setShortcuts(JSON.parse(savedShortcuts));
        }
      } catch (error) {
        console.error('加载快捷方式失败:', error);
      }
    };
    
    loadShortcuts();
  }, []);

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('HomeTabContent - 开始获取统计数据...');
        const response = await axios.get('https://nodered.jzz77.cn:9003/api/stats/overview');
        if (response.data) {
          console.log('HomeTabContent - 获取统计数据成功:', JSON.stringify(response.data));
          // 使用新的字段
          const data = response.data;
          setStats({
            totalProcessing_in: data.totalProcessing_in || 0,
            totalProcessing_out: data.totalProcessing_out || 0,
            chemicalUsage: data.chemicalUsage || 0,
            energyConsumption: data.energyConsumption || 0,
            sludgeProduction: data.sludgeProduction || 0,
            carbonUsage: data.carbonUsage || 0,
            phosphorusRemoval: data.phosphorusRemoval || 0,
            disinfectant: data.disinfectant || 0,
            electricity: data.electricity || 0,     // 新增电量
            pacUsage: data.pacUsage || 0,          // 新增PAC用量
            pamUsage: data.pamUsage || 0           // 新增PAM用量
          });
        }
      } catch (error) {
        console.error('HomeTabContent - 加载统计数据失败:', error);
      }
    };
    
    loadStats();
  }, []);

  // 保存快捷方式
  const saveShortcuts = async (newShortcuts) => {
    try {
      await AsyncStorage.setItem('userShortcuts', JSON.stringify(newShortcuts));
    } catch (error) {
      console.error('保存快捷方式失败:', error);
    }
  };

  // 删除快捷方式
  const removeShortcut = (id) => {
    const newShortcuts = shortcuts.filter(item => item.id !== id);
    setShortcuts(newShortcuts);
    saveShortcuts(newShortcuts);
  };

  // 添加快捷方式
  const addShortcut = () => {
    setShowShortcutModal(true);
  };
  
  // 关闭快捷方式模态框
  const closeShortcutModal = () => {
    setShowShortcutModal(false);
  };
  
  // 添加新的快捷方式
  const addNewShortcut = (name, icon, color, route) => {
    // 检查是否已存在
    if (shortcuts.some(item => item.name === name)) {
      Alert.alert('提示', '该快捷方式已存在');
      return;
    }
    
    // 限制最多10个快捷方式
    if (shortcuts.length >= 10) {
      Alert.alert('提示', '快捷方式最多只能添加10个');
      return;
    }
    
    const newShortcut = {
      id: Date.now().toString(),
      name,
      icon,
      color,
      route
    };
    
    const newShortcuts = [...shortcuts, newShortcut];
    setShortcuts(newShortcuts);
    saveShortcuts(newShortcuts);
    closeShortcutModal();
  };

  // 添加快捷方式选项数据
  const shortcutOptions = [
    { name: '站点列表', icon: 'location', color: '#2196F3', route: '站点列表' },
    { name: '数据中心', icon: 'analytics', color: '#4CAF50', route: '数据中心' },
    { name: '消息中心', icon: 'notifications', color: '#E91E63', route: '消息中心' },
    { name: '工具箱', icon: 'construct', color: '#9C27B0', route: '工具箱' },
    { name: '设备管理', icon: 'hardware-chip', color: '#FF9800', route: '设备管理' },
    { name: '报告查询', icon: 'document-text', color: '#E91E63', route: '报告查询' },
    { name: '告警信息', icon: 'warning', color: '#FF4444', route: '告警信息' },
    { name: '个人中心', icon: 'person', color: '#2196F3', route: '个人中心' },
    { name: '工单系统', icon: 'clipboard', color: '#9C27B0', route: '工单列表' },
    { name: '数据填报', icon: 'document-text-outline', color: '#009688', route: '数据填报中心' },
  ];

  // 为选择快捷方式模态框添加样式
  const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    modalContent: {
      width: '88%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 28,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 15,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
      color: colors.text,
      letterSpacing: 0.5,
    },
    optionsList: {
      width: '100%',
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 20,
    },
    optionText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    closeButton: {
      marginTop: 24,
      padding: 16,
      backgroundColor: '#FF6700',
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
    closeButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
  });

  // 设置底部Tab导航
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' && (
        <SafeHeader title="正泽物联系统平台" backgroundColor={colors.primary} />
      )}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* 根据平台条件渲染不同顺序的内容 */}
        {Platform.OS === 'android' ? (
          <>
            {/* Android平台 - 快捷入口放在最前面 */}
            <View style={[styles.customShortcutsContainer, { marginTop: 0 }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Ionicons name="apps" size={20} color="#2196F3" />
                </View>
                <Text style={styles.sectionTitle}>快捷入口</Text>
                <TouchableOpacity 
                  style={[styles.editButton, {marginLeft: 'auto'}]} 
                  onPress={() => setIsEditMode(!isEditMode)}
                >
                  <Ionicons 
                    name={isEditMode ? "checkmark-circle" : "create-outline"} 
                    size={18} 
                    color={colors.primary} 
                  />
                  <Text style={styles.editButtonText}>
                    {isEditMode ? "完成" : "编辑"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.shortcutsGrid}>
                {shortcuts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.shortcutItem}
                    onPress={() => !isEditMode && navigation.navigate(item.route)}
                  >
                    <View style={styles.shortcutIcon}>
                      <Ionicons name={item.icon} size={26} color={item.color} />
                      {isEditMode && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeShortcut(item.id)}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.shortcutText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
                
                {/* 添加快捷方式按钮 - 仅在编辑模式显示 */}
                {isEditMode && (
                  <TouchableOpacity
                    style={styles.shortcutItem}
                    onPress={addShortcut}
                  >
                    <View style={[styles.shortcutIcon, styles.addShortcutIcon]}>
                      <Ionicons name="add" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.shortcutText, {color: colors.primary}]}>添加</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Android平台的成本分析区 改为 当月生产统计 */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                    <Ionicons name="stats-chart" size={20} color="#4CAF50" />
                  </View>
                  <Text style={styles.sectionTitle}>当月生产统计</Text>
                </View>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={async () => {
                    setIsRefreshing(true);
                    await fetchStats();
                    setIsRefreshing(false);
                  }}
                  disabled={isRefreshing}
                >
                  <Ionicons 
                    name={isRefreshing ? "refresh" : "refresh-outline"} 
                    size={24} 
                    color="#4CAF50" 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="water" size={24} color="#2196F3" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_in}</Text>
                    <Text style={styles.statsLabel}>总进水量(吨)</Text>
                  </View>
                </View>
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="water" size={24} color="#4CAF50" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_out}</Text>
                    <Text style={styles.statsLabel}>总出水量(吨)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="flask" size={24} color="#FF9800" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.carbonUsage}</Text>
                    <Text style={styles.statsLabel}>碳源使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="beaker" size={24} color="#E91E63" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.phosphorusRemoval}</Text>
                    <Text style={styles.statsLabel}>除磷剂使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="color-fill" size={24} color="#9C27B0" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.disinfectant}</Text>
                    <Text style={styles.statsLabel}>消毒剂使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="leaf" size={24} color="#795548" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.sludgeProduction}</Text>
                    <Text style={styles.statsLabel}>污泥产量(吨)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="flash" size={24} color="#FFC107" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.electricity}</Text>
                    <Text style={styles.statsLabel}>电量(度)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="water-outline" size={24} color="#3F51B5" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.pacUsage}</Text>
                    <Text style={styles.statsLabel}>PAC用量(kg)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="flask-outline" size={24} color="#00BCD4" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.pamUsage}</Text>
                    <Text style={styles.statsLabel}>PAM用量(kg)</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* iOS平台的快捷入口 */}
            <View style={[styles.sectionContainer, { marginTop: 10 }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Ionicons name="apps" size={20} color="#2196F3" />
                </View>
                <Text style={styles.sectionTitle}>快捷入口</Text>
                <TouchableOpacity 
                  style={[styles.editButton, {marginLeft: 'auto'}]} 
                  onPress={() => setIsEditMode(!isEditMode)}
                >
                  <Ionicons 
                    name={isEditMode ? "checkmark-circle" : "create-outline"} 
                    size={18} 
                    color={colors.primary} 
                  />
                  <Text style={styles.editButtonText}>
                    {isEditMode ? "完成" : "编辑"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.shortcutsGrid}>
                {shortcuts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.shortcutItem}
                    onPress={() => !isEditMode && navigation.navigate(item.route)}
                  >
                    <View style={styles.shortcutIcon}>
                      <Ionicons name={item.icon} size={26} color={item.color} />
                      {isEditMode && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeShortcut(item.id)}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.shortcutText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
                
                {/* 添加快捷方式按钮 - 仅在编辑模式显示 */}
                {isEditMode && (
                  <TouchableOpacity
                    style={styles.shortcutItem}
                    onPress={addShortcut}
                  >
                    <View style={[styles.shortcutIcon, styles.addShortcutIcon]}>
                      <Ionicons name="add" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.shortcutText, {color: colors.primary}]}>添加</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* iOS平台的成本分析区 改为 当月生产统计 */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                    <Ionicons name="stats-chart" size={20} color="#4CAF50" />
                  </View>
                  <Text style={styles.sectionTitle}>当月生产统计</Text>
                </View>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={async () => {
                    setIsRefreshing(true);
                    await fetchStats();
                    setIsRefreshing(false);
                  }}
                  disabled={isRefreshing}
                >
                  <Ionicons 
                    name={isRefreshing ? "refresh" : "refresh-outline"} 
                    size={24} 
                    color="#4CAF50" 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="water" size={24} color="#2196F3" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_in}</Text>
                    <Text style={styles.statsLabel}>总进水量(吨)</Text>
                  </View>
                </View>
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="water" size={24} color="#4CAF50" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_out}</Text>
                    <Text style={styles.statsLabel}>总出水量(吨)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="flask" size={24} color="#FF9800" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.carbonUsage}</Text>
                    <Text style={styles.statsLabel}>碳源使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="beaker" size={24} color="#E91E63" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.phosphorusRemoval}</Text>
                    <Text style={styles.statsLabel}>除磷剂使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="color-fill" size={24} color="#9C27B0" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.disinfectant}</Text>
                    <Text style={styles.statsLabel}>消毒剂使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="leaf" size={24} color="#795548" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.sludgeProduction}</Text>
                    <Text style={styles.statsLabel}>污泥产量(吨)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="flash" size={24} color="#FFC107" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.electricity}</Text>
                    <Text style={styles.statsLabel}>电量(度)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="water-outline" size={24} color="#3F51B5" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.pacUsage}</Text>
                    <Text style={styles.statsLabel}>PAC用量(kg)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="flask-outline" size={24} color="#00BCD4" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.pamUsage}</Text>
                    <Text style={styles.statsLabel}>PAM用量(kg)</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
        
        {/* 平台共有的部分 - 从这里开始所有平台都一样 */}
        
        {/* 移除重复的成本分析卡片，已在Android条件渲染部分完整显示 */}
        
        <View style={styles.divider} />
        
        {/* 功能中心部分 */}
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, { justifyContent: 'flex-start' }]}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(156, 39, 176, 0.15)' }]}>
              <Ionicons name="grid" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.sectionTitle}>功能中心</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('数据查询')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Ionicons name="timer" size={26} color="#2196F3" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>数据查询</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>历史数据</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('数据中心')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                  <Ionicons name="analytics" size={26} color="#4CAF50" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>数据中心</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>运行数据</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('数据填报中心')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 150, 136, 0.15)' }]}>
                  <Ionicons name="document-text-outline" size={26} color="#009688" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>数据填报</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>填报数据</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('工具箱')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
                  <Ionicons name="construct" size={26} color="#FF9800" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>工具箱</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>实用工具集</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('工单列表')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(156, 39, 176, 0.15)' }]}>
                  <Ionicons name="clipboard" size={26} color="#9C27B0" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>工单管理</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>处理问题</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('动态报表')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(233, 30, 99, 0.15)' }]}>
                  <Ionicons name="document-text" size={26} color="#E91E63" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>动态报表</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>动态报表</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* 管理员功能区域 - 仅管理员可见 */}
        {isAdmin && (
          <>
            <View style={styles.divider} />
            
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Ionicons name="shield" size={20} color="#2196F3" />
                </View>
                <Text style={styles.sectionTitle}>管理员功能</Text>
              </View>
              
              <View style={styles.adminMenuContainer}>
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => navigation.navigate('UserManagementScreen')}
                >
                  <Ionicons name="people" size={22} color="white" />
                  <Text style={styles.adminMenuItemText}>用户管理</Text>
                </TouchableOpacity>
                
                {/* 这里添加更多管理员功能按钮 */}
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => Alert.alert('提示', '此功能正在开发中')}
                >
                  <Ionicons name="settings" size={22} color="white" />
                  <Text style={styles.adminMenuItemText}>系统设置</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => Alert.alert('提示', '此功能正在开发中')}
                >
                  <Ionicons name="analytics" size={22} color="white" />
                  <Text style={styles.adminMenuItemText}>数据统计</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* 添加快捷方式的自定义模态框 */}
      <Modal
        visible={showShortcutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeShortcutModal}
      >
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>选择要添加的快捷方式</Text>
            <ScrollView style={modalStyles.optionsList}>
              {shortcutOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={modalStyles.optionItem}
                  onPress={() => addNewShortcut(option.name, option.icon, option.color, option.route)}
                >
                  <View style={[modalStyles.optionIcon, { backgroundColor: `${option.color}20` }]}>
                    <Ionicons name={option.icon} size={26} color={option.color} />
                  </View>
                  <Text style={modalStyles.optionText}>{option.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={closeShortcutModal}
            >
              <Text style={modalStyles.closeButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// HomeScreen组件
const HomeScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation();
  const { user, loading, isAdmin } = useAuth();

  // 添加调试日志
  useEffect(() => {
    console.log('HomeScreen - Current user:', user);
    console.log('HomeScreen - Current isAdmin status:', isAdmin);
  }, [user, isAdmin]);

  // 添加兼容性代码，处理未登录状态
  useEffect(() => {
    if (!user && !loading) {
      console.log('HomeScreen - 用户未登录，重定向到认证流程');
      // 这种情况下不应该出现，因为App.js中的导航已经处理了认证路由
      // 但作为兼容措施，如果HomeScreen在未登录状态下被访问，主动重置导航到Auth
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }]
      });
    }
  }, [user, loading, navigation]);

  // 返回主Tab内容组件
  return <MainTab />;
};

export default HomeScreen;