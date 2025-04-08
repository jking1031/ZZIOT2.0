import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_KEYS } from './config';

/**
 * 保存数据到AsyncStorage
 * @param {string} key 存储键名
 * @param {any} value 存储的值
 * @returns {Promise<void>}
 */
export const storeData = async (key, value) => {
  try {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error('Storage error saving data:', error);
    return false;
  }
};

/**
 * 从AsyncStorage获取数据
 * @param {string} key 存储键名
 * @returns {Promise<any>} 存储的值
 */
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? 
      (key === CACHE_KEYS.TOKEN ? jsonValue : JSON.parse(jsonValue)) : 
      null;
  } catch (error) {
    console.error('Storage error retrieving data:', error);
    return null;
  }
};

/**
 * 从AsyncStorage中移除数据
 * @param {string} key 存储键名
 * @returns {Promise<boolean>} 操作是否成功
 */
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Storage error removing data:', error);
    return false;
  }
};

/**
 * 保存认证Token
 * @param {string} token 认证Token
 * @returns {Promise<boolean>} 操作是否成功
 */
export const saveAuthToken = (token) => {
  return storeData(CACHE_KEYS.TOKEN, token);
};

/**
 * 获取认证Token
 * @returns {Promise<string|null>} 认证Token
 */
export const getAuthToken = () => {
  return getData(CACHE_KEYS.TOKEN);
};

/**
 * 清除认证Token
 * @returns {Promise<boolean>} 操作是否成功
 */
export const clearAuthToken = () => {
  return removeData(CACHE_KEYS.TOKEN);
};

/**
 * 保存用户信息
 * @param {Object} userInfo 用户信息对象
 * @returns {Promise<boolean>} 操作是否成功
 */
export const saveUserInfo = (userInfo) => {
  return storeData(CACHE_KEYS.USER_INFO, userInfo);
};

/**
 * 获取用户信息
 * @returns {Promise<Object|null>} 用户信息对象
 */
export const getUserInfo = () => {
  return getData(CACHE_KEYS.USER_INFO);
};

/**
 * 清除用户信息
 * @returns {Promise<boolean>} 操作是否成功
 */
export const clearUserInfo = () => {
  return removeData(CACHE_KEYS.USER_INFO);
}; 