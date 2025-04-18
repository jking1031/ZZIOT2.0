/**
 * 设备注册工具
 * 用于向Node-RED后端注册设备推送令牌
 */
import axios from 'axios';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import pushConfig from '../config/pushConfig';

/**
 * 生成唯一设备ID
 */
const generateDeviceId = async () => {
  try {
    // 先尝试从存储获取
    let deviceId = await AsyncStorage.getItem('uniqueDeviceId');
    
    // 如果没有，生成一个新的
    if (!deviceId) {
      const baseInfo = `${Device.brand || ''}-${Device.modelName || ''}-${Platform.OS}-`;
      const randomPart = Math.random().toString(36).substring(2, 10);
      deviceId = baseInfo + randomPart;
      
      // 保存生成的ID
      await AsyncStorage.setItem('uniqueDeviceId', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('生成设备ID失败:', error);
    // 失败时返回随机ID
    return `unknown-${Math.random().toString(36).substring(2, 10)}`;
  }
};

/**
 * 测试设备注册功能
 * 向Node-RED注册当前设备的推送令牌
 */
export const testDeviceRegistration = async () => {
  try {
    // 获取设备信息
    const deviceInfo = {
      brand: Device.brand || 'unknown',
      modelName: Device.modelName || 'unknown',
      osVersion: Platform.Version.toString(),
      osName: Platform.OS,
      deviceId: await generateDeviceId()
    };
    
    // 获取推送令牌
    let token = null;
    let service = '';
    
    // 首先尝试获取Expo推送令牌
    token = await AsyncStorage.getItem('expoPushToken');
    if (token) {
      service = 'expo';
    } else {
      // 如果没有Expo令牌，尝试获取极光推送令牌
      token = await AsyncStorage.getItem('jpushRegistrationId');
      if (token) {
        service = 'jpush';
      } else {
        // 如果两种令牌都没有，显示错误
        Alert.alert(
          "错误", 
          "未找到任何推送令牌，请先获取推送令牌",
          [{ text: "确定" }]
        );
        return { success: false, error: 'No token found' };
      }
    }
    
    // 获取用户ID
    const userId = await AsyncStorage.getItem('userId');
    
    // 构建注册数据
    const registrationData = {
      token,
      userId: userId || deviceInfo.deviceId, // 如果没有用户ID，使用设备ID
      platform: Platform.OS,
      pushService: service,
      deviceInfo
    };
    
    // 显示注册进度
    Alert.alert("正在注册", "正在向Node-RED注册设备...");
    
    // 发送注册请求
    console.log('正在注册设备，数据:', registrationData);
    const response = await axios.post(
      pushConfig.api.registerEndpoint,
      registrationData
    );
    
    console.log('注册响应:', response.data);
    
    // 处理响应
    if (response.data && response.data.success) {
      // 保存注册状态
      await AsyncStorage.setItem('deviceRegistered', 'true');
      await AsyncStorage.setItem('deviceRegistrationTime', new Date().toISOString());
      
      // 显示成功消息
      Alert.alert(
        "注册成功", 
        `设备已成功注册到Node-RED服务器\n\n` +
        `服务类型: ${service}\n` +
        `设备ID: ${deviceInfo.deviceId}\n` +
        `令牌前缀: ${token.substring(0, 15)}...`,
        [{ text: "确定" }]
      );
      
      return { 
        success: true, 
        data: response.data,
        deviceInfo,
        token 
      };
    } else {
      // 显示失败消息
      Alert.alert(
        "注册失败", 
        `设备注册失败:\n${JSON.stringify(response.data || {}, null, 2)}`,
        [{ text: "确定" }]
      );
      
      return { 
        success: false, 
        error: 'Registration failed', 
        details: response.data 
      };
    }
  } catch (error) {
    console.error('设备注册错误:', error);
    
    // 显示错误消息
    Alert.alert(
      "注册错误", 
      `设备注册过程中出错:\n${error.message}\n\n` +
      (error.response ? `服务器响应: ${JSON.stringify(error.response.data, null, 2)}` : ''),
      [{ text: "确定" }]
    );
    
    return { 
      success: false, 
      error: error.message, 
      details: error.response ? error.response.data : null 
    };
  }
};

/**
 * 查看当前设备注册状态
 */
export const checkDeviceRegistrationStatus = async () => {
  try {
    // 获取注册状态
    const isRegistered = await AsyncStorage.getItem('deviceRegistered');
    const registrationTime = await AsyncStorage.getItem('deviceRegistrationTime');
    const expoPushToken = await AsyncStorage.getItem('expoPushToken');
    const jpushToken = await AsyncStorage.getItem('jpushRegistrationId');
    const deviceId = await generateDeviceId();
    
    // 显示状态
    Alert.alert(
      "设备注册状态",
      `注册状态: ${isRegistered === 'true' ? '已注册' : '未注册'}\n` +
      `注册时间: ${registrationTime || '未知'}\n\n` +
      `设备ID: ${deviceId || '未知'}\n` +
      `Expo令牌: ${expoPushToken ? '已获取' : '未获取'}\n` +
      `极光令牌: ${jpushToken ? '已获取' : '未获取'}\n`,
      [{ text: "确定" }]
    );
    
    return isRegistered === 'true';
  } catch (error) {
    console.error('检查注册状态失败:', error);
    Alert.alert("错误", `检查注册状态失败: ${error.message}`);
    return false;
  }
};