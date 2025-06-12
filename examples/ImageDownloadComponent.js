// React Native 组件示例：图片下载和处理

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import {
  getImageAsBase64,
  downloadImageToCache,
  fileToBase64,
  downloadAuthImage,
  clearImageCache,
  isImageUrl
} from '../utils/imageUtils';

const ImageDownloadComponent = () => {
  const [imageUrl, setImageUrl] = useState('https://picsum.photos/300/200');
  const [downloadedImage, setDownloadedImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cachedFiles, setCachedFiles] = useState([]);
  const [authConfig, setAuthConfig] = useState({
    username: '',
    password: '',
    token: ''
  });

  // 方法1：下载图片并转换为 Base64
  const handleDownloadAsBase64 = async () => {
    if (!isImageUrl(imageUrl)) {
      Alert.alert('错误', '请输入有效的图片URL');
      return;
    }

    setLoading(true);
    try {
      const base64Data = await getImageAsBase64(imageUrl, {
        timeout: 30000,
        maxSize: 5 * 1024 * 1024 // 5MB
      });
      
      setBase64Image(base64Data);
      Alert.alert('成功', '图片已转换为Base64格式');
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 方法2：下载图片到缓存文件
  const handleDownloadToCache = async () => {
    if (!isImageUrl(imageUrl)) {
      Alert.alert('错误', '请输入有效的图片URL');
      return;
    }

    setLoading(true);
    try {
      const filePath = await downloadImageToCache(imageUrl, {
        fileName: `downloaded_${Date.now()}.jpg`,
        useCache: true
      });
      
      setDownloadedImage(filePath);
      setCachedFiles(prev => [...prev, filePath]);
      Alert.alert('成功', `图片已下载到: ${filePath}`);
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 方法3：带认证的图片下载
  const handleAuthDownload = async () => {
    if (!isImageUrl(imageUrl)) {
      Alert.alert('错误', '请输入有效的图片URL');
      return;
    }

    if (!authConfig.username && !authConfig.token) {
      Alert.alert('错误', '请输入认证信息（用户名密码或Token）');
      return;
    }

    setLoading(true);
    try {
      const auth = authConfig.token ? 
        { type: 'bearer', token: authConfig.token } :
        { type: 'basic', username: authConfig.username, password: authConfig.password };
      
      const base64Data = await downloadAuthImage(imageUrl, auth, {
        returnType: 'base64',
        timeout: 30000
      });
      
      setBase64Image(base64Data);
      Alert.alert('成功', '认证图片下载成功');
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 方法4：从缓存文件转换为 Base64
  const handleFileToBase64 = async () => {
    if (!downloadedImage) {
      Alert.alert('错误', '请先下载图片到缓存');
      return;
    }

    setLoading(true);
    try {
      const base64Data = await fileToBase64(downloadedImage);
      setBase64Image(base64Data);
      Alert.alert('成功', '缓存文件已转换为Base64');
    } catch (error) {
      Alert.alert('错误', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 清理缓存
  const handleClearCache = async () => {
    if (cachedFiles.length === 0) {
      Alert.alert('提示', '没有缓存文件需要清理');
      return;
    }

    try {
      await clearImageCache(cachedFiles);
      setCachedFiles([]);
      setDownloadedImage(null);
      Alert.alert('成功', '缓存已清理');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  // 重置所有状态
  const handleReset = () => {
    setDownloadedImage(null);
    setBase64Image(null);
    setAuthConfig({ username: '', password: '', token: '' });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>图片下载和处理示例</Text>
      
      {/* 图片URL输入 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>图片URL:</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="输入图片URL"
          multiline
        />
      </View>

      {/* 认证配置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>认证配置（可选）:</Text>
        <TextInput
          style={styles.input}
          value={authConfig.username}
          onChangeText={(text) => setAuthConfig(prev => ({ ...prev, username: text }))}
          placeholder="用户名"
        />
        <TextInput
          style={styles.input}
          value={authConfig.password}
          onChangeText={(text) => setAuthConfig(prev => ({ ...prev, password: text }))}
          placeholder="密码"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={authConfig.token}
          onChangeText={(text) => setAuthConfig(prev => ({ ...prev, token: text }))}
          placeholder="Bearer Token（可选）"
        />
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleDownloadAsBase64}
          disabled={loading}
        >
          <Text style={styles.buttonText}>转换为Base64</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={handleDownloadToCache}
          disabled={loading}
        >
          <Text style={styles.buttonText}>下载到缓存</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.warningButton]} 
          onPress={handleAuthDownload}
          disabled={loading}
        >
          <Text style={styles.buttonText}>认证下载</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.infoButton]} 
          onPress={handleFileToBase64}
          disabled={loading || !downloadedImage}
        >
          <Text style={styles.buttonText}>文件转Base64</Text>
        </TouchableOpacity>
      </View>

      {/* 工具按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>清理缓存</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.defaultButton]} 
          onPress={handleReset}
        >
          <Text style={styles.buttonText}>重置</Text>
        </TouchableOpacity>
      </View>

      {/* 加载指示器 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>处理中...</Text>
        </View>
      )}

      {/* 显示下载的图片 */}
      {downloadedImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>缓存图片:</Text>
          <Image source={{ uri: downloadedImage }} style={styles.image} />
          <Text style={styles.filePath}>{downloadedImage}</Text>
        </View>
      )}

      {/* 显示Base64图片 */}
      {base64Image && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base64图片:</Text>
          <Image source={{ uri: base64Image }} style={styles.image} />
          <Text style={styles.base64Info}>
            Base64长度: {base64Image.length} 字符
          </Text>
        </View>
      )}

      {/* 缓存文件列表 */}
      {cachedFiles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>缓存文件列表:</Text>
          {cachedFiles.map((file, index) => (
            <Text key={index} style={styles.cacheFile}>
              {index + 1}. {file.split('/').pop()}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    fontSize: 14
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    minWidth: '48%',
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#007AFF'
  },
  secondaryButton: {
    backgroundColor: '#34C759'
  },
  warningButton: {
    backgroundColor: '#FF9500'
  },
  infoButton: {
    backgroundColor: '#5AC8FA'
  },
  dangerButton: {
    backgroundColor: '#FF3B30'
  },
  defaultButton: {
    backgroundColor: '#8E8E93'
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666'
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginBottom: 8,
    borderRadius: 4
  },
  filePath: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace'
  },
  base64Info: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  cacheFile: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace'
  }
});

export default ImageDownloadComponent;