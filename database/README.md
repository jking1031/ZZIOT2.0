# 工单系统独立数据库

本目录包含工单系统的独立数据库创建和管理脚本。

## 📁 文件说明

### 数据库创建脚本
- `create_ticket_database_step_by_step.js` - 分步骤创建工单数据库的主脚本
- `verify_ticket_database.js` - 验证数据库完整性的脚本
- `ticket_database_config.js` - 数据库配置和常用查询

### SQL脚本（历史文件）
- `recreate_ticket_database.sql` - 原始SQL脚本
- `recreate_ticket_database_fixed.sql` - 修复版SQL脚本
- `create_ticket_database.sql` - 完整数据库创建SQL
- `create_ticket_database_simple.sql` - 简化版SQL脚本

### 执行脚本（历史文件）
- `recreate_ticket_database.js` - 原始执行脚本
- `create_ticket_database.js` - 数据库创建执行脚本
- `check_ticket_tables.js` - 表检查脚本

## 🚀 快速开始

### 1. 创建工单数据库

```bash
# 进入项目目录
cd /Library/nextcloud/MK/NODERED/zziot5.26/1.5.3/zziot1.5.3-25.4.5

# 创建工单数据库
node database/create_ticket_database_step_by_step.js
```

### 2. 验证数据库

```bash
# 验证数据库完整性
node database/verify_ticket_database.js
```

## 📊 数据库结构

### 核心表

#### 用户相关表
- `users` - 用户信息表
- `roles` - 角色表
- `user_roles` - 用户角色关联表

#### 工单相关表
- `ticket_statuses` - 工单状态表
- `ticket_priorities` - 工单优先级表
- `ticket_categories` - 工单类别表
- `tickets` - 工单主表
- `ticket_timeline` - 工单时间线表
- `ticket_comments` - 工单评论表
- `ticket_attachments` - 工单附件表

### 视图
- `v_ticket_details` - 工单详情视图（包含关联信息）

### 初始数据

#### 用户角色
- `admin` - 管理员
- `support` - 技术支持
- `user` - 普通用户

#### 工单状态
- `open` - 待处理
- `in_progress` - 处理中
- `pending` - 等待中
- `resolved` - 已解决
- `closed` - 已关闭
- `cancelled` - 已取消

#### 工单优先级
- `low` - 低（级别1）
- `normal` - 普通（级别2）
- `high` - 高（级别3）
- `urgent` - 紧急（级别4）
- `critical` - 严重（级别5）

#### 工单类别
- 技术支持
- 故障报告
- 功能请求
- 账户问题
- 其他

## 🔧 配置说明

### 数据库连接配置

```javascript
const TICKET_DB_CONFIG = {
  host: '192.168.1.108',
  port: 13307,
  user: 'root',
  password: '008027',
  database: 'ticket_system'
};
```

### 环境变量

可以通过环境变量覆盖默认配置：

```bash
export TICKET_DB_HOST=192.168.1.108
export TICKET_DB_PORT=13307
export TICKET_DB_USER=root
export TICKET_DB_PASSWORD=008027
```

## 📝 Node-RED集成

### 1. 配置MySQL节点

在Node-RED中添加MySQL配置节点：

```json
{
  "host": "192.168.1.108",
  "port": 13307,
  "user": "root",
  "password": "008027",
  "database": "ticket_system",
  "charset": "utf8mb4",
  "timezone": "+08:00"
}
```

### 2. 常用查询示例

#### 获取所有工单
```sql
SELECT * FROM v_ticket_details WHERE is_deleted = 0 ORDER BY created_at DESC
```

#### 创建新工单
```sql
INSERT INTO tickets (
  ticket_number, title, description, category_id, priority_id, 
  status_id, creator_id
) VALUES (?, ?, ?, ?, ?, ?, ?)
```

#### 更新工单状态
```sql
UPDATE tickets 
SET status_id = ?, updated_at = CURRENT_TIMESTAMP 
WHERE id = ? AND is_deleted = 0
```

### 3. 使用配置文件

```javascript
// 导入配置
import ticketConfig from './database/ticket_database_config.js';

// 使用预定义查询
const query = ticketConfig.TICKET_QUERIES.GET_TICKET_DETAILS;
const params = [ticketId];

// 生成工单编号
const ticketNumber = ticketConfig.generateTicketNumber('TK');
```

## 🔍 常用操作

### 查询工单详情
```sql
SELECT * FROM v_ticket_details WHERE id = 1;
```

### 获取用户的工单
```sql
SELECT * FROM v_ticket_details 
WHERE (creator_id = 1 OR assigned_to_user = 1) 
  AND is_deleted = 0 
ORDER BY created_at DESC;
```

### 获取待处理工单
```sql
SELECT * FROM v_ticket_details 
WHERE status_is_closed = 0 
  AND is_deleted = 0 
ORDER BY priority_level DESC, created_at ASC;
```

### 获取逾期工单
```sql
SELECT * FROM v_ticket_details 
WHERE is_overdue = 1 
  AND is_deleted = 0 
ORDER BY due_date ASC;
```

## 🛠️ 维护操作

### 备份数据库
```bash
mysqldump -h 192.168.1.108 -P 13307 -u root -p ticket_system > ticket_system_backup.sql
```

### 恢复数据库
```bash
mysql -h 192.168.1.108 -P 13307 -u root -p ticket_system < ticket_system_backup.sql
```

### 检查数据库状态
```bash
node database/verify_ticket_database.js
```

## 📈 性能优化

### 索引说明

数据库已创建以下关键索引：

- 工单表：`ticket_number`（唯一）、`creator_id`、`status_id`、`priority_id`、`created_at`
- 评论表：`ticket_id`、`user_id`、`created_at`
- 时间线表：`ticket_id`、`user_id`、`created_at`
- 附件表：`ticket_id`、`created_by`、`created_at`

### 查询优化建议

1. 使用视图 `v_ticket_details` 获取完整工单信息
2. 在WHERE子句中使用索引字段
3. 避免使用 `SELECT *`，只查询需要的字段
4. 使用分页查询处理大量数据

## 🔒 安全注意事项

1. **数据库密码**：不要在代码中硬编码数据库密码
2. **SQL注入**：使用参数化查询防止SQL注入
3. **权限控制**：为不同用户角色设置适当的数据库权限
4. **数据备份**：定期备份数据库
5. **日志监控**：监控数据库访问日志

## 🚨 故障排除

### 常见问题

1. **连接失败**
   - 检查数据库服务是否运行
   - 验证连接参数（主机、端口、用户名、密码）
   - 检查防火墙设置

2. **外键约束错误**
   - 确保引用的记录存在
   - 检查数据类型匹配

3. **字符编码问题**
   - 确保使用 `utf8mb4` 字符集
   - 检查连接字符集配置

### 日志查看

```bash
# 查看MySQL错误日志
sudo tail -f /var/log/mysql/error.log

# 查看慢查询日志
sudo tail -f /var/log/mysql/slow.log
```

## 📞 支持

如果遇到问题，请检查：

1. 数据库连接配置是否正确
2. 必要的依赖包是否已安装
3. 数据库用户是否有足够权限
4. 网络连接是否正常

---

**注意**：这是一个独立的工单系统数据库，与现有系统分离，可以避免数据冲突并提供更好的数据隔离性。