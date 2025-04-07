# Postal邮件系统详细部署流程

本指南将引导您完成Postal邮件系统的详细部署流程，以及如何将其集成到您的移动应用中。

## 1. 系统需求

### 1.1 硬件要求
- CPU: 至少2核
- 内存: 至少2GB RAM (建议4GB+)
- 存储: 至少20GB可用空间
- 带宽: 取决于预期邮件流量，建议至少10Mbps

### 1.2 软件要求
- 操作系统: Ubuntu 20.04/22.04 LTS (推荐)或其他Linux发行版
- Docker与Docker Compose (如使用容器化部署)
- 一个已配置的域名(用于发送和接收邮件)
- 可访问互联网的服务器(某些端口必须开放)

## 2. 域名和DNS配置

### 2.1 域名设置
1. 注册一个域名用于邮件系统 (如 mail.yourcompany.com)
2. 配置以下DNS记录:

```
# 主A记录
mail.example.com. IN A 你的服务器IP

# MX记录
example.com. IN MX 10 mail.example.com.

# SPF记录(防止垃圾邮件)
example.com. IN TXT "v=spf1 ip4:你的服务器IP ~all"

# DKIM记录(稍后生成)
postal._domainkey.example.com. IN TXT "v=DKIM1; k=rsa; p=你的DKIM公钥"

# DMARC记录
_dmarc.example.com. IN TXT "v=DMARC1; p=none; rua=mailto:postmaster@example.com"
```

### 2.2 反向DNS配置
在您的服务器主机商控制面板中为服务器IP设置反向DNS指向您的邮件域名。

## 3. 安装Postal

### 3.1 使用Docker安装(推荐)

1. **安装Docker与Docker Compose**
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
apt install -y docker-compose
```

2. **创建Postal部署目录**
```bash
mkdir -p /opt/postal/config
cd /opt/postal
```

3. **创建docker-compose.yml文件**
```bash
cat > docker-compose.yml <<EOF
version: '3'
services:
  postal:
    image: postalserver/postal:latest
    container_name: postal
    restart: always
    ports:
      - "25:25"    # SMTP
      - "80:80"    # HTTP
      - "443:443"  # HTTPS
    volumes:
      - ./config:/config
      - ./data:/data
    environment:
      - POSTAL_WEB_HOSTNAME=mail.example.com
      - POSTAL_SMTP_HOSTNAME=mail.example.com
      - POSTAL_RABBITMQ_HOST=rabbit
      - POSTAL_MARIADB_HOST=mariadb
      - POSTAL_MARIADB_DATABASE=postal
      - POSTAL_MARIADB_USER=postal
      - POSTAL_MARIADB_PASSWORD=postal_password
      - POSTAL_REDIS_HOST=redis
    depends_on:
      - mariadb
      - redis
      - rabbit

  mariadb:
    image: mariadb:10.6
    container_name: postal-mariadb
    restart: always
    volumes:
      - ./data/mysql:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=rootpass
      - MYSQL_DATABASE=postal
      - MYSQL_USER=postal
      - MYSQL_PASSWORD=postal_password

  redis:
    image: redis:6-alpine
    container_name: postal-redis
    restart: always
    volumes:
      - ./data/redis:/data

  rabbit:
    image: rabbitmq:3-alpine
    container_name: postal-rabbitmq
    restart: always
    volumes:
      - ./data/rabbit:/var/lib/rabbitmq
EOF
```

4. **替换环境变量**
   把上面配置中的`mail.example.com`替换为您的实际域名，密码也改为安全的值。

5. **启动Postal**
```bash
docker-compose up -d
```

6. **初始化Postal**
```bash
# 等待所有容器启动完成
docker-compose exec postal postal initialize-config
docker-compose exec postal postal initialize
```

7. **创建初始管理员账户**
```bash
docker-compose exec postal postal make-user
```
按照提示输入管理员邮箱和密码。

### 3.2 直接安装(非Docker方式)

1. **安装系统依赖**
```bash
# 在Ubuntu上
apt update
apt install -y ruby ruby-dev build-essential libssl-dev mariadb-server libmariadb-dev libmysqlclient-dev rabbitmq-server nodejs npm git wget nginx
```

2. **安装Redis**
```bash
apt install -y redis-server
```

3. **配置MariaDB**
```bash
# 保护MariaDB安装
mysql_secure_installation

# 创建Postal数据库和用户
mysql -u root -p
```

```sql
CREATE DATABASE postal;
GRANT ALL ON postal.* TO 'postal'@'localhost' IDENTIFIED BY 'postal_password';
FLUSH PRIVILEGES;
exit;
```

4. **安装Postal**
```bash
# 添加Postal用户
useradd -r -d /opt/postal -m -s /bin/bash postal

# 切换到Postal用户
su - postal

# 克隆Postal代码库
git clone https://github.com/postalserver/postal /opt/postal/app
cd /opt/postal/app

# 安装依赖
gem install bundler
bundle install --without development:test
bundle exec rake postal:install
```

5. **配置Postal**
```bash
cp /opt/postal/app/config/postal.example.yml /opt/postal/config/postal.yml
nano /opt/postal/config/postal.yml
```
编辑配置文件，设置域名、数据库和Redis连接信息。

6. **初始化数据库**
```bash
bundle exec rake postal:initialize
```

7. **创建管理员用户**
```bash
bundle exec rake postal:make_user
```

8. **配置Web服务器(Nginx)**
```bash
cd /opt/postal/app/script/
./install-nginx /etc/nginx/sites-available/postal.conf
ln -s /etc/nginx/sites-available/postal.conf /etc/nginx/sites-enabled/postal.conf
nginx -t
systemctl restart nginx
```

9. **配置服务和后台进程**
```bash
cp /opt/postal/app/script/systemd/postal.service /etc/systemd/system/
systemctl enable postal
systemctl start postal
```

## 4. 配置SSL证书(Let's Encrypt)

1. **安装Certbot**
```bash
apt install -y certbot
```

2. **获取证书**
```bash
certbot certonly --standalone --agree-tos --email admin@example.com -d mail.example.com
```

3. **配置Postal使用证书**
编辑Postal配置文件(docker-compose.yml中的环境变量或postal.yml)，设置SSL证书路径：
```yaml
web:
  ssl_certificate_path: /etc/letsencrypt/live/mail.example.com/fullchain.pem
  ssl_certificate_key_path: /etc/letsencrypt/live/mail.example.com/privkey.pem
```

4. **重启Postal服务**
```bash
# Docker方式
docker-compose restart postal

# 直接安装方式
systemctl restart postal
```

## 5. 基本配置

### 5.1 登录到Postal管理界面
访问`https://mail.example.com`并使用之前创建的管理员账户登录。

### 5.2 创建组织和服务器
1. 创建一个新组织(例如"您的公司名称")
2. 在组织内创建一个新服务器(例如"内部邮件系统")
3. 配置服务器的域名和邮件设置

### 5.3 配置DKIM
在服务器设置中生成DKIM密钥，然后将生成的DNS记录添加到您的域名DNS配置中。

### 5.4 创建凭证
创建API令牌，用于Node-RED和移动应用集成：
1. 导航到组织设置 -> API
2. 创建一个新的API令牌
3. 记录生成的API密钥

## 6. 与Node-RED集成

### 6.1 在Node-RED中安装必要的节点
```bash
cd ~/.node-red
npm install node-red-contrib-postal
npm install node-red-contrib-credentials
```

### 6.2 创建邮件发送流程

1. 在Node-RED中创建一个新的流程
2. 添加一个HTTP输入节点，配置如下：
   - 方法: POST
   - URL: /api/mail/send
   - 名称: 发送邮件

3. 添加一个函数节点处理请求数据：
```javascript
// 解析请求体
const mail = msg.payload;
const userId = msg.req.user.id; // 假设用户认证已通过中间件处理

// 创建Postal API请求格式
msg.payload = {
    from: mail.from || `${userId}@your-internal-domain.com`,
    to: mail.to,
    cc: mail.cc,
    bcc: mail.bcc,
    subject: mail.subject,
    html_body: mail.content,
    attachments: mail.attachments || []
};

return msg;
```

4. 添加Postal节点并配置：
   - 服务器URL: https://mail.example.com
   - API密钥: 之前生成的API令牌
   - 操作: 发送邮件

5. 添加HTTP响应节点返回结果

### 6.3 创建邮件接收和查询流程

1. 创建收件箱API端点(HTTP输入节点)：
   - 方法: GET
   - URL: /api/mail/inbox
   - 名称: 获取收件箱

2. 添加函数节点处理查询参数：
```javascript
// 获取当前用户邮箱
const userEmail = `${msg.req.user.id}@your-internal-domain.com`;
const page = msg.req.query.page || 1;
const perPage = msg.req.query.per_page || 20;

// 构建查询参数
msg.postalQuery = {
    to: userEmail,
    status: "delivered",
    page: page,
    per_page: perPage
};

return msg;
```

3. 添加Postal查询节点并配置：
   - 服务器URL和API令牌
   - 操作: 查询邮件

4. 添加响应处理函数节点：
```javascript
// 格式化邮件数据
if (msg.payload && msg.payload.data) {
    msg.payload = msg.payload.data.map(mail => ({
        id: mail.id,
        subject: mail.subject,
        sender: mail.from,
        senderName: mail.friendly_from || mail.from.split('@')[0],
        recipients: mail.to,
        content: mail.plain_body || mail.html_body,
        timestamp: mail.timestamp,
        attachments: mail.attachments || [],
        read: mail.read || false
    }));
}
return msg;
```

5. 添加HTTP响应节点返回结果

## 7. 与移动应用集成

### 7.1 在React Native应用中添加API服务

1. 创建邮件API服务文件 `api/mailService.js`:

```javascript
import axios from 'axios';
import { getAuthToken } from './authService';

const API_URL = 'https://your-node-red-url/api';

// 创建带认证的axios实例
const createAxiosInstance = async () => {
  const token = await getAuthToken();
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
};

// 获取收件箱邮件
export const getInboxMails = async (page = 1, perPage = 20) => {
  const api = await createAxiosInstance();
  const response = await api.get(`/mail/inbox?page=${page}&per_page=${perPage}`);
  return response.data;
};

// 获取已发送邮件
export const getSentMails = async (page = 1, perPage = 20) => {
  const api = await createAxiosInstance();
  const response = await api.get(`/mail/sent?page=${page}&per_page=${perPage}`);
  return response.data;
};

// 获取邮件详情
export const getMailDetail = async (id) => {
  const api = await createAxiosInstance();
  const response = await api.get(`/mail/${id}`);
  return response.data;
};

// 发送邮件
export const sendMail = async (mailData) => {
  const api = await createAxiosInstance();
  const response = await api.post('/mail/send', mailData);
  return response.data;
};

// 标记邮件为已读
export const markAsRead = async (id) => {
  const api = await createAxiosInstance();
  const response = await api.put(`/mail/${id}/read`);
  return response.data;
};

// 获取邮件附件
export const getAttachment = async (mailId, attachmentId) => {
  const api = await createAxiosInstance();
  const response = await api.get(`/mail/${mailId}/attachment/${attachmentId}`);
  return response.data;
};
```

### 7.2 集成到您的现有用户系统

1. 修改用户管理以支持邮件地址:

```javascript
// 在用户创建或更新函数中添加
const generateEmailAddress = (username) => {
  // 替换特殊字符并转为小写
  const sanitizedUsername = username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.');
  
  return `${sanitizedUsername}@your-internal-domain.com`;
};

// 用户创建时
const createUser = async (userData) => {
  // 现有用户创建逻辑
  // ...
  
  // 添加邮件地址
  const emailAddress = generateEmailAddress(userData.username);
  userRecord.emailAddress = emailAddress;
  
  // 保存用户
  await saveUser(userRecord);
  
  return userRecord;
};
```

### 7.3 邮件通知集成

在适当的地方添加邮件通知功能:

```javascript
import { sendMail } from '../api/mailService';

// 当有重要事件发生时发送通知
const notifyUser = async (userId, subject, message) => {
  try {
    // 获取用户数据
    const user = await getUserById(userId);
    
    // 发送邮件通知
    await sendMail({
      to: user.emailAddress,
      subject: subject,
      content: `<div>${message}</div>`
    });
    
    console.log(`Notification email sent to ${user.username}`);
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
};
```

## 8. 监控和维护

### 8.1 设置日志监控
```bash
# Docker方式
docker-compose logs -f postal

# 直接安装方式
journalctl -fu postal
```

### 8.2 数据库备份
```bash
# Docker方式
docker-compose exec mariadb mysqldump -u root -p postal > postal_backup_$(date +%Y%m%d).sql

# 直接安装方式
mysqldump -u root -p postal > postal_backup_$(date +%Y%m%d).sql
```

### 8.3 设置自动更新证书
```bash
# 创建certbot更新钩子
cat > /etc/letsencrypt/renewal-hooks/post/postal-restart.sh <<EOF
#!/bin/bash
# Docker方式
docker-compose -f /opt/postal/docker-compose.yml restart postal

# 直接安装方式
# systemctl restart postal
EOF

chmod +x /etc/letsencrypt/renewal-hooks/post/postal-restart.sh
```

## 9. 故障排除

### 9.1 SMTP端口测试
```bash
# 测试SMTP连接
telnet mail.example.com 25
```

### 9.2 检查邮件投递状态
在Postal管理界面中的"消息"选项卡中检查邮件投递状态和错误。

### 9.3 常见问题与解决方案

1. **邮件被标记为垃圾邮件**
   - 检查SPF, DKIM, DMARC记录
   - 确保反向DNS正确配置
   - 在管理界面中查看发送信誉

2. **无法发送邮件**
   - 检查防火墙设置，确保端口25开放
   - 检查邮件服务器日志
   - 验证API密钥权限

3. **应用集成问题**
   - 使用Postal API Explorer测试API
   - 检查Node-RED流程的日志
   - 验证认证和授权配置

## 10. 安全最佳实践

1. **启用防火墙，仅开放必要端口**
```bash
ufw allow 22/tcp
ufw allow 25/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

2. **定期更新系统和Postal**
```bash
# 系统更新
apt update && apt upgrade -y

# Docker方式更新Postal
docker-compose pull
docker-compose up -d

# 直接安装方式更新Postal
cd /opt/postal/app
git pull
bundle install
bundle exec rake postal:upgrade
systemctl restart postal
```

3. **配置CSRF保护和速率限制**
在Postal配置中启用这些安全特性。

4. **使用强密码和定期轮换API密钥**
定期在Postal管理界面中更新API密钥。

## 总结

通过按照这个详细指南部署Postal邮件系统，您现在拥有了一个功能齐全的内部邮件系统，可以与您的移动应用完全集成。此设置提供了一个安全、可靠的解决方案，用于应用内消息传递和通知。

如需更多帮助，可以参考:
- [Postal 官方文档](https://github.com/postalserver/postal/wiki)
- [Postal API 文档](https://github.com/postalserver/postal/wiki/HTTP-API)
- [Node-RED 文档](https://nodered.org/docs/) 