const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimiter.middleware');

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 * @limiter loginLimiter (5次/15分钟)
 */
router.post('/login', loginLimiter, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/status
 * @desc    获取认证状态
 * @access  Public
 */
router.get('/status', authController.getStatus);

/**
 * @route   POST /api/auth/create-user
 * @desc    创建新用户
 * @access  Admin
 */
router.post('/create-user', requireAuth, requireAdmin, authController.createUser);

/**
 * @route   GET /api/auth/users
 * @desc    获取所有用户列表
 * @access  Admin
 */
router.get('/users', requireAuth, requireAdmin, authController.getAllUsers);

/**
 * @route   PUT /api/auth/user/:id/status
 * @desc    更新用户状态
 * @access  Admin
 */
router.put('/user/:id/status', requireAuth, requireAdmin, authController.updateUserStatus);

/**
 * @route   DELETE /api/auth/user/:id
 * @desc    删除用户
 * @access  Admin
 */
router.delete('/user/:id', requireAuth, requireAdmin, authController.deleteUser);

/**
 * @route   POST /api/auth/change-password
 * @desc    修改密码
 * @access  Private (登录用户)
 */
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
