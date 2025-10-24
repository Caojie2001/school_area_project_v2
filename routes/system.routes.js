const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');
const { requireAuth, requireAdmin, requireConstructionCenterOrAdmin, safeRedirect } = require('../middleware/auth.middleware');

/**
 * System Routes (页面路由和系统功能)
 * 
 * 路由列表:
 * 页面路由 (7个):
 * 1. GET  /                              - 首页重定向
 * 2. GET  /index.html                    - index页面重定向
 * 3. GET  /html/data-entry.html          - 数据录入页面
 * 4. GET  /html/data-management.html     - 数据管理页面
 * 5. GET  /html/statistics.html          - 统计页面
 * 6. GET  /html/user-management.html     - 用户管理页面
 * 7. GET  /user-management.html          - 用户管理页面（兼容）
 * 
 * 系统端点 (2个):
 * 8. GET  /health                        - 健康检查
 * 9. GET  /api/database/status           - 数据库状态检查
 * 
 * 数据查询 (5个):
 * 10. GET /api/years                     - 获取可用年份
 * 11. GET /api/student-planning-params   - 获取学生规划参数
 * 12. GET /api/users                     - 获取可用测算用户
 * 13. GET /api/view-record/:id           - 查看记录详情
 * 14. GET /api/school-type/:schoolName   - 获取学校类型
 */

// ========================================
// 页面路由 (7个)
// ========================================

// 首页重定向
router.get('/', requireAuth, (req, res) => {
    systemController.redirectToHome(req, res, safeRedirect);
});

// index.html 路由 - 重定向到历史测算页面
router.get('/index.html', requireAuth, (req, res) => {
    systemController.redirectIndex(req, res, safeRedirect);
});

// 数据录入页面重定向
router.get('/html/data-entry.html', requireAuth, (req, res) => {
    systemController.redirectDataEntry(req, res, safeRedirect);
});

// 数据管理页面重定向
router.get('/html/data-management.html', requireAuth, (req, res) => {
    systemController.redirectDataManagement(req, res, safeRedirect);
});

// 统计页面重定向 - 需要基建中心或管理员权限
router.get('/html/statistics.html', requireAuth, requireConstructionCenterOrAdmin, (req, res) => {
    systemController.redirectStatistics(req, res, safeRedirect);
});

// 用户管理页面 - 需要管理员权限
router.get('/html/user-management.html', requireAuth, requireAdmin, systemController.userManagementPage);

// 兼容旧的用户管理路由
router.get('/user-management.html', requireAuth, requireAdmin, (req, res) => {
    systemController.redirectUserManagement(req, res, safeRedirect);
});

// ========================================
// 系统端点 (2个)
// ========================================

// 健康检查端点
router.get('/health', systemController.healthCheck);

// 数据库状态检查端点 - 仅限管理员
router.get('/api/database/status', requireAuth, requireAdmin, systemController.databaseStatus);

// ========================================
// 数据查询 (5个)
// ========================================

// 获取可用年份
router.get('/api/years', systemController.getYears);

// 获取学生规划参数（按年份分组）
router.get('/api/student-planning-params', systemController.getStudentPlanningParams);

// 获取可用的测算用户
router.get('/api/users', requireAuth, systemController.getUsers);

// 查看记录详情
router.get('/api/view-record/:id', requireAuth, systemController.viewRecord);

// 获取学校类型（通过学校名称）
router.get('/api/school-type/:schoolName', systemController.getSchoolType);

module.exports = router;
