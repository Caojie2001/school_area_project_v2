/**
 * ==============================================
 * statistics.js - 统计分析功能模块
 * ==============================================
 * 
 * 【文件职责】
 * - 全局数据统计和分析
 * - 统计图表的生成和展示
 * - 数据趋势分析和可视化
 * - 统计报告的生成
 * - 仅供基建中心和管理员使用
 * 
 * 【主要功能模块】
 * 1. 数据概览统计
 * 2. 学校数据统计
 * 3. 图表和可视化
 * 4. 数据分析工具
 * 5. 报告生成功能
 * 
 * 【权限控制】
 * - 仅基建中心(infrastructure)和管理员(admin)可访问
 * - 学校用户无法访问统计功能
 */

// 统计模块状态
const StatisticsState = {
    LOADING: 'loading',
    LOADED: 'loaded',
    ANALYZING: 'analyzing',
    EXPORTING: 'exporting',
    ERROR: 'error'
};

// 统计配置
const StatisticsConfig = {
    CHART_COLORS: [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
    ],
    ANIMATION_DURATION: 1000,
    AUTO_REFRESH_INTERVAL: 300000 // 5分钟
};

// 统计指标定义
const StatisticsMetrics = {
    CURRENT_AREA: 'current_building_area',
    CALCULATED_AREA: 'calculated_building_area', 
    DEFICIT_AREA: 'deficit_area',
    SUBSIDY_AREA: 'subsidy_area',
    SCHOOL_COUNT: 'school_count',
    SUBMISSION_RATE: 'submission_rate'
};

/**
 * 统计管理器类
 * 负责所有统计相关的功能
 */
class StatisticsManager {
    constructor() {
        this.state = StatisticsState.LOADING;
        this.data = {
            overview: null,
            schools: [],
            trends: [],
            charts: {}
        };
        this.autoRefreshTimer = null;
        // 分页相关属性
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.allOverviewData = [];
        // 防重复请求标志
        this.isSearching = false;
    }

    /**
     * 初始化统计功能
     */
    async initialize() {
        try {
            console.log('初始化统计功能...');
            this.state = StatisticsState.LOADING;
            
            // 检查用户权限
            if (!this.checkPermissions()) {
                throw new Error('无权限访问统计功能');
            }
            
            // 加载年份选项，初始化时禁用缓存
            await loadOverviewAvailableYears(true);
            
            // 加载统计数据
            await this.loadAllStatistics();
            
            // 初始化图表
            this.initializeCharts();
            
            // 启动自动刷新
            this.startAutoRefresh();
            
            this.state = StatisticsState.LOADED;
            console.log('统计功能初始化完成');
        } catch (error) {
            console.error('统计功能初始化失败:', error);
            this.state = StatisticsState.ERROR;
            this.showError('统计功能初始化失败: ' + error.message);
        }
    }

    /**
     * 检查用户权限
     */
    checkPermissions() {
        if (!currentUser) return false;
        return currentUser.role === 'admin' || currentUser.role === 'infrastructure';
    }

    /**
     * 加载所有统计数据
     */
    async loadAllStatistics() {
        try {
            // 并行加载各种统计数据
            const [overviewResult, schoolsResult, trendsResult] = await Promise.all([
                this.loadOverviewStatistics(),
                this.loadSchoolStatistics(),
                this.loadTrendStatistics()
            ]);

            this.data.overview = overviewResult;
            this.data.schools = schoolsResult;
            this.data.trends = trendsResult;

            // 更新UI
            this.updateStatisticsDisplay();
            
        } catch (error) {
            console.error('加载统计数据失败:', error);
            throw error;
        }
    }

    /**
     * 刷新页面数据（强制禁用缓存）
     */
    async refreshPageData() {
        try {
            console.log('开始刷新测算统计页面数据（禁用缓存）...');
            
            // 强制刷新年份筛选器数据，禁用缓存
            await loadOverviewAvailableYears(true);
            
            // 重新加载统计数据
            await this.loadAllStatistics();
            
            console.log('测算统计页面数据刷新完成');
            
        } catch (error) {
            console.error('刷新测算统计页面数据失败:', error);
            this.showError('刷新数据失败: ' + error.message);
        }
    }

    /**
     * 加载概览统计
     */
    async loadOverviewStatistics() {
        try {
            console.log('加载概览统计...');
            const result = await StatisticsAPI.getOverview();
            
            if (result.success) {
                console.log('概览统计加载成功:', result.data);
                return result.data;
            } else {
                throw new Error(result.error || '加载概览统计失败');
            }
        } catch (error) {
            console.error('加载概览统计失败:', error);
            throw error;
        }
    }

    /**
     * 加载学校统计
     */
    async loadSchoolStatistics() {
        try {
            console.log('加载学校统计...');
            const result = await StatisticsAPI.getSchoolStats();
            
            if (result.success) {
                console.log('学校统计加载成功:', result.data);
                return result.data;
            } else {
                throw new Error(result.error || '加载学校统计失败');
            }
        } catch (error) {
            console.error('加载学校统计失败:', error);
            throw error;
        }
    }

    /**
     * 加载趋势统计
     */
    async loadTrendStatistics() {
        try {
            console.log('加载趋势统计...');
            const result = await StatisticsAPI.getTrends();
            
            if (result.success) {
                console.log('趋势统计加载成功:', result.data);
                return result.data;
            } else {
                throw new Error(result.error || '加载趋势统计失败');
            }
        } catch (error) {
            console.error('加载趋势统计失败:', error);
            throw error;
        }
    }

    /**
     * 更新统计显示
     */
    updateStatisticsDisplay() {
        try {
            // 更新概览卡片
            this.updateOverviewCards();
            
            // 更新学校统计表格
            this.updateSchoolStatistics();
            
            // 更新图表
            this.updateAllCharts();
            
            console.log('统计显示更新完成');
        } catch (error) {
            console.error('更新统计显示失败:', error);
        }
    }

    /**
     * 更新概览卡片
     */
    updateOverviewCards() {
        if (!this.data.overview) return;

        const overview = this.data.overview;
        
        // 更新各个统计卡片
        this.updateCard('totalSchools', overview.totalSchools || 0, '所学校');
        this.updateCard('totalCurrentArea', this.formatArea(overview.totalCurrentArea || 0), 'm²');
        this.updateCard('totalCalculatedArea', this.formatArea(overview.totalCalculatedArea || 0), 'm²');
        this.updateCard('totalDeficitArea', this.formatArea(overview.totalDeficitArea || 0), 'm²');
        this.updateCard('totalSubsidyArea', this.formatArea(overview.totalSubsidyArea || 0), 'm²');
        this.updateCard('submissionRate', (overview.submissionRate || 0).toFixed(1), '%');
    }

    /**
     * 更新单个统计卡片
     */
    updateCard(cardId, value, unit) {
        const valueElement = document.getElementById(cardId + 'Value');
        const unitElement = document.getElementById(cardId + 'Unit');
        
        if (valueElement) {
            valueElement.textContent = value;
        }
        if (unitElement) {
            unitElement.textContent = unit;
        }
    }

    /**
     * 格式化面积数字
     */
    formatArea(area) {
        if (!area || area === 0) return '0';
        return parseFloat(area).toLocaleString('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    /**
     * 更新学校统计表格
     */
    updateSchoolStatistics() {
        const container = document.getElementById('schoolStatisticsTable');
        if (!container || !this.data.schools) return;

        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>学校名称</th>
                            <th>院校类型</th>
                            <th>现状建筑面积</th>
                            <th>测算建筑面积</th>
                            <th>面积缺额</th>
                            <th>缺额比例</th>
                            <th>最后更新</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.data.schools.forEach(school => {
            const deficitRatio = school.calculated_area > 0 ? 
                ((school.deficit_area / school.calculated_area) * 100).toFixed(1) : '0.0';
            
            html += `
                <tr>
                    <td><strong>${school.school_name}</strong></td>
                    <td><span class="badge bg-info">${school.school_type || '未分类'}</span></td>
                    <td class="text-end">${this.formatArea(school.current_area)}</td>
                    <td class="text-end">${this.formatArea(school.calculated_area)}</td>
                    <td class="text-end ${school.deficit_area > 0 ? 'text-danger' : 'text-success'}">
                        ${this.formatArea(school.deficit_area)}
                    </td>
                    <td class="text-end">
                        <span class="badge ${school.deficit_area > 0 ? 'bg-danger' : 'bg-success'}">
                            ${deficitRatio}%
                        </span>
                    </td>
                    <td>${new Date(school.last_updated).toLocaleDateString('zh-CN')}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * 初始化图表
     */
    initializeCharts() {
        // 这里将来可以集成Chart.js或其他图表库
        console.log('初始化统计图表...');
    }

    /**
     * 更新所有图表
     */
    updateAllCharts() {
        try {
            // 更新各种图表
            this.updateAreaDistributionChart();
            this.updateSchoolComparisonChart();
            this.updateTrendChart();
            
            console.log('所有图表更新完成');
        } catch (error) {
            console.error('更新图表失败:', error);
        }
    }

    /**
     * 更新面积分布图表
     */
    updateAreaDistributionChart() {
        // 待实现：面积分布饼图
    }

    /**
     * 更新学校对比图表
     */
    updateSchoolComparisonChart() {
        // 待实现：学校对比柱状图
    }

    /**
     * 更新趋势图表
     */
    updateTrendChart() {
        // 待实现：趋势折线图
    }

    /**
     * 刷新统计数据
     */
    async refreshStatistics() {
        try {
            this.state = StatisticsState.LOADING;
            this.showLoading('正在刷新统计数据...');
            
            await this.loadAllStatistics();
            
            this.state = StatisticsState.LOADED;
            this.hideLoading();
            this.showSuccess('统计数据刷新成功');
            
        } catch (error) {
            console.error('刷新统计数据失败:', error);
            this.state = StatisticsState.ERROR;
            this.hideLoading();
            this.showError('刷新统计数据失败: ' + error.message);
        }
    }

    /**
     * 导出统计数据
     */
    async exportStatistics(format = 'excel') {
        try {
            this.state = StatisticsState.EXPORTING;
            this.showLoading('正在导出统计数据...');
            
            const result = await StatisticsAPI.exportStats({ format });
            
            if (result.success) {
                // 触发下载
                const link = document.createElement('a');
                link.href = result.downloadUrl;
                link.download = result.fileName;
                link.click();
                
                this.showSuccess('统计数据导出成功');
            } else {
                throw new Error(result.error || '导出失败');
            }
            
        } catch (error) {
            console.error('导出统计数据失败:', error);
            this.showError('导出统计数据失败: ' + error.message);
        } finally {
            this.state = StatisticsState.LOADED;
            this.hideLoading();
        }
    }

    /**
     * 启动自动刷新
     */
    startAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
        
        this.autoRefreshTimer = setInterval(() => {
            console.log('自动刷新统计数据...');
            this.refreshStatistics();
        }, StatisticsConfig.AUTO_REFRESH_INTERVAL);
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }

    /**
     * 显示加载状态
     */
    showLoading(message = '正在加载...') {
        const loadingElement = document.getElementById('statisticsLoading');
        if (loadingElement) {
            loadingElement.textContent = message;
            loadingElement.style.display = 'block';
        }
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loadingElement = document.getElementById('statisticsLoading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        console.log('统计成功:', message);
        // 可以添加Toast通知
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        console.error('统计错误:', message);
        // 可以添加Toast通知
        
        const errorElement = document.getElementById('statisticsError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stopAutoRefresh();
        this.data = null;
        this.state = StatisticsState.LOADING;
    }
}

// 创建全局统计管理器实例
const statisticsManager = new StatisticsManager();

// ========================================
// 全局函数暴露（向后兼容）
// ========================================

/**
 * 加载概览统计
 */
function loadOverviewStatistics() {
    return statisticsManager.loadOverviewStatistics();
}

/**
 * 加载学校统计
 */
function loadSchoolStatistics() {
    return statisticsManager.loadSchoolStatistics();
}

/**
 * 更新统计卡片
 */
function updateStatisticsCards(data) {
    statisticsManager.data.overview = data;
    statisticsManager.updateOverviewCards();
}

/**
 * 创建概览图表
 */
function createOverviewCharts(data) {
    statisticsManager.data.overview = data;
    statisticsManager.updateAllCharts();
}

/**
 * 生成统计报告
 */
function generateStatisticsReport() {
    return statisticsManager.exportStatistics('excel');
}

/**
 * 导出统计数据
 */
function exportStatisticsData(format) {
    return statisticsManager.exportStatistics(format);
}

/**
 * 刷新统计数据
 */
function refreshStatisticsData() {
    return statisticsManager.refreshStatistics();
}

// ========================================
// 统计概览页面功能（原 index.html 中的函数）
// ========================================

/**
 * 搜索填报概览记录
 */
async function searchOverviewRecords() {
    // 防止重复请求
    if (statisticsManager && statisticsManager.isSearching) {
        console.log('统计搜索正在进行中，忽略重复请求');
        return;
    }
    
    const yearFilter = document.getElementById('overviewYearFilter');
    const userTypeFilter = document.getElementById('overviewUserTypeFilter');
    const searchButton = document.querySelector('button[onclick="searchOverviewRecords()"]');
    const year = yearFilter ? yearFilter.value : '2025';
    const userType = userTypeFilter ? userTypeFilter.value : 'construction_center';
    
    console.log('开始搜索填报概览记录，筛选条件:', { year, userType });
    
    // 设置搜索状态
    if (statisticsManager) {
        statisticsManager.isSearching = true;
    }
    
    // 锁定统计页面
    lockStatisticsPage();
    
    const resultsContainer = document.getElementById('overviewDataResults');
    const recordCount = document.getElementById('overviewRecordCount');
    
    resultsContainer.innerHTML = '<div class="loading">正在搜索...</div>';
    
    // 隐藏记录计数
    if (recordCount) recordCount.style.display = 'none';
    
    try {
        // 构建查询参数
        const queryParams = {};
        if (year && year !== 'all') queryParams.year = year;
        if (userType && userType !== 'all') queryParams.userType = userType;
        
        const result = await DataManagementAPI.getOverviewRecords(queryParams);
        
        if (result.success) {
            displayOverviewResults(result.data);
            updateOverviewSummary(result.data);
            
            // 显示记录计数
            if (recordCount) {
                const totalCount = document.getElementById('overviewTotalCount');
                if (totalCount) totalCount.textContent = result.data.length;
                recordCount.style.display = 'block';
            }
        } else {
            console.error('搜索失败:', result.error);
            resultsContainer.innerHTML = `<div class="alert alert-danger">搜索失败: ${result.error}</div>`;
        }
    } catch (error) {
        console.error('搜索填报概览记录失败:', error);
        resultsContainer.innerHTML = '<div class="alert alert-danger">网络错误，请稍后重试</div>';
    } finally {
        // 恢复搜索状态和解锁页面
        if (statisticsManager) {
            statisticsManager.isSearching = false;
        }
        unlockStatisticsPage();
    }
}

/**
 * 锁定统计页面
 */
function lockStatisticsPage() {
    // 禁用筛选下拉框
    const filters = [
        document.getElementById('overviewYearFilter'),
        document.getElementById('overviewUserTypeFilter')
    ];
    filters.forEach(filter => {
        if (filter) {
            filter.disabled = true;
            filter.style.opacity = '0.6';
        }
    });
    
    // 禁用搜索按钮
    const searchButton = document.querySelector('button[onclick="searchOverviewRecords()"]');
    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = '搜索中...';
        searchButton.style.opacity = '0.6';
    }
    
    // 禁用侧边栏菜单项
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    menuItems.forEach(item => {
        if (item) {
            item.style.pointerEvents = 'none';
            item.style.opacity = '0.6';
            item.setAttribute('data-stats-locked', 'true');
        }
    });
    
    // 禁用结果区域的所有按钮
    const overviewDataResults = document.getElementById('overviewDataResults');
    if (overviewDataResults) {
        const buttons = overviewDataResults.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.setAttribute('data-stats-locked', 'true');
        });
    }
    
    // 添加页面遮罩层
    addStatisticsPageOverlay('正在搜索统计数据，请稍候...');
}

/**
 * 解锁统计页面
 */
function unlockStatisticsPage() {
    // 启用筛选下拉框
    const filters = [
        document.getElementById('overviewYearFilter'),
        document.getElementById('overviewUserTypeFilter')
    ];
    filters.forEach(filter => {
        if (filter) {
            filter.disabled = false;
            filter.style.opacity = '1';
        }
    });
    
    // 恢复搜索按钮
    const searchButton = document.querySelector('button[onclick="searchOverviewRecords()"]');
    if (searchButton) {
        searchButton.disabled = false;
        searchButton.textContent = '查找';
        searchButton.style.opacity = '1';
    }
    
    // 恢复侧边栏菜单项
    const menuItems = document.querySelectorAll('.sidebar .menu-item[data-stats-locked="true"]');
    menuItems.forEach(item => {
        if (item) {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
            item.removeAttribute('data-stats-locked');
        }
    });
    
    // 恢复结果区域的按钮
    const overviewDataResults = document.getElementById('overviewDataResults');
    if (overviewDataResults) {
        const buttons = overviewDataResults.querySelectorAll('button[data-stats-locked="true"]');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.removeAttribute('data-stats-locked');
        });
    }
    
    // 移除页面遮罩层
    removeStatisticsPageOverlay();
}

/**
 * 添加统计页面遮罩层
 */
function addStatisticsPageOverlay(message = '正在处理，请稍候...') {
    // 移除已存在的遮罩层
    removeStatisticsPageOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'statisticsOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
    `;
    
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: white;
        padding: 30px 40px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        text-align: center;
        font-size: 16px;
        color: #333;
        max-width: 300px;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px auto;
    `;
    
    const text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = `
        font-weight: 500;
        color: #2c3e50;
    `;
    
    messageBox.appendChild(spinner);
    messageBox.appendChild(text);
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
}

/**
 * 移除统计页面遮罩层
 */
function removeStatisticsPageOverlay() {
    const overlay = document.getElementById('statisticsOverlay');
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

/**
 * 显示填报概览搜索结果
 */
function displayOverviewResults(data) {
    const resultsContainer = document.getElementById('overviewDataResults');
    
    if (data.length === 0) {
        resultsContainer.innerHTML = '<div class="alert alert-info">未找到符合条件的记录</div>';
        return;
    }
    
    // 保存所有数据用于分页
    statisticsManager.allOverviewData = data;
    
    // 计算分页信息
    statisticsManager.totalPages = Math.ceil(data.length / statisticsManager.pageSize);
    
    // 确保当前页码在有效范围内
    if (statisticsManager.currentPage > statisticsManager.totalPages) {
        statisticsManager.currentPage = 1;
    }
    
    // 获取当前页的数据
    const startIndex = (statisticsManager.currentPage - 1) * statisticsManager.pageSize;
    const endIndex = startIndex + statisticsManager.pageSize;
    const currentPageData = data.slice(startIndex, endIndex);
    
    // 使用一般表格结构
    let html = '<div class="table-container" style="width: 100%; margin: 0; padding: 0;">';
    html += '<div class="table-responsive" style="overflow-x: auto; overflow-y: hidden; width: 100%;">';
    
    // 单一普通表格
    html += '<table class="data-table" style="width: 100%; min-width: 950px; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">';
    html += '<thead style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">';
    html += '<tr>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; border-right: 1px solid #dee2e6; font-size: 12px; width: 60px;">测算年份</th>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; border-right: 1px solid #dee2e6; font-size: 12px; width: 200px;">学校名称</th>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; border-right: 1px solid #dee2e6; font-size: 12px; line-height: 1.2; width: 100px;">现状建筑总面积<br/>(m²)</th>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; border-right: 1px solid #dee2e6; font-size: 12px; line-height: 1.2; width: 100px;">测算建筑总面积<br/>(m²)</th>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; border-right: 1px solid #dee2e6; font-size: 12px; line-height: 1.2; width: 130px;">测算建筑面积总缺额<br/>(不含特殊补助)(m²)</th>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; border-right: 1px solid #dee2e6; font-size: 12px; line-height: 1.2; width: 100px;">特殊补助建筑总面积<br/>(m²)</th>';
    html += '<th style="padding: 6px 8px; text-align: center; font-weight: 600; color: #495057; font-size: 12px; line-height: 1.2; width: 130px;">测算建筑面积总缺额<br/>(含特殊补助)(m²)</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    currentPageData.forEach((record, index) => {
        // 直接使用API返回的正确值
        const gapWithoutSubsidy = record.gap_without_subsidy || 0;
        const gapWithSubsidy = record.gap_with_subsidy || 0;
        
        const rowStyle = index % 2 === 0 ? 'background: #fff;' : 'background: #f8f9fa;';
        
        // 检查学校名称是否需要显示title（8个字符及以上）
        const schoolName = record.school_name || '未知';
        const schoolNameTitle = schoolName.length >= 8 ? `title="${schoolName}"` : '';
        
        html += `<tr style="${rowStyle} border-bottom: 1px solid #dee2e6;" onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='${index % 2 === 0 ? '#fff' : '#f8f9fa'}'">
            <td style="padding: 6px 7px; border-right: 1px solid #dee2e6; font-weight: 600; font-size: 12px; text-align: center;">${record.year || '未知'}</td>
            <td style="padding: 6px 7px; border-right: 1px solid #dee2e6; font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; text-align: center;" ${schoolNameTitle}>${schoolName}</td>
            <td style="padding: 6px 7px; border-right: 1px solid #dee2e6; text-align: center; font-size: 12px;">${formatNumber(record.current_total_area || 0)}</td>
            <td style="padding: 6px 7px; border-right: 1px solid #dee2e6; text-align: center; font-size: 12px;">${formatNumber(record.required_total_area || 0)}</td>
            <td style="padding: 6px 7px; border-right: 1px solid #dee2e6; text-align: center; font-size: 12px;">${gapWithoutSubsidy > 0 ? '+' : ''}${formatNumber(gapWithoutSubsidy)}</td>
            <td style="padding: 6px 7px; border-right: 1px solid #dee2e6; text-align: center; font-size: 12px;">${formatNumber(record.total_subsidy_area || 0)}</td>
            <td style="padding: 6px 7px; text-align: center; font-size: 12px;">${gapWithSubsidy > 0 ? '+' : ''}${formatNumber(gapWithSubsidy)}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    html += '</div>'; // table-responsive
    html += '</div>'; // table-container
    
    // 添加分页控件
    html += generateOverviewPaginationHTML(data.length);
    
    resultsContainer.innerHTML = html;
    
    // 更新汇总数据
    updateOverviewSummary(data);
}

/**
 * 生成填报概览分页HTML
 */
function generateOverviewPaginationHTML(totalRecords) {
    if (totalRecords <= statisticsManager.pageSize) {
        return `<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #3498db;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
                <strong>共找到 ${totalRecords} 条记录</strong>
            </p>
        </div>`;
    }

    let html = '<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #3498db; display: flex; justify-content: space-between; align-items: center;">';
    
    // 左侧记录信息
    const startRecord = (statisticsManager.currentPage - 1) * statisticsManager.pageSize + 1;
    const endRecord = Math.min(statisticsManager.currentPage * statisticsManager.pageSize, totalRecords);
    html += `<p style="margin: 0; color: #6c757d; font-size: 14px;">
        显示第 <strong>${startRecord}</strong> 到 <strong>${endRecord}</strong> 条记录，共 <strong>${totalRecords}</strong> 条
    </p>`;
    
    // 右侧分页控件
    html += '<div style="display: flex; gap: 5px; align-items: center;">';
    
    // 首页和上一页
    const prevDisabled = statisticsManager.currentPage === 1;
    html += `<button onclick="goToOverviewPage(1)" ${prevDisabled ? 'disabled' : ''} 
        style="padding: 6px 12px; border: 1px solid ${prevDisabled ? '#ddd' : '#000'}; background: white; cursor: ${prevDisabled ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-size: 12px; ${prevDisabled ? 'color: #999;' : 'color: #000;'}">首页</button>`;
    
    html += `<button onclick="goToOverviewPage(${statisticsManager.currentPage - 1})" ${prevDisabled ? 'disabled' : ''} 
        style="padding: 6px 12px; border: 1px solid ${prevDisabled ? '#ddd' : '#000'}; background: white; cursor: ${prevDisabled ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-size: 12px; ${prevDisabled ? 'color: #999;' : 'color: #000;'}">上一页</button>`;
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, statisticsManager.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(statisticsManager.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === statisticsManager.currentPage;
        html += `<button onclick="goToOverviewPage(${i})" 
            style="padding: 6px 12px; border: 1px solid ${isActive ? '#007bff' : '#000'}; background: ${isActive ? '#007bff' : 'white'}; color: ${isActive ? 'white' : '#000'}; cursor: pointer; border-radius: 4px; font-size: 12px; font-weight: ${isActive ? 'bold' : 'normal'};">${i}</button>`;
    }
    
    // 下一页和末页
    const nextDisabled = statisticsManager.currentPage === statisticsManager.totalPages;
    html += `<button onclick="goToOverviewPage(${statisticsManager.currentPage + 1})" ${nextDisabled ? 'disabled' : ''} 
        style="padding: 6px 12px; border: 1px solid ${nextDisabled ? '#ddd' : '#000'}; background: white; cursor: ${nextDisabled ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-size: 12px; ${nextDisabled ? 'color: #999;' : 'color: #000;'}">下一页</button>`;
    
    html += `<button onclick="goToOverviewPage(${statisticsManager.totalPages})" ${nextDisabled ? 'disabled' : ''} 
        style="padding: 6px 12px; border: 1px solid ${nextDisabled ? '#ddd' : '#000'}; background: white; cursor: ${nextDisabled ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-size: 12px; ${nextDisabled ? 'color: #999;' : 'color: #000;'}">末页</button>`;
    
    html += '</div></div>';
    
    return html;
}

/**
 * 跳转到指定页面
 */
function goToOverviewPage(page) {
    if (page < 1 || page > statisticsManager.totalPages) {
        return;
    }
    
    statisticsManager.currentPage = page;
    displayOverviewResults(statisticsManager.allOverviewData);
}

/**
 * 同步填报概览表格行高度
 */
function syncOverviewTableRows() {
    const leftRows = document.querySelectorAll('.data-table-frozen-left tbody tr');
    const middleRows = document.querySelectorAll('.data-table-scrollable tbody tr');
    
    if (leftRows.length === middleRows.length) {
        for (let i = 0; i < leftRows.length; i++) {
            // 强制设置统一的行高
            const fixedHeight = '42px';
            
            leftRows[i].style.height = fixedHeight;
            middleRows[i].style.height = fixedHeight;
            
            // 同时设置每个单元格的高度
            const leftCells = leftRows[i].querySelectorAll('td, th');
            const middleCells = middleRows[i].querySelectorAll('td, th');
            
            leftCells.forEach(cell => cell.style.height = fixedHeight);
            middleCells.forEach(cell => cell.style.height = fixedHeight);
        }
    }
}

/**
 * 同步填报概览表格垂直滚动
 */
function syncOverviewTableScroll() {
    const leftTable = document.querySelector('.frozen-left-columns');
    const middleTable = document.querySelector('.scrollable-middle-columns');
    
    if (!leftTable || !middleTable) return;
    
    let isScrolling = false;
    
    function syncScroll(source, targets) {
        if (isScrolling) return;
        isScrolling = true;
        
        targets.forEach(target => {
            target.scrollTop = source.scrollTop;
        });
        
        setTimeout(() => {
            isScrolling = false;
        }, 10);
    }
    
    leftTable.addEventListener('scroll', () => {
        syncScroll(leftTable, [middleTable]);
    });
    
    middleTable.addEventListener('scroll', () => {
        syncScroll(middleTable, [leftTable]);
    });
}

/**
 * 更新填报概览汇总数据
 */
function updateOverviewSummary(data) {
    const currentAreaEl = document.getElementById('overviewCurrentArea');
    const requiredAreaEl = document.getElementById('overviewRequiredArea');
    const gapWithoutSubsidyEl = document.getElementById('overviewGapWithoutSubsidy');
    const gapWithSubsidyEl = document.getElementById('overviewGapWithSubsidy');
    
    let totalCurrent = 0;
    let totalRequired = 0;
    let totalGapWithoutSubsidy = 0;
    let totalGapWithSubsidy = 0;
    
    data.forEach(record => {
        totalCurrent += parseFloat(record.current_total_area) || 0;
        totalRequired += parseFloat(record.required_total_area) || 0;
        totalGapWithoutSubsidy += parseFloat(record.gap_without_subsidy) || 0;
        totalGapWithSubsidy += parseFloat(record.gap_with_subsidy) || 0;
    });
    
    if (currentAreaEl) currentAreaEl.textContent = formatNumber(totalCurrent);
    if (requiredAreaEl) requiredAreaEl.textContent = formatNumber(totalRequired);
    if (gapWithoutSubsidyEl) gapWithoutSubsidyEl.textContent = (totalGapWithoutSubsidy > 0 ? '+' : '') + formatNumber(totalGapWithoutSubsidy);
    if (gapWithSubsidyEl) gapWithSubsidyEl.textContent = (totalGapWithSubsidy > 0 ? '+' : '') + formatNumber(totalGapWithSubsidy);
}

/**
 * 加载填报概览可用年份
 */
async function loadOverviewAvailableYears(disableCache = false) {
    console.log('开始加载年份数据...', disableCache ? '（禁用缓存）' : '');
    try {
        const result = await CommonAPI.getYears(disableCache ? { useCache: false } : {});
        console.log('API响应:', result);
        
        const yearFilter = document.getElementById('overviewYearFilter');
        console.log('年份筛选器元素:', yearFilter);
        
        if (!yearFilter) {
            console.error('找不到年份筛选器元素');
            return;
        }
        
        console.log('清空前的选项:', yearFilter.innerHTML);
        // 清空现有选项
        yearFilter.innerHTML = '';
        
        let years = [];
        if (result.success && result.data && result.data.length > 0) {
            years = result.data;
        } else {
            // 如果没有数据，提供当前年份作为默认选项
            const currentYear = new Date().getFullYear();
            years = [currentYear];
        }
        // 按降序排列
        const sortedYears = years.sort((a, b) => b - a);
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            yearFilter.appendChild(option);
        });
        // 默认选择最新年份
        if (sortedYears.length > 0) {
            yearFilter.value = sortedYears[0];
        }
        
    } catch (error) {
        console.error('加载年份失败:', error);
        
        // 出错时至少提供当前年份
        const yearFilter = document.getElementById('overviewYearFilter');
        if (yearFilter) {
            const currentYear = new Date().getFullYear();
            yearFilter.innerHTML = `<option value="${currentYear}">${currentYear}年</option>`;
            console.log('加载年份失败，使用当前年份作为备选:', currentYear);
        }
    }
}

// ========================================
// 模块初始化和全局暴露
// ========================================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 统计功能只在统计页面初始化
    if (window.location.hash === '#statistics' || 
        document.getElementById('statisticsContent')) {
        statisticsManager.initialize();
    }
});

// 全局暴露
if (typeof window !== 'undefined') {
    // 主要管理器
    window.statisticsManager = statisticsManager;
    window.StatisticsManager = statisticsManager; // 添加类名导出
    
    // 向后兼容的全局函数
    window.loadOverviewStatistics = loadOverviewStatistics;
    window.loadSchoolStatistics = loadSchoolStatistics;
    window.updateStatisticsCards = updateStatisticsCards;
    window.createOverviewCharts = createOverviewCharts;
    window.generateStatisticsReport = generateStatisticsReport;
    window.exportStatisticsData = exportStatisticsData;
    window.refreshStatisticsData = refreshStatisticsData;
    
    // 统计概览页面功能
    window.searchOverviewRecords = searchOverviewRecords;
    window.displayOverviewResults = displayOverviewResults;
    window.syncOverviewTableRows = syncOverviewTableRows;
    window.syncOverviewTableScroll = syncOverviewTableScroll;
    window.updateOverviewSummary = updateOverviewSummary;
    window.loadOverviewAvailableYears = loadOverviewAvailableYears;
    
    // 状态和配置
    window.StatisticsState = StatisticsState;
    window.StatisticsConfig = StatisticsConfig;
    window.StatisticsMetrics = StatisticsMetrics;
}

console.log('statistics.js 模块加载完成');
