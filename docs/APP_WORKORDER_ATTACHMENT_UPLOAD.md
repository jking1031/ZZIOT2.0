# App 工单附件上传集成文档

## 概述

本文档说明如何在移动App中实现工单附件上传功能，以适配若依(RuoYi)后端系统。

## 1. 文件上传API

### 1.1 上传接口

**接口地址：** `POST /app-api/infra/file/upload`

**请求数据类型：** `application/x-www-form-urlencoded`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 要上传的文件 |
| directory | String | 否 | 上传目录，建议使用 "workorder" |

### 1.2 请求示例

```javascript
// React Native / Expo 示例
const uploadFile = async (fileUri, fileName) => {
  const formData = new FormData();
  
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg', // 根据实际文件类型设置
    name: fileName
  });
  
  formData.append('directory', 'workorder');
  
  try {
    const response = await fetch(`${API_BASE_URL}/infra/file/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${accessToken}`,
        'tenant-id': tenantId // 如果启用多租户
      },
      body: formData
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};
```

### 1.3 响应格式

**成功响应：**
```json
{
  "code": 0,
  "data": "https://your-domain.com/infra/file/get/workorder/2024/01/15/abc123.jpg",
  "msg": "操作成功"
}
```

**失败响应：**
```json
{
  "code": 500,
  "data": null,
  "msg": "文件上传失败"
}
```

## 2. 文件名转换要求

### 2.1 支持的文件格式

- **图片格式：** jpg, jpeg, png, gif, bmp, webp
- **文档格式：** pdf, doc, docx, txt
- **其他格式：** zip, rar

### 2.2 文件大小限制

- **单个文件：** 最大 5MB
- **总数量：** 每个工单最多 5 个附件

### 2.3 文件名处理

后端会自动处理文件名：

1. **原始文件名：** `我的图片.jpg`
2. **系统生成名：** `abc123def456.jpg`
3. **存储路径：** `/workorder/2024/01/15/abc123def456.jpg`
4. **访问URL：** `https://domain.com/infra/file/get/workorder/2024/01/15/abc123def456.jpg`

## 3. 工单创建时的附件处理

### 3.1 创建工单API

**接口地址：** `POST /admin-api//workorder/work-order/create`
**请求参数：**
```json
{
  "title": "设备故障报修",
  "description": "空调不制冷，需要维修",
  "priority": "high",
  "deadline": "2024-01-20 18:00:00",
  "attachments": [
    "https://domain.com/infra/file/get/workorder/2024/01/15/abc123.jpg",
    "https://domain.com/infra/file/get/workorder/2024/01/15/def456.jpg"
  ]
}
```

### 3.2 完整流程示例

```javascript
// 1. 先上传附件
const uploadAttachments = async (files) => {
  const attachmentUrls = [];
  
  for (const file of files) {
    try {
      const result = await uploadFile(file.uri, file.name);
      if (result.code === 0) {
        attachmentUrls.push(result.data);
      }
    } catch (error) {
      console.error('附件上传失败:', error);
    }
  }
  
  return attachmentUrls;
};

// 2. 创建工单
const createWorkOrder = async (workOrderData, files) => {
  // 先上传附件
  const attachments = await uploadAttachments(files);
  
  // 创建工单
  const response = await fetch(`${API_BASE_URL}/workorder/work-order/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'tenant-id': tenantId
    },
    body: JSON.stringify({
      ...workOrderData,
      attachments: attachments
    })
  });
  
  return await response.json();
};
```

## 4. 工单完成时的附件处理

### 4.1 完成工单API

**接口地址：** `POST /workorder/work-order/finish`

**请求参数：**
```json
{
  "id": 1,
  "solution": "已更换空调压缩机",
  "content": "设备已修复，运行正常",
  "attachments": [
    "https://domain.com/infra/file/get/workorder/2024/01/15/result1.jpg",
    "https://domain.com/infra/file/get/workorder/2024/01/15/result2.jpg"
  ]
}
```



## 6. 错误处理

### 6.1 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查文件格式和大小 |
| 401 | 未授权 | 检查token是否有效 |
| 413 | 文件过大 | 压缩文件或选择较小文件 |
| 415 | 不支持的文件类型 | 选择支持的文件格式 |
| 500 | 服务器错误 | 稍后重试或联系管理员 |

### 6.2 错误处理示例

```javascript
const handleUploadError = (error, fileName) => {
  let message = '上传失败';
  
  if (error.response) {
    switch (error.response.status) {
      case 413:
        message = `文件 ${fileName} 过大，请选择小于5MB的文件`;
        break;
      case 415:
        message = `文件 ${fileName} 格式不支持`;
        break;
      case 401:
        message = '登录已过期，请重新登录';
        break;
      default:
        message = error.response.data?.msg || '上传失败';
    }
  }
  
  Alert.alert('上传错误', message);
};
```

## 7. 最佳实践

### 7.1 性能优化

1. **图片压缩：** 上传前压缩图片以减少文件大小
2. **并发控制：** 限制同时上传的文件数量
3. **进度显示：** 显示上传进度提升用户体验
4. **缓存机制：** 缓存已上传的文件URL

### 7.2 用户体验

1. **预览功能：** 上传前预览选中的文件
2. **删除功能：** 允许用户删除已选择的文件
3. **重试机制：** 上传失败时提供重试选项
4. **离线处理：** 网络恢复后自动重试上传


## 8. 调试技巧

### 8.1 网络请求调试

```javascript
// 开启网络请求日志
const uploadFileWithLog = async (fileUri, fileName) => {
  console.log('开始上传文件:', fileName);
  console.log('文件URI:', fileUri);
  
  try {
    const result = await uploadFile(fileUri, fileName);
    console.log('上传成功:', result);
    return result;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
};
```

### 8.2 常见问题排查

1. **文件路径问题：** 确保文件URI格式正确
2. **权限问题：** 检查文件读取权限
3. **网络问题：** 检查网络连接和服务器状态
4. **格式问题：** 确认Content-Type设置正确

---

**注意事项：**
- 确保后端已启动文件上传服务
- 配置正确的文件存储路径
- 设置合适的跨域策略
- 定期清理无用的上传文件

**技术支持：**
如遇到问题，请检查后端日志或联系系统管理员。