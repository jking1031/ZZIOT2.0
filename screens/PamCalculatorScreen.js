import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PamCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  
  // PAM 相关状态
  const [concentration, setConcentration] = useState(0.1);
  const [flowRate, setFlowRate] = useState(2000);
  const [pamRate, setPamRate] = useState(33.33);

  // 历史方案相关状态
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pamHistories, setPamHistories] = useState([]);
  const [schemeName, setSchemeName] = useState('');
  
  // 存储键名
  const pamHistoriesKey = 'pamHistories';
  
  // 添加ScrollView引用
  const scrollViewRef = useRef(null);
  
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    loadHistories();
  }, []);

  // 在组件挂载时计算初始PAM投加速度
  useEffect(() => {
    // 使用初始浓度和流量计算PAM投加速度
    calculatePamRate(concentration, flowRate);
  }, []);

  // 监听键盘显示事件，自动滚动到底部
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // 加载历史方案
  const loadHistories = async () => {
    try {
      setIsLoading(true);
      const savedPamHistories = await AsyncStorage.getItem(pamHistoriesKey);
      if (savedPamHistories) {
        setPamHistories(JSON.parse(savedPamHistories));
      }
    } catch (error) {
      console.error('加载历史方案失败:', error);
      Alert.alert('错误', '加载历史方案失败');
    } finally {
      setIsLoading(false);
    }
  };

  // PAM 计算函数
  const calculatePamRate = (conc, flow) => {
    // 公式：投加速度(g/min) = 溶液浓度(%) * 流量(L/h) / 6
    const newPam = (conc * flow) / 6;
    setPamRate(parseFloat(newPam.toFixed(2)));
    return parseFloat(newPam.toFixed(2));
  };

  // 处理浓度变化
  const handleConcentrationChange = (value) => {
    let newValue = value;
    if (newValue < 0.1) newValue = 0.1;
    if (newValue > 0.5) newValue = 0.5;
    newValue = parseFloat(newValue.toFixed(2));
    setConcentration(newValue);
    
    // 根据新的浓度和当前流量计算PAM投加速度
    calculatePamRate(newValue, flowRate);
  };

  // 处理流量变化
  const handleFlowRateChange = (value) => {
    let newValue = value;
    if (newValue < 0) newValue = 0;
    if (newValue > 2500) {
      Alert.alert("警告", "进水流量超出设备上限2500 L/H！");
      newValue = 2500;
    }
    newValue = parseFloat(newValue.toFixed(0));
    setFlowRate(newValue);
    
    // 根据新的流量和当前浓度计算PAM投加速度
    calculatePamRate(concentration, newValue);
  };

  // 处理PAM投加速度变化
  const handlePamRateChange = (value) => {
    let newValue = value;
    if (newValue < 0) newValue = 0;
    if (newValue > 500) {
      Alert.alert("警告", "PAM投加速度超出安全阈值500 g/min！");
      newValue = 500;
    }
    newValue = parseFloat(newValue.toFixed(2));
    setPamRate(newValue);
    
    // 根据PAM投加速度和当前浓度计算新的流量
    // 公式：流量(L/h) = 投加速度(g/min) * 6 / 浓度(%)
    const newFlowRate = (newValue * 6) / concentration;
    if (newFlowRate <= 2500) {
      setFlowRate(parseFloat(newFlowRate.toFixed(0)));
    } else {
      Alert.alert("警告", "计算出的进水流量超出设备上限2500 L/H！");
      setFlowRate(2500);
      // 流量已达到上限，根据最大流量重新计算投加速度
      calculatePamRate(concentration, 2500);
    }
  };

  // 增加浓度
  const increaseConcentration = () => {
    const newValue = concentration + 0.05;
    handleConcentrationChange(newValue);
  };

  // 减少浓度
  const decreaseConcentration = () => {
    const newValue = concentration - 0.05;
    handleConcentrationChange(newValue);
  };

  // 增加PAM投加速度
  const increasePamRate = () => {
    const newValue = pamRate + 5;
    handlePamRateChange(newValue);
  };

  // 减少PAM投加速度
  const decreasePamRate = () => {
    const newValue = Math.max(0, pamRate - 5);
    handlePamRateChange(newValue);
  };

  // 保存当前方案
  const saveCurrentScheme = async () => {
    if (!schemeName.trim()) {
      Alert.alert('错误', '请输入方案名称');
      return;
    }

    try {
      setIsLoading(true);
      const now = new Date();
      const dateString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 创建方案对象
      const newScheme = {
        id: Date.now().toString(),
        date: dateString,
        name: schemeName,
        concentration,
        flowRate,
        pamRate,
        results: {
          pamRate,
        }
      };
      
      let updatedHistories = [...pamHistories, newScheme];
      // 限制最多保存50条记录
      if (updatedHistories.length > 50) {
        updatedHistories = updatedHistories.slice(updatedHistories.length - 50);
      }
      
      await AsyncStorage.setItem(pamHistoriesKey, JSON.stringify(updatedHistories));
      setPamHistories(updatedHistories);
      setSchemeName('');
      Alert.alert('成功', '方案已保存');
    } catch (error) {
      console.error('保存方案失败:', error);
      Alert.alert('错误', '保存方案失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载选定的方案
  const loadScheme = (scheme) => {
    try {
      // 验证方案数据完整性
      if (typeof scheme.concentration !== 'number' || typeof scheme.flowRate !== 'number') {
        Alert.alert('错误', 'PAM方案数据不完整');
        return;
      }
      
      setConcentration(scheme.concentration);
      setFlowRate(scheme.flowRate);
      setPamRate(scheme.pamRate);
      
      setShowHistoryModal(false);
    } catch (error) {
      console.error('加载方案失败:', error);
      Alert.alert('错误', '加载方案失败');
    }
  };

  // 删除选定的方案
  const deleteScheme = async (id) => {
    try {
      const updatedHistories = pamHistories.filter(item => item.id !== id);
      await AsyncStorage.setItem(pamHistoriesKey, JSON.stringify(updatedHistories));
      setPamHistories(updatedHistories);
    } catch (error) {
      console.error('删除方案失败:', error);
      Alert.alert('错误', '删除方案失败');
    }
  };

  // 渲染历史方案选择模态窗口
  const renderHistoryModal = () => {
    return (
      <Modal
        visible={showHistoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.historyModalContent, { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              PAM计算历史方案
            </Text>
            
            {pamHistories.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>暂无保存的方案</Text>
            ) : (
              <FlatList
                data={pamHistories.sort((a, b) => b.id - a.id)} // 按时间倒序排列
                keyExtractor={(item) => item.id}
                style={styles.historyList}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date}</Text>
                      <Text style={[styles.historyDetails, { color: colors.textSecondary }]}>
                        PAM: {item.concentration}%, 流量: {item.flowRate}L/H
                      </Text>
                    </View>
                    <View style={styles.historyActions}>
                      <TouchableOpacity 
                        style={[styles.historyButton, { backgroundColor: colors.primary }]}
                        onPress={() => loadScheme(item)}
                      >
                        <Text style={styles.historyButtonText}>加载</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.historyButton, { backgroundColor: '#FF4444' }]}
                        onPress={() => deleteScheme(item.id)}
                      >
                        <Text style={styles.historyButtonText}>删除</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => setShowHistoryModal(false)}
            >
              <Text style={styles.modalButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // 渲染PAM计算器
  const renderPamCalculator = () => {
    return (
      <View style={styles.section}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>PAM溶液浓度 (%)</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={decreaseConcentration}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(concentration)}
              onChangeText={(value) => {
                if (!isNaN(parseFloat(value))) {
                  handleConcentrationChange(parseFloat(value));
                }
              }}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={increaseConcentration}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>进水流量 (L/H)</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => handleFlowRateChange(Math.max(0, flowRate - 100))}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(flowRate)}
              onChangeText={(value) => {
                if (!isNaN(parseFloat(value))) {
                  handleFlowRateChange(parseFloat(value));
                }
              }}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => handleFlowRateChange(flowRate + 100)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>PAM投加速度 (g/min)</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={decreasePamRate}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(pamRate)}
              editable={false}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={increasePamRate}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>计算公式: PAM投加速度(g/min) = 溶液浓度(%) × 流量(L/h) ÷ 6</Text>
        </View>

        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>计算结果</Text>
          <View style={styles.resultItemGroup}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>PAM溶液浓度：</Text>
              <Text style={styles.resultValue}>{concentration}%</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>进水流量：</Text>
              <Text style={styles.resultValue}>{flowRate} L/H</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>PAM投加速度：</Text>
              <Text style={styles.resultValue}>{pamRate} g/min</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>每小时PAM用量：</Text>
              <Text style={styles.resultValue}>{(pamRate * 60 / 1000).toFixed(2)} kg/h</Text>
            </View>
          </View>
        </View>

        <View style={styles.saveSchemeContainer}>
          <TextInput
            style={[styles.schemeNameInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="输入方案名称以保存"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
            value={schemeName}
            onChangeText={setSchemeName}
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={saveCurrentScheme}
          >
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, marginLeft: 8 }]}
            onPress={() => setShowHistoryModal(true)}
          >
            <Text style={styles.saveButtonText}>历史</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    // 样式与原SludgeDehydrationCalculatorScreen中相同
    container: {
      flex: 1,
      padding: 12,
      backgroundColor: isDarkMode ? '#121212' : '#F5F5F7',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      color: colors.text,
      textAlign: 'center',
    },
    section: {
      marginBottom: 15,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      padding: 12,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: isDarkMode ? 3 : 1,
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      color: colors.text,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      width: '100%',
    },
    input: {
      width: 80,
      height: 40,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd',
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
      textAlign: 'center',
    },
    numberInput: {
      flex: 1,
      marginHorizontal: 10,
      textAlign: 'center',
    },
    button: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    resultSection: {
      marginTop: 15,
      padding: 12,
      backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(232, 245, 233, 0.9)',
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 3,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 10,
      textAlign: 'center',
    },
    resultItemGroup: {
      marginBottom: 10,
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
      paddingHorizontal: 2,
    },
    resultLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    resultValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
      minWidth: 80,
      textAlign: 'right',
    },
    saveSchemeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      padding: 12,
      backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(232, 245, 233, 0.9)',
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 3,
    },
    schemeNameInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginRight: 8,
      fontSize: 14,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    },
    saveButton: {
      paddingHorizontal: 16,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    historyModalContent: {
      width: '90%',
      maxHeight: '80%',
      padding: 20,
      borderRadius: 12,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    historyList: {
      marginBottom: 16,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      marginBottom: 8,
      backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(232, 245, 233, 0.9)',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    historyInfo: {
      flex: 1,
      marginRight: 12,
    },
    historyName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    historyDate: {
      fontSize: 12,
      marginBottom: 4,
    },
    historyDetails: {
      fontSize: 12,
    },
    historyActions: {
      flexDirection: 'row',
    },
    historyButton: {
      paddingHorizontal: 12,
      height: 32,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    historyButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
    },
    emptyHistoryText: {
      textAlign: 'center',
      fontSize: 14,
      marginVertical: 20,
    },
    modalButton: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    note: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F5F5F7' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 30}
        enabled
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
        >

          {renderPamCalculator()}
          {renderHistoryModal()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PamCalculatorScreen;