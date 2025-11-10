/**
 * 安全中间件模块
 * 包含：SSL配置、Helmet安全头、会话管理、URL安全验证
 */

const helmet = require('helmet');
const session = require('express-session');
const fs = require('fs');

/**
 * 加载SSL证书配置
 * @returns {Object|null} SSL配置对象或null
 */
function loadSSLConfig() {
    let sslOptions = null;
    try {
        const keyPath = process.env.SSL_KEY_PATH || './config/certs/key.pem';
        const certPath = process.env.SSL_CERT_PATH || './config/certs/cert.pem';
        
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            sslOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath),
                minVersion: 'TLSv1.2',  // 最低使用 TLS 1.2,禁用不安全的 TLS 1.0 和 1.1
                maxVersion: 'TLSv1.3',  // 最高使用 TLS 1.3
                ciphers: [
                    'TLS_AES_128_GCM_SHA256',
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_CHACHA20_POLY1305_SHA256',
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES256-GCM-SHA384'
                ].join(':'),
                honorCipherOrder: true  // 优先使用服务器端的加密套件顺序
            };
            console.log('SSL证书加载成功 (TLS 1.2-1.3)');
        } else {
            console.warn('SSL证书文件不存在,将仅启用HTTP服务器');
            console.warn(`检查路径: ${keyPath}, ${certPath}`);
        }
    } catch (error) {
        console.error('SSL证书加载失败:', error.message);
        console.warn('将仅启用HTTP服务器');
    }
    return sslOptions;
}

/**
 * HTTPS强制重定向中间件
 * @param {Object} sslOptions - SSL配置对象
 * @param {number} httpsPort - HTTPS端口号
 */
function httpsRedirectMiddleware(sslOptions, httpsPort) {
    return (req, res, next) => {
        // 检查是否启用强制HTTPS重定向且SSL证书可用
        if (process.env.HTTPS_FORCE_REDIRECT === 'true' && sslOptions && !req.secure && req.get('x-forwarded-proto') !== 'https') {
            const httpsUrl = `https://${req.get('host').replace(/:\d+/, '')}:${httpsPort}${req.originalUrl}`;
            console.log(`重定向到HTTPS: ${req.originalUrl} -> ${httpsUrl}`);
            return res.redirect(301, httpsUrl);
        }
        next();
    };
}

/**
 * Helmet安全头配置
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // 允许内联脚本
            scriptSrcAttr: ["'unsafe-inline'"], // 允许内联事件处理器（onclick, onload等）
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * 会话配置中间件工厂函数
 * @param {Object} sslOptions - SSL配置对象
 */
function createSessionMiddleware(sslOptions) {
    return session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-here',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: sslOptions && process.env.HTTPS_FORCE_REDIRECT === 'true', // 当HTTPS可用且强制重定向时启用secure cookies
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24小时
        }
    });
}

/**
 * URL安全验证中间件
 * 防止URL重定向和路径穿越攻击
 */
function urlSecurityMiddleware(req, res, next) {
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
}

module.exports = {
    loadSSLConfig,
    httpsRedirectMiddleware,
    helmetConfig,
    createSessionMiddleware,
    urlSecurityMiddleware
};
