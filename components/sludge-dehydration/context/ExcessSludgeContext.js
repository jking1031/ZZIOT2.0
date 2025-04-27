import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useCalculator } from './SludgeCalculatorContext';

// 创建Context
const ExcessSludgeContext = createContext();

// Provider组件
export const ExcessSludgeProvider = ({ children }) => {
  const { calculatorType, setIsLoading, schemeName, setSchemeName, getCurrentHistories } = useCalculator();
  
  // 剩余污泥参数状态
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

  // 计算结果状态
  const [excessSludgeResults, setExcessSludgeResults] = useState({
    svi: 0,
    srt: 0,
    codRemoval: 0,
    excessSludge: 0,
    wetSludge: 0,
    calculated: false,
  });

  // 参数警告状态
  const [paramWarning, setParamWarning] = useState('');

  // 处理参数变化
  const handleExcessSludgeParamChange = useCallback((param, value) => {
    const numValue = parseFloat(value) || 0;
    setExcessSludgeParams(prev => ({
      ...prev,
      [param]: numValue
    }));
  }, []);

  // 增加参数值
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

  // 减少参数值
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

  // 计算剩余污泥相关参数
  const calculateExcessSludge = useCallback(() => {
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
        return;
      }

      if (sv30 <= 0 || sv30 >= 100) {
        setParamWarning('SV30应在0-100%之间');
        return;
      }

      // 计算SVI (污泥体积指数)
      const svi = (sv30 * 1000) / sludgeConcentration;

      // 计算总污泥量 (kg)
      const totalSludge = (sludgeConcentration * tankVolume) / 1000;

      // 计算COD去除量 (kg/d)
      const codRemoval = ((influentCod - effluentCod) * influentFlow) / 1000;

      if (codRemoval <= 0) {
        setParamWarning('进水COD应大于出水COD');
        return;
      }

      // 计算污泥龄 (d)
      const srt = totalSludge / (sludgeYield * codRemoval);

      // 参数合理性警告（不阻止计算，但显示警告）
      if (srt > 100) {
        setParamWarning(`当前参数组合导致污泥龄(${srt.toFixed(1)}天)过长，超出常规范围。建议调整参数组合，如减小池容积或增大进水流量/进水COD。`);
      } else if (srt < 5) {
        setParamWarning(`当前参数组合导致污泥龄(${srt.toFixed(1)}天)过短，低于常规范围。建议调整参数组合，如增大池容积或减小进水流量/进水COD。`);
      } else {
        setParamWarning('');
      }

      // 计算剩余污泥量 (kg/d) - 考虑污泥衰减
      const excessSludge = (sludgeYield * codRemoval) / (1 + sludgeDecay * srt);

      // 计算含水80%的湿污泥量 (kg/d)
      const wetSludge = excessSludge / 0.2;

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
    }
  }, [excessSludgeParams]);

  // 重置为推荐参数
  const resetToRecommendedParams = () => {
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
        calculationType: 'EXCESS_SLUDGE',
        ...excessSludgeParams,
        results: {
          svi: excessSludgeResults.svi,
          srt: excessSludgeResults.srt,
          codRemoval: excessSludgeResults.codRemoval,
          excessSludge: excessSludgeResults.excessSludge,
          wetSludge: excessSludgeResults.wetSludge,
        }
      };

      // 获取当前计算类型的历史记录和设置函数
      const { histories, setHistories, storageKey } = getCurrentHistories();
      
      let updatedHistories = [...histories, newScheme];
      // 限制最多保存50条记录
      if (updatedHistories.length > 50) {
        updatedHistories = updatedHistories.slice(updatedHistories.length - 50);
      }
      
      // 保存到AsyncStorage
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

  // 当参数变化时计算结果
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
  }, [excessSludgeParams, calculatorType, calculateExcessSludge]);

  return (
    <ExcessSludgeContext.Provider value={{
      excessSludgeParams,
      setExcessSludgeParams,
      excessSludgeResults,
      paramWarning,
      handleExcessSludgeParamChange,
      increaseParam,
      decreaseParam,
      calculateExcessSludge,
      resetToRecommendedParams,
      saveCurrentScheme
    }}>
      {children}
    </ExcessSludgeContext.Provider>
  );
};

// 自定义Hook
export const useExcessSludge = () => useContext(ExcessSludgeContext); 