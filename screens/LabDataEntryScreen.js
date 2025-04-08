import React, { useState } from 'react';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Animated
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LabDataEntryScreen = () => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSampleName, setTempSampleName] = useState('');
  const [currentSampleId, setCurrentSampleId] = useState(null);
  const [collapsedSamples, setCollapsedSamples] = useState({});

  const pickerSelectStyles = {
    inputIOS: {
      fontSize: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.text,
      borderRadius: 8,
      color: colors.text,
      backgroundColor: colors.card,
      paddingRight: 30
    },
    inputAndroid: {
      fontSize: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.text,
      borderRadius: 8,
      color: colors.text,
      backgroundColor: colors.card,
      paddingRight: 30
    },
    iconContainer: {
      top: 12,
      right: 10,
    }
  };
  const [showManualInput, setShowManualInput] = useState(false);
  const [samples, setSamples] = useState([{
    id: Date.now(),
    sample_name: '',
    cod: '',
    nh3: '',
    tn: '',
    tp: '',
    ph: '',
    ss: '',
    sw: '',
    time: new Date().toISOString().split('T')[0]
  }]);

  const sampleOptions = [
    '高铁厂进水',
    '高铁厂出水',
    '5000吨处进水',
    '5000吨出水',
    '西地亚进水',
    '西地亚出水',
    '亚琦进水',
    '亚琦出水',
    '殷庄进水',
    '殷庄出水'
  ];

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
      cod: '',
      nh3: '',
      tn: '',
      tp: '',
      ph: '',
      ss: '',
      sw: '',
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
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);

  const handleSubmit = async () => {
    // 验证数据
    const isValid = samples.every(sample => {
      // 只验证水样名称是否填写
      if (!sample.sample_name) {
        Alert.alert('错误', '请选择或输入水样名称');
        return false;
      }

      // 如果填写了数值，则验证其有效性
      if (sample.cod && !validateNumber(sample.cod, 'COD')) return false;
      if (sample.nh3 && !validateNumber(sample.nh3, '氨氮')) return false;
      if (sample.tn && !validateNumber(sample.tn, '总氮')) return false;
      if (sample.tp && !validateNumber(sample.tp, '总磷')) return false;
      if (sample.ss && !validateNumber(sample.ss, 'SS')) return false;
      
      // 如果填写了pH值，验证其范围
      if (sample.ph && (isNaN(sample.ph) || sample.ph < 0 || sample.ph > 14)) {
        Alert.alert('错误', 'pH值必须在0-14之间');
        return false;
      }

      // 如果填写了水温，验证其范围
      if (sample.sw && (isNaN(sample.sw) || sample.sw < 0 || sample.sw > 100)) {
        Alert.alert('错误', '水温必须在0-100℃之间');
        return false;
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
        cod: sample.cod,
        nh3: sample.nh3,
        tn: sample.tn,
        tp: sample.tp,
        ph: sample.ph,
        ss: sample.ss,
        sw: sample.sw,
        testDate: sample.time
      }));

      const response = await fetch('https://zziot.jzz77.cn:9003/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dbName: 'nodered',
            tableName: 'huayan_data',
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
        cod: '',
        nh3: '',
        tn: '',
        tp: '',
        ph: '',
        ss: '',
        sw: '',
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
          {sample.sample_name && sample.cod ? `| COD: ${sample.cod} mg/L` : ''}
          {sample.sample_name && sample.ph ? ` | pH: ${sample.ph}` : ''}
        </Text>
      </View>
    );
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
                    <Text style={[styles.label, { color: colors.text }]}>水样名称</Text>
                    <TextInput
                      style={[styles.input, { 
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                        marginBottom: 8
                      }]}
                      value={sample.sample_name}
                      editable={false}
                      placeholder="当前未选择水样"
                      placeholderTextColor={colors.text}
                    />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity 
                        style={[styles.sampleSelectButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setCurrentSampleId(sample.id);
                          setShowManualInput(false);
                          setModalVisible(true);
                        }}
                      >
                        <Text style={styles.buttonText}>选择水样名称</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.sampleSelectButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setCurrentSampleId(sample.id);
                          setShowManualInput(true);
                          setModalVisible(true);
                        }}
                      >
                        <Text style={styles.buttonText}>手动输入</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>COD (mg/L)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.cod}
                        onChangeText={(value) => updateSample(sample.id, 'cod', value)}
                        keyboardType="numeric"
                        placeholder="COD"
                        placeholderTextColor={colors.text}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>氨氮 (mg/L)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.nh3}
                        onChangeText={(value) => updateSample(sample.id, 'nh3', value)}
                        keyboardType="numeric"
                        placeholder="氨氮"
                        placeholderTextColor={colors.text}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>总氮 (mg/L)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.tn}
                        onChangeText={(value) => updateSample(sample.id, 'tn', value)}
                        keyboardType="numeric"
                        placeholder="总氮"
                        placeholderTextColor={colors.text}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>总磷 (mg/L)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.tp}
                        onChangeText={(value) => updateSample(sample.id, 'tp', value)}
                        keyboardType="numeric"
                        placeholder="总磷"
                        placeholderTextColor={colors.text}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>pH</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.ph}
                        onChangeText={(value) => updateSample(sample.id, 'ph', value)}
                        keyboardType="numeric"
                        placeholder="pH"
                        placeholderTextColor={colors.text}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>SS (mg/L)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.ss}
                        onChangeText={(value) => updateSample(sample.id, 'ss', value)}
                        keyboardType="numeric"
                        placeholder="SS"
                        placeholderTextColor={colors.text}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: colors.text }]}>水温 (℃)</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border
                        }]}
                        value={sample.sw}
                        onChangeText={(value) => updateSample(sample.id, 'sw', value)}
                        keyboardType="numeric"
                        placeholder="水温"
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
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalView, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {showManualInput ? '手动输入水样名称' : '选择水样名称'}
                </Text>
                {showManualInput ? (
                  <TextInput
                    style={[styles.modalInput, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border
                    }]}
                    value={tempSampleName}
                    onChangeText={setTempSampleName}
                    placeholder="请输入水样名称"
                    placeholderTextColor={colors.text}
                  />
                ) : (
                  <View style={styles.sampleButtonsGrid}>
                    {sampleOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.sampleButton, { borderColor: colors.border }]}
                        onPress={() => {
                          updateSample(currentSampleId, 'sample_name', option);
                          setModalVisible(false);
                        }}
                      >
                        <Text style={[styles.sampleButtonText, { color: colors.text }]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.modalButtons}>
                  {showManualInput && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonConfirm]}
                      onPress={() => {
                        if (tempSampleName.trim()) {
                          updateSample(currentSampleId, 'sample_name', tempSampleName.trim());
                          setModalVisible(false);
                          setTempSampleName('');
                        } else {
                          Alert.alert('提示', '请输入水样名称');
                        }
                      }}
                    >
                      <Text style={styles.modalButtonText}>确认</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setModalVisible(false);
                      setTempSampleName('');
                    }}
                  >
                    <Text style={styles.modalButtonText}>取消</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

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
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%'
  },
  sampleSelectButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#999',
  },
  modalButtonConfirm: {
    backgroundColor: '#4a90e2',
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    flex: 1,
    height: 40,
    marginRight: 8,
  },
  switchInputButton: {
    backgroundColor: '#4a90e2',
    padding: 8,
    borderRadius: 4,
  },
  switchInputText: {
    color: 'white',
    fontSize: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  sampleSelectButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center'
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
  sampleNameContainer: {
    marginBottom: 10
  },
  sampleButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    justifyContent: 'flex-start'
  },
  sampleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    margin: 4,
    minWidth: '30%',
    backgroundColor: 'transparent'
  },
  sampleButtonSelected: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2'
  },
  sampleButtonText: {
    fontSize: 13,
    textAlign: 'center'
  },
  sampleButtonTextSelected: {
    color: '#fff'
  },
  switchInputButton: {
    backgroundColor: '#4a90e2',
    padding: 6,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  switchInputText: {
    color: 'white',
    fontSize: 11
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

export default LabDataEntryScreen;