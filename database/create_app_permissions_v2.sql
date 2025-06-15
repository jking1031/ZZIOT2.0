-- App权限管理数据库表创建脚本 V2.0
-- 基于ruoyi用户系统集成的权限管理设计
-- 移除独立用户表，直接使用ruoyi用户ID
-- =============================================

-- 删除已存在的表（按依赖关系倒序删除）
DROP TABLE IF EXISTS user_department_permissions;
DROP TABLE IF EXISTS department_page_permissions;
DROP TABLE IF EXISTS user_departments;
DROP TABLE IF EXISTS page_permissions;
DROP TABLE IF EXISTS permission_modules;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS permission_audit_logs;

-- =============================================
-- 1. 权限模块表
-- =============================================
CREATE TABLE permission_modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_key VARCHAR(50) NOT NULL UNIQUE COMMENT '模块标识',
    module_name VARCHAR(100) NOT NULL COMMENT '模块名称',
    description TEXT COMMENT '模块描述',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT='权限模块表';

-- =============================================
-- 2. 页面权限表
-- =============================================
CREATE TABLE page_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    permission_id VARCHAR(100) NOT NULL UNIQUE COMMENT '权限标识',
    permission_name VARCHAR(100) NOT NULL COMMENT '权限名称',
    module_id INT NOT NULL COMMENT '所属模块ID',
    description TEXT COMMENT '权限描述',
    route_path VARCHAR(255) COMMENT '路由路径',
    icon VARCHAR(100) COMMENT '图标',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (module_id) REFERENCES permission_modules(id) ON DELETE CASCADE
) COMMENT='页面权限表';

-- =============================================
-- 3. 部门表
-- =============================================
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_key VARCHAR(50) NOT NULL UNIQUE COMMENT '部门标识',
    department_name VARCHAR(100) NOT NULL COMMENT '部门名称',
    description TEXT COMMENT '部门描述',
    color VARCHAR(7) DEFAULT '#757575' COMMENT '部门颜色',
    parent_id INT NULL COMMENT '上级部门ID',
    is_system BOOLEAN DEFAULT TRUE COMMENT '是否系统预设部门',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
) COMMENT='部门表';

-- =============================================
-- 4. 用户部门关联表（使用ruoyi用户ID）
-- =============================================
CREATE TABLE user_departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ruoyi_user_id VARCHAR(50) NOT NULL COMMENT 'ruoyi系统用户ID',
    department_id INT NOT NULL COMMENT '部门ID',
    role VARCHAR(50) DEFAULT 'member' COMMENT '部门角色: member=成员, leader=负责人, admin=管理员',
    is_primary BOOLEAN DEFAULT FALSE COMMENT '是否主要部门',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_department (ruoyi_user_id, department_id)
) COMMENT='用户部门关联表';

-- =============================================
-- 5. 部门页面权限关联表
-- =============================================
CREATE TABLE department_page_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_id INT NOT NULL COMMENT '部门ID',
    permission_id INT NOT NULL COMMENT '页面权限ID',
    permission_level TINYINT DEFAULT 1 COMMENT '权限级别: 0=无权限, 1=只读, 2=读写, 3=管理员',
    granted_by VARCHAR(50) NULL COMMENT 'ruoyi授权人用户ID',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES page_permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dept_permission (department_id, permission_id)
) COMMENT='部门页面权限关联表';

-- =============================================
-- 6. 用户部门权限表（用户在特定部门的特殊权限）
-- =============================================
CREATE TABLE user_department_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ruoyi_user_id VARCHAR(50) NOT NULL COMMENT 'ruoyi系统用户ID',
    department_id INT NOT NULL COMMENT '部门ID',
    permission_id INT NOT NULL COMMENT '页面权限ID',
    permission_level TINYINT DEFAULT 1 COMMENT '权限级别: 0=无权限, 1=只读, 2=读写, 3=管理员',
    override_reason TEXT COMMENT '特殊权限原因说明',
    granted_by VARCHAR(50) NULL COMMENT 'ruoyi授权人用户ID',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    expires_at TIMESTAMP NULL COMMENT '权限过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES page_permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_dept_permission (ruoyi_user_id, department_id, permission_id)
) COMMENT='用户部门权限表（特殊权限覆盖）';

-- =============================================
-- 7. 权限操作日志表（可选，用于审计）
-- =============================================
CREATE TABLE permission_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ruoyi_user_id VARCHAR(50) NOT NULL COMMENT '操作用户ruoyi ID',
    action_type ENUM('GRANT', 'REVOKE', 'UPDATE', 'LOGIN', 'ACCESS_DENIED') NOT NULL COMMENT '操作类型',
    target_type ENUM('DEPARTMENT', 'USER', 'PERMISSION') NOT NULL COMMENT '目标类型',
    target_id VARCHAR(100) NOT NULL COMMENT '目标ID',
    permission_id INT NULL COMMENT '相关权限ID',
    old_level TINYINT NULL COMMENT '原权限级别',
    new_level TINYINT NULL COMMENT '新权限级别',
    description TEXT COMMENT '操作描述',
    ip_address VARCHAR(45) COMMENT '操作IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    FOREIGN KEY (permission_id) REFERENCES page_permissions(id) ON DELETE SET NULL,
    INDEX idx_user_action (ruoyi_user_id, action_type),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created_at (created_at)
) COMMENT='权限操作审计日志表';

-- =============================================
-- 创建索引以优化查询性能
-- =============================================

-- 权限模块表索引
CREATE INDEX idx_permission_modules_active ON permission_modules(is_active, sort_order);

-- 页面权限表索引
CREATE INDEX idx_page_permissions_module ON page_permissions(module_id, is_active);
CREATE INDEX idx_page_permissions_route ON page_permissions(route_path);

-- 部门表索引
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_active ON departments(is_active, sort_order);

-- 用户部门关联表索引
CREATE INDEX idx_user_departments_user ON user_departments(ruoyi_user_id);
CREATE INDEX idx_user_departments_dept ON user_departments(department_id);
CREATE INDEX idx_user_departments_primary ON user_departments(ruoyi_user_id, is_primary);

-- 部门权限关联表索引
CREATE INDEX idx_dept_permissions_dept ON department_page_permissions(department_id);
CREATE INDEX idx_dept_permissions_permission ON department_page_permissions(permission_id);
CREATE INDEX idx_dept_permissions_level ON department_page_permissions(permission_level);

-- 用户特殊权限表索引
CREATE INDEX idx_user_dept_permissions_user ON user_department_permissions(ruoyi_user_id);
CREATE INDEX idx_user_dept_permissions_dept ON user_department_permissions(department_id);
CREATE INDEX idx_user_dept_permissions_expires ON user_department_permissions(expires_at);

-- =============================================
-- 创建视图以简化常用查询
-- =============================================

-- 用户有效权限视图（合并部门权限和特殊权限）
CREATE VIEW user_effective_permissions AS
SELECT 
    ud.ruoyi_user_id,
    ud.department_id,
    pp.id as permission_id,
    pp.permission_id as permission_key,
    pp.permission_name,
    pp.route_path,
    pm.module_name,
    COALESCE(udp.permission_level, dpp.permission_level, 0) as effective_level,
    CASE 
        WHEN udp.permission_level IS NOT NULL THEN 'USER_OVERRIDE'
        WHEN dpp.permission_level IS NOT NULL THEN 'DEPARTMENT'
        ELSE 'NONE'
    END as permission_source,
    udp.expires_at
FROM user_departments ud
CROSS JOIN page_permissions pp
JOIN permission_modules pm ON pp.module_id = pm.id
LEFT JOIN department_page_permissions dpp ON ud.department_id = dpp.department_id AND pp.id = dpp.permission_id
LEFT JOIN user_department_permissions udp ON ud.ruoyi_user_id = udp.ruoyi_user_id 
    AND ud.department_id = udp.department_id 
    AND pp.id = udp.permission_id
    AND (udp.expires_at IS NULL OR udp.expires_at > NOW())
WHERE ud.department_id IN (SELECT id FROM departments WHERE is_active = TRUE)
    AND pp.is_active = TRUE
    AND pm.is_active = TRUE;

-- 部门权限统计视图
CREATE VIEW department_permission_stats AS
SELECT 
    d.id as department_id,
    d.department_name,
    COUNT(DISTINCT dpp.permission_id) as granted_permissions,
    COUNT(DISTINCT pp.id) as total_permissions,
    ROUND(COUNT(DISTINCT dpp.permission_id) * 100.0 / COUNT(DISTINCT pp.id), 2) as permission_coverage,
    COUNT(DISTINCT ud.ruoyi_user_id) as user_count
FROM departments d
CROSS JOIN page_permissions pp
LEFT JOIN department_page_permissions dpp ON d.id = dpp.department_id AND pp.id = dpp.permission_id AND dpp.permission_level > 0
LEFT JOIN user_departments ud ON d.id = ud.department_id
WHERE d.is_active = TRUE AND pp.is_active = TRUE
GROUP BY d.id, d.department_name;

-- =============================================
-- 数据库表创建完成
-- =============================================