/**
 * ==============================================
 * main.js - 主应用入口文件
 * ==============================================
 * 
 * 【文件职责】
 * - 应用初始化和全局配置
 * - 页面路由和导航控制
 * - 全局事件监听和处理
 * - 应用生命周期管理
 * - 全局变量和常量定义
 * 
 * 【主要功能模块】
 * 1. 应用初始化
 *    - DOMContentLoaded 事件处理
 *    - 用户状态检查
 *    - 页面权限控制
 * 
 * 2. 页面导航系统
 *    - showPage() 函数
 *    - 菜单项切换逻辑
 *    - 页面显示/隐藏控制
 *    - 移动端侧边栏控制
 * 
 * 3. 全局状态管理
 *    - currentUser 全局变量
 *    - 用户权限状态
 *    - 页面状态维护
 * 
 * 4. 响应式布局控制
 *    - 移动端菜单切换
 *    - 侧边栏折叠/展开
 *    - 屏幕尺寸适配
 * 
 * 【依赖关系】
 * - 依赖: auth.js (用户认证)
 * - 依赖: utils.js (工具函数)
 * - 被依赖: 所有其他模块
 * 
 * 【全局变量】
 * - currentUser: 当前登录用户信息
 * - pageState: 当前页面状态
 * 
 * 【待迁移的主要函数】
 * - showPage()
 * - toggleSidebar()
 * - updateUserInfo()
 * - 页面初始化相关函数
 */
// ========================================
// 全局变量和状态管理
// ========================================

// 页面状态管理
let pageState = {
    currentPage: 'data-entry',
    isSidebarOpen: true,
    isMobile: false
};

// ========================================
// 应用主管理器
// ========================================

/**
 * 主应用管理器
 */
const AppManager = {
    
    /**
     * 初始化应用
     */
    async initialize() {
        try {
            console.log('开始初始化主应用...');
            
            // 检测设备类型
            this.detectDeviceType();
            
            // 设置全局事件监听器
            this.setupEventListeners();
            
            // 初始化页面状态
            this.initializePageState();
            
            console.log('主应用初始化完成');
            
        } catch (error) {
            console.error('主应用初始化失败:', error);
        }
    },
    
    /**
     * 检测设备类型
     */
    detectDeviceType() {
        pageState.isMobile = window.innerWidth <= 768;
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            const wasMobile = pageState.isMobile;
            pageState.isMobile = window.innerWidth <= 768;
            
            // 如果从移动端切换到桌面端，自动打开侧边栏
            if (wasMobile && !pageState.isMobile) {
                this.openSidebar();
            }
        });
    },
    
    /**
     * 设置全局事件监听器
     */
    setupEventListeners() {
        // 移动端点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (pageState.isMobile) {
                const sidebar = document.getElementById('sidebar');
                const menuBtn = document.querySelector('.mobile-menu-btn');
                
                if (sidebar && menuBtn && 
                    !sidebar.contains(e.target) && 
                    !menuBtn.contains(e.target)) {
                    this.closeSidebar();
                }
            }
        });
        
        // 键盘导航支持
        document.addEventListener('keydown', (e) => {
            // ESC键关闭侧边栏（移动端）
            if (e.key === 'Escape' && pageState.isMobile) {
                this.closeSidebar();
            }
        });
    },
    
    /**
     * 初始化页面状态
     */
    initializePageState() {
        // 优先根据 URL hash (#data-entry | #data-management | #statistics) 决定默认页面
        const hash = (window.location.hash || '').replace('#', '');
        const validPages = ['data-entry', 'data-management', 'statistics'];
        const defaultPage = validPages.includes(hash) ? hash : 'data-entry';
        this.showPage(defaultPage);
        
        // 监听hash变化，同步页面状态
        window.addEventListener('hashchange', () => {
            const newHash = (window.location.hash || '').replace('#', '');
            if (validPages.includes(newHash) && newHash !== pageState.currentPage) {
                this.showPage(newHash);
            }
        });
    },
    
    /**
     * 页面切换主函数
     * @param {string} pageId 页面ID
     */
    showPage(pageId) {
        try {
            console.log(`切换到页面: ${pageId}`);
            
            // 记录前一个页面，用于自动刷新判断和页面清空
            const previousPage = pageState.currentPage;
            
            // 更新页面状态
            pageState.previousPage = previousPage;
            pageState.currentPage = pageId;
            
            // 隐藏所有页面
            this.hideAllPages();
            
            // 移除所有菜单项的活动状态
            this.clearMenuActiveStates();
            
            // 显示目标页面和菜单
            this.showTargetPage(pageId);
            
            // 加载页面特定内容
            this.loadPageContent(pageId);
            
            // 移动端自动关闭菜单
            if (pageState.isMobile) {
                this.closeSidebar();
            }

            // 同步 URL hash，确保刷新后保持在当前子页面
            try {
                if (window.location.hash !== `#${pageId}`) {
                    history.replaceState(null, '', `#${pageId}`);
                }
            } catch (e) {
                console.warn('同步 URL hash 失败', e);
            }
            
            // 触发页面切换后的自动刷新（如果之前已有页面且不同）
            console.log(`[PageSwitch] 检查自动刷新条件: previousPage=${previousPage}, pageId=${pageId}, AutoRefreshManager存在=${typeof AutoRefreshManager !== 'undefined'}`);
            if (previousPage && previousPage !== pageId && typeof AutoRefreshManager !== 'undefined') {
                console.log(`[PageSwitch] 触发自动刷新: ${previousPage} -> ${pageId}`);
                AutoRefreshManager.refreshAfterPageSwitch(previousPage, pageId);
            } else if (pageId === 'data-entry' && typeof AutoRefreshManager !== 'undefined') {
                // 特殊处理：每次切换到数据录入页面都清空内容（即使是第一次访问）
                console.log(`[PageSwitch] 特殊处理：切换到数据录入页面，强制清空内容`);
                setTimeout(() => {
                    // 检查DataEntryManager是否准备好，如果没有就重试
                    const checkAndClear = (retries = 0) => {
                        if (typeof DataEntryManager !== 'undefined' && DataEntryManager.clearPageContent) {
                            console.log(`[PageSwitch] DataEntryManager已准备好，执行清空`);
                            AutoRefreshManager.refreshPageData('data-entry');
                        } else if (retries < 5) {
                            console.log(`[PageSwitch] DataEntryManager未准备好，500ms后重试 (${retries + 1}/5)`);
                            setTimeout(() => checkAndClear(retries + 1), 500);
                        } else {
                            console.log(`[PageSwitch] 重试次数已达上限，停止尝试清空`);
                        }
                    };
                    checkAndClear();
                }, 100); // 初始延迟
            } else if (pageId === 'data-management' && typeof AutoRefreshManager !== 'undefined') {
                // 特殊处理：每次切换到历史测算页面都刷新数据（即使是第一次访问）
                console.log(`[PageSwitch] 特殊处理：切换到历史测算页面，强制刷新数据`);
                setTimeout(() => {
                    // 检查dataManagementManager是否准备好，如果没有就重试
                    const checkAndRefresh = (retries = 0) => {
                        if (typeof dataManagementManager !== 'undefined' && dataManagementManager.searchDataRecords) {
                            console.log(`[PageSwitch] dataManagementManager已准备好，执行刷新`);
                            AutoRefreshManager.refreshPageData('data-management');
                        } else if (retries < 5) {
                            console.log(`[PageSwitch] dataManagementManager未准备好，500ms后重试 (${retries + 1}/5)`);
                            setTimeout(() => checkAndRefresh(retries + 1), 500);
                        } else {
                            console.log(`[PageSwitch] 重试次数已达上限，停止尝试刷新`);
                        }
                    };
                    checkAndRefresh();
                }, 100); // 初始延迟
            } else {
                console.log(`[PageSwitch] 跳过自动刷新: previousPage=${previousPage}, pageId=${pageId}`);
            }
            
        } catch (error) {
            console.error(`页面切换失败 (${pageId}):`, error);
        }
    },
    
    /**
     * 隐藏所有页面
     */
    hideAllPages() {
        const allPages = document.querySelectorAll('.page-content');
        allPages.forEach(page => page.classList.remove('active'));
    },
    
    /**
     * 清除所有菜单项的活动状态
     */
    clearMenuActiveStates() {
        const allMenuItems = document.querySelectorAll('.menu-item');
        allMenuItems.forEach(item => item.classList.remove('active'));
    },
    
    /**
     * 显示目标页面和对应菜单
     * @param {string} pageId 页面ID
     */
    showTargetPage(pageId) {
        const targetPage = document.getElementById(`page-${pageId}`);
        const targetMenu = document.getElementById(`menu-${pageId}`);
        
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.warn(`页面元素未找到: page-${pageId}`);
        }
        
        if (targetMenu) {
            targetMenu.classList.add('active');
        } else {
            console.warn(`菜单元素未找到: menu-${pageId}`);
        }
    },
    
    /**
     * 加载页面特定内容
     * @param {string} pageId 页面ID
     */
    loadPageContent(pageId) {
        // 移除延迟，立即加载内容
        switch (pageId) {
            case 'data-entry':
                // 初始化数据填报模块
                if (typeof DataEntryManager !== 'undefined' && typeof DataEntryManager.initialize === 'function') {
                    DataEntryManager.initialize();
                    
                    // 检查是否从其他页面切换而来，如果是则清空页面内容
                    const previousPage = pageState.previousPage;
                    if (previousPage && previousPage !== 'data-entry' && typeof DataEntryManager.clearPageContent === 'function') {
                        console.log(`[PageSwitch] 从 ${previousPage} 切换到 data-entry，清空页面内容`);
                        // 延迟执行，确保初始化完成
                        setTimeout(() => {
                            DataEntryManager.clearPageContent();
                        }, 100);
                    }
                }
                break;
                
            case 'data-management':
                if (typeof loadDataManagementContent === 'function') {
                    console.log('[PageLoad] 开始加载历史测算页面内容');
                    loadDataManagementContent(); // 同步加载页面内容
                    console.log('[PageLoad] 历史测算页面内容加载完成');
                }
                break;
                
            case 'statistics':
                // 初始化统计管理器
                if (typeof statisticsManager !== 'undefined' && statisticsManager.initialize) {
                    statisticsManager.initialize();
                } else {
                    // 备用方法，兼容旧代码
                    if (typeof loadOverviewAvailableYears === 'function') {
                        loadOverviewAvailableYears();
                    }
                    if (typeof searchOverviewRecords === 'function') {
                        searchOverviewRecords();
                    }
                }
                // 更新用户信息
                const currentUser = AuthManager.getCurrentUser();
                if (currentUser && typeof updateStatisticsUserInfo === 'function') {
                    updateStatisticsUserInfo(currentUser);
                }
                break;
                
            case 'user-management':
                if (typeof loadUserManagementContent === 'function') {
                    loadUserManagementContent();
                }
                // 更新用户信息
                const user = AuthManager.getCurrentUser();
                if (user && typeof updateUserManagementUserInfo === 'function') {
                    updateUserManagementUserInfo(user);
                }
                break;
                
            default:
                // 默认情况下也初始化数据填报模块
                if (typeof DataEntryManager !== 'undefined' && typeof DataEntryManager.initialize === 'function') {
                    DataEntryManager.initialize();
                }
                break;
        }
    },
    
    /**
     * 切换侧边栏显示状态
     */
    toggleSidebar() {
        if (pageState.isSidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    },
    
    /**
     * 打开侧边栏
     */
    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('open');
            pageState.isSidebarOpen = true;
        }
    },
    
    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            pageState.isSidebarOpen = false;
        }
    },
    
    /**
     * 获取当前页面状态
     * @returns {object} 当前页面状态
     */
    getPageState() {
        return { ...pageState };
    }
};

// ========================================
// 用户信息更新功能
// ========================================

/**
 * 更新统计页面的用户信息
 * @param {object} user 用户对象
 */
function updateStatisticsUserInfo(user) {
    const avatarEl = document.getElementById('userAvatar3');
    const nameEl = document.getElementById('userName3');
    const roleEl = document.getElementById('userRole3');
    
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

/**
 * 更新用户管理页面的用户信息
 * @param {object} user 用户对象
 */
function updateUserManagementUserInfo(user) {
    // 这个函数在用户管理模块中可能需要
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

// ========================================
// 兼容性函数（保持向后兼容）
// ========================================

/**
 * 页面切换函数（兼容性）
 * @param {string} pageId 页面ID
 */
function showPage(pageId) {
    return AppManager.showPage(pageId);
}

/**
 * 切换侧边栏（兼容性）
 */
function toggleSidebar() {
    return AppManager.toggleSidebar();
}

/**
 * 关闭侧边栏（兼容性）
 */
function closeSidebar() {
    return AppManager.closeSidebar();
}

/**
 * 应用初始化函数（兼容性）
 */
function initializeApp() {
    return AppManager.initialize();
}

// ========================================
// 自动刷新管理器
// ========================================

/**
 * 自动刷新管理器
 * 用于在关键操作后自动刷新页面以保持数据同步
 */
const AutoRefreshManager = {
    
    /**
     * 配置项
     */
    config: {
        refreshDelay: 1500, // 刷新延迟（毫秒）
        enabledForOperations: {
            pageSwitch: true,        // 页面切换
            // 重要：禁用数据提交后的自动整页刷新，避免“计算分析”后刷新
            dataSubmit: false,       // 数据提交
            dataDelete: true,        // 数据删除
            editDataFill: false      // 编辑数据填充（排除以避免冲突）
        }
    },
    
    /**
     * 是否正在编辑模式（用于避免与编辑自动填充冲突）
     */
    isEditMode: false,
    
    /**
     * 上次操作时间（用于防抖）
     */
    lastOperationTime: 0,
    
    /**
     * 设置编辑模式状态
     */
    setEditMode(isEdit) {
        this.isEditMode = isEdit;
        console.log(`编辑模式状态: ${isEdit ? '开启' : '关闭'}`);
    },
    
    /**
     * 页面切换后自动刷新
     */
    refreshAfterPageSwitch(fromPage, toPage) {
        console.log(`[AutoRefreshManager] 页面切换检查: ${fromPage} -> ${toPage}`);
        console.log(`[AutoRefreshManager] 配置状态: pageSwitch=${this.config.enabledForOperations.pageSwitch}, isEditMode=${this.isEditMode}`);
        
        if (!this.config.enabledForOperations.pageSwitch || this.isEditMode) {
            console.log(`[AutoRefreshManager] 跳过页面切换刷新 - pageSwitch: ${this.config.enabledForOperations.pageSwitch}, isEditMode: ${this.isEditMode}`);
            return;
        }
        
        console.log(`[AutoRefreshManager] 页面切换: ${fromPage} -> ${toPage}，准备刷新页面数据`);
        
        // 延迟一点时间让页面切换完成，然后刷新数据
        setTimeout(() => {
            this.refreshPageData(toPage);
        }, 100);
    },
    
    /**
     * 刷新指定页面的数据
     */
    async refreshPageData(pageId) {
        try {
            console.log(`开始刷新 ${pageId} 页面数据`);
            
            switch (pageId) {
                case 'data-entry':
                    // 刷新数据录入页面的数据
                    if (typeof DataEntryManager !== 'undefined') {
                        // 强制清空页面内容（每次进入都清空）
                        if (DataEntryManager.clearPageContent) {
                            console.log('[AutoRefresh] 清空数据录入页面内容');
                            DataEntryManager.clearPageContent();
                        }
                        
                        // 重新加载学校选项
                        if (DataEntryManager.loadSchoolOptions) {
                            await DataEntryManager.loadSchoolOptions();
                        }
                        
                        console.log('数据录入页面数据已刷新');
                    }
                    break;
                    
                case 'data-management':
                    // 刷新历史测算页面的数据
                    console.log('[AutoRefresh] 开始刷新历史测算页面数据');
                    console.log('[AutoRefresh] dataManagementManager 存在:', typeof dataManagementManager !== 'undefined');
                    
                    if (typeof dataManagementManager !== 'undefined') {
                        // 使用专门的刷新方法，自动禁用缓存并重新锁定筛选器
                        if (dataManagementManager.refreshPageData) {
                            console.log('[AutoRefresh] 调用专门的刷新方法');
                            await dataManagementManager.refreshPageData();
                        } else {
                            // 兼容旧版本：手动调用各个方法
                            console.log('[AutoRefresh] 准备重新加载筛选器数据');
                            
                            // 重新加载筛选器数据，禁用缓存以获取最新数据
                            if (dataManagementManager.loadDataAvailableYears) {
                                console.log('[AutoRefresh] 加载可用年份数据（禁用缓存）');
                                await dataManagementManager.loadDataAvailableYears(true);
                            }
                            if (dataManagementManager.loadDataAvailableUsers) {
                                console.log('[AutoRefresh] 加载可用用户数据（禁用缓存）');
                                await dataManagementManager.loadDataAvailableUsers(true);
                            }
                            if (dataManagementManager.loadSchoolOptions) {
                                console.log('[AutoRefresh] 加载学校选项数据（禁用缓存）');
                                await dataManagementManager.loadSchoolOptions(true);
                            }
                            
                            // 总是执行搜索以获取最新数据（无论之前是否有搜索结果）
                            if (dataManagementManager.searchDataRecords) {
                                console.log('[AutoRefresh] 执行搜索以获取最新数据');
                                // 强制重置搜索状态，确保能够执行新的搜索
                                if (dataManagementManager.isSearching) {
                                    console.log('[AutoRefresh] 重置搜索状态');
                                    dataManagementManager.isSearching = false;
                                }
                                await dataManagementManager.searchDataRecords();
                                console.log('[AutoRefresh] 搜索完成，当前数据记录数:', dataManagementManager.allDataSchoolsData ? dataManagementManager.allDataSchoolsData.length : 0);
                            } else {
                                console.log('[AutoRefresh] 警告: searchDataRecords 方法不存在');
                            }
                        }
                        
                        console.log('[AutoRefresh] 历史测算页面数据刷新完成');
                    } else {
                        console.log('[AutoRefresh] 错误: dataManagementManager 未定义');
                    }
                    break;
                    
                case 'statistics':
                    // 刷新统计页面的数据
                    if (typeof statisticsManager !== 'undefined') {
                        // 使用专门的刷新方法，自动禁用缓存并重新加载年份筛选器
                        if (statisticsManager.refreshPageData) {
                            console.log('[AutoRefresh] 调用统计页面专门的刷新方法');
                            await statisticsManager.refreshPageData();
                        } else {
                            // 兼容旧版本：手动调用各个方法
                            console.log('[AutoRefresh] 使用兼容方式刷新统计页面');
                            
                            // 刷新年份筛选器，禁用缓存
                            if (typeof loadOverviewAvailableYears === 'function') {
                                await loadOverviewAvailableYears(true);
                                console.log('统计页面年份筛选器已刷新（禁用缓存）');
                            }
                            
                            // 刷新基础统计数据
                            if (statisticsManager.loadAllStatistics) {
                                await statisticsManager.loadAllStatistics();
                                console.log('统计页面基础数据已刷新');
                            }
                            
                            // 刷新概览记录数据
                            if (typeof searchOverviewRecords === 'function') {
                                console.log('刷新统计概览数据');
                                await searchOverviewRecords();
                            }
                        }
                    } else {
                        // 如果statisticsManager不存在，使用传统方法
                        console.log('[AutoRefresh] statisticsManager不存在，使用传统方法刷新');
                        if (typeof loadOverviewAvailableYears === 'function') {
                            await loadOverviewAvailableYears(true);
                        }
                        if (typeof searchOverviewRecords === 'function') {
                            await searchOverviewRecords();
                        }
                    }
                    
                    console.log('统计页面数据已刷新');
                    break;
                    
                default:
                    console.log(`未知页面类型: ${pageId}，跳过数据刷新`);
            }
        } catch (error) {
            console.error(`刷新 ${pageId} 页面数据失败:`, error);
        }
    },
    
    /**
     * 数据提交后自动刷新
     */
    refreshAfterDataSubmit() {
        // 已禁用：避免"计算分析"后刷新
        console.log('数据提交后自动刷新已禁用（避免干扰计算分析功能）');
    },
    
    /**
     * 数据删除后自动刷新
     */
    refreshAfterDataDelete() {
        if (!this.config.enabledForOperations.dataDelete || this.isEditMode) {
            return;
        }
        
        console.log('数据删除成功，刷新当前页面数据');
        
        // 刷新当前页面的数据
        setTimeout(() => {
            this.refreshPageData(pageState.currentPage);
        }, 500);
    },
    
    /**
     * 禁用自动刷新（临时）
     */
    disable() {
        this.config.enabledForOperations.pageSwitch = false;
        this.config.enabledForOperations.dataSubmit = false;
        this.config.enabledForOperations.dataDelete = false;
        console.log('自动刷新已禁用');
    },
    
    /**
     * 启用自动刷新
     */
    enable() {
        this.config.enabledForOperations.pageSwitch = true;
        this.config.enabledForOperations.dataSubmit = true;
        this.config.enabledForOperations.dataDelete = true;
        console.log('自动刷新已启用');
    }
};

// ========================================
// 导出到全局作用域
// ========================================

if (typeof window !== 'undefined') {
    // 主管理器
    window.AppManager = AppManager;
    window.AutoRefreshManager = AutoRefreshManager;
    
    // 兼容性函数
    window.showPage = showPage;
    window.toggleSidebar = toggleSidebar;
    window.closeSidebar = closeSidebar;
    window.initializeApp = initializeApp;
    
    // 用户信息更新函数
    window.updateStatisticsUserInfo = updateStatisticsUserInfo;
    window.updateUserManagementUserInfo = updateUserManagementUserInfo;
    
    // 全局变量
    window.pageState = pageState;
}

// ========================================
// 模块信息
// ========================================

console.log('✅ 主应用模块 (main.js) 已加载');
console.log('📦 提供功能: 页面导航、侧边栏控制、应用状态管理、智能数据刷新管理');
console.log('🔗 依赖模块: auth.js');
console.log('🔄 数据刷新功能: 页面切换时刷新数据、删除后重新加载数据（无需整页刷新）');

// 开发者工具：在控制台中可以使用以下命令
// AutoRefreshManager.config - 查看配置
// AutoRefreshManager.disable() - 禁用自动刷新
// AutoRefreshManager.enable() - 启用自动刷新
// AutoRefreshManager.setEditMode(true/false) - 设置编辑模式
// AutoRefreshManager.refreshPageData(pageId) - 手动刷新指定页面数据
