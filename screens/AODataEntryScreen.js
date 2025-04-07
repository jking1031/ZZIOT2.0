import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AODataEntryScreen = () => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({});
  const [expandedPools, setExpandedPools] = useState({});

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      // 格式化AO池数据
      const aoData = [1, 2, 3].map(poolNumber => {
        const pools = [];
        const subPools = poolNumber === 3 ? pool3SubPools : pool1SubPools;

        subPools.forEach((subPool, index) => {
          const doValue = formData[`do_${poolNumber}_${index + 1}`];
          if (doValue) {
            pools.push({
              poolName: subPool.name,
              do: parseFloat(doValue)
            });
          }
        });

        return {
          aoName: `${poolNumber}#AO池`,
          pools: pools
        };
      }).filter(ao => ao.pools.length > 0);

      // 验证是否有数据要提交
      if (aoData.length === 0) {
        Alert.alert('提示', '请至少填写一个DO值');
        return;
      }

      // 提交数据到服务器
      const response = await fetch('https://zziot.jzz77.cn:9003/submit_ao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: 'nodered.ao_data',
          aoData: aoData
        })
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('成功', result.message);
        // 清空表单数据
        setFormData({});
      } else {
        throw new Error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交AO池数据失败:', error);
      Alert.alert('错误', '提交数据失败，请稍后重试');
    }
  };

  const togglePool = (poolNumber) => {
    setExpandedPools(prev => ({
      ...prev,
      [poolNumber]: !prev[poolNumber]
    }));
  };

  const renderAOPool = (poolNumber, subPools) => {
    const isExpanded = expandedPools[poolNumber];
    return (
      <View style={[styles.aoTableWrapper, isDarkMode && styles.aoTableWrapperDark]}>
        <TouchableOpacity 
          style={styles.poolHeader} 
          onPress={() => togglePool(poolNumber)}
        >
          <Text style={[styles.poolTitle, isDarkMode && styles.textLight]}>{poolNumber}#AO池</Text>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={24} 
            color={isDarkMode ? '#fff' : '#2c3e50'} 
          />
        </TouchableOpacity>
        {isExpanded && subPools.map((subPool, index) => (
          <View key={index} style={styles.inputRow}>
            <Text style={[styles.label, isDarkMode && styles.textLight]}>{subPool.name}</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholder="DO值"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              keyboardType="numeric"
              value={formData[`do_${poolNumber}_${index + 1}`]}
              onChangeText={(value) => handleInputChange(`do_${poolNumber}_${index + 1}`, value)}
            />
          </View>
        ))}
      </View>
    );
  };

  const pool1SubPools = [
    { name: '厌氧池' },
    { name: '第一好氧池' },
    { name: '第一缺氧池a' },
    { name: '第一缺氧池b' },
    { name: '第二好氧池' },
    { name: '第二缺氧池a' },
    { name: '第二缺氧池b' },
    { name: '第三好氧池' },
    { name: '第三缺氧池a' },
    { name: '第三缺氧池b' },
    { name: '第四好氧池' },
  ];

  const pool2SubPools = [...pool1SubPools];

  const pool3SubPools = [
    { name: '厌氧池' },
    { name: '第一好氧池a' },
    { name: '第一好氧池b' },
    { name: '第一缺氧池a' },
    { name: '第一缺氧池b' },
    { name: '第二好氧池a' },
    { name: '第二好氧池b' },
    { name: '第二缺氧池a' },
    { name: '第二缺氧池b' },
    { name: '第三好氧池a' },
    { name: '第三好氧池b' },
    { name: '第三缺氧池a' },
    { name: '第三缺氧池b' },
    { name: '第四好氧池a' },
    { name: '第四好氧池b' },
  ];

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.textLight]}>AO池溶氧值数据填报</Text>
      {renderAOPool(1, pool1SubPools)}
      {renderAOPool(2, pool2SubPools)}
      {renderAOPool(3, pool3SubPools)}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>提交所有AO池数据</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  textLight: {
    color: '#fff',
  },
  aoTableWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aoTableWrapperDark: {
    backgroundColor: '#2d2d2d',
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
    paddingBottom: 8,
    marginBottom: 16,
  },
  poolTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  input: {
    width: 120,
    height: 40,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  inputDark: {
    backgroundColor: '#3d3d3d',
    borderColor: '#4d4d4d',
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginVertical: 20,
    alignSelf: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AODataEntryScreen;