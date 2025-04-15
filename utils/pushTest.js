/**
 * 推送测试工具
 * 用于测试服务器端推送和本地推送功能
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import pushConfig from '../config/pushConfig';
import { sendLocalNotification } from './notifications';
import { sendLocalNotification as sendJPushNotification } from './jpushNotifications';

/**
 * 测试服务器推送
 * 向当前设备发送一条测试推送消息
 */
export const testServerPush = async () => {
  try {
    // 获取推送令牌
    let token = null;
    let service = '';
    
    if (Platform.OS === 'android') {
      // Android设备使用极光推送
      token = await AsyncStorage.getItem('jpushRegistrationId');
      service = 'jpush';
    } else {
      // iOS设备使用Expo推送
      token = await AsyncStorage.getItem('pushToken');
      service = 'expo';
    }
    
    if (!token) {
      console.error('未找到推送令牌，无法发送测试');
      return false;
    }
    
    // 从存储中获取用户ID
    const userId = await AsyncStorage.getItem('userId');
    
    // 发送请求到服务器，请求服务器推送一条测试消息
    const response = await axios.post(pushConfig.api.sendEndpoint, {
      token,
      userId,
      service,
      title: '服务器推送测试',
      body: '这是一条来自服务器的测试推送消息',
      data: {
        type: 'server_test',
        time: new Date().toISOString()
      }
    });
    
    return response.data.success;
  } catch (error) {
    console.error('测试服务器推送失败:', error);
    return false;
  }
};

/**
 * 测试本地推送
 */
export const testLocalPush = () => {
  try {
    if (Platform.OS === 'android') {
      // Android设备使用极光推送
      return sendJPushNotification(
        '本地测试通知', 
        '这是一条本地测试推送消息，收到请忽略',
        { type: 'local_test', time: new Date().toISOString() }
      );
    } else {
      // iOS设备使用Expo推送
      sendLocalNotification(
        '本地测试通知',
        '这是一条本地测试推送消息，收到请忽略',
        { type: 'local_test', time: new Date().toISOString() }
      );
      return true;
    }
  } catch (error) {
    console.error('测试本地推送失败:', error);
    return false;
  }
};

/**
 * 保存极光推送注册ID
 */
export const saveJPushRegistrationId = async (registrationId) => {
  if (registrationId) {
    await AsyncStorage.setItem('jpushRegistrationId', registrationId);
    return true;
  }
  return false;
}; 