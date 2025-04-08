import { StyleSheet, Platform, StatusBar } from 'react-native';

/**
 * 创建通用样式
 * @param {Object} colors - 主题颜色对象
 * @param {boolean} isDarkMode - 是否为深色模式
 * @returns {Object} 通用样式对象
 */
export const createCommonStyles = (colors, isDarkMode) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#F5F5F7',
    },
    androidHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      height: 56,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1.5,
      elevation: 3,
      zIndex: 10,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerRight: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    input: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F0F0F0',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    button: {
      backgroundColor: '#FF6700',
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
    },
    buttonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
    secondaryButton: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#E0E0E0',
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.text,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 20,
      textAlign: 'center',
    },
    errorText: {
      color: '#F44336',
      fontSize: 14,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    picker: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F0F0F0',
      borderRadius: 8,
      marginBottom: 16,
      color: colors.text,
    },
    pickerItem: {
      height: 120,
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      marginVertical: 16,
    }
  });
};

/**
 * 主题颜色
 */
export const lightThemeColors = {
  primary: '#FF6700',
  background: '#F5F5F7',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

export const darkThemeColors = {
  primary: '#FF6700',
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#BBBBBB',
  border: '#333333',
}; 