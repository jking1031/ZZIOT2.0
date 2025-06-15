-- =============================================
-- App权限管理初始化数据脚本
-- 基于前端departmentPermissions.js配置
-- =============================================

-- =============================================
-- 1. 插入权限模块数据
-- =============================================
INSERT INTO permission_modules (module_key, module_name, description, sort_order) VALUES
('data', '数据管理', '数据录入、查询和管理相关功能', 1),
('report', '报表管理', '报表生成、查询和管理功能', 2),
('system', '系统管理', '系统配置和用户管理功能', 3),
('tool', '工具计算', '各类计算工具和辅助功能', 4),
('file', '文件管理', '文件上传、下载和管理功能', 5),
('message', '消息管理', '系统消息和通知管理功能', 6);

-- =============================================
-- 2. 插入页面权限数据
-- =============================================

-- 数据管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, sort_order) VALUES
('data_entry', '数据录入', (SELECT id FROM permission_modules WHERE module_key = 'data'), '数据录入页面访问权限', '/data/entry', 1),
('data_query', '数据查询', (SELECT id FROM permission_modules WHERE module_key = 'data'), '数据查询页面访问权限', '/data/query', 2),
('lab_data', '实验室数据', (SELECT id FROM permission_modules WHERE module_key = 'data'), '实验室数据管理页面', '/data/lab', 3),
('sludge_data', '污泥数据', (SELECT id FROM permission_modules WHERE module_key = 'data'), '污泥数据管理页面', '/data/sludge', 4),
('ao_data', 'AO数据', (SELECT id FROM permission_modules WHERE module_key = 'data'), 'AO工艺数据管理页面', '/data/ao', 5),
('history_data', '历史数据', (SELECT id FROM permission_modules WHERE module_key = 'data'), '历史数据查询页面', '/data/history', 6);

-- 报表管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, sort_order) VALUES
('reports', '报表管理', (SELECT id FROM permission_modules WHERE module_key = 'report'), '报表管理主页面', '/reports', 1),
('report_form', '报表表单', (SELECT id FROM permission_modules WHERE module_key = 'report'), '报表表单填写页面', '/reports/form', 2),
('report_query', '报表查询', (SELECT id FROM permission_modules WHERE module_key = 'report'), '报表查询页面', '/reports/query', 3),
('dynamic_reports', '动态报表', (SELECT id FROM permission_modules WHERE module_key = 'report'), '动态报表生成页面', '/reports/dynamic', 4);

-- 系统管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, sort_order) VALUES
('user_management', '用户管理', (SELECT id FROM permission_modules WHERE module_key = 'system'), '用户账户管理页面', '/system/users', 1),
('api_management', 'API管理', (SELECT id FROM permission_modules WHERE module_key = 'system'), 'API接口管理页面', '/system/api', 2),
('oauth2_config', 'OAuth2配置', (SELECT id FROM permission_modules WHERE module_key = 'system'), 'OAuth2认证配置页面', '/system/oauth2', 3),
('site_management', '站点管理', (SELECT id FROM permission_modules WHERE module_key = 'system'), '站点信息管理页面', '/system/sites', 4),
('department_permission', '部门权限管理', (SELECT id FROM permission_modules WHERE module_key = 'system'), '部门权限配置页面', '/system/permissions', 5);

-- 工具计算模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, sort_order) VALUES
('dosing_calculator', '投药计算器', (SELECT id FROM permission_modules WHERE module_key = 'tool'), '投药量计算工具', '/tools/dosing', 1),
('pac_calculator', 'PAC计算器', (SELECT id FROM permission_modules WHERE module_key = 'tool'), 'PAC投加量计算工具', '/tools/pac', 2),
('pam_calculator', 'PAM计算器', (SELECT id FROM permission_modules WHERE module_key = 'tool'), 'PAM投加量计算工具', '/tools/pam', 3),
('excess_sludge_calculator', '剩余污泥计算器', (SELECT id FROM permission_modules WHERE module_key = 'tool'), '剩余污泥量计算工具', '/tools/sludge', 4),
('carbon_calc', '碳源计算', (SELECT id FROM permission_modules WHERE module_key = 'tool'), '碳源投加计算工具', '/tools/carbon', 5);

-- 文件管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, sort_order) VALUES
('file_upload', '文件上传', (SELECT id FROM permission_modules WHERE module_key = 'file'), '文件上传管理页面', '/files/upload', 1),
('dav_screen', 'DAV文件管理', (SELECT id FROM permission_modules WHERE module_key = 'file'), 'DAV文件系统管理页面', '/files/dav', 2);

-- 消息管理模块权限
INSERT INTO page_permissions (permission_id, permission_name, module_id, description, route_path, sort_order) VALUES
('messages', '消息管理', (SELECT id FROM permission_modules WHERE module_key = 'message'), '系统消息管理页面', '/messages', 1),
('message_query', '消息查询', (SELECT id FROM permission_modules WHERE module_key = 'message'), '消息查询页面', '/messages/query', 2);

-- =============================================
-- 3. 插入部门数据
-- =============================================
INSERT INTO departments (department_key, department_name, description, color, sort_order) VALUES
('技术部', '技术部', '负责系统技术支持和数据分析', '#2196F3', 1),
('运营部', '运营部', '负责日常运营和数据录入', '#4CAF50', 2),
('管理部', '管理部', '负责系统级配置和用户账户管理', '#FF9800', 3),
('质检部', '质检部', '负责质量检测和实验室数据管理', '#9C27B0', 4),
('财务部', '财务部', '负责财务相关报表和数据查看', '#607D8B', 5),
('维护部', '维护部', '负责设备维护和相关数据录入', '#795548', 6);

-- =============================================
-- 4. 插入部门页面权限关联数据
-- =============================================

-- 技术部权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level)
SELECT 
    d.id,
    p.id,
    2 -- 读写权限
FROM departments d, page_permissions p
WHERE d.department_key = '技术部'
AND p.permission_id IN (
    'data_entry', 'data_query', 'lab_data', 'sludge_data', 'ao_data', 'history_data',
    'reports', 'report_form', 'report_query', 'dynamic_reports',
    'dosing_calculator', 'pac_calculator', 'pam_calculator', 'excess_sludge_calculator', 'carbon_calc',
    'file_upload', 'dav_screen', 'messages'
);

-- 运营部权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level)
SELECT 
    d.id,
    p.id,
    2 -- 读写权限
FROM departments d, page_permissions p
WHERE d.department_key = '运营部'
AND p.permission_id IN (
    'data_entry', 'data_query', 'lab_data',
    'reports', 'report_form', 'report_query',
    'dosing_calculator', 'pac_calculator', 'pam_calculator',
    'messages', 'message_query'
);

-- 管理部权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level)
SELECT 
    d.id,
    p.id,
    3 -- 管理员权限
FROM departments d, page_permissions p
WHERE d.department_key = '管理部'
AND p.permission_id IN (
    'user_management', 'api_management', 'oauth2_config', 'site_management', 'department_permission',
    'data_query', 'history_data',
    'reports', 'report_query', 'dynamic_reports',
    'messages', 'message_query'
);

-- 质检部权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level)
SELECT 
    d.id,
    p.id,
    2 -- 读写权限
FROM departments d, page_permissions p
WHERE d.department_key = '质检部'
AND p.permission_id IN (
    'lab_data', 'data_query', 'history_data',
    'reports', 'report_form', 'carbon_calc',
    'file_upload'
);

-- 财务部权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level)
SELECT 
    d.id,
    p.id,
    1 -- 只读权限
FROM departments d, page_permissions p
WHERE d.department_key = '财务部'
AND p.permission_id IN (
    'data_query', 'reports', 'report_query', 'dynamic_reports'
);

-- 维护部权限
INSERT INTO department_page_permissions (department_id, permission_id, permission_level)
SELECT 
    d.id,
    p.id,
    2 -- 读写权限
FROM departments d, page_permissions p
WHERE d.department_key = '维护部'
AND p.permission_id IN (
    'data_entry', 'data_query', 'sludge_data', 'ao_data',
    'reports', 'dosing_calculator', 'excess_sludge_calculator',
    'messages'
);

-- =============================================
-- 5. 创建默认管理员用户
-- =============================================
INSERT INTO users (username, email, full_name, is_admin, is_active) VALUES
('admin', 'admin@zziot.com', '系统管理员', TRUE, TRUE),
('demo_user', 'demo@zziot.com', '演示用户', FALSE, TRUE);

-- 将管理员分配到管理部
INSERT INTO user_departments (user_id, department_id, role, is_primary)
SELECT 
    u.id,
    d.id,
    'admin',
    TRUE
FROM users u, departments d
WHERE u.username = 'admin' AND d.department_key = '管理部';

-- 将演示用户分配到技术部
INSERT INTO user_departments (user_id, department_id, role, is_primary)
SELECT 
    u.id,
    d.id,
    'member',
    TRUE
FROM users u, departments d
WHERE u.username = 'demo_user' AND d.department_key = '技术部';

SELECT 'App权限管理初始化数据插入完成!' as message;
SELECT 
    '权限模块数量:' as type, COUNT(*) as count FROM permission_modules
UNION ALL
SELECT 
    '页面权限数量:' as type, COUNT(*) as count FROM page_permissions
UNION ALL
SELECT 
    '部门数量:' as type, COUNT(*) as count FROM departments
UNION ALL
SELECT 
    '部门权限关联数量:' as type, COUNT(*) as count FROM department_page_permissions
UNION ALL
SELECT 
    '用户数量:' as type, COUNT(*) as count FROM users
UNION ALL
SELECT 
    '用户部门关联数量:' as type, COUNT(*) as count FROM user_departments;