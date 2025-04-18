// 这是用于Node-RED的函数节点代码，用于处理泵站巡查报告提交并插入数据库
// 将此代码放入Node-RED的函数节点中

// 入口函数，处理HTTP POST请求
module.exports = function(msg) {
    // 获取请求体数据
    const reportData = msg.payload;
    
    // 数据验证
    if (!reportData || !reportData.report_date || !reportData.operator || !reportData.station_name) {
        msg.statusCode = 400;
        msg.payload = { error: "必填字段缺失", message: "日期、巡查员和泵站名称为必填项" };
        return msg;
    }
    
    // 构建SQL语句
    const sql = `
        INSERT INTO pump_station_reports (
            id, 
            report_date, 
            operator, 
            station_name, 
            pump_running_status, 
            pump_status, 
            electrical_status, 
            pump_tank_status, 
            abnormal_situations, 
            other_notes, 
            report_id, 
            imagesurl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            pump_running_status = VALUES(pump_running_status),
            pump_status = VALUES(pump_status),
            electrical_status = VALUES(electrical_status),
            pump_tank_status = VALUES(pump_tank_status),
            abnormal_situations = VALUES(abnormal_situations),
            other_notes = VALUES(other_notes),
            imagesurl = VALUES(imagesurl),
            updated_at = CURRENT_TIMESTAMP
    `;
    
    // 准备参数，确保所有参数都有值
    const params = [
        reportData.id || reportData.report_id || generateUniqueId(reportData),
        reportData.report_date,
        reportData.operator,
        reportData.station_name,
        reportData.pump_running_status || '',
        reportData.pump_status || '',
        reportData.electrical_status || '',
        reportData.pump_tank_status || '',
        reportData.abnormal_situations || '',
        reportData.other_notes || '',
        reportData.report_id || reportData.id || generateUniqueId(reportData),
        reportData.imagesurl || ''
    ];
    
    // 设置消息属性以供数据库节点使用
    msg.topic = sql;
    msg.params = params;
    
    // 添加日志记录
    node.log(`准备插入泵站巡查报告: ${reportData.station_name} - ${reportData.report_date}`);
    
    return msg;
};

// 用于检查报告是否存在的函数
// 注意：这个函数在HTTP GET请求中使用
function checkReportExists(msg) {
    const { report_date, operator, station_name } = msg.req.query;
    
    if (!report_date || !operator || !station_name) {
        msg.statusCode = 400;
        msg.payload = { error: "参数缺失", message: "需要提供report_date, operator和station_name参数" };
        return msg;
    }
    
    const sql = `
        SELECT id, report_date, operator, station_name 
        FROM pump_station_reports 
        WHERE report_date = ? AND operator = ? AND station_name = ? 
        LIMIT 1
    `;
    
    msg.topic = sql;
    msg.params = [report_date, operator, station_name];
    
    return msg;
}

// 用于获取泵站列表的函数
// 注意：这个函数在HTTP GET请求中使用
function getPumpStations(msg) {
    const sql = "SELECT id, name, location, status FROM pump_stations WHERE status = 'active'";
    msg.topic = sql;
    return msg;
}

// 生成唯一ID
function generateUniqueId(data) {
    const date = data.report_date || new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    return `PUMP_REPORT_${date}_${timestamp}`;
}

// 以下是Node-RED流程示例：
/*
[
    {
        "id": "pump_report_post",
        "type": "http in",
        "url": "/api/pumpreports",
        "method": "post",
        "upload": false,
        "swaggerDoc": "",
        "wires": [["pump_report_function"]]
    },
    {
        "id": "pump_report_function",
        "type": "function",
        "name": "处理泵站报告提交",
        "func": "// 此处放入上面的函数代码",
        "wires": [["mysql_insert"]]
    },
    {
        "id": "mysql_insert",
        "type": "mysql",
        "name": "插入数据库",
        "host": "localhost",
        "port": "3306",
        "db": "your_database",
        "wires": [["format_response"]]
    },
    {
        "id": "format_response",
        "type": "function",
        "name": "格式化响应",
        "func": "if (msg.payload.affectedRows > 0) {\n    msg.statusCode = 201;\n    msg.payload = {\n        id: msg.params[0],\n        message: '报告提交成功',\n        created_at: new Date()\n    };\n} else {\n    msg.statusCode = 500;\n    msg.payload = { error: '提交失败', message: '数据库操作失败' };\n}\nreturn msg;",
        "wires": [["http_response"]]
    },
    {
        "id": "http_response",
        "type": "http response",
        "name": "返回响应",
        "wires": []
    },
    {
        "id": "pump_stations_get",
        "type": "http in",
        "url": "/api/pumpstations",
        "method": "get",
        "wires": [["get_stations_function"]]
    },
    {
        "id": "get_stations_function",
        "type": "function",
        "name": "获取泵站列表",
        "func": "return getPumpStations(msg);",
        "wires": [["mysql_query"]]
    },
    {
        "id": "mysql_query",
        "type": "mysql",
        "name": "查询数据库",
        "host": "localhost",
        "port": "3306",
        "db": "your_database",
        "wires": [["http_response"]]
    },
    {
        "id": "check_report_get",
        "type": "http in",
        "url": "/api/pumpreports",
        "method": "get",
        "wires": [["check_report_function"]]
    },
    {
        "id": "check_report_function",
        "type": "function",
        "name": "检查报告是否存在",
        "func": "return checkReportExists(msg);",
        "wires": [["mysql_query"]]
    }
]
*/ 