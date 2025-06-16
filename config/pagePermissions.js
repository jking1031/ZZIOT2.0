/**
 * 页面权限配置
 * 定义每个页面的路由路径和所需权限级别
 */

import { PERMISSION_LEVELS } from '../hooks/usePermissionControl';

// 页面权限配置
export const PAGE_PERMISSIONS = {
  // 首页和基础页面
  HOME: {
    route: '/home',
    permission: 'page.home',
    level: PERMISSION_LEVELS.READ,
    description: '首页'
  },
  PROFILE: {
    route: '/profile',
    permission: 'page.profile',
    level: PERMISSION_LEVELS.READ,
    description: '个人资料'
  },
  
  // 数据管理页面
  DATA_CENTER: {
    route: '/data-center',
    permission: 'page.data.center',
    level: PERMISSION_LEVELS.READ,
    description: '数据中心'
  },
  DATA_QUERY_CENTER: {
    route: '/data-query-center',
    permission: 'page.data.query',
    level: PERMISSION_LEVELS.READ,
    description: '数据查询中心'
  },
  DATA_ENTRY_CENTER: {
    route: '/data-entry-center',
    permission: 'page.data.entry',
    level: PERMISSION_LEVELS.WRITE,
    description: '数据填报中心'
  },
  HISTORY_DATA_QUERY: {
    route: '/history-data-query',
    permission: 'page.data.history',
    level: PERMISSION_LEVELS.READ,
    description: '历史数据查询'
  },
  
  // 实验室数据
  LAB_DATA: {
    route: '/lab-data',
    permission: 'page.lab.data',
    level: PERMISSION_LEVELS.READ,
    description: '实验室数据'
  },
  LAB_DATA_ENTRY: {
    route: '/lab-data-entry',
    permission: 'page.lab.entry',
    level: PERMISSION_LEVELS.WRITE,
    description: '实验室数据录入'
  },
  
  // 报表管理
  REPORTS: {
    route: '/reports',
    permission: 'page.reports',
    level: PERMISSION_LEVELS.READ,
    description: '报表管理'
  },
  DYNAMIC_REPORTS: {
    route: '/dynamic-reports',
    permission: 'page.reports.dynamic',
    level: PERMISSION_LEVELS.READ,
    description: '动态报表'
  },
  REPORT_QUERY: {
    route: '/report-query',
    permission: 'page.reports.query',
    level: PERMISSION_LEVELS.READ,
    description: '报表查询'
  },
  REPORT_FORM: {
    route: '/report-form',
    permission: 'page.reports.form',
    level: PERMISSION_LEVELS.WRITE,
    description: '报表填写'
  },
  REPORT_FORM_5000: {
    route: '/report-form-5000',
    permission: 'page.reports.form.5000',
    level: PERMISSION_LEVELS.WRITE,
    description: '5000吨处理厂日报'
  },
  REPORT_FORM_SLUDGE: {
    route: '/report-form-sludge',
    permission: 'page.reports.form.sludge',
    level: PERMISSION_LEVELS.WRITE,
    description: '污泥车间日报'
  },
  REPORT_FORM_PUMP_STATION: {
    route: '/report-form-pump-station',
    permission: 'page.reports.form.pump',
    level: PERMISSION_LEVELS.WRITE,
    description: '泵站运行周报'
  },
  
  // 站点管理
  SITE_LIST: {
    route: '/site-list',
    permission: 'page.sites.list',
    level: PERMISSION_LEVELS.READ,
    description: '站点列表'
  },
  SITE_DETAIL: {
    route: '/site-detail',
    permission: 'page.sites.detail',
    level: PERMISSION_LEVELS.READ,
    description: '站点详情'
  },
  
  // 消息管理
  MESSAGES: {
    route: '/messages',
    permission: 'page.messages',
    level: PERMISSION_LEVELS.READ,
    description: '消息中心'
  },
  MESSAGE_QUERY: {
    route: '/message-query',
    permission: 'page.messages.query',
    level: PERMISSION_LEVELS.READ,
    description: '消息查询'
  },
  
  // 计算器工具
  CARBON_CALC: {
    route: '/carbon-calc',
    permission: 'page.tools.carbon',
    level: PERMISSION_LEVELS.READ,
    description: '碳源计算器'
  },
  PAC_CALCULATOR: {
    route: '/pac-calculator',
    permission: 'page.tools.pac',
    level: PERMISSION_LEVELS.READ,
    description: 'PAC计算器'
  },
  PAM_CALCULATOR: {
    route: '/pam-calculator',
    permission: 'page.tools.pam',
    level: PERMISSION_LEVELS.READ,
    description: 'PAM计算器'
  },
  DOSING_CALCULATOR: {
    route: '/dosing-calculator',
    permission: 'page.tools.dosing',
    level: PERMISSION_LEVELS.READ,
    description: '加药计算器'
  },
  EXCESS_SLUDGE_CALCULATOR: {
    route: '/excess-sludge-calculator',
    permission: 'page.tools.sludge',
    level: PERMISSION_LEVELS.READ,
    description: '剩余污泥计算器'
  },
  
  // 文件管理
  FILE_UPLOAD: {
    route: '/file-upload',
    permission: 'page.files.upload',
    level: PERMISSION_LEVELS.WRITE,
    description: '文件上传'
  },
  
  // 系统管理页面
  USER_MANAGEMENT: {
    route: '/user-management',
    permission: 'page.admin.users',
    level: PERMISSION_LEVELS.ADMIN,
    description: '用户管理'
  },
  API_MANAGEMENT: {
    route: '/api-management',
    permission: 'page.admin.api',
    level: PERMISSION_LEVELS.ADMIN,
    description: 'API管理'
  },
  DEPARTMENT_PERMISSION: {
    route: '/department-permission',
    permission: 'page.admin.permissions',
    level: PERMISSION_LEVELS.ADMIN,
    description: '部门权限管理'
  },
  OAUTH2_CONFIG: {
    route: '/oauth2-config',
    permission: 'page.admin.oauth2',
    level: PERMISSION_LEVELS.ADMIN,
    description: 'OAuth2配置'
  },
  
  // 其他页面
  BOX_SCREEN: {
    route: '/box',
    permission: 'page.box',
    level: PERMISSION_LEVELS.READ,
    description: '盒子管理'
  },
  DAV_SCREEN: {
    route: '/dav',
    permission: 'page.dav',
    level: PERMISSION_LEVELS.READ,
    description: 'DAV服务'
  }
};

// 根据路由路径获取权限配置
export const getPagePermissionByRoute = (routePath) => {
  return Object.values(PAGE_PERMISSIONS).find(page => page.route === routePath);
};

// 根据权限键获取页面配置
export const getPagePermissionByKey = (permissionKey) => {
  return Object.values(PAGE_PERMISSIONS).find(page => page.permission === permissionKey);
};

// 获取所有页面权限配置
export const getAllPagePermissions = () => {
  return Object.values(PAGE_PERMISSIONS);
};

// 按权限级别分组页面
export const getPagesByLevel = (level) => {
  return Object.values(PAGE_PERMISSIONS).filter(page => page.level === level);
};

// 获取管理员页面
export const getAdminPages = () => {
  return getPagesByLevel(PERMISSION_LEVELS.ADMIN);
};

// 获取需要写权限的页面
export const getWritePages = () => {
  return getPagesByLevel(PERMISSION_LEVELS.WRITE);
};

// 获取只读页面
export const getReadOnlyPages = () => {
  return getPagesByLevel(PERMISSION_LEVELS.READ);
};