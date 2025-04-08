import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

function DataQueryCenterScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();

  const queryMenuItems = [
    {
      id: 'historyDataTraining',
      title: '历史数据查询',
      icon: 'time',
      description: '历史数据分析与查询',
      onPress: () => navigation.navigate('数据查询')
    },
    {
      id: 'reportQuery',
      title: '报告查询',
      icon: 'document-text',
      description: '查看和导出报告记录',
      onPress: () => navigation.navigate('报告查询')
    },
    {
      id: 'aoPoolQuery',
      title: 'AO池数据查询',
      icon: 'water',
      description: 'AO池运行数据查询',
      onPress: () => navigation.navigate('AO池数据查询')
    },
    {
      id: 'messageQuery',
      title: '消息查询',
      icon: 'notifications',
      description: '查询历史消息记录',
      onPress: () => navigation.navigate('消息查询')
    }
  ];

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.card, { backgroundColor: colors.card }]}
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
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.cardDescription, { color: colors.text }]}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.cardGrid}>
        {queryMenuItems.map(renderMenuItem)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default DataQueryCenterScreen;