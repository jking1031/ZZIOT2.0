// OAuth2.0 配置管理界面
// 用于配置和管理OAuth2认证设置

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_OAUTH2_CONFIG } from '../api/oauth2Service';

const OAuth2ConfigScreen = ({ navigation }) => {
  const {
    isOAuth2Enabled,
    enableOAuth2,
    disableOAuth2,
    getOAuth2Config,
    updateOAuth2Config,
    getOAuth2TokenInfo
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(DEFAULT_OAUTH2_CONFIG);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadConfig();
    loadTokenInfo();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await getOAuth2Config();
      setConfig(savedConfig);
    } catch (error) {
      console.error('加载OAuth2配置失败:', error);
    }
  };

  const loadTokenInfo = async () => {
    try {
      const info = await getOAuth2TokenInfo();
      setTokenInfo(info);
    } catch (error) {
      console.error('加载令牌信息失败:', error);
    }
  };

  const handleToggleOAuth2 = async (enabled) => {
    setLoading(true);
    try {
      if (enabled) {
        const success = await enableOAuth2(config);
        if (success) {
          Alert.alert('成功', 'OAuth2认证已启用');
        } else {
          Alert.alert('错误', '启用OAuth2认证失败');
        }
      } else {
        const success = await disableOAuth2();
        if (success) {
          Alert.alert('成功', 'OAuth2认证已禁用');
          setTokenInfo(null);
        } else {
          Alert.alert('错误', '禁用OAuth2认证失败');
        }
      }
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config.baseUrl || !config.clientId || !config.clientSecret) {
      Alert.alert('错误', '请填写完整的配置信息');
      return;
    }

    setLoading(true);
    try {
      const success = await updateOAuth2Config(config);
      if (success) {
        Alert.alert('成功', 'OAuth2配置已保存');
        await loadTokenInfo();
      } else {
        Alert.alert('错误', '保存配置失败');
      }
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.baseUrl) {
      Alert.alert('错误', '请先配置服务器地址');
      return;
    }

    setLoading(true);
    setTestResult(null);
    
    try {
      // 测试OAuth2端点连接
      const response = await fetch(`${config.baseUrl}/system/oauth2/token`, {
        method: 'HEAD',
        timeout: 5000
      });
      
      // 200 OK, 405 Method Not Allowed, 400 Bad Request 都表示端点存在且可访问
      if (response.status === 200 || response.status === 405 || response.status === 400) {
        setTestResult({ 
          success: true, 
          message: `OAuth2服务器连接正常 (状态码: ${response.status})` 
        });
      } else if (response.status >= 500) {
        // 5xx 服务器错误
        setTestResult({ 
          success: false, 
          message: `服务器内部错误: ${response.status}` 
        });
      } else {
        // 其他状态码
        setTestResult({ 
          success: false, 
          message: `服务器响应异常: ${response.status}` 
        });
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        setTestResult({ success: false, message: '网络连接失败，请检查服务器地址和网络连接' });
      } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
        setTestResult({ success: false, message: '连接超时，请检查服务器是否正常运行' });
      } else {
        setTestResult({ success: false, message: `连接失败: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
    Alert.alert(
      '确认重置',
      '确定要重置为默认配置吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            setConfig(DEFAULT_OAUTH2_CONFIG);
            setTestResult(null);
          }
        }
      ]
    );
  };

  const formatTokenExpiry = (expiresAt) => {
    if (!expiresAt) return '未知';
    const date = new Date(expiresAt);
    return date.toLocaleString('zh-CN');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OAuth2.0 配置</Text>
        <Text style={styles.subtitle}>配置ruoyi项目的OAuth2认证</Text>
      </View>

      {/* OAuth2开关 */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>启用OAuth2认证</Text>
          <Switch
            value={isOAuth2Enabled}
            onValueChange={handleToggleOAuth2}
            disabled={loading}
          />
        </View>
        <Text style={styles.hint}>
          启用后将使用OAuth2.0标准进行身份认证
        </Text>
      </View>

      {/* 配置表单 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>服务器配置</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>服务器地址 *</Text>
          <TextInput
            style={styles.input}
            value={config.baseUrl}
            onChangeText={(text) => setConfig({ ...config, baseUrl: text })}
            placeholder="http://localhost:8080"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>客户端ID *</Text>
          <TextInput
            style={styles.input}
            value={config.clientId}
            onChangeText={(text) => setConfig({ ...config, clientId: text })}
            placeholder="zziot-mobile-app"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>客户端密钥 *</Text>
          <TextInput
            style={styles.input}
            value={config.clientSecret}
            onChangeText={(text) => setConfig({ ...config, clientSecret: text })}
            placeholder="your-client-secret"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>权限范围</Text>
          <TextInput
            style={styles.input}
            value={config.scope}
            onChangeText={(text) => setConfig({ ...config, scope: text })}
            placeholder="user.read user.write"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.section}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={handleTestConnection}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>测试连接</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleResetConfig}
            disabled={loading}
          >
            <Text style={styles.buttonText}>重置</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveConfig}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.buttonText}>保存配置</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 测试结果 */}
      {testResult && (
        <View style={styles.section}>
          <View style={[
            styles.testResult,
            testResult.success ? styles.testSuccess : styles.testError
          ]}>
            <Text style={[
              styles.testResultText,
              testResult.success ? styles.testSuccessText : styles.testErrorText
            ]}>
              {testResult.message}
            </Text>
          </View>
        </View>
      )}

      {/* 令牌信息 */}
      {isOAuth2Enabled && tokenInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前令牌信息</Text>
          
          <View style={styles.tokenInfo}>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>访问令牌:</Text>
              <Text style={styles.tokenValue}>
                {tokenInfo.accessToken ? '已获取' : '未获取'}
              </Text>
            </View>
            
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>刷新令牌:</Text>
              <Text style={styles.tokenValue}>
                {tokenInfo.refreshToken ? '已获取' : '未获取'}
              </Text>
            </View>
            
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>令牌类型:</Text>
              <Text style={styles.tokenValue}>{tokenInfo.tokenType}</Text>
            </View>
            
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>过期时间:</Text>
              <Text style={[
                styles.tokenValue,
                tokenInfo.isExpired ? styles.expiredToken : styles.validToken
              ]}>
                {formatTokenExpiry(tokenInfo.expiresAt)}
              </Text>
            </View>
            
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>权限范围:</Text>
              <Text style={styles.tokenValue}>{tokenInfo.scope || '未指定'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 使用说明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>使用说明</Text>
        <Text style={styles.helpText}>
          1. 在ruoyi管理后台创建OAuth2客户端应用{"\n"}
          2. 配置客户端ID和密钥{"\n"}
          3. 设置授权类型为"password"和"refresh_token"{"\n"}
          4. 配置权限范围，如"user.read user.write"{"\n"}
          5. 启用OAuth2认证后，登录将使用OAuth2.0标准
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  switchLabel: {
    fontSize: 16,
    color: '#333'
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  inputGroup: {
    marginBottom: 15
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44
  },
  testButton: {
    backgroundColor: '#2196F3',
    flex: 0.48
  },
  resetButton: {
    backgroundColor: '#FF9800',
    flex: 0.48
  },
  saveButton: {
    backgroundColor: '#4CAF50'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500'
  },
  testResult: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  testSuccess: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50'
  },
  testError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336'
  },
  testResultText: {
    fontSize: 14,
    textAlign: 'center'
  },
  testSuccessText: {
    color: '#2E7D32'
  },
  testErrorText: {
    color: '#C62828'
  },
  tokenInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  tokenLabel: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500'
  },
  tokenValue: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
    textAlign: 'right'
  },
  validToken: {
    color: '#28a745'
  },
  expiredToken: {
    color: '#dc3545'
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  }
});

export default OAuth2ConfigScreen;