/**
 * 权限验证组件
 * 用于控制页面和功能的访问权限
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppPermissions, usePermissionGuard } from '../hooks/useAppPermissions';

/**
 * 页面权限守卫组件
 * 用于保护整个页面的访问权限
 */
export const PagePermissionGuard = ({ 
  children, 
  requiredPermission, 
  departmentId = null,
  fallback = null,
  showMessage = true,
  customMessage = null
}) => {
  const { canAccess, loading } = usePermissionGuard(requiredPermission, departmentId);
  
  // 加载中状态
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>正在验证权限...</Text>
        </View>
      </View>
    );
  }
  
  // 有权限时显示内容
  if (canAccess) {
    return children;
  }
  
  // 无权限时的处理
  if (fallback) {
    return fallback;
  }
  
  if (!showMessage) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.noPermissionContainer}>
        <Text style={styles.noPermissionIcon}>🔒</Text>
        <Text style={styles.noPermissionTitle}>访问受限</Text>
        <Text style={styles.noPermissionMessage}>
          {customMessage || '您没有访问此页面的权限，请联系管理员获取相应权限。'}
        </Text>
      </View>
    </View>
  );
};

/**
 * 功能权限守卫组件
 * 用于控制特定功能或按钮的显示
 */
export const FeaturePermissionGuard = ({ 
  children, 
  requiredPermission, 
  departmentId = null,
  minLevel = 1,
  fallback = null,
  hideWhenNoPermission = true
}) => {
  const { hasPagePermission, getPermissionLevel, loading } = useAppPermissions();
  
  // 加载中时不显示
  if (loading) {
    return null;
  }
  
  const hasPermission = hasPagePermission(requiredPermission, departmentId);
  const permissionLevel = getPermissionLevel(requiredPermission, departmentId);
  const hasRequiredLevel = permissionLevel >= minLevel;
  
  // 有权限且满足级别要求时显示内容
  if (hasPermission && hasRequiredLevel) {
    return children;
  }
  
  // 无权限时的处理
  if (fallback) {
    return fallback;
  }
  
  if (hideWhenNoPermission) {
    return null;
  }
  
  // 显示禁用状态
  return (
    <View style={styles.disabledContainer}>
      {children}
    </View>
  );
};

/**
 * 部门权限守卫组件
 * 用于验证用户是否属于特定部门
 */
export const DepartmentGuard = ({ 
  children, 
  requiredDepartment, 
  fallback = null,
  showMessage = true
}) => {
  const { isInDepartment, loading } = useAppPermissions();
  
  if (loading) {
    return null;
  }
  
  const hasAccess = isInDepartment(requiredDepartment);
  
  if (hasAccess) {
    return children;
  }
  
  if (fallback) {
    return fallback;
  }
  
  if (!showMessage) {
    return null;
  }
  
  return (
    <View style={styles.noPermissionContainer}>
      <Text style={styles.noPermissionMessage}>
        此功能仅限特定部门使用
      </Text>
    </View>
  );
};

/**
 * 管理员权限守卫组件
 * 用于验证管理员权限
 */
export const AdminGuard = ({ 
  children, 
  fallback = null,
  showMessage = true
}) => {
  const { isAdmin, loading } = useAppPermissions();
  
  if (loading) {
    return null;
  }
  
  if (isAdmin) {
    return children;
  }
  
  if (fallback) {
    return fallback;
  }
  
  if (!showMessage) {
    return null;
  }
  
  return (
    <View style={styles.noPermissionContainer}>
      <Text style={styles.noPermissionMessage}>
        此功能仅限管理员使用
      </Text>
    </View>
  );
};

/**
 * 权限级别守卫组件
 * 根据权限级别显示不同内容
 */
export const PermissionLevelGuard = ({ 
  requiredPermission,
  departmentId = null,
  readOnlyComponent = null,
  readWriteComponent = null,
  adminComponent = null,
  noPermissionComponent = null
}) => {
  const { getPermissionLevel, loading } = useAppPermissions();
  
  if (loading) {
    return null;
  }
  
  const level = getPermissionLevel(requiredPermission, departmentId);
  
  switch (level) {
    case 3: // 管理员权限
      return adminComponent || readWriteComponent || readOnlyComponent;
    case 2: // 读写权限
      return readWriteComponent || readOnlyComponent;
    case 1: // 只读权限
      return readOnlyComponent;
    default: // 无权限
      return noPermissionComponent;
  }
};

/**
 * 多权限守卫组件
 * 需要满足多个权限条件
 */
export const MultiPermissionGuard = ({ 
  children,
  requiredPermissions = [],
  departmentId = null,
  requireAll = true, // true: 需要所有权限, false: 需要任一权限
  fallback = null,
  showMessage = true
}) => {
  const { hasPagePermission, loading } = useAppPermissions();
  
  if (loading) {
    return null;
  }
  
  const permissionResults = requiredPermissions.map(permission => 
    hasPagePermission(permission, departmentId)
  );
  
  const hasAccess = requireAll 
    ? permissionResults.every(result => result)
    : permissionResults.some(result => result);
  
  if (hasAccess) {
    return children;
  }
  
  if (fallback) {
    return fallback;
  }
  
  if (!showMessage) {
    return null;
  }
  
  return (
    <View style={styles.noPermissionContainer}>
      <Text style={styles.noPermissionMessage}>
        您没有访问此功能的权限
      </Text>
    </View>
  );
};

/**
 * 权限信息显示组件
 * 显示当前用户的权限信息
 */
export const PermissionInfo = ({ 
  requiredPermission,
  departmentId = null,
  showLevel = true,
  showDepartment = true
}) => {
  const { 
    hasPagePermission, 
    getPermissionLevel, 
    getPrimaryDepartment,
    loading 
  } = useAppPermissions();
  
  if (loading) {
    return <Text style={styles.infoText}>加载中...</Text>;
  }
  
  const hasPermission = hasPagePermission(requiredPermission, departmentId);
  const level = getPermissionLevel(requiredPermission, departmentId);
  const department = getPrimaryDepartment();
  
  const levelText = {
    0: '无权限',
    1: '只读',
    2: '读写',
    3: '管理员'
  };
  
  return (
    <View style={styles.infoContainer}>
      <Text style={styles.infoText}>
        权限状态: {hasPermission ? '✅ 有权限' : '❌ 无权限'}
      </Text>
      {showLevel && (
        <Text style={styles.infoText}>
          权限级别: {levelText[level] || '未知'}
        </Text>
      )}
      {showDepartment && department && (
        <Text style={styles.infoText}>
          所属部门: {department.department_name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingContainer: {
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10
  },
  noPermissionContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  noPermissionIcon: {
    fontSize: 48,
    marginBottom: 10
  },
  noPermissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10
  },
  noPermissionMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20
  },
  disabledContainer: {
    opacity: 0.5,
    pointerEvents: 'none'
  },
  infoContainer: {
    padding: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 5,
    marginVertical: 5
  },
  infoText: {
    fontSize: 12,
    color: '#495057',
    marginVertical: 2
  }
});

export default {
  PagePermissionGuard,
  FeaturePermissionGuard,
  DepartmentGuard,
  AdminGuard,
  PermissionLevelGuard,
  MultiPermissionGuard,
  PermissionInfo
};