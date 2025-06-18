import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { authApi } from '../api/apiService';
import { CACHE_KEYS } from '../api/config';
import { saveAuthToken, getAuthToken, clearAuthToken } from '../api/storage';
import { EventRegister } from '../utils/EventEmitter';
import { getApiUrl } from '../api/apiManager';
import OAuth2Service, { DEFAULT_OAUTH2_CONFIG } from '../api/oauth2Service';
import PermissionInitService from '../services/PermissionInitService';

export const AuthContext = createContext({
  user: null,
  loading: true,
  userRoles: [],
  // isAdmin: false, // Removed
  // isDeptAdmin: false, // Removed
  oauth2Service: null,
  isOAuth2Enabled: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  // const [isAdmin, setIsAdmin] = useState(false); // Removed
  // const [isDeptAdmin, setIsDeptAdmin] = useState(false); // Removed
  const [oauth2Service, setOAuth2Service] = useState(null);
  const [isOAuth2Enabled, setIsOAuth2Enabled] = useState(false);

  // 初始化OAuth2服务
  useEffect(() => {
    initializeOAuth2Service();
  }, []);

  // 添加useEffect钩子，确保应用启动时自动加载用户数据
  useEffect(() => {
    // 应用启动时自动加载用户信息
    loadUser();
  }, []);

  // 初始化OAuth2服务
  const initializeOAuth2Service = async () => {
    try {
      // 检查是否启用OAuth2
      const oauth2Enabled = await AsyncStorage.getItem('oauth2_enabled');
      const isEnabled = oauth2Enabled === 'true';
      setIsOAuth2Enabled(isEnabled);
      
      if (isEnabled) {
        // 从存储中获取OAuth2配置，如果没有则使用默认配置
        const savedConfig = await AsyncStorage.getItem('oauth2_config');
        const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_OAUTH2_CONFIG;
        
        // console.log('[AuthContext] 初始化OAuth2服务:', config.baseUrl);
        const service = new OAuth2Service(config.baseUrl, config.clientId, config.clientSecret);
        setOAuth2Service(service);
      }
    } catch (error) {
      console.error('[AuthContext] 初始化OAuth2服务失败:', error);
    }
  };

  // 添加定期检查令牌有效性的机制
  useEffect(() => {
    // 如果用户已登录，定期检查令牌有效性
    if (user) {
      const tokenCheckInterval = setInterval(async () => {
        const isValid = await checkTokenValidity();
        if (!isValid) {
          // console.log('令牌已过期或无效，尝试刷新令牌');
          // 在这里可以选择自动刷新令牌或触发重新登录
          EventRegister.emit('TOKEN_REFRESH_NEEDED');
        }
      }, 5 * 60 * 1000); // 每5分钟检查一次
      
      return () => clearInterval(tokenCheckInterval);
    }
  }, [user]);

  // 监听令牌刷新事件
  useEffect(() => {
    const tokenRefreshListener = EventRegister.addEventListener(
      'TOKEN_REFRESH_NEEDED',
      async () => {
        await refreshToken();
      }
    );
    
    return () => {
      EventRegister.removeEventListener(tokenRefreshListener);
    };
  }, []);

  // 添加自定义令牌创建函数
  const createToken = (userData) => {
    // 创建令牌的header部分
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    // 处理角色信息，基于 userData.role_name
    let roleName = userData.role_name || '用户'; // Default to '用户' if role_name is not present
    
    console.log('创建令牌，角色名称:', roleName);
    
    // 创建令牌的payload部分，包含完整的用户和角色信息
    const payload = {
      id: userData.id,
      username: userData.username || userData.name,
      email: userData.email,
      role_name: roleName,
      // isAdmin and isDeptAdmin are no longer part of the token payload directly
      // Their information is encapsulated within role_name and department permissions
      // 设置过期时间为12小时后
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
      iat: Math.floor(Date.now() / 1000)
    };
    
    // 记录完整的payload内容用于调试
    console.log('令牌payload内容:', JSON.stringify(payload));
    
    try {
      // 自定义base64编码函数，支持UTF-8字符
      const base64Encode = (str) => {
        try {
          // 直接使用btoa尝试编码
          return btoa(str);
        } catch (e) {
          // 处理包含非ASCII字符的情况
          // 将字符串转换为UTF-8编码的字节
          const bytes = new TextEncoder().encode(str);
          const binString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
          return btoa(binString);
        }
      };
      
      // 使用增强的base64编码函数
      const headerStr = base64Encode(JSON.stringify(header));
      const payloadStr = base64Encode(JSON.stringify(payload));
      
      // 使用简单签名
      const signature = base64Encode(`${headerStr}.${payloadStr}.secret`);
      
      // 组合成JWT格式
      return `${headerStr}.${payloadStr}.${signature}`;
    } catch (error) {
      console.error('创建令牌失败:', error, '用户数据:', JSON.stringify(userData).substring(0, 100));
      // 创建一个基础令牌，仅包含必要信息
      try {
        // 仅保留基本信息的简单负载
        const simplePayload = {
          id: userData.id,
          exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
        };
        
        const headerStr = btoa(JSON.stringify(header));
        const payloadStr = btoa(JSON.stringify(simplePayload));
        const signature = btoa(`${headerStr}.${payloadStr}.secret`);
        
        console.log('已创建备用简化令牌');
        return `${headerStr}.${payloadStr}.${signature}`;
      } catch (backupError) {
        console.error('创建备用令牌也失败:', backupError);
        return null;
      }
    }
  };

  // 添加令牌验证函数
  const checkTokenValidity = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        return false;
      }
      
      // 解析令牌
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      try {
        // 增强的Base64解码函数，处理可能包含非ASCII字符的令牌
        const base64Decode = (str) => {
          try {
            return atob(str);
          } catch (e) {
            try {
              // 处理可能的URL安全base64编码
              const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
              return atob(base64);
            } catch (error) {
              console.error('解码令牌失败:', error);
              return null;
            }
          }
        };
        
        // 解析载荷
        const decoded = base64Decode(parts[1]);
        if (!decoded) {
          return false;
        }
        
        const payload = JSON.parse(decoded);
        // 检查令牌是否过期
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          console.log('令牌已过期');
          return false;
        }
        return true;
      } catch (error) {
        console.error('解析令牌失败:', error);
        return false;
      }
    } catch (error) {
      console.error('检查令牌有效性失败:', error);
      return false;
    }
  };

  // 添加令牌刷新函数
  const refreshToken = async () => {
    if (!user) {
      return false;
    }
    
    try {
      // 方法1：尝试调用后端刷新令牌API
      try {
        const response = await axios.post(getApiUrl('AUTH', 'REFRESH_TOKEN'), {
          userId: user.id,
          email: user.email
        });
        
        if (response.data && response.data.token) {
          await saveAuthToken(response.data.token);
          // console.log('成功刷新令牌');
          return true;
        }
      } catch (apiError) {
        // console.log('通过API刷新令牌失败，尝试本地创建令牌');
      }
      
      // 方法2：API不可用，创建本地令牌
      const newToken = createToken(user);
      if (newToken) {
        await saveAuthToken(newToken);
        console.log('已创建新的本地令牌');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      return false;
    }
  };

  // 获取角色信息的辅助函数 (基于 role_name)
  const getRoleInfo = (userInfo) => {
    // 优先使用后端提供的角色名
    if (userInfo && userInfo.role_name) {
        // isAdmin and isDeptAdmin flags are derived from role_name and department permissions, not stored directly
        return { name: userInfo.role_name }; 
    }
    return { name: '用户' }; // Default role
  };

  const login = async (userData, password = null, skipOAuth2 = false) => {
    try {
      if (!userData) {
        throw new Error('无效的用户数据');
      }

      // 记录完整的用户数据用于调试
      // console.log('===== AuthContext: 登录处理 =====');
      console.log('用户ID:', userData.id);
      console.log('用户名:', userData.username);
      console.log('用户Email:', userData.email);
      // console.log('OAuth2启用状态:', isOAuth2Enabled);
    // console.log('跳过OAuth2登录:', skipOAuth2);
      
      // OAuth2模式登录处理
      if (isOAuth2Enabled && skipOAuth2) {
        // console.log('[AuthContext] OAuth2模式：直接处理OAuth获取的用户信息');
        
        // 输出原始的OAuth2用户信息JSON数据
        // console.log('[AuthContext] OAuth2原始用户数据:', JSON.stringify(userData, null, 2));
        
        // 直接处理OAuth获取的用户信息，不再调用API
        // 优先从 userInfo 中提取详细信息
        const userInfo = userData.userInfo || {};
        
        const processedUserData = {
          ...userData,
          // 用户基础信息：优先使用 userInfo 中的数据
          id: userInfo.id || userData.id || userData.sub,
          username: userInfo.username || userData.username || userData.preferred_username || userData.email,
          email: userInfo.email || userData.email,
          nickname: userInfo.nickname || userData.nickname || userData.name || userData.username,
          mobile: userInfo.mobile || userData.mobile,
          sex: userInfo.sex || userData.sex,
          avatar: userInfo.avatar || userData.avatar,
          loginIp: userInfo.loginIp || userData.loginIp,
          loginDate: userInfo.loginDate || userData.loginDate,
          createTime: userInfo.createTime || userData.createTime,
          
          // 角色信息：优先使用 userInfo 中的角色数据
          roles: userInfo.roles || userData.roles || [],
          permissions: userData.permissions || [],
          
          // 部门信息
          dept: userInfo.dept || userData.dept,
          
          // 职位信息
          posts: userInfo.posts || userData.posts || [],
          
          // 角色名称：优先从 userInfo.roles 中提取
          role_name: (() => {
            if (userInfo.roles && userInfo.roles.length > 0) {
              return userInfo.roles[0].name;
            }
            if (userData.roles && userData.roles.length > 0) {
              return userData.roles[0].name;
            }
            // 特殊处理：如果用户名是 admin，默认为超级管理员
            if ((userInfo.username || userData.username) === 'admin') {
              return '超级管理员';
            }
            return userData.role_name || '普通用户';
          })()
        };
        
        // 确定用户角色信息 (基于新的逻辑)
        // isAdmin and isDeptAdmin are derived from role_name and department permissions
        const roleInfo = getRoleInfo(processedUserData); // 使用新的 getRoleInfo
        processedUserData.role_name = roleInfo.name; 
        processedUserData.displayName = processedUserData.nickname || processedUserData.username || '未知用户';
        
        // console.log('[AuthContext] OAuth2用户信息处理完成:', {
        //   username: processedUserData.username,
        //   role: processedUserData.role_name
        //   // isAdmin and isDeptAdmin are no longer logged here as they are not direct state variables
        // });
        
        // 保存用户信息
        await AsyncStorage.setItem('user', JSON.stringify(processedUserData));
        setUser(processedUserData);
        // setIsAdmin(processedUserData.isAdmin); // Removed
        // setIsDeptAdmin(processedUserData.isDeptAdmin); // Removed
        setLoading(false);
        
        // 保存token
        if (userData.token) {
          await saveAuthToken(userData.token);
          // console.log('[AuthContext] OAuth2 token已保存');
        }
        
        // console.log('[AuthContext] OAuth2登录流程完成');
        
        // 初始化用户权限
        try {
          await PermissionInitService.initializeUserPermissions(processedUserData);
          // console.log('[AuthContext] OAuth2用户权限初始化成功');
        } catch (permissionError) {
          console.warn('[AuthContext] OAuth2权限初始化失败，将使用访客权限:', permissionError);
          // 权限初始化失败不影响登录，但会记录警告
        }
        
        return true;
      }
      
      // 传统登录模式：需要调用API获取权限信息
      // console.log('[AuthContext] 传统登录模式：获取用户权限信息');
      
      // 首先保存基本用户信息
      const initialUserData = {
        ...userData
      };
      
      // 更新基本用户状态
      setUser(initialUserData);
      setLoading(false);
      
      // 调用若依后端的get-permission-info接口获取完整权限信息
      try {
        console.log('[AuthContext] 正在获取用户权限信息...');
        const permissionResponse = await authApi.getPermissionInfo();
        
        // 输出原始的JSON信息
        console.log('[AuthContext] 原始API响应数据:', JSON.stringify(permissionResponse, null, 2));
        
        if (permissionResponse && permissionResponse.data) {
          const permissionData = permissionResponse.data;
          console.log('[AuthContext] 权限信息获取成功:', permissionData);
          console.log('[AuthContext] 权限数据详细信息:', JSON.stringify(permissionData, null, 2));
          
          // 更新用户数据，包含权限信息
          const updatedUserData = {
            ...initialUserData,
            // 若依后端权限字段
            roles: permissionData.roles || [],
            permissions: permissionData.permissions || [],
            user: permissionData.user || initialUserData,
            // 更新角色相关字段
            roleIds: permissionData.user?.roleIds || [],
            deptId: permissionData.user?.deptId,
            postIds: permissionData.user?.postIds || []
          };
          
          // 根据权限信息重新确定用户角色
          if (permissionData.roles && permissionData.roles.length > 0) {
            const primaryRole = permissionData.roles[0]; // 使用第一个角色作为主要角色
            updatedUserData.role_id = primaryRole.id;
            updatedUserData.role_name = primaryRole.name;
            updatedUserData.remark = primaryRole.name; // 更新备注字段
            
            // 判断是否为管理员角色
            // Admin status is now determined by role_name (e.g., '超级管理员')
            // No direct isAdmin flag is set here.
            updatedUserData.role_name = primaryRole.name; // Ensure role_name is set
            
            console.log('[AuthContext] 根据权限信息更新角色:', {
              roleId: primaryRole.id,
              roleName: primaryRole.name
              // isAdmin is no longer logged here
            });
          }
          
          // 保存更新后的用户信息
          await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
          setUser(updatedUserData);
          
          console.log('[AuthContext] 用户权限信息已更新');
        } else {
          console.warn('[AuthContext] 权限信息响应为空，使用默认角色处理');
        }
      } catch (permissionError) {
        console.error('[AuthContext] 获取权限信息失败:', permissionError.message);
        console.log('[AuthContext] 继续使用传统角色推断方式');
      }
      
      // 角色处理逻辑 (基于新的权限系统)
      // console.log('登录成功，处理用户角色信息');
      
      let completeUserData = {
        ...userData
        // isAdmin and isDeptAdmin are no longer initialized here
      };

      // 如果后端返回了 roles 数组，则优先使用它来确定 role_name
      if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0) {
        // 使用第一个角色名作为 role_name，或提供一个默认值
        completeUserData.role_name = userData.roles[0].name || getRoleInfo(completeUserData).name;
      } else {
        // If no roles array, use existing role_name or default from getRoleInfo
        const roleInfo = getRoleInfo(completeUserData);
        completeUserData.role_name = roleInfo.name;
      }

      // is_admin field is no longer directly used to set isAdmin state.
      // It might be used by backend, but frontend relies on role_name.

      completeUserData.displayName = userData.nickname || userData.username || '未知用户';

      console.log(`[AuthContext] 最终确定的角色信息:`, {
        roleName: completeUserData.role_name
        // isAdmin and isDeptAdmin are no longer logged here
      });
      
      // The checkAdminStatus call is removed as admin status is derived from role_name.
      
      // 更新状态和存储
      await AsyncStorage.setItem('user', JSON.stringify(completeUserData));
      setUser(completeUserData);
      // setIsAdmin(completeUserData.isAdmin); // Removed
      
      // 创建并保存令牌
      console.log('创建令牌，包含完整角色信息');
      
      if (userData.token) {
        // 如果后端返回了令牌，直接保存
        await saveAuthToken(userData.token);
        console.log('后端提供的令牌已保存');
      } else {
        // 创建本地令牌，包含完整的用户角色信息
        const token = createToken(completeUserData);
        if (token) {
          await saveAuthToken(token);
          console.log('已创建并保存包含角色信息的本地令牌');
        } else {
          console.error('创建令牌失败');
        }
      }
      
      // console.log('[AuthContext] 登录成功，用户数据:', completeUserData);
      
      // 更新状态
      setUser(completeUserData);
      // setIsAdmin(completeUserData.isAdmin || false); // Removed
      // setIsDeptAdmin(completeUserData.isDeptAdmin || false); // Removed
      
      // 保存到本地存储
      try {
        await AsyncStorage.setItem('user', JSON.stringify(completeUserData));
        console.log('[AuthContext] 用户数据已保存到本地存储');
      } catch (storageError) {
        console.error('[AuthContext] 保存用户数据到本地存储失败:', storageError);
        // 即使保存失败，也不影响登录状态
      }
      
      // 确保状态更新完成
      // console.log('[AuthContext] 登录流程完成，当前用户状态:', {
        //   username: completeUserData.username,
        //   role: completeUserData.role_name
        //   // isAdmin and isDeptAdmin are no longer logged here
        // });
      
      // console.log('登录流程完成，用户信息和令牌已保存');
      
      // 初始化用户权限
      try {
        await PermissionInitService.initializeUserPermissions(completeUserData);
        // console.log('[AuthContext] 传统登录用户权限初始化成功');
      } catch (permissionError) {
        console.warn('[AuthContext] 传统登录权限初始化失败，将使用访客权限:', permissionError);
        // 权限初始化失败不影响登录，但会记录警告
      }
      
      // 返回成功
      return true;
    } catch (error) {
      console.error('登录失败:', error);
      // 确保清理任何可能部分完成的状态
      await AsyncStorage.removeItem('user');
      await clearAuthToken();
      setUser(null);
      setLoading(false);
      throw error; // 向上传播错误以便调用者处理
    }
  };
  
  const register = async (userData) => {
    try {
      setLoading(true);
      console.log('[AuthContext] 开始注册:', {
        ...userData,
        password: '***',
        confirmPassword: '***'
      });

      // 准备注册数据，确保只传递必要的字段
      const registrationData = {
        username: userData.username,
        nickname: userData.nickname,
        password: userData.password,
        tenantName: userData.tenantName, // 添加租户名称
        // confirmPassword: userData.confirmPassword, // 通常后端不需要确认密码
        // 根据实际API需求调整其他字段，例如 email, deptId, postIds, mobile, sex, avatar 等
      };

      // 调用API进行注册
      const response = await authApi.register(registrationData);

      console.log('[AuthContext] 注册API响应:', response);

      if (response && response.code === 200 && response.data) {
        // 注册成功，可以根据API返回的数据进行处理
        // 例如，可以提示用户注册成功，并引导用户登录
        return { success: true, message: response.msg || '注册成功' };
      } else {
        // 注册失败
        throw new Error(response.msg || '注册失败，请检查输入信息');
      }
    } catch (error) {
      console.error('[AuthContext] 注册失败:', error);
      return { success: false, message: error.message || '注册服务异常，请稍后重试' };
    } finally {
      setLoading(false);
    }
  };
  

  const logout = async () => {
    try {
      console.log('[AuthContext] 开始登出流程');
      
      // 如果启用了OAuth2，先执行OAuth2登出
      if (isOAuth2Enabled && oauth2Service) {
        try {
          // console.log('[AuthContext] 执行OAuth2登出');
      await oAuth2Service.logout();
      // console.log('[AuthContext] OAuth2登出成功');
        } catch (oauth2Error) {
          console.error('[AuthContext] OAuth2登出失败:', oauth2Error.message);
          // OAuth2登出失败不应阻止整个登出流程
        }
      }
      
      // 清除所有与用户相关的存储数据
      const keysToRemove = [
        'user',             // 用户基本信息
        'userRoles',        // 用户角色
        'authToken',        // 认证令牌
        'loginCredentials', // 登录凭证
        'lastLogin',        // 上次登录信息
        'userPreferences',  // 用户偏好设置
        'userEmail',        // 邮箱/账号 
        'userPassword',     // 密码
        'rememberMe',       // 记住登录状态
        'queriedMessages',  // 查询过的消息缓存
        'messages',         // 保存的消息
        'previousMessages'  // 先前的消息
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // 清除传统认证令牌
      await clearAuthToken();
      
      // 清除权限缓存
      try {
        await PermissionInitService.clearPermissionsCache();
        console.log('[AuthContext] 权限缓存已清除');
      } catch (error) {
        console.warn('[AuthContext] 清除权限缓存失败:', error);
      }
      
      // 重置用户状态
      setUser(null);
      setLoading(false);
      
      // 发送全局事件，通知其他组件用户已登出，需要重置状态
      EventRegister.emit('USER_LOGGED_OUT');
      
      console.log('[AuthContext] 已成功登出并清理所有用户数据');
      return true;
    } catch (error) {
      console.error('[AuthContext] 退出登录失败:', error);
      return false;
    }
  };

  // 添加预加载用户角色的函数
  const preloadUserRoles = async (forceRefresh = false) => {
    try {
      if (!user || !user.id) {
        console.log('预加载角色: 用户未登录');
        return null;
      }
      
      console.log('开始预加载用户角色信息...');
      
      // 使用现有函数获取用户角色，可选择强制刷新
      const roles = await getUserRoles(user.id, forceRefresh);
      
      // 如果没有获取到角色，重试一次
      if (!roles || roles.length === 0) {
        console.log('未获取到角色，1秒后重试并强制刷新');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await getUserRoles(user.id, true);  // 强制刷新重试
      }
      
      console.log('用户角色预加载完成, 角色数量:', roles.length);
      return roles;
    } catch (error) {
      console.error('预加载用户角色失败:', error);
      // 预加载失败不应影响其他功能
      return null;
    }
  };
  
  const loadUser = async () => {
    try {
      setLoading(true);
      console.log('正在加载用户信息...');
      
      // 首先检查令牌有效性
      const isTokenValid = await checkTokenValidity();
      if (!isTokenValid) {
        // console.log('令牌无效或已过期，尝试刷新');
        const refreshSuccessful = await refreshToken();
        if (!refreshSuccessful) {
          // console.log('无法刷新令牌，需要重新登录');
          await clearAuthToken();
          await AsyncStorage.removeItem('user');
          setUser(null);
          setLoading(false);
          return;
        }
      }
      
      const userData = await AsyncStorage.getItem('user');
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          
          // 验证用户数据是否完整有效
          if (!parsedUser.id) {
            console.log('用户数据缺少ID，视为无效');
            await AsyncStorage.removeItem('user');
            await clearAuthToken();
            setUser(null);
            setLoading(false);
            return;
          }
          
          console.log('已从本地存储恢复用户会话');
          
          // 将用户数据设置到状态中
          setUser(parsedUser);
          
          // Admin status is now derived from role_name, no direct isAdmin flag loading from storage.
          console.log('用户数据已从本地存储恢复，角色将通过 role_name 和部门权限确定。');
          
          // 立即预加载用户角色信息，而不是使用setTimeout
          try {
            // 设置一个较短的超时来加载角色，避免阻塞UI
            const roleLoadPromise = Promise.race([
              preloadUserRoles(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('角色加载超时')), 3000)
              )
            ]);
            
            roleLoadPromise.catch(error => {
              console.log('角色预加载受限:', error.message);
              // 如果是超时，在后台继续加载
              if (error.message === '角色加载超时') {
                setTimeout(() => preloadUserRoles(), 100);
              }
            });
          } catch (roleError) {
            console.log('角色预加载失败，但不影响用户登录:', roleError);
          }
        } catch (parseError) {
          console.error('解析用户数据失败:', parseError);
          // 如果解析失败，清除损坏的数据
          await AsyncStorage.removeItem('user');
          await clearAuthToken();
          setUser(null);
        }
      } else {
        // console.log('未找到已保存的用户会话，需要登录');
        await clearAuthToken();
        setUser(null);
      }
    } catch (error) {
      console.error('加载用户数据时出错:', error);
      await clearAuthToken();
      await AsyncStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
      console.log('用户加载过程完成，用户状态:', user ? '已登录' : '未登录');
    }
  };

  const updateUserInfo = async (updates) => {
    try {
      if (!user || !user.id) {
        console.error('无法更新用户信息：用户未登录或ID缺失');
        return false;
      }

      // 首先检查是否需要发送到服务器
      // 如果只是更新头像种子等本地信息，可以跳过服务器请求
      const isLocalUpdate = Object.keys(updates).every(key => 
        key === 'avatar_seed' || key === 'theme_preference'
      );
      
      let newUserData = { ...user };
      
      if (!isLocalUpdate) {
        // 发送更新请求到服务器
        try {
          const response = await fetch(getApiUrl('USERS', 'UPDATE', user.id), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            throw new Error('服务器更新失败');
          }

          const data = await response.json();
          newUserData = { ...user, ...data.user };
        } catch (serverError) {
          console.error('服务器更新失败:', serverError);
          // 对于纯本地数据，失败时允许继续本地更新
          if (!isLocalUpdate) {
            return false;
          }
        }
      }
      
      // 对于本地更新，直接应用
      newUserData = { ...newUserData, ...updates };
      
      // 更新成功后，保存到本地存储
      await AsyncStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      return true;
    } catch (error) {
      console.error('更新用户数据失败:', error);
      return false;
    }
  };

  const checkAdminStatus = async () => {
    try {
      // 获取当前用户数据
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        console.log('无用户数据，无法检查管理员状态');
        return false;
      }
      
      const userInfo = JSON.parse(userData);
      console.log('正在检查用户管理员状态，用户ID:', userInfo.id);
      
      // 向后端发送请求检查管理员权限
      try {
        console.log('调用API检查管理员权限');
        
        // 使用专用API向后端发送当前用户信息
        const response = await authApi.checkAdminStatus({ 
            userId: userInfo.id,
            username: userInfo.username,
            email: userInfo.email 
          },
          {
            headers: { 
              'Content-Type': 'application/json',
              'user-id': userInfo.id 
            }
          }
        );
        
        console.log('API权限检查响应:', JSON.stringify(response.data));
        
        // 解析API返回的权限信息
        let adminStatus = false;
        
        // 处理后端返回的数组格式 [{"is_admin":1}]
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log('API返回了数组格式的数据');
          const firstItem = response.data[0];
          
          if (firstItem.is_admin !== undefined) {
            adminStatus = firstItem.is_admin === true || firstItem.is_admin === 1 || firstItem.is_admin === '1';
            // The concept of a separate adminStatus check is being phased out.
            // Admin status is determined by role_name (e.g., '超级管理员').
            // This function might be deprecated or significantly changed.
            // For now, we'll assume role_name is the source of truth.
            console.log('API权限检查响应 (is_admin):', response.data);
            // If backend still provides is_admin, it might be used to *update* role_name if necessary,
            // but not to set a separate isAdmin flag.
            // Example: if is_admin is true and role_name is not '超级管理员', update role_name.
            let currentRoleName = userInfo.role_name;
            let needsUpdate = false;
            
            if (firstItem.is_admin === true || firstItem.is_admin === 1) {
              if (currentRoleName !== '超级管理员' && currentRoleName !== '管理员') { // Or other admin role names
                currentRoleName = '超级管理员'; // Or a more specific admin role from backend
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              const updatedUserInfo = { 
                ...userInfo, 
                role_name: currentRoleName
              };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUserInfo));
              setUser(updatedUserInfo);
              console.log('用户角色已根据is_admin更新为:', currentRoleName);
              await getUserRoles(userInfo.id, true); // Force refresh roles
            }
            // The function should now return based on the user's role_name, not a separate isAdmin flag.
            return userInfo.role_name === '超级管理员' || userInfo.role_name === '管理员'; // Example check
          } else {
            // If no is_admin field, rely on existing role_name.
            console.log('API返回的数据中未找到is_admin字段或不适用。');
            return userInfo.role_name === '超级管理员' || userInfo.role_name === '管理员'; // Example check
          }
        } else if (response.data && typeof response.data === 'object' && response.data.is_admin !== undefined) {
          // Handle object format response
          if (response.data.is_admin === true || response.data.is_admin === 1) {
            let currentRoleName = userInfo.role_name;
            if (currentRoleName !== '超级管理员' && currentRoleName !== '管理员') {
              currentRoleName = '超级管理员';
              const updatedUserInfo = { 
                ...userInfo, 
                role_name: currentRoleName
              };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUserInfo));
              setUser(updatedUserInfo);
              console.log('用户角色已根据is_admin更新为:', currentRoleName);
              await getUserRoles(userInfo.id, true); // Force refresh roles
            }
          }
          return userInfo.role_name === '超级管理员' || userInfo.role_name === '管理员';
        } else {
          // If no is_admin field, rely on existing role_name.
          console.log('API返回的数据中未找到is_admin字段或不适用。');
          return userInfo.role_name === '超级管理员' || userInfo.role_name === '管理员'; // Example check
        }
      } catch (apiError) {
        console.error('API权限检查失败:', apiError);
        // API调用失败时，依赖当前用户的 role_name
        console.log('API调用失败，依赖当前用户的 role_name');
        return userInfo.role_name === '超级管理员' || userInfo.role_name === '管理员'; // Example check
      }
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      return false;
    }
  };

  const getAllUsers = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.get(getApiUrl('USERS', 'LIST'), {
        headers: { 'user-id': userData.id }
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }
  };

  const getAllRoles = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.get(getApiUrl('USERS', 'ROLES'), {
        headers: { 'user-id': userData.id }
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('获取角色列表失败:', error);
      return [];
    }
  };

  const getUserRoles = async (userId, forceRefresh = false) => {
    try {
      if (!userId) {
        console.log('获取角色: 未提供用户ID');
        return [];
      }
      
      // 首先尝试从缓存获取角色信息，除非强制刷新
      if (!forceRefresh) {
        try {
          const cachedRoles = await AsyncStorage.getItem('userRoles_cache');
          if (cachedRoles) {
            const rolesData = JSON.parse(cachedRoles);
            const timestamp = rolesData.timestamp || 0;
            const currentTime = Date.now();
            
            // 如果缓存不超过5分钟，直接使用缓存
            if (rolesData.userId === userId && (currentTime - timestamp) < 5 * 60 * 1000) {
              console.log('使用角色信息缓存:', rolesData.roles);
              setUserRoles(rolesData.roles);
              return rolesData.roles;
            }
          }
        } catch (cacheError) {
          console.log('读取角色缓存失败:', cacheError);
        }
      } else {
        console.log('强制刷新角色信息，跳过缓存');
      }
      
      // 获取存储的用户数据
      const storedUserData = await AsyncStorage.getItem('user');
      if (!storedUserData) {
        console.log('未找到用户数据');
        return [];
      }
      
      const userData = JSON.parse(storedUserData);
      console.log(`根据用户数据确定角色信息，用户ID:${userId}`);
      
      // 用于存储用户角色的数组
      let userRoles = [];
      let fetchError = null;
      
      // 检查是否是当前用户的角色查询
      const isCurrentUser = userId === userData.id;
      
      // 如果查询的是当前用户角色
      if (isCurrentUser) {
        // 尝试从API获取角色 (最多重试2次)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`尝试第${attempt + 1}次获取用户角色...`);
              // 重试前短暂延迟
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            
            // 这里添加API调用来获取用户角色
            // 如果API不可用，则回退到本地角色推断
            break; // 如果成功，跳出重试循环
          } catch (apiError) {
            console.error(`第${attempt + 1}次获取角色失败:`, apiError);
            fetchError = apiError;
            // 继续下一次重试或回退到本地角色推断
          }
        }
        
        // 如果API获取失败，从本地数据推断角色
        if (userRoles.length === 0) {
          // 基于 userData.role_name 构建角色信息
          if (userData.role_name) {
            // isAdmin and isDeptAdmin flags are no longer part of the role object here
            userRoles.push({ name: userData.role_name });
            console.log(`使用提供的角色名: ${userData.role_name}`);
          } else {
            userRoles.push({ name: '用户' }); // 默认角色
            console.log('未找到特定角色，分配默认用户角色');
          }
        }
        
        // 3. 更新全局状态
        setUserRoles(userRoles);
        console.log('最终确定的用户角色:', userRoles);
        
        // 缓存角色信息
        try {
          await AsyncStorage.setItem('userRoles_cache', JSON.stringify({
            userId,
            roles: userRoles,
            timestamp: Date.now()
          }));
          console.log('已缓存角色信息');
        } catch (cacheError) {
          console.log('缓存角色信息失败:', cacheError);
        }
      } else {
        // 如果查询的不是当前用户，暂不支持
        console.log('非当前用户的角色查询暂不支持');
        return [];
      }
      
      return userRoles;
    } catch (error) {
      console.error('获取用户角色失败:', error);
      // 即使发生错误，也确保返回一个有效的数组
      return [];
    }
  };

  const assignRole = async (userId, roleId) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.post(getApiUrl('USERS', 'ASSIGN_ROLE'), 
        { userId, roleId },
        { headers: { 'user-id': userData.id } }
      );
      
      return response.data.success;
    } catch (error) {
      console.error('分配角色失败:', error);
      return false;
    }
  };

  const removeRole = async (userId, roleId) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.post(getApiUrl('USERS', 'REMOVE_ROLE'), 
        { userId, roleId },
        { headers: { 'user-id': userData.id } }
      );
      
      return response.data.success;
    } catch (error) {
      console.error('移除角色失败:', error);
      return false;
    }
  };

  // const toggleAdmin = async (userId, isAdmin) => { // This function is being removed.
  //   // Admin status should be managed by changing the user's role_name.
  //   // For example, to make a user an admin, their role_name should be updated to '超级管理员'.
  //   // This might involve a new function like `updateUserRole(userId, newRoleName)`.
  //   console.warn('toggleAdmin is deprecated. Manage admin status via role_name.');
  //   return false;
  // };

  const toggleUserStatus = async (userId, status) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.post(getApiUrl('USERS', 'TOGGLE_STATUS'), 
        { userId, status },
        { headers: { 'user-id': userData.id } }
      );
      
      return response.data.success;
    } catch (error) {
      console.error('更新用户状态失败:', error);
      return false;
    }
  };

  // OAuth2配置管理方法
  const enableOAuth2 = async (config) => {
    try {
      // console.log('[AuthContext] 启用OAuth2认证');
      await AsyncStorage.setItem('oauth2_enabled', 'true');
      await AsyncStorage.setItem('oauth2_config', JSON.stringify(config));
      
      // 重新初始化OAuth2服务
      const service = new OAuth2Service(config.baseUrl, config.clientId, config.clientSecret);
      setOAuth2Service(service);
      setIsOAuth2Enabled(true);
      
      // console.log('[AuthContext] OAuth2认证已启用');
      return true;
    } catch (error) {
      console.error('[AuthContext] 启用OAuth2失败:', error);
      return false;
    }
  };
  
  const disableOAuth2 = async () => {
    try {
      // console.log('[AuthContext] 禁用OAuth2认证');
      await AsyncStorage.setItem('oauth2_enabled', 'false');
      
      // 清除OAuth2相关的令牌
      if (oauth2Service) {
        await oauth2Service.clearTokens();
      }
      
      setOAuth2Service(null);
      setIsOAuth2Enabled(false);
      
      // console.log('[AuthContext] OAuth2认证已禁用');
      return true;
    } catch (error) {
      console.error('[AuthContext] 禁用OAuth2失败:', error);
      return false;
    }
  };
  
  const getOAuth2Config = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('oauth2_config');
      return savedConfig ? JSON.parse(savedConfig) : DEFAULT_OAUTH2_CONFIG;
    } catch (error) {
      console.error('[AuthContext] 获取OAuth2配置失败:', error);
      return DEFAULT_OAUTH2_CONFIG;
    }
  };
  
  const updateOAuth2Config = async (config) => {
    try {
      // console.log('[AuthContext] 更新OAuth2配置');
      await AsyncStorage.setItem('oauth2_config', JSON.stringify(config));
      
      // 如果OAuth2已启用，重新初始化服务
      if (isOAuth2Enabled) {
        const service = new OAuth2Service(config.baseUrl, config.clientId, config.clientSecret);
        setOAuth2Service(service);
      }
      
      // console.log('[AuthContext] OAuth2配置已更新');
      return true;
    } catch (error) {
      console.error('[AuthContext] 更新OAuth2配置失败:', error);
      return false;
    }
  };
  
  const getOAuth2TokenInfo = async () => {
    try {
      if (!oauth2Service) {
        return null;
      }
      
      const tokenInfo = await oauth2Service.getTokenInfo();
      return tokenInfo;
    } catch (error) {
      console.error('[AuthContext] 获取OAuth2令牌信息失败:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userRoles, 
      // isAdmin, // Removed
      // isDeptAdmin, // Removed
      login, 
      logout, 
      loadUser, 
      updateUserInfo, 
      register, 
      // checkAdminStatus, // Removed or functionality absorbed into role_name logic
      getAllUsers, 
      getAllRoles, 
      getUserRoles,
      preloadUserRoles, 
      assignRole, 
      removeRole, 
      // toggleAdmin, // Removed
      toggleUserStatus,
      refreshToken,
      // 角色相关辅助函数
      getRoleInfo, 
      // OAuth2相关方法和状态
      isOAuth2Enabled,
      oauth2Service,
      enableOAuth2,
      disableOAuth2,
      getOAuth2Config,
      updateOAuth2Config,
      getOAuth2TokenInfo,
      checkTokenValidity
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};