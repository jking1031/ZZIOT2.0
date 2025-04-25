import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput, Switch, FlatList, TouchableWithoutFeedback } from 'react-native';
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
import { ActionSheetIOS } from 'react-native';
const Tab = createBottomTabNavigator();

// 主页面组件
const MainTab = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalProcessing_in: 0,
    totalProcessing_out: 0,
    chemicalUsage: 0,
    energyConsumption: 0,
    sludgeProduction: 0,
    carbonUsage: 0,
    phosphorusRemoval: 0,
    disinfectant: 0,
    electricity: 0,     // 新增电量
    pacUsage: 0,        // 新增PAC用量
    pamUsage: 0         // 新增PAM用量
  });

  const [deviceStats, setDeviceStats] = useState({
    alarmCount: 0,
    offlineSites: 0,
    totalDevices: 0,
    runningDevices: 0
  });

  // 添加刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      setIsRefreshing(true); // 开始刷新时设置状态
      const response = await axios.get('https://nodered.jzz77.cn:9003/api/stats/overview', {
        timeout: 10000
      });

      if (response.data) {
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
          electricity: data.electricity || 0,     // 新增电量
          pacUsage: data.pacUsage || 0,          // 新增PAC用量
          pamUsage: data.pamUsage || 0           // 新增PAM用量
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
    } finally {
      setIsRefreshing(false); // 结束刷新
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
      fetchStats(); // 页面获得焦点时获取最新数据
    });

    // 清理函数
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [navigation, fetchStats]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#F5F5F7', // 米家风格背景色
      paddingTop: 0,
    },
    titleBar: {
      height: Platform.OS === 'android' ? 48 + (StatusBar.currentHeight || 0) : 56,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.5,
      elevation: 3,
    },
    titleText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    titleIcon: {
      marginRight: 8,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingTop: Platform.OS === 'android' ? 16 : 16,
      paddingBottom: 24,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 22,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderRadius: 12,
      marginHorizontal: 20,
      marginTop: Platform.OS === 'android' ? -10 : 8,
      marginBottom: 28,
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
      marginHorizontal: 22,
      marginBottom: 9,
      justifyContent: 'space-between', // 修改为space-between以便放置刷新按钮
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
      paddingHorizontal: 12,  // 从20改为12，与backup一致
      marginBottom: 5,
    },
    statsCardContainer: {
      width: '48%',
      marginBottom: 10,
    },
    statsCard: {
      flex: 1,
      padding: 12,         // 从18改为12
      paddingTop: 10,      // 添加特定的顶部padding
      paddingBottom: 10,   // 添加特定的底部padding
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
      marginHorizontal: 24,
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
      paddingHorizontal: 20,
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
      paddingHorizontal: 14,
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
      paddingHorizontal: 20,
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    refreshButton: {
      padding: 5,
    },
  });

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
    { name: '动态报表', icon: 'document-text', color: '#E91E63', route: '动态报表' },
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
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
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
                  onPress={fetchStats}
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
                  onPress={fetchStats}
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
          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(156, 39, 176, 0.15)' }]}>
                <Ionicons name="grid" size={20} color="#9C27B0" />
              </View>
              <Text style={styles.sectionTitle}>功能中心</Text>
            </View>
            {/* 移除此处的刷新按钮 */}
          </View>
          
          <View style={styles.statsContainer}>
            <View style={[styles.statsCardContainer, { width: '31%' }]}>
              <TouchableOpacity 
                style={[styles.statsCard, styles.functionCard]} 
                onPress={() => navigation.navigate('站点列表')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Ionicons name="list" size={26} color="#2196F3" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>站点列表</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>查看站点</Text>
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
                <Text style={styles.statsValue} numberOfLines={1}>报告查询</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>查看报告</Text>
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


const HomeScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation();
  const { login, user, loading, isAdmin, checkAdminStatus } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    company: '',
    department: ''
  });
  
  // 新增一个状态来防止未登录用户使用应用
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 添加公司和部门选择的状态
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  // 添加选择器模态框状态
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  // 设置状态栏颜色 - 简化状态栏设置
  useEffect(() => {
    // 移除此处的StatusBar设置，使用App.js中的全局设置
    // 避免与全局StatusBar设置冲突
  }, [isDarkMode, colors]);

  // 添加调试日志
  useEffect(() => {
    console.log('HomeScreen - Current user:', user);
    console.log('HomeScreen - Current isAdmin status:', isAdmin);
    
    // 根据用户登录状态设置认证状态
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user, isAdmin]);

  // 加载用户状态，检查登录状态
  useEffect(() => {
    if (!user && !loading) {
      console.log('HomeScreen - 用户未登录，检查登录状态');
      checkLoginStatus();
    } else if (user) {
      // 如果用户已登录，关闭所有模态框
      console.log('HomeScreen - 用户已登录，关闭所有登录/注册界面');
      setShowLoginModal(false);
      setShowRegisterModal(false);
    }
  }, [user, loading]);

  // 监听用户登出事件，重置登录表单状态
  useEffect(() => {
    // 监听用户登出事件
    const logoutListener = EventRegister.addEventListener(
      'USER_LOGGED_OUT',
      () => {
        console.log('收到用户登出事件，重置登录表单');
        // 重置登录表单
        setEmail('');
        setPassword('');
        setRememberMe(false);
        // 重置注册表单
        setRegisterForm({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          phone: '',
          company: '',
          department: ''
        });
      }
    );
    
    // 组件卸载时移除监听
    return () => {
      EventRegister.removeEventListener(logoutListener);
    };
  }, []);

  // 强制显示登录模态框，如果用户未登录
  useEffect(() => {
    if (!user && !loading) {
      console.log('HomeScreen - 强制显示登录界面，因为用户未登录');
      setShowLoginModal(true);
      setShowRegisterModal(false); // 确保注册模态框关闭
      
      // 重置注册表单
      setRegisterForm({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: '',
        company: '',
        department: ''
      });
    }
  }, [user, loading]);

  // 添加一个确保模态框状态一致的函数
  const ensureModalState = (loginVisible, registerVisible) => {
    console.log(`设置模态框状态: 登录=${loginVisible}, 注册=${registerVisible}`);
    
    // 先检查当前状态，避免不必要的状态更新
    if (showLoginModal !== loginVisible || showRegisterModal !== registerVisible) {
      // 使用批量更新来同时设置两个模态框的状态
      setShowLoginModal(loginVisible);
      setShowRegisterModal(registerVisible);
    }
  };
  
  // 创建一个延迟函数，用于按顺序执行操作
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // 处理从登录切换到注册的逻辑
  const handleShowRegister = async () => {
    try {
      console.log('开始切换到注册界面...');
      
      // 关闭登录模态框
      setShowLoginModal(false);
      
      // 等待足够长的时间，确保登录模态框完全关闭
      await delay(1000);
      
      // 然后显示注册模态框
      console.log('现在显示注册界面');
      setShowRegisterModal(true);
    } catch (error) {
      console.error('切换到注册界面时出错:', error);
    }
  };
  
  // 处理从注册切换到登录的逻辑
  const handleBackToLogin = async () => {
    try {
      console.log('开始切换到登录界面...');
      
      // 关闭注册模态框
      setShowRegisterModal(false);
      
      // 等待足够长的时间，确保注册模态框完全关闭
      await delay(1000);
      
      // 然后显示登录模态框
      console.log('现在显示登录界面');
      setShowLoginModal(true);
    } catch (error) {
      console.error('切换到登录界面时出错:', error);
    }
  };

  const checkLoginStatus = async () => {
    try {
      // 首先检查是否有用户数据
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          // 如果存在用户数据，直接恢复登录状态
          const parsedUserData = JSON.parse(userData);
          await login(parsedUserData);
          return;
        } catch (parseError) {
          console.error('解析用户数据失败:', parseError);
          // 如果解析失败，清除损坏的数据
          await AsyncStorage.removeItem('user');
          // 继续尝试其他登录方式
        }
      }

      // 如果没有用户数据或解析失败，检查是否有保存的登录凭证
      const savedEmail = await AsyncStorage.getItem('userEmail');
      const savedPassword = await AsyncStorage.getItem('userPassword');
      const rememberMeStatus = await AsyncStorage.getItem('rememberMe');

      if (savedEmail && savedPassword && rememberMeStatus === 'true') {
        // 如果有保存的登录信息，尝试自动登录
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        try {
          await handleLogin(true);
          return;
        } catch (error) {
          console.error('自动登录失败:', error);
          // 自动登录失败，继续显示登录窗口
        }
      }

      // 如果既没有用户数据也没有保存的登录凭证，显示登录窗口
      setShowLoginModal(true);
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setShowLoginModal(true);
    }
  };

  const handleLogin = async (isAutoLogin = false) => {
    // 只在用户主动点击登录按钮时才检查输入值
    if (isLoading) return;

    // 自动登录时不需要验证输入
    if (!isAutoLogin && (!email || !password)) {
      return;
    }

    setIsLoading(true);
    try {
      // 第一步：调用登录API获取用户基本信息
      console.log('第一步：调用登录API获取用户基本信息');
      const response = await axios.post('https://zziot.jzz77.cn:9003/api/login', {
        email,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const loginResponse = response.data;
      if (!loginResponse || !loginResponse.user) {
        throw new Error(loginResponse?.message || '登录响应数据无效');
      }

      // 登录成功，获取用户基本信息
      const userInfo = loginResponse.user;
      

      
      // 检查所有可能的管理员相关字段
      const adminRelatedFields = [
        'is_admin', 'isAdmin', 'admin'
      ];
      
      console.log('管理员相关字段检查:');
      adminRelatedFields.forEach(field => {
        if (userInfo[field] !== undefined) {
          console.log(`- ${field}: ${JSON.stringify(userInfo[field])}`);
        }
      });
      console.log('=============================================');
      
      // 第二步：调用login函数存储用户基本信息，此时不检查管理员权限
      console.log('第二步：调用登录函数，存储用户信息并查询管理员状态');
      await login(userInfo); // 修改后的login函数会在内部处理管理员权限查询和令牌创建
      
      // 如果未选择记住密码，清除之前可能保存的登录信息
      if (!rememberMe) {
        await AsyncStorage.removeItem('userEmail');
        await AsyncStorage.removeItem('userPassword');
        await AsyncStorage.removeItem('rememberMe');
      }
      
      // 保存登录信息（如果选择了记住密码）
      if (rememberMe && email && password) {
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('userPassword', password);
        await AsyncStorage.setItem('rememberMe', 'true');
      }
      
      // 第三步：登录成功后，关闭登录弹窗
      console.log('第三步：登录成功，关闭登录弹窗');
      setShowLoginModal(false);
      
      // 登录完成，记录最终状态信息
      console.log('登录过程完成，当前管理员状态:', isAdmin);
      const userDataStr = await AsyncStorage.getItem('user');
      if (userDataStr) {
        const parsedUser = JSON.parse(userDataStr);
        console.log('最终用户信息中的管理员值:', 
                   '是否管理员:', parsedUser.is_admin, 
                   '原始值:', parsedUser.is_admin_value);
      }

    } catch (error) {
      console.error('登录失败:', error);
      let errorMessage = '登录失败';
      
      if (error.response) {
        errorMessage = error.response.data?.message || '服务器返回错误，请稍后重试';
      } else if (error.request) {
        errorMessage = '网络连接失败，请检查网络设置';
      } else {
        errorMessage = error.message || '登录过程中发生错误，请重试';
      }
      // 只在非自动登录情况下显示错误提示
      if (!isAutoLogin) {
        Alert.alert('错误', errorMessage);
      }
      // 如果是自动登录失败，回传错误便于调用者处理
      if (isAutoLogin) {
        throw new Error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('开始处理注册请求...');
    
    if (!registerForm.username || !registerForm.password || !registerForm.confirmPassword ||
        !registerForm.email || !registerForm.phone || !registerForm.company || !registerForm.department) {
      console.log('注册表单填写不完整');
      Alert.alert('提示', '请填写完整注册信息');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      console.log('两次输入的密码不一致');
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      console.log('发送注册请求到API...');
      console.log('请求数据:', JSON.stringify({
        username: registerForm.username,
        email: registerForm.email,
        phone: registerForm.phone,
        company: registerForm.company,
        department: registerForm.department
      }));
      
      const response = await axios.post('https://zziot.jzz77.cn:9003/api/register', {
        username: registerForm.username,
        password: registerForm.password,
        email: registerForm.email,
        phone: registerForm.phone,
        company: registerForm.company,
        department: registerForm.department
      }, {
        timeout: 15000, // 增加超时时间到15秒
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('注册API响应状态:', response.status);
      
      // 检查响应数据
      if (response.data && response.status === 201) {
        console.log('注册成功，显示成功提示');
        
        // 保存注册成功的邮箱，用于登录页面自动填充
        const registeredEmail = registerForm.email;
        
        // 清空注册表单
        setRegisterForm({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          phone: '',
          company: '',
          department: ''
        });
        
        // 注册成功，显示更明确的成功提示
        Alert.alert(
          '注册成功', 
          '您的账号已创建成功，请使用新账号登录系统。', 
          [
            {
              text: '确定',
              onPress: () => {
                console.log('注册成功，准备跳转到登录页面');
                
                // 使用新的ensureModalState函数
                // 延迟执行，确保Alert关闭后再切换界面
                setTimeout(() => {
                  // 预填充登录表单中的邮箱 
                  setEmail(registeredEmail);
                  setPassword('');
                  
                  // 先关闭所有模态框
                  ensureModalState(false, false);
                  
                  // 等待一段时间后再显示登录模态框
                  setTimeout(() => {
                    console.log('注册成功后打开登录界面');
                    ensureModalState(true, false);
                  }, 500);
                }, 300);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('注册请求失败:', error);
      let errorMessage = '注册失败，请稍后重试';
      
      if (error.response) {
        console.error('服务器响应错误:', error.response.status, error.response.data);
        errorMessage = error.response.data?.message || '服务器返回错误，请稍后重试';
      } else if (error.request) {
        console.error('无法连接到服务器:', error.request);
        errorMessage = '网络连接失败，请检查网络设置';
      } else {
        console.error('请求配置错误:', error.message);
        errorMessage = error.message || '发送注册请求时发生错误';
      }
      
      Alert.alert('注册失败', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取公司列表
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await axios.get('https://nodered.jzz77.cn:9003/api/companies', {
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('获取到公司列表:', response.data.length);
        setCompanies(response.data);
        if (response.data.length > 0) {
          setSelectedCompany(response.data[0].id.toString());
          // 预加载第一个公司的部门
          updateDepartments(response.data[0]);
        }
      } else {
        console.log('服务器返回的公司数据格式不正确:', response.data);
      }
    } catch (error) {
      console.error('获取公司列表失败:', error);
      Alert.alert('提示', '获取公司列表失败，请稍后再试或直接联系管理员。');
    } finally {
      setLoadingCompanies(false);
    }
  };

  // 根据选中的公司更新部门列表
  const updateDepartments = (company) => {
    if (!company) return;
    
    const deptList = [];
    // 从department1到department10收集所有非空部门
    for (let i = 1; i <= 10; i++) {
      const deptKey = `department${i}`;
      if (company[deptKey] && company[deptKey].trim() !== '') {
        deptList.push({
          id: i,
          name: company[deptKey]
        });
      }
    }
    
    console.log('获取到部门列表:', deptList.length);
    setDepartments(deptList);
    
    // 如果有部门，默认选择第一个
    if (deptList.length > 0) {
      setRegisterForm(prev => ({
        ...prev,
        department: deptList[0].name
      }));
    } else {
      setRegisterForm(prev => ({
        ...prev,
        department: ''
      }));
    }
  };

  // 当选择公司改变时
  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    
    // 查找对应的公司对象
    const selectedCompanyObj = companies.find(c => c.id.toString() === companyId);
    if (selectedCompanyObj) {
      // 更新表单中的公司名称
      setRegisterForm(prev => ({
        ...prev,
        company: selectedCompanyObj.company_name
      }));
      
      // 更新部门列表
      updateDepartments(selectedCompanyObj);
    }
  };

  // 注册模态框打开时获取公司列表
  useEffect(() => {
    if (showRegisterModal) {
      fetchCompanies();
    }
  }, [showRegisterModal]);

  // 处理公司选择 - iOS平台
  const handleCompanySelectIOS = () => {
    if (loadingCompanies || companies.length === 0) {
      Alert.alert('提示', '公司数据加载中或暂无公司数据');
      return;
    }
    
    const options = companies.map(company => company.company_name);
    options.push('取消');
    
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: '选择公司',
      },
      (buttonIndex) => {
        if (buttonIndex !== options.length - 1) {
          const selectedCompanyObj = companies[buttonIndex];
          setSelectedCompany(selectedCompanyObj.id.toString());
          setRegisterForm(prev => ({
            ...prev,
            company: selectedCompanyObj.company_name
          }));
          updateDepartments(selectedCompanyObj);
        }
      }
    );
  };

  // 处理部门选择 - iOS平台
  const handleDepartmentSelectIOS = () => {
    if (departments.length === 0) {
      Alert.alert('提示', '该公司暂无部门数据');
      return;
    }
    
    const options = departments.map(dept => dept.name);
    options.push('取消');
    
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: '选择部门',
      },
      (buttonIndex) => {
        if (buttonIndex !== options.length - 1) {
          setRegisterForm(prev => ({
            ...prev,
            department: departments[buttonIndex].name
          }));
        }
      }
    );
  };

  // 公司选择器组件
  const CompanySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.selectorLabel, { color: colors.text }]}>公司</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { backgroundColor: colors.background }]}
        onPress={Platform.OS === 'ios' ? handleCompanySelectIOS : () => setShowCompanyModal(true)}
        disabled={loadingCompanies}
      >
        {loadingCompanies ? (
          <ActivityIndicator size="small" color="#FF6700" style={{ marginRight: 10 }} />
        ) : null}
        <Text 
          style={[
            styles.selectorButtonText, 
            { color: registerForm.company ? colors.text : colors.textSecondary }
          ]}
          numberOfLines={1}
        >
          {registerForm.company || '请选择公司'}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={16} 
          color={colors.textSecondary} 
          style={{ marginLeft: 'auto' }} 
        />
      </TouchableOpacity>
    </View>
  );

  // 部门选择器组件
  const DepartmentSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.selectorLabel, { color: colors.text }]}>部门</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { backgroundColor: colors.background }]}
        onPress={Platform.OS === 'ios' ? handleDepartmentSelectIOS : () => setShowDepartmentModal(true)}
        disabled={departments.length === 0}
      >
        <Text 
          style={[
            styles.selectorButtonText, 
            { color: registerForm.department ? colors.text : colors.textSecondary }
          ]}
          numberOfLines={1}
        >
          {registerForm.department || (departments.length === 0 ? '请先选择公司' : '请选择部门')}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={16} 
          color={colors.textSecondary} 
          style={{ marginLeft: 'auto' }} 
        />
      </TouchableOpacity>
    </View>
  );

  // 添加样式
  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    modalContent: {
      width: '85%',
      padding: 28,
      borderRadius: 18,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      marginTop: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 1.5,
      borderColor: '#FF6700',
      borderRadius: 5,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#FF6700',
    },
    rememberMeText: {
      fontSize: 15,
      color: colors.text,
    },
    modalTitle: {
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
      color: colors.text,
      letterSpacing: 0.5,
    },
    input: {
      width: '100%',
      height: 52,
      borderWidth: 1.5,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd',
      borderRadius: 10,
      paddingHorizontal: 16,
      marginBottom: 20,
      fontSize: 16,
    },
    loginButton: {
      width: '100%',
      height: 52,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
      backgroundColor: '#FF6700',
      shadowColor: '#FF6700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 4,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    registerButton: {
      marginTop: 24,
      padding: 12,
    },
    registerButtonText: {
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '500',
      color: '#FF6700',
    },
    errorText: {
      color: colors.error,
    },
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#F5F5F7',
    },
    // 选择器样式
    selectorContainer: {
      width: '100%',
      marginBottom: 20,
    },
    selectorLabel: {
      fontSize: 14,
      marginBottom: 8,
      fontWeight: '500',
    },
    selectorButton: {
      width: '100%',
      height: 52,
      borderWidth: 1.5,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd',
      borderRadius: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectorButtonText: {
      fontSize: 16,
      flex: 1,
    },
    pickerModalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerModalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      maxHeight: '80%',
    },
    pickerModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    pickerModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    pickerModalCloseButton: {
      padding: 8,
    },
    listContainer: {
      paddingHorizontal: 5,
    },
    listItem: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row',
      alignItems: 'center',
    },
    listItemText: {
      fontSize: 16,
      color: colors.text,
    },
    listItemSelected: {
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.2)' : 'rgba(255,103,0,0.05)',
    },
    checkIcon: {
      marginLeft: 'auto',
    },
    emptyListContainer: {
      padding: 20,
      alignItems: 'center',
    },
    emptyListText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  // HomeScreen组件内

  // 在主要渲染逻辑中添加认证状态检查
  if (!isAuthenticated && !loading) {
    // 如果用户未登录且不在加载状态，只显示登录界面，不显示应用内容
    console.log('HomeScreen - 用户未认证，只显示登录/注册界面');
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* 登录模态框 */}
        <Modal
          key="loginModal"
          animationType="slide"
          transparent={true}
          visible={showLoginModal}
          onRequestClose={() => {
            console.log('防止关闭登录模态框，用户必须登录');
            // 不允许用户关闭登录模态框
          }}
          hardwareAccelerated={true}
          statusBarTranslucent={false}
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>用户登录</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="邮箱/账号"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="密码"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.rememberMeContainer}>
                <TouchableOpacity 
                  style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
                <Text style={[styles.rememberMeText, { color: colors.text }]}>记住密码</Text>
              </View>
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>登录</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleShowRegister}
              >
                <Text style={[styles.registerButtonText, { color: colors.primary }]}>没有账号？立即注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        {/* 注册模态框 */}
        <Modal
          key="registerModal"
          animationType="slide"
          transparent={true}
          visible={showRegisterModal}
          onRequestClose={() => {
            console.log('用户尝试关闭注册模态框');
            handleBackToLogin();
          }}
          hardwareAccelerated={true}
          statusBarTranslucent={false}
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>注册</Text>
              
              <ScrollView style={{ width: '100%' }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="用户名"
                  placeholderTextColor={colors.textSecondary}
                  value={registerForm.username}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, username: text }))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="密码"
                  placeholderTextColor={colors.textSecondary}
                  value={registerForm.password}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, password: text }))}
                  secureTextEntry
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="确认密码"
                  placeholderTextColor={colors.textSecondary}
                  value={registerForm.confirmPassword}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="邮箱"
                  placeholderTextColor={colors.textSecondary}
                  value={registerForm.email}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="手机号码"
                  placeholderTextColor={colors.textSecondary}
                  value={registerForm.phone}
                  onChangeText={(text) => setRegisterForm(prev => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                />
                
                {/* 公司选择器 */}
                <CompanySelector />
                
                {/* 部门选择器 */}
                <DepartmentSelector />
                
              </ScrollView>
              
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>注册</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleBackToLogin}
              >
                <Text style={[styles.registerButtonText, { color: colors.primary }]}>已有账号？立即登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        {/* 背景视图，当用户未认证时显示 */}
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.background
        }}>
          <Text style={{ 
            fontSize: 22, 
            fontWeight: 'bold', 
            color: colors.primary,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            正泽物联系统平台
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: colors.text,
            textAlign: 'center',
            marginBottom: 30
          }}>
            请登录后使用系统功能
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showLoginModal}
        onRequestClose={() => setShowLoginModal(false)}
        hardwareAccelerated={true} // 启用硬件加速以提高在真机上的性能
        statusBarTranslucent={false} // 避免状态栏透明导致的布局问题
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>登录</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="邮箱"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="密码"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.rememberMeContainer}>
              <TouchableOpacity 
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
                onPress={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <Text style={[styles.rememberMeText, { color: colors.text }]}>记住密码</Text>
            </View>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>登录</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleShowRegister}
            >
              <Text style={[styles.registerButtonText, { color: colors.primary }]}>没有账号？立即注册</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRegisterModal}
        onRequestClose={() => setShowRegisterModal(false)}
        hardwareAccelerated={true} // 启用硬件加速以提高在真机上的性能
        statusBarTranslucent={false} // 避免状态栏透明导致的布局问题
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>注册</Text>
            
            <ScrollView style={{ width: '100%' }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="用户名"
                placeholderTextColor={colors.textSecondary}
                value={registerForm.username}
                onChangeText={(text) => setRegisterForm(prev => ({ ...prev, username: text }))}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="密码"
                placeholderTextColor={colors.textSecondary}
                value={registerForm.password}
                onChangeText={(text) => setRegisterForm(prev => ({ ...prev, password: text }))}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="确认密码"
                placeholderTextColor={colors.textSecondary}
                value={registerForm.confirmPassword}
                onChangeText={(text) => setRegisterForm(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="邮箱"
                placeholderTextColor={colors.textSecondary}
                value={registerForm.email}
                onChangeText={(text) => setRegisterForm(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="手机号码"
                placeholderTextColor={colors.textSecondary}
                value={registerForm.phone}
                onChangeText={(text) => setRegisterForm(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
              
              {/* 公司选择器 */}
              <CompanySelector />
              
              {/* 部门选择器 */}
              <DepartmentSelector />
              
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>注册</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleBackToLogin}
            >
              <Text style={[styles.registerButtonText, { color: colors.primary }]}>已有账号？立即登录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Android公司选择模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCompanyModal}
        onRequestClose={() => setShowCompanyModal(false)}
        hardwareAccelerated={true} 
        statusBarTranslucent={false}
      >
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>选择公司</Text>
              <TouchableOpacity 
                style={styles.pickerModalCloseButton} 
                onPress={() => setShowCompanyModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {loadingCompanies ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF6700" />
                <Text style={{ marginTop: 15, color: colors.text }}>加载中...</Text>
              </View>
            ) : companies.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>暂无公司数据</Text>
              </View>
            ) : (
              <FlatList
                data={companies}
                style={styles.listContainer}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      selectedCompany === item.id.toString() && styles.listItemSelected
                    ]}
                    onPress={() => {
                      handleCompanyChange(item.id.toString());
                      setShowCompanyModal(false);
                    }}
                  >
                    <Text style={styles.listItemText}>{item.company_name}</Text>
                    {selectedCompany === item.id.toString() && (
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color="#FF6700" 
                        style={styles.checkIcon} 
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Android部门选择模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDepartmentModal}
        onRequestClose={() => setShowDepartmentModal(false)}
        hardwareAccelerated={true}
        statusBarTranslucent={false}
      >
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>选择部门</Text>
              <TouchableOpacity 
                style={styles.pickerModalCloseButton} 
                onPress={() => setShowDepartmentModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {departments.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>
                  {selectedCompany ? '该公司暂无部门数据' : '请先选择公司'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={departments}
                style={styles.listContainer}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      registerForm.department === item.name && styles.listItemSelected
                    ]}
                    onPress={() => {
                      setRegisterForm(prev => ({ ...prev, department: item.name }));
                      setShowDepartmentModal(false);
                    }}
                  >
                    <Text style={styles.listItemText}>{item.name}</Text>
                    {registerForm.department === item.name && (
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color="#FF6700" 
                        style={styles.checkIcon} 
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* 平台特定导航 */}
      {Platform.OS === 'ios' ? (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === '工作台') {
                iconName = focused ? 'grid' : 'grid-outline';
              } else if (route.name === '消息中心') {
                iconName = focused ? 'notifications' : 'notifications-outline';
              } else if (route.name === '个人中心') {
                iconName = focused ? 'person' : 'person-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#FF6700',
            tabBarInactiveTintColor: isDarkMode ? '#999999' : '#999999',
            tabBarStyle: {
              backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
              borderTopWidth: 0.5,
              borderTopColor: isDarkMode ? '#333333' : '#E0E0E0',
            },
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.headerBackground,
              height: Platform.OS === 'ios' ? 100 : 0,
              shadowOpacity: 0,
              elevation: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: colors.headerText,
            headerTitleStyle: {
              fontSize: 17,
              fontWeight: 'bold',
            }
          })}
        >
          <Tab.Screen 
            name="工作台" 
            component={MainTab} 
            options={{ 
              title: '正泽物联系统平台',
              tabBarLabel: '工作台'
            }} 
          />
          <Tab.Screen 
            name="消息中心" 
            component={MessageScreen} 
          />
          <Tab.Screen 
            name="个人中心" 
            component={ProfileScreen} 
          />
        </Tab.Navigator>
      ) : (
        <View style={{
          flex: 1, 
          backgroundColor: isDarkMode ? '#121212' : '#F5F5F7',
          paddingTop: StatusBar.currentHeight
        }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === '工作台') {
                  iconName = focused ? 'grid' : 'grid-outline';
                } else if (route.name === '消息中心') {
                  iconName = focused ? 'notifications' : 'notifications-outline';
                } else if (route.name === '个人中心') {
                  iconName = focused ? 'person' : 'person-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#FF6700',
              tabBarInactiveTintColor: isDarkMode ? '#999999' : '#999999',
              tabBarStyle: {
                backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
                borderTopWidth: 0.5,
                borderTopColor: isDarkMode ? '#333333' : '#E0E0E0',
                paddingBottom: 0,
                height: 60,
              },
              headerShown: false,
              header: () => null,
            })}
            sceneContainerStyle={{
              backgroundColor: isDarkMode ? '#121212' : '#F5F5F7', 
              paddingTop: 0
            }}
          >
            <Tab.Screen 
              name="工作台" 
              component={MainTab} 
              options={{ 
                tabBarLabel: '工作台',
                headerShown: false
              }} 
            />
            <Tab.Screen 
              name="消息中心" 
              component={MessageScreen} 
              options={{
                headerShown: false
              }}
            />
            <Tab.Screen 
              name="个人中心" 
              component={ProfileScreen} 
              options={{
                headerShown: false
              }}
            />
          </Tab.Navigator>
        </View>
      )}
    </>
  );
};

export default HomeScreen;