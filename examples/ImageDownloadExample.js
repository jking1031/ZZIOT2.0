// 使用 axios 获取图片二进制并保存或转为 Base64 的完整示例

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

/**
 * 方法1: 使用 axios 获取图片二进制数据并转换为 Base64
 * @param {string} imageUrl - 图片URL
 * @param {object} headers - 请求头（可选）
 * @returns {Promise<string>} Base64 字符串
 */
export const downloadImageAsBase64 = async (imageUrl, headers = {}) => {
  try {
    console.log('开始下载图片并转换为Base64:', imageUrl);
    
    // 使用 axios 获取图片二进制数据
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer', // 关键：设置响应类型为 arraybuffer
      headers: {
        'Accept': 'image/*',
        ...headers
      },
      timeout: 30000 // 30秒超时
    });
    
    // 将 ArrayBuffer 转换为 Base64
    const base64 = btoa(
      new Uint8Array(response.data)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // 根据响应头获取 MIME 类型
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // 创建完整的 Data URI
    const dataUri = `data:${contentType};base64,${base64}`;
    
    console.log('图片转换为Base64成功，大小:', base64.length);
    return dataUri;
    
  } catch (error) {
    console.error('下载图片并转换为Base64失败:', error);
    throw new Error(`图片下载失败: ${error.message}`);
  }
};

/**
 * 方法2: 使用 axios 下载图片并保存到本地文件
 * @param {string} imageUrl - 图片URL
 * @param {string} fileName - 保存的文件名（可选）
 * @param {object} headers - 请求头（可选）
 * @returns {Promise<string>} 本地文件路径
 */
export const downloadImageToFile = async (imageUrl, fileName = null, headers = {}) => {
  try {
    console.log('开始下载图片到本地文件:', imageUrl);
    
    // 生成文件名
    if (!fileName) {
      const timestamp = Date.now();
      const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
      fileName = `image_${timestamp}.${extension}`;
    }
    
    // 设置保存路径
    const localUri = FileSystem.cacheDirectory + fileName;
    
    // 使用 FileSystem.downloadAsync 下载文件
    const downloadResult = await FileSystem.downloadAsync(
      imageUrl,
      localUri,
      {
        headers: {
          'Accept': 'image/*',
          ...headers
        }
      }
    );
    
    if (downloadResult.status !== 200) {
      throw new Error(`下载失败，状态码: ${downloadResult.status}`);
    }
    
    console.log('图片下载成功，保存到:', downloadResult.uri);
    return downloadResult.uri;
    
  } catch (error) {
    console.error('下载图片到文件失败:', error);
    throw new Error(`图片下载失败: ${error.message}`);
  }
};

/**
 * 方法3: 使用 axios 获取图片并同时保存文件和返回 Base64
 * @param {string} imageUrl - 图片URL
 * @param {string} fileName - 保存的文件名（可选）
 * @param {object} headers - 请求头（可选）
 * @returns {Promise<{base64: string, filePath: string}>} Base64 和文件路径
 */
export const downloadImageBoth = async (imageUrl, fileName = null, headers = {}) => {
  try {
    console.log('开始下载图片并同时保存文件和转换Base64:', imageUrl);
    
    // 首先下载到文件
    const filePath = await downloadImageToFile(imageUrl, fileName, headers);
    
    // 读取文件并转换为 Base64
    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // 获取文件信息以确定 MIME 类型
    const extension = filePath.split('.').pop().toLowerCase();
    let mimeType = 'image/jpeg';
    
    switch (extension) {
      case 'png':
        mimeType = 'image/png';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      default:
        mimeType = 'image/jpeg';
    }
    
    const dataUri = `data:${mimeType};base64,${base64}`;
    
    console.log('图片下载和转换完成');
    return {
      base64: dataUri,
      filePath: filePath
    };
    
  } catch (error) {
    console.error('下载图片并转换失败:', error);
    throw new Error(`图片处理失败: ${error.message}`);
  }
};

/**
 * 方法4: 带认证的图片下载（适用于需要登录的图片）
 * @param {string} imageUrl - 图片URL
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} authType - 认证类型 ('basic' | 'bearer')
 * @param {string} token - Bearer token（当 authType 为 'bearer' 时使用）
 * @returns {Promise<string>} Base64 Data URI
 */
export const downloadAuthenticatedImage = async (
  imageUrl, 
  username = null, 
  password = null, 
  authType = 'basic',
  token = null
) => {
  try {
    let headers = {
      'Accept': 'image/*'
    };
    
    // 设置认证头
    if (authType === 'basic' && username && password) {
      headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);
    } else if (authType === 'bearer' && token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    
    console.log('开始下载需要认证的图片:', imageUrl);
    
    return await downloadImageAsBase64(imageUrl, headers);
    
  } catch (error) {
    console.error('下载认证图片失败:', error);
    throw new Error(`认证图片下载失败: ${error.message}`);
  }
};

/**
 * 方法5: 批量下载图片
 * @param {Array<string>} imageUrls - 图片URL数组
 * @param {object} options - 选项
 * @returns {Promise<Array>} 下载结果数组
 */
export const downloadMultipleImages = async (imageUrls, options = {}) => {
  const {
    headers = {},
    saveToFile = true,
    convertToBase64 = false,
    maxConcurrent = 3 // 最大并发数
  } = options;
  
  try {
    console.log(`开始批量下载 ${imageUrls.length} 张图片`);
    
    const results = [];
    
    // 分批处理，避免同时下载太多图片
    for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
      const batch = imageUrls.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (url, index) => {
        try {
          const globalIndex = i + index;
          const fileName = `batch_image_${globalIndex}_${Date.now()}.jpg`;
          
          let result = { url, success: false };
          
          if (saveToFile && convertToBase64) {
            const both = await downloadImageBoth(url, fileName, headers);
            result = { ...result, ...both, success: true };
          } else if (saveToFile) {
            const filePath = await downloadImageToFile(url, fileName, headers);
            result = { ...result, filePath, success: true };
          } else if (convertToBase64) {
            const base64 = await downloadImageAsBase64(url, headers);
            result = { ...result, base64, success: true };
          }
          
          return result;
        } catch (error) {
          console.error(`下载图片失败 ${url}:`, error);
          return { url, success: false, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 批次间稍作延迟
      if (i + maxConcurrent < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`批量下载完成: ${successCount}/${imageUrls.length} 成功`);
    
    return results;
    
  } catch (error) {
    console.error('批量下载图片失败:', error);
    throw new Error(`批量下载失败: ${error.message}`);
  }
};

/**
 * 工具函数: 清理缓存的图片文件
 * @param {Array<string>} filePaths - 要删除的文件路径数组
 */
export const cleanupImageCache = async (filePaths) => {
  try {
    for (const filePath of filePaths) {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log('已删除缓存文件:', filePath);
      }
    }
  } catch (error) {
    console.error('清理缓存失败:', error);
  }
};

/**
 * 使用示例
 */
export const exampleUsage = async () => {
  try {
    const imageUrl = 'https://example.com/image.jpg';
    
    // 示例1: 转换为 Base64
    const base64Data = await downloadImageAsBase64(imageUrl);
    console.log('Base64 Data URI:', base64Data.substring(0, 100) + '...');
    
    // 示例2: 保存到文件
    const filePath = await downloadImageToFile(imageUrl, 'my_image.jpg');
    console.log('文件保存路径:', filePath);
    
    // 示例3: 同时获取 Base64 和保存文件
    const both = await downloadImageBoth(imageUrl);
    console.log('Base64 和文件路径:', both);
    
    // 示例4: 带认证的下载
    const authBase64 = await downloadAuthenticatedImage(
      imageUrl,
      'username',
      'password',
      'basic'
    );
    
    // 示例5: 批量下载
    const urls = ['url1', 'url2', 'url3'];
    const batchResults = await downloadMultipleImages(urls, {
      saveToFile: true,
      convertToBase64: true
    });
    
  } catch (error) {
    Alert.alert('错误', error.message);
  }
};