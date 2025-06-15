# OAuth2.0 集成指南

本文档详细说明了如何在 ZZIOT 移动应用中配置和使用 OAuth2.0 认证系统，以便与 Ruoyi 项目进行集成。

## 目录

1. [概述](#概述)
2. [前期准备](#前期准备)
3. [配置步骤](#配置步骤)
4. [使用方法](#使用方法)
5. [API 接口](#api-接口)
6. [故障排除](#故障排除)
7. [开发者指南](#开发者指南)

## 概述

OAuth2.0 是一个开放标准的授权协议，允许第三方应用在不获取用户密码的情况下访问用户资源。本集成支持以下特性：

- **密码模式认证**：使用用户名和密码获取访问令牌
- **令牌自动刷新**：在令牌过期前自动刷新
- **多后端支持**：可配置不同的 OAuth2 服务器
- **安全存储**：令牌安全存储在设备本地
- **错误处理**：完善的错误处理和重试机制

## 前期准备

### 1. Ruoyi 后端配置

在 Ruoyi 管理后台完成以下配置：

#### 1.1 创建 OAuth2 客户端

```sql
-- 在数据库中插入客户端配置
INSERT INTO sys_oauth2_client (
    client_id,
    client_secret,
    authorized_grant_types,
    scope,
    access_token_validity,
    refresh_token_validity,
    additional_information
) VALUES (
    'zziot-mobile-app',
    'your-client-secret-here',
    'password,refresh_token',
    'user.read,user.write',
    3600,
    7200,
    '{}'
);
```

#### 1.2 配置权限范围

- `user.read`：读取用户信息
- `user.write`：修改用户信息
- `admin.read`：管理员读取权限
- `admin.write`：管理员写入权限

### 2. 网络配置

确保移动设备可以访问 Ruoyi 服务器的以下端点：

- `POST /system/oauth2/token` - 获取访问令牌
- `POST /system/oauth2/check-token` - 验证令牌
- `POST /system/oauth2/revoke` - 撤销令牌

## 配置步骤

### 1. 启用 OAuth2 认证

1. 打开应用，使用管理员账户登录
2. 进入「首页」→「管理员功能」→「OAuth2配置」
3. 开启「启用OAuth2认证」开关

### 2. 配置服务器信息

填写以下必要信息：

- **服务器地址**：Ruoyi 服务器的基础 URL
  ```
  示例：http://192.168.1.100:8080
  ```

- **客户端ID**：在 Ruoyi 后台创建的客户端标识
  ```
  示例：zziot-mobile-app
  ```

- **客户端密钥**：对应的客户端密钥
  ```
  示例：your-client-secret-here
  ```

- **权限范围**：请求的权限范围（可选）
  ```
  示例：user.read user.write
  ```

### 3. 测试连接

1. 点击「测试连接」按钮
2. 确认连接状态显示为「OAuth2服务器连接正常」
3. 点击「保存配置」保存设置

## 使用方法

### 1. 用户登录

启用 OAuth2 后，用户登录流程将自动使用 OAuth2 认证：

1. 用户输入用户名和密码
2. 应用向 OAuth2 服务器发送认证请求
3. 服务器返回访问令牌和刷新令牌
4. 应用保存令牌并完成登录

### 2. API 调用

所有 API 请求将自动携带 OAuth2 访问令牌：

```javascript
// 自动添加 Authorization 头
Authorization: Bearer <access_token>
```

### 3. 令牌刷新

当访问令牌即将过期时，应用会自动使用刷新令牌获取新的访问令牌，用户无需重新登录。

### 4. 用户登出

用户登出时，应用会：

1. 向服务器发送令牌撤销请求
2. 清除本地存储的所有令牌
3. 重置用户状态

## API 接口

### 1. 获取访问令牌

```http
POST /system/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=<username>&password=<password>&client_id=<client_id>&client_secret=<client_secret>&scope=<scope>
```

**响应示例：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "scope": "user.read user.write"
}
```

### 2. 刷新访问令牌

```http
POST /system/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<refresh_token>&client_id=<client_id>&client_secret=<client_secret>
```

### 3. 验证令牌

```http
POST /system/oauth2/check-token
Content-Type: application/x-www-form-urlencoded

token=<access_token>
```

### 4. 撤销令牌

```http
POST /system/oauth2/revoke
Content-Type: application/x-www-form-urlencoded

token=<access_token>&client_id=<client_id>&client_secret=<client_secret>
```

## 故障排除

### 常见问题

#### 1. 连接测试失败

**问题**：点击「测试连接」显示连接失败

**解决方案**：
- 检查服务器地址是否正确
- 确认网络连接正常
- 验证防火墙设置
- 检查服务器是否启动

#### 2. 登录失败

**问题**：启用 OAuth2 后无法登录

**解决方案**：
- 验证客户端ID和密钥是否正确
- 检查用户名和密码是否有效
- 确认权限范围配置正确
- 查看服务器日志获取详细错误信息

#### 3. 令牌刷新失败

**问题**：访问令牌过期后无法自动刷新

**解决方案**：
- 检查刷新令牌是否有效
- 验证客户端配置是否支持 refresh_token 授权类型
- 确认刷新令牌未过期

#### 4. API 调用被拒绝

**问题**：API 请求返回 401 未授权错误

**解决方案**：
- 检查访问令牌是否有效
- 验证权限范围是否足够
- 确认令牌格式正确

### 调试模式

在开发环境中，可以启用详细日志来调试 OAuth2 相关问题：

```javascript
// 在 oauth2Service.js 中启用调试日志
const DEBUG_MODE = __DEV__;

if (DEBUG_MODE) {
  console.log('[OAuth2Debug]', '详细信息...');
}
```

### 日志分析

查看应用日志中的 OAuth2 相关信息：

```
[OAuth2] 开始密码模式登录...
[OAuth2] 令牌获取成功
[OAuth2] 令牌即将过期，开始刷新...
[OAuth2] 令牌刷新成功
```

## 开发者指南

### 1. 代码结构

```
api/
├── oauth2Service.js          # OAuth2 服务核心实现
├── apiService.js            # API 服务（集成 OAuth2）
└── config.js               # API 配置

context/
└── AuthContext.js          # 认证上下文（集成 OAuth2）

screens/
└── OAuth2ConfigScreen.js   # OAuth2 配置界面

tests/
└── oauth2Test.js          # OAuth2 功能测试
```

### 2. 核心类和方法

#### OAuth2Service 类

```javascript
class OAuth2Service {
  // 密码模式登录
  async login(username, password)
  
  // 刷新访问令牌
  async refreshToken()
  
  // 验证令牌
  async validateToken(token)
  
  // 撤销令牌
  async revokeToken(token)
  
  // 获取令牌信息
  async getTokenInfo()
  
  // 清除所有令牌
  async clearTokens()
}
```

#### AuthContext 集成方法

```javascript
// 启用 OAuth2
const enableOAuth2 = async (config) => { ... }

// 禁用 OAuth2
const disableOAuth2 = async () => { ... }

// 获取 OAuth2 配置
const getOAuth2Config = async () => { ... }

// 更新 OAuth2 配置
const updateOAuth2Config = async (config) => { ... }

// 获取令牌信息
const getOAuth2TokenInfo = async () => { ... }
```

### 3. 自定义配置

可以通过修改 `DEFAULT_OAUTH2_CONFIG` 来自定义默认配置：

```javascript
export const DEFAULT_OAUTH2_CONFIG = {
  baseUrl: 'http://localhost:8080',
  clientId: 'zziot-mobile-app',
  clientSecret: 'your-client-secret',
  scope: 'user.read user.write',
  tokenEndpoint: '/system/oauth2/token',
  validateEndpoint: '/system/oauth2/check-token',
  revokeEndpoint: '/system/oauth2/revoke'
};
```

### 4. 扩展功能

#### 添加新的授权类型

```javascript
// 在 OAuth2Service 中添加新方法
async authorizationCodeLogin(code, redirectUri) {
  // 实现授权码模式登录
}
```

#### 自定义令牌存储

```javascript
// 实现自定义存储策略
class CustomTokenStorage {
  async saveToken(key, value) { ... }
  async getToken(key) { ... }
  async removeToken(key) { ... }
}
```

### 5. 测试

运行 OAuth2 功能测试：

```javascript
import { runOAuth2Tests } from './tests/oauth2Test';

// 在开发环境中运行测试
if (__DEV__) {
  runOAuth2Tests().then(results => {
    console.log('OAuth2测试完成', results);
  });
}
```

### 6. 性能优化

- **令牌缓存**：避免频繁的令牌验证请求
- **批量刷新**：合并多个同时发生的刷新请求
- **预刷新**：在令牌过期前提前刷新

### 7. 安全考虑

- **密钥保护**：客户端密钥应妥善保管
- **令牌存储**：使用安全的本地存储
- **网络传输**：确保使用 HTTPS
- **令牌生命周期**：合理设置令牌过期时间

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 支持密码模式认证
- 实现令牌自动刷新
- 添加配置管理界面
- 完成与 Ruoyi 项目集成

## 支持

如果在使用过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查应用日志获取详细错误信息
3. 联系开发团队获取技术支持

---

**注意**：本文档会随着功能更新而持续维护，请定期查看最新版本。