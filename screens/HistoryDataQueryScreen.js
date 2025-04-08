import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Ionicons from '@expo/vector-icons/Ionicons';

const HistoryDataQueryScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const [selectedTable, setSelectedTable] = useState('gt_data');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);
  const [queryResults, setQueryResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [columnMappings, setColumnMappings] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSelectType, setCurrentSelectType] = useState(null);
  const [dataInterval, setDataInterval] = useState('60');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showRowsPerPageModal, setShowRowsPerPageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('7');
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  const rowsPerPageOptions = [
    { label: '10条/页', value: 10 },
    { label: '20条/页', value: 20 },
    { label: '50条/页', value: 50 },
    { label: '100条/页', value: 100 }
  ];

  const handleIntervalChange = (value) => {
    setDataInterval(value);
  };

  const tableOptions = [
    { label: '高铁厂运行数据', value: 'gt_data' },
    { label: '各设施处理量', value: 'leiji' },
    { label: '5000吨运行数据', value: 'yj_5000' },
    { label: '化验数据', value: 'huayan_data' },
    { label: '污泥化验数据', value: 'sludge_data' },
  ];

  const intervalOptions = [
    { label: '5分钟', value: '5' },
    { label: '30分钟', value: '30' },
    { label: '60分钟', value: '60' }
  ];

  const dateRangeOptions = [
    { label: '最近7天', value: '7' },
    { label: '最近15天', value: '15' },
    { label: '最近30天', value: '30' },
    { label: '当月', value: 'current_month' },
    { label: '上月', value: 'last_month' }
  ];

  useEffect(() => {
    handleDateRangeSelect('7');
  }, []);

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

  const onDateChange = (event, selectedDate, type) => {
    if (event.type === 'dismissed') {
      setStartPickerVisible(false);
      setEndPickerVisible(false);
      return;
    }

    const currentDate = selectedDate || (type.startsWith('start') ? startDate : endDate);

    if (type === 'startDate') {
      setStartDate(currentDate);
      setStartPickerVisible(false);
    } else if (type === 'startTime') {
      const newDate = new Date(startDate);
      newDate.setHours(currentDate.getHours());
      newDate.setMinutes(currentDate.getMinutes());
      setStartDate(newDate);
      setStartPickerVisible(false);
    } else if (type === 'endDate') {
      setEndDate(currentDate);
      setEndPickerVisible(false);
    } else if (type === 'endTime') {
      const newDate = new Date(endDate);
      newDate.setHours(currentDate.getHours());
      newDate.setMinutes(currentDate.getMinutes());
      setEndDate(newDate);
      setEndPickerVisible(false);
    }
  };

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappings = require('./columnMappings.json');
        setColumnMappings(mappings);
      } catch (error) {
        Alert.alert('错误', '加载列映射配置失败');
        console.error('Error loading mappings:', error);
      }
    };
    loadMappings();
  }, []);

  const handleQuery = async () => {
    try {
      if (!selectedTable || !startDate || !endDate) {
        Alert.alert('请填写完所有字段');
        return;
      }

      setLoading(true);
      setLoadingStartTime(Date.now());
      
      const apiEndpoint = 'https://zziot.jzz77.cn:9003/query';
      
      const requestBody = {
        dbName: 'nodered',
        tableName: selectedTable,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        queryType: 'raw'
      };
      
      console.log('Query params:', JSON.stringify(requestBody));
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error('Error response:', response.status, response.statusText);
        const text = await response.text();
        console.error('Error details:', text);
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      console.log('Query response (length):', data.length);
      if (data.length > 0) {
        console.log('First record:', JSON.stringify(data[0]));
      }
      
      // 按照时间间隔过滤数据
      const filteredData = filterDataByInterval(data);
      
      // 确保加载状态至少持续2秒
      const currentTime = Date.now();
      const elapsedTime = currentTime - loadingStartTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // 更新数据
      setQueryResults(filteredData);
      setCurrentPage(1);
      setIsTableVisible(true);
      
      // 结束加载状态并关闭模态框
      setLoading(false);
      setModalVisible(false);
      
      // 在加载状态消失后，如果没有数据再提示
      if (filteredData.length === 0) {
        setTimeout(() => {
          Alert.alert('提示', '所选时间范围内无相关数据');
        }, 100);
      }
    } catch (error) {
      console.error('Query failed:', error);
      setLoading(false);
      setModalVisible(false);
      setTimeout(() => {
        Alert.alert('错误', '查询失败，请检查网络连接后重试');
      }, 100);
    }
  };

  const filterDataByInterval = (data) => {
    // 如果是化验数据或污泥化验数据，直接返回原始数据，不进行时间间隔过滤
    if (selectedTable === 'huayan_data' || selectedTable === 'sludge_data') {
      return data;
    }

    const intervalMinutes = parseInt(dataInterval);
    const intervalMilliseconds = intervalMinutes * 60 * 1000;
    const filteredData = [];
    let lastTime = null;

    data.forEach(row => {
      const rowTime = new Date(row.time);
      if (!lastTime || (rowTime - lastTime) >= intervalMilliseconds) {
        filteredData.push(row);
        lastTime = rowTime;
      }
    });

    return filteredData;
  };

  const renderTableHeader = () => {
    if (queryResults.length === 0) return null;
    const mappings = columnMappings[selectedTable] || {};

    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.timeCell]}>时间</Text>
        {Object.keys(mappings).map(key => {
          if (key !== 'time') {
            return (
              <Text key={key} style={styles.headerCell}>
                {mappings[key]}
              </Text>
            );
          }
          return null;
        })}
      </View>
    );
  };

  const renderTableData = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = queryResults.slice(startIndex, endIndex);

    return pageData.map((row, index) => {
      // 处理时间数据的显示
      let timeDisplay = "";
      try {
        if (row.time) {
          // 确保时间格式正确
          const timeDate = new Date(row.time);
          if (!isNaN(timeDate.getTime())) {
            timeDisplay = timeDate.toLocaleString('zh-CN', { hour12: false });
          } else {
            timeDisplay = row.time.toString();
          }
        } else {
          timeDisplay = "无时间数据";
        }
      } catch (e) {
        console.warn("日期解析错误:", e);
        timeDisplay = row.time ? row.time.toString() : "无时间数据";
      }

      return (
        <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
          <Text style={[styles.cell, styles.timeCell]}>
            {timeDisplay}
          </Text>
          {Object.keys(columnMappings[selectedTable] || {}).map(key => {
            if (key !== 'time') {
              return (
                <Text key={key} style={styles.cell}>
                  {typeof row[key] === 'number' ? row[key].toFixed(2) : row[key]}
                </Text>
              );
            }
            return null;
          })}
        </View>
      );
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < Math.ceil(queryResults.length / rowsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const pickerSelectStyles = {
    inputIOS: {
      fontSize: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      color: colors.text,
      backgroundColor: colors.card,
      paddingRight: 30,
      marginBottom: 8,
      minHeight: 45
    },
    inputAndroid: {
      fontSize: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      color: colors.text,
      backgroundColor: colors.card,
      paddingRight: 30,
      marginBottom: 8,
      minHeight: 45
    },
    iconContainer: {
      top: 12,
      right: 10,
    },
    placeholder: {
      color: colors.text,
      fontSize: 14
    }
  };

  const renderModal = () => {
    const getOptions = () => {
      switch (currentSelectType) {
        case 'table':
          return tableOptions;
        case 'interval':
          // 如果选择的是化验数据，则不显示时间间隔选项
          return selectedTable === 'huayan_data' ? [] : intervalOptions;
        default:
          return [];
      }
    };

    const handleSelect = (value) => {
      switch (currentSelectType) {
        case 'table':
          setSelectedTable(value);
          break;
        case 'interval':
          setDataInterval(value);
          break;
      }
      setModalVisible(false);
    };

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {currentSelectType === 'table' ? '选择查询内容' :
               currentSelectType === 'interval' ? '选择数据间隔' : ''}
            </Text>
            <View style={styles.optionsContainer}>
              {getOptions().map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    (currentSelectType === 'table' && selectedTable === option.value) ||
                    (currentSelectType === 'interval' && dataInterval === option.value)
                      ? styles.optionButtonSelected
                      : null
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    (currentSelectType === 'table' && selectedTable === option.value) ||
                    (currentSelectType === 'interval' && dataInterval === option.value)
                      ? styles.optionButtonTextSelected
                      : null
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const styles = StyleSheet.create({
    rowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 12,
      zIndex: 1,
    },
    displayBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    displayText: {
      color: colors.text,
      fontSize: 14
    },
    selectButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    tableContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    headerCell: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '600',
      width: 120,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    evenRow: {
      backgroundColor: colors.card,
    },
    oddRow: {
      backgroundColor: colors.background,
    },
    cell: {
      color: colors.text,
      fontSize: 14,
      width: 120,
      textAlign: 'center',
    },
    timeCell: {
      width: 180,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      backgroundColor: colors.card,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    paginationButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      marginHorizontal: 8,
    },
    paginationButtonDisabled: {
      backgroundColor: colors.border,
    },
    paginationButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '500',
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    queryCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      margin: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 0,
    },
    queryScrollView: {
      maxHeight: 400,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: colors.text,
      fontWeight: '500',
    },
    timeRangeContainer: {
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12
    },
    timeInput: {
      flex: 1,
      flexDirection: 'column',
      gap: 8
    },
    timeLabel: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4
    },
    dateButton: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center'
    },
    dateButtonText: {
      color: colors.text,
      fontSize: 14,
      textAlign: 'center'
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 10,
      gap: 12,
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    queryButton: {
      backgroundColor: colors.primary,
    },
    exportButton: {
      backgroundColor: '#4CAF50',
    },
    buttonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalView: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 12,
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
      color: colors.text,
    },
    optionsContainer: {
      marginBottom: 20,
    },
    optionButton: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionButtonText: {
      color: colors.text,
      fontSize: 14,
      textAlign: 'center',
    },
    optionButtonTextSelected: {
      color: colors.white,
      fontWeight: '500',
    },
    modalButton: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.border,
    },
    modalButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '500',
    },
    selectButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    selectButtonText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    selectButtonIcon: {
      marginLeft: 8,
      color: colors.text,
    },
    dateRangeContainer: {
      marginBottom: 20,
    },
    dateInputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    dateInputContainer: {
      flex: 1,
    },
    dateTimePickerModal: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginHorizontal: 20,
      padding: 16,
      alignSelf: 'center',
      justifyContent: 'center',
      marginVertical: '100%', // 上下边距
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
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      minHeight: 200,
      maxHeight: 300,
    },
    pickerScrollView: {
      flexGrow: 0,
    },
    pickerContent: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    pickerColumn: {
      flex: 1,
      alignItems: 'center',
    },
    pickerColumnHeader: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.text,
    },
    dateButton: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    dateButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateButtonText: {
      fontSize: 14,
      flex: 1,
    },
    yearSelectorContainer: {
      marginBottom: 20,
    },
    yearScrollView: {
      marginTop: 8,
    },
    yearButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    yearButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    yearButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    yearButtonTextSelected: {
      color: '#fff',
    },
    resultsContainer: {
      marginTop: 16,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    paginationInfo: {
      marginBottom: 16,
    },
    paginationInfoContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    paginationText: {
      color: colors.text,
      fontSize: 14,
    },
    rowsPerPageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    rowsPerPageText: {
      color: colors.text,
      fontSize: 14,
    },
    rowsPerPageOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginVertical: 4,
    },
    rowsPerPageOptionSelected: {
      backgroundColor: colors.primary,
    },
    rowsPerPageOptionText: {
      color: colors.text,
      fontSize: 16,
    },
    rowsPerPageOptionTextSelected: {
      color: colors.white,
      fontWeight: '600',
    },
    tableBody: {
      maxHeight: 400, // 设置表格主体的最大高度
    },
    mainScrollView: {
      flex: 1,
    },
    dateRangeScrollView: {
      marginTop: 8,
    },
    dateRangeButton: {
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginRight: 8,
    },
    dateRangeButtonText: {
      fontSize: 14,
    },
    loadingModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingModalView: {
      backgroundColor: colors.card,
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
      color: colors.text,
      marginTop: 16,
      textAlign: 'center',
    },
  });

  const handleExportAndShare = async () => {
    try {
      if (queryResults.length === 0) {
        Alert.alert('提示', '没有可导出的数据');
        return;
      }

      // 根据选择的时间间隔过滤数据
      const dataToExport = filterDataByInterval(queryResults);

      // 准备Excel数据
      const mappings = columnMappings[selectedTable] || {};
      const ws = XLSX.utils.json_to_sheet(dataToExport.map(row => {
        const formattedRow = {};
        formattedRow['时间'] = new Date(row.time).toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
        Object.keys(mappings).forEach(key => {
          if (key !== 'time') {
            formattedRow[mappings[key]] = typeof row[key] === 'number' ? row[key].toFixed(2) : row[key];
          }
        });
        return formattedRow;
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '历史数据查询结果');

      // 生成Excel文件
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `历史数据_${new Date().getTime()}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      // 保存文件
      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      // 分享文件
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: '分享数据文件'
      });

      // 删除临时文件
      await FileSystem.deleteAsync(filePath);
    } catch (error) {
      console.error('导出分享失败:', error);
      Alert.alert('错误', '导出分享失败: ' + error.message);
    }
  };

  const handleStartConfirm = (date) => {
    setStartDate(date);
    setStartPickerVisible(false);
  };

  const handleEndConfirm = (date) => {
    setEndDate(date);
    setEndPickerVisible(false);
  };

  const handleYearSelect = (year) => {
    const newStartDate = new Date(year, 0, 1); // 所选年份的1月1日
    const newEndDate = new Date(year, 11, 31); // 所选年份的12月31日
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setSelectedYear(year);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2022; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1); // 重置到第一页
    setShowRowsPerPageModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.mainScrollView}
        nestedScrollEnabled={true}
      >
        <View style={styles.queryCard}>
          {/* 查询表单内容 */}
          {renderModal()}
          
          {/* 查询内容选择 */}
          <View style={styles.rowContainer}>
            <View style={styles.displayBox}>
              <Text style={styles.displayText}>
                {tableOptions.find(option => option.value === selectedTable)?.label || '请选择查询内容'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                setCurrentSelectType('table');
                setModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>选择</Text>
            </TouchableOpacity>
          </View>

          {/* 间隔时间选择 */}
          <View style={styles.rowContainer}>
            <View style={styles.displayBox}>
              <Text style={styles.displayText}>
                {intervalOptions.find(option => option.value === dataInterval)?.label || '请选择间隔时间'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                setCurrentSelectType('interval');
                setModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>选择</Text>
            </TouchableOpacity>
          </View>

          {/* 快速选择日期范围 */}
          <View style={styles.dateRangeContainer}>
            <Text style={[styles.label, { color: colors.text }]}>快速选择日期范围</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dateRangeScrollView}
            >
              {dateRangeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateRangeButton,
                    { borderColor: colors.border },
                    selectedDateRange === option.value && { 
                      backgroundColor: colors.primary, 
                      borderColor: colors.primary 
                    }
                  ]}
                  onPress={() => handleDateRangeSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.dateRangeButtonText,
                      { color: colors.text },
                      selectedDateRange === option.value && { color: '#fff' }
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 时间范围选择 */}
          <View style={styles.dateRangeContainer}>
            <View style={styles.dateInputRow}>
              {/* 开始时间 */}
              <View style={styles.dateInputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>开始时间</Text>
                <TouchableOpacity 
                  style={[styles.dateButton, { backgroundColor: colors.card }]}
                  onPress={() => setStartPickerVisible(true)}
                >
                  <View style={styles.dateButtonContent}>
                    <Ionicons name="calendar-outline" size={20} color={colors.text} />
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {startDate.toLocaleString('zh-CN', { 
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* 结束时间 */}
              <View style={styles.dateInputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>结束时间</Text>
                <TouchableOpacity 
                  style={[styles.dateButton, { backgroundColor: colors.card }]}
                  onPress={() => setEndPickerVisible(true)}
                >
                  <View style={styles.dateButtonContent}>
                    <Ionicons name="calendar-outline" size={20} color={colors.text} />
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {endDate.toLocaleString('zh-CN', { 
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* 修改日期选择器的样式和布局 */}
            <DateTimePickerModal
              isVisible={isStartPickerVisible}
              mode="datetime"
              onConfirm={handleStartConfirm}
              onCancel={() => setStartPickerVisible(false)}
              date={startDate}
              locale="zh_CN"
              cancelTextIOS="取消"
              confirmTextIOS="确定"
              headerTextIOS="选择开始时间"
              modalStyleIOS={styles.dateTimePickerModal}
              pickerContainerStyleIOS={styles.pickerContainer}
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
              isVisible={isEndPickerVisible}
              mode="datetime"
              onConfirm={handleEndConfirm}
              onCancel={() => setEndPickerVisible(false)}
              date={endDate}
              locale="zh_CN"
              cancelTextIOS="取消"
              confirmTextIOS="确定"
              headerTextIOS="选择结束时间"
              modalStyleIOS={styles.dateTimePickerModal}
              pickerContainerStyleIOS={styles.pickerContainer}
              customStyles={{
                dateIcon: { display: 'none' },
                dateInput: { marginLeft: 36, borderWidth: 0 }
              }}
              isDarkMode={isDarkMode}
            />
          </View>

          {/* 按钮容器 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.queryButton]} 
              onPress={handleQuery}
            >
              <Text style={styles.buttonText}>查询</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.exportButton]} 
              onPress={handleExportAndShare}
            >
              <Text style={styles.buttonText}>导出分享</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 查询结果显示 */}
        {queryResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.paginationInfo}>
              <View style={styles.paginationInfoContent}>
                <Text style={styles.paginationText}>
                  总记录数: {queryResults.length}
                </Text>
                <TouchableOpacity 
                  style={styles.rowsPerPageButton}
                  onPress={() => setShowRowsPerPageModal(true)}
                >
                  <Text style={styles.rowsPerPageText}>{rowsPerPage}条/页</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.paginationText}>
                  当前页: {currentPage} / {Math.ceil(queryResults.length / rowsPerPage)}
                </Text>
              </View>
            </View>
            <View style={styles.tableContainer}>
              <ScrollView horizontal>
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.timeCell]}>时间</Text>
                    {Object.keys(columnMappings[selectedTable] || {}).map(key => {
                      if (key !== 'time') {
                        return (
                          <Text key={key} style={styles.headerCell}>
                            {columnMappings[selectedTable][key]}
                          </Text>
                        );
                      }
                      return null;
                    })}
                  </View>
                  <ScrollView 
                    style={styles.tableBody}
                    nestedScrollEnabled={true}
                    onScrollEndDrag={({nativeEvent}) => {
                      const {contentOffset, contentSize, layoutMeasurement} = nativeEvent;
                      // 当滚动到顶部或底部时，允许外层ScrollView滚动
                      if (contentOffset.y <= 0 || 
                          contentOffset.y >= contentSize.height - layoutMeasurement.height) {
                        // 不做任何处理，允许事件冒泡到外层ScrollView
                      }
                    }}
                  >
                    {renderTableData()}
                  </ScrollView>
                </View>
              </ScrollView>
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.paginationButtonText}>上一页</Text>
                </TouchableOpacity>
                <Text style={[styles.paginationButtonText, { marginHorizontal: 10 }]}>{currentPage} / {Math.ceil(queryResults.length / rowsPerPage)}</Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage >= Math.ceil(queryResults.length / rowsPerPage) && styles.paginationButtonDisabled]}
                  onPress={handleNextPage}
                  disabled={currentPage >= Math.ceil(queryResults.length / rowsPerPage)}
                >
                  <Text style={styles.paginationButtonText}>下一页</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 添加每页显示数量选择模态框 */}
        <Modal
          visible={showRowsPerPageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRowsPerPageModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRowsPerPageModal(false)}
          >
            <View style={[styles.modalView, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                选择每页显示数量
              </Text>
              {rowsPerPageOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.rowsPerPageOption,
                    rowsPerPage === option.value && styles.rowsPerPageOptionSelected
                  ]}
                  onPress={() => handleRowsPerPageChange(option.value)}
                >
                  <Text style={[
                    styles.rowsPerPageOptionText,
                    rowsPerPage === option.value && styles.rowsPerPageOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
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
              数据查询中，请稍候...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HistoryDataQueryScreen;