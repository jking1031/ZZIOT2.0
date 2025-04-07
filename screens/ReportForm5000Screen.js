import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { uploadFileToWebDAV } from './FileUploadScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReportFormScreen = ({ route }) => {
  const { reportId, title } = route.params;
  const { colors } = useTheme();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allowDateEdit, setAllowDateEdit] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);

  // 获取昨天的日期
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // 表单数据状态
  const [formData, setFormData] = useState({
    id: '',
    // 默认使用昨天的日期，而不是当天
    date: getYesterdayDate(),
    operator: '',
    inflow: '',
    outflow: '',
    // 拆分出水水质指标
    out_cod: '',
    out_nh3n: '',
    out_tp: '',
    // 原字段保留，用于存储合成结果
    out_quality: '',
    water_quality_anomalies: '',
    aeration_system_status: '',
    backwash_system_status: '',
    inlet_pump_status: '',
    magnetic_mixing_status: '',
    water_tank_status: '',
    sludge_discharge_status: '',
    other_equipment_status: '',
    flocculant_dosage: '',
    magnetic_powder_dosage: '',
    chemical_inventory: '',
    other_notes: '',
    report_id: '',
    imagesurl: ''
  });

  // 水质数据变化时自动合成完整描述
  useEffect(() => {
    // 合成出水水质描述
    const outQualityParts = [];
    if (formData.out_cod) outQualityParts.push(`出水COD平均值${formData.out_cod}mg/L`);
    if (formData.out_nh3n) outQualityParts.push(`氨氮平均值${formData.out_nh3n}mg/L`);
    if (formData.out_tp) outQualityParts.push(`总磷平均值${formData.out_tp}mg/L`);
    
    const outQualityText = outQualityParts.join('，');
    
    // 更新合成后的描述文本
    setFormData(prevData => ({
      ...prevData,
      out_quality: outQualityText
    }));
  }, [formData.out_cod, formData.out_nh3n, formData.out_tp]);

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

  // 检查是否已提交报告
  const checkExistingReport = async () => {
    if (!formData.operator || !formData.date) return false;
    
    setIsCheckingReport(true);
    try {
      const response = await axios.get(`https://nodered.jzz77.cn:9003/api/reports5000/exists?date=${formData.date}&operator=${formData.operator}`);
      
      if (response.data && response.data.exists) {
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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting || isCheckingReport) return;
    
    // 验证必填字段
    if (!formData.date || !formData.operator) {
      Alert.alert('错误', '日期和值班员为必填项');
      return;
    }
    
    // 验证进出水情况必填字段
    if (!formData.inflow || !formData.outflow) {
      Alert.alert('错误', '进水流量和出水流量为必填项');
      return;
    }
    
    // 验证水质数据，确保至少填写了部分指标
    const hasOutQualityData = formData.out_cod || formData.out_nh3n || formData.out_tp;
    
    if (!hasOutQualityData) {
      Alert.alert('错误', '出水水质指标不能全部为空，请至少填写部分指标');
      return;
    }
    
    // 验证设备运行情况必填字段
    if (!formData.aeration_system_status || !formData.backwash_system_status || 
        !formData.inlet_pump_status || !formData.magnetic_mixing_status || 
        !formData.water_tank_status || !formData.sludge_discharge_status) {
      Alert.alert('错误', '设备运行情况（曝气系统、反洗系统、进水泵系统、磁混凝、水箱状态、污泥排放）为必填项');
      return;
    }
    
    // 验证药剂投加情况必填字段
    if (!formData.flocculant_dosage || !formData.magnetic_powder_dosage || !formData.chemical_inventory) {
      Alert.alert('错误', '药剂投加信息（絮凝剂、磁粉投加量和药剂存量）为必填项');
      return;
    }
    
    // 验证数字字段格式
    const numericFields = [
      { key: 'inflow', name: '进水流量' },
      { key: 'outflow', name: '出水流量' },
      { key: 'flocculant_dosage', name: '絮凝剂投加量' },
      { key: 'magnetic_powder_dosage', name: '磁粉投加量' },
      // 添加水质字段
      { key: 'out_cod', name: '出水COD' },
      { key: 'out_nh3n', name: '出水氨氮' },
      { key: 'out_tp', name: '出水总磷' },
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
  
  // 将提交逻辑提取为单独的函数
  const submitReport = async () => {
    setSubmitting(true);
    try {
      // 生成唯一的生产报告ID
      const date = formData.date;
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const reportId = `PROD_REPORT_5000${date}_${timestamp}`;
      
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

      // 准备提交的数据，确保所有字段都正确映射
      const processedData = {
        id: reportId,
        date: formData.date,
        operator: formData.operator,
        inflow: formData.inflow || '0',
        outflow: formData.outflow || '0',
        out_quality: formData.out_quality || '',
        water_quality_anomalies: formData.water_quality_anomalies || '',
        aeration_system_status: formData.aeration_system_status || '',
        backwash_system_status: formData.backwash_system_status || '',
        inlet_pump_status: formData.inlet_pump_status || '',
        magnetic_mixing_status: formData.magnetic_mixing_status || '',
        water_tank_status: formData.water_tank_status || '',
        sludge_discharge_status: formData.sludge_discharge_status || '',
        other_equipment_status: formData.other_equipment_status || '',
        flocculant_dosage: formData.flocculant_dosage || '',
        magnetic_powder_dosage: formData.magnetic_powder_dosage || '',
        chemical_inventory: formData.chemical_inventory || '',
        other_notes: formData.other_notes || '',
        report_id: reportId,
        imagesurl: imagesUrlValue,
      };

      // 提交到服务器
      const response = await axios.post('https://nodered.jzz77.cn:9003/api/reports5000', processedData);
      
      if (response.status === 201) {
        Alert.alert('成功', '报告已提交');
        // 只在成功时清空图片和表单数据
        setImages([]);
        setFormData({
          id: '',
          date: getYesterdayDate(),
          operator: '',
          inflow: '',
          outflow: '',
          out_cod: '',
          out_nh3n: '',
          out_tp: '',
          out_quality: '',
          water_quality_anomalies: '',
          aeration_system_status: '',
          backwash_system_status: '',
          inlet_pump_status: '',
          magnetic_mixing_status: '',
          water_tank_status: '',
          sludge_discharge_status: '',
          other_equipment_status: '',
          flocculant_dosage: '',
          magnetic_powder_dosage: '',
          chemical_inventory: '',
          other_notes: '',
          report_id: '',
          imagesurl: ''
        });
        // 重置日期编辑状态
        setAllowDateEdit(false);
      } else {
        throw new Error('提交失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      const errorMessage = error.response?.data?.message || '提交失败，请检查数据格式是否正确';
      Alert.alert('错误', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 处理导出PDF
  const handleExportPDF = () => {
    // TODO: 实现PDF导出功能
    Alert.alert('提示', 'PDF导出功能开发中');
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // 确保选择的日期不能是今天或未来的日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate >= today) {
        Alert.alert('错误', '只能选择今天之前的日期');
        return;
      }
      
      setFormData({ ...formData, date: selectedDate.toISOString().split('T')[0] });
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

  const [images, setImages] = useState([]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择图片');
      return;
    }

    // 为Android和iOS设置不同的选项
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    };

    // Android特定设置，确保打开相册
    if (Platform.OS === 'android') {
      options.presentationStyle = 'overFullScreen';
    } else {
      options.presentationStyle = 'pageSheet';
    }

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets) {
      // 处理所有选择的图片，而不仅仅是第一张
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

    // 为Android和iOS设置不同的选项
    const options = {
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      cameraType: 'back',
    };

    // Android特定设置
    if (Platform.OS === 'android') {
      options.presentationStyle = 'overFullScreen';
      options.allowsEditing = false; // Android不启用裁剪
    } else {
      options.presentationStyle = 'pageSheet';
      // iOS设置中文界面
      options.exif = true;
      options.base64 = false;
      options.cancelButtonTitle = '取消';
      options.takePhotoButtonTitle = '拍照';
      options.chooseFromLibraryButtonTitle = '从相册选择';
      options.durationLimit = 10;
    }

    const result = await ImagePicker.launchCameraAsync(options);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const uploadImages = async (reportId) => {
    try {
      const uploadPromises = images.map(async (uri, index) => {
        // 使用生产报告ID生成唯一的图片文件名
        const timestamp = Date.now();
        const imageFileName = `PROD_${reportId}_IMAGE_${index + 1}_${timestamp}.jpg`;
        
        const file = {
          uri,
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
                    <Text style={{ color: colors.text }}>{formData.date}</Text>
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
                    value={new Date(formData.date)}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date(new Date().setDate(new Date().getDate() - 1))} // 设置最大日期为昨天
                  />
                )}
              </View>
              {renderFormField('值班员', 'operator', '请输入值班员姓名', 'default', false, true)}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>进出水情况</Text>
              {renderFormField('进水流量累计 (m³)', 'inflow', '请输入进水流量累计量', 'numeric', true, true)}
              {renderFormField('出水流量累计 (m³)', 'outflow', '请输入出水流量累计量', 'numeric', true, true)}
              
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                出水水质<Text style={styles.requiredStar}> *</Text>
                <Text style={styles.requiredHint}>（至少填写一项）</Text>
              </Text>
              
              <View style={styles.waterQualityContainer}>
                {renderFormField('COD平均值 (mg/L)', 'out_cod', '请输入COD平均值', 'numeric', true)}
                {renderFormField('氨氮平均值 (mg/L)', 'out_nh3n', '请输入氨氮平均值', 'numeric', true)}
                {renderFormField('总磷平均值 (mg/L)', 'out_tp', '请输入总磷平均值', 'numeric', true)}
              </View>
              
              {renderFormField('水质异常情况', 'water_quality_anomalies', '如有异常情况，请描述')}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>设备运行情况</Text>
              {renderFormField('曝气系统运行状态', 'aeration_system_status', '描述曝气系统运行情况', 'default', false, true)}
              {renderFormField('反洗系统运行状态', 'backwash_system_status', '描述反洗系统运行情况', 'default', false, true)}
              {renderFormField('进水泵系统运行状态', 'inlet_pump_status', '描述进水泵系统运行情况', 'default', false, true)}
              {renderFormField('磁混凝运行状态', 'magnetic_mixing_status', '描述磁混凝系统运行情况', 'default', false, true)}
              {renderFormField('中间水箱及清水箱运行状态', 'water_tank_status', '描述水箱运行情况', 'default', false, true)}
              {renderFormField('剩余污泥排放情况', 'sludge_discharge_status', '描述污泥排放情况', 'default', false, true)}
              {renderFormField('其他设备设施运行情况', 'other_equipment_status', '描述其他设备运行情况')}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>药剂投加情况</Text>
              {renderFormField('絮凝剂投加量 (L)', 'flocculant_dosage', '请输入絮凝剂投加量', 'numeric', true, true)}
              {renderFormField('磁粉投加量 (kg)', 'magnetic_powder_dosage', '请输入磁粉投加量', 'numeric', true, true)}
              {renderFormField('各药剂剩余存量', 'chemical_inventory', '请填写各类药剂的剩余存量', 'default', false, true)}
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>其他情况</Text>
              {renderFormField('其他备注', 'other_notes', '填写备注信息或需要注意的信息')}
            </View>


            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>现场照片</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                请上传现场巡查照片及其他记录照片
              </Text>
              <View style={styles.imageButtonContainer}>
                <TouchableOpacity 
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
                  onPress={pickImage}
                >
                  <Ionicons name="images" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>选择图片</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.imageButton, { backgroundColor: colors.primary }]}
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
                      <Image source={{ uri }} style={styles.previewImage} />
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
  waterQualityContainer: {
    flexDirection: 'column',
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
  sectionDescription: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
    opacity: 0.8,
  },
});

export default ReportFormScreen;