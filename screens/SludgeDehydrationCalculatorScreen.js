import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SludgeDehydrationCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const [calculatorType, setCalculatorType] = useState('PAC'); // 'PAC', 'PAM', 'DOSING', 'EXCESS_SLUDGE'
  
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
  const [excessSludgeHistories, setExcessSludgeHistories] = useState([]);
  const [schemeName, setSchemeName] = useState('');
  
  // 存储键名
  const pacHistoriesKey = 'pacHistories';
  const pamHistoriesKey = 'pamHistories';
  const dosingHistoriesKey = 'dosingHistories';
  const excessSludgeHistoriesKey = 'excessSludgeHistories';
  
  // 添加ScrollView引用
  const scrollViewRef = useRef(null);
  
  // 剩余污泥计算相关状态
  const [excessSludgeParams, setExcessSludgeParams] = useState({
    sludgeConcentration: 7000, // MLSS mg/L
    tankVolume: 4800, // m³
    sv30: 80, // %
    influentFlow: 6500, // m³/d
    influentCod: 130, // mg/L
    effluentCod: 10, // mg/L
    sludgeYield: 0.5, // 无量纲
    sludgeDecay: 0.1, // d⁻¹
  });

  const [excessSludgeResults, setExcessSludgeResults] = useState({
    svi: 0,
    srt: 0,
    codRemoval: 0,
    excessSludge: 0,
    wetSludge: 0,
    calculated: false,
  });

  // 添加参数警告状态
  const [paramWarning, setParamWarning] = useState('');
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    loadConfig();
    loadAllHistories();
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

  // 加载所有历史方案
  const loadAllHistories = async () => {
    try {
      setIsLoading(true);
      // 并行加载所有历史记录
      const [pacData, pamData, dosingData, excessSludgeData] = await Promise.all([
        AsyncStorage.getItem(pacHistoriesKey),
        AsyncStorage.getItem(pamHistoriesKey),
        AsyncStorage.getItem(dosingHistoriesKey),
        AsyncStorage.getItem(excessSludgeHistoriesKey),
      ]);
      
      if (pacData) setPacHistories(JSON.parse(pacData));
      if (pamData) setPamHistories(JSON.parse(pamData));
      if (dosingData) setDosingHistories(JSON.parse(dosingData));
      if (excessSludgeData) setExcessSludgeHistories(JSON.parse(excessSludgeData));
    } catch (error) {
      console.error('加载历史方案失败:', error);
      Alert.alert('错误', '加载历史方案失败');
    } finally {
      setIsLoading(false);
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
      case 'EXCESS_SLUDGE':
        return { histories: excessSludgeHistories, setHistories: setExcessSludgeHistories, storageKey: excessSludgeHistoriesKey };
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
          break;
        case 'EXCESS_SLUDGE':
          newScheme = {
            ...newScheme,
            ...excessSludgeParams,
            results: {
              svi: excessSludgeResults.svi,
              srt: excessSludgeResults.srt,
              codRemoval: excessSludgeResults.codRemoval,
              excessSludge: excessSludgeResults.excessSludge,
              wetSludge: excessSludgeResults.wetSludge,
            }
          };
          break;
      }

      // 获取当前计算类型的历史记录和设置函数
      const { histories, setHistories, storageKey } = getCurrentHistories();
      
      let updatedHistories = [...histories, newScheme];
      // 限制最多保存50条记录
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
    } finally {
      setIsLoading(false);
    }
  };

  // 加载选定的方案
  const loadScheme = (scheme) => {
    try {
      // 验证方案数据完整性
      if (!scheme || !scheme.calculationType) {
        Alert.alert('错误', '方案数据不完整，无法加载');
        return;
      }

      // 设置计算类型
      setCalculatorType(scheme.calculationType);
      
      // 根据计算类型加载相应的数据
      switch (scheme.calculationType) {
        case 'PAC':
          if (typeof scheme.waterVolume !== 'number' || typeof scheme.effectiveContent !== 'number') {
            Alert.alert('错误', 'PAC方案数据不完整');
            return;
          }
          setIsContinuousFlow(scheme.isContinuousFlow);
          setWaterVolume(scheme.waterVolume);
          setEffectiveContent(scheme.effectiveContent);
          setTargetConcentration(scheme.targetConcentration);
          break;
        case 'PAM':
          if (typeof scheme.concentration !== 'number' || typeof scheme.flowRate !== 'number') {
            Alert.alert('错误', 'PAM方案数据不完整');
            return;
          }
          setConcentration(scheme.concentration);
          setFlowRate(scheme.flowRate);
          break;
        case 'DOSING':
          if (!scheme.tankConfig || typeof scheme.sludgeConcentration !== 'number') {
            Alert.alert('错误', '药剂投加方案数据不完整');
            return;
          }
          setTankConfig(scheme.tankConfig);
          setSludgeConcentration(scheme.sludgeConcentration);
          setPamConcentration(scheme.pamConcentration);
          setPamRatio(scheme.pamRatio);
          setPacRatio(scheme.pacRatio);
          break;
        case 'EXCESS_SLUDGE':
          if (!scheme.sludgeConcentration || !scheme.tankVolume || !scheme.influentFlow) {
            Alert.alert('错误', '剩余污泥方案数据不完整');
            return;
          }
          setExcessSludgeParams({
            sludgeConcentration: scheme.sludgeConcentration,
            tankVolume: scheme.tankVolume,
            sv30: scheme.sv30,
            influentFlow: scheme.influentFlow,
            influentCod: scheme.influentCod,
            effluentCod: scheme.effluentCod,
            sludgeYield: scheme.sludgeYield,
            sludgeDecay: scheme.sludgeDecay,
          });
          break;
      }
      
      setShowHistoryModal(false);
    } catch (error) {
      console.error('加载方案失败:', error);
      Alert.alert('错误', '加载方案失败');
    }
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
    // 根据浓度和当前投加速度计算新的流量
    const newFlowRate = (pamRate * 6) / newValue;
    if (newFlowRate <= 2500) {
      setFlowRate(parseFloat(newFlowRate.toFixed(0)));
    } else {
      Alert.alert("警告", "计算出的进水流量超出设备上限2500 L/H！");
      setFlowRate(2500);
      // 根据最大流量重新计算投加速度
      calculatePamRate(newValue, 2500);
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

  // 处理PAM投加速度变化
  const handlePamRateChange = (value) => {
    let newValue = value;
    if (newValue < 0) newValue = 0;
    if (newValue > 500) {
      Alert.alert("警告", "PAM投加速度超出安全阈值500 g/min！");
      newValue = 500;
    }
    setPamRate(parseFloat(newValue.toFixed(2)));
    // 根据投加速度和当前浓度计算新的流量
    const newFlowRate = (newValue * 6) / concentration;
    if (newFlowRate <= 2500) {
      setFlowRate(parseFloat(newFlowRate.toFixed(0)));
    } else {
      Alert.alert("警告", "计算出的进水流量超出设备上限2500 L/H！");
      setFlowRate(2500);
      // 根据最大流量重新计算投加速度
      calculatePamRate(concentration, 2500);
    }
  };

  // 增加PAM投加速度
  const increasePamRate = () => {
    const newValue = pamRate + 5;
    handlePamRateChange(newValue);
  };

  // 减少PAM投加速度
  const decreasePamRate = () => {
    const newValue = pamRate - 5;
    handlePamRateChange(newValue);
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

  // 计算剩余污泥相关参数
  const calculateExcessSludge = () => {
    try {
      const {
        sludgeConcentration,
        tankVolume,
        sv30,
        influentFlow,
        influentCod,
        effluentCod,
        sludgeYield,
        sludgeDecay,
      } = excessSludgeParams;

      // 参数合理性检查
      if (sludgeConcentration <= 0 || tankVolume <= 0 || influentFlow <= 0) {
        setParamWarning('请确保污泥浓度、曝气池容积和进水流量均为正数');
        setExcessSludgeResults({ svi: 0, srt: 0, codRemoval: 0, excessSludge: 0, wetSludge: 0, calculated: false });
        return;
      }
      if (sv30 <= 0 || sv30 >= 100) {
        setParamWarning('SV30应在0-100%之间');
        setExcessSludgeResults({ svi: 0, srt: 0, codRemoval: 0, excessSludge: 0, wetSludge: 0, calculated: false });
        return;
      }

      // SVI 计算修正：sv30为百分比，需除以100，单位mL/g
      // SVI = (SV30体积分数 * 1000) / 污泥浓度(g/L)
      const svi = ((sv30 / 100) * 1000) / (sludgeConcentration / 1000);

      // 总污泥量 (kg)
      const totalSludge = (sludgeConcentration * tankVolume) / 1000;

      // COD去除量 (kg/d)
      const codRemoval = ((influentCod - effluentCod) * influentFlow) / 1000;
      if (codRemoval <= 0) {
        setParamWarning('进水COD应大于出水COD');
        setExcessSludgeResults({ svi, srt: 0, codRemoval, excessSludge: 0, wetSludge: 0, calculated: false });
        return;
      }

      // SRT 计算修正：净增长为负时，SRT=0并提示
      let srt = 0;
      let srtWarning = '';
      if (sludgeYield * codRemoval > 0) {
        srt = totalSludge / (sludgeYield * codRemoval);
      } else {
        srtWarning = '净污泥增长量为负，系统不产泥';
        srt = 0;
      }

      // 剩余污泥量修正：净增长为负时，剩余污泥量=0并提示
      let excessSludge = 0;
      let wetSludge = 0;
      let excessWarning = '';
      if (sludgeYield * codRemoval > 0) {
        excessSludge = (sludgeYield * codRemoval) / (1 + sludgeDecay * srt);
        wetSludge = excessSludge / 0.2;
      } else {
        excessWarning = '系统不产泥，无需排泥';
        excessSludge = 0;
        wetSludge = 0;
      }

      // 参数合理性警告
      if (srtWarning || excessWarning) {
        setParamWarning(`${srtWarning} ${excessWarning}`.trim());
      } else if (srt > 100) {
        setParamWarning(`当前参数组合导致污泥龄(${srt.toFixed(1)}天)过长，超出常规范围。建议调整参数组合，如减小池容积或增大进水流量/进水COD。`);
      } else if (srt < 5) {
        setParamWarning(`当前参数组合导致污泥龄(${srt.toFixed(1)}天)过短，低于常规范围。建议调整参数组合，如增大池容积或减小进水流量/进水COD。`);
      } else {
        setParamWarning('');
      }

      setExcessSludgeResults({
        svi,
        srt,
        codRemoval,
        excessSludge,
        wetSludge,
        calculated: true,
      });
    } catch (error) {
      console.error('计算剩余污泥时出错:', error);
      setParamWarning('计算过程中出错，请检查输入参数');
      setExcessSludgeResults({ svi: 0, srt: 0, codRemoval: 0, excessSludge: 0, wetSludge: 0, calculated: false });
    }
  };

  const handleExcessSludgeParamChange = useCallback((param, value) => {
    const numValue = parseFloat(value) || 0;
    setExcessSludgeParams(prev => ({
      ...prev,
      [param]: numValue
    }));
  }, []);

  const increaseParam = (param) => {
    let increment = 1;
    
    // 根据参数类型设置不同的增减幅度
    switch(param) {
      case 'sludgeConcentration':
        increment = excessSludgeParams.sludgeConcentration >= 5000 ? 500 : 100;
        break;
      case 'tankVolume':
        increment = excessSludgeParams.tankVolume >= 5000 ? 500 : 100;
        break;
      case 'influentFlow':
        increment = excessSludgeParams.influentFlow >= 5000 ? 500 : 100;
        break;
      case 'sv30':
        increment = 5;
        break;
      case 'sludgeYield':
        increment = 0.05;
        break;
      case 'sludgeDecay':
        increment = 0.01;
        break;
      default:
        increment = 1;
    }
    
    setExcessSludgeParams(prev => ({
      ...prev,
      [param]: parseFloat((prev[param] + increment).toFixed(2))
    }));
  };

  const decreaseParam = (param) => {
    let decrement = 1;
    
    // 根据参数类型设置不同的增减幅度
    switch(param) {
      case 'sludgeConcentration':
        decrement = excessSludgeParams.sludgeConcentration > 5000 ? 500 : 100;
        break;
      case 'tankVolume':
        decrement = excessSludgeParams.tankVolume > 5000 ? 500 : 100;
        break;
      case 'influentFlow':
        decrement = excessSludgeParams.influentFlow > 5000 ? 500 : 100;
        break;
      case 'sv30':
        decrement = 5;
        break;
      case 'sludgeYield':
        decrement = 0.05;
        break;
      case 'sludgeDecay':
        decrement = 0.01;
        break;
      default:
        decrement = 1;
    }
    
    setExcessSludgeParams(prev => ({
      ...prev,
      [param]: parseFloat(Math.max(0, prev[param] - decrement).toFixed(2))
    }));
  };

  useEffect(() => {
    let isMounted = true;
    if (calculatorType === 'EXCESS_SLUDGE' && isMounted) {
      // 使用 setTimeout 避免同步阻塞
      const timer = setTimeout(() => {
        if (isMounted) {
          calculateExcessSludge();
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [excessSludgeParams, calculatorType]);

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
               calculatorType === 'PAM' ? 'PAM计算历史方案' : 
               calculatorType === 'EXCESS_SLUDGE' ? '剩余污泥计算历史方案' : '药剂投加历史方案'}
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
                          calculatorType === 'PAM' ?
                          `PAM: ${item.concentration}%, 流量: ${item.flowRate}L/H` :
                          `MLSS: ${item.sludgeConcentration}mg/L, 污泥龄: ${item.results.srt.toFixed(1)}天`
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

      <View style={styles.section}>
        <Text style={styles.label}>PAM投加速度（g/min）</Text>
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
              onPress={() => handleWaterVolumeChange(waterVolume - 100)}
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
              onPress={() => handleWaterVolumeChange(waterVolume + 100)}
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
              onChangeText={(value) => handleConcentrationChange(parseFloat(value) || 0)}
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
              onPress={() => setFlowRate(Math.max(0, flowRate - 100))}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.numberInput]}
              keyboardType="numeric"
              value={String(flowRate)}
              onChangeText={(value) => setFlowRate(parseFloat(value) || 0)}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setFlowRate(flowRate + 100)}
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

  const renderExcessSludgeCalculator = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>活性污泥法剩余污泥计算</Text>
        <Text style={styles.sectionSubtitle}>
          输入处理工艺参数，计算剩余污泥量
        </Text>

        {/* MLSS浓度输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>污泥浓度 (mg/L):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('sludgeConcentration')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.sludgeConcentration.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('sludgeConcentration', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('sludgeConcentration')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 曝气池容积输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>曝气池容积 (m³):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('tankVolume')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.tankVolume.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('tankVolume', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('tankVolume')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SV30输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>SV30 (%):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('sv30')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.sv30.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('sv30', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('sv30')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 进水流量输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>进水流量 (m³/d):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('influentFlow')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.influentFlow.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('influentFlow', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('influentFlow')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 进水COD输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>进水COD (mg/L):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('influentCod')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.influentCod.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('influentCod', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('influentCod')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 出水COD输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>出水COD (mg/L):</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('effluentCod')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.effluentCod.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('effluentCod', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('effluentCod')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 污泥产率系数输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>污泥产率系数 Y:</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('sludgeYield')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.sludgeYield.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('sludgeYield', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('sludgeYield')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 污泥衰减系数输入 */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>污泥衰减系数 Kd:</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => decreaseParam('sludgeDecay')}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={excessSludgeParams.sludgeDecay.toString()}
              onChangeText={(value) =>
                handleExcessSludgeParamChange('sludgeDecay', value)
              }
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => increaseParam('sludgeDecay')}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 参数警告 */}
        {paramWarning ? (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>{paramWarning}</Text>
          </View>
        ) : null}

        {/* 计算结果展示 */}
        {excessSludgeResults.calculated && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>计算结果</Text>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>污泥体积指数 (SVI):</Text>
              <Text style={styles.resultValue}>{excessSludgeResults.svi.toFixed(1)} mL/g</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>污泥龄 (SRT):</Text>
              <Text style={[
                styles.resultValue,
                excessSludgeResults.srt > 100 || excessSludgeResults.srt < 5 ? styles.warningValue : null
              ]}>
                {excessSludgeResults.srt.toFixed(1)} 天
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>COD去除量:</Text>
              <Text style={styles.resultValue}>{excessSludgeResults.codRemoval.toFixed(1)} kg/d</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>剩余污泥量 (干重):</Text>
              <Text style={styles.resultValue}>{excessSludgeResults.excessSludge.toFixed(1)} kg/d</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>剩余污泥量 (含水80%):</Text>
              <Text style={styles.resultValue}>{excessSludgeResults.wetSludge.toFixed(1)} kg/d</Text>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.recommendButton}
            onPress={() => {
              setExcessSludgeParams({
                sludgeConcentration: 4000,
                tankVolume: 3000,
                sv30: 30,
                influentFlow: 10000,
                influentCod: 350,
                effluentCod: 50,
                sludgeYield: 0.5,
                sludgeDecay: 0.1,
              });
            }}
          >
            <Text style={styles.recommendButtonText}>恢复推荐参数</Text>
          </TouchableOpacity>
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

  const renderCalculator = () => {
    switch (calculatorType) {
      case 'PAC':
        return renderPacCalculator();
      case 'PAM':
        return renderPamCalculator();
      case 'DOSING':
        return renderDosingCalculator();
      case 'EXCESS_SLUDGE':
        return renderExcessSludgeCalculator();
      default:
        return null;
    }
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
    inputLabel: {
      fontSize: 14,
      color: colors.text,
      width: 140,
      marginRight: 8,
    },
    inputRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
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
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.primary,
      marginLeft: 0,
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    resultsContainer: {
      marginTop: 15,
      padding: 12,
      backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(232, 245, 233, 0.9)',
      borderRadius: 10,
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 10,
    },
    resultItem: {
      padding: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultLabel: {
      flex: 1,
    },
    resultValue: {
      fontWeight: 'bold',
    },
    resultRange: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 10,
    },
    explanationSection: {
      marginTop: 20,
      padding: 15,
      backgroundColor: isDarkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(232, 245, 233, 0.9)',
      borderRadius: 10,
      marginBottom: 40,
    },
    explanationTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 15,
      textAlign: 'center',
    },
    explanationText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 12,
      lineHeight: 22,
    },
    sviDisplay: {
      backgroundColor: isDarkMode ? 'rgba(50, 50, 50, 0.6)' : 'rgba(240, 248, 255, 0.8)',
      padding: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sviValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    sviFormula: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
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
      color: colors.text,
    },
    historyDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    historyDetails: {
      fontSize: 12,
      color: colors.textSecondary,
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
      color: colors.textSecondary,
      marginVertical: 20,
    },
    modalButton: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      marginTop: 16,
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    warningContainer: {
      backgroundColor: 'rgba(255, 200, 200, 0.5)',
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 12,
    },
    warningText: {
      color: '#d32f2f',
      fontSize: 13,
      lineHeight: 18,
    },
    warningValue: {
      color: '#d32f2f',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginVertical: 12,
    },
    recommendButton: {
      backgroundColor: colors?.secondary || '#4caf50',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    recommendButtonText: {
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
          removeClippedSubviews={true} // 添加这个属性以优化性能
        >
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
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: calculatorType === 'EXCESS_SLUDGE' ? colors.primary : colors.background,
                },
              ]}
              onPress={() => setCalculatorType('EXCESS_SLUDGE')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: calculatorType === 'EXCESS_SLUDGE' ? '#fff' : colors.text },
                ]}
              >
                剩余污泥
              </Text>
            </TouchableOpacity>
          </View>

          {renderCalculator()}

          {renderConfigModal()}
          {renderHistoryModal()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SludgeDehydrationCalculatorScreen; 