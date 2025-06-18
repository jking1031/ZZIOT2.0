# App 用户注册功能集成文档

本文档详细说明如何在基于 Expo 开发的移动应用中集成用户注册功能。

## API 接口信息

### 注册接口
- **接口地址**: `POST /system/auth/register`
- **接口描述**: 用户注册
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 验证规则 |
|--------|------|------|------|----------|
| username | string | 是 | 用户名 | 4-30个字符，只能包含字母、数字、下划线 |
| nickname | string | 是 | 昵称 | 1-30个字符 |
| password | string | 是 | 密码 | 4-16个字符 |
| captchaVerification | string | 否 | 验证码验证 | 当验证码功能启用时必填 |

### 请求示例

```json
{
  "username": "testuser",
  "nickname": "测试用户",
  "password": "123456",
  "captchaVerification": "验证码内容（如果启用）"
}
```

### 响应数据

成功响应：
```json
{
  "code": 0,
  "data": {
    "accessToken": "访问令牌",
    "refreshToken": "刷新令牌",
    "userId": 123,
    "expiresTime": "2024-12-31T23:59:59"
  },
  "msg": "操作成功"
}
```

错误响应：
```json
{
  "code": 400,
  "data": null,
  "msg": "错误信息描述"
}
```

## Expo 应用集成步骤

### 1. 安装依赖

```bash
npm install axios
# 或
yarn add axios
```

### 2. 创建 API 服务

创建 `services/authService.js` 文件：

```javascript
import axios from 'axios';

// 配置基础 URL（根据实际部署环境调整）
const API_BASE_URL = 'http://your-server-domain.com/admin-api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 用户注册
export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post('/system/auth/register', userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器返回错误响应
      throw new Error(error.response.data.msg || '注册失败');
    } else if (error.request) {
      // 网络错误
      throw new Error('网络连接失败，请检查网络设置');
    } else {
      // 其他错误
      throw new Error('注册请求失败');
    }
  }
};
```

### 3. 创建注册表单组件

创建 `components/RegisterForm.js` 文件：

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { registerUser } from '../services/authService';

const RegisterForm = ({ onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    password: '',
    captchaVerification: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 表单验证
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 4 || formData.username.length > 30) {
      newErrors.username = '用户名必须为4-30个字符';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = '用户名只能包含字母、数字、下划线';
    }
    if (!formData.nickname || formData.nickname.length > 30) {
      newErrors.nickname = '昵称不能为空且不超过30个字符';
    }
    if (!formData.password || formData.password.length < 4 || formData.password.length > 16) {
      newErrors.password = '密码必须为4-16个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理注册
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await registerUser(formData);
      
      if (response.code === 0) {
        Alert.alert('注册成功', '欢迎加入！', [
          {
            text: '确定',
            onPress: () => onRegisterSuccess && onRegisterSuccess(response.data),
          },
        ]);
      } else {
        Alert.alert('注册失败', response.msg || '未知错误');
      }
    } catch (error) {
      Alert.alert('注册失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>用户注册</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.username && styles.inputError]}
          placeholder="用户名（4-30个字符）"
          value={formData.username}
          onChangeText={(text) => setFormData({ ...formData, username: text })}
          autoCapitalize="none"
        />
        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.nickname && styles.inputError]}
          placeholder="昵称"
          value={formData.nickname}
          onChangeText={(text) => setFormData({ ...formData, nickname: text })}
        />
        {errors.nickname && <Text style={styles.errorText}>{errors.nickname}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="密码（4-16个字符）"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      {/* 如果启用了验证码功能，显示验证码输入框 */}
      {/* 
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="验证码"
          value={formData.captchaVerification}
          onChangeText={(text) => setFormData({ ...formData, captchaVerification: text })}
        />
      </View>
      */}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>注册</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterForm;
```

### 4. 在页面中使用注册组件

创建或修改 `screens/RegisterScreen.js` 文件：

```javascript
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import RegisterForm from '../components/RegisterForm';

const RegisterScreen = ({ navigation }) => {
  const handleRegisterSuccess = (userData) => {
    // 注册成功后的处理逻辑
    console.log('注册成功:', userData);
    
    // 可以保存用户信息到本地存储
    // AsyncStorage.setItem('userToken', userData.accessToken);
    
    // 导航到主页面或登录页面
    navigation.navigate('Home'); // 或其他页面
  };

  return (
    <ScrollView style={styles.container}>
      <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default RegisterScreen;
```

## 重要注意事项

### 1. 网络配置
- 确保应用有网络访问权限
- 在 `app.json` 中配置网络权限（Android）
- 处理网络超时和连接失败的情况

### 2. 安全考虑
- 不要在客户端硬编码敏感信息
- 使用 HTTPS 进行数据传输
- 实施适当的输入验证和清理
- 考虑实施密码强度检查

### 3. 错误处理
- 实施全面的错误处理机制
- 为用户提供清晰的错误信息
- 记录错误以便调试

### 4. 验证码处理
- 当后端启用验证码功能时，需要：
  - 获取验证码图片的接口
  - 在注册表单中显示验证码输入框
  - 在请求中包含 `captchaVerification` 字段

### 5. 用户体验优化
- 添加加载状态指示器
- 实施表单验证反馈
- 考虑添加注册成功动画
- 提供清晰的导航流程

## 配置管理

### 后端配置
- 注册功能开关：`system.user.register-enabled`
- 验证码功能开关：`yudao.captcha.enable`

### 前端环境变量
可以在 `.env` 文件中配置：
```
API_BASE_URL=http://your-server-domain.com/admin-api
CAPTCHA_ENABLED=false
```

## 测试建议

1. **功能测试**
   - 测试正常注册流程
   - 测试各种错误情况
   - 测试网络异常情况

2. **验证测试**
   - 测试用户名格式验证
   - 测试密码长度验证
   - 测试必填字段验证

3. **集成测试**
   - 测试与后端 API 的集成
   - 测试注册后的用户状态
   - 测试导航流程

通过以上步骤，您可以成功在 Expo 应用中集成用户注册功能。记得根据实际需求调整配置和样式。