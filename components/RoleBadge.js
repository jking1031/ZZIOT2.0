import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
/**
 * 角色徽章组件
 * 显示用户角色信息的可视化组件
 */
const RoleBadge = ({ 
  roleId = null,
  roleObject = null, // 新增：支持角色对象
  showIcon = true, 
  size = 'medium',
  style = {},
  textStyle = {}
}) => {
  // 处理不同的角色数据源
  let displayRoleName;

  if (roleObject && typeof roleObject === 'object') {
    // 优先使用传入的角色对象
    displayRoleName = roleObject.name || (roleObject.id ? `角色 (ID: ${roleObject.id})` : '未知角色');
  } else if (roleId) {
    // 如果只传入 roleId，则显示 ID
    displayRoleName = `角色 (ID: ${roleId})`;
  } else {
    // 默认显示为普通用户
    displayRoleName = '普通用户';
  }

  // 获取角色颜色
  const getRoleColor = () => {
    // 根据 displayRoleName 决定颜色
    if (displayRoleName === '超级管理员' || displayRoleName === '系统管理员' || displayRoleName === '管理员') return '#e74c3c'; // 红色 - 管理员
    if (displayRoleName === '部门管理员') return '#f39c12'; // 橙色 - 部门管理员
    // 更多颜色逻辑可以根据新的权限系统添加，例如基于部门角色
    // 示例：if (displayRoleName.startsWith('部门')) return '#2980b9'; // 蓝色 - 部门相关角色
    return '#95a5a6'; // 灰色 - 其他
  };

  // 获取角色图标
  const getRoleIcon = () => {
    // 根据 displayRoleName 决定图标
    if (displayRoleName === '超级管理员' || displayRoleName === '系统管理员' || displayRoleName === '管理员') return '👑'; // 管理员
    if (displayRoleName === '部门管理员') return '🏢'; // 部门管理员
    // 更多图标逻辑可以根据新的权限系统添加
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

// 便捷的角色徽章组件 - 基于新的逻辑调整或移除
// 考虑到 roleId 不再直接映射到特定角色名称，这些便捷组件可能需要调整
// 例如，可以改为传递 roleObject 或特定的 isAdmin/isDeptAdmin 标志

// 示例：如果仍需 AdminBadge，可以这样定义（假设管理员角色对象有特定属性）
export const AdminBadge = (props) => (
  <RoleBadge {...props} roleObject={{ name: '管理员', isAdmin: true }} />
);

// 其他便捷徽章可以类似调整或移除，取决于新权限系统的设计
// 如果不再需要基于固定ID的便捷徽章，可以移除以下组件：
// export const DeptAdminBadge = (props) => (
//   <RoleBadge {...props} roleObject={{ name: '部门管理员', isDeptAdmin: true }} />
// );
// export const TechnicianBadge = (props) => (
//   <RoleBadge {...props} roleObject={{ name: '技术人员' }} />
// );
// export const OperatorBadge = (props) => (
//   <RoleBadge {...props} roleObject={{ name: '操作员' }} />
// );
// export const ViewerBadge = (props) => (
//   <RoleBadge {...props} roleObject={{ name: '查看者' }} />
// );