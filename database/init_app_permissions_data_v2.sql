-- App权限管理初始化数据脚本 V2.0
-- 基于ruoyi用户系统集成的权限管理设计
-- =============================================

-- 清空现有数据（按依赖关系倒序删除）
DELETE FROM user_department_permissions;
DELETE FROM department_page_permissions;
DELETE FROM user_departments;
DELETE FROM page_permissions;
DELETE FROM permission_modules;
DELETE FROM departments;
DELETE FROM permission_audit_logs;

-- 重置自增ID
ALTER TABLE permission_modules AUTO_INCREMENT = 1;
ALTER TABLE page_permissions AUTO_INCREMENT = 1;
ALTER TABLE departments AUTO_INCREMENT = 1;
ALTER TABLE user_departments AUTO_INCREMENT = 1;
ALTER TABLE department_page_permissions AUTO_INCREMENT = 1;
ALTER TABLE user_department_permissions AUTO_INCREMENT = 1;
ALTER TABLE permission_audit_logs AUTO_INCREMENT = 1;

-- =============================================
-- 1. 插入权限模块数据
-- =============================================
INSERT INTO permission_modules (module_key, module_name, description, sort_order, is_active) VALUES
('system', '系统管理', '系统核心功能管理模块', 1, TRUE),
('device', '设备管理', '设备监控和管理功能模块', 2, TRUE),
('data', '数据分析', '数据统计和分析功能模块', 3, TRUE),
('user', '用户管理', '用户和权限管理功能模块', 4, TRUE),
('config', '配置管理', '系统配置和参数管理模块', 5, TRUE),
('report', '报表管理', '报表生成和查看功能模块', 6, TRUE),
('log', '日志管理', '系统日志和审计功能模块', 7, TRUE),
('api', 'API管理', 'API接口和集成管理模块', 8, TRUE);

-- =============================================
-- 2. 插入页面权限数据
-- =============================================

-- 系统管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('system.dashboard', '系统仪表板', 1, '查看系统总览和状态信息', '/dashboard', 'dashboard', 1, TRUE),
('system.settings', '系统设置', 1, '修改系统基础配置', '/settings', 'settings', 2, TRUE),
('system.backup', '数据备份', 1, '执行数据备份和恢复操作', '/backup', 'backup', 3, TRUE),
('system.maintenance', '系统维护', 1, '系统维护和升级管理', '/maintenance', 'build', 4, TRUE);

-- 设备管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('device.list', '设备列表', 2, '查看和管理设备清单', '/devices', 'devices', 1, TRUE),
('device.monitor', '设备监控', 2, '实时监控设备状态', '/device-monitor', 'monitor', 2, TRUE),
('device.control', '设备控制', 2, '远程控制设备操作', '/device-control', 'control_camera', 3, TRUE),
('device.config', '设备配置', 2, '配置设备参数和规则', '/device-config', 'tune', 4, TRUE);

-- 数据分析模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('data.overview', '数据概览', 3, '查看数据统计概览', '/data-overview', 'analytics', 1, TRUE),
('data.charts', '数据图表', 3, '查看各类数据图表', '/data-charts', 'bar_chart', 2, TRUE),
('data.export', '数据导出', 3, '导出数据到文件', '/data-export', 'file_download', 3, TRUE),
('data.analysis', '数据分析', 3, '执行高级数据分析', '/data-analysis', 'science', 4, TRUE);

-- 用户管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('user.list', '用户列表', 4, '查看和管理用户信息', '/users', 'people', 1, TRUE),
('user.permissions', '权限管理', 4, '管理用户和部门权限', '/permissions', 'security', 2, TRUE),
('user.departments', '部门管理', 4, '管理部门结构和成员', '/departments', 'corporate_fare', 3, TRUE),
('user.roles', '角色管理', 4, '管理用户角色和权限组', '/roles', 'admin_panel_settings', 4, TRUE);

-- 配置管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('config.general', '通用配置', 5, '管理系统通用配置参数', '/config-general', 'settings_applications', 1, TRUE),
('config.network', '网络配置', 5, '配置网络连接和通信参数', '/config-network', 'wifi', 2, TRUE),
('config.security', '安全配置', 5, '配置安全策略和认证参数', '/config-security', 'shield', 3, TRUE),
('config.integration', '集成配置', 5, '配置第三方系统集成参数', '/config-integration', 'integration_instructions', 4, TRUE);

-- 报表管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('report.daily', '日报表', 6, '查看和生成日报表', '/reports/daily', 'today', 1, TRUE),
('report.weekly', '周报表', 6, '查看和生成周报表', '/reports/weekly', 'date_range', 2, TRUE),
('report.monthly', '月报表', 6, '查看和生成月报表', '/reports/monthly', 'calendar_month', 3, TRUE),
('report.custom', '自定义报表', 6, '创建和管理自定义报表', '/reports/custom', 'assessment', 4, TRUE);

-- 日志管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('log.system', '系统日志', 7, '查看系统运行日志', '/logs/system', 'description', 1, TRUE),
('log.operation', '操作日志', 7, '查看用户操作日志', '/logs/operation', 'history', 2, TRUE),
('log.error', '错误日志', 7, '查看系统错误日志', '/logs/error', 'error', 3, TRUE),
('log.audit', '审计日志', 7, '查看安全审计日志', '/logs/audit', 'fact_check', 4, TRUE);

-- API管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('api.endpoints', 'API端点', 8, '管理API端点和接口', '/api/endpoints', 'api', 1, TRUE),
('api.keys', 'API密钥', 8, '管理API访问密钥', '/api/keys', 'vpn_key', 2, TRUE),
('api.monitor', 'API监控', 8, '监控API调用和性能', '/api/monitor', 'speed', 3, TRUE),
('api.docs', 'API文档', 8, '查看和管理API文档', '/api/docs', 'article', 4, TRUE);

-- =============================================
-- 3. 插入部门数据
-- =============================================
INSERT INTO departments (department_key, department_name, description, color, parent_id, is_system, sort_order, is_active) VALUES
('admin', '系统管理员', '拥有系统最高权限的管理员部门', '#f44336', NULL, TRUE, 1, TRUE),
('operations', '运维部门', '负责系统运维和设备管理的部门', '#2196f3', NULL, TRUE, 2, TRUE),
('analysis', '数据分析部门', '负责数据分析和报表生成的部门', '#4caf50', NULL, TRUE, 3, TRUE),
('support', '技术支持部门', '负责用户支持和问题处理的部门', '#ff9800', NULL, TRUE, 4, TRUE),
('guest', '访客部门', '临时访问用户的默认部门', '#9e9e9e', NULL, TRUE, 5, TRUE);

-- =============================================
-- 4. 插入部门权限关联数据
-- =============================================

-- 系统管理员部门 - 拥有所有权限（管理员级别）
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) 
SELECT 1, id, 3, 'system', NOW() FROM page_permissions WHERE is_active = TRUE;

-- 运维部门 - 拥有系统、设备、配置、日志相关权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 系统管理权限（读写）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'system.dashboard'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'system.settings'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'system.backup'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'system.maintenance'), 2, 'system', NOW()),
-- 设备管理权限（读写）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'device.list'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'device.monitor'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'device.control'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'device.config'), 2, 'system', NOW()),
-- 配置管理权限（读写）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'config.general'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'config.network'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'config.security'), 1, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'config.integration'), 2, 'system', NOW()),
-- 日志管理权限（只读）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'log.system'), 1, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'log.operation'), 1, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'log.error'), 1, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'log.audit'), 1, 'system', NOW());

-- 数据分析部门 - 拥有数据分析和报表相关权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 系统概览权限（只读）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'system.dashboard'), 1, 'system', NOW()),
-- 设备监控权限（只读）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'device.list'), 1, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'device.monitor'), 1, 'system', NOW()),
-- 数据分析权限（读写）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'data.overview'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'data.charts'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'data.export'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'data.analysis'), 2, 'system', NOW()),
-- 报表管理权限（读写）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'report.daily'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'report.weekly'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'report.monthly'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'report.custom'), 2, 'system', NOW());

-- 技术支持部门 - 拥有基础查看和用户管理权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 系统概览权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'system.dashboard'), 1, 'system', NOW()),
-- 设备查看权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'device.list'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'device.monitor'), 1, 'system', NOW()),
-- 数据查看权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'data.overview'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'data.charts'), 1, 'system', NOW()),
-- 用户管理权限（读写）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'user.list'), 2, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'user.permissions'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'user.departments'), 1, 'system', NOW()),
-- 日志查看权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'log.operation'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'log.error'), 1, 'system', NOW());

-- 访客部门 - 只有基础查看权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 系统概览权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'system.dashboard'), 1, 'system', NOW()),
-- 设备查看权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'device.list'), 1, 'system', NOW()),
(5, (SELECT id FROM page_permissions WHERE permission_id = 'device.monitor'), 1, 'system', NOW()),
-- 数据查看权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'data.overview'), 1, 'system', NOW()),
(5, (SELECT id FROM page_permissions WHERE permission_id = 'data.charts'), 1, 'system', NOW());

-- =============================================
-- 5. 插入示例用户部门关联数据（可选，用于测试）
-- =============================================
-- 注意：这里使用示例ruoyi用户ID，实际使用时需要替换为真实的ruoyi用户ID

-- 示例：将ruoyi用户ID为'1'的用户分配到系统管理员部门
-- INSERT INTO user_departments (ruoyi_user_id, department_id, role, is_primary) VALUES
-- ('1', 1, 'admin', TRUE);

-- 示例：将ruoyi用户ID为'2'的用户分配到运维部门
-- INSERT INTO user_departments (ruoyi_user_id, department_id, role, is_primary) VALUES
-- ('2', 2, 'leader', TRUE);

-- 示例：将ruoyi用户ID为'3'的用户分配到数据分析部门
-- INSERT INTO user_departments (ruoyi_user_id, department_id, role, is_primary) VALUES
-- ('3', 3, 'member', TRUE);

-- =============================================
-- 6. 插入权限操作日志示例（可选）
-- =============================================
-- 记录初始化操作日志
INSERT INTO permission_audit_logs (ruoyi_user_id, action_type, target_type, target_id, description, ip_address) VALUES
('system', 'GRANT', 'DEPARTMENT', '1', '系统初始化：创建系统管理员部门并授予所有权限', '127.0.0.1'),
('system', 'GRANT', 'DEPARTMENT', '2', '系统初始化：创建运维部门并授予相关权限', '127.0.0.1'),
('system', 'GRANT', 'DEPARTMENT', '3', '系统初始化：创建数据分析部门并授予相关权限', '127.0.0.1'),
('system', 'GRANT', 'DEPARTMENT', '4', '系统初始化：创建技术支持部门并授予相关权限', '127.0.0.1'),
('system', 'GRANT', 'DEPARTMENT', '5', '系统初始化：创建访客部门并授予基础权限', '127.0.0.1');

-- =============================================
-- 数据初始化完成
-- =============================================

-- 显示初始化结果统计
SELECT 
    '权限模块' as 类型,
    COUNT(*) as 数量
FROM permission_modules WHERE is_active = TRUE
UNION ALL
SELECT 
    '页面权限' as 类型,
    COUNT(*) as 数量
FROM page_permissions WHERE is_active = TRUE
UNION ALL
SELECT 
    '部门' as 类型,
    COUNT(*) as 数量
FROM departments WHERE is_active = TRUE
UNION ALL
SELECT 
    '部门权限关联' as 类型,
    COUNT(*) as 数量
FROM department_page_permissions
UNION ALL
SELECT 
    '用户部门关联' as 类型,
    COUNT(*) as 数量
FROM user_departments
UNION ALL
SELECT 
    '操作日志' as 类型,
    COUNT(*) as 数量
FROM permission_audit_logs;