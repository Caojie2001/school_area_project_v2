/**
 * 认证中间件
 * 检查用户是否已登录
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ success: false, message: '请先登录' });
        } else {
            return safeRedirect(res, '/login.html');
        }
    }
}

/**
 * 管理员权限中间件
 * 检查用户是否为管理员
 */
function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ success: false, message: '需要管理员权限' });
        } else {
            return res.status(403).send('需要管理员权限');
        }
    }
}

/**
 * 基建中心或管理员权限中间件
 * 检查用户是否为基建中心或管理员
 */
function requireConstructionCenterOrAdmin(req, res, next) {
    if (req.session && req.session.user && 
        (req.session.user.role === 'admin' || req.session.user.role === 'construction_center')) {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ success: false, message: '需要基建中心或管理员权限' });
        } else {
            return res.status(403).send('需要基建中心或管理员权限');
        }
    }
}

/**
 * 安全重定向函数
 * 只允许重定向到安全的内部URL
 */
function safeRedirect(res, url) {
    // 定义允许的重定向URL白名单
    const allowedUrls = [
        '/',
        '/login.html',
        '/#data-entry',
        '/#data-management', 
        '/#statistics',
        '/html/user-management.html',
        '/index.html'
    ];
    
    // 检查是否为相对URL且在白名单中
    if (url && allowedUrls.includes(url)) {
        return res.redirect(url);
    } else {
        console.warn(`阻止不安全的重定向尝试: ${url}`);
        return res.redirect('/');  // 默认重定向到首页
    }
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireConstructionCenterOrAdmin,
    safeRedirect
};
