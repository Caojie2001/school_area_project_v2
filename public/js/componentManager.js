/**
 * 公共组件管理器
 * 用于加载和管理页面公共组件
 */
class ComponentManager {
    
    /**
     * 加载HTML组件到指定容器
     * @param {string} componentPath - 组件文件路径
     * @param {string} containerId - 目标容器ID
     * @param {object} config - 组件配置参数
     */
    static async loadComponent(componentPath, containerId, config = {}) {
        try {
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath}`);
            }
            
            const html = await response.text();
            const container = document.getElementById(containerId);
            
            if (container) {
                container.innerHTML = html;
                
                // 应用配置参数
                if (config.title) {
                    const titleElement = container.querySelector('#pageTitle');
                    if (titleElement) titleElement.textContent = config.title;
                }
                
                if (config.description) {
                    const descElement = container.querySelector('#pageDescription');
                    if (descElement) descElement.textContent = config.description;
                }
                
                if (config.activeMenu) {
                    ComponentManager.setActiveMenu(config.activeMenu);
                }
                
                console.log(`Component loaded: ${componentPath}`);
            } else {
                console.error(`Container not found: ${containerId}`);
            }
        } catch (error) {
            console.error('Error loading component:', error);
        }
    }
    
    /**
     * 设置当前活动菜单项
     * @param {string} menuId - 菜单项ID
     */
    static setActiveMenu(menuId) {
        // 移除所有菜单项的active类
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 添加active类到当前菜单项
        const activeMenuItem = document.getElementById(menuId);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
    }
    
    /**
     * 初始化侧边栏组件
     * @param {string} activeMenuId - 当前活动菜单ID
     */
    static async initSidebar(activeMenuId) {
        await ComponentManager.loadComponent('../components/sidebar.html', 'sidebarContainer');
        if (activeMenuId) {
            ComponentManager.setActiveMenu(activeMenuId);
        }
    }
    
    /**
     * 初始化页面头部组件
     * @param {object} config - 头部配置
     */
    static async initPageHeader(config = {}) {
        await ComponentManager.loadComponent('../components/page-header.html', 'pageHeaderContainer', config);
    }
    
    /**
     * 初始化公共页面结构
     * @param {object} pageConfig - 页面配置
     */
    static async initPageStructure(pageConfig = {}) {
        const {
            title = '页面标题',
            description = '页面描述',
            activeMenu = null
        } = pageConfig;
        
        // 并行加载组件
        await Promise.all([
            ComponentManager.initSidebar(activeMenu),
            ComponentManager.initPageHeader({ title, description })
        ]);
        
        console.log('Page structure initialized:', pageConfig);
    }
}

// 导出到全局作用域
window.ComponentManager = ComponentManager;
