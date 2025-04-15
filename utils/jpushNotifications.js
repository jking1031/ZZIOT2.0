import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import pushConfig from '../config/pushConfig';

// 动态导入极光推送SDK，仅在Android上使用
let JPush = null;
if (Platform.OS === 'android') {
  // 动态导入防止iOS构建出错
  JPush = require('jpush-react-native').default;
}

// 初始化JPush
export const initJPush = () => {
  if (!JPush) return false;
  
  try {
    // 使用配置文件中的设置
    JPush.init({
      appKey: pushConfig.jpush.appKey,
      channel: pushConfig.jpush.channel,
      production: pushConfig.jpush.production
    });
    
    // 连接状态回调
    JPush.addConnectEventListener((result) => {
      console.log("JPush连接状态:", result);
    });
    
    // 通知回调
    JPush.addNotificationListener((notification) => {
      console.log("收到推送:", notification);
      
      try {
        // 处理自定义消息数据
        const extras = notification.extras || {};
        
        if (extras.screen) {
          // 保存导航信息，等待导航容器就绪后进行导航
          AsyncStorage.setItem('pendingNavigation', JSON.stringify({
            screen: extras.screen,
            params: extras.params || {}
          }));
        }
      } catch (error) {
        console.error("处理通知数据出错:", error);
      }
    });
    
    // 本地通知回调
    JPush.addLocalNotificationListener((notification) => {
      console.log("收到本地通知:", notification);
    });
    
    console.log("JPush初始化完成");
    return true;
  } catch (error) {
    console.error("JPush初始化失败:", error);
    return false;
  }
};

// 注册极光推送设备
export const registerJPushDevice = async (userId) => {
  if (!JPush) return null;
  
  try {
    // 设置别名(使用用户ID)
    JPush.setAlias(userId, (result) => {
      console.log("设置别名结果:", result);
    });
    
    // 获取注册ID
    return new Promise((resolve) => {
      JPush.getRegistrationID(async (registrationId) => {
        console.log("获取到RegistrationID:", registrationId);
        
        if (registrationId) {
          // 将注册ID发送到服务器
          await sendTokenToServer(registrationId, userId);
        }
        
        resolve(registrationId);
      });
    });
  } catch (error) {
    console.error("注册极光推送设备失败:", error);
    return null;
  }
};

// 将注册ID发送到服务器
const sendTokenToServer = async (registrationId, userId) => {
  try {
    await axios.post(pushConfig.api.registerEndpoint, {
      token: registrationId,
      userId,
      platform: Platform.OS,
      pushService: 'jpush',
      deviceInfo: {
        model: Platform.constants?.Model || '',
        brand: Platform.constants?.Brand || '',
        systemVersion: Platform.Version
      }
    });
    
    console.log('极光推送令牌已发送到服务器');
    return true;
  } catch (error) {
    console.error('发送令牌到服务器失败:', error);
    return false;
  }
};

// 发送本地测试通知
export const sendLocalNotification = (title, content, extras = {}) => {
  if (!JPush) return false;
  
  try {
    JPush.sendLocalNotification({
      id: Math.floor(Math.random() * 1000000),
      title,
      content,
      extras
    });
    return true;
  } catch (error) {
    console.error("发送本地通知失败:", error);
    return false;
  }
};
