import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRole } from '../hooks/useRole';

/**
 * 角色徽章组件
 * 显示用户角色信息的可视化组件
 */
const RoleBadge = ({ 
  userId = null, 
  roleId = null, 
  showIcon = true, 
  size = 'medium',
  style = {},
  textStyle = {}
}) => {
  const { roleInfo, roleName, isAdmin, isDeptAdmin } = useRole();

  // 如果指定了roleId，使用指定的角色信息
  const displayRoleId = roleId || roleInfo.roleId || 9;
  const displayRoleName = roleId ? getRoleNameById(roleId) : roleName;
  const displayIsAdmin = roleId ? getRoleInfoById(roleId).isAdmin : isAdmin;
  const displayIsDeptAdmin = roleId ? getRoleInfoById(roleId).isDeptAdmin : isDeptAdmin;

  // 根据角色ID获取角色名称
  function getRoleNameById(id) {
    const ROLE_MAPPING = {
      1: '超级管理员',
      2: '系统管理员', 
      3: '部门管理员',
      4: '技术人员',
      5: '操作员',
      6: '查看者',
      7: '客户',
      8: '访客',
      9: '普通用户'
    };
    return ROLE_MAPPING[id] || '普通用户';
  }

  // 根据角色ID获取角色信息
  function getRoleInfoById(id) {
    const ROLE_MAPPING = {
      1: { name: '超级管理员', isAdmin: true, isDeptAdmin: false },
      2: { name: '系统管理员', isAdmin: true, isDeptAdmin: false },
      3: { name: '部门管理员', isAdmin: false, isDeptAdmin: true },
      4: { name: '技术人员', isAdmin: false, isDeptAdmin: false },
      5: { name: '操作员', isAdmin: false, isDeptAdmin: false },
      6: { name: '查看者', isAdmin: false, isDeptAdmin: false },
      7: { name: '客户', isAdmin: false, isDeptAdmin: false },
      8: { name: '访客', isAdmin: false, isDeptAdmin: false },
      9: { name: '普通用户', isAdmin: false, isDeptAdmin: false }
    };
    return ROLE_MAPPING[id] || ROLE_MAPPING[9];
  }

  // 获取角色颜色
  const getRoleColor = () => {
    if (displayIsAdmin) return '#e74c3c'; // 红色 - 管理员
    if (displayIsDeptAdmin) return '#f39c12'; // 橙色 - 部门管理员
    if (displayRoleId <= 4) return '#3498db'; // 蓝色 - 技术人员
    if (displayRoleId <= 6) return '#2ecc71'; // 绿色 - 操作员/查看者
    return '#95a5a6'; // 灰色 - 其他
  };

  // 获取角色图标
  const getRoleIcon = () => {
    if (displayIsAdmin) return '👑'; // 管理员
    if (displayIsDeptAdmin) return '🏢'; // 部门管理员
    if (displayRoleId <= 4) return '🔧'; // 技术人员
    if (displayRoleId <= 6) return '👤'; // 操作员/查看者
    return '👥'; // 其他
  };

  // 获取尺寸样式
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: 10
        };
      case 'large':
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 16
        };
      default: // medium
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 12
        };
    }
  };

  const sizeStyle = getSizeStyle();
  const roleColor = getRoleColor();
  const roleIcon = getRoleIcon();

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: roleColor,
        paddingHorizontal: sizeStyle.paddingHorizontal,
        paddingVertical: sizeStyle.paddingVertical
      },
      style
    ]}>
      {showIcon && (
        <Text style={[
          styles.icon,
          { fontSize: sizeStyle.fontSize }
        ]}>
          {roleIcon}
        </Text>
      )}
      <Text style={[
        styles.text,
        {
          fontSize: sizeStyle.fontSize,
          marginLeft: showIcon ? 4 : 0
        },
        textStyle
      ]}>
        {displayRoleName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  icon: {
    color: '#ffffff'
  },
  text: {
    color: '#ffffff',
    fontWeight: '600'
  }
});

export default RoleBadge;

// 便捷的角色徽章组件
export const AdminBadge = (props) => (
  <RoleBadge {...props} roleId={1} />
);

export const DeptAdminBadge = (props) => (
  <RoleBadge {...props} roleId={3} />
);

export const TechnicianBadge = (props) => (
  <RoleBadge {...props} roleId={4} />
);

export const OperatorBadge = (props) => (
  <RoleBadge {...props} roleId={5} />
);

export const ViewerBadge = (props) => (
  <RoleBadge {...props} roleId={6} />
);