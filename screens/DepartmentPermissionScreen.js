import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDepartmentPermissions } from '../hooks/useAppPermissions';
import { DepartmentAPI, PagePermissionAPI, PermissionService } from '../api/permissionService';

const DepartmentPermissionScreen = () => {
  const {
    departments,
    permissions: pagePermissions,
    modules,
    loading: hookLoading,
    updateDepartmentPermissions,
    createDepartment,
    deleteDepartment,
    loadData: refreshData
  } = useDepartmentPermissions();
  
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentPermissions, setDepartmentPermissions] = useState({});
  const [allDepartmentStats, setAllDepartmentStats] = useState({}); // 存储所有部门的权限统计
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentDesc, setNewDepartmentDesc] = useState('');
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // 手动强制刷新部门列表
  const handleRefreshDepartments = async () => {
    setRefreshing(true);
    try {
      // 清除部门相关缓存
      const permissionServiceInstance = await import('../api/permissionService');
      permissionServiceInstance.default.clearAllCache();
      
      // 重新加载数据
      await refreshData();
      
      // 重新加载所有部门统计
      await loadAllDepartmentStats();
      
      Alert.alert('刷新成功', '部门列表已更新');
    } catch (error) {
      console.error('刷新部门列表失败:', error);
      Alert.alert('刷新失败', error.message || '刷新部门列表时出现错误');
    } finally {
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentPermissions(selectedDepartment);
    }
  }, [selectedDepartment]);
  
  useEffect(() => {
    if (departments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments]);

  useEffect(() => {
    if (departments.length > 0) {
      loadAllDepartmentStats();
    }
  }, [departments]);

  // 加载所有部门的权限统计
  const loadAllDepartmentStats = async () => {
    const stats = {};
    
    for (const department of departments) {
      try {
        const response = await DepartmentAPI.getPermissions(department.id);
        let permissions = [];
        
        if (response && response.success && Array.isArray(response.data)) {
          permissions = response.data;
        } else if (Array.isArray(response)) {
          permissions = response;
        }
        
        const grantedCount = permissions.filter(perm => (perm.permission_level || 0) > 0).length;
        const totalCount = permissions.length;
        
        stats[department.id] = {
          granted: grantedCount,
          total: totalCount,
          coverage: totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0
        };
      } catch (error) {
        console.error(`加载部门 ${department.department_name} 权限统计失败:`, error);
        stats[department.id] = {
          granted: 0,
          total: 0,
          coverage: 0
        };
      }
    }
    
    setAllDepartmentStats(stats);
  };

  // 更新单个部门的权限统计
  const updateDepartmentStats = async (departmentId) => {
    try {
      const department = departments.find(d => d.id === departmentId);
      if (!department) return;
      
      const response = await DepartmentAPI.getPermissions(departmentId);
      let permissions = [];
      
      if (response && response.success && Array.isArray(response.data)) {
        permissions = response.data;
      } else if (Array.isArray(response)) {
        permissions = response;
      }
      
      const grantedCount = permissions.filter(perm => (perm.permission_level || 0) > 0).length;
      const totalCount = permissions.length;
      
      setAllDepartmentStats(prev => ({
        ...prev,
        [departmentId]: {
          granted: grantedCount,
          total: totalCount,
          coverage: totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0
        }
      }));
    } catch (error) {
      console.error(`更新部门 ${departmentId} 权限统计失败:`, error);
    }
  };

  // 加载部门权限数据
  const loadDepartmentPermissions = async (department) => {
    if (!department) {
      setDepartmentPermissions({});
      return;
    }
    
    try {
      const response = await DepartmentAPI.getPermissions(department.id);
      console.log('部门权限API响应:', response);
      
      let permissions = [];
      if (response && response.success && Array.isArray(response.data)) {
        permissions = response.data;
      } else if (Array.isArray(response)) {
        permissions = response;
      } else {
        console.warn('部门权限API返回格式异常:', response);
        setDepartmentPermissions({});
        return;
      }
      
      const permissionMap = {};
      permissions.forEach(perm => {
        const level = perm.permission_level || 0;
        // 使用permission_key作为映射键，这与API返回的数据结构一致
        const permissionKey = perm.permission_key || perm.permission_id;
        if (isValidPermissionLevel(level)) {
          permissionMap[permissionKey] = level;
        } else {
          console.warn(`无效的权限级别: ${level}, 权限Key: ${permissionKey}`);
          permissionMap[permissionKey] = 0;
        }
      });
      setDepartmentPermissions(permissionMap);
    } catch (error) {
      console.error('加载部门权限失败:', error);
      setDepartmentPermissions({});
      Alert.alert('错误', '加载部门权限失败: ' + error.message);
    }
  };
  


  const savePermissions = async () => {
    if (!selectedDepartment) {
      Alert.alert('提示', '请先选择部门');
      return;
    }

    try {
      setSaving(true);
      
      // 验证和转换权限数据格式
      const permissions = [];
      const invalidPermissions = [];
      
      Object.entries(departmentPermissions).forEach(([permissionId, level]) => {
        // 权限ID可以是字符串格式（如 'system.dashboard'）或数字格式
        if (!permissionId || permissionId.trim() === '') {
          invalidPermissions.push(`无效的权限ID: ${permissionId}`);
          return;
        }
        
        if (!isValidPermissionLevel(level)) {
          invalidPermissions.push(`无效的权限级别: ${level} (权限ID: ${permissionId})`);
          return;
        }
        
        permissions.push({
          permission_id: permissionId,
          permission_level: level
        });
      });
      
      // 如果有无效数据，显示警告
      if (invalidPermissions.length > 0) {
        console.warn('发现无效权限数据:', invalidPermissions);
        Alert.alert('警告', `发现无效权限数据，将跳过这些数据:\n${invalidPermissions.join('\n')}`);
      }

      const success = await updateDepartmentPermissions(selectedDepartment.id, permissions);
      
      if (success) {
        Alert.alert('成功', '权限配置已保存');
        // 重新加载权限数据以确保同步
        await loadDepartmentPermissions(selectedDepartment);
        // 更新该部门的统计数据
        await updateDepartmentStats(selectedDepartment.id);
      } else {
        Alert.alert('错误', '保存权限配置失败');
      }
    } catch (error) {
      console.error('保存权限配置失败:', error);
      Alert.alert('错误', '保存权限配置失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 切换权限级别
  const togglePermissionLevel = (permissionId) => {
    setDepartmentPermissions(prev => {
      const currentLevel = prev[permissionId] || 0;
      const newLevel = currentLevel >= 3 ? 0 : currentLevel + 1;
      
      // 验证权限级别
      if (!isValidPermissionLevel(newLevel)) {
        console.warn(`尝试设置无效的权限级别: ${newLevel}`);
        return prev;
      }
      
      return {
        ...prev,
        [permissionId]: newLevel
      };
    });
  };

  // 设置特定权限级别
  const setPermissionLevel = (permissionId, level) => {
    if (!isValidPermissionLevel(level)) {
      console.warn(`尝试设置无效的权限级别: ${level}`);
      return;
    }
    
    setDepartmentPermissions(prev => ({
      ...prev,
      [permissionId]: level
    }));
  };
  
  // 获取权限级别文本
  const getPermissionLevelText = (level) => {
    return PermissionService.getPermissionLevelText(level);
  };

  // 获取权限级别颜色
  const getPermissionLevelColor = (level) => {
    return PermissionService.getPermissionLevelColor(level);
  };

  // 验证权限级别
  const isValidPermissionLevel = (level) => {
    if (!PermissionService || typeof PermissionService.isValidPermissionLevel !== 'function') {
      console.warn('PermissionService 未正确初始化');
      return typeof level === 'number' && level >= 0 && level <= 3;
    }
    return PermissionService.isValidPermissionLevel(level);
  };

  // 处理模块全选/取消全选
  const handleSelectAllModule = (moduleKey, level = 2) => {
    // 验证权限级别
    if (!isValidPermissionLevel(level)) {
      console.warn(`尝试设置无效的权限级别: ${level}`);
      return;
    }
    
    if (!Array.isArray(pagePermissions)) {
      console.warn('pagePermissions 不是数组，无法执行模块全选操作');
      return;
    }
    
    const modulePermissions = pagePermissions.filter(p => p.module_key === moduleKey);
    const updates = {};
    
    modulePermissions.forEach(permission => {
      updates[permission.id] = level;
    });
    
    setDepartmentPermissions(prev => ({
      ...prev,
      ...updates
    }));
  };

  // 获取模块的权限统计
  const getModulePermissionStats = (moduleKey) => {
    if (!Array.isArray(pagePermissions)) {
      return { total: 0, granted: 0, percentage: 0 };
    }
    
    const modulePermissions = pagePermissions.filter(p => p.module_key === moduleKey);
    const totalCount = modulePermissions.length;
    const grantedCount = modulePermissions.filter(p => 
      (departmentPermissions[p.id] || 0) > 0
    ).length;
    
    return {
      total: totalCount,
      granted: grantedCount,
      percentage: totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0
    };
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) {
      Alert.alert('错误', '请输入部门名称');
      return;
    }
    
    try {
      const departmentData = {
        department_key: `custom_${Date.now()}`,
        department_name: newDepartmentName.trim(),
        description: newDepartmentDesc.trim() || newDepartmentName.trim(),
        color: '#757575',
      };
      
      const success = await createDepartment(departmentData);
      if (success) {
        setNewDepartmentName('');
        setNewDepartmentDesc('');
        setShowAddModal(false);
        Alert.alert('成功', '部门添加成功');
      }
    } catch (error) {
      console.error('添加部门失败:', error);
      Alert.alert('错误', '添加部门失败');
    }
  };

  const handleDeleteDepartment = (department) => {
    if (department.is_system) {
      Alert.alert('提示', '系统预设部门无法删除');
      return;
    }
    
    Alert.alert(
      '确认删除',
      `确定要删除部门 "${department.department_name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteDepartment(department.id);
              if (success) {
                if (selectedDepartment?.id === department.id) {
                  setSelectedDepartment(null);
                }
                Alert.alert('成功', '部门删除成功');
              }
            } catch (error) {
              console.error('删除部门失败:', error);
              Alert.alert('错误', '删除部门失败');
            }
          },
        },
      ]
    );
  };

  const renderDepartmentItem = ({ item }) => {
    const isSelected = selectedDepartment?.id === item.id;
    
    // 获取该部门的权限统计数据
    const departmentStat = allDepartmentStats[item.id];
    let permCount = 0;
    let grantedCount = 0;
    let coverage = 0;
    
    if (departmentStat) {
      // 使用预加载的统计数据
      permCount = departmentStat.total;
      grantedCount = departmentStat.granted;
      coverage = departmentStat.coverage;
    } else {
      // 如果统计数据还未加载，显示加载中状态
      const totalPages = Array.isArray(pagePermissions) ? pagePermissions.length : 0;
      permCount = totalPages;
      grantedCount = 0;
      coverage = 0;
    }
    
    return (
      <TouchableOpacity
        style={[styles.departmentItem, isSelected && styles.selectedDepartment]}
        onPress={() => setSelectedDepartment(item)}
      >
        <View style={styles.departmentHeader}>
          <View style={[styles.departmentColor, { backgroundColor: item.color || '#757575' }]} />
          <View style={styles.departmentInfo}>
            <Text style={styles.departmentName}>{item.department_name}</Text>
            <Text style={styles.departmentDesc}>{item.description}</Text>
          </View>
          {!item.is_system && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteDepartment(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#ff4444" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.departmentStats}>
          <Text style={styles.permissionCount}>{grantedCount}/{permCount} 权限</Text>
          <Text style={styles.coverage}>{coverage}% 覆盖</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPermissionModule = (module) => {
    if (!selectedDepartment) return null;
    
    // 确保 pagePermissions 是数组
    if (!Array.isArray(pagePermissions)) {
      console.warn('pagePermissions 不是数组:', pagePermissions);
      return null;
    }
    
    const modulePermissions = pagePermissions.filter(
      perm => perm.module_id === module.id
    );
    
    if (modulePermissions.length === 0) return null;
    
    const enabledCount = modulePermissions.filter(p => {
      const permissionKey = p.permission_key || p.permission_id;
      return departmentPermissions[permissionKey] > 0;
    }).length;
    const totalCount = modulePermissions.length;
    
    return (
      <View key={module.id} style={styles.moduleSection}>
        <View style={styles.moduleHeader}>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleName}>{module.module_name}</Text>
            <Text style={styles.moduleDesc}>{module.description}</Text>
          </View>
          <View style={styles.moduleActions}>
            <Text style={styles.moduleCount}>{enabledCount}/{totalCount}</Text>
          </View>
        </View>
        
        <View style={styles.permissionList}>
          {modulePermissions.map(permission => {
            const permissionKey = permission.permission_key || permission.permission_id;
            const currentLevel = departmentPermissions[permissionKey] || 0;
            return (
              <View key={permission.permission_id} style={styles.permissionItem}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>{permission.permission_name}</Text>
                  <Text style={styles.permissionDesc}>{permission.description}</Text>
                  {permission.route_path && (
                    <Text style={styles.permissionRoute}>路由: {permission.route_path}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.permissionLevelButton,
                    { backgroundColor: getPermissionLevelColor(currentLevel) }
                  ]}
                  onPress={() => togglePermissionLevel(permissionKey)}
                >
                  <Text style={styles.permissionLevelText}>
                    {getPermissionLevelText(currentLevel)}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (hookLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.title}>部门权限管理</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]} 
            onPress={handleRefreshDepartments}
            disabled={refreshing}
          >
            <Ionicons 
              name={refreshing ? "sync" : "refresh"} 
              size={20} 
              color="#ffffff" 
              style={refreshing ? styles.rotatingIcon : null}
            />
            <Text style={styles.refreshButtonText}>
              {refreshing ? '刷新中...' : '刷新'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>添加部门</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={savePermissions}>
            <Ionicons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 统计信息 */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            共 {stats.totalDepartments} 个部门，{stats.totalPages} 个页面权限
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* 左侧部门列表 */}
        <View style={styles.leftPanel}>
          <Text style={styles.panelTitle}>部门列表</Text>
          <FlatList
              data={Array.isArray(departments) ? departments : []}
              renderItem={renderDepartmentItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.departmentList}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefreshDepartments}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefreshDepartments}
                  colors={['#FF9800']}
                  tintColor="#FF9800"
                  title="下拉刷新部门列表"
                  titleColor="#666"
                />
              }
            />
        </View>

        {/* 右侧权限配置 */}
        <View style={styles.rightPanel}>
          {selectedDepartment ? (
            <>
              <Text style={styles.panelTitle}>
                {selectedDepartment?.department_name} - 页面权限配置
              </Text>
              <ScrollView style={styles.permissionContainer} showsVerticalScrollIndicator={false}>
                {Array.isArray(modules) ? modules.map(module => renderPermissionModule(module)) : null}
              </ScrollView>
            </>
          ) : (
            <View style={styles.noSelectionContainer}>
              <Ionicons name="arrow-back" size={48} color="#ccc" />
              <Text style={styles.noSelectionText}>请选择一个部门来配置权限</Text>
            </View>
          )}
        </View>
      </View>

      {/* 添加部门模态框 */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加新部门</Text>
            
            <TextInput
              style={styles.input}
              placeholder="部门名称"
              value={newDepartmentName}
              onChangeText={setNewDepartmentName}
              maxLength={20}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="部门描述（可选）"
              value={newDepartmentDesc}
              onChangeText={setNewDepartmentDesc}
              multiline={true}
              numberOfLines={3}
              maxLength={100}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewDepartmentName('');
                  setNewDepartmentDesc('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddDepartment}
              >
                <Text style={styles.confirmButtonText}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  },
  refreshButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 10
  },
  refreshButtonDisabled: {
    backgroundColor: '#FFB74D',
    opacity: 0.7
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  },
  rotatingIcon: {
    transform: [{ rotate: '360deg' }]
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  content: {
    flex: 1,
    flexDirection: 'row'
  },
  leftPanel: {
    width: '35%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0'
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  departmentList: {
    flex: 1
  },
  departmentItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedDepartment: {
    backgroundColor: '#e3f2fd'
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  departmentColor: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 12
  },
  departmentInfo: {
    flex: 1
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  departmentDesc: {
    fontSize: 12,
    color: '#666'
  },
  deleteButton: {
    padding: 5
  },
  departmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  permissionCount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500'
  },
  coverage: {
    fontSize: 12,
    color: '#666'
  },
  permissionContainer: {
    flex: 1,
    padding: 15
  },
  moduleSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden'
  },
  moduleHeader: {
    backgroundColor: '#ffffff',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  moduleInfo: {
    flex: 1
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  moduleDesc: {
    fontSize: 12,
    color: '#666'
  },
  moduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  moduleCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  selectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  selectAllButtonActive: {
    backgroundColor: '#2196F3'
  },
  selectAllText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500'
  },
  selectAllTextActive: {
    color: '#ffffff'
  },
  permissionList: {
    padding: 15
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  permissionInfo: {
    flex: 1,
    marginRight: 15
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  permissionDesc: {
    fontSize: 12,
    color: '#666'
  },
  permissionRoute: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },
  permissionLevelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  permissionLevelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noSelectionText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 15,
    backgroundColor: '#f9f9f9'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500'
  },
  confirmButton: {
    backgroundColor: '#4CAF50'
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default DepartmentPermissionScreen;