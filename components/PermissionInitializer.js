/**
 * 权限初始化组件
 * 在应用级别初始化权限控制系统，包括定时刷新功能
 */

import React, { useEffect } from 'react';
import { usePermissionControl } from '../hooks/usePermissionControl';

/**
 * 权限初始化组件
 * 该组件不渲染任何UI，仅用于在应用级别初始化权限控制系统
 */
export const PermissionInitializer = ({ children }) => {
  // 使用权限控制Hook，这将触发定时刷新功能
  const { initialized, loading } = usePermissionControl();

  useEffect(() => {
    console.log('[PermissionInitializer] 权限系统初始化状态:', {
      initialized,
      loading
    });
  }, [initialized, loading]);

  // 直接返回子组件，不影响应用的正常渲染
  return children;
};

export default PermissionInitializer;