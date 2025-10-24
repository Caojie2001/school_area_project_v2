const path = require('path');
const { getPool } = require('../config/database');
const dataService = require('../config/dataService');

// 辅助函数：格式化面积为两位小数
function formatAreaToTwoDecimals(value) {
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    const num = parseFloat(value);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

/**
 * 首页重定向
 */
function redirectToHome(req, res, safeRedirect) {
    safeRedirect(res, '/html/data-entry-new.html');
}

/**
 * index.html 路由 - 重定向到历史测算页面
 */
function redirectIndex(req, res, safeRedirect) {
    safeRedirect(res, '/html/data-entry-new.html');
}

/**
 * 数据录入页面重定向
 */
function redirectDataEntry(req, res, safeRedirect) {
    safeRedirect(res, '/#data-entry');
}

/**
 * 数据管理页面重定向
 */
function redirectDataManagement(req, res, safeRedirect) {
    safeRedirect(res, '/#data-management');
}

/**
 * 统计页面重定向
 */
function redirectStatistics(req, res, safeRedirect) {
    safeRedirect(res, '/#statistics');
}

/**
 * 用户管理页面
 */
function userManagementPage(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'html', 'user-management.html'));
}

/**
 * 兼容旧的用户管理路由
 */
function redirectUserManagement(req, res, safeRedirect) {
    safeRedirect(res, '/html/user-management.html');
}

/**
 * 健康检查端点
 */
function healthCheck(req, res) {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}

/**
 * 数据库状态检查端点 - 仅限管理员
 */
function databaseStatus(req, res) {
    try {
        // 检查数据库连接是否正常
        if (dataService && dataService.testConnection) {
            dataService.testConnection()
                .then(() => {
                    res.json({ 
                        success: true, 
                        status: 'connected', 
                        timestamp: new Date().toISOString() 
                    });
                })
                .catch(error => {
                    console.error('数据库连接测试失败:', error);
                    res.json({ 
                        success: false, 
                        status: 'disconnected', 
                        error: error.message,
                        timestamp: new Date().toISOString() 
                    });
                });
        } else {
            res.json({ 
                success: true, 
                status: 'unknown', 
                message: '数据库服务状态未知',
                timestamp: new Date().toISOString() 
            });
        }
    } catch (error) {
        console.error('检查数据库状态时出错:', error);
        res.status(500).json({ 
            success: false, 
            status: 'error', 
            error: error.message,
            timestamp: new Date().toISOString() 
        });
    }
}

/**
 * 获取可用年份
 */
async function getYears(req, res) {
    try {
        // 如果是未认证的请求，返回所有年份
        if (!req.session.user) {
            const years = await dataService.getAvailableYears();
            res.json({ success: true, data: years });
            return;
        }

        const userRole = req.session.user.role;
        const userSchoolName = req.session.user.school_name;
        
        let years = [];
        
        if (userRole === 'admin' || userRole === 'construction_center') {
            // 管理员和建设中心可以看到所有年份
            years = await dataService.getAvailableYears();
        } else if (userRole === 'school' && userSchoolName) {
            // 学校用户只能看到该学校有测算数据的年份
            years = await dataService.getAvailableYearsBySchool(userSchoolName);
            console.log(`学校用户 ${req.session.user.username} (${userSchoolName}) 的可用年份:`, years);
        } else {
            // 其他情况返回空数组
            years = [];
        }
        
        res.json({ success: true, data: years });
    } catch (error) {
        console.error('获取年份数据失败:', error);
        res.status(500).json({ success: false, error: '获取年份数据失败' });
    }
}

/**
 * 获取学生规划参数（按年份分组）
 */
async function getStudentPlanningParams(req, res) {
    try {
        console.log('📥 收到学生规划参数请求');
        
        // 如果是未认证的请求，返回所有学生规划参数
        if (!req.session.user) {
            const params = await dataService.getStudentPlanningParams();
            res.json({ success: true, data: params });
            return;
        }

        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        console.log('👤 用户信息:', { userRole, username, userSchoolName });
        
        let params = [];
        
        if (userRole === 'admin' || userRole === 'construction_center') {
            // 管理员和建设中心可以看到所有学生规划参数
            params = await dataService.getStudentPlanningParams();
        } else if (userRole === 'school' && username && userSchoolName) {
            // 学校用户只能看到自己提交的或本校的学生规划参数
            params = await dataService.getStudentPlanningParams(userRole, username, userSchoolName);
            console.log(`学校用户 ${username} (${userSchoolName}) 的可用学生规划参数:`, params);
        } else {
            // 其他情况返回空数组
            params = [];
        }
        
        res.json({ success: true, data: params });
    } catch (error) {
        console.error('获取学生规划参数失败:', error);
        res.status(500).json({ success: false, error: '获取学生规划参数失败' });
    }
}

/**
 * 获取可用的测算用户
 */
async function getUsers(req, res) {
    try {
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        // 根据用户角色返回不同的用户列表
        let users = [];
        
        if (userRole === 'admin' || userRole === 'construction_center') {
            // 管理员和基建中心可以看到所有测算用户
            users = await dataService.getAvailableSubmitterUsers();
        } else if (userRole === 'school' && username) {
            // 学校用户只能看到自己
            users = [{ username: username, real_name: req.session.user.real_name || username }];
        }
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ success: false, error: '获取用户列表失败' });
    }
}

/**
 * 查看记录详情
 */
async function viewRecord(req, res) {
    try {
        const { id } = req.params;
        
        // 获取记录详情
        const recordData = await dataService.getSchoolRecordById(parseInt(id));
        
        if (!recordData) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }

        console.log('查看记录ID:', id);
        console.log('学校记录数据:', recordData);
        
        // 格式化面积数据
        const formattedRecord = {
            ...recordData,
            current_building_area: formatAreaToTwoDecimals(recordData.current_building_area),
            required_building_area: formatAreaToTwoDecimals(recordData.required_building_area),
            teaching_area: formatAreaToTwoDecimals(recordData.teaching_area_current),
            office_area: formatAreaToTwoDecimals(recordData.office_area_current),
            total_living_area: formatAreaToTwoDecimals(recordData.total_living_area_current),
            dormitory_area: formatAreaToTwoDecimals(recordData.dormitory_area_current),
            logistics_area: formatAreaToTwoDecimals(recordData.logistics_area_current),
            teaching_area_gap: formatAreaToTwoDecimals(recordData.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(recordData.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(recordData.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(recordData.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(recordData.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(recordData.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(recordData.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(recordData.special_subsidy_total)
        };
        
        // 返回格式化的记录数据
        res.json({
            success: true,
            data: formattedRecord
        });
        
    } catch (error) {
        console.error('获取记录详情时出错:', error);
        res.status(500).json({ success: false, error: '获取记录详情失败: ' + error.message });
    }
}

/**
 * 获取学校类型（通过学校名称）
 * 注意：此端点需要访问全局变量 SCHOOL_NAME_TO_TYPE
 * TODO: 将学校类型映射迁移到数据库或配置文件
 */
function getSchoolType(req, res) {
    try {
        const schoolName = decodeURIComponent(req.params.schoolName);
        
        // 临时方案：返回未指定，实际应从数据库查询
        // 在完整迁移后，应该调用 dataService 获取学校类型
        const schoolType = '未指定';
        
        res.json({
            success: true,
            schoolName: schoolName,
            schoolType: schoolType
        });
    } catch (error) {
        console.error('获取学校类型失败:', error);
        res.status(500).json({ error: '获取学校类型失败: ' + error.message });
    }
}

module.exports = {
    // 页面路由
    redirectToHome,
    redirectIndex,
    redirectDataEntry,
    redirectDataManagement,
    redirectStatistics,
    userManagementPage,
    redirectUserManagement,
    
    // 系统端点
    healthCheck,
    databaseStatus,
    
    // 数据查询
    getYears,
    getStudentPlanningParams,
    getUsers,
    viewRecord,
    getSchoolType
};
