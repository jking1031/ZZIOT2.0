import React, { useState, useEffect } from 'react';
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
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SludgeDehydrationCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const [calculatorType, setCalculatorType] = useState('PAC'); // 'PAC', 'PAM', 'DOSING'
  
  // PAC 相关状态
  const [isContinuousFlow, setIsContinuousFlow] = useState(false);
  const [waterVolume, setWaterVolume] = useState(1000);
  const [effectiveContent, setEffectiveContent] = useState(26);
  const [targetConcentration, setTargetConcentration] = useState(10);

  // PAM 相关状态
  const [concentration, setConcentration] = useState(0.1);
  const [flowRate, setFlowRate] = useState(2000);
  const [pamRate, setPamRate] = useState(33.33);
  const [pamSolutionConcentration, setPamSolutionConcentration] = useState(10); // PAM溶液浓度，单位：%

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

  // 历史方案相关状态 - 分开存储三种不同的历史记录
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pacHistories, setPacHistories] = useState([]);
  const [pamHistories, setPamHistories] = useState([]);
  const [dosingHistories, setDosingHistories] = useState([]);
  const [schemeName, setSchemeName] = useState('');
  
  // 存储键名
  const pacHistoriesKey = 'pacHistories';
  const pamHistoriesKey = 'pamHistories';
  const dosingHistoriesKey = 'dosingHistories';
  
  // 加载保存的配置
  useEffect(() => {
    loadConfig();
    loadAllHistories();
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

  // 加载所有历史方案
  const loadAllHistories = async () => {
    try {
      // 加载PAC历史
      const savedPacHistories = await AsyncStorage.getItem(pacHistoriesKey);
      if (savedPacHistories) {
        setPacHistories(JSON.parse(savedPacHistories));
      }
      
      // 加载PAM历史
      const savedPamHistories = await AsyncStorage.getItem(pamHistoriesKey);
      if (savedPamHistories) {
        setPamHistories(JSON.parse(savedPamHistories));
      }
      
      // 加载药剂投加历史
      const savedDosingHistories = await AsyncStorage.getItem(dosingHistoriesKey);
      if (savedDosingHistories) {
        setDosingHistories(JSON.parse(savedDosingHistories));
      }
    } catch (error) {
      console.error('加载历史方案失败:', error);
    }
  };

  // 获取当前计算类型的历史记录和状态设置函数
  const getCurrentHistories = () => {
    switch (calculatorType) {
      case 'PAC':
        return { histories: pacHistories, setHistories: setPacHistories, storageKey: pacHistoriesKey };
      case 'PAM':
        return { histories: pamHistories, setHistories: setPamHistories, storageKey: pamHistoriesKey };
      case 'DOSING':
        return { histories: dosingHistories, setHistories: setDosingHistories, storageKey: dosingHistoriesKey };
      default:
        return { histories: [], setHistories: () => {}, storageKey: '' };
    }
  };

  // 保存当前方案
  const saveCurrentScheme = async () => {
    if (!schemeName.trim()) {
      Alert.alert('错误', '请输入方案名称');
      return;
    }

    const now = new Date();
    const dateString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 根据当前计算类型创建方案对象
    let newScheme = {
      id: Date.now().toString(),
      date: dateString,
      name: schemeName,
      calculationType: calculatorType,
    };

    // 根据计算类型添加相应的数据
    switch (calculatorType) {
      case 'PAC':
        newScheme = {
          ...newScheme,
          isContinuousFlow,
          waterVolume,
          effectiveContent,
          targetConcentration,
          results: {
            pacAmount: calculatePacAmount(),
          }
        };
        break;
      case 'PAM':
        newScheme = {
          ...newScheme,
          concentration,
          flowRate,
          pamRate,
          results: {
            pamRate,
          }
        };
        break;
      case 'DOSING':
        newScheme = {
          ...newScheme,
          tankConfig: { ...tankConfig },
          sludgeConcentration,
          pamConcentration,
          pamRatio,
          pacRatio,
          results: {
            drySludge: calculateDrySludge(),
            pamPowder: calculatePamPowder(),
            pamVolume: calculatePamVolume(),
            pacPowder: calculatePacPowder(),
            pacVolume: calculatePacVolume()
          }
        };
        break;
    }

    try {
      // 获取当前计算类型的历史记录和设置函数
      const { histories, setHistories, storageKey } = getCurrentHistories();
      
      let updatedHistories = [...histories, newScheme];
      // a限制最多保存50条记录
      if (updatedHistories.length > 50) {
        updatedHistories = updatedHistories.slice(updatedHistories.length - 50);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistories));
      setHistories(updatedHistories);
      setSchemeName('');
      Alert.alert('成功', '方案已保存');
    } catch (error) {
      console.error('保存方案失败:', error);
      Alert.alert('错误', '保存方案失败');
    }
  };

  // 加载选定的方案
  const loadScheme = (scheme) => {
    // 设置计算类型
    setCalculatorType(scheme.calculationType);
    
    // 根据计算类型加载相应的数据
    switch (scheme.calculationType) {
      case 'PAC':
        setIsContinuousFlow(scheme.isContinuousFlow);
        setWaterVolume(scheme.waterVolume);
        setEffectiveContent(scheme.effectiveContent);
        setTargetConcentration(scheme.targetConcentration);
        break;
      case 'PAM':
        setConcentration(scheme.concentration);
        setFlowRate(scheme.flowRate);
        break;
      case 'DOSING':
        // 设置罐体参数
        setTankConfig(scheme.tankConfig);
        // 设置药剂投加参数
        setSludgeConcentration(scheme.sludgeConcentration);
        setPamConcentration(scheme.pamConcentration);
        setPamRatio(scheme.pamRatio);
        setPacRatio(scheme.pacRatio);
        break;
    }
    
    setShowHistoryModal(false);
  };

  // 删除选定的方案
  const deleteScheme = async (id) => {
    try {
      const { histories, setHistories, storageKey } = getCurrentHistories();
      
      const updatedHistories = histories.filter(item => item.id !== id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistories));
      setHistories(updatedHistories);
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

  // PAM 计算函数
  const calculatePamRate = (conc, flow) => {
    const newPam = (conc * flow) / 6;
    setPamRate(parseFloat(newPam.toFixed(2)));
  };

  // 处理浓度变化
  const handleConcentrationChange = (value) => {
    let newValue = value;
    if (newValue < 0.1) newValue = 0.1;
    if (newValue > 0.5) newValue = 0.5;
    setConcentration(parseFloat(newValue.toFixed(2)));
    calculatePamRate(newValue, flowRate);
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

  // 处理流量变化
  const handleFlowRateChange = (value) => {
    let newValue = value;
    if (newValue > 2500) {
      Alert.alert("警告", "进水流量超出设备上限2500 L/H！");
      newValue = 2500;
    }
    setFlowRate(newValue);
    calculatePamRate(concentration, newValue);
  };

  // 增加流量
  const increaseFlowRate = () => {
    const newValue = flowRate + 100;
    handleFlowRateChange(newValue);
  };

  // 减少流量
  const decreaseFlowRate = () => {
    const newValue = flowRate - 100;
    handleFlowRateChange(newValue);
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
    const { histories } = getCurrentHistories();
    
    return (
      <Modal
        visible={showHistoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.historyModalContent, { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {calculatorType === 'PAC' ? 'PAC计算历史方案' : 
               calculatorType === 'PAM' ? 'PAM计算历史方案' : '药剂投加历史方案'}
            </Text>
            
            {histories.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>暂无保存的方案</Text>
            ) : (
              <FlatList
                data={histories.sort((a, b) => b.id - a.id)} // 按时间倒序排列
                keyExtractor={(item) => item.id}
                style={styles.historyList}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date}</Text>
                      <Text style={[styles.historyDetails, { color: colors.textSecondary }]}>
                        {calculatorType === 'DOSING' ? 
                          `污泥量: ${item.results.drySludge.toFixed(2)}kg, PAM: ${item.pamRatio}‰, PAC: ${item.pacRatio}%` :
                          calculatorType === 'PAC' ?
                          `PAC(${item.isContinuousFlow ? '流量' : '体积'}): ${item.waterVolume}L, 目标浓度: ${item.targetConcentration}%` :
                          `PAM: ${item.concentration}%, 流量: ${item.flowRate}L/H`
                        }
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
              style={[styles.modalButton, { backgroundColor: colors.border, marginTop: 15 }]}
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
      paddingBottom: 12,
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
    value: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
      marginTop: 10,
    },
    input: {
      height: 40,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ddd',
      borderRadius: 8,
      paddingHorizontal: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    },
    slider: {
      width: '100%',
      height: 40,
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
    typeSelector: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 12,
    },
    typeButton: {
      padding: 8,
      marginHorizontal: 5,
      borderRadius: 6,
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    sliderValueContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 5,
    },
    sliderValue: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    numberInput: {
      flex: 1,
      marginHorizontal: 10,
      textAlign: 'center',
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
    configButton: {
      padding: 5,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    configButtonText: {
      color: '#fff',
      fontSize: 14,
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    referenceText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    headerButtons: {
      flexDirection: 'row',
    },
    saveSchemeContainer: {
      marginTop: 20,
      marginBottom: 30,
      flexDirection: 'row',
      alignItems: 'center',
    },
    schemeNameInput: {
      flex: 1,
      height: 36,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      fontSize: 14,
      backgroundColor: isDarkMode ? '#222' : '#FFF',
    },
    saveButton: {
      marginLeft: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    historyModalContent: {
      width: '90%',
      maxHeight: '80%',
      padding: 16,
      borderRadius: 10,
      elevation: 5,
    },
    historyList: {
      maxHeight: 400,
    },
    historyItem: {
      flexDirection: 'row',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyInfo: {
      flex: 1,
    },
    historyName: {
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 2,
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
      marginLeft: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    historyButtonText: {
      color: '#fff',
      fontSize: 12,
    },
    emptyHistoryText: {
      textAlign: 'center',
      padding: 20,
    },
    bottomSafeArea: {
      backgroundColor: isDarkMode ? '#121212' : '#F5F5F7', 
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F5F5F7' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <Text style={styles.title}>污泥脱水计算器</Text>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: calculatorType === 'PAC' ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setCalculatorType('PAC')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: calculatorType === 'PAC' ? '#fff' : colors.text },
                ]}
              >
                PAC计算
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: calculatorType === 'PAM' ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setCalculatorType('PAM')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: calculatorType === 'PAM' ? '#fff' : colors.text },
                ]}
              >
                PAM计算
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: calculatorType === 'DOSING' ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setCalculatorType('DOSING')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: calculatorType === 'DOSING' ? '#fff' : colors.text },
                ]}
              >
                药剂投加
              </Text>
            </TouchableOpacity>
          </View>

          {calculatorType === 'PAC' ? (
            <>
              <View style={styles.section}>
                <View style={styles.configHeader}>
                  <Text style={styles.label}>
                    {isContinuousFlow ? '持续流量模式' : '固定水量模式'}
                  </Text>
                  <TouchableOpacity
                    style={styles.configButton}
                    onPress={() => setShowHistoryModal(true)}
                  >
                    <Text style={styles.configButtonText}>历史</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.switchContainer}>
                  <Switch
                    value={isContinuousFlow}
                    onValueChange={setIsContinuousFlow}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
                  />
                </View>

                <Text style={styles.label}>
                  {isContinuousFlow ? '进水流量（L/H）' : '清水体积（L）'}
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
                    editable={false}
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
                <Text style={styles.label}>PAC有效含量（%）</Text>
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
                    editable={false}
                  />
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={increaseEffectiveContent}
                  >
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.note}>范围：1% - 100%</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>目标浓度（%）</Text>
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
                    editable={false}
                  />
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={increaseTargetConcentration}
                  >
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.note}>范围：1% - 20%</Text>
              </View>

              <View style={styles.resultSection}>
                {isContinuousFlow ? (
                  <>
                    <Text style={styles.resultTitle}>计算结果</Text>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>每小时PAC用量：</Text>
                      <Text style={styles.resultValue}>{calculatePacAmount().toFixed(2)} kg/H</Text>
                    </View>
                    <Text style={styles.resultNote}>
                      每{waterVolume}L/H流量需投加{calculatePacAmount().toFixed(2)}kg/H PAC粉剂
                    </Text>
                    <Text style={styles.resultNote}>
                      （目标浓度{targetConcentration}%，有效含量{effectiveContent}%）
                    </Text>

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
                  </>
                ) : (
                  <>
                    <Text style={styles.resultTitle}>计算结果</Text>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>所需PAC用量：</Text>
                      <Text style={styles.resultValue}>{calculatePacAmount().toFixed(2)} kg</Text>
                    </View>
                    <Text style={styles.resultNote}>
                      每{waterVolume}L清水加{calculatePacAmount().toFixed(2)}kg PAC粉剂
                    </Text>
                    <Text style={styles.resultNote}>
                      （目标浓度{targetConcentration}%，有效含量{effectiveContent}%）
                    </Text>

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
                  </>
                )}
              </View>
            </>
          ) : calculatorType === 'PAM' ? (
            <>
              <View style={styles.section}>
                <View style={styles.configHeader}>
                  <Text style={styles.label}>PAM配置</Text>
                  <TouchableOpacity
                    style={styles.configButton}
                    onPress={() => setShowHistoryModal(true)}
                  >
                    <Text style={styles.configButtonText}>历史</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>目标浓度（%）</Text>
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
                    editable={false}
                  />
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={increaseConcentration}
                  >
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.note}>建议范围：0.1% - 0.5%</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>进水流量（L/H）</Text>
                <View style={styles.inputContainer}>
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={decreaseFlowRate}
                  >
                    <Text style={styles.buttonText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    keyboardType="numeric"
                    value={String(flowRate)}
                    editable={false}
                  />
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={increaseFlowRate}
                  >
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.warning}>最大流量限制：2500 L/H</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>PAM投加速度（g/min）</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(pamRate)}
                  editable={false}
                />
                <Text style={styles.warning}>安全阈值：≤500 g/min</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>计算公式</Text>
                <Text style={styles.note}>PAM投加速度 = (浓度 × 进水流量) / 6</Text>
                <Text style={styles.note}>进水流量 = (PAM投加速度 × 6) / 浓度</Text>
                <Text style={styles.note}>浓度 = (PAM投加速度 × 6) / 进水流量</Text>

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
          ) : (
            renderDosingCalculator()
          )}

          {renderConfigModal()}
          {renderHistoryModal()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SludgeDehydrationCalculatorScreen; 