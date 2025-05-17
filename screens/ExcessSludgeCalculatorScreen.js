import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const ExcessSludgeCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  
  // 剩余污泥计算相关状态
  const [excessSludgeParams, setExcessSludgeParams] = useState({
    sludgeConcentration: 3500, // MLSS mg/L
    tankVolume: 3000, // m³
    sv30: 30, // %
    influentFlow: 10000, // m³/d
    influentCod: 350, // mg/L
    effluentCod: 50, // mg/L
    sludgeYield: 0.5, // 无量纲
    sludgeDecay: 0.1, // d⁻¹
  });

  const [excessSludgeResults, setExcessSludgeResults] = useState({
    svi: 0,
    srt: 0,
    fm: 0,
    codRemoval: 0,
    excessSludge: 0,
    wetSludge: 0,
    wetSludge60: 0,  // 60%含水率
    wetSludge65: 0,  // 65%含水率
    wetSludge70: 0,  // 70%含水率
    srtStatus: '',
    sviStatus: '',
    fmStatus: '',
    recommendations: [],
    calculated: false,
  });

  // 历史方案相关状态
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [excessSludgeHistories, setExcessSludgeHistories] = useState([]);
  const [schemeName, setSchemeName] = useState('');
  
  // 添加参数警告状态
  const [paramWarning, setParamWarning] = useState('');
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);
  
  // 存储键名
  const excessSludgeHistoriesKey = 'excessSludgeHistories';
  
  // 添加ScrollView引用
  const scrollViewRef = useRef(null);

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

  // 加载历史方案
  const loadHistories = async () => {
    try {
      setIsLoading(true);
      const savedExcessSludgeHistories = await AsyncStorage.getItem(excessSludgeHistoriesKey);
      if (savedExcessSludgeHistories) {
        setExcessSludgeHistories(JSON.parse(savedExcessSludgeHistories));
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

    if (!excessSludgeResults.calculated) {
      Alert.alert('错误', '请先计算再保存');
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
        ...excessSludgeParams,
        results: {
          svi: excessSludgeResults.svi,
          srt: excessSludgeResults.srt,
          fm: excessSludgeResults.fm,
          srtStatus: excessSludgeResults.srtStatus,
          sviStatus: excessSludgeResults.sviStatus,
          fmStatus: excessSludgeResults.fmStatus,
          codRemoval: excessSludgeResults.codRemoval,
          excessSludge: excessSludgeResults.excessSludge,
          wetSludge: excessSludgeResults.wetSludge,
          wetSludge60: excessSludgeResults.wetSludge60,
          wetSludge65: excessSludgeResults.wetSludge65,
          wetSludge70: excessSludgeResults.wetSludge70,
        }
      };
      
      let updatedHistories = [...excessSludgeHistories, newScheme];
      // 限制最多保存50条记录
      if (updatedHistories.length > 50) {
        updatedHistories = updatedHistories.slice(updatedHistories.length - 50);
      }
      
      await AsyncStorage.setItem(excessSludgeHistoriesKey, JSON.stringify(updatedHistories));
      setExcessSludgeHistories(updatedHistories);
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
      
      setShowHistoryModal(false);
    } catch (error) {
      console.error('加载方案失败:', error);
      Alert.alert('错误', '加载方案失败');
    }
  };

  // 删除选定的方案
  const deleteScheme = async (id) => {
    try {
      const updatedHistories = excessSludgeHistories.filter(item => item.id !== id);
      await AsyncStorage.setItem(excessSludgeHistoriesKey, JSON.stringify(updatedHistories));
      setExcessSludgeHistories(updatedHistories);
    } catch (error) {
      console.error('删除方案失败:', error);
      Alert.alert('错误', '删除方案失败');
    }
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
      let warnings = [];
      
      // 检查污泥浓度 MLSS
      if (sludgeConcentration <= 0) {
        setParamWarning('污泥浓度必须大于0');
        setExcessSludgeResults({ ...excessSludgeResults, calculated: false });
        return;
      } else if (sludgeConcentration < 1000 || sludgeConcentration > 15000) {
        warnings.push('污泥浓度超出常规范围(1000~15000 mg/L)');
      }
      
      // 检查池容积
      if (tankVolume <= 0) {
        setParamWarning('曝气池容积必须大于0');
        setExcessSludgeResults({ ...excessSludgeResults, calculated: false });
        return;
      }
      
      // 检查SV30
      if (sv30 <= 0) {
        setParamWarning('SV30必须大于0');
        setExcessSludgeResults({ ...excessSludgeResults, calculated: false });
        return;
      } else if (sv30 < 10 || sv30 > 99) {
        warnings.push('SV30值异常(正常范围10~99%)');
      }
      
      // 检查进水流量
      if (influentFlow <= 0) {
        setParamWarning('进水流量必须大于0');
        setExcessSludgeResults({ ...excessSludgeResults, calculated: false });
        return;
      }
      
      // 检查COD值
      if (influentCod <= effluentCod) {
        setParamWarning('进水COD必须大于出水COD');
        setExcessSludgeResults({ ...excessSludgeResults, calculated: false });
        return;
      }
      
      if (influentCod < 50 || influentCod > 2000) {
        warnings.push('进水COD超出常规范围(50~2000 mg/L)');
      }
      
      // 检查污泥产率
      if (sludgeYield < 0.2 || sludgeYield > 0.8) {
        warnings.push('污泥产率系数超出常规范围(0.4~0.6)，请复核');
      }
      
      // 检查污泥衰减系数
      if (sludgeDecay < 0.01 || sludgeDecay > 0.2) {
        warnings.push('污泥衰减系数超出常规范围(0.05~0.15)，请复核');
      }

      // SVI 计算: SVI = (SV30体积分数 * 1000) / 污泥浓度(g/L)
      const svi = ((sv30 / 100) * 1000) / (sludgeConcentration / 1000);
      
      // 转换单位: mg/L 转 kg/m3 (除以1000)
      const X = sludgeConcentration / 1000; // 污泥浓度(kg/m3)
      const S0 = influentCod / 1000; // 进水COD(kg/m3)
      const S = effluentCod / 1000; // 出水COD(kg/m3)
      
      // 总污泥量 (kg)
      const totalSludge = X * tankVolume;
      
      // COD去除量 (kg/d)
      const codRemoval = (S0 - S) * influentFlow;
      
      // F/M比计算
      const fm = codRemoval / totalSludge;
      
      // 计算SRT分母: Y·Q·(S0-S) - Kd·X·V
      const srtDenominator = sludgeYield * influentFlow * (S0 - S) - sludgeDecay * totalSludge;
      
      // SRT计算
      let srt = 0;
      let srtStatus = '';
      
      if (srtDenominator > 0) {
        // 正常计算SRT
        srt = totalSludge / srtDenominator;
        if (srt < 5) {
          srtStatus = '污泥龄过短';
        } else if (srt > 20) {
          srtStatus = '污泥老化';
        } else {
          srtStatus = '正常范围';
        }
      } else if (srtDenominator === 0) {
        srtStatus = '系统处于理论平衡状态';
        srt = 0;
      } else {
        srtStatus = '污泥净流失，SRT无意义';
        srt = 0;
      }
      
      // SVI状态分析
      let sviStatus = '';
      if (svi < 80) {
        sviStatus = '沉降优异';
      } else if (svi <= 120) {
        sviStatus = '正常范围';
      } else if (svi <= 150) {
        sviStatus = '轻微膨胀';
      } else {
        sviStatus = '严重膨胀';
      }
      
      // F/M比状态分析
      let fmStatus = '';
      if (fm < 0.05) {
        fmStatus = '负荷过低';
      } else if (fm <= 0.3) {
        fmStatus = '理想范围';
      } else {
        fmStatus = '负荷过高';
      }
      
      // 计算剩余污泥量
      let excessSludge = 0;
      let wetSludge = 0;
      let wetSludge60 = 0;
      let wetSludge65 = 0;
      let wetSludge70 = 0;
      
      if (srtDenominator > 0) {
        // 剩余污泥量 = Y·Q·(S0-S) / (1 + Kd·SRT)
        excessSludge = (sludgeYield * influentFlow * (S0 - S)) / (1 + sludgeDecay * srt);
        
        // 不同含水率的污泥量计算
        // 含水率80%的污泥量 = 干泥量 / (1 - 80%)
        wetSludge = excessSludge / 0.2; // 80%含水率
        
        // 含水率60%的污泥量 = 干泥量 / (1 - 60%)
        wetSludge60 = excessSludge / 0.4; // 60%含水率
        
        // 含水率65%的污泥量 = 干泥量 / (1 - 65%)
        wetSludge65 = excessSludge / 0.35; // 65%含水率
        
        // 含水率70%的污泥量 = 干泥量 / (1 - 70%)
        wetSludge70 = excessSludge / 0.3; // 70%含水率
      }
      
      // 生成优化建议
      let recommendations = [];
      
      // SRT相关建议
      if (srtDenominator < 0) {
        // 污泥净流失情况
        const codDeficit = Math.abs(srtDenominator) * 1.2; // 需要补充的COD，乘以1.2安全系数
        recommendations.push(`补充碳源，目标COD增加≥${codDeficit.toFixed(1)} kg/d`);
        recommendations.push('停止排泥，降低污泥衰减影响');
      } else if (srt < 5 && srt > 0) {
        recommendations.push('减少排泥量，延长污泥龄');
        recommendations.push('检查进水COD是否过低');
      } else if (srt > 20) {
        recommendations.push('增加排泥量，防止污泥老化');
        recommendations.push('提高曝气强度，DO维持在2.5~3.5 mg/L');
      }
      
      // SVI相关建议
      if (svi > 120 && svi <= 150) {
        recommendations.push('监控丝状菌发展，考虑投加H₂O₂(10~20 mg/L)');
        recommendations.push('确保C:N:P = 100:5:1的营养比例');
      } else if (svi > 150) {
        recommendations.push('投加H₂O₂(10~20 mg/L)或ClO₂(2~5 mg/L)控制丝状菌');
        recommendations.push('提高曝气池末端DO至3~4 mg/L');
        recommendations.push('检查调整营养比至C:N:P = 100:5:1');
      }
      
      // F/M相关建议
      if (fm < 0.05) {
        recommendations.push('考虑补充碳源或减少MLSS');
      } else if (fm > 0.3) {
        recommendations.push('增加MLSS或减少进水负荷');
      }
      
      // 汇总警告信息
      if (warnings.length > 0) {
        setParamWarning(warnings.join('；'));
      } else {
        setParamWarning('');
      }

      setExcessSludgeResults({
        svi,
        srt,
        fm,
        codRemoval: codRemoval * 1000, // 转回g/d显示
        excessSludge,
        wetSludge,
        wetSludge60,
        wetSludge65,
        wetSludge70,
        srtStatus,
        sviStatus,
        fmStatus,
        recommendations,
        calculated: true,
      });
    } catch (error) {
      console.error('计算剩余污泥时出错:', error);
      setParamWarning('计算过程中出错，请检查输入参数');
      setExcessSludgeResults({ svi: 0, srt: 0, fm: 0, codRemoval: 0, excessSludge: 0, wetSludge: 0, wetSludge60: 0, wetSludge65: 0, wetSludge70: 0, calculated: false });
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
      case 'influentCod':
        increment = 10;
        break;
      case 'effluentCod':
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
      case 'influentCod':
        decrement = 10;
        break;
      case 'effluentCod':
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

  // 参数变化时自动计算
  useEffect(() => {
    let isMounted = true;
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
  }, [excessSludgeParams]);

  // 渲染历史方案选择模态窗口
  const renderHistoryModal = () => {
    return (
      <Modal
        visible={showHistoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.historyModalContent}>
            <Text style={styles.modalTitle}>
              剩余污泥计算历史方案
            </Text>
            
            {excessSludgeHistories.length === 0 ? (
              <Text style={styles.emptyHistoryText}>暂无保存的方案</Text>
            ) : (
              <FlatList
                data={excessSludgeHistories.sort((a, b) => b.id - a.id)} // 按时间倒序排列
                keyExtractor={(item) => item.id}
                style={styles.historyList}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName}>{item.name}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                      <Text style={styles.historyDetails}>
                        MLSS: {item.sludgeConcentration}mg/L, 
                        {item.results.srt > 0 ? `污泥龄: ${item.results.srt.toFixed(1)}天` : '无有效SRT'}, 
                        SVI: {item.results.svi.toFixed(1)}mL/g
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

  // 渲染剩余污泥计算器
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
              <View style={styles.resultValueContainer}>
                <Text style={styles.resultValue}>{excessSludgeResults.svi.toFixed(1)} mL/g</Text>
                <Text style={[
                  styles.statusTag,
                  excessSludgeResults.svi > 120 ? styles.warningTag : 
                  excessSludgeResults.svi < 80 ? styles.excellentTag : styles.normalTag
                ]}>
                  {excessSludgeResults.sviStatus}
                </Text>
              </View>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>污泥龄 (SRT):</Text>
              <View style={styles.resultValueContainer}>
                <Text style={styles.resultValue}>
                  {excessSludgeResults.srt > 0 ? `${excessSludgeResults.srt.toFixed(1)} 天` : "计算无效"}
                </Text>
                <Text style={[
                  styles.statusTag,
                  excessSludgeResults.srt < 5 || excessSludgeResults.srt > 20 ? styles.warningTag : styles.normalTag
                ]}>
                  {excessSludgeResults.srtStatus}
                </Text>
              </View>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>F/M比:</Text>
              <View style={styles.resultValueContainer}>
                <Text style={styles.resultValue}>{excessSludgeResults.fm.toFixed(3)}</Text>
                <Text style={[
                  styles.statusTag,
                  excessSludgeResults.fm < 0.05 || excessSludgeResults.fm > 0.3 ? styles.warningTag : styles.normalTag
                ]}>
                  {excessSludgeResults.fmStatus}
                </Text>
              </View>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>COD去除量:</Text>
              <Text style={styles.resultValue}>{(excessSludgeResults.codRemoval/1000).toFixed(1)} kg/d</Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>剩余污泥量 (干重):</Text>
              <Text style={styles.resultValue}>
                {excessSludgeResults.excessSludge > 0 ? 
                  `${excessSludgeResults.excessSludge.toFixed(1)} kg/d` : 
                  "系统不产泥"}
              </Text>
            </View>
            
            <View style={styles.resultDivider} />
            
            <Text style={styles.resultSubtitle}>不同含水率下的污泥量:</Text>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>含水60%:</Text>
              <Text style={styles.resultValue}>
                {excessSludgeResults.wetSludge60 > 0 ? 
                  `${excessSludgeResults.wetSludge60.toFixed(1)} kg/d` : 
                  "系统不产泥"}
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>含水65%:</Text>
              <Text style={styles.resultValue}>
                {excessSludgeResults.wetSludge65 > 0 ? 
                  `${excessSludgeResults.wetSludge65.toFixed(1)} kg/d` : 
                  "系统不产泥"}
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>含水70%:</Text>
              <Text style={styles.resultValue}>
                {excessSludgeResults.wetSludge70 > 0 ? 
                  `${excessSludgeResults.wetSludge70.toFixed(1)} kg/d` : 
                  "系统不产泥"}
              </Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>含水80%:</Text>
              <Text style={styles.resultValue}>
                {excessSludgeResults.wetSludge > 0 ? 
                  `${excessSludgeResults.wetSludge.toFixed(1)} kg/d` : 
                  "系统不产泥"}
              </Text>
            </View>

            {excessSludgeResults.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>运行建议:</Text>
                {excessSludgeResults.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>
        )}
        {/* 参数正常范围说明 */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>系统正常运行参数范围:</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoItem}>• 污泥浓度(MLSS): 2000~5000 mg/L</Text>
            <Text style={styles.infoItem}>• SV30: 20~40% (沉降正常)</Text>
            <Text style={styles.infoItem}>• SVI: 80~120 mL/g (理想范围)</Text>
            <Text style={styles.infoItem}>• 污泥龄(SRT): 5~20天 (适中)</Text>
            <Text style={styles.infoItem}>• F/M比: 0.05~0.3 kgCOD/kgMLSS·d</Text>
            <Text style={styles.infoItem}>• 污泥产率系数(Y): 0.4~0.6</Text>
            <Text style={styles.infoItem}>• 污泥衰减系数(Kd): 0.05~0.15 d⁻¹</Text>
          </View>
          <Text style={styles.infoNote}>说明: 参数范围会因水质特性、工艺类型、温度等因素而变化，以上数值为常规活性污泥法参考范围。高浓度进水或特殊工艺可能需要调整。</Text>
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
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
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
      flex: 1,
      marginHorizontal: 10,
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
    warningContainer: {
      backgroundColor: 'rgba(255, 200, 200, 0.5)',
      padding: 10,
      borderRadius: 8,
      marginVertical: 12,
    },
    warningText: {
      color: '#d32f2f',
      fontSize: 13,
      lineHeight: 18,
    },
    warningValue: {
      color: '#d32f2f',
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
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    resultLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    resultValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    resultValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
      minWidth: 80,
      textAlign: 'right',
    },
    statusTag: {
      fontSize: 11,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 6,
      overflow: 'hidden',
    },
    normalTag: {
      backgroundColor: '#4caf50',
      color: '#fff',
    },
    warningTag: {
      backgroundColor: '#ff9800',
      color: '#fff',
    },
    alarmTag: {
      backgroundColor: '#f44336',
      color: '#fff',
    },
    excellentTag: {
      backgroundColor: '#2196f3',
      color: '#fff',
    },
    recommendationsContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    recommendationsTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    recommendationItem: {
      fontSize: 13,
      color: colors.text,
      marginBottom: 4,
      lineHeight: 18,
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
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
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
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    resultDivider: {
      height: 1,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      marginVertical: 12,
    },
    resultSubtitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    infoContainer: {
      marginTop: 15,
      marginBottom: 15,
      padding: 12,
      backgroundColor: isDarkMode ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.1)',
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: '#1976d2',
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? '#90caf9' : '#1976d2',
      marginBottom: 10,
    },
    infoContent: {
      marginBottom: 12,
    },
    infoItem: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
      paddingLeft: 2,
    },
    infoNote: {
      fontSize: 12,
      fontStyle: 'italic',
      color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      paddingTop: 8,
      marginTop: 8,
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

          {renderExcessSludgeCalculator()}
          {renderHistoryModal()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ExcessSludgeCalculatorScreen; 