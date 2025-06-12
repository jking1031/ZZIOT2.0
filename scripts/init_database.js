#!/usr/bin/env node

/**
 * 数据库初始化脚本执行器
 * 用于执行角色和权限系统的初始化
 */

import mysql from 'mysql2/promise';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zziot',
  multipleStatements: true
};

/**
 * 执行SQL文件
 */
async function executeSqlFile(connection, filePath) {
  try {
    console.log(`正在执行SQL文件: ${filePath}`);
    
    const sqlContent = await fs.readFile(filePath, 'utf8');
    
    // 分割SQL语句（简单的分割，基于分号）
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        if (statement.toLowerCase().startsWith('select')) {
          // 对于SELECT语句，显示结果
          const [rows] = await connection.execute(statement);
          console.log('查询结果:', rows);
        } else {
          // 对于其他语句，执行并显示影响的行数
          const [result] = await connection.execute(statement);
          if (result.affectedRows !== undefined) {
            console.log(`✓ 执行成功，影响行数: ${result.affectedRows}`);
          } else {
            console.log('✓ 执行成功');
          }
        }
        successCount++;
      } catch (error) {
        console.error(`✗ 执行失败: ${error.message}`);
        console.error(`SQL: ${statement.substring(0, 100)}...`);
        errorCount++;
      }
    }
    
    console.log(`\n文件执行完成: 成功 ${successCount} 条，失败 ${errorCount} 条\n`);
    return { successCount, errorCount };
    
  } catch (error) {
    console.error(`读取SQL文件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查数据库连接
 */
async function checkConnection(connection) {
  try {
    await connection.execute('SELECT 1');
    console.log('✓ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    return false;
  }
}

/**
 * 检查必要的表是否存在
 */
async function checkTables(connection) {
  const requiredTables = ['users1', 'roles', 'permissions', 'role_permissions', 'user_roles'];
  const missingTables = [];
  
  for (const table of requiredTables) {
    try {
      await connection.execute(`DESCRIBE ${table}`);
      console.log(`✓ 表 ${table} 存在`);
    } catch (error) {
      console.log(`✗ 表 ${table} 不存在`);
      missingTables.push(table);
    }
  }
  
  if (missingTables.length > 0) {
    console.log('\n警告: 以下表不存在，请先创建这些表:');
    missingTables.forEach(table => console.log(`  - ${table}`));
    console.log('\n请参考 db.txt 文件中的表结构创建这些表。\n');
    return false;
  }
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 用户角色权限系统初始化 ===\n');
  
  let connection;
  
  try {
    // 创建数据库连接
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 检查连接
    if (!(await checkConnection(connection))) {
      process.exit(1);
    }
    
    // 检查必要的表
    console.log('\n检查数据库表...');
    if (!(await checkTables(connection))) {
      console.log('\n请先创建必要的数据库表，然后重新运行此脚本。');
      process.exit(1);
    }
    
    // 执行初始化脚本
    console.log('\n开始执行初始化脚本...');
    const sqlFilePath = path.join(__dirname, '../database/init_roles_permissions.sql');
    
    const result = await executeSqlFile(connection, sqlFilePath);
    
    console.log('=== 初始化完成 ===');
    console.log(`总计: 成功 ${result.successCount} 条，失败 ${result.errorCount} 条`);
    
    if (result.errorCount === 0) {
      console.log('\n🎉 用户角色权限系统初始化成功！');
      console.log('\n现在您可以:');
      console.log('1. 使用 admin@system.local / admin 登录管理员账户');
      console.log('2. 为现有用户分配适当的角色');
      console.log('3. 根据需要调整角色权限配置');
    } else {
      console.log('\n⚠️  初始化过程中有部分失败，请检查上述错误信息。');
    }
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭。');
    }
  }
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
用法: node ${path.basename(__filename)} [选项]
`);
  console.log('环境变量:');
  console.log('  DB_HOST     数据库主机 (默认: localhost)');
  console.log('  DB_USER     数据库用户 (默认: root)');
  console.log('  DB_PASSWORD 数据库密码 (默认: 空)');
  console.log('  DB_NAME     数据库名称 (默认: zziot)');
  console.log('\n选项:');
  console.log('  -h, --help  显示此帮助信息');
  console.log('\n示例:');
  console.log('  DB_PASSWORD=mypassword node init_database.js');
  process.exit(0);
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { executeSqlFile, checkConnection, checkTables };