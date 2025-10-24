/**
 * 计算引擎模块
 * 提供建筑面积缺口计算、标准加载、学校类型查询等核心业务逻辑
 */

const { getPool } = require('../database');
const { cleanSchoolType } = require('./helpers');

// 动态加载的测算标准数据（从数据库加载）
let DYNAMIC_BASIC_STANDARDS = {};
let DYNAMIC_SUBSIDIZED_STANDARDS = {};

/**
 * 根据学校名称获取学校类型（从 school_registry 表查询）
 * @param {string} schoolName - 学校名称
 * @returns {Promise<string>} 学校类型，未找到时返回"综合院校"
 */
async function getSchoolType(schoolName) {
    if (!schoolName) return '综合院校';
    
    try {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT school_type FROM school_registry WHERE school_name = ?',
            [schoolName.trim()]
        );
        
        if (rows.length > 0 && rows[0].school_type) {
            return rows[0].school_type;
        }
        
        // 如果未找到，返回默认值
        console.warn(`学校 "${schoolName}" 未在 school_registry 表中找到，使用默认类型`);
        return '综合院校';
    } catch (error) {
        console.error('查询学校类型失败:', error);
        return '综合院校';
    }
}

/**
 * 从数据库加载测算标准数据
 * 包括基础面积标准和补贴面积标准
 * @returns {Promise<void>}
 */
async function loadCalculationStandards() {
    try {
        const pool = await getPool();
        
        // 加载基础面积标准
        const [basicRows] = await pool.execute(
            'SELECT school_type, room_type, standard_value FROM basic_area_standards WHERE is_active = 1'
        );
        
        // 加载补贴面积标准
        const [subsidizedRows] = await pool.execute(
            'SELECT school_type, room_type, subsidy_type, standard_value FROM subsidized_area_standards WHERE is_active = 1'
        );
        
        // 组织基础标准数据（按院校类型和用房类型组织）
        DYNAMIC_BASIC_STANDARDS = {};
        basicRows.forEach(row => {
            if (!DYNAMIC_BASIC_STANDARDS[row.school_type]) {
                DYNAMIC_BASIC_STANDARDS[row.school_type] = {};
            }
            DYNAMIC_BASIC_STANDARDS[row.school_type][row.room_type] = parseFloat(row.standard_value);
        });
        
        // 组织补贴标准数据（三重索引结构）
        DYNAMIC_SUBSIDIZED_STANDARDS = {};
        subsidizedRows.forEach(row => {
            if (!DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type]) {
                DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type] = {};
            }
            if (!DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type][row.room_type]) {
                DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type][row.room_type] = {};
            }
            DYNAMIC_SUBSIDIZED_STANDARDS[row.school_type][row.room_type][row.subsidy_type] = parseFloat(row.standard_value);
        });
        
        console.log('测算标准数据加载成功');
        console.log('基础标准类型数量:', Object.keys(DYNAMIC_BASIC_STANDARDS).length);
        console.log('补贴标准类型数量:', Object.keys(DYNAMIC_SUBSIDIZED_STANDARDS).length);
        
    } catch (error) {
        console.error('加载测算标准数据失败:', error);
        // 如果数据库加载失败，使用空对象，避免系统崩溃
        DYNAMIC_BASIC_STANDARDS = {};
        DYNAMIC_SUBSIDIZED_STANDARDS = {};
    }
}

/**
 * 计算建筑面积缺口
 * @param {Object} data - 学校基础数据
 * @param {Array} specialSubsidyData - 特殊补助数据数组
 * @returns {Promise<Object>} 计算结果对象，包含各类面积数据和缺口
 */
async function calculateBuildingAreaGap(data, specialSubsidyData = []) {
    try {
        const schoolName = data['学校名称'] || '';
        
        // 从数据库获取学校类型
        const schoolTypeText = await getSchoolType(schoolName);
        const standardSchoolType = schoolTypeText; // 直接使用数据库返回的类型
        
        const year = parseFloat(data['年份']) || new Date().getFullYear();
        
        // 只用本科生和专科生字段，兼容历史但不再输出或使用本专科生人数
        let fullTimeUndergraduate = parseFloat(data['全日制本科生人数']);
        if (isNaN(fullTimeUndergraduate)) fullTimeUndergraduate = 0;
        let fullTimeSpecialist = parseFloat(data['全日制专科生人数']);
        if (isNaN(fullTimeSpecialist)) fullTimeSpecialist = 0;
        // 历史数据只有"全日制本专科生人数"时，自动拆分为本科生（全部计入本科）
        if (fullTimeUndergraduate === 0 && fullTimeSpecialist === 0 && data['全日制本专科生人数'] !== undefined) {
            fullTimeUndergraduate = parseFloat(data['全日制本专科生人数']) || 0;
        }
        const fullTimeMaster = parseFloat(data['全日制硕士生人数']) || 0;
        const fullTimeDoctor = parseFloat(data['全日制博士生人数']) || 0;
        const internationalUndergraduate = parseFloat(data['留学生本科生人数']) || 0;
        const internationalMaster = parseFloat(data['留学生硕士生人数']) || 0;
        const internationalDoctor = parseFloat(data['留学生博士生人数']) || 0;

        // 计算各类学生总数
        const allUndergraduate = fullTimeUndergraduate + internationalUndergraduate;
        const allSpecialist = fullTimeSpecialist; // 专科生单独统计
        const allMaster = fullTimeMaster + internationalMaster;
        const allDoctor = fullTimeDoctor + internationalDoctor;
        const allInternational = internationalUndergraduate + internationalMaster + internationalDoctor;

        // 重新计算总学生数确保准确性（本科+专科+硕士+博士）
        const totalStudents = allUndergraduate + allSpecialist + allMaster + allDoctor;
        
        // 现有面积
        const currentArea = {
            A: parseFloat(data['现有教学及辅助用房面积']) || 0,
            B: parseFloat(data['现有办公用房面积']) || 0,
            C1: parseFloat(data['现有学生宿舍面积']) || 0,
            C2: 0, // 将通过计算得出
            D: parseFloat(data['现有后勤辅助用房面积']) || 0
        };
        
        // 计算C2 = 生活用房总面积 - 学生宿舍面积
        const totalLivingArea = parseFloat(data['现有生活用房总面积']) || 0;
        const dormitoryArea = parseFloat(data['现有学生宿舍面积']) || 0;
        currentArea.C2 = Math.max(0, totalLivingArea - dormitoryArea); // 确保不为负数
        
        // 获取标准（从动态加载的数据中获取）
        const basicStandards = DYNAMIC_BASIC_STANDARDS[standardSchoolType];
        if (!basicStandards) {
            throw new Error(`未找到院校类型 ${standardSchoolType} 的基础标准数据`);
        }
        
        // 从动态加载的标准数据中获取补贴标准
        const subsidizedStandards = DYNAMIC_SUBSIDIZED_STANDARDS[standardSchoolType];
        if (!subsidizedStandards) {
            throw new Error(`未找到院校类型 ${standardSchoolType} 的补贴标准数据`);
        }
        
        // 计算基础应配面积（注意：数据库中使用中文房间类型名称）
        const basicRequiredArea = {
            A: (basicStandards['教学及辅助用房'] || 0) * totalStudents,
            B: (basicStandards['办公用房'] || 0) * totalStudents, 
            C1: (basicStandards['学生宿舍'] || 0) * totalStudents,
            C2: (basicStandards['其他生活用房'] || 0) * totalStudents,
            D: (basicStandards['后勤辅助用房'] || 0) * totalStudents
        };
        
        // 计算补贴面积（新三重索引结构）
        const subsidizedArea = {
            A: (subsidizedStandards['教学及辅助用房']['全日制硕士'] || 0) * fullTimeMaster + 
               (subsidizedStandards['教学及辅助用房']['全日制博士'] || 0) * fullTimeDoctor + 
               (subsidizedStandards['教学及辅助用房']['留学生'] || 0) * allInternational + 
               (subsidizedStandards['教学及辅助用房']['留学生硕士'] || 0) * internationalMaster + 
               (subsidizedStandards['教学及辅助用房']['留学生博士'] || 0) * internationalDoctor,
            B: (subsidizedStandards['办公用房']['全日制硕士'] || 0) * fullTimeMaster + 
               (subsidizedStandards['办公用房']['全日制博士'] || 0) * fullTimeDoctor + 
               (subsidizedStandards['办公用房']['留学生'] || 0) * allInternational + 
               (subsidizedStandards['办公用房']['留学生硕士'] || 0) * internationalMaster + 
               (subsidizedStandards['办公用房']['留学生博士'] || 0) * internationalDoctor,
            C1: (subsidizedStandards['学生宿舍']['全日制硕士'] || 0) * fullTimeMaster + 
                (subsidizedStandards['学生宿舍']['全日制博士'] || 0) * fullTimeDoctor + 
                (subsidizedStandards['学生宿舍']['留学生'] || 0) * allInternational + 
                (subsidizedStandards['学生宿舍']['留学生硕士'] || 0) * internationalMaster + 
                (subsidizedStandards['学生宿舍']['留学生博士'] || 0) * internationalDoctor,
            C2: (subsidizedStandards['其他生活用房']['全日制硕士'] || 0) * fullTimeMaster + 
                (subsidizedStandards['其他生活用房']['全日制博士'] || 0) * fullTimeDoctor + 
                (subsidizedStandards['其他生活用房']['留学生'] || 0) * allInternational + 
                (subsidizedStandards['其他生活用房']['留学生硕士'] || 0) * internationalMaster + 
                (subsidizedStandards['其他生活用房']['留学生博士'] || 0) * internationalDoctor,
            D: (subsidizedStandards['后勤辅助用房']['全日制硕士'] || 0) * fullTimeMaster + 
               (subsidizedStandards['后勤辅助用房']['全日制博士'] || 0) * fullTimeDoctor + 
               (subsidizedStandards['后勤辅助用房']['留学生'] || 0) * allInternational + 
               (subsidizedStandards['后勤辅助用房']['留学生硕士'] || 0) * internationalMaster + 
               (subsidizedStandards['后勤辅助用房']['留学生博士'] || 0) * internationalDoctor
        };
        
        // 计算总应配面积
        const totalRequiredArea = {
            A: basicRequiredArea.A + subsidizedArea.A,
            B: basicRequiredArea.B + subsidizedArea.B,
            C1: basicRequiredArea.C1 + subsidizedArea.C1,
            C2: basicRequiredArea.C2 + subsidizedArea.C2,
            D: basicRequiredArea.D + subsidizedArea.D
        };
        
        // 计算特殊补助总面积
        const totalSpecialSubsidy = specialSubsidyData.reduce((sum, item) => {
            const area = parseFloat(item['补助面积（m²）']) || 0;
            return sum + area;
        }, 0);
        
        // 准备特殊补助明细数据（保持原始结构用于表格显示）
        const specialSubsidyDetails = specialSubsidyData.map(item => ({
            name: item['特殊用房补助名称'],
            area: item['补助面积（m²）']
        }));
        
        // 计算面积缺口：应配面积 - 现有面积 （正值表示缺口）
        const areaGap = {
            A: totalRequiredArea.A - currentArea.A,
            B: totalRequiredArea.B - currentArea.B,
            C1: totalRequiredArea.C1 - currentArea.C1,
            C2: totalRequiredArea.C2 - currentArea.C2,
            D: totalRequiredArea.D - currentArea.D
        };
        
        // 计算总缺口（特殊补助增加缺口）
        const totalCurrentArea = Object.values(currentArea).reduce((sum, area) => sum + area, 0);
        const totalRequiredAreaSum = Object.values(totalRequiredArea).reduce((sum, area) => sum + area, 0);
        const totalGapBeforeSpecial = totalRequiredAreaSum - totalCurrentArea; // 应配面积 - 现有面积
        const totalGap = totalGapBeforeSpecial + totalSpecialSubsidy; // 特殊补助增加缺口
        const totalSubsidizedArea = Object.values(subsidizedArea).reduce((sum, area) => sum + area, 0);
        
        return {
            '学校名称': schoolName,
            '学校类型': schoolTypeText,
            '标准学校类型': standardSchoolType,
            '计算使用类型': standardSchoolType,
            '全日制本科生人数': fullTimeUndergraduate,
            '全日制专科生人数': fullTimeSpecialist,
            '全日制硕士生人数': fullTimeMaster,
            '全日制博士生人数': fullTimeDoctor,
            '留学生本科生人数': internationalUndergraduate,
            '留学生硕士生人数': internationalMaster,
            '留学生博士生人数': internationalDoctor,
            '学生总人数': totalStudents,
            '本科生总人数': fullTimeUndergraduate,
            '专科生总人数': fullTimeSpecialist,
            '硕士生总人数': allMaster,
            '博士生总人数': allDoctor,
            '留学生总人数': allInternational,
            '现有生活用房总面积': Math.round(totalLivingArea * 100) / 100,
            '现有学生宿舍面积': Math.round(dormitoryArea * 100) / 100,
            '现有其他生活用房面积（计算）': Math.round(currentArea.C2 * 100) / 100,
            '基础应配教学及辅助用房(A)': Math.round(basicRequiredArea.A * 100) / 100,
            '基础应配办公用房(B)': Math.round(basicRequiredArea.B * 100) / 100,
            '基础应配学生宿舍(C1)': Math.round(basicRequiredArea.C1 * 100) / 100,
            '基础应配其他生活用房(C2)': Math.round(basicRequiredArea.C2 * 100) / 100,
            '基础应配后勤辅助用房(D)': Math.round(basicRequiredArea.D * 100) / 100,
            '补贴教学及辅助用房(A)': Math.round(subsidizedArea.A * 100) / 100,
            '补贴办公用房(B)': Math.round(subsidizedArea.B * 100) / 100,
            '补贴学生宿舍(C1)': Math.round(subsidizedArea.C1 * 100) / 100,
            '补贴其他生活用房(C2)': Math.round(subsidizedArea.C2 * 100) / 100,
            '补贴后勤辅助用房(D)': Math.round(subsidizedArea.D * 100) / 100,
            '总应配教学及辅助用房(A)': Math.round(totalRequiredArea.A * 100) / 100,
            '总应配办公用房(B)': Math.round(totalRequiredArea.B * 100) / 100,
            '总应配学生宿舍(C1)': Math.round(totalRequiredArea.C1 * 100) / 100,
            '总应配其他生活用房(C2)': Math.round(totalRequiredArea.C2 * 100) / 100,
            '总应配后勤辅助用房(D)': Math.round(totalRequiredArea.D * 100) / 100,
            '教学及辅助用房缺口(A)': Math.round(areaGap.A * 100) / 100,
            '办公用房缺口(B)': Math.round(areaGap.B * 100) / 100,
            '学生宿舍缺口(C1)': Math.round(areaGap.C1 * 100) / 100,
            '其他生活用房缺口(C2)': Math.round(areaGap.C2 * 100) / 100,
            '后勤辅助用房缺口(D)': Math.round(areaGap.D * 100) / 100,
            '现有建筑总面积': Math.round(totalCurrentArea * 100) / 100,
            '应配建筑总面积': Math.round(totalRequiredAreaSum * 100) / 100,
            '建筑面积总缺口（含特殊补助）': Math.round(totalGap * 100) / 100,
            '建筑面积总缺口（不含特殊补助）': Math.round(totalGapBeforeSpecial * 100) / 100,
            '特殊补助总面积': Math.round(totalSpecialSubsidy * 100) / 100,
            '特殊补助明细': specialSubsidyDetails,
            '特殊补助项目数': specialSubsidyData.length,
            '补贴总面积': Math.round(totalSubsidizedArea * 100) / 100
        };
    } catch (error) {
        console.error('计算建筑面积缺口时出错:', error);
        return {
            '计算状态': '计算出错',
            '错误信息': error.message
        };
    }
}

module.exports = {
    getSchoolType,
    loadCalculationStandards,
    calculateBuildingAreaGap,
    // 导出标准数据供外部只读访问
    getBasicStandards: () => DYNAMIC_BASIC_STANDARDS,
    getSubsidizedStandards: () => DYNAMIC_SUBSIDIZED_STANDARDS
};
