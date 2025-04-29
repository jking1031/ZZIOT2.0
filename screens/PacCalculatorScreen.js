import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PacCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  
  // PAC 相关状态
  const [isContinuousFlow, setIsContinuousFlow] = useState(false);
  const [waterVolume, setWaterVolume] = useState(1000);
  const [effectiveContent, setEffectiveContent] = useState(26);
  const [targetConcentration, setTargetConcentration] = useState(10);

  // 历史方案相关状态
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pacHistories, setPacHistories] = useState([]);
  const [schemeName, setSchemeName] = useState('');
  
  // 存储键名
  const pacHistoriesKey = 'pacHistories';
  
  // 添加ScrollView引用
  const scrollViewRef = useRef(null);
  
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    loadHistories();
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

  // 加载所有历史方案
  const loadHistories = async () => {
    try {
      setIsLoading(true);
      const savedPacHistories = await AsyncStorage.getItem(pacHistoriesKey);
      if (savedPacHistories) {
        setPacHistories(JSON.parse(savedPacHistories));
      }
    } catch (error) {
      console.error('加载历史方案失败:', error);
      Alert.alert('错误', '加载历史方案失败');
    } finally {
      setIsLoading(false);
    }
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
        isContinuousFlow,
        waterVolume,
        effectiveContent,
        targetConcentration,
        results: {
          pacAmount: calculatePacAmount(),
        }
      };
      
      let updatedHistories = [...pacHistories, newScheme];
      // 限制最多保存50条记录
      if (updatedHistories.length > 50) {
        updatedHistories = updatedHistories.slice(updatedHistories.length - 50);
      }
      
      await AsyncStorage.setItem(pacHistoriesKey, JSON.stringify(updatedHistories));
      setPacHistories(updatedHistories);
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
      if (typeof scheme.waterVolume !== 'number' || typeof scheme.effectiveContent !== 'number') {
        Alert.alert('错误', 'PAC方案数据不完整');
        return;
      }
      
      setIsContinuousFlow(scheme.isContinuousFlow);
      setWaterVolume(scheme.waterVolume);
      setEffectiveContent(scheme.effectiveContent);
      setTargetConcentration(scheme.targetConcentration);
      
      setShowHistoryModal(false);
    } catch (error) {
      console.error('加载方案失败:', error);
      Alert.alert('错误', '加载方案失败');
    }
  };

  // 删除选定的方案
  const deleteScheme = async (id) => {
    try {
      const updatedHistories = pacHistories.filter(item => item.id !== id);
      await AsyncStorage.setItem(pacHistoriesKey, JSON.stringify(updatedHistories));
      setPacHistories(updatedHistories);
    } catch (error) {
      console.error('删除方案失败:', error);
      Alert.alert('错误', '删除方案失败');
    }
  };

  // PAC 计算函数
  const calculatePacAmount = () => {
    return (waterVolume * targetConcentration) / effectiveContent;
  };

  const calculateHourlyPac = () => {
    if (!isContinuousFlow) return 0;
    return calculatePacAmount();
  };

  const calculateFixedPac = () => {
    if (isContinuousFlow) return 0;
    return calculatePacAmount();
  };

  // 处理水量变化
  const handleWaterVolumeChange = (value) => {
    setWaterVolume(value);
  };

  // 处理有效含量变化
  const handleEffectiveContentChange = (value) => {
    setEffectiveContent(value);
  };

  // 处理目标浓度变化
  const handleTargetConcentrationChange = (value) => {
    let newValue = value;
    if (newValue < 1) newValue = 1;
    if (newValue > 20) newValue = 20;
    setTargetConcentration(parseFloat(newValue.toFixed(1)));
  };

  // 增加水量
  const increaseWaterVolume = () => {
    const newValue = waterVolume + 100;
    handleWaterVolumeChange(newValue);
  };

  // 减少水量
  const decreaseWaterVolume = () => {
    const newValue = waterVolume - 100;
    if (newValue > 0) {
      handleWaterVolumeChange(newValue);
    }
  };

  // 增加有效含量
  const increaseEffectiveContent = () => {
    const newValue = effectiveContent + 1;
    if (newValue <= 100) {
      handleEffectiveContentChange(newValue);
    }
  };

  // 减少有效含量
  const decreaseEffectiveContent = () => {
    const newValue = effectiveContent - 1;
    if (newValue >= 1) {
      handleEffectiveContentChange(newValue);
    }
  };

  // 增加目标浓度
  const increaseTargetConcentration = () => {
    const newValue = targetConcentration + 1;
    handleTargetConcentrationChange(newValue);
  };

  // 减少目标浓度
  const decreaseTargetConcentration = () => {
    const newValue = targetConcentration - 1;
    handleTargetConcentrationChange(newValue);
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
              PAC计算历史方案
            </Text>
            
            {pacHistories.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>暂无保存的方案</Text>
            ) : (
              <FlatList
                data={pacHistories.sort((a, b) => b.id - a.id)} // 按时间倒序排列
                keyExtractor={(item) => item.id}
                style={styles.historyList}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date}</Text>
                      <Text style={[styles.historyDetails, { color: colors.textSecondary }]}>
                        PAC({item.isContinuousFlow ? '流量' : '体积'}): {item.waterVolume}L, 目标浓度: {item.targetConcentration}%
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

  // 渲染PAC计算器
  const renderPacCalculator = () => {
    return (
      <View style={styles.section}>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>
            {isContinuousFlow ? '持续流量模式' : '固定水量模式'}
          </Text>
          <Switch
            value={isContinuousFlow}
            onValueChange={setIsContinuousFlow}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isDarkMode ? '#fff' : '#fff'}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {isContinuousFlow ? '流量 (m³/h)' : '水量 (m³)'}
          </Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={decreaseWaterVolume}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(waterVolume)}
              onChangeText={(value) => handleWaterVolumeChange(parseFloat(value) || 0)}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={increaseWaterVolume}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>PAC有效含量 (%)</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={decreaseEffectiveContent}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(effectiveContent)}
              onChangeText={(value) => handleEffectiveContentChange(parseFloat(value) || 0)}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={increaseEffectiveContent}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>目标浓度 (%)</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={decreaseTargetConcentration}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(targetConcentration)}
              onChangeText={(value) => handleTargetConcentrationChange(parseFloat(value) || 0)}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={increaseTargetConcentration}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>计算结果</Text>
          <View style={styles.resultItemGroup}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>目标浓度：</Text>
              <Text style={styles.resultValue}>{targetConcentration}%</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>有效含量：</Text>
              <Text style={styles.resultValue}>{effectiveContent}%</Text>
            </View>
            {isContinuousFlow ? (
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>每小时PAC用量：</Text>
                <Text style={styles.resultValue}>{calculateHourlyPac().toFixed(2)} kg</Text>
              </View>
            ) : (
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>总PAC用量：</Text>
                <Text style={styles.resultValue}>{calculateFixedPac().toFixed(2)} kg</Text>
              </View>
            )}
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
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>{isLoading ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, marginLeft: 8 }]}
            onPress={() => setShowHistoryModal(true)}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>历史</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
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
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    switchLabel: {
      fontSize: 16,
      color: colors.text,
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

          {renderPacCalculator()}
          {renderHistoryModal()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PacCalculatorScreen; 