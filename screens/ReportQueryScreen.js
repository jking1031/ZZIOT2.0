import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Share, Image, Linking, ActivityIndicator, Modal, Dimensions, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import axios from 'axios';
import { getFileList } from './FileUploadScreen';  // 添加导入
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// 添加用于导出PDF的常量
const PDFS_DIRECTORY = FileSystem.documentDirectory + 'pdfs/';

const ReportQueryScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedSite, setSelectedSite] = useState('gt');
  const [reports, setReports] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const viewShotRefs = useRef({});
  const [reportImages, setReportImages] = useState({}); // 添加图片状态
  const [loadingImages, setLoadingImages] = useState({});
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const [selectedDateRange, setSelectedDateRange] = useState('7');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  const dateRangeOptions = [
    { label: '最近7天', value: '7' },
    { label: '最近15天', value: '15' },
    { label: '最近30天', value: '30' },
    { label: '当月', value: 'current_month' },
    { label: '上月', value: 'last_month' }
  ];

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
  }, [selectedSite]); // 当切换站点时清除缓存

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
      
      // 根据选择的站点类型确定API URL
      let apiUrl;
      switch(selectedSite) {
        case 'gt':
          apiUrl = 'https://nodered.jzz77.cn:9003/api/reports/query';
          break;
        case '5000':
          apiUrl = 'https://nodered.jzz77.cn:9003/api/reports5000/query';
          break;
        case 'sludge':
          apiUrl = 'https://nodered.jzz77.cn:9003/api/ReportsSludge/query';
          break;
        default:
          apiUrl = 'https://nodered.jzz77.cn:9003/api/reports/query';
      }
      
      const response = await axios.get(apiUrl, {
        params: {
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
      } else {
        // 否则从 Nextcloud 获取图片
        const date = new Date(report.date).toISOString().split('T')[0];
        const reportId = report.id; // 使用报告的ID
        const files = await getFileList('reports', reportId);
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
      
      // 根据站点类型确定标题
      let siteTitle;
      switch(selectedSite) {
        case 'gt':
          siteTitle = '高铁污水厂运行日报';
          break;
        case '5000':
          siteTitle = '5000吨处理站运行日报';
          break;
        case 'sludge':
          siteTitle = '高铁厂污泥车间日报';
          break;
        default:
          siteTitle = '运行日报';
      }
      
      // 根据站点类型构建不同的表格内容
      let tableContent = '';
      
      // 获取发布日期 (今天)
      const today = new Date().toLocaleDateString('zh-CN');
      
      // 根据不同站点类型构建表格内容
      if (selectedSite === 'gt') {
        tableContent = `
          <tr>
            <td class="label">日期</td>
            <td class="value">${reportDate}</td>
          </tr>
          <tr>
            <td class="label">操作员</td>
            <td class="value">${report.operator || ''}</td>
          </tr>
          <tr>
            <td class="label">进水量（立方）</td>
            <td class="value">${report.inflow || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">出水量（立方）</td>
            <td class="value">${report.outflow || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">进水水质</td>
            <td class="value">${report.in_quality || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">出水水质</td>
            <td class="value">${report.out_quality || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">水质异常</td>
            <td class="value">${report.water_quality_anomalies || '无'}</td>
          </tr>
          <tr>
            <td class="label">设备状态</td>
            <td class="value">${report.equipment_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">设备问题</td>
            <td class="value">${report.equipment_issues || '无'}</td>
          </tr>
          <tr>
            <td class="label">碳源投加量（L）</td>
            <td class="value">${report.carbon_source || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">除磷剂投加量（L）</td>
            <td class="value">${report.phosphorus_removal || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">消毒剂投加量（L）</td>
            <td class="value">${report.disinfectant || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">药剂效果</td>
            <td class="value">${report.chemical_effect || '良好'}</td>
          </tr>
          <tr>
            <td class="label">污泥量（吨）</td>
            <td class="value">${report.sludge_quantity || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">其他备注</td>
            <td class="value">${report.other_notes || '无'}</td>
          </tr>
          <tr>
            <td class="label">报告编号</td>
            <td class="value">PROD_REPORT_${reportDate.replace(/\//g, '-')}_${report.id}</td>
          </tr>
        `;
      } else if (selectedSite === '5000') {
        tableContent = `
          <tr>
            <td class="label">日期</td>
            <td class="value">${reportDate}</td>
          </tr>
          <tr>
            <td class="label">操作员</td>
            <td class="value">${report.operator || ''}</td>
          </tr>
          <tr>
            <td class="label">进水量（立方）</td>
            <td class="value">${report.inflow || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">出水量（立方）</td>
            <td class="value">${report.outflow || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">出水水质</td>
            <td class="value">${report.out_quality || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">水质异常</td>
            <td class="value">${report.water_quality_anomalies || '无'}</td>
          </tr>
          <tr>
            <td class="label">曝气系统</td>
            <td class="value">${report.aeration_system_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">反洗系统</td>
            <td class="value">${report.backwash_system_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">进水泵系统</td>
            <td class="value">${report.inlet_pump_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">磁混系统</td>
            <td class="value">${report.magnetic_mixing_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">水箱状态</td>
            <td class="value">${report.water_tank_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">絮凝剂投加量（L）</td>
            <td class="value">${report.flocculant_dosage || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">磁粉投加量（kg）</td>
            <td class="value">${report.magnetic_powder_dosage || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">药剂库存</td>
            <td class="value">${report.chemical_inventory || '充足'}</td>
          </tr>
          <tr>
            <td class="label">其他备注</td>
            <td class="value">${report.other_notes || '无'}</td>
          </tr>
          <tr>
            <td class="label">报告编号</td>
            <td class="value">PROD_REPORT_${reportDate.replace(/\//g, '-')}_${report.id}</td>
          </tr>
        `;
      } else if (selectedSite === 'sludge') {
        // 污泥车间日报表格内容
        tableContent = `
          <tr>
            <td class="label">日期</td>
            <td class="value">${reportDate}</td>
          </tr>
          <tr>
            <td class="label">值班员</td>
            <td class="value">${report.operator || ''}</td>
          </tr>
          <tr>
            <td class="label">污泥产量(吨)</td>
            <td class="value">${report.sludge_production || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">PAC用量(千克)</td>
            <td class="value">${report.pac_dosage || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">PAM用量(千克)</td>
            <td class="value">${report.pam_dosage || '0.0'}</td>
          </tr>
          <tr>
            <td class="label">1号AO池污泥浓度(g/L)</td>
            <td class="value">${report.ao_pool_1_concentration || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">2号AO池污泥浓度(g/L)</td>
            <td class="value">${report.ao_pool_2_concentration || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">3号AO池污泥浓度(g/L)</td>
            <td class="value">${report.ao_pool_3_concentration || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">污泥压榨含水率(%)</td>
            <td class="value">${report.water_content || '无数据'}</td>
          </tr>
          <tr>
            <td class="label">板框压滤机运行状态</td>
            <td class="value">${report.dehydrator_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">污泥螺杆泵运行状态</td>
            <td class="value">${report.belt_filter_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">其他设备运行状态</td>
            <td class="value">${report.equipment_status || '正常'}</td>
          </tr>
          <tr>
            <td class="label">其他备注</td>
            <td class="value">${report.other_notes || '无'}</td>
          </tr>
          <tr>
            <td class="label">报告编号</td>
            <td class="value">${report.id || ''}</td>
          </tr>
        `;
      }
      
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
      
      // 创建HTML内容，用于转成PDF
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${siteTitle} - ${reportDate}</title>
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
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
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
            .label {
              width: 30%;
              background-color: #f0f8ff;  /* aliceblue */
              text-align: right;
              font-weight: normal;
            }
            .value {
              width: 70%;
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
              <div class="report-title">${today} ${siteTitle}</div>
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
      
      // 生成更友好的文件名
      const fileName = `运行报告_${reportDate.replace(/\//g, '-')}_${report.id}.pdf`;
      const newPdfPath = PDFS_DIRECTORY + fileName;
      
      // 复制临时文件到我们的应用目录，以便获得友好的文件名
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
          dialogTitle: '分享运行报告',
          UTI: 'com.adobe.pdf' // iOS需要
        });
      } else {
        // 如果分享功能不可用，提示用户
        Alert.alert(
          '分享不可用',
          '您的设备不支持分享功能',
          [
            {
              text: '确定',
              style: 'cancel'
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('导出PDF失败:', error);
      Alert.alert('错误', '导出报告失败，请稍后重试');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 渲染高铁污水厂报告卡片
  const renderGTReportCard = (report) => {
    const isExpanded = expandedReportId === report.id;
    const reportDate = new Date(report.date).toLocaleDateString('zh-CN');

    return (
      <ViewShot
        key={report.id}
        ref={ref => viewShotRefs[report.id] = ref}
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
              值班员: {report.operator}
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
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>进出水情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>进水流量: {report.inflow || 0} m³</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>出水流量: {report.outflow || 0} m³</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>进水水质情况: {report.in_quality || '无数据'}</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>出水水质情况: {report.out_quality || '无数据'}</Text>
              {report.water_quality_anomalies && (
                <Text style={[styles.infoText, { color: colors.text }]}>
                  水质异常: {report.water_quality_anomalies}
                </Text>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>设备运行情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                设备状态: {report.equipment_status || '无数据'}
              </Text>
              {report.equipment_issues && (
                <Text style={[styles.infoText, { color: colors.text }]}>
                  设备故障: {report.equipment_issues}
                </Text>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>药剂投加情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                碳源投加量: {report.carbon_source || 0} L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                除磷剂投加量: {report.phosphorus_removal || 0} L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                消毒剂投加量: {report.disinfectant || 0} L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                药剂效果: {report.chemical_effect || '无数据'}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>污泥情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                产泥量: {report.sludge_quantity || 0} 吨
              </Text>
            </View>

            {report.other_notes && (
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>巡查工作</Text>
                <Text style={[styles.infoText, { color: colors.text }]}>{report.other_notes}</Text>
              </View>
            )}

            {loadingImages[report.id] ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>正在加载图片...</Text>
              </View>
            ) : report.images?.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>现场图片</Text>
                <ScrollView horizontal style={styles.imageContainer}>
                  {report.images.map((url, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedImage(url);
                          setModalVisible(true);
                        }}
                      >
                        <Image
                          source={{
                            uri: url,
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
                            setLoadingImages(prev => ({ ...prev, [url]: true }));
                            setImageLoadErrors(prev => ({ ...prev, [url]: 0 }));
                          }}
                          onLoadEnd={() => {
                            setLoadingImages(prev => ({ ...prev, [url]: false }));
                          }}
                          onError={(error) => {
                            console.error(`Image loading error for ${url}:`, error);
                            setImageLoadErrors(prev => ({
                              ...prev,
                              [url]: (prev[url] || 0) + 1
                            }));
                            setLoadingImages(prev => ({ ...prev, [url]: false }));
                            Alert.alert('图片加载失败', '请检查网络连接或稍后重试');
                          }}
                        />
                      </TouchableOpacity>
                      {loadingImages[url] && (
                        <View style={styles.imageLoadingOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                      {imageLoadErrors[url] > 0 && !loadingImages[url] && (
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setImageLoadErrors(prev => ({...prev, [url]: 0}));
                            setLoadingImages(prev => ({ ...prev, [url]: true }));
                          }}
                        >
                          <Ionicons name="reload" size={20} color="#fff" />
                          <Text style={styles.retryText}>重试</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.shareButtonsContainer}>
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    const uri = await viewShotRefs[report.id].capture();
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
              
              {/* 添加导出PDF按钮 */}
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

  // 渲染5000吨处理站报告卡片
  const render5000ReportCard = (report) => {
    const isExpanded = expandedReportId === report.id;
    const reportDate = new Date(report.date).toLocaleDateString('zh-CN');

    // 修改renderReportImages函数
    const renderReportImages = (report) => {
      const images = reportImages[report.id] || [];
      if (images.length === 0) return null;
    
      return (
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>现场图片</Text>
          <ScrollView horizontal style={styles.imageContainer}>
            {images.map((file, index) => (
              file.isImage ? (
                <View key={index} style={styles.imageWrapper}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedImage(file.thumbnailUrl || file.url);
                      setModalVisible(true);
                    }}
                  >
                    <Image
                      source={{
                        uri: file.thumbnailUrl || file.url, // 优先使用缩略图
                        headers: {
                          'Authorization': 'Basic ' + btoa('jzz7777:12101108'),
                          'OCS-APIRequest': 'true',
                        }
                      }}
                      style={styles.reportImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.error(`Image loading error for ${file.url}:`, error);
                        setImageLoadErrors(prev => ({
                          ...prev,
                          [file.url]: (prev[file.url] || 0) + 1
                        }));
                      }}
                    />
                  </TouchableOpacity>
                  {imageLoadErrors[file.url] > 0 && (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => {
                        setImageLoadErrors(prev => ({...prev, [file.url]: 0}));
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
      );
    };

    return (
      <ViewShot
        key={report.id}
        ref={ref => viewShotRefs[report.id] = ref}
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
              值班员: {report.operator}
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
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>进出水情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>进水流量: {report.inflow} m³</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>出水流量: {report.outflow} m³</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>出水水质情况: {report.out_quality}</Text>
              {report.water_quality_anomalies && (
                <Text style={[styles.infoText, { color: colors.text }]}>
                  水质异常: {report.water_quality_anomalies}
                </Text>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>设备运行情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                曝气系统: {report.aeration_system_status}
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                反洗系统: {report.backwash_system_status}
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                进水泵系统: {report.inlet_pump_status}
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                磁混系统: {report.magnetic_mixing_status}
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                水箱状态: {report.water_tank_status}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>药剂投加情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                絮凝剂投加量: {report.flocculant_dosage} L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                磁粉投加量: {report.magnetic_powder_dosage} kg
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                药剂库存: {report.chemical_inventory}
              </Text>
            </View>

            {report.other_notes && (
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>巡查工作</Text>
                <Text style={[styles.infoText, { color: colors.text }]}>{report.other_notes}</Text>
              </View>
            )}

            {renderReportImages(report)}

            <View style={styles.shareButtonsContainer}>
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    const uri = await viewShotRefs[report.id].capture();
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
              
              {/* 添加导出PDF按钮 */}
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

  // 添加渲染污泥车间报告卡片的函数
  const renderSludgeReportCard = (report) => {
    const isExpanded = expandedReportId === report.id;
    const reportDate = new Date(report.date).toLocaleDateString('zh-CN');

    return (
      <ViewShot
        key={report.id}
        ref={ref => viewShotRefs[report.id] = ref}
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
              值班员: {report.operator}
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
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>污泥生产数据</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>污泥产量: {report.sludge_production || '0.0'} 吨</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>PAC用量: {report.pac_dosage || '0.0'} 千克</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>PAM用量: {report.pam_dosage || '0.0'} 千克</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>污泥数据</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                1号AO池污泥浓度: {report.ao_pool_1_concentration || '无数据'} g/L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                2号AO池污泥浓度: {report.ao_pool_2_concentration || '无数据'} g/L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                3号AO池污泥浓度: {report.ao_pool_3_concentration || '无数据'} g/L
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                污泥压榨含水率: {report.water_content || '无数据'} %
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>设备运行情况</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                板框压滤机状态: {report.dehydrator_status || '正常'}
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                污泥螺杆泵状态: {report.belt_filter_status || '正常'}
              </Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                其他设备状态: {report.equipment_status || '正常'}
              </Text>
            </View>

            {report.other_notes && (
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>其他备注</Text>
                <Text style={[styles.infoText, { color: colors.text }]}>{report.other_notes}</Text>
              </View>
            )}

            {loadingImages[report.id] ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>正在加载图片...</Text>
              </View>
            ) : report.images?.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>现场图片</Text>
                <ScrollView horizontal style={styles.imageContainer}>
                  {report.images.map((url, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedImage(url);
                          setModalVisible(true);
                        }}
                      >
                        <Image
                          source={{
                            uri: url,
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
                            setLoadingImages(prev => ({ ...prev, [url]: true }));
                            setImageLoadErrors(prev => ({ ...prev, [url]: 0 }));
                          }}
                          onLoadEnd={() => {
                            setLoadingImages(prev => ({ ...prev, [url]: false }));
                          }}
                          onError={(error) => {
                            console.error(`Image loading error for ${url}:`, error);
                            setImageLoadErrors(prev => ({
                              ...prev,
                              [url]: (prev[url] || 0) + 1
                            }));
                            setLoadingImages(prev => ({ ...prev, [url]: false }));
                            Alert.alert('图片加载失败', '请检查网络连接或稍后重试');
                          }}
                        />
                      </TouchableOpacity>
                      {loadingImages[url] && (
                        <View style={styles.imageLoadingOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                      {imageLoadErrors[url] > 0 && !loadingImages[url] && (
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setImageLoadErrors(prev => ({...prev, [url]: 0}));
                            setLoadingImages(prev => ({ ...prev, [url]: true }));
                          }}
                        >
                          <Ionicons name="reload" size={20} color="#fff" />
                          <Text style={styles.retryText}>重试</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.shareButtonsContainer}>
              <TouchableOpacity 
                style={[styles.shareButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    const uri = await viewShotRefs[report.id].capture();
                    await Share.share({
                      url: uri,
                      title: `污泥车间日报 - ${reportDate}`,
                      message: `污泥车间日报 - ${reportDate}`
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
    modalActions: {
      flexDirection: 'row',
    },
    modalImageContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImage: {
      width: '100%',
      height: '80%',
    },
    imageActionButtons: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      flexDirection: 'row',
      zIndex: 1,
    },
    imageActionButton: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 15,
      padding: 5,
      marginLeft: 5,
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
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      marginBottom: 8,
      lineHeight: 20,
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
    imageExpandButton: {
      position: 'absolute',
      right: 5,
      bottom: 5,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 15,
      padding: 5,
      zIndex: 1,
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
      backgroundColor: 'white', // 或者使用 colors.card
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
      color: '#000', // 或者使用 colors.text
      marginTop: 16,
      textAlign: 'center',
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
          {/* 快速选择日期范围 */}
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
        <TouchableOpacity 
          style={[styles.siteButton, selectedSite === 'gt' && styles.selectedSiteButton]}
          onPress={() => {
            setSelectedSite('gt');
            setReports([]);
          }}
        >
          <Text style={[styles.siteButtonText, selectedSite === 'gt' && styles.selectedSiteButtonText]}>高铁污水厂</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.siteButton, selectedSite === '5000' && styles.selectedSiteButton]}
          onPress={() => {
            setSelectedSite('5000');
            setReports([]);
          }}
        >
          <Text style={[styles.siteButtonText, selectedSite === '5000' && styles.selectedSiteButtonText]}>五千吨处理站</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.siteButton, selectedSite === 'sludge' && styles.selectedSiteButton]}
          onPress={() => {
            setSelectedSite('sludge');
            setReports([]);
          }}
        >
          <Text style={[styles.siteButtonText, selectedSite === 'sludge' && styles.selectedSiteButtonText]}>污泥车间</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        {reports.map(report => {
          if (selectedSite === 'gt') {
            return renderGTReportCard(report);
          } else if (selectedSite === '5000') {
            return render5000ReportCard(report);
          } else if (selectedSite === 'sludge') {
            return renderSludgeReportCard(report);
          }
        })}
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

export default ReportQueryScreen;