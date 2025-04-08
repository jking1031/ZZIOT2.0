import React from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, ScrollView, 
  Platform, StatusBar, Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createCommonStyles } from '../styles/StyleGuide';
import { EventRegister } from '../utils/EventEmitter';
import { getAuthToken, refreshToken } from '../api/storage';

const WorkOrderEntryScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const commonStyles = createCommonStyles(colors, isDarkMode);
  
  // 检查是否是管理员
  const isAdmin = user && (user.is_admin === 1 || user.is_admin === 2);
  
  // 入口菜单项
  const menuItems = [
    {
      id: 'myTickets',
      title: '我的工单',
      icon: 'document-text',
      description: '查看我创建和处理的工单',
      onPress: () => navigation.navigate('TicketNavigator', { screen: 'TicketListScreen' }),
    },
    {
      id: 'createTicket',
      title: '创建工单',
      icon: 'add-circle',
      description: '报告问题或提交新需求',
      onPress: () => navigation.navigate('TicketNavigator', { screen: 'CreateTicketScreen' }),
    },
    // 仅管理员可见的入口
    ...(isAdmin ? [
      {
        id: 'manageTickets',
        title: '工单管理',
        icon: 'settings',
        description: '审核、分配和跟踪工单',
        onPress: () => navigation.navigate('TicketNavigator', { screen: 'TicketManagementScreen' }),
      }
    ] : []),
  ];
  
  // 标题栏组件 - 安卓平台使用
  const AndroidHeader = () => (
    <View style={commonStyles.androidHeader}>
      <TouchableOpacity 
        style={commonStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={commonStyles.headerTitle}>工单系统</Text>
      <View style={{ width: 40 }} />
    </View>
  );
  
  // 设置状态栏颜色
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
    }
  }, [isDarkMode]);
  
  // 设置导航标题
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        title: '工单系统',
        headerTintColor: colors.text,
        headerStyle: {
          backgroundColor: colors.card,
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 0,
        },
      });
    }
  }, [navigation, colors]);
  
  // 检查会话有效性
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          notifySessionExpired();
          return;
        }
        
        // 解析令牌并检查是否过期
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            // 增强的Base64解码函数，处理可能包含非ASCII字符的令牌
            const base64Decode = (str) => {
              try {
                return atob(str);
              } catch (e) {
                try {
                  // 处理可能的URL安全base64编码
                  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                  return atob(base64);
                } catch (error) {
                  console.error('解码令牌失败:', error);
                  return null;
                }
              }
            };
            
            // 解析载荷
            const decoded = base64Decode(parts[1]);
            if (!decoded) {
              notifySessionExpired();
              return;
            }
            
            const payload = JSON.parse(decoded);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
              console.log('令牌已过期，尝试刷新');
              
              // 尝试刷新令牌
              const refreshSuccessful = await refreshToken();
              if (!refreshSuccessful) {
                notifySessionExpired();
              }
            }
          } else {
            // 令牌格式不正确
            notifySessionExpired();
          }
        } catch (parseError) {
          console.error('解析令牌失败:', parseError);
          notifySessionExpired();
        }
      } catch (error) {
        console.error('会话检查失败:', error);
        notifySessionExpired();
      }
    };
    
    // 通知会话过期并显示提示
    const notifySessionExpired = () => {
      // 触发HomeScreen中的登录弹窗
      EventRegister.emit('SESSION_EXPIRED');
      Alert.alert(
        '会话已过期',
        '请重新登录以继续',
        [
          {
            text: '确定',
            onPress: () => {}  // 用户点击确定按钮后不做额外操作
          }
        ]
      );
    };
    
    // 启动时检查会话
    checkSession();
  }, []);
  
  return (
    <View style={commonStyles.container}>
      {Platform.OS === 'android' && <AndroidHeader />}
      
      <ScrollView 
        style={commonStyles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* 页面介绍 */}
        <View style={[styles.bannerContainer, { backgroundColor: colors.card }]}>
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>
              工单管理系统
            </Text>
            <Text style={[styles.bannerDescription, { color: colors.textSecondary }]}>
              高效报告问题、提交需求，跟踪处理进度
            </Text>
          </View>
          <View style={styles.bannerImageContainer}>
            <Image 
              source={require('../assets/images/ticket-banner.png')} 
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>
        </View>
        
        {/* 菜单选项 */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={item.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.id) }]}>
                <Ionicons name={item.icon} size={28} color="#ffffff" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
        
        {/* 工单系统介绍 */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            关于工单系统
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            工单系统能够帮助您快速报告设备故障、工艺问题或提交其他需求。提交的工单将由管理员进行审核，并分配给相关角色处理。您可以随时跟踪工单的处理进度，并与处理人员进行互动。
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="flash-outline" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>快速</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>响应</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="git-branch-outline" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>高效</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>分配</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="analytics-outline" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>全程</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>跟踪</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// 获取菜单项图标颜色
const getIconColor = (id) => {
  switch (id) {
    case 'myTickets':
      return '#4CAF50'; // 绿色
    case 'createTicket':
      return '#2196F3'; // 蓝色
    case 'manageTickets':
      return '#9C27B0'; // 紫色
    default:
      return '#FF6700'; // 默认橙色
  }
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  bannerContainer: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bannerDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  bannerImageContainer: {
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: 100,
    height: 100,
  },
  menuContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
});

export default WorkOrderEntryScreen; 