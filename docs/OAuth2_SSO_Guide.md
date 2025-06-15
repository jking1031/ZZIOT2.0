# OAuth2 单点登录集成指南

本指南介绍如何在React Native应用中集成基于若依框架的OAuth2单点登录功能。

## 概述

本应用已集成OAuth2密码模式单点登录，支持与若依框架后端进行认证和用户管理。主要特性包括：

- 🔐 OAuth2密码模式认证
- 🔄 自动令牌刷新
- 👤 用户信息获取
- 🏢 多租户支持
- 📱 安全令牌存储
- 🛡️ 请求拦截和错误处理

## 架构说明

### 核心组件

1. **OAuth2Service** (`api/oauth2Service.js`)
   - OAuth2认证服务核心类
   - 处理令牌获取、刷新、存储
   - 提供API调用认证

2. **OAuth2Config** (`config/oauth2Config.js`)
   - 集中配置管理
   - 环境相关设置
   - 端点和参数配置

3. **AuthContext** (`context/AuthContext.js`)
   - 全局认证状态管理
   - OAuth2服务初始化
   - 登录状态维护

## 配置说明

### 1. OAuth2配置 (`config/oauth2Config.js`)

```javascript
const OAuth2Config = {
  // 若依后端服务地址
  baseUrl: 'http://localhost:48080',
  
  // OAuth2客户端配置
  client: {
    id: 'yudao-sso-demo-by-password',
    secret: 'test',
    scope: 'user.read user.write'
  },
  
  // 租户配置
  tenant: {
    id: '1'
  }
};
```

### 2. 若依后端配置

在若依后端管理界面配置OAuth2客户端：

- **客户端ID**: `yudao-sso-demo-by-password`
- **客户端密钥**: `test`
- **授权类型**: `password,refresh_token`
- **权限范围**: `user.read,user.write`
- **访问令牌有效期**: 7200秒（2小时）
- **刷新令牌有效期**: 2592000秒（30天）

## 使用方法

### 1. 密码模式登录

```javascript
import { oauth2Service } from '../api/oauth2Service';

// 登录
const loginResult = await oauth2Service.passwordLogin(
  'username',
  'password'
);

if (loginResult.success) {
  console.log('登录成功:', loginResult.data);
} else {
  console.error('登录失败:', loginResult.error);
}
```

### 2. 获取用户信息

```javascript
// 获取当前用户信息
const userInfoResult = await oauth2Service.getUserInfo();

if (userInfoResult.success) {
  console.log('用户信息:', userInfoResult.data);
}
```

### 3. 令牌管理

```javascript
// 检查登录状态
const isLoggedIn = await oauth2Service.isLoggedIn();

// 获取访问令牌
const accessToken = await oauth2Service.getAccessToken();

// 刷新令牌
const refreshResult = await oauth2Service.refreshToken();

// 退出登录
await oauth2Service.logout();
```

### 4. API调用

```javascript
// 自动添加认证头的API调用
const response = await oauth2Service.apiCall('/api/user/profile');
```

## 安全特性

### 1. 令牌安全存储
- 使用AsyncStorage安全存储令牌
- 支持令牌过期检查
- 自动清理过期令牌

### 2. 自动令牌刷新
- 请求拦截器自动检测401错误
- 使用刷新令牌获取新的访问令牌
- 刷新失败时自动清理令牌

### 3. 请求安全
- 客户端凭证Base64编码
- 多租户头部支持
- 请求超时和重试机制

## 错误处理

### 常见错误码

- **401 Unauthorized**: 令牌无效或过期
- **400 Bad Request**: 请求参数错误
- **403 Forbidden**: 权限不足
- **500 Internal Server Error**: 服务器内部错误

### 错误处理示例

```javascript
try {
  const result = await oauth2Service.passwordLogin(username, password);
  
  if (!result.success) {
    switch (result.error) {
      case '用户名或密码错误':
        Alert.alert('登录失败', '请检查用户名和密码');
        break;
      case '账号已被禁用':
        Alert.alert('登录失败', '账号已被禁用，请联系管理员');
        break;
      default:
        Alert.alert('登录失败', result.error);
    }
  }
} catch (error) {
  Alert.alert('网络错误', '请检查网络连接');
}
```

## 开发调试

### 1. 启用调试日志

在 `config/oauth2Config.js` 中设置：

```javascript
development: {
  enableDebugLog: true
}
```

### 2. 查看令牌信息

```javascript
const tokenInfo = await oauth2Service.getTokenInfo();
console.log('令牌信息:', tokenInfo);
```

### 3. 网络请求调试

使用React Native Debugger或Flipper查看网络请求详情。

## 部署配置

### 1. 生产环境配置

修改 `config/oauth2Config.js` 中的baseUrl：

```javascript
baseUrl: 'https://your-production-server.com'
```

### 2. 客户端配置

确保若依后端已配置对应的OAuth2客户端，并更新配置文件中的客户端ID和密钥。

### 3. 网络安全

- 生产环境使用HTTPS
- 配置适当的CORS策略
- 使用安全的客户端密钥

## 故障排除

### 1. 登录失败

- 检查若依后端服务是否正常运行
- 验证OAuth2客户端配置
- 确认用户名和密码正确
- 检查网络连接

### 2. 令牌刷新失败

- 检查刷新令牌是否过期
- 验证客户端配置
- 查看后端日志

### 3. API调用失败

- 检查访问令牌是否有效
- 验证API端点路径
- 确认权限范围配置

## 最佳实践

1. **安全存储**: 敏感信息使用加密存储
2. **错误处理**: 提供友好的错误提示
3. **用户体验**: 实现自动登录和记住密码功能
4. **性能优化**: 合理设置令牌有效期
5. **监控日志**: 记录关键操作和错误信息

## 相关文档

- [若依框架官方文档](http://doc.ruoyi.vip/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

如有问题，请查看控制台日志或联系开发团队。