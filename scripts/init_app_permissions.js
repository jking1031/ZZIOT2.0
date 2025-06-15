/**
 * App权限管理数据库初始化脚本
 * 自动执行SQL文件创建权限表和初始化数据
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zziot_permissions',
  charset: 'utf8mb4',
  timezone: '+08:00'
};

// SQL文件路径
const SQL_FILES = {
  CREATE_TABLES: path.join(__dirname, '../database/create_app_permissions.sql'),
  INIT_DATA: path.join(__dirname, '../database/init_app_permissions_data.sql')
};

/**
 * 读取SQL文件内容
 */
async function readSqlFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`读取SQL文件失败: ${filePath} - ${error.message}`);
  }
}

/**
 * 执行SQL语句
 */
async function executeSql(connection, sql, description) {
  try {
    console.log(`\n🔄 ${description}...`);
    
    // 分割SQL语句（按分号分割，忽略注释）
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'))
      .filter(stmt => stmt.toLowerCase() !== 'select');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement) {
        try {
          await connection.execute(statement);
          successCount++;
        } catch (error) {
          console.error(`❌ SQL执行错误: ${error.message}`);
          console.error(`   语句: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`✅ ${description}完成 - 成功: ${successCount}, 错误: ${errorCount}`);
    return { successCount, errorCount };
  } catch (error) {
    console.error(`❌ ${description}失败:`, error.message);
    throw error;
  }
}

/**
 * 检查数据库是否存在
 */
async function checkDatabase() {
  const connection = await mysql.createConnection({
    ...DB_CONFIG,
    database: undefined // 不指定数据库
  });
  
  try {
    const [rows] = await connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [DB_CONFIG.database]
    );
    
    return rows.length > 0;
  } finally {
    await connection.end();
  }
}

/**
 * 创建数据库
 */
async function createDatabase() {
  const connection = await mysql.createConnection({
    ...DB_CONFIG,
    database: undefined // 不指定数据库
  });
  
  try {
    console.log(`🔄 创建数据库: ${DB_CONFIG.database}...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库创建成功: ${DB_CONFIG.database}`);
  } finally {
    await connection.end();
  }
}

/**
 * 检查表是否存在
 */
async function checkTables(connection) {
  try {
    const [rows] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (
         'users', 'permission_modules', 'page_permissions', 
         'departments', 'user_departments', 'department_page_permissions'
       )`,
      [DB_CONFIG.database]
    );
    
    return rows.map(row => row.TABLE_NAME);
  } catch (error) {
    console.error('检查表失败:', error.message);
    return [];
  }
}

/**
 * 获取数据统计
 */
async function getDataStats(connection) {
  try {
    const tables = ['permission_modules', 'page_permissions', 'departments', 'users', 'department_page_permissions'];
    const stats = {};
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = rows[0].count;
      } catch (error) {
        stats[table] = 0;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('获取数据统计失败:', error.message);
    return {};
  }
}

/**
 * 主初始化函数
 */
async function initializeAppPermissions() {
  console.log('🚀 开始初始化App权限管理数据库...');
  console.log(`📊 数据库配置: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  
  let connection;
  
  try {
    // 1. 检查并创建数据库
    const dbExists = await checkDatabase();
    if (!dbExists) {
      await createDatabase();
    } else {
      console.log(`✅ 数据库已存在: ${DB_CONFIG.database}`);
    }
    
    // 2. 连接到数据库
    console.log('\n🔗 连接到数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功');
    
    // 3. 检查现有表
    const existingTables = await checkTables(connection);
    console.log(`\n📋 现有表: ${existingTables.length > 0 ? existingTables.join(', ') : '无'}`);
    
    // 4. 读取并执行创建表的SQL
    console.log('\n📄 读取SQL文件...');
    const createTablesSql = await readSqlFile(SQL_FILES.CREATE_TABLES);
    const initDataSql = await readSqlFile(SQL_FILES.INIT_DATA);
    
    // 5. 执行创建表的SQL
    await executeSql(connection, createTablesSql, '创建权限管理表');
    
    // 6. 检查是否需要初始化数据
    const stats = await getDataStats(connection);
    console.log('\n📊 当前数据统计:');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} 条记录`);
    });
    
    // 7. 如果没有数据，执行初始化数据SQL
    const hasData = Object.values(stats).some(count => count > 0);
    if (!hasData) {
      console.log('\n🔄 检测到空数据库，开始初始化数据...');
      await executeSql(connection, initDataSql, '初始化权限数据');
      
      // 8. 显示最终统计
      const finalStats = await getDataStats(connection);
      console.log('\n📊 初始化后数据统计:');
      Object.entries(finalStats).forEach(([table, count]) => {
        console.log(`   ${table}: ${count} 条记录`);
      });
    } else {
      console.log('\n⚠️  数据库已有数据，跳过初始化数据步骤');
      console.log('   如需重新初始化，请先清空相关表或删除数据库');
    }
    
    console.log('\n🎉 App权限管理数据库初始化完成!');
    console.log('\n📝 接下来可以:');
    console.log('   1. 使用 api/permissionService.js 进行权限管理');
    console.log('   2. 在前端使用权限验证组件');
    console.log('   3. 配置后端API路由');
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message);
    console.error('\n🔧 可能的解决方案:');
    console.error('   1. 检查数据库连接配置');
    console.error('   2. 确保数据库服务正在运行');
    console.error('   3. 检查用户权限');
    console.error('   4. 查看详细错误信息');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

/**
 * 验证数据库结构
 */
async function validateDatabase() {
  console.log('🔍 验证数据库结构...');
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 检查所有必需的表
    const requiredTables = [
      'users', 'permission_modules', 'page_permissions',
      'departments', 'user_departments', 'department_page_permissions'
    ];
    
    const existingTables = await checkTables(connection);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`❌ 缺少表: ${missingTables.join(', ')}`);
      return false;
    }
    
    // 检查数据完整性
    const stats = await getDataStats(connection);
    console.log('✅ 数据库结构验证通过');
    console.log('📊 数据统计:');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} 条记录`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ 数据库验证失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 命令行参数处理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate') || args.includes('-v')) {
    validateDatabase();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('App权限管理数据库初始化脚本');
    console.log('\n用法:');
    console.log('  node scripts/init_app_permissions.js          # 初始化数据库');
    console.log('  node scripts/init_app_permissions.js -v       # 验证数据库结构');
    console.log('  node scripts/init_app_permissions.js --help   # 显示帮助');
    console.log('\n环境变量:');
    console.log('  DB_HOST      数据库主机 (默认: localhost)');
    console.log('  DB_PORT      数据库端口 (默认: 3306)');
    console.log('  DB_USER      数据库用户 (默认: root)');
    console.log('  DB_PASSWORD  数据库密码 (默认: 空)');
    console.log('  DB_NAME      数据库名称 (默认: zziot_permissions)');
  } else {
    initializeAppPermissions();
  }
}

module.exports = {
  initializeAppPermissions,
  validateDatabase,
  DB_CONFIG
};