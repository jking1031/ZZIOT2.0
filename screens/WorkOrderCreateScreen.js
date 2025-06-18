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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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
    deadline: null,
    attachment: [],
    creatorId: user?.id,
    creatorName: user?.name || user?.username
  });
  
  // 选项数据
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // 优先级选项
  const priorityOptions = [
    { value: 'low', label: '低', color: colors.success, icon: 'arrow-down' },
    { value: 'medium', label: '中', color: colors.warning, icon: 'remove' },
    { value: 'high', label: '高', color: colors.error, icon: 'arrow-up' },
    { value: 'urgent', label: '紧急', color: colors.error, icon: 'warning' }
  ];
  
  // 初始化页面
  const initializePage = useCallback(async () => {
    // 页面初始化逻辑（如果需要的话）
    setLoading(false);
  }, []);
  
  useEffect(() => {
    initializePage();
  }, [initializePage]);
  
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
    
    // 移除分类验证
    
    if (formData.deadline && new Date(formData.deadline) <= new Date()) {
      Alert.alert('验证失败', '截止时间必须大于当前时间');
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
      
      console.log('=== 提交工单调试信息 ===');
      console.log('原始表单数据:', formData);
      
      let attachmentUrls = [];
      
      // 如果有附件，先上传附件
      if (formData.attachment && formData.attachment.length > 0) {
        console.log('开始上传附件，共', formData.attachment.length, '个文件');
        
        try {
          // 过滤出需要上传的文件（排除已经是URL的文件）
          const filesToUpload = formData.attachment.filter(file => 
            typeof file === 'object' && file.uri && !file.uri.startsWith('http')
          );
          
          // 已经是URL的文件直接添加到结果中
          const existingUrls = formData.attachment
            .filter(file => typeof file === 'string' || (file.uri && file.uri.startsWith('http')))
            .map(file => typeof file === 'string' ? file : file.uri);
          
          if (filesToUpload.length > 0) {
            console.log('需要上传的文件:', filesToUpload.map(f => f.name));
            
            // 逐个上传文件，如果任何一个失败则停止创建工单
            const uploadedUrls = [];
            for (const file of filesToUpload) {
              try {
                console.log('正在上传文件:', file.name);
                const fileUrl = await WorkOrderService.uploadFile(file);
                uploadedUrls.push(fileUrl);
                console.log('文件上传成功:', file.name, '->', fileUrl);
              } catch (uploadError) {
                console.error('文件上传失败:', file.name, uploadError);
                Alert.alert('上传失败', `文件 "${file.name}" 上传失败，无法创建工单。请检查文件格式和网络连接后重试。`);
                setSubmitting(false);
                return; // 直接返回，不创建工单
              }
            }
            
            attachmentUrls = [...existingUrls, ...uploadedUrls];
          } else {
            attachmentUrls = existingUrls;
          }
          
          console.log('所有附件上传成功，最终附件URLs:', attachmentUrls);
        } catch (error) {
          console.error('附件上传过程中出错:', error);
          Alert.alert('上传失败', '附件上传失败，无法创建工单。请检查网络连接后重试。');
          setSubmitting(false);
          return; // 直接返回，不创建工单
        }
      }
      
      // 根据API文档调整字段名称
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        assignToId: null, // 根据API文档，这个字段是可选的
        deadline: formData.deadline ? 
          new Date(formData.deadline).toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).replace('T', ' ') : "", // 格式化为 yyyy-MM-dd HH:mm:ss
        attachments: attachmentUrls // 使用上传后的URL数组
      };
      
      console.log('提交数据:', submitData);
      console.log('=== 调试信息结束 ===');
      
      const response = await WorkOrderService.createWorkOrder(submitData);
      
      console.log('API响应:', response);
      
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
                // navigation.navigate('WorkOrderDetail', { workOrderId: response.data });
              }
            }
          ]
        );
      } else {
        Alert.alert('错误', response?.msg || '创建工单失败，请重试');
      }
    } catch (error) {
      console.error('创建工单失败:', error);
      let errorMessage = '创建工单失败，请重试';
      if (error.response) {
        console.error('错误响应:', error.response.data);
        errorMessage = error.response.data?.msg || errorMessage;
      }
      Alert.alert('错误', errorMessage);
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
  

  


  // 渲染截止时间选择器
  const renderDeadlineSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text }]}>截止时间</Text>
      <TouchableOpacity
        style={[styles.textInput, { borderColor: colors.border, justifyContent: 'center' }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={[{ color: formData.deadline ? colors.text : colors.placeholder }]}>
          {formData.deadline ? new Date(formData.deadline).toLocaleDateString('zh-CN') : '请选择截止时间'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={formData.deadline ? new Date(formData.deadline) : new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              updateFormData('deadline', selectedDate.toISOString());
            }
          }}
        />
      )}
    </View>
  );

  // 获取文件图标
  const getFileIcon = (file) => {
    if (file.type) {
      if (file.type.startsWith('image/')) {
        return 'image';
      } else if (file.type === 'application/pdf') {
        return 'document-text';
      } else if (file.type.includes('word') || file.type.includes('document')) {
        return 'document';
      } else if (file.type.includes('zip') || file.type.includes('rar')) {
        return 'archive';
      }
    }
    return 'document';
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 渲染附件上传
  const renderAttachmentUpload = () => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.text }]}>附件 ({formData.attachment.length}/5)</Text>
      <TouchableOpacity
        style={[styles.attachmentButton, { borderColor: colors.border }]}
        onPress={showAttachmentOptions}
        disabled={uploading || formData.attachment.length >= 5}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.attachmentButtonText, { color: colors.primary }]}>上传中...</Text>
          </>
        ) : (
          <>
            <Ionicons name="attach" size={20} color={formData.attachment.length >= 5 ? colors.textSecondary : colors.primary} />
            <Text style={[styles.attachmentButtonText, { color: formData.attachment.length >= 5 ? colors.textSecondary : colors.primary }]}>
              {formData.attachment.length >= 5 ? '已达上限' : '添加附件'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      {formData.attachment.length > 0 && (
        <View style={styles.attachmentList}>
          {formData.attachment.map((file, index) => (
            <View key={index} style={[styles.attachmentItem, { backgroundColor: colors.surface }]}>
              <Ionicons name={getFileIcon(file)} size={16} color={colors.primary} />
              <View style={styles.attachmentInfo}>
                <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                  {file.name}
                </Text>
                {file.size > 0 && (
                  <Text style={[styles.attachmentSize, { color: colors.textSecondary }]}>
                    {formatFileSize(file.size)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => removeAttachment(index)}
                style={styles.removeAttachment}
              >
                <Ionicons name="close-circle" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // 显示附件选择选项
  const showAttachmentOptions = () => {
    Alert.alert(
      '选择附件',
      '请选择附件来源',
      [
        {
          text: '拍照',
          onPress: () => handleCameraCapture()
        },
        {
          text: '从相册选择',
          onPress: () => handleImagePicker()
        },
        {
          text: '选择文件',
          onPress: () => handleDocumentPicker()
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };

  // 验证文件
  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip', 'application/x-rar-compressed'
    ];
    
    // 根据文件扩展名修正MIME类型
    let fileType = file.type;
    if (file.name) {
      const extension = file.name.split('.').pop().toLowerCase();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed'
      };
      if (mimeTypes[extension]) {
        fileType = mimeTypes[extension];
      }
    }
    
    if (file.size && file.size > maxSize) {
      Alert.alert('文件过大', `文件 "${file.name}" 大小超过5MB限制`);
      return false;
    }
    
    if (fileType && !allowedTypes.includes(fileType)) {
      Alert.alert('文件类型不支持', `文件 "${file.name}" 类型不支持`);
      return false;
    }
    
    // 检查附件数量限制
    if (formData.attachment.length >= 5) {
      Alert.alert('附件数量限制', '每个工单最多只能添加5个附件');
      return false;
    }
    
    return true;
  };

  // 拍照
  const handleCameraCapture = async () => {
    try {
      setUploading(true);
      
      // 请求相机权限
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newAttachment = {
          name: `photo_${Date.now()}.jpg`,
          uri: asset.uri,
          type: 'image/jpeg',
          size: asset.fileSize || 0
        };
        
        if (validateFile(newAttachment)) {
          updateFormData('attachment', [...formData.attachment, newAttachment]);
        }
      }
    } catch (error) {
      console.error('拍照失败:', error);
      Alert.alert('错误', '拍照失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 从相册选择
  const handleImagePicker = async () => {
    try {
      setUploading(true);
      
      // 请求媒体库权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要访问相册权限才能选择图片');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      
      if (!result.canceled && result.assets) {
        const validAttachments = [];
        
        for (const asset of result.assets) {
          // 检查是否还能添加更多附件
          if (formData.attachment.length + validAttachments.length >= 5) {
            Alert.alert('附件数量限制', '每个工单最多只能添加5个附件，部分文件未添加');
            break;
          }
          
          const newAttachment = {
            name: asset.fileName || `image_${Date.now()}_${validAttachments.length}.jpg`,
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize || 0
          };
          
          if (validateFile(newAttachment)) {
            validAttachments.push(newAttachment);
          }
        }
        
        if (validAttachments.length > 0) {
          updateFormData('attachment', [...formData.attachment, ...validAttachments]);
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 选择文档
  const handleDocumentPicker = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true
      });
      
      if (!result.canceled && result.assets) {
        const validAttachments = [];
        
        for (const asset of result.assets) {
          // 检查是否还能添加更多附件
          if (formData.attachment.length + validAttachments.length >= 5) {
            Alert.alert('附件数量限制', '每个工单最多只能添加5个附件，部分文件未添加');
            break;
          }
          
          const newAttachment = {
            name: asset.name,
            uri: asset.uri,
            type: asset.mimeType,
            size: asset.size
          };
          
          if (validateFile(newAttachment)) {
            validAttachments.push(newAttachment);
          }
        }
        
        if (validAttachments.length > 0) {
          updateFormData('attachment', [...formData.attachment, ...validAttachments]);
        }
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      Alert.alert('错误', '选择文件失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 移除附件
  const removeAttachment = (index) => {
    const newAttachments = formData.attachment.filter((_, i) => i !== index);
    updateFormData('attachment', newAttachments);
  };
  
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

              {/* 截止时间 */}
              {renderDeadlineSelector()}

              {/* 附件上传 */}
              {renderAttachmentUpload()}

              {/* 提交按钮 */}
              <TouchableOpacity 
                style={[commonStyles.button, { backgroundColor: submitting ? colors.disabled : colors.primary, marginTop: DesignTokens.spacing.xl }]}
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

  content: {
    flex: 1,
  },
  form: {
    padding: DesignTokens.spacing.lg,
  },
  inputContainer: {
    marginBottom: DesignTokens.spacing.xl,
  },
  inputGroup: {
    marginBottom: DesignTokens.spacing.xl,
  },
  contentContainer: {
    padding: DesignTokens.spacing.lg,
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

  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.md,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: DesignTokens.spacing.xs,
  },
  attachmentButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  attachmentList: {
    marginTop: DesignTokens.spacing.sm,
    gap: DesignTokens.spacing.xs,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.sm,
    gap: DesignTokens.spacing.xs,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: DesignTokens.spacing.xs,
  },
  attachmentName: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.weights.medium,
  },
  attachmentSize: {
    fontSize: DesignTokens.typography.sizes.xs,
    marginTop: 2,
  },
  removeAttachment: {
    padding: DesignTokens.spacing.xs,
  },
});

export default WorkOrderCreateScreen;