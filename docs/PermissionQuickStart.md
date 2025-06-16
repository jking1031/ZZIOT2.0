# 权限系统快速开始指南

## 概述

本指南将帮助您快速上手使用新的部门权限控制系统。通过简单的几个步骤，您就可以在现有页面中添加权限控制功能。

## 快速开始

### 1. 基础导入

在您的组件文件中导入所需的权限控制组件和Hook：

```javascript
// 导入权限控制组件
import {
  PageGuard,
  FeatureGuard,
  DepartmentGuard
} from '../components/PermissionControlComponents';

// 导入权限控制Hook
import {
  usePermissionControl,
  PERMISSION_LEVELS
} from '../hooks/usePermissionControl';
```

### 2. 页面级权限保护

使用 `PageGuard` 组件保护整个页面：

```javascript
const MyScreen = () => {
  return (
    <PageGuard 
      routePath="/my-screen" 
      requiredLevel={PERMISSION_LEVELS.READ}
    >
      {/* 您的页面内容 */}
      <View>
        <Text>受保护的页面内容</Text>
      </View>
    </PageGuard>
  );
};
```

### 3. 功能级权限控制

使用 `FeatureGuard` 组件保护特定功能：

```javascript
const MyComponent = () => {
  return (
    <View>
      {/* 只有具有写权限的用户才能看到这个按钮 */}
      <FeatureGuard 
        permissionKey="user.create" 
        requiredLevel={PERMISSION_LEVELS.WRITE}
      >
        <TouchableOpacity onPress={handleCreate}>
          <Text>创建用户</Text>
        </TouchableOpacity>
      </FeatureGuard>
      
      {/* 只有管理员才能看到这个按钮 */}
      <FeatureGuard 
        permissionKey="user.delete" 
        requiredLevel={PERMISSION_LEVELS.ADMIN}
      >
        <TouchableOpacity onPress={handleDelete}>
          <Text>删除用户</Text>
        </TouchableOpacity>
      </FeatureGuard>
    </View>
  );
};
```

### 4. 部门级权限控制

使用 `DepartmentGuard` 组件控制部门特定功能：

```javascript
const DepartmentFeatures = () => {
  return (
    <View>
      {/* 只有HR部门成员才能看到 */}
      <DepartmentGuard departmentKey="hr">
        <TouchableOpacity onPress={handleHRFunction}>
          <Text>HR专用功能</Text>
        </TouchableOpacity>
      </DepartmentGuard>
      
      {/* 只有IT部门的领导才能看到 */}
      <DepartmentGuard departmentKey="it" requireLeader={true}>
        <TouchableOpacity onPress={handleITLeaderFunction}>
          <Text>IT领导功能</Text>
        </TouchableOpacity>
      </DepartmentGuard>
    </View>
  );
};
```

## 常用权限键值

### 用户管理权限
```javascript
const USER_PERMISSIONS = {
  LIST: 'user.list',      // 查看用户列表
  CREATE: 'user.create',  // 创建用户
  EDIT: 'user.edit',      // 编辑用户
  DELETE: 'user.delete',  // 删除用户
  EXPORT: 'user.export'   // 导出用户
};
```

### 系统管理权限
```javascript
const SYSTEM_PERMISSIONS = {
  CONFIG: 'system.config',     // 系统配置
  MONITOR: 'system.monitor',   // 系统监控
  BACKUP: 'system.backup',     // 数据备份
  LOG: 'system.log'            // 日志查看
};
```

### 数据管理权限
```javascript
const DATA_PERMISSIONS = {
  VIEW: 'data.view',       // 查看数据
  EDIT: 'data.edit',       // 编辑数据
  DELETE: 'data.delete',   // 删除数据
  EXPORT: 'data.export',   // 导出数据
  IMPORT: 'data.import'    // 导入数据
};
```

## 权限级别说明

```javascript
const PERMISSION_LEVELS = {
  NONE: 0,    // 无权限 - 完全无法访问
  READ: 1,    // 只读权限 - 可以查看但不能修改
  WRITE: 2,   // 读写权限 - 可以查看和修改
  ADMIN: 3    // 管理员权限 - 完全控制权限
};
```

## 实际应用示例

### 示例1: 用户管理页面

```javascript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList
} from 'react-native';
import {
  PageGuard,
  FeatureGuard
} from '../components/PermissionControlComponents';
import { PERMISSION_LEVELS } from '../hooks/usePermissionControl';

const UserManagementScreen = () => {
  const users = [
    { id: 1, name: '张三', role: '开发工程师' },
    { id: 2, name: '李四', role: 'HR专员' }
  ];
  
  const handleCreateUser = () => {
    console.log('创建用户');
  };
  
  const handleEditUser = (user) => {
    console.log('编辑用户:', user.name);
  };
  
  const handleDeleteUser = (user) => {
    console.log('删除用户:', user.name);
  };
  
  return (
    <PageGuard 
      routePath="/user-management" 
      requiredLevel={PERMISSION_LEVELS.READ}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          用户管理
        </Text>
        
        {/* 创建用户按钮 - 需要写权限 */}
        <FeatureGuard 
          permissionKey="user.create" 
          requiredLevel={PERMISSION_LEVELS.WRITE}
        >
          <TouchableOpacity 
            style={{ backgroundColor: '#007AFF', padding: 10, borderRadius: 5, marginBottom: 20 }}
            onPress={handleCreateUser}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>创建用户</Text>
          </TouchableOpacity>
        </FeatureGuard>
        
        {/* 用户列表 */}
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 15,
              backgroundColor: '#f0f0f0',
              marginBottom: 10,
              borderRadius: 5
            }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                <Text style={{ color: '#666' }}>{item.role}</Text>
              </View>
              
              <View style={{ flexDirection: 'row' }}>
                {/* 编辑按钮 - 需要写权限 */}
                <FeatureGuard 
                  permissionKey="user.edit" 
                  requiredLevel={PERMISSION_LEVELS.WRITE}
                >
                  <TouchableOpacity 
                    style={{ backgroundColor: '#34C759', padding: 8, borderRadius: 3, marginRight: 10 }}
                    onPress={() => handleEditUser(item)}
                  >
                    <Text style={{ color: 'white', fontSize: 12 }}>编辑</Text>
                  </TouchableOpacity>
                </FeatureGuard>
                
                {/* 删除按钮 - 需要管理员权限 */}
                <FeatureGuard 
                  permissionKey="user.delete" 
                  requiredLevel={PERMISSION_LEVELS.ADMIN}
                >
                  <TouchableOpacity 
                    style={{ backgroundColor: '#FF3B30', padding: 8, borderRadius: 3 }}
                    onPress={() => handleDeleteUser(item)}
                  >
                    <Text style={{ color: 'white', fontSize: 12 }}>删除</Text>
                  </TouchableOpacity>
                </FeatureGuard>
              </View>
            </View>
          )}
        />
      </View>
    </PageGuard>
  );
};

export default UserManagementScreen;
```

### 示例2: 设置页面

```javascript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import {
  PageGuard,
  FeatureGuard,
  DepartmentGuard
} from '../components/PermissionControlComponents';
import { PERMISSION_LEVELS } from '../hooks/usePermissionControl';

const SettingsScreen = () => {
  return (
    <PageGuard 
      routePath="/settings" 
      requiredLevel={PERMISSION_LEVELS.READ}
    >
      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          系统设置
        </Text>
        
        {/* 基础设置 - 所有用户都可以看到 */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>基础设置</Text>
          <TouchableOpacity style={{ padding: 15, backgroundColor: '#f0f0f0', marginBottom: 10, borderRadius: 5 }}>
            <Text>个人资料</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 15, backgroundColor: '#f0f0f0', marginBottom: 10, borderRadius: 5 }}>
            <Text>通知设置</Text>
          </TouchableOpacity>
        </View>
        
        {/* 系统管理 - 需要管理员权限 */}
        <FeatureGuard 
          permissionKey="system.config" 
          requiredLevel={PERMISSION_LEVELS.ADMIN}
        >
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>系统管理</Text>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#fff3cd', marginBottom: 10, borderRadius: 5 }}>
              <Text>系统配置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#fff3cd', marginBottom: 10, borderRadius: 5 }}>
              <Text>用户管理</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#fff3cd', marginBottom: 10, borderRadius: 5 }}>
              <Text>权限管理</Text>
            </TouchableOpacity>
          </View>
        </FeatureGuard>
        
        {/* HR部门专用设置 */}
        <DepartmentGuard departmentKey="hr">
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>HR设置</Text>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#e3f2fd', marginBottom: 10, borderRadius: 5 }}>
              <Text>员工档案设置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#e3f2fd', marginBottom: 10, borderRadius: 5 }}>
              <Text>薪资设置</Text>
            </TouchableOpacity>
          </View>
        </DepartmentGuard>
        
        {/* IT部门专用设置 */}
        <DepartmentGuard departmentKey="it">
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>IT设置</Text>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#f3e5f5', marginBottom: 10, borderRadius: 5 }}>
              <Text>系统监控</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 15, backgroundColor: '#f3e5f5', marginBottom: 10, borderRadius: 5 }}>
              <Text>数据备份</Text>
            </TouchableOpacity>
            
            {/* IT部门领导专用 */}
            <DepartmentGuard departmentKey="it" requireLeader={true}>
              <TouchableOpacity style={{ padding: 15, backgroundColor: '#ffebee', marginBottom: 10, borderRadius: 5 }}>
                <Text>服务器管理 (领导专用)</Text>
              </TouchableOpacity>
            </DepartmentGuard>
          </View>
        </DepartmentGuard>
      </ScrollView>
    </PageGuard>
  );
};

export default SettingsScreen;
```

## 动态权限检查

有时您需要在代码中动态检查权限，而不是使用组件：

```javascript
import React from 'react';
import { Alert } from 'react-native';
import { usePermissionControl, PERMISSION_LEVELS } from '../hooks/usePermissionControl';

const MyComponent = () => {
  const { checkFeaturePermission, isGuest } = usePermissionControl();
  
  const handleSensitiveAction = async () => {
    // 动态检查权限
    const hasPermission = await checkFeaturePermission('data.delete', PERMISSION_LEVELS.ADMIN);
    
    if (hasPermission) {
      // 执行敏感操作
      performSensitiveAction();
    } else {
      Alert.alert('权限不足', '您没有执行此操作的权限');
    }
  };
  
  const performSensitiveAction = () => {
    console.log('执行敏感操作');
  };
  
  return (
    <View>
      {isGuest && (
        <Text style={{ color: 'orange', marginBottom: 10 }}>
          ⚠️ 您当前以访客身份访问，功能受限
        </Text>
      )}
      <TouchableOpacity onPress={handleSensitiveAction}>
        <Text>执行敏感操作</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 常见问题

### Q: 如何处理权限加载中的状态？

A: 权限组件会自动处理加载状态，显示加载指示器。您也可以使用Hook检查加载状态：

```javascript
const { loading, initialized } = usePermissionControl();

if (loading) {
  return <ActivityIndicator size="large" />;
}

if (!initialized) {
  return <Text>权限未初始化</Text>;
}
```

### Q: 如何自定义无权限时的显示内容？

A: 使用 `fallback` 属性：

```javascript
<FeatureGuard 
  permissionKey="user.delete" 
  requiredLevel={PERMISSION_LEVELS.ADMIN}
  fallback={
    <TouchableOpacity disabled style={{ opacity: 0.5 }}>
      <Text>删除 (无权限)</Text>
    </TouchableOpacity>
  }
>
  <TouchableOpacity onPress={handleDelete}>
    <Text>删除</Text>
  </TouchableOpacity>
</FeatureGuard>
```

### Q: 如何刷新权限？

A: 使用权限控制Hook的刷新方法：

```javascript
const { refreshPermissions } = usePermissionControl();

const handleRefresh = async () => {
  await refreshPermissions();
  Alert.alert('权限已刷新');
};
```

### Q: 如何处理网络错误？

A: 系统会自动处理网络错误，在无法获取权限时会：
1. 尝试使用缓存的权限数据
2. 如果没有缓存，则降级为访客权限
3. 记录错误日志但不影响用户体验

## 最佳实践

1. **权限键值命名**: 使用清晰的命名规范，如 `模块.操作` (例: `user.create`, `system.config`)

2. **权限级别选择**: 
   - 查看功能使用 `READ`
   - 创建/编辑功能使用 `WRITE`
   - 删除/管理功能使用 `ADMIN`

3. **错误处理**: 总是为权限检查提供合适的fallback

4. **性能优化**: 对于频繁检查的权限，考虑使用缓存

5. **用户体验**: 为无权限状态提供清晰的提示信息

## 下一步

- 查看 [完整应用方案文档](./PermissionApplicationGuide.md) 了解更多高级功能
- 查看 [权限使用示例](../examples/PermissionUsageExample.js) 了解更多实际应用
- 根据您的具体需求配置权限键值和部门设置

现在您已经掌握了权限系统的基本使用方法，可以开始在您的应用中添加权限控制了！