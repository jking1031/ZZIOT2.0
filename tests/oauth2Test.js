// OAuth2.0 功能测试文件
// 用于测试OAuth2Service的各项功能

import { OAuth2Service, DEFAULT_OAUTH2_CONFIG } from '../api/oauth2Service';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * OAuth2功能测试类
 */
class OAuth2Test {
  constructor() {
    this.oauth2Service = null;
    this.testResults = [];
  }

  /**
   * 记录测试结果
   */
  logResult(testName, success, message, data = null) {
    const result = {
      testName,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    console.log(`[OAuth2Test] ${testName}: ${success ? '✅' : '❌'} ${message}`);
    if (data) {
      console.log(`[OAuth2Test] 数据:`, data);
    }
  }

  /**
   * 清理测试环境
   */
  async cleanup() {
    try {
      await AsyncStorage.multiRemove([
        'oauth2_access_token',
        'oauth2_refresh_token',
        'oauth2_token_type',
        'oauth2_expires_at',
        'oauth2_scope',
        'oauth2_config',
        'oauth2_enabled'
      ]);
      console.log('[OAuth2Test] 测试环境已清理');
    } catch (error) {
      console.error('[OAuth2Test] 清理测试环境失败:', error);
    }
  }

  /**
   * 测试OAuth2Service初始化
   */
  async testInitialization() {
    try {
      this.oauth2Service = new OAuth2Service(DEFAULT_OAUTH2_CONFIG);
      this.logResult(
        '初始化测试',
        true,
        'OAuth2Service初始化成功',
        { config: DEFAULT_OAUTH2_CONFIG }
      );
    } catch (error) {
      this.logResult(
        '初始化测试',
        false,
        `OAuth2Service初始化失败: ${error.message}`
      );
    }
  }

  /**
   * 测试配置保存和加载
   */
  async testConfigManagement() {
    try {
      const testConfig = {
        ...DEFAULT_OAUTH2_CONFIG,
        baseUrl: 'http://test.example.com',
        clientId: 'test-client-id'
      };

      // 保存配置
      await AsyncStorage.setItem('oauth2_config', JSON.stringify(testConfig));
      
      // 加载配置
      const savedConfigStr = await AsyncStorage.getItem('oauth2_config');
      const savedConfig = JSON.parse(savedConfigStr);

      const isMatch = savedConfig.baseUrl === testConfig.baseUrl && 
                     savedConfig.clientId === testConfig.clientId;

      this.logResult(
        '配置管理测试',
        isMatch,
        isMatch ? '配置保存和加载成功' : '配置保存和加载失败',
        { saved: savedConfig, expected: testConfig }
      );
    } catch (error) {
      this.logResult(
        '配置管理测试',
        false,
        `配置管理测试失败: ${error.message}`
      );
    }
  }

  /**
   * 测试令牌存储和获取
   */
  async testTokenStorage() {
    try {
      const testTokenData = {
        access_token: 'test-access-token-12345',
        refresh_token: 'test-refresh-token-67890',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'user.read user.write'
      };

      // 保存令牌
      if (this.oauth2Service) {
        await this.oauth2Service.saveTokens(testTokenData);
      }

      // 获取令牌信息
      const tokenInfo = await this.oauth2Service.getTokenInfo();

      const isValid = tokenInfo.accessToken === testTokenData.access_token &&
                     tokenInfo.refreshToken === testTokenData.refresh_token &&
                     tokenInfo.tokenType === testTokenData.token_type;

      this.logResult(
        '令牌存储测试',
        isValid,
        isValid ? '令牌存储和获取成功' : '令牌存储和获取失败',
        { stored: testTokenData, retrieved: tokenInfo }
      );
    } catch (error) {
      this.logResult(
        '令牌存储测试',
        false,
        `令牌存储测试失败: ${error.message}`
      );
    }
  }

  /**
   * 测试令牌过期检查
   */
  async testTokenExpiration() {
    try {
      // 创建一个已过期的令牌
      const expiredTokenData = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: -3600, // 负数表示已过期
        scope: 'user.read'
      };

      await this.oauth2Service.saveTokens(expiredTokenData);
      const tokenInfo = await this.oauth2Service.getTokenInfo();

      this.logResult(
        '令牌过期检查测试',
        tokenInfo.isExpired === true,
        tokenInfo.isExpired ? '正确识别过期令牌' : '未能识别过期令牌',
        { tokenInfo }
      );
    } catch (error) {
      this.logResult(
        '令牌过期检查测试',
        false,
        `令牌过期检查测试失败: ${error.message}`
      );
    }
  }

  /**
   * 测试令牌清除
   */
  async testTokenClear() {
    try {
      // 先保存一些令牌
      const tokenData = {
        access_token: 'token-to-clear',
        refresh_token: 'refresh-to-clear',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'user.read'
      };

      await this.oauth2Service.saveTokens(tokenData);
      
      // 清除令牌
      await this.oauth2Service.clearTokens();
      
      // 检查是否清除成功
      const tokenInfo = await this.oauth2Service.getTokenInfo();
      const isCleared = !tokenInfo.accessToken && !tokenInfo.refreshToken;

      this.logResult(
        '令牌清除测试',
        isCleared,
        isCleared ? '令牌清除成功' : '令牌清除失败',
        { tokenInfo }
      );
    } catch (error) {
      this.logResult(
        '令牌清除测试',
        false,
        `令牌清除测试失败: ${error.message}`
      );
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('[OAuth2Test] 开始运行OAuth2功能测试...');
    
    // 清理测试环境
    await this.cleanup();
    
    // 运行各项测试
    await this.testInitialization();
    await this.testConfigManagement();
    await this.testTokenStorage();
    await this.testTokenExpiration();
    await this.testTokenClear();
    
    // 输出测试结果摘要
    this.printTestSummary();
    
    // 清理测试环境
    await this.cleanup();
    
    return this.testResults;
  }

  /**
   * 打印测试结果摘要
   */
  printTestSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n[OAuth2Test] 测试结果摘要:');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests} ✅`);
    console.log(`失败: ${failedTests} ❌`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n失败的测试:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`- ${r.testName}: ${r.message}`);
        });
    }
  }

  /**
   * 获取测试结果
   */
  getTestResults() {
    return this.testResults;
  }
}

// 导出测试类
export default OAuth2Test;

// 便捷的测试运行函数
export const runOAuth2Tests = async () => {
  const tester = new OAuth2Test();
  return await tester.runAllTests();
};

// 使用示例:
// import { runOAuth2Tests } from './tests/oauth2Test';
// 
// // 在开发环境中运行测试
// if (__DEV__) {
//   runOAuth2Tests().then(results => {
//     console.log('OAuth2测试完成', results);
//   });
// }