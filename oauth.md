Builder

## App端如何使用OAuth2.0功能
基于前面了解的OAuth2.0客户端管理功能，App端可以通过以下方式使用OAuth2.0进行身份认证和授权：

### 1. 前期准备 在管理后台创建OAuth2客户端
1. 登录管理后台
2. 进入 系统管理 > OAuth2.0 > 应用管理
3. 点击"新增"创建App专用的OAuth2客户端：
   ```
   {
     "clientId": "my-mobile-app",
     "secret": "your-app-secret",
     "name": "我的移动应用",
     "authorizedGrantTypes": ["password", "refresh_token"],
     "scopes": ["user.read", "user.write"],
     "accessTokenValiditySeconds": 7200,
     "refreshTokenValiditySeconds": 2592000
   }
   ```
### 2. App端集成方案 推荐的授权模式
对于移动App，推荐使用以下授权模式：

密码模式 (Resource Owner Password Credentials)

- 适用于自家App
- 用户直接在App中输入用户名密码
- 安全性较高，用户体验好 核心API接口
App需要调用以下OAuth2.0 API：

1. 获取访问令牌

```
POST /system/oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {Base64(clientId:secret)}

grant_type=password&username={用户名}&password={密码}&
scope=user.read user.write
```
2. 刷新访问令牌

```
POST /system/oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {Base64(clientId:secret)}

grant_type=refresh_token&refresh_token={刷新令牌}
```
3. 校验访问令牌

```
POST /system/oauth2/check-token
Content-Type: application/x-www-form-urlencoded

token={访问令牌}
```
### 3. App端实现示例 React Native / Flutter 示例
```
class OAuth2Service {
  constructor(baseUrl, clientId, clientSecret) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.credentials = btoa(`${clientId}:${clientSecret}`);
  }

  // 密码模式登录
  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/system/
    oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: username,
        password: password,
        scope: 'user.read user.write'
      })
    });
    
    const data = await response.json();
    if (data.access_token) {
      // 保存令牌到本地存储
      await this.saveTokens(data);
      return data;
    }
    throw new Error('登录失败');
  }

  // 刷新令牌
  async refreshToken() {
    const refreshToken = await this.getRefreshToken();
    const response = await fetch(`${this.baseUrl}/system/
    oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    
    const data = await response.json();
    if (data.access_token) {
      await this.saveTokens(data);
      return data;
    }
    throw new Error('刷新令牌失败');
  }

  // 保存令牌
  async saveTokens(tokenData) {
    await AsyncStorage.setItem('access_token', tokenData.
    access_token);
    await AsyncStorage.setItem('refresh_token', tokenData.
    refresh_token);
    await AsyncStorage.setItem('token_expires_at', 
      String(Date.now() + tokenData.expires_in * 1000));
  }

  // 获取访问令牌
  async getAccessToken() {
    const token = await AsyncStorage.getItem
    ('access_token');
    const expiresAt = await AsyncStorage.getItem
    ('token_expires_at');
    
    if (token && Date.now() < parseInt(expiresAt)) {
      return token;
    }
    
    // 令牌过期，尝试刷新
    try {
      const newTokenData = await this.refreshToken();
      return newTokenData.access_token;
    } catch (error) {
      // 刷新失败，需要重新登录
      await this.clearTokens();
      throw new Error('需要重新登录');
    }
  }

  // 调用受保护的API
  async apiCall(url, options = {}) {
    const token = await this.getAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // 登出
  async logout() {
    await this.clearTokens();
  }

  async clearTokens() {
    await AsyncStorage.multiRemove(['access_token', 
    'refresh_token', 'token_expires_at']);
  }
}
``` 使用示例
```
// 初始化OAuth2服务
const oauth2 = new OAuth2Service(
  'http://your-server.com',
  'my-mobile-app',
  'your-app-secret'
);

// 登录
try {
  const tokenData = await oauth2.login('admin', 'admin123');
  console.log('登录成功', tokenData);
} catch (error) {
  console.error('登录失败', error);
}

// 调用API
try {
  const response = await oauth2.apiCall('/system/user/
  profile');
  const userProfile = await response.json();
  console.log('用户信息', userProfile);
} catch (error) {
  console.error('API调用失败', error);
}
```
### 4. 安全建议 客户端密钥保护
- 不要在App代码中硬编码客户端密钥
- 考虑使用服务端代理或动态获取
- 对于公开App，可以考虑使用PKCE扩展 令牌存储
- 使用安全的本地存储（如Keychain/Keystore）
- 访问令牌有效期不宜过长
- 实现自动刷新机制 网络安全
- 强制使用HTTPS
- 实现证书锁定
- 添加请求签名验证
### 5. 错误处理
```
// HTTP拦截器示例
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // 令牌无效，尝试刷新
      try {
        await oauth2.refreshToken();
        // 重试原请求
        return axios.request(error.config);
      } catch (refreshError) {
        // 刷新失败，跳转到登录页
        await oauth2.logout();
        // 导航到登录页面
        navigation.navigate('Login');
      }
    }
    return Promise.reject(error);
  }
);
```
### 6. 测试验证
在集成完成后，可以通过以下方式验证：

1. 登录流程测试 ：验证用户名密码登录
2. 令牌刷新测试 ：验证自动刷新机制
3. API调用测试 ：验证受保护资源访问
4. 登出测试 ：验证令牌清理
5. 异常处理测试 ：验证网络异常和令牌过期处理
通过以上方案，您的App就可以完整地使用OAuth2.0进行身份认证和授权了