/**
 * 在线计算路由
 * 定义在线计算相关的路由
 */

const express = require('express');
const router = express.Router();

const onlineController = require('../controllers/online.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

// 创建限流器（从server.js导入或在这里重新定义）
const rateLimit = require('express-rate-limit');

// 计算限流器：每个IP每15分钟最多100次请求
const calculationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
});

// 下载限流器：每个IP每15分钟最多50次请求
const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: '下载请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /online-calculate
 * 在线计算接口
 */
router.post('/online-calculate', calculationLimiter, requireAuth, onlineController.onlineCalculate);

/**
 * POST /online-download
 * 在线计算结果下载
 */
router.post('/online-download', downloadLimiter, onlineController.onlineDownload);

/**
 * POST /api/download-calculation-results
 * 批量下载测算结果（单个Excel或ZIP压缩包）
 */
router.post('/api/download-calculation-results', requireAuth, onlineController.downloadCalculationResults);

module.exports = router;
