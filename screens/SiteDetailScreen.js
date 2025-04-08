import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Modal, TextInput, TouchableOpacity, AppState } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

function SiteDetailScreen({ route, navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { siteId, siteName } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [inData, setInData] = useState([]);
  const [outData, setOutData] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceFrequency, setDeviceFrequency] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newFrequency, setNewFrequency] = useState('');
  const [isValve, setIsValve] = useState([]);
  const [updateTimer, setUpdateTimer] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  // 使用 useRef 来存储当前的 appState，避免触发重渲染
  const currentAppState = useRef(AppState.currentState);
  const timerRef = useRef(null);

  // 统一的 API 调用函数
  const controllerRef = useRef(null);

  const fetchSiteDetail = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      console.log('开始获取站点详情数据...');
      const response = await axios.get(`https://nodered.jzz77.cn:9003/api/sites/site/${siteId}`, {
        signal: controller.signal,
        timeout: 10000
      });

      if (response.data) {
        const data = response.data;
        if (data.indata) setInData(data.indata);
        if (data.outdata) setOutData(data.outdata);
        if (data.devices) setDevices(data.devices);
        if (data.deviceFrequency) setDeviceFrequency(data.deviceFrequency);
        if (data.isValve) setIsValve(data.isValve);
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('请求被取消');
      } else {
        console.error('获取站点数据失败:', error);
      }
    }
  }, [siteId]);

  const startDataFetching = useCallback(() => {
    // 避免重复调用
    if (!timerRef.current) {
      fetchSiteDetail();
      timerRef.current = setInterval(() => fetchSiteDetail(), 30000);
      setUpdateTimer(timerRef.current);
    }
  }, [fetchSiteDetail]);

  const stopDataFetching = useCallback(() => {
    // 清除定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setUpdateTimer(null);
    }
    
    // 取消正在进行的请求
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  // 统一处理组件挂载、页面焦点变化和应用状态变化
  useEffect(() => {
    // 设置页面标题
    navigation.setOptions({
      title: siteName || '站点详情'
    });

    // 初始获取数据并开始定时更新
    startDataFetching();
    
    // 处理页面焦点变化
    const focusUnsubscribe = navigation.addListener('focus', startDataFetching);
    const blurUnsubscribe = navigation.addListener('blur', stopDataFetching);

    // 处理应用状态变化
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (currentAppState.current.match(/inactive|background/) && nextAppState === 'active') {
        startDataFetching();
      } else if (nextAppState.match(/inactive|background/)) {
        stopDataFetching();
      }
      currentAppState.current = nextAppState;
    });

    // 清理函数
    return () => {
      stopDataFetching();
      focusUnsubscribe();
      blurUnsubscribe();
      appStateSubscription.remove();
    };
  }, [navigation, siteName, startDataFetching, stopDataFetching]);

  // 新增发送控制命令的函数
  const sendCommand = async (command) => {
    try {
      const response = await axios.post(`https://nodered.jzz77.cn:9003/api/site/${siteId}/command`, command, {
        timeout: 10000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });
      
      // 发送命令后立即获取最新数据
      await fetchSiteDetail();
      return response.data;
    } catch (error) {
      console.error('发送控制命令失败:', error);
      throw error;
    }
  };

  // 修改设备控制函数
  const handleDeviceControl = async (deviceName, action) => {
    try {
      await sendCommand({
        type: 'device_control',
        deviceName,
        action
      });
    } catch (error) {
      console.error('设备控制失败:', error);
    }
  };

  // 修改阀门控制函数
  const handleValveControl = async (valveName, action, openKey, closeKey) => {
    try {
      await sendCommand({
        type: 'valve_control',
        valveName,
        action,
        openKey,
        closeKey
      });
    } catch (error) {
      console.error('阀门控制失败:', error);
    }
  };

  // 修改频率设置函数
  const handleSetFrequency = async (deviceName, frequency) => {
    try {
      await sendCommand({
        type: 'set_frequency',
        deviceName,
        frequency: parseFloat(frequency)
      });
    } catch (error) {
      console.error('设置频率失败:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchSiteDetail();
    setRefreshing(false);
  }, []);

  const renderDataCard = (item, index) => (
    <View
      key={`${item.name}-${index}`}
      style={[
        styles.card,
        { backgroundColor: colors.card },
        item.alarm === 1 && styles.alarmCard
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <View style={styles.dataContainer}>
        <Text style={[styles.dataValue, { color: item.alarm === 1 ? '#FF5252' : colors.text }]}>
          {item.data.toFixed(2)}
        </Text>
        <Text style={[styles.dataUnit, { color: colors.text }]}>{item.dw}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor={colors.text}
          />
        }
      >
      <View style={styles.connectionStatusContainer}>
        <View style={[styles.connectionStatus, { backgroundColor: updateTimer ? '#4CAF50' : '#FF5252' }]} />
        <Text style={[styles.connectionText, { color: colors.text }]}>
          {updateTimer ? '自动更新已开启' : '自动更新已关闭'}
        </Text>
        {lastUpdateTime && (
          <Text style={[styles.lastUpdateText, { color: colors.text }]}>
            最后更新：{lastUpdateTime.toLocaleString('zh-CN', { hour12: false })}
          </Text>
        )}
      </View>

      {inData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>进水数据</Text>
          <View style={styles.cardGrid}>
            {inData.map(renderDataCard)}
          </View>
        </View>
      )}

      {outData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>出水数据</Text>
          <View style={styles.cardGrid}>
            {outData.map(renderDataCard)}
          </View>
        </View>
      )}

      {deviceFrequency.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>设备频率</Text>
          <View style={styles.cardGrid}>
            {deviceFrequency.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => {
                  setSelectedDevice(item);
                  setNewFrequency(item.sethz?.toString() || '');
                  setModalVisible(true);
                }}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                <View style={styles.dataContainer}>
                  <Text style={[styles.dataValue, { color: colors.text }]}>
                    {item.hz?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={[styles.dataUnit, { color: colors.text }]}>Hz</Text>
                </View>
                {item.sethz !== undefined && (
                  <Text style={[styles.frequencySetpoint, { color: colors.text }]}>
                    设定值: {item.sethz?.toFixed(2) || '0.00'} Hz
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {devices.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>设备控制</Text>
          <View style={styles.cardGrid}>
            {devices.map((device) => (
              <View
                key={device.name}
                style={[styles.card, { backgroundColor: colors.card }, device.fault === 1 && styles.alarmCard]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{device.name}</Text>
                <View style={styles.deviceControlContainer}>
                  <View style={styles.statusContainer}>
                    <Text style={[styles.deviceStatus, { color: device.run ? '#4CAF50' : '#FF5252' }]}>
                      {device.run ? '运行中' : '已停止'}
                    </Text>
                    {device.fault === 1 && (
                      <Text style={styles.alarmStatus}>报警</Text>
                    )}
                  </View>
                  <View style={styles.controlButtonContainer}>
                    <Text
                      style={[styles.controlButton, { backgroundColor: device.run ? '#FF5252' : '#4CAF50' }]}
                      onPress={() => handleDeviceControl(device.name, device.run ? 'stop' : 'start')}
                    >
                      {device.run ? '停止' : '启动'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      {isValve.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>阀门控制</Text>
          <View style={styles.cardGrid}>
            {isValve.map((valve) => (
              <View
                key={valve.name}
                style={[styles.card, { backgroundColor: colors.card }, valve.fault === 1 && styles.alarmCard]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{valve.name}</Text>
                <View style={styles.deviceControlContainer}>
                  <View style={styles.statusContainer}>
                    <Text style={[styles.deviceStatus, { color: valve.open ? '#4CAF50' : valve.close ? '#FF5252' : '#FFA000' }]}>
                      {valve.open ? '开到位' : valve.close ? '关到位' : '状态未知'}
                    </Text>
                    {valve.fault === 1 && (
                      <Text style={styles.alarmStatus}>故障</Text>
                    )}
                  </View>
                  <View style={styles.controlButtonContainer}>
                    <TouchableOpacity
                      onPress={() => handleValveControl(
                        valve.name,
                        valve.open ? 'close' : 'open',
                        valve.openKey,
                        valve.closeKey
                      )}
                      disabled={valve.fault === 1}
                    >
                      <Text
                        style={[
                          styles.controlButton,
                          { backgroundColor: valve.open ? '#FF5252' : '#4CAF50' },
                          valve.fault === 1 && { opacity: 0.5 }
                        ]}
                      >
                        {valve.open ? '关闭' : '开启'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedDevice?.name} - 频率设定
            </Text>
            <TextInput
              style={[styles.frequencyInput, { 
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text
              }]}
              placeholder="请输入频率值"
              placeholderTextColor={colors.text}
              keyboardType="numeric"
              value={newFrequency}
              onChangeText={setNewFrequency}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  if (selectedDevice && newFrequency) {
                    handleSetFrequency(selectedDevice.name, newFrequency);
                    setModalVisible(false);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>确认</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 'auto',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  dataContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dataValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 3,
    letterSpacing: 0.3,
  },
  dataUnit: {
    fontSize: 11,
    opacity: 0.8,
  },
  deviceControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deviceStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
    letterSpacing: 0.2,
  },
  alarmStatus: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  frequencySetpoint: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
    letterSpacing: 0.1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  frequencyInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF5252',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SiteDetailScreen;