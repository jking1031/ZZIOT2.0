import React, { useState, useEffect } from 'react';
import { Alert, Platform, StatusBar, SafeAreaView, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import SiteListScreen from './screens/SiteListScreen';
import SiteDetailScreen from './screens/SiteDetailScreen';
import DataCenterScreen from './screens/DataCenterScreen';
import DataQueryScreen from './screens/DataQueryScreen';
import ReportScreen from './screens/ReportScreen';
import ReportFormScreen from './screens/ReportFormScreen';
import LabDataEntryScreen from './screens/LabDataEntryScreen';
import DataQueryCenterScreen from './screens/DataQueryCenterScreen';
import DataEntryCenter from './screens/DataEntryCenter';
import ReportQueryScreen from './screens/ReportQueryScreen';
import AODataEntryScreen from './screens/AODataEntryScreen';
import AODataQueryScreen from './screens/AODataQueryScreen';
import HistoryDataQueryScreen from './screens/HistoryDataQueryScreen';
import CarbonCalcScreen from './screens/CarbonCalcScreen';
import BoxScreen from './screens/BoxScreen';
import MessageQueryScreen from './screens/MessageQueryScreen';
import ReportForm5000Screen from './screens/ReportForm5000Screen';
import FileUploadTestScreen from './screens/FileUploadTestScreen';
import UserManagementScreen from './screens/UserManagementScreen';
// 导入工单相关页面
import TicketListScreen from './screens/TicketListScreen';
import TicketDetailScreen from './screens/TicketDetailScreen';
import CreateTicketScreen from './screens/CreateTicketScreen';
import LabDataScreen from './screens/LabDataScreen';
import SludgeDataEntryScreen from './screens/SludgeDataEntryScreen';
// 导入推送相关功能
import { registerForPushNotificationsAsync } from './utils/notifications';
import { initJPush, registerJPushDevice } from './utils/jpushNotifications';

// 添加错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新状态，以便下一次渲染显示备用 UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('App Error:', error);
    console.error('Error Info:', errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // 显示备用 UI
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            应用程序出错了
          </Text>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>
            {this.state.error && this.state.error.toString()}
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            请尝试重新启动应用
          </Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // 检查更新
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        console.log('检查应用更新...');
        const update = await Updates.checkForUpdateAsync();
        console.log('更新检查结果:', update);
        
        if (update.isAvailable) {
          console.log('发现更新，开始下载...');
          await Updates.fetchUpdateAsync();
          Alert.alert(
            '更新就绪',
            '新版本已下载完成，是否立即重启应用以应用更新？',
            [
              {
                text: '稍后',
                style: 'cancel'
              },
              {
                text: '立即更新',
                onPress: async () => {
                  await Updates.reloadAsync();
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('更新检查错误:', error);
      }
    };
    
    checkForUpdates();
  }, []);

  // 初始化推送功能
  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        // 初始化极光推送
        if (Platform.OS === 'android') {
          const initResult = initJPush();
          console.log('初始化极光推送结果:', initResult);
        }
        
        // 请求通知权限并注册设备
        const token = await registerForPushNotificationsAsync();
        console.log('Expo推送令牌:', token);
        
        // 如果有登录信息，注册极光推送设备
        const userId = await AsyncStorage.getItem('userId');
        if (userId && Platform.OS === 'android') {
          const registrationId = await registerJPushDevice(userId);
          console.log('极光推送注册ID:', registrationId);
        }
      } catch (error) {
        console.error('初始化推送功能失败:', error);
      }
    };
    
    setupPushNotifications();
  }, []);

  // 设置全局状态栏配置
  useEffect(() => {
    // 使用StatusBar组件的静态方法设置状态栏
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('rgba(33, 150, 243, 0.8)');
      StatusBar.setTranslucent(true); // 设置为透明，使得内容可以延伸到状态栏下方
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {/* 添加全局StatusBar组件 */}
          <StatusBar 
            barStyle="light-content"
            backgroundColor="rgba(33, 150, 243, 0.8)"
            translucent={Platform.OS === 'android'} // 安卓设置为透明状态栏
          />
          <AppContent showSplash={showSplash} onSplashFinish={handleSplashFinish} />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent({ showSplash, onSplashFinish }) {

  return (
    <NavigationContainer>
      {showSplash ? (
        <SplashScreen onFinish={onSplashFinish} />
      ) : (
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            headerStyle: {
              backgroundColor: 'rgba(33, 150, 243, 0.8)',
              height: Platform.OS === 'ios' ? 65 : 60,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0
            },
            headerTitleAlign: 'center',
            headerBackground: () => (
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(33, 150, 243, 0.8)'
              }} />
            ),
            headerTitleContainerStyle: {
              paddingTop: 0,
              paddingBottom: 0,
              left: Platform.OS === 'android' ? undefined : undefined,
            },
            headerStatusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight : undefined,
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18
            },
            contentStyle: undefined
          }}
        >

          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ 
              title: '正泽物联系统平台',
              headerShown: Platform.OS === 'android',
              headerLeft: null,
              contentStyle: undefined
            }}
          />
          <Stack.Screen
            name="站点列表"
            component={SiteListScreen}
            options={{ 
              title: '站点列表',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="站点详情"
            component={SiteDetailScreen}
            options={{ 
              title: '站点详情',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="数据中心"
            component={DataCenterScreen}
            options={{ 
              title: '数据中心',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="历史数据查询"
            component={DataQueryScreen}
            options={{ 
              title: '历史数据查询',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="碳源计算"
            component={CarbonCalcScreen}
            options={{ 
              title: '碳源投加量计算',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="工具箱"
            component={BoxScreen}
            options={{
              title: '工具箱',
              headerShown: true
            }}
          />

          <Stack.Screen
            name="运行填报"
            component={ReportScreen}
            options={{ 
              title: '运行填报',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="5000吨处理厂日报"
            component={ReportForm5000Screen}
            options={{
              title: '5000吨处理厂日报',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="ReportForm"
            component={ReportFormScreen}
            options={{ 
              title: '填写报告',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="化验数据中心"
            component={LabDataScreen}
            options={{ 
              title: '化验数据中心',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="化验数据"
            component={LabDataEntryScreen}
            options={{ 
              title: '化验数据填写',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="污泥化验数据填报"
            component={SludgeDataEntryScreen}
            options={{
              title: '污泥化验数据填报',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="AO池数据填报"
            component={AODataEntryScreen}
            options={{
              title: 'AO池数据填报',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="数据查询中心"
            component={DataQueryCenterScreen}
            options={{
              title: '数据查询中心',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="数据填报中心"
            component={DataEntryCenter}
            options={{
              title: '数据填报中心',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="报告查询"
            component={ReportQueryScreen}
            options={{
              title: '报告查询',
              headerShown: true
            }}
          />

          <Stack.Screen
            name="AO池数据查询"
            component={AODataQueryScreen}
            options={{
              title: 'AO池数据查询',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="数据查询"
            component={HistoryDataQueryScreen}
            options={{
              title: '数据查询',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="消息查询"
            component={MessageQueryScreen}
            options={{
              title: '消息查询',
              headerShown: true
            }}
          />
          
          {/* 工单系统相关屏幕 */}
          <Stack.Screen
            name="工单列表"
            component={TicketListScreen}
            options={{
              title: '工单管理',
              headerShown: true
            }}
          />
          
          <Stack.Screen
            name="工单详情"
            component={TicketDetailScreen}
            options={{
              title: '工单详情',
              headerShown: true
            }}
          />
          
          <Stack.Screen
            name="创建工单"
            component={CreateTicketScreen}
            options={{
              title: '创建工单',
              headerShown: true
            }}
          />

          <Stack.Screen
            name="文件上传"
            component={FileUploadTestScreen}
            options={{
              title: '文件上传',
              headerShown: true
            }}
          />
          <Stack.Screen
            name="UserManagementScreen"
            component={UserManagementScreen}
            options={{
              title: '用户管理',
              headerShown: true
            }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
