import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import oauth2Service from '../api/oauth2Service';
import OAuth2Config from '../config/oauth2Config';

const LoginScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { login: authLogin, oauth2Service, isOAuth2Enabled } = useAuth();
  
  // 获取路由参数
  const { prefillEmail } = route.params || {};
  
  // 表单状态
  const [formData, setFormData] = useState({
    email: prefillEmail || '',
    password: '',
    tenantName: '正泽物联',
    rememberMe: false
  });
  
  // UI状态
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  
  useEffect(() => {
    loadSavedCredentials();
  }, []);
  
  // 加载保存的登录凭证
  const loadSavedCredentials = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem('userEmail');
      const savedPassword = await AsyncStorage.getItem('userPassword');
      const rememberMe = await AsyncStorage.getItem('rememberMe');
      
      if (rememberMe === 'true' && savedUsername) {
        const savedTenantName = await AsyncStorage.getItem('tenantName');
        setFormData(prev => ({
          ...prev,
          email: savedUsername,
          password: savedPassword || '',
          tenantName: savedTenantName || '正泽物联',
          rememberMe: true
        }));
      }
    } catch (error) {
      console.error('加载保存的凭证失败:', error);
    }
  };
  
  // 保存登录凭证
  const saveCredentials = async () => {
    try {
      if (formData.rememberMe) {
        await AsyncStorage.setItem('userEmail', formData.email);
        await AsyncStorage.setItem('userPassword', formData.password);
        await AsyncStorage.setItem('tenantName', formData.tenantName);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('userEmail');
        await AsyncStorage.removeItem('userPassword');
        await AsyncStorage.removeItem('tenantName');
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.error('保存凭证失败:', error);
    }
  };
  
  // OAuth2登录
  const handleOAuth2Login = async () => {
    try {
      console.log('[LoginScreen] 开始OAuth2登录');
      setLoginStatus('正在连接OAuth2服务器...');
      
      if (!oauth2Service) {
        throw new Error('OAuth2服务未初始化');
      }
      
      // 根据租户名称获取租户ID
      const getTenantId = (tenantName) => {
        const tenant = OAuth2Config.tenant.predefinedTenants.find(t => t.name === tenantName);
        return tenant ? tenant.id : OAuth2Config.tenant.id;
      };
      
      const tenantId = getTenantId(formData.tenantName);
      
      setLoginStatus('正在验证用户凭证...');
      
      // 使用OAuth2密码模式登录
      const loginResult = await oauth2Service.passwordLogin(
        formData.email || formData.username,
        formData.password,
        null, // 使用默认客户端ID
        null, // 使用默认客户端密钥
        'user.read user.write',
        tenantId // 传递租户ID
      );
      
      if (!loginResult.success) {
        throw new Error(loginResult.error || 'OAuth2登录失败');
      }
      
      console.log('[LoginScreen] OAuth2登录成功，正在获取用户信息...');
      setLoginStatus('正在获取用户信息...');
      
      // 获取用户信息
      const userInfoResult = await oauth2Service.getUserInfo(tenantId);
      
      // 构造用户数据
      const userData = {
        username: userInfoResult.success ? userInfoResult.data.username : (formData.email || formData.username),
        email: userInfoResult.success ? userInfoResult.data.email : (formData.email || formData.username),
        token: loginResult.data.access_token,
        refreshToken: loginResult.data.refresh_token,
        tokenType: loginResult.data.token_type,
        expiresIn: loginResult.data.expires_in,
        userInfo: userInfoResult.success ? userInfoResult.data : null
      };
      
      console.log('[LoginScreen] 正在验证用户权限...');
      setLoginStatus('正在验证用户权限...');
      
      // 调用AuthContext的login方法，跳过OAuth2登录（因为已经在这里完成了OAuth2登录）
      await authLogin(userData, formData.password, true);
      
      // 保存凭证
      await saveCredentials();
      
      console.log('[LoginScreen] OAuth2登录成功，即将跳转到主页面');
      setLoginStatus('登录成功！');
      
      // 立即跳转，不延迟
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      
    } catch (error) {
      console.error('[LoginScreen] OAuth2登录失败:', error);
      setLoginStatus('');
      Alert.alert('OAuth2登录失败', error.message || '请检查用户名和密码');
    }
  };
  

  
  // 处理登录 - 仅使用OAuth2
  const handleLogin = async () => {
    if (loading) return;
    
    // 验证输入
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    
    if (!isOAuth2Enabled) {
      Alert.alert('错误', 'OAuth2认证服务未启用，请联系管理员');
      return;
    }
    
    setLoading(true);
    
    try {
      await handleOAuth2Login();
    } catch (error) {
      console.error('[LoginScreen] OAuth2登录处理失败:', error);
    } finally {
      setLoading(false);
      if (loginStatus && !loginStatus.includes('成功')) {
        setLoginStatus('');
      }
    }
  };
  
  // 更新表单数据
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
    },
    authModeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
      padding: 20,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    authModeText: {
      fontSize: 18,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 5,
    },
    authModeDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
      fontWeight: '500',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    passwordInput: {
      flex: 1,
    },
    showPasswordButton: {
      position: 'absolute',
      right: 15,
      padding: 5,
    },
    showPasswordText: {
      color: colors.primary,
      fontSize: 14,
    },
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30,
    },
    rememberMeText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 10,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 15,
      alignItems: 'center',
      marginBottom: 20,
    },
    loginButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    registerText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    registerButton: {
      marginLeft: 5,
    },
    registerButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    configButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      padding: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    configButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
  });
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>欢迎使用正泽物联</Text>
        <Text style={styles.subtitle}>请输入您的登录凭证</Text>
        
        
        {/* 租户名称输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>租户名称</Text>
          <TextInput
            style={styles.input}
            value={formData.tenantName}
            onChangeText={(value) => updateFormData('tenantName', value)}
            placeholder="请输入租户名称（默认为正泽物联）"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* 用户名输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>用户名</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            placeholder="请输入用户名"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>
        
        {/* 密码输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>密码</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              placeholder="请输入密码"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.showPasswordButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? '隐藏' : '显示'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 记住密码 */}
        <View style={styles.rememberMeContainer}>
          <Switch
            value={formData.rememberMe}
            onValueChange={(value) => updateFormData('rememberMe', value)}
            trackColor={{ false: colors.disabled, true: colors.primary }}
            thumbColor={formData.rememberMe ? '#FFFFFF' : '#f4f3f4'}
          />
          <Text style={styles.rememberMeText}>记住密码</Text>
        </View>
        
        {/* 登录按钮 */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.loginButtonDisabled
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.loadingText}>
                {loginStatus || '正在验证OAuth2身份...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>登录</Text>
          )}
        </TouchableOpacity>
        
        {/* 注册链接 */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>还没有账号？</Text>
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>立即注册</Text>
          </TouchableOpacity>
        </View>
        
        {/* OAuth配置按钮 */}
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => navigation.navigate('OAuth2ConfigScreen')}
        >
          <Text style={styles.configButtonText}>⚙️ 系统配置</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;