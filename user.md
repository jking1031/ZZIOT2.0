# 用户管理模块接口文档

本文档描述了用户管理模块的所有接口、数据格式和Node-RED节点配置，用于实现用户的增删改查和角色管理功能。

## 基本信息

- 基础URL: `https://nodered.jzz77.cn:9003/api`
- 超时设置: 10000ms (10秒)
- 鉴权方式: 待补充 (建议使用JWT)

## 接口清单

### 1. 获取用户列表

**请求方式**: GET  
**接口路径**: `/users`  
**功能描述**: 获取所有用户的信息列表

**请求参数**: 无

**响应数据格式**:
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "phone": "13812345678",
    "company": "示例公司",
    "department": "IT部门",
    "is_admin": 1,
    "created_at": "2023-10-01T12:00:00Z",
    "updated_at": "2023-10-01T12:00:00Z"
  },
  // ...更多用户
]
```

**字段说明**:
- `id`: 用户ID (数字)
- `username`: 用户名 (字符串)
- `email`: 用户邮箱 (字符串)
- `phone`: 用户手机号 (字符串)
- `company`: 公司名称 (字符串，可选)
- `department`: 部门名称 (字符串，可选)
- `is_admin`: 用户角色ID (数字，0=普通用户，1=管理员，2=部门管理员，以此类推)
- `created_at`: 创建时间 (ISO日期字符串)
- `updated_at`: 更新时间 (ISO日期字符串)

### 2. 添加用户

**请求方式**: POST  
**接口路径**: `/users`  
**功能描述**: 创建新用户

**请求数据格式**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "phone": "13812345678",
  "company": "示例公司",
  "department": "市场部",
  "is_admin": 2
}
```

**请求字段说明**:
- `username`: 用户名 (字符串，必填)
- `email`: 用户邮箱 (字符串，必填)
- `password`: 用户密码 (字符串，必填)
- `phone`: 用户手机号 (字符串，必填)
- `company`: 公司名称 (字符串，可选)
- `department`: 部门名称 (字符串，可选)
- `is_admin`: 用户角色ID (数字，可选，默认为0)

**响应数据格式**:
```json
{
  "id": 10,
  "username": "newuser",
  "email": "newuser@example.com",
  "phone": "13812345678",
  "company": "示例公司",
  "department": "市场部",
  "is_admin": 2,
  "created_at": "2023-10-01T12:00:00Z",
  "updated_at": "2023-10-01T12:00:00Z"
}
```

### 3. 更新用户信息

**请求方式**: PUT  
**接口路径**: `/users/{id}`  
**功能描述**: 更新指定ID用户的信息

**路径参数**:
- `id`: 用户ID (数字)

**请求数据格式**:
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "phone": "13987654321",
  "company": "新公司",
  "department": "新部门",
  "is_admin": 3
}
```

注意：只需要包含要更新的字段，不需要更新的字段可以不传

**响应数据格式**:
```json
{
  "id": 10,
  "username": "updateduser",
  "email": "updated@example.com",
  "phone": "13987654321",
  "company": "新公司",
  "department": "新部门",
  "is_admin": 3,
  "created_at": "2023-10-01T12:00:00Z",
  "updated_at": "2023-10-02T14:30:00Z"
}
```

### 4. 更新用户角色

**请求方式**: PUT  
**接口路径**: `/users/{id}`  
**功能描述**: 更新指定ID用户的角色

**路径参数**:
- `id`: 用户ID (数字)

**请求数据格式**:
```json
{
  "is_admin": 2
}
```

**响应数据格式**:
与更新用户信息接口相同

### 5. 删除用户

**请求方式**: DELETE  
**接口路径**: `/users/{id}`  
**功能描述**: 删除指定ID的用户

**路径参数**:
- `id`: 用户ID (数字)

**请求数据格式**: 无

**响应数据格式**:
```json
{
  "message": "User deleted successfully"
}
```

## 角色定义

系统预定义的角色ID和名称：

| 角色ID | 角色名称 | 颜色 |
|--------|----------|------|
| 0 | 普通用户 | #9E9E9E |
| 1 | 管理员 | #4CAF50 |
| 2 | 部门管理员 | #2196F3 |
| 3 | 运行班组 | #FF9800 |
| 4 | 化验班组 | #9C27B0 |
| 5 | 机电班组 | #E91E63 |
| 6 | 污泥车间 | #795548 |
| 7 | 5000吨处理站 | #607D8B |
| 8 | 附属设施 | #00BCD4 |
| 9 | 备用权限 | #FF5722 |

## Node-RED实现

以下是在Node-RED中实现上述接口的示例流程和节点配置。

### 数据库配置

假设使用MySQL数据库，用户表结构如下：

```sql
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `company` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `is_admin` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1. 获取用户列表节点配置

```json
[
    {
        "id": "get-users-endpoint",
        "type": "http in",
        "z": "user-management-flow",
        "name": "GET Users",
        "url": "/api/users",
        "method": "get",
        "upload": false,
        "swaggerDoc": "",
        "x": 150,
        "y": 120,
        "wires": [["get-users-query"]]
    },
    {
        "id": "get-users-query",
        "type": "mysql",
        "z": "user-management-flow",
        "name": "Select All Users",
        "mysqlConfig": "mysql-connection",
        "sql": "SELECT id, username, email, phone, company, department, is_admin, created_at, updated_at FROM users",
        "x": 350,
        "y": 120,
        "wires": [["get-users-response"]]
    },
    {
        "id": "get-users-response",
        "type": "http response",
        "z": "user-management-flow",
        "name": "Send Users",
        "statusCode": "200",
        "headers": {
            "content-type": "application/json"
        },
        "x": 550,
        "y": 120,
        "wires": []
    }
]
```

### 2. 添加用户节点配置

```json
[
    {
        "id": "create-user-endpoint",
        "type": "http in",
        "z": "user-management-flow",
        "name": "POST User",
        "url": "/api/users",
        "method": "post",
        "upload": false,
        "swaggerDoc": "",
        "x": 150,
        "y": 180,
        "wires": [["validate-user-input"]]
    },
    {
        "id": "validate-user-input",
        "type": "function",
        "z": "user-management-flow",
        "name": "Validate Input",
        "func": "const { username, email, password, phone } = msg.payload;\n\nif (!username || !email || !password || !phone) {\n    msg.statusCode = 400;\n    msg.payload = { error: '用户名、邮箱、密码和手机号是必填项' };\n    return [null, msg];\n}\n\n// 可以添加更多验证，如邮箱格式等\n\nreturn [msg, null];",
        "outputs": 2,
        "noerr": 0,
        "x": 350,
        "y": 180,
        "wires": [["hash-password"], ["user-error-response"]]
    },
    {
        "id": "hash-password",
        "type": "function",
        "z": "user-management-flow",
        "name": "Hash Password",
        "func": "const bcrypt = global.get('bcrypt');\nconst saltRounds = 10;\n\nconst user = msg.payload;\n\n// 异步哈希密码\nreturn new Promise((resolve, reject) => {\n    bcrypt.hash(user.password, saltRounds, (err, hash) => {\n        if (err) {\n            msg.statusCode = 500;\n            msg.payload = { error: '密码加密失败' };\n            reject(msg);\n        } else {\n            user.password = hash;\n            msg.payload = user;\n            resolve(msg);\n        }\n    });\n});",
        "outputs": 1,
        "noerr": 0,
        "x": 550,
        "y": 180,
        "wires": [["insert-user-query"]]
    },
    {
        "id": "insert-user-query",
        "type": "mysql",
        "z": "user-management-flow",
        "name": "Insert User",
        "mysqlConfig": "mysql-connection",
        "sql": "INSERT INTO users (username, email, password, phone, company, department, is_admin) VALUES ({{username}}, {{email}}, {{password}}, {{phone}}, {{company}}, {{department}}, {{is_admin}})",
        "x": 750,
        "y": 180,
        "wires": [["get-created-user"]]
    },
    {
        "id": "get-created-user",
        "type": "mysql",
        "z": "user-management-flow",
        "name": "Get Created User",
        "mysqlConfig": "mysql-connection",
        "sql": "SELECT id, username, email, phone, company, department, is_admin, created_at, updated_at FROM users WHERE id = LAST_INSERT_ID()",
        "x": 950,
        "y": 180,
        "wires": [["create-user-response"]]
    },
    {
        "id": "create-user-response",
        "type": "http response",
        "z": "user-management-flow",
        "name": "Send Created User",
        "statusCode": "201",
        "headers": {
            "content-type": "application/json"
        },
        "x": 1150,
        "y": 180,
        "wires": []
    },
    {
        "id": "user-error-response",
        "type": "http response",
        "z": "user-management-flow",
        "name": "Send Error",
        "statusCode": "",
        "headers": {
            "content-type": "application/json"
        },
        "x": 550,
        "y": 240,
        "wires": []
    }
]
```

### 3. 更新用户信息节点配置

```json
[
    {
        "id": "update-user-endpoint",
        "type": "http in",
        "z": "user-management-flow",
        "name": "PUT User",
        "url": "/api/users/:id",
        "method": "put",
        "upload": false,
        "swaggerDoc": "",
        "x": 150,
        "y": 300,
        "wires": [["prepare-update-query"]]
    },
    {
        "id": "prepare-update-query",
        "type": "function",
        "z": "user-management-flow",
        "name": "Prepare Update Query",
        "func": "const userId = msg.params.id;\nconst updates = msg.payload;\n\n// 防止更新密码 (需要单独的更改密码接口)\ndelete updates.password;\n\n// 构建SET子句\nconst setClauses = [];\nconst params = [];\n\nfor (const [key, value] of Object.entries(updates)) {\n    if (value !== undefined && value !== null) {\n        setClauses.push(`${key} = ?`);\n        params.push(value);\n    }\n}\n\nif (setClauses.length === 0) {\n    msg.statusCode = 400;\n    msg.payload = { error: '没有提供要更新的字段' };\n    return [null, msg];\n}\n\n// 添加用户ID作为WHERE条件的参数\nparams.push(userId);\n\nmsg.params = params;\nmsg.topic = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;\n\nreturn [msg, null];",
        "outputs": 2,
        "noerr": 0,
        "x": 350,
        "y": 300,
        "wires": [["update-user-query"], ["user-error-response"]]
    },
    {
        "id": "update-user-query",
        "type": "mysql",
        "z": "user-management-flow",
        "name": "Update User",
        "mysqlConfig": "mysql-connection",
        "sql": "",
        "sqlType": "msg",
        "x": 550,
        "y": 300,
        "wires": [["check-update-result"]]
    },
    {
        "id": "check-update-result",
        "type": "function",
        "z": "user-management-flow",
        "name": "Check Update Result",
        "func": "const result = msg.payload;\nconst userId = msg.params[msg.params.length - 1];\n\nif (result.affectedRows === 0) {\n    msg.statusCode = 404;\n    msg.payload = { error: '用户不存在' };\n    return [null, msg];\n}\n\nmsg.userId = userId;\nreturn [msg, null];",
        "outputs": 2,
        "noerr": 0,
        "x": 750,
        "y": 300,
        "wires": [["get-updated-user"], ["user-error-response"]]
    },
    {
        "id": "get-updated-user",
        "type": "mysql",
        "z": "user-management-flow",
        "name": "Get Updated User",
        "mysqlConfig": "mysql-connection",
        "sql": "SELECT id, username, email, phone, company, department, is_admin, created_at, updated_at FROM users WHERE id = ?",
        "sqlType": "prepared",
        "x": 950,
        "y": 300,
        "wires": [["update-user-response"]]
    },
    {
        "id": "update-user-response",
        "type": "http response",
        "z": "user-management-flow",
        "name": "Send Updated User",
        "statusCode": "200",
        "headers": {
            "content-type": "application/json"
        },
        "x": 1150,
        "y": 300,
        "wires": []
    }
]
```

### 4. 删除用户节点配置

```json
[
    {
        "id": "delete-user-endpoint",
        "type": "http in",
        "z": "user-management-flow",
        "name": "DELETE User",
        "url": "/api/users/:id",
        "method": "delete",
        "upload": false,
        "swaggerDoc": "",
        "x": 150,
        "y": 420,
        "wires": [["delete-user-query"]]
    },
    {
        "id": "delete-user-query",
        "type": "mysql",
        "z": "user-management-flow",
        "name": "Delete User",
        "mysqlConfig": "mysql-connection",
        "sql": "DELETE FROM users WHERE id = ?",
        "sqlType": "prepared",
        "x": 350,
        "y": 420,
        "wires": [["check-delete-result"]]
    },
    {
        "id": "check-delete-result",
        "type": "function",
        "z": "user-management-flow",
        "name": "Check Delete Result",
        "func": "const result = msg.payload;\n\nif (result.affectedRows === 0) {\n    msg.statusCode = 404;\n    msg.payload = { error: '用户不存在' };\n    return [null, msg];\n}\n\nmsg.payload = { message: 'User deleted successfully' };\nreturn [msg, null];",
        "outputs": 2,
        "noerr": 0,
        "x": 550,
        "y": 420,
        "wires": [["delete-user-response"], ["user-error-response"]]
    },
    {
        "id": "delete-user-response",
        "type": "http response",
        "z": "user-management-flow",
        "name": "Send Success",
        "statusCode": "200",
        "headers": {
            "content-type": "application/json"
        },
        "x": 750,
        "y": 420,
        "wires": []
    }
]
```

### Node-RED全局依赖配置

在Node-RED的`settings.js`文件中，需要添加以下配置以支持密码哈希功能：

```javascript
functionGlobalContext: {
    // 添加bcrypt模块用于密码哈希
    bcrypt: require('bcrypt')
}
```

## 安全建议

1. 实现JWT认证，确保只有已登录用户能访问API
2. 添加HTTPS支持加密传输
3. 实现CORS策略，限制可访问的域名
4. 添加请求频率限制，防止暴力攻击
5. 密码存储采用强哈希算法（如bcrypt）
6. 添加审计日志，记录关键操作

## 前端集成注意事项

1. 确保处理网络错误和服务器错误
2. 实现本地状态管理，减少API调用
3. 缓存用户列表，提高性能
4. 实现乐观更新UI，提高用户体验
5. 表单验证与后端验证保持一致 