const express = require('express');
const https = require('https');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

// 引入数据库相关模块
require('dotenv').config();
const { testConnection, getPool } = require('./config/database');
const dataService = require('./config/dataService');
const AuthService = require('./config/authService');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// SSL证书配置
let sslOptions = null;
try {
    const keyPath = process.env.SSL_KEY_PATH || './config/certs/key.pem';
    const certPath = process.env.SSL_CERT_PATH || './config/certs/cert.pem';
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        console.log('SSL证书加载成功');
    } else {
        console.warn('SSL证书文件不存在，将仅启用HTTP服务器');
        console.warn(`检查路径: ${keyPath}, ${certPath}`);
    }
} catch (error) {
    console.error('SSL证书加载失败:', error.message);
    console.warn('将仅启用HTTP服务器');
}

// HTTPS强制重定向中间件
app.use((req, res, next) => {
    // 检查是否启用强制HTTPS重定向且SSL证书可用
    if (process.env.HTTPS_FORCE_REDIRECT === 'true' && sslOptions && !req.secure && req.get('x-forwarded-proto') !== 'https') {
        const httpsUrl = `https://${req.get('host').replace(/:\d+/, '')}:${HTTPS_PORT}${req.originalUrl}`;
        console.log(`重定向到HTTPS: ${req.originalUrl} -> ${httpsUrl}`);
        return res.redirect(301, httpsUrl);
    }
    next();
});

// 会话配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: sslOptions && process.env.HTTPS_FORCE_REDIRECT === 'true', // 当HTTPS可用且强制重定向时启用secure cookies
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}));

// 安全中间件 - 防止URL重定向和路径穿越攻击
app.use((req, res, next) => {
    // 1. 防止URL重定向攻击 - 检查可疑的重定向字符
    const suspiciousRedirectPatterns = [
        /\\/,  // 反斜杠
        /%5c/i,  // URL编码的反斜杠
        /\/\/+/,  // 多个连续斜杠
        /%2f%2f/i,  // URL编码的双斜杠
        /%252f/i,  // 双URL编码的斜杠
        /https?:\/\//i,  // HTTP/HTTPS协议
        /ftp:\/\//i,  // FTP协议
        /javascript:/i,  // JavaScript协议
        /data:/i,  // Data协议
    ];

    // 检查请求路径是否包含可疑模式
    const requestPath = decodeURIComponent(req.path);
    for (const pattern of suspiciousRedirectPatterns) {
        if (pattern.test(requestPath) || pattern.test(req.originalUrl)) {
            console.warn(`可疑的URL重定向尝试: ${req.originalUrl} from IP: ${req.ip}`);
            return res.status(400).json({ 
                success: false, 
                message: '无效的请求路径' 
            });
        }
    }

    // 2. 防止路径穿越攻击
    const pathTraversalPatterns = [
        /\.\./,  // 父目录引用
        /%2e%2e/i,  // URL编码的..
        /\.\./,  // 相对路径
        /~+/,  // 波浪号
    ];

    for (const pattern of pathTraversalPatterns) {
        if (pattern.test(requestPath)) {
            console.warn(`可疑的路径穿越尝试: ${req.originalUrl} from IP: ${req.ip}`);
            return res.status(400).json({ 
                success: false, 
                message: '无效的请求路径' 
            });
        }
    }

    // 3. 限制请求路径长度（防止缓冲区溢出）
    if (req.originalUrl.length > 2048) {
        console.warn(`过长的URL请求: ${req.originalUrl.length} chars from IP: ${req.ip}`);
        return res.status(414).json({ 
            success: false, 
            message: 'URL过长' 
        });
    }

    next();
});

// 中间件配置
app.use(cors());
app.use(express.json());

// 认证中间件
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ success: false, message: '请先登录' });
        } else {
            return safeRedirect(res, '/login.html');
        }
    }
}

// 管理员权限中间件
function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ success: false, message: '需要管理员权限' });
        } else {
            return res.status(403).send('需要管理员权限');
        }
    }
}

// 基建中心或管理员权限中间件
function requireConstructionCenterOrAdmin(req, res, next) {
    if (req.session && req.session.user && 
        (req.session.user.role === 'admin' || req.session.user.role === 'construction_center')) {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ success: false, message: '需要基建中心或管理员权限' });
        } else {
            return res.status(403).send('需要基建中心或管理员权限');
        }
    }
}

// 静态文件服务（登录页面不需要认证）
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));
app.use(express.static('public', { 
    index: false,  // 禁用默认index文件服务
    dotfiles: 'deny',  // 拒绝访问点文件
    etag: false,  // 禁用ETag
    extensions: ['html', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot'],  // 只允许特定扩展名
    setHeaders: (res, filePath, stat) => {
        // 安全头设置
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // 确保路径在允许的目录内
        const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
        const publicPath = path.normalize(path.join(__dirname, 'public')).replace(/\\/g, '/');
        
        if (!normalizedPath.startsWith(publicPath)) {
            res.status(403).end();
            return;
        }
    }
}));

// 安全重定向函数 - 只允许重定向到安全的内部URL
function safeRedirect(res, url) {
    // 定义允许的重定向URL白名单
    const allowedUrls = [
        '/',
        '/login.html',
        '/#data-entry',
        '/#data-management', 
        '/#statistics',
        '/html/user-management.html',
        '/index.html'
    ];
    
    // 检查是否为相对URL且在白名单中
    if (url && allowedUrls.includes(url)) {
        return res.redirect(url);
    } else {
        console.warn(`阻止不安全的重定向尝试: ${url}`);
        return res.redirect('/');  // 默认重定向到首页
    }
}

// 认证相关路由
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 输入验证和清理
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }

        // 防止过长输入
        if (username.length > 50 || password.length > 200) {
            return res.status(400).json({ success: false, message: '输入长度超出限制' });
        }

        // 清理输入 - 移除潜在的危险字符
        const cleanUsername = username.trim().replace(/[<>'"`;]/g, '');
        
        if (cleanUsername !== username.trim()) {
            return res.status(400).json({ success: false, message: '用户名包含非法字符' });
        }

        const result = await AuthService.login(cleanUsername, password);
        
        if (result.success) {
            req.session.user = result.user;
            
            res.json({ success: true, message: result.message, user: result.user });
        } else {
            res.status(401).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('登录API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('登出错误:', err);
            return res.status(500).json({ success: false, message: '登出失败' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: '已成功登出' });
    });
});

app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            success: true, 
            isLoggedIn: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            success: true, 
            isLoggedIn: false 
        });
    }
});

// 用户管理相关路由（需要管理员权限）
app.post('/api/auth/create-user', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await AuthService.createUser(req.body);
        res.json(result);
    } catch (error) {
        console.error('创建用户API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
});

app.get('/api/auth/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await AuthService.getAllUsers();
        res.json(result);
    } catch (error) {
        console.error('获取用户列表API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
});

app.put('/api/auth/user/:id/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const result = await AuthService.updateUserStatus(req.params.id, status);
        res.json(result);
    } catch (error) {
        console.error('更新用户状态API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
});

app.delete('/api/auth/user/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await AuthService.deleteUser(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('删除用户API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
});

// 修改密码路由
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.session.user.id;
        
        const result = await AuthService.changePassword(userId, oldPassword, newPassword);
        res.json(result);
    } catch (error) {
        console.error('修改密码API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
});

// ========================================
// 标准管理API（仅管理员可访问）
// ========================================

// 获取当前测算标准配置
app.get('/api/calculation-standards', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = await getPool();
        
        // 获取基础面积标准（按院校类型和用房类型组织）
        const [basicRows] = await pool.execute(
            'SELECT school_type, room_type, standard_value FROM basic_area_standards WHERE is_active = 1'
        );
        
        // 获取补贴面积标准（三重索引结构）
        const [subsidizedRows] = await pool.execute(
            'SELECT school_type, room_type, subsidy_type, standard_value FROM subsidized_area_standards WHERE is_active = 1'
        );
        
        // 获取所有的院校类型（从实际数据中提取）
        const schoolTypeSet = new Set();
        basicRows.forEach(row => schoolTypeSet.add(row.school_type));
        subsidizedRows.forEach(row => schoolTypeSet.add(row.school_type));
        const schoolTypes = Array.from(schoolTypeSet).sort();
        
        // 组织基础标准数据（按院校类型和用房类型组织）
        const basicStandards = {};
        basicRows.forEach(row => {
            if (!basicStandards[row.school_type]) {
                basicStandards[row.school_type] = {};
            }
            basicStandards[row.school_type][row.room_type] = parseFloat(row.standard_value);
        });
        
        // 组织补贴标准数据（三重索引结构）
        const subsidizedStandards = {};
        subsidizedRows.forEach(row => {
            if (!subsidizedStandards[row.school_type]) {
                subsidizedStandards[row.school_type] = {};
            }
            if (!subsidizedStandards[row.school_type][row.room_type]) {
                subsidizedStandards[row.school_type][row.room_type] = {};
            }
            subsidizedStandards[row.school_type][row.room_type][row.subsidy_type] = parseFloat(row.standard_value);
        });
        
        // 组织院校类型列表
        const schoolMapping = {};
        schoolTypes.forEach(type => {
            schoolMapping[type] = type; // 直接映射，不再需要转换
        });
        
        res.json({
            success: true,
            basicStandards,
            subsidizedStandards,
            schoolMapping,
            schoolTypes  // 添加院校类型列表
        });
    } catch (error) {
        console.error('获取测算标准失败:', error);
        res.status(500).json({ success: false, message: '获取测算标准失败' });
    }
});

// 测试端点 - 不需要认证
app.get('/api/test-standards', async (req, res) => {
    try {
        const pool = await getPool();
        
        // 获取基础面积标准
        const [basicRows] = await pool.execute(
            'SELECT school_type, room_type, standard_value FROM basic_area_standards WHERE is_active = 1 LIMIT 10'
        );
        
        res.json({
            success: true,
            sampleData: basicRows,
            message: 'Test endpoint working'
        });
    } catch (error) {
        console.error('测试端点失败:', error);
        res.status(500).json({ success: false, message: '测试失败' });
    }
});

// 保存测算标准配置
app.post('/api/calculation-standards', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { basicStandards, subsidizedStandards, schoolMapping } = req.body;
        
        // 验证数据格式
        if (!basicStandards || !subsidizedStandards) {
            return res.status(400).json({ success: false, message: '标准配置数据不完整' });
        }
        
        const pool = await getPool();
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // 更新基础面积标准
            if (basicStandards) {
                for (const [roomType, value] of Object.entries(basicStandards)) {
                    await connection.execute(
                        `UPDATE basic_area_standards 
                         SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                         WHERE room_type = ?`,
                        [value, roomType]
                    );
                }
            }
            
            // 更新补贴面积标准（三重索引结构）
            if (subsidizedStandards) {
                for (const [schoolType, roomTypes] of Object.entries(subsidizedStandards)) {
                    for (const [roomType, subsidyTypes] of Object.entries(roomTypes)) {
                        for (const [subsidyType, value] of Object.entries(subsidyTypes)) {
                            await connection.execute(
                                `UPDATE subsidized_area_standards 
                                 SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                                 WHERE school_type = ? AND room_type = ? AND subsidy_type = ?`,
                                [value, schoolType, roomType, subsidyType]
                            );
                        }
                    }
                }
            }
            
            await connection.commit();
            
            // 重新加载动态标准数据以保持数据同步
            await loadCalculationStandards();
            
            res.json({
                success: true,
                message: '测算标准配置保存成功'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('保存测算标准失败:', error);
        res.status(500).json({ success: false, message: '保存测算标准失败' });
    }
});

// 更新单个标准值
app.put('/api/calculation-standards/single', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { type, schoolType, roomType, subsidyType, value } = req.body;
        
        if (!type || !roomType || value === undefined) {
            return res.status(400).json({ success: false, message: '参数不完整' });
        }
        
        const pool = await getPool();
        
        if (type === 'basic') {
            // 更新基础面积标准 - 确保只更新指定学校类型的标准
            if (!schoolType) {
                return res.status(400).json({ success: false, message: '学校类型不能为空' });
            }
            
            await pool.execute(
                `UPDATE basic_area_standards 
                 SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE school_type = ? AND room_type = ?`,
                [value, schoolType, roomType]
            );
            
        } else if (type === 'subsidized') {
            // 更新补贴面积标准（三重索引）
            if (!schoolType || !subsidyType) {
                return res.status(400).json({ success: false, message: '院校类型和补贴类型不能为空' });
            }
            
            await pool.execute(
                `UPDATE subsidized_area_standards 
                 SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE school_type = ? AND room_type = ? AND subsidy_type = ?`,
                [value, schoolType, roomType, subsidyType]
            );
        }
        
        // 重新加载动态标准数据以保持数据同步
        await loadCalculationStandards();
        
        res.json({
            success: true,
            message: '标准值更新成功'
        });
    } catch (error) {
        console.error('更新标准值失败:', error);
        res.status(500).json({ success: false, message: '更新标准值失败' });
    }
});

// 获取学校类型映射
app.get('/api/school-mappings', requireAuth, requireAdmin, (req, res) => {
    try {
        res.json({
            success: true,
            mappings: SCHOOL_NAME_TO_TYPE
        });
    } catch (error) {
        console.error('获取学校映射失败:', error);
        res.status(500).json({ success: false, message: '获取学校映射失败' });
    }
});

// 更新学校类型映射
app.post('/api/school-mappings', requireAuth, requireAdmin, (req, res) => {
    try {
        const { mappings } = req.body;
        
        if (!mappings || typeof mappings !== 'object') {
            return res.status(400).json({ success: false, message: '映射数据格式错误' });
        }
        
        // 更新学校映射
        Object.assign(SCHOOL_NAME_TO_TYPE, mappings);
        
        // 记录变更历史
        const changeRecord = {
            changeTime: new Date().toISOString(),
            changeUser: req.session.user.username,
            changeType: '学校映射更新',
            changeDescription: '更新了学校类型映射配置',
            changeDetails: { mappings }
        };
        
        // TODO: 将变更记录保存到数据库
        
        res.json({
            success: true,
            message: '学校类型映射更新成功'
        });
    } catch (error) {
        console.error('更新学校映射失败:', error);
        res.status(500).json({ success: false, message: '更新学校映射失败' });
    }
});

// 重新加载院校类型映射
app.post('/api/reload-school-type-mapping', requireAuth, requireAdmin, async (req, res) => {
    try {
        // 清除缓存
        SCHOOL_TYPE_CACHE = null;
        
        // 重新加载映射
        await loadSchoolTypeMapping();
        
        res.json({
            success: true,
            message: '院校类型映射重新加载成功'
        });
    } catch (error) {
        console.error('重新加载院校类型映射失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '重新加载院校类型映射失败',
            error: error.message 
        });
    }
});

// 获取标准变更历史
app.get('/api/standards-history', requireAuth, requireAdmin, async (req, res) => {
    try {
        // TODO: 从数据库获取变更历史
        // 目前返回空数组
        const history = [];
        
        res.json({
            success: true,
            history: history
        });
    } catch (error) {
        console.error('获取变更历史失败:', error);
        res.status(500).json({ success: false, message: '获取变更历史失败' });
    }
});

// 主页路由 - 需要认证
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 功能页面路由重定向到主页面的相应部分
app.get('/html/data-entry.html', requireAuth, (req, res) => {
    safeRedirect(res, '/#data-entry');
});

app.get('/html/data-management.html', requireAuth, (req, res) => {
    safeRedirect(res, '/#data-management');
});

// 统计页面 - 需要基建中心或管理员权限
app.get('/html/statistics.html', requireAuth, requireConstructionCenterOrAdmin, (req, res) => {
    safeRedirect(res, '/#statistics');
});

// 用户管理页面 - 保持独立页面
app.get('/html/user-management.html', requireAuth, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'user-management.html'));
});

// 兼容旧的用户管理路由
app.get('/user-management.html', requireAuth, requireAdmin, (req, res) => {
    safeRedirect(res, '/html/user-management.html');
});

// 保护其他需要认证的路由
app.use('/api', requireAuth);

// 创建output文件夹（如果不存在）
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// 格式化面积数据为两位小数（强制显示两位小数）
function formatAreaToTwoDecimals(value) {
    // 处理 null、undefined、空字符串等情况
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    
    // 转换为数字
    const numValue = parseFloat(value);
    
    // 如果转换失败（NaN），返回 0.00
    if (isNaN(numValue)) {
        return '0.00';
    }
    
    // 返回两位小数格式
    return numValue.toFixed(2);
}

// 清理院校类别前缀
function cleanSchoolType(schoolType) {
    if (!schoolType) return '';
    
    let cleanType = schoolType.toString();
    
    // 移除可能存在的前缀
    if (cleanType.includes('院校类别：')) {
        cleanType = cleanType.replace('院校类别：', '');
    }
    if (cleanType.includes('院校类别: ')) {
        cleanType = cleanType.replace('院校类别: ', '');
    }
    if (cleanType.includes('院校类型：')) {
        cleanType = cleanType.replace('院校类型：', '');
    }
    if (cleanType.includes('院校类型: ')) {
        cleanType = cleanType.replace('院校类型: ', '');
    }
    
    return cleanType.trim();
}

// 清理临时文件功能
function cleanupOldFiles() {
    try {
        const files = fs.readdirSync(outputDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时，单位：毫秒
        
        let deletedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(outputDir, file);
            const stats = fs.statSync(filePath);
            
            // 如果文件超过24小时就删除
            if (now - stats.mtime.getTime() > maxAge) {
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`删除过期文件: ${file}`);
                } catch (error) {
                    console.error(`删除文件失败 ${file}:`, error.message);
                }
            }
        });
        
        if (deletedCount > 0) {
            console.log(`清理完成，共删除 ${deletedCount} 个过期文件`);
        }
    } catch (error) {
        console.error('清理临时文件时出错:', error.message);
    }
}

// 立即执行一次清理
cleanupOldFiles();

// 设置定时清理：每2小时执行一次
setInterval(cleanupOldFiles, 2 * 60 * 60 * 1000);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 数据库状态检查端点
app.get('/api/database/status', (req, res) => {
    try {
        // 检查数据库连接是否正常
        if (dataService && dataService.testConnection) {
            dataService.testConnection()
                .then(() => {
                    res.json({ 
                        success: true, 
                        status: 'connected', 
                        timestamp: new Date().toISOString() 
                    });
                })
                .catch(error => {
                    console.error('数据库连接测试失败:', error);
                    res.json({ 
                        success: false, 
                        status: 'disconnected', 
                        error: error.message,
                        timestamp: new Date().toISOString() 
                    });
                });
        } else {
            res.json({ 
                success: true, 
                status: 'unknown', 
                message: '数据库服务状态未知',
                timestamp: new Date().toISOString() 
            });
        }
    } catch (error) {
        console.error('数据库状态检查出错:', error);
        res.status(500).json({ 
            success: false, 
            status: 'error', 
            error: error.message,
            timestamp: new Date().toISOString() 
        });
    }
});

// 在线计算路由
app.post('/online-calculate', requireAuth, async (req, res) => {
    try {
        const { schoolData, specialSubsidies } = req.body;
        
        if (!schoolData) {
            return res.status(400).json({ error: '缺少学校数据' });
        }
        
        // 计算建筑面积缺口
        const analysisResult = await calculateBuildingAreaGap(schoolData, specialSubsidies || []);
        
        // 根据学校名称获取院校类型
        const schoolName = schoolData['学校名称'];
        const schoolType = SCHOOL_NAME_TO_TYPE[schoolName] || '未指定';
        
        // 添加处理时间和来源信息
        const processedSchoolData = {
            ...schoolData,
            ...analysisResult,
            '来源方式': '在线填写',
            '处理时间': new Date().toLocaleString('zh-CN'),
            '特殊补助记录数': specialSubsidies ? specialSubsidies.length : 0,
            '院校类别': schoolType,  // 添加院校类型信息
            // 确保包含显示所需的字段
            '现有其他生活用房面积': analysisResult['现有其他生活用房面积（计算）'] || 0,
            '年份': schoolData['年份'] || new Date().getFullYear()
        };
        
        // 保存数据到数据库
        try {
            console.log('开始保存数据到数据库...');
            const submitterUsername = req.session?.user?.username || 'anonymous';
            const submitterRealName = req.session?.user?.real_name || submitterUsername;
            const schoolInfoId = await dataService.saveSchoolInfo(schoolData, specialSubsidies, analysisResult, submitterUsername);
            console.log('数据保存成功，学校ID:', schoolInfoId);
            
            // 在响应中添加数据库保存信息
            processedSchoolData['数据库记录ID'] = schoolInfoId;
            processedSchoolData['填报单位'] = submitterRealName || submitterUsername;
        } catch (dbError) {
            console.error('数据库保存失败:', dbError);
            // 数据库保存失败不影响计算结果返回，只记录错误
            processedSchoolData['数据库状态'] = '保存失败: ' + dbError.message;
        }
        
        res.json({
            success: true,
            schoolData: processedSchoolData,
            analysisResult: analysisResult,
            message: '在线计算完成'
        });
        
    } catch (error) {
        console.error('在线计算时出错:', error);
        res.status(500).json({ error: '在线计算时出错: ' + error.message });
    }
});

// 在线计算结果下载路由
app.post('/online-download', (req, res) => {
    try {
        const { processedSchoolData, schoolData, analysisResult } = req.body;
        
        // 支持两种参数格式：新格式 processedSchoolData 和旧格式 schoolData
        let calculationData;
        if (processedSchoolData && Array.isArray(processedSchoolData)) {
            calculationData = processedSchoolData[0]; // 取数组第一个元素
        } else if (schoolData) {
            calculationData = schoolData;
        } else {
            return res.status(400).json({ error: '缺少计算结果数据' });
        }
        
        console.log('下载请求参数:', { hasProcessedSchoolData: !!processedSchoolData, hasSchoolData: !!schoolData });
        console.log('使用的计算数据包含填报单位:', calculationData['填报单位']);
        
        // 生成Excel文件
        const timestamp = Date.now();
        const schoolName = calculationData['学校名称'] || '在线计算';
        const year = calculationData['年份'] || new Date().getFullYear();
        
        // 生成时间戳字符串
        const now = new Date();
        const timeStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0') + 
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');
        
        // 统一文件名格式
        const fileName = `${schoolName}${year}年测算结果${timeStr}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        
        console.log('生成Excel文件:', fileName);
        console.log('文件路径:', filePath);
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建与图片格式一致的测算结果表
        const calcYear = calculationData['年份'] || new Date().getFullYear();
        const submitterUser = calculationData['填报单位'] || '未知用户';
        
        const data = [
            ['高校测算'],
            ['基本办学条件缺口（＞0表示存在缺口）', '', '', ''],
            ['', '', '', `测算时间：${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}`],
            ['测算年份', calcYear, '测算用户', submitterUser],
            [`单位/学校(机构)名称(章)`, calculationData['学校名称'] || '', '院校类型', cleanSchoolType(calculationData['院校类别'] || '')],
            ['', '', '', ''],
            ['规划学生数', '', '', ''],
            ['专科全日制学生数(人)', calculationData['全日制专科生人数'] || 0, '本科全日制学生数(人)', calculationData['全日制本科生人数'] || 0],
            ['硕士全日制学生数(人)', calculationData['全日制硕士生人数'] || 0, '博士全日制学生数(人)', calculationData['全日制博士生人数'] || 0],
            ['本科留学生数(人)', calculationData['留学生本科生人数'] || 0, '硕士留学生数(人)', calculationData['留学生硕士生人数'] || 0],
            ['博士留学生(人)', calculationData['留学生博士生人数'] || 0, '', ''],
            ['', '', '', ''],
            ['测算结果', '', '', ''],
            ['用房类型', '现状建筑面积(m²)', '测算建筑面积(m²)', '测算建筑面积缺额(m²)'],
            ['教学及辅助用房', formatAreaToTwoDecimals(calculationData['现有教学及辅助用房面积']), formatAreaToTwoDecimals(calculationData['总应配教学及辅助用房(A)']), formatAreaToTwoDecimals(calculationData['教学及辅助用房缺口(A)'])],
            ['办公用房', formatAreaToTwoDecimals(calculationData['现有办公用房面积']), formatAreaToTwoDecimals(calculationData['总应配办公用房(B)']), formatAreaToTwoDecimals(calculationData['办公用房缺口(B)'])],
            ['生活配套用房', formatAreaToTwoDecimals(calculationData['现有生活用房总面积']), formatAreaToTwoDecimals((calculationData['总应配学生宿舍(C1)'] || 0) + (calculationData['总应配其他生活用房(C2)'] || 0)), formatAreaToTwoDecimals((calculationData['学生宿舍缺口(C1)'] || 0) + (calculationData['其他生活用房缺口(C2)'] || 0))],
            ['其中:学生宿舍', formatAreaToTwoDecimals(calculationData['现有学生宿舍面积']), formatAreaToTwoDecimals(calculationData['总应配学生宿舍(C1)']), formatAreaToTwoDecimals(calculationData['学生宿舍缺口(C1)'])],
            ['其中:其他生活用房', formatAreaToTwoDecimals(calculationData['现有其他生活用房面积']), formatAreaToTwoDecimals(calculationData['总应配其他生活用房(C2)']), formatAreaToTwoDecimals(calculationData['其他生活用房缺口(C2)'])],
            ['后勤补助用房', formatAreaToTwoDecimals(calculationData['现有后勤辅助用房面积']), formatAreaToTwoDecimals(calculationData['总应配后勤辅助用房(D)']), formatAreaToTwoDecimals(calculationData['后勤辅助用房缺口(D)'])],
            ['小计', formatAreaToTwoDecimals((calculationData['现有教学及辅助用房面积'] || 0) + (calculationData['现有办公用房面积'] || 0) + (calculationData['现有生活用房总面积'] || 0) + (calculationData['现有后勤辅助用房面积'] || 0)), formatAreaToTwoDecimals((calculationData['总应配教学及辅助用房(A)'] || 0) + (calculationData['总应配办公用房(B)'] || 0) + (calculationData['总应配学生宿舍(C1)'] || 0) + (calculationData['总应配其他生活用房(C2)'] || 0) + (calculationData['总应配后勤辅助用房(D)'] || 0)), formatAreaToTwoDecimals(calculationData['建筑面积总缺口（不含特殊补助）'])],
            ['测算建筑面积总缺额（不含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(calculationData['建筑面积总缺口（不含特殊补助）'])],
            ['特殊补助建筑总面积(m²)', '', '', formatAreaToTwoDecimals(calculationData['特殊补助总面积'])],
            ['测算建筑面积总缺额（含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(calculationData['建筑面积总缺口（含特殊补助）'])],
            ['备注', calculationData['备注'] || calculationData['remarks'] || '', '', '']
        ];
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 30 }, // 第一列
            { wch: 25 }, // 第二列  
            { wch: 30 }, // 第三列
            { wch: 25 }  // 第四列
        ];
        
        // 合并单元格
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // 标题行
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // 副标题行 - A2B2C2D2合并
            // 第4行（测算年份和测算用户）不需要合并，保持各自独立
            { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }, // A6B6C6D6合并为空
            { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } }, // A7B7C7D7合并并写入"规划学生数"
            { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }, // A12B12C12D12合并为空
            { s: { r: 21, c: 0 }, e: { r: 21, c: 2 } }, // A22B22C22合并 - 总缺额行
            { s: { r: 22, c: 0 }, e: { r: 22, c: 2 } }, // A23B23C23合并 - 补助面积行
            { s: { r: 23, c: 0 }, e: { r: 23, c: 2 } }, // A24B24C24合并 - 含补助总缺额行
            { s: { r: 24, c: 1 }, e: { r: 24, c: 3 } }  // A25的B25C25D25合并 - 备注内容
        ];
        
        ws['!merges'] = merges;
        
        // 定义边框样式
        const borderStyle = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
        };
        
        // 设置单元格样式
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                
                // 添加边框到所有单元格
                ws[cellAddress].s.border = borderStyle;
                
                // 设置对齐方式
                ws[cellAddress].s.alignment = { 
                    horizontal: 'center', 
                    vertical: 'center',
                    wrapText: true 
                };
                
                // 特殊行的样式设置
                if (R === 0) { // 主标题
                    ws[cellAddress].s.font = { bold: true, size: 16, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'E6E6FA' } 
                    };
                } else if (R === 1) { // 副标题行
                    ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F0F8FF' } 
                    };
                } else if (R === 7 || R === 13) { // 小标题行
                    ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F0F8FF' } 
                    };
                } else if (R === 14) { // 表头行
                    ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F5F5F5' } 
                    };
                } else if (R >= 15 && R <= 20) { // 数据行
                    ws[cellAddress].s.font = { size: 10 };
                    if (R % 2 === 0) {
                        ws[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'FAFAFA' } 
                        };
                    }
                } else if (R >= 21) { // 汇总行和备注行
                    ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'FFE4E1' } 
                    };
                    // 备注行的合并单元格内容左对齐
                    if (R === 24 && C > 0) { // 第25行（索引24）的备注内容
                        ws[cellAddress].s.alignment = { 
                            horizontal: 'left', 
                            vertical: 'center',
                            wrapText: true 
                        };
                    }
                }
            }
        }
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, "建筑规模测算结果");
        
        // 如果有特殊补助明细，创建特殊补助工作表
        if (calculationData['特殊补助明细'] && Array.isArray(calculationData['特殊补助明细']) && calculationData['特殊补助明细'].length > 0) {
            const subsidyData = [
                ['特殊补助明细'],
                [],
                ['补助项目名称', '补助面积(㎡)']
            ];
            
            calculationData['特殊补助明细'].forEach(item => {
                subsidyData.push([item.name || '', formatAreaToTwoDecimals(item.area)]);
            });
            
            const subsidyWs = XLSX.utils.aoa_to_sheet(subsidyData);
            subsidyWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
            
            // 合并标题
            subsidyWs['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
            ];
            
            // 为特殊补助工作表添加样式
            const subsidyRange = XLSX.utils.decode_range(subsidyWs['!ref']);
            for (let R = subsidyRange.s.r; R <= subsidyRange.e.r; ++R) {
                for (let C = subsidyRange.s.c; C <= subsidyRange.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!subsidyWs[cellAddress]) subsidyWs[cellAddress] = { t: 's', v: '' };
                    if (!subsidyWs[cellAddress].s) subsidyWs[cellAddress].s = {};
                    
                    // 添加边框
                    subsidyWs[cellAddress].s.border = {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    };
                    
                    // 设置对齐
                    subsidyWs[cellAddress].s.alignment = { 
                        horizontal: 'center', 
                        vertical: 'center',
                        wrapText: true 
                    };
                    
                    // 样式设置
                    if (R === 0) { // 标题行
                        subsidyWs[cellAddress].s.font = { bold: true, size: 14 };
                        subsidyWs[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'E6E6FA' } 
                        };
                    } else if (R === 2) { // 表头
                        subsidyWs[cellAddress].s.font = { bold: true, size: 11 };
                        subsidyWs[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'F5F5F5' } 
                        };
                    } else if (R > 2) { // 数据行
                        subsidyWs[cellAddress].s.font = { size: 10 };
                        if (R % 2 === 1) {
                            subsidyWs[cellAddress].s.fill = { 
                                patternType: 'solid', 
                                fgColor: { rgb: 'FAFAFA' } 
                            };
                        }
                    }
                }
            }
            
            XLSX.utils.book_append_sheet(wb, subsidyWs, "特殊补助明细");
        }
        
        // 写入文件
        XLSX.writeFile(wb, filePath);
        
        console.log('Excel文件生成成功');
        
        // 返回下载URL
        const downloadUrl = `/download/${fileName}`;
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            fileName: fileName,
            message: '报告生成成功'
        });
        
    } catch (error) {
        console.error('生成下载文件时出错:', error);
        res.status(500).json({ error: '生成下载文件时出错: ' + error.message });
    }
});

// 数据管理API路由

// ===========================================
// 学校数据API - 优化版本
// ===========================================

// 1. 获取所有学校基础信息列表
app.get('/api/schools/registry', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        const schools = await getSchoolRegistry();
        
        res.json({ 
            success: true, 
            data: schools,
            count: schools.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('获取学校注册表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校注册表失败',
            message: error.message 
        });
    }
});

// 2. 获取学校名称列表（用于下拉框）
app.get('/api/schools/names', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        const schools = await getSchoolRegistry();
        
        const schoolNames = schools.map(school => school.school_name).sort();
        
        res.json({ 
            success: true, 
            data: schoolNames,
            count: schoolNames.length 
        });
    } catch (error) {
        console.error('获取学校名称列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校名称列表失败',
            message: error.message 
        });
    }
});

// 3. 获取院校类型列表
app.get('/api/schools/types', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        const schools = await getSchoolRegistry();
        
        // 提取所有唯一的院校类型
        const schoolTypes = [...new Set(schools.map(school => school.school_type))].sort();
        
        // 统计每个类型的学校数量
        const typeStats = schoolTypes.map(type => {
            const count = schools.filter(school => school.school_type === type).length;
            return { type, count };
        });
        
        res.json({ 
            success: true, 
            data: {
                types: schoolTypes,
                statistics: typeStats,
                totalTypes: schoolTypes.length
            }
        });
    } catch (error) {
        console.error('获取院校类型列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取院校类型列表失败',
            message: error.message 
        });
    }
});

// 4. 获取学校类型映射关系
app.get('/api/schools/type-mapping', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        const schools = await getSchoolRegistry();
        
        // 构建学校名称到类型的映射对象
        const mapping = {};
        schools.forEach(school => {
            mapping[school.school_name] = school.school_type;
        });
        
        res.json({ 
            success: true, 
            data: mapping,
            count: Object.keys(mapping).length 
        });
    } catch (error) {
        console.error('获取学校类型映射失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校类型映射失败',
            message: error.message 
        });
    }
});

// 5. 按类型获取学校列表
app.get('/api/schools/by-type/:type', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        const schools = await getSchoolRegistry();
        
        const schoolType = decodeURIComponent(req.params.type);
        const schoolsOfType = schools.filter(school => school.school_type === schoolType);
        
        res.json({ 
            success: true, 
            data: schoolsOfType,
            type: schoolType,
            count: schoolsOfType.length 
        });
    } catch (error) {
        console.error('按类型获取学校列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '按类型获取学校列表失败',
            message: error.message 
        });
    }
});

// 6. 获取单个学校详细信息
app.get('/api/schools/detail/:schoolName', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        const schools = await getSchoolRegistry();
        
        const schoolName = decodeURIComponent(req.params.schoolName);
        const school = schools.find(s => s.school_name === schoolName);
        
        if (!school) {
            return res.status(404).json({ 
                success: false, 
                error: '学校未找到',
                schoolName: schoolName 
            });
        }
        
        res.json({ 
            success: true, 
            data: school 
        });
    } catch (error) {
        console.error('获取学校详细信息失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校详细信息失败',
            message: error.message 
        });
    }
});

// ===========================================
// 向后兼容的API端点
// ===========================================

// 获取学校选项列表（用于表单下拉框）- 保持向后兼容
app.get('/api/school-options', requireAuth, async (req, res) => {
    try {
        const { getSchoolRegistry } = require('./config/dataService');
        
        // 从数据库获取学校列表
        const schools = await getSchoolRegistry();
        
        res.json({ success: true, schools: schools });
    } catch (error) {
        console.error('获取学校选项失败:', error);
        res.status(500).json({ success: false, error: '获取学校选项失败' });
    }
});

// 获取所有学校历史数据（支持年份筛选）
app.get('/api/schools', requireAuth, async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 根据用户角色获取不同的数据
        let schools;
        if (req.session.user.role === 'school') {
            // 学校用户只能看到自己上传的数据
            schools = await dataService.getSchoolHistoryByUser(
                req.session.user.role, 
                req.session.user.school_name, 
                req.session.user.username, 
                yearFilter
            );
        } else {
            // 管理员和基建中心可以看到所有数据
            schools = await dataService.getSchoolHistory(yearFilter);
        }
        
        // 格式化所有面积相关的数值为两位小数
        const formattedSchools = schools.map(school => ({
            ...school,
            current_building_area: formatAreaToTwoDecimals(school.current_building_area),
            required_building_area: formatAreaToTwoDecimals(school.required_building_area),
            teaching_area_gap: formatAreaToTwoDecimals(school.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(school.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(school.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(school.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(school.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(school.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(school.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(school.special_subsidy_total)
        }));
        
        res.json({ success: true, schools: formattedSchools });
    } catch (error) {
        console.error('获取学校历史数据失败:', error);
        res.status(500).json({ success: false, error: '获取数据失败' });
    }
});

// 获取各校各年度最新记录（支持年份和学校筛选）
app.get('/api/schools/latest', requireAuth, async (req, res) => {
    try {
        const { year, baseYear, school, user } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        const baseYearFilter = baseYear && baseYear !== 'all' ? parseInt(baseYear) : null;
        let schoolFilter = school && school !== 'all' ? school : null;
        let userFilter = user && user !== 'all' ? user : null;
        
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        // 如果是学校用户，强制限制只能看到自己学校自己上传的数据
        if (userRole === 'school') {
            schoolFilter = userSchoolName;
            userFilter = req.session.user.real_name || username; // 学校用户只能看到自己的数据，优先使用真实姓名
        }
        
        // 返回符合条件的每个学校的最新记录
        const schools = await dataService.getLatestSchoolRecords(yearFilter, schoolFilter, baseYearFilter, userRole, username, userSchoolName, userFilter);
        
        // 格式化所有面积相关的数值为两位小数
        const formattedSchools = schools.map(school => ({
            ...school,
            current_building_area: formatAreaToTwoDecimals(school.current_building_area),
            required_building_area: formatAreaToTwoDecimals(school.required_building_area),
            teaching_area_gap: formatAreaToTwoDecimals(school.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(school.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(school.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(school.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(school.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(school.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(school.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(school.special_subsidy_total)
        }));
        
        res.json({ success: true, data: formattedSchools });
    } catch (error) {
        console.error('获取学校数据失败:', error);
        res.status(500).json({ success: false, error: '获取数据失败' });
    }
});



// 获取可用年份
app.get('/api/years', async (req, res) => {
    try {
        // 如果是未认证的请求，返回所有年份
        if (!req.session.user) {
            const years = await dataService.getAvailableYears();
            res.json({ success: true, data: years });
            return;
        }

        const userRole = req.session.user.role;
        const userSchoolName = req.session.user.school_name;
        
        let years = [];
        
        if (userRole === 'admin' || userRole === 'construction_center') {
            // 管理员和建设中心可以看到所有年份
            years = await dataService.getAvailableYears();
        } else if (userRole === 'school' && userSchoolName) {
            // 学校用户只能看到该学校有测算数据的年份
            years = await dataService.getAvailableYearsBySchool(userSchoolName);
            console.log(`学校用户 ${req.session.user.username} (${userSchoolName}) 的可用年份:`, years);
        } else {
            // 其他情况返回空数组
            years = [];
        }
        
        res.json({ success: true, data: years });
    } catch (error) {
        console.error('获取年份数据失败:', error);
        res.status(500).json({ success: false, error: '获取年份数据失败' });
    }
});

// 获取可用的测算用户
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        // 根据用户角色返回不同的用户列表
        let users = [];
        if (userRole === 'admin' || userRole === 'construction_center') {
            // 管理员和基建中心可以看到所有测算用户
            const userList = await dataService.getAvailableSubmitterUsers();
            users = userList;
        } else if (userRole === 'school') {
            // 学校用户只能看到自己
            // 获取当前用户的真实姓名
            const currentUser = req.session.user;
            const displayName = currentUser.real_name ? `${currentUser.real_name}(${username})` : username;
            users = [{
                username: username,
                real_name: currentUser.real_name,
                display_name: displayName
            }];
        }
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('获取测算用户数据失败:', error);
        res.status(500).json({ success: false, error: '获取测算用户数据失败' });
    }
});

// 获取学校历史记录
app.get('/api/school-history/:schoolName', requireAuth, async (req, res) => {
    try {
        const { schoolName } = req.params;
        const { limit = 10 } = req.query;
        
        // 如果是学校用户，只能查看自己学校的历史数据
        if (req.session.user.role === 'school' && req.session.user.school_name !== schoolName) {
            return res.status(403).json({ success: false, error: '没有权限查看其他学校的数据' });
        }
        
        const history = await dataService.getSchoolHistory(schoolName, parseInt(limit));
        
        // 格式化所有面积相关的数值为两位小数
        const formattedHistory = history.map(record => ({
            ...record,
            current_building_area: formatAreaToTwoDecimals(record.current_building_area),
            required_building_area: formatAreaToTwoDecimals(record.required_building_area),
            teaching_area_gap: formatAreaToTwoDecimals(record.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(record.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(record.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(record.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(record.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(record.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(record.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(record.special_subsidy_total)
        }));
        
        res.json({
            success: true,
            data: formattedHistory,
            message: '获取历史记录成功'
        });
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({ error: '获取历史记录失败: ' + error.message });
    }
});

// 获取统计数据（支持年份筛选）
app.get('/api/statistics', requireAuth, async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 学校用户不能访问统计数据（统计数据是跨学校的）
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        const stats = await dataService.getStatistics(yearFilter);
        
        // 格式化统计数据中的面积相关数值
        const formattedStats = {
            ...stats,
            // 如果统计数据中包含面积相关字段，也进行格式化
            ...(stats.totalCurrentArea && { totalCurrentArea: formatAreaToTwoDecimals(stats.totalCurrentArea) }),
            ...(stats.totalRequiredArea && { totalRequiredArea: formatAreaToTwoDecimals(stats.totalRequiredArea) }),
            ...(stats.totalAreaGap && { totalAreaGap: formatAreaToTwoDecimals(stats.totalAreaGap) }),
            ...(stats.averageAreaGap && { averageAreaGap: formatAreaToTwoDecimals(stats.averageAreaGap) })
        };
        
        res.json({
            success: true,
            data: formattedStats,
            message: '获取统计数据成功'
        });
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({ error: '获取统计数据失败: ' + error.message });
    }
});

// 获取学校统计数据
app.get('/api/statistics/schools', requireAuth, async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 学校用户不能访问统计数据（统计数据是跨学校的）
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        const stats = await dataService.getStatistics(yearFilter);
        
        // 格式化统计数据中的面积相关数值
        const formattedStats = {
            ...stats,
            // 如果统计数据中包含面积相关字段，也进行格式化
            ...(stats.overall && stats.overall.total_current_area && { 
                overall: {
                    ...stats.overall,
                    total_current_area: formatAreaToTwoDecimals(stats.overall.total_current_area),
                    total_required_area: formatAreaToTwoDecimals(stats.overall.total_required_area),
                    total_gap: formatAreaToTwoDecimals(stats.overall.total_gap),
                    avg_current_area: formatAreaToTwoDecimals(stats.overall.avg_current_area)
                }
            })
        };
        
        res.json({
            success: true,
            data: formattedStats,
            message: '获取学校统计数据成功'
        });
    } catch (error) {
        console.error('获取学校统计数据失败:', error);
        res.status(500).json({ success: false, error: '获取学校统计数据失败: ' + error.message });
    }
});

// 获取统计概览数据
app.get('/api/statistics/overview', requireAuth, async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 学校用户不能访问统计数据
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        const stats = await dataService.getStatistics(yearFilter);
        
        res.json({
            success: true,
            data: stats.overall || {},
            message: '获取统计概览成功'
        });
    } catch (error) {
        console.error('获取统计概览失败:', error);
        res.status(500).json({ success: false, error: '获取统计概览失败: ' + error.message });
    }
});

// 获取趋势数据
app.get('/api/statistics/trends', requireAuth, async (req, res) => {
    try {
        // 学校用户不能访问统计数据
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        // 获取多年统计数据用于趋势分析
        const pool = await getPool();
        const [rows] = await pool.execute(`
            SELECT 
                year,
                COUNT(*) as total_schools,
                SUM(total_students) as total_students,
                SUM(current_building_area) as total_current_area,
                SUM(required_building_area) as total_required_area,
                SUM(total_area_gap_with_subsidy) as total_gap
            FROM calculation_history
            GROUP BY year
            ORDER BY year ASC
        `);
        
        // 格式化数据
        const trends = rows.map(row => ({
            ...row,
            total_current_area: formatAreaToTwoDecimals(row.total_current_area),
            total_required_area: formatAreaToTwoDecimals(row.total_required_area),
            total_gap: formatAreaToTwoDecimals(row.total_gap)
        }));
        
        res.json({
            success: true,
            data: trends,
            message: '获取趋势数据成功'
        });
    } catch (error) {
        console.error('获取趋势数据失败:', error);
        res.status(500).json({ success: false, error: '获取趋势数据失败: ' + error.message });
    }
});

// 获取填报概览记录
app.get('/api/overview/records', requireAuth, async (req, res) => {
    try {
        const { year, userType, export: isExport } = req.query;
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        // 权限检查：只有管理员和基建中心用户能访问填报概览
        if (userRole === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看填报概览' });
        }
        
        // 构建查询条件
        let conditions = [];
        let values = [];
        
        // 年份筛选
        if (year && year !== 'all') {
            conditions.push('year = ?');
            values.push(parseInt(year));
        }
        
        // 用户类型筛选
        if (userType && userType !== 'all') {
            if (userType === 'school') {
                // 学校用户：查询role为'school'的用户提交的记录
                conditions.push('submitter_username IN (SELECT username FROM users WHERE role = ?)');
                values.push('school');
            } else if (userType === 'construction_center') {
                // 基建中心用户：查询role为'construction_center'的用户提交的记录
                conditions.push('submitter_username IN (SELECT username FROM users WHERE role = ?)');
                values.push('construction_center');
            }
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const query = `
            SELECT 
                ch.id,
                ch.year,
                sr.school_name,
                ch.current_building_area as current_total_area,
                ch.required_building_area as required_total_area,
                COALESCE(ch.total_area_gap_without_subsidy, ch.total_area_gap_with_subsidy - COALESCE(ch.special_subsidy_total, 0)) as gap_without_subsidy,
                ch.total_area_gap_with_subsidy as gap_with_subsidy,
                ch.special_subsidy_total as total_subsidy_area,
                ch.created_at,
                ch.submitter_username
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            ${whereClause}
            ORDER BY ch.created_at DESC
        `;
        
        const records = await dataService.executeQuery(query, values);
        
        // 格式化数值为两位小数
        const formattedRecords = records.map(record => ({
            ...record,
            current_total_area: formatAreaToTwoDecimals(record.current_total_area),
            required_total_area: formatAreaToTwoDecimals(record.required_total_area),
            gap_without_subsidy: formatAreaToTwoDecimals(record.gap_without_subsidy),
            total_subsidy_area: formatAreaToTwoDecimals(record.total_subsidy_area),
            gap_with_subsidy: formatAreaToTwoDecimals(record.gap_with_subsidy)
        }));
        
        // 如果是导出请求，生成Excel文件
        if (isExport === 'true') {
            const workbook = XLSX.utils.book_new();
            
            // 准备表格数据
            const worksheetData = [
                ['测算年份', '学校名称', '现状建筑总面积(m²)', '测算建筑总面积(m²)', '测算建筑面积总缺额(不含特殊补助)(m²)', '特殊补助建筑总面积(m²)', '测算建筑面积总缺额(含特殊补助)(m²)', '测算时间', '测算用户']
            ];
            
            formattedRecords.forEach(record => {
                worksheetData.push([
                    record.year || '-',
                    record.school_name || '-',
                    record.current_total_area,
                    record.required_total_area,
                    record.gap_without_subsidy,
                    record.total_subsidy_area,
                    record.gap_with_subsidy,
                    record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '-',
                    record.submitter_username || '-'
                ]);
            });
            
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            
            // 设置列宽
            worksheet['!cols'] = [
                { wch: 10 }, // 测算年份
                { wch: 25 }, // 学校名称
                { wch: 18 }, // 现状建筑总面积
                { wch: 22 }, // 测算建筑总面积
                { wch: 28 }, // 缺额(不含特殊补助)
                { wch: 18 }, // 特殊补助建筑总面积
                { wch: 28 }, // 缺额(含特殊补助)
                { wch: 18 }, // 测算时间
                { wch: 12 }  // 测算用户
            ];
            
            XLSX.utils.book_append_sheet(workbook, worksheet, '填报概览');
            
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=填报概览_${new Date().toISOString().split('T')[0]}.xlsx`);
            return res.send(buffer);
        }
        
        res.json({
            success: true,
            data: formattedRecords,
            message: '获取填报概览记录成功'
        });
    } catch (error) {
        console.error('获取填报概览记录失败:', error);
        res.status(500).json({ success: false, error: '获取填报概览记录失败: ' + error.message });
    }
});

// 批量导出功能
app.post('/api/batch-export', requireAuth, async (req, res) => {
    try {
        const { year, baseYear, schoolType, user, exportType = 'all', school } = req.body;
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;

        let userFilter = user && user !== 'all' ? user : null;
        let schoolName = school && school !== 'all' ? school : null;

        // 不再强制覆盖schoolName或userFilter，直接用前端传递的参数

        // 根据筛选条件获取数据 - 使用最新记录函数
        let schoolsData = [];

        if (exportType === 'filtered') {
            // 按条件筛选导出 - 只导出每个学校每个年份的最新记录
            const yearFilter = year && year !== 'all' ? parseInt(year) : null;
            const baseYearFilter = baseYear && baseYear !== 'all' ? parseInt(baseYear) : null;
            schoolsData = await dataService.getLatestSchoolRecords(yearFilter, schoolName, baseYearFilter, userRole, username, userSchoolName, userFilter);

            // 如果指定了学校类型，进一步筛选
            if (schoolType && schoolType !== 'all') {
                schoolsData = schoolsData.filter(school => school.school_type === schoolType);
            }
        } else {
            // 导出所有数据 - 只导出每个学校每个年份的最新记录
            schoolsData = await dataService.getLatestSchoolRecords(null, schoolName, null, userRole, username, userSchoolName, userFilter);
        }
        
        if (schoolsData.length === 0) {
            return res.status(400).json({ error: '没有找到符合条件的数据' });
        }
        
        // 生成批量导出Excel文件
        const filename = await generateBatchExportExcel(schoolsData, { year, schoolType });
        const downloadUrl = `/download/${filename}`;
        
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            fileName: filename,
            recordCount: schoolsData.length,
            message: `成功导出 ${schoolsData.length} 条记录`
        });
        
    } catch (error) {
        console.error('批量导出失败:', error);
        res.status(500).json({ error: '批量导出失败: ' + error.message });
    }
});

// 删除学校记录
app.delete('/api/school-record/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await dataService.deleteSchoolRecord(parseInt(id));
        
        res.json({
            success: true,
            message: '记录删除成功'
        });
    } catch (error) {
        console.error('删除记录失败:', error);
        res.status(500).json({ error: '删除记录失败: ' + error.message });
    }
});

// 删除学校组合记录（按测算年份-学校名称-测算用户组合删除记录）
app.delete('/api/school-combination', async (req, res) => {
    try {
        const { schoolName, year, submitterUsername } = req.body;
        
        if (!schoolName || !year) {
            return res.status(400).json({ error: '学校名称和测算年份不能为空' });
        }

        // 获取当前用户信息
        const userRole = req.session.user?.role;
        const currentUsername = req.session.user?.username;
        
        console.log('删除学校组合记录:', { schoolName, year, submitterUsername, userRole, currentUsername });
        
        let finalSubmitterUsername = submitterUsername;
        
        // 如果是学校用户，只能删除自己的记录
        if (userRole === 'school') {
            finalSubmitterUsername = currentUsername;
            console.log('学校用户只能删除自己的记录:', finalSubmitterUsername);
        }
        // 管理员和基建中心用户可以删除指定用户的记录
        
        const result = await dataService.deleteSchoolCombination(schoolName, null, year, finalSubmitterUsername);
        
        const userInfo = finalSubmitterUsername ? ` (用户: ${finalSubmitterUsername})` : ' (所有用户)';
        res.json({
            success: true,
            message: `删除成功，共删除 ${result.deletedCount} 条记录${userInfo}`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('删除学校组合记录失败:', error);
        res.status(500).json({ error: '删除学校组合记录失败: ' + error.message });
    }
});

// 生成单条记录详细格式Excel（与在线下载格式一致）
function generateSingleRecordDetailExcel(recordData) {
    const timestamp = Date.now();
    const schoolName = recordData.school_name || '未知学校';
    const year = recordData.year || new Date().getFullYear();
    const baseYear = recordData.base_year || year;
    
    // 获取记录的创建时间并格式化为yyyymmddhhmmss
    const recordDate = recordData.created_at ? new Date(recordData.created_at) : new Date();
    const timeStr = recordDate.getFullYear().toString() + 
                   (recordDate.getMonth() + 1).toString().padStart(2, '0') + 
                   recordDate.getDate().toString().padStart(2, '0') + 
                   recordDate.getHours().toString().padStart(2, '0') + 
                   recordDate.getMinutes().toString().padStart(2, '0') + 
                   recordDate.getSeconds().toString().padStart(2, '0');
    
    const fileName = `${schoolName}${year}年测算结果${timeStr}.xlsx`;
    const filePath = path.join(outputDir, fileName);
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 解析特殊补助数据
    let specialSubsidies = [];
    let specialSubsidyTotalArea = 0;
    
    try {
        if (recordData.special_subsidies) {
            specialSubsidies = JSON.parse(recordData.special_subsidies);
            if (Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                specialSubsidyTotalArea = formatAreaToTwoDecimals(specialSubsidies.reduce((sum, item) => 
                    sum + (parseFloat(item['补助面积（m²）']) || 0), 0));
            }
        }
    } catch (e) {
        console.warn('解析特殊补助数据失败:', e);
    }
    
    // 计算所需面积（如果数据库没有存储，则需要根据学生数量计算）
    const totalStudents = (recordData.full_time_undergraduate || 0) + 
                         (recordData.full_time_specialist || 0) + 
                         (recordData.full_time_master || 0) + 
                         (recordData.full_time_doctor || 0) + 
                         (recordData.international_undergraduate || 0) + 
                         (recordData.international_specialist || 0) + 
                         (recordData.international_master || 0) + 
                         (recordData.international_doctor || 0);
    
    // 获取其他生活用房面积（计算值）
    const otherLivingArea = Math.max(0, (recordData.total_living_area || 0) - (recordData.dormitory_area || 0));
    
    // 创建与在线下载相同格式的详细测算结果表
    
    // 调试：打印填报单位相关信息
    console.log('调试 - recordData.submitter_real_name:', recordData.submitter_real_name);
    console.log('调试 - recordData.submitter_username:', recordData.submitter_username);
    
    const submitterUser = recordData.submitter_real_name || recordData.submitter_username || '未知用户';
    
    const data = [
        ['高校测算'],
        ['基本办学条件缺口（＞0表示存在缺口）', '', '', ''],
        ['', '', '', `测算时间：${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}`],
        ['测算年份', year, '测算用户', submitterUser],
        [`单位/学校(机构)名称(章)`, schoolName, '院校类型', cleanSchoolType(recordData.school_type || '')],
        ['', '', '', ''],
        ['规划学生数', '', '', ''],
        ['专科全日制学生数(人)', recordData.full_time_specialist || 0, '本科全日制学生数(人)', recordData.full_time_undergraduate || 0],
        ['硕士全日制学生数(人)', recordData.full_time_master || 0, '博士全日制学生数(人)', recordData.full_time_doctor || 0],
        ['本科留学生数(人)', recordData.international_undergraduate || 0, '硕士留学生数(人)', recordData.international_master || 0],
        ['博士留学生(人)', recordData.international_doctor || 0, '', ''],
        ['', '', '', ''],
        ['测算结果', '', '', ''],
        ['用房类型', '现状建筑面积(m²)', '测算建筑面积(m²)', '测算建筑面积缺额(m²)'],
        ['教学及辅助用房', formatAreaToTwoDecimals(recordData.teaching_area), recordData.required_building_area ? formatAreaToTwoDecimals(recordData.required_building_area * 0.4) : 0, formatAreaToTwoDecimals(recordData.teaching_area_gap)],
        ['办公用房', formatAreaToTwoDecimals(recordData.office_area), recordData.required_building_area ? formatAreaToTwoDecimals(recordData.required_building_area * 0.1) : 0, formatAreaToTwoDecimals(recordData.office_area_gap)],
        ['生活配套用房', formatAreaToTwoDecimals(recordData.total_living_area), recordData.required_building_area ? formatAreaToTwoDecimals(recordData.required_building_area * 0.4) : 0, formatAreaToTwoDecimals((recordData.dormitory_area_gap || 0) + (recordData.other_living_area_gap || 0))],
        ['其中:学生宿舍', formatAreaToTwoDecimals(recordData.dormitory_area), recordData.required_building_area ? formatAreaToTwoDecimals(recordData.required_building_area * 0.3) : 0, formatAreaToTwoDecimals(recordData.dormitory_area_gap)],
        ['其中:其他生活用房', formatAreaToTwoDecimals(otherLivingArea), recordData.required_building_area ? formatAreaToTwoDecimals(recordData.required_building_area * 0.1) : 0, formatAreaToTwoDecimals(recordData.other_living_area_gap)],
        ['后勤补助用房', formatAreaToTwoDecimals(recordData.logistics_area), recordData.required_building_area ? formatAreaToTwoDecimals(recordData.required_building_area * 0.1) : 0, formatAreaToTwoDecimals(recordData.logistics_area_gap)],
        ['小计', formatAreaToTwoDecimals(recordData.current_building_area), formatAreaToTwoDecimals(recordData.required_building_area), formatAreaToTwoDecimals((recordData.total_area_gap_without_subsidy || (recordData.total_area_gap_with_subsidy || 0) - specialSubsidyTotalArea))],
        ['测算建筑面积总缺额（不含特殊补助）(m²)', '', '', formatAreaToTwoDecimals((recordData.total_area_gap_without_subsidy || (recordData.total_area_gap_with_subsidy || 0) - specialSubsidyTotalArea))],
        ['特殊补助建筑总面积(m²)', '', '', formatAreaToTwoDecimals(specialSubsidyTotalArea)],
        ['测算建筑面积总缺额（含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(recordData.total_area_gap_with_subsidy)],
        ['备注', recordData.remarks || '', '', '']
    ];
    
    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    ws['!cols'] = [
        { wch: 30 }, // 第一列
        { wch: 25 }, // 第二列  
        { wch: 30 }, // 第三列
        { wch: 25 }  // 第四列
    ];
    
    // 合并单元格
    const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // 标题行
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // 副标题行 - A2B2C2D2合并
        // 第4行（测算年份和测算用户）不需要合并，保持各自独立
        // 第4行（测算年份和测算用户）不需要合并，保持各自独立
        { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }, // A6B6C6D6合并为空
        { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } }, // A7B7C7D7合并并写入"规划学生数"
        { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }, // A12B12C12D12合并为空
        { s: { r: 21, c: 0 }, e: { r: 21, c: 2 } }, // A22B22C22合并 - 总缺额行
        { s: { r: 22, c: 0 }, e: { r: 22, c: 2 } }, // A23B23C23合并 - 补助面积行
        { s: { r: 23, c: 0 }, e: { r: 23, c: 2 } }, // A24B24C24合并 - 含补助总缺额行
        { s: { r: 24, c: 1 }, e: { r: 24, c: 3 } }  // A25的B25C25D25合并 - 备注内容
    ];
    
    ws['!merges'] = merges;
    
    // 定义边框样式
    const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
    };
    
    // 设置单元格样式
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            
            // 添加边框到所有单元格
            ws[cellAddress].s.border = borderStyle;
            
            // 设置对齐方式
            ws[cellAddress].s.alignment = { 
                horizontal: 'center', 
                vertical: 'center',
                wrapText: true 
            };
            
            // 特殊行的样式设置
            if (R === 0) { // 主标题
                ws[cellAddress].s.font = { bold: true, size: 16, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'E6E6FA' } 
                };
            } else if (R === 1) { // 副标题行
                ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'F0F8FF' } 
                };
            } else if (R === 7 || R === 13) { // 小标题行
                ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'F0F8FF' } 
                };
            } else if (R === 14) { // 表头行
                ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'F5F5F5' } 
                };
            } else if (R >= 15 && R <= 20) { // 数据行
                ws[cellAddress].s.font = { size: 10 };
                if (R % 2 === 0) {
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'FAFAFA' } 
                    };
                }
            } else if (R >= 21) { // 汇总行和备注行
                ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'FFE4E1' } 
                };
                // 备注行的合并单元格内容左对齐
                if (R === 24 && C > 0) { // 第25行（索引24）的备注内容
                    ws[cellAddress].s.alignment = { 
                        horizontal: 'left', 
                        vertical: 'center',
                        wrapText: true 
                    };
                }
            }
        }
    }
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, "建筑规模测算结果");
    
    // 如果有特殊补助明细，创建特殊补助工作表
    if (specialSubsidies && specialSubsidies.length > 0) {
        const subsidyData = [
            ['特殊补助明细'],
            [],
            ['补助项目名称', '补助面积(m²)']
        ];
        
        specialSubsidies.forEach(item => {
            subsidyData.push([item['特殊用房补助名称'] || '', formatAreaToTwoDecimals(item['补助面积（m²）'])]);
        });
        
        const subsidyWs = XLSX.utils.aoa_to_sheet(subsidyData);
        subsidyWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
        
        // 合并标题
        subsidyWs['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
        ];
        
        // 为特殊补助工作表添加样式
        const subsidyRange = XLSX.utils.decode_range(subsidyWs['!ref']);
        for (let R = subsidyRange.s.r; R <= subsidyRange.e.r; ++R) {
            for (let C = subsidyRange.s.c; C <= subsidyRange.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!subsidyWs[cellAddress]) subsidyWs[cellAddress] = { t: 's', v: '' };
                if (!subsidyWs[cellAddress].s) subsidyWs[cellAddress].s = {};
                
                // 添加边框
                subsidyWs[cellAddress].s.border = {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                };
                
                // 设置对齐
                subsidyWs[cellAddress].s.alignment = { 
                    horizontal: 'center', 
                    vertical: 'center',
                    wrapText: true 
                };
                
                // 样式设置
                if (R === 0) { // 标题行
                    subsidyWs[cellAddress].s.font = { bold: true, size: 14 };
                    subsidyWs[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'E6E6FA' } 
                    };
                } else if (R === 2) { // 表头
                    subsidyWs[cellAddress].s.font = { bold: true, size: 11 };
                    subsidyWs[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F5F5F5' } 
                    };
                } else if (R > 2) { // 数据行
                    subsidyWs[cellAddress].s.font = { size: 10 };
                    if (R % 2 === 1) {
                        subsidyWs[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'FAFAFA' } 
                        };
                    }
                }
            }
        }
        
        XLSX.utils.book_append_sheet(wb, subsidyWs, "特殊补助明细");
    }
    
    // 写入文件
    XLSX.writeFile(wb, filePath);
    
    return fileName;
}

// 下载单条记录
app.get('/api/download-record/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取记录详情
        const recordData = await dataService.getSchoolRecordById(parseInt(id));
        
        if (!recordData) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }

        console.log('下载记录ID:', id);
        console.log('学校记录数据:', recordData);
        
        // 使用详细格式生成Excel文件（与在线下载格式一致）
        const fileName = generateSingleRecordDetailExcel(recordData);
        const filePath = path.join(outputDir, fileName);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            console.error('生成的Excel文件不存在:', filePath);
            return res.status(500).json({ success: false, error: 'Excel文件生成失败' });
        }
        
        // 读取文件并转换为base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64 = fileBuffer.toString('base64');
        
        // 清理临时文件
        fs.unlinkSync(filePath);
        
        // 返回base64数据和文件名
        res.json({
            success: true,
            fileName: fileName,
            fileData: base64,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
    } catch (error) {
        console.error('下载记录时出错:', error);
        res.status(500).json({ success: false, error: '下载失败: ' + error.message });
    }
});

// 获取单条记录详情（用于详情页面显示）
app.get('/api/view-record/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取记录详情
        const recordData = await dataService.getSchoolRecordById(parseInt(id));
        
        if (!recordData) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }

        console.log('查看记录ID:', id);
        console.log('学校记录数据:', recordData);
        
        // 格式化面积数据
        const formattedRecord = {
            ...recordData,
            current_building_area: formatAreaToTwoDecimals(recordData.current_building_area),
            required_building_area: formatAreaToTwoDecimals(recordData.required_building_area),
            teaching_area: formatAreaToTwoDecimals(recordData.teaching_area),
            office_area: formatAreaToTwoDecimals(recordData.office_area),
            total_living_area: formatAreaToTwoDecimals(recordData.total_living_area),
            dormitory_area: formatAreaToTwoDecimals(recordData.dormitory_area),
            logistics_area: formatAreaToTwoDecimals(recordData.logistics_area),
            teaching_area_gap: formatAreaToTwoDecimals(recordData.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(recordData.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(recordData.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(recordData.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(recordData.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(recordData.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(recordData.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(recordData.special_subsidy_total)
        };
        
        // 返回格式化的记录数据
        res.json({
            success: true,
            data: formattedRecord
        });
        
    } catch (error) {
        console.error('获取记录详情时出错:', error);
        res.status(500).json({ success: false, error: '获取记录详情失败: ' + error.message });
    }
});

// 清空所有数据
app.delete('/api/clear-all-data', async (req, res) => {
    try {
        await dataService.clearAllData();
        
        res.json({
            success: true,
            message: '所有数据已清空'
        });
    } catch (error) {
        console.error('清空数据失败:', error);
        res.status(500).json({ error: '清空数据失败: ' + error.message });
    }
});

// 院校类型映射缓存
let SCHOOL_TYPE_CACHE = null;

// 从数据库加载院校类型映射
async function loadSchoolTypeMapping() {
    if (SCHOOL_TYPE_CACHE) {
        return SCHOOL_TYPE_CACHE;
    }
    
    try {
        const pool = await getPool();
        // 直接从标准表中获取所有院校类型
        const [basicRows] = await pool.execute(
            'SELECT DISTINCT school_type FROM basic_area_standards WHERE is_active = 1'
        );
        const [subsidizedRows] = await pool.execute(
            'SELECT DISTINCT school_type FROM subsidized_area_standards WHERE is_active = 1'
        );
        
        // 合并并去重
        const schoolTypeSet = new Set();
        basicRows.forEach(row => schoolTypeSet.add(row.school_type));
        subsidizedRows.forEach(row => schoolTypeSet.add(row.school_type));
        const schoolTypes = Array.from(schoolTypeSet).sort();
        
        // 构建映射关系（现在是简单的1:1映射）
        const mapping = {
            standardToCode: {},
            codeToStandard: {},
            aliasToStandard: {},
            standardTypes: []
        };
        
        schoolTypes.forEach(type => {
            mapping.standardToCode[type] = type;
            mapping.codeToStandard[type] = type;
            mapping.standardTypes.push(type);
        });
        
        // 添加常见别名映射到标准名称
        mapping.aliasToStandard = {
            // 综合类别名
            '综合': '综合院校',
            '综合类': '综合院校',
            
            // 师范类别名
            '师范': '师范院校',
            '师范类': '师范院校',
            
            // 理工类别名
            '理工': '理工院校',
            '工科': '理工院校',
            '工科院校': '理工院校',
            '工科类': '理工院校',
            
            // 医药类别名
            '医药': '医药院校',
            '医学': '医药院校',
            '医学院校': '医药院校',
            '医学类': '医药院校',
            
            // 农业类别名
            '农业': '农业院校',
            '农林': '农业院校',
            '农林院校': '农业院校',
            '农林类': '农业院校',
            
            // 政法类别名
            '政法': '政法院校',
            '政法类': '政法院校',
            
            // 财经类别名
            '财经': '财经院校',
            '财经类': '财经院校',
            
            // 外语类别名
            '外语': '外语院校',
            '外语类': '外语院校',
            
            // 艺术类别名
            '艺术': '艺术院校',
            '艺术类': '艺术院校',
            
            // 体育类别名
            '体育': '体育院校',
            '体育类': '体育院校'
        };
        
        SCHOOL_TYPE_CACHE = mapping;
        return mapping;
    } catch (error) {
        console.error('加载院校类型映射失败:', error);
        // 返回默认映射
        return {
            standardToCode: {},
            codeToStandard: {},
            aliasToStandard: {},
            standardTypes: ['综合院校']
        };
    }
}

// 标准化院校类型名称
async function normalizeSchoolType(inputType) {
    if (!inputType) return '综合院校';
    
    const mapping = await loadSchoolTypeMapping();
    const trimmedType = inputType.trim();
    
    // 首先检查是否是标准名称
    if (mapping.standardTypes.includes(trimmedType)) {
        return trimmedType;
    }
    
    // 检查别名映射
    if (mapping.aliasToStandard[trimmedType]) {
        return mapping.aliasToStandard[trimmedType];
    }
    
    // 如果都没找到，返回默认值
    return '综合院校';
}

// 学校名称到院校类别的硬编码映射
const SCHOOL_NAME_TO_TYPE = {
    '上海大学': '综合院校',
    '上海交通大学医学院': '医药院校',
    '上海理工大学': '理工院校',
    '上海师范大学': '师范院校',
    '上海科技大学': '理工院校',
    '华东政法大学': '政法院校',
    '上海海事大学': '理工院校',
    '上海海洋大学': '理工院校',
    '上海中医药大学': '医药院校',
    '上海体育大学': '体育院校',
    '上海音乐学院': '艺术院校',
    '上海戏剧学院': '艺术院校',
    '上海电力大学': '理工院校',
    '上海对外经贸大学': '财经院校',
    '上海应用技术大学': '理工院校',
    '上海立信会计金融学院': '财经院校',
    '上海工程技术大学': '理工院校',
    '上海第二工业大学': '理工院校',
    '上海商学院': '财经院校',
    '上海电机学院': '理工院校',
    '上海政法学院': '政法院校',
    '上海健康医学院': '医药院校',
    '上海出版印刷高等专科学校': '理工院校',
    '上海旅游高等专科学校': '师范院校',
    '上海城建职业学院': '理工院校',
    '上海电子信息职业技术学院': '理工院校',
    '上海工艺美术职业学院': '理工院校',
    '上海农林职业技术学院': '农业院校',
    '上海健康医学院附属卫生学校(上海健康护理职业学院(筹))': '医药院校'
};

// 动态加载的测算标准数据（从数据库加载，替代硬编码常量）
let DYNAMIC_BASIC_STANDARDS = {};
let DYNAMIC_SUBSIDIZED_STANDARDS = {};

// 从数据库加载测算标准数据
async function loadCalculationStandards() {
    try {
        const pool = await getPool();
        
        // 加载院校类型映射
        await loadSchoolTypeMapping();
        
        // 加载基础面积标准
        const [basicRows] = await pool.execute(
            'SELECT school_type, room_type, standard_value FROM basic_area_standards WHERE is_active = 1'
        );
        
        // 加载补贴面积标准
        const [subsidizedRows] = await pool.execute(
            'SELECT school_type, room_type, subsidy_type, standard_value FROM subsidized_area_standards WHERE is_active = 1'
        );
        
        // 组织基础标准数据（按院校类型和用房类型组织）
        DYNAMIC_BASIC_STANDARDS = {};
        basicRows.forEach(row => {
            if (!DYNAMIC_BASIC_STANDARDS[row.school_type]) {
                DYNAMIC_BASIC_STANDARDS[row.school_type] = {};
            }
            DYNAMIC_BASIC_STANDARDS[row.school_type][row.room_type] = parseFloat(row.standard_value);
        });
        
        // 组织补贴标准数据（三重索引结构）
        DYNAMIC_SUBSIDIZED_STANDARDS = {};
        subsidizedRows.forEach(row => {
            if (!DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type]) {
                DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type] = {};
            }
            if (!DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type][row.room_type]) {
                DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type][row.room_type] = {};
            }
            DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type][row.room_type][row.subsidy_type] = parseFloat(row.standard_value);
        });
        
        console.log('测算标准数据加载成功');
        console.log('基础标准类型数量:', Object.keys(DYNAMIC_BASIC_STANDARDS).length);
        console.log('补贴标准类型数量:', Object.keys(DYNAMIC_SUBSIDIZED_STANDARDS).length);
        
    } catch (error) {
        console.error('加载测算标准数据失败:', error);
        // 如果数据库加载失败，使用空对象，避免系统崩溃
        DYNAMIC_BASIC_STANDARDS = {};
        DYNAMIC_SUBSIDIZED_STANDARDS = {};
    }
}

// 获取学校对应的院校类别
app.get('/api/school-type/:schoolName', (req, res) => {
    try {
        const schoolName = decodeURIComponent(req.params.schoolName);
        const schoolType = SCHOOL_NAME_TO_TYPE[schoolName] || '未指定';
        
        res.json({
            success: true,
            schoolName: schoolName,
            schoolType: schoolType
        });
    } catch (error) {
        console.error('获取学校类型失败:', error);
        res.status(500).json({ error: '获取学校类型失败: ' + error.message });
    }
});

// 处理Excel文件的函数
// 生成批量导出Excel文件
function generateBatchExportExcel(schoolsData, filters = {}) {
    const timestamp = Date.now();
    
    // 为单个记录也生成完整格式的文件
    if (schoolsData.length === 1) {
        const school = schoolsData[0];
        const schoolName = school.school_name || '未知学校';
        const year = school.year || new Date().getFullYear();
        
        // 获取记录的创建时间并格式化为yyyymmddhhmmss
        const recordDate = school.created_at ? new Date(school.created_at) : new Date();
        const timeStr = recordDate.getFullYear().toString() + 
                       (recordDate.getMonth() + 1).toString().padStart(2, '0') + 
                       recordDate.getDate().toString().padStart(2, '0') + 
                       recordDate.getHours().toString().padStart(2, '0') + 
                       recordDate.getMinutes().toString().padStart(2, '0') + 
                       recordDate.getSeconds().toString().padStart(2, '0');
        
        const fileName = `${schoolName}${year}年测算结果${timeStr}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        
        try {
            // 创建新的工作簿
            const wb = XLSX.utils.book_new();
            
            // 第一个Sheet：建筑规模测算结果（格式化表格）
            const formattedSheet = generateFormattedResultSheet(school);
            XLSX.utils.book_append_sheet(wb, formattedSheet, "建筑规模测算结果");
            
            // 第二个Sheet：测算数据（宽表格式）
            const mainData = generateWideTableSheet(schoolsData);
            const mainSheet = XLSX.utils.json_to_sheet(mainData);
            XLSX.utils.book_append_sheet(wb, mainSheet, "测算数据");
            
            // 第三个Sheet：特殊补助明细
            const subsidyData = generateSubsidyDetailSheet(schoolsData);
            const subsidySheet = XLSX.utils.json_to_sheet(subsidyData);
            XLSX.utils.book_append_sheet(wb, subsidySheet, "特殊补助明细");
            
            // 第四个Sheet：测算明细（不含特殊补助）
            const detailData = generateDetailSheet(schoolsData);
            const detailSheet = XLSX.utils.json_to_sheet(detailData);
            XLSX.utils.book_append_sheet(wb, detailSheet, "测算明细");
            
            // 第五个Sheet：学生数明细
            const studentData = generateStudentDetailSheet(schoolsData);
            const studentSheet = XLSX.utils.json_to_sheet(studentData);
            XLSX.utils.book_append_sheet(wb, studentSheet, "学生数明细");
            
            // 写入文件
            XLSX.writeFile(wb, filePath);
            
            return fileName;
        } catch (error) {
            console.error('生成单个记录Excel时出错:', error);
            throw error;
        }
    } else {
        // 批量导出使用日期格式的文件名
        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');
        const fileName = `高校测算汇总${dateStr}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        
        try {
            // 创建新的工作簿
            const wb = XLSX.utils.book_new();
            
            // 第一个Sheet：测算数据（宽表格式）
            const mainData = generateWideTableSheet(schoolsData);
            const mainSheet = XLSX.utils.json_to_sheet(mainData);
            XLSX.utils.book_append_sheet(wb, mainSheet, "测算数据");
            
            // 第二个Sheet：特殊补助明细
            const subsidyData = generateSubsidyDetailSheet(schoolsData);
            const subsidySheet = XLSX.utils.json_to_sheet(subsidyData);
            XLSX.utils.book_append_sheet(wb, subsidySheet, "特殊补助明细");
            
            // 第三个Sheet：测算明细（不含特殊补助）
            const detailData = generateDetailSheet(schoolsData);
            const detailSheet = XLSX.utils.json_to_sheet(detailData);
            XLSX.utils.book_append_sheet(wb, detailSheet, "测算明细");
            
            // 第四个Sheet：学生数明细
            const studentData = generateStudentDetailSheet(schoolsData);
            const studentSheet = XLSX.utils.json_to_sheet(studentData);
            XLSX.utils.book_append_sheet(wb, studentSheet, "学生数明细");
            
            // 写入文件
            XLSX.writeFile(wb, filePath);
            
            return fileName;
        } catch (error) {
            console.error('生成批量导出Excel时出错:', error);
            throw error;
        }
    }
}

// 生成宽表格式的测算数据Sheet
function generateWideTableSheet(schoolsData) {
    return schoolsData.map(school => {
        // 解析特殊补助数据
        let specialSubsidies = [];
        let specialSubsidyTotalArea = 0;
        
        try {
            if (school.special_subsidies) {
                specialSubsidies = JSON.parse(school.special_subsidies);
                if (Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                    specialSubsidyTotalArea = specialSubsidies.reduce((sum, item) => 
                        sum + (parseFloat(item['补助面积（m²）']) || 0), 0);
                }
            }
        } catch (e) {
            console.warn('解析特殊补助数据失败:', e);
        }

        // 获取现状数据（从数据库字段）
        const currentTeachingArea = parseFloat(school.teaching_area) || 0;
        const currentOfficeArea = parseFloat(school.office_area) || 0;
        const currentTotalLivingArea = parseFloat(school.total_living_area) || 0;
        const currentDormitoryArea = parseFloat(school.dormitory_area) || 0;
        const currentOtherLivingArea = Math.max(0, currentTotalLivingArea - currentDormitoryArea);
        const currentLogisticsArea = parseFloat(school.logistics_area) || 0;
        const currentTotalArea = currentTeachingArea + currentOfficeArea + currentTotalLivingArea + currentLogisticsArea;

        // 计算测算数据（现状 + 缺额）
        const calculatedTeachingArea = currentTeachingArea + (parseFloat(school.teaching_area_gap) || 0);
        const calculatedOfficeArea = currentOfficeArea + (parseFloat(school.office_area_gap) || 0);
        const calculatedDormitoryArea = currentDormitoryArea + (parseFloat(school.dormitory_area_gap) || 0);
        const calculatedOtherLivingArea = currentOtherLivingArea + (parseFloat(school.other_living_area_gap) || 0);
        const calculatedTotalLivingArea = calculatedDormitoryArea + calculatedOtherLivingArea;
        const calculatedLogisticsArea = currentLogisticsArea + (parseFloat(school.logistics_area_gap) || 0);
        const calculatedTotalArea = calculatedTeachingArea + calculatedOfficeArea + calculatedTotalLivingArea + calculatedLogisticsArea;

        // 计算缺额数据
        const teachingAreaGap = parseFloat(school.teaching_area_gap) || 0;
        const officeAreaGap = parseFloat(school.office_area_gap) || 0;
        const dormitoryAreaGap = parseFloat(school.dormitory_area_gap) || 0;
        const otherLivingAreaGap = parseFloat(school.other_living_area_gap) || 0;
        const totalLivingAreaGap = dormitoryAreaGap + otherLivingAreaGap;
        const logisticsAreaGap = parseFloat(school.logistics_area_gap) || 0;
        const totalAreaGapWithoutSubsidy = teachingAreaGap + officeAreaGap + totalLivingAreaGap + logisticsAreaGap;
        const totalAreaGapWithSubsidy = totalAreaGapWithoutSubsidy + specialSubsidyTotalArea;

        // 学生数据
        const fullTimeSpecialist = parseInt(school.full_time_specialist) || 0;
        const fullTimeUndergraduate = parseInt(school.full_time_undergraduate) || 0;
        const fullTimeMaster = parseInt(school.full_time_master) || 0;
        const fullTimeDoctor = parseInt(school.full_time_doctor) || 0;
        const fullTimeTotal = fullTimeSpecialist + fullTimeUndergraduate + fullTimeMaster + fullTimeDoctor;

        const internationalUndergraduate = parseInt(school.international_undergraduate) || 0;
        const internationalMaster = parseInt(school.international_master) || 0;
        const internationalDoctor = parseInt(school.international_doctor) || 0;
        const internationalTotal = internationalUndergraduate + internationalMaster + internationalDoctor;

        const totalStudents = fullTimeTotal + internationalTotal;

        // 获取院校类别，清理可能的前缀
        let schoolType = school.school_type || '';
        if (schoolType.includes('院校类型：')) {
            schoolType = schoolType.replace('院校类型：', '');
        }
        if (schoolType.includes('院校类别：')) {
            schoolType = schoolType.replace('院校类别：', '');
        }

        return {
            '学校名称': school.school_name || '',
            '院校类别': schoolType,
            '测算年份': parseInt(school.year) || 0,
            '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
            '教学及辅助用房面积(㎡)_现状': formatAreaToTwoDecimals(currentTeachingArea),
            '办公用房面积(㎡)_现状': formatAreaToTwoDecimals(currentOfficeArea),
            '生活用房总面积(㎡)_现状': formatAreaToTwoDecimals(currentTotalLivingArea),
            '其中:学生宿舍面积(㎡)_现状': formatAreaToTwoDecimals(currentDormitoryArea),
            '其中:其他生活用房面积(㎡)_现状': formatAreaToTwoDecimals(currentOtherLivingArea),
            '后勤辅助用房面积(㎡)_现状': formatAreaToTwoDecimals(currentLogisticsArea),
            '建筑总面积(㎡)_现状': formatAreaToTwoDecimals(currentTotalArea),
            '教学及辅助用房面积(㎡)_测算': formatAreaToTwoDecimals(calculatedTeachingArea),
            '办公用房面积(㎡)_测算': formatAreaToTwoDecimals(calculatedOfficeArea),
            '生活用房总面积(㎡)_测算': formatAreaToTwoDecimals(calculatedTotalLivingArea),
            '其中:学生宿舍面积(㎡)_测算': formatAreaToTwoDecimals(calculatedDormitoryArea),
            '其中:其他生活用房面积(㎡)_测算': formatAreaToTwoDecimals(calculatedOtherLivingArea),
            '后勤辅助用房面积(㎡)_测算': formatAreaToTwoDecimals(calculatedLogisticsArea),
            '建筑总面积(㎡)_测算': formatAreaToTwoDecimals(calculatedTotalArea),
            '教学及辅助用房面积(㎡)_缺额': formatAreaToTwoDecimals(teachingAreaGap),
            '办公用房面积(㎡)_缺额': formatAreaToTwoDecimals(officeAreaGap),
            '生活用房总面积(㎡)_缺额': formatAreaToTwoDecimals(totalLivingAreaGap),
            '其中:学生宿舍面积(㎡)_缺额': formatAreaToTwoDecimals(dormitoryAreaGap),
            '其中:其他生活用房面积(㎡)_缺额': formatAreaToTwoDecimals(otherLivingAreaGap),
            '后勤辅助用房面积(㎡)_缺额': formatAreaToTwoDecimals(logisticsAreaGap),
            '建筑总面积(㎡)_缺额_不含特殊补助': formatAreaToTwoDecimals(totalAreaGapWithoutSubsidy),
            '建筑总面积(㎡)_缺额_含特殊补助': formatAreaToTwoDecimals(totalAreaGapWithSubsidy),
            '特殊补助建筑总面积(㎡)': formatAreaToTwoDecimals(specialSubsidyTotalArea),
            '专科全日制学生数(人)': fullTimeSpecialist,
            '本科全日制学生数(人)': fullTimeUndergraduate,
            '硕士全日制学生数(人)': fullTimeMaster,
            '博士全日制学生数(人)': fullTimeDoctor,
            '全日制学生总数(人)': fullTimeTotal,
            '本科留学生数(人)': internationalUndergraduate,
            '硕士留学生数(人)': internationalMaster,
            '博士留学生数(人)': internationalDoctor,
            '留学生总数(人)': internationalTotal,
            '学生总人数(人)': totalStudents,
            '备注': school.remarks || ''
        };
    });
}

// 生成特殊补助明细Sheet
function generateSubsidyDetailSheet(schoolsData) {
    const subsidyDetails = [];
    
    schoolsData.forEach(school => {
        try {
            if (school.special_subsidies) {
                const specialSubsidies = JSON.parse(school.special_subsidies);
                if (Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                    specialSubsidies.forEach(subsidy => {
                        // 获取院校类别，清理可能的前缀
                        let schoolType = school.school_type || '';
                        if (schoolType.includes('院校类型：')) {
                            schoolType = schoolType.replace('院校类型：', '');
                        }
                        if (schoolType.includes('院校类别：')) {
                            schoolType = schoolType.replace('院校类别：', '');
                        }
                        
                        subsidyDetails.push({
                            '学校名称': school.school_name || '',
                            '院校类别': schoolType,
                            '测算年份': parseInt(school.year) || 0,
                            '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
                            '补助项目': subsidy['补助项目'] || '',
                            '补助面积（m²）': formatAreaToTwoDecimals(parseFloat(subsidy['补助面积（m²）']) || 0),
                            '备注': subsidy['备注'] || ''
                        });
                    });
                }
            }
        } catch (e) {
            console.warn(`解析学校 ${school.school_name} 的特殊补助数据失败:`, e);
        }
    });
    
    return subsidyDetails;
}

// 生成批量导出的统计汇总数据
function generateBatchSummaryData(schoolsData, filters) {
    const summary = [];
    
    // 基本信息
    summary.push(
        { '统计项目': '导出时间', '数值': new Date().toLocaleString('zh-CN'), '单位': '' },
        { '统计项目': '导出学校数量', '数值': schoolsData.length, '单位': '所' }
    );
    
    if (filters.year) {
        summary.push({ '统计项目': '筛选年份', '数值': filters.year, '单位': '' });
    }
    if (filters.schoolType && filters.schoolType !== 'all') {
        // 移除可能存在的"院校类型："或"院校类别："前缀
        let schoolTypeValue = filters.schoolType;
        if (schoolTypeValue.includes('院校类型：')) {
            schoolTypeValue = schoolTypeValue.replace('院校类型：', '');
        }
        if (schoolTypeValue.includes('院校类别：')) {
            schoolTypeValue = schoolTypeValue.replace('院校类别：', '');
        }
        summary.push({ '统计项目': '筛选学校类型', '数值': schoolTypeValue, '单位': '' });
    }
    
    // 计算总体统计
    let totalStudents = 0;
    let totalCurrentArea = 0;
    let totalRequiredArea = 0;
    let totalGap = 0;
    
    schoolsData.forEach(school => {
        totalStudents += school.total_students || 0;
        totalCurrentArea += school.current_total_area || 0;
        totalRequiredArea += school.required_total_area || 0;
        totalGap += school.total_gap || 0;
    });
    
    summary.push(
        { '统计项目': '', '数值': '', '单位': '' }, // 空行
        { '统计项目': '=== 总体统计 ===', '数值': '', '单位': '' },
        { '统计项目': '学生总人数', '数值': totalStudents, '单位': '人' },
        { '统计项目': '现状建筑总面积', '数值': Math.round(totalCurrentArea * 100) / 100, '单位': '平方米' },
        { '统计项目': '应配建筑总面积', '数值': Math.round(totalRequiredArea * 100) / 100, '单位': '平方米' },
        { '统计项目': '建筑面积总缺口', '数值': Math.round(totalGap * 100) / 100, '单位': '平方米' }
    );
    
    return summary;
}

// 生成学校类型分析数据
function generateTypeAnalysisData(schoolsData) {
    const typeStats = {};
    
    schoolsData.forEach(school => {
        const type = school.school_type || '未知';
        
        if (!typeStats[type]) {
            typeStats[type] = {
                '学校类型': type,
                '学校数量': 0,
                '学生总数': 0,
                '现状建筑总面积': 0,
                '应配建筑总面积': 0,
                '建筑面积总缺口': 0
            };
        }
        
        typeStats[type]['学校数量']++;
        typeStats[type]['学生总数'] += school.total_students || 0;
        typeStats[type]['现状建筑总面积'] += school.current_total_area || 0;
        typeStats[type]['应配建筑总面积'] += school.required_total_area || 0;
        typeStats[type]['建筑面积总缺口'] += school.total_gap || 0;
    });
    
    // 计算平均值
    Object.values(typeStats).forEach(type => {
        type['平均学生数/校'] = Math.round(type['学生总数'] / type['学校数量'] * 100) / 100;
        type['平均现状面积/校'] = Math.round(type['现状建筑总面积'] / type['学校数量'] * 100) / 100;
        type['平均应配面积/校'] = Math.round(type['应配建筑总面积'] / type['学校数量'] * 100) / 100;
        type['平均缺口/校'] = Math.round(type['建筑面积总缺口'] / type['学校数量'] * 100) / 100;
    });
    
    return Object.values(typeStats);
}

// 生成测算汇总Sheet数据
function generateSummarySheet(schoolsData) {
    return schoolsData.map(school => {
        // 解析特殊补助数据
        let specialSubsidies = [];
        let specialSubsidyTotalArea = 0;
        
        try {
            if (school.special_subsidies) {
                specialSubsidies = JSON.parse(school.special_subsidies);
                if (Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                    specialSubsidyTotalArea = specialSubsidies.reduce((sum, item) => 
                        sum + (parseFloat(item['补助面积（m²）']) || 0), 0);
                }
            }
        } catch (e) {
            console.warn('解析特殊补助数据失败:', e);
        }

        // 计算全日制学生总数
        const fullTimeTotal = (parseInt(school.full_time_undergraduate) || 0) + 
                             (parseInt(school.full_time_specialist) || 0) + 
                             (parseInt(school.full_time_master) || 0) + 
                             (parseInt(school.full_time_doctor) || 0);
        
        // 计算留学生总数
        const internationalTotal = (parseInt(school.international_undergraduate) || 0) + 
                                  (parseInt(school.international_specialist) || 0) + 
                                  (parseInt(school.international_master) || 0) + 
                                  (parseInt(school.international_doctor) || 0);

        // 计算不含补助的缺额
        const gapWithoutSubsidy = school.total_area_gap_without_subsidy || ((parseFloat(school.total_area_gap_with_subsidy) || 0) - specialSubsidyTotalArea);

        // 计算学生总数（全日制+留学生）
        const totalStudents = fullTimeTotal + internationalTotal;

        return {
            '学校名称': school.school_name || '',
            '院校类别': cleanSchoolType(school.school_type || ''),
            '测算年份': parseInt(school.year) || 0,
            '全日制学生总数(人)': fullTimeTotal,
            '留学生总数(人)': internationalTotal,
            '学生总数(人)': totalStudents,
            '测算建筑总面积(㎡)': formatAreaToTwoDecimals(parseFloat(school.required_building_area)),
            '现状建筑总面积(㎡)': formatAreaToTwoDecimals(parseFloat(school.current_building_area)),
            '测算建筑面积总缺额(不含特殊补助)(㎡)': formatAreaToTwoDecimals(gapWithoutSubsidy),
            '特殊补助建筑总面积(㎡)': formatAreaToTwoDecimals(specialSubsidyTotalArea),
            '测算建筑面积总缺额(含特殊补助)(㎡)': formatAreaToTwoDecimals(parseFloat(school.total_area_gap_with_subsidy)),
            '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
            '备注': school.remarks || ''
        };
    });
}

// 生成测算明细Sheet数据
function generateDetailSheet(schoolsData) {
    const detailData = [];
    
    schoolsData.forEach(school => {
        // 计算生活配套用房总面积（学生宿舍 + 其他生活用房）
        const dormitoryArea = parseFloat(school.dormitory_area) || 0;
        const otherLivingArea = Math.max(0, (parseFloat(school.total_living_area) || 0) - dormitoryArea);
        const totalLivingArea = dormitoryArea + otherLivingArea;
        
        // 按要求的用房类型顺序
        const roomTypes = [
            { 
                type: '教学及辅助用房', 
                current: formatAreaToTwoDecimals(parseFloat(school.teaching_area)), 
                required: formatAreaToTwoDecimals((parseFloat(school.teaching_area) || 0) + (parseFloat(school.teaching_area_gap) || 0)),
                gap: formatAreaToTwoDecimals(parseFloat(school.teaching_area_gap))
            },
            { 
                type: '办公用房', 
                current: formatAreaToTwoDecimals(parseFloat(school.office_area)), 
                required: formatAreaToTwoDecimals((parseFloat(school.office_area) || 0) + (parseFloat(school.office_area_gap) || 0)),
                gap: formatAreaToTwoDecimals(parseFloat(school.office_area_gap))
            },
            { 
                type: '生活配套用房', 
                current: formatAreaToTwoDecimals(totalLivingArea), 
                required: formatAreaToTwoDecimals(totalLivingArea + (parseFloat(school.dormitory_area_gap) || 0) + (parseFloat(school.other_living_area_gap) || 0)),
                gap: formatAreaToTwoDecimals((parseFloat(school.dormitory_area_gap) || 0) + (parseFloat(school.other_living_area_gap) || 0))
            },
            { 
                type: '其中:学生宿舍', 
                current: formatAreaToTwoDecimals(dormitoryArea), 
                required: formatAreaToTwoDecimals(dormitoryArea + (parseFloat(school.dormitory_area_gap) || 0)),
                gap: formatAreaToTwoDecimals(parseFloat(school.dormitory_area_gap))
            },
            { 
                type: '其中:其他生活用房', 
                current: formatAreaToTwoDecimals(otherLivingArea), 
                required: formatAreaToTwoDecimals(otherLivingArea + (parseFloat(school.other_living_area_gap) || 0)),
                gap: formatAreaToTwoDecimals(parseFloat(school.other_living_area_gap))
            },
            { 
                type: '后勤辅助用房', 
                current: formatAreaToTwoDecimals(parseFloat(school.logistics_area)), 
                required: formatAreaToTwoDecimals((parseFloat(school.logistics_area) || 0) + (parseFloat(school.logistics_area_gap) || 0)),
                gap: formatAreaToTwoDecimals(parseFloat(school.logistics_area_gap))
            }
        ];

        roomTypes.forEach(room => {
            detailData.push({
                '学校名称': school.school_name || '',
                '院校类别': cleanSchoolType(school.school_type || ''),
                '测算年份': parseInt(school.year) || 0,
                '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
                '用房类型': room.type,
                '现状建筑面积(㎡)': room.current,
                '测算建筑面积(㎡)': room.required,
                '测算建筑面积缺额(㎡)': room.gap
            });
        });
    });
    
    return detailData;
}

// 生成学生数明细Sheet数据
function generateStudentDetailSheet(schoolsData) {
    const studentData = [];
    
    schoolsData.forEach(school => {
        // 学生类型（按您要求的名称）
        const studentTypes = [
            { type: '专科全日制', count: parseInt(school.full_time_specialist) || 0 },
            { type: '本科全日制', count: parseInt(school.full_time_undergraduate) || 0 },
            { type: '硕士全日制', count: parseInt(school.full_time_master) || 0 },
            { type: '博士全日制', count: parseInt(school.full_time_doctor) || 0 },
            { type: '本科留学生', count: parseInt(school.international_undergraduate) || 0 },
            { type: '硕士留学生', count: parseInt(school.international_master) || 0 },
            { type: '博士留学生', count: parseInt(school.international_doctor) || 0 }
        ];

        studentTypes.forEach(student => {
            studentData.push({
                '学校名称': school.school_name || '',
                '院校类别': cleanSchoolType(school.school_type || ''),
                '测算年份': parseInt(school.year) || 0,
                '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
                '学生类型': student.type,
                '学生数(人)': student.count
            });
        });
    });
    
    return studentData;
}

// 生成补助明细Sheet数据
function generateSubsidyDetailSheet(schoolsData) {
    const subsidyData = [];
    
    schoolsData.forEach(school => {
        // 解析特殊补助数据
        let specialSubsidies = [];
        
        try {
            if (school.special_subsidies) {
                const subsidiesStr = typeof school.special_subsidies === 'string' 
                    ? school.special_subsidies 
                    : JSON.stringify(school.special_subsidies);
                specialSubsidies = JSON.parse(subsidiesStr);
                
                if (!Array.isArray(specialSubsidies)) {
                    specialSubsidies = [];
                }
            }
        } catch (e) {
            console.error(`解析学校 ${school.school_name} 的特殊补助数据失败:`, e);
            specialSubsidies = [];
        }
        
        // 如果有补助项目，为每个补助项目创建一行
        if (specialSubsidies && specialSubsidies.length > 0) {
            specialSubsidies.forEach(subsidy => {
                subsidyData.push({
                    '学校名称': school.school_name || '',
                    '院校类别': cleanSchoolType(school.school_type || ''),
                    '测算年份': parseInt(school.year) || 0,
                    '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
                    '补助名称': subsidy.name || subsidy['特殊用房补助名称'] || '',
                    '补助建筑面积(㎡)': formatAreaToTwoDecimals(parseFloat(subsidy.area || subsidy['补助面积（m²）']) || 0)
                });
            });
        } else {
            // 如果没有补助项目，创建一行表示无补助
            subsidyData.push({
                '学校名称': school.school_name || '',
                '院校类别': cleanSchoolType(school.school_type || ''),
                '测算年份': parseInt(school.year) || 0,
                '测算用户': school.submitter_real_name || school.submitter_username || '未知用户',
                '补助名称': '无特殊补助',
                '补助建筑面积(㎡)': '0.00'
            });
        }
    });
    
    return subsidyData;
}

// 计算建筑面积缺口的函数
async function calculateBuildingAreaGap(data, specialSubsidyData = []) {
    try {
        const schoolName = data['学校名称'] || '';
        
        // 从学校名称硬编码映射中获取学校类型
        let schoolTypeText = SCHOOL_NAME_TO_TYPE[schoolName];
        
        // 如果没有找到对应的学校，尝试从Excel中读取学校类型（向后兼容）
        if (!schoolTypeText) {
            schoolTypeText = data['学校类型'] || '';
        }
        
        // 如果仍然没有找到，设为默认值
        if (!schoolTypeText) {
            schoolTypeText = '综合院校';
        }
        
        // 使用新的标准化函数
        const standardSchoolType = await normalizeSchoolType(schoolTypeText);
        
        const year = parseFloat(data['年份']) || new Date().getFullYear();
        
        // 只用本科生和专科生字段，兼容历史但不再输出或使用本专科生人数
        let fullTimeUndergraduate = parseFloat(data['全日制本科生人数']);
        if (isNaN(fullTimeUndergraduate)) fullTimeUndergraduate = 0;
        let fullTimeSpecialist = parseFloat(data['全日制专科生人数']);
        if (isNaN(fullTimeSpecialist)) fullTimeSpecialist = 0;
        // 历史数据只有“全日制本专科生人数”时，自动拆分为本科生（全部计入本科）
        if (fullTimeUndergraduate === 0 && fullTimeSpecialist === 0 && data['全日制本专科生人数'] !== undefined) {
            fullTimeUndergraduate = parseFloat(data['全日制本专科生人数']) || 0;
        }
        const fullTimeMaster = parseFloat(data['全日制硕士生人数']) || 0;
        const fullTimeDoctor = parseFloat(data['全日制博士生人数']) || 0;
        const internationalUndergraduate = parseFloat(data['留学生本科生人数']) || 0;
        const internationalMaster = parseFloat(data['留学生硕士生人数']) || 0;
        const internationalDoctor = parseFloat(data['留学生博士生人数']) || 0;

        // 计算各类学生总数
        const allUndergraduate = fullTimeUndergraduate + internationalUndergraduate;
        const allSpecialist = fullTimeSpecialist; // 专科生单独统计
        const allMaster = fullTimeMaster + internationalMaster;
        const allDoctor = fullTimeDoctor + internationalDoctor;
        const allInternational = internationalUndergraduate + internationalMaster + internationalDoctor;

        // 重新计算总学生数确保准确性（本科+专科+硕士+博士）
        const totalStudents = allUndergraduate + allSpecialist + allMaster + allDoctor;
        
        // 现有面积
        const currentArea = {
            A: parseFloat(data['现有教学及辅助用房面积']) || 0,
            B: parseFloat(data['现有办公用房面积']) || 0,
            C1: parseFloat(data['现有学生宿舍面积']) || 0,
            C2: 0, // 将通过计算得出
            D: parseFloat(data['现有后勤辅助用房面积']) || 0
        };
        
        // 计算C2 = 生活用房总面积 - 学生宿舍面积
        const totalLivingArea = parseFloat(data['现有生活用房总面积']) || 0;
        const dormitoryArea = parseFloat(data['现有学生宿舍面积']) || 0;
        currentArea.C2 = Math.max(0, totalLivingArea - dormitoryArea); // 确保不为负数
        
        // 获取标准（从动态加载的数据中获取）
        // 将学校类型代码映射回中文名称
        // 从动态加载的标准数据中获取基础标准
        const basicStandards = DYNAMIC_BASIC_STANDARDS[standardSchoolType];
        if (!basicStandards) {
            throw new Error(`未找到院校类型 ${standardSchoolType} 的基础标准数据`);
        }
        
        // 从动态加载的标准数据中获取补贴标准
        const subsidizedStandards = DYNAMIC_SUBSIDIZED_STANDARDS[standardSchoolType];
        if (!subsidizedStandards) {
            throw new Error(`未找到院校类型 ${standardSchoolType} 的补贴标准数据`);
        }        // 计算基础应配面积（注意：数据库中使用中文房间类型名称）
        const basicRequiredArea = {
            A: (basicStandards['教学及辅助用房'] || 0) * totalStudents,
            B: (basicStandards['办公用房'] || 0) * totalStudents, 
            C1: (basicStandards['学生宿舍'] || 0) * totalStudents,
            C2: (basicStandards['其他生活用房'] || 0) * totalStudents,
            D: (basicStandards['后勤辅助用房'] || 0) * totalStudents
        };
        
        // 计算补贴面积（新三重索引结构）
        const subsidizedArea = {
            A: (subsidizedStandards['教学及辅助用房']['全日制硕士'] || 0) * fullTimeMaster + 
               (subsidizedStandards['教学及辅助用房']['全日制博士'] || 0) * fullTimeDoctor + 
               (subsidizedStandards['教学及辅助用房']['留学生'] || 0) * allInternational + 
               (subsidizedStandards['教学及辅助用房']['留学生硕士'] || 0) * internationalMaster + 
               (subsidizedStandards['教学及辅助用房']['留学生博士'] || 0) * internationalDoctor,
            B: (subsidizedStandards['办公用房']['全日制硕士'] || 0) * fullTimeMaster + 
               (subsidizedStandards['办公用房']['全日制博士'] || 0) * fullTimeDoctor + 
               (subsidizedStandards['办公用房']['留学生'] || 0) * allInternational + 
               (subsidizedStandards['办公用房']['留学生硕士'] || 0) * internationalMaster + 
               (subsidizedStandards['办公用房']['留学生博士'] || 0) * internationalDoctor,
            C1: (subsidizedStandards['学生宿舍']['全日制硕士'] || 0) * fullTimeMaster + 
                (subsidizedStandards['学生宿舍']['全日制博士'] || 0) * fullTimeDoctor + 
                (subsidizedStandards['学生宿舍']['留学生'] || 0) * allInternational + 
                (subsidizedStandards['学生宿舍']['留学生硕士'] || 0) * internationalMaster + 
                (subsidizedStandards['学生宿舍']['留学生博士'] || 0) * internationalDoctor,
            C2: (subsidizedStandards['其他生活用房']['全日制硕士'] || 0) * fullTimeMaster + 
                (subsidizedStandards['其他生活用房']['全日制博士'] || 0) * fullTimeDoctor + 
                (subsidizedStandards['其他生活用房']['留学生'] || 0) * allInternational + 
                (subsidizedStandards['其他生活用房']['留学生硕士'] || 0) * internationalMaster + 
                (subsidizedStandards['其他生活用房']['留学生博士'] || 0) * internationalDoctor,
            D: (subsidizedStandards['后勤辅助用房']['全日制硕士'] || 0) * fullTimeMaster + 
               (subsidizedStandards['后勤辅助用房']['全日制博士'] || 0) * fullTimeDoctor + 
               (subsidizedStandards['后勤辅助用房']['留学生'] || 0) * allInternational + 
               (subsidizedStandards['后勤辅助用房']['留学生硕士'] || 0) * internationalMaster + 
               (subsidizedStandards['后勤辅助用房']['留学生博士'] || 0) * internationalDoctor
        };
        
        // 计算总应配面积
        const totalRequiredArea = {
            A: basicRequiredArea.A + subsidizedArea.A,
            B: basicRequiredArea.B + subsidizedArea.B,
            C1: basicRequiredArea.C1 + subsidizedArea.C1,
            C2: basicRequiredArea.C2 + subsidizedArea.C2,
            D: basicRequiredArea.D + subsidizedArea.D
        };
        
        // 计算特殊补助总面积
        const totalSpecialSubsidy = specialSubsidyData.reduce((sum, item) => {
            const area = parseFloat(item['补助面积（m²）']) || 0;
            return sum + area;
        }, 0);
        
        // 准备特殊补助明细数据（保持原始结构用于表格显示）
        const specialSubsidyDetails = specialSubsidyData.map(item => ({
            name: item['特殊用房补助名称'],
            area: item['补助面积（m²）']
        }));
        
        // 计算面积缺口：应配面积 - 现有面积 （正值表示缺口）
        const areaGap = {
            A: totalRequiredArea.A - currentArea.A,
            B: totalRequiredArea.B - currentArea.B,
            C1: totalRequiredArea.C1 - currentArea.C1,
            C2: totalRequiredArea.C2 - currentArea.C2,
            D: totalRequiredArea.D - currentArea.D
        };
        
        // 计算总缺口（特殊补助增加缺口）
        const totalCurrentArea = Object.values(currentArea).reduce((sum, area) => sum + area, 0);
        const totalRequiredAreaSum = Object.values(totalRequiredArea).reduce((sum, area) => sum + area, 0);
        const totalGapBeforeSpecial = totalRequiredAreaSum - totalCurrentArea; // 应配面积 - 现有面积
        const totalGap = totalGapBeforeSpecial + totalSpecialSubsidy; // 特殊补助增加缺口
        const totalSubsidizedArea = Object.values(subsidizedArea).reduce((sum, area) => sum + area, 0);
        
        return {
            '学校名称': schoolName,
            '学校类型': schoolTypeText,
            '标准学校类型': standardSchoolType,
            '计算使用类型': standardSchoolType,
            '全日制本科生人数': fullTimeUndergraduate,
            '全日制专科生人数': fullTimeSpecialist,
            '全日制硕士生人数': fullTimeMaster,
            '全日制博士生人数': fullTimeDoctor,
            '留学生本科生人数': internationalUndergraduate,
            '留学生硕士生人数': internationalMaster,
            '留学生博士生人数': internationalDoctor,
            '学生总人数': totalStudents,
            '本科生总人数': fullTimeUndergraduate,
            '专科生总人数': fullTimeSpecialist,
            '硕士生总人数': allMaster,
            '博士生总人数': allDoctor,
            '留学生总人数': allInternational,
            '现有生活用房总面积': Math.round(totalLivingArea * 100) / 100,
            '现有学生宿舍面积': Math.round(dormitoryArea * 100) / 100,
            '现有其他生活用房面积（计算）': Math.round(currentArea.C2 * 100) / 100,
            '基础应配教学及辅助用房(A)': Math.round(basicRequiredArea.A * 100) / 100,
            '基础应配办公用房(B)': Math.round(basicRequiredArea.B * 100) / 100,
            '基础应配学生宿舍(C1)': Math.round(basicRequiredArea.C1 * 100) / 100,
            '基础应配其他生活用房(C2)': Math.round(basicRequiredArea.C2 * 100) / 100,
            '基础应配后勤辅助用房(D)': Math.round(basicRequiredArea.D * 100) / 100,
            '补贴教学及辅助用房(A)': Math.round(subsidizedArea.A * 100) / 100,
            '补贴办公用房(B)': Math.round(subsidizedArea.B * 100) / 100,
            '补贴学生宿舍(C1)': Math.round(subsidizedArea.C1 * 100) / 100,
            '补贴其他生活用房(C2)': Math.round(subsidizedArea.C2 * 100) / 100,
            '补贴后勤辅助用房(D)': Math.round(subsidizedArea.D * 100) / 100,
            '总应配教学及辅助用房(A)': Math.round(totalRequiredArea.A * 100) / 100,
            '总应配办公用房(B)': Math.round(totalRequiredArea.B * 100) / 100,
            '总应配学生宿舍(C1)': Math.round(totalRequiredArea.C1 * 100) / 100,
            '总应配其他生活用房(C2)': Math.round(totalRequiredArea.C2 * 100) / 100,
            '总应配后勤辅助用房(D)': Math.round(totalRequiredArea.D * 100) / 100,
            '教学及辅助用房缺口(A)': Math.round(areaGap.A * 100) / 100,
            '办公用房缺口(B)': Math.round(areaGap.B * 100) / 100,
            '学生宿舍缺口(C1)': Math.round(areaGap.C1 * 100) / 100,
            '其他生活用房缺口(C2)': Math.round(areaGap.C2 * 100) / 100,
            '后勤辅助用房缺口(D)': Math.round(areaGap.D * 100) / 100,
            '现有建筑总面积': Math.round(totalCurrentArea * 100) / 100,
            '应配建筑总面积': Math.round(totalRequiredAreaSum * 100) / 100,
            '建筑面积总缺口（含特殊补助）': Math.round(totalGap * 100) / 100,
            '建筑面积总缺口（不含特殊补助）': Math.round(totalGapBeforeSpecial * 100) / 100,
            '特殊补助总面积': Math.round(totalSpecialSubsidy * 100) / 100,
            '特殊补助明细': specialSubsidyDetails,
            '特殊补助项目数': specialSubsidyData.length,
            '补贴总面积': Math.round(totalSubsidizedArea * 100) / 100
        };
    } catch (error) {
        console.error('计算建筑面积缺口时出错:', error);
        return {
            '计算状态': '计算出错',
            '错误信息': error.message
        };
    }
}

// 文件下载路由
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(outputDir, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('下载文件时出错:', err);
                res.status(500).json({ error: '下载文件时出错' });
            } else {
                // 下载成功后，延迟10分钟删除文件
                setTimeout(() => {
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`已删除下载完成的文件: ${filename}`);
                        }
                    } catch (deleteError) {
                        console.error(`删除已下载文件失败 ${filename}:`, deleteError.message);
                    }
                }, 10 * 60 * 1000); // 10分钟后删除
            }
        });
    } else {
        res.status(404).json({ error: '文件不存在' });
    }
});

// 清理临时文件路由
app.delete('/cleanup', (req, res) => {
    try {
        // 清理输出文件夹中的旧文件（保留最近的5个文件）
        const outputFiles = fs.readdirSync(outputDir)
            .map(file => ({
                name: file,
                path: path.join(outputDir, file),
                time: fs.statSync(path.join(outputDir, file)).mtime
            }))
            .sort((a, b) => b.time - a.time);
        
        // 删除超过5个的旧文件
        if (outputFiles.length > 5) {
            outputFiles.slice(5).forEach(file => {
                fs.unlinkSync(file.path);
            });
        }
        
        res.json({ success: true, message: '临时文件清理完成' });
    } catch (error) {
        res.status(500).json({ error: '清理文件时出错: ' + error.message });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    res.status(500).json({ error: error.message });
});

// 启动服务器
async function startServer() {
    try {
        console.log('正在初始化数据库连接...');
        
        // 测试数据库连接
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log('数据库连接失败，服务器将在无数据库模式下运行');
            console.log('提示：请确保已执行 db.sql 文件来创建数据库和表结构');
        } else {
            console.log('数据库连接成功，应用已就绪');
            
            // 加载测算标准数据
            console.log('正在加载测算标准数据...');
            await loadCalculationStandards();
        }
        
        // 启动HTTP服务器
        app.listen(PORT, () => {
            console.log(`HTTP服务器运行在 http://localhost:${PORT}`);
            if (isConnected) {
                console.log('MySQL数据库连接正常，数据将被持久化保存');
            } else {
                console.log('数据库未连接，数据将不会被持久化保存');
            }
        });
        
        // 如果SSL证书可用，启动HTTPS服务器
        if (sslOptions) {
            const httpsServer = https.createServer(sslOptions, app);
            httpsServer.listen(HTTPS_PORT, () => {
                console.log(`HTTPS服务器运行在 https://localhost:${HTTPS_PORT}`);
                if (process.env.HTTPS_FORCE_REDIRECT === 'true') {
                    console.log('强制HTTPS重定向已启用，所有HTTP请求将重定向到HTTPS');
                }
            });
        }
        
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 优雅关闭处理
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});

// 404错误处理中间件 - 防止通过不存在的路由进行攻击
app.use((req, res, next) => {
    console.warn(`404页面访问: ${req.originalUrl} from IP: ${req.ip}`);
    res.status(404).json({ 
        success: false, 
        message: '页面不存在' 
    });
});

// 生成格式化的建筑规模测算结果Sheet（用于单条记录下载）
function generateFormattedResultSheet(school) {
    // 解析特殊补助数据
    let specialSubsidies = [];
    let specialSubsidyTotalArea = 0;
    
    try {
        if (school.special_subsidies) {
            specialSubsidies = JSON.parse(school.special_subsidies);
            if (Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                specialSubsidyTotalArea = specialSubsidies.reduce((sum, item) => 
                    sum + (parseFloat(item['补助面积（m²）']) || 0), 0);
            }
        }
    } catch (e) {
        console.warn('解析特殊补助数据失败:', e);
    }

    // 获取现状数据（从数据库字段）
    const currentTeachingArea = parseFloat(school.teaching_area) || 0;
    const currentOfficeArea = parseFloat(school.office_area) || 0;
    const currentTotalLivingArea = parseFloat(school.total_living_area) || 0;
    const currentDormitoryArea = parseFloat(school.dormitory_area) || 0;
    const currentOtherLivingArea = Math.max(0, currentTotalLivingArea - currentDormitoryArea);
    const currentLogisticsArea = parseFloat(school.logistics_area) || 0;

    // 计算测算数据（现状 + 缺额）
    const calculatedTeachingArea = currentTeachingArea + (parseFloat(school.teaching_area_gap) || 0);
    const calculatedOfficeArea = currentOfficeArea + (parseFloat(school.office_area_gap) || 0);
    const calculatedDormitoryArea = currentDormitoryArea + (parseFloat(school.dormitory_area_gap) || 0);
    const calculatedOtherLivingArea = currentOtherLivingArea + (parseFloat(school.other_living_area_gap) || 0);
    const calculatedTotalLivingArea = calculatedDormitoryArea + calculatedOtherLivingArea;
    const calculatedLogisticsArea = currentLogisticsArea + (parseFloat(school.logistics_area_gap) || 0);

    // 计算缺额数据
    const teachingAreaGap = parseFloat(school.teaching_area_gap) || 0;
    const officeAreaGap = parseFloat(school.office_area_gap) || 0;
    const dormitoryAreaGap = parseFloat(school.dormitory_area_gap) || 0;
    const otherLivingAreaGap = parseFloat(school.other_living_area_gap) || 0;
    const totalLivingAreaGap = dormitoryAreaGap + otherLivingAreaGap;
    const logisticsAreaGap = parseFloat(school.logistics_area_gap) || 0;
    const totalAreaGapWithoutSubsidy = teachingAreaGap + officeAreaGap + totalLivingAreaGap + logisticsAreaGap;
    const totalAreaGapWithSubsidy = totalAreaGapWithoutSubsidy + specialSubsidyTotalArea;

    // 学生数据
    const fullTimeSpecialist = parseInt(school.full_time_specialist) || 0;
    const fullTimeUndergraduate = parseInt(school.full_time_undergraduate) || 0;
    const fullTimeMaster = parseInt(school.full_time_master) || 0;
    const fullTimeDoctor = parseInt(school.full_time_doctor) || 0;
    const internationalUndergraduate = parseInt(school.international_undergraduate) || 0;
    const internationalMaster = parseInt(school.international_master) || 0;
    const internationalDoctor = parseInt(school.international_doctor) || 0;

    // 获取院校类别，清理可能的前缀
    let schoolType = school.school_type || '';
    if (schoolType.includes('院校类型：')) {
        schoolType = schoolType.replace('院校类型：', '');
    }
    if (schoolType.includes('院校类别：')) {
        schoolType = schoolType.replace('院校类别：', '');
    }

    // 获取提交用户信息
    const submitterUser = school.submitter_real_name || school.submitter_username || '未知用户';
    const calcYear = parseInt(school.year) || new Date().getFullYear();

    // 创建与在线下载一致的表格数据
    const data = [
        ['高校测算'],
        ['基本办学条件缺口（＞0表示存在缺口）', '', '', ''],
        ['', '', '', `测算时间：${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}`],
        ['测算年份', calcYear, '测算用户', submitterUser],
        [`单位/学校(机构)名称(章)`, school.school_name || '', '院校类型', schoolType],
        ['', '', '', ''],
        ['规划学生数', '', '', ''],
        ['专科全日制学生数(人)', fullTimeSpecialist, '本科全日制学生数(人)', fullTimeUndergraduate],
        ['硕士全日制学生数(人)', fullTimeMaster, '博士全日制学生数(人)', fullTimeDoctor],
        ['本科留学生数(人)', internationalUndergraduate, '硕士留学生数(人)', internationalMaster],
        ['博士留学生(人)', internationalDoctor, '', ''],
        ['', '', '', ''],
        ['测算结果', '', '', ''],
        ['用房类型', '现状建筑面积(m²)', '测算建筑面积(m²)', '测算建筑面积缺额(m²)'],
        ['教学及辅助用房', formatAreaToTwoDecimals(currentTeachingArea), formatAreaToTwoDecimals(calculatedTeachingArea), formatAreaToTwoDecimals(teachingAreaGap)],
        ['办公用房', formatAreaToTwoDecimals(currentOfficeArea), formatAreaToTwoDecimals(calculatedOfficeArea), formatAreaToTwoDecimals(officeAreaGap)],
        ['生活配套用房', formatAreaToTwoDecimals(currentTotalLivingArea), formatAreaToTwoDecimals(calculatedTotalLivingArea), formatAreaToTwoDecimals(totalLivingAreaGap)],
        ['其中:学生宿舍', formatAreaToTwoDecimals(currentDormitoryArea), formatAreaToTwoDecimals(calculatedDormitoryArea), formatAreaToTwoDecimals(dormitoryAreaGap)],
        ['其中:其他生活用房', formatAreaToTwoDecimals(currentOtherLivingArea), formatAreaToTwoDecimals(calculatedOtherLivingArea), formatAreaToTwoDecimals(otherLivingAreaGap)],
        ['后勤补助用房', formatAreaToTwoDecimals(currentLogisticsArea), formatAreaToTwoDecimals(calculatedLogisticsArea), formatAreaToTwoDecimals(logisticsAreaGap)],
        ['小计', formatAreaToTwoDecimals(currentTeachingArea + currentOfficeArea + currentTotalLivingArea + currentLogisticsArea), formatAreaToTwoDecimals(calculatedTeachingArea + calculatedOfficeArea + calculatedTotalLivingArea + calculatedLogisticsArea), formatAreaToTwoDecimals(totalAreaGapWithoutSubsidy)],
        ['测算建筑面积总缺额（不含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(totalAreaGapWithoutSubsidy)],
        ['特殊补助建筑总面积(m²)', '', '', formatAreaToTwoDecimals(specialSubsidyTotalArea)],
        ['测算建筑面积总缺额（含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(totalAreaGapWithSubsidy)],
        ['备注', school.remarks || '', '', '']
    ];

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    ws['!cols'] = [
        { wch: 30 }, // 第一列
        { wch: 25 }, // 第二列  
        { wch: 30 }, // 第三列
        { wch: 25 }  // 第四列
    ];
    
    // 合并单元格
    const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // 标题行
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // 副标题行 - A2B2C2D2合并
        // 第4行（测算年份和测算用户）不需要合并，保持各自独立
        { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }, // A6B6C6D6合并为空
        { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } }, // A7B7C7D7合并并写入"规划学生数"
        { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }, // A12B12C12D12合并为空
        { s: { r: 21, c: 0 }, e: { r: 21, c: 2 } }, // A22B22C22合并 - 总缺额行
        { s: { r: 22, c: 0 }, e: { r: 22, c: 2 } }, // A23B23C23合并 - 补助面积行
        { s: { r: 23, c: 0 }, e: { r: 23, c: 2 } }, // A24B24C24合并 - 含补助总缺额行
        { s: { r: 24, c: 1 }, e: { r: 24, c: 3 } }  // A25的B25C25D25合并 - 备注内容
    ];
    
    ws['!merges'] = merges;
    
    // 定义边框样式
    const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
    };
    
    // 设置单元格样式
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            
            // 添加边框到所有单元格
            ws[cellAddress].s.border = borderStyle;
            
            // 设置对齐方式
            ws[cellAddress].s.alignment = { 
                horizontal: 'center', 
                vertical: 'center',
                wrapText: true 
            };
            
            // 特殊行的样式设置
            if (R === 0) { // 主标题
                ws[cellAddress].s.font = { bold: true, size: 16, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'E6E6FA' } 
                };
            } else if (R === 1) { // 副标题行
                ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'F0F8FF' } 
                };
            } else if (R === 7 || R === 13) { // 小标题行
                ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'F0F8FF' } 
                };
            } else if (R === 14) { // 表头行
                ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'F5F5F5' } 
                };
            } else if (R >= 15 && R <= 20) { // 数据行
                ws[cellAddress].s.font = { size: 10 };
                if (R % 2 === 0) {
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'FAFAFA' } 
                    };
                }
            } else if (R >= 21) { // 汇总行和备注行
                ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                ws[cellAddress].s.fill = { 
                    patternType: 'solid', 
                    fgColor: { rgb: 'FFE4E1' } 
                };
                // 备注行的合并单元格内容左对齐
                if (R === 24 && C > 0) { // 第25行（索引24）的备注内容
                    ws[cellAddress].s.alignment = { 
                        horizontal: 'left', 
                        vertical: 'center',
                        wrapText: true 
                    };
                }
            }
        }
    }
    
    return ws;
}

// 全局错误处理中间件
app.use((err, req, res, next) => {
    console.error(`服务器错误: ${err.message} from IP: ${req.ip}`);
    console.error(err.stack);
    
    // 不暴露敏感错误信息
    res.status(500).json({ 
        success: false, 
        message: '服务器内部错误' 
    });
});

// 启动服务器
startServer();

module.exports = app;
