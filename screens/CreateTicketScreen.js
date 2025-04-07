import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, 
  Platform, StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Modal, FlatList, SafeAreaView, Image, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles } from '../styles/StyleGuide';
import { createTicket } from '../api/ticketService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { uploadFileToWebDAV } from './FileUploadScreen';
import { EventRegister } from '../utils/EventEmitter';
import { getAuthToken, refreshToken } from '../api/storage';

// 工单类别
const TICKET_CATEGORIES = [
  { id: 'facility', name: '设备设施' },
  { id: 'water_quality', name: '水质问题' },
  { id: 'operation', name: '系统操作' },
  { id: 'safety', name: '安全隐患' },
  { id: 'other', name: '其他问题' },
];

// 优先级级别
const PRIORITY_LEVELS = [
  { id: 'low', name: '低', color: '#8BC34A' },
  { id: 'medium', name: '中', color: '#FFA000' },
  { id: 'high', name: '高', color: '#F44336' },
  { id: 'urgent', name: '紧急', color: '#D50000' },
];

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const CreateTicketScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  
  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('facility');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // 部门管理员特有选项 - 是否跳过管理员审核
  const [skipAdminApproval, setSkipAdminApproval] = useState(false);
  
  // 日期选择器状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 选择器模态框状态
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  
  // 图片状态
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  
  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  
  // 表单验证
  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = '请输入工单标题';
    } else if (title.length < 5) {
      newErrors.title = '标题至少需要5个字符';
    }
    
    if (!description.trim()) {
      newErrors.description = '请输入问题描述';
    } else if (description.length < 10) {
      newErrors.description = '描述至少需要10个字符';
    }
    
    if (!category) {
      newErrors.category = '请选择问题类型';
    }
    
    if (!priority) {
      newErrors.priority = '请选择优先级';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // 如果已经在提交中，直接返回
    if (isSubmitting) return;
    
    // 设置提交状态并禁用按钮
    setIsSubmitting(true);
    setSubmitDisabled(true);
    
    try {
      // 生成唯一的report_id，使用与报告系统相同的格式
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const timestamp = Date.now();
      const reportId = `TICKET_REPORT_${date}_${timestamp}`;
      
      // 确定工单初始状态
      let initialStatus = 'pending';
      let statusComment = '';
      
      // 管理员创建的工单自动审核通过
      if (user.is_admin === 1) {
        initialStatus = 'approved';
        statusComment = '管理员创建的工单自动审核通过';
      } 
      // 部门管理员选择跳过审核
      else if (user.is_admin === 2 && skipAdminApproval) {
        initialStatus = 'approved';
        statusComment = '部门管理员选择跳过审核，直接进入处理流程';
      }
      
      const ticketData = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        creator: user.id,
        status: initialStatus,
        report_id: reportId, // 添加report_id字段
        statusComment: statusComment // 添加状态说明
      };
      
      // 显示加载指示器
      setLoading(true);
      
      console.log('开始创建工单，用户ID:', user.id, 'report_id:', reportId);
      
      // 如果有图片，先上传图片，然后再创建工单
      let imagesurl = '';
      if (images.length > 0) {
        try {
          console.log(`准备上传 ${images.length} 张图片，使用report_id:`, reportId);
          const imageUrls = await uploadTicketImages(reportId);
          console.log('图片上传完成，URLs:', imageUrls);
          
          // 将图片URL数组转换为逗号分隔的字符串
          imagesurl = imageUrls.join(',');
          console.log('设置imagesurl字段:', imagesurl);
          
          // 将imagesurl添加到ticketData
          ticketData.imagesurl = imagesurl;
        } catch (error) {
          console.error('上传图片失败:', error);
          // 继续尝试创建工单，即使图片上传失败
          Alert.alert('警告', '图片上传失败，但将继续创建工单');
        }
      }
      
      // 创建工单
      const ticketResponse = await createTicket(ticketData);
      const ticketId = ticketResponse.id;
      
      console.log('工单创建成功，ID:', ticketId, '包含图片URLs:', imagesurl ? '是' : '否');
      
      // 清除表单和图片
      setTitle('');
      setDescription('');
      setCategory('facility');
      setPriority('medium');
      setDueDate(null);
      setImages([]);
      
      // 显示成功消息
      Alert.alert(
        '工单已创建',
        '您的工单已成功提交，我们将尽快处理',
        [
          {
            text: '确定',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('提交工单失败:', error);
      if (error.response) {
        console.error('错误状态:', error.response.status);
        console.error('错误详情:', error.response.data);
      }
      
      Alert.alert(
        '提交失败',
        '无法创建工单，请检查网络连接并重试',
        [{ text: '确定' }]
      );
    } finally {
      setIsSubmitting(false);
      setSubmitDisabled(false);
      setLoading(false);
    }
  };
  
  // 上传工单图片
  const uploadTicketImages = async (reportId) => {
    try {
      console.log('开始上传工单图片，使用report_id:', reportId, 'userId:', user?.id || '未设置');
      
      const uploadPromises = images.map(async (uri, index) => {
        // 获取文件信息
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        // 检测文件类型（根据文件扩展名）
        let mimeType = 'image/jpeg'; // 默认假设为JPEG
        if (uri.toLowerCase().endsWith('.png')) {
          mimeType = 'image/png';
        } else if (uri.toLowerCase().endsWith('.gif')) {
          mimeType = 'image/gif';
        }
        
        // 创建完整的文件对象
        const file = {
          uri,
          name: `TICKET_IMAGE_${index + 1}_${Date.now()}.jpg`, // 使用更好的命名约定
          type: mimeType,
          size: fileInfo.size || 0
        };
        
        // 确保用户ID不为undefined，如果是则使用空字符串
        const userId = user?.id || '';
        const username = user?.username || '';
        
        console.log(`上传图片 ${index + 1}/${images.length}，report_id: ${reportId}, userId: ${userId}`);
        
        // 使用report_id上传到服务器
        return await uploadFileToWebDAV(file, 'tickets', reportId, userId, username);
      });
  
      const imageUrls = await Promise.all(uploadPromises);
      console.log('工单图片上传完成，共上传图片数量:', imageUrls.length);
      return imageUrls;
    } catch (error) {
      console.error('上传图片失败:', error);
      // 记录更详细的错误信息
      if (error.response) {
        console.error('错误响应数据:', error.response.data);
        console.error('错误响应状态:', error.response.status);
      }
      throw error;
    }
  };
  
  // 日期选择器处理函数
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      // 设置时间为23:59:59
      const date = new Date(selectedDate);
      date.setHours(23, 59, 59);
      setDueDate(date);
    }
  };
  
  // 格式化日期显示
  const formatDate = (date) => {
    if (!date) return '';
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // 选择类别
  const handleCategorySelect = (categoryId) => {
    setCategory(categoryId);
    setErrors({ ...errors, category: null });
  };
  
  // 选择优先级
  const handlePrioritySelect = (priorityId) => {
    setPriority(priorityId);
    setErrors({ ...errors, priority: null });
  };
  
  // 获取类别名称
  const getCategoryName = (categoryId) => {
    const found = TICKET_CATEGORIES.find(cat => cat.id === categoryId);
    return found ? found.name : '请选择问题类型';
  };
  
  // 获取优先级名称
  const getPriorityName = (priorityId) => {
    const found = PRIORITY_LEVELS.find(p => p.id === priorityId);
    return found ? found.name : '请选择优先级';
  };
  
  // 获取优先级颜色
  const getPriorityColor = (priorityId) => {
    const found = PRIORITY_LEVELS.find(p => p.id === priorityId);
    return found ? found.color : '#999';
  };
  
  // 处理类别选择 - iOS平台
  const handleCategorySelectIOS = () => {
    const options = TICKET_CATEGORIES.map(cat => cat.name);
    options.push('取消');
    
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: '选择问题类型',
      },
      (buttonIndex) => {
        if (buttonIndex !== options.length - 1) {
          const selectedCategory = TICKET_CATEGORIES[buttonIndex];
          handleCategorySelect(selectedCategory.id);
        }
      }
    );
  };
  
  // 处理优先级选择 - iOS平台
  const handlePrioritySelectIOS = () => {
    const options = PRIORITY_LEVELS.map(priority => priority.name);
    options.push('取消');
    
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: '选择优先级',
      },
      (buttonIndex) => {
        if (buttonIndex !== options.length - 1) {
          const selectedPriority = PRIORITY_LEVELS[buttonIndex];
          handlePrioritySelect(selectedPriority.id);
        }
      }
    );
  };
  
  // 处理图片点击，显示大图
  const handleImagePress = (uri) => {
    setSelectedImage(uri);
    setImageModalVisible(true);
  };

  // 从图库选择图片
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      // 检查文件大小
      const validImages = [];
      for (const asset of result.assets) {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.size > 5 * 1024 * 1024) { // 限制5MB
          Alert.alert('图片过大', '图片大小不能超过5MB');
          continue;
        }
        validImages.push(asset.uri);
      }
      
      setImages([...images, ...validImages]);
    }
  };

  // 拍照
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相机以拍摄照片');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
      if (fileInfo.size > 5 * 1024 * 1024) { // 限制5MB
        Alert.alert('图片过大', '图片大小不能超过5MB');
        return;
      }
      
      setImages([...images, result.assets[0].uri]);
    }
  };
  
  // 类别选择器组件
  const CategorySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[commonStyles.label, { color: colors.text }]}>问题类型</Text>
      <TouchableOpacity
        style={[styles.selectorButton, errors.category && styles.inputError]}
        onPress={Platform.OS === 'ios' ? handleCategorySelectIOS : () => setShowCategoryModal(true)}
      >
        <Text 
          style={[styles.selectorButtonText, { color: category ? colors.text : colors.textSecondary }]}
        >
          {getCategoryName(category)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {errors.category && <Text style={commonStyles.errorText}>{errors.category}</Text>}
    </View>
  );
  
  // 优先级选择器组件
  const PrioritySelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[commonStyles.label, { color: colors.text }]}>优先级</Text>
      <TouchableOpacity
        style={[styles.selectorButton, errors.priority && styles.inputError]}
        onPress={Platform.OS === 'ios' ? handlePrioritySelectIOS : () => setShowPriorityModal(true)}
      >
        <View style={styles.prioritySelectorContent}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(priority) }]} />
          <Text 
            style={[styles.selectorButtonText, { color: priority ? colors.text : colors.textSecondary }]}
          >
            {getPriorityName(priority)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {errors.priority && <Text style={commonStyles.errorText}>{errors.priority}</Text>}
    </View>
  );
  
  // 安卓标题栏组件
  const AndroidHeader = () => (
    <View style={commonStyles.androidHeader}>
      <TouchableOpacity 
        style={commonStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={commonStyles.headerTitle}>创建工单</Text>
      <View style={commonStyles.headerRight} />
    </View>
  );
  
  // 设置状态栏颜色
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    }
  }, [isDarkMode]);
  
  // 设置导航标题
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        title: '创建工单',
        headerTintColor: colors.text,
        headerStyle: {
          backgroundColor: colors.card,
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 0,
        },
      });
    }
  }, [navigation, colors]);
  
  // 检查会话有效性
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          notifySessionExpired();
          return;
        }
        
        // 解析令牌并检查是否过期
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
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
              notifySessionExpired();
              return;
            }
            
            const payload = JSON.parse(decoded);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
              console.log('令牌已过期，尝试刷新');
              
              // 尝试刷新令牌
              const refreshSuccessful = await refreshToken();
              if (!refreshSuccessful) {
                notifySessionExpired();
              }
            }
          } else {
            // 令牌格式不正确
            notifySessionExpired();
          }
        } catch (parseError) {
          console.error('解析令牌失败:', parseError);
          notifySessionExpired();
        }
      } catch (error) {
        console.error('会话检查失败:', error);
        notifySessionExpired();
      }
    };
    
    // 通知会话过期并显示提示
    const notifySessionExpired = () => {
      // 触发HomeScreen中的登录弹窗
      EventRegister.emit('SESSION_EXPIRED');
      Alert.alert(
        '会话已过期',
        '请重新登录以继续',
        [
          {
            text: '确定',
            onPress: () => {}  // 用户点击确定按钮后不做额外操作
          }
        ]
      );
    };
    
    // 启动时检查会话
    checkSession();
  }, []);
  
  const debouncedSubmit = useMemo(() => 
    debounce(handleSubmit, 500), [handleSubmit]);
  
  return (
    <View style={commonStyles.container}>
      {Platform.OS === 'android' && <AndroidHeader />}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={commonStyles.scrollView}
          contentContainerStyle={commonStyles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[commonStyles.card, styles.formCard]}>
            <Text style={[commonStyles.label, { color: colors.text }]}>工单标题</Text>
            <TextInput
              style={[
                commonStyles.input,
                errors.title && styles.inputError,
                { color: colors.text }
              ]}
              placeholder="请输入工单标题"
              placeholderTextColor={isDarkMode ? '#999' : '#666'}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) {
                  setErrors({...errors, title: null});
                }
              }}
            />
            {errors.title && <Text style={commonStyles.errorText}>{errors.title}</Text>}
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>问题描述 *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: colors.text },
                  errors.description ? styles.inputError : null
                ]}
                placeholder="请详细描述问题..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  setErrors(prev => ({ ...prev, description: null }));
                }}
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>
            
            {/* 部门管理员特有选项 */}
            {user.is_admin === 2 && (
              <View style={styles.formGroup}>
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    跳过管理员审核?
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.switchButton,
                      { backgroundColor: skipAdminApproval ? '#4CAF50' : '#9E9E9E' }
                    ]}
                    onPress={() => setSkipAdminApproval(!skipAdminApproval)}
                  >
                    <View style={[
                      styles.switchKnob,
                      skipAdminApproval ? styles.switchKnobActive : null
                    ]} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  {skipAdminApproval 
                    ? '工单将直接进入分配阶段，无需管理员审核' 
                    : '工单需要管理员审核后再进入分配阶段'}
                </Text>
              </View>
            )}
            
            {/* 优先级选择器 */}
            <PrioritySelector />
            
            {/* 问题类型选择器 */}
            <CategorySelector />
            
            <Text style={[commonStyles.label, { color: colors.text }]}>截止日期 (可选)</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.dateIcon} />
              <Text style={[styles.dateText, { color: dueDate ? colors.text : colors.textSecondary }]}>
                {dueDate ? formatDate(dueDate) : '选择截止日期'}
              </Text>
              {dueDate && (
                <TouchableOpacity onPress={() => setDueDate(null)} style={styles.clearDateButton}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            
            {/* 图片上传部分 */}
            <Text style={[commonStyles.label, { color: colors.text, marginTop: 10 }]}>现场照片</Text>
            <View style={styles.imageButtonContainer}>
              <TouchableOpacity 
                style={[styles.imageButton, { backgroundColor: '#FF6700' }]}
                onPress={pickImage}
              >
                <Ionicons name="images" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>选择图片</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.imageButton, { backgroundColor: '#FF6700' }]}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>拍照</Text>
              </TouchableOpacity>
            </View>
            
            {images.length > 0 && (
              <ScrollView horizontal style={styles.imagePreviewContainer}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <TouchableOpacity onPress={() => handleImagePress(uri)}>
                      <Image source={{ uri }} style={styles.previewImage} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => {
                        const newImages = [...images];
                        newImages.splice(index, 1);
                        setImages(newImages);
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {/* 添加工单流程说明 */}
            <View style={[styles.workflowGuide, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={[styles.workflowTitle, { color: colors.text }]}>
                工单处理流程:
              </Text>
              <View style={styles.workflowStep}>
                <View style={[styles.stepNumber, { backgroundColor: '#FF6700' }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  创建工单 - {user.is_admin === 1 
                    ? '管理员创建的工单自动进入下一阶段' 
                    : user.is_admin === 2 
                      ? '部门管理员可选择是否跳过审核阶段' 
                      : '您提交工单后，系统将自动通知管理员审核'}
                </Text>
              </View>
              <View style={styles.workflowStep}>
                <View style={[styles.stepNumber, { backgroundColor: '#2196F3' }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  工单审核 - 由管理员审核通过工单
                </Text>
              </View>
              <View style={styles.workflowStep}>
                <View style={[styles.stepNumber, { backgroundColor: '#9C27B0' }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  工单分配 - 管理员将工单分配给相应角色处理
                </Text>
              </View>
              <View style={styles.workflowStep}>
                <View style={[styles.stepNumber, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  工单处理 - 指定角色处理工单并反馈结果
                </Text>
              </View>
              <View style={styles.workflowStep}>
                <View style={[styles.stepNumber, { backgroundColor: '#8BC34A' }]}>
                  <Text style={styles.stepNumberText}>5</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>
                  处理确认 - 部门管理员先确认处理结果，再由管理员最终确认关闭
                </Text>
              </View>
              <Text style={[styles.workflowNote, { color: colors.textSecondary }]}>
                注: 您可以随时在"工单管理"中查看工单状态，系统会通知您工单的重要状态变更。
              </Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.submitButton, 
                { opacity: submitDisabled ? 0.5 : 1 }
              ]}
              onPress={debouncedSubmit}
              disabled={submitDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>创建工单</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[commonStyles.secondaryButton, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={commonStyles.secondaryButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
          
          {/* 日期选择器 */}
          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* 类别选择模态框 - Android平台 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCategoryModal}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>选择问题类型</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowCategoryModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={TICKET_CATEGORIES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      category === item.id && styles.selectedOption,
                      { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                    ]}
                    onPress={() => {
                      handleCategorySelect(item.id);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                    {category === item.id && (
                      <Ionicons name="checkmark" size={22} color="#FF6700" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      
      {/* 优先级选择模态框 - Android平台 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPriorityModal}
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>选择优先级</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowPriorityModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={PRIORITY_LEVELS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      priority === item.id && styles.selectedOption,
                      { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                    ]}
                    onPress={() => {
                      handlePrioritySelect(item.id);
                      setShowPriorityModal(false);
                    }}
                  >
                    <View style={styles.priorityOption}>
                      <View style={[styles.priorityDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                    </View>
                    
                    {priority === item.id && (
                      <Ionicons name="checkmark" size={22} color="#FF6700" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      
      {/* 图片查看模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={styles.modalImageContainer}>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  formCard: {
    marginTop: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#F44336',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#FF6700',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  cancelButton: {
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    flex: 1,
  },
  clearDateButton: {
    padding: 4,
  },
  // 选择器样式
  selectorContainer: {
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 8,
  },
  selectorButtonText: {
    fontSize: 16,
    flex: 1,
  },
  prioritySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  // 模态框样式
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    flex: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 103, 0, 0.08)',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 图片上传样式
  imageButtonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 8,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  // 图片查看模态框样式
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: screenWidth,
    height: screenHeight * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  workflowGuide: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  workflowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  workflowNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  switchButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 3,
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
  },
  switchKnobActive: {
    transform: [{ translateX: 22 }],
  },
  helperText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textArea: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
});

export default CreateTicketScreen; 