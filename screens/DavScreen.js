import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
  Image
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from 'webdav';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const DavScreen = () => {
  const { colors } = useTheme();
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDownloaded, setImageDownloaded] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState({
    url: 'http://112.28.56.235:11000/remote.php/dav/files/dsws001',
    username: 'dsws001',
    password: 'dsws2276918'
  });

  // 加载保存的连接配置
  useEffect(() => {
    loadConnectionConfig();
  }, []);

  const loadConnectionConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('davConnectionConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setConnectionConfig(config);
        // 自动尝试连接
        if (config.username && config.password) {
          connectToServer(config);
        }
      } else {
        // 如果没有保存的配置，使用默认配置自动连接
        const defaultConfig = {
          url: 'http://112.28.56.235:11000/remote.php/dav/files/dsws001',
          username: 'dsws001',
          password: 'dsws2276918'
        };
        setConnectionConfig(defaultConfig);
        connectToServer(defaultConfig);
      }
    } catch (error) {
      console.error('加载连接配置失败:', error);
      // 即使出错也尝试使用默认配置连接
      const defaultConfig = {
        url: 'http://112.28.56.235:11000/remote.php/dav/files/dsws001',
        username: 'dsws001',
        password: 'dsws2276918'
      };
      setConnectionConfig(defaultConfig);
      connectToServer(defaultConfig);
    }
  };

  const saveConnectionConfig = async (config) => {
    try {
      await AsyncStorage.setItem('davConnectionConfig', JSON.stringify(config));
    } catch (error) {
      console.error('保存连接配置失败:', error);
    }
  };

  const connectToServer = async (config = connectionConfig) => {
    setLoading(true);
    try {
      const webdavClient = createClient(config.url, {
        username: config.username,
        password: config.password
      });

      // 测试连接
      await webdavClient.getDirectoryContents('/');
      
      setClient(webdavClient);
      setConnected(true);
      setCurrentPath('/');
      await saveConnectionConfig(config);
      loadDirectory('/', webdavClient);
      setShowConnectionModal(false);
      Alert.alert('成功', '已连接到Nextcloud服务器');
    } catch (error) {
      console.error('连接失败:', error);
      Alert.alert('连接失败', '请检查服务器地址、用户名和密码');
      setConnected(false);
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setClient(null);
    setConnected(false);
    setFiles([]);
    setCurrentPath('/');
  };

  const loadDirectory = async (path, webdavClient = client) => {
    if (!webdavClient) return;
    
    setLoading(true);
    try {
      const contents = await webdavClient.getDirectoryContents(path);
      setFiles(contents);
      setCurrentPath(path);
    } catch (error) {
      console.error('加载目录失败:', error);
      Alert.alert('错误', '加载目录失败');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDirectory(currentPath);
    setRefreshing(false);
  };

  const navigateToPath = (path) => {
    loadDirectory(path);
  };

  const goBack = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateToPath(parentPath);
  };

  // 判断文件是否为图片
  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  };

  // 清理图片缓存
  const cleanupImageCache = async (cacheUri) => {
    try {
      if (cacheUri) {
        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cacheUri);
          console.log('已清理图片缓存:', cacheUri);
        }
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  };

  // 关闭图片模态框
  const closeImageModal = async () => {
    // 如果用户没有下载图片，清理缓存
    if (!imageDownloaded && selectedImage && selectedImage.cacheUri) {
      await cleanupImageCache(selectedImage.cacheUri);
    }
    setShowImageModal(false);
    setSelectedImage(null);
    setImageDownloaded(false);
  };

  // 预览图片
  const previewImage = async (file) => {
    if (!client) return;
    
    try {
      const filePath = typeof file.filename === 'string' ? file.filename : file.filename.toString();
      console.log('预览图片文件路径:', filePath);
      
      // 创建缓存目录
      const cacheDir = FileSystem.cacheDirectory + 'images/';
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        console.log('创建图片缓存目录:', cacheDir);
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }
      
      // 生成本地缓存文件名
      const fileName = file.basename || filePath.split('/').pop();
      const localUri = cacheDir + fileName;
      console.log('本地缓存路径:', localUri);
      
      // 检查缓存是否存在
      const cacheInfo = await FileSystem.getInfoAsync(localUri);
      
      if (!cacheInfo.exists) {
        console.log('缓存不存在，开始下载图片...');
        
        // 构建完整的WebDAV URL
        const baseUrl = connectionConfig.url.replace('/remote.php/dav/files/' + connectionConfig.username, '');
        const fullImageUrl = `${baseUrl}/remote.php/dav/files/${connectionConfig.username}${filePath}`;
        console.log('完整图片URL:', fullImageUrl);
        
        // 使用 FileSystem.downloadAsync 下载到缓存
        const downloadResult = await FileSystem.downloadAsync(
          fullImageUrl,
          localUri,
          {
            headers: {
              'Authorization': 'Basic ' + btoa(connectionConfig.username + ':' + connectionConfig.password)
            }
          }
        );
        
        console.log('下载结果:', downloadResult);
        
        if (downloadResult.status !== 200) {
          throw new Error(`下载失败，状态码: ${downloadResult.status}`);
        }
        
        console.log('图片下载成功，保存到:', downloadResult.uri);
      } else {
        console.log('使用缓存的图片:', localUri);
      }
      
      // 设置图片预览
      setSelectedImage({
        uri: localUri,
        file: file,
        cached: true, // 标记为缓存文件
        cacheUri: localUri // 保存缓存路径用于清理
      });
      setImageDownloaded(false); // 重置下载状态
      setShowImageModal(true);
      
    } catch (error) {
      console.error('预览图片失败:', error);
      Alert.alert('错误', '预览图片失败: ' + error.message);
    }
  };

  const downloadFile = async (file) => {
    if (!client) return;
    
    setLoading(true);
    try {
      // 使用完整的文件路径而不是filename对象
      const filePath = typeof file.filename === 'string' ? file.filename : file.filename.toString();
      console.log('正在下载文件:', filePath);
      
      const fileContent = await client.getFileContents(filePath, { format: 'binary' });
      
      // 将binary数据转换为Base64字符串
       let base64Content;
       if (typeof fileContent === 'string') {
         base64Content = fileContent;
       } else {
         // 如果是ArrayBuffer或Uint8Array，分块转换为Base64避免栈溢出
         const uint8Array = new Uint8Array(fileContent);
         const chunkSize = 8192; // 8KB chunks
         let binaryString = '';
         
         for (let i = 0; i < uint8Array.length; i += chunkSize) {
           const chunk = uint8Array.slice(i, i + chunkSize);
           binaryString += String.fromCharCode.apply(null, chunk);
         }
         
         base64Content = btoa(binaryString);
       }
      
      // 在React Native中，我们可以将文件保存到设备
      const fileUri = FileSystem.documentDirectory + file.basename;
      await FileSystem.writeAsStringAsync(fileUri, base64Content, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      Alert.alert('成功', `文件已下载到: ${fileUri}`);
    } catch (error) {
      console.error('下载文件失败:', error);
      console.error('文件对象:', file);
      Alert.alert('错误', '下载文件失败');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!client) return;
    
    Alert.alert(
      '选择上传方式',
      '请选择要上传的内容类型',
      [
        {
          text: '从相册选择图片',
          onPress: uploadImageFromGallery
        },
        {
          text: '选择文件',
          onPress: uploadFileFromDocuments
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };

  const uploadImageFromGallery = async () => {
    if (!client) return;
    
    try {
      // 请求权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('权限错误', '需要相册权限才能选择图片');
        return;
      }
      
      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        
        const asset = result.assets[0];
        
        // 检查文件是否存在
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (!fileInfo.exists) {
          Alert.alert('错误', '无法访问选择的图片');
          setLoading(false);
          return;
        }
        
        const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        // 生成文件名
        const timestamp = new Date().getTime();
        const extension = asset.uri.split('.').pop() || 'jpg';
        const fileName = `image_${timestamp}.${extension}`;
        
        const uploadPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
        
        await client.putFileContents(uploadPath, fileContent, {
          format: 'binary'
        });
        
        Alert.alert('成功', '图片上传成功');
        await loadDirectory(currentPath);
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      Alert.alert('错误', '上传图片失败');
    } finally {
      setLoading(false);
    }
  };

  const uploadFileFromDocuments = async () => {
    if (!client) return;
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        setLoading(true);
        
        const fileContent = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        const uploadPath = currentPath === '/' ? `/${result.name}` : `${currentPath}/${result.name}`;
        
        await client.putFileContents(uploadPath, fileContent, {
          format: 'binary'
        });
        
        Alert.alert('成功', '文件上传成功');
        await loadDirectory(currentPath);
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      Alert.alert('错误', '上传文件失败');
    } finally {
      setLoading(false);
    }
  };

  const createFolder = () => {
    Alert.prompt(
      '创建文件夹',
      '请输入文件夹名称:',
      async (folderName) => {
        if (!folderName || !client) return;
        
        setLoading(true);
        try {
          const folderPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
          await client.createDirectory(folderPath);
          Alert.alert('成功', '文件夹创建成功');
          await loadDirectory(currentPath);
        } catch (error) {
          console.error('创建文件夹失败:', error);
          Alert.alert('错误', '创建文件夹失败');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const deleteItem = (item) => {
    Alert.alert(
      '确认删除',
      `确定要删除 "${item.basename}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await client.deleteFile(item.filename);
              Alert.alert('成功', '删除成功');
              await loadDirectory(currentPath);
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderFileItem = (item) => {
    const isDirectory = item.type === 'directory';
    const iconName = isDirectory ? 'folder' : 'document';
    const iconColor = isDirectory ? colors.primary : colors.text;

    return (
      <TouchableOpacity
        key={item.filename}
        style={[styles.fileItem, { borderBottomColor: colors.border }]}
        onPress={() => {
          if (isDirectory) {
            navigateToPath(item.filename);
          } else if (isImageFile(item.basename)) {
            previewImage(item);
          } else {
            downloadFile(item);
          }
        }}
        onLongPress={() => deleteItem(item)}
      >
        <View style={styles.fileInfo}>
          <Ionicons name={iconName} size={24} color={iconColor} style={styles.fileIcon} />
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
              {item.basename}
            </Text>
            <Text style={[styles.fileMetadata, { color: colors.textSecondary }]}>
              {!isDirectory && `${formatFileSize(item.size)} • `}
              {formatDate(item.lastmod)}
            </Text>
          </View>
        </View>
        {!isDirectory && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={(e) => {
              e.stopPropagation();
              downloadFile(item);
            }}
          >
            <Ionicons name="download" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const ConnectionModal = () => (
    <Modal
      visible={showConnectionModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>连接到Nextcloud</Text>
          <TouchableOpacity onPress={() => setShowConnectionModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>服务器地址</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={connectionConfig.url}
              onChangeText={(text) => setConnectionConfig({ ...connectionConfig, url: text })}
              placeholder="https://your-nextcloud.com/remote.php/dav/files/username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>用户名</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={connectionConfig.username}
              onChangeText={(text) => setConnectionConfig({ ...connectionConfig, username: text })}
              placeholder="用户名"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>密码</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={connectionConfig.password}
              onChangeText={(text) => setConnectionConfig({ ...connectionConfig, password: text })}
              placeholder="密码或应用密码"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={() => connectToServer()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.connectButtonText}>连接</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.helpText}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>使用说明:</Text>
            <Text style={[styles.helpContent, { color: colors.textSecondary }]}>
              1. 服务器地址格式: https://your-server.com/remote.php/dav/files/username{"\n"}
              2. 建议使用应用密码而不是主密码{"\n"}
              3. 长按文件可删除，点击文件夹可进入
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 头部工具栏 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={goBack}
            disabled={currentPath === '/' || !connected}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={currentPath === '/' || !connected ? colors.textSecondary : colors.primary} 
            />
          </TouchableOpacity>
          <Text style={[styles.pathText, { color: colors.text }]} numberOfLines={1}>
            {currentPath || '/'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {connected && (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={createFolder}>
                <Ionicons name="folder-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={uploadFile}>
                <Ionicons name="cloud-upload" size={24} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => connected ? disconnect() : setShowConnectionModal(true)}
          >
            <Ionicons 
              name={connected ? "cloud-offline" : "cloud"} 
              size={24} 
              color={connected ? colors.error : colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 连接状态 */}
      {!connected && (
        <View style={[styles.statusContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="cloud-offline" size={48} color={colors.textSecondary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>未连接到Nextcloud</Text>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowConnectionModal(true)}
          >
            <Text style={styles.connectButtonText}>连接服务器</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 文件列表 */}
      {connected && (
        <ScrollView
          style={styles.fileList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {loading && !refreshing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载中...</Text>
            </View>
          )}
          
          {files.map(renderFileItem)}
          
          {files.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>此文件夹为空</Text>
            </View>
          )}
        </ScrollView>
      )}

      <ConnectionModal />
      
      {/* 图片预览模态框 */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={closeImageModal}
        animationType="fade"
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalCloseButton}
            onPress={closeImageModal}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.imageModalContent}>
            {selectedImage && (
              <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imageModalImage}
              resizeMode="contain"
              onError={(error) => {
                console.error('图片加载失败:', error);
                console.log('失败的图片URI:', selectedImage.uri);
                Alert.alert('图片加载失败', '无法显示该图片，可能是格式不支持或文件损坏');
              }}
              onLoad={() => {
                console.log('图片加载成功:', selectedImage.uri);
              }}
            />
            )}
          </View>
          
          <View style={styles.imageModalFooter}>
            <TouchableOpacity
              style={styles.imageModalActionButton}
              onPress={async () => {
                if (selectedImage && selectedImage.file) {
                  setImageDownloaded(true); // 标记为已下载
                  await downloadFile(selectedImage.file);
                  await closeImageModal();
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={24} color="#fff" />
              <Text style={styles.imageModalActionText}>下载</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        paddingTop: 44
      },
      android: {
        paddingTop: 12
      }
    })
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 4
  },
  pathText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  statusText: {
    fontSize: 18,
    marginVertical: 16,
    textAlign: 'center'
  },
  connectButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  fileList: {
    flex: 1
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  fileIcon: {
    marginRight: 12
  },
  fileDetails: {
    flex: 1
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2
  },
  fileMetadata: {
    fontSize: 12
  },
  downloadButton: {
    padding: 8
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    marginTop: 8
  },
  modalContainer: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        paddingTop: 44
      }
    })
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16
  },
  helpText: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  helpContent: {
    fontSize: 14,
    lineHeight: 20
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20
  },
  imageModalImage: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%'
  },
  imageModalFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  imageModalActionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10
  },
  imageModalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  }
});

export default DavScreen;