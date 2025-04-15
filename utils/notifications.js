import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import pushConfig from '../config/pushConfig';

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 注册设备获取推送令牌
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('未获得推送通知权限!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: pushConfig.expo.projectId,
    })).data;
    
    // 保存令牌到本地存储
    await AsyncStorage.setItem('pushToken', token);
    
    // 发送令牌到服务器
    await sendTokenToServer(token);
  } else {
    console.log('必须使用真机才能获取推送令牌');
  }

  return token;
}

// 将令牌发送到Node-RED服务器
async function sendTokenToServer(token) {
  try {
    const userId = await AsyncStorage.getItem('userId'); // 从存储中获取用户ID
    
    await axios.post(pushConfig.api.registerEndpoint, {
      token,
      userId,
      platform: Platform.OS,
      pushService: 'expo',
      deviceInfo: {
        brand: Device.brand,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
      }
    });
    
    console.log('推送令牌已发送到服务器');
  } catch (error) {
    console.error('发送令牌到服务器失败:', error);
  }
}

// 发送本地测试通知
export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // 立即显示
  });
}
