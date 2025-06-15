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
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/apiService';

const RegisterScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { oauth2Service, isOAuth2Enabled } = useAuth();
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: '',
    company: ''
  });
  
  // UI状态
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OAuth2状态
  const [useOAuth2, setUseOAuth2] = useState(false);
  
  useEffect(() => {
    checkOAuth2Status();
  }, []);
  
  // 检查OAuth2状态
  const checkOAuth2Status = () => {
    setUseOAuth2(isOAuth2Enabled);
  };
  
  // 表单验证
  const validateForm = () => {
    const { username, email, password, confirmPassword, phone } = formData;
    
    // 必填字段检查
    if (!username.trim()) {
      Alert.alert('验证失败', '请输入用户名');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('验证失败', '请输入邮箱地址');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('验证失败', '请输入密码');
      return false;
    }
    
    if (!confirmPassword.trim()) {
      Alert.alert('验证失败', '请确认密码');
      return false;
    }
    
    // 用户名验证
    if (username.length < 3) {
      Alert.alert('验证失败', '用户名至少需要3个字符');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('验证失败', '用户名只能包含字母、数字和下划线');
      return false;
    }
    
    // 邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('验证失败', '请输入有效的邮箱地址');
      return false;
    }
    
    // 密码验证
    if (password.length < 6) {
      Alert.alert('验证失败', '密码至少需要6个字符');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('验证失败', '两次输入的密码不一致');
      return false;
    }
    
    // 手机号验证（如果填写）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      Alert.alert('验证失败', '请输入有效的手机号码');
      return false;
    }
    
    return true;
  };
  
  // OAuth2注册
  const handleOAuth2Register = async () => {
    try {
      console.log('[RegisterScreen] 开始OAuth2注册');
      
      if (!oauth2Service) {
        throw new Error('OAuth2服务未初始化');
      }
      
      // 准备注册数据
      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        department: formData.department.trim() || null,
        company: formData.company.trim() || null,
        // Ruoyi后端可能需要的额外字段
        status: '1', // 默认启用状态
        userType: '00', // 普通用户
        sex: '2' // 未知性别
      };
      
      // 第一步：使用传统API注册用户
      console.log('[RegisterScreen] 使用传统API创建用户账号');
      const response = await authApi.register(registerData);
      
      if (!response || (!response.success && response.code !== 200)) {
        throw new Error(response?.message || '注册失败，请稍后重试');
      }
      
      console.log('[RegisterScreen] 用户账号创建成功，开始OAuth2认证');
      
      // 第二步：使用OAuth2服务登录新创建的账号
      const loginResult = await oauth2Service.passwordLogin(
        formData.username.trim(),
        formData.password,
        null, // 使用默认客户端ID
        null, // 使用默认客户端密钥
        'user.read user.write',
        '1' // 默认租户ID
      );
      
      if (!loginResult.success) {
        throw new Error(loginResult.error || 'OAuth2认证失败');
      }
      
      console.log('[RegisterScreen] OAuth2认证成功:', loginResult.data);
      
      Alert.alert(
        '注册成功',
        'OAuth2账号已创建并认证成功，请使用新账号登录系统。',
        [
          {
            text: '确定',
            onPress: () => {
              navigation.navigate('Login', {
                prefillEmail: formData.email
              });
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('[RegisterScreen] OAuth2注册失败:', error);
      throw error; // 重新抛出错误供主处理函数处理
    }
  };
  
  // 传统注册
  const handleTraditionalRegister = async () => {
    try {
      console.log('[RegisterScreen] 开始传统注册');
      
      // 准备注册数据
      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        department: formData.department.trim() || null,
        company: formData.company.trim() || null,
        // Ruoyi后端可能需要的额外字段
        status: '1', // 默认启用状态
        userType: '00', // 普通用户
        sex: '2' // 未知性别
      };
      
      console.log('[RegisterScreen] 注册数据:', {
        ...registerData,
        password: '***' // 隐藏密码
      });
      
      // 调用注册API
      const response = await authApi.register(registerData);
      
      console.log('[RegisterScreen] 注册响应:', response);
      
      // 处理注册成功
      if (response && (response.success || response.code === 200)) {
        Alert.alert(
          '注册成功',
          '您的账号已创建成功，请使用新账号登录系统。',
          [
            {
              text: '确定',
              onPress: () => {
                // 跳转到登录页面并预填充邮箱
                navigation.navigate('Login', {
                  prefillEmail: formData.email
                });
              }
            }
          ]
        );
      } else {
        throw new Error(response?.message || '注册失败，请稍后重试');
      }
      
    } catch (error) {
      console.error('[RegisterScreen] 传统注册失败:', error);
      throw error; // 重新抛出错误供主处理函数处理
    }
  };
  
  // 处理注册
  const handleRegister = async () => {
    if (loading) return;
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (useOAuth2 && isOAuth2Enabled) {
        await handleOAuth2Register();
      } else {
        await handleTraditionalRegister();
      }
    } catch (error) {
      console.error('[RegisterScreen] 注册处理失败:', error);
      
      let errorMessage = '注册失败';
      
      if (error.response) {
        const responseData = error.response.data;
        if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.msg) {
          errorMessage = responseData.msg;
        } else {
          errorMessage = '服务器返回错误，请稍后重试';
        }
      } else if (error.request) {
        errorMessage = '网络连接失败，请检查网络设置';
      } else {
        errorMessage = error.message || '注册过程中发生错误，请重试';
      }
      
      Alert.alert('注册失败', errorMessage);
    } finally {
      setLoading(false);
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
      padding: 20,
      paddingTop: 40,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    authModeText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
      marginRight: 15,
    },
    authModeLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 15,
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
    requiredLabel: {
      color: colors.error,
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
    registerButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 15,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
    },
    registerButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    loginText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    loginButton: {
      marginLeft: 5,
    },
    loginButtonText: {
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
    helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 5,
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
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>创建账号</Text>
        <Text style={styles.subtitle}>请填写以下信息完成注册</Text>
        
        {/* OAuth2模式切换 */}
        {isOAuth2Enabled && (
          <View style={styles.authModeContainer}>
            <Text style={styles.authModeText}>OAuth2认证</Text>
            <Switch
              value={useOAuth2}
              onValueChange={setUseOAuth2}
              trackColor={{ false: colors.disabled, true: colors.primary }}
              thumbColor={useOAuth2 ? '#FFFFFF' : '#f4f3f4'}
            />
            <Text style={styles.authModeLabel}>
              {useOAuth2 ? 'OAuth2模式' : '传统模式'}
            </Text>
          </View>
        )}
        
        {/* 用户名 */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, styles.requiredLabel]}>用户名 *</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(value) => updateFormData('username', value)}
            placeholder="请输入用户名（3-20个字符）"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Text style={styles.helpText}>只能包含字母、数字和下划线</Text>
        </View>
        
        {/* 邮箱 */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, styles.requiredLabel]}>邮箱地址 *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            placeholder="请输入邮箱地址"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Text style={styles.helpText}>用于登录和接收通知</Text>
        </View>
        
        {/* 密码 */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, styles.requiredLabel]}>密码 *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              placeholder="请输入密码（至少6个字符）"
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
        
        {/* 确认密码 */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, styles.requiredLabel]}>确认密码 *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              placeholder="请再次输入密码"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.showPasswordButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.showPasswordText}>
                {showConfirmPassword ? '隐藏' : '显示'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 手机号 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>手机号</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            placeholder="请输入手机号（可选）"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>
        
        {/* 部门 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>部门</Text>
          <TextInput
            style={styles.input}
            value={formData.department}
            onChangeText={(value) => updateFormData('department', value)}
            placeholder="请输入所属部门（可选）"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>
        
        {/* 公司 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>公司</Text>
          <TextInput
            style={styles.input}
            value={formData.company}
            onChangeText={(value) => updateFormData('company', value)}
            placeholder="请输入公司名称（可选）"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>
        
        {/* 注册按钮 */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            loading && styles.registerButtonDisabled
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.loadingText}>注册中...</Text>
            </View>
          ) : (
            <Text style={styles.registerButtonText}>注册</Text>
          )}
        </TouchableOpacity>
        
        {/* 登录链接 */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>已有账号？</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>立即登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;