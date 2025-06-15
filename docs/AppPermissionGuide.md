# App权限管理系统使用指南

本文档介绍如何使用新的App权限管理系统，包括数据库设计、API接口和前端组件的使用方法。

## 📋 目录

- [系统概述](#系统概述)
- [数据库设计](#数据库设计)
- [快速开始](#快速开始)
- [API接口](#api接口)
- [前端组件](#前端组件)
- [权限验证](#权限验证)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 🎯 系统概述

新的App权限管理系统提供了完整的权限控制解决方案，包括：

- **模块化权限设计**：按功能模块组织权限
- **部门级权限管理**：支持部门级权限分配
- **用户级权限控制**：支持用户特殊权限设置
- **多级权限等级**：支持无权限、只读、读写、管理员四个级别
- **前端权限组件**：提供React组件进行权限验证
- **缓存机制**：优化权限验证性能

### 权限级别说明

| 级别 | 值 | 说明 |
|------|----|---------|
| 无权限 | 0 | 无法访问该功能 |
| 只读 | 1 | 可以查看但不能修改 |
| 读写 | 2 | 可以查看和修改 |
| 管理员 | 3 | 拥有完全控制权限 |

## 🗄️ 数据库设计

### 核心表结构

```sql
-- 权限模块表
permission_modules
├── id (主键)
├── module_key (模块标识)
├── module_name (模块名称)
└── description (描述)

-- 页面权限表
page_permissions
├── id (主键)
├── permission_id (权限标识)
├── permission_name (权限名称)
├── module_id (所属模块)
├── route_path (路由路径)
└── description (描述)

-- 部门表
departments
├── id (主键)
├── department_key (部门标识)
├── department_name (部门名称)
├── description (描述)
└── color (部门颜色)

-- 用户表
users
├── id (主键)
├── username (用户名)
├── email (邮箱)
├── full_name (真实姓名)
└── is_admin (是否管理员)

-- 部门页面权限关联表
department_page_permissions
├── department_id (部门ID)
├── permission_id (权限ID)
└── permission_level (权限级别)

-- 用户部门关联表
user_departments
├── user_id (用户ID)
├── department_id (部门ID)
├── role (部门角色)
└── is_primary (是否主要部门)
```

## 🚀 快速开始

### 1. 数据库初始化

```bash
# 安装依赖
npm install mysql2

# 设置环境变量
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=zziot_permissions

# 初始化数据库
node scripts/init_app_permissions.js

# 验证数据库结构
node scripts/init_app_permissions.js --validate
```

### 2. 前端集成

```javascript
// 在App.js中导入权限Hook
import { useAppPermissions } from './hooks/useAppPermissions';
import { PagePermissionGuard } from './components/PermissionGuard';

// 在组件中使用
function MyComponent() {
  const { hasPagePermission, loading } = useAppPermissions();
  
  if (loading) {
    return <Text>加载中...</Text>;
  }
  
  return (
    <PagePermissionGuard requiredPermission="data_entry">
      <Text>这是需要数据录入权限的内容</Text>
    </PagePermissionGuard>
  );
}
```

## 🔌 API接口

### 权限模块管理

```javascript
import { PermissionModuleAPI } from './api/permissionService';

// 获取所有权限模块
const modules = await PermissionModuleAPI.getAll();

// 创建权限模块
const newModule = await PermissionModuleAPI.create({
  module_key: 'custom',
  module_name: '自定义模块',
  description: '自定义功能模块'
});
```

### 部门权限管理

```javascript
import { DepartmentAPI } from './api/permissionService';

// 获取所有部门
const departments = await DepartmentAPI.getAll();

// 获取部门权限
const permissions = await DepartmentAPI.getPermissions(departmentId);

// 更新部门权限
const result = await DepartmentAPI.updatePermissions(departmentId, [
  { permission_id: 'data_entry', permission_level: 2 },
  { permission_id: 'reports', permission_level: 1 }
]);
```

### 用户权限管理

```javascript
import { UserAPI } from './api/permissionService';

// 获取用户可访问的页面
const accessiblePages = await UserAPI.getAccessiblePages(userId);

// 设置用户部门
const result = await UserAPI.setDepartments(userId, [
  { department_id: 1, role: 'member', is_primary: true }
]);
```

### 权限验证

```javascript
import { PermissionCheckAPI } from './api/permissionService';

// 检查单个权限
const hasPermission = await PermissionCheckAPI.checkPermission(
  userId, 
  'data_entry', 
  departmentId
);

// 批量检查权限
const permissions = await PermissionCheckAPI.batchCheckPermissions(
  userId,
  ['data_entry', 'reports', 'user_management']
);

// 检查页面访问权限
const canAccess = await PermissionCheckAPI.checkPageAccess(
  userId,
  '/data/entry'
);
```

## 🧩 前端组件

### 页面权限守卫

```javascript
import { PagePermissionGuard } from './components/PermissionGuard';

// 保护整个页面
<PagePermissionGuard 
  requiredPermission="user_management"
  customMessage="您需要用户管理权限才能访问此页面"
>
  <UserManagementScreen />
</PagePermissionGuard>
```

### 功能权限守卫

```javascript
import { FeaturePermissionGuard } from './components/PermissionGuard';

// 保护特定功能
<FeaturePermissionGuard 
  requiredPermission="data_entry"
  minLevel={2} // 需要读写权限
>
  <Button title="编辑数据" onPress={handleEdit} />
</FeaturePermissionGuard>
```

### 权限级别守卫

```javascript
import { PermissionLevelGuard } from './components/PermissionGuard';

// 根据权限级别显示不同内容
<PermissionLevelGuard
  requiredPermission="reports"
  readOnlyComponent={<Text>只能查看报表</Text>}
  readWriteComponent={<Button title="编辑报表" />}
  adminComponent={<Button title="管理报表" />}
  noPermissionComponent={<Text>无权限访问</Text>}
/>
```

### 管理员权限守卫

```javascript
import { AdminGuard } from './components/PermissionGuard';

// 仅管理员可见
<AdminGuard>
  <Button title="系统设置" onPress={openSettings} />
</AdminGuard>
```

## 🔍 权限验证

### 使用Hook进行权限验证

```javascript
import { useAppPermissions } from './hooks/useAppPermissions';

function MyComponent() {
  const {
    hasPagePermission,
    getPermissionLevel,
    isInDepartment,
    isAdmin,
    primaryDepartment
  } = useAppPermissions();
  
  // 检查页面权限
  const canViewData = hasPagePermission('data_query');
  
  // 检查权限级别
  const dataLevel = getPermissionLevel('data_entry');
  
  // 检查部门归属
  const inTechDept = isInDepartment('技术部');
  
  return (
    <View>
      {canViewData && <Text>可以查看数据</Text>}
      {dataLevel >= 2 && <Button title="编辑数据" />}
      {isAdmin && <Button title="管理员功能" />}
      {primaryDepartment && (
        <Text>主要部门: {primaryDepartment.department_name}</Text>
      )}
    </View>
  );
}
```

### 部门权限管理

```javascript
import { useDepartmentPermissions } from './hooks/useAppPermissions';

function DepartmentManagement() {
  const {
    departments,
    pagePermissions,
    updateDepartmentPermissions,
    createDepartment,
    loading
  } = useDepartmentPermissions();
  
  const handleUpdatePermissions = async (deptId, permissions) => {
    const success = await updateDepartmentPermissions(deptId, permissions);
    if (success) {
      alert('权限更新成功');
    }
  };
  
  // 渲染部门权限管理界面
  return (
    <View>
      {departments.map(dept => (
        <DepartmentPermissionEditor
          key={dept.id}
          department={dept}
          permissions={pagePermissions}
          onUpdate={handleUpdatePermissions}
        />
      ))}
    </View>
  );
}
```

## 💡 最佳实践

### 1. 权限设计原则

- **最小权限原则**：用户只获得完成工作所需的最小权限
- **职责分离**：不同角色拥有不同的权限范围
- **定期审查**：定期检查和更新权限分配

### 2. 性能优化

```javascript
// 使用权限缓存
const { refreshPermissions, clearCache } = useAppPermissions();

// 在用户登录后刷新权限
useEffect(() => {
  if (user) {
    refreshPermissions();
  }
}, [user]);

// 在权限变更后清除缓存
const handlePermissionChange = async () => {
  await updatePermissions();
  clearCache(); // 清除缓存，强制重新加载
};
```

### 3. 错误处理

```javascript
// 在组件中处理权限错误
const { error, loading } = useAppPermissions();

if (error) {
  return (
    <View>
      <Text>权限加载失败: {error}</Text>
      <Button title="重试" onPress={refreshPermissions} />
    </View>
  );
}
```

### 4. 权限组合使用

```javascript
// 多权限验证
<MultiPermissionGuard
  requiredPermissions={['data_entry', 'reports']}
  requireAll={false} // 满足任一权限即可
>
  <DataReportComponent />
</MultiPermissionGuard>

// 部门和权限双重验证
<DepartmentGuard requiredDepartment="技术部">
  <FeaturePermissionGuard requiredPermission="api_management">
    <APIManagementPanel />
  </FeaturePermissionGuard>
</DepartmentGuard>
```

## 🔧 故障排除

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查数据库服务状态
sudo systemctl status mysql

# 检查连接配置
echo $DB_HOST $DB_PORT $DB_USER $DB_NAME

# 测试数据库连接
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME
```

#### 2. 权限验证失败

```javascript
// 检查用户权限数据
const { permissions, userDepartments } = useAppPermissions();
console.log('用户权限:', permissions);
console.log('用户部门:', userDepartments);

// 检查权限缓存
import AsyncStorage from '@react-native-async-storage/async-storage';
const cache = await AsyncStorage.getItem('app_permissions_cache');
console.log('权限缓存:', JSON.parse(cache));
```

#### 3. API调用错误

```javascript
// 启用API调试
import { PermissionService } from './api/permissionService';

try {
  const result = await PermissionService.getUserPermissions(userId);
  console.log('API调用成功:', result);
} catch (error) {
  console.error('API调用失败:', error.message);
  console.error('错误详情:', error.response?.data);
}
```

### 调试工具

```javascript
// 权限调试组件
import { PermissionInfo } from './components/PermissionGuard';

// 在开发环境中显示权限信息
{__DEV__ && (
  <PermissionInfo 
    requiredPermission="data_entry"
    showLevel={true}
    showDepartment={true}
  />
)}
```

## 📚 相关文档

- [数据库设计文档](./database/README.md)
- [API接口文档](./api/README.md)
- [前端组件文档](./components/README.md)
- [部门权限管理指南](./DepartmentPermissionGuide.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。