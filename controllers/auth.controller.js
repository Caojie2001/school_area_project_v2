const AuthService = require('../config/authService');

/**
 * 用户登录
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 输入验证和清理
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }

        // 防止过长输入
        if (username.length > 50 || password.length > 200) {
            return res.status(400).json({ success: false, message: '输入长度超出限制' });
        }

        // 清理输入 - 移除潜在的危险字符
        const cleanUsername = username.trim().replace(/[<>'"`;]/g, '');
        
        if (cleanUsername !== username.trim()) {
            return res.status(400).json({ success: false, message: '用户名包含非法字符' });
        }

        const result = await AuthService.login(cleanUsername, password);
        
        if (result.success) {
            req.session.user = result.user;
            
            res.json({ success: true, message: result.message, user: result.user });
        } else {
            res.status(401).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('登录API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
};

/**
 * 用户登出
 */
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('登出错误:', err);
            return res.status(500).json({ success: false, message: '登出失败' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: '已成功登出' });
    });
};

/**
 * 获取认证状态
 */
exports.getStatus = (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            success: true, 
            isLoggedIn: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            success: true, 
            isLoggedIn: false 
        });
    }
};

/**
 * 创建用户（管理员）
 */
exports.createUser = async (req, res) => {
    try {
        const result = await AuthService.createUser(req.body);
        res.json(result);
    } catch (error) {
        console.error('创建用户API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
};

/**
 * 获取所有用户（管理员）
 */
exports.getAllUsers = async (req, res) => {
    try {
        const result = await AuthService.getAllUsers();
        res.json(result);
    } catch (error) {
        console.error('获取用户列表API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
};

/**
 * 更新用户状态（管理员）
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const result = await AuthService.updateUserStatus(req.params.id, status);
        res.json(result);
    } catch (error) {
        console.error('更新用户状态API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
};

/**
 * 删除用户（管理员）
 */
exports.deleteUser = async (req, res) => {
    try {
        const result = await AuthService.deleteUser(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('删除用户API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.session.user.id;
        
        const result = await AuthService.changePassword(userId, oldPassword, newPassword);
        res.json(result);
    } catch (error) {
        console.error('修改密码API错误:', error);
        res.status(500).json({ success: false, message: '系统错误' });
    }
};
