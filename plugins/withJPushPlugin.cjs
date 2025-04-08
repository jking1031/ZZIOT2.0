const { withAppBuildGradle, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');
const { addPermission, getMainApplicationOrThrow } = AndroidConfig.Manifest;

const withJPush = (config, { appKey = '47d2b236e7f7169296e9e1a9', channel = 'developer-default' }) => {
  // 添加极光推送配置到build.gradle
  config = withAppBuildGradle(config, config => {
    if (!config.modResults.contents.includes('jpush')) {
      const buildGradle = config.modResults.contents;
      
      // 在defaultConfig中添加极光配置
      const defaultConfigPattern = /defaultConfig\s*\{[^\}]*\}/s;
      const defaultConfigBlock = buildGradle.match(defaultConfigPattern)[0];
      const updatedDefaultConfig = defaultConfigBlock.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {\n        manifestPlaceholders = [JPUSH_APPKEY: "${appKey}", JPUSH_CHANNEL: "${channel}"]`
      );
      
      config.modResults.contents = buildGradle.replace(defaultConfigPattern, updatedDefaultConfig);
    }
    return config;
  });
  
  // 添加极光推送所需权限到AndroidManifest
  config = withAndroidManifest(config, config => {
    const androidManifest = config.modResults;
    
    // 添加必要权限
    const permissions = [
      'android.permission.INTERNET',
      'android.permission.RECEIVE_USER_PRESENT',
      'android.permission.WAKE_LOCK',
      'android.permission.READ_PHONE_STATE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.VIBRATE',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.RECEIVE_BOOT_COMPLETED'
    ];
    
    for (const permission of permissions) {
      addPermission(androidManifest, permission);
    }
    
    // 确保有application标签
    const mainApplication = getMainApplicationOrThrow(androidManifest);
    
    return config;
  });
  
  return config;
};

module.exports = withJPush;
