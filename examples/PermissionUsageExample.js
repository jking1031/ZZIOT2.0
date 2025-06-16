/**
 * 权限控制系统使用示例
 * 展示如何在实际页面中应用权限控制
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView
} from 'react-native';

// 导入权限控制组件
import {
  PageGuard,
  FeatureGuard,
  DepartmentGuard,
  PermissionLevelIndicator,
  UserDepartmentDisplay,
  PermissionStatusDisplay,
  PermissionRefreshButton
} from '../components/PermissionControlComponents';

// 导入权限控制Hooks
import {
  usePermissionControl,
  usePagePermission,
  useFeaturePermission,
  useDepartmentPermission,
  PERMISSION_LEVELS
} from '../hooks/usePermissionControl';

/**
 * 示例页面：用户管理
 * 展示完整的权限控制应用
 */
const UserManagementExample = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  
  // 使用权限控制Hook
  const {
    loading,
    initialized,
    isGuest,
    checkPagePermission,
    checkFeaturePermission,
    refreshPermissions
  } = usePermissionControl();
  
  // 检查特定功能权限
  const { hasPermission: canCreateUser } = useFeaturePermission('user.create', PERMISSION_LEVELS.WRITE);
  const { hasPermission: canEditUser } = useFeaturePermission('user.edit', PERMISSION_LEVELS.WRITE);
  const { hasPermission: canDeleteUser } = useFeaturePermission('user.delete', PERMISSION_LEVELS.ADMIN);
  const { hasPermission: canViewUserList } = useFeaturePermission('user.list', PERMISSION_LEVELS.READ);
  
  // 检查部门权限
  const { hasAccess: canAccessHR } = useDepartmentPermission('hr');
  const { hasAccess: canAccessIT, isAdmin: isITAdmin } = useDepartmentPermission('it');
  
  // 模拟用户数据
  const mockUsers = [
    { id: 1, name: '张三', department: 'IT部', role: '开发工程师' },
    { id: 2, name: '李四', department: 'HR部', role: 'HR专员' },
    { id: 3, name: '王五', department: 'IT部', role: '系统管理员' }
  ];
  
  const handleCreateUser = () => {
    Alert.alert('创建用户', '这里会打开创建用户的表单');
  };
  
  const handleEditUser = (user) => {
    setSelectedUser(user);
    Alert.alert('编辑用户', `编辑用户: ${user.name}`);
  };
  
  const handleDeleteUser = (user) => {
    Alert.alert(
      '删除用户',
      `确定要删除用户 ${user.name} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => {
          Alert.alert('删除成功', `用户 ${user.name} 已删除`);
        }}
      ]
    );
  };
  
  return (
    // 页面级权限守卫
    <PageGuard 
      routePath="/user-management" 
      requiredLevel={PERMISSION_LEVELS.READ}
      customMessage="您需要用户管理权限才能访问此页面"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          {/* 页面标题和权限状态 */}
          <View style={styles.header}>
            <Text style={styles.title}>用户管理</Text>
            <PermissionStatusDisplay style={styles.statusDisplay} />
          </View>
          
          {/* 用户部门信息显示 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>当前用户部门</Text>
            <UserDepartmentDisplay showRole={true} showColor={true} />
          </View>
          
          {/* 功能按钮区域 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>操作功能</Text>
            <View style={styles.buttonRow}>
              {/* 创建用户按钮 - 需要写权限 */}
              <FeatureGuard 
                permissionKey="user.create" 
                requiredLevel={PERMISSION_LEVELS.WRITE}
                fallback={
                  <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                    <Text style={styles.disabledButtonText}>创建用户 (无权限)</Text>
                  </TouchableOpacity>
                }
              >
                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreateUser}>
                  <Text style={styles.buttonText}>创建用户</Text>
                  <PermissionLevelIndicator permissionKey="user.create" showText={false} />
                </TouchableOpacity>
              </FeatureGuard>
              
              {/* 刷新权限按钮 */}
              <PermissionRefreshButton 
                style={styles.refreshButton}
                onRefresh={() => Alert.alert('权限已刷新', '权限信息已更新')}
              />
            </View>
          </View>
          
          {/* 用户列表 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>用户列表</Text>
            
            {/* 列表查看权限守卫 */}
            <FeatureGuard 
              permissionKey="user.list" 
              requiredLevel={PERMISSION_LEVELS.READ}
              fallback={
                <View style={styles.noPermissionContainer}>
                  <Text style={styles.noPermissionText}>您没有查看用户列表的权限</Text>
                </View>
              }
            >
              {mockUsers.map((user) => (
                <View key={user.id} style={styles.userItem}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userDetails}>{user.department} - {user.role}</Text>
                  </View>
                  
                  <View style={styles.userActions}>
                    {/* 编辑按钮 - 需要写权限 */}
                    <FeatureGuard 
                      permissionKey="user.edit" 
                      requiredLevel={PERMISSION_LEVELS.WRITE}
                      hideWhenNoPermission={false}
                      showDisabled={true}
                    >
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]} 
                        onPress={() => handleEditUser(user)}
                      >
                        <Text style={styles.actionButtonText}>编辑</Text>
                      </TouchableOpacity>
                    </FeatureGuard>
                    
                    {/* 删除按钮 - 需要管理员权限 */}
                    <FeatureGuard 
                      permissionKey="user.delete" 
                      requiredLevel={PERMISSION_LEVELS.ADMIN}
                      hideWhenNoPermission={true}
                    >
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]} 
                        onPress={() => handleDeleteUser(user)}
                      >
                        <Text style={styles.actionButtonText}>删除</Text>
                      </TouchableOpacity>
                    </FeatureGuard>
                  </View>
                </View>
              ))}
            </FeatureGuard>
          </View>
          
          {/* 部门特定功能 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>部门特定功能</Text>
            
            {/* HR部门功能 */}
            <DepartmentGuard 
              departmentKey="hr"
              fallback={
                <View style={styles.departmentSection}>
                  <Text style={styles.departmentTitle}>HR管理 (无权限)</Text>
                  <Text style={styles.noAccessText}>您不属于HR部门，无法访问此功能</Text>
                </View>
              }
            >
              <View style={styles.departmentSection}>
                <Text style={styles.departmentTitle}>HR管理</Text>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                  <Text style={styles.buttonText}>员工档案管理</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                  <Text style={styles.buttonText}>薪资管理</Text>
                </TouchableOpacity>
              </View>
            </DepartmentGuard>
            
            {/* IT部门功能 */}
            <DepartmentGuard 
              departmentKey="it"
              requireAdmin={false}
              fallback={
                <View style={styles.departmentSection}>
                  <Text style={styles.departmentTitle}>IT管理 (无权限)</Text>
                  <Text style={styles.noAccessText}>您不属于IT部门，无法访问此功能</Text>
                </View>
              }
            >
              <View style={styles.departmentSection}>
                <Text style={styles.departmentTitle}>IT管理 {isITAdmin && '(管理员)'}</Text>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                  <Text style={styles.buttonText}>系统监控</Text>
                </TouchableOpacity>
                
                {/* IT管理员专用功能 */}
                <DepartmentGuard 
                  departmentKey="it"
                  requireAdmin={true}
                  hideWhenNoPermission={true}
                >
                  <TouchableOpacity style={[styles.button, styles.adminButton]}>
                    <Text style={styles.buttonText}>服务器管理 (管理员)</Text>
                  </TouchableOpacity>
                </DepartmentGuard>
              </View>
            </DepartmentGuard>
          </View>
          
          {/* 权限级别展示 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>当前权限级别</Text>
            <View style={styles.permissionGrid}>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>用户创建:</Text>
                <PermissionLevelIndicator permissionKey="user.create" />
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>用户编辑:</Text>
                <PermissionLevelIndicator permissionKey="user.edit" />
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>用户删除:</Text>
                <PermissionLevelIndicator permissionKey="user.delete" />
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>用户列表:</Text>
                <PermissionLevelIndicator permissionKey="user.list" />
              </View>
            </View>
          </View>
          
          {/* 访客用户提示 */}
          {isGuest && (
            <View style={styles.guestNotice}>
              <Text style={styles.guestNoticeText}>⚠️ 您当前以访客身份访问，功能受限</Text>
              <Text style={styles.guestNoticeSubtext}>请联系管理员获取相应权限</Text>
            </View>
          )}
          
        </ScrollView>
      </SafeAreaView>
    </PageGuard>
  );
};

/**
 * 简单的功能权限示例
 */
const SimpleFeatureExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>简单功能权限示例</Text>
      
      {/* 只有具有写权限的用户才能看到这个按钮 */}
      <FeatureGuard permissionKey="data.edit" requiredLevel={PERMISSION_LEVELS.WRITE}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]}>
          <Text style={styles.buttonText}>编辑数据</Text>
        </TouchableOpacity>
      </FeatureGuard>
      
      {/* 只有管理员才能看到这个按钮 */}
      <FeatureGuard permissionKey="system.config" requiredLevel={PERMISSION_LEVELS.ADMIN}>
        <TouchableOpacity style={[styles.button, styles.adminButton]}>
          <Text style={styles.buttonText}>系统配置</Text>
        </TouchableOpacity>
      </FeatureGuard>
      
      {/* 显示禁用状态而不是隐藏 */}
      <FeatureGuard 
        permissionKey="advanced.feature" 
        requiredLevel={PERMISSION_LEVELS.ADMIN}
        hideWhenNoPermission={false}
        showDisabled={true}
      >
        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.buttonText}>高级功能</Text>
        </TouchableOpacity>
      </FeatureGuard>
    </View>
  );
};

/**
 * 部门权限示例
 */
const DepartmentExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>部门权限示例</Text>
      
      {/* 只有HR部门成员才能看到 */}
      <DepartmentGuard departmentKey="hr">
        <View style={styles.departmentSection}>
          <Text style={styles.departmentTitle}>HR专用功能</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonText}>员工管理</Text>
          </TouchableOpacity>
        </View>
      </DepartmentGuard>
      
      {/* 只有IT部门的领导才能看到 */}
      <DepartmentGuard departmentKey="it" requireLeader={true}>
        <View style={styles.departmentSection}>
          <Text style={styles.departmentTitle}>IT领导功能</Text>
          <TouchableOpacity style={[styles.button, styles.adminButton]}>
            <Text style={styles.buttonText}>团队管理</Text>
          </TouchableOpacity>
        </View>
      </DepartmentGuard>
    </View>
  );
};

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  scrollView: {
    flex: 1
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  statusDisplay: {
    marginTop: 10
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 100
  },
  primaryButton: {
    backgroundColor: '#007AFF'
  },
  secondaryButton: {
    backgroundColor: '#34C759'
  },
  adminButton: {
    backgroundColor: '#FF9500'
  },
  disabledButton: {
    backgroundColor: '#E0E0E0'
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5
  },
  disabledButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500'
  },
  refreshButton: {
    marginLeft: 10
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    marginBottom: 8
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  userActions: {
    flexDirection: 'row'
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8
  },
  editButton: {
    backgroundColor: '#007AFF'
  },
  deleteButton: {
    backgroundColor: '#FF3B30'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500'
  },
  departmentSection: {
    padding: 15,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    marginBottom: 10
  },
  departmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  noAccessText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  permissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 10
  },
  permissionLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    flex: 1
  },
  noPermissionContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEAA7'
  },
  noPermissionText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center'
  },
  guestNotice: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7'
  },
  guestNoticeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center'
  },
  guestNoticeSubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginTop: 5
  }
});

export {
  UserManagementExample,
  SimpleFeatureExample,
  DepartmentExample
};

export default UserManagementExample;