import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 创建共享的Context
const CalculatorContext = createContext();

// 存储键常量
const STORAGE_KEYS = {
  PAC_HISTORIES: 'pacHistories',
  PAM_HISTORIES: 'pamHistories',
  DOSING_HISTORIES: 'dosingHistories',
  EXCESS_SLUDGE_HISTORIES: 'excessSludgeHistories',
  TANK_CONFIG: 'tankConfig',
};

// 主Provider组件
export const CalculatorProvider = ({ children }) => {
  // 共享状态
  const [calculatorType, setCalculatorType] = useState('PAC');
  const [schemeName, setSchemeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // 历史记录状态
  const [pacHistories, setPacHistories] = useState([]);
  const [pamHistories, setPamHistories] = useState([]);
  const [dosingHistories, setDosingHistories] = useState([]);
  const [excessSludgeHistories, setExcessSludgeHistories] = useState([]);
  
  // 通用配置
  const [tankConfig, setTankConfig] = useState({
    diameter: 3.2,
    maxLevel: 2.6,
    minLevel: 0.8,
  });
  
  // 加载所有历史和配置
  useEffect(() => {
    loadConfigAndHistories();
  }, []);
  
  // 加载配置和历史记录
  const loadConfigAndHistories = async () => {
    try {
      setIsLoading(true);
      
      // 并行加载所有数据
      const [tankConfigData, pacData, pamData, dosingData, excessSludgeData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TANK_CONFIG),
        AsyncStorage.getItem(STORAGE_KEYS.PAC_HISTORIES),
        AsyncStorage.getItem(STORAGE_KEYS.PAM_HISTORIES),
        AsyncStorage.getItem(STORAGE_KEYS.DOSING_HISTORIES),
        AsyncStorage.getItem(STORAGE_KEYS.EXCESS_SLUDGE_HISTORIES),
      ]);
      
      // 设置配置和历史记录
      if (tankConfigData) setTankConfig(JSON.parse(tankConfigData));
      if (pacData) setPacHistories(JSON.parse(pacData));
      if (pamData) setPamHistories(JSON.parse(pamData));
      if (dosingData) setDosingHistories(JSON.parse(dosingData));
      if (excessSludgeData) setExcessSludgeHistories(JSON.parse(excessSludgeData));
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 保存配置
  const saveConfig = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TANK_CONFIG, JSON.stringify(tankConfig));
      setShowConfigModal(false);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };
  
  // 获取当前计算类型的历史记录
  const getCurrentHistories = () => {
    switch (calculatorType) {
      case 'PAC':
        return { histories: pacHistories, setHistories: setPacHistories, storageKey: STORAGE_KEYS.PAC_HISTORIES };
      case 'PAM':
        return { histories: pamHistories, setHistories: setPamHistories, storageKey: STORAGE_KEYS.PAM_HISTORIES };
      case 'DOSING':
        return { histories: dosingHistories, setHistories: setDosingHistories, storageKey: STORAGE_KEYS.DOSING_HISTORIES };
      case 'EXCESS_SLUDGE':
        return { histories: excessSludgeHistories, setHistories: setExcessSludgeHistories, storageKey: STORAGE_KEYS.EXCESS_SLUDGE_HISTORIES };
      default:
        return { histories: [], setHistories: () => {}, storageKey: '' };
    }
  };
  
  // 删除方案
  const deleteScheme = async (id) => {
    try {
      const { histories, setHistories, storageKey } = getCurrentHistories();
      
      const updatedHistories = histories.filter(item => item.id !== id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHistories));
      setHistories(updatedHistories);
    } catch (error) {
      console.error('删除方案失败:', error);
    }
  };
  
  // 共享的上下文值
  const value = {
    // 共享状态
    calculatorType, setCalculatorType,
    schemeName, setSchemeName,
    isLoading, setIsLoading,
    showHistoryModal, setShowHistoryModal,
    showConfigModal, setShowConfigModal,
    
    // 历史记录
    pacHistories, setPacHistories,
    pamHistories, setPamHistories,
    dosingHistories, setDosingHistories,
    excessSludgeHistories, setExcessSludgeHistories,
    
    // 配置
    tankConfig, setTankConfig,
    
    // 方法
    loadConfigAndHistories,
    saveConfig,
    getCurrentHistories,
    deleteScheme,
    
    // 存储键
    STORAGE_KEYS,
  };
  
  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
};

// 使用Context的Hook
export const useCalculator = () => useContext(CalculatorContext);

// 导出存储键
export { STORAGE_KEYS }; 