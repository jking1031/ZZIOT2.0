# 优化后的权限系统 Node-RED API 文档

## 概述

本文档描述了权限系统重构后的 Node-RED API 端点。新的权限系统基于部门权限而非用户权限，提供了更灵活和高效的权限管理方案。

## API 端点列表

### 1. 获取权限模块列表

**端点**: `GET /api/permission-modules`

**描述**: 获取所有活跃的权限模块列表

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "module_key": "user_management",
      "module_name": "用户管理",
      "description": "用户管理相关功能",
      "is_active": true
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. 获取页面权限列表

**端点**: `GET /api/page-permissions`

**描述**: 获取所有活跃的页面权限列表

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "permission_id": "user_list_view",
      "permission_name": "用户列表查看",
      "route_path": "/users",
      "module_name": "用户管理",
      "description": "查看用户列表的权限"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. 获取部门列表

**端点**: `GET /api/departments`

**描述**: 获取所有活跃的部门列表

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "department_key": "tech_dept",
      "department_name": "技术部",
      "color": "#3498db",
      "is_active": true
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. 根据部门名称获取权限 (新增)

**端点**: `GET /api/department-permissions-by-name/:departmentName`

**描述**: 根据部门名称获取该部门的所有权限配置

**参数**:
- `departmentName`: 部门名称 (URL 参数)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "department_name": "技术部",
    "department_key": "tech_dept",
    "modules": [
      {
        "module_id": 1,
        "module_key": "user_management",
        "module_name": "用户管理",
        "module_description": "用户管理相关功能",
        "permissions": [
          {
            "permission_id": 1,
            "permission_key": "user_list_view",
            "permission_name": "用户列表查看",
            "route_path": "/users",
            "permission_level": 2,
            "description": "查看用户列表的权限"
          }
        ]
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. 基于用户部门获取权限 (新增核心API)

**端点**: `POST /api/user-permissions-by-departments`

**描述**: 根据用户的部门信息获取合并后的权限配置，这是新权限系统的核心API

**请求体**:
```json
{
  "ruoyiUserId": "user123",
  "userDepartments": ["技术部", "产品部"]
}
```

或者单个部门:
```json
{
  "ruoyiUserId": "user123",
  "userDepartments": "技术部"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "ruoyi_user_id": "user123",
    "user_departments": ["技术部", "产品部"],
    "department_info": [
      {
        "department_name": "技术部",
        "department_key": "tech_dept",
        "department_color": "#3498db"
      },
      {
        "department_name": "产品部",
        "department_key": "product_dept",
        "department_color": "#e74c3c"
      }
    ],
    "effective_permissions": {
      "modules": [
        {
          "module_id": 1,
          "module_key": "user_management",
          "module_name": "用户管理",
          "module_description": "用户管理相关功能",
          "permissions": [
            {
              "permission_id": 1,
              "permission_key": "user_list_view",
              "permission_name": "用户列表查看",
              "route_path": "/users",
              "permission_level": 3,
              "description": "查看用户列表的权限",
              "source_departments": ["技术部", "产品部"]
            }
          ]
        }
      ],
      "total_permissions": 1,
      "permission_merge_strategy": "highest_level"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6. 权限检查 (已优化)

**端点**: `POST /api/check-permission`

**描述**: 检查用户是否具有指定权限的指定级别，现在需要提供用户部门信息

**请求体**:
```json
{
  "ruoyiUserId": "user123",
  "permissionId": "user_list_view",
  "requiredLevel": 2,
  "userDepartments": ["技术部", "产品部"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "userLevel": 3,
    "requiredLevel": 2,
    "ruoyiUserId": "user123",
    "permissionId": "user_list_view"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 7. 获取用户权限 (已废弃)

**端点**: `GET /api/user-permissions/:ruoyiUserId`

**状态**: ⚠️ **已废弃**

**描述**: 此API已废弃，建议使用新的基于部门的权限获取方式

**响应示例**:
```json
{
  "success": false,
  "data": [],
  "error": "API已废弃",
  "message": "此API已废弃，请使用 /api/department-permissions-by-name/{departmentName} 根据用户部门信息获取权限",
  "deprecated": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 权限级别说明

权限级别采用数字表示，级别越高权限越大：

- `0`: 无权限
- `1`: 只读权限
- `2`: 读写权限
- `3`: 完全控制权限

## 权限合并策略

当用户属于多个部门时，系统采用**最高权限级别**策略：

1. 获取用户所有部门的权限配置
2. 对于同一个权限项，取所有部门中的最高权限级别
3. 只返回权限级别大于0的权限项
4. 在响应中标记权限的来源部门

## 迁移指南

### 从旧API迁移到新API

1. **替换用户权限获取**:
   ```javascript
   // 旧方式
   const response = await fetch(`/api/user-permissions/${ruoyiUserId}`);
   
   // 新方式
   const response = await fetch('/api/user-permissions-by-departments', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       ruoyiUserId: ruoyiUserId,
       userDepartments: userDepartmentNames // 从用户信息中获取
     })
   });
   ```

2. **更新权限检查**:
   ```javascript
   // 旧方式
   const checkData = {
     ruoyiUserId: 'user123',
     permissionId: 'user_list_view',
     requiredLevel: 2
   };
   
   // 新方式
   const checkData = {
     ruoyiUserId: 'user123',
     permissionId: 'user_list_view',
     requiredLevel: 2,
     userDepartments: ['技术部', '产品部'] // 新增必需字段
   };
   ```

## 错误处理

所有API都包含统一的错误处理机制，错误响应格式如下：

```json
{
  "success": false,
  "error": "错误类型",
  "message": "详细错误信息",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 注意事项

1. **部门信息来源**: 用户的部门信息应该从Ruoyi系统的用户数据中获取
2. **缓存策略**: 建议在前端缓存权限数据，减少API调用频率
3. **权限更新**: 当用户部门发生变化时，需要重新获取权限数据
4. **向后兼容**: 旧的用户权限API暂时保留但已标记为废弃，建议尽快迁移

## 性能优化建议

1. **批量获取**: 使用 `/api/user-permissions-by-departments` 一次性获取用户所有权限
2. **按需加载**: 根据用户访问的模块动态加载对应权限
3. **本地缓存**: 在客户端缓存权限数据，设置合理的过期时间
4. **权限预检**: 在路由层面进行权限预检，避免不必要的页面加载