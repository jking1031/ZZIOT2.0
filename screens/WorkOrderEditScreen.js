/**
 * 工单编辑屏幕
 * 支持编辑工单的基本信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import WorkOrderService from '../services/WorkOrderService';
import { usePermissionControl } from '../hooks/usePermissionControl';
import * as DocumentPicker from 'expo-document-picker';

const WorkOrderEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissionControl();
  const commonStyles = createCommonStyles(colors);
  
  const { id } = route.params || {};
  const isEdit = !!id;
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'medium',
    dueDate: '',
    assigneeId: ''
  });
  
  // 选项数据
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);
  const [attachments, setAttachments] = useState([]);
  
  // 优先级选项
  const priorityOptions = [
    { value: 'low', label: '低', color: colors.success },
    { value: 'medium', label: '中', color: colors.warning },
    { value: 'high', label: '高', color: colors.error },
    { value: 'urgent', label: '紧急', color: colors.error }
  ];

  // 加载工单详情（编辑模式）
  const loadWorkOrderDetail = useCallback(async () => {
    if (!isEdit) return;
    
    try {
      setLoading(true);
      const response = await WorkOrderService.getWorkOrderDetail(id);
      if (response.code === 0) {
        const data = response.data;
        setFormData({
          title: data.title || '',
          description: data.description || '',
          categoryId: data.categoryId || '',
          priority: data.priority || 'medium',
          dueDate: data.dueDate || '',
          assigneeId: data.assigneeId || ''
        });
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('加载工单详情失败:', error);
      Alert.alert('错误', '加载工单详情失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  // 加载选项数据
  const loadOptions = useCallback(async () => {
    try {
      const [categoriesRes, usersRes] = await Promise.all([
        WorkOrderService.getWorkOrderCategories(),
        WorkOrderService.getAssignableUsers()
      ]);
      
      if (categoriesRes.code === 200) setCategories(categoriesRes.data || []);
      if (usersRes.code === 200) setAssignableUsers(usersRes.data || []);
    } catch (error) {
      console.error('加载选项数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadWorkOrderDetail();
    }
  }, [loadOptions, loadWorkOrderDetail, isEdit]);

  // 更新表单数据
  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // 验证表单
  const validateForm = useCallback(() => {
    if (!formData.title.trim()) {
      Alert.alert('提示', '请输入工单标题');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('提示', '请输入工单描述');
      return false;
    }
    if (!formData.categoryId) {
      Alert.alert('提示', '请选择工单类别');
      return false;
    }
    return true;
  }, [formData]);

  // 保存工单
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      const submitData = {
        ...formData,
        attachments: attachments.filter(att => att.file)
      };
      
      let response;
      if (isEdit) {
        response = await WorkOrderService.updateWorkOrder(id, submitData);
      } else {
        response = await WorkOrderService.createWorkOrder(submitData);
      }
      
      if (response.code === 0) {
        Alert.alert(
          '成功',
          isEdit ? '工单更新成功' : '工单创建成功',
          [{ text: '确定', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('保存工单失败:', error);
      Alert.alert('错误', '保存工单失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [formData, attachments, isEdit, id, validateForm, navigation]);

  // 选择附件
  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true
      });
      
      if (!result.canceled && result.assets) {
        const newAttachments = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType,
          size: asset.size,
          file: asset
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      Alert.alert('错误', '选择文件失败，请重试');
    }
  }, []);

  // 删除附件
  const handleRemoveAttachment = useCallback((index) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个附件吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            setAttachments(prev => prev.filter((_, i) => i !== index));
          }
        }
      ]
    );
  }, []);

  // 获取选中项的显示文本
  const getSelectedCategoryName = useCallback(() => {
    const category = categories.find(cat => cat.id === formData.categoryId);
    return category ? category.name : '请选择类别';
  }, [categories, formData.categoryId]);

  const getSelectedPriorityName = useCallback(() => {
    const priority = priorityOptions.find(p => p.value === formData.priority);
    return priority ? priority.label : '中';
  }, [formData.priority]);

  const getSelectedAssigneeName = useCallback(() => {
    const assignee = assignableUsers.find(user => user.id === formData.assigneeId);
    return assignee ? assignee.name : '请选择处理人';
  }, [assignableUsers, formData.assigneeId]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* 基本信息 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>基本信息</Text>
          
          {/* 标题 */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>标题 *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text.primary }]}
              placeholder="请输入工单标题"
              placeholderTextColor={colors.text.secondary}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              maxLength={100}
            />
          </View>
          
          {/* 描述 */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>描述 *</Text>
            <TextInput
              style={[styles.textAreaInput, { backgroundColor: colors.background, color: colors.text.primary }]}
              placeholder="请输入工单描述"
              placeholderTextColor={colors.text.secondary}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
          
          {/* 类别 */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>类别 *</Text>
            <TouchableOpacity
              style={[styles.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={[styles.selectText, { color: formData.categoryId ? colors.text.primary : colors.text.secondary }]}>
                {getSelectedCategoryName()}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          {/* 优先级 */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>优先级</Text>
            <TouchableOpacity
              style={[styles.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setPriorityModalVisible(true)}
            >
              <Text style={[styles.selectText, { color: colors.text.primary }]}>
                {getSelectedPriorityName()}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          {/* 截止时间 */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>截止时间</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text.primary }]}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={colors.text.secondary}
              value={formData.dueDate}
              onChangeText={(text) => updateFormData('dueDate', text)}
            />
          </View>
          
          {/* 处理人（仅管理员可设置） */}
          {(isAdmin() || isSuperAdmin()) && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>处理人</Text>
              <TouchableOpacity
                style={[styles.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setAssigneeModalVisible(true)}
              >
                <Text style={[styles.selectText, { color: formData.assigneeId ? colors.text.primary : colors.text.secondary }]}>
                  {getSelectedAssigneeName()}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* 附件 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>附件</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handlePickDocument}
            >
              <Ionicons name="add" size={16} color={colors.surface} />
              <Text style={[styles.addButtonText, { color: colors.surface }]}>添加附件</Text>
            </TouchableOpacity>
          </View>
          
          {attachments.length === 0 ? (
            <Text style={[styles.noAttachmentsText, { color: colors.text.secondary }]}>暂无附件</Text>
          ) : (
            attachments.map((attachment, index) => (
              <View key={index} style={[styles.attachmentItem, { borderColor: colors.border }]}>
                <Ionicons name="document-outline" size={20} color={colors.primary} />
                <Text style={[styles.attachmentName, { color: colors.text.primary }]} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveAttachment(index)}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* 操作按钮 */}
      <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>取消</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.surface }]}>
              {isEdit ? '更新' : '创建'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* 类别选择模态框 */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>选择类别</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.optionItem,
                  { backgroundColor: formData.categoryId === category.id ? colors.primary : colors.surface }
                ]}
                onPress={() => {
                  updateFormData('categoryId', category.id);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: formData.categoryId === category.id ? colors.surface : colors.text.primary }
                ]}>
                  {category.name}
                </Text>
                {formData.categoryId === category.id && (
                  <Ionicons name="checkmark" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
      
      {/* 优先级选择模态框 */}
      <Modal
        visible={priorityModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setPriorityModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>选择优先级</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {priorityOptions.map(priority => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.optionItem,
                  { backgroundColor: formData.priority === priority.value ? colors.primary : colors.surface }
                ]}
                onPress={() => {
                  updateFormData('priority', priority.value);
                  setPriorityModalVisible(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: formData.priority === priority.value ? colors.surface : colors.text.primary }
                ]}>
                  {priority.label}
                </Text>
                {formData.priority === priority.value && (
                  <Ionicons name="checkmark" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
      
      {/* 处理人选择模态框 */}
      <Modal
        visible={assigneeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAssigneeModalVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>选择处理人</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.optionItem,
                { backgroundColor: !formData.assigneeId ? colors.primary : colors.surface }
              ]}
              onPress={() => {
                updateFormData('assigneeId', '');
                setAssigneeModalVisible(false);
              }}
            >
              <Text style={[
                styles.optionText,
                { color: !formData.assigneeId ? colors.surface : colors.text.primary }
              ]}>
                未分配
              </Text>
              {!formData.assigneeId && (
                <Ionicons name="checkmark" size={20} color={colors.surface} />
              )}
            </TouchableOpacity>
            
            {assignableUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.optionItem,
                  { backgroundColor: formData.assigneeId === user?.id ? colors.primary : colors.surface }
                ]}
                onPress={() => {
                  updateFormData('assigneeId', user.id);
                  setAssigneeModalVisible(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: formData.assigneeId === user?.id ? colors.surface : colors.text.primary }
                ]}>
                  {user.name}
                </Text>
                {formData.assigneeId === user?.id && (
                  <Ionicons name="checkmark" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.md,
  },
  section: {
    margin: DesignTokens.spacing.md,
    padding: DesignTokens.spacing.lg,
    borderRadius: DesignTokens.borderRadius.lg,
    ...DesignTokens.shadows.md,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.weights.semibold,
    marginBottom: DesignTokens.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DesignTokens.spacing.md,
  },
  fieldContainer: {
    marginBottom: DesignTokens.spacing.lg,
  },
  fieldLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
    marginBottom: DesignTokens.spacing.sm,
  },
  textInput: {
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    fontSize: DesignTokens.typography.sizes.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textAreaInput: {
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    fontSize: DesignTokens.typography.sizes.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 100,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
  },
  selectText: {
    fontSize: DesignTokens.typography.sizes.md,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.sm,
    gap: DesignTokens.spacing.xs,
  },
  addButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: DesignTokens.spacing.sm,
    gap: DesignTokens.spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
  },
  removeButton: {
    padding: DesignTokens.spacing.xs,
  },
  noAttachmentsText: {
    fontSize: DesignTokens.typography.sizes.md,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: DesignTokens.spacing.xl,
  },
  actionBar: {
    flexDirection: 'row',
    padding: DesignTokens.spacing.md,
    borderTopWidth: 1,
    gap: DesignTokens.spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
  },
  saveButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  modalCancelText: {
    fontSize: DesignTokens.typography.sizes.md,
  },
  modalContent: {
    flex: 1,
    padding: DesignTokens.spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: DesignTokens.spacing.sm,
  },
  optionText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
  },
});

export default WorkOrderEditScreen;