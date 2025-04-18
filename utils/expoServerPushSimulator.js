/**
 * Expo服务器推送模拟器
 * 用于在开发环境中模拟服务器发送推送通知
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * 模拟服务器发送推送通知
 * @param {Object} options - 推送选项
 * @param {string} options.title - 通知标题
 * @param {string} options.body - 通知内容
 * @param {Object} options.data - 额外数据
 * @param {number} options.badge - 徽章数字
 * @param {boolean} options.sound - 是否播放声音
 * @returns {Promise<Object>} 结果
 */
export const simulateServerPush = async (options = {}) => {
  try {
    // 获取默认值
    const defaults = {
      title: '服务器推送模拟', 
      body: '这是一条模拟的服务器推送通知',
      data: { type: 'simulated_server' },
      badge: 1,
      sound: true
    };
    
    // 合并选项
    const config = { ...defaults, ...options };
    
    // 获取Expo Push Token
    const token = await AsyncStorage.getItem('expoPushToken');
    
    if (!token) {
      Alert.alert(
        "错误", 
        "未找到推送令牌，请先使用获取推送令牌功能",
        [{ text: "确定" }]
      );
      return { success: false, error: 'No token found' };
    }
    
    // 构建请求
    const pushMessage = {
      to: token,
      title: config.title,
      body: config.body,
      data: config.data,
      badge: config.badge,
      sound: config.sound ? 'default' : null,
      channelId: config.data.type || 'default',
    };
    
    // 在真实环境中，下面的代码应该在服务器端执行
    // 这里仅作为开发时的测试，实际项目中应该发送到服务器由服务器处理
    const response = await axios.post('https://exp.host/--/api/v2/push/send', 
      pushMessage,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.data && response.data.data.status === 'ok') {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: 'Push failed', data: response.data };
    }
  } catch (error) {
    console.error('模拟服务器推送失败:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
};

/**
 * 显示服务器推送模拟向导
 */
export const showServerPushSimulator = () => {
  Alert.alert(
    "服务器推送模拟器",
    "请选择要模拟的推送类型:",
    [
      {
        text: "基本推送",
        onPress: async () => {
          try {
            const result = await simulateServerPush({
              title: "基本服务器推送",
              body: "这是一条模拟的基本服务器推送通知"
            });
            
            if (result.success) {
              Alert.alert("成功", "模拟的服务器推送请求已发送");
            } else {
              Alert.alert("失败", `模拟服务器推送失败: ${result.error}`);
            }
          } catch (e) {
            Alert.alert("错误", `发送请求时出错: ${e.message}`);
          }
        }
      },
      {
        text: "高级推送",
        onPress: async () => {
          try {
            const result = await simulateServerPush({
              title: "高级服务器推送",
              body: "这是一条包含丰富数据的服务器推送",
              data: {
                type: "advanced_server",
                screen: "站点详情",
                params: { id: "demo-site-123" },
                importance: "high"
              }
            });
            
            if (result.success) {
              Alert.alert("成功", "高级模拟服务器推送请求已发送");
            } else {
              Alert.alert("失败", `高级模拟服务器推送失败: ${result.error}`);
            }
          } catch (e) {
            Alert.alert("错误", `发送请求时出错: ${e.message}`);
          }
        }
      },
      {
        text: "紧急警报",
        onPress: async () => {
          try {
            const result = await simulateServerPush({
              title: "⚠️ 紧急警报",
              body: "检测到系统异常，请立即查看！",
              data: {
                type: "urgent_alert",
                level: "critical",
                requireAction: true
              },
              badge: 5
            });
            
            if (result.success) {
              Alert.alert("成功", "紧急警报模拟推送请求已发送");
            } else {
              Alert.alert("失败", `紧急警报模拟推送失败: ${result.error}`);
            }
          } catch (e) {
            Alert.alert("错误", `发送请求时出错: ${e.message}`);
          }
        }
      },
      {
        text: "取消",
        style: "cancel"
      }
    ]
  );
}; 