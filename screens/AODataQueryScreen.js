import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { Dimensions } from 'react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { dataApi } from '../api/apiService';

const AODataQueryScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const [selectedAO, setSelectedAO] = useState('1#AO池');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [aoData, setAoData] = useState([]);
  const [showAOPicker, setShowAOPicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedDateRange, setSelectedDateRange] = useState('7');

  const dateRangeOptions = [
    { label: '最近7天', value: '7' },
    { label: '最近15天', value: '15' },
    { label: '最近30天', value: '30' },
    { label: '当月', value: 'current_month' },
    { label: '上月', value: 'last_month' }
  ];

  const handleDateRangeSelect = (value) => {
    setSelectedDateRange(value);
    const today = new Date();
    let newStartDate = new Date();
    let newEndDate = new Date();

    switch (value) {
      case '7':
        newStartDate.setDate(today.getDate() - 7);
        break;
      case '15':
        newStartDate.setDate(today.getDate() - 15);
        break;
      case '30':
        newStartDate.setDate(today.getDate() - 30);
        break;
      case 'current_month':
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        newEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        newStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        newEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        break;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const isDateRangeSelected = (value) => {
    if (!selectedDateRange) return false;
    if (value === selectedDateRange) return true;
    
    const today = new Date();
    let expectedStartDate = new Date();
    let expectedEndDate = new Date();

    switch (value) {
      case '7':
        expectedStartDate.setDate(today.getDate() - 7);
        return startDate.toDateString() === expectedStartDate.toDateString() && 
               endDate.toDateString() === today.toDateString();
      case '15':
        expectedStartDate.setDate(today.getDate() - 15);
        return startDate.toDateString() === expectedStartDate.toDateString() && 
               endDate.toDateString() === today.toDateString();
      case '30':
        expectedStartDate.setDate(today.getDate() - 30);
        return startDate.toDateString() === expectedStartDate.toDateString() && 
               endDate.toDateString() === today.toDateString();
      case 'current_month':
        expectedStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        expectedEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return startDate.toDateString() === expectedStartDate.toDateString() && 
               endDate.toDateString() === expectedEndDate.toDateString();
      case 'last_month':
        expectedStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        expectedEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        return startDate.toDateString() === expectedStartDate.toDateString() && 
               endDate.toDateString() === expectedEndDate.toDateString();
      default:
        return false;
    }
  };

  const handleStartConfirm = (date) => {
    setStartDate(date);
    setShowStartPicker(false);
  };

  const handleEndConfirm = (date) => {
    setEndDate(date);
    setShowEndPicker(false);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const poolConfigs = {
    '1#AO池': [
      { name: '厌氧池', key: 'anaerobic' },
      { name: '第一好氧池', key: 'aerobic_1' },
      { name: '第一缺氧池a', key: 'anoxic_1a' },
      { name: '第一缺氧池b', key: 'anoxic_1b' },
      { name: '第二好氧池', key: 'aerobic_2' },
      { name: '第二缺氧池a', key: 'anoxic_2a' },
      { name: '第二缺氧池b', key: 'anoxic_2b' },
      { name: '第三好氧池', key: 'aerobic_3' },
      { name: '第三缺氧池a', key: 'anoxic_3a' },
      { name: '第三缺氧池b', key: 'anoxic_3b' },
      { name: '第四好氧池', key: 'aerobic_4' }
    ],
    '2#AO池': [
      { name: '厌氧池', key: 'anaerobic' },
      { name: '第一好氧池', key: 'aerobic_1' },
      { name: '第一缺氧池a', key: 'anoxic_1a' },
      { name: '第一缺氧池b', key: 'anoxic_1b' },
      { name: '第二好氧池', key: 'aerobic_2' },
      { name: '第二缺氧池a', key: 'anoxic_2a' },
      { name: '第二缺氧池b', key: 'anoxic_2b' },
      { name: '第三好氧池', key: 'aerobic_3' },
      { name: '第三缺氧池a', key: 'anoxic_3a' },
      { name: '第三缺氧池b', key: 'anoxic_3b' },
      { name: '第四好氧池', key: 'aerobic_4' }
    ],
    '3#AO池': [
      { name: '厌氧池', key: 'anaerobic' },
      { name: '第一好氧池a', key: 'aerobic_1a' },
      { name: '第一好氧池b', key: 'aerobic_1b' },
      { name: '第一缺氧池a', key: 'anoxic_1a' },
      { name: '第一缺氧池b', key: 'anoxic_1b' },
      { name: '第二好氧池a', key: 'aerobic_2a' },
      { name: '第二好氧池b', key: 'aerobic_2b' },
      { name: '第二缺氧池a', key: 'anoxic_2a' },
      { name: '第二缺氧池b', key: 'anoxic_2b' },
      { name: '第三好氧池a', key: 'aerobic_3a' },
      { name: '第三好氧池b', key: 'aerobic_3b' },
      { name: '第三缺氧池a', key: 'anoxic_3a' },
      { name: '第三缺氧池b', key: 'anoxic_3b' },
      { name: '第四好氧池a', key: 'aerobic_4a' },
      { name: '第四好氧池b', key: 'aerobic_4b' }
    ]
  };

  const aoOptions = Object.keys(poolConfigs);

  const fetchAOData = async () => {
    if (!selectedAO || !startDate || !endDate) {
      alert('请填写完整查询条件');
      return;
    }

    setLoading(true);
    setLoadingStartTime(Date.now());
    
    try {
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      const response = await dataApi.queryAOData({
        aoName: selectedAO,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      
      const data = response;
      
      // 获取当前选中AO池的配置
      const currentConfig = poolConfigs[selectedAO] || [];
      if (currentConfig.length === 0) {
        throw new Error('未找到对应的AO池配置');
      }

      // 创建映射关系
      const poolMapping = {};
      currentConfig.forEach(pool => {
        poolMapping[pool.name] = pool.key;
      });

      // 按日期分组数据
      const groupedData = {};
      data.forEach(record => {
        const date = record.submit_time.split('T')[0];
        if (!groupedData[date]) {
          groupedData[date] = {
            date: date,
            values: {}
          };
          // 初始化所有子池的值为0
          currentConfig.forEach(pool => {
            groupedData[date].values[pool.key] = 0;
          });
        }

        // 根据poolName更新对应的数值
        const columnKey = poolMapping[record.poolName];
        if (columnKey) {
          groupedData[date].values[columnKey] = parseFloat(record.doValue);
        }
      });

      // 转换为数组格式
      const formattedData = Object.values(groupedData)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(item => ({
          date: item.date,
          values: currentConfig.map(pool => item.values[pool.key] || 0)
        }));
        
      // 确保加载状态至少持续2秒
      const currentTime = Date.now();
      const elapsedTime = currentTime - loadingStartTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // 更新数据
      setAoData(formattedData);
      // 完成加载状态
      setLoading(false);
      
      // 在加载状态消失后，如果没有数据再提示
      if (formattedData.length === 0) {
        setTimeout(() => {
          Alert.alert('提示', '所选时间范围内无AO池数据');
        }, 100);
      }
    } catch (error) {
      console.error('数据获取失败:', error);
      setLoading(false);
      setTimeout(() => {
        Alert.alert('错误', '获取AO池数据失败，请检查网络连接后重试');
      }, 100);
    }
  };

  const exportToExcel = async () => {
    if (aoData.length === 0) {
      Alert.alert('提示', '没有数据可导出');
      return;
    }

    try {
      // 获取当前选中AO池的配置
      const currentConfig = poolConfigs[selectedAO] || [];
      if (currentConfig.length === 0) {
        throw new Error('未找到对应的AO池配置');
      }

      // 准备导出数据
      const exportData = aoData.map(row => {
        const newRow = {
          '日期': row.date
        };
        // 添加每个子池的数据
        currentConfig.forEach((pool, index) => {
          newRow[pool.name] = Number(row.values[index]).toFixed(2);
        });
        return newRow;
      });

      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const colWidths = [
        { wch: 12 }, // 日期列宽
        ...currentConfig.map(() => ({ wch: 15 })) // 数据列宽
      ];
      ws['!cols'] = colWidths;

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DO数据');

      // 生成Excel文件
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // 生成文件名
      const formatDateForFileName = (date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '');
      };

      // 生成安全的文件名（移除可能导致问题的字符）
      const safeAOName = selectedAO.replace(/#/g, '号');
      const startDateStr = formatDateForFileName(startDate);
      const endDateStr = formatDateForFileName(endDate);
      const timestamp = Date.now();
      
      // 确保文件名不包含特殊字符
      const fileName = `${safeAOName}_DO数据_${startDateStr}_${endDateStr}.xlsx`;
      const filePath = FileSystem.documentDirectory + fileName;

      // 写入文件
      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      // 分享文件
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `${selectedAO} DO数据 ${startDate.toLocaleDateString('zh-CN')} 至 ${endDate.toLocaleDateString('zh-CN')}`,
        UTI: 'com.microsoft.excel.xlsx'
      });

      // 删除临时文件
      await FileSystem.deleteAsync(filePath).catch(err => 
        console.warn('清理临时文件失败:', err)
      );

    } catch (error) {
      console.error('导出失败:', error);
      Alert.alert('错误', '导出数据失败');
    }
  };

  useEffect(() => {
    // This will run when the component mounts
    // No auto fetch here

    // Return cleanup function that runs when component unmounts
    return () => {
      // Clear any data/cache when leaving the screen
      setAoData([]);
      setCurrentPage(1);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.aoSelector}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>选择AO池</Text>
          <View style={styles.aoButtonsContainer}>
            {aoOptions.map((ao) => (
              <TouchableOpacity
                key={ao}
                style={[
                  styles.siteButton,
                  selectedAO === ao && styles.selectedSiteButton,
                  { backgroundColor: selectedAO === ao ? colors.primary : colors.card }
                ]}
                onPress={() => setSelectedAO(ao)}
              >
                <Text style={[
                  styles.siteButtonText,
                  { color: selectedAO === ao ? '#fff' : colors.text }
                ]}>
                  {ao}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.datePickerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>快速选择日期范围</Text>
          <View style={styles.quickSelectButtons}>
            {dateRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.quickSelectButton,
                  isDateRangeSelected(option.value) ? styles.selectedQuickSelectButton : null,
                  { backgroundColor: isDateRangeSelected(option.value) ? colors.primary : colors.card }
                ]}
                onPress={() => handleDateRangeSelect(option.value)}
              >
                <Text style={[
                  styles.quickSelectButtonText,
                  { color: isDateRangeSelected(option.value) ? '#fff' : colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>选择具体时间范围</Text>
          <View style={styles.dateInputsContainer}>
            <View style={styles.datePickersWrapper}>
              <TouchableOpacity 
                style={[styles.datePickerButton, { backgroundColor: colors.card }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.text} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dateRangeSeparator, { color: colors.text }]}>至</Text>

              <TouchableOpacity 
                style={[styles.datePickerButton, { backgroundColor: colors.card }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.text} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={fetchAOData}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {aoData.length > 0 && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportToExcel}
          >
            <Ionicons name="download" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>导出</Text>
          </TouchableOpacity>
        </View>
      )}

      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="datetime"
        onConfirm={handleStartConfirm}
        onCancel={() => setShowStartPicker(false)}
        date={startDate}
        locale="zh_CN"
        cancelTextIOS="取消"
        confirmTextIOS="确定"
        headerTextIOS="选择开始时间"
        modalStyleIOS={[styles.dateTimePickerModal, { backgroundColor: colors.card }]}
        pickerContainerStyleIOS={[styles.pickerContainer, { backgroundColor: colors.card }]}
        customStyles={{
          dateIcon: { display: 'none' },
          dateInput: { marginLeft: 36, borderWidth: 0 },
          datePickerCon: {
            backgroundColor: colors.card,
            borderRadius: 12,
          },
          datePicker: {
            backgroundColor: colors.card,
          },
          btnTextConfirm: {
            color: colors.primary,
          },
          btnTextCancel: {
            color: colors.text,
          },
        }}
        isDarkMode={isDarkMode}
      />

      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="datetime"
        onConfirm={handleEndConfirm}
        onCancel={() => setShowEndPicker(false)}
        date={endDate}
        locale="zh_CN"
        cancelTextIOS="取消"
        confirmTextIOS="确定"
        headerTextIOS="选择结束时间"
        modalStyleIOS={[styles.dateTimePickerModal, { backgroundColor: colors.card }]}
        pickerContainerStyleIOS={[styles.pickerContainer, { backgroundColor: colors.card }]}
        customStyles={{
          dateIcon: { display: 'none' },
          dateInput: { marginLeft: 36, borderWidth: 0 }
        }}
        isDarkMode={isDarkMode}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={showAOPicker}
        onRequestClose={() => setShowAOPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>选择AO池</Text>
            <View style={styles.sampleButtonsGrid}>
              {aoOptions.map((ao) => (
                <TouchableOpacity
                  key={ao}
                  style={[styles.sampleButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setSelectedAO(ao);
                    setShowAOPicker(false);
                  }}
                >
                  <Text style={[styles.sampleButtonText, { color: colors.text }]}>{ao}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAOPicker(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.content}>
        {aoData.length > 0 && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={[styles.paginationInfo]}>
                <Text style={{ color: colors.text }}>总记录数: {aoData.length} | 当前页: {currentPage} / {Math.ceil(aoData.length / itemsPerPage)}</Text>
              </View>
              <ScrollView horizontal>
                <View style={styles.tableContainer}>
                  <View style={[styles.tableHeader, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.headerCell, styles.dateCell]}>日期</Text>
                    {poolConfigs[selectedAO]?.map((pool) => (
                      <Text key={pool.key} style={[styles.headerCell, styles.valueCell]}>{pool.name}</Text>
                    ))}
                  </View>
                  {aoData
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((data, index) => (
                      <View
                        key={data.date}
                        style={[styles.tableRow, { backgroundColor: colors.card }]}
                      >
                        <Text style={[styles.cell, styles.dateCell, { color: colors.text }]}>{data.date}</Text>
                        {data.values.map((value, i) => (
                          <Text key={i} style={[styles.cell, styles.valueCell, { color: colors.text }]}>{value.toFixed(2)}</Text>
                        ))}
                      </View>
                  ))}
                </View>
              </ScrollView>
              <View style={[styles.paginationContainer]}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.paginationButtonText}>上一页</Text>
                </TouchableOpacity>
                <Text style={[styles.paginationText, { color: colors.text }]}>
                  {currentPage} / {Math.ceil(aoData.length / itemsPerPage)}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage >= Math.ceil(aoData.length / itemsPerPage) && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(aoData.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(aoData.length / itemsPerPage)}
                >
                  <Text style={styles.paginationButtonText}>下一页</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* 加载状态模态框 */}
      <Modal
        visible={loading}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalView}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              正在获取AO池数据，请稍候...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  aoSelector: {
    marginBottom: 16,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  aoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  siteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  selectedSiteButton: {
    backgroundColor: '#2196F3',
  },
  siteButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedSiteButtonText: {
    color: '#fff',
  },
  quickSelectButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectButton: {
    flex: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedQuickSelectButton: {
    borderColor: 'transparent',
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickersWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
  },
  dateRangeSeparator: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  searchButton: {
    padding: 12,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  exportButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  sampleButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sampleButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  sampleButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    marginHorizontal: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  tableContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
  },
  tableRow: {
    flexDirection: 'row',
  },
  headerCell: {
    padding: 12,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  cell: {
    padding: 12,
    textAlign: 'center',
    fontSize: 16
  },
  dateCell: {
    width: 120,
  },
  valueCell: {
    width: 100,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  paginationButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paginationInfo: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 15,
  },
  dateTimePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    alignSelf: 'center',
    justifyContent: 'center',
    marginVertical: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 200,
    maxHeight: 300,
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingModalView: {
    backgroundColor: 'white', 
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    color: '#000',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AODataQueryScreen;