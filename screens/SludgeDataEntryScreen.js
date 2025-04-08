import React, { useState } from 'react';
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
  TouchableWithoutFeedback
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const SludgeDataEntryScreen = () => {
  const { colors } = useTheme();
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);
  const [collapsedSamples, setCollapsedSamples] = useState({});

  const [samples, setSamples] = useState([{
    id: Date.now(),
    sample_name: '',
    concentration: '',
    settling_ratio: '',
    water_content: '',
    time: new Date().toISOString().split('T')[0]
  }]);

  const toggleCollapse = (id) => {
    setCollapsedSamples(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isSampleCollapsed = (id) => {
    return !!collapsedSamples[id];
  };

  const addSample = () => {
    const newSample = {
      id: Date.now(),
      sample_name: '',
      concentration: '',
      settling_ratio: '',
      water_content: '',
      time: new Date().toISOString().split('T')[0]
    };
    setSamples([...samples, newSample]);
    // 默认展开新添加的样本
    setCollapsedSamples(prev => ({
      ...prev,
      [newSample.id]: false
    }));
  };

  const removeSample = (id) => {
    if (samples.length === 1) {
      Alert.alert('提示', '至少需要保留一条记录');
      return;
    }
    setSamples(samples.filter(sample => sample.id !== id));
    // 移除折叠状态
    const updatedCollapsedSamples = {...collapsedSamples};
    delete updatedCollapsedSamples[id];
    setCollapsedSamples(updatedCollapsedSamples);
  };

  const updateSample = (id, field, value) => {
    setSamples(samples.map(sample => {
      if (sample.id === id) {
        return { ...sample, [field]: value };
      }
      return sample;
    }));
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
    const isValid = samples.every(sample => {
      // 验证污泥样品名称是否填写
      if (!sample.sample_name) {
        Alert.alert('错误', '请输入污泥样品名称');
        return false;
      }

      // 验证数值的有效性
      if (sample.concentration && !validateNumber(sample.concentration, '污泥浓度')) return false;
      if (sample.settling_ratio && !validateNumber(sample.settling_ratio, '污泥沉降比')) return false;
      
      // 验证污泥压榨含水率是否在0-100%之间
      if (sample.water_content) {
        if (isNaN(sample.water_content) || sample.water_content < 0 || sample.water_content > 100) {
          Alert.alert('错误', '污泥压榨含水率必须在0-100%之间');
          return false;
        }
      }

      // 验证日期格式
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(sample.time)) {
        Alert.alert('错误', '请输入正确的日期格式 (YYYY-MM-DD)');
        return false;
      }

      return true;
    });

    if (!isValid) return;

    setIsSubmitting(true);
    setLoadingModalVisible(true);

    try {
      const formattedSamples = samples.map(sample => ({
        sampleName: sample.sample_name,
        concentration: sample.concentration,
        settlingRatio: sample.settling_ratio,
        waterContent: sample.water_content,
        testDate: sample.time
      }));

      const response = await fetch('https://nodered.jzz77.cn:9003/api/wuni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dbName: 'nodered',
            tableName: 'sludge_data',
            samples: formattedSamples
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
      const newSample = {
        id: Date.now(),
        sample_name: '',
        concentration: '',
        settling_ratio: '',
        water_content: '',
        time: new Date().toISOString().split('T')[0]
      };
      setSamples([newSample]);
      // 重置折叠状态
      setCollapsedSamples({ [newSample.id]: false });
    } catch (error) {
      console.error('提交失败:', error);
      Alert.alert('错误', error.message || '提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
      setLoadingModalVisible(false);
    }
  };

  const renderSampleSummary = (sample) => {
    return (
      <View style={[styles.sampleSummary, { borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.text }}>
          {sample.sample_name || '未命名样本'}{' '}
          {sample.sample_name && sample.concentration ? `| 浓度: ${sample.concentration} g/L` : ''}
          {sample.sample_name && sample.water_content ? ` | 含水率: ${sample.water_content}%` : ''}
        </Text>
      </View>
    );
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
          {samples.map((sample, index) => (
            <View key={sample.id} style={styles.sampleContainer}>
              <View style={styles.sampleHeader}>
                <View style={styles.headerLeftSection}>
                  <TouchableOpacity 
                    onPress={() => toggleCollapse(sample.id)}
                    style={styles.collapseButton}
                  >
                    <Ionicons 
                      name={isSampleCollapsed(sample.id) ? "chevron-down" : "chevron-up"} 
                      size={24} 
                      color={colors.text} 
                    />
                  </TouchableOpacity>
                  <Text style={[styles.sampleTitle, { color: colors.text }]}>
                    样本 {index + 1}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => removeSample(sample.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>删除</Text>
                </TouchableOpacity>
              </View>

              {isSampleCollapsed(sample.id) ? renderSampleSummary(sample) : (
                <View style={styles.sampleContent}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>污泥样品名称</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                        marginBottom: 16
                      }]}
                      value={sample.sample_name}
                      onChangeText={(value) => updateSample(sample.id, 'sample_name', value)}
                      placeholder="请输入污泥样品名称"
                      placeholderTextColor={colors.text}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>污泥浓度 (g/L)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.concentration}
                        onChangeText={(value) => updateSample(sample.id, 'concentration', value)}
                        keyboardType="numeric"
                        placeholder="污泥浓度"
                        placeholderTextColor={colors.text}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>污泥沉降比 (%)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.settling_ratio}
                        onChangeText={(value) => updateSample(sample.id, 'settling_ratio', value)}
                        keyboardType="numeric"
                        placeholder="污泥沉降比"
                        placeholderTextColor={colors.text}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>污泥压榨含水率 (%)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.water_content}
                        onChangeText={(value) => updateSample(sample.id, 'water_content', value)}
                        keyboardType="numeric"
                        placeholder="污泥压榨含水率"
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
                        value={sample.time}
                        onChangeText={(value) => updateSample(sample.id, 'time', value)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.text}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={addSample}
            >
              <Text style={styles.buttonText}>添加样本</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
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
                <Text style={[styles.loadingText, { color: colors.text }]}>正在提交...</Text>
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
  sampleContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapseButton: {
    padding: 5,
    marginRight: 8,
  },
  sampleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
  },
  sampleContent: {
    width: '100%',
  },
  sampleSummary: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%'
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
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