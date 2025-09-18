const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_area_db',
    charset: 'utf8mb4',
    timezone: '+08:00'
};

let pool = null;

// 获取数据库连接池
async function getPool() {
    if (!pool) {
        try {
            console.log('正在连接数据库...', {
                host: config.host,
                port: config.port,
                user: config.user,
                database: config.database
            });
            
            pool = mysql.createPool({
                ...config,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log('数据库连接池创建成功');
        } catch (error) {
            console.error('数据库连接失败:', error.message);
            throw error;
        }
    }
    return pool;
}

// 测试数据库连接
async function testConnection() {
    try {
        const pool = await getPool();
        await pool.execute('SELECT 1 as test');
        console.log('MySQL数据库连接成功！');
        return true;
    } catch (error) {
        console.error('数据库连接失败:', error.message);
        console.log('请确保：');
        console.log('1. MySQL服务已启动');
        console.log('2. 数据库配置正确（检查.env文件）');
        console.log('3. 已执行db.sql文件创建数据库和表');
        return false;
    }
}

module.exports = {
    getPool,
    testConnection
};
