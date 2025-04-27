import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useCalculator } from '../context/SludgeCalculatorContext';
import createStyles from '../styles/calculatorStyles';

const SaveSchemeForm = ({ onSave }) => {
  const { colors, isDarkMode } = useTheme();
  const { 
    schemeName, 
    setSchemeName, 
    setShowHistoryModal, 
    isLoading 
  } = useCalculator();
  
  const styles = createStyles(colors, isDarkMode);
  
  return (
    <View style={styles.saveSchemeContainer}>
      <TextInput
        style={[styles.schemeNameInput, { color: colors.text }]}
        placeholder="输入方案名称以保存"
        placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
        value={schemeName}
        onChangeText={setSchemeName}
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSave}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>{isLoading ? '保存中...' : '保存'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.saveButton, { marginLeft: 8 }]}
        onPress={() => setShowHistoryModal(true)}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>历史</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SaveSchemeForm; 