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
  const { oauth2Service, isOAuth2Enabled, register } = useAuth();
  
  // 表单状态 - 按照文档规范简化
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  });
  
  // 表单验证错误状态
  const [errors, setErrors] = useState({});
  
  // UI状态
  const [isLoading, setIsLoading] = useState(false);
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
  
  // 表单验证 - 按照文档规范
  const validateForm = () => {
    const newErrors = {};
    const { username, nickname, password, confirmPassword } = formData;
    
    // 用户名验证（4-30个字符，只能包含字母、数字、下划线）
    if (!username || username.length < 4 || username.length > 30) {
      newErrors.username = '用户名必须为4-30个字符';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = '用户名只能包含字母、数字、下划线';
    }
    
    // 昵称验证（1-30个字符）
    if (!nickname || nickname.length > 30) {
      newErrors.nickname = '昵称不能为空且不超过30个字符';
    }
    
    // 密码验证（4-16个字符）
    if (!password || password.length < 4 || password.length > 16) {
      newErrors.password = '密码必须为4-16个字符';
    }
    
    // 确认密码验证
    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 处理注册成功
  const handleRegisterSuccess = (response) => {
    Alert.alert(
      '注册成功',
      response.message || '您的账号已创建成功，请使用新账号登录系统。',
      [
        {
          text: '确定',
          onPress: () => {
            // 跳转到登录页面并预填充用户名
            navigation.navigate('Login', {
              prefillUsername: formData.username
            });
          }
        }
      ]
    );
  };
  
  // 主注册处理函数
  const handleRegister = async () => {
    try {
      setIsLoading(true);
      
      // 准备注册数据
      const registerData = {
        username: formData.username.trim(),
        nickname: formData.nickname.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };
      
      console.log('[RegisterScreen] 开始注册:', {
        ...registerData,
        password: '***',
        confirmPassword: '***'
      });
      
      // 调用AuthContext的register方法
      const result = await register(registerData);
      
      if (result.success) {
        handleRegisterSuccess(result);
      } else {
        throw new Error(result.message || '注册失败，请稍后重试');
      }
      
    } catch (error) {
      console.error('[RegisterScreen] 注册失败:', error);
      
      // 显示错误信息
      Alert.alert(
        '注册失败',
        error.message || '注册过程中发生错误，请稍后重试',
        [{ text: '确定' }]
      );
    } finally {
      setIsLoading(false);
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
    inputError: {
      borderColor: '#ff4444',
      borderWidth: 1,
    },
    errorText: {
      color: '#ff4444',
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
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
        
        {/* 用户名 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            用户名 <Text style={styles.requiredLabel}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.username && styles.inputError]}
            value={formData.username}
            onChangeText={(text) => updateFormData('username', text)}
            placeholder="请输入用户名"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
        </View>
        
        {/* 昵称 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            昵称 <Text style={styles.requiredLabel}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.nickname && styles.inputError]}
            value={formData.nickname}
            onChangeText={(text) => updateFormData('nickname', text)}
            placeholder="请输入昵称"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.nickname && <Text style={styles.errorText}>{errors.nickname}</Text>}
        </View>
        
        {/* 密码 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            密码 <Text style={styles.requiredLabel}>*</Text>
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={(text) => updateFormData('password', text)}
              placeholder="请输入密码"
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
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>
        
        {/* 确认密码 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            确认密码 <Text style={styles.requiredLabel}>*</Text>
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData('confirmPassword', text)}
              placeholder="请再次输入密码"
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
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>
        

        
        {/* 注册按钮 */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            (isLoading || !formData.username || !formData.nickname || !formData.password || !formData.confirmPassword) && styles.registerButtonDisabled
          ]}
          onPress={() => {
            if (validateForm()) {
              handleRegister();
            }
          }}
          disabled={isLoading || !formData.username || !formData.nickname || !formData.password || !formData.confirmPassword}
        >
          {isLoading ? (
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