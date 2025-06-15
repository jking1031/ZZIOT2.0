// 若依后端权限信息集成使用示例
// 展示如何在React Native应用中使用新增的权限信息功能

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/apiService';
import { runPermissionInfoTest, runLoginIntegrationTest } from '../tests/permissionInfoTest';

const PermissionInfoUsageExample = () => {
  const { user, isAdmin, isDeptAdmin, login } = useAuth();
  const [permissionData, setPermissionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // 手动获取权限信息的示例
  const fetchPermissionInfo = async () => {
    setLoading(true);
    try {
      console.log('[示例] 开始获取权限信息...');
      const response = await authApi.getPermissionInfo();
      
      if (response && response.data) {
        setPermissionData(response.data);
        Alert.alert('成功', '权限信息获取成功！');
        console.log('[示例] 权限信息:', response.data);
      } else {
        Alert.alert('错误', '权限信息响应为空');
      }
    } catch (error) {
      console.error('[示例] 获取权限信息失败:', error);
      Alert.alert('错误', `获取权限信息失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 运行权限信息测试
  const runTest = async () => {
    setLoading(true);
    try {
      console.log('[示例] 运行权限信息测试...');
      const result = await runPermissionInfoTest();
      setTestResults(result);
      
      if (result.success) {
        Alert.alert('测试成功', '权限信息接口测试通过！');
      } else {
        Alert.alert('测试失败', `测试失败: ${result.error}`);
      }
    } catch (error) {
      console.error('[示例] 测试执行失败:', error);
      Alert.alert('错误', `测试执行失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 运行登录集成测试
  const runIntegrationTest = async () => {
    setLoading(true);
    try {
      console.log('[示例] 运行登录集成测试...');
      const result = await runLoginIntegrationTest();
      setTestResults(result);
      
      if (result.success) {
        Alert.alert('集成测试成功', result.message);
      } else {
        Alert.alert('集成测试失败', result.message);
      }
    } catch (error) {
      console.error('[示例] 集成测试失败:', error);
      Alert.alert('错误', `集成测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 权限检查示例函数
  const checkUserPermissions = () => {
    if (!permissionData) {
      Alert.alert('提示', '请先获取权限信息');
      return;
    }

    const { roles, permissions, user: userInfo } = permissionData;
    
    let message = '权限检查结果:\n\n';
    
    // 检查角色
    if (roles && roles.length > 0) {
      message += `角色信息:\n`;
      roles.forEach((role, index) => {
        message += `${index + 1}. ${role.name} (${role.code})\n`;
      });
      message += '\n';
    }
    
    // 检查权限
    if (permissions && permissions.length > 0) {
      message += `权限数量: ${permissions.length}\n`;
      message += `部分权限: ${permissions.slice(0, 3).join(', ')}...\n\n`;
    }
    
    // 检查管理员状态
    const isUserAdmin = roles?.some(role => 
      role.name?.includes('管理员') || 
      role.code === 'admin' ||
      role.type === 1
    );
    
    message += `管理员状态: ${isUserAdmin ? '是' : '否'}\n`;
    message += `部门管理员: ${isDeptAdmin ? '是' : '否'}`;
    
    Alert.alert('权限检查', message);
  };

  // 模拟基于权限的功能访问控制
  const checkFeatureAccess = (featureName, requiredPermission) => {
    if (!permissionData || !permissionData.permissions) {
      Alert.alert('权限检查', '权限信息未加载，无法验证功能访问权限');
      return false;
    }

    const hasPermission = permissionData.permissions.includes(requiredPermission);
    
    if (hasPermission) {
      Alert.alert('访问允许', `您有权限访问 "${featureName}" 功能`);
      return true;
    } else {
      Alert.alert('访问拒绝', `您没有权限访问 "${featureName}" 功能\n需要权限: ${requiredPermission}`);
      return false;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>若依权限信息集成示例</Text>
      
      {/* 用户基本信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>当前用户信息</Text>
        {user ? (
          <View style={styles.userInfo}>
            <Text>用户名: {user.username}</Text>
            <Text>昵称: {user.nickname || '未设置'}</Text>
            <Text>邮箱: {user.email}</Text>
            <Text>角色: {user.role_name || '未知'}</Text>
            <Text>管理员: {isAdmin ? '是' : '否'}</Text>
            <Text>部门管理员: {isDeptAdmin ? '是' : '否'}</Text>
          </View>
        ) : (
          <Text style={styles.noData}>未登录</Text>
        )}
      </View>

      {/* 操作按钮 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>权限信息操作</Text>
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={fetchPermissionInfo}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '获取中...' : '获取权限信息'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.testButton, loading && styles.buttonDisabled]} 
          onPress={runTest}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '测试中...' : '运行接口测试'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.integrationButton, loading && styles.buttonDisabled]} 
          onPress={runIntegrationTest}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '测试中...' : '运行集成测试'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.checkButton]} 
          onPress={checkUserPermissions}
        >
          <Text style={styles.buttonText}>检查用户权限</Text>
        </TouchableOpacity>
      </View>

      {/* 权限信息显示 */}
      {permissionData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>权限信息详情</Text>
          
          {/* 角色信息 */}
          {permissionData.roles && permissionData.roles.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>角色列表:</Text>
              {permissionData.roles.map((role, index) => (
                <View key={role.id} style={styles.roleItem}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  <Text style={styles.roleCode}>({role.code})</Text>
                </View>
              ))}
            </View>
          )}

          {/* 权限统计 */}
          {permissionData.permissions && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>
                权限数量: {permissionData.permissions.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 功能访问控制示例 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>功能访问控制示例</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.featureButton]} 
          onPress={() => checkFeatureAccess('用户管理', 'system:user:list')}
        >
          <Text style={styles.buttonText}>检查用户管理权限</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.featureButton]} 
          onPress={() => checkFeatureAccess('角色管理', 'system:role:list')}
        >
          <Text style={styles.buttonText}>检查角色管理权限</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.featureButton]} 
          onPress={() => checkFeatureAccess('系统配置', 'system:config:list')}
        >
          <Text style={styles.buttonText}>检查系统配置权限</Text>
        </TouchableOpacity>
      </View>

      {/* 测试结果显示 */}
      {testResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>测试结果</Text>
          <View style={styles.testResults}>
            <Text style={styles.testStatus}>
              状态: {testResults.success ? '✓ 成功' : '✗ 失败'}
            </Text>
            {testResults.message && (
              <Text style={styles.testMessage}>{testResults.message}</Text>
            )}
            {testResults.error && (
              <Text style={styles.testError}>错误: {testResults.error}</Text>
            )}
            {testResults.recommendations && (
              <View style={styles.recommendations}>
                <Text style={styles.recommendationTitle}>建议:</Text>
                {testResults.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>处理中...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subsection: {
    marginTop: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  noData: {
    color: '#999',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  integrationButton: {
    backgroundColor: '#FF9500',
  },
  checkButton: {
    backgroundColor: '#5856D6',
  },
  featureButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  roleCode: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  testResults: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  testStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  testError: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 8,
  },
  recommendations: {
    marginTop: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  recommendationItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: 'white',
    fontSize: 16,
  },
});

export default PermissionInfoUsageExample;