import React from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Text,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CalculatorProvider, useCalculator } from '../components/sludge-dehydration/context/SludgeCalculatorContext';
import { ExcessSludgeProvider } from '../components/sludge-dehydration/context/ExcessSludgeContext';
import CalculatorTypeSelector from '../components/sludge-dehydration/shared/CalculatorTypeSelector';
import HistoryModal from '../components/sludge-dehydration/shared/HistoryModal';
import ExcessSludgeCalculator from '../components/sludge-dehydration/calculators/ExcessSludgeCalculator';

// 延迟加载其他计算器组件，等需要时再创建它们

// 渲染占位符
const renderPlaceholder = (type) => {
  return <Text style={{ padding: 20, textAlign: 'center' }}>{type} 计算器组件开发中...</Text>;
};

// 根据当前选择的计算器类型渲染相应组件
const RenderActiveCalculator = () => {
  const { calculatorType } = useCalculator();
  
  switch (calculatorType) {
    case 'PAC':
      return renderPlaceholder('PAC');
    case 'PAM':
      return renderPlaceholder('PAM');
    case 'DOSING':
      return renderPlaceholder('DOSING');
    case 'EXCESS_SLUDGE':
      return (
        <ExcessSludgeProvider>
          <ExcessSludgeCalculator />
        </ExcessSludgeProvider>
      );
    default:
      return null;
  }
};

const SludgeDehydrationCalculatorScreen = () => {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <CalculatorProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F5F5F7' }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 30}
          enabled
        >
          <ScrollView 
            style={{ padding: 12 }}
            contentContainerStyle={{ paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
          >
            <CalculatorTypeSelector />
            
            <RenderActiveCalculator />
            
            <HistoryModal />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </CalculatorProvider>
  );
};

export default SludgeDehydrationCalculatorScreen; 