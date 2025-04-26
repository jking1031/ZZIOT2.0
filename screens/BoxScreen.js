import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

function BoxScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();

  const menuItems = [
    {
      id: 'boxAnalysis',
      title: "碳源计算器",
      icon: 'calculator',
      description: '计算碳源投加量',
      onPress: () => navigation.navigate('碳源计算')
    },
    {
      id: 'fileAnalysis',
      title: "文件上传",
      icon: 'cloud-upload',
      description: '上传文件',
      onPress: () => navigation.navigate('文件上传')
    },

    {
      id: 'sludgeDehydration',
      title: "污泥脱水计算器",
      icon: 'calculator',
      description: '计算污泥脱水',
      onPress: () => navigation.navigate('污泥脱水计算器')
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
        {menuItems.map(renderMenuItem)}
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
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginLeft: 4,
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

export default BoxScreen;