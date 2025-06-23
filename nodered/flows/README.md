# Node-RED API 流程部署指南

## 概述

本目录包含了用于处理微信小程序API请求的Node-RED流程文件。

## 流程文件说明

### 1. `wx_stats_overview_flow.json` - 微信概览数据API（推荐）

**用途**: 专门处理微信小程序的 `/api/wx/stats/overview` 请求

**特点**:
- 轻量级，响应速度快
- 直接返回模拟数据
- 包含完整的错误处理
- 支持CORS跨域

### 2. `api_standardization_flow.json` - 完整API标准化流程

**用途**: 提供完整的API标准化处理框架

**特点**:
- 支持多个API端点
- 包含缓存机制
- 数据验证
- 请求追踪
- 完整的监控和日志

## 部署步骤

### 快速解决当前问题（推荐）

1. **导入微信API流程**:
   ```
   Node-RED编辑器 → 菜单 → Import → 选择文件 → wx_stats_overview_flow.json
   ```

2. **部署流程**:
   ```
   点击右上角 "Deploy" 按钮
   ```

3. **测试API**:
   ```bash
   curl "https://nodered.jzz77.cn:9003/api/wx/stats/overview"
   ```

### 完整标准化部署

1. **导入标准化流程**:
   ```
   Node-RED编辑器 → 菜单 → Import → 选择文件 → api_standardization_flow.json
   ```

2. **配置业务逻辑**:
   - 修改 `overview_processor` 节点中的数据获取逻辑
   - 连接实际的数据库或数据源
   - 调整缓存策略

3. **部署和测试**:
   ```bash
   # 概览数据
   curl "https://nodered.jzz77.cn:9003/api/wx/stats/overview"
   
   # 站点列表
   curl "https://nodered.jzz77.cn:9003/api/site/sites?page=1&pageSize=10"
   
   # 设备状态
   curl "https://nodered.jzz77.cn:9003/api/device/status?siteId=site001"
   ```

## 故障排除

### 1. 超时问题

**症状**: 前端显示 `request:fail timeout`

**解决方案**:
- 确保Node-RED服务正在运行
- 检查端口9003是否开放
- 验证SSL证书配置
- 检查防火墙设置

### 2. 端点不匹配

**症状**: 404 Not Found

**解决方案**:
- 确认前端配置的URL路径与Node-RED流程中的URL一致
- 检查 `businessConfig.js` 中的端点配置
- 验证Node-RED流程已正确部署

### 3. CORS错误

**症状**: 跨域请求被阻止

**解决方案**:
- 检查响应头中是否包含正确的CORS设置
- 确认 `Access-Control-Allow-Origin` 设置正确

## 监控和调试

### 1. Node-RED调试面板

- 打开Node-RED编辑器
- 查看右侧调试面板
- 观察请求日志和错误信息

### 2. 浏览器开发者工具

- 打开Network标签
- 查看API请求的详细信息
- 检查响应状态码和响应体

### 3. 服务器日志

```bash
# 查看Node-RED日志
tail -f /var/log/nodered/nodered.log

# 查看系统日志
journalctl -u nodered -f
```

## 性能优化建议

1. **启用缓存**: 对于不经常变化的数据启用缓存机制
2. **数据库连接池**: 使用连接池管理数据库连接
3. **异步处理**: 对于耗时操作使用异步处理
4. **压缩响应**: 启用gzip压缩减少传输大小
5. **监控指标**: 设置性能监控和告警

## 联系支持

如果遇到问题，请提供以下信息：
- Node-RED版本
- 错误日志
- 请求URL和参数
- 浏览器网络面板截图