/**
 * 重构的部门权限管理配置
 * 专注于页面权限分配，预留扩展性
 */

// 页面权限定义 - 按功能模块分组
export const PAGE_PERMISSIONS = {
  // 数据管理模块
  DATA_ENTRY: { id: 'data_entry', name: '数据录入', module: 'data', description: '数据录入页面访问权限' },
  DATA_QUERY: { id: 'data_query', name: '数据查询', module: 'data', description: '数据查询页面访问权限' },
  LAB_DATA: { id: 'lab_data', name: '实验室数据', module: 'data', description: '实验室数据管理页面' },
  SLUDGE_DATA: { id: 'sludge_data', name: '污泥数据', module: 'data', description: '污泥数据管理页面' },
  AO_DATA: { id: 'ao_data', name: 'AO数据', module: 'data', description: 'AO工艺数据管理页面' },
  HISTORY_DATA: { id: 'history_data', name: '历史数据', module: 'data', description: '历史数据查询页面' },
  
  // 报表管理模块
  REPORTS: { id: 'reports', name: '报表管理', module: 'report', description: '报表管理主页面' },
  REPORT_FORM: { id: 'report_form', name: '报表表单', module: 'report', description: '报表表单填写页面' },
  REPORT_QUERY: { id: 'report_query', name: '报表查询', module: 'report', description: '报表查询页面' },
  DYNAMIC_REPORTS: { id: 'dynamic_reports', name: '动态报表', module: 'report', description: '动态报表生成页面' },
  
  // 系统管理模块

  API_MANAGEMENT: { id: 'api_management', name: 'API管理', module: 'system', description: 'API接口管理页面' },
  OAUTH2_CONFIG: { id: 'oauth2_config', name: 'OAuth2配置', module: 'system', description: 'OAuth2认证配置页面' },
  SITE_MANAGEMENT: { id: 'site_management', name: '站点管理', module: 'system', description: '站点信息管理页面' },
  DEPARTMENT_PERMISSION: { id: 'department_permission', name: '部门权限管理', module: 'system', description: '部门权限配置页面' },
  
  // 工具计算模块
  DOSING_CALCULATOR: { id: 'dosing_calculator', name: '投药计算器', module: 'tool', description: '投药量计算工具' },
  PAC_CALCULATOR: { id: 'pac_calculator', name: 'PAC计算器', module: 'tool', description: 'PAC投加量计算工具' },
  PAM_CALCULATOR: { id: 'pam_calculator', name: 'PAM计算器', module: 'tool', description: 'PAM投加量计算工具' },
  EXCESS_SLUDGE_CALCULATOR: { id: 'excess_sludge_calculator', name: '剩余污泥计算器', module: 'tool', description: '剩余污泥量计算工具' },
  CARBON_CALC: { id: 'carbon_calc', name: '碳源计算', module: 'tool', description: '碳源投加计算工具' },
  
  // 文件管理模块
  FILE_UPLOAD: { id: 'file_upload', name: '文件上传', module: 'file', description: '文件上传管理页面' },
  DAV_SCREEN: { id: 'dav_screen', name: 'DAV文件管理', module: 'file', description: 'DAV文件系统管理页面' },
  
  // 消息管理模块
  MESSAGES: { id: 'messages', name: '消息管理', module: 'message', description: '系统消息管理页面' },
  MESSAGE_QUERY: { id: 'message_query', name: '消息查询', module: 'message', description: '消息查询页面' }
};

// 功能模块定义
export const MODULES = {
  data: { name: '数据管理', description: '数据录入、查询和管理相关功能' },
  report: { name: '报表管理', description: '报表生成、查询和管理功能' },
  system: { name: '系统管理', description: '系统配置和用户管理功能' },
  tool: { name: '工具计算', description: '各类计算工具和辅助功能' },
  file: { name: '文件管理', description: '文件上传、下载和管理功能' },
  message: { name: '消息管理', description: '系统消息和通知管理功能' }
};

// 部门权限配置 - 简化为页面权限分配
export const DEPARTMENT_PERMISSIONS = {
  '技术部': {
    name: '技术部',
    description: '负责系统技术支持和数据分析',
    color: '#2196F3', // 蓝色
    pages: [
      'data_entry', 'data_query', 'lab_data', 'sludge_data', 'ao_data', 'history_data',
      'reports', 'report_form', 'report_query', 'dynamic_reports',
      'dosing_calculator', 'pac_calculator', 'pam_calculator', 'excess_sludge_calculator', 'carbon_calc',
      'file_upload', 'dav_screen', 'messages'
    ]
  },
  
  '运营部': {
    name: '运营部',
    description: '负责日常运营和数据录入',
    color: '#4CAF50', // 绿色
    pages: [
      'data_entry', 'data_query', 'lab_data',
      'reports', 'report_form', 'report_query',
      'dosing_calculator', 'pac_calculator', 'pam_calculator',
      'messages', 'message_query'
    ]
  },
  
  '管理部': {
    name: '管理部',
    description: '负责系统级配置和用户账户管理',
    color: '#FF9800', // 橙色
    pages: [
      'user_management', 'api_management', 'oauth2_config', 'site_management', 'department_permission',
      'data_query', 'history_data',
      'reports', 'report_query', 'dynamic_reports',
      'messages', 'message_query'
    ]
  },
  
  '质检部': {
    name: '质检部',
    description: '负责质量检测和实验室数据管理',
    color: '#9C27B0', // 紫色
    pages: [
      'lab_data', 'data_query', 'history_data',
      'reports', 'report_form', 'carbon_calc',
      'file_upload'
    ]
  },
  
  '财务部': {
    name: '财务部',
    description: '负责财务相关报表和数据查看',
    color: '#607D8B', // 蓝灰色
    pages: [
      'data_query', 'reports', 'report_query', 'dynamic_reports'
    ]
  },
  
  '维护部': {
    name: '维护部',
    description: '负责设备维护和相关数据录入',
    color: '#795548', // 棕色
    pages: [
      'data_entry', 'data_query', 'sludge_data', 'ao_data',
      'reports', 'dosing_calculator', 'excess_sludge_calculator',
      'messages'
    ]
  }
};

// 权限级别定义（预留扩展）
export const PERMISSION_LEVELS = {
  NONE: 0,     // 无权限
  READ: 1,     // 只读
  WRITE: 2,    // 读写
  ADMIN: 3     // 管理员
};

// 获取所有部门列表
export const getAllDepartments = () => {
  return Object.keys(DEPARTMENT_PERMISSIONS).map(key => ({
    key,
    ...DEPARTMENT_PERMISSIONS[key]
  }));
};

// 获取所有页面权限列表（按模块分组）
export const getAllPagePermissions = () => {
  const permissions = Object.values(PAGE_PERMISSIONS);
  const grouped = {};
  
  permissions.forEach(permission => {
    if (!grouped[permission.module]) {
      grouped[permission.module] = {
        module: MODULES[permission.module],
        permissions: []
      };
    }
    grouped[permission.module].permissions.push(permission);
  });
  
  return grouped;
};

// 获取部门的页面权限
export const getDepartmentPagePermissions = (departmentKey) => {
  const department = DEPARTMENT_PERMISSIONS[departmentKey];
  if (!department) return [];
  
  return department.pages.map(pageId => {
    const permission = Object.values(PAGE_PERMISSIONS).find(p => p.id === pageId);
    return permission || { id: pageId, name: pageId, module: 'unknown' };
  });
};

// 检查部门是否有页面权限
export const hasDepartmentPagePermission = (departmentKey, pageId) => {
  const department = DEPARTMENT_PERMISSIONS[departmentKey];
  return department ? department.pages.includes(pageId) : false;
};

// 更新部门页面权限
export const updateDepartmentPagePermissions = (departmentKey, pagePermissions) => {
  if (DEPARTMENT_PERMISSIONS[departmentKey]) {
    DEPARTMENT_PERMISSIONS[departmentKey].pages = pagePermissions;
    return true;
  }
  return false;
};

// 添加自定义部门
export const addCustomDepartment = (departmentKey, departmentConfig) => {
  DEPARTMENT_PERMISSIONS[departmentKey] = {
    name: departmentConfig.name || departmentKey,
    description: departmentConfig.description || '自定义部门',
    color: departmentConfig.color || '#757575',
    pages: departmentConfig.pages || [],
    isCustom: true
  };
  return true;
};

// 删除自定义部门
export const removeCustomDepartment = (departmentKey) => {
  if (DEPARTMENT_PERMISSIONS[departmentKey]?.isCustom) {
    delete DEPARTMENT_PERMISSIONS[departmentKey];
    return true;
  }
  return false;
};

// 获取页面权限的详细信息
export const getPagePermissionInfo = (pageId) => {
  return Object.values(PAGE_PERMISSIONS).find(p => p.id === pageId);
};

// 按模块获取页面权限
export const getPagePermissionsByModule = (moduleKey) => {
  return Object.values(PAGE_PERMISSIONS).filter(p => p.module === moduleKey);
};

// 导出默认配置（用于重置）
export const getDefaultDepartmentPermissions = () => {
  return JSON.parse(JSON.stringify(DEPARTMENT_PERMISSIONS));
};

// 验证权限配置
export const validatePermissionConfig = (config) => {
  const errors = [];
  
  if (!config.name) {
    errors.push('部门名称不能为空');
  }
  
  if (!Array.isArray(config.pages)) {
    errors.push('页面权限必须是数组');
  } else {
    const validPageIds = Object.values(PAGE_PERMISSIONS).map(p => p.id);
    const invalidPages = config.pages.filter(pageId => !validPageIds.includes(pageId));
    if (invalidPages.length > 0) {
      errors.push(`无效的页面权限: ${invalidPages.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 权限统计
export const getPermissionStats = () => {
  const departments = getAllDepartments();
  const totalPages = Object.keys(PAGE_PERMISSIONS).length;
  
  return {
    totalDepartments: departments.length,
    totalPages,
    departmentStats: departments.map(dept => ({
      name: dept.name,
      pageCount: dept.pages.length,
      coverage: ((dept.pages.length / totalPages) * 100).toFixed(1) + '%'
    }))
  };
};