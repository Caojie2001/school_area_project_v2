/**
 * ==============================================
 * auth.js - 用户认证和授权模块
 * ==============================================
 * 
 * 【文件职责】
 * - 用户登录状态检查和维护
 * - 用户认证API调用
 * - 权限控制和验证
 * - 登录/登出流程管理
 * - 用户信息获取和更新
 * 
 * 【主要功能模块】
 * 1. 用户状态管理
 *    - checkUserStatus() 检查登录状态
 *    - getCurrentUser() 获取当前用户
 *    - refreshUserInfo() 刷新用户信息
 * 
 * 2. 登录/登出管理
 *    - login() 用户登录
 *    - logout() 用户登出
 *    - redirectToLogin() 重定向到登录页
 * 
 * 3. 权限控制
 *    - checkPermission() 权限检查
 *    - hasRole() 角色检查
 *    - canAccessPage() 页面访问权限
 *    - showMenuByRole() 根据角色显示菜单
 * 
 * 4. 用户信息显示
 *    - updateUserAvatar() 更新用户头像
 *    - updateUserDisplayInfo() 更新用户显示信息
 *    - formatUserRole() 格式化用户角色
 * 
 * 【API 端点】
 * - GET /api/auth/status - 获取用户状态
 * - POST /api/auth/login - 用户登录
 * - POST /api/auth/logout - 用户登出
 * - GET /api/auth/profile - 获取用户信息
 * 
 * 【用户角色类型】
 * - admin: 管理员 (可访问所有功能)
 * - construction_center: 基建中心 (可访问统计功能)
 * - school: 学校用户 (基础功能)
 */

// ========================================
// 全局变量和状态管理
// ========================================

/**
 * 当前用户信息（全局变量，供其他模块使用）
 * @type {object|null}
 */
let currentUser = null;

/**
 * 用户认证状态
 */
const AuthState = {
    CHECKING: 'checking',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated'
};

/**
 * 用户角色定义
 */
const UserRoles = {
    ADMIN: 'admin',
    CONSTRUCTION_CENTER: 'construction_center',
    SCHOOL: 'school'
};

/**
 * 角色显示名称映射
 */
const ROLE_DISPLAY_NAMES = {
    [UserRoles.ADMIN]: '管理员',
    [UserRoles.CONSTRUCTION_CENTER]: '基建中心',
    [UserRoles.SCHOOL]: '学校用户'
};

/**
 * 菜单权限配置
 * 注意: 只需要配置受限制的菜单项
 * 未在此配置的菜单项默认对所有角色可见
 */
const MENU_PERMISSIONS = {
    'menu-data-entry': [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER, UserRoles.SCHOOL],
    'menu-data-management': [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER, UserRoles.SCHOOL],
    'menu-area-management': [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER, UserRoles.SCHOOL],
    'menu-statistics': [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER],
    'menu-calculation-standards': [UserRoles.ADMIN],
    'menu-user-management': [UserRoles.ADMIN]
};

// ========================================
// 核心认证功能
// ========================================

/**
 * 认证管理器主对象
 */
const AuthManager = {
    
    /**
     * 初始化认证模块
     * 页面加载时自动调用，检查用户登录状态
     */
    async initialize() {
        try {
            console.log('正在初始化认证模块...');
            const isLoggedIn = await this.checkUserStatus();
            if (!isLoggedIn) {
                // checkUserStatus 已经处理了重定向，这里抛出错误停止后续执行
                throw new Error('用户未登录，已重定向到登录页');
            }
        } catch (error) {
            console.error('认证模块初始化失败:', error);
            // 如果错误不是重定向相关的，则执行重定向
            if (!error.message.includes('重定向')) {
                this.redirectToLogin();
            }
            // 重新抛出错误，让调用方知道初始化失败
            throw error;
        }
    },
    
    /**
     * 检查用户登录状态
     * @returns {Promise<boolean>} 是否已登录
     */
    async checkUserStatus() {
        try {
            console.log('正在检查用户登录状态...');
            const result = await AuthAPI.checkStatus();
            
            if (result.success && result.isLoggedIn) {
                console.log('用户已登录:', result.user);
                this.updateUserInfo(result.user);
                return true;
            } else {
                console.log('用户未登录');
                this.redirectToLogin();
                return false;
            }
        } catch (error) {
            console.error('检查用户状态失败:', error);
            this.redirectToLogin();
            return false;
        }
    },
    
    /**
     * 用户登出
     * @returns {Promise<boolean>} 登出是否成功
     */
    async logout() {
        if (!confirm('确定要退出登录吗？')) {
            return false;
        }

        try {
            console.log('正在执行登出操作...');
            const result = await AuthAPI.logout();
            
            if (result.success) {
                console.log('登出成功');
                // 清除本地状态
                currentUser = null;
                // 重定向到登录页
                this.redirectToLogin();
                return true;
            } else {
                console.error('登出失败:', result.message);
                alert('退出登录失败: ' + result.message);
                return false;
            }
        } catch (error) {
            console.error('登出操作失败:', error);
            alert('网络错误，请稍后重试');
            return false;
        }
    },
    
    /**
     * 重定向到登录页面
     */
    redirectToLogin() {
        console.log('重定向到登录页面');
        // 保存当前页面路径，以便登录后返回
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        const redirectUrl = encodeURIComponent(currentPath);
        window.location.href = `/login.html?redirect=${redirectUrl}`;
    },
    
    /**
     * 更新用户信息显示
     * @param {object} user 用户信息对象
     */
    updateUserInfo(user) {
        try {
            // 保存当前用户信息到全局变量
            currentUser = user;
            console.log('更新用户信息:', user);
            
            // 更新所有用户信息显示元素
            this.updateUserDisplayElements(user);
            
            // 根据用户角色显示/隐藏菜单
            this.updateMenuVisibility(user);
            
            // 根据用户角色调整界面
            this.adjustInterfaceByRole(user);
            
            // 初始化权限相关功能
            this.initializeRoleBasedFeatures(user);
            
        } catch (error) {
            console.error('更新用户信息失败:', error);
        }
    },
    
    /**
     * 更新用户显示元素
     * @param {object} user 用户信息
     */
    updateUserDisplayElements(user) {
        console.log('开始更新用户显示元素，用户信息:', user);
        
        const userElements = [
            { avatar: 'userAvatar', name: 'userName', role: 'userRole' },
            { avatar: 'userAvatar2', name: 'userName2', role: 'userRole2' },
            { avatar: 'userAvatar3', name: 'userName3', role: 'userRole3' },
            { avatar: 'userAvatar4', name: 'userName4', role: 'userRole4' }
        ];

        userElements.forEach(elements => {
            const avatarEl = document.getElementById(elements.avatar);
            const nameEl = document.getElementById(elements.name);
            const roleEl = document.getElementById(elements.role);

            console.log(`处理用户元素: ${elements.name}`, {
                nameEl: !!nameEl,
                avatarEl: !!avatarEl,
                roleEl: !!roleEl
            });

            // 更新头像（显示用户名首字母）
            if (avatarEl) {
                const firstLetter = (user.real_name || user.username || 'U').charAt(0).toUpperCase();
                avatarEl.textContent = firstLetter;
                console.log(`更新头像 ${elements.avatar}: ${firstLetter}`);
            }
            
            // 更新用户名
            if (nameEl) {
                const displayName = user.real_name || user.username || '未知用户';
                nameEl.textContent = displayName;
                console.log(`更新用户名 ${elements.name}: ${displayName}`);
            } else if (elements.name === 'userName') {
                // 只对主要的用户名元素发出警告
                console.warn(`主要用户名元素 ${elements.name} 未找到`);
            }
            
            // 更新角色显示
            if (roleEl) {
                const roleText = ROLE_DISPLAY_NAMES[user.role] || '用户';
                roleEl.textContent = roleText;
                console.log(`更新角色 ${elements.role}: ${roleText}`);
            }
        });
    },
    
    /**
     * 根据用户角色更新菜单显示
     * @param {object} user 用户信息
     */
    updateMenuVisibility(user) {
        console.log('更新菜单显示，用户角色:', user.role);
        Object.entries(MENU_PERMISSIONS).forEach(([menuId, allowedRoles]) => {
            const menuElement = document.getElementById(menuId);
            if (menuElement) {
                const hasPermission = allowedRoles.includes(user.role);
                console.log(`菜单 ${menuId}: 权限=${hasPermission}, 允许角色=${allowedRoles}`);
                
                // 使用CSS类来控制显示/隐藏，避免JavaScript延迟
                if (hasPermission) {
                    menuElement.classList.add('visible');
                    // 保留menu-restricted类，因为CSS规则要求同时有这两个类
                } else {
                    menuElement.classList.remove('visible');
                    menuElement.classList.add('menu-restricted');
                }
            } else {
                console.warn(`菜单元素 ${menuId} 未找到`);
            }
        });
    },
    
    /**
     * 根据用户角色调整界面
     * @param {object} user 用户信息
     */
    adjustInterfaceByRole(user) {
        switch (user.role) {
            case UserRoles.SCHOOL:
                this.adjustSchoolUserInterface(user);
                break;
            case UserRoles.CONSTRUCTION_CENTER:
                this.adjustConstructionCenterInterface(user);
                break;
            case UserRoles.ADMIN:
                this.adjustAdminInterface(user);
                break;
            default:
                console.warn('未知的用户角色:', user.role);
        }
    },
    
    /**
     * 调整学校用户界面
     * @param {object} user 用户信息
     */
    adjustSchoolUserInterface(user) {
        // 自动选择并锁定学校名称
        if (user.school_name) {
            const schoolNameSelect = document.getElementById('schoolName');
            if (schoolNameSelect) {
                // 检查学校选项是否已经加载（有多个选项）
                if (schoolNameSelect.options.length > 1) {
                    schoolNameSelect.value = user.school_name;
                    // 设置为只读状态
                    schoolNameSelect.style.backgroundColor = '#f5f5f5';
                    schoolNameSelect.style.cursor = 'not-allowed';
                    schoolNameSelect.style.pointerEvents = 'none';
                    schoolNameSelect.setAttribute('data-locked', 'true');
                    
                    // 更新学校类型显示
                    if (typeof updateSchoolType === 'function') {
                        updateSchoolType();
                    }
                } else {
                    // 学校选项还没有加载，只设置样式，值的设置留给数据填报模块
                    schoolNameSelect.style.backgroundColor = '#f5f5f5';
                    schoolNameSelect.style.cursor = 'not-allowed';
                    schoolNameSelect.style.pointerEvents = 'none';
                    schoolNameSelect.setAttribute('data-locked', 'true');
                    console.log('学校选项还没有加载，将由数据填报模块自动设置学校名称');
                }
            }
        }
        
        // 隐藏统计分析菜单
        const statsMenu = document.getElementById('menu-statistics');
        if (statsMenu) {
            statsMenu.style.display = 'none';
        }
    },
    
    /**
     * 调整基建中心用户界面
     * @param {object} user 用户信息
     */
    adjustConstructionCenterInterface(user) {
        // 基建中心用户不能访问用户管理
        const userManagementMenu = document.getElementById('menu-user-management');
        if (userManagementMenu) {
            userManagementMenu.style.display = 'none';
        }
    },
    
    /**
     * 调整管理员界面
     * @param {object} user 用户信息
     */
    adjustAdminInterface(user) {
        // 管理员拥有所有权限，无需特殊调整
        console.log('管理员用户，拥有完整权限');
    },
    
    /**
     * 初始化基于角色的功能
     * @param {object} user 用户信息
     */
    initializeRoleBasedFeatures(user) {
        // 初始化年份数据（适用于有权限访问统计分析的用户）
        if (user.role === UserRoles.ADMIN || user.role === UserRoles.CONSTRUCTION_CENTER) {
            setTimeout(() => {
                console.log('初始化年份数据...');
                if (typeof loadOverviewAvailableYears === 'function') {
                    loadOverviewAvailableYears();
                }
            }, 500);
        }
    },
    
    /**
     * 获取当前用户信息
     * @returns {object|null} 当前用户信息
     */
    getCurrentUser() {
        return currentUser;
    },
    
    /**
     * 检查当前用户是否有指定权限
     * @param {string} permission 权限标识
     * @returns {boolean} 是否有权限
     */
    hasPermission(permission) {
        if (!currentUser) {
            return false;
        }
        
        // 管理员拥有所有权限
        if (currentUser.role === UserRoles.ADMIN) {
            return true;
        }
        
        // 根据权限类型进行检查
        switch (permission) {
            case 'user_management':
                return currentUser.role === UserRoles.ADMIN;
            case 'statistics':
                return [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER].includes(currentUser.role);
            case 'data_entry':
                return true; // 所有登录用户都可以填报数据
            case 'data_management':
                return [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER, UserRoles.SCHOOL].includes(currentUser.role);
            default:
                return false;
        }
    },
    
    /**
     * 获取用户角色显示名称
     * @param {string} role 角色代码
     * @returns {string} 角色显示名称
     */
    getRoleDisplayName(role) {
        return ROLE_DISPLAY_NAMES[role] || '未知角色';
    },
    
    /**
     * 检查用户认证状态和权限
     * @param {string} requiredRole 可选的必需角色
     * @returns {Promise<boolean>} 认证是否成功
     */
    async checkAuth(requiredRole = null) {
        try {
            // 如果还没有用户信息，先检查登录状态
            if (!currentUser) {
                const isLoggedIn = await this.checkUserStatus();
                if (!isLoggedIn) {
                    return false;
                }
            }
            
            // 如果指定了必需角色，检查角色权限
            if (requiredRole) {
                if (!this.hasRole(requiredRole)) {
                    console.warn(`用户角色 ${currentUser.role} 没有权限访问需要 ${requiredRole} 角色的功能`);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('权限检查失败:', error);
            return false;
        }
    },
    
    /**
     * 检查用户是否有指定角色
     * @param {string} requiredRole 需要的角色
     * @returns {boolean} 是否有该角色
     */
    hasRole(requiredRole) {
        return currentUser && currentUser.role === requiredRole;
    }
};

// ========================================
// 兼容性函数（保持向后兼容）
// ========================================

/**
 * 检查用户登录状态
 * @returns {Promise<boolean>} 是否已登录
 */
async function checkUserStatus() {
    try {
        console.log('正在检查用户登录状态...');
        const result = await AuthAPI.checkStatus();
        
        if (result.success && result.isLoggedIn) {
            console.log('用户已登录:', result.user);
            updateUserInfo(result.user);
            return true;
        } else {
            console.log('用户未登录');
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('检查用户状态失败:', error);
        redirectToLogin();
        return false;
    }
}

/**
 * 用户登出
 * @returns {Promise<boolean>} 登出是否成功
 */
async function logout() {
    if (!confirm('确定要退出登录吗？')) {
        return false;
    }

    try {
        console.log('正在执行登出操作...');
        const result = await AuthAPI.logout();
        
        if (result.success) {
            console.log('登出成功');
            // 清除本地状态
            currentUser = null;
            // 重定向到登录页
            redirectToLogin();
            return true;
        } else {
            console.error('登出失败:', result.message);
            alert('退出登录失败: ' + result.message);
            return false;
        }
    } catch (error) {
        console.error('登出操作失败:', error);
        alert('网络错误，请稍后重试');
        return false;
    }
}

/**
 * 重定向到登录页面
 */
function redirectToLogin() {
    console.log('重定向到登录页面');
    // 保存当前页面路径，以便登录后返回
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    const redirectUrl = encodeURIComponent(currentPath);
    window.location.href = `/login.html?redirect=${redirectUrl}`;
}

// ========================================
// 用户信息管理
// ========================================

/**
 * 更新用户信息显示
 * @param {object} user 用户信息对象
 */
function updateUserInfo(user) {
    try {
        // 保存当前用户信息到全局变量
        currentUser = user;
        console.log('更新用户信息:', user);
        
        // 更新所有用户信息显示元素
        updateUserDisplayElements(user);
        
        // 根据用户角色显示/隐藏菜单
        updateMenuVisibility(user);
        
        // 根据用户角色调整界面
        adjustInterfaceByRole(user);
        
        // 初始化权限相关功能
        initializeRoleBasedFeatures(user);
        
    } catch (error) {
        console.error('更新用户信息失败:', error);
    }
}

/**
 * 更新用户显示元素
 * @param {object} user 用户信息
 */
function updateUserDisplayElements(user) {
    const userElements = [
        { avatar: 'userAvatar', name: 'userName', role: 'userRole' },
        { avatar: 'userAvatar2', name: 'userName2', role: 'userRole2' },
        { avatar: 'userAvatar3', name: 'userName3', role: 'userRole3' },
        { avatar: 'userAvatar4', name: 'userName4', role: 'userRole4' }
    ];

    userElements.forEach(elements => {
        const avatarEl = document.getElementById(elements.avatar);
        const nameEl = document.getElementById(elements.name);
        const roleEl = document.getElementById(elements.role);

        // 更新头像（显示用户名首字母）
        if (avatarEl) {
            const firstLetter = (user.real_name || user.username || 'U').charAt(0).toUpperCase();
            avatarEl.textContent = firstLetter;
        }
        
        // 更新用户名
        if (nameEl) {
            nameEl.textContent = user.real_name || user.username || '未知用户';
        }
        
        // 更新角色显示
        if (roleEl) {
            const roleText = ROLE_DISPLAY_NAMES[user.role] || '用户';
            roleEl.textContent = roleText;
        }
    });
}

/**
 * 根据用户角色更新菜单显示
 * @param {object} user 用户信息
 */
function updateMenuVisibility(user) {
    Object.entries(MENU_PERMISSIONS).forEach(([menuId, allowedRoles]) => {
        const menuElement = document.getElementById(menuId);
        if (menuElement) {
            // 使用CSS类来控制显示/隐藏，与AuthManager保持一致
            if (allowedRoles.includes(user.role)) {
                menuElement.classList.add('visible');
                // 保留menu-restricted类，因为CSS规则要求同时有这两个类
            } else {
                menuElement.classList.remove('visible');
                menuElement.classList.add('menu-restricted');
            }
        }
    });
}

// ========================================
// 权限控制和界面调整
// ========================================

/**
 * 根据用户角色调整界面
 * @param {object} user 用户信息
 */
function adjustInterfaceByRole(user) {
    switch (user.role) {
        case UserRoles.SCHOOL:
            adjustSchoolUserInterface(user);
            break;
        case UserRoles.CONSTRUCTION_CENTER:
            adjustConstructionCenterInterface(user);
            break;
        case UserRoles.ADMIN:
            adjustAdminInterface(user);
            break;
        default:
            console.warn('未知的用户角色:', user.role);
    }
}

/**
 * 调整学校用户界面
 * @param {object} user 用户信息
 */
function adjustSchoolUserInterface(user) {
    // 自动选择并锁定学校名称
    if (user.school_name) {
        const schoolNameSelect = document.getElementById('schoolName');
        if (schoolNameSelect) {
            // 检查学校选项是否已经加载（有多个选项）
            if (schoolNameSelect.options.length > 1) {
                schoolNameSelect.value = user.school_name;
                // 设置为只读状态
                schoolNameSelect.style.backgroundColor = '#f5f5f5';
                schoolNameSelect.style.cursor = 'not-allowed';
                schoolNameSelect.style.pointerEvents = 'none';
                schoolNameSelect.setAttribute('data-locked', 'true');
                
                // 更新学校类型显示
                if (typeof updateSchoolType === 'function') {
                    updateSchoolType();
                }
            } else {
                // 学校选项还没有加载，只设置样式，值的设置留给数据填报模块
                schoolNameSelect.style.backgroundColor = '#f5f5f5';
                schoolNameSelect.style.cursor = 'not-allowed';
                schoolNameSelect.style.pointerEvents = 'none';
                schoolNameSelect.setAttribute('data-locked', 'true');
                console.log('学校选项还没有加载，将由数据填报模块自动设置学校名称');
            }
        }
    }
    
    // 隐藏统计分析菜单
    const statsMenu = document.getElementById('menu-statistics');
    if (statsMenu) {
        statsMenu.style.display = 'none';
    }
}

/**
 * 调整基建中心用户界面
 * @param {object} user 用户信息
 */
function adjustConstructionCenterInterface(user) {
    // 基建中心用户不能访问用户管理
    const userManagementMenu = document.getElementById('menu-user-management');
    if (userManagementMenu) {
        userManagementMenu.style.display = 'none';
    }
}

/**
 * 调整管理员界面
 * @param {object} user 用户信息
 */
function adjustAdminInterface(user) {
    // 管理员拥有所有权限，无需特殊调整
    console.log('管理员用户，拥有完整权限');
}

/**
 * 初始化基于角色的功能
 * @param {object} user 用户信息
 */
function initializeRoleBasedFeatures(user) {
    // 初始化年份数据（适用于有权限访问统计分析的用户）
    if (user.role === UserRoles.ADMIN || user.role === UserRoles.CONSTRUCTION_CENTER) {
        setTimeout(() => {
            console.log('初始化年份数据...');
            if (typeof loadOverviewAvailableYears === 'function') {
                loadOverviewAvailableYears();
            }
        }, 500);
    }
}

// ========================================
// 权限检查功能
// ========================================

/**
 * 检查当前用户是否有指定权限
 * @param {string} permission 权限标识
 * @returns {boolean} 是否有权限
 */
function checkPermission(permission) {
    if (!currentUser) {
        return false;
    }
    
    // 管理员拥有所有权限
    if (currentUser.role === UserRoles.ADMIN) {
        return true;
    }
    
    // 根据权限类型进行检查
    switch (permission) {
        case 'user_management':
            return currentUser.role === UserRoles.ADMIN;
        case 'statistics':
            return [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER].includes(currentUser.role);
        case 'data_entry':
            return true; // 所有登录用户都可以填报数据
        case 'data_management':
            return [UserRoles.ADMIN, UserRoles.CONSTRUCTION_CENTER].includes(currentUser.role);
        default:
            return false;
    }
}

/**
 * 检查用户是否有指定角色
 * @param {string} requiredRole 需要的角色
 * @returns {boolean} 是否有该角色
 */
function hasRole(requiredRole) {
    return currentUser && currentUser.role === requiredRole;
}

/**
 * 根据角色显示菜单
 * @param {object} user 用户信息
 */
function showMenuByRole(user) {
    updateMenuVisibility(user);
}

// ========================================
// 工具函数
// ========================================

/**
 * 获取当前用户信息
 * @returns {object|null} 当前用户信息
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isUserLoggedIn() {
    return currentUser !== null;
}

/**
 * 获取当前用户角色
 * @returns {string|null} 用户角色
 */
function getCurrentUserRole() {
    return currentUser ? currentUser.role : null;
}

/**
 * 检查当前用户是否为管理员
 * @returns {boolean} 是否为管理员
 */
function isCurrentUserAdmin() {
    return currentUser && currentUser.role === UserRoles.ADMIN;
}

/**
 * 检查当前用户是否为学校用户
 * @returns {boolean} 是否为学校用户
 */
function isCurrentUserSchool() {
    return currentUser && currentUser.role === UserRoles.SCHOOL;
}

/**
 * 检查当前用户是否为基建中心用户
 * @returns {boolean} 是否为基建中心用户
 */
function isCurrentUserConstructionCenter() {
    return currentUser && currentUser.role === UserRoles.CONSTRUCTION_CENTER;
}

/**
 * 获取用户角色显示名称
 * @param {string} role 角色代码
 * @returns {string} 角色显示名称
 */
function getRoleDisplayName(role) {
    return ROLE_DISPLAY_NAMES[role] || '未知角色';
}

// ========================================
// 兼容性函数
// ========================================

/**
 * 隐藏在线表单（兼容性函数）
 * @deprecated 此函数已不需要，表单已直接嵌入页面
 */
function hideOnlineForm() {
    console.log('Form is embedded, no need to hide');
}

// ========================================
// 页面初始化
// ========================================

/**
 * 初始化认证模块
 */
async function initializeAuth() {
    try {
        console.log('正在初始化认证模块...');
        await checkUserStatus();
    } catch (error) {
        console.error('认证模块初始化失败:', error);
        redirectToLogin();
    }
}

// ========================================
// 导出到全局作用域
// ========================================

if (typeof window !== 'undefined') {
    // 认证管理器（主要接口）
    window.AuthManager = AuthManager;
    
    // 核心功能
    window.checkUserStatus = checkUserStatus;
    window.logout = logout;
    window.updateUserInfo = updateUserInfo;
    window.adjustInterfaceByRole = adjustInterfaceByRole;
    window.redirectToLogin = redirectToLogin;
    
    // 权限检查
    window.checkPermission = checkPermission;
    window.hasRole = hasRole;
    window.showMenuByRole = showMenuByRole;
    
    // 用户信息
    window.getCurrentUser = getCurrentUser;
    window.isUserLoggedIn = isUserLoggedIn;
    window.getCurrentUserRole = getCurrentUserRole;
    window.isCurrentUserAdmin = isCurrentUserAdmin;
    window.isCurrentUserSchool = isCurrentUserSchool;
    window.isCurrentUserConstructionCenter = isCurrentUserConstructionCenter;
    window.getRoleDisplayName = getRoleDisplayName;
    
    // 兼容性
    window.hideOnlineForm = hideOnlineForm;
    
    // 常量
    window.UserRoles = UserRoles;
    window.AuthState = AuthState;
    window.ROLE_DISPLAY_NAMES = ROLE_DISPLAY_NAMES;
    window.MENU_PERMISSIONS = MENU_PERMISSIONS;
    
    // 全局变量
    window.currentUser = currentUser;
}

// ========================================
// 模块信息
// ========================================

console.log('✅ 认证管理模块 (auth.js) 已加载');
console.log('📦 提供功能: 用户认证、权限管理、界面调整');
console.log('🔗 依赖模块: api.js');
