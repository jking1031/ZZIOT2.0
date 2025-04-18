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
    try {
      const response = await fetch(`https://nodered.jzz77.cn:9003/api/wunidata/query?dbName=nodered&tableName=sludge_data&date=${date}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('查询失败');
      }

      const data = await response.json();
      return data && data.length > 0;
    } catch (error) {
      console.error('检查重复数据失败:', error);
      return false;
    } finally {
      setIsCheckingDuplicate(false);
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
    // 验证数据
    // 验证浓度字段
    if (!validateNumber(sludgeData.ao_pool_1, '1号ao池')) return;
    if (!validateNumber(sludgeData.ao_pool_2, '2号ao池')) return;
    if (!validateNumber(sludgeData.ao_pool_3, '3号ao池')) return;
    
    // 验证沉降比字段
    if (!validateNumber(sludgeData.ao_pool_1_settling, '1号ao池沉降比')) return;
    if (!validateNumber(sludgeData.ao_pool_2_settling, '2号ao池沉降比')) return;
    if (!validateNumber(sludgeData.ao_pool_3_settling, '3号ao池沉降比')) return;
    
    // 验证污泥压榨含水率是否在0-100%之间
    if (sludgeData.water_content) {
      if (isNaN(sludgeData.water_content) || sludgeData.water_content < 0 || sludgeData.water_content > 100) {
        Alert.alert('错误', '污泥压榨含水率必须在0-100%之间');
        return;
      }
    }

    // 验证日期格式
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(sludgeData.time)) {
      Alert.alert('错误', '请输入正确的日期格式 (YYYY-MM-DD)');
      return;
    }

    // 检查是否存在重复数据
    setLoadingModalVisible(true);
    const hasExistingData = await checkExistingData(sludgeData.time);
    
    if (hasExistingData) {
      setLoadingModalVisible(false);
      Alert.alert(
        '数据已存在',
        `${sludgeData.time} 的数据已存在，不允许重复提交`
      );
      return;
    }
    
    submitData();
  };

  const submitData = async () => {
    setIsSubmitting(true);
    setLoadingModalVisible(true);

    try {
      // 转换为服务器需要的格式
      const samples = [
        {
          sampleName: "1号ao池",
          concentration: sludgeData.ao_pool_1,
          settlingRatio: sludgeData.ao_pool_1_settling,
          testDate: sludgeData.time
        },
        {
          sampleName: "2号ao池",
          concentration: sludgeData.ao_pool_2,
          settlingRatio: sludgeData.ao_pool_2_settling,
          testDate: sludgeData.time
        },
        {
          sampleName: "3号ao池",
          concentration: sludgeData.ao_pool_3,
          settlingRatio: sludgeData.ao_pool_3_settling,
          testDate: sludgeData.time
        },
        {
          sampleName: "污泥压榨含水率",
          waterContent: sludgeData.water_content,
          testDate: sludgeData.time
        }
      ];

      const response = await fetch('https://nodered.jzz77.cn:9003/api/wuni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dbName: 'nodered',
            tableName: 'sludge_data',
            samples: samples
        })
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error('服务器返回了非JSON格式的响应：' + text);
      }

      if (!response.ok) {
        throw new Error(data.error || '提交失败');
      }

      setLoadingModalVisible(false);
      Alert.alert('成功', '数据已成功提交');
      // 重置表单
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
    } catch (error) {
      console.error('提交失败:', error);
      Alert.alert('错误', error.message || '提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
      setLoadingModalVisible(false);
    }
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