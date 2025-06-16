import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
  Switch,
  ScrollView,
  SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import apiService, { userApi, authApi } from '../api/apiService';
import { loadApiConfig } from '../api/apiManager';
import { PageGuard, FeatureGuard } from '../components/PermissionControlComponents';
import { PAGE_PERMISSIONS } from '../config/pagePermissions';
import { PERMISSION_LEVELS } from '../hooks/usePermissionControl';

const UserManagementScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth(); // Removed isAdmin
  const navigation = useNavigation();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState(null);
  
  // 添加用户的两步流程状态
  const [addUserStep, setAddUserStep] = useState(1); // 1 = 基本信息, 2 = 角色设置
  const [addedUserId, setAddedUserId] = useState(null); // 存储注册成功后的用户ID
  
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    company: '',
    company_id: '',
    department: '',
    department_id: '',
    is_admin: 0
  });

  // 添加公司和部门相关状态
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  // 添加按部门分组的功能
  const [groupedUsers, setGroupedUsers] = useState([]);
  
  // 对用户按部门进行分组
  const groupUsersByDepartment = (userList) => {
    if (!userList || !Array.isArray(userList)) {
      console.log('无效的用户列表，无法分组');
      return;
    }
    
    // 创建部门分组映射
    const departmentGroups = {};
    
    // 遍历用户并按部门分组
    userList.forEach(user => {
      const department = user.department || '未分配部门';
      
      if (!departmentGroups[department]) {
        departmentGroups[department] = [];
      }
      
      departmentGroups[department].push(user);
    });
    
    // 转换为数组格式用于渲染
    const groupedData = Object.keys(departmentGroups).map(department => ({
      title: department,
      data: departmentGroups[department]
    }));
    
    // 对分组进行排序，确保"未分配部门"在最后
    groupedData.sort((a, b) => {
      if (a.title === '未分配部门') return 1;
      if (b.title === '未分配部门') return -1;
      return a.title.localeCompare(b.title);
    });
    
    console.log(`用户按部门分组完成，共${groupedData.length}个部门`);
    setGroupedUsers(groupedData);
  };

  // 检查是否是管理员，如果不是则返回
  useEffect(() => {
    // 只有角色为 'super_admin' 或 'admin' 才能访问此页面
    if (!user || (user.role_name !== 'super_admin' && user.role_name !== 'admin')) {
      Alert.alert('提示', '只有管理员才能访问此页面');
      navigation.goBack();
    }
  }, [navigation, user]);

  // 根据角色ID获取角色名称
  const getRoleName = (roleId) => {
    // 实际应用中，这里应该从全局状态或API获取角色名称
    // 此处仅为示例，后续需要替换为实际的角色管理逻辑
    if (roleId === 1 || roleId === true) return '管理员';
    if (roleId === 0 || roleId === false) return '普通用户';
    // 对于其他角色ID，可以返回一个通用名称或从API获取
    return `角色 ${roleId}`; // 示例：返回 "角色 ID"
  };

  // 根据角色ID获取角色颜色
  const getRoleColor = (roleId) => {
    // 实际应用中，这里应该从全局状态或API获取角色颜色
    // 此处仅为示例，后续需要替换为实际的角色管理逻辑
    if (roleId === 1 || roleId === true) return '#F44336'; // 管理员 - 红色
    if (roleId === 0 || roleId === false) return '#4CAF50'; // 普通用户 - 绿色
    // 对于其他角色ID，可以返回一个默认颜色
    return '#9E9E9E'; // 默认颜色
  };

  // 设置标题和状态栏
  useEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        title: '用户管理',
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 15 }}
            onPress={openAddUserModal}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        ),
      });
    }
    
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(isDarkMode ? '#121212' : '#FFFFFF');
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    }
  }, [navigation, colors, isDarkMode]);

  // 获取用户列表
  const fetchUsers = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    try {
      const data = await userApi.getUsers();
      
      if (data && Array.isArray(data)) {
        console.log('获取到用户列表:', data.length);
        setUsers(data);
        // 更新分组后的用户数据
        groupUsersByDepartment(data);
      } else {
        console.log('服务器返回的用户数据格式不正确:', data);
        Alert.alert('错误', '获取用户列表失败，请稍后再试');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      Alert.alert('错误', '获取用户列表失败，请检查网络连接');
    } finally {
      setLoading(false);
      if (!showLoadingIndicator) {
        setRefreshing(false);
      }
    }
  }, []);

  // 初始加载用户列表
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 下拉刷新
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(false);
  }, [fetchUsers]);

  // 获取公司列表
  const fetchCompanies = async () => {
    try {
      console.log('开始获取公司列表...');
      setLoading(true);
      
      const data = await userApi.getCompanies();
      
      if (data) {
        if (Array.isArray(data)) {
          console.log('成功获取公司列表:', data.length, '条记录');
          console.log('原始公司数据示例:', JSON.stringify(data[0]));
          
          // 转换公司数据格式
          const formattedCompanies = data.map(company => {
            // 将 department1-10 字段转换为部门数组
            const departments = [];
            for (let i = 1; i <= 10; i++) {
              const deptField = `department${i}`;
              if (company[deptField]) {
                departments.push({
                  id: i.toString(),
                  name: company[deptField]
                });
              }
            }
            
            return {
              ...company,
              name: company.company_name || `公司 ${company.id}`, // 使用company_name作为名称
              departments: departments
            };
          });
          
          // 详细记录转换后的数据
          formattedCompanies.forEach(company => {
            console.log(`转换后的公司: ID=${company.id}, 名称=${company.name}, 部门数量=${company.departments.length}`);
          });
          
          setCompanies(formattedCompanies);
        } else {
          console.error('服务器返回的公司数据格式不正确:', data);
          Alert.alert('错误', '获取公司列表失败，数据格式不正确');
        }
      } else {
        console.error('获取公司列表失败');
        Alert.alert('错误', '获取公司列表失败');
      }
    } catch (error) {
      console.error('获取公司列表失败:', error.message);
      if (error.response) {
        console.error('服务器返回:', error.response.status, error.response.data);
      }
      Alert.alert('错误', '无法获取公司列表，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 根据公司ID更新部门列表
  const updateDepartments = (companyId) => {
    if (!companyId) {
      console.log('没有公司ID，清空部门列表');
      setDepartments([]);
      return;
    }

    console.log('更新部门列表，公司ID:', companyId);
    const selectedCompany = companies.find(company => company.id.toString() === companyId.toString());
    
    if (selectedCompany) {
      console.log('找到公司:', selectedCompany.name);
      
      if (Array.isArray(selectedCompany.departments)) {
        console.log('部门数量:', selectedCompany.departments.length);
        console.log('部门列表:', selectedCompany.departments.map(d => ({ id: d.id, name: d.name })));
        setDepartments(selectedCompany.departments);
      } else if (selectedCompany.department1) {
        // 直接从公司对象中提取部门
        console.log('从公司对象直接提取部门');
        const extractedDepts = [];
        for (let i = 1; i <= 10; i++) {
          const deptField = `department${i}`;
          if (selectedCompany[deptField]) {
            extractedDepts.push({
              id: i.toString(),
              name: selectedCompany[deptField]
            });
          }
        }
        console.log('直接提取的部门:', extractedDepts);
        setDepartments(extractedDepts);
      } else {
        console.log('公司没有部门数据');
        setDepartments([]);
      }
    } else {
      console.warn('未找到公司:', companyId);
      setDepartments([]);
    }
  };

  // 处理公司变更
  const handleCompanyChange = (companyId) => {
    console.log('处理公司选择，ID:', companyId);
    
    if (!companyId) {
      console.log('没有选择公司ID');
      setNewUser({
        ...newUser,
        company_id: '',
        company: '',
        department_id: '',
        department: ''
      });
      setDepartments([]);
      return;
    }
    
    // 检查公司数据
    console.log('当前公司列表:', companies.map(c => ({ id: c.id, name: c.name })));
    
    const selectedCompany = companies.find(company => {
      const companyIdStr = company.id ? company.id.toString() : '';
      const targetIdStr = companyId ? companyId.toString() : '';
      const isMatch = companyIdStr === targetIdStr;
      console.log(`比较: 公司ID ${companyIdStr} 与目标ID ${targetIdStr}, 匹配: ${isMatch}`);
      return isMatch;
    });
    
    console.log('找到的公司:', selectedCompany);
    
    if (selectedCompany) {
      // 更新用户数据中的公司信息
      const updatedUser = {
        ...newUser,
        company_id: companyId,
        company: selectedCompany.name || selectedCompany.company_name,
        department_id: '',
        department: ''
      };
      
      console.log('更新用户数据:', updatedUser);
      setNewUser(updatedUser);
      
      // 更新部门列表
      updateDepartments(companyId);
    } else {
      console.warn('未找到匹配的公司:', companyId);
      Alert.alert('提示', '无法找到所选公司的信息');
    }
  };

  // 处理部门变更
  const handleDepartmentChange = (departmentId) => {
    console.log('选择部门ID:', departmentId);
    
    if (!departmentId) {
      setNewUser({
        ...newUser,
        department_id: '',
        department: ''
      });
      return;
    }
    
    const selectedDepartment = departments.find(dept => dept.id.toString() === departmentId.toString());
    console.log('选择的部门:', selectedDepartment ? selectedDepartment.name : '未找到匹配部门');
    
    if (selectedDepartment) {
      setNewUser({
        ...newUser,
        department_id: departmentId,
        department: selectedDepartment.name
      });
    } else {
      console.warn('未找到匹配的部门:', departmentId);
    }
    
    if (Platform.OS === 'ios') {
      setShowDepartmentPicker(false);
    }
  };

  // 获取公司列表
  useEffect(() => {
    fetchCompanies();
  }, []);

  // 打开添加用户模态框
  const openAddUserModal = async () => {
    // 重置表单和步骤
    setNewUser({
      username: '',
      email: '',
      password: '',
      phone: '',
      company: '',
      company_id: '',
      department: '',
      department_id: '',
      is_admin: 0
    });
    setAddUserStep(1);
    setAddedUserId(null);
    
    // 先打开模态框，然后获取数据
    setShowAddModal(true);
    
    try {
      // 显示加载状态
      setLoading(true);
      
      // 获取最新的公司列表
      const data = await userApi.getCompanies();
      
      if (data && Array.isArray(data)) {
        console.log('成功获取公司列表:', data.length, '条记录');
        setCompanies(data);
      } else {
        console.error('获取公司列表失败');
      }
    } catch (error) {
      console.error('获取公司列表时出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 第一步: 注册用户
  const handleRegisterUser = async () => {
    // 验证表单
    const { username, email, password, phone } = newUser;
    if (!username || !email || !password || !phone) {
      Alert.alert('提示', '请完善必填信息（用户名、邮箱、密码、手机号）');
      return;
    }

    setLoading(true);
    try {
      // 使用注册API
      console.log('尝试注册用户，发送数据:', JSON.stringify({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        company: newUser.company,
        company_id: newUser.company_id,
        department: newUser.department,
        department_id: newUser.department_id
      }));
      
      const data = await authApi.register({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        company: newUser.company,
        company_id: newUser.company_id,
        department: newUser.department,
        department_id: newUser.department_id
      });

      console.log('完整响应数据:', JSON.stringify(data));
      
      if (data) {
        // 注册成功，但响应中没有用户ID
        console.log('注册成功，正在获取用户ID...');
        
        // 调用查询函数获取用户ID
        const userId = await findUserIdByUsernameOrEmail(newUser.username, newUser.email);
        
        if (userId) {
          console.log('成功获取用户ID:', userId);
          setAddedUserId(userId);
          setAddUserStep(2);
        } else {
          console.error('无法获取新注册用户的ID');
          Alert.alert(
            '注意',
            '用户已创建成功，但无法获取用户ID。您可以刷新用户列表后手动设置角色。',
            [
              {
                text: '确定',
                onPress: () => {
                  setShowAddModal(false);
                  fetchUsers(); // 刷新用户列表
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('注册用户失败:', error);
      if (error.response) {
        console.error('服务器响应状态:', error.response.status);
        console.error('服务器响应数据:', JSON.stringify(error.response.data));
      }
      Alert.alert('错误', error.response?.data?.message || '注册用户失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 根据用户名或邮箱查询用户ID
  const findUserIdByUsernameOrEmail = async (username, email) => {
    try {
      console.log('尝试查询用户ID，用户名:', username, '邮箱:', email);
      
      // 获取用户列表
      const data = await userApi.getUsers();
      
      if (data && Array.isArray(data)) {
        console.log('获取到用户列表，正在查找匹配用户...');
        
        // 查找匹配的用户
        const user = data.find(user => 
          user.username === username || user.email === email
        );
        
        if (user) {
          console.log('找到匹配用户:', user.username, '(ID:', user.id, ')');
          return user.id;
        } else {
          console.error('在用户列表中未找到匹配的用户');
          return null;
        }
      } else {
        console.error('获取用户列表失败或格式不正确');
        return null;
      }
    } catch (error) {
      console.error('查询用户ID时出错:', error);
      return null;
    }
  };

  // 第二步: 设置用户角色
  const handleSetUserRole = async () => {
    if (!addedUserId) {
      console.error('没有用户ID，无法设置角色');
      Alert.alert('错误', '无法获取用户ID，请刷新列表并手动找到该用户进行角色设置');
      setShowAddModal(false);
      fetchUsers();
      return;
    }

    setLoading(true);
    try {
      console.log('正在设置用户角色，用户ID:', addedUserId, '角色:', newUser.is_admin);
      const data = await userApi.updateUserRole(addedUserId, { is_admin: newUser.is_admin });

      console.log('角色设置响应:', JSON.stringify(data));
      Alert.alert('成功', '用户添加成功');
      
      // 重置表单并关闭模态框
      setNewUser({
        username: '',
        email: '',
        password: '',
        phone: '',
        company: '',
        company_id: '',
        department: '',
        department_id: '',
        is_admin: 0
      });
      setAddUserStep(1);
      setAddedUserId(null);
      setShowAddModal(false);
      
      // 刷新用户列表
      fetchUsers();
    } catch (error) {
      console.error('设置用户角色失败:', error);
      if (error.response) {
        console.error('服务器响应状态:', error.response.status);
        console.error('服务器响应数据:', JSON.stringify(error.response.data));
      }
      Alert.alert('错误', '设置用户角色失败，用户已创建但角色未设置');
    } finally {
      setLoading(false);
    }
  };

  // 后退到上一步
  const handleBackStep = () => {
    setAddUserStep(1);
  };

  // 删除用户
  const handleDeleteUser = async (userId) => {
    try {
      // 确认删除
      Alert.alert(
        '确认删除',
        '确定要删除此用户吗？此操作无法撤销。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定删除',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                await userApi.deleteUser(userId);
                
                // 删除成功，更新用户列表
                const updatedUsers = users.filter(user => user.id !== userId);
                setUsers(updatedUsers);
                // 更新分组
                groupUsersByDepartment(updatedUsers);
                Alert.alert('成功', '用户已删除');
              } catch (error) {
                console.error('删除用户失败:', error);
                Alert.alert('错误', '删除用户时出错，请检查网络连接');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('确认删除对话框错误:', error);
    }
  };

  // 打开编辑用户模态框
  const openEditModal = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  // 更新用户信息
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    // 验证角色ID在0-9范围内
    if (selectedUser.is_admin === undefined || selectedUser.is_admin === null ||
        selectedUser.is_admin < 0 || selectedUser.is_admin > 9) {
      Alert.alert('错误', '无效的角色ID，请选择有效角色 (0-9)');
      return;
    }
    
    setLoading(true);
    try {
      const userData = {
        username: selectedUser.username,
        email: selectedUser.email,
        company: selectedUser.company,
        department: selectedUser.department,
        phone: selectedUser.phone,
        is_admin: selectedUser.is_admin
      };
      
      if (selectedUser.password) {
        userData.password = selectedUser.password;
      }
      
      console.log('正在更新用户信息，用户ID:', selectedUser.id, '数据:', JSON.stringify(userData));
      
      await userApi.updateUser(selectedUser.id, userData);
      
      // 更新成功
        // 更新本地用户列表
        const updatedUsers = users.map(user => 
          user.id === selectedUser.id ? { ...user, ...userData } : user
        );
        setUsers(updatedUsers);
        // 更新分组
        groupUsersByDepartment(updatedUsers);
        
        setShowEditModal(false);
        Alert.alert('成功', '用户信息已更新');
    } catch (error) {
      console.error('更新用户信息失败:', error);
      Alert.alert('错误', '更新用户信息时出错，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 打开角色选择模态框
  const openRoleModal = (user) => {
    setUserToChangeRole(user);
    setShowRoleModal(true);
  };

  // 更改用户角色，确保角色ID在0-9范围内
  const changeUserRole = async (roleId) => {
    if (!userToChangeRole) {
      return;
    }
    
    // 确保角色ID在有效范围内
    if (roleId < 0 || roleId > 9) {
      Alert.alert('错误', '无效的角色ID，请选择有效角色');
      return;
    }
    
    setLoading(true);
    try {
      console.log('正在设置用户角色，用户ID:', userToChangeRole.id, '角色ID:', roleId);
      await userApi.updateUserRole(userToChangeRole.id, { is_admin: roleId });
      
      // 角色更新成功
        // 更新本地用户数据
        const updatedUsers = users.map(user => {
          if (user.id === userToChangeRole.id) {
            return { ...user, is_admin: roleId };
          }
          return user;
        });
        
        setUsers(updatedUsers);
        // 更新分组
        groupUsersByDepartment(updatedUsers);
        
        setShowRoleModal(false);
        setUserToChangeRole(null);
        
        Alert.alert('成功', '用户角色已更新');
    } catch (error) {
      console.error('更新用户角色失败:', error);
      Alert.alert('错误', '更新用户角色失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 公司选择器组件
  const CompanySelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>公司</Text>
      <TouchableOpacity
        style={[styles.input, { 
          backgroundColor: colors.background,
          color: colors.text,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd',
          justifyContent: 'space-between',
          flexDirection: 'row',
          alignItems: 'center',
          paddingRight: 12,
          height: 48,
          paddingVertical: 12
        }]}
        activeOpacity={0.7}
        onPress={handleCompanySelectIOS}
      >
        <Text style={{ 
          color: newUser.company ? colors.text : colors.textSecondary,
          flex: 1
        }}>
          {newUser.company || '请选择公司'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  // 部门选择器组件
  const DepartmentSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>部门</Text>
      <TouchableOpacity
        style={[styles.input, { 
          backgroundColor: colors.background,
          color: colors.text,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd',
          justifyContent: 'space-between',
          opacity: newUser.company_id ? 1 : 0.5,
          flexDirection: 'row',
          alignItems: 'center',
          paddingRight: 12,
          height: 48,
          paddingVertical: 12
        }]}
        onPress={handleDepartmentSelectIOS}
        disabled={!newUser.company_id}
      >
        <Text style={{ 
          color: newUser.department ? colors.text : colors.textSecondary,
          flex: 1
        }}>
          {!newUser.company_id 
            ? '请先选择公司' 
            : (newUser.department || '请选择部门')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  // 处理 iOS 公司选择
  const handleCompanySelectIOS = () => {
    if (companies.length === 0) {
      console.log('没有公司数据，重新获取...');
      fetchCompanies();
      return;
    }

    const options = [];
    companies.forEach(company => {
      options.push({
        text: company.name || company.company_name,
        onPress: () => {
          console.log('选择公司:', company.name || company.company_name, 'ID:', company.id);
          handleCompanyChange(company.id.toString());
        }
      });
    });
    
    options.push({ text: '取消', style: 'cancel' });

    Alert.alert(
      '选择公司',
      '请选择一个公司',
      options,
      { cancelable: true }
    );
  };

  // 处理 iOS 部门选择
  const handleDepartmentSelectIOS = () => {
    if (!newUser.company_id) {
      Alert.alert('提示', '请先选择公司');
      return;
    }

    if (departments.length === 0) {
      Alert.alert('提示', '该公司没有部门数据');
      return;
    }

    const options = [];
    departments.forEach(dept => {
      options.push({
        text: dept.name,
        onPress: () => {
          console.log('选择部门:', dept.name, 'ID:', dept.id);
          handleDepartmentChange(dept.id.toString());
        }
      });
    });
    
    options.push({ text: '取消', style: 'cancel' });

    Alert.alert(
      '选择部门',
      '请选择一个部门',
      options,
      { cancelable: true }
    );
  };

  // 渲染用户项
  const renderUserItem = ({ item }) => {
    // 防止删除自己
    const isCurrentUser = user && item.id === user.id;
    // 获取角色信息
    const roleId = typeof item.is_admin === 'boolean' ? (item.is_admin ? 1 : 0) : item.is_admin;
    
    return (
      <View style={[styles.userItem, { backgroundColor: colors.card }]}>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.username} {isCurrentUser ? '(你)' : ''}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
          <View style={styles.userDetails}>
            <Text style={[styles.userDetail, { color: colors.textSecondary }]}>
              {item.company || '无公司'} | {item.department || '无部门'}
            </Text>
            <View style={[styles.adminBadge, { backgroundColor: getRoleColor(roleId) }]}>
              <Text style={styles.adminBadgeText}>
                {getRoleName(roleId)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openRoleModal(item)}
          >
            <Ionicons 
              name="shield-outline" 
              size={22} 
              color={getRoleColor(roleId)} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Ionicons 
              name="pencil-outline" 
              size={22} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          {!isCurrentUser && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleDeleteUser(item.id)}
            >
              <Ionicons 
                name="trash-outline" 
                size={22} 
                color="#D32F2F" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Android 标题栏
  const AndroidHeader = () => (
    <View style={[styles.androidHeader, { backgroundColor: colors.card }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>用户管理</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddUserModal}
      >
        <Ionicons name="add-circle" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  // 渲染角色选择项
  const renderRoleItem = (roleId) => {
    const role = ROLES[roleId];
    const isSelected = userToChangeRole && 
                      (userToChangeRole.is_admin === roleId || 
                      (userToChangeRole.is_admin === true && roleId === 1));
    
    return (
      <TouchableOpacity
        key={roleId}
        style={[
          styles.roleItem,
          isSelected && { backgroundColor: `${role.color}20` }
        ]}
        onPress={() => changeUserRole(parseInt(roleId))}
      >
        <View style={[styles.roleBadge, { backgroundColor: role.color }]}>
          <Ionicons name="shield" size={18} color="#fff" />
        </View>
        <Text style={[styles.roleItemText, { color: colors.text }]}>
          {role.name}
        </Text>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={22} 
            color={role.color} 
            style={{ marginLeft: 'auto' }}
          />
        )}
      </TouchableOpacity>
    );
  };

  // 渲染部门标题
  const renderSectionHeader = ({ section }) => {
    return (
      <View style={[styles.sectionHeader, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title} ({section.data.length})
        </Text>
      </View>
    );
  };

  // 完成用户添加，确保角色ID在0-9范围内
  const handleCompleteAddUser = async () => {
    try {
      // 验证是否已选择角色
      if (newUser.is_admin === undefined || newUser.is_admin === null) {
        Alert.alert('提示', '请选择用户角色');
        return;
      }
      
      // 确保角色ID在有效范围内
      if (newUser.is_admin < 0 || newUser.is_admin > 9) {
        Alert.alert('错误', '无效的角色ID，请选择有效角色');
        return;
      }

      setLoading(true);
      
      // 发送角色设置请求
      console.log('正在设置新用户角色，用户ID:', addedUserId, '角色:', newUser.is_admin);
      await userApi.updateUserRole(addedUserId, { is_admin: newUser.is_admin });
      
      // 角色设置成功，重新获取用户列表
      const data = await userApi.getUsers();
      if (data && Array.isArray(data)) {
        setUsers(data);
        // 更新分组
        groupUsersByDepartment(data);
      }
        
        // 完成添加流程
        setShowAddModal(false);
        setAddUserStep(1);
        setAddedUserId(null);
        setNewUser({
          username: '',
          email: '',
          password: '',
          phone: '',
          company: '',
          company_id: '',
          department: '',
          department_id: '',
          is_admin: 0
        });
        
        Alert.alert('成功', '用户添加完成，并成功设置角色权限');
    } catch (error) {
      console.error('完成用户添加时出错:', error);
      Alert.alert(
        '角色设置失败', 
        '用户已创建，但角色设置失败，请稍后在用户列表中设置'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageGuard 
      routePath={PAGE_PERMISSIONS.USER_MANAGEMENT.route}
      requiredLevel={PAGE_PERMISSIONS.USER_MANAGEMENT.level}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Platform.OS === 'android' && <AndroidHeader />}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>加载中...</Text>
        </View>
      ) : (
        <SectionList
          sections={groupedUsers}
          renderItem={({ item }) => renderUserItem({ item })}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                暂无用户数据
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={true}
        />
      )}
      
      {/* 浮动添加按钮 */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddUserModal}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 添加用户模态框 - 修改为两步流程 */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {addUserStep === 1 ? '添加新用户 (步骤 1/2)' : '设置用户角色 (步骤 2/2)'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (addUserStep === 2) {
                  if (window.confirm('用户已创建但尚未设置角色，确定要关闭吗？')) {
                    setShowAddModal(false);
                  }
                } else {
                  setShowAddModal(false);
                }
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {addUserStep === 1 ? (
              /* 步骤 1: 基本信息 */
              <ScrollView style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>用户名 *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    placeholder="请输入用户名"
                    placeholderTextColor={colors.textSecondary}
                    value={newUser.username}
                    onChangeText={(text) => setNewUser({...newUser, username: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>邮箱 *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    placeholder="请输入邮箱"
                    placeholderTextColor={colors.textSecondary}
                    value={newUser.email}
                    onChangeText={(text) => setNewUser({...newUser, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>密码 *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    placeholder="请设置密码"
                    placeholderTextColor={colors.textSecondary}
                    value={newUser.password}
                    onChangeText={(text) => setNewUser({...newUser, password: text})}
                    secureTextEntry
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>手机号码 *</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    placeholder="请输入手机号码"
                    placeholderTextColor={colors.textSecondary}
                    value={newUser.phone}
                    onChangeText={(text) => setNewUser({...newUser, phone: text})}
                    keyboardType="phone-pad"
                  />
                </View>
                
                {/* 使用公司选择器组件 */}
                <CompanySelector />
                
                {/* 使用部门选择器组件 */}
                <DepartmentSelector />
              </ScrollView>
            ) : (
              /* 步骤 2: 角色设置 */
              <ScrollView style={[styles.formContainer, { paddingVertical: 10 }]}>
                <View style={{ marginBottom: 24, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={60} color={colors.primary} />
                  <Text style={{ 
                    color: colors.text, 
                    fontSize: 18, 
                    fontWeight: 'bold',
                    marginTop: 12,
                    textAlign: 'center'
                  }}>
                    用户创建成功
                  </Text>
                  <Text style={{ 
                    color: colors.textSecondary, 
                    marginTop: 8,
                    textAlign: 'center'
                  }}>
                    请为新用户设置角色权限
                  </Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>选择用户角色</Text>
                  <View style={styles.roleSelector}>
                    {[0, 1].map(roleId => { // 仅提供管理员和普通用户选项，后续可扩展
                      const roleName = getRoleName(roleId);
                      const roleColor = getRoleColor(roleId);
                      return (
                        <TouchableOpacity
                          key={roleId}
                          style={[
                            styles.roleChip,
                            { borderColor: roleColor },
                            newUser.is_admin === roleId && { backgroundColor: `${roleColor}20` }
                          ]}
                          onPress={() => setNewUser({...newUser, is_admin: roleId})}
                        >
                          <Text 
                            style={[
                              styles.roleChipText, 
                              { color: roleColor }
                            ]}
                          >
                            {roleName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                
                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                    已选角色: <Text style={{ fontWeight: 'bold', color: getRoleColor(newUser.is_admin) }}>{getRoleName(newUser.is_admin)}</Text>
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    角色决定了用户在系统中能够执行的操作权限。请谨慎选择。
                  </Text>
                </View>
              </ScrollView>
            )}
            
            {/* 底部按钮区域 */}
            <View style={styles.modalFooter}>
              {addUserStep === 2 && (
                <TouchableOpacity
                  style={[styles.backButton, { borderColor: colors.border }]}
                  onPress={handleBackStep}
                >
                  <Text style={{ color: colors.text }}>返回</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.submitButton, { 
                  backgroundColor: colors.primary,
                  flex: 1
                }]}
                onPress={addUserStep === 1 ? handleRegisterUser : handleCompleteAddUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {addUserStep === 1 ? '下一步' : '完成'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        {selectedUser && (
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>编辑用户</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>用户名</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    value={selectedUser.username}
                    onChangeText={(text) => setSelectedUser({...selectedUser, username: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>邮箱</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    value={selectedUser.email}
                    onChangeText={(text) => setSelectedUser({...selectedUser, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>手机号码</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    value={selectedUser.phone}
                    onChangeText={(text) => setSelectedUser({...selectedUser, phone: text})}
                    keyboardType="phone-pad"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>公司</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    value={selectedUser.company}
                    onChangeText={(text) => setSelectedUser({...selectedUser, company: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>部门</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd' 
                    }]}
                    value={selectedUser.department}
                    onChangeText={(text) => setSelectedUser({...selectedUser, department: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>用户角色</Text>
                  <View style={styles.roleSelector}>
                    {[0, 1].map(roleId => { // 仅提供管理员和普通用户选项，后续可扩展
                      const roleName = getRoleName(roleId);
                      const roleColor = getRoleColor(roleId);
                      const isSelected = selectedUser.is_admin === roleId || 
                                        (selectedUser.is_admin === true && roleId === 1) || 
                                        (selectedUser.is_admin === false && roleId === 0);
                      return (
                        <TouchableOpacity
                          key={roleId}
                          style={[
                            styles.roleChip,
                            { borderColor: roleColor },
                            isSelected && { backgroundColor: `${roleColor}20` }
                          ]}
                          onPress={() => setSelectedUser({...selectedUser, is_admin: roleId})}
                        >
                          <Text 
                            style={[
                              styles.roleChipText, 
                              { color: roleColor }
                            ]}
                          >
                            {roleName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
              
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdateUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>保存修改</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* 角色选择模态框 */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { 
            backgroundColor: colors.card,
            width: '80%',
            maxHeight: 500
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>选择用户角色</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ marginBottom: 20 }}>
              {[0, 1].map(roleId => { // 仅提供管理员和普通用户选项，后续可扩展
                const roleName = getRoleName(roleId);
                const roleColor = getRoleColor(roleId);
                const isSelected = userToChangeRole && 
                                  (userToChangeRole.is_admin === roleId || 
                                  (userToChangeRole.is_admin === true && roleId === 1) || 
                                  (userToChangeRole.is_admin === false && roleId === 0));
                return (
                  <TouchableOpacity
                    key={roleId}
                    style={[
                      styles.roleItem,
                      isSelected && { backgroundColor: `${roleColor}20` }
                    ]}
                    onPress={() => changeUserRole(roleId)}
                  >
                    <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
                      <Ionicons name="shield" size={18} color="#fff" />
                    </View>
                    <Text style={[styles.roleItemText, { color: colors.text }]}>
                      {roleName}
                    </Text>
                    {isSelected && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={22} 
                        color={roleColor} 
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
    </PageGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  androidHeader: {
    height: 56 + (Platform.OS === 'android' ? StatusBar.currentHeight : 0),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userDetail: {
    fontSize: 12,
    marginRight: 8,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 8,
  },
  actionButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    margin: 4,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  roleItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  roleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
    elevation: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    width: '100%',
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  pickerItemText: {
    fontSize: 16,
  },
  emptyPickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 20,
  },
  backButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  roleIconButton: {
    padding: 8,
    alignSelf: 'center',
    marginLeft: 'auto',
  },
});

export default UserManagementScreen;