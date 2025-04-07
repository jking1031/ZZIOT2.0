import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function SiteListScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
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
        const response = await axios.get('https://nodered.jzz77.cn:9003/api/site/sites', {
          timeout: 10000,
          signal: controller.signal,
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        });
        
        if (response.data) {
          setRawData(response.data);
          
          if (!Array.isArray(response.data) && typeof response.data === 'object') {
            response.data = [response.data];
          }
          
          const formattedSites = Array.isArray(response.data) ? response.data.map(site => ({
            id: (site.id || site._id || 0).toString(),
            name: site.name || '未知站点',
            status: site.status || '离线',
            alarm: site.alarm || '设施正常',
            address: site.address || '地址未知',
            totalInflow: site.totalInflow || 0,
            rawInfo: JSON.stringify(site, null, 2)
          })) : [];
          
          setSites(formattedSites);
          setLastUpdateTime(new Date());
          return;
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
  const renderSiteCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('站点详情', { siteId: item.id, siteName: item.name })}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.statusContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statusRow}>
          <View style={[styles.connectionStatus, { backgroundColor: updateTimer ? '#4CAF50' : '#FF5252' }]} />
          <Text style={[styles.connectionText, { color: colors.text }]}>
            {updateTimer ? '自动更新已开启' : '自动更新已关闭'}
          </Text>
        </View>
        <Text style={[styles.lastUpdateText, { color: colors.text }]}>
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
            <Text style={[styles.emptyText, { color: colors.text }]}>暂无站点数据</Text>
          </View>
        }
      />
    </View>
  );
};

// styles 应该与组件一起作为默认导出的一部分
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    marginLeft: 8,
    fontSize: 14,
  },
  lastUpdateText: {
    fontSize: 14,
    opacity: 0.8,
  },
  connectionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alarmCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    marginTop: 4,
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
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  }
});

// 只有一个默认导出
// 导出组件和样式
export { SiteListScreen as default, styles };