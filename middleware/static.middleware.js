/**
 * 静态文件和页面路由中间件
 * 包含：静态文件服务配置、页面路由重定向
 */

const express = require('express');
const path = require('path');

/**
 * 配置静态文件服务中间件
 * @param {Object} app - Express应用实例
 */
function configureStaticFiles(app) {
    // 登录页面不需要认证
    app.use('/login.html', express.static(path.join(__dirname, '../public', 'login.html')));
    
    // 配置public目录的静态文件服务
    app.use(express.static('public', { 
        index: false,  // 禁用默认index文件服务
        dotfiles: 'deny',  // 拒绝访问点文件
        etag: false,  // 禁用ETag
        extensions: ['html', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot'],  // 只允许特定扩展名
        setHeaders: (res, filePath, stat) => {
            // 安全头设置
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            
            // 确保路径在允许的目录内
            const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
            const publicPath = path.normalize(path.join(__dirname, '../public')).replace(/\\/g, '/');
            
            if (!normalizedPath.startsWith(publicPath)) {
                res.status(403).end();
                return;
            }
        }
    }));
}

/**
 * 配置页面路由重定向
 * @param {Object} app - Express应用实例
 * @param {Function} requireAuth - 认证中间件
 * @param {Function} requireAdmin - 管理员权限中间件
 * @param {Function} requireConstructionCenterOrAdmin - 基建中心或管理员权限中间件
 * @param {Function} safeRedirect - 安全重定向函数
 */
function configurePageRoutes(app, requireAuth, requireAdmin, requireConstructionCenterOrAdmin, safeRedirect) {
    // 主页路由 - 重定向到新版高校测算页面
    app.get('/', requireAuth, (req, res) => {
        safeRedirect(res, '/html/data-entry-new.html');
    });

    // index.html 路由 - 重定向到历史测算页面（兼容旧版链接）
    app.get('/index.html', requireAuth, (req, res) => {
        safeRedirect(res, '/html/data-entry-new.html');
    });

    // 功能页面路由重定向到主页面的相应部分
    app.get('/html/data-entry.html', requireAuth, (req, res) => {
        safeRedirect(res, '/#data-entry');
    });

    app.get('/html/data-management.html', requireAuth, (req, res) => {
        safeRedirect(res, '/#data-management');
    });

    // 统计页面 - 需要基建中心或管理员权限
    app.get('/html/statistics.html', requireAuth, requireConstructionCenterOrAdmin, (req, res) => {
        safeRedirect(res, '/#statistics');
    });

    // 用户管理页面 - 保持独立页面
    app.get('/html/user-management.html', requireAuth, requireAdmin, (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'html', 'user-management.html'));
    });

    // 兼容旧的用户管理路由
    app.get('/user-management.html', requireAuth, requireAdmin, (req, res) => {
        safeRedirect(res, '/html/user-management.html');
    });
}

module.exports = {
    configureStaticFiles,
    configurePageRoutes
};
