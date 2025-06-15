// 测试若依后端 /system/auth/get-permission-info 接口集成

import { authApi } from '../api/apiService';
import { getAuthToken } from '../api/storage';

class PermissionInfoTest {
  constructor() {
    this.testName = '权限信息接口测试';
  }

  // 测试获取权限信息接口
  async testGetPermissionInfo() {
    console.log(`\n===== ${this.testName} =====`);
    
    try {
      // 检查是否有有效的认证令牌
      const token = await getAuthToken();
      if (!token) {
        console.warn('[权限测试] 警告: 未找到认证令牌，请先登录');
        return {
          success: false,
          error: '未找到认证令牌，请先登录'
        };
      }
      
      console.log('[权限测试] 开始调用 /system/auth/get-permission-info 接口...');
      
      // 调用权限信息接口
      const response = await authApi.getPermissionInfo();
      
      console.log('[权限测试] 接口调用成功');
      console.log('[权限测试] 响应状态:', response?.status || '未知');
      
      if (response && response.data) {
        const permissionData = response.data;
        
        console.log('[权限测试] 权限数据结构分析:');
        console.log('- 用户信息:', permissionData.user ? '✓' : '✗');
        console.log('- 角色列表:', permissionData.roles ? `✓ (${permissionData.roles.length}个角色)` : '✗');
        console.log('- 权限列表:', permissionData.permissions ? `✓ (${permissionData.permissions.length}个权限)` : '✗');
        
        // 详细分析用户信息
        if (permissionData.user) {
          const user = permissionData.user;
          console.log('[权限测试] 用户详细信息:');
          console.log('  - ID:', user.id);
          console.log('  - 用户名:', user.username);
          console.log('  - 昵称:', user.nickname);
          console.log('  - 邮箱:', user.email);
          console.log('  - 部门ID:', user.deptId);
          console.log('  - 角色IDs:', user.roleIds);
          console.log('  - 岗位IDs:', user.postIds);
        }
        
        // 详细分析角色信息
        if (permissionData.roles && permissionData.roles.length > 0) {
          console.log('[权限测试] 角色详细信息:');
          permissionData.roles.forEach((role, index) => {
            console.log(`  角色${index + 1}:`);
            console.log(`    - ID: ${role.id}`);
            console.log(`    - 名称: ${role.name}`);
            console.log(`    - 编码: ${role.code}`);
            console.log(`    - 类型: ${role.type}`);
            console.log(`    - 状态: ${role.status}`);
          });
        }
        
        // 分析权限信息
        if (permissionData.permissions && permissionData.permissions.length > 0) {
          console.log('[权限测试] 权限信息:');
          console.log(`  - 总权限数: ${permissionData.permissions.length}`);
          console.log(`  - 前5个权限: ${permissionData.permissions.slice(0, 5).join(', ')}`);
        }
        
        return {
          success: true,
          data: permissionData,
          analysis: {
            hasUser: !!permissionData.user,
            roleCount: permissionData.roles?.length || 0,
            permissionCount: permissionData.permissions?.length || 0,
            primaryRole: permissionData.roles?.[0] || null
          }
        };
        
      } else {
        console.error('[权限测试] 响应数据为空或格式错误');
        return {
          success: false,
          error: '响应数据为空或格式错误'
        };
      }
      
    } catch (error) {
      console.error('[权限测试] 接口调用失败:', error.message);
      
      if (error.response) {
        console.error('[权限测试] 错误详情:');
        console.error('  - 状态码:', error.response.status);
        console.error('  - 错误信息:', error.response.data);
        
        // 分析常见错误
        if (error.response.status === 401) {
          console.error('[权限测试] 认证失败，可能是令牌过期或无效');
        } else if (error.response.status === 403) {
          console.error('[权限测试] 权限不足，用户可能没有访问该接口的权限');
        } else if (error.response.status === 404) {
          console.error('[权限测试] 接口不存在，请检查后端是否实现了该接口');
        }
      } else if (error.request) {
        console.error('[权限测试] 网络错误，无法连接到服务器');
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }
  
  // 测试权限信息在登录流程中的集成
  async testLoginIntegration() {
    console.log('\n===== 登录集成测试 =====');
    
    try {
      // 模拟登录后的权限获取流程
      const result = await this.testGetPermissionInfo();
      
      if (result.success) {
        console.log('[集成测试] ✓ 权限信息获取成功');
        
        // 验证关键字段
        const analysis = result.analysis;
        
        if (analysis.hasUser) {
          console.log('[集成测试] ✓ 用户信息完整');
        } else {
          console.warn('[集成测试] ⚠ 用户信息缺失');
        }
        
        if (analysis.roleCount > 0) {
          console.log('[集成测试] ✓ 角色信息完整');
          
          const primaryRole = analysis.primaryRole;
          if (primaryRole) {
            console.log('[集成测试] 主要角色分析:');
            console.log(`  - 角色名称: ${primaryRole.name}`);
            console.log(`  - 是否管理员: ${primaryRole.name?.includes('管理员') ? '是' : '否'}`);
          }
        } else {
          console.warn('[集成测试] ⚠ 角色信息缺失');
        }
        
        if (analysis.permissionCount > 0) {
          console.log('[集成测试] ✓ 权限信息完整');
        } else {
          console.warn('[集成测试] ⚠ 权限信息缺失');
        }
        
        return {
          success: true,
          message: '登录集成测试通过',
          recommendations: this.generateRecommendations(analysis)
        };
        
      } else {
        console.error('[集成测试] ✗ 权限信息获取失败:', result.error);
        return {
          success: false,
          message: '登录集成测试失败',
          error: result.error
        };
      }
      
    } catch (error) {
      console.error('[集成测试] 测试过程中发生错误:', error.message);
      return {
        success: false,
        message: '集成测试异常',
        error: error.message
      };
    }
  }
  
  // 生成改进建议
  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (!analysis.hasUser) {
      recommendations.push('建议检查后端接口是否正确返回用户信息');
    }
    
    if (analysis.roleCount === 0) {
      recommendations.push('建议检查用户是否已分配角色，或后端角色查询逻辑');
    }
    
    if (analysis.permissionCount === 0) {
      recommendations.push('建议检查角色权限配置，确保角色有相应的权限');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('权限信息集成良好，无需额外配置');
    }
    
    return recommendations;
  }
}

// 导出测试类
export default PermissionInfoTest;

// 便捷的测试执行函数
export const runPermissionInfoTest = async () => {
  const test = new PermissionInfoTest();
  return await test.testGetPermissionInfo();
};

export const runLoginIntegrationTest = async () => {
  const test = new PermissionInfoTest();
  return await test.testLoginIntegration();
};