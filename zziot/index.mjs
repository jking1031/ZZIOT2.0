import express from 'express';
import mysql from 'mysql2';
import mysql2Promise from 'mysql2/promise';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 13100;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库连接配置
const dbConfig = {
  host: '112.28.56.235',
  port: 13307,
  user: 'root',
  password: '008027',
  database: 'nodered',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// 创建Promise连接池（用于文件上传服务）
const poolPromise = mysql2Promise.createPool(dbConfig);

// 测试数据库连接
pool.getConnection((err, connection) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('成功连接到MariaDB数据库');
  connection.release();
});

// 配置静态文件服务，使上传的文件可以通过/files路径访问
app.use('/files', express.static(path.join(__dirname, '../uploads')));

// ===== 文件上传相关功能 =====

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
};

// 创建上传目录及子目录
ensureDirectoryExists(uploadDir);
ensureDirectoryExists(path.join(uploadDir, 'reports_gt'));
ensureDirectoryExists(path.join(uploadDir, 'reports_5000'));
ensureDirectoryExists(path.join(uploadDir, 'laboratory'));
ensureDirectoryExists(path.join(uploadDir, 'default'));

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 从请求中获取文件夹名称，默认为'default'
    const folder = req.params.folder || 'default';
    const folderPath = path.join(uploadDir, folder);
    ensureDirectoryExists(folderPath);
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    // 使用原始文件名或生成新的文件名
    const filename = req.body.filename || `${Date.now()}_${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 限制文件大小为20MB
});

// 文件上传路由
app.post('/api/upload/:folder', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件被上传' });
    }

    const folder = req.params.folder || 'default';
    const { originalname } = req.file;
    const reportId = req.body.reportId || '';
    const userId = req.body.userId || ''; // 获取用户ID
    const username = req.body.username || ''; // 获取用户名	  
    const filename = req.file.filename;
    
    // 构建文件URL
    const baseUrl = 'https://zziot.jzz77.cn:9003/files';
    const fileUrl = `${baseUrl}/${folder}/${filename}`;
    
    // 将文件信息保存到数据库
    try {
      const connection = await poolPromise.getConnection();
      try {
        await connection.execute(
          'INSERT INTO files (filename, original_name, folder, report_id, file_url, upload_date,user_id,username) VALUES (?, ?, ?, ?, ?, NOW(),?,?)',
          [filename, originalname, folder, reportId, fileUrl,userId, username]
        );
        console.log('File info saved to database');
      } finally {
        connection.release();
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // 即使数据库操作失败，也继续返回文件URL
    }
    
    // 返回成功响应
    res.status(201).json({
      status: 'success',
      message: '文件上传成功',
      filename,
      originalName: originalname,
      fileUrl,
      baseUrl
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ error: '文件上传失败', details: error.message });
  }
});

// 获取文件列表路由
app.get('/api/files/:folder', async (req, res) => {
  try {
    const folder = req.params.folder || 'default';
    const reportId = req.query.reportId || '';
    const folderPath = path.join(uploadDir, folder);
    const userId = req.query.userId || ''; // 获取用户ID参数
    
    // 确保目录存在
    ensureDirectoryExists(folderPath);
    
    // 从数据库获取文件列表
    let files = [];
    try {
      const connection = await poolPromise.getConnection();
      try {
        let query = 'SELECT * FROM files WHERE folder = ?';
        const queryParams = [folder];
        
        if (reportId) {
          query += ' AND report_id = ?';
          queryParams.push(reportId);
        }
        // 添加用户ID过滤条件
        if (userId) {
          query += ' AND user_id = ?';
          queryParams.push(userId);
        }
        
        query += ' ORDER BY upload_date DESC';
        
        const [rows] = await connection.execute(query, queryParams);
        files = rows.map(file => ({
          filename: file.filename,
          originalName: file.original_name,
          url: file.file_url,
          uploadDate: file.upload_date,
          userId: file.user_id,
          username: file.username
        }));
      } finally {
        connection.release();
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // 如果数据库查询失败，尝试从文件系统读取
      if (fs.existsSync(folderPath)) {
        const fileNames = fs.readdirSync(folderPath);
        // 如果指定了用户ID，则只返回包含该用户ID的文件名
        files = fileNames
          .filter(filename => !userId || filename.includes(`USER_${userId}`))
          .map(filename => ({
            filename,
            originalName: filename,
            url: `https://zziot.jzz77.cn:9003/files/${folder}/${filename}`
          }));
      }
    }
    
    // 返回文件列表
    res.json({
      status: 'success',
      baseUrl: 'https://zziot.jzz77.cn:9003/files',
      folder,
      files
    });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ error: '获取文件列表失败', details: error.message });
  }
});

// 删除文件路由
app.delete('/api/files/:folder/:filename', async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const filePath = path.join(uploadDir, folder, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 从数据库删除文件记录
    try {
      const connection = await poolPromise.getConnection();
      try {
        await connection.execute('DELETE FROM files WHERE filename = ? AND folder = ?', [filename, folder]);
      } finally {
        connection.release();
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // 即使数据库操作失败，也继续删除文件
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    
    res.json({ status: 'success', message: '文件删除成功' });
  } catch (error) {
    console.error('删除文件错误:', error);
    res.status(500).json({ error: '删除文件失败', details: error.message });
  }
});

// ===== 用户认证相关功能 =====

// 注册接口
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, phone, department, company } = req.body;

    // 检查邮箱是否已存在
    const [existingUser] = await promisePool.query(
      'SELECT * FROM users.users1 WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 生成随机的avatar_seed
    const avatarSeed = Math.random().toString(36).substring(2, 15);

    // 插入新用户
    await promisePool.query(
      'INSERT INTO users.users1 (username, email, password, phone, department, company, avatar_seed, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [username, email, hashedPassword, phone, department, company, avatarSeed]
    );

    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登录接口
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const [users] = await promisePool.query(
      'SELECT * FROM users.users1 WHERE email = ? AND status = 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const user = users[0];

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        department: user.department,
        avatar_seed: user.avatar_seed,
        company: user.company
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户信息接口
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar_seed } = req.body;

    // 更新用户信息
    await promisePool.query(
      'UPDATE users.users1 SET avatar_seed = ? WHERE id = ?',
      [avatar_seed, id]
    );

    // 获取更新后的用户信息
    const [users] = await promisePool.query('SELECT * FROM users.users1 WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const updatedUser = users[0];
    res.json({
      message: '更新成功',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        department: updatedUser.department,
        avatar_seed: updatedUser.avatar_seed,
        company: updatedUser.company
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ===== 报告相关功能 =====

// 添加日报提交接口
app.post('/api/reports', async (req, res) => {
  try {
    console.log('=== /submit_report API 调用开始 ===');
    console.log('接收到的日报数据:', JSON.stringify(req.body, null, 2));
    const {
      date, operator, inflow, outflow, in_quality, out_quality, water_quality_anomalies,
      equipment_status, equipment_issues, carbon_source, phosphorus_removal, disinfectant,
      chemical_effect, sludge_quantity, other_notes, report_id, imagesurl, created_at
    } = req.body;

    // 构建SQL查询
    const query = `
      INSERT INTO nodered.daily_report (
        date, operator, inflow, outflow, in_quality, out_quality, water_quality_anomalies,
        equipment_status, equipment_issues, carbon_source, phosphorus_removal, disinfectant,
        chemical_effect, sludge_quantity, other_notes, report_id, imagesurl, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    console.log('生成的SQL查询:', query);
    console.log('插入参数:', [date, operator, inflow, outflow]);

    // 执行SQL插入操作
    const [result] = await promisePool.query(query, [
      date, operator, inflow, outflow, in_quality, out_quality, water_quality_anomalies,
      equipment_status, equipment_issues, carbon_source, phosphorus_removal, disinfectant,
      chemical_effect, sludge_quantity, other_notes, report_id, imagesurl, created_at
    ]);

    console.log('日报数据插入成功，ID:', result.insertId);
    console.log('=== /submit_report API 调用结束 ===');
    res.status(201).json({ message: '日报数据已成功提交', reportId: result.insertId });

  } catch (error) {
    console.error('报告提交失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 日报查询接口
app.get('/api/reports', async (req, res) => {
  try {
    console.log('=== /api/reports 查询接口调用开始 ===');
    const { startDate, endDate } = req.query;

    // 验证日期参数
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始和结束日期' });
    }

    console.log('查询参数:', { startDate, endDate });

    // 构建查询SQL
    const query = `
      SELECT * FROM nodered.daily_report
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC
    `;

    // 执行查询
    const [reports] = await promisePool.query(query, [startDate, endDate]);
    
    console.log(`查询到 ${reports.length} 条日报记录`);
    console.log('=== /api/reports 查询接口调用结束 ===');
    
    res.json(reports);
  } catch (error) {
    console.error('日报查询失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ===== 实验室数据相关功能 =====

// 实验室数据提交接口
app.post('/submit', (req, res) => {
    console.log('=== /submit API 调用开始 ===');
    console.log('接收到的提交数据:', JSON.stringify(req.body, null, 2));
    const { dbName, tableName, samples } = req.body;

    // 确保 samples 是一个对象数组
    if (!Array.isArray(samples) || samples.length === 0) {
        console.error('无效的samples格式或为空');
        return res.status(400).json({ error: 'Invalid samples format or empty' });
    }

    const insertPromises = samples.map(sample => {
        const { sampleName, cod, nh3, tn, tp, ph, ss, sw, testDate } = sample;
        
        // 如果没有填写 sampleName 或 testDate，返回错误
        if (!sampleName || !testDate) {
            console.error('缺少必要字段:', { sampleName, testDate });
            return Promise.reject({ error: 'Sample name and test date are required' });
        }

        // 处理 null 值：如果某些字段是 undefined 或空字符串，则设为 null
        const values = [
            sampleName || null,
            cod || null,
            nh3 || null,
            tp || null,
            tn || null,
            ss || null,
            ph || null,
            sw || null,
            testDate || null
        ];

        const query = `INSERT INTO ${dbName}.${tableName} (sample_name, cod, nh3, tp, tn, ss, ph, sw, time) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        console.log('执行插入查询:', query);
        console.log('插入值:', values);

        return new Promise((resolve, reject) => {
            pool.query(query, values, (err, result) => {
                if (err) {
                    console.error('插入错误:', err);
                    reject({ error: 'Database insert error' });
                } else {
                    console.log('插入成功，ID:', result.insertId);
                    resolve(result.insertId);
                }
            });
        });
    });

    // 批量插入所有数据
    Promise.all(insertPromises)
        .then(insertIds => {
            console.log('所有数据插入成功，插入ID:', insertIds);
            console.log('=== /submit API 调用结束 ===');
            res.json({ message: '数据提交成功，请刷新页面', insertIds });
        })
        .catch(err => {
            console.error('数据插入失败:', err);
            res.status(500).json(err);
        });
});

// ===== AO池数据相关功能 =====

// AO池数据提交接口
app.post('/submit_ao', (req, res) => {
    console.log('=== /submit_ao API 调用开始 ===');
    console.log('接收到的AO池数据:', JSON.stringify(req.body, null, 2));
    const { tableName, aoData } = req.body;

    if (!aoData || aoData.length === 0) {
        console.error('未提供AO池数据');
        return res.status(400).json({ message: 'No AO data provided.' });
    }

    const insertPromises = [];
    console.log('开始处理AO池数据插入...');

    aoData.forEach(ao => {
        ao.pools.forEach(poolInfo => {
            const promise = new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                    if (err) {
                        console.error('数据库连接错误:', err);
                        return reject(err);
                    }

                    const sql = `INSERT INTO ${tableName} (aoName, poolName, doValue) VALUES (?, ?,?)`;
                    console.log('执行SQL:', sql);
                    console.log('参数值:', [ao.aoName, poolInfo.poolName, poolInfo.do]);

                    connection.query(
                        sql, 
                        [ao.aoName, poolInfo.poolName, poolInfo.do],
                        (err, result) => {
                            connection.release();
                            if (err) {
                                console.error('数据库查询错误:', err);
                                return reject(err);
                            }
                            console.log('插入成功，ID:', result.insertId);
                            resolve(result);
                        }
                    );
                });
            });
            insertPromises.push(promise);
        });
    });

    Promise.all(insertPromises)
        .then(() => {
            console.log('所有AO池数据插入成功');
            console.log('=== /submit_ao API 调用结束 ===');
            res.json({ message: 'AO池数据提交成功！' });
        })
        .catch(err => {
            console.error('插入数据时发生错误:', err);
            res.status(500).json({ message: '数据提交失败' });
        });
});

// 获取AO池子池数据接口
app.get('/api/sub-pools', (req, res) => {
    console.log('=== /api/sub-pools API 调用开始 ===');
    console.log('请求参数:', JSON.stringify(req.query, null, 2));
    const { aoName, startDate, endDate } = req.query;

    // 参数验证
    if (!aoName) {
        console.error('缺少必要参数: aoName');
        return res.status(400).json({ error: '缺少必要参数: aoName' });
    }

    // 构建基础SQL
    let baseQuery = `
        SELECT p.aoName, p.poolName, p.doValue, p.submit_time
        FROM ao_data p
        WHERE p.aoName = ?
    `;

    // 参数绑定
    const params = [aoName];

    // 处理日期过滤
    if (startDate && endDate) {
        baseQuery += ' AND DATE(p.submit_time) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (startDate) {
        baseQuery += ' AND DATE(p.submit_time) >= ?';
        params.push(startDate);
    } else if (endDate) {
        baseQuery += ' AND DATE(p.submit_time) <= ?';
        params.push(endDate);
    }

    // 添加排序条件
    baseQuery += ' ORDER BY p.submit_time DESC, p.poolName';

    console.log('生成的SQL查询:', baseQuery);
    console.log('查询参数:', params);

    // 执行查询
    pool.query(baseQuery, params, (err, results) => {
        if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({
                error: '数据获取失败',
                details: err.message
            });
        }

        console.log('查询结果数量:', results.length);
        console.log('查询结果示例:', results.slice(0, 2));

        // 优化数据格式化
        const formatted = results.map(item => ({
            aoName: item.aoName,
            poolName: item.poolName,
            doValue: Number(item.doValue),
            submit_time: item.submit_time
        }));

        console.log('=== /api/sub-pools API 调用结束 ===');
        res.json(formatted);
    });
});

// 获取AO池列表接口
app.get('/api/ao-pools', (req, res) => {
    console.log('=== /api/ao-pools API 调用开始 ===');
    const query = `
        SELECT DISTINCT aoName 
        FROM nodered.ao_data 
        ORDER BY aoName 
    `;
    console.log('生成的SQL查询:', query);

    pool.query(query, (err, results) => {
        if (err) {
            console.error('数据库错误:', err);
            return res.status(500).json({
                error: '获取AO池列表失败',
                details: err.message
            });
        }

        console.log('查询结果数量:', results.length);
        console.log('查询结果:', results.map(r => r.aoName));
        console.log('=== /api/ao-pools API 调用结束 ===');
        res.json(results.map(r => r.aoName));
    });
});

// ===== 数据查询相关功能 =====

// 辅助函数：获取表字段
const getTableFields = (tableName, callback) => {
    const query = `SHOW COLUMNS FROM ${tableName}`;
    pool.query(query, (err, results) => {
        if (err) return callback(err);
        const fields = results
            .map(row => row.Field)
            .filter(field => field !== 'id'); // 排除id字段
        callback(null, fields);
    });
};

// 数据查询接口
app.get('/api/query-data/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { startDate, endDate, interval = '1hour' } = req.query;

    // 验证表名是否存在
    const [tables] = await promisePool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = "nodered" AND table_name = ?',
      [tableName]
    );

    if (tables.length === 0) {
      return res.status(404).json({ message: '表不存在' });
    }

    // 根据时间间隔设置分组时间单位
    let timeFormat;
    switch (interval) {
      case '1min':
        timeFormat = '%Y-%m-%d %H:%i:00';
        break;
      case '30min':
        timeFormat = '%Y-%m-%d %H:%i:00';
        break;
      case '2hour':
        timeFormat = '%Y-%m-%d %H:00:00';
        break;
      case '1hour':
      default:
        timeFormat = '%Y-%m-%d %H:00:00';
        break;
    }

    // 构建查询SQL
    let query = `
      SELECT *
      FROM nodered.${tableName}
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND time BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 根据时间间隔筛选数据
    if (interval === '30min') {
      query += ' AND MINUTE(time) % 30 = 0';
    } else if (interval === '1hour') {
      query += ' AND MINUTE(time) = 0';
    } else if (interval === '2hour') {
      query += ' AND HOUR(time) % 2 = 0 AND MINUTE(time) = 0';
    }

    query += ' ORDER BY time DESC';

    // 执行查询
    const [results] = await promisePool.query(query, params);
    res.json(results);

  } catch (error) {
    console.error('数据查询失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 查询接口
app.post('/query', (req, res) => {
    console.log('=== /query API 调用开始 ===');
    console.log('请求参数:', JSON.stringify(req.body, null, 2));
    const { tableName, queryType, startDate, endDate } = req.body;

    if (queryType === 'daily_avg') {
        console.log('执行日平均值查询');
        getTableFields(tableName, (err, fields) => {
            if (err) {
                console.error('获取字段失败:', err);
                return res.status(500).send('Error fetching fields');
            }
            console.log('获取到的字段:', fields);

            // 动态生成日平均值查询语句，别名与字段名相同
            const avgFields = fields.map(field => `AVG(${field}) AS ${field}`).join(', ');
            const query = `SELECT DATE(time) AS day, ${avgFields}
                           FROM ${tableName} 
                           WHERE time >= ? AND time <= ? 
                           GROUP BY day 
                           ORDER BY day`;

            console.log('生成的SQL查询:', query);
            console.log('查询参数:', [startDate, endDate]);

            pool.query(query, [startDate, endDate], (err, results) => {
                if (err) {
                    console.error('查询错误:', err);
                    return res.status(500).send(err);
                }
                console.log('查询结果数量:', results.length);
                console.log('查询结果示例:', results.slice(0, 2));
                console.log('=== /query API 调用结束 ===');
                res.json(results);
            });
        });

    } else if (queryType === 'raw') {
        console.log('执行原始数据查询');
        // 查询原始数据
        const query = `SELECT * FROM ${tableName} WHERE time >= ? AND time <= ?`;

        console.log('生成的SQL查询:', query);
        console.log('查询参数:', [startDate, endDate]);

        pool.query(query, [startDate, endDate], (err, results) => {
            if (err) {
                console.error('查询错误:', err);
                return res.status(500).send(err);
            }
            console.log('查询结果数量:', results.length);
            console.log('查询结果示例:', results.slice(0, 2));
            console.log('=== /query API 调用结束 ===');
            res.json(results);
        });
    } else if (queryType === 'daily_23_59') {
        console.log('执行23:59数据查询');
        // 查询每日大于23点59分的数据
        const query = `SELECT *
                       FROM ${tableName} 
                       WHERE TIME(time) > '23:59:00' 
                       AND DATE(time) BETWEEN ? AND ? 
                       ORDER BY time`;

        console.log('生成的23:59查询SQL:', query);
        console.log('查询参数:', [startDate, endDate]);

        pool.query(query, [startDate, endDate], (err, results) => {
            if (err) {
                console.error('查询错误:', err);
                return res.status(500).send(err);
            }
            console.log('查询结果数量:', results.length);
            console.log('查询结果示例:', results.slice(0, 2));
            console.log('=== /query API 调用结束 ===');
            res.json(results);
        });
    } else {
        console.error('无效的查询类型:', queryType);
        return res.status(400).json({ error: 'Invalid queryType' });
    }
});

// ===== 消息相关功能 =====

// 获取消息接口
app.get('/api/messages', (req, res) => {
  // 查询数据库中所有消息
  const query = 'SELECT * FROM nodered.messages ORDER BY timestamp DESC LIMIT 50';  // 假设查询最新50条消息
  pool.query(query, (err, results) => {
    if (err) {
      console.error('数据库查询失败:', err);
      return res.status(500).json({ error: '获取消息失败' });
    }

    // 格式化消息数据
    const messages = results.map(msg => ({
      id: msg.id,
      type: msg.type,
      title: msg.title,
      content: msg.content,
      timestamp: msg.timestamp,
      read: msg.read || false
    }));

    res.json(messages);
  });
});

// ===== 碳源计算功能 =====

// 碳源计算接口
app.post('/api/calculateCarbon', (req, res) => {
    console.log('=== /api/calculateCarbon API 调用开始 ===');
    console.log('请求参数:', JSON.stringify(req.body, null, 2));
    try {
        const Q = parseFloat(req.body.flow);
        const C1 = parseFloat(req.body.influent_no3);
        const C2 = parseFloat(req.body.effluent_no3);
        const COD1 = parseFloat(req.body.influent_cod);
        const eta = parseFloat(req.body.cod_ratio) / 100;
        const carbon_type = req.body.carbon_source;
        const S = parseFloat(req.body.safety_factor) / 100;
        const cn_ratio = req.body.cn_ratio ? parseFloat(req.body.cn_ratio) : 4;

        console.log('解析后的参数:', {
            Q, C1, C2, COD1, eta, carbon_type, S, cn_ratio
        });

        if (carbon_type !== 'sodium_acetate') {
            throw new Error("只能使用液体乙酸钠作为碳源");
        }

        const user_cod_concentration = parseFloat(req.body.cod_concentration);
        if (isNaN(user_cod_concentration) || user_cod_concentration <= 0) {
            throw new Error("请输入有效的液体乙酸钠 COD 当量（mg/L）");
        }

        if (C1 < C2) {
            throw new Error("进水 NO₃⁻-N 浓度必须大于出水目标浓度");
        }

        // 计算过程
        const N_remove = (C1 - C2) * Q;
        const cod_total = N_remove * cn_ratio;
        const cod_available = COD1 * Q * eta;
        const cod_supplement = Math.max(cod_total - cod_available, 0);

        console.log('计算结果:', {
            N_remove,
            cod_total,
            cod_available,
            cod_supplement
        });

        let result;
        if (cod_supplement <= 0) {
            result = "无需投加碳源（进水 COD 已满足需求）";
        } else {
            const volume = (cod_supplement * 1000) / user_cod_concentration;
            const volume_with_safety = volume * (1 + S);
            result = `液体乙酸钠投加量: ${volume_with_safety.toFixed(2)} L/d`;
        }

        console.log('最终计算结果:', result);
        console.log('=== /api/calculateCarbon API 调用结束 ===');
        res.json({ success: true, result: result });
    } catch (err) {
        console.error('计算过程出错:', err.message);
        res.status(400).json({ success: false, error: err.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
