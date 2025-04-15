/**
 * 推送服务配置文件
 * 包含各推送平台的配置信息
 */

export default {
  // 极光推送配置
  jpush: {
    appKey: '47d2b236e7f7169296e9e1a9', // 应用AppKey
    masterSecret: 'cd8ffb11145ed05d1554b876', // Master Secret，仅在服务端使用
    channel: 'production', // 推送渠道
    production: true, // 是否生产环境
  },
  
  // Expo推送配置
  expo: {
    projectId: 'a96d138c-2d47-49b1-845e-fd69f0d70c2a',
  },
  
  // 推送相关API配置
  api: {
    registerEndpoint: 'https://nodered.jzz77.cn:9003/api/register-device',
    sendEndpoint: 'https://nodered.jzz77.cn:9003/api/send-notification',
  }
}; 