import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CACHE_KEYS } from '../api/config';
import { saveAuthToken, getAuthToken, clearAuthToken } from '../api/storage';
import { EventRegister } from '../utils/EventEmitter';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // 添加useEffect钩子，确保应用启动时自动加载用户数据
  useEffect(() => {
    // 应用启动时自动加载用户信息
    loadUser();
  }, []);

  // 添加定期检查令牌有效性的机制
  useEffect(() => {
    // 如果用户已登录，定期检查令牌有效性
    if (user) {
      const tokenCheckInterval = setInterval(async () => {
        const isValid = await checkTokenValidity();
        if (!isValid) {
          console.log('令牌已过期或无效，尝试刷新令牌');
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
    
    // 确保管理员信息的处理
    const adminValue = userData.is_admin !== undefined ? userData.is_admin : 
                       (userData.isAdmin !== undefined ? userData.isAdmin : 
                       (userData.admin !== undefined ? userData.admin : 0));
    
    console.log('创建令牌，管理员状态:', adminValue, '类型:', typeof adminValue);
    
    // 创建令牌的payload部分，包含用户信息和过期时间
    const payload = {
      id: userData.id,
      username: userData.username || userData.name,
      email: userData.email,
      is_admin: adminValue, // 使用处理过的管理员值
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
        const response = await axios.post('https://zziot.jzz77.cn:9003/api/refresh-token', {
          userId: user.id,
          email: user.email
        });
        
        if (response.data && response.data.token) {
          await saveAuthToken(response.data.token);
          console.log('成功刷新令牌');
          return true;
        }
      } catch (apiError) {
        console.log('通过API刷新令牌失败，尝试本地创建令牌');
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

  // 添加一个函数，用于推断用户是否具有管理员权限
  const inferAdminStatus = (userInfo) => {
    // 由于后端不直接返回is_admin字段，我们需要根据其他信息来推断
    
    // 优先检查数据库中的is_admin字段
    if (userInfo.is_admin === 1 || userInfo.is_admin === '1') {
      console.log('数据库is_admin字段值为1，用户是管理员');
      return true;
    }
    
    // 方法1: 检查用户是否有特定的角色名称，如'admin'、'administrator'等
    if (userInfo.roles && Array.isArray(userInfo.roles)) {
      const adminRoleNames = ['admin', 'administrator', '管理员'];
      const hasAdminRole = userInfo.roles.some(role => 
        typeof role === 'string' 
          ? adminRoleNames.includes(role.toLowerCase())
          : role.name && adminRoleNames.includes(role.name.toLowerCase())
      );
      if (hasAdminRole) {
        console.log('用户具有管理员角色');
        return true;
      }
    }
    
    // 方法2: 检查用户是否有特定的权限标志
    if (userInfo.permissions && (
        userInfo.permissions.includes('admin') || 
        userInfo.permissions.includes('manage_users')
      )) {
      console.log('用户具有管理员权限');
      return true;
    }
    
    // 方法3: 检查用户是否具有特定的用户类型或级别
    if (userInfo.user_type === 'admin' || userInfo.level === 'admin') {
      console.log('用户类型为管理员');
      return true;
    }
    
    // 检查type字段 - 可能是后端用来标识用户类型的字段
    if (userInfo.type === 'admin' || userInfo.type === 1 || userInfo.type === '1') {
      console.log('用户type字段表明是管理员');
      return true;
    }
    
    // 方法4: 检查是否有特定的管理员标志位(不同的命名可能)
    if (userInfo.isAdmin === true || userInfo.is_admin === true || 
        userInfo.admin === true || userInfo.administrator === true) {
      console.log('用户有管理员标志');
      return true;
    }
    
    // 检查权限/身份等级相关字段
    if (userInfo.accessLevel === 'admin' || userInfo.access_level === 'admin' ||
        userInfo.accessLevel === 1 || userInfo.access_level === 1) {
      console.log('用户访问等级表明是管理员');
      return true;
    }
    
    // 检查其他可能表示管理员身份的字段组合
    if (userInfo.status === 'admin' || userInfo.role === 'admin') {
      console.log('用户status/role字段表明是管理员');
      return true;
    }
    
    // 如果所有方法都没有确定用户是管理员，则默认为非管理员
    console.log('未能识别为管理员，设置为普通用户');
    return false;
  };

  const login = async (userData) => {
    try {
      if (!userData) {
        throw new Error('无效的用户数据');
      }

      // 记录完整的用户数据用于调试
      console.log('===== AuthContext: 登录处理 =====');
      console.log('用户ID:', userData.id);
      console.log('用户名:', userData.username);
      console.log('用户Email:', userData.email);
      console.log('原始管理员状态:', userData.is_admin, '类型:', typeof userData.is_admin);
      
      // 首先保存基本用户信息，不含管理员状态
      const initialUserData = {
        ...userData
      };
      
      // 保存初始用户信息到本地存储
      await AsyncStorage.setItem('user', JSON.stringify(initialUserData));
      
      // 更新基本用户状态
      setUser(initialUserData);
      setLoading(false);
      
      // 关键修改：先查询管理员状态，再创建令牌
      console.log('登录成功，立即查询管理员状态');
      
      try {
        // 先向后端请求用户的管理员状态
        // 添加用户ID到请求头，确保后端可以识别用户
        const response = await axios.post('https://nodered.jzz77.cn:9003/api/check-admin-status', 
          { 
            userId: userData.id,
            username: userData.username,
            email: userData.email 
          },
          {
            headers: { 
              'Content-Type': 'application/json',
              'user-id': userData.id 
            }
          }
        );
        
        console.log('管理员状态查询响应:', JSON.stringify(response.data));
        
        // 解析管理员状态
        let adminValue = 0;
        let adminStatus = false;
        
        // 处理后端返回的数组格式 [{"is_admin":1}]
        if (Array.isArray(response.data) && response.data.length > 0) {
          const firstItem = response.data[0];
          
          if (firstItem.is_admin !== undefined) {
            adminValue = firstItem.is_admin;
            adminStatus = adminValue === true || adminValue === 1 || adminValue === '1';
            console.log('获取到管理员状态:', adminValue, '解析为:', adminStatus);
          }
        } 
        // 处理其他格式的响应
        else if (response.data && typeof response.data === 'object') {
          if (response.data.is_admin !== undefined) {
            adminValue = response.data.is_admin;
            adminStatus = adminValue === true || adminValue === 1 || adminValue === '1';
            console.log('获取到管理员状态:', adminValue, '解析为:', adminStatus);
          }
        }
        
        // 更新用户信息，包含管理员状态
        const enhancedUserData = {
          ...userData,
          is_admin: adminStatus,
          is_admin_value: adminValue
        };
        
        // 更新状态和存储
        await AsyncStorage.setItem('user', JSON.stringify(enhancedUserData));
        setUser(enhancedUserData);
        setIsAdmin(adminStatus);
        
        // 然后创建令牌 - 此时令牌会包含管理员状态
        console.log('创建令牌，包含管理员状态:', adminValue);
        
        if (userData.token) {
          // 如果后端返回了令牌，直接保存
          await saveAuthToken(userData.token);
          console.log('后端提供的令牌已保存');
        } else {
          // 否则创建本地令牌，此时包含管理员信息
          const token = createToken(enhancedUserData);
          if (token) {
            await saveAuthToken(token);
            console.log('已创建并保存包含管理员状态的本地令牌');
          } else {
            console.error('创建令牌失败');
          }
        }
        
      } catch (adminCheckError) {
        console.error('查询管理员状态失败:', adminCheckError);
        
        // 查询失败时，使用默认值创建令牌
        const fallbackUserData = {
          ...userData,
          is_admin: userData.is_admin || false,
          is_admin_value: userData.is_admin || 0
        };
        
        // 使用回退数据创建令牌
        if (userData.token) {
          await saveAuthToken(userData.token);
          console.log('后端提供的令牌已保存');
        } else {
          const token = createToken(fallbackUserData);
          if (token) {
            await saveAuthToken(token);
            console.log('已创建并保存含默认管理员状态的令牌');
          } else {
            console.error('创建令牌失败');
          }
        }
      }
      
      console.log('登录流程完成，用户信息和令牌已保存');
      
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
      // 注册成功后的处理逻辑
      // 注意：这里不自动登录，而是返回成功状态
      return { success: true, message: '注册成功' };
    } catch (error) {
      console.error('注册失败:', error);
      throw error; // 向上传播错误以便调用者处理
    }
  };
  

  const logout = async () => {
    try {
      // 清除所有与用户相关的存储数据
      await AsyncStorage.removeItem('user');
      // 清除令牌
      await clearAuthToken();
      
      // 重置用户状态
      setUser(null);
      setLoading(false);
      
      return true;
    } catch (error) {
      console.error('退出登录失败:', error);
      return false;
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);
      
      // 首先检查令牌有效性
      const isTokenValid = await checkTokenValidity();
      if (!isTokenValid) {
        console.log('令牌无效或已过期，尝试刷新');
        const refreshSuccessful = await refreshToken();
        if (!refreshSuccessful) {
          console.log('无法刷新令牌，需要重新登录');
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
          console.log('已从本地存储恢复用户会话');
          
          // 将用户数据设置到状态中，但不判断管理员权限
          setUser(parsedUser);
          
          // 如果本地存储中有明确的管理员标志，则使用它
          if (parsedUser.is_admin === true || parsedUser.is_admin === 1 || parsedUser.is_admin === '1') {
            setIsAdmin(true);
            console.log('本地存储中用户被标记为管理员');
          } else {
            setIsAdmin(false);
            console.log('本地存储中用户被标记为非管理员');
          }
        } catch (parseError) {
          console.error('解析用户数据失败:', parseError);
          // 如果解析失败，清除损坏的数据
          await AsyncStorage.removeItem('user');
        }
      } else {
        console.log('未找到已保存的用户会话');
      }
    } catch (error) {
      console.error('加载用户数据时出错:', error);
    } finally {
      setLoading(false);
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
          const response = await fetch(`https://zziot.jzz77.cn:9003/api/users/${user.id}`, {
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
        const response = await axios.post('https://nodered.jzz77.cn:9003/api/check-admin-status', 
          { 
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
            // 保存is_admin的原始值，用于后续角色确定
            const adminValue = firstItem.is_admin;
            console.log('数组中的is_admin字段:', adminValue, '解析为管理员状态:', adminStatus);
            
            // 更新用户数据时保留原始的is_admin值
            const updatedUserInfo = { 
              ...userInfo, 
              is_admin: adminStatus,
              is_admin_value: adminValue  // 保存原始值
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUserInfo));
            setUser(updatedUserInfo);
            setIsAdmin(adminStatus);
            
            // 触发角色更新
            await getUserRoles(userInfo.id);
            
            console.log('管理员权限检查完成，结果已保存到本地');
            return adminStatus;
          }
        } 
        // 处理其他格式的响应
        else if (response.data && typeof response.data === 'object') {
          if (response.data.is_admin !== undefined) {
            adminStatus = response.data.is_admin === true || response.data.is_admin === 1 || response.data.is_admin === '1';
            // 保存is_admin的原始值
            const adminValue = response.data.is_admin;
            console.log('API返回is_admin字段:', adminValue, '解析为管理员状态:', adminStatus);
            
            // 更新用户数据并保存到本地存储
            const updatedUserInfo = { 
              ...userInfo, 
              is_admin: adminStatus,
              is_admin_value: adminValue  // 保存原始值
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUserInfo));
            setUser(updatedUserInfo);
            setIsAdmin(adminStatus);
            
            // 触发角色更新
            await getUserRoles(userInfo.id);
            
            console.log('管理员权限检查完成，结果已保存到本地');
            return adminStatus;
          }
        }
        
        // 如果没有找到is_admin字段，保持当前状态
        console.log('API返回的数据中未找到is_admin字段');
        return isAdmin;
      } catch (apiError) {
        console.error('API权限检查失败:', apiError);
        
        // API调用失败时，保持当前管理员状态不变
        console.log('API调用失败，保持当前管理员状态');
        return isAdmin;
      }
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      return false;
    }
  };

  const getAllUsers = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.get('https://zziot.jzz77.cn:9003/api/users', {
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
      const response = await axios.get('https://zziot.jzz77.cn:9003/api/roles', {
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

  const getUserRoles = async (userId) => {
    try {
      if (!userId) {
        console.log('获取角色: 未提供用户ID');
        return [];
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
      
      // 检查是否是当前用户的角色查询
      const isCurrentUser = userId === userData.id;
      
      // 如果查询的是当前用户角色
      if (isCurrentUser) {
        // 1. 检查is_admin_value或is_admin字段的值
        const adminValue = userData.is_admin_value !== undefined ? userData.is_admin_value : userData.is_admin;
        
        console.log('用户is_admin值:', adminValue, '类型:', typeof adminValue);
        
        // 根据is_admin值确定角色
        if (adminValue !== undefined) {
          // 转换为数字，如果可能的话
          const roleId = typeof adminValue === 'number' ? 
              adminValue : 
              (adminValue === '1' || adminValue === true) ? 
                1 : parseInt(adminValue);
              
          if (!isNaN(roleId) && roleId > 0 && roleId <= 9) {
            userRoles.push({ id: roleId });
            console.log(`根据is_admin值=${adminValue}添加角色ID:${roleId}`);
          } 
          // 特殊处理值为true的情况（管理员）
          else if (adminValue === true) {
            userRoles.push({ id: 1 });
            console.log('用户is_admin为true，添加管理员角色');
          }
        }
        
        // 2. 如果没有找到有效角色但用户是管理员
        if (userRoles.length === 0 && userData.is_admin) {
          userRoles.push({ id: 1 });
          console.log('根据is_admin标志添加管理员角色');
        }
        
        // 3. 更新全局状态
        setUserRoles(userRoles);
        console.log('最终确定的用户角色:', userRoles);
      } else {
        // 如果查询的不是当前用户，暂不支持
        console.log('非当前用户的角色查询暂不支持');
        return [];
      }
      
      return userRoles;
    } catch (error) {
      console.error('获取用户角色失败:', error);
      return [];
    }
  };

  const assignRole = async (userId, roleId) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.post('https://zziot.jzz77.cn:9003/api/users/assign-role', 
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
      const response = await axios.post('https://zziot.jzz77.cn:9003/api/users/remove-role', 
        { userId, roleId },
        { headers: { 'user-id': userData.id } }
      );
      
      return response.data.success;
    } catch (error) {
      console.error('移除角色失败:', error);
      return false;
    }
  };

  const toggleAdmin = async (userId, isAdmin) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.post('https://zziot.jzz77.cn:9003/api/users/toggle-admin', 
        { userId, isAdmin },
        { headers: { 'user-id': userData.id } }
      );
      
      return response.data.success;
    } catch (error) {
      console.error('更新管理员状态失败:', error);
      return false;
    }
  };

  const toggleUserStatus = async (userId, status) => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('user'));
      const response = await axios.post('https://zziot.jzz77.cn:9003/api/users/toggle-status', 
        { userId, status },
        { headers: { 'user-id': userData.id } }
      );
      
      return response.data.success;
    } catch (error) {
      console.error('更新用户状态失败:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userRoles, 
      isAdmin, 
      login, 
      logout, 
      loadUser, 
      updateUserInfo, 
      register, 
      checkAdminStatus, 
      getAllUsers, 
      getAllRoles, 
      getUserRoles, 
      assignRole, 
      removeRole, 
      toggleAdmin, 
      toggleUserStatus,
      refreshToken,
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