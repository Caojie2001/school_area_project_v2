const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/download.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { downloadLimiter } = require('../middleware/rateLimiter.middleware');

/**
 * Download Routes
 * 
 * 路由列表:
 * 1. POST   /online-download                    - 在线下载（前端测算结果直接下载）
 * 2. POST   /api/download-calculation-results   - 下载批量测算结果（新版测算页面）
 * 3. POST   /api/batch-download                 - 批量下载（数据管理页面）
 * 4. GET    /api/download-record/:id            - 下载历史记录
 * 5. GET    /download/:filename                 - 下载文件（通用下载端点）
 */

// 在线下载（前端测算结果直接下载）
router.post('/online-download', downloadLimiter, downloadController.onlineDownload);

// 下载批量测算结果（新版测算页面）
router.post('/api/download-calculation-results', requireAuth, downloadController.downloadCalculationResults);

// 批量下载（数据管理页面）
router.post('/api/batch-download', requireAuth, downloadController.batchDownload);

// 下载历史记录
router.get('/api/download-record/:id', downloadLimiter, downloadController.downloadRecord);

// 下载文件（通用下载端点）
router.get('/download/:filename', downloadController.downloadFile);

module.exports = router;
