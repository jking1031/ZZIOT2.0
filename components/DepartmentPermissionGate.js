import React from 'react';
import { useDepartmentPermission } from '../hooks/useDepartmentPermission';
import { Spin, Alert } from 'antd'; // Assuming Spin and Alert might be needed for loading/login states
import { LoadingOutlined } from '@ant-design/icons'; // Assuming LoadingOutlined might be needed

/**
 * 部门权限门组件
 * 基于用户部门及角色权限控制子组件的渲染
 */
const DepartmentPermissionGate = ({ 
  children, 
  pagePermission, // Renamed for clarity, aligns with previous version's intent
  buttonPermission, // Renamed for clarity
  pageMatchMode = 'any', // 'any' or 'all', aligns with previous version's intent
  buttonMatchMode = 'any', // 'any' or 'all', aligns with previous version's intent
  fallback = null,
  showLoginReminder = true, // Aligns with previous version's prop
  // requireLogin, showFallbackForAdmin, requireAnyPage, requireAnyButton, requireAllPages, requireAllButtons are effectively replaced or handled by the hook / new logic
}) => {
  const { 
    loading, // Added from the hook
    isLoggedIn, 
    isSuperAdmin, // Use isSuperAdmin from the updated hook
    hasPagePermission, // These functions are now role-aware from the hook
    hasButtonPermission,
    hasAnyPagePermission,
    hasAllPagePermissions,
    hasAnyButtonPermission,
    hasAllButtonPermissions,
    // getPermissionSummary // Available from hook if needed for debugging
  } = useDepartmentPermission();

  if (loading) {
    return <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="加载权限中..." />;
  }

  if (!isLoggedIn && showLoginReminder) {
    return fallback || <Alert message="请先登录" type="warning" showIcon />;
  }
  if (!isLoggedIn && !showLoginReminder) {
    return fallback; // Return fallback if login is required but reminder is off
  }

  // The hook's permission checking functions (hasPagePermission, etc.)
  // already account for isSuperAdmin, so no separate check like `if (isSuperAdmin) return children;` is needed here
  // unless a specific prop like `showFallbackForAdmin` (if kept) would override it.
  // For simplicity and consistency with the hook, direct super admin bypass here is removed.

  let hasRequiredPagePermission = true;
  if (pagePermission) {
    const permissions = Array.isArray(pagePermission) ? pagePermission : [pagePermission];
    if (permissions.length > 0) {
        if (Array.isArray(pagePermission)) {
            hasRequiredPagePermission = pageMatchMode === 'all'
            ? hasAllPagePermissions(pagePermission)
            : hasAnyPagePermission(pagePermission);
        } else {
            hasRequiredPagePermission = hasPagePermission(pagePermission);
        }
    }
  }

  let hasRequiredButtonPermission = true;
  if (buttonPermission) {
    const permissions = Array.isArray(buttonPermission) ? buttonPermission : [buttonPermission];
    if (permissions.length > 0) {
        if (Array.isArray(buttonPermission)) {
            hasRequiredButtonPermission = buttonMatchMode === 'all'
            ? hasAllButtonPermissions(buttonPermission)
            : hasAnyButtonPermission(buttonPermission);
        } else {
            hasRequiredButtonPermission = hasButtonPermission(buttonPermission);
        }
    }
  }

  if (hasRequiredPagePermission && hasRequiredButtonPermission) {
    return <>{children}</>;
  }

  return fallback;
};

export default DepartmentPermissionGate;

// 便捷的页面权限组件
export const PagePermissionGate = ({ 
  pagePermission, // Prop name aligned with DepartmentPermissionGate
  pageMatchMode = 'any', // Prop name aligned
  children, 
  fallback = null,
  showLoginReminder = true 
}) => {
  return (
    <DepartmentPermissionGate 
      pagePermission={pagePermission}
      pageMatchMode={pageMatchMode}
      buttonPermission={undefined} // Explicitly no button permission check
      fallback={fallback}
      showLoginReminder={showLoginReminder}
    >
      {children}
    </DepartmentPermissionGate>
  );
};

// 便捷的按钮权限组件
export const ButtonPermissionGate = ({ 
  buttonPermission, // Prop name aligned
  buttonMatchMode = 'any', // Prop name aligned
  children, 
  fallback = null,
  showLoginReminder = true
}) => {
  return (
    <DepartmentPermissionGate 
      buttonPermission={buttonPermission}
      buttonMatchMode={buttonMatchMode}
      pagePermission={undefined} // Explicitly no page permission check
      fallback={fallback}
      showLoginReminder={showLoginReminder}
    >
      {children}
    </DepartmentPermissionGate>
  );
};

// 混合权限组件（同时检查页面和按钮权限）
export const MixedPermissionGate = ({ 
  pagePermission, 
  buttonPermission, 
  pageMatchMode = 'any',
  buttonMatchMode = 'any',
  children, 
  fallback = null,
  showLoginReminder = true
}) => {
  return (
    <DepartmentPermissionGate 
      pagePermission={pagePermission}
      buttonPermission={buttonPermission}
      pageMatchMode={pageMatchMode}
      buttonMatchMode={buttonMatchMode}
      fallback={fallback}
      showLoginReminder={showLoginReminder}
    >
      {children}
    </DepartmentPermissionGate>
  );
};

// 部门专用组件（检查用户是否属于特定部门，并拥有任何权限）
// This component's logic might need further refinement based on exact requirements for "department only" access.
// The current hook (`useDepartmentPermission`) determines permissions based on department AND role.
// A simple department check might conflict if a user is in the department but has a role with NO permissions.
export const DepartmentOnlyGate = ({ 
  // allowedDepartments, // This prop might be less relevant now if access is purely role-based within a department
  children, 
  fallback = null,
  showLoginReminder = true 
}) => {
  const { departmentInfo, isLoggedIn, loading, isSuperAdmin, permissions } = useDepartmentPermission();
  
  if (loading) return <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="加载中..." />;
  if (!isLoggedIn && showLoginReminder) return fallback || <Alert message="请先登录" type="warning" showIcon />;
  if (!isLoggedIn && !showLoginReminder) return fallback;

  // Super admin always has access in this context
  if (isSuperAdmin) return <>{children}</>;

  // Check if the user has a department and any permissions assigned
  // This implies they are part of a department with some level of access.
  if (departmentInfo && departmentInfo.name && permissions && (permissions.pages.length > 0 || permissions.buttons.length > 0)) {
    // If `allowedDepartments` were to be used, you'd check `allowedDepartments.includes(departmentInfo.name)` here.
    return <>{children}</>;
  }
  
  return fallback;
};

// 权限信息显示组件
export const PermissionInfo = ({ /* showDetails prop removed for simplification, can be re-added */ }) => {
  const { permissionSummary, loading, user } = useDepartmentPermission(); // Added user for more info
  
  if (loading) {
    return <Spin size="small" />;
  }

  // permissionSummary from the hook is now an object with a summaryText field or the full object
  const summaryToDisplay = permissionSummary?.summaryText || JSON.stringify(permissionSummary, null, 2);
  const userInfo = user || { username: 'N/A', name: 'N/A', role_name: 'N/A' }; // Fallback for user info

  return (
    <div style={{ padding: '8px', backgroundColor: '#f0f0f0', border: '1px solid #d9d9d9', borderRadius: '4px', marginTop: '10px' }}>
      <p style={{ margin: 0, fontWeight: 'bold' }}>用户信息:</p>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {`用户名: ${userInfo.username}`}
        {`\n姓名: ${userInfo.name || '未设置'}`}
        {`\n部门: ${permissionSummary?.department?.name || '未分配'}`}
        {`\n角色: ${userInfo.role_name || '未分配'}`}
        {`\n超级管理员: ${permissionSummary?.isSuperAdmin ? '是' : '否'}`}
      </pre>
      <p style={{ marginTop: '8px', fontWeight: 'bold' }}>权限摘要:</p>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {summaryToDisplay}
      </pre>
      {/* Detailed permission sections moved inside the main returned div */}
      <div style={{ marginTop: '10px', marginBottom: 10 }}>
        <h4>部门信息</h4>
        <p><strong>部门:</strong> {permissionSummary?.department?.name || 'N/A'}</p>
        <p><strong>描述:</strong> {permissionSummary?.department?.info?.description || 'N/A'}</p>
      </div>
      
      <div style={{ marginBottom: 10 }}>
        <h4>页面权限 ({(permissionSummary?.permissions?.pageCount || 0)})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(permissionSummary?.permissions?.pages || []).map(page => (
            <span key={page} style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '2px 8px', 
              borderRadius: 3, 
              fontSize: 12 
            }}>
              {page}
            </span>
          ))}
        </div>
      </div>
      
      <div>
        <h4>功能权限 ({(permissionSummary?.permissions?.buttonCount || 0)})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(permissionSummary?.permissions?.buttons || []).map(button => (
            <span key={button} style={{ 
              backgroundColor: '#e8f5e8', 
              padding: '2px 8px', 
              borderRadius: 3, 
              fontSize: 12 
            }}>
              {button}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
