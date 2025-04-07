import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, FlatList, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { uploadFileToWebDAV, getFileList } from './FileUploadScreen';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// 修改文件名生成逻辑，添加用户信息
const generateFileName = (originalName, userId = '', username = '') => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop().toLowerCase();
  const nameWithoutExtension = originalName.split('.').slice(0, -1).join('.') || originalName;
  const userInfo = userId ? `_USER_${userId}_${username}` : '';
  
  // 保留原始文件名，并在后面添加用户ID和用户名
  return `${nameWithoutExtension}${userInfo}_${timestamp}.${extension}`;
};

const FileUploadTestScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth(); // 获取当前用户信息
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 文件夹路径
  const FOLDER_PATH = 'uploads';

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
    'image/gif',
    'text/plain',
    'application/zip'
  ];

  // 加载已上传的文件列表
  useEffect(() => {
    loadUploadedFiles();
  }, []);

  const loadUploadedFiles = async () => {
    setIsLoading(true);
    try {
      // 获取当前用户信息
      const userId = user?.id || '';
      const username = user?.username || '';
      
      // 尝试使用userId进行后端过滤
      let files = await getFileList(FOLDER_PATH, userId);
      
      // 如果没有文件或返回文件数为0，尝试获取所有文件然后在前端过滤
      if (!files || files.length === 0) {
        const allFiles = await getFileList(FOLDER_PATH);
        
        // 在前端根据用户名/用户ID进行过滤
        if (username) {
          files = allFiles.filter(file => 
            // 检查filename或originalName中是否包含用户名
            (file.username && file.username === username) || 
            (file.userId && file.userId === userId) ||
            // 检查文件名是否包含用户信息
            (file.filename && file.filename.includes(`_USER_${userId}_${username}`))
          );
        } else {
          files = allFiles;
        }
      }
      
      setUploadedFiles(files);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      Alert.alert('错误', '获取已上传文件列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 选择文件
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: true
      });

      console.log('DocumentPicker result:', JSON.stringify(result));
      
      // 处理新版本expo-document-picker的返回结果
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validFiles = [];

        for (const file of result.assets) {
          // 检查文件大小
          const fileInfo = await FileSystem.getInfoAsync(file.uri);
          if (fileInfo.size > MAX_FILE_SIZE) {
            Alert.alert('错误', `文件 ${file.name} 大小超过20MB限制`);
            continue;
          }

          // 获取文件的MIME类型
          let mimeType = file.mimeType;
          if (!mimeType) {
            // 如果没有MIME类型，根据文件扩展名推断
            const extension = file.name.split('.').pop().toLowerCase();
            const mimeTypes = {
              'pdf': 'application/pdf',
              'doc': 'application/msword',
              'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'xls': 'application/vnd.ms-excel',
              'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'txt': 'text/plain',
              'zip': 'application/zip'
            };
            mimeType = mimeTypes[extension] || 'application/octet-stream';
          }

          validFiles.push({
            uri: file.uri,
            name: file.name,
            type: mimeType,
            size: fileInfo.size
          });
        }

        if (validFiles.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
          console.log('Files selected:', validFiles.length);
        }
      } else if (result.type === 'success') {
        // 处理单文件选择的情况（兼容旧版本）
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        if (fileInfo.size > MAX_FILE_SIZE) {
          Alert.alert('错误', `文件 ${result.name} 大小超过20MB限制`);
          return;
        }

        // 获取文件的MIME类型
        let mimeType = result.mimeType;
        if (!mimeType) {
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
            'gif': 'image/gif',
            'txt': 'text/plain',
            'zip': 'application/zip'
          };
          mimeType = mimeTypes[extension] || 'application/octet-stream';
        }

        const newFile = {
          uri: result.uri,
          name: result.name,
          type: mimeType,
          size: fileInfo.size
        };

        setSelectedFiles(prevFiles => [...prevFiles, newFile]);
        console.log('Single file selected:', result.name);
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      Alert.alert('错误', '选择文件失败，请重试');
    }
  };

  // 选择图片
  const pickImage = async () => {
    try {
      // 请求权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('错误', '需要相册访问权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      console.log('ImagePicker result:', JSON.stringify(result));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validFiles = [];

        for (const asset of result.assets) {
          // 检查文件大小
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (fileInfo.size > MAX_FILE_SIZE) {
            Alert.alert('错误', `图片大小超过20MB限制`);
            continue;
          }

          // 获取文件名
          const filename = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
          
          validFiles.push({
            uri: asset.uri,
            name: filename,
            type: 'image/jpeg',
            size: fileInfo.size
          });
        }

        if (validFiles.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
          console.log('Images selected:', validFiles.length);
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    }
  };

  // 移除选中的文件
  const removeFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  // 上传所有文件
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('提示', '请先选择要上传的文件');
      return;
    }

    setUploading(true);
    const newProgress = {};
    selectedFiles.forEach((file, index) => {
      newProgress[index] = 0;
    });
    setUploadProgress(newProgress);

    try {
      const uploadPromises = selectedFiles.map((file, index) => {
        return uploadSingleFile(file, index);
      });

      await Promise.all(uploadPromises);
      
      Alert.alert('成功', '所有文件上传成功');
      setSelectedFiles([]);
      setUploadProgress({});
      loadUploadedFiles(); // 刷新文件列表
    } catch (error) {
      console.error('上传文件失败:', error);
      Alert.alert('错误', '部分文件上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 上传单个文件
  const uploadSingleFile = async (file, index) => {
    try {
      // 使用用户信息生成唯一的reportId
      const userId = user?.id || '';
      const username = user?.username || '';
      const reportId = userId ? `${userId}_${Math.random().toString(36).substring(7)}` : Math.random().toString(36).substring(7);
      const uploadUrl = `https://zziot.jzz77.cn:9003/api/upload/${FOLDER_PATH}`;

      // 使用新的文件名生成函数
      const filename = generateFileName(file.name, userId, username);

      // 创建FormData对象
      const formData = new FormData();
      
      // 添加文件
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: filename // 使用包含用户信息的文件名
      });

      // 添加额外信息
      formData.append('reportId', reportId);
      formData.append('originalName', file.name);
      formData.append('folder', FOLDER_PATH);
      formData.append('userId', userId); // 添加用户ID
      formData.append('username', username); // 添加用户名

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
          setUploadProgress(prev => ({
            ...prev,
            [index]: percentCompleted
          }));
        }
      });

      if (response.status === 200 || response.status === 201) {
        return response.data.fileUrl || `https://node red.jzz77.cn:9003/files/${FOLDER_PATH}/${filename}`;
      } else {
        throw new Error(`上传文件 ${file.name} 失败`);
      }
    } catch (error) {
      console.error(`上传文件 ${file.name} 失败:`, error);
      throw error;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 渲染文件图标
  const renderFileIcon = (file) => {
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.name);
    const isPdf = /\.pdf$/i.test(file.name);
    const isDoc = /\.(doc|docx)$/i.test(file.name);
    const isExcel = /\.(xls|xlsx)$/i.test(file.name);
    const isText = /\.txt$/i.test(file.name);
    const isZip = /\.zip$/i.test(file.name);

    if (isImage) return <Ionicons name="image" size={24} color={colors.primary} />;
    if (isPdf) return <Ionicons name="document-text" size={24} color="#E44D26" />;
    if (isDoc) return <Ionicons name="document-text" size={24} color="#2A5699" />;
    if (isExcel) return <Ionicons name="grid" size={24} color="#217346" />;
    if (isText) return <Ionicons name="document" size={24} color={colors.text} />;
    if (isZip) return <Ionicons name="archive" size={24} color="#FFA000" />;
    
    return <Ionicons name="document" size={24} color={colors.text} />;
  };

  // 渲染已上传文件列表项
  const renderUploadedFileItem = ({ item }) => {
    // 处理文件查看功能
    const handleViewFile = () => {
      console.log('查看文件:', item.url);
      
      // 检查URL是否有效
      if (!item.url) {
        Alert.alert('错误', '文件URL无效');
        return;
      }
      
      // 确保使用正确的URL
      let fileUrl = item.url;
      if (!fileUrl.startsWith('https://zziot.jzz77.cn:9003')) {
        // 替换URL为正确的localhost地址
        fileUrl = fileUrl.replace(/^http:\/\/[^/]+/i, 'https://zziot.jzz77.cn:9003');
      }
      
      // 对于图片文件，显示大图预览
      if (item.isImage) {
        // 在这里可以实现图片预览功能，例如使用Modal显示大图
        Alert.alert(
          '图片预览',
          '是否在浏览器中打开此图片？',
          [
            {text: '取消', style: 'cancel'},
            {text: '打开', onPress: () => Linking.openURL(fileUrl)}
          ]
        );
      } else {
        // 对于非图片文件，使用系统浏览器打开
        Linking.openURL(fileUrl).catch(err => {
          console.error('打开文件失败:', err);
          Alert.alert('错误', '无法打开此文件，请检查文件URL是否有效');
        });
      }
    };
    
    return (
      <View style={[styles.fileItem, { borderColor: colors.border }]}>
        <View style={styles.fileItemContent}>
          {item.isImage ? (
            <Image 
              source={{ uri: item.url }} 
              style={styles.fileThumb} 
              resizeMode="cover"
              onError={() => console.log('图片加载失败:', item.url)}
            />
          ) : (
            <View style={[styles.fileThumb, { backgroundColor: colors.card }]}>
              <Ionicons name="document" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
              {item.originalName}
            </Text>
            <TouchableOpacity 
              onPress={handleViewFile}
              style={styles.viewButton}
            >
              <Text style={[styles.viewButtonText, { color: colors.primary }]}>查看</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.pickButton, { backgroundColor: colors.primary }]}
            onPress={pickFile}
            disabled={uploading}
          >
            <Ionicons name="document" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>选择文件</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.pickButton, { backgroundColor: colors.primary }]}
            onPress={pickImage}
            disabled={uploading}
          >
            <Ionicons name="image" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>选择图片</Text>
          </TouchableOpacity>
        </View>

        {selectedFiles.length > 0 && (
          <View style={styles.selectedFilesContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              已选择的文件 ({selectedFiles.length})
            </Text>
            
            <FlatList
              data={selectedFiles}
              renderItem={({item, index}) => (
                <View style={[styles.fileItem, { borderColor: colors.border }]}>
                  <View style={styles.fileItemContent}>
                    {renderFileIcon(item)}
                    <View style={styles.fileDetails}>
                      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                        {formatFileSize(item.size)}
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error || '#FF3B30'} />
                    </TouchableOpacity>
                  </View>
                  
                  {uploading && (
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View 
                          style={[styles.progressFill, { 
                            backgroundColor: colors.primary,
                            width: `${uploadProgress[index] || 0}%`
                          }]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.text }]}>
                        {uploadProgress[index] || 0}%
                      </Text>
                    </View>
                  )}
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
              style={styles.fileList}
              ListFooterComponent={
                <TouchableOpacity 
                  style={[styles.uploadButton, { 
                    backgroundColor: colors.primary,
                    opacity: uploading ? 0.5 : 1
                  }]}
                  onPress={uploadFiles}
                  disabled={uploading || selectedFiles.length === 0}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={24} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>上传所有文件</Text>
                    </>
                  )}
                </TouchableOpacity>
              }
            />
          </View>
        )}
        
        <View style={styles.uploadedFilesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            已上传的文件
          </Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : uploadedFiles.length > 0 ? (
            <FlatList
              data={uploadedFiles}
              renderItem={renderUploadedFileItem}
              keyExtractor={(item, index) => item.filename || index.toString()}
              style={styles.fileList}
            />
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              暂无已上传文件
            </Text>
          )}
        </View>
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
    flex: 1,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
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
  selectedFilesContainer: {
    marginTop: 20,
  },
  uploadedFilesContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  fileItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  fileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
    marginLeft: 10,
  },
  fileName: {
    fontSize: 14,
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 12,
  },
  removeButton: {
    padding: 5,
  },
  progressContainer: {
    marginTop: 10,
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
  fileList: {
    marginTop: 10,
    maxHeight: 300,
  },
  fileThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButton: {
    marginTop: 5,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
    marginBottom: 20,
  }
});

export default FileUploadTestScreen;