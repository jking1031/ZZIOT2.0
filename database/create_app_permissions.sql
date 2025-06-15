-- =============================================
-- App权限管理数据库表创建脚本
-- 基于前端部门权限管理需求设计
-- =============================================

-- 删除已存在的表（按依赖关系倒序删除）
DROP TABLE IF EXISTS user_department_permissions;
DROP TABLE IF EXISTS department_page_permissions;
DROP TABLE IF EXISTS user_departments;
DROP TABLE IF EXISTS page_permissions;
DROP TABLE IF EXISTS permission_modules;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

-- =============================================
-- 1. 用户表
-- =============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    email VARCHAR(100) UNIQUE COMMENT '邮箱',
    password_hash VARCHAR(255) COMMENT '密码哈希',
    full_name VARCHAR(100) COMMENT '真实姓名',
    phone VARCHAR(20) COMMENT '电话号码',
    avatar_url VARCHAR(255) COMMENT '头像URL',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    is_admin BOOLEAN DEFAULT FALSE COMMENT '是否管理员',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间'
) COMMENT='用户信息表';

-- =============================================
-- 2. 权限模块表
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
-- 3. 页面权限表
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
-- 4. 部门表
-- =============================================
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_key VARCHAR(50) NOT NULL UNIQUE COMMENT '部门标识',
    department_name VARCHAR(100) NOT NULL COMMENT '部门名称',
    description TEXT COMMENT '部门描述',
    color VARCHAR(7) DEFAULT '#757575' COMMENT '部门颜色',
    parent_id INT NULL COMMENT '上级部门ID',
    is_custom BOOLEAN DEFAULT FALSE COMMENT '是否自定义部门',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
) COMMENT='部门表';

-- =============================================
-- 5. 用户部门关联表
-- =============================================
CREATE TABLE user_departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    department_id INT NOT NULL COMMENT '部门ID',
    role VARCHAR(50) DEFAULT 'member' COMMENT '部门角色',
    is_primary BOOLEAN DEFAULT FALSE COMMENT '是否主要部门',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_department (user_id, department_id)
) COMMENT='用户部门关联表';

-- =============================================
-- 6. 部门页面权限关联表
-- =============================================
CREATE TABLE department_page_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_id INT NOT NULL COMMENT '部门ID',
    permission_id INT NOT NULL COMMENT '页面权限ID',
    permission_level TINYINT DEFAULT 1 COMMENT '权限级别: 0=无权限, 1=只读, 2=读写, 3=管理员',
    granted_by INT NULL COMMENT '授权人ID',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES page_permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_dept_permission (department_id, permission_id)
) COMMENT='部门页面权限关联表';

-- =============================================
-- 7. 用户部门权限表（用户在特定部门的特殊权限）
-- =============================================
CREATE TABLE user_department_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    department_id INT NOT NULL COMMENT '部门ID',
    permission_id INT NOT NULL COMMENT '页面权限ID',
    permission_level TINYINT DEFAULT 1 COMMENT '权限级别: 0=无权限, 1=只读, 2=读写, 3=管理员',
    is_override BOOLEAN DEFAULT FALSE COMMENT '是否覆盖部门权限',
    granted_by INT NULL COMMENT '授权人ID',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES page_permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_dept_permission (user_id, department_id, permission_id)
) COMMENT='用户部门权限表';

-- =============================================
-- 创建索引
-- =============================================

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created ON users(created_at);

-- 权限模块表索引
CREATE INDEX idx_modules_key ON permission_modules(module_key);
CREATE INDEX idx_modules_active ON permission_modules(is_active);
CREATE INDEX idx_modules_sort ON permission_modules(sort_order);

-- 页面权限表索引
CREATE INDEX idx_permissions_module ON page_permissions(module_id);
CREATE INDEX idx_permissions_active ON page_permissions(is_active);
CREATE INDEX idx_permissions_sort ON page_permissions(sort_order);

-- 部门表索引
CREATE INDEX idx_departments_key ON departments(department_key);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_active ON departments(is_active);
CREATE INDEX idx_departments_sort ON departments(sort_order);

-- 用户部门关联表索引
CREATE INDEX idx_user_departments_user ON user_departments(user_id);
CREATE INDEX idx_user_departments_dept ON user_departments(department_id);
CREATE INDEX idx_user_departments_primary ON user_departments(is_primary);

-- 部门页面权限关联表索引
CREATE INDEX idx_dept_permissions_dept ON department_page_permissions(department_id);
CREATE INDEX idx_dept_permissions_perm ON department_page_permissions(permission_id);
CREATE INDEX idx_dept_permissions_level ON department_page_permissions(permission_level);

-- 用户部门权限表索引
CREATE INDEX idx_user_dept_permissions_user ON user_department_permissions(user_id);
CREATE INDEX idx_user_dept_permissions_dept ON user_department_permissions(department_id);
CREATE INDEX idx_user_dept_permissions_perm ON user_department_permissions(permission_id);
CREATE INDEX idx_user_dept_permissions_expires ON user_department_permissions(expires_at);

SELECT 'App权限管理数据库表创建完成!' as message;