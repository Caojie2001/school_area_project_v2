const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const os = require('os');

// 引入数据库相关模块
require('dotenv').config();
const { testConnection } = require('./config/database');

// 引入中间件
const { requireAuth, requireAdmin, requireConstructionCenterOrAdmin, safeRedirect } = require('./middleware/auth.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { 
    loadSSLConfig, 
    httpsRedirectMiddleware, 
    helmetConfig, 
    createSessionMiddleware, 
    urlSecurityMiddleware 
} = require('./middleware/security.middleware');
const { configureStaticFiles, configurePageRoutes } = require('./middleware/static.middleware');

// 引入路由
const authRoutes = require('./routes/auth.routes');
const standardsRoutes = require('./routes/standards.routes');
const dataRoutes = require('./routes/data.routes');
const schoolRoutes = require('./routes/school.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const downloadRoutes = require('./routes/download.routes');
const recordRoutes = require('./routes/record.routes');
const systemRoutes = require('./routes/system.routes');
const onlineRoutes = require('./config/routes/online.routes');

// 引入工具模块
const { startCleanupSchedule } = require('./config/utils/helpers');
const { loadCalculationStandards } = require('./config/utils/calculator');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// ============================================
// 获取本机IP地址的辅助函数
// ============================================
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // 跳过内部地址和非IPv4地址
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// ============================================
// SSL证书和安全配置
// ============================================
const sslOptions = loadSSLConfig();

// HTTPS强制重定向
app.use(httpsRedirectMiddleware(sslOptions, HTTPS_PORT));

// Helmet安全头
app.use(helmetConfig);

// 应用通用限流到所有 API 路由
app.use('/api/', apiLimiter);

console.log('✅ 安全中间件已启用: Helmet + Rate Limiting');

// 会话配置
app.use(createSessionMiddleware(sslOptions));

// URL安全验证中间件
app.use(urlSecurityMiddleware);

// ============================================
// 基础中间件
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// 静态文件服务
// ============================================
configureStaticFiles(app);

// ========================================
// 路由模块
// ========================================

// 认证路由
app.use('/api/auth', authRoutes);

// 标准管理路由
app.use('/api', standardsRoutes);

// 数据管理路由
app.use('/api', dataRoutes);

// 学校管理路由
app.use('/api', schoolRoutes);

// 统计分析路由
app.use('/api', statisticsRoutes);

// 下载功能路由
app.use('/', downloadRoutes);

// 记录删除路由
app.use('/', recordRoutes);

// 系统功能路由
app.use('/', systemRoutes);

// 在线计算路由
app.use('/', onlineRoutes);

// ============================================
// 页面路由
// ============================================
configurePageRoutes(app, requireAuth, requireAdmin, requireConstructionCenterOrAdmin, safeRedirect);

// 保护其他需要认证的路由
app.use('/api', requireAuth);

// ============================================
// 初始化
// ============================================
// 创建output文件夹（如果不存在）
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 启动定时清理任务
startCleanupSchedule();

// ============================================
// 服务器启动
// ============================================

async function startServer() {
    try {
        console.log('正在初始化数据库连接...');
        
        // 获取本机IP地址
        const localIP = getLocalIPAddress();
        
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
        
        // 启动HTTP服务器 - 监听所有网络接口以支持内网访问
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🚀 HTTP服务器已启动:`);
            console.log(`  ✓ 本地访问: http://localhost:${PORT}`);
            console.log(`  ✓ 内网访问: http://${localIP}:${PORT}`);
            if (isConnected) {
                console.log('  ✓ MySQL数据库连接正常，数据将被持久化保存');
            } else {
                console.log('  ⚠ 数据库未连接，数据将不会被持久化保存');
            }
        });
        
        // 如果SSL证书可用，启动HTTPS服务器 - 监听所有网络接口
        if (sslOptions) {
            const httpsServer = https.createServer(sslOptions, app);
            httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
                console.log(`\n🔒 HTTPS服务器已启动:`);
                console.log(`  ✓ 本地访问: https://localhost:${HTTPS_PORT}`);
                console.log(`  ✓ 内网访问: https://${localIP}:${HTTPS_PORT}`);
                if (process.env.HTTPS_FORCE_REDIRECT === 'true') {
                    console.log('  ✓ 强制HTTPS重定向已启用');
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

// ============================================
// 错误处理
// ============================================
// 404错误处理
app.use((req, res, next) => {
    console.warn(`404页面访问: ${req.originalUrl} from IP: ${req.ip}`);
    res.status(404).json({ 
        success: false, 
        message: '页面不存在' 
    });
});

// 全局错误处理
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
