const rateLimit = require('express-rate-limit');

/**
 * 日志记录函数 - 记录触发限流的请求
 */
function logRateLimit(req, type) {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const path = req.path;
    console.log(`[RATE LIMIT] ${timestamp} - ${type} - IP: ${ip} - Path: ${path}`);
}

/**
 * 1. API通用限流中间件
 * 防止API滥用
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 400, // 每个IP最多400次请求 (原100次的4倍)
    standardHeaders: true, // 返回 RateLimit-* 头
    legacyHeaders: false, // 禁用 X-RateLimit-* 头
    handler: (req, res) => {
        logRateLimit(req, 'API通用限流');
        res.status(429).json({
            success: false,
            message: '请求过于频繁，请15分钟后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * 2. 登录接口严格限流
 * 防止暴力破解
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 20, // 每个IP最多20次尝试 (原5次的4倍)
    skipSuccessfulRequests: true, // 成功的登录不计入限制
    message: {
        success: false,
        message: '登录尝试次数过多，请15分钟后再试'
    },
    handler: (req, res) => {
        logRateLimit(req, '登录限流（可能的暴力破解尝试）');
        res.status(429).json({
            success: false,
            message: '登录尝试次数过多，请15分钟后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * 3. 计算接口限流
 * 防止资源滥用
 */
const calculationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 80, // 每个IP每分钟最多80次计算 (原20次的4倍)
    message: {
        success: false,
        message: '计算请求过于频繁，请稍后再试'
    },
    handler: (req, res) => {
        logRateLimit(req, '计算接口限流');
        res.status(429).json({
            success: false,
            message: '计算请求过于频繁，请1分钟后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * 4. 下载接口限流
 * 防止数据爬取
 */
const downloadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 40, // 每个IP每分钟最多40次下载 (原10次的4倍)
    message: {
        success: false,
        message: '下载请求过于频繁，请稍后再试'
    },
    handler: (req, res) => {
        logRateLimit(req, '下载接口限流（可能的数据爬取）');
        res.status(429).json({
            success: false,
            message: '下载请求过于频繁，请1分钟后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * 5. 批量操作限流
 * 防止批量爬取/删除
 */
const batchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 20, // 每个IP每分钟最多20次批量操作 (原5次的4倍)
    message: {
        success: false,
        message: '批量操作过于频繁，请稍后再试'
    },
    handler: (req, res) => {
        logRateLimit(req, '批量操作限流');
        res.status(429).json({
            success: false,
            message: '批量操作过于频繁，请1分钟后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

module.exports = {
    apiLimiter,
    loginLimiter,
    calculationLimiter,
    downloadLimiter,
    batchLimiter,
    logRateLimit
};
