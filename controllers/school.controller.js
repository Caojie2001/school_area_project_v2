/**
 * School Controller
 * 负责学校注册表和学校数据管理的业务逻辑
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
// 学校注册表管理
// =====================================================

/**
 * 获取学校注册表
 * GET /api/schools/registry
 */
exports.getSchoolRegistry = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        const schools = await getSchoolRegistry();
        
        res.json({ 
            success: true, 
            data: schools,
            count: schools.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('获取学校注册表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校注册表失败',
            message: error.message 
        });
    }
};

/**
 * 获取学校名称列表（用于下拉框）
 * GET /api/schools/names
 */
exports.getSchoolNames = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        const schools = await getSchoolRegistry();
        
        const schoolNames = schools.map(school => school.school_name).sort();
        
        res.json({ 
            success: true, 
            data: schoolNames,
            count: schoolNames.length 
        });
    } catch (error) {
        console.error('获取学校名称列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校名称列表失败',
            message: error.message 
        });
    }
};

/**
 * 获取院校类型列表
 * GET /api/schools/types
 */
exports.getSchoolTypes = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        const schools = await getSchoolRegistry();
        
        // 提取所有唯一的院校类型
        const schoolTypes = [...new Set(schools.map(school => school.school_type))].sort();
        
        // 统计每个类型的学校数量
        const typeStats = schoolTypes.map(type => {
            const count = schools.filter(school => school.school_type === type).length;
            return { type, count };
        });
        
        res.json({ 
            success: true, 
            data: {
                types: schoolTypes,
                statistics: typeStats,
                totalTypes: schoolTypes.length
            }
        });
    } catch (error) {
        console.error('获取院校类型列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取院校类型列表失败',
            message: error.message 
        });
    }
};

/**
 * 获取学校类型映射关系
 * GET /api/schools/type-mapping
 */
exports.getSchoolTypeMapping = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        const schools = await getSchoolRegistry();
        
        // 构建学校名称到类型的映射对象
        const mapping = {};
        schools.forEach(school => {
            mapping[school.school_name] = school.school_type;
        });
        
        res.json({ 
            success: true, 
            data: mapping,
            count: Object.keys(mapping).length 
        });
    } catch (error) {
        console.error('获取学校类型映射失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校类型映射失败',
            message: error.message 
        });
    }
};

/**
 * 按类型获取学校列表
 * GET /api/schools/by-type/:type
 */
exports.getSchoolsByType = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        const schools = await getSchoolRegistry();
        
        const schoolType = decodeURIComponent(req.params.type);
        const schoolsOfType = schools.filter(school => school.school_type === schoolType);
        
        res.json({ 
            success: true, 
            data: schoolsOfType,
            type: schoolType,
            count: schoolsOfType.length 
        });
    } catch (error) {
        console.error('按类型获取学校列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '按类型获取学校列表失败',
            message: error.message 
        });
    }
};

/**
 * 获取单个学校详细信息
 * GET /api/schools/detail/:schoolName
 */
exports.getSchoolDetail = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        const schools = await getSchoolRegistry();
        
        const schoolName = decodeURIComponent(req.params.schoolName);
        const school = schools.find(s => s.school_name === schoolName);
        
        if (!school) {
            return res.status(404).json({ 
                success: false, 
                error: '学校未找到',
                schoolName: schoolName 
            });
        }
        
        res.json({ 
            success: true, 
            data: school 
        });
    } catch (error) {
        console.error('获取学校详细信息失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学校详细信息失败',
            message: error.message 
        });
    }
};

// =====================================================
// 学校历史数据管理
// =====================================================

/**
 * 获取所有学校历史数据（支持年份筛选）
 * GET /api/schools
 */
exports.getSchoolHistory = async (req, res) => {
    try {
        const { year } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        
        // 根据用户角色获取不同的数据
        let schools;
        if (req.session.user.role === 'school') {
            // 学校用户只能看到自己上传的数据
            schools = await dataService.getSchoolHistoryByUser(
                req.session.user.role, 
                req.session.user.school_name, 
                req.session.user.username, 
                yearFilter
            );
        } else {
            // 管理员和基建中心可以看到所有数据
            schools = await dataService.getSchoolHistory(yearFilter);
        }
        
        // 格式化所有面积相关的数值为两位小数
        const formattedSchools = schools.map(school => ({
            ...school,
            current_building_area: formatAreaToTwoDecimals(school.current_building_area),
            required_building_area: formatAreaToTwoDecimals(school.required_building_area),
            teaching_area_gap: formatAreaToTwoDecimals(school.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(school.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(school.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(school.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(school.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(school.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(school.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(school.special_subsidy_total)
        }));
        
        res.json({ success: true, schools: formattedSchools });
    } catch (error) {
        console.error('获取学校历史数据失败:', error);
        res.status(500).json({ success: false, error: '获取数据失败' });
    }
};

/**
 * 获取各校各年度最新记录（支持年份和学校筛选）
 * GET /api/schools/latest
 */
exports.getLatestSchoolRecords = async (req, res) => {
    try {
        const { year, baseYear, school, user, calculationCriteria } = req.query;
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        const baseYearFilter = baseYear && baseYear !== 'all' ? parseInt(baseYear) : null;
        let schoolFilter = school && school !== 'all' ? school : null;
        let userFilter = user && user !== 'all' ? user : null;
        let criteriaFilter = calculationCriteria && calculationCriteria !== 'all' ? calculationCriteria : null;
        
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;
        
        // 如果是学校用户，强制限制只能看到自己学校自己上传的数据
        if (userRole === 'school') {
            schoolFilter = userSchoolName;
            userFilter = req.session.user.real_name || username;
        }
        
        // 返回符合条件的每个学校的最新记录
        const schools = await dataService.getLatestSchoolRecords(
            yearFilter, 
            schoolFilter, 
            baseYearFilter, 
            userRole, 
            username, 
            userSchoolName, 
            userFilter, 
            criteriaFilter
        );
        
        // 格式化所有面积相关的数值为两位小数
        const formattedSchools = schools.map(school => ({
            ...school,
            current_building_area: formatAreaToTwoDecimals(school.current_building_area),
            required_building_area: formatAreaToTwoDecimals(school.required_building_area),
            teaching_area_gap: formatAreaToTwoDecimals(school.teaching_area_gap),
            office_area_gap: formatAreaToTwoDecimals(school.office_area_gap),
            dormitory_area_gap: formatAreaToTwoDecimals(school.dormitory_area_gap),
            other_living_area_gap: formatAreaToTwoDecimals(school.other_living_area_gap),
            logistics_area_gap: formatAreaToTwoDecimals(school.logistics_area_gap),
            total_area_gap_with_subsidy: formatAreaToTwoDecimals(school.total_area_gap_with_subsidy),
            total_area_gap_without_subsidy: formatAreaToTwoDecimals(school.total_area_gap_without_subsidy),
            special_subsidy_total: formatAreaToTwoDecimals(school.special_subsidy_total)
        }));
        
        res.json({ success: true, data: formattedSchools });
    } catch (error) {
        console.error('获取最新学校记录失败:', error);
        res.status(500).json({ success: false, error: '获取数据失败', message: error.message });
    }
};

/**
 * 获取学校选项列表（用于表单下拉框）- 保持向后兼容
 * GET /api/school-options
 */
exports.getSchoolOptions = async (req, res) => {
    try {
        const { getSchoolRegistry } = require('../config/dataService');
        
        // 从数据库获取学校列表
        const schools = await getSchoolRegistry();
        
        res.json({ success: true, schools: schools });
    } catch (error) {
        console.error('获取学校选项失败:', error);
        res.status(500).json({ success: false, error: '获取学校选项失败' });
    }
};

// =====================================================
// 学生数数据来源管理
// =====================================================

/**
 * 获取学生数数据来源列表
 * GET /api/student-data-sources
 */
exports.getStudentDataSources = async (req, res) => {
    try {
        const pool = await getPool();
        const [rows] = await pool.query(
            'SELECT id, data_source FROM student_data_sources ORDER BY id ASC'
        );
        
        res.json({ 
            success: true, 
            data: rows,
            count: rows.length 
        });
    } catch (error) {
        console.error('获取学生数数据来源列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取学生数数据来源列表失败',
            message: error.message 
        });
    }
};
