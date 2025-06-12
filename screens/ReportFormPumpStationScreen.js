import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, Modal, Dimensions, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, ActionSheetIOS } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { reportApi } from '../api/apiService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { uploadFileToWebDAV } from './FileUploadScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const ReportFormPumpStationScreen = ({ route, navigation }) => {
  const { reportId, title } = route.params;
  const { colors } = useTheme();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allowDateEdit, setAllowDateEdit] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [pumpStations, setPumpStations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 获取当天日期
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 表单数据状态
  const [formData, setFormData] = useState({
    id: '',
    report_date: getTodayDate(),
    operator: '',
    station_name: '',
    // 泵站运行情况
    pump_running_status: '',
    // 设备运行状态
    pump_status: '',
    electrical_status: '',
    pump_tank_status: '',
    // 异常情况
    abnormal_situations: '',
    // 其他信息
    other_notes: '',
    report_id: '',
    imagesurl: '',
    images: []
  });

  // 加载泵站列表
  useEffect(() => {
    const fetchPumpStations = async () => {
      setLoading(true);
      try {
        const response = await reportApi.getPumpStations();
        if (response.data && Array.isArray(response.data)) {
          setPumpStations(response.data);
        } else {
          setPumpStations([]);
        }
      } catch (error) {
        console.error('获取泵站列表失败:', error);
        Alert.alert('错误', '获取泵站列表失败，请重试');
        setPumpStations([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPumpStations();
  }, []);

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
  }, []);

  // 检查是否已存在报告
  const checkExistingReport = async (date, operator, station) => {
    try {
      const response = await reportApi.getPumpReports({
        report_date: date,
        operator: operator,
        station_name: station
      });
      
      // 后端直接返回 {"exists": true/false} 格式
      if (response && response.exists) {
        // 已存在报告
        Alert.alert(
          '重复提交',
          `${station}在${date}已由${operator}提交过报告，请勿重复提交`,
          [{ text: '确定' }]
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('检查已存在报告时出错:', error);
      return false;
    }
  };

  // 处理表单提交
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // 验证表单数据
      if (!formData.station_name || !formData.operator) {
        Alert.alert('提交失败', '请填写泵站名称和巡查员姓名');
        setSubmitting(false);
        return;
      }

      // 验证重要字段
      if (!formData.pump_running_status || !formData.pump_status || 
          !formData.electrical_status || !formData.pump_tank_status) {
        Alert.alert('提交失败', '请填写泵站运行情况、设备运行状态、电气控制状态和泵站罐/池状态');
        setSubmitting(false);
        return;
      }

      // 检查是否已存在报告
      const exists = await checkExistingReport(
        formData.report_date,
        formData.operator,
        formData.station_name
      );
      
      if (exists) {
        setSubmitting(false);
        return;
      }

      // 确认提交
      Alert.alert(
        '确认提交',
        '是否确定提交泵站巡查报告？',
        [
          {
            text: '取消',
            style: 'cancel',
            onPress: () => setSubmitting(false)
          },
          {
            text: '确定',
            onPress: async () => {
              await submitReport();
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('提交前验证出错:', error);
      Alert.alert('提交失败', '验证数据时发生错误，请重试');
      setSubmitting(false);
    }
  };

  // 选择图片
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('权限错误', '需要相册权限来选择图片');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // 限制最多5张图片
        const totalImages = [...formData.images, ...result.assets];
        if (totalImages.length > 5) {
          Alert.alert('图片数量超限', '最多只能上传5张图片');
          return;
        }
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...result.assets]
        }));
      }
    } catch (error) {
      console.error('选择图片时出错:', error);
      Alert.alert('错误', '选择图片时出现错误');
    }
  };

  // 拍照功能
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('权限错误', '需要相机权限来拍照');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // 限制最多5张图片
        const totalImages = [...formData.images, ...result.assets];
        if (totalImages.length > 5) {
          Alert.alert('图片数量超限', '最多只能上传5张图片');
          return;
        }
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...result.assets]
        }));
      }
    } catch (error) {
      console.error('拍照时出错:', error);
      Alert.alert('错误', '拍照时出现错误');
    }
  };

  // 移除图片
  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // 处理导出PDF
  const handleExportPDF = () => {
    // TODO: 实现PDF导出功能
    Alert.alert('提示', 'PDF导出功能开发中');
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // 确保选择的日期不能是未来的日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        Alert.alert('错误', '不能选择未来的日期');
        return;
      }
      
      setFormData({ ...formData, report_date: selectedDate.toISOString().split('T')[0] });
    }
  };

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

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // 处理图片点击，显示大图
  const handleImagePress = (uri) => {
    setSelectedImage(uri);
    setImageModalVisible(true);
  };

  // 提交报告
  const submitReport = async () => {
    try {
      // 生成唯一的报告标识ID
      const date = formData.report_date;
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const reportId = `PUMP_REPORT_${date}_${timestamp}`;
      
      // 先上传图片，使用报告ID作为标识
      let imageUrls = [];
      if (formData.images.length > 0) {
        imageUrls = await uploadImages(reportId);
      }

      // 设置imagesurl值
      let imagesUrlValue = null; // 默认为null
      if (imageUrls && imageUrls.length > 0) {
        imagesUrlValue = imageUrls.join(',');
      }

      // 创建报告
      const reportResponse = await reportApi.createPumpReport({
        // id由数据库自增，不需要前端传送
        report_date: formData.report_date,
        operator: formData.operator,
        station_name: formData.station_name,
        pump_running_status: formData.pump_running_status,
        pump_status: formData.pump_status,
        electrical_status: formData.electrical_status,
        pump_tank_status: formData.pump_tank_status,
        abnormal_situations: formData.abnormal_situations,
        other_notes: formData.other_notes,
        report_id: reportId,
        imagesurl: imagesUrlValue
      });

      // 后端使用UPSERT机制，成功返回数据即表示操作成功（新增或更新）
      if (reportResponse && (reportResponse.message || reportResponse.data)) {
        const successMessage = reportResponse.message || '泵站巡查报告提交成功！';
        Alert.alert('提交成功', successMessage, [
          {
            text: '确定',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        throw new Error('提交失败：服务器响应异常');
      }
    } catch (error) {
      console.error('提交报告时出错:', error);
      Alert.alert('提交失败', '提交报告时发生错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 上传图片
  const uploadImages = async (reportId) => {
    try {
      const uploadPromises = formData.images.map(async (image, index) => {
        // 使用生产报告ID生成唯一的图片文件名
        const timestamp = Date.now();
        const imageFileName = `PUMP_${reportId}_IMAGE_${index + 1}_${timestamp}.jpg`;
        
        const file = {
          uri: image.uri,
          name: imageFileName,
          type: 'image/jpeg'
        };
        
        // 上传到 Nextcloud，使用报告ID作为标识
        return await uploadFileToWebDAV(file, 'reports', reportId);
      });
  
      const imageUrls = await Promise.all(uploadPromises);
      return imageUrls;
    } catch (error) {
      console.error('上传图片失败:', error);
      throw error;
    }
  };

  // 请求相册权限
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限错误', '需要访问相册权限才能上传图片');
      }
    })();
  }, []);

  // 渲染泵站下拉选择框
  const renderStationPicker = () => (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: colors.text }]}>
        泵站名称<Text style={styles.requiredStar}> *</Text>
      </Text>
      <View style={[styles.pickerContainer, { 
        backgroundColor: colors.card,
        borderColor: colors.border
      }]}>
        {Platform.OS === 'ios' ? (
          <TouchableOpacity
            style={styles.iosPicker}
            onPress={() => {
              const options = pumpStations.map(station => station.name);
              options.unshift('取消');
              ActionSheetIOS.showActionSheetWithOptions(
                {
                  options,
                  cancelButtonIndex: 0,
                  title: '选择泵站'
                },
                (buttonIndex) => {
                  if (buttonIndex !== 0) {
                    setFormData(prev => ({
                      ...prev,
                      station_name: pumpStations[buttonIndex - 1].name
                    }));
                  }
                }
              );
            }}
          >
            <Text style={{ color: formData.station_name ? colors.text : colors.textSecondary }}>
              {formData.station_name || '请选择泵站'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <Picker
            selectedValue={formData.station_name}
            style={{ height: 50, width: '100%', color: colors.text }}
            onValueChange={(itemValue) => 
              setFormData(prev => ({ ...prev, station_name: itemValue }))
            }
            dropdownIconColor={colors.text}
          >
            <Picker.Item label="请选择泵站" value="" color={colors.textSecondary} />
            {pumpStations.map(station => (
              <Picker.Item 
                key={station.id} 
                label={station.name} 
                value={station.name} 
                color={colors.text}
              />
            ))}
          </Picker>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={[styles.container, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>基本信息</Text>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  日期<Text style={styles.requiredStar}> *</Text>
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
                    <Text style={{ color: colors.text }}>{formData.report_date}</Text>
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
                    value={formData.report_date ? new Date(formData.report_date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()} // 设置最大日期为今天
                  />
                )}
              </View>
              {renderFormField('巡查员', 'operator', '请输入巡查员姓名', 'default', false, true)}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    加载泵站列表...
                  </Text>
                </View>
              ) : (
                renderStationPicker()
              )}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>泵站运行情况</Text>
              {renderFormField('泵站运行情况', 'pump_running_status', '请详细描述泵站运行情况', 'default', false, true)}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>设备设施运行状态</Text>
              {renderFormField('设备运行状态', 'pump_status', '设备运行情况，是否正常等', 'default', false, true)}
              {renderFormField('电气控制状态', 'electrical_status', '电气操作运行情况，液位计是否正常', 'default', false, true)}
              {renderFormField('泵站罐/池状态', 'pump_tank_status', '泵站罐/池情况，是否有异常情况', 'default', false, true)}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>异常情况</Text>
              {renderFormField('异常情况', 'abnormal_situations', '如泵站运行有异常请详细描述', 'default', false, true)}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>其他信息</Text>
              {renderFormField('巡查情况及上报问题', 'other_notes', '填写巡查情况或需要上报的问题', 'default', false, true)}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>现场图片</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                请上传现场巡查照片及其他记录照片
              </Text>
              {formData.images.length > 0 && (
                <ScrollView horizontal style={styles.imagePreviewContainer}>
                  {formData.images.map((image, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image 
                        source={{ uri: image.uri }} 
                        style={styles.previewImage} 
                      />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <View style={styles.imageButtonContainer}>
                <TouchableOpacity 
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={pickImage}
                  disabled={formData.images.length >= 5}
                >
                  <Ionicons name="images" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>
                    {formData.images.length >= 5 ? '已达上限' : '选择图片'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={takePhoto}
                  disabled={formData.images.length >= 5}
                >
                  <Ionicons name="camera" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>
                    {formData.images.length >= 5 ? '已达上限' : '拍照'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.submitButton, { 
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.7 : 1
                }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="save" size={24} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>提交报告</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* 添加底部空间，确保表单底部内容不被键盘遮挡 */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  form: {
    padding: 15,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    height: 45,
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
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginRight: 10,
  },
  dateEditButton: {
    height: 45,
    width: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginVertical: 10,
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
  imageButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
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
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
    opacity: 0.8,
  },
  requiredStar: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  requiredHint: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'normal',
    marginLeft: 5,
  },
  waterQualityContainer: {
    flexDirection: 'column',
  },
  pickerContainer: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  iosPicker: {
    paddingHorizontal: 12,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
  },
});

export default ReportFormPumpStationScreen;