import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { createCommonStyles, DesignTokens } from '../styles/StyleGuide';
import { Ionicons } from '@expo/vector-icons';

function DataCenterScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  const styles = createStyles(colors, isDarkMode);

  const menuItems = [
    {
      id: 'dataAnalysis',
      title: '数据查询中心',
      icon: 'analytics',
      description: '数据查询与分析工具集',
      onPress: () => navigation.navigate('数据查询中心')
    },
    {
      id: 'operationReport',
      title: '数据填报中心',
      icon: 'create',
      description: '生产运行数据填报中心',
      onPress: () => navigation.navigate('数据填报中心')
    },

  ];

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={item.onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={item.icon}
          size={32}
          color={colors.primary}
          style={styles.icon}
        />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >

      <View style={styles.cardGrid}>
        {menuItems.map(renderMenuItem)}
      </View>
    </ScrollView>
  );
}

// 创建样式函数，使用设计令牌
const createStyles = (colors, isDarkMode) => {
  const { spacing, typography, borderRadius, shadows } = DesignTokens;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: spacing.lg,
    },
    pageTitle: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: colors.text,
      marginBottom: spacing.xl,
      marginLeft: spacing.xs,
    },
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    card: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.md,
      alignItems: 'center',
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    cardTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    cardDescription: {
      fontSize: typography.sizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: typography.lineHeights.relaxed,
    },
  });
};

export default DataCenterScreen;