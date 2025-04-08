import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import columnMappings from './columnMappings.json';

const DataQueryScreen = () => {
  const { colors } = useTheme();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [interval, setInterval] = useState('hour');
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const pickerSelectStyles = {
    inputIOS: {
      fontSize: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.text,
      borderRadius: 8,
      color: colors.text,
      backgroundColor: colors.card,
      paddingRight: 30
    },
    inputAndroid: {
      fontSize: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.text,
      borderRadius: 8,
      color: colors.text,
      backgroundColor: colors.card,
      paddingRight: 30
    },
    iconContainer: {
      top: 12,
      right: 10,
    }
  };

  const handleQuery = async () => {
    try {
      const adjustedStartDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
      const adjustedEndDate = new Date(endDate.getTime() + 8 * 60 * 60 * 1000);

      const response = await fetch(`https://zziot.jzz77.cn:9003/api/query-data/${selectedTable}?startDate=${adjustedStartDate.toISOString()}&endDate=${adjustedEndDate.toISOString()}&interval=${interval}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('返回的数据格式不是JSON');
      }

      const result = await response.json();
      if (!Array.isArray(result)) {
        throw new Error('返回的数据格式不正确');
      }

      setData(result);
    } catch (error) {
      console.error('查询失败:', error);
      Alert.alert('错误', `数据查询失败: ${error.message}`);
    }
  };

  const clearData = () => {
    setData([]);
  };

  const exportToExcel = async () => {
    if (data.length === 0) {
      Alert.alert('提示', '没有数据可导出');
      return;
    }

    try {
      const exportData = data.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          if (key !== 'time_group' && key !== 'time') {
            newRow[columnMappings[selectedTable]?.[key] || key] = row[key];
          } else if (key === 'time_group') {
            newRow['时间'] = row[key];
          }
        });
        return newRow;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const fileName = `${selectedTable}_${new Date().getTime()}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: '导出数据',
      });
    } catch (error) {
      console.error('导出失败:', error);
      Alert.alert('错误', '导出数据失败');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    queryCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
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
    datePickerButton: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    datePickerButtonText: {
      color: colors.text,
      fontSize: 14,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      gap: 12,
    },
    button: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    dataContainer: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginTop: 16,
    },
    tableContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
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
    timeCell: {
      width: 180,
    },
    tableBody: {
      maxHeight: 400,
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
    paginationInfo: {
      padding: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timeRangeContainer: {
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12
    },
    timeInput: {
      flex: 1
    },
    dateButton: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center'
    },
    dateButtonText: {
      color: colors.text,
      fontSize: 14
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.queryCard}>
        <ScrollView style={styles.queryScrollView}>
          <View style={styles.section}>
            <Text style={styles.label}>选择表格：</Text>
            <RNPickerSelect
              onValueChange={(value) => setSelectedTable(value)}
              value={selectedTable}
              items={[
                { label: '请选择表格', value: '' },
                { label: '各设施处理量', value: 'leiji' },
                { label: '高铁厂运行数据', value: 'gt_data' },
                { label: '5000吨运行数据', value: 'yj_5000' },
                { label: '化验室填报数据', value: 'huayan_data' }
              ]}
              style={pickerSelectStyles}
              useNativeAndroidPickerStyle={false}
              placeholder={{}}
              touchableWrapperProps={{
                activeOpacity: 0.5
              }}
              doneText="确定"
              onOpen={() => {}}
              Icon={() => {
                return (
                  <View
                    style={{
                      backgroundColor: 'transparent',
                      borderTopWidth: 5,
                      borderRightWidth: 5,
                      borderBottomWidth: 0,
                      borderLeftWidth: 5,
                      borderTopColor: '#999',
                      borderRightColor: 'transparent',
                      borderLeftColor: 'transparent',
                      width: 0,
                      height: 0
                    }}
                  />
                );
              }}
            />
          </View>

          <View style={styles.timeSection}>
            <View style={styles.timeRangeContainer}>
              <View style={styles.timeInput}>
                <Text style={styles.label}>开始时间：</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateButton}>
                  <Text style={styles.dateButtonText}>{startDate.toLocaleString('zh-CN', { hour12: false })}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="datetime"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setStartDate(date);
                    }}
                  />
                )}
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.label}>结束时间：</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateButton}>
                  <Text style={styles.dateButtonText}>{endDate.toLocaleString('zh-CN', { hour12: false })}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="datetime"
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setEndDate(date);
                    }}
                  />
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>时间间隔：</Text>
            <RNPickerSelect
              onValueChange={(value) => setInterval(value)}
              value={interval}
              items={[
                { label: '1分钟', value: '1min' },
                { label: '30分钟', value: '30min' },
                { label: '1小时', value: '1hour' },
                { label: '2小时', value: '2hour' }
              ]}
              style={pickerSelectStyles}
              useNativeAndroidPickerStyle={false}
              placeholder={{}}
              touchableWrapperProps={{
                activeOpacity: 0.5
              }}
              doneText="确定"
              onOpen={() => {}}
              Icon={() => {
                return (
                  <View
                    style={{
                      backgroundColor: 'transparent',
                      borderTopWidth: 5,
                      borderRightWidth: 5,
                      borderBottomWidth: 0,
                      borderLeftWidth: 5,
                      borderTopColor: '#999',
                      borderRightColor: 'transparent',
                      borderLeftColor: 'transparent',
                      width: 0,
                      height: 0
                    }}
                  />
                );
              }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleQuery}>
              <Text style={styles.buttonText}>查询</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={clearData}>
              <Text style={styles.buttonText}>清除</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={exportToExcel}>
              <Text style={styles.buttonText}>导出</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.dataContainer}>
        {data.length > 0 && (
          <View>
            <View style={styles.paginationInfo}>
              <Text>总记录数: {data.length} | 当前页: {currentPage} / {Math.ceil(data.length / itemsPerPage)}</Text>
            </View>
            <View style={styles.tableContainer}>
              <ScrollView horizontal>
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.timeCell]}>时间</Text>
                    {Object.keys(data[0]).filter(key => key !== 'time_group' && key !== 'time').map(key => (
                      <Text key={key} style={styles.headerCell}>
                        {columnMappings[selectedTable]?.[key] || key}
                      </Text>
                    ))}
                  </View>
                  <ScrollView style={styles.tableBody}>
                    {data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
                      <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                        <Text style={[styles.cell, styles.timeCell]}>
                          {(() => {
                            try {
                              const date = new Date(row.time_group);
                              return isNaN(date.getTime()) ? '无效日期' : date.toLocaleString('zh-CN', { hour12: false });
                            } catch (error) {
                              return '无效日期';
                            }
                          })()}
                        </Text>
                        {Object.keys(row).filter(key => key !== 'time_group' && key !== 'time').map(key => (
                          <Text key={key} style={styles.cell}>
                            {typeof row[key] === 'number' ? row[key].toFixed(2) : row[key]}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.paginationButtonText}>上一页</Text>
                </TouchableOpacity>
                <Text style={[styles.paginationButtonText, { marginHorizontal: 10 }]}>{currentPage} / {Math.ceil(data.length / itemsPerPage)}</Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage >= Math.ceil(data.length / itemsPerPage) && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(data.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(data.length / itemsPerPage)}
                >
                  <Text style={styles.paginationButtonText}>下一页</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default DataQueryScreen;

