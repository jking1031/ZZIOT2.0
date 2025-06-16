import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { PageGuard } from '../components/PermissionControlComponents';
import { PAGE_PERMISSIONS } from '../config/pagePermissions';
import { PERMISSION_LEVELS } from '../services/PermissionInitService';

const DataEntryCenter = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const entryCards = [
    {
      title: '化验数据填报',
      icon: 'flask',
      route: '化验数据中心',
      description: '填报化验数据',
    },
    {
      title: '生产运行填报',
      icon: 'cog',
      route: '运行填报',
      description: '填报生产运行数据'
    },
    {
      title: 'AO池数据填报',
      icon: 'water',
      route: 'AO池数据填报',
      description: '填报AO池相关数据'
    }
  ];

  return (
    <PageGuard 
      routePath="/data-entry-center" 
      requiredLevel={PERMISSION_LEVELS.WRITE}
    >
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.cardsContainer}>
          {entryCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate(card.route)}
            >
              <View style={styles.cardContent}>
                <Ionicons name={card.icon} size={40} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
                <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                  {card.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </PageGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 16,
  },
  cardContent: {
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DataEntryCenter;