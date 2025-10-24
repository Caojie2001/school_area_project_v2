const express = require('express');
const router = express.Router();
const recordController = require('../controllers/record.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');
const { batchLimiter } = require('../middleware/rateLimiter.middleware');

/**
 * Record Routes (删除和清理操作)
 * 
 * 路由列表:
 * 1. DELETE /api/school-record/:id       - 删除单条学校记录
 * 2. DELETE /api/school-combination      - 删除学校组合记录
 * 3. DELETE /api/clear-all-data          - 清空所有数据（危险操作）
 * 4. DELETE /cleanup                     - 清理临时文件
 */

// 删除单条学校记录
router.delete('/api/school-record/:id', requireAuth, recordController.deleteSchoolRecord);

// 删除学校组合记录（按年份-学校-用户组合）
router.delete('/api/school-combination', requireAuth, batchLimiter, recordController.deleteSchoolCombination);

// 清空所有数据 - 危险操作，仅限管理员
router.delete('/api/clear-all-data', requireAuth, requireAdmin, recordController.clearAllData);

// 清理临时文件 - 仅限管理员
router.delete('/cleanup', requireAuth, requireAdmin, recordController.cleanupTempFiles);

module.exports = router;
