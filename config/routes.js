/**
 * ==============================================
 * routes.js - 路由配置文件
 * ==============================================
 * 
 * 【文件职责】
 * - API路由定义
 * - 中间件配置
 * - 路由权限控制
 */

const RouteConfig = {
    // API端点配置
    api: {
        prefix: '/api',
        version: 'v1',
        
        // 公开路由（无需认证）
        public: [
            '/api/auth/login',
            '/api/auth/logout',
            '/api/system/status',
            '/api/system/database-status'
        ],

        // 需要认证的路由
        protected: [
            '/api/auth/verify',
            '/api/auth/user-info',
            '/api/schools/*',
            '/api/data/*',
            '/api/statistics/*',
            '/api/users/*',
            '/api/export/*'
        ],

        // 管理员专用路由
        adminOnly: [
            '/api/users/create',
            '/api/users/update/*',
            '/api/users/delete/*',
            '/api/system/logs',
            '/api/system/config'
        ],

        // 建设中心权限路由
        constructionCenter: [
            '/api/statistics/*',
            '/api/export/batch',
            '/api/data/all'
        ]
    },

    // 静态文件路由
    static: {
        public: '/public',
        uploads: '/uploads',
        downloads: '/downloads'
    },

    // 页面路由
    pages: {
        login: '/login.html',
        dashboard: '/index.html',
        userManagement: '/user-management.html',
        notFound: '/404.html',
        unauthorized: '/401.html'
    },

    // CORS配置
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
    },

    // 限流配置
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100, // 每个IP最多100个请求
        message: {
            error: '请求过于频繁，请稍后再试'
        },
        standardHeaders: true,
        legacyHeaders: false
    }
};

module.exports = RouteConfig;
