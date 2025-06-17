/**
 * OAuth2配置文件
 * 根据若依框架SSO示例配置
 */

const OAuth2Config = {
  // 若依后端服务地址
  baseUrl: 'https://office.jzz77.cn:9003',
  
  // OAuth2客户端配置（需要在若依后端配置对应的客户端）
  client: {
    // 客户端ID - 需要在若依后端 system_oauth2_client 表中配置
    id: 'yudao-sso-demo-by-password',
    // 客户端密钥
    secret: 'test',
    // 权限范围
    scope: 'user.read user.write'
  },
  
  // 租户配置（若依多租户支持）
  tenant: {
    name: '正泽物联', // 默认租户名称
    id: '1', // 默认租户标识
    // 是否启用租户选择功能
    enableTenantSelection: true,
    // 预定义租户列表（可选）
    predefinedTenants: [
      { name: '正泽物联', id: '1', description: '默认租户' },
      { name: '测试租户', id: '2', description: '测试环境租户' },
      { name: '开发租户', id: '3', description: '开发环境租户' }
    ]
  },
  
  // API端点配置
  endpoints: {
    // OAuth2令牌端点
    token: '/admin-api/system/oauth2/token',
    // 令牌校验端点
    checkToken: '/admin-api/system/oauth2/check-token',
    // 令牌撤销端点
    revokeToken: '/admin-api/system/oauth2/token',
    // 用户信息端点
    userInfo: '/admin-api/system/user/profile/get',
    // 用户更新端点
    userUpdate: '/admin-api/system/oauth2/user/update'
  },
  
  // 请求配置
  request: {
    timeout: 10000, // 请求超时时间（毫秒）
    retryCount: 3,  // 重试次数
    retryDelay: 1000 // 重试延迟（毫秒）
  },
  
  // 令牌配置
  token: {
    // 令牌刷新提前时间（秒）- 在令牌过期前多少秒开始刷新
    refreshBeforeExpiry: 300,
    // 自动刷新间隔（毫秒）
    autoRefreshInterval: 60000
  },
  
  // 开发环境配置
  development: {
    // 是否启用调试日志
    enableDebugLog: true,
    // 是否跳过HTTPS证书验证（仅开发环境）
    skipCertVerification: false
  }
};

// 根据环境变量或配置覆盖默认配置
if (__DEV__) {
  // 开发环境特定配置
  OAuth2Config.development.enableDebugLog = true;
}

export default OAuth2Config;

/**
 * 配置说明：
 * 
 * 1. baseUrl: 若依后端服务地址，需要根据实际部署环境修改
 * 2. client.id: OAuth2客户端ID，需要在若依后端管理界面配置
 * 3. client.secret: OAuth2客户端密钥，与后端配置保持一致
 * 4. tenant.id: 租户ID，若依支持多租户，默认为1
 * 
 * 若依后端OAuth2客户端配置示例：
 * - 客户端ID: yudao-sso-demo-by-password
 * - 客户端密钥: test
 * - 授权类型: password,refresh_token
 * - 权限范围: user.read,user.write
 * - 访问令牌有效期: 7200秒（2小时）
 * - 刷新令牌有效期: 2592000秒（30天）
 */