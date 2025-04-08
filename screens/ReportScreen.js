import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const ReportScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const reportCards = [
    {
      id: 'gtrb',
      title: '高铁污水厂日报',
      description: '记录高铁污水厂的日常运行数据，包括进出水情况、设备运行、药剂投加等信息',
      icon: 'document-text',
      type: 'daily'
    },
    {
      id: '5000rb',
      title: '5000吨处理厂日报',
      description: '记录5000吨处理厂的运行数据，监测处理效率和设备状态',
      icon: 'document-text',
      type: 'daily'
    },
    {
      id: 'qtrb',
      title: '泵站运行周报',
      description: '记录其他污水处理设施的运行情况和维护信息',
      icon: 'document-text',
      type: 'daily'
    },
  ];

  const handleReportPress = (report) => {
    // 根据报告类型导航到相应的填报页面
    if (report.id === '5000rb') {
      navigation.navigate('5000吨处理厂日报', {
        reportId: report.id,
        title: report.title,
        type: report.type
      });
    } else {
      navigation.navigate('ReportForm', {
        reportId: report.id,
        title: report.title,
        type: report.type
      });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>


      <View style={styles.cardContainer}>
        {reportCards.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => handleReportPress(report)}
          >
            <Ionicons name={report.icon} size={40} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{report.title}</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              {report.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cardContainer: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ReportScreen;