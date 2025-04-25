import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Share, 
  Image, 
  ActivityIndicator, 
  Modal, 
  Dimensions, 
  Platform,
  TextInput
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import axios from 'axios';
import { getFileList } from './FileUploadScreen';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// 添加用于导出PDF的常量
const PDFS_DIRECTORY = FileSystem.documentDirectory + 'pdfs/';

const DynamicReportsScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reports, setReports] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const viewShotRefs = useRef({});
  const [reportImages, setReportImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState('7');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [reportFields, setReportFields] = useState([]);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [reportTypes, setReportTypes] = useState([]);
  const [loadingReportTypes, setLoadingReportTypes] = useState(false);

  const dateRangeOptions = [
    { label: '最近7天', value: '7' },
    { label: '最近15天', value: '15' },
    { label: '最近30天', value: '30' },
    { label: '当月', value: 'current_month' },
    { label: '上月', value: 'last_month' }
  ];

  // 获取报告类型列表
  const fetchReportTypes = async () => {
    try {
      setLoadingReportTypes(true);
      
      const response = await axios.get('https://nodered.jzz77.cn:9003/api/reportStyles/get');
      
      if (response.data && Array.isArray(response.data)) {
        setReportTypes(response.data);
        // 如果有数据，设置第一个类型为默认选中
        if (response.data.length > 0) {
          setSelectedReportType(response.data[0].value);
        }
      } else {
        console.error('获取报告类型失败: 返回数据格式不正确', response.data);
        Alert.alert('错误', '获取报告类型失败，请稍后重试');
      }
    } catch (error) {
      console.error('获取报告类型失败:', error);
      Alert.alert('错误', '获取报告类型失败，请检查网络连接后重试');
    } finally {
      setLoadingReportTypes(false);
    }
  };

  // 组件加载时获取报告类型列表
  useEffect(() => {
    fetchReportTypes();
  }, []);

  // 获取报告字段定义
  const fetchReportFields = async (reportType) => {
    try {
      setLoadingFields(true);
      
      const response = await axios.get('https://nodered.jzz77.cn:9003/api/reportTypes/get', {
        params: {
          reportType: reportType
        }
      });
      
      if (response.data && response.data.groups) {
        setReportFields(response.data);
      } else {
        console.error('获取报告字段失败: 返回数据格式不正确', response.data);
        Alert.alert('错误', '获取报告字段失败，请稍后重试');
      }
    } catch (error) {
      console.error('获取报告字段失败:', error);
      Alert.alert('错误', '获取报告字段失败，请检查网络连接后重试');
    } finally {
      setLoadingFields(false);
    }
  };

  // 当选择的报告类型改变时，重新获取字段定义
  useEffect(() => {
    if (selectedReportType) {
      fetchReportFields(selectedReportType);
    }
  }, [selectedReportType]);

  const isDateRangeSelected = (value) => {
    if (!selectedDateRange) return false;
    if (value === selectedDateRange) return true;
    
    const today = new Date();
    let expectedStartDate = new Date();
    let expectedEndDate = new Date();

    switch (value) {
      case '7':
        expectedStartDate.setDate(today.getDate() - 7);
        break;
      case '15':
        expectedStartDate.setDate(today.getDate() - 15);
        break;
      case '30':
        expectedStartDate.setDate(today.getDate() - 30);
        break;
      case 'current_month':
        expectedStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
        expectedEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        expectedStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        expectedEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return false;
    }

    return (
      startDate.toDateString() === expectedStartDate.toDateString() &&
      endDate.toDateString() === expectedEndDate.toDateString()
    );
  };

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

  const handleStartConfirm = (date) => {
    setStartDate(date);
    setShowStartDatePicker(false);
  };

  const handleEndConfirm = (date) => {
    setEndDate(date);
    setShowEndDatePicker(false);
  };

  useEffect(() => {
    // 清除之前的图片缓存
    setReportImages({});
  }, [selectedReportType]); // 当切换站点时清除缓存

  // 格式化日期显示
  const formatDate = (date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 获取报告数据
  const fetchReports = async () => {
    try {
      setLoading(true);
      setLoadingStartTime(Date.now());

      const adjustedStartDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
      const adjustedEndDate = new Date(endDate.getTime() + 8 * 60 * 60 * 1000);
      
      // 使用动态查询API
      const response = await axios.get('https://nodered.jzz77.cn:9003/api/reports/dynamicQuery', {
        params: {
          reportType: selectedReportType,
          startDate: adjustedStartDate.toLocaleDateString('zh-CN'),
          endDate: adjustedEndDate.toLocaleDateString('zh-CN')
        }
      });

      // 处理图片URL
      const processedReports = response.data.map(report => ({
        ...report,
        images: report.imagesurl ? report.imagesurl.split(',').filter(url => url) : []
      }));

      // 确保加载状态至少持续2秒
      const currentTime = Date.now();
      const elapsedTime = currentTime - loadingStartTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      // 先保存查询结果
      setReports(processedReports);
      // 完成加载状态
      setLoading(false);
      
      // 在加载状态消失后，如果没有数据再提示
      if (processedReports.length === 0) {
        setTimeout(() => {
          Alert.alert('提示', '所选时间范围内无报表数据');
        }, 100);
      }
    } catch (error) {
      console.error('获取报告失败:', error);
      setLoading(false);
      setTimeout(() => {
        Alert.alert('错误', '获取报表失败，请检查网络连接后重试');
      }, 100);
    }
  };

  // 获取报告相关的图片
  const fetchReportImages = async (report) => {
    try {
      setLoadingImages(prev => ({ ...prev, [report.id]: true }));
      
      // 从报告数据中获取图片URL列表
      let imageUrls = [];
      if (report.images && Array.isArray(report.images)) {
        imageUrls = report.images;
      }

      // 如果报告中有图片URL，直接使用
      if (imageUrls.length > 0) {
        const files = imageUrls.map(url => ({
          url,
          filename: url.split('/').pop(),
          isImage: true
        }));
        setReportImages(prev => ({
          ...prev,
          [report.id]: files
        }));
      } 
    } catch (error) {
      console.error('获取报告图片失败:', error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [report.id]: false }));
    }
  };

  // 处理报告展开/收起
  const toggleReportExpand = async (reportId) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
    if (expandedReportId !== reportId) {
      const report = reports.find(r => r.id === reportId);
      if (report && !reportImages[reportId]) {
        await fetchReportImages(report);
      }
    }
  };

  // 添加创建PDF目录的函数
  const ensurePdfDirectoryExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(PDFS_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PDFS_DIRECTORY, { intermediates: true });
    }
  };
  
  // 添加导出PDF的函数
  const exportToPdf = async (report) => {
    try {
      setGeneratingPdf(true);
      
      // 确保目录存在
      await ensurePdfDirectoryExists();
      
      // 创建HTML内容
      const reportDate = new Date(report.date).toLocaleDateString('zh-CN');
      
      // 获取当前选中的报告类型名称
      const selectedType = reportTypes.find(type => type.value === selectedReportType);
      const siteName = selectedType ? selectedType.label : '运行';
      
      // 根据字段定义构建表格内容
      let tableContent = '';
      
      // 添加基本信息
      tableContent += `
        <tr>
          <td class="label">日期</td>
          <td class="value">${reportDate}</td>
        </tr>
        <tr>
          <td class="label">操作员</td>
          <td class="value">${report.operator || ''}</td>
        </tr>
      `;

      // 根据字段定义添加动态内容
      reportFields.groups?.forEach(group => {
        tableContent += `
          <tr>
            <td class="section-header" colspan="2">${group.title}</td>
          </tr>
        `;

        group.fields.forEach(field => {
          if (field.subFields) {
            // 处理包含子字段的字段
            tableContent += `
              <tr>
                <td class="label">${field.label}</td>
                <td class="value">
                  <table class="sub-table">
            `;
            
            field.subFields.forEach(subField => {
              const value = report[field.key]?.[subField.key];
              if (value !== undefined && value !== null) {
                tableContent += `
                  <tr>
                    <td class="sub-label">${subField.label}</td>
                    <td class="sub-value">${value}${subField.unit ? ` ${subField.unit}` : ''}</td>
                  </tr>
                `;
              }
            });
            
            tableContent += `
                  </table>
                </td>
              </tr>
            `;
          } else {
            // 处理普通字段
            const value = report[field.key];
            if (value !== undefined && value !== null) {
              tableContent += `
                <tr>
                  <td class="label">${field.label}</td>
                  <td class="value">${value}${field.unit ? ` ${field.unit}` : ''}</td>
                </tr>
              `;
            }
          }
        });
      });
      
      // 准备图片部分HTML
      let imagesHtml = '';
      if (report.images && report.images.length > 0) {
        imagesHtml = `
          <div class="images-section">
            <h3>相关图片</h3>
            <div class="images-container">
        `;
        
        // 添加最多4张图片
        for (let i = 0; i < Math.min(report.images.length, 4); i++) {
          imagesHtml += `<img class="report-image" src="${report.images[i]}" />`;
        }
        
        imagesHtml += `
            </div>
          </div>
        `;
      }
      
      // 创建HTML内容
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${siteName}运行报告 - ${reportDate}</title>
          <style>
            body {
              font-family: "SimSun", Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 14px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .report-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .report-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 16px;
              padding: 8px 0;
              border-bottom: 2px solid #2196F3;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .data-table td {
              padding: 8px;
              border: 1px solid #ddd;
              vertical-align: top;
            }
            .section-header {
              background-color: #f5f5f5;
              font-weight: bold;
              text-align: left;
              padding: 10px !important;
            }
            .label {
              width: 30%;
              background-color: #f0f8ff;
              text-align: right;
              font-weight: normal;
            }
            .value {
              width: 70%;
            }
            .sub-table {
              width: 100%;
              border-collapse: collapse;
            }
            .sub-table tr:not(:last-child) {
              border-bottom: 1px solid #eee;
            }
            .sub-label {
              width: 40%;
              padding: 4px;
              color: #666;
            }
            .sub-value {
              width: 60%;
              padding: 4px;
            }
            .images-section {
              margin-top: 20px;
            }
            .images-section h3 {
              font-size: 16px;
              margin-bottom: 10px;
            }
            .images-container {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .report-image {
              width: 45%;
              margin-bottom: 10px;
              border: 1px solid #ddd;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="report-header">
              <div class="report-title">${siteName}运行报告</div>
            </div>
            
            <table class="data-table">
              ${tableContent}
            </table>
            
            ${imagesHtml}
            
            <div class="footer">
              报告生成时间: ${new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </body>
        </html>
      `;
      
      // 使用expo-print生成PDF文件
      const { uri: pdfUri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      // 生成更友好的文件名，包含站点名称
      const fileName = `${siteName}运行报告_${reportDate.replace(/\//g, '-')}_${report.id}.pdf`;
      const newPdfPath = PDFS_DIRECTORY + fileName;
      
      // 复制临时文件到应用目录
      await FileSystem.makeDirectoryAsync(PDFS_DIRECTORY, { intermediates: true });
      await FileSystem.copyAsync({
        from: pdfUri,
        to: newPdfPath
      });
      
      // 检查是否可以分享
      if (await Sharing.isAvailableAsync()) {
        // 分享PDF文件
        await Sharing.shareAsync(newPdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `分享${siteName}运行报告`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert(
          '分享不可用',
          '您的设备不支持分享功能',
          [{ text: '确定', style: 'cancel' }]
        );
      }
      
    } catch (error) {
      console.error('导出PDF失败:', error);
      Alert.alert('错误', '导出报告失败，请稍后重试');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 渲染动态报告卡片
  const renderDynamicReportCard = (report) => {
    const isExpanded = expandedReportId === report.id;
    const reportDate = new Date(report.date).toLocaleDateString('zh-CN');

    const renderFieldValue = (label, value, unit, key) => {
      const lines = value.toString().split('\n');
      return (
        <View key={key} style={styles.fieldRow}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {label}：
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {lines[0]}{unit ? ` ${unit}` : ''}
            </Text>
          </View>
          {lines.length > 1 && lines.slice(1).map((line, index) => (
            <Text 
              key={`${key}-line-${index}`}
              style={[styles.fieldValue, styles.wrappedValue, { color: colors.text }]}
            >
              {line}
            </Text>
          ))}
        </View>
      );
    };

    return (
      <ViewShot
        key={`report-${report.id || reportDate}`}
        ref={ref => viewShotRefs.current[report.id] = ref}
        options={{
          format: 'jpg',
          quality: 0.9,
          result: 'data-uri'
        }}
        style={[styles.card, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleReportExpand(report.id)}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardDate, { color: colors.text }]}>{reportDate}</Text>
            <Text style={[styles.cardOperator, { color: colors.textSecondary }]}>
              值班员: {report.operator || '未知'}
            </Text>
          </View>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            {reportFields.groups?.map((group, groupIndex) => (
              <View key={`group-${group.id || groupIndex}`} style={styles.infoSection}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
                {group.fields.map((field, fieldIndex) => {
                  if (field.subFields) {
                    return (
                      <View key={`field-${field.key || fieldIndex}`} style={styles.subFieldsContainer}>
                        <Text style={[styles.fieldLabel, { color: colors.text }]}>
                          {field.label}：
                        </Text>
                        {field.subFields.map((subField, subFieldIndex) => {
                          const value = report[field.key]?.[subField.key];
                          if (value !== undefined && value !== null) {
                            return renderFieldValue(
                              subField.label,
                              value,
                              subField.unit,
                              `subfield-${field.key}-${subField.key}-${subFieldIndex}`
                            );
                          }
                          return null;
                        })}
                      </View>
                    );
                  } else {
                    const value = report[field.key];
                    if (value !== undefined && value !== null) {
                      return renderFieldValue(
                        field.label,
                        value,
                        field.unit,
                        `field-${field.key}-${fieldIndex}`
                      );
                    }
                  }
                  return null;
                })}
              </View>
            ))}

            {loadingImages[report.id] ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>正在加载图片...</Text>
              </View>
            ) : reportImages[report.id]?.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>现场图片</Text>
                <ScrollView horizontal style={styles.imageContainer}>
                  {reportImages[report.id].map((file, index) => (
                    file.isImage ? (
                      <View key={`image-${index}-${report.id}`} style={styles.imageWrapper}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedImage(file.url);
                            setModalVisible(true);
                          }}
                        >
                          <Image
                            source={{
                              uri: file.url,
                              headers: {
                                'Authorization': 'Basic ' + btoa('jzz7777:12101108'),
                                'OCS-APIRequest': 'true',
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                              }
                            }}
                            style={styles.reportImage}
                            resizeMode="cover"
                            onLoadStart={() => {
                              setLoadingImages(prev => ({ ...prev, [file.url]: true }));
                              setImageLoadErrors(prev => ({ ...prev, [file.url]: 0 }));
                            }}
                            onLoadEnd={() => {
                              setLoadingImages(prev => ({ ...prev, [file.url]: false }));
                            }}
                            onError={(error) => {
                              console.error(`Image loading error for ${file.url}:`, error);
                              setImageLoadErrors(prev => ({
                                ...prev,
                                [file.url]: (prev[file.url] || 0) + 1
                              }));
                              setLoadingImages(prev => ({ ...prev, [file.url]: false }));
                              Alert.alert('图片加载失败', '请检查网络连接或稍后重试');
                            }}
                          />
                        </TouchableOpacity>
                        {loadingImages[file.url] && (
                          <View style={styles.imageLoadingOverlay}>
                            <ActivityIndicator size="small" color="#fff" />
                          </View>
                        )}
                        {imageLoadErrors[file.url] > 0 && !loadingImages[file.url] && (
                          <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                              setImageLoadErrors(prev => ({...prev, [file.url]: 0}));
                              setLoadingImages(prev => ({ ...prev, [file.url]: true }));
                            }}
                          >
                            <Ionicons name="reload" size={20} color="#fff" />
                            <Text style={styles.retryText}>重试</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.shareButtonsContainer}>
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    const uri = await viewShotRefs.current[report.id].capture();
                    await Share.share({
                      url: uri,
                      title: `运行报告 - ${reportDate}`,
                      message: `运行报告 - ${reportDate}`
                    });
                  } catch (error) {
                    console.error('分享失败:', error);
                    Alert.alert('错误', '分享失败，请稍后重试');
                  }
                }}
              >
                <Ionicons name="image" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>分享截图</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: '#FF5722', marginLeft: 10 }]}
                onPress={() => exportToPdf(report)}
                disabled={generatingPdf}
              >
                <Ionicons name="document-text" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {generatingPdf ? '导出中...' : '导出报告'}
                </Text>
                {generatingPdf && (
                  <ActivityIndicator size="small" color="#fff" style={{marginLeft: 5}} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ViewShot>
    );
  };

  // 添加图片查看Modal
  const renderImageViewerModal = () => {
    const handleCloseModal = () => {
      setModalVisible(false);
      setSelectedImage(null);
    };

    const handleShareImage = async () => {
      try {
        if (!selectedImage) return;
        
        const fileUri = await FileSystem.downloadAsync(
          selectedImage,
          FileSystem.cacheDirectory + 'report_image_' + Date.now() + '.jpg',
          {
            headers: {
              'Authorization': 'Basic ' + btoa('jzz7777:12101108'),
              'OCS-APIRequest': 'true'
            }
          }
        );
        await Share.share({
          url: fileUri.uri,
          message: `运行报告图片`
        });
      } catch (error) {
        console.error('分享图片失败:', error);
        Alert.alert('错误', '分享图片失败: ' + error.message);
      }
    };

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={handleCloseModal}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 20,
              padding: 8
            }}
            onPress={handleCloseModal}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.modalImageContainer}>
            <Image
              source={{
                uri: selectedImage,
                headers: {
                  'Authorization': 'Basic ' + btoa('jzz7777:12101108'),
                  'OCS-APIRequest': 'true',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={handleShareImage}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
              <Text style={styles.modalActionText}>分享</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={handleCloseModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.modalActionText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImageContainer: {
      width: '100%',
      height: '80%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    modalImage: {
      width: '100%',
      height: '100%',
    },
    modalFooter: {
      position: 'absolute',
      bottom: '10%',
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: 'transparent',
      gap: 20,
    },
    modalActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      minWidth: 120,
      justifyContent: 'center',
    },
    modalActionText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 8,
    },
    header: {
      padding: 16,
    },
    datePickerContainer: {
      marginBottom: 16,
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
    siteSelector: {
      flexDirection: 'row',
      padding: 16,
      paddingTop: 0,
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
    content: {
      flex: 1,
      padding: 16,
      paddingTop: 0,
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
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    cardHeaderLeft: {
      flex: 1,
    },
    cardDate: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    cardOperator: {
      fontSize: 14,
    },
    cardContent: {
      padding: 16,
    },
    infoSection: {
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#333',
    },
    shareButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
      flexWrap: 'wrap',
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      marginTop: 5,
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    imageContainer: {
      flexDirection: 'row',
      marginTop: 10,
      marginBottom: 10,
      minHeight: 120,
    },
    imageWrapper: {
      position: 'relative',
      marginRight: 10,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#f0f0f0',
    },
    reportImage: {
      width: 120,
      height: 120,
      borderRadius: 8,
    },
    retryButton: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{translateX: -30}, {translateY: -15}],
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    retryText: {
      color: '#fff',
      marginLeft: 4,
      fontSize: 12,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center'
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14
    },
    imageLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center'
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
    fieldRow: {
      marginBottom: 8,
      paddingVertical: 4,
    },
    fieldContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    fieldLabel: {
      fontSize: 14,
      lineHeight: 20,
    },
    fieldValue: {
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
      paddingLeft: 0,
    },
    wrappedValue: {
      paddingLeft: 70, // 根据实际字段标签宽度调整
      width: '100%',
    },
    subFieldsContainer: {
      marginLeft: 16,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      color: '#333',
    },
  });

  const dynamicStyles = {
    dateTimePickerModal: {
      backgroundColor: colors.card,
    },
    pickerContainer: {
      backgroundColor: colors.card,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.datePickerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>快速选择日期范围</Text>
          <View style={styles.quickSelectButtons}>
            {dateRangeOptions.map((option, index) => (
              <TouchableOpacity
                key={`date-range-${option.value}-${index}`}
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
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.text} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dateRangeSeparator, { color: colors.text }]}>至</Text>

              <TouchableOpacity 
                style={[styles.datePickerButton, { backgroundColor: colors.card }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.text} style={styles.dateIcon} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={fetchReports}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <DateTimePickerModal
          isVisible={showStartDatePicker}
          mode="datetime"
          onConfirm={handleStartConfirm}
          onCancel={() => setShowStartDatePicker(false)}
          date={startDate}
          locale="zh_CN"
          cancelTextIOS="取消"
          confirmTextIOS="确定"
          headerTextIOS="选择开始时间"
          modalStyleIOS={[styles.dateTimePickerModal, dynamicStyles.dateTimePickerModal]}
          pickerContainerStyleIOS={[styles.pickerContainer, dynamicStyles.pickerContainer]}
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
          isVisible={showEndDatePicker}
          mode="datetime"
          onConfirm={handleEndConfirm}
          onCancel={() => setShowEndDatePicker(false)}
          date={endDate}
          locale="zh_CN"
          cancelTextIOS="取消"
          confirmTextIOS="确定"
          headerTextIOS="选择结束时间"
          modalStyleIOS={[styles.dateTimePickerModal, dynamicStyles.dateTimePickerModal]}
          pickerContainerStyleIOS={[styles.pickerContainer, dynamicStyles.pickerContainer]}
          customStyles={{
            dateIcon: { display: 'none' },
            dateInput: { marginLeft: 36, borderWidth: 0 }
          }}
          isDarkMode={isDarkMode}
        />
      </View>

      <View style={styles.siteSelector}>
        {loadingReportTypes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>正在加载报告类型...</Text>
          </View>
        ) : reportTypes.length > 0 ? (
          reportTypes.map((option, index) => (
            <TouchableOpacity 
              key={`report-type-${option.value}-${index}`}
              style={[
                styles.siteButton, 
                selectedReportType === option.value && styles.selectedSiteButton
              ]}
              onPress={() => {
                setSelectedReportType(option.value);
                setReports([]);
              }}
            >
              <Text style={[
                styles.siteButtonText, 
                selectedReportType === option.value && styles.selectedSiteButtonText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              暂无可用报告类型
            </Text>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.content}>
        {loadingFields ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>正在加载报告字段...</Text>
          </View>
        ) : reports.length > 0 ? (
          reports.map((report, index) => renderDynamicReportCard(report))
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              请选择日期范围并点击搜索按钮查询报告
            </Text>
          </View>
        )}
      </ScrollView>
      
      {renderImageViewerModal()}
      
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
              正在获取报表数据，请稍候...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DynamicReportsScreen; 