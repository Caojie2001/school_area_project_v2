const bcrypt = require('bcrypt');
const { getPool } = require('./database');

class AuthService {
    // 用户登录
    static async login(loginName, password) {
        try {
            const pool = await getPool();
            // 支持使用真实姓名或用户名登录
            const [users] = await pool.execute(
                'SELECT id, username, password, real_name, role, school_name, status FROM users WHERE (username = ? OR real_name = ?) AND status = "active"',
                [loginName, loginName]
            );

            if (users.length === 0) {
                return { success: false, message: '用户名或密码错误' };
            }

            const user = users[0];
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return { success: false, message: '用户名或密码错误' };
            }

            // 更新最后登录时间
            await pool.execute(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            // 返回用户信息（不包含密码）
            const { password: _, ...userInfo } = user;
            return { 
                success: true, 
                user: userInfo,
                message: '登录成功'
            };

        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }

    // 创建新用户
    static async createUser(userData) {
        try {
            const { username, password, real_name, email, role = 'school', school_name } = userData;

            // 检查用户名是否已存在
            const pool = await getPool();
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            if (existingUsers.length > 0) {
                return { success: false, message: '用户名已存在' };
            }

            // 验证学校用户必须提供学校名称
            if (role === 'school' && !school_name) {
                return { success: false, message: '学校用户必须指定对应的学校名称' };
            }

            // 密码加密
            const hashedPassword = await bcrypt.hash(password, 10);

            // 插入新用户
            const [result] = await pool.execute(
                'INSERT INTO users (username, password, real_name, email, role, school_name) VALUES (?, ?, ?, ?, ?, ?)',
                [username, hashedPassword, real_name || null, email || null, role, school_name || null]
            );

            return { 
                success: true, 
                userId: result.insertId,
                message: '用户创建成功'
            };

        } catch (error) {
            console.error('创建用户失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }

    // 修改密码
    static async changePassword(userId, oldPassword, newPassword) {
        try {
            const pool = await getPool();
            
            // 获取用户当前密码
            const [users] = await pool.execute(
                'SELECT password FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return { success: false, message: '用户不存在' };
            }

            // 验证旧密码
            const isValidOldPassword = await bcrypt.compare(oldPassword, users[0].password);
            if (!isValidOldPassword) {
                return { success: false, message: '旧密码错误' };
            }

            // 加密新密码
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // 更新密码
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedNewPassword, userId]
            );

            return { success: true, message: '密码修改成功' };

        } catch (error) {
            console.error('修改密码失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }

    // 获取用户信息
    static async getUserById(userId) {
        try {
            const pool = await getPool();
            const [users] = await pool.execute(
                'SELECT id, username, real_name, email, role, school_name, status, created_at, last_login FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return { success: false, message: '用户不存在' };
            }

            return { success: true, user: users[0] };

        } catch (error) {
            console.error('获取用户信息失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }

    // 获取所有用户（仅管理员）
    static async getAllUsers() {
        try {
            const pool = await getPool();
            const [users] = await pool.execute(
                'SELECT id, username, real_name, email, role, school_name, status, created_at, last_login FROM users ORDER BY created_at DESC'
            );

            return { success: true, users };

        } catch (error) {
            console.error('获取用户列表失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }

    // 更新用户状态
    static async updateUserStatus(userId, status) {
        try {
            const pool = await getPool();
            
            // 检查用户是否存在，并获取用户信息
            const [users] = await pool.execute(
                'SELECT id, username, role FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return { success: false, message: '用户不存在' };
            }

            const user = users[0];
            
            // 防止禁用系统管理员账户
            if ((user.username === 'admin' || user.role === 'admin') && status === 'inactive') {
                return { success: false, message: '不能禁用系统管理员账户' };
            }
            
            await pool.execute(
                'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, userId]
            );

            return { success: true, message: `用户状态已更新为${status === 'active' ? '激活' : '禁用'}` };

        } catch (error) {
            console.error('更新用户状态失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }

    // 删除用户
    static async deleteUser(userId) {
        try {
            const pool = await getPool();
            
            // 检查用户是否存在，并获取用户角色信息
            const [users] = await pool.execute(
                'SELECT id, username, role FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return { success: false, message: '用户不存在' };
            }

            const user = users[0];
            
            // 防止删除系统管理员账户
            if (user.username === 'admin' || user.role === 'admin') {
                return { success: false, message: '不能删除系统管理员账户' };
            }

            // 删除用户（注意：这会级联删除相关数据）
            await pool.execute(
                'DELETE FROM users WHERE id = ?',
                [userId]
            );

            return { success: true, message: '用户删除成功' };

        } catch (error) {
            console.error('删除用户失败:', error);
            return { success: false, message: '系统错误，请稍后重试' };
        }
    }
}

module.exports = AuthService;
