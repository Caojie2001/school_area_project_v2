/**
 * Statistics Controller
 * 负责统计数据和趋势分析的业务逻辑
 */

const { getPool } = require('../config/database');
const dataService = require('../config/dataService');

/**
 * 格式化面积数值为两位小数
 */
function formatAreaToTwoDecimals(value) {
    if (value === null || value === undefined) return null;
    return parseFloat(parseFloat(value).toFixed(2));
}

// =====================================================
// 统计数据管理
// =====================================================

/**
 * 获取统计数据（支持年份筛选）
 * GET /api/statistics
 */
exports.getStatistics = async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 学校用户不能访问统计数据（统计数据是跨学校的）
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        const stats = await dataService.getStatistics(yearFilter);
        
        // 格式化统计数据中的面积相关数值
        const formattedStats = {
            ...stats,
            // 如果统计数据中包含面积相关字段，也进行格式化
            ...(stats.totalCurrentArea && { totalCurrentArea: formatAreaToTwoDecimals(stats.totalCurrentArea) }),
            ...(stats.totalRequiredArea && { totalRequiredArea: formatAreaToTwoDecimals(stats.totalRequiredArea) }),
            ...(stats.totalAreaGap && { totalAreaGap: formatAreaToTwoDecimals(stats.totalAreaGap) }),
            ...(stats.averageAreaGap && { averageAreaGap: formatAreaToTwoDecimals(stats.averageAreaGap) })
        };
        
        res.json({
            success: true,
            data: formattedStats,
            message: '获取统计数据成功'
        });
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({ error: '获取统计数据失败: ' + error.message });
    }
};

/**
 * 获取学校统计数据
 * GET /api/statistics/schools
 */
exports.getSchoolStatistics = async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 学校用户不能访问统计数据（统计数据是跨学校的）
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        const stats = await dataService.getStatistics(yearFilter);
        
        // 格式化统计数据中的面积相关数值
        const formattedStats = {
            ...stats,
            // 如果统计数据中包含面积相关字段，也进行格式化
            ...(stats.overall && stats.overall.total_current_area && { 
                overall: {
                    ...stats.overall,
                    total_current_area: formatAreaToTwoDecimals(stats.overall.total_current_area),
                    total_required_area: formatAreaToTwoDecimals(stats.overall.total_required_area),
                    total_gap: formatAreaToTwoDecimals(stats.overall.total_gap),
                    avg_current_area: formatAreaToTwoDecimals(stats.overall.avg_current_area)
                }
            })
        };
        
        res.json({
            success: true,
            data: formattedStats,
            message: '获取学校统计数据成功'
        });
    } catch (error) {
        console.error('获取学校统计数据失败:', error);
        res.status(500).json({ success: false, error: '获取学校统计数据失败: ' + error.message });
    }
};

/**
 * 获取统计概览数据
 * GET /api/statistics/overview
 */
exports.getStatisticsOverview = async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 学校用户不能访问统计数据
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        const stats = await dataService.getStatistics(yearFilter);
        
        res.json({
            success: true,
            data: stats.overall || {},
            message: '获取统计概览成功'
        });
    } catch (error) {
        console.error('获取统计概览失败:', error);
        res.status(500).json({ success: false, error: '获取统计概览失败: ' + error.message });
    }
};

/**
 * 获取趋势数据（多年度对比）
 * GET /api/statistics/trends
 */
exports.getStatisticsTrends = async (req, res) => {
    try {
        // 学校用户不能访问统计数据
        if (req.session.user.role === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看统计数据' });
        }
        
        // 获取多年统计数据用于趋势分析
        const pool = await getPool();
        const [rows] = await pool.execute(`
            SELECT 
                year,
                COUNT(*) as total_schools,
                SUM(total_students) as total_students,
                SUM(current_building_area) as total_current_area,
                SUM(required_building_area) as total_required_area,
                SUM(total_area_gap_with_subsidy) as total_gap
            FROM calculation_history
            GROUP BY year
            ORDER BY year ASC
        `);
        
        // 格式化数据
        const trends = rows.map(row => ({
            ...row,
            total_current_area: formatAreaToTwoDecimals(row.total_current_area),
            total_required_area: formatAreaToTwoDecimals(row.total_required_area),
            total_gap: formatAreaToTwoDecimals(row.total_gap)
        }));
        
        res.json({
            success: true,
            data: trends,
            message: '获取趋势数据成功'
        });
    } catch (error) {
        console.error('获取趋势数据失败:', error);
        res.status(500).json({ success: false, error: '获取趋势数据失败: ' + error.message });
    }
};

/**
 * 获取填报概览记录
 * GET /api/overview/records
 */
exports.getOverviewRecords = async (req, res) => {
    try {
        const { year, userType, export: isExport } = req.query;
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        // 权限检查：只有管理员和基建中心用户能访问填报概览
        if (userRole === 'school') {
            return res.status(403).json({ success: false, error: '没有权限查看填报概览' });
        }
        
        const pool = await getPool();
        
        // 构建查询条件
        let query = `
            SELECT 
                ch.id,
                ch.school_name,
                ch.year,
                ch.submitter_username,
                ch.calculation_criteria,
                ch.total_students,
                ch.current_building_area,
                ch.required_building_area,
                ch.total_area_gap_with_subsidy,
                ch.total_area_gap_without_subsidy,
                ch.created_at,
                ch.updated_at,
                u.real_name as submitter_name,
                sr.school_type
            FROM calculation_history ch
            LEFT JOIN users u ON ch.submitter_username = u.username
            LEFT JOIN school_registry sr ON ch.school_name = sr.school_name
            WHERE 1=1
        `;
        
        const params = [];
        
        // 年份筛选
        if (year && year !== 'all') {
            query += ' AND ch.year = ?';
            params.push(parseInt(year));
        }
        
        // 用户类型筛选
        if (userType && userType !== 'all') {
            query += ' AND u.role = ?';
            params.push(userType);
        }
        
        query += ' ORDER BY ch.updated_at DESC, ch.year DESC';
        
        const [rows] = await pool.query(query, params);
        
        // 格式化数据
        const formattedRecords = rows.map(row => ({
            ...row,
            current_building_area: formatAreaToTwoDecimals(row.current_building_area),
            required_building_area: formatAreaToTwoDecimals(row.required_building_area),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(row.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(row.total_area_gap_without_subsidy)
        }));
        
        res.json({
            success: true,
            data: formattedRecords,
            count: formattedRecords.length,
            message: '获取填报概览成功'
        });
    } catch (error) {
        console.error('获取填报概览失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取填报概览失败',
            message: error.message 
        });
    }
};
