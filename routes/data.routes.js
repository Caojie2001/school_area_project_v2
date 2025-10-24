/**
 * Data Routes
 * 规划学生数和现状面积预设相关路由
 */

const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// =====================================================
// 现状面积预设路由
// =====================================================

// 获取所有现状面积预设列表
router.get('/current-area-presets', requireAuth, dataController.getAllCurrentAreaPresets);

// 根据ID获取现状面积预设
router.get('/current-area-presets/:id', requireAuth, dataController.getCurrentAreaPresetById);

// 根据学校名称获取现状面积预设
router.get('/current-area-presets/school/:schoolName', requireAuth, dataController.getCurrentAreaPresetBySchool);

// 根据学校名称和数据来源获取现状面积预设
router.get('/current-area-presets/school/:schoolName/source/:dataSource', requireAuth, dataController.getCurrentAreaPresetBySchoolAndSource);

// 创建或更新现状面积预设
router.post('/current-area-presets', requireAuth, dataController.saveCurrentAreaPreset);

// 删除现状面积预设记录
router.delete('/current-area-presets/:id', requireAuth, dataController.deleteCurrentAreaPreset);

// =====================================================
// 规划学生数路由
// =====================================================

// 获取规划学生数列表（支持筛选）
router.get('/planned-students', requireAuth, dataController.getPlannedStudents);

// 创建或更新规划学生数
router.post('/planned-students', requireAuth, dataController.savePlannedStudents);

// 删除规划学生数
router.delete('/planned-students/:id', requireAuth, dataController.deletePlannedStudents);

module.exports = router;
