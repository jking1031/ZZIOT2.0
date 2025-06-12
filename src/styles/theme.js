import { lightThemeColors, darkThemeColors, getThemeColors, ColorUtils } from '../../styles/StyleGuide';

/**
 * 主题配置
 * 使用 StyleGuide 中的颜色系统
 */
export const lightTheme = {
  ...lightThemeColors,
  // 兼容性别名
  primaryColor: lightThemeColors.primary,
  backgroundColor: lightThemeColors.background,
  cardColor: lightThemeColors.card,
  textColor: lightThemeColors.text,
  secondaryTextColor: lightThemeColors.textSecondary,
  borderColor: lightThemeColors.border,
  successColor: lightThemeColors.success,
  warningColor: lightThemeColors.warning,
  errorColor: lightThemeColors.error,
  infoColor: lightThemeColors.info,
};

export const darkTheme = {
  ...darkThemeColors,
  // 兼容性别名
  primaryColor: darkThemeColors.primary,
  backgroundColor: darkThemeColors.background,
  cardColor: darkThemeColors.card,
  textColor: darkThemeColors.text,
  secondaryTextColor: darkThemeColors.textSecondary,
  borderColor: darkThemeColors.border,
  successColor: darkThemeColors.success,
  warningColor: darkThemeColors.warning,
  errorColor: darkThemeColors.error,
  infoColor: darkThemeColors.info,
};

/**
 * 主题工具函数
 */
export const ThemeUtils = {
  /**
   * 获取当前主题
   * @param {boolean} isDarkMode - 是否为深色模式
   * @returns {Object} 主题对象
   */
  getCurrentTheme: (isDarkMode) => {
    return isDarkMode ? darkTheme : lightTheme;
  },
  
  /**
   * 获取主题颜色
   * @param {boolean} isDarkMode - 是否为深色模式
   * @returns {Object} 颜色对象
   */
  getColors: getThemeColors,
  
  /**
   * 颜色工具
   */
  ColorUtils,
};

// 导出颜色工具以便在其他地方使用
export { getThemeColors, ColorUtils };

// 默认导出
export default {
  lightTheme,
  darkTheme,
  ThemeUtils,
};