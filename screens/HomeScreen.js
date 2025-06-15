import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch, FlatList, TouchableWithoutFeedback, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { statsApi, authApi, userApi } from '../api/apiService';
import * as Location from 'expo-location';
import { EventRegister } from '../utils/EventEmitter';
import ProfileScreen from './ProfileScreen';
import SiteListScreen from './SiteListScreen';
import MessageScreen from './MessageScreen';
import { useTheme } from '../context/ThemeContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

// 主页面组件
const MainTab = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth(); // Removed isAdmin, isDeptAdmin
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

  // 添加获取统计数据的函数
  const fetchStats = useCallback(async (isManual = false) => {
    try {
      setIsRefreshing(true); // 开始刷新时设置状态
      const data = await statsApi.getOverview({ isManual });

      if (data) {
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
    backgroundColor: colors.background,
    paddingTop: 0,
  },
  titleBar: {
    height: Platform.OS === 'android' ? 48 + (StatusBar.currentHeight || 0) : 56,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    ...DesignTokens.shadows.lg,
    borderBottomWidth: 0,
  },
  titleText: {
    ...DesignTokens.typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  titleIcon: {
    marginRight: DesignTokens.spacing.xs,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: DesignTokens.spacing.md,
    paddingBottom: DesignTokens.spacing.xl,
  },
  header: {
    paddingHorizontal: DesignTokens.spacing.xl,
    paddingVertical: DesignTokens.spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: DesignTokens.borderRadius.xl,
    marginHorizontal: DesignTokens.spacing.lg,
    marginTop: Platform.OS === 'android' ? -10 : DesignTokens.spacing.xs,
    marginBottom: DesignTokens.spacing.xxl,
    ...DesignTokens.shadows.xl,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? colors.border : 'transparent',
  },
  headerSubtitle: {
    ...DesignTokens.typography.body1,
    fontWeight: '600',
    color: colors.text,
    opacity: 0.9,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sectionContainer: {
    marginBottom: DesignTokens.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: DesignTokens.spacing.lg,
    marginBottom: DesignTokens.spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...DesignTokens.typography.h4,
    color: colors.text,
    marginLeft: DesignTokens.spacing.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.25)' : 'rgba(255,103,0,0.12)',
      ...DesignTokens.shadows.sm,
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    statsCardContainer: {
      width: '48%',
      marginBottom: 16,
    },
    statsCard: {
      flex: 1,
      padding: 16,
      paddingTop: 14,
      paddingBottom: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      shadowColor: isDarkMode ? '#000' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: isDarkMode ? 6 : 3,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'transparent',
      transform: [{ scale: 1 }],
    },
    statsValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    statsLabel: {
      fontSize: 13,
      lineHeight: 18,
      color: isDarkMode ? colors.text : '#666',
      textAlign: 'center',
      maxWidth: '95%',
      opacity: isDarkMode ? 0.8 : 0.9,
      fontWeight: '500',
    },
    functionCard: {
      height: 130,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 8,
      paddingBottom: 8,
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      shadowColor: isDarkMode ? '#000' : '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.25 : 0.06,
      shadowRadius: 6,
      elevation: isDarkMode ? 5 : 2,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'transparent',
      transform: [{ scale: 1 }],
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      marginTop: -2,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)',
      borderWidth: 0,
      ...DesignTokens.shadows.sm,
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      marginVertical: 8,
      marginHorizontal: 24,
    },
    customShortcutsContainer: {
      marginTop: Platform.OS === 'android' ? 8 : 12,
      marginBottom: 16,
    },
    customShortcutsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    customShortcutsTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.25)' : 'rgba(255,103,0,0.1)',
      borderRadius: 20,
      ...DesignTokens.shadows.sm,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? 'rgba(255,103,0,0.3)' : 'transparent',
    },
    editButtonText: {
      fontSize: 14,
      color: '#FF6700',
      marginLeft: 6,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    shortcutsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
    },
    shortcutItem: {
      width: '25%',
      alignItems: 'center',
      marginBottom: 16,
    },
    shortcutIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      shadowColor: isDarkMode ? '#000' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: isDarkMode ? 6 : 3,
      marginBottom: 12,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'transparent',
      transform: [{ scale: 1 }],
    },
    shortcutText: {
      fontSize: 13,
      textAlign: 'center',
      color: colors.text,
      maxWidth: 76,
      marginTop: 4,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    addShortcutIcon: {
      borderStyle: 'dashed',
      borderWidth: 2,
      borderColor: '#FF6700',
      backgroundColor: isDarkMode ? 'rgba(255,103,0,0.15)' : 'rgba(255,103,0,0.06)',
    },
    removeButton: {
      position: 'absolute',
      top: -10,
      right: -10,
      backgroundColor: '#FF6700',
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 2,
      borderColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    },
    adminMenuItem: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      padding: 12,
      borderRadius: 12,
      width: '48%',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
    },
    adminMenuItemText: {
      color: isDarkMode ? colors.text : '#2196F3',
      fontWeight: '600',
      fontSize: 13,
      marginTop: 8,
      textAlign: 'center',
    },
    adminMenuContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    refreshButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
  });

  // 自定义快捷方式的状态
  const [shortcuts, setShortcuts] = useState([
    { id: '1', name: '站点列表', icon: 'location', color: '#2196F3', route: '站点列表' },
    { id: '2', name: '数据中心', icon: 'analytics', color: '#4CAF50', route: '数据中心' },
    { id: '3', name: '数据查询', icon: 'timer', color: '#FF9800', route: '数据查询' },
    { id: '4', name: '报告查询', icon: 'document-text', color: '#E91E63', route: '报告查询' },
    // 工单系统已删除
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
    // 工单系统已删除
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
      // 导航到登录页面
      navigation.navigate('Login');
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
                  onPress={() => fetchStats(true)} // 传 true 表示手动刷新
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
                    <Ionicons name="enter-outline" size={24} color="#2196F3" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_in}</Text>
                    <Text style={styles.statsLabel}>总进水量(吨)</Text>
                  </View>
                </View>
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="exit-outline" size={24} color="#4CAF50" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_out}</Text>
                    <Text style={styles.statsLabel}>总出水量(吨)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="cube-outline" size={24} color="#FF9800" />
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
                    <Ionicons name="color-fill-outline" size={24} color="#9C27B0" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.disinfectant}</Text>
                    <Text style={styles.statsLabel}>消毒剂使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="layers-outline" size={24} color="#795548" />
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
                  onPress={() => fetchStats(true)} // 传 true 表示手动刷新
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
                    <Ionicons name="enter-outline" size={24} color="#2196F3" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.totalProcessing_in}</Text>
                    <Text style={styles.statsLabel}>总进水量(吨)</Text>
                  </View>
                </View>
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="exit-outline" size={24} color="#4CAF50" />
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
                    <Ionicons name="color-fill-outline" size={24} color="#9C27B0" />
                    <Text style={styles.statsValue} adjustsFontSizeToFit numberOfLines={1}>{stats.disinfectant}</Text>
                    <Text style={styles.statsLabel}>消毒剂使用量(L)</Text>
                  </View>
                </View>
                
                <View style={[styles.statsCardContainer, { width: '31%' }]}>
                  <View style={styles.statsCard}>
                    <Ionicons name="layers-outline" size={24} color="#795548" />
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
                onPress={() => navigation.navigate('文件管理')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(103, 58, 183, 0.15)' }]}>
                  <Ionicons name="folder" size={26} color="#673AB7" />
                </View>
                <Text style={styles.statsValue} numberOfLines={1}>文件管理</Text>
                <Text style={styles.statsLabel} numberOfLines={2}>云端文件</Text>
              </TouchableOpacity>
            </View>
            
            {/* 工单系统已删除 */}
            
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
        {(user?.role_name === '超级管理员' || user?.role_name === '管理员') && (
          <>
            <View style={styles.divider} />
            
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                    <Ionicons name="shield" size={20} color="#2196F3" />
                  </View>
                  <Text style={styles.sectionTitle}>管理员功能</Text>
                </View>
              </View>
              
              <View style={styles.adminMenuContainer}>
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => navigation.navigate('UserManagementScreen')}
                >
                  <Ionicons name="people" size={20} color="#2196F3" />
                  <Text style={styles.adminMenuItemText}>用户管理</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => navigation.navigate('ApiManagementScreen')}
                >
                  <Ionicons name="cloud" size={20} color="#2196F3" />
                  <Text style={styles.adminMenuItemText}>API管理</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => navigation.navigate('OAuth2ConfigScreen')}
                >
                  <Ionicons name="shield-checkmark" size={20} color="#2196F3" />
                  <Text style={styles.adminMenuItemText}>OAuth2配置</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => navigation.navigate('DepartmentPermissionScreen')}
                >
                  <Ionicons name="business" size={20} color="#2196F3" />
                  <Text style={styles.adminMenuItemText}>部门权限管理</Text>
                </TouchableOpacity>
                
                {/* 这里添加更多管理员功能按钮 */}
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => Alert.alert('提示', '此功能正在开发中')}
                >
                  <Ionicons name="settings" size={20} color="#2196F3" />
                  <Text style={styles.adminMenuItemText}>系统设置</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.adminMenuItem}
                  onPress={() => Alert.alert('提示', '此功能正在开发中')}
                >
                  <Ionicons name="analytics" size={20} color="#2196F3" />
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
  const { login, user, loading, checkAdminStatus } = useAuth();
  
  // 新增一个状态来防止未登录用户使用应用
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  


  // 设置状态栏颜色 - 简化状态栏设置
  useEffect(() => {
    // 移除此处的StatusBar设置，使用App.js中的全局设置
    // 避免与全局StatusBar设置冲突
  }, [isDarkMode, colors]);

  // 用户状态变化处理
  useEffect(() => {
    // 根据用户登录状态设置认证状态
    if (user) {
      console.log('[HomeScreen] 用户已登录，设置认证状态为true');
      setIsAuthenticated(true);
    } else {
      console.log('[HomeScreen] 用户未登录，设置认证状态为false');
      setIsAuthenticated(false);
    }
  }, [user]);

  // 加载用户状态，检查登录状态
  useEffect(() => {
    // 只有在没有用户数据且不在加载状态时才检查登录状态
    if (!user && !loading && !isAuthenticated) {
      console.log('[HomeScreen] 检查登录状态');
      checkLoginStatus();
    }
  }, [user, loading, isAuthenticated]);







  const checkLoginStatus = async () => {
    try {
      console.log('[HomeScreen] 开始检查登录状态');
      
      // 如果用户已经登录，不需要检查
      if (user) {
        console.log('[HomeScreen] 用户已登录，跳过检查');
        return;
      }

      // 首先检查是否有用户数据
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          // 如果存在用户数据，直接恢复登录状态
          const parsedUserData = JSON.parse(userData);
          console.log('[HomeScreen] 找到本地用户数据，尝试恢复登录状态');
          await login(parsedUserData);
          return;
        } catch (parseError) {
          console.error('[HomeScreen] 解析用户数据失败:', parseError);
          // 如果解析失败，清除损坏的数据
          await AsyncStorage.removeItem('user');
          // 继续尝试其他登录方式
        }
      }

      // 如果没有用户数据且用户未登录，导航到登录页面
      if (!user && !loading) {
        console.log('[HomeScreen] 没有用户数据，跳转到登录页面');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('[HomeScreen] 检查登录状态失败:', error);
      navigation.navigate('Login');
    }
  };







  // 公司选择器组件


  // 添加样式
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#F5F5F7',
    },
  });

  // HomeScreen组件内

  // 在主要渲染逻辑中添加认证状态检查
  if (!isAuthenticated && !loading && !user) {
    // 只有在用户未登录、不在加载状态且没有用户数据时才跳转
    console.log('[HomeScreen] 用户未认证，准备跳转到登录页面');
    // 使用setTimeout避免在渲染过程中立即导航
    setTimeout(() => {
      navigation.navigate('Login');
    }, 100);
    return null;
  }

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>加载中...</Text>
      </View>
    );
  }

  return (
    <>
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