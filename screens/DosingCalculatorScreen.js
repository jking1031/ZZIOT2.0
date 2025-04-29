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

const DosingCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  
  // 药剂投加相关状态
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tankConfig, setTankConfig] = useState({
    diameter: 3.2,
    maxLevel: 2.6,
    minLevel: 0.8,
  });
  const [sludgeConcentration, setSludgeConcentration] = useState(10000); // 污泥浓度，单位：mg/L
  const [pamConcentration, setPamConcentration] = useState(0.1); // PAM溶液浓度，单位：%
  const [pamRatio, setPamRatio] = useState(2); // PAM投加比例，单位：‰ (千分比)
  const [pacRatio, setPacRatio] = useState(8); // PAC投加比例，单位：%

  // 历史方案相关状态
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [dosingHistories, setDosingHistories] = useState([]);
  const [schemeName, setSchemeName] = useState('');
  
  // 存储键名
  const dosingHistoriesKey = 'dosingHistories';
  
  // 添加ScrollView引用
  const scrollViewRef = useRef(null);
  
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    loadConfig();
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

  const loadConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('tankConfig');
      if (savedConfig) {
        setTankConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const saveConfig = async () => {
    try {
      await AsyncStorage.setItem('tankConfig', JSON.stringify(tankConfig));
      setShowConfigModal(false);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  // 加载历史方案
  const loadHistories = async () => {
    try {
      setIsLoading(true);
      const savedDosingHistories = await AsyncStorage.getItem(dosingHistoriesKey);
      if (savedDosingHistories) {
        setDosingHistories(JSON.parse(savedDosingHistories));
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
        tankConfig,
        sludgeConcentration,
        pamConcentration,
        pamRatio,
        pacRatio,
        results: {
          drySludge: calculateDrySludge(),
          pamPowder: calculatePamPowder(),
          pacPowder: calculatePacPowder(),
        }
      };
      
      let updatedHistories = [...dosingHistories, newScheme];
      // 限制最多保存50条记录
      if (updatedHistories.length > 50) {
        updatedHistories = updatedHistories.slice(updatedHistories.length - 50);
      }
      
      await AsyncStorage.setItem(dosingHistoriesKey, JSON.stringify(updatedHistories));
      setDosingHistories(updatedHistories);
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
      if (!scheme.tankConfig || typeof scheme.sludgeConcentration !== 'number') {
        Alert.alert('错误', '药剂投加方案数据不完整');
        return;
      }
      
      setTankConfig(scheme.tankConfig);
      setSludgeConcentration(scheme.sludgeConcentration);
      setPamConcentration(scheme.pamConcentration);
      setPamRatio(scheme.pamRatio);
      setPacRatio(scheme.pacRatio);
      
      setShowHistoryModal(false);
    } catch (error) {
      console.error('加载方案失败:', error);
      Alert.alert('错误', '加载方案失败');
    }
  };

  // 删除选定的方案
  const deleteScheme = async (id) => {
    try {
      const updatedHistories = dosingHistories.filter(item => item.id !== id);
      await AsyncStorage.setItem(dosingHistoriesKey, JSON.stringify(updatedHistories));
      setDosingHistories(updatedHistories);
    } catch (error) {
      console.error('删除方案失败:', error);
      Alert.alert('错误', '删除方案失败');
    }
  };

  // 计算污泥体积（m³）
  const calculateSludgeVolume = () => {
    const radius = tankConfig.diameter / 2;
    const height = tankConfig.maxLevel - tankConfig.minLevel;
    return Math.PI * radius * radius * height;
  };

  // 计算绝干污泥量（kg）
  const calculateDrySludge = () => {
    const volume = calculateSludgeVolume();
    return (volume * sludgeConcentration) / 1000; // 将mg/L转换为kg
  };

  // 计算PAM溶液投加量（L）
  const calculatePamVolume = () => {
    const drySludge = calculateDrySludge();
    // pamRatio是‰(千分比)，pamConcentration是%(百分比)
    // 1‰ = 0.001，直接乘以千分比值
    return (drySludge * pamRatio / 1000) / pamConcentration * 100;
  };

  // 计算PAM干粉量（kg）
  const calculatePamPowder = () => {
    const drySludge = calculateDrySludge();
    // 1‰ = 0.001
    return drySludge * pamRatio / 1000;
  };

  // 计算PAC溶液投加量（L）
  const calculatePacVolume = () => {
    const drySludge = calculateDrySludge();
    return (drySludge * pacRatio / 100) / 0.10; // 10%溶液
  };

  // 计算PAC干粉量（kg）
  const calculatePacPowder = () => {
    const drySludge = calculateDrySludge();
    return (drySludge * pacRatio / 100) / 0.26; // 26%干粉
  };

  // 验证污泥浓度
  const validateSludgeConcentration = (value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return false;
    return numValue >= 5000 && numValue <= 15000;
  };

  // 验证罐体容积
  const validateTankVolume = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    return numValue >= 1 && numValue <= 20;
  };

  // 处理PAM投加比例变化
  const handlePamRatioChange = (value) => {
    let newValue = value;
    if (newValue < 1.5) newValue = 1.5;
    if (newValue > 3) newValue = 3;
    setPamRatio(parseFloat(newValue.toFixed(1)));
  };

  // 增加PAM投加比例
  const increasePamRatio = () => {
    const newValue = parseFloat((pamRatio + 0.1).toFixed(1));
    handlePamRatioChange(newValue);
  };

  // 减少PAM投加比例
  const decreasePamRatio = () => {
    const newValue = parseFloat((pamRatio - 0.1).toFixed(1));
    handlePamRatioChange(newValue);
  };

  // 渲染配置模态窗口
  const renderConfigModal = () => (
    <Modal
      visible={showConfigModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>储泥罐参数配置</Text>
          
          <View style={styles.configItem}>
            <Text style={[styles.configLabel, { color: colors.text }]}>罐体直径（m）</Text>
            <TextInput
              style={[styles.configInput, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={String(tankConfig.diameter)}
              onChangeText={(text) => setTankConfig({ ...tankConfig, diameter: parseFloat(text) || 0 })}
            />
          </View>

          <View style={styles.configItem}>
            <Text style={[styles.configLabel, { color: colors.text }]}>最高液位（m）</Text>
            <TextInput
              style={[styles.configInput, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={String(tankConfig.maxLevel)}
              onChangeText={(text) => setTankConfig({ ...tankConfig, maxLevel: parseFloat(text) || 0 })}
            />
          </View>

          <View style={styles.configItem}>
            <Text style={[styles.configLabel, { color: colors.text }]}>最低液位（m）</Text>
            <TextInput
              style={[styles.configInput, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={String(tankConfig.minLevel)}
              onChangeText={(text) => setTankConfig({ ...tankConfig, minLevel: parseFloat(text) || 0 })}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={saveConfig}
            >
              <Text style={styles.modalButtonText}>保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => setShowConfigModal(false)}
            >
              <Text style={styles.modalButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
              药剂投加历史方案
            </Text>
            
            {dosingHistories.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>暂无保存的方案</Text>
            ) : (
              <FlatList
                data={dosingHistories.sort((a, b) => b.id - a.id)} // 按时间倒序排列
                keyExtractor={(item) => item.id}
                style={styles.historyList}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date}</Text>
                      <Text style={[styles.historyDetails, { color: colors.textSecondary }]}>
                        污泥量: {item.results.drySludge.toFixed(2)}kg, PAM: {item.pamRatio}‰, PAC: {item.pacRatio}%
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

  // 渲染药剂投加计算界面
  const renderDosingCalculator = () => (
    <>
      <View style={styles.section}>
        <View style={styles.configHeader}>
          <Text style={styles.label}>储泥罐参数</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.configButton}
              onPress={() => setShowHistoryModal(true)}
            >
              <Text style={styles.configButtonText}>历史</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.configButton, { marginLeft: 8 }]}
              onPress={() => setShowConfigModal(true)}
            >
              <Text style={styles.configButtonText}>配置</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tankInfo}>
          <Text style={styles.tankInfoText}>直径: {tankConfig.diameter}m</Text>
          <Text style={styles.tankInfoText}>最高液位: {tankConfig.maxLevel}m</Text>
          <Text style={styles.tankInfoText}>最低液位: {tankConfig.minLevel}m</Text>
          <Text style={styles.tankInfoText}>有效容积: {calculateSludgeVolume().toFixed(2)}m³</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>污泥浓度（mg/L）</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => {
              const newValue = Math.max(5000, sludgeConcentration - 1000);
              if (validateSludgeConcentration(newValue)) {
                setSludgeConcentration(newValue);
              }
            }}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.numberInput]}
            keyboardType="numeric"
            value={String(sludgeConcentration)}
            editable={false}
          />
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => {
              const newValue = Math.min(15000, sludgeConcentration + 1000);
              if (validateSludgeConcentration(newValue)) {
                setSludgeConcentration(newValue);
              }
            }}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>建议范围：5000 - 15000 mg/L</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>PAM溶液浓度（%）</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setPamConcentration(Math.max(0.1, pamConcentration - 0.1))}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.numberInput]}
            keyboardType="numeric"
            value={String(pamConcentration)}
            editable={false}
          />
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setPamConcentration(Math.min(0.3, pamConcentration + 0.1))}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>建议范围：0.1% - 0.3%</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>PAM投加比例（‰）</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={decreasePamRatio}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.numberInput]}
            keyboardType="numeric"
            value={String(pamRatio)}
            editable={false}
          />
          <TouchableOpacity 
            style={styles.button} 
            onPress={increasePamRatio}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>建议范围：1.5‰ - 3‰ (1.5-3 kg/吨干泥)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>PAC投加比例（%）</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setPacRatio(Math.max(8, pacRatio - 0.5))}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.numberInput]}
            keyboardType="numeric"
            value={String(pacRatio)}
            editable={false}
          />
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setPacRatio(Math.min(10, pacRatio + 0.5))}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>厂家建议：8% - 10%（干固体量）</Text>
      </View>

      

      <View style={styles.resultSection}>
        <Text style={styles.resultTitle}>计算结果</Text>
        <View style={styles.resultItemGroup}>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>绝干污泥量：</Text>
            <Text style={styles.resultValue}>{calculateDrySludge().toFixed(2)} kg</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>PAM干粉需求：</Text>
            <Text style={styles.resultValue}>
              {calculatePamPowder() < 1 
                ? `${(calculatePamPowder() * 1000).toFixed(0)} g`
                : `${calculatePamPowder().toFixed(3)} kg`}
            </Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>PAM溶液投加量：</Text>
            <Text style={styles.resultValue}>{calculatePamVolume().toFixed(2)} L</Text>
          </View>
        </View>
        
        <View style={styles.resultDivider} />
        
        <View style={styles.resultItemGroup}>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>PAC干粉需求：</Text>
            <Text style={styles.resultValue}>{calculatePacPowder().toFixed(2)} kg</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>PAC溶液投加量：</Text>
            <Text style={styles.resultValue}>{calculatePacVolume().toFixed(2)} L</Text>
          </View>
        </View>
        
        <View style={styles.resultNoteContainer}>
          <Text style={styles.resultNote}>
            污泥浓度: {sludgeConcentration}mg/L
          </Text>
          <Text style={styles.resultNote}>
            PAM: {pamConcentration}% 溶液，{pamRatio}‰ 投加比例
          </Text>
          <Text style={styles.resultNote}>
            PAC: {pacRatio}% 投加比例，10% 溶液
          </Text>
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
        </View>
      </View>
    </>
  );

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
    note: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 3,
      fontStyle: 'italic',
    },
    warning: {
      fontSize: 14,
      color: '#FF4444',
      marginTop: 5,
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
    resultDivider: {
      height: 1,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      marginVertical: 8,
    },
    resultNoteContainer: {
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
      padding: 8,
      borderRadius: 6,
      marginTop: 8,
    },
    resultNote: {
      fontSize: 12,
      color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
      marginBottom: 2,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '80%',
      padding: 20,
      borderRadius: 10,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    configItem: {
      marginBottom: 15,
    },
    configLabel: {
      fontSize: 16,
      marginBottom: 5,
    },
    configInput: {
      height: 40,
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 20,
    },
    modalButton: {
      padding: 10,
      borderRadius: 5,
      minWidth: 100,
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    configHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    configButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    configButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    tankInfo: {
      backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
      padding: 10,
      borderRadius: 5,
    },
    tankInfoText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 5,
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
    historyModalContent: {
      width: '90%',
      maxHeight: '80%',
      padding: 20,
      borderRadius: 12,
      elevation: 5,
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

          {renderDosingCalculator()}
          {renderConfigModal()}
          {renderHistoryModal()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DosingCalculatorScreen;
