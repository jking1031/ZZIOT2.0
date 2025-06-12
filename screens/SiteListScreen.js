import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import axios from 'axios';
import { siteApi } from '../api/apiService';

function SiteListScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { user, getUserRoles } = useAuth();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const [sites, setSites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [hasRequestedInitialData, setHasRequestedInitialData] = useState(false);
  const [rawData, setRawData] = useState(null);
  const [updateTimer, setUpdateTimer] = useState(null);

  // 使用 useRef 来存储当前的 appState，避免触发重渲染
  const currentAppState = useRef(AppState.currentState);

  // 添加一个 ref 来跟踪是否正在获取数据
  const isFetchingRef = useRef(false);
  
  // 创建一个映射来缓存最后一次预加载的时间戳
  const lastPreloadTimeMap = useRef({}).current;

  const fetchSites = useCallback(async (retryCount = 3, retryDelay = 5000) => {
    // 如果正在获取数据，则返回
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    let lastError = null;
    const controller = new AbortController();
    
    for (let i = 0; i < retryCount; i++) {
      try {
        const response = await siteApi.getSites();
        
        console.log('[SiteListScreen] API响应数据:', JSON.stringify(response, null, 2));
        
        if (response) {
          setRawData(response);
          
          let dataToProcess = response;
          
          // 如果响应是单个对象，转换为数组
          if (!Array.isArray(dataToProcess) && typeof dataToProcess === 'object') {
            console.log('[SiteListScreen] 将单个对象转换为数组');
            dataToProcess = [dataToProcess];
          }
          
          const formattedSites = Array.isArray(dataToProcess) ? dataToProcess.map(site => {
            console.log('[SiteListScreen] 处理站点数据:', site);
            return {
              id: (site.id || site._id || 0).toString(),
              name: site.name || '未知站点',
              status: site.status || '离线',
              alarm: site.alarm || '设施正常',
              address: site.address || '地址未知',
              totalInflow: site.totalInflow || 0,
              departments: site.departments || [],
              designedCapacity: site.designedCapacity || '未知',
              totalProcessing: site.totalProcessing || '0',
              rawInfo: JSON.stringify(site, null, 2)
            };
          }) : [];
          
          console.log('[SiteListScreen] 格式化后的站点数据:', formattedSites);
          console.log('[SiteListScreen] 站点数量:', formattedSites.length);
          setSites(formattedSites);
          setLastUpdateTime(new Date());
          return;
        } else {
          console.log('[SiteListScreen] API响应为空');
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log('请求被取消');
          return;
        }
        console.error(`第 ${i + 1} 次获取站点数据失败:`, error);
        lastError = error;
        
        if (error.response?.status === 404) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    if (lastError) {
      let errorMessage = '获取站点数据失败';
      
      if (lastError.response) {
        errorMessage = `服务器错误 (${lastError.response.status})`;
      } else if (lastError.request) {
        errorMessage = '无法连接到服务器，请检查网络连接';
      }
      
      if (!sites.length) {
        setSites([]);
        setRawData(null);
        setLastUpdateTime(null);
      }
      
      console.error('重试后仍然失败:', errorMessage);
    }
    isFetchingRef.current = false;
    return controller;
  }, []);

  // 使用 useRef 来存储定时器 ID，避免状态更新导致的重渲染
  const timerRef = useRef(null);

  const startDataFetching = useCallback(() => {
    fetchSites();
    if (!timerRef.current) {
      timerRef.current = setInterval(fetchSites, 30000);
      setUpdateTimer(timerRef.current);
    }
  }, [fetchSites]);

  const stopDataFetching = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setUpdateTimer(null);
    }
  }, []);

  // 修改 useEffect，移除初始数据获取
  useEffect(() => {
    const focusUnsubscribe = navigation.addListener('focus', () => {
      // 只有当定时器未启动时才开始获取数据
      if (!timerRef.current) {
        startDataFetching();
      }
    });
    
    const blurUnsubscribe = navigation.addListener('blur', stopDataFetching);

    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (currentAppState.current.match(/inactive|background/) && nextAppState === 'active') {
        startDataFetching();
      } else if (nextAppState.match(/inactive|background/)) {
        stopDataFetching();
      }
      currentAppState.current = nextAppState;
    });

    // 组件挂载时开始获取数据
    startDataFetching();

    return () => {
      stopDataFetching();
      focusUnsubscribe();
      blurUnsubscribe();
      appStateSubscription.remove();
    };
  }, [navigation, startDataFetching, stopDataFetching]);

  // 刷新数据
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSites();
    } catch (error) {
      console.error('刷新站点数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 渲染站点卡片
  const renderSiteCard = ({ item }) => {
    console.log('[SiteListScreen] 渲染站点卡片:', item.name, item.id);
    return (
    <TouchableOpacity
      onPress={async () => {
        try {
          // 确保departments存在，并且是数组
          const departments = Array.isArray(item.departments) ? item.departments : [];
          
          console.log('准备进入站点详情页，站点ID:', item.id, '站点名称:', item.name);
          console.log('部门信息:', JSON.stringify(departments));
          
          // 先缓存部门信息，以便在站点详情页中可以更快获取
          try {
            await AsyncStorage.setItem(`site_departments_${item.id}`, 
              JSON.stringify({
                departments,
                timestamp: Date.now()
              })
            );
            console.log('已缓存站点部门信息');
          } catch (cacheError) {
            console.log('缓存站点部门信息失败:', cacheError);
          }
          
          // 提前尝试加载用户角色信息 - 使用从组件级获取的getUserRoles
          // 使用站点ID作为缓存键，确保每个站点都能正确预加载一次
          const now = Date.now();
          const cacheKey = `site_${item.id}`;
          const lastTime = lastPreloadTimeMap[cacheKey] || 0;
          
          // 确保距离上次预加载超过5秒
          if (getUserRoles && user?.id && (now - lastTime > 5000)) {
            // 更新时间戳
            lastPreloadTimeMap[cacheKey] = now;
            
            // 启动角色预加载，但不阻塞导航
            Promise.resolve().then(async () => {
              try {
                console.log('预加载用户角色信息...');
                await getUserRoles(user.id);
                console.log('用户角色预加载完成');
              } catch (roleError) {
                console.log('预加载用户角色失败:', roleError);
              }
            });
          }
          
          // 导航到站点详情页
          navigation.navigate('站点详情', { 
            siteId: item.id, 
            siteName: item.name,
            departments: departments
          });
        } catch (navigationError) {
          console.error('导航过程中出现错误:', navigationError);
          // 仍然尝试导航，确保用户体验
          navigation.navigate('站点详情', { 
            siteId: item.id || '0', 
            siteName: item.name || '未知站点',
            departments: []
          });
        }
      }}
    >
      <View style={[
        styles.card,
        { backgroundColor: colors.card },
        item.alarm === "设施报警" && styles.alarmCard
      ]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.siteName, { color: colors.text }]}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "在线" ? '#4CAF50' : '#FF5252' }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.contentRow}>
            <View style={styles.contentColumn}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>地址：</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{item.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>处理量：</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{item.totalInflow}吨</Text>
              </View>
            </View>
            <View style={styles.contentColumn}>
              {item.alarm && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: item.alarm === "设施正常" ? '#4CAF50' : '#FF5252' }]}>状态：</Text>
                  <Text style={[styles.infoValue, { color: item.alarm === "设施正常" ? '#4CAF50' : '#FF5252' }]}>{item.alarm}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  console.log('[SiteListScreen] 组件渲染 - sites数组长度:', sites.length);
  console.log('[SiteListScreen] 组件渲染 - sites数据:', sites);

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <View style={[styles.connectionStatus, { backgroundColor: updateTimer ? '#4CAF50' : '#FF5252' }]} />
          <Text style={styles.connectionText}>
            {updateTimer ? '自动更新已开启' : '自动更新已关闭'}
          </Text>
        </View>
        <Text style={styles.lastUpdateText}>
          {lastUpdateTime ? `最后更新: ${lastUpdateTime.toLocaleString('zh-CN', { hour12: false })}` : '暂无更新'}
        </Text>
      </View>
      <FlatList
        data={sites}
        renderItem={renderSiteCard}
        keyExtractor={(item) => (item.id || '').toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={colors.text + '80'} />
            <Text style={styles.emptyText}>暂无站点数据</Text>
          </View>
        }
      />
    </View>
  );
};

// 创建样式函数，使用设计令牌
const createStyles = (colors, isDarkMode) => {
  const { spacing, typography, borderRadius, shadows } = DesignTokens;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    statusContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      ...shadows.md,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    connectionText: {
      marginLeft: spacing.sm,
      fontSize: typography.sizes.md,
      color: colors.text,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    lastUpdateText: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
      fontWeight: '500',
      opacity: 0.8,
    },
    connectionStatus: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: spacing.md,
      ...shadows.sm,
    },
    listContainer: {
      paddingBottom: spacing.xxl,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.md,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
      transform: [{ scale: 1 }],
    },
    alarmCard: {
      borderLeftWidth: 5,
      borderLeftColor: colors.error,
      ...shadows.xl,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    siteName: {
      fontSize: typography.sizes.lg,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      letterSpacing: 0.2,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
      marginLeft: spacing.sm,
      ...shadows.sm,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: typography.sizes.sm,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    cardContent: {
      marginTop: spacing.sm,
    },
    contentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    contentColumn: {
      flex: 1,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
    },
    infoLabel: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    infoValue: {
      fontSize: typography.sizes.md,
      color: colors.text,
      flex: 1,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.md,
    },
    emptyText: {
      marginTop: spacing.lg,
      fontSize: typography.sizes.lg,
      color: colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.1,
      textAlign: 'center',
    },
  });
};

// 默认导出组件
export default SiteListScreen;