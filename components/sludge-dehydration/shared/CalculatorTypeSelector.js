import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useCalculator } from '../context/SludgeCalculatorContext';
import createStyles from '../styles/calculatorStyles';

const CalculatorTypeSelector = () => {
  const { colors, isDarkMode } = useTheme();
  const { calculatorType, setCalculatorType } = useCalculator();
  
  const styles = createStyles(colors, isDarkMode);
  
  return (
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
  );
};

export default CalculatorTypeSelector; 