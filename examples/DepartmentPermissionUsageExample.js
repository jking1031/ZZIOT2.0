import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PagePermissionGate,
  ButtonPermissionGate,
  MixedPermissionGate,
  DepartmentOnlyGate,
  PermissionInfo
} from '../components/DepartmentPermissionGate';
import DepartmentPermissionGate from '../components/DepartmentPermissionGate';
import {
  PAGE_PERMISSIONS,
  BUTTON_PERMISSIONS
} from '../config/departmentPermissions';
import { useDepartmentPermission } from '../hooks/useDepartmentPermission';

/**
 * 部门权限使用示例
 * 展示如何在实际页面中使用部门权限控制
 */
const DepartmentPermissionUsageExample = ({ navigation }) => {
  const { 
    department, 
    departmentInfo, 
    hasPagePermission, 
    hasButtonPermission,
    permissionSummary 
  } = useDepartmentPermission();

  return (
    <ScrollView style={styles.container}>
      {/* 页面头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>部门权限使用示例</Text>
      </View>

      {/* 权限信息展示 */}
      <PermissionInfo showDetails={false} />

      {/* 示例1: 页面权限控制 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. 页面权限控制示例</Text>
        
        {/* 数据录入页面权限 */}
        <PagePermissionGate 
          pagePermissions={PAGE_PERMISSIONS.DATA_ENTRY}
          fallback={
            <View style={styles.noPermissionCard}>
              <Ionicons name="lock-closed" size={24} color="#ff3b30" />
              <Text style={styles.noPermissionText}>无数据录入权限</Text>
            </View>
          }
        >
          <TouchableOpacity style={styles.permissionCard}>
            <Ionicons name="create" size={24} color="#34c759" />
            <Text style={styles.cardTitle}>数据录入</Text>
            <Text style={styles.cardDesc}>您有权限访问数据录入功能</Text>
          </TouchableOpacity>
        </PagePermissionGate>

        {/* 用户管理页面权限 */}
        <PagePermissionGate 
          pagePermissions={PAGE_PERMISSIONS.USER_MANAGEMENT}
          fallback={
            <View style={styles.noPermissionCard}>
              <Ionicons name="lock-closed" size={24} color="#ff3b30" />
              <Text style={styles.noPermissionText}>无用户管理权限</Text>
            </View>
          }
        >
          <TouchableOpacity style={styles.permissionCard}>
            <Ionicons name="people" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>用户管理</Text>
            <Text style={styles.cardDesc}>您有权限访问用户管理功能</Text>
          </TouchableOpacity>
        </PagePermissionGate>
      </View>

      {/* 示例2: 按钮权限控制 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 按钮权限控制示例</Text>
        
        <View style={styles.buttonRow}>
          {/* 创建数据按钮 */}
          <ButtonPermissionGate 
            buttonPermissions={BUTTON_PERMISSIONS.CREATE_DATA}
            fallback={
              <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                <Text style={styles.disabledButtonText}>创建数据(无权限)</Text>
              </TouchableOpacity>
            }
          >
            <TouchableOpacity style={[styles.button, styles.enabledButton]}>
              <Text style={styles.enabledButtonText}>创建数据</Text>
            </TouchableOpacity>
          </ButtonPermissionGate>

          {/* 删除数据按钮 */}
          <ButtonPermissionGate 
            buttonPermissions={BUTTON_PERMISSIONS.DELETE_DATA}
            fallback={
              <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                <Text style={styles.disabledButtonText}>删除数据(无权限)</Text>
              </TouchableOpacity>
            }
          >
            <TouchableOpacity style={[styles.button, styles.dangerButton]}>
              <Text style={styles.dangerButtonText}>删除数据</Text>
            </TouchableOpacity>
          </ButtonPermissionGate>
        </View>

        <View style={styles.buttonRow}>
          {/* 导出数据按钮 */}
          <ButtonPermissionGate 
            buttonPermissions={BUTTON_PERMISSIONS.EXPORT_DATA}
            fallback={
              <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                <Text style={styles.disabledButtonText}>导出数据(无权限)</Text>
              </TouchableOpacity>
            }
          >
            <TouchableOpacity style={[styles.button, styles.enabledButton]}>
              <Text style={styles.enabledButtonText}>导出数据</Text>
            </TouchableOpacity>
          </ButtonPermissionGate>

          {/* 系统配置按钮 */}
          <ButtonPermissionGate 
            buttonPermissions={BUTTON_PERMISSIONS.SYSTEM_CONFIG}
            fallback={
              <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                <Text style={styles.disabledButtonText}>系统配置(无权限)</Text>
              </TouchableOpacity>
            }
          >
            <TouchableOpacity style={[styles.button, styles.warningButton]}>
              <Text style={styles.warningButtonText}>系统配置</Text>
            </TouchableOpacity>
          </ButtonPermissionGate>
        </View>
      </View>

      {/* 示例3: 混合权限控制 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. 混合权限控制示例</Text>
        
        <MixedPermissionGate 
          pagePermissions={[PAGE_PERMISSIONS.REPORTS]}
          buttonPermissions={[BUTTON_PERMISSIONS.CREATE_REPORT, BUTTON_PERMISSIONS.EXPORT_REPORT]}
          requireAnyButton={true}
          fallback={
            <View style={styles.noPermissionCard}>
              <Ionicons name="document-text" size={24} color="#ff3b30" />
              <Text style={styles.noPermissionText}>无报表相关权限</Text>
            </View>
          }
        >
          <View style={styles.permissionCard}>
            <Ionicons name="document-text" size={24} color="#ff9500" />
            <Text style={styles.cardTitle}>报表管理</Text>
            <Text style={styles.cardDesc}>您有权限访问报表功能并进行相关操作</Text>
            
            <View style={styles.buttonRow}>
              <ButtonPermissionGate 
                buttonPermissions={BUTTON_PERMISSIONS.CREATE_REPORT}
                fallback={null}
              >
                <TouchableOpacity style={[styles.smallButton, styles.enabledButton]}>
                  <Text style={styles.smallButtonText}>创建报表</Text>
                </TouchableOpacity>
              </ButtonPermissionGate>
              
              <ButtonPermissionGate 
                buttonPermissions={BUTTON_PERMISSIONS.EXPORT_REPORT}
                fallback={null}
              >
                <TouchableOpacity style={[styles.smallButton, styles.enabledButton]}>
                  <Text style={styles.smallButtonText}>导出报表</Text>
                </TouchableOpacity>
              </ButtonPermissionGate>
            </View>
          </View>
        </MixedPermissionGate>
      </View>

      {/* 示例4: 部门专用功能 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. 部门专用功能示例</Text>
        
        {/* 技术部专用功能 */}
        <DepartmentOnlyGate 
          allowedDepartments={['技术部']}
          fallback={
            <View style={styles.noPermissionCard}>
              <Ionicons name="construct" size={24} color="#ff3b30" />
              <Text style={styles.noPermissionText}>仅技术部可访问</Text>
            </View>
          }
        >
          <TouchableOpacity style={styles.permissionCard}>
            <Ionicons name="construct" size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>技术部专用工具</Text>
            <Text style={styles.cardDesc}>技术部专用的系统配置和维护工具</Text>
          </TouchableOpacity>
        </DepartmentOnlyGate>

        {/* 管理部专用功能 */}
        <DepartmentOnlyGate 
          allowedDepartments={['管理部']}
          fallback={
            <View style={styles.noPermissionCard}>
              <Ionicons name="business" size={24} color="#ff3b30" />
              <Text style={styles.noPermissionText}>仅管理部可访问</Text>
            </View>
          }
        >
          <TouchableOpacity style={styles.permissionCard}>
            <Ionicons name="business" size={24} color="#34c759" />
            <Text style={styles.cardTitle}>管理部专用功能</Text>
            <Text style={styles.cardDesc}>管理部专用的人员和权限管理工具</Text>
          </TouchableOpacity>
        </DepartmentOnlyGate>

        {/* 多部门共享功能 */}
        <DepartmentOnlyGate 
          allowedDepartments={['技术部', '运营部', '质检部']}
          fallback={
            <View style={styles.noPermissionCard}>
              <Ionicons name="flask" size={24} color="#ff3b30" />
              <Text style={styles.noPermissionText}>仅技术部、运营部、质检部可访问</Text>
            </View>
          }
        >
          <TouchableOpacity style={styles.permissionCard}>
            <Ionicons name="flask" size={24} color="#ff9500" />
            <Text style={styles.cardTitle}>实验室数据管理</Text>
            <Text style={styles.cardDesc}>技术部、运营部、质检部共享的实验室数据功能</Text>
          </TouchableOpacity>
        </DepartmentOnlyGate>
      </View>

      {/* 示例5: 权限检查方法使用 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. 权限检查方法使用示例</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>当前权限状态</Text>
          <Text style={styles.infoText}>部门: {department || '未分配'}</Text>
          <Text style={styles.infoText}>
            数据录入权限: {hasPagePermission(PAGE_PERMISSIONS.DATA_ENTRY) ? '✅ 有' : '❌ 无'}
          </Text>
          <Text style={styles.infoText}>
            创建数据权限: {hasButtonPermission(BUTTON_PERMISSIONS.CREATE_DATA) ? '✅ 有' : '❌ 无'}
          </Text>
          <Text style={styles.infoText}>
            用户管理权限: {hasPagePermission(PAGE_PERMISSIONS.USER_MANAGEMENT) ? '✅ 有' : '❌ 无'}
          </Text>
          <Text style={styles.infoText}>
            系统配置权限: {hasButtonPermission(BUTTON_PERMISSIONS.SYSTEM_CONFIG) ? '✅ 有' : '❌ 无'}
          </Text>
        </View>
      </View>

      {/* 跳转到权限管理页面 */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.manageButton}
          onPress={() => navigation.navigate('DepartmentPermissionScreen')}
        >
          <Ionicons name="settings" size={24} color="#fff" />
          <Text style={styles.manageButtonText}>管理部门权限</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    marginRight: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  section: {
    margin: 16,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center'
  },
  noPermissionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffebee',
    alignItems: 'center',
    opacity: 0.6
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center'
  },
  noPermissionText: {
    fontSize: 14,
    color: '#ff3b30',
    marginTop: 8,
    textAlign: 'center'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4
  },
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4
  },
  enabledButton: {
    backgroundColor: '#007AFF'
  },
  enabledButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  disabledButton: {
    backgroundColor: '#f0f0f0'
  },
  disabledButtonText: {
    color: '#999'
  },
  dangerButton: {
    backgroundColor: '#ff3b30'
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  warningButton: {
    backgroundColor: '#ff9500'
  },
  warningButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  manageButton: {
    backgroundColor: '#34c759',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  }
});

export default DepartmentPermissionUsageExample;