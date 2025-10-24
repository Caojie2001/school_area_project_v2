/**
 * Statistics Routes
 * 统计数据和趋势分析相关路由
 */

const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// =====================================================
// 统计数据路由
// =====================================================

// 获取统计数据（支持年份筛选）
router.get('/statistics', requireAuth, statisticsController.getStatistics);

// 获取学校统计数据
router.get('/statistics/schools', requireAuth, statisticsController.getSchoolStatistics);

// 获取统计概览数据
router.get('/statistics/overview', requireAuth, statisticsController.getStatisticsOverview);

// 获取趋势数据（多年度对比）
router.get('/statistics/trends', requireAuth, statisticsController.getStatisticsTrends);

// =====================================================
// 填报概览路由
// =====================================================

// 获取填报概览记录
router.get('/overview/records', requireAuth, statisticsController.getOverviewRecords);

module.exports = router;
