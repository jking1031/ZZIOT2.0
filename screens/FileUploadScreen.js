import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

// 修改文件名生成逻辑，添加用户信息
const generateFileName = (originalName, reportId = '', userId = '', username = '', folder = 'default') => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop().toLowerCase();
  const userInfo = userId ? `USER_${userId}_${username}_` : '';
  
  // 根据不同的文件夹使用不同的前缀
  let prefix = 'FILE';
  if (folder === 'tickets') {
    prefix = 'TICKET';
  } else if (folder === 'reports' || folder === 'reports_gt' || folder === 'reports_5000') {
    prefix = 'REPORT';
  } else if (folder === 'laboratory') {
    prefix = 'LAB';
  }
  
  // 如果是图片文件，使用特定格式
  if (/\.(jpg|jpeg|png|gif)$/i.test(originalName)) {
    const imageIndex = Math.floor(Math.random() * 1000); // 或者传入图片索引
    return `${userInfo}${prefix}_${reportId}_IMAGE_${imageIndex}_${timestamp}.${extension}`;
  }
  
  // 其他文件使用一般格式
  return `${userInfo}${prefix}_${reportId}_FILE_${timestamp}.${extension}`;
};

// 导出文件上传工具函数
export const uploadFileToWebDAV = async (file, folder = 'default', reportId = '', userId = '', username = '') => {
  try {
    const filename = generateFileName(file.name, reportId, userId, username, folder);
    // 直接上传到服务器指定目录
    const uploadUrl = `https://zziot.jzz77.cn:9003/api/upload/${folder}`;
    
    // 创建FormData对象
    const formData = new FormData();
    
    // 获取文件内容
    let contentType = file.type || 'application/octet-stream';
    
    // 获取文件大小（如果可能）
    let fileSize = 0;
    try {
      if (file.uri) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (fileInfo && fileInfo.size) {
          fileSize = fileInfo.size;
        }
      }
    } catch (error) {
      console.warn('获取文件大小失败:', error);
    }
    
    // 检查是否为图片文件
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.name) || 
                   contentType.startsWith('image/');
    
    // 创建文件对象
    const fileInfo = {
      uri: file.uri,
      type: contentType,
      name: filename
    };
    
    // 添加文件到FormData
    formData.append('file', fileInfo);
    
    // 添加额外信息，确保字段名与数据库匹配
    formData.append('filename', filename);
    formData.append('original_name', file.name);
    formData.append('folder', folder);
    
    // 无论文件夹类型，都直接使用原始reportId，不做任何转换
    console.log('上传文件，使用原始report_id:', reportId);
    formData.append('report_id', reportId);
    
    // 保持reportId参数不变，兼容旧代码
    formData.append('reportId', reportId);
    
    // 用户信息 - 添加两种格式以确保兼容性
    formData.append('userId', userId);
    formData.append('user_id', userId);
    
    // 以下字段不会被后端使用，但保留以便前端逻辑完整
    formData.append('mime_type', contentType);
    formData.append('file_size', fileSize.toString());
    formData.append('is_image', isImage ? '1' : '0');
    formData.append('username', username);
    
    // 发送POST请求
    const response = await axios({
      method: 'POST',
      url: uploadUrl,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });

    if (response.status === 200 || response.status === 201) {
      // 返回服务器响应中的文件URL
      return response.data.fileUrl || `https://zziot.jzz77.cn:9003/files/${folder}/${filename}`;
    } else {
      throw new Error('上传失败');
    }
  } catch (error) {
    console.error('上传文件失败:', error);
    throw error;
  }
};


// 修改获取文件列表的函数
export const getFileList = async (folder = 'default', reportId = '', userId = '') => {
  try {
    // 使用新的服务器API端点获取文件列表
    let apiUrl = `https://zziot.jzz77.cn:9003/api/files/${folder}`;
    
    // 添加查询参数
    const params = new URLSearchParams();
    if (reportId) {
      // 无论文件夹类型，都直接使用原始reportId，不做任何转换
      console.log('获取文件列表，使用原始report_id:', reportId);
      params.append('report_id', reportId);
      
      // 保持reportId参数不变，兼容旧代码
      params.append('reportId', reportId);
    }
    if (userId) {
      params.append('userId', encodeURIComponent(userId));
      params.append('user_id', encodeURIComponent(userId));
    }
    
    // 如果有参数，添加到URL
    if (params.toString()) {
      apiUrl += `?${params.toString()}`;
    }
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.data || !Array.isArray(response.data.files)) {
      console.log('No files found or invalid response format');
      return [];
    }

    // 处理服务器返回的文件列表
    const files = response.data.files.map(file => {
      const isImageFile = /\.(jpg|jpeg|png|gif)$/i.test(file.filename);
      const baseUrl = response.data.baseUrl || 'https://zziot.jzz77.cn:9003/files';
      const fileUrl = file.url || `${baseUrl}/${folder}/${file.filename}`;
      
      return {
        url: fileUrl,
        filename: file.filename,
        isImage: isImageFile,
        thumbnailUrl: isImageFile ? fileUrl : null,
        originalName: file.originalName || file.filename
      };
    });

    console.log('Files retrieved from server:', files.length);
    return files;
  } catch (error) {
    console.error('获取文件列表失败:', error);
    console.error('Error details:', error.response?.data);
    return []; // 出错时返回空数组而不是抛出异常
  }
};

const FileUploadScreen = ({ route }) => {
  const { reportType } = route.params || {};
  const { colors } = useTheme();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 文件夹路径映射配置
  const FOLDER_PATHS = {
    'report': 'reports_gt', // 高铁污水厂上传路径
    'report5000': 'reports_5000', // 5000吨处理站上传路径
    'lab': 'laboratory',
    'default': 'uploads'
  };

  // 获取上传目标文件夹
  const getUploadFolder = () => {
    return FOLDER_PATHS[reportType] || FOLDER_PATHS.default;
  };

  // 文件大小限制（20MB）
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  // 支持的文件类型
  const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES,
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        // 检查文件大小
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        if (fileInfo.size > MAX_FILE_SIZE) {
          Alert.alert('错误', '文件大小不能超过20MB');
          return;
        }

        // 获取文件的MIME类型
        let mimeType = result.mimeType;
        if (!mimeType) {
          // 如果没有MIME类型，根据文件扩展名推断
          const extension = result.name.split('.').pop().toLowerCase();
          const mimeTypes = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif'
          };
          mimeType = mimeTypes[extension] || 'application/octet-stream';
        }

        setSelectedFile({
          uri: result.uri,
          name: result.name,
          type: mimeType,
          size: fileInfo.size
        });
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      Alert.alert('错误', '选择文件失败，请重试');
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      Alert.alert('提示', '请先选择要上传的文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const randomStr = Math.random().toString(36).substring(7);
      const uploadFolder = getUploadFolder();
      const filename = generateFileName(selectedFile.name, randomStr, '', '', uploadFolder);
      const uploadUrl = `https://zziot.jzz77.cn:9003/api/upload/${uploadFolder}`;

      // 创建FormData对象
      const formData = new FormData();
      
      // 添加文件
      formData.append('file', {
        uri: selectedFile.uri,
        type: selectedFile.type || 'application/octet-stream',
        name: filename
      });

      // 添加额外信息 - 使用与数据库匹配的字段名
      formData.append('filename', filename);
      formData.append('original_name', selectedFile.name);
      formData.append('folder', uploadFolder);
      
      // 直接使用原始的reportId值，不做任何转换
      console.log('上传文件，使用原始report_id:', randomStr);
      formData.append('report_id', randomStr);
      
      // 保持reportId参数不变，兼容旧代码
      formData.append('reportId', randomStr);
      
      // 添加用户ID - 即使是空值也添加，确保字段存在
      formData.append('userId', '');
      formData.append('user_id', '');
      
      formData.append('mime_type', selectedFile.type || 'application/octet-stream');
      formData.append('file_size', selectedFile.size ? selectedFile.size.toString() : '0');
      formData.append('is_image', /\.(jpg|jpeg|png|gif)$/i.test(selectedFile.name) ? '1' : '0');

      const response = await axios({
        method: 'POST',
        url: uploadUrl,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('成功', '文件上传成功');
        setSelectedFile(null);
        setUploadProgress(0);
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      Alert.alert('错误', '上传文件失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>文件上传</Text>
        
        <TouchableOpacity 
          style={[styles.pickButton, { backgroundColor: colors.primary }]}
          onPress={pickFile}
          disabled={uploading}
        >
          <Ionicons name="document" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>选择文件</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={[styles.fileInfo, { borderColor: colors.border }]}>
            <Text style={[styles.fileName, { color: colors.text }]}>
              文件名：{selectedFile.name}
            </Text>
            <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
              大小：{formatFileSize(selectedFile.size)}
            </Text>
          </View>
        )}

        {uploading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[styles.progressFill, { 
                  backgroundColor: colors.primary,
                  width: `${uploadProgress}%`
                }]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {uploadProgress}%
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.uploadButton, { 
            backgroundColor: colors.primary,
            opacity: uploading || !selectedFile ? 0.5 : 1
          }]}
          onPress={uploadFile}
          disabled={uploading || !selectedFile}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>上传文件</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileInfo: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  fileName: {
    fontSize: 14,
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
  },
});

export default FileUploadScreen;