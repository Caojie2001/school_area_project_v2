/**
 * School Routes
 * 学校注册表和学校数据相关路由
 */

const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/school.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// =====================================================
// 学校注册表路由
// =====================================================

// 获取学校注册表（完整列表）
router.get('/schools/registry', requireAuth, schoolController.getSchoolRegistry);

// 获取学校名称列表（用于下拉框）
router.get('/schools/names', requireAuth, schoolController.getSchoolNames);

// 获取有测算历史记录的学校列表
router.get('/schools/with-calculation-history', requireAuth, schoolController.getSchoolsWithCalculationHistory);

// 获取院校类型列表
router.get('/schools/types', requireAuth, schoolController.getSchoolTypes);

// 获取学校类型映射关系
router.get('/schools/type-mapping', requireAuth, schoolController.getSchoolTypeMapping);

// 按类型获取学校列表
router.get('/schools/by-type/:type', requireAuth, schoolController.getSchoolsByType);

// 获取单个学校详细信息
router.get('/schools/detail/:schoolName', requireAuth, schoolController.getSchoolDetail);

// =====================================================
// 学校历史数据路由
// =====================================================

// 获取所有学校历史数据（支持年份筛选）
router.get('/schools', requireAuth, schoolController.getSchoolHistory);

// 获取各校各年度最新记录（支持多维度筛选）
router.get('/schools/latest', requireAuth, schoolController.getLatestSchoolRecords);

// =====================================================
// 向后兼容路由
// =====================================================

// 获取学校选项列表（用于表单下拉框）
router.get('/school-options', requireAuth, schoolController.getSchoolOptions);

// =====================================================
// 学生数数据来源路由
// =====================================================

// 获取学生数数据来源列表
router.get('/student-data-sources', requireAuth, schoolController.getStudentDataSources);

module.exports = router;
