# 基于用户部门信息的权限获取流程

## 概述

本文档描述了权限系统的最新变更：不再使用独立的用户部门信息表和用户部门权限表，而是直接从用户信息中的部门字段通过Node-RED查询部门权限表，将查询结果返回给前端。

## 新的权限获取流程

### 1. 数据流程图

```
用户登录 → 获取用户信息 → 提取部门字段 → 调用Node-RED API → 查询部门权限表 → 返回权限数据 → 前端缓存
```

### 2. 详细流程

#### 步骤1：用户信息获取
- 用户登录后，系统获取用户基本信息
- 用户信息中包含部门字段（可能是字符串或数组格式）
- 部门信息格式示例：
  ```javascript
  // 字符串格式
  user.department = "技术部"
  
  // 数组格式
  user.departments = ["技术部", "管理部"]
  
  // 对象数组格式
  user.departments = [
    { name: "技术部", role: "member" },
    { name: "管理部", role: "leader" }
  ]
  ```

#### 步骤2：权限查询
- 前端调用新的API：`UserDepartmentPermissionService.getUserPermissionsByDepartment(userDepartments)`
- 该API会：
  1. 解析用户部门信息（支持多种格式）
  2. 为每个部门调用Node-RED接口查询权限
  3. 合并多个部门的权限（取最高权限级别）
  4. 返回统一的权限数据格式

#### 步骤3：权限合并策略
当用户属于多个部门时：
- 对于同一页面/功能的权限，取最高权限级别
- 权限级别：0(无权限) < 1(只读) < 2(读写) < 3(管理员)
- 示例：
  ```javascript
  // 用户在技术部有某页面的读权限(1)，在管理部有写权限(2)
  // 最终用户获得写权限(2)
  ```

## API变更

### 新增API方法

#### 1. `getDepartmentPermissionsByName(departmentName)`
根据部门名称获取部门权限

```javascript
// 调用示例
const result = await DepartmentService.getDepartmentPermissionsByName('技术部');

// 返回格式
{
  success: true,
  data: [
    {
      permission_key: 'data.view',
      permission_name: '数据查看',
      route_path: '/data',
      module_name: '数据管理',
      permission_level: 2
    }
  ],
  message: '获取部门权限成功',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### 2. `getUserPermissionsByDepartment(userDepartments)`
根据用户部门信息获取权限

```javascript
// 调用示例
const result = await UserDepartmentPermissionService.getUserPermissionsByDepartment(['技术部', '管理部']);

// 返回格式
{
  success: true,
  data: [
    {
      permission_key: 'data.view',
      permission_name: '数据查看',
      route_path: '/data',
      module_name: '数据管理',
      permission_level: 2,
      department_name: '技术部'
    }
  ],
  departments: [
    {
      department: '技术部',
      result: { success: true, data: [...] }
    },
    {
      department: '管理部', 
      result: { success: true, data: [...] }
    }
  ],
  message: '成功获取 5 个权限',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

### Node-RED API端点

需要在Node-RED中创建以下新的API端点：

#### 1. `GET /api/department-permissions-by-name/{departmentName}`
根据部门名称查询权限

```sql
-- 对应的SQL查询
SELECT 
  pp.permission_key,
  pp.permission_name,
  pp.route_path,
  pm.module_name,
  dpp.permission_level
FROM department_page_permissions dpp
JOIN departments d ON dpp.department_id = d.id
JOIN page_permissions pp ON dpp.permission_id = pp.id
JOIN permission_modules pm ON pp.module_id = pm.id
WHERE d.department_name = ? AND dpp.permission_level > 0
ORDER BY pp.route_path;
```

## 代码变更示例

### 1. 权限初始化服务变更

```javascript
// 旧方式
async initializeUserPermissions(userId, forceRefresh = false) {
  // 获取用户部门信息
  const departmentsResult = await UserPermissionService.getUserDepartments(userId);
  // 基于部门ID获取权限
  await this.loadDepartmentPermissions();
}

// 新方式
async initializeUserPermissions(userId, userDepartments, forceRefresh = false) {
  // 直接使用用户信息中的部门字段
  await this.loadDepartmentPermissions(userDepartments);
}
```

### 2. Hook使用变更

```javascript
// 旧方式
const loadUserPermissions = useCallback(async (userId, forceRefresh = false) => {
  const departmentsResult = await UserPermissionService.getUserDepartments(userId);
  const departmentPermissions = await loadDepartmentPermissions(userDepartments);
}, []);

// 新方式
const loadUserPermissions = useCallback(async (userId, userDepartments, forceRefresh = false) => {
  const permissionsResult = await UserDepartmentPermissionService.getUserPermissionsByDepartment(userDepartments);
}, []);
```

## 数据库表变更

### 不再需要的表
- `user_departments` - 用户部门关联表
- `user_department_permissions` - 用户部门权限表

### 保留的表
- `departments` - 部门表
- `department_page_permissions` - 部门页面权限关联表
- `page_permissions` - 页面权限表
- `permission_modules` - 权限模块表

### 数据迁移建议

如果现有系统中有重要的用户部门关联数据，建议：

1. **备份现有数据**
```sql
CREATE TABLE user_departments_backup AS SELECT * FROM user_departments;
CREATE TABLE user_department_permissions_backup AS SELECT * FROM user_department_permissions;
```

2. **更新用户信息表**
```sql
-- 在用户表中添加部门字段（如果不存在）
ALTER TABLE users ADD COLUMN departments VARCHAR(500);

-- 将用户部门关联数据迁移到用户表
UPDATE users u SET departments = (
  SELECT GROUP_CONCAT(d.department_name) 
  FROM user_departments ud 
  JOIN departments d ON ud.department_id = d.id 
  WHERE ud.ruoyi_user_id = u.ruoyi_user_id
);
```

## 优势

### 1. 简化架构
- 减少数据库表关联
- 降低查询复杂度
- 提高系统性能

### 2. 提高灵活性
- 支持多种部门信息格式
- 便于与外部系统集成
- 减少数据同步问题

### 3. 降低维护成本
- 减少数据冗余
- 简化权限管理流程
- 降低数据一致性维护难度

## 注意事项

### 1. 用户信息格式
- 确保用户信息中包含正确的部门字段
- 部门名称必须与数据库中的部门名称完全匹配
- 支持多种格式，但建议统一格式

### 2. 缓存策略
- 权限数据仍然会被缓存30分钟
- 部门权限变更后需要清除相关缓存
- 用户部门变更后需要重新获取权限

### 3. 错误处理
- 当部门名称不存在时，该部门的权限为空
- 当所有部门都无权限时，用户获得访客权限
- 网络错误时使用缓存数据

### 4. 性能考虑
- 对于多部门用户，会发起多个API请求
- 建议在Node-RED端实现批量查询优化
- 考虑实现部门权限的预加载机制

## 测试建议

### 1. 单元测试
- 测试不同格式的用户部门信息解析
- 测试权限合并逻辑
- 测试错误处理机制

### 2. 集成测试
- 测试完整的权限获取流程
- 测试多部门用户的权限合并
- 测试缓存机制

### 3. 性能测试
- 测试大量用户并发权限查询
- 测试多部门用户的查询性能
- 对比新旧方案的性能差异

## 总结

新的权限获取流程更加简洁和直接，通过直接使用用户信息中的部门字段，避免了复杂的数据库关联查询，提高了系统的性能和可维护性。同时，新方案保持了向后兼容性，现有的权限检查API无需修改。