import { StyleSheet, Platform, StatusBar } from 'react-native';

/**
 * 设计令牌 - 统一的设计系统
 */
export const DesignTokens = {
  // 间距系统
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // 字体系统
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      display: 32,
    },
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },
  
  // 圆角系统
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },
  
  // 阴影系统
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  
  // 动画时长
  animations: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

/**
 * 创建通用样式
 * @param {Object} colors - 主题颜色对象
 * @param {boolean} isDarkMode - 是否为深色模式
 * @returns {Object} 通用样式对象
 */
export const createCommonStyles = (colors, isDarkMode) => {
  const { spacing, typography, borderRadius, shadows } = DesignTokens;
  
  return StyleSheet.create({
    // 容器样式
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    safeContainer: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    
    // 头部样式
    androidHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      height: 56,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      ...shadows.md,
      zIndex: 10,
    },
    
    modernHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.primary,
      height: 60,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      ...shadows.lg,
      zIndex: 10,
    },
    
    backButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.headerText || colors.text,
    },
    
    headerRight: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.full,
    },
    
    // 滚动视图
    scrollView: {
      flex: 1,
    },
    
    contentContainer: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    
    // 卡片样式
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.md,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    
    modernCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.lg,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    
    // 文本样式
    sectionTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semibold,
      color: colors.text,
      marginBottom: spacing.md,
      lineHeight: typography.sizes.lg * typography.lineHeights.tight,
    },
    
    title: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: colors.text,
      marginBottom: spacing.lg,
      lineHeight: typography.sizes.xxl * typography.lineHeights.tight,
    },
    
    subtitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      lineHeight: typography.sizes.md * typography.lineHeights.normal,
    },
    
    body: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.regular,
      color: colors.text,
      lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    },
    
    caption: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.regular,
      color: colors.textSecondary,
      lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    },
    
    // 输入框样式
    input: {
      backgroundColor: colors.inputBackground || (isDarkMode ? colors.surface : colors.background),
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.text,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
    },
    
    modernInput: {
      backgroundColor: colors.inputBackground || (isDarkMode ? colors.surface : colors.background),
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      fontSize: typography.sizes.md,
      color: colors.text,
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: colors.border,
      minHeight: 52,
    },
    
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    
    // 按钮样式
    button: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.sm,
      minHeight: 48,
      ...shadows.sm,
    },
    
    modernButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.sm,
      minHeight: 52,
      ...shadows.md,
    },
    
    buttonText: {
      color: colors.onPrimary || '#FFFFFF',
      fontWeight: typography.weights.semibold,
      fontSize: typography.sizes.md,
    },
    
    secondaryButton: {
      backgroundColor: colors.surface || (isDarkMode ? colors.card : colors.background),
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.sm,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
    },
    
    secondaryButtonText: {
      color: colors.text,
      fontWeight: typography.weights.semibold,
      fontSize: typography.sizes.md,
    },
    
    // 状态样式
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    
    loadingText: {
      marginTop: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.text,
      textAlign: 'center',
    },
    
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    
    emptyText: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
      textAlign: 'center',
      lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    },
    
    errorText: {
      color: colors.error || '#F44336',
      fontSize: typography.sizes.sm,
      marginBottom: spacing.sm,
      fontWeight: typography.weights.medium,
    },
    
    successText: {
      color: colors.success || '#4CAF50',
      fontSize: typography.sizes.sm,
      marginBottom: spacing.sm,
      fontWeight: typography.weights.medium,
    },
    
    warningText: {
      color: colors.warning || '#FF9800',
      fontSize: typography.sizes.sm,
      marginBottom: spacing.sm,
      fontWeight: typography.weights.medium,
    },
    
    // 布局样式
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    
    column: {
      flexDirection: 'column',
    },
    
    spaceBetween: {
      justifyContent: 'space-between',
    },
    
    spaceAround: {
      justifyContent: 'space-around',
    },
    
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    // 表单样式
    label: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    
    requiredLabel: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    
    requiredStar: {
      color: colors.error || '#F44336',
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    
    picker: {
      backgroundColor: colors.inputBackground || (isDarkMode ? colors.surface : colors.background),
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
    },
    
    modernPicker: {
      backgroundColor: colors.inputBackground || (isDarkMode ? colors.surface : colors.background),
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      color: colors.text,
      borderWidth: 2,
      borderColor: colors.border,
      minHeight: 52,
    },
    
    pickerItem: {
      height: 120,
    },
    
    // 分隔线
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    
    thickDivider: {
      height: 2,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    
    // 徽章和标签
    badge: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      alignSelf: 'flex-start',
    },
    
    badgeText: {
      color: colors.onPrimary || '#FFFFFF',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
    },
    
    tag: {
      backgroundColor: colors.surface || (isDarkMode ? colors.card : colors.background),
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    
    tagText: {
      color: colors.text,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    
    // 图标容器
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface || (isDarkMode ? colors.card : colors.background),
    },
    
    largeIconContainer: {
      width: 64,
      height: 64,
      borderRadius: borderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface || (isDarkMode ? colors.card : colors.background),
    },
    
    // 列表项
    listItem: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      ...shadows.sm,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    
    modernListItem: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      ...shadows.md,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    
    // 模态框
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      ...shadows.xl,
    },
    
    modalTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    
    // 浮动操作按钮
    fab: {
      position: 'absolute',
      bottom: spacing.xl,
      right: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
    
    // 进度条
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: borderRadius.sm,
      overflow: 'hidden',
    },
    
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.sm,
    },
  });
};

/**
 * 现代化主题颜色系统
 */
export const lightThemeColors = {
  // 主色调
  primary: '#FF6700',
  primaryLight: '#FF8533',
  primaryDark: '#CC5200',
  onPrimary: '#FFFFFF',
  
  // 次要色调
  secondary: '#2196F3',
  secondaryLight: '#64B5F6',
  secondaryDark: '#1976D2',
  onSecondary: '#FFFFFF',
  
  // 背景色
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // 文本色
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  onSurface: '#1A1A1A',
  
  // 边框和分隔线
  border: '#E9ECEF',
  divider: '#DEE2E6',
  
  // 输入框
  inputBackground: '#F8F9FA',
  inputBorder: '#CED4DA',
  inputFocused: '#80BDFF',
  
  // 状态色
  success: '#28A745',
  successLight: '#D4EDDA',
  warning: '#FFC107',
  warningLight: '#FFF3CD',
  error: '#DC3545',
  errorLight: '#F8D7DA',
  info: '#17A2B8',
  infoLight: '#D1ECF1',
  
  // 头部
  headerBackground: '#FF6700',
  headerText: '#FFFFFF',
  
  // 标签栏
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#FF6700',
  tabBarInactive: '#6C757D',
  
  // 阴影
  shadowColor: '#000000',
  
  // 覆盖层
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const darkThemeColors = {
  // 主色调
  primary: '#FF7A33',
  primaryLight: '#FF9966',
  primaryDark: '#E55A00',
  onPrimary: '#000000',
  
  // 次要色调
  secondary: '#64B5F6',
  secondaryLight: '#90CAF9',
  secondaryDark: '#42A5F5',
  onSecondary: '#000000',
  
  // 背景色
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2A2A2A',
  
  // 文本色
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  onSurface: '#FFFFFF',
  
  // 边框和分隔线
  border: '#404040',
  divider: '#333333',
  
  // 输入框
  inputBackground: '#2A2A2A',
  inputBorder: '#404040',
  inputFocused: '#FF7A33',
  
  // 状态色
  success: '#4CAF50',
  successLight: '#2E7D32',
  warning: '#FF9800',
  warningLight: '#F57C00',
  error: '#F44336',
  errorLight: '#D32F2F',
  info: '#2196F3',
  infoLight: '#1976D2',
  
  // 头部
  headerBackground: '#FF7A33',
  headerText: '#000000',
  
  // 标签栏
  tabBarBackground: '#1E1E1E',
  tabBarActive: '#FF7A33',
  tabBarInactive: '#808080',
  
  // 阴影
  shadowColor: '#000000',
  
  // 覆盖层
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

/**
 * 获取主题颜色
 * @param {boolean} isDarkMode - 是否为深色模式
 * @returns {Object} 主题颜色对象
 */
export const getThemeColors = (isDarkMode) => {
  return isDarkMode ? darkThemeColors : lightThemeColors;
};

/**
 * 颜色工具函数
 */
export const ColorUtils = {
  /**
   * 添加透明度
   * @param {string} color - 颜色值
   * @param {number} opacity - 透明度 (0-1)
   * @returns {string} 带透明度的颜色
   */
  withOpacity: (color, opacity) => {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
      return `#${hex}${alpha}`;
    }
    return color;
  },
  
  /**
   * 获取状态颜色
   * @param {string} status - 状态类型
   * @param {Object} colors - 颜色对象
   * @returns {string} 状态颜色
   */
  getStatusColor: (status, colors) => {
    const statusMap = {
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      info: colors.info,
      online: colors.success,
      offline: colors.error,
      normal: colors.success,
      alarm: colors.error,
      // 工单状态颜色已删除
    };
    return statusMap[status] || colors.textSecondary;
  },
};