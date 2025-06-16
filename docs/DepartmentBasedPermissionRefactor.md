# 权限系统重构：从用户权限到部门权限

## 概述

本次重构将权限认证系统从基于用户的权限判断改为基于部门的权限获取，简化了权限管理逻辑，提高了系统的可维护性和扩展性。

## 重构背景

### 原有系统问题
1. **复杂的权限继承**：用户权限需要同时考虑个人权限和部门权限
2. **数据冗余**：用户个人权限表（user_department_permissions）存在大量冗余数据
3. **维护困难**：权限变更需要同时更新多个表
4. **性能问题**：权限查询需要关联多个表，影响性能

### 新系统优势
1. **简化权限模型**：权限完全基于部门，逻辑清晰
2. **减少数据冗余**：移除用户个人权限表
3. **提高性能**：减少数据库查询和表关联
4. **便于管理**：权限管理集中在部门层面

## 核心变更

### 1. 数据库表结构变更

#### 保留的表
- `departments` - 部门表
- `user_departments` - 用户部门关联表
- `department_page_permissions` - 部门页面权限关联表
- `page_permissions` - 页面权限表
- `permission_modules` - 权限模块表

#### 可移除的表
- `user_department_permissions` - 用户部门权限表（不再需要）

### 2. 权限获取逻辑变更

#### 原有逻辑
```javascript
// 获取用户个人权限 + 部门权限
const [permissionsResult, departmentsResult] = await Promise.all([
  UserPermissionService.getUserEffectivePermissions(userId),
  UserPermissionService.getUserDepartments(userId)
]);
```

#### 新逻辑
```javascript
// 只获取用户部门，权限通过部门获取
const departmentsResult = await UserPermissionService.getUserDepartments(userId);
const departmentPermissions = await loadDepartmentPermissions(userDepartments);
```

### 3. 权限合并策略

当用户属于多个部门时，采用**最高权限级别**策略：
- 如果用户在部门A有某页面的读权限（级别1）
- 在部门B有同一页面的写权限（级别2）
- 则用户最终获得写权限（级别2）

## 代码变更详情

### 1. PermissionInitService.js

#### 主要变更
- 移除 `userPermissions` 字段
- 重构 `loadPermissionsFromServer` 方法
- 新增 `loadDepartmentPermissions` 方法
- 更新权限检查逻辑

#### 关键方法
```javascript
// 基于部门加载权限
async loadDepartmentPermissions() {
  const allPermissions = new Map();
  
  for (const department of this.userDepartments) {
    const deptPermissionsResult = await DepartmentService.getDepartmentPermissions(department.id);
    // 合并权限，取最高级别
  }
  
  this.accessiblePages = Array.from(allPermissions.values())
    .filter(p => p.route_path && p.permission_level > 0);
}
```

### 2. useAppPermissions.js

#### 主要变更
- 重构 `loadUserPermissions` 方法
- 新增 `loadDepartmentPermissions` 方法
- 更新缓存逻辑

### 3. API服务更新

#### DepartmentService
- 新增 `getDepartmentPermissions` 方法别名
- 保持向后兼容性

## 权限级别定义

```javascript
export const PERMISSION_LEVELS = {
  NONE: 0,      // 无权限
  READ: 1,      // 只读
  WRITE: 2,     // 读写
  ADMIN: 3      // 管理员
};
```

## 使用示例

### 1. 检查页面权限
```javascript
// 检查用户是否有访问某页面的权限
const hasAccess = permissionInitService.checkPagePermission('/dashboard', PERMISSION_LEVELS.READ);
```

### 2. 检查功能权限
```javascript
// 检查用户是否有某功能的权限
const canEdit = permissionInitService.checkFeaturePermission('data.edit', PERMISSION_LEVELS.WRITE);
```

### 3. 检查部门权限
```javascript
// 检查用户是否属于某部门
const isInDept = permissionInitService.checkDepartmentAccess('admin');
```

## 迁移指南

### 1. 数据库迁移

如果现有系统中 `user_department_permissions` 表有重要数据，建议：

1. **备份现有数据**
```sql
CREATE TABLE user_department_permissions_backup AS 
SELECT * FROM user_department_permissions;
```

2. **分析特殊权限**
```sql
-- 查找与部门权限不一致的用户特殊权限
SELECT udp.* FROM user_department_permissions udp
LEFT JOIN department_page_permissions dpp ON udp.department_id = dpp.department_id 
  AND udp.permission_id = dpp.permission_id
WHERE dpp.permission_level IS NULL 
  OR udp.permission_level != dpp.permission_level;
```

3. **调整部门权限**
根据分析结果，调整 `department_page_permissions` 表中的权限配置。

### 2. 应用程序迁移

1. **更新权限初始化**
```javascript
// 旧方式
await permissionInitService.initializeUserPermissions();

// 新方式（无变化，内部逻辑已更新）
await permissionInitService.initializeUserPermissions();
```

2. **更新权限检查**
```javascript
// 权限检查方法保持不变
const hasPermission = permissionInitService.checkPagePermission('/page', level);
```

## 性能优化

### 1. 缓存策略
- 部门权限数据缓存30分钟
- 用户权限信息本地存储
- 支持强制刷新机制

### 2. 查询优化
- 减少数据库表关联
- 批量获取部门权限
- 内存中合并权限数据

## 测试建议

### 1. 单元测试
- 测试部门权限加载
- 测试权限合并逻辑
- 测试权限检查方法

### 2. 集成测试
- 测试多部门用户权限
- 测试权限缓存机制
- 测试权限更新流程

### 3. 性能测试
- 对比重构前后的权限加载时间
- 测试大量用户并发权限检查
- 验证内存使用情况

## 注意事项

1. **向后兼容性**：现有的权限检查API保持不变
2. **数据一致性**：确保部门权限配置正确
3. **缓存更新**：部门权限变更后需要清除相关缓存
4. **错误处理**：增强部门权限获取失败的处理逻辑

## 总结

本次重构简化了权限系统架构，提高了系统性能和可维护性。通过基于部门的权限管理，使权限配置更加集中和统一，减少了数据冗余和维护成本。

重构后的系统更加符合实际业务场景，因为在大多数情况下，用户的权限确实是由其所属部门决定的，个人特殊权限的需求相对较少。