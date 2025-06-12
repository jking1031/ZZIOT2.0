import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { dataApi } from '../api/apiService';

const SludgeDataEntryScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // 使用单个数据对象，包含所有固定字段
  const [sludgeData, setSludgeData] = useState({
    ao_pool_1: '',
    ao_pool_2: '',
    ao_pool_3: '',
    ao_pool_1_settling: '',
    ao_pool_2_settling: '',
    ao_pool_3_settling: '',
    water_content: '',
    time: new Date().toISOString().split('T')[0]
  });

  // 检查所选日期是否已有数据
  const checkExistingData = async (date) => {
    setIsCheckingDuplicate(true);
    setLoadingModalVisible(true);
    
    try {
      console.log(`正在检查日期 ${date} 是否存在数据...`);
      const response = await dataApi.queryWuniData({
        dbName: 'nodered',
        tableName: 'sludge_data',
        date: date
      });
      
      const data = response;
      console.log('查询结果:', data);
      
      if (data && data.length > 0 && data[0].count > 0) {
        Alert.alert(
          '数据已存在',
          `日期 ${date} 的数据已存在，请选择其他日期或修改现有数据。`,
          [{ text: '确定', style: 'default' }]
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('检查重复数据时出错:', error);
      Alert.alert('错误', '检查数据时出现错误，请重试');
      return false;
    } finally {
      setLoadingModalVisible(false);
      setIsCheckingDuplicate(false);
    }
  };
  
  // 提交数据函数
  const submitData = async () => {
    try {
      setLoadingModalVisible(true);
      
      const response = await dataApi.submitWuniData({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error(`API响应错误: ${response.status} ${response.statusText}`);
        throw new Error('查询失败');
      }

      const data = await response.json();
      console.log('API返回数据:', JSON.stringify(data));
      
      // 处理不同的API响应格式
      let hasData = false;
      
      // 格式1: 直接返回[{"count": N}]格式
      if (Array.isArray(data) && data.length > 0 && data[0].count !== undefined) {
        console.log('检测到count格式:', data[0].count);
        hasData = data[0].count > 0;
      }
      // 格式2: 如果返回的是数组格式，检查是否含有日期匹配的数据
      else if (Array.isArray(data) && data.length > 0) {
        hasData = data.some(item => 
          (item.time && item.time === date)
        );
      } 
      // 格式3: 如果返回的是 {payload: [{count: N}]} 格式
      else if (data && data.payload && Array.isArray(data.payload) && data.payload.length > 0) {
        hasData = data.payload[0].count > 0;
      }
      // 格式4: 如果返回的是 {success: true, data: [...]} 格式
      else if (data && data.success === true && Array.isArray(data.data)) {
        hasData = data.data.length > 0;
      }
      
      console.log(`结果: ${hasData ? '存在数据' : '不存在数据'}`);
      return hasData;
    } catch (error) {
      console.error('检查重复数据失败:', error);
      // 出错时询问用户是否继续
      return new Promise((resolve) => {
        Alert.alert(
          '检查数据失败',
          '无法检查是否有重复数据，是否继续提交？',
          [
            { text: '取消', onPress: () => resolve(true), style: 'cancel' }, // 默认认为有重复，阻止提交
            { text: '继续', onPress: () => resolve(false) }, // 用户确认要继续，允许提交
          ]
        );
      });
    } finally {
      setIsCheckingDuplicate(false);
      setLoadingModalVisible(false);
    }
  };

  const updateField = (field, value) => {
    setSludgeData({
      ...sludgeData,
      [field]: value
    });
  };

  const validateNumber = (value, fieldName) => {
    if (value && (isNaN(value) || value < 0)) {
      Alert.alert('错误', `${fieldName}必须是有效的正数`);
      return false;
    }
    return true;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    try {
      // 在提交前先检查是否已有该日期的数据
      setLoadingModalVisible(true);
      const hasExistingData = await checkExistingData(sludgeData.time);
      
      if (hasExistingData) {
        // 格式化日期为"X月X日"的形式，使消息更友好
        const dateParts = sludgeData.time.split('-');
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        const formattedDate = `${month}月${day}日`;
        
        Alert.alert('提示', `${formattedDate}的污泥数据已存在，请勿重复提交`);
        setLoadingModalVisible(false);
        return;
      }
      
      // 确认提交
      setLoadingModalVisible(false);
      Alert.alert(
        '确认提交',
        '确定要提交污泥数据吗？',
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '确定提交', 
            onPress: async () => {
              try {
                setIsSubmitting(true);
                setLoadingModalVisible(true);
                
                console.log('准备提交污泥数据:', JSON.stringify(sludgeData));

                // 使用正确的API端点和提交格式
                console.log('提交污泥数据至API');
                
                // 需要将数据拆分为多条记录，每个AO池一条记录
                const submitData = {
                  dbName: 'nodered',
                  tableName: 'sludge_data',
                  data: [
                    // 1号AO池数据
                    {
                      sample_name: '1号ao池',
                      concentration: sludgeData.ao_pool_1,
                      settling_ratio: sludgeData.ao_pool_1_settling,
                      time: sludgeData.time
                    },
                    // 2号AO池数据
                    {
                      sample_name: '2号ao池',
                      concentration: sludgeData.ao_pool_2,
                      settling_ratio: sludgeData.ao_pool_2_settling,
                      time: sludgeData.time
                    },
                    // 3号AO池数据
                    {
                      sample_name: '3号ao池',
                      concentration: sludgeData.ao_pool_3,
                      settling_ratio: sludgeData.ao_pool_3_settling,
                      time: sludgeData.time
                    },
                    // 污泥压榨含水率数据
                    {
                      sample_name: '污泥压榨含水率',
                      water_content: sludgeData.water_content,
                      time: sludgeData.time
                    }
                  ]
                };
                
                // 过滤掉没有填写的数据项
                submitData.data = submitData.data.filter(item => {
                  if (item.sample_name === '污泥压榨含水率') {
                    return item.water_content && item.water_content.trim() !== '';
                  } else {
                    return (item.concentration && item.concentration.trim() !== '') || 
                           (item.settling_ratio && item.settling_ratio.trim() !== '');
                  }
                });
                
                // 如果没有任何数据项，提示用户
                if (submitData.data.length === 0) {
                  Alert.alert('提示', '请至少填写一项数据');
                  setIsSubmitting(false);
                  setLoadingModalVisible(false);
                  return;
                }
                
                console.log('提交数据格式:', JSON.stringify(submitData));

                const response = await dataApi.submitWuniData(submitData);

                console.log('提交响应:', JSON.stringify(response));

                // 检查提交是否成功
                if (response && (response.success === true || response.message === 'success' || response.status === 'success')) {
                  // 提交成功，清除表单数据
                  resetForm();
                  Alert.alert(
                    '提交成功', 
                    '成功插入 1 条污泥数据', 
                    [{ text: '确定', onPress: () => navigation.goBack() }]
                  );
                } else {
                  // 提交失败，保留表单数据供用户继续编辑
                  const errorMessage = response?.message || response?.error || '提交失败，请检查数据后重试';
                  Alert.alert(
                    '提交失败', 
                    errorMessage,
                    [{ text: '确定', style: 'default' }]
                  );
                }
              } catch (error) {
                console.error('提交数据失败:', error);
                // 网络错误或其他异常，保留表单数据供用户继续编辑
                Alert.alert(
                  '提交失败', 
                  error.message || '网络错误，请检查网络连接后重试',
                  [{ text: '确定', style: 'default' }]
                );
              } finally {
                setIsSubmitting(false);
                setLoadingModalVisible(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('检查已有数据失败:', error);
      Alert.alert('错误', '无法检查是否存在重复数据，请重试');
      setLoadingModalVisible(false);
    }
  };

  const validateForm = () => {
    // 验证数据
    // 验证浓度字段
    if (!validateNumber(sludgeData.ao_pool_1, '1号ao池')) return false;
    if (!validateNumber(sludgeData.ao_pool_2, '2号ao池')) return false;
    if (!validateNumber(sludgeData.ao_pool_3, '3号ao池')) return false;
    
    // 验证沉降比字段
    if (!validateNumber(sludgeData.ao_pool_1_settling, '1号ao池沉降比')) return false;
    if (!validateNumber(sludgeData.ao_pool_2_settling, '2号ao池沉降比')) return false;
    if (!validateNumber(sludgeData.ao_pool_3_settling, '3号ao池沉降比')) return false;
    
    // 验证污泥压榨含水率是否在0-100%之间
    if (sludgeData.water_content) {
      if (isNaN(sludgeData.water_content) || sludgeData.water_content < 0 || sludgeData.water_content > 100) {
        Alert.alert('错误', '污泥压榨含水率必须在0-100%之间');
        return false;
      }
    }

    // 验证日期格式
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(sludgeData.time)) {
      Alert.alert('错误', '请输入正确的日期格式 (YYYY-MM-DD)');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setSludgeData({
      ao_pool_1: '',
      ao_pool_2: '',
      ao_pool_3: '',
      ao_pool_1_settling: '',
      ao_pool_2_settling: '',
      ao_pool_3_settling: '',
      water_content: '',
      time: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      enabled={true}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={[styles.container, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>AO池污泥浓度 (g/L)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>1号ao池</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.ao_pool_1}
                onChangeText={(value) => updateField('ao_pool_1', value)}
                keyboardType="numeric"
                placeholder="请输入浓度"
                placeholderTextColor={colors.text}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>2号ao池</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.ao_pool_2}
                onChangeText={(value) => updateField('ao_pool_2', value)}
                keyboardType="numeric"
                placeholder="请输入浓度"
                placeholderTextColor={colors.text}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>3号ao池</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.ao_pool_3}
                onChangeText={(value) => updateField('ao_pool_3', value)}
                keyboardType="numeric"
                placeholder="请输入浓度"
                placeholderTextColor={colors.text}
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>AO池污泥沉降比 (%)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>1号ao池沉降比</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.ao_pool_1_settling}
                onChangeText={(value) => updateField('ao_pool_1_settling', value)}
                keyboardType="numeric"
                placeholder="请输入沉降比"
                placeholderTextColor={colors.text}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>2号ao池沉降比</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.ao_pool_2_settling}
                onChangeText={(value) => updateField('ao_pool_2_settling', value)}
                keyboardType="numeric"
                placeholder="请输入沉降比"
                placeholderTextColor={colors.text}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>3号ao池沉降比</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.ao_pool_3_settling}
                onChangeText={(value) => updateField('ao_pool_3_settling', value)}
                keyboardType="numeric"
                placeholder="请输入沉降比"
                placeholderTextColor={colors.text}
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>其他参数</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>污泥压榨含水率 (%)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.water_content}
                onChangeText={(value) => updateField('water_content', value)}
                keyboardType="numeric"
                placeholder="请输入含水率"
                placeholderTextColor={colors.text}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>采样日期</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={sludgeData.time}
                onChangeText={(value) => updateField('time', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting || isCheckingDuplicate}
            >
              <Text style={styles.buttonText}>提交数据</Text>
            </TouchableOpacity>
          </View>

          {/* 加载提示 Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={loadingModalVisible}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.loadingModalView, { backgroundColor: colors.card }]}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 10 }} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {isCheckingDuplicate ? '检查数据...' : '正在提交...'}
                </Text>
              </View>
            </View>
          </Modal>
          
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
    padding: 16,
  },
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalView: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SludgeDataEntryScreen;