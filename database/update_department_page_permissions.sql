-- =============================================
-- 基于实际项目页面的部门权限配置更新脚本
-- 为每个部门配置其可以管理的实际页面权限
-- =============================================

-- 清空现有的页面权限数据，重新配置
DELETE FROM department_page_permissions;
DELETE FROM page_permissions;

-- 重置自增ID
ALTER TABLE page_permissions AUTO_INCREMENT = 1;
ALTER TABLE department_page_permissions AUTO_INCREMENT = 1;

-- =============================================
-- 1. 插入基于实际项目页面的权限数据
-- =============================================

-- 系统管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.home', '首页', 1, '系统首页和概览信息', '/home', 'home', 1, TRUE),
('page.login', '登录页面', 1, '用户登录界面', '/login', 'login', 2, TRUE),
('page.profile', '个人资料', 1, '用户个人信息管理', '/profile', 'person', 3, TRUE),
('page.oauth2_config', 'OAuth2配置', 1, 'OAuth2认证配置管理', '/oauth2-config', 'security', 4, TRUE),
('page.splash', '启动页面', 1, '应用启动界面', '/splash', 'launch', 5, TRUE);

-- 用户管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.user_management', '用户管理', 4, '用户信息管理和权限分配', '/user-management', 'people', 1, TRUE),
('page.department_permission', '部门权限管理', 4, '部门权限配置和管理', '/department-permission', 'admin_panel_settings', 2, TRUE);

-- 数据管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.data_center', '数据中心', 3, '数据管理中心主页', '/data-center', 'storage', 1, TRUE),
('page.data_entry_center', '数据录入中心', 3, '数据录入管理中心', '/data-entry-center', 'input', 2, TRUE),
('page.data_query_center', '数据查询中心', 3, '数据查询管理中心', '/data-query-center', 'search', 3, TRUE),
('page.data_query', '数据查询', 3, '通用数据查询功能', '/data-query', 'find_in_page', 4, TRUE),
('page.history_data_query', '历史数据查询', 3, '历史数据查询和分析', '/history-data-query', 'history', 5, TRUE),
('page.ao_data_entry', 'AO数据录入', 3, 'AO相关数据录入', '/ao-data-entry', 'edit', 6, TRUE),
('page.ao_data_query', 'AO数据查询', 3, 'AO相关数据查询', '/ao-data-query', 'query_stats', 7, TRUE),
('page.lab_data_entry', '实验室数据录入', 3, '实验室数据录入管理', '/lab-data-entry', 'science', 8, TRUE),
('page.lab_data', '实验室数据', 3, '实验室数据管理', '/lab-data', 'biotech', 9, TRUE),
('page.sludge_data_entry', '污泥数据录入', 3, '污泥相关数据录入', '/sludge-data-entry', 'water_drop', 10, TRUE);

-- 报表管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.report', '报表管理', 6, '报表生成和管理', '/report', 'assessment', 1, TRUE),
('page.report_query', '报表查询', 6, '报表查询和浏览', '/report-query', 'table_view', 2, TRUE),
('page.report_form', '报表表单', 6, '报表表单填写', '/report-form', 'description', 3, TRUE),
('page.report_form_5000', '5000报表', 6, '5000类型报表管理', '/report-form-5000', 'format_list_numbered', 4, TRUE),
('page.report_form_pump_station', '泵站报表', 6, '泵站相关报表管理', '/report-form-pump-station', 'water_pump', 5, TRUE),
('page.report_form_sludge', '污泥报表', 6, '污泥相关报表管理', '/report-form-sludge', 'layers', 6, TRUE),
('page.dynamic_reports', '动态报表', 6, '动态生成报表功能', '/dynamic-reports', 'dynamic_feed', 7, TRUE);

-- 设备管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.site_list', '站点列表', 2, '监测站点列表管理', '/site-list', 'location_on', 1, TRUE),
('page.site_detail', '站点详情', 2, '监测站点详细信息', '/site-detail', 'info', 2, TRUE),
('page.box', '设备箱管理', 2, '设备箱状态和管理', '/box', 'inventory_2', 3, TRUE),
('page.dav', 'DAV设备', 2, 'DAV设备管理', '/dav', 'device_hub', 4, TRUE);

-- 计算工具模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.carbon_calc', '碳计算器', 5, '碳排放计算工具', '/carbon-calc', 'eco', 1, TRUE),
('page.dosing_calculator', '投药计算器', 5, '投药量计算工具', '/dosing-calculator', 'calculate', 2, TRUE),
('page.excess_sludge_calculator', '剩余污泥计算器', 5, '剩余污泥计算工具', '/excess-sludge-calculator', 'functions', 3, TRUE),
('page.pac_calculator', 'PAC计算器', 5, 'PAC投药计算工具', '/pac-calculator', 'science', 4, TRUE),
('page.pam_calculator', 'PAM计算器', 5, 'PAM投药计算工具', '/pam-calculator', 'biotech', 5, TRUE);

-- 文件管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.file_upload', '文件上传', 8, '文件上传功能', '/file-upload', 'cloud_upload', 1, TRUE),
('page.file_upload_test', '文件上传测试', 8, '文件上传功能测试', '/file-upload-test', 'upload_file', 2, TRUE);

-- 消息管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.message', '消息管理', 7, '系统消息管理', '/message', 'message', 1, TRUE),
('page.message_query', '消息查询', 7, '消息查询和浏览', '/message-query', 'mail', 2, TRUE);

-- API管理模块页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.api_management', 'API管理', 8, 'API接口管理', '/api-management', 'api', 1, TRUE);

-- 其他功能页面权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, icon, sort_order, is_active) VALUES
('page.register', '用户注册', 1, '新用户注册功能', '/register', 'person_add', 6, TRUE),
('page.style_example', '样式示例', 1, '系统样式展示页面', '/style-example', 'palette', 7, TRUE);

-- =============================================
-- 2. 配置部门页面权限关联
-- =============================================

-- 系统管理员部门 - 拥有所有页面的管理权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) 
SELECT 1, id, 3, 'system', NOW() FROM page_permissions WHERE is_active = TRUE;

-- 运维部门 - 拥有设备、数据、文件管理相关页面权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 基础页面权限（只读）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.home'), 1, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.profile'), 2, 'system', NOW()),
-- 设备管理权限（读写）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_list'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_detail'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.box'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.dav'), 2, 'system', NOW()),
-- 数据管理权限（读写）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_center'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_entry_center'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_query_center'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_query'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.history_data_query'), 2, 'system', NOW()),
-- 文件管理权限（读写）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.file_upload'), 2, 'system', NOW()),
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.file_upload_test'), 2, 'system', NOW()),
-- API管理权限（只读）
(2, (SELECT id FROM page_permissions WHERE permission_id = 'page.api_management'), 1, 'system', NOW());

-- 数据分析部门 - 拥有数据分析、报表、计算工具相关页面权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 基础页面权限（只读）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.home'), 1, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.profile'), 2, 'system', NOW()),
-- 数据查询权限（读写）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_center'), 1, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_query_center'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_query'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.history_data_query'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.ao_data_query'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.lab_data'), 2, 'system', NOW()),
-- 报表管理权限（读写）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.report'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_query'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_form'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_form_5000'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_form_pump_station'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_form_sludge'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.dynamic_reports'), 2, 'system', NOW()),
-- 计算工具权限（读写）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.carbon_calc'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.dosing_calculator'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.excess_sludge_calculator'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.pac_calculator'), 2, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.pam_calculator'), 2, 'system', NOW()),
-- 设备查看权限（只读）
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_list'), 1, 'system', NOW()),
(3, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_detail'), 1, 'system', NOW());

-- 技术支持部门 - 拥有用户管理、消息管理、基础查看权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 基础页面权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.home'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.profile'), 2, 'system', NOW()),
-- 用户管理权限（读写）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.user_management'), 2, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.department_permission'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.register'), 2, 'system', NOW()),
-- 消息管理权限（读写）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.message'), 2, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.message_query'), 2, 'system', NOW()),
-- 数据查看权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_center'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_query'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.history_data_query'), 1, 'system', NOW()),
-- 设备查看权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_list'), 1, 'system', NOW()),
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_detail'), 1, 'system', NOW()),
-- 报表查看权限（只读）
(4, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_query'), 1, 'system', NOW());

-- 访客部门 - 只有基础查看权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level, granted_by, granted_at) VALUES
-- 基础页面权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.home'), 1, 'system', NOW()),
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.profile'), 1, 'system', NOW()),
-- 数据查看权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_center'), 1, 'system', NOW()),
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.data_query'), 1, 'system', NOW()),
-- 设备查看权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.site_list'), 1, 'system', NOW()),
-- 报表查看权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.report_query'), 1, 'system', NOW()),
-- 计算工具权限（只读）
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.carbon_calc'), 1, 'system', NOW()),
(5, (SELECT id FROM page_permissions WHERE permission_id = 'page.dosing_calculator'), 1, 'system', NOW());

-- =============================================
-- 3. 插入操作日志
-- =============================================
INSERT INTO permission_audit_logs (ruoyi_user_id, action_type, target_type, target_id, description, ip_address) VALUES
('system', 'UPDATE', 'DEPARTMENT', '1', '更新系统管理员部门页面权限配置', '127.0.0.1'),
('system', 'UPDATE', 'DEPARTMENT', '2', '更新运维部门页面权限配置', '127.0.0.1'),
('system', 'UPDATE', 'DEPARTMENT', '3', '更新数据分析部门页面权限配置', '127.0.0.1'),
('system', 'UPDATE', 'DEPARTMENT', '4', '更新技术支持部门页面权限配置', '127.0.0.1'),
('system', 'UPDATE', 'DEPARTMENT', '5', '更新访客部门页面权限配置', '127.0.0.1');

-- =============================================
-- 4. 显示更新结果统计
-- =============================================
SELECT 
    '页面权限总数' as 统计项,
    COUNT(*) as 数量
FROM page_permissions WHERE is_active = TRUE
UNION ALL
SELECT 
    '部门权限关联总数' as 统计项,
    COUNT(*) as 数量
FROM department_page_permissions
UNION ALL
SELECT 
    CONCAT(d.department_name, '权限数量') as 统计项,
    COUNT(dpp.id) as 数量
FROM departments d
LEFT JOIN department_page_permissions dpp ON d.id = dpp.department_id
WHERE d.is_active = TRUE
GROUP BY d.id, d.department_name
ORDER BY 统计项;

-- =============================================
-- 更新完成
-- =============================================
SELECT '部门页面权限配置更新完成！' as 状态;