/**
 * 权限控制组件集合
 * 提供完整的权限控制UI组件
 * 基于新的权限控制系统
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { 
  usePermissionControl, 
  usePagePermission, 
  useFeaturePermission, 
  useDepartmentPermission,
  PERMISSION_LEVELS 
} from '../hooks/usePermissionControl';

/**
 * 页面权限守卫组件
 * 用于保护整个页面的访问权限
 */
export const PageGuard = ({ 
  children, 
  routePath,
  requiredLevel = PERMISSION_LEVELS.READ,
  fallback = null,
  showMessage = true,
  customMessage = null,
  onAccessDenied = null
}) => {
  const { hasPermission, loading } = usePagePermission(routePath, requiredLevel);
  
  // 加载中状态
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>正在验证权限...</Text>
        </View>
      </View>
    );
  }
  
  // 有权限时显示内容
  if (hasPermission) {
    return children;
  }
  
  // 触发访问拒绝回调
  if (onAccessDenied) {
    onAccessDenied(routePath, requiredLevel);
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
        <Text style={styles.permissionDetails}>
          页面: {routePath}
        </Text>
        <Text style={styles.permissionDetails}>
          需要权限级别: {getPermissionLevelText(requiredLevel)}
        </Text>
      </View>
    </View>
  );
};

/**
 * 功能权限守卫组件
 * 用于控制特定功能或按钮的显示和可用性
 */
export const FeatureGuard = ({ 
  children, 
  permissionKey,
  requiredLevel = PERMISSION_LEVELS.READ,
  fallback = null,
  hideWhenNoPermission = true,
  showDisabled = false,
  disabledStyle = null,
  onAccessDenied = null
}) => {
  const { hasPermission, currentLevel, loading } = useFeaturePermission(permissionKey, requiredLevel);
  
  // 加载中时不显示
  if (loading) {
    return null;
  }
  
  // 有权限时显示内容
  if (hasPermission) {
    return children;
  }
  
  // 触发访问拒绝回调
  if (onAccessDenied) {
    onAccessDenied(permissionKey, requiredLevel, currentLevel);
  }
  
  // 无权限时的处理
  if (fallback) {
    return fallback;
  }
  
  if (hideWhenNoPermission) {
    return null;
  }
  
  // 显示禁用状态
  if (showDisabled) {
    return (
      <View style={[styles.disabledContainer, disabledStyle]}>
        {React.cloneElement(children, { disabled: true })}
      </View>
    );
  }
  
  return null;
};

/**
 * 部门权限守卫组件
 * 用于验证用户是否属于特定部门
 */
export const DepartmentGuard = ({ 
  children, 
  departmentKey,
  requireLeader = false,
  requireAdmin = false,
  fallback = null,
  showMessage = true,
  customMessage = null
}) => {
  const { hasAccess, isLeader, isAdmin, loading } = useDepartmentPermission(departmentKey);
  
  if (loading) {
    return null;
  }
  
  // 检查权限
  let hasPermission = hasAccess;
  if (requireAdmin && !isAdmin) {
    hasPermission = false;
  } else if (requireLeader && !isLeader && !isAdmin) {
    hasPermission = false;
  }
  
  if (hasPermission) {
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
        {customMessage || '此功能仅限特定部门使用'}
      </Text>
    </View>
  );
};

/**
 * 权限级别显示组件
 * 显示当前用户的权限级别
 */
export const PermissionLevelIndicator = ({ 
  permissionKey,
  showText = true,
  showIcon = true,
  style = null
}) => {
  const { currentLevel, loading } = useFeaturePermission(permissionKey);
  
  if (loading) {
    return null;
  }
  
  const levelInfo = getPermissionLevelInfo(currentLevel);
  
  return (
    <View style={[styles.permissionIndicator, style]}>
      {showIcon && <Text style={[styles.permissionIcon, { color: levelInfo.color }]}>{levelInfo.icon}</Text>}
      {showText && <Text style={[styles.permissionText, { color: levelInfo.color }]}>{levelInfo.text}</Text>}
    </View>
  );
};

/**
 * 用户部门显示组件
 * 显示用户所属的部门信息
 */
export const UserDepartmentDisplay = ({ 
  showRole = true,
  showColor = true,
  maxDisplay = 3,
  style = null
}) => {
  const { userDepartments, loading } = useDepartmentPermission();
  
  if (loading || userDepartments.length === 0) {
    return null;
  }
  
  const displayDepartments = userDepartments.slice(0, maxDisplay);
  const hasMore = userDepartments.length > maxDisplay;
  
  return (
    <View style={[styles.departmentContainer, style]}>
      {displayDepartments.map((dept, index) => (
        <View key={dept.id} style={styles.departmentItem}>
          {showColor && (
            <View 
              style={[styles.departmentColorIndicator, { backgroundColor: dept.color || '#999' }]} 
            />
          )}
          <Text style={styles.departmentName}>{dept.name}</Text>
          {showRole && (
            <Text style={styles.departmentRole}>({getRoleText(dept.role)})</Text>
          )}
          {dept.isPrimary && (
            <Text style={styles.primaryIndicator}>主要</Text>
          )}
        </View>
      ))}
      {hasMore && (
        <Text style={styles.moreIndicator}>+{userDepartments.length - maxDisplay}个部门</Text>
      )}
    </View>
  );
};

/**
 * 权限状态显示组件
 * 显示当前用户的权限状态概览
 */
export const PermissionStatusDisplay = ({ style = null }) => {
  const { 
    loading, 
    initialized, 
    isGuest, 
    permissions, 
    departments, 
    accessiblePages 
  } = usePermissionControl();
  
  if (loading) {
    return (
      <View style={[styles.statusContainer, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.statusText}>加载权限状态...</Text>
      </View>
    );
  }
  
  if (!initialized) {
    return (
      <View style={[styles.statusContainer, style]}>
        <Text style={styles.statusText}>权限未初始化</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.statusContainer, style]}>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>状态:</Text>
        <Text style={[styles.statusValue, { color: isGuest ? '#FF6B6B' : '#4ECDC4' }]}>
          {isGuest ? '访客用户' : '已授权用户'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>权限数:</Text>
        <Text style={styles.statusValue}>{permissions.length}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>部门数:</Text>
        <Text style={styles.statusValue}>{departments.length}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>可访问页面:</Text>
        <Text style={styles.statusValue}>{accessiblePages.length}</Text>
      </View>
    </View>
  );
};

/**
 * 权限刷新按钮组件
 */
export const PermissionRefreshButton = ({ 
  onRefresh = null,
  style = null,
  textStyle = null
}) => {
  const { refreshPermissions, loading } = usePermissionControl();
  
  const handleRefresh = async () => {
    await refreshPermissions();
    if (onRefresh) {
      onRefresh();
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.refreshButton, style]} 
      onPress={handleRefresh}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Text style={[styles.refreshButtonText, textStyle]}>刷新权限</Text>
      )}
    </TouchableOpacity>
  );
};

// 辅助函数
const getPermissionLevelText = (level) => {
  switch (level) {
    case PERMISSION_LEVELS.NONE: return '无权限';
    case PERMISSION_LEVELS.READ: return '只读';
    case PERMISSION_LEVELS.WRITE: return '读写';
    case PERMISSION_LEVELS.ADMIN: return '管理员';
    default: return '未知';
  }
};

const getPermissionLevelInfo = (level) => {
  switch (level) {
    case PERMISSION_LEVELS.NONE: 
      return { text: '无权限', icon: '🚫', color: '#FF6B6B' };
    case PERMISSION_LEVELS.READ: 
      return { text: '只读', icon: '👁️', color: '#4ECDC4' };
    case PERMISSION_LEVELS.WRITE: 
      return { text: '读写', icon: '✏️', color: '#45B7D1' };
    case PERMISSION_LEVELS.ADMIN: 
      return { text: '管理员', icon: '👑', color: '#F39C12' };
    default: 
      return { text: '未知', icon: '❓', color: '#999' };
  }
};

const getRoleText = (role) => {
  switch (role) {
    case 'admin': return '管理员';
    case 'leader': return '领导';
    case 'member': return '成员';
    case 'guest': return '访客';
    default: return role;
  }
};

// 样式
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  noPermissionContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 10,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  noPermissionIcon: {
    fontSize: 48,
    marginBottom: 15
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center'
  },
  noPermissionMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15
  },
  permissionDetails: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5
  },
  disabledContainer: {
    opacity: 0.5
  },
  permissionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F0F0'
  },
  permissionIcon: {
    fontSize: 14,
    marginRight: 4
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '500'
  },
  departmentContainer: {
    flexDirection: 'column'
  },
  departmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  departmentColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  departmentName: {
    fontSize: 14,
    color: '#333',
    marginRight: 6
  },
  departmentRole: {
    fontSize: 12,
    color: '#666',
    marginRight: 6
  },
  primaryIndicator: {
    fontSize: 10,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8
  },
  moreIndicator: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4
  },
  statusContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold'
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500'
  }
});

export {
  PageGuard,
  FeatureGuard,
  DepartmentGuard,
  PermissionLevelIndicator,
  UserDepartmentDisplay,
  PermissionStatusDisplay,
  PermissionRefreshButton
};