/**
 * 工单创建屏幕
 * 用于创建新的工单
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import WorkOrderService from '../services/WorkOrderService';

const WorkOrderCreateScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    dueDate: '',
    assigneeId: '',
    customFields: {}
  });
  
  // 选项数据
  const [categories, setCategories] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 优先级选项
  const priorityOptions = [
    { value: 'low', label: '低', color: colors.success, icon: 'arrow-down' },
    { value: 'medium', label: '中', color: colors.warning, icon: 'remove' },
    { value: 'high', label: '高', color: colors.error, icon: 'arrow-up' },
    { value: 'urgent', label: '紧急', color: colors.error, icon: 'warning' }
  ];
  
  // 加载选项数据
  const loadOptions = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesRes, usersRes] = await Promise.all([
        WorkOrderService.getWorkOrderCategories(),
        WorkOrderService.getAssignableUsers()
      ]);
      
      if (categoriesRes && categoriesRes.code === 200) {
        setCategories(categoriesRes.data || []);
      }
      
      if (usersRes && usersRes.code === 200) {
        setAssignableUsers(usersRes.data || []);
      }
    } catch (error) {
      console.error('加载选项数据失败:', error);
      Alert.alert('错误', '加载选项数据失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadOptions();
  }, [loadOptions]);
  
  // 更新表单数据
  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  // 验证表单
  const validateForm = useCallback(() => {
    if (!formData.title.trim()) {
      Alert.alert('验证失败', '请输入工单标题');
      return false;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('验证失败', '请输入工单描述');
      return false;
    }
    
    if (!formData.category) {
      Alert.alert('验证失败', '请选择工单分类');
      return false;
    }
    
    return true;
  }, [formData]);
  
  // 提交表单
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const submitData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        creatorId: user?.id,
        creatorName: user?.name || user?.username
      };
      
      const response = await WorkOrderService.createWorkOrder(submitData);
      
      if (response && response.code === 0) {
        Alert.alert(
          '成功',
          '工单创建成功',
          [
            {
              text: '确定',
              onPress: () => {
                navigation.goBack();
                // 可以导航到工单详情页面
                // navigation.navigate('WorkOrderDetail', { workOrderId: response.data.id });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('创建工单失败:', error);
      Alert.alert('错误', '创建工单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [formData, user, validateForm, navigation]);
  
  // 渲染优先级选择器
  const renderPrioritySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.label, { color: colors.text }]}>优先级 *</Text>
      <View style={styles.priorityOptions}>
        {priorityOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.priorityOption,
              { borderColor: colors.border },
              formData.priority === option.value && { backgroundColor: option.color, borderColor: option.color }
            ]}
            onPress={() => updateFormData('priority', option.value)}
          >
            <Ionicons 
              name={option.icon} 
              size={16} 
              color={formData.priority === option.value ? colors.surface : option.color} 
            />
            <Text style={[
              styles.priorityOptionText,
              { color: formData.priority === option.value ? colors.surface : colors.text }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  // 渲染分类选择器
  const renderCategorySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.label, { color: colors.text }]}>分类 *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id || category.value}
            style={[
              styles.categoryOption,
              { borderColor: colors.border },
              formData.category === (category.id || category.value) && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => updateFormData('category', category.id || category.value)}
          >
            <Text style={[
              styles.categoryOptionText,
              { color: formData.category === (category.id || category.value) ? colors.surface : colors.text }
            ]}>
              {category.name || category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  // 渲染处理人选择器
  const renderAssigneeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.label, { color: colors.text }]}>处理人</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assigneeScroll}>
        <TouchableOpacity
          style={[
            styles.assigneeOption,
            { borderColor: colors.border },
            !formData.assigneeId && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}
          onPress={() => updateFormData('assigneeId', '')}
        >
          <Text style={[
            styles.assigneeOptionText,
            { color: !formData.assigneeId ? colors.surface : colors.text }
          ]}>
            未分配
          </Text>
        </TouchableOpacity>
        {assignableUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={[
              styles.assigneeOption,
              { borderColor: colors.border },
              formData.assigneeId === user?.id && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => updateFormData('assigneeId', user.id)}
          >
            <Text style={[
              styles.assigneeOptionText,
              { color: formData.assigneeId === user?.id ? colors.surface : colors.text }
            ]}>
              {user.name || user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 10 }}>加载中...</Text>
            </View>
          )}

          {!loading && (
            <>
              {/* 工单标题 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>标题 *</Text>
                <TextInput
                  style={[commonStyles.input, styles.textInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="请输入工单标题"
                  placeholderTextColor={colors.placeholder}
                  value={formData.title}
                  onChangeText={(text) => updateFormData('title', text)}
                />
              </View>

              {/* 工单描述 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>描述 *</Text>
                <TextInput
                  style={[commonStyles.input, styles.textInput, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                  placeholder="请输入工单详细描述"
                  placeholderTextColor={colors.placeholder}
                  value={formData.description}
                  onChangeText={(text) => updateFormData('description', text)}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* 优先级选择 */}
              {renderPrioritySelector()}

              {/* 分类选择 */}
              {renderCategorySelector()}

              {/* 截止日期 */}
              {/* {renderDueDateSelector()} */}

              {/* 指派给 */}
              {renderAssigneeSelector()}

              {/* 提交按钮 */}
              <TouchableOpacity 
                style={[commonStyles.button, styles.submitButton, { backgroundColor: colors.primary } ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={[commonStyles.buttonText, { color: colors.surface }]}>提交工单</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: DesignTokens.typography.weights.semibold,
  },
  submitButton: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: DesignTokens.spacing.lg,
  },
  inputContainer: {
    marginBottom: DesignTokens.spacing.xl,
  },
  label: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.weights.medium,
    marginBottom: DesignTokens.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.md,
    fontSize: DesignTokens.typography.sizes.md,
    minHeight: 120,
  },
  selectorContainer: {
    marginBottom: DesignTokens.spacing.xl,
  },
  priorityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DesignTokens.spacing.sm,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    gap: DesignTokens.spacing.xs,
  },
  priorityOptionText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryOption: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    marginRight: DesignTokens.spacing.sm,
  },
  categoryOptionText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  assigneeScroll: {
    flexGrow: 0,
  },
  assigneeOption: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    marginRight: DesignTokens.spacing.sm,
  },
  assigneeOptionText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },
});

export default WorkOrderCreateScreen;