import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StatusBar, Linking } from 'react-native';
import { StyleSheet, View, Text, TouchableOpacity, Image, Switch, ScrollView, Modal, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import { userApi, otaApi } from '../api/apiService';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, followSystem, toggleFollowSystem, colors } = useTheme();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const [language, setLanguage] = useState('中文');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const { user, updateUserInfo, logout, userRoles, getUserRoles } = useAuth();
  const [userInfo, setUserInfo] = useState({
    avatar_seed: user?.avatar_seed || Math.random().toString(36).substring(2, 15),
    username: user?.username || '',
    nickname: user?.nickname || '', // 若依后端姓名字段
    remark: user?.remark || '', // 若依后端角色备注字段
    email: user?.email || '', // 邮箱字段
    department: user?.department || '',
    phone: user?.phone || '',
    company: user?.company || '',
    displayName: user?.displayName || user?.nickname || user?.username || '未知用户' // 显示名称
  });
  const [editableUserInfo, setEditableUserInfo] = useState({
    username: '',
    nickname: '', // 若依后端姓名字段
    email: '', // 邮箱字段
    department: '',
    phone: '',
    company: ''
  });
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roles, setRoles] = useState([]);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState(null);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  // 备用TestFlight链接 - 当API无法获取链接时使用
  const TESTFLIGHT_URL = 'https://testflight.apple.com/join/VdGJbkDy';

  // 加载用户数据
  useEffect(() => {
    if (user) {
      setUserInfo({
        avatar_seed: user.avatar_seed || Math.random().toString(36).substring(2, 15),
        username: user.username || '',
        nickname: user.nickname || '', // 若依后端姓名字段
        remark: user.remark || '', // 若依后端角色备注字段
        email: user.email || '', // 邮箱字段
        department: user.department || '',
        phone: user.phone || '',
        company: user.company || '',
        displayName: user.displayName || user.nickname || user.username || '未知用户' // 显示名称
      });
      // 获取用户角色
      fetchUserRoles();
      
      // 检查是否有本地保存的头像
      checkLocalAvatar();
    }
  }, [user]);
  
  // 页面加载时获取下载链接
  useEffect(() => {
    // 首次加载时获取下载链接
    fetchDownloadUrls();
  }, []);
  
  // 从其他页面切换回来时重新获取下载链接
  useFocusEffect(
    useCallback(() => {
      console.log('个人中心页面获得焦点，重新获取下载链接...');
      fetchDownloadUrls();
      
      // 返回清理函数
      return () => {
        // 当页面失去焦点时执行（可选）
        console.log('个人中心页面失去焦点');
      };
    }, [])
  );

  // 获取用户角色
  const fetchUserRoles = async () => {
    if (!user || !user.id) return;
    
    setLoadingRoles(true);
    try {
      // 特别说明角色是从本地数据获取的
      console.log('从本地用户数据中获取角色信息');
      console.log('用户数据:', JSON.stringify(user));
      
      // 检查并输出is_name字段
      if (user.is_name !== undefined) {
        console.log('用户is_name字段:', user.is_name, '类型:', typeof user.is_name);
      } else {
        console.log('用户数据中不存在is_name字段');
      }
      
      // 获取角色
      const fetchedRoles = await getUserRoles(user.id);
      setRoles(fetchedRoles);
      
      console.log('获取到用户角色:', JSON.stringify(fetchedRoles));
      
      // 如果获取到的角色为空，并且 user 对象中有 role_name，可以考虑使用它
      if (fetchedRoles.length === 0 && user && user.role_name) {
        console.log(`用户角色列表为空，但用户对象中存在 role_name: ${user.role_name}。将其作为角色显示。`);
        setRoles([{ name: user.role_name }]); // 使用 user.role_name
      } else if (fetchedRoles.length === 0) {
        console.log('用户角色列表为空，且用户对象中无 role_name。显示为无特定角色。');
        // 可以设置一个默认的“无角色”或“用户”状态，或者让其为空由UI处理
        setRoles([]); 
      }
    } catch (error) {
      console.error('获取用户角色失败:', error);
      // 错误发生时，尝试从 user.role_name 回退
      if (user && user.role_name) {
        setRoles([{ name: user.role_name }]);
      } else {
        setRoles([]); // 或者显示错误状态
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  // 检查本地头像
  const checkLocalAvatar = async () => {
    try {
      if (!user || !user.id) return;
      
      const avatarUri = `${FileSystem.documentDirectory}avatars/user_${user.id}_avatar.jpg`;
      const fileInfo = await FileSystem.getInfoAsync(avatarUri);
      
      if (fileInfo.exists) {
        console.log('找到本地头像:', avatarUri);
        setLocalAvatarUri(avatarUri);
      } else {
        console.log('未找到本地头像');
        setLocalAvatarUri(null);
      }
    } catch (error) {
      console.error('检查本地头像错误:', error);
      setLocalAvatarUri(null);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === '中文' ? 'English' : '中文');
    // TODO: 实现语言切换逻辑
  };

  const generateNewAvatar = async () => {
    const newSeed = Math.random().toString(36).substring(2, 15);
    const success = await updateUserInfo({ 
      avatar_seed: newSeed
    });
    
    if (success) {
      setUserInfo(prev => ({
        ...prev,
        avatar_seed: newSeed
      }));
    } else {
      Alert.alert('错误', '生成新头像失败，请稍后重试');
    }
  };

  const saveAvatar = async () => {
    setShowAvatarModal(false);
  };

  // 打开编辑个人信息模态框
  const openProfileEditModal = () => {
    setEditableUserInfo({
      username: userInfo.username,
      nickname: userInfo.nickname || '', // 若依后端姓名字段
      email: userInfo.email || '', // 邮箱字段
      department: userInfo.department,
      phone: userInfo.phone,
      company: userInfo.company,
    });
    setShowProfileEditModal(true);
  };

  // 保存个人信息
  const saveProfileInfo = async () => {
    try {
      // 表单验证
      if (!editableUserInfo.username.trim()) {
        Alert.alert('提示', '请输入姓名');
        return;
      }
      
      // 设置加载状态
      setIsUpdating(true);
      
      // 之前使用的是AuthContext中的updateUserInfo函数
      // 现在直接调用API
      if (!user || !user.id) {
        Alert.alert('错误', '无法获取用户ID');
        return;
      }
      
      console.log('开始更新用户信息，用户ID:', user.id);
      const response = await userApi.updateUser(user.id, {
          username: editableUserInfo.username,
          nickname: editableUserInfo.nickname, // 若依后端姓名字段
          email: editableUserInfo.email, // 邮箱字段
          department: editableUserInfo.department,
          phone: editableUserInfo.phone,
          company: editableUserInfo.company,
          updated_at: new Date().toISOString()
        },
        { timeout: 10000 }
      );

      console.log('更新响应状态:', response.status);
      
      if (response.status === 200) {
        // 更新本地状态
        setUserInfo(prev => ({
          ...prev,
          username: editableUserInfo.username,
          nickname: editableUserInfo.nickname, // 若依后端姓名字段
          email: editableUserInfo.email, // 邮箱字段
          department: editableUserInfo.department,
          phone: editableUserInfo.phone,
          company: editableUserInfo.company,
          displayName: editableUserInfo.nickname || editableUserInfo.username || '未知用户' // 更新显示名称
        }));
        
        // 同时更新Auth上下文中的用户信息
        if (updateUserInfo) {
          await updateUserInfo({
            username: editableUserInfo.username,
            nickname: editableUserInfo.nickname, // 若依后端姓名字段
            email: editableUserInfo.email, // 邮箱字段
            department: editableUserInfo.department,
            phone: editableUserInfo.phone,
            company: editableUserInfo.company,
          });
        }
        
        setShowProfileEditModal(false);
        Alert.alert('成功', '个人信息已成功更新到数据库');
        
        // 记录日志
        console.log('用户信息已更新到数据库:', {
          username: editableUserInfo.username,
          nickname: editableUserInfo.nickname,
          email: editableUserInfo.email,
          department: editableUserInfo.department,
          phone: editableUserInfo.phone,
          company: editableUserInfo.company
        });
      } else {
        Alert.alert('错误', '更新个人信息失败，请稍后重试');
      }
    } catch (error) {
      console.error('更新个人信息错误:', error);
      console.error('错误详情:', error.response ? error.response.data : '无响应数据');
      Alert.alert(
        '数据库更新错误', 
        `更新个人信息时发生错误: ${error.message || '未知错误'}`, 
        [{ text: '确定' }]
      );
    } finally {
      // 无论成功或失败，都关闭加载状态
      setIsUpdating(false);
    }
  };

  // 从相册选择图片
  const pickImage = async () => {
    try {
      // 请求权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('权限错误', '需要相册权限才能选择图片');
        return;
      }
      
      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('选择的图片:', result.assets[0].uri);
        
        // 创建目录
        const avatarDir = `${FileSystem.documentDirectory}avatars/`;
        const dirInfo = await FileSystem.getInfoAsync(avatarDir);
        
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(avatarDir, { intermediates: true });
        }
        
        // 保存图片到本地
        if (user && user.id) {
          const localUri = `${avatarDir}user_${user.id}_avatar.jpg`;
          await FileSystem.copyAsync({
            from: result.assets[0].uri,
            to: localUri
          });
          
          setLocalAvatarUri(localUri);
          setShowAvatarModal(false);
          
          // 更新用户信息，记录使用本地头像
          await updateUserInfo({
            using_local_avatar: true
          });
          
          Alert.alert('成功', '头像已更新');
        }
      }
    } catch (error) {
      console.error('选择图片错误:', error);
      Alert.alert('错误', '选择图片时出现错误');
    }
  };

  // 获取Android顶部状态栏高度 - 移除这个计算，避免双重内边距
  const statusBarHeight = 0; // Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  // 检查更新
  const checkForUpdates = async () => {
    try {
      setCheckingUpdate(true);
      console.log('手动检查应用更新...');
      const update = await Updates.checkForUpdateAsync();
      console.log('更新检查结果:', update);
      
      if (update.isAvailable) {
        console.log('发现更新，开始下载...');
        await Updates.fetchUpdateAsync();
        Alert.alert(
          '更新就绪',
          '新版本已下载完成，是否立即重启应用以应用更新？',
          [
            {
              text: '稍后',
              style: 'cancel'
            },
            {
              text: '立即更新',
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }
          ]
        );
      } else {
        Alert.alert('检查更新', '当前已是最新版本');
      }
    } catch (error) {
      console.error('更新检查错误:', error);
      Alert.alert('更新错误', '检查更新时出现错误，请稍后再试');
    } finally {
      setCheckingUpdate(false);
    }
  };

  // 获取下载链接
  const fetchDownloadUrls = async () => {
    try {
      setLoadingUrls(true);
      const response = await otaApi.getDownloadUrls();
      console.log('下载链接API响应:', response);
      
      // 检查API响应格式 - 直接使用response，因为apiService已经返回了data部分
      if (response && typeof response === 'object') {
        console.log('下载链接数据:', response);
        
        // 保存下载链接和版本状态
        setDownloadUrls(response);
        setHasNewVersion(response.start === true);
        
        return response;
      } else {
        console.error('API响应格式异常:', response);
        // 使用 console.error 记录错误但不向用户显示弹窗，避免频繁打扰
        return null;
      }
    } catch (error) {
      console.error('获取下载链接出错:', error);
      // 只在开发环境显示错误弹窗
      if (__DEV__) {
        Alert.alert('获取失败', '无法获取应用更新信息，请稍后重试。');
      }
      return null;
    } finally {
      setLoadingUrls(false);
    }
  };

  // 打开下载链接
  const handleDownloadApp = async () => {
    try {
      setLoadingUrls(true);
      
      // 如果没有下载链接数据，先获取
      let urls = downloadUrls;
      if (!urls) {
        urls = await fetchDownloadUrls();
        if (!urls) {
          setLoadingUrls(false);
          return;
        }
      }
      
      // 检查是否允许下载新版本
      if (urls.start !== true) {
        Alert.alert('提示', '暂无新版本可供下载');
        setLoadingUrls(false);
        return;
      }

      // 根据平台获取对应的下载链接
      let downloadUrl;
      if (Platform.OS === 'android') {
        downloadUrl = urls.androidUrl || urls.downloadUrl;
      } else if (Platform.OS === 'ios') {
        downloadUrl = urls.iosUrl || urls.testflightUrl;
      }

      if (!downloadUrl) {
        console.error('API未返回有效的下载链接');
        
        // 如果是iOS设备且有备用TestFlight链接，则使用备用链接
        if (Platform.OS === 'ios' && TESTFLIGHT_URL) {
          console.log('使用备用TestFlight链接:', TESTFLIGHT_URL);
          downloadUrl = TESTFLIGHT_URL;
        } else {
          Alert.alert('获取失败', '未能获取到有效的应用下载地址，请联系管理员。');
          setLoadingUrls(false);
          return;
        }
      }

      console.log(`获取到的${Platform.OS}下载地址:`, downloadUrl);
      
      // iOS设备特殊处理：尝试使用多种链接格式
      if (Platform.OS === 'ios') {
        try {
          // 尝试获取应用的标识符
          const appId = (urls.appIdentifier || 
                        Constants.expoConfig?.ios?.bundleIdentifier || 
                        'com.zziot.app').trim();
          console.log('应用标识符:', appId);
          
          // 尝试构建不同的TestFlight URL格式
          // 1. 标准TestFlight URL (用户提供的链接)
          const testflightUrl = downloadUrl;
          
          // 2. 尝试直接使用TestFlight scheme打开特定应用
          const testflightSchemeUrl = `itms-beta://beta.itunes.apple.com/v1/app/${appId}`;
          
          // 3. 使用通用的App Store URL
          const appStoreUrl = `https://apps.apple.com/app/id${appId}`;
          
          // 4. 尝试TestFlight短链接
          const testflightCode = urls.testflightCode || 'VdGJbkDy';
          const testflightShortUrl = `https://testflight.apple.com/join/${testflightCode}`;
          
          // 按优先级尝试不同的链接
          console.log('尝试打开TestFlight链接:', testflightUrl);
          if (await Linking.canOpenURL(testflightUrl)) {
            await Linking.openURL(testflightUrl);
            Alert.alert('打开TestFlight', 'TestFlight将会打开，请根据提示更新应用。');
            setLoadingUrls(false);
            return;
          }
          
          console.log('尝试打开TestFlight scheme:', testflightSchemeUrl);
          if (await Linking.canOpenURL(testflightSchemeUrl)) {
            await Linking.openURL(testflightSchemeUrl);
            Alert.alert('打开TestFlight', 'TestFlight将会打开，请根据提示更新应用。');
            setLoadingUrls(false);
            return;
          }
          
          console.log('尝试打开TestFlight短链接:', testflightShortUrl);
          if (await Linking.canOpenURL(testflightShortUrl)) {
            await Linking.openURL(testflightShortUrl);
            Alert.alert('打开TestFlight', 'TestFlight将会打开，请根据提示更新应用。');
            setLoadingUrls(false);
            return;
          }
          
          console.log('尝试打开App Store链接:', appStoreUrl);
          if (await Linking.canOpenURL(appStoreUrl)) {
            await Linking.openURL(appStoreUrl);
            Alert.alert('打开App Store', 'App Store将会打开，请根据提示下载或更新应用。');
            setLoadingUrls(false);
            return;
          }
          
          // 所有特殊链接都失败，回退到通用链接
          console.log('所有特殊链接尝试失败，回退到通用链接');
        } catch (specialError) {
          console.error('特殊链接处理错误，回退到标准方法:', specialError);
        }
      }
      
      // 标准方法：尝试打开下载链接
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        // 根据平台提供不同的提示
        if (Platform.OS === 'android') {
          Alert.alert('开始下载', '应用安装包将在浏览器中开始下载，请在下载完成后手动安装。');
        } else if (Platform.OS === 'ios') {
          Alert.alert('打开TestFlight', 'TestFlight将会打开，请根据提示更新应用。');
        }
      } else {
        console.error(`无法打开链接: ${downloadUrl}`);
        Alert.alert('打开失败', `无法打开${Platform.OS === 'ios' ? 'TestFlight' : '下载'}链接，请检查网络或联系管理员。`);
      }
    } catch (error) {
      console.error('获取或打开下载链接失败:', error);
      if (error.response) {
        console.error('API错误响应:', error.response.status, error.response.data);
        Alert.alert('API错误', `获取更新信息失败 (状态码: ${error.response.status})，请稍后重试或联系管理员。`);
      } else if (error.request) {
        console.error('网络请求错误:', error.request);
        Alert.alert('网络错误', '无法连接到更新服务器，请检查网络连接。');
      } else {
        console.error('其他错误:', error.message);
        Alert.alert('未知错误', '获取更新信息时发生未知错误，请稍后重试。');
      }
    } finally {
      setLoadingUrls(false);
    }
  };

  // 清除本地用户数据
  const clearLocalUserData = async () => {
    try {
      console.log('开始清除本地用户数据...');
      
      // 清除AsyncStorage中保存的用户数据
      const keysToRemove = [
        'user',             // 用户基本信息
        'userRoles',        // 用户角色
        'authToken',        // 认证令牌
        'loginCredentials', // 登录凭证
        'lastLogin',        // 上次登录信息
        'userPreferences',  // 用户偏好设置
        'userEmail',        // 邮箱/账号
        'userPassword',     // 密码
        'rememberMe'        // 记住登录状态
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // 手动逐一清除，确保清除完全
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userPassword');
      await AsyncStorage.removeItem('rememberMe');
      
      // 注意：根据用户要求，保留本地头像文件，不再删除
      // 头像文件将在用户下次登录时继续使用
      if (user && user.id) {
        const avatarUri = `${FileSystem.documentDirectory}avatars/user_${user.id}_avatar.jpg`;
        const fileInfo = await FileSystem.getInfoAsync(avatarUri);
        
        if (fileInfo.exists) {
          console.log('保留用户头像文件:', avatarUri);
        }
      }
      
      // 清除其他可能与用户相关的数据
      // 清除查询过的消息缓存
      await AsyncStorage.removeItem('queriedMessages');
      // 清除保存的消息
      await AsyncStorage.removeItem('messages');
      await AsyncStorage.removeItem('previousMessages');
      
      console.log('本地用户数据清除完成');
    } catch (error) {
      console.error('清除本地用户数据时出错:', error);
    }
  };

  return (
    <ScrollView 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.background,
          paddingTop: statusBarHeight
        }
      ]}
    >
      {/* 用户基本信息卡片 */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.avatarContainer}>
          <Image 
            source={localAvatarUri ? { uri: localAvatarUri } : { uri: `https://api.dicebear.com/7.x/pixel-art/png?seed=${userInfo.avatar_seed}` }}
            style={styles.avatar} 
          />
          <TouchableOpacity style={styles.editButton} onPress={openProfileEditModal}>
            <Ionicons name="pencil" size={20} color={isDarkMode ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>用户名</Text>
            <Text style={[styles.value, { color: colors.text }]}>{userInfo.username}</Text>
          </View>
          {userInfo.nickname && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>员工姓名</Text>
              <Text style={[styles.value, { color: colors.text }]}>{userInfo.nickname}</Text>
            </View>
          )}
          {userInfo.email && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>员工邮箱</Text>
              <Text style={[styles.value, { color: colors.text }]}>{userInfo.email}</Text>
            </View>
          )}
          {(user?.mobile || userInfo.phone) && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>联系方式</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user?.mobile || userInfo.phone}</Text>
            </View>
          )}
          {user?.dept && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>公司部门</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user.dept.name}</Text>
            </View>
          )}
          {user?.posts && user.posts.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>职位</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user.posts.map(post => post.name).join(', ')}</Text>
            </View>
          )}
          {user?.sex && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>性别</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user.sex === 1 ? '男' : user.sex === 2 ? '女' : '未知'}</Text>
            </View>
          )}
          {user?.loginDate && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>最后登录</Text>
              <Text style={[styles.value, { color: colors.text }]}>{new Date(user.loginDate).toLocaleString('zh-CN')}</Text>
            </View>
          )}        
          {userInfo.remark && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.text }]}>角色备注</Text>
              <Text style={[styles.value, { color: colors.text }]}>{userInfo.remark}</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.changeAvatarButton} 
            onPress={() => setShowAvatarModal(true)}
          >
            <Text style={styles.changeAvatarText}>更换头像</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 用户角色卡片 */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.roleHeaderContainer}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>角色权限</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchUserRoles}
            disabled={loadingRoles}
          >
            <Ionicons 
              name="refresh-circle" 
              size={24} 
              color={loadingRoles ? "#999" : "#FF6700"} 
            />
          </TouchableOpacity>
        </View>
        
        {loadingRoles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6700" />
            <Text style={[styles.loadingText, { color: colors.text }]}>加载角色信息...</Text>
          </View>
        ) : (user?.role_name === '超级管理员' || user?.role_name === '管理员') && (!roles || roles.length === 0) ? (
          // 对于管理员用户，即使API获取角色失败也显示管理员角色
          <View style={styles.roleItem}>
            <View style={styles.roleHeader}>
              <Ionicons 
                name="shield-checkmark" 
                size={20} 
                color="#FF6700" 
                style={styles.roleIcon} 
              />
              <Text style={[styles.roleName, { color: colors.text }]}>管理员</Text>
            </View>
            <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
              系统最高权限，可访问所有功能
            </Text>
          </View>
        ) : (user?.roles && user.roles.length > 0) || (roles && roles.length > 0) ? (
          <>
            {/* 优先显示用户对象中的角色信息 */}
            {(user?.roles || roles).map((role, index) => {
              // 处理不同的角色数据结构
              let roleName, roleDescription, roleId;
              
              if (typeof role === 'object') {
                // OAuth2 返回的角色对象结构
                roleName = role.name || role.role_name;
                roleId = role.id || role.role_id;
                roleDescription = role.description;
              } else {
                // 简单的角色ID
                roleId = role;
              }
              
              // 如果没有角色名称，使用默认值
              if (!roleName) {
                roleName = roleId ? `角色(ID:${roleId})` : '未知角色';
                roleDescription = roleDescription || '暂无详细描述';
              }
              
              return (
                <View key={index} style={styles.roleItem}>
                  <View style={styles.roleHeader}>
                    <Ionicons 
                      name="shield-checkmark" 
                      size={20} 
                      color="#FF6700" 
                      style={styles.roleIcon} 
                    />
                    <Text style={[styles.roleName, { color: colors.text }]}>{roleName}</Text>
                  </View>
                  <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                    {roleDescription || '角色权限信息'}
                  </Text>
                </View>
              );
            })}
          </>
        ) : (
          <Text style={[styles.noRolesText, { color: colors.textSecondary }]}>
            暂无分配角色权限
          </Text>
        )}
      </View>

      {/* 主题设置卡片 */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>主题设置</Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>跟随系统主题</Text>
          <Switch
            value={followSystem}
            onValueChange={toggleFollowSystem}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={followSystem ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <View style={[styles.settingRow, { opacity: followSystem ? 0.5 : 1 }]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>暗黑模式</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
            disabled={followSystem}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>界面语言</Text>
          <TouchableOpacity onPress={toggleLanguage} style={[styles.languageButton, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}>
            <Text style={[styles.languageText, { color: colors.text }]}>{language}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 应用更新卡片 */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>应用更新</Text>
        <View style={styles.updateContainer}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            版本: {Constants.expoConfig.version}
          </Text>
          <TouchableOpacity 
            style={[styles.updateButton, { opacity: checkingUpdate ? 0.6 : 1 }]} 
            onPress={checkForUpdates}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.updateButtonText}>检查更新</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* 添加下载应用按钮 */}
        <View style={styles.updateContainer}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            {hasNewVersion ? '有新版本可用' : '当前是最新版本'}
          </Text>
          <TouchableOpacity 
            style={[
              styles.downloadButton, 
              { 
                opacity: loadingUrls ? 0.6 : 1,
                backgroundColor: hasNewVersion ? '#4CAF50' : '#9E9E9E'
              }
            ]} 
            onPress={handleDownloadApp}
            disabled={loadingUrls}
          >
            {loadingUrls ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons 
                  name={Platform.OS === 'ios' ? "logo-apple-appstore" : "cloud-download"} 
                  size={16} 
                  color="#fff" 
                  style={{ marginRight: 5 }} 
                />
                <Text style={styles.updateButtonText}>
                  {Platform.OS === 'ios' ? '打开TestFlight' : '下载APK'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 编辑个人信息模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfileEditModal}
        onRequestClose={() => setShowProfileEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, width: '90%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>编辑个人信息</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>用户名</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editableUserInfo.username}
                onChangeText={(text) => setEditableUserInfo(prev => ({ ...prev, username: text }))}
                placeholder="请输入用户名"
                placeholderTextColor={colors.textSecondary}
                editable={!isUpdating}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>姓名</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editableUserInfo.nickname}
                onChangeText={(text) => setEditableUserInfo(prev => ({ ...prev, nickname: text }))}
                placeholder="请输入真实姓名"
                placeholderTextColor={colors.textSecondary}
                editable={!isUpdating}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>邮箱</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editableUserInfo.email}
                onChangeText={(text) => setEditableUserInfo(prev => ({ ...prev, email: text }))}
                placeholder="请输入邮箱地址"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                editable={!isUpdating}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>单位</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editableUserInfo.company}
                onChangeText={(text) => setEditableUserInfo(prev => ({ ...prev, company: text }))}
                placeholder="请输入单位"
                placeholderTextColor={colors.textSecondary}
                editable={!isUpdating}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>部门</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editableUserInfo.department}
                onChangeText={(text) => setEditableUserInfo(prev => ({ ...prev, department: text }))}
                placeholder="请输入部门"
                placeholderTextColor={colors.textSecondary}
                editable={!isUpdating}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>联系方式</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editableUserInfo.phone}
                onChangeText={(text) => setEditableUserInfo(prev => ({ ...prev, phone: text }))}
                placeholder="请输入联系方式"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                editable={!isUpdating}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, isUpdating && { opacity: 0.5 }]} 
                onPress={() => setShowProfileEditModal(false)}
                disabled={isUpdating}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, isUpdating && { opacity: 0.5 }]} 
                onPress={saveProfileInfo}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 头像选择模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAvatarModal}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>更换头像</Text>
            <Image 
              source={localAvatarUri ? { uri: localAvatarUri } : { uri: `https://api.dicebear.com/7.x/pixel-art/png?seed=${userInfo.avatar_seed}` }}
              style={styles.previewAvatar} 
            />
            <View style={styles.avatarButtons}>
              <TouchableOpacity style={[styles.generateButton, { width: '48%' }]} onPress={generateNewAvatar}>
                <Text style={styles.generateButtonText}>随机生成</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickImageButton, { width: '48%' }]} onPress={pickImage}>
                <Text style={styles.pickImageButtonText}>从相册选择</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowAvatarModal(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={saveAvatar}
              >
                <Text style={styles.modalButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 退出账号按钮 */}
      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: '#ff4444' }]} 
        onPress={() => {
          Alert.alert(
            '退出确认',
            '确定要退出登录吗？',
            [
              { text: '取消', style: 'cancel' },
              { 
                text: '确定', 
                onPress: async () => {
                  try {
                    // 先清除本地用户数据
                    await clearLocalUserData();
                    
                    // 调用Auth上下文中的登出方法
                    await logout();
                    
                    // 清理本地用户信息状态
                    setUserInfo({
                      avatar_seed: Math.random().toString(36).substring(2, 15),
                      username: '',
                      department: '',
                      phone: '',
                      company: ''
                    });
                    
                    // 重置本地头像URI
                    setLocalAvatarUri(null);
                    
                    // 导航回主页
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Home' }]
                    });
                    
                    console.log('登出流程完成');
                  } catch (error) {
                    console.error('退出登录时出错:', error);
                    Alert.alert('退出失败', '退出登录时出现错误，请重试');
                  }
                }
              }
            ]
          );
        }}
      >
        <Ionicons name="log-out-outline" size={24} color="#fff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>退出账号</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// 创建样式函数，使用设计令牌
const createStyles = (colors, isDarkMode) => {
  const { spacing, typography, borderRadius, shadows } = DesignTokens;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.lg,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      position: 'relative',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    editButton: {
      position: 'absolute',
      right: -spacing.md,
      top: 0,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      ...shadows.sm,
    },
    infoContainer: {
      gap: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
      borderRadius: borderRadius.md,
      ...shadows.xs,
    },
    label: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
      fontWeight: typography.weights.medium,
    },
    value: {
      fontSize: typography.sizes.md,
      color: colors.text,
      fontWeight: typography.weights.regular,
      flex: 1,
      textAlign: 'right',
    },
    cardTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      marginBottom: spacing.lg,
      color: colors.text,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
      borderRadius: borderRadius.md,
      ...shadows.xs,
    },
    settingLabel: {
      fontSize: typography.sizes.md,
      color: colors.text,
      fontWeight: typography.weights.medium,
    },
    languageButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      ...shadows.sm,
    },
    languageText: {
      fontSize: typography.sizes.sm,
      color: colors.onPrimary,
      fontWeight: typography.weights.medium,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.card,
      padding: spacing.xxl,
      borderRadius: borderRadius.xxl,
      alignItems: 'center',
      ...shadows.xl,
    },
    modalTitle: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      marginBottom: spacing.xl,
      color: colors.text,
      textAlign: 'center',
    },
    previewAvatar: {
      width: 160,
      height: 160,
      borderRadius: 80,
      marginBottom: spacing.xl,
      borderWidth: 4,
      borderColor: colors.primary,
    },
    avatarButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    generateButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      flex: 1,
      ...shadows.md,
    },
    generateButtonText: {
      color: colors.onPrimary,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      textAlign: 'center',
    },
    pickImageButton: {
      backgroundColor: colors.success,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      flex: 1,
      ...shadows.md,
    },
    pickImageButtonText: {
      color: colors.onSuccess,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: spacing.md,
    },
    modalButton: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      flex: 1,
      ...shadows.md,
    },
    cancelButton: {
      backgroundColor: colors.textSecondary,
    },
    saveButton: {
      backgroundColor: colors.success,
    },
    modalButtonText: {
      color: colors.onPrimary,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      textAlign: 'center',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      marginTop: spacing.xl,
      backgroundColor: colors.error,
      ...shadows.md,
    },
    logoutIcon: {
      marginRight: spacing.sm,
    },
    logoutText: {
      color: colors.onError,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    versionText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      color: colors.text,
    },
    roleItem: {
      marginBottom: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
      borderRadius: borderRadius.md,
      ...shadows.xs,
    },
    roleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    roleIcon: {
      marginRight: spacing.sm,
    },
    roleName: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semibold,
      color: colors.text,
    },
    roleDescription: {
      fontSize: typography.sizes.sm,
      marginLeft: spacing.xl,
      color: colors.textSecondary,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
    },
    loadingText: {
      marginLeft: spacing.sm,
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
    },
    noRolesText: {
      textAlign: 'center',
      padding: spacing.md,
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
    },
    roleHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    refreshButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
    },
    updateContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
    },
    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.warning,
      ...shadows.sm,
      flex: 1,
    },
    downloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.success,
      ...shadows.sm,
      flex: 1,
    },
    updateButtonText: {
      color: colors.onWarning,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
    },
    changeAvatarButton: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      padding: spacing.sm,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    changeAvatarText: {
      color: colors.textSecondary,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    inputContainer: {
      width: '100%',
      marginBottom: spacing.lg,
    },
    inputLabel: {
      fontSize: typography.sizes.md,
      marginBottom: spacing.sm,
      color: colors.text,
      fontWeight: typography.weights.medium,
    },
    input: {
      width: '100%',
      height: 48,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      fontSize: typography.sizes.md,
      backgroundColor: isDarkMode ? colors.surface : colors.backgroundSecondary,
      color: colors.text,
      ...shadows.xs,
    },
  });
};

export default ProfileScreen;