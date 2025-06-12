import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Image, 
  ActivityIndicator, 
  Platform, 
  KeyboardAvoidingView, 
  Keyboard, 
  TouchableWithoutFeedback 
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { reportApi, dataApi } from '../api/apiService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { createClient } from 'webdav';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReportFormSludgeScreen = ({ route }) => {
  const { reportId, title } = route.params;
  const { colors } = useTheme();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allowDateEdit, setAllowDateEdit] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [isLoadingSludgeData, setIsLoadingSludgeData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [webdavClient, setWebdavClient] = useState(null);

  // 获取当天的日期
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 表单数据状态
  const [formData, setFormData] = useState({
    id: '',
    date: getTodayDate(),
    operator: '',
    sludge_production: '',
    pac_dosage: '',
    pam_dosage: '',
    ao_pool_1_concentration: '',
    ao_pool_2_concentration: '',
    ao_pool_3_concentration: '',
    water_content: '',
    equipment_status: '',
    dehydrator_status: '',
    belt_filter_status: '',
    other_notes: '',
    report_id: '',
    imagesurl: ''
  });

  // 加载当前用户姓名并填充到值班员字段
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          // 使用用户姓名，如果不存在则使用用户名
          const operatorName = user.real_name || user.username || '';
          setFormData(prevData => ({
            ...prevData,
            operator: operatorName
          }));
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    };
    
    loadCurrentUser();
    loadLatestSludgeData();
    initializeWebDAVClient();
  }, []);

  // 初始化WebDAV客户端
  const initializeWebDAVClient = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('davConnectionConfig');
      let config;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
      } else {
        // 使用默认配置
        config = {
          url: 'http://112.28.56.235:11000/remote.php/dav/files/dsws001',
          username: 'dsws001',
          password: 'dsws2276918'
        };
      }
      
      const client = createClient(config.url, {
        username: config.username,
        password: config.password
      });
      
      // 测试连接
      await client.getDirectoryContents('/');
      setWebdavClient(client);
      console.log('WebDAV客户端初始化成功');
    } catch (error) {
      console.error('WebDAV客户端初始化失败:', error);
    }
  };

  // 监听日期变化，当日期变化时重新加载污泥数据
  useEffect(() => {
    loadLatestSludgeData();
  }, [formData.date]);

  // 从API加载最新的污泥数据
  const loadLatestSludgeData = async () => {
    setIsLoadingSludgeData(true);
    try {
      // 构建查询参数，使用表单中的日期
      const date = formData.date;
      const response = await dataApi.getWuniLatest({ date: date });
      
      if (response.data && response.data.success) {
        const sludgeData = response.data.data;
        
        // 更新表单字段
        if (sludgeData && sludgeData.length > 0) {
          // 创建一个映射表，以sample_name为键
          const sampleMap = {};
          sludgeData.forEach(sample => {
            sampleMap[sample.sample_name] = sample;
          });
          
          // 更新表单数据
          setFormData(prevData => ({
            ...prevData,
            ao_pool_1_concentration: sampleMap['1号ao池']?.concentration || '',
            ao_pool_2_concentration: sampleMap['2号ao池']?.concentration || '',
            ao_pool_3_concentration: sampleMap['3号ao池']?.concentration || '',
            water_content: sampleMap['污泥压榨含水率']?.water_content || ''
          }));
          
          // 提示用户
          console.log('成功加载污泥数据:', sludgeData);
        } else {
          console.log('未找到当天的污泥数据');
        }
      }
    } catch (error) {
      console.error('加载污泥数据失败:', error);
    } finally {
      setIsLoadingSludgeData(false);
    }
  };

  // 检查是否已提交报告
  const checkExistingReport = async () => {
    if (!formData.operator || !formData.date) return false;
    
    setIsCheckingReport(true);
    try {
      const response = await reportApi.checkReportSludgeExists({
        date: formData.date,
        operator: formData.operator
      });
      
      // 后端直接返回 {"exists": true/false} 格式
      if (response && response.exists) {
        // 格式化日期为"X月X日"的形式
        const dateParts = formData.date.split('-');
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        const formattedDate = `${month}月${day}日`;
        
        Alert.alert('提示', `数据库已经存在${formattedDate}的报告，请勿重复提交`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('检查报告失败:', error);
      return false;
    } finally {
      setIsCheckingReport(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (submitting || isCheckingReport) return;
    
    // 验证必填字段
    if (!formData.date || !formData.operator) {
      Alert.alert('错误', '日期和值班员为必填项');
      return;
    }
    
    // 验证数据
    if (!formData.sludge_production) {
      Alert.alert('错误', '污泥产量为必填项');
      return;
    }
    
    if (!formData.pac_dosage || !formData.pam_dosage) {
      Alert.alert('错误', 'PAC用量和PAM用量为必填项');
      return;
    }
    
    if (!formData.dehydrator_status || !formData.belt_filter_status || !formData.equipment_status) {
      Alert.alert('错误', '设备运行状态（脱水机、带式过滤机、其他设备）为必填项');
      return;
    }
    
    // 验证数字字段格式
    const numericFields = [
      { key: 'sludge_production', name: '污泥产量' },
      { key: 'pac_dosage', name: 'PAC用量' },
      { key: 'pam_dosage', name: 'PAM用量' }
    ];
    const numericRegex = /^[0-9]*\.?[0-9]*$/;
    
    for (const field of numericFields) {
      if (formData[field.key] && !numericRegex.test(formData[field.key])) {
        Alert.alert('错误', `${field.name}字段必须为数字格式`);
        return;
      }
    }
    
    // 检查是否已提交过报告
    const reportExists = await checkExistingReport();
    if (reportExists) return;
    
    // 确认提交
    Alert.alert(
      '确认提交',
      '是否需要再次检查提交的数据？',
      [
        {
          text: '再检查一下',
          style: 'cancel',
        },
        {
          text: '直接提交',
          onPress: async () => {
            await submitReport();
          },
        },
      ],
      { cancelable: false }
    );
  };
  
  // 提交报告函数
  const submitReport = async () => {
    setSubmitting(true);
    try {
      // 生成唯一的报告ID
      const date = formData.date;
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const reportId = `SLUDGE_REPORT_${date}_${timestamp}`;
      
      // 先上传图片，使用报告ID作为标识
      let imageUrls = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(reportId);
      }

      // 设置imagesurl值
      let imagesUrlValue = null; // 默认为null
      if (imageUrls && imageUrls.length > 0) {
        imagesUrlValue = imageUrls.join(',');
      }

      // 准备提交的数据
      const processedData = {
        id: reportId,
        date: formData.date,
        operator: formData.operator,
        sludge_production: formData.sludge_production,
        pac_dosage: formData.pac_dosage,
        pam_dosage: formData.pam_dosage,
        ao_pool_1_concentration: formData.ao_pool_1_concentration,
        ao_pool_2_concentration: formData.ao_pool_2_concentration,
        ao_pool_3_concentration: formData.ao_pool_3_concentration,
        water_content: formData.water_content,
        equipment_status: formData.equipment_status,
        dehydrator_status: formData.dehydrator_status,
        belt_filter_status: formData.belt_filter_status,
        other_notes: formData.other_notes || '',
        report_id: reportId,
        imagesurl: imagesUrlValue
      };

      // 提交到服务器
      const response = await reportApi.createReportSludge(processedData);
      
      // 后端使用UPSERT机制，成功返回数据即表示操作成功（新增或更新）
      if (response && response.message) {
        Alert.alert('成功', response.message || '报告已提交');
        // 只在成功时清空图片和表单数据
        setImages([]);
        setFormData({
          id: '',
          date: getTodayDate(),
          operator: formData.operator, // 保留操作员姓名
          sludge_production: '',
          pac_dosage: '',
          pam_dosage: '',
          ao_pool_1_concentration: '',
          ao_pool_2_concentration: '',
          ao_pool_3_concentration: '',
          water_content: '',
          equipment_status: '',
          dehydrator_status: '',
          belt_filter_status: '',
          other_notes: '',
          report_id: '',
          imagesurl: ''
        });
        // 重置日期编辑状态
        setAllowDateEdit(false);
      } else {
        throw new Error('提交失败：服务器响应异常');
      }
    } catch (error) {
      console.error('提交失败:', error);
      const errorMessage = error.response?.data?.message || '提交失败，请检查数据格式是否正确';
      Alert.alert('错误', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 日期选择处理
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // 允许选择当天和之前的日期，但不能是未来的日期
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (selectedDate > today) {
        Alert.alert('错误', '不能选择未来的日期');
        return;
      }
      
      setFormData({ ...formData, date: selectedDate.toISOString().split('T')[0] });
    }
  };

  // 图片处理函数
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择图片');
      return;
    }

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    };

    if (Platform.OS === 'android') {
      options.presentationStyle = 'overFullScreen';
    } else {
      options.presentationStyle = 'pageSheet';
    }

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets) {
      const newImages = [...images];
      result.assets.forEach(asset => {
        newImages.push(asset.uri);
      });
      setImages(newImages);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相机以拍摄照片');
      return;
    }

    const options = {
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      cameraType: 'back',
    };

    if (Platform.OS === 'android') {
      options.presentationStyle = 'overFullScreen';
      options.allowsEditing = false;
    } else {
      options.presentationStyle = 'pageSheet';
      options.exif = true;
      options.base64 = false;
    }

    const result = await ImagePicker.launchCameraAsync(options);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const uploadImages = async (reportId) => {
    if (images.length === 0) return [];
    
    if (!webdavClient) {
      console.error('WebDAV客户端未初始化');
      throw new Error('WebDAV客户端未初始化，请稍后重试');
    }
    
    console.log('=== 污泥车间日报图片WebDAV上传调试信息 ===');
    console.log('图片数量:', images.length);
    console.log('报告ID:', reportId);
    console.log('目标文件夹:', '/report/report_sludge');
    
    try {
      // 确保目标文件夹存在
      try {
        await webdavClient.createDirectory('/report', { recursive: true });
        await webdavClient.createDirectory('/report/report_sludge', { recursive: true });
        console.log('目标文件夹已确保存在');
      } catch (dirError) {
        console.log('文件夹可能已存在，继续上传:', dirError.message);
      }
      
      const uploadPromises = images.map(async (uri, index) => {
        const timestamp = Date.now();
        const imageFileName = `SLUDGE_${reportId}_IMAGE_${index + 1}_${timestamp}.jpg`;
        
        console.log(`开始上传第${index + 1}张图片:`);
        console.log('- 文件名:', imageFileName);
        console.log('- 文件URI:', uri);
        console.log('- 目标路径:', `/report/report_sludge/${imageFileName}`);
        
        try {
          // 读取图片文件内容
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          // 构建WebDAV上传路径
          const uploadPath = `/report/report_sludge/${imageFileName}`;
          
          // 使用WebDAV客户端上传文件
          await webdavClient.putFileContents(uploadPath, fileContent, {
            format: 'binary'
          });
          
          console.log(`第${index + 1}张图片WebDAV上传成功:`, uploadPath);
          
          // 返回文件的WebDAV访问路径
          return uploadPath;
        } catch (uploadError) {
          console.error(`第${index + 1}张图片WebDAV上传失败:`, uploadError);
          throw uploadError;
        }
      });
  
      const imageUrls = await Promise.all(uploadPromises);
      console.log('所有图片WebDAV上传完成:', imageUrls);
      return imageUrls;
    } catch (error) {
      console.error('=== 图片WebDAV上传批量失败 ===');
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      throw error;
    }
  };

  // 渲染表单字段的辅助函数
  const renderFormField = (label, key, placeholder, keyboardType = 'default', isNumeric = false, isRequired = false) => (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
        {isRequired && <Text style={styles.requiredStar}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border
        }]}
        value={formData[key]}
        onChangeText={(text) => {
          // 对于数字输入框，确保只能输入数字
          if (isNumeric) {
            // 只允许数字和小数点
            const numericRegex = /^[0-9]*\.?[0-9]*$/;
            if (text === '' || numericRegex.test(text)) {
              setFormData({ ...formData, [key]: text });
            }
          } else {
            setFormData({ ...formData, [key]: text });
          }
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
      />
    </View>
  );

  // 删除图片
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // 渲染图片预览
  const renderImagePreview = () => {
    return (
      <View style={styles.imagePreviewContainer}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imagePreview}>
            <Image source={{ uri }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color="red" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            {/* 表单标题 */}
            <Text style={[styles.formTitle, { color: colors.text }]}>
              高铁厂污泥车间日报
            </Text>

            {/* 基本信息 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>基本信息</Text>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  日期 <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.dateContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateInput,
                      { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        justifyContent: 'center',
                        flex: 1
                      },
                      !allowDateEdit && { opacity: 0.7 }
                    ]}
                    onPress={() => allowDateEdit && setShowDatePicker(true)}
                    disabled={!allowDateEdit}
                  >
                    <Text style={[styles.dateText, { color: colors.text }]}>
                      {formData.date}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.dateEditButton, { backgroundColor: colors.primary }]}
                    onPress={() => setAllowDateEdit(!allowDateEdit)}
                  >
                    <Ionicons 
                      name={allowDateEdit ? "checkmark-outline" : "create-outline"} 
                      size={18} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </View>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.date ? new Date(formData.date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              {renderFormField('值班员', 'operator', '请输入值班员姓名', 'default', false, true)}
            </View>

            {/* 污泥产量 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>污泥产量</Text>
              {renderFormField('污泥产量(吨)', 'sludge_production', '请输入污泥产量', 'numeric', true, true)}
            </View>

            {/* 药剂用量 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>药剂用量</Text>
              {renderFormField('PAC用量(千克)', 'pac_dosage', '请输入PAC用量', 'numeric', true, true)}
              {renderFormField('PAM用量(千克)', 'pam_dosage', '请输入PAM用量', 'numeric', true, true)}
            </View>

            {/* 污泥数据 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>污泥数据</Text>
                {isLoadingSludgeData ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={loadLatestSludgeData}
                  >
                    <Ionicons name="refresh" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 12, fontStyle: 'italic' }]}>
                以下数据从化验系统自动获取
              </Text>
              
              {renderFormField('1号AO池污泥浓度(g/L)', 'ao_pool_1_concentration', '1号AO池污泥浓度', 'numeric', true)}
              {renderFormField('2号AO池污泥浓度(g/L)', 'ao_pool_2_concentration', '2号AO池污泥浓度', 'numeric', true)}
              {renderFormField('3号AO池污泥浓度(g/L)', 'ao_pool_3_concentration', '3号AO池污泥浓度', 'numeric', true)}
              {renderFormField('污泥压榨含水率(%)', 'water_content', '污泥压榨含水率', 'numeric', true)}
            </View>

            {/* 设备运行情况 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>设备运行情况</Text>
              {renderFormField('板框压滤机运行状态', 'dehydrator_status', '请输入板框压滤机运行状态', 'default', false, true)}
              {renderFormField('污泥螺杆泵运行状态', 'belt_filter_status', '请输入污泥螺杆泵运行状态', 'default', false, true)}
              {renderFormField('其他设备运行状态', 'equipment_status', '请输入其他设备运行状态', 'default', false, true)}
            </View>

            {/* 其他情况 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>其他情况</Text>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>备注</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border
                    }
                  ]}
                  value={formData.other_notes}
                  onChangeText={(text) => setFormData({ ...formData, other_notes: text })}
                  placeholder="请输入备注内容"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* 现场照片 */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>现场照片</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 12, fontStyle: 'italic' }]}>
                请上传污泥运输记录单及其他图片
              </Text>
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={pickImage}
                >
                  <Ionicons name="images" size={24} color="#FFF" />
                  <Text style={styles.imageButtonText}>从相册选择</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={24} color="#FFF" />
                  <Text style={styles.imageButtonText}>拍照</Text>
                </TouchableOpacity>
              </View>

              {/* 图片预览 */}
              {images.length > 0 && renderImagePreview()}
            </View>

            {/* 提交按钮 */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: submitting || isCheckingReport ? 
                    colors.primaryLight : colors.primary
                }
              ]}
              onPress={handleSubmit}
              disabled={submitting || isCheckingReport}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {isCheckingReport ? '检查报告中...' : '提交报告'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  requiredStar: {
    color: 'red',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  dateEditButton: {
    height: 45,
    width: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  refreshButton: {
    padding: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.7,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 100,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.48,
  },
  imageButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imagePreview: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ReportFormSludgeScreen;
