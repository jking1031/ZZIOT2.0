/**
 * Expo推送测试工具
 * 专门用于Expo开发环境下测试推送通知功能
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import pushConfig from '../config/pushConfig';

/**
 * 获取Expo推送令牌并显示
 */
export const getAndShowExpoPushToken = async () => {
  try {
    // 检查权限
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          "权限缺失", 
          "无法获取推送权限。请前往设置授予通知权限。",
          [{ text: "OK" }]
        );
        return null;
      }
    }
    
    // 获取令牌
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: pushConfig.expo.projectId
    });
    
    // 保存令牌
    await AsyncStorage.setItem('expoPushToken', token.data);
    
    // 显示令牌
    Alert.alert(
      "Expo Push Token",
      token.data,
      [
        { 
          text: "复制到剪贴板", 
          onPress: async () => {
            await Clipboard.setStringAsync(token.data);
            Alert.alert("已复制", "Token已复制到剪贴板");
          }
        },
        { text: "关闭" }
      ]
    );
    
    return token.data;
  } catch (error) {
    console.error('获取Expo推送令牌失败:', error);
    Alert.alert("错误", `获取推送令牌失败: ${error.message}`);
    return null;
  }
};

/**
 * 使用Expo发送本地推送通知
 */
export const sendExpoLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
      },
      trigger: null, // 立即显示
    });
    
    return true;
  } catch (error) {
    console.error('发送Expo本地通知失败:', error);
    Alert.alert("错误", `发送本地通知失败: ${error.message}`);
    return false;
  }
};

/**
 * 测试发送带有声音和徽章的本地通知
 */
export const sendExpoAdvancedNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "高级本地通知测试",
        body: "这是一条带有声音和徽章的测试通知",
        data: { type: "advanced_test" },
        sound: true,
        badge: 1,
        color: "#FF6700",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // 立即显示
    });
    
    return true;
  } catch (error) {
    console.error('发送高级本地通知失败:', error);
    Alert.alert("错误", `发送高级本地通知失败: ${error.message}`);
    return false;
  }
};

/**
 * 发送延迟通知（指定秒数后显示）
 */
export const sendExpoDelayedNotification = async (seconds = 5) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "延迟通知测试",
        body: `这条通知在触发后延迟${seconds}秒显示`,
        data: { type: "delayed_test" },
      },
      trigger: {
        seconds,
      },
    });
    
    Alert.alert("已安排", `通知将在${seconds}秒后显示`);
    return true;
  } catch (error) {
    console.error('发送延迟通知失败:', error);
    Alert.alert("错误", `发送延迟通知失败: ${error.message}`);
    return false;
  }
};

/**
 * 使用Expo Push API发送服务器推送
 * 注意：这需要从服务器调用，这里只是演示
 */
export const sendExpoPushViaAPI = async () => {
  try {
    const token = await AsyncStorage.getItem('expoPushToken');
    
    if (!token) {
      Alert.alert("错误", "未找到推送令牌，请先获取推送令牌");
      return false;
    }
    
    // 实际应用中，应该从服务器端调用此API
    // 这里仅用于测试目的
    const message = {
      to: token,
      sound: 'default',
      title: 'Expo服务器推送测试',
      body: '这是一条通过Expo Push API发送的服务器推送',
      data: { type: 'server_test' },
      badge: 1,
    };
    
    // 注意：在客户端直接调用可能会失败
    // 这里只是示例代码
    Alert.alert(
      "服务器推送说明", 
      "实际开发中，应该从后端服务器调用Expo Push API。\n\n以下是您可以使用的推送数据:\n\n" + 
      JSON.stringify(message, null, 2),
      [{ text: "了解" }]
    );
    
    return true;
  } catch (error) {
    console.error('准备服务器推送数据失败:', error);
    Alert.alert("错误", `准备服务器推送数据失败: ${error.message}`);
    return false;
  }
};

/**
 * 检查和显示通知设置状态
 */
export const checkNotificationSettings = async () => {
  try {
    const settings = await Notifications.getPermissionsAsync();
    
    let statusText = "未知";
    switch (settings.status) {
      case "granted":
        statusText = "已授权";
        break;
      case "denied":
        statusText = "已拒绝";
        break;
      case "undetermined":
        statusText = "未确定";
        break;
    }
    
    Alert.alert(
      "通知权限状态",
      `当前通知权限: ${statusText}\n\n` +
      `可以使用通知提醒: ${settings.granted ? "是" : "否"}\n` +
      `可以使用通知声音: ${settings.ios?.allowsSound ? "是" : "否"}\n` +
      `可以使用应用角标: ${settings.ios?.allowsBadge ? "是" : "否"}`,
      [{ text: "确定" }]
    );
    
    return settings;
  } catch (error) {
    console.error('检查通知设置失败:', error);
    Alert.alert("错误", `检查通知设置失败: ${error.message}`);
    return null;
  }
}; 