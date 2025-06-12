import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { messageApi } from '../api/apiService';

const MessageScreen = () => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('all');
  const [messages, setMessages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [updateTimer, setUpdateTimer] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  const UPDATE_INTERVAL = 30000; // 更新间隔：30秒
  const BACKGROUND_UPDATE_INTERVAL = 60000; // 后台更新间隔：60秒

  const tabs = [
    { id: 'all', label: '全部消息' },
    { id: 'alarm', label: '报警消息' },
    { id: 'warning', label: '预警消息' },
    { id: 'other', label: '其他消息' }
  ];

  // 加载上次保存的消息
  useEffect(() => {
    const loadSavedMessages = async () => {
      try {
        const savedMessages = await AsyncStorage.getItem('messages') || '[]';
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('加载历史消息失败:', error);
      }
    };
    loadSavedMessages();
  }, []);

  const [appId, setAppId] = useState(null);

  // 生成并获取唯一的appId
  const getUniqueAppId = useCallback(async () => {
    try {
      // 首先尝试从存储中获取现有的appId
      let storedAppId = await AsyncStorage.getItem('unique_app_id');
      
      if (!storedAppId) {
        // 如果没有存储的appId，生成一个新的
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        storedAppId = `zziot_${timestamp}_${randomStr}`;
        // 存储新生成的appId
        await AsyncStorage.setItem('unique_app_id', storedAppId);
      }
      
      setAppId(storedAppId);
      return storedAppId;
    } catch (error) {
      console.error('生成或获取appId失败:', error);
      return 'zziot_fallback';
    }
  }, []);

  // 在组件挂载时获取appId
  useEffect(() => {
    getUniqueAppId();
  }, [getUniqueAppId]);

  const fetchMessages = async () => {
    try {
      const response = await messageApi.getMessages();
      
      if (response.data && Array.isArray(response.data)) {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          response.data.forEach(newMsg => {
            if (!newMessages.some(msg => msg.id === newMsg.id)) {
              newMessages.push(newMsg);
            }
          });
          return newMessages;
        });
        setLastUpdateTime(new Date());
        await AsyncStorage.setItem('messages', JSON.stringify(messages));
      }
    } catch (error) {
      console.error('获取消息失败:', error);
    }
  };

  // 处理应用状态变化
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 初始获取消息
    fetchMessages();
    // 设置初始定时器
    updateMessageTimer(AppState.currentState);

    return () => {
      subscription.remove();
      if (updateTimer) {
        clearInterval(updateTimer);
      }
    };
  }, []);

  // 处理应用状态变化
  const handleAppStateChange = (nextAppState) => {
    console.log('App状态变化:', nextAppState);
    setAppState(nextAppState);
    updateMessageTimer(nextAppState);
  };

  // 更新消息定时器
  const updateMessageTimer = (currentState) => {
    if (updateTimer) {
      clearInterval(updateTimer);
    }

    const interval = currentState === 'active' ? UPDATE_INTERVAL : BACKGROUND_UPDATE_INTERVAL;
    const timer = setInterval(fetchMessages, interval);
    setUpdateTimer(timer);

    // 如果状态变为活跃，立即获取一次消息
    if (currentState === 'active') {
      fetchMessages();
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages().finally(() => setRefreshing(false));
  }, []);

  const filteredMessages = messages
    .filter(message => {
      if (activeTab === 'all') return true;
      return message.type === activeTab;
    });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleMessagePress = useCallback(async (messageId) => {
    try {
      // 标记消息为已读
      const updatedMessages = messages.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      );
      setMessages(updatedMessages);
      await AsyncStorage.setItem('previousMessages', JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('标记消息已读失败:', error);
    }
  }, [messages]);

  const renderMessageItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={[styles.messageItem, { backgroundColor: colors.card }]}
      onPress={() => handleMessagePress(item.id)}
    >
      <View style={styles.messageHeader}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={item.type === 'alarm' ? 'warning' : 'information-circle'} 
            size={24} 
            color={item.type === 'alarm' ? '#FF5252' : '#2196F3'} 
          />
          <Text style={[styles.messageTitle, { color: colors.text }]}>{item.title}</Text>
        </View>
        <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
          {formatDate(item.timestamp)}
        </Text>
      </View>
      <Text style={[styles.messageContent, { color: colors.text }]}>{item.content}</Text>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  ), [handleMessagePress, colors]);

  // 获取Android顶部状态栏高度 - 移除这个计算，避免双重内边距
  const statusBarHeight = 0; // Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
        paddingTop: statusBarHeight // 保持结构不变，但值改为0
      }
    ]}>
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? colors.primary : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {lastUpdateTime && (
        <View style={[styles.lastUpdateContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.lastUpdateText, { color: colors.textSecondary }]}>
            最后更新: {lastUpdateTime.toLocaleString('zh-CN', { hour12: false })}
          </Text>
        </View>
      )}
      <FlatList
        data={filteredMessages}
        renderItem={renderMessageItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.text}
          />
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lastUpdateContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lastUpdateText: {
    fontSize: 13,
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  messageItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.8,
  },
  messageContent: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 30,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
  },
});

export default MessageScreen;