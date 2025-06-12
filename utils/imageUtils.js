// 图片下载和处理工具函数

import axios from 'axios';
import * as FileSystem from 'expo-file-system';

/**
 * 使用 axios 下载图片并转换为 Base64
 * @param {string} imageUrl - 图片URL
 * @param {object} options - 配置选项
 * @returns {Promise<string>} Base64 Data URI
 */
export const getImageAsBase64 = async (imageUrl, options = {}) => {
  const {
    headers = {},
    timeout = 30000,
    maxSize = 10 * 1024 * 1024 // 10MB 限制
  } = options;

  try {
    console.log('开始获取图片Base64:', imageUrl);
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/*',
        ...headers
      },
      timeout,
      maxContentLength: maxSize,
      maxBodyLength: maxSize
    });

    // 检查响应大小
    if (response.data.byteLength > maxSize) {
      throw new Error(`图片太大: ${response.data.byteLength} bytes`);
    }

    // 转换为 Base64
    const base64 = btoa(
      new Uint8Array(response.data)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // 获取 MIME 类型
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    return `data:${contentType};base64,${base64}`;
    
  } catch (error) {
    console.error('获取图片Base64失败:', error);
    throw new Error(`图片获取失败: ${error.message}`);
  }
};

/**
 * 下载图片到本地缓存
 * @param {string} imageUrl - 图片URL
 * @param {object} options - 配置选项
 * @returns {Promise<string>} 本地文件路径
 */
export const downloadImageToCache = async (imageUrl, options = {}) => {
  const {
    fileName = null,
    headers = {},
    useCache = true
  } = options;

  try {
    // 生成文件名
    const finalFileName = fileName || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const localUri = FileSystem.cacheDirectory + finalFileName;

    // 检查缓存
    if (useCache) {
      const cacheInfo = await FileSystem.getInfoAsync(localUri);
      if (cacheInfo.exists) {
        console.log('使用缓存图片:', localUri);
        return localUri;
      }
    }

    console.log('开始下载图片到缓存:', imageUrl);
    
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

    console.log('图片下载成功:', downloadResult.uri);
    return downloadResult.uri;
    
  } catch (error) {
    console.error('下载图片失败:', error);
    throw new Error(`图片下载失败: ${error.message}`);
  }
};

/**
 * 从本地文件读取为 Base64
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<string>} Base64 Data URI
 */
export const fileToBase64 = async (filePath) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64
    });

    // 根据文件扩展名确定 MIME 类型
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
      case 'svg':
        mimeType = 'image/svg+xml';
        break;
      default:
        mimeType = 'image/jpeg';
    }

    return `data:${mimeType};base64,${base64}`;
    
  } catch (error) {
    console.error('文件转Base64失败:', error);
    throw new Error(`文件读取失败: ${error.message}`);
  }
};

/**
 * 带认证的图片下载
 * @param {string} imageUrl - 图片URL
 * @param {object} auth - 认证信息
 * @param {object} options - 其他选项
 * @returns {Promise<string>} Base64 Data URI 或本地文件路径
 */
export const downloadAuthImage = async (imageUrl, auth = {}, options = {}) => {
  const { type = 'basic', username, password, token } = auth;
  const { returnType = 'base64' } = options;

  let headers = {};
  
  if (type === 'basic' && username && password) {
    headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);
  } else if (type === 'bearer' && token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const downloadOptions = { ...options, headers };

  if (returnType === 'file') {
    return await downloadImageToCache(imageUrl, downloadOptions);
  } else {
    return await getImageAsBase64(imageUrl, downloadOptions);
  }
};

/**
 * 清理图片缓存
 * @param {string|Array<string>} filePaths - 文件路径或路径数组
 */
export const clearImageCache = async (filePaths) => {
  try {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    
    for (const filePath of paths) {
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
 * 获取图片信息
 * @param {string} imageUrl - 图片URL
 * @param {object} headers - 请求头
 * @returns {Promise<object>} 图片信息
 */
export const getImageInfo = async (imageUrl, headers = {}) => {
  try {
    const response = await axios.head(imageUrl, {
      headers: {
        'Accept': 'image/*',
        ...headers
      },
      timeout: 10000
    });

    return {
      contentType: response.headers['content-type'],
      contentLength: parseInt(response.headers['content-length']) || 0,
      lastModified: response.headers['last-modified'],
      etag: response.headers['etag']
    };
  } catch (error) {
    console.error('获取图片信息失败:', error);
    throw new Error(`获取图片信息失败: ${error.message}`);
  }
};

/**
 * 验证是否为图片URL
 * @param {string} url - URL
 * @returns {boolean} 是否为图片
 */
export const isImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // 检查文件扩展名
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  if (imageExtensions.test(url)) return true;
  
  // 检查是否为 data URI
  if (url.startsWith('data:image/')) return true;
  
  return false;
};

/**
 * 压缩 Base64 图片（简单的质量压缩）
 * @param {string} base64DataUri - Base64 Data URI
 * @param {number} quality - 质量 (0-1)
 * @returns {Promise<string>} 压缩后的 Base64 Data URI
 */
export const compressBase64Image = async (base64DataUri, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    try {
      // 创建 Image 对象
      const img = new Image();
      
      img.onload = () => {
        // 创建 Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置 Canvas 尺寸
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 压缩并输出
        const compressedDataUri = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUri);
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      img.src = base64DataUri;
      
    } catch (error) {
      reject(error);
    }
  });
};

// 导出所有函数
export default {
  getImageAsBase64,
  downloadImageToCache,
  fileToBase64,
  downloadAuthImage,
  clearImageCache,
  getImageInfo,
  isImageUrl,
  compressBase64Image
};