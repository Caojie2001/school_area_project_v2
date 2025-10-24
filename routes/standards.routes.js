const express = require('express');
const router = express.Router();
const standardsController = require('../controllers/standards.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

// ========================================
// 基线建筑面积路由 (Baseline Areas)
// ========================================

/**
 * @route   GET /api/baseline-areas
 * @desc    获取基线建筑面积列表（支持筛选）
 * @access  Private
 */
router.get('/baseline-areas', requireAuth, standardsController.getAllBaselineAreas);

/**
 * @route   GET /api/baseline-areas/:id
 * @desc    根据ID获取单条基线建筑面积记录
 * @access  Private
 */
router.get('/baseline-areas/:id', requireAuth, standardsController.getBaselineAreaById);

/**
 * @route   GET /api/baseline-areas/school/:schoolName/year/:year
 * @desc    根据学校名称和年份获取基线建筑面积
 * @access  Private
 */
router.get('/baseline-areas/school/:schoolName/year/:year', requireAuth, standardsController.getBaselineAreaBySchoolYear);

/**
 * @route   POST /api/baseline-areas
 * @desc    创建或更新基线建筑面积记录
 * @access  Private
 */
router.post('/baseline-areas', requireAuth, standardsController.saveBaselineArea);

/**
 * @route   DELETE /api/baseline-areas/:id
 * @desc    删除基线建筑面积记录
 * @access  Private
 */
router.delete('/baseline-areas/:id', requireAuth, standardsController.deleteBaselineArea);

/**
 * @route   POST /api/baseline-areas/update
 * @desc    更新底数（覆盖式保存）
 * @access  Private
 */
router.post('/baseline-areas/update', requireAuth, standardsController.updateBaselineAreas);

// ========================================
// 特殊补助基线面积路由 (Special Subsidy Baselines)
// ========================================

/**
 * @route   GET /api/special-subsidy-baselines
 * @desc    获取特殊补助基线面积列表（支持筛选）
 * @access  Private
 */
router.get('/special-subsidy-baselines', requireAuth, standardsController.getAllSpecialSubsidyBaselines);

/**
 * @route   GET /api/special-subsidy-baselines/:id
 * @desc    根据ID获取单条特殊补助基线面积记录
 * @access  Private
 */
router.get('/special-subsidy-baselines/:id', requireAuth, standardsController.getSpecialSubsidyBaselineById);

/**
 * @route   GET /api/special-subsidy-baselines/school/:schoolName/year/:year
 * @desc    根据学校名称和年份获取特殊补助基线面积列表
 * @access  Private
 */
router.get('/special-subsidy-baselines/school/:schoolName/year/:year', requireAuth, standardsController.getSpecialSubsidyBaselinesBySchoolYear);

/**
 * @route   POST /api/special-subsidy-baselines
 * @desc    创建或更新特殊补助基线面积记录
 * @access  Private
 */
router.post('/special-subsidy-baselines', requireAuth, standardsController.saveSpecialSubsidyBaseline);

/**
 * @route   DELETE /api/special-subsidy-baselines/:id
 * @desc    删除特殊补助基线面积记录
 * @access  Private
 */
router.delete('/special-subsidy-baselines/:id', requireAuth, standardsController.deleteSpecialSubsidyBaseline);

// ========================================
// 计算标准路由 (Calculation Standards)
// ========================================

/**
 * @route   GET /api/calculation-standards
 * @desc    获取计算标准
 * @access  Admin
 */
router.get('/calculation-standards', requireAuth, requireAdmin, standardsController.getCalculationStandards);

/**
 * @route   GET /api/test-standards
 * @desc    测试端点
 * @access  Admin
 */
router.get('/test-standards', requireAuth, requireAdmin, standardsController.testStandards);

/**
 * @route   POST /api/calculation-standards
 * @desc    保存测算标准配置
 * @access  Admin
 */
router.post('/calculation-standards', requireAuth, requireAdmin, standardsController.saveCalculationStandards);

/**
 * @route   PUT /api/calculation-standards/single
 * @desc    更新单个标准值
 * @access  Admin
 */
router.put('/calculation-standards/single', requireAuth, requireAdmin, standardsController.updateSingleStandard);

/**
 * @route   GET /api/school-mappings
 * @desc    获取学校类型映射
 * @access  Admin
 */
router.get('/school-mappings', requireAuth, requireAdmin, standardsController.getSchoolMappings);

/**
 * @route   POST /api/school-mappings
 * @desc    更新学校类型映射
 * @access  Admin
 */
router.post('/school-mappings', requireAuth, requireAdmin, standardsController.updateSchoolMappings);

/**
 * @route   POST /api/reload-school-type-mapping
 * @desc    重新加载院校类型映射
 * @access  Admin
 */
router.post('/reload-school-type-mapping', requireAuth, requireAdmin, standardsController.reloadSchoolTypeMapping);

/**
 * @route   GET /api/standards-history
 * @desc    获取标准变更历史
 * @access  Admin
 */
router.get('/standards-history', requireAuth, requireAdmin, standardsController.getStandardsHistory);

module.exports = router;
