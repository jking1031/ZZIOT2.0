# App权限管理 Node-RED API流程

这个Node-RED流程提供了完整的App权限管理系统API接口，与前端权限体系完美配合。

## 功能特性

### 核心API接口

1. **权限模块管理**
   - `GET /api/permission-modules` - 获取所有权限模块

2. **页面权限管理**
   - `GET /api/page-permissions` - 获取页面权限列表
   - `GET /api/page-permissions?moduleId=1` - 按模块获取权限

3. **部门管理**
   - `GET /api/departments` - 获取部门列表
   - `GET /api/department-permissions/:departmentId` - 获取部门权限
   - `PUT /api/department-permissions/:departmentId` - 更新部门权限

4. **用户权限管理**
   - `GET /api/user-permissions/:ruoyiUserId` - 获取用户有效权限
   - `GET /api/user-departments/:ruoyiUserId` - 获取用户所属部门
   - `POST /api/user-departments` - 分配用户到部门

5. **权限检查**
   - `POST /api/check-permission` - 检查用户是否有特定权限

6. **统计信息**
   - `GET /api/permission-stats` - 获取权限统计信息

## 安装配置

### 1. 导入流程文件

1. 打开Node-RED编辑器
2. 点击右上角菜单 → Import
3. 选择 `app_permissions_flows.json` 文件
4. 点击Import导入流程

### 2. 配置数据库连接

在流程中找到 `mysql_config` 节点，配置以下参数：

```json
{
  "host": "localhost",
  "port": "3306",
  "database": "your_database_name",
  "user": "your_username",
  "password": "your_password",
  "timezone": "Asia/Shanghai",
  "charset": "utf8mb4"
}
```

### 3. 部署流程

点击右上角的 "Deploy" 按钮部署流程。

## API使用示例

### 检查用户权限

```javascript
// POST /api/check-permission
{
  "ruoyiUserId": "123",
  "permissionId": "system.dashboard",
  "requiredLevel": 1
}

// 响应
{
  "hasPermission": true,
  "userLevel": 2,
  "requiredLevel": 1,
  "ruoyiUserId": "123",
  "permissionId": "system.dashboard",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 获取用户权限列表

```javascript
// GET /api/user-permissions/123
// 响应
[
  {
    "ruoyi_user_id": "123",
    "permission_key": "system.dashboard",
    "permission_name": "系统仪表板",
    "route_path": "/dashboard",
    "module_name": "系统管理",
    "effective_level": 2,
    "permission_source": "DEPARTMENT",
    "department_name": "运维部门",
    "department_color": "#2196f3"
  }
]
```

### 更新部门权限

```javascript
// PUT /api/department-permissions/2
{
  "permissions": [
    {
      "permissionId": 1,
      "level": 2
    },
    {
      "permissionId": 2,
      "level": 1
    }
  ],
  "grantedBy": "admin_user_id"
}

// 响应
{
  "success": true,
  "message": "部门权限更新成功",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "affectedRows": 2
}
```

### 分配用户到部门

```javascript
// POST /api/user-departments
{
  "ruoyiUserId": "123",
  "departmentId": 2,
  "role": "member",
  "isPrimary": true
}

// 响应
{
  "success": true,
  "message": "用户部门分配成功",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "insertId": 15
}
```

## 权限级别说明

- `0` - 无权限
- `1` - 只读权限
- `2` - 读写权限
- `3` - 管理员权限

## 部门角色说明

- `member` - 普通成员
- `leader` - 部门负责人
- `admin` - 部门管理员

## 与前端集成

### React Hook集成

这些API接口与 `useAppPermissions.js` Hook完美配合：

```javascript
import { useAppPermissions } from '../hooks/useAppPermissions';

function MyComponent() {
  const { 
    permissions, 
    hasPermission, 
    checkPermission,
    loading 
  } = useAppPermissions();

  // 检查权限
  const canViewDashboard = hasPermission('system.dashboard', 1);
  
  // 异步检查权限
  const handleAction = async () => {
    const result = await checkPermission('system.settings', 2);
    if (result.hasPermission) {
      // 执行操作
    }
  };

  return (
    <div>
      {canViewDashboard && <DashboardComponent />}
    </div>
  );
}
```

### 权限守卫组件集成

```javascript
import { PermissionGuard } from '../components/PermissionGuard';

function App() {
  return (
    <PermissionGuard 
      permissionId="system.dashboard" 
      requiredLevel={1}
      fallback={<div>无权限访问</div>}
    >
      <DashboardPage />
    </PermissionGuard>
  );
}
```

## 错误处理

所有API都包含统一的错误处理机制：

```javascript
// 错误响应格式
{
  "error": "错误类型",
  "message": "详细错误信息",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

常见错误码：
- `400` - 请求参数错误
- `500` - 服务器内部错误

## CORS支持

流程已配置CORS支持，允许跨域访问：

```javascript
Headers: {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}
```

## 性能优化

1. **数据库索引**: 确保数据库表已创建必要的索引
2. **缓存策略**: 前端Hook已实现权限缓存
3. **批量操作**: 部门权限更新支持批量操作
4. **视图优化**: 使用数据库视图简化复杂查询

## 安全考虑

1. **SQL注入防护**: 所有查询都使用参数化查询
2. **权限验证**: 每个API都包含权限验证逻辑
3. **审计日志**: 重要操作会记录到审计日志表
4. **输入验证**: 严格验证所有输入参数

## 监控和调试

1. **日志记录**: 所有错误和重要操作都会记录日志
2. **性能监控**: 可以通过Node-RED调试面板监控API性能
3. **错误追踪**: 统一的错误处理机制便于问题追踪

## 扩展功能

可以根据需要添加以下功能：

1. **权限继承**: 支持部门权限继承
2. **临时权限**: 支持设置权限过期时间
3. **权限审批**: 添加权限申请和审批流程
4. **批量导入**: 支持批量导入用户和权限
5. **权限模板**: 预定义权限模板快速分配

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库配置信息
   - 确认数据库服务正在运行
   - 验证用户名和密码

2. **权限检查失败**
   - 确认用户已分配到部门
   - 检查部门是否有相应权限
   - 验证权限ID是否正确

3. **API响应慢**
   - 检查数据库索引
   - 优化查询语句
   - 考虑添加缓存

### 调试技巧

1. 使用Node-RED调试节点查看数据流
2. 检查MySQL慢查询日志
3. 使用浏览器开发者工具监控网络请求
4. 查看Node-RED日志文件

## 版本更新

当数据库结构发生变化时：

1. 更新相应的SQL查询
2. 测试所有API接口
3. 更新前端Hook和组件
4. 更新文档和示例代码

---

**注意**: 在生产环境中使用前，请确保：
- 数据库已正确初始化
- 所有必要的索引已创建
- 权限数据已正确配置
- API接口已充分测试