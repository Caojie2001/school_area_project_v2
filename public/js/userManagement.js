/**
 * ==============================================
 * userManagement.js - 用户管理功能模块
 * ==============================================
 * 
 * 【文件职责】
 * - 系统用户的增删改查管理
 * - 用户权限和角色管理
 * - 用户列表的显示和筛选
 * - 用户信息的编辑和维护
 * - 仅供管理员使用
 * 
 * 【主要功能模块】
 * 1. 用户列表管理
 *    - loadUserList() 加载用户列表
 *    - displayUsers() 显示用户表格
 *    - filterUsers() 筛选用户
 *    - sortUsers() 用户排序
 *    - refreshUserList() 刷新用户列表
 * 
 * 2. 用户CRUD操作
 *    - createUser() 创建新用户
 *    - updateUser() 更新用户信息
 *    - deleteUser() 删除用户
 *    - getUserDetails() 获取用户详情
 * 
 * 3. 用户信息管理
 *    - showCreateUserModal() 显示创建用户弹窗
 *    - showEditUserModal() 显示编辑用户弹窗
 *    - validateUserData() 验证用户数据
 *    - formatUserInfo() 格式化用户信息
 * 
 * 4. 权限和角色管理
 *    - updateUserRole() 更新用户角色
 *    - checkUserPermissions() 检查用户权限
 *    - assignSchoolToUser() 分配学校给用户
 *    - validateRoleChanges() 验证角色变更
 * 
 * 5. 用户状态管理
 *    - activateUser() 激活用户
 *    - deactivateUser() 停用用户
 *    - resetUserPassword() 重置用户密码
 *    - updateUserStatus() 更新用户状态
 * 
 * 【用户数据结构】
 * - id: 用户ID
 * - username: 用户名
 * - real_name: 真实姓名
 * - email: 邮箱
 * - role: 角色 (admin/construction_center/school)
 * - school_id: 所属学校ID
 * - is_active: 是否激活
 * - created_at: 创建时间
 * - updated_at: 更新时间
 * 
 * 【用户角色权限】
 * - admin: 管理员 - 完全权限
 * - construction_center: 基建中心 - 查看所有数据，统计分析
 * - school: 学校用户 - 仅操作自己学校数据
 * 
 * 【表单验证规则】
 * - 用户名：必填，唯一，3-20字符
 * - 真实姓名：必填，2-50字符
 * - 邮箱：格式验证，唯一
 * - 密码：8-20字符，包含字母和数字
 * - 角色：必选
 * - 学校：学校用户必选
 * 
 * 【API 端点】
 * - GET /api/users - 获取用户列表
 * - POST /api/users - 创建用户
 * - GET /api/users/:id - 获取用户详情
 * - PUT /api/users/:id - 更新用户
 * - DELETE /api/users/:id - 删除用户
 * - POST /api/users/:id/reset-password - 重置密码
 * 
 * 【权限控制】
 * - 仅管理员(admin)可访问用户管理功能
 * - 其他角色用户无法访问此模块
 */

// ========================================
// 状态管理和配置
// ========================================

// 用户管理状态
const UserManagementState = {
    LOADING: 'loading',
    LOADED: 'loaded',
    CREATING: 'creating',
    UPDATING: 'updating',
    DELETING: 'deleting'
};

// 用户状态定义
const UserStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending'
};

// 表单验证规则
const ValidationRules = {
    username: {
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/
    },
    realName: {
        required: true,
        minLength: 2,
        maxLength: 50
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        required: true,
        minLength: 8,
        maxLength: 20,
        pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/
    }
};

// ========================================
// 用户管理器
// ========================================

const UserManagementManager = {
    // 当前状态
    currentState: UserManagementState.LOADING,
    
    // 用户列表数据
    users: [],
    
    /**
     * 初始化用户管理模块
     */
    async initialize() {
        try {
            console.log('开始初始化用户管理模块...');
            this.currentState = UserManagementState.LOADING;
            
            await this.loadUserList();
            
            this.currentState = UserManagementState.LOADED;
            console.log('用户管理模块初始化完成');
            
        } catch (error) {
            console.error('用户管理模块初始化失败:', error);
            this.currentState = UserManagementState.LOADING;
        }
    },
    
    /**
     * 加载用户列表
     */
    async loadUserList() {
        const loading = document.getElementById('userManagementLoading');
        const tableContainer = document.getElementById('userTableContainer');
        const emptyState = document.getElementById('userEmptyState');
        
        if (loading) loading.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        
        try {
            const result = await UserManagementAPI.getUsers();
            console.log('获取用户列表结果:', result);
            
            if (result.success) {
                // 处理不同的返回格式
                this.users = result.users || result.data || [];
                console.log('解析的用户列表:', this.users);
                this.displayUsers(this.users);
            } else {
                console.warn('用户列表为空或获取失败:', result);
                // 设置空数组确保displayUsers不会出错
                this.users = [];
                this.displayUsers(this.users);
                this.showUserManagementAlert(result.message || '获取用户列表失败', 'error');
            }
        } catch (error) {
            console.error('获取用户列表失败:', error);
            // 设置空数组确保displayUsers不会出错
            this.users = [];
            this.displayUsers(this.users);
            this.showUserManagementAlert('网络错误，请稍后重试', 'error');
        } finally {
            if (loading) loading.style.display = 'none';
        }
    },
    
    /**
     * 显示用户列表
     */
    displayUsers(userList) {
        const tableContainer = document.getElementById('userTableContainer');
        const emptyState = document.getElementById('userEmptyState');
        const tableBody = document.getElementById('userTableBody');
        
        // 防护性检查
        if (!userList || !Array.isArray(userList)) {
            console.warn('用户列表无效:', userList);
            userList = [];
        }
        
        if (userList.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        
        if (!tableBody) {
            console.error('用户表格元素未找到');
            return;
        }
        
        tableBody.innerHTML = '';
        
        userList.forEach(user => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #e9ecef';
            row.innerHTML = `
                <td style="padding: 12px 15px;">${user.username}</td>
                <td style="padding: 12px 15px;">${user.real_name || '-'}</td>
                <td style="padding: 12px 15px;">${user.email || '-'}</td>
                <td style="padding: 12px 15px;">${this.getRoleBadge(user.role)}</td>
                <td style="padding: 12px 15px;">${user.school_name || '-'}</td>
                <td style="padding: 12px 15px;">${this.getStatusBadge(user.status)}</td>
                <td style="padding: 12px 15px;">${this.formatDate(user.created_at)}</td>
                <td style="padding: 12px 15px;">${user.last_login ? this.formatDate(user.last_login) : '-'}</td>
                <td style="padding: 12px 15px;">
                    <div style="display: flex; gap: 8px;">
                        ${user.username !== 'admin' && user.role !== 'admin' ? 
                            (user.status === 'active' ? 
                                `<button style="padding: 6px 12px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="toggleUserStatus(${user.id}, 'inactive')">禁用</button>` :
                                `<button style="padding: 6px 12px; font-size: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="toggleUserStatus(${user.id}, 'active')">启用</button>`
                            ) : 
                            '<span style="padding: 0px 0px; font-size: 12px; color: #6c757d;">系统账户</span>'
                        }
                        ${user.username !== 'admin' && user.role !== 'admin' ? 
                            `<button style="padding: 6px 12px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="deleteUserConfirm(${user.id}, '${user.username}')">删除</button>` :
                            '<span style="padding: 0px 0px; font-size: 12px; color: #6c757d;">不可删除</span>'
                        }
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    },
    
    /**
     * 获取角色显示名称
     */
    getRoleDisplayName(role) {
        switch(role) {
            case 'admin':
                return '管理员';
            case 'construction_center':
                return '基建中心';
            case 'school':
                return '学校用户';
            default:
                return '用户';
        }
    },
    
    /**
     * 获取状态显示样式
     */
    getStatusBadge(status) {
        if (status === 'active') {
            return '<span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #d4edda; color: #155724;">激活</span>';
        } else {
            return '<span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #f8d7da; color: #721c24;">禁用</span>';
        }
    },
    
    /**
     * 获取角色显示样式
     */
    getRoleBadge(role) {
        let color, bgColor;
        switch(role) {
            case 'admin':
                color = '#0c5460';
                bgColor = '#d1ecf1';
                break;
            case 'construction_center':
                color = '#856404';
                bgColor = '#fff3cd';
                break;
            case 'school':
                color = '#155724';
                bgColor = '#d4edda';
                break;
            default:
                color = '#383d41';
                bgColor = '#e2e3e5';
        }
        return `<span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: ${bgColor}; color: ${color};">${this.getRoleDisplayName(role)}</span>`;
    },
    
    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
    },
    
    /**
     * 显示用户管理提示消息
     */
    showUserManagementAlert(message, type = 'info') {
        const alertEl = document.getElementById('userManagementAlert');
        if (!alertEl) return;
        
        let bgColor, textColor, borderColor;
        
        switch(type) {
            case 'success':
                bgColor = '#d4edda';
                textColor = '#155724';
                borderColor = '#c3e6cb';
                break;
            case 'error':
                bgColor = '#f8d7da';
                textColor = '#721c24';
                borderColor = '#f5c6cb';
                break;
            default:
                bgColor = '#d1ecf1';
                textColor = '#0c5460';
                borderColor = '#bee5eb';
        }
        
        alertEl.style.display = 'block';
        alertEl.style.padding = '15px';
        alertEl.style.borderRadius = '6px';
        alertEl.style.border = `1px solid ${borderColor}`;
        alertEl.style.background = bgColor;
        alertEl.style.color = textColor;
        alertEl.style.fontSize = '12px';
        alertEl.textContent = message;
        
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 5000);
    },
    
    /**
     * 显示创建用户模态框
     */
    async showCreateUserModal() {
        const modal = document.getElementById('createUserModal');
        const form = document.getElementById('createUserForm');
        const schoolNameGroup = document.getElementById('schoolNameGroup');
        
        if (modal) modal.style.display = 'block';
        if (form) form.reset();
        if (schoolNameGroup) schoolNameGroup.style.display = 'none';
        
        // 加载学校选项
        await this.loadSchoolOptions();
    },
    
    /**
     * 加载学校选项
     */
    async loadSchoolOptions() {
        const schoolSelect = document.getElementById('school_name');
        if (!schoolSelect) return;
        
        try {
            const response = await UserManagementAPI.getSchools();
            
            if (response.success && response.schools) {
                // 清空现有选项（保留第一个"请选择学校"选项）
                schoolSelect.innerHTML = '<option value="">请选择学校</option>';
                
                // 添加学校选项
                response.schools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.school_name;
                    option.textContent = school.school_name;
                    schoolSelect.appendChild(option);
                });
                
                console.log(`加载了 ${response.schools.length} 个学校选项`);
            } else {
                console.error('加载学校选项失败:', response.message);
            }
        } catch (error) {
            console.error('加载学校选项时出错:', error);
        }
    },
    
    /**
     * 隐藏创建用户模态框
     */
    hideCreateUserModal() {
        const modal = document.getElementById('createUserModal');
        if (modal) modal.style.display = 'none';
    },
    
    /**
     * 切换学校名称字段显示
     */
    toggleSchoolNameField() {
        const roleSelect = document.getElementById('createRole');
        const schoolNameGroup = document.getElementById('schoolNameGroup');
        
        if (roleSelect && schoolNameGroup) {
            if (roleSelect.value === 'school') {
                schoolNameGroup.style.display = 'block';
            } else {
                schoolNameGroup.style.display = 'none';
            }
        }
    },
    
    /**
     * 创建用户
     */
    async createUser() {
        const form = document.getElementById('createUserForm');
        if (!form) return;
        
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            password: formData.get('password'),
            real_name: formData.get('real_name'),
            email: formData.get('email'),
            role: formData.get('role'),
            school_name: formData.get('school_name')
        };
        
        // 基本验证
        if (!userData.username || !userData.password || !userData.role) {
            this.showUserManagementAlert('请填写必填字段', 'error');
            return;
        }
        
        if (userData.role === 'school' && !userData.school_name) {
            this.showUserManagementAlert('学校用户必须选择学校名称', 'error');
            return;
        }
        
        try {
            const result = await UserManagementAPI.createUser(userData);
            
            if (result.success) {
                this.showUserManagementAlert('用户创建成功', 'success');
                this.hideCreateUserModal();
                
                // 立即刷新用户列表以显示新创建的用户
                console.log('用户创建成功，正在刷新用户列表...');
                await this.loadUserList();
            } else {
                this.showUserManagementAlert(result.message || '创建用户失败', 'error');
            }
        } catch (error) {
            console.error('创建用户失败:', error);
            this.showUserManagementAlert('网络错误，请稍后重试', 'error');
        }
    },
    
    /**
     * 切换用户状态
     */
    async toggleUserStatus(userId, newStatus) {
        try {
            const result = await UserManagementAPI.toggleUserStatus(userId, newStatus);
            
            if (result.success) {
                this.showUserManagementAlert(result.message, 'success');
                
                // 立即刷新用户列表以显示状态变更
                console.log('用户状态更新成功，正在刷新用户列表...');
                await this.loadUserList();
            } else {
                this.showUserManagementAlert(result.message || '更新用户状态失败', 'error');
            }
        } catch (error) {
            console.error('更新用户状态失败:', error);
            this.showUserManagementAlert('网络错误，请稍后重试', 'error');
        }
    },
    
    /**
     * 删除用户确认
     */
    deleteUserConfirm(userId, username) {
        if (confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) {
            this.deleteUser(userId);
        }
    },
    
    /**
     * 删除用户
     */
    async deleteUser(userId) {
        try {
            const result = await UserManagementAPI.deleteUser(userId);
            
            if (result.success) {
                this.showUserManagementAlert(result.message, 'success');
                
                // 立即刷新用户列表以移除已删除的用户
                console.log('用户删除成功，正在刷新用户列表...');
                await this.loadUserList();
            } else {
                this.showUserManagementAlert(result.message || '删除用户失败', 'error');
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            this.showUserManagementAlert('网络错误，请稍后重试', 'error');
        }
    },
    
    /**
     * 更新用户管理页面的用户信息
     */
    updateUserManagementUserInfo(user) {
        const avatarEl = document.getElementById('userAvatar4');
        const nameEl = document.getElementById('userName4');
        const roleEl = document.getElementById('userRole4');
        
        if (avatarEl && nameEl && roleEl) {
            avatarEl.textContent = user.real_name ? user.real_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase();
            nameEl.textContent = user.real_name || user.username;
            
            let roleText = '用户';
            if (user.role === 'admin') roleText = '管理员';
            else if (user.role === 'construction_center') roleText = '基建中心';
            else if (user.role === 'school') roleText = '学校用户';
            
            roleEl.textContent = roleText;
        }
    }
};

// 创建全局实例
const userManagementManager = UserManagementManager;

// ========================================
// 全局函数兼容层
// ========================================

// 加载用户管理页面内容
function loadUserManagementContent() {
    return userManagementManager.initialize();
}

// 加载用户列表
function loadUserList() {
    return userManagementManager.loadUserList();
}

// 显示用户列表
function displayUsers(userList) {
    return userManagementManager.displayUsers(userList);
}

// 获取角色显示名称
function getRoleDisplayName(role) {
    return userManagementManager.getRoleDisplayName(role);
}

// 获取状态显示样式
function getStatusBadge(status) {
    return userManagementManager.getStatusBadge(status);
}

// 获取角色显示样式
function getRoleBadge(role) {
    return userManagementManager.getRoleBadge(role);
}

// 格式化日期
function formatDate(dateString) {
    return userManagementManager.formatDate(dateString);
}

// 显示用户管理提示消息
function showUserManagementAlert(message, type = 'info') {
    return userManagementManager.showUserManagementAlert(message, type);
}

// 显示创建用户模态框
function showCreateUserModal() {
    return userManagementManager.showCreateUserModal();
}

// 隐藏创建用户模态框
function hideCreateUserModal() {
    return userManagementManager.hideCreateUserModal();
}

// 切换学校名称字段显示
function toggleSchoolNameField() {
    return userManagementManager.toggleSchoolNameField();
}

// 创建用户
function createUser() {
    return userManagementManager.createUser();
}

// 切换用户状态
function toggleUserStatus(userId, newStatus) {
    return userManagementManager.toggleUserStatus(userId, newStatus);
}

// 删除用户确认
function deleteUserConfirm(userId, username) {
    return userManagementManager.deleteUserConfirm(userId, username);
}

// 删除用户
function deleteUser(userId) {
    return userManagementManager.deleteUser(userId);
}

// 更新用户管理页面的用户信息
function updateUserManagementUserInfo(user) {
    return userManagementManager.updateUserManagementUserInfo(user);
}

// 将对象添加到全局作用域，以便其他模块使用
if (typeof window !== 'undefined') {
    window.UserManagementManager = UserManagementManager;
    window.userManagementManager = userManagementManager;
    
    // 全局函数
    window.loadUserManagementContent = loadUserManagementContent;
    window.loadUserList = loadUserList;
    window.displayUsers = displayUsers;
    window.getRoleDisplayName = getRoleDisplayName;
    window.getStatusBadge = getStatusBadge;
    window.getRoleBadge = getRoleBadge;
    window.formatDate = formatDate;
    window.showUserManagementAlert = showUserManagementAlert;
    window.showCreateUserModal = showCreateUserModal;
    window.hideCreateUserModal = hideCreateUserModal;
    window.toggleSchoolNameField = toggleSchoolNameField;
    window.createUser = createUser;
    window.toggleUserStatus = toggleUserStatus;
    window.deleteUserConfirm = deleteUserConfirm;
    window.deleteUser = deleteUser;
    window.updateUserManagementUserInfo = updateUserManagementUserInfo;
    
    // 全局变量兼容性 - 使用代理保持引用
    Object.defineProperty(window, 'users', {
        get: () => userManagementManager.users,
        set: (value) => { userManagementManager.users = value; }
    });
}

// 支持模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserManagementManager, userManagementManager };
}
