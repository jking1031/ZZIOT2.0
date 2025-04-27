import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useCalculator } from '../context/SludgeCalculatorContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createStyles from '../styles/calculatorStyles';

const HistoryModal = () => {
  const { colors, isDarkMode } = useTheme();
  const { 
    calculatorType, 
    showHistoryModal, 
    setShowHistoryModal, 
    getCurrentHistories, 
    deleteScheme 
  } = useCalculator();
  
  // 样式基于主题
  const baseStyles = createStyles(colors, isDarkMode);
  
  // 特定的模态窗口样式
  const styles = {
    ...baseStyles,
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
      backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
      color: colors.text,
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
      backgroundColor: colors.border,
      alignItems: 'center',
      marginTop: 16,
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
  };

  // 加载方案
  const loadScheme = async (scheme) => {
    try {
      // 验证方案数据完整性
      if (!scheme || !scheme.calculationType) {
        Alert.alert('错误', '方案数据不完整，无法加载');
        return;
      }

      // TODO: 根据不同计算器类型实现加载逻辑
      // 这里需要与各计算器Context协调
      
      setShowHistoryModal(false);
    } catch (error) {
      console.error('加载方案失败:', error);
      Alert.alert('错误', '加载方案失败');
    }
  };

  // 获取当前历史记录
  const { histories } = getCurrentHistories();
  
  // 根据计算器类型获取标题
  const getModalTitle = () => {
    switch (calculatorType) {
      case 'PAC':
        return 'PAC计算历史方案';
      case 'PAM':
        return 'PAM计算历史方案';
      case 'DOSING':
        return '药剂投加历史方案';
      case 'EXCESS_SLUDGE':
        return '剩余污泥计算历史方案';
      default:
        return '历史方案';
    }
  };
  
  // 渲染方案详情
  const renderSchemeDetails = (item) => {
    switch (item.calculationType) {
      case 'PAC':
        return `PAC(${item.isContinuousFlow ? '流量' : '体积'}): ${item.waterVolume}L, 目标浓度: ${item.targetConcentration}%`;
      case 'PAM':
        return `PAM: ${item.concentration}%, 流量: ${item.flowRate}L/H`;
      case 'DOSING':
        return `污泥量: ${item.results?.drySludge?.toFixed(2) || 0}kg, PAM: ${item.pamRatio}‰, PAC: ${item.pacRatio}%`;
      case 'EXCESS_SLUDGE':
        return `MLSS: ${item.sludgeConcentration}mg/L, 污泥龄: ${item.results?.srt?.toFixed(1) || 0}天`;
      default:
        return '';
    }
  };
  
  return (
    <Modal
      visible={showHistoryModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.historyModalContent}>
          <Text style={styles.modalTitle}>{getModalTitle()}</Text>
          
          {histories.length === 0 ? (
            <Text style={styles.emptyHistoryText}>暂无保存的方案</Text>
          ) : (
            <FlatList
              data={histories.sort((a, b) => b.id - a.id)} // 按时间倒序排列
              keyExtractor={(item) => item.id}
              style={styles.historyList}
              renderItem={({ item }) => (
                <View style={styles.historyItem}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{item.name}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <Text style={styles.historyDetails}>
                      {renderSchemeDetails(item)}
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
            style={styles.modalButton}
            onPress={() => setShowHistoryModal(false)}
          >
            <Text style={styles.modalButtonText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default HistoryModal; 