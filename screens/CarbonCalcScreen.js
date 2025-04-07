import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const CarbonCalcScreen = () => {
  const { isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    flow: '',
    influent_no3: '',
    effluent_no3: '',
    influent_cod: '',
    cod_ratio: '',
    carbon_source: '',
    cod_concentration: '',
    safety_factor: '',
    cn_ratio: ''
  });
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      setError('');
      setResult('');
      
      const response = await fetch('https://zziot.jzz77.cn:9003/api/calculateCarbon', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || '计算失败，请检查输入数据');
      }
    } catch (err) {
      if (err.message.includes('network request failed')) {
        setError('网络连接失败，请检查服务器是否正常运行');
      } else {
        setError('请求失败: ' + err.message);
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: isDarkMode ? '#1a1a1a' : '#f7f9fb',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: isDarkMode ? '#4CAF50' : '#4CAF50',
    },
    inputContainer: {
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      fontSize: 16,
      flex: 1,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    input: {
      backgroundColor: isDarkMode ? '#333333' : '#ffffff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#444444' : '#dddddd',
      borderRadius: 8,
      padding: 12,
      color: isDarkMode ? '#ffffff' : '#000000',
      flex: 1,
      marginLeft: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      borderRadius: 12,
      padding: 20,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    modalOption: {
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#444444' : '#eeeeee',
    },
    modalOptionText: {
      fontSize: 16,
      textAlign: 'center',
    },
    modalCancelButton: {
      marginTop: 20,
      paddingVertical: 15,
      backgroundColor: '#4CAF50',
      borderRadius: 8,
    },
    modalCancelText: {
      color: '#ffffff',
      fontSize: 16,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    button: {
      backgroundColor: '#4CAF50',
      padding: 16,
      borderRadius: 8,
      marginTop: 16,
    },
    buttonText: {
      color: '#ffffff',
      textAlign: 'center',
      fontSize: 18,
      fontWeight: 'bold',
    },
    result: {
      marginTop: 20,
      padding: 16,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#333333' : '#ffffff',
      flex: 1,
      minHeight: 200,
      marginBottom: 20,
    },
    resultText: {
      fontSize: 18,
      textAlign: 'center',
      color: '#4CAF50',
      fontWeight: 'bold',
    },
    errorText: {
      fontSize: 18,
      textAlign: 'center',
      color: '#f44336',
      fontWeight: 'bold',
    },
  });

  return (
    <ScrollView style={styles.container}>


      <View style={styles.inputContainer}>
        <Text style={styles.label}>进水量 (m³/d):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.flow}
          onChangeText={(text) => setFormData({...formData, flow: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>进水 NO₃⁻-N (mg/L):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.influent_no3}
          onChangeText={(text) => setFormData({...formData, influent_no3: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>出水目标 NO₃⁻-N (mg/L):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.effluent_no3}
          onChangeText={(text) => setFormData({...formData, effluent_no3: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>进水 COD (mg/L):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.influent_cod}
          onChangeText={(text) => setFormData({...formData, influent_cod: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>COD 可利用系数 (%):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.cod_ratio}
          onChangeText={(text) => setFormData({...formData, cod_ratio: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>碳源类型：</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
            {formData.carbon_source === 'sodium_acetate' ? '液体乙酸钠' : '点击选择碳源类型'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#333333' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#ffffff' : '#000000' }]}>选择碳源类型</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setFormData({...formData, carbon_source: 'sodium_acetate'});
                setModalVisible(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: isDarkMode ? '#ffffff' : '#000000' }]}>液体乙酸钠</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>碳源COD当量 (mg/L):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.cod_concentration}
          onChangeText={(text) => setFormData({...formData, cod_concentration: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>安全系数 (%):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.safety_factor}
          onChangeText={(text) => setFormData({...formData, safety_factor: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>C/N 比 (默认4):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.cn_ratio}
          onChangeText={(text) => setFormData({...formData, cn_ratio: text})}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>计算</Text>
      </TouchableOpacity>

      <View style={styles.result}>
        {result ? (
          <Text style={styles.resultText}>{result}</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={[styles.resultText, {color: isDarkMode ? '#666666' : '#999999'}]}>
            计算结果将在这里显示
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default CarbonCalcScreen;