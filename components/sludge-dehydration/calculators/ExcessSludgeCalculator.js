import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useExcessSludge } from '../context/ExcessSludgeContext';
import SaveSchemeForm from '../shared/SaveSchemeForm';
import createStyles from '../styles/calculatorStyles';

const ExcessSludgeCalculator = () => {
  const { colors, isDarkMode } = useTheme();
  const {
    excessSludgeParams,
    excessSludgeResults,
    paramWarning,
    handleExcessSludgeParamChange,
    increaseParam,
    decreaseParam,
    resetToRecommendedParams,
    saveCurrentScheme
  } = useExcessSludge();
  
  const styles = createStyles(colors, isDarkMode);
  
  // 渲染输入字段
  const renderInputField = (label, param, value) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}:</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => decreaseParam(param)}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={value.toString()}
          onChangeText={(value) => handleExcessSludgeParamChange(param, value)}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => increaseParam(param)}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>活性污泥法剩余污泥计算</Text>
      <Text style={styles.sectionSubtitle}>
        输入处理工艺参数，计算剩余污泥量
      </Text>

      {/* 各参数输入字段 */}
      {renderInputField('污泥浓度 (mg/L)', 'sludgeConcentration', excessSludgeParams.sludgeConcentration)}
      {renderInputField('曝气池容积 (m³)', 'tankVolume', excessSludgeParams.tankVolume)}
      {renderInputField('SV30 (%)', 'sv30', excessSludgeParams.sv30)}
      {renderInputField('进水流量 (m³/d)', 'influentFlow', excessSludgeParams.influentFlow)}
      {renderInputField('进水COD (mg/L)', 'influentCod', excessSludgeParams.influentCod)}
      {renderInputField('出水COD (mg/L)', 'effluentCod', excessSludgeParams.effluentCod)}
      {renderInputField('污泥产率系数 Y', 'sludgeYield', excessSludgeParams.sludgeYield)}
      {renderInputField('污泥衰减系数 Kd', 'sludgeDecay', excessSludgeParams.sludgeDecay)}
      
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
            <Text style={[
              styles.resultLabel,
              excessSludgeResults.srt > 100 || excessSludgeResults.srt < 5 ? styles.warningValue : null
            ]}>污泥龄 (SRT):</Text>
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
          onPress={resetToRecommendedParams}
        >
          <Text style={styles.recommendButtonText}>恢复推荐参数</Text>
        </TouchableOpacity>
      </View>

      <SaveSchemeForm onSave={saveCurrentScheme} />
    </View>
  );
};

export default ExcessSludgeCalculator; 