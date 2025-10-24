const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const archiver = require('archiver');
const { getPool } = require('../config/database');
const dataService = require('../config/dataService');

// 辅助函数：格式化面积为两位小数
function formatAreaToTwoDecimals(area) {
    if (area === null || area === undefined) return '0.00';
    return parseFloat(area).toFixed(2);
}

// 辅助函数：清理学校类型
function cleanSchoolType(schoolType) {
    if (!schoolType) return '';
    return schoolType.replace(/^高校-/, '');
}

// 辅助函数：生成格式化的结果工作表（用于批量下载）
function generateFormattedResultSheet(record) {
    const schoolName = record.school_name || '未知学校';
    const schoolType = record.school_type || '未知';
    const year = record.year || new Date().getFullYear();
    const submitterUser = record.submitter_real_name || record.submitter_username || '未知用户';
    const criteria = record.population_calculation_scope || '规划学生数';
    
    // 解析特殊补助数据
    let specialSubsidies = [];
    try {
        if (record.special_subsidies) {
            const parsed = JSON.parse(record.special_subsidies);
            specialSubsidies = Array.isArray(parsed) ? parsed.map(item => ({
                name: item['特殊用房补助名称'] || '',
                area: parseFloat(item['补助面积（m²）']) || 0
            })) : [];
        }
    } catch (e) {
        console.warn('解析特殊补助数据失败:', e);
    }
    
    // 构建学生数数据
    const studentData = {
        full_time_specialist: record.full_time_specialist || 0,
        full_time_undergraduate: record.full_time_undergraduate || 0,
        full_time_master: record.full_time_master || 0,
        full_time_doctor: record.full_time_doctor || 0,
        international_undergraduate: record.international_undergraduate || 0,
        international_master: record.international_master || 0,
        international_doctor: record.international_doctor || 0
    };
    
    // 获取各类汇总面积
    const teachingTotal = parseFloat(record.teaching_area_total) || 0;
    const officeTotal = parseFloat(record.office_area_total) || 0;
    const livingTotal = parseFloat(record.total_living_area_total) || 0;
    const dormitoryTotal = parseFloat(record.dormitory_area_total) || 0;
    const otherLivingTotal = parseFloat(record.other_living_area_total) || 0;
    const logisticsTotal = parseFloat(record.logistics_area_total) || 0;
    const subtotalTotal = teachingTotal + officeTotal + livingTotal + logisticsTotal;
    
    // 获取测算结果
    const teachingRequired = parseFloat(record.teaching_area_required) || 0;
    const officeRequired = parseFloat(record.office_area_required) || 0;
    const dormitoryRequired = parseFloat(record.dormitory_area_required) || 0;
    const otherLivingRequired = parseFloat(record.other_living_area_required) || 0;
    const livingRequired = dormitoryRequired + otherLivingRequired;
    const logisticsRequired = parseFloat(record.logistics_area_required) || 0;
    const subtotalRequired = teachingRequired + officeRequired + livingRequired + logisticsRequired;
    
    // 获取缺口
    const teachingGap = parseFloat(record.teaching_area_gap) || 0;
    const officeGap = parseFloat(record.office_area_gap) || 0;
    const dormitoryGap = parseFloat(record.dormitory_area_gap) || 0;
    const otherLivingGap = parseFloat(record.other_living_area_gap) || 0;
    const livingGap = dormitoryGap + otherLivingGap;
    const logisticsGap = parseFloat(record.logistics_area_gap) || 0;
    const subtotalGap = teachingGap + officeGap + livingGap + logisticsGap;
    
    // 特殊补助
    const totalGapWithoutSpecial = parseFloat(record.total_area_gap_without_subsidy) || subtotalGap;
    const specialSubsidyArea = parseFloat(record.special_subsidy_total) || 0;
    const totalGapWithSpecial = parseFloat(record.total_area_gap_with_subsidy) || (totalGapWithoutSpecial + specialSubsidyArea);
    
    // 生成测算时间字符串
    const calcTime = new Date(record.created_at || new Date()).toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
    }).replace(/\//g, '-');
    
    // 获取建筑面积类型
    const areaTypes = [];
    if (record.include_current_area) areaTypes.push('现状');
    if (record.include_preliminary_area) areaTypes.push('拟建成_前期');
    if (record.include_under_construction_area) areaTypes.push('拟建成_在建(含竣工)');
    if (record.include_special_subsidy) areaTypes.push('特殊补助');
    const areaTypeText = areaTypes.length > 0 ? areaTypes.join('、') : '未选择';
    
    const gapCalculationMethod = '测算面积-建筑面积>0, 表示有缺口';
    
    // 构建学生数数据行
    const studentRows = [
        ['专科全日制学生数(人)', studentData.full_time_specialist, '本科全日制学生数(人)', studentData.full_time_undergraduate],
        ['硕士全日制学生数(人)', studentData.full_time_master, '博士全日制学生数(人)', studentData.full_time_doctor],
        ['学历本科留学生(人)', studentData.international_undergraduate, '学历硕士留学生(人)', studentData.international_master],
        ['学历博士留学生(人)', studentData.international_doctor, '测算口径_合并', criteria]
    ];
    
    // 构建Excel数据
    const data = [
        ['高校测算'],
        ['测算项目=' + gapCalculationMethod],
        ['', '', '', `测算时间：${calcTime}`],
        ['规划年度', year, '测算用户', submitterUser],
        ['单位/学校(机构)名称(章)', schoolName, '院校类型', cleanSchoolType(schoolType)],
        ['数据来源_建筑面积(m)_现状', '高校基础表', '计入测算的建筑面积', areaTypeText],
        [],
        ['规划学生数'],
        ...studentRows,
        [],
        ['测算结果'],
        ['', '建筑面积(m²)_汇总', '建筑面积(m²)_测算', '建筑面积(m²)_缺额'],
        ['用房类型', 'A', 'B', 'B-A'],
        ['教学及辅助用房', teachingTotal.toFixed(2), teachingRequired.toFixed(2), teachingGap.toFixed(2)],
        ['办公用房', officeTotal.toFixed(2), officeRequired.toFixed(2), officeGap.toFixed(2)],
        ['生活配套用房', livingTotal.toFixed(2), livingRequired.toFixed(2), livingGap.toFixed(2)],
        ['其中:学生宿舍', dormitoryTotal.toFixed(2), dormitoryRequired.toFixed(2), dormitoryGap.toFixed(2)],
        ['其中:其他生活用房', otherLivingTotal.toFixed(2), otherLivingRequired.toFixed(2), otherLivingGap.toFixed(2)],
        ['后勤辅助用房', logisticsTotal.toFixed(2), logisticsRequired.toFixed(2), logisticsGap.toFixed(2)],
        ['小计', subtotalTotal.toFixed(2), subtotalRequired.toFixed(2), subtotalGap.toFixed(2)],
        [],
        ['建筑总面积(m²)_缺额_不含特殊补助', '', 'C', totalGapWithoutSpecial.toFixed(2)],
        ['特殊补助建筑面积(m²)', '', 'D', specialSubsidyArea.toFixed(2)],
        ['建筑总面积(m²)_缺额_含特殊补助', '', 'C+D', totalGapWithSpecial.toFixed(2)],
        []
    ];
    
    // 添加特殊补助明细
    if (specialSubsidies.length > 0) {
        data.push(['特殊用房补助明细']);
        data.push(['特殊补助名称', '', '特殊补助建筑面积(m²)', '']);
        specialSubsidies.forEach(subsidy => {
            data.push([subsidy.name, '', subsidy.area.toFixed(2), '']);
        });
    }
    
    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    ws['!cols'] = [
        { wch: 35 },
        { wch: 20 },
        { wch: 30 },
        { wch: 25 }
    ];
    
    // 设置单元格合并
    const merges = [];
    let currentRow = 0;
    
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: 0, c: 3 } }); // 高校测算
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: 1, c: 3 } }); // 测算项目
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: 2, c: 2 } }); // 测算时间
    currentRow += 3; // 规划年度、学校名称、数据来源
    currentRow++; // 空行
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: 7, c: 3 } }); // 规划学生数
    currentRow += studentRows.length;
    currentRow++; // 空行
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 测算结果
    currentRow += 2; // 表头两行
    currentRow += 7; // 数据行
    currentRow++; // 空行
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 1 } }); // 缺额_不含特殊补助
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 1 } }); // 特殊补助
    merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 1 } }); // 缺额_含特殊补助
    currentRow++; // 空行
    
    if (specialSubsidies.length > 0) {
        merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 特殊用房补助明细
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
        merges.push({ s: { r: currentRow++, c: 2 }, e: { r: currentRow - 1, c: 3 } });
        specialSubsidies.forEach(() => {
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
            merges.push({ s: { r: currentRow++, c: 2 }, e: { r: currentRow - 1, c: 3 } });
        });
    }
    
    ws['!merges'] = merges;
    
    return ws;
}

// 辅助函数：生成横表汇总数据（用于批量下载）
function generateWideTableSheet(records) {
    const summaryData = [];
    
    records.forEach(record => {
        const schoolName = record.school_name || '未知学校';
        const schoolType = record.school_type || '未知';
        const year = record.year || new Date().getFullYear();
        const submitterUser = record.submitter_real_name || record.submitter_username || '未知用户';
        const criteria = record.population_calculation_scope || '规划学生数';
        
        // 获取建筑面积类型
        const areaTypes = [];
        if (record.include_current_area) areaTypes.push('现状');
        if (record.include_preliminary_area) areaTypes.push('拟建成_前期');
        if (record.include_under_construction_area) areaTypes.push('拟建成_在建(含竣工)');
        if (record.include_special_subsidy) areaTypes.push('特殊补助');
        const areaTypeText = areaTypes.join('、');
        
        // 现状面积
        const teachingCurrent = parseFloat(record.teaching_area_current) || 0;
        const officeCurrent = parseFloat(record.office_area_current) || 0;
        const livingCurrent = parseFloat(record.total_living_area_current) || 0;
        const dormitoryCurrent = parseFloat(record.dormitory_area_current) || 0;
        const otherLivingCurrent = parseFloat(record.other_living_area_current) || 0;
        const logisticsCurrent = parseFloat(record.logistics_area_current) || 0;
        const totalCurrent = teachingCurrent + officeCurrent + livingCurrent + logisticsCurrent;
        
        // 拟建成面积
        const teachingPlanned = parseFloat(record.teaching_area_planned) || 0;
        const officePlanned = parseFloat(record.office_area_planned) || 0;
        const livingPlanned = parseFloat(record.total_living_area_planned) || 0;
        const dormitoryPlanned = parseFloat(record.dormitory_area_planned) || 0;
        const otherLivingPlanned = parseFloat(record.other_living_area_planned) || 0;
        const logisticsPlanned = parseFloat(record.logistics_area_planned) || 0;
        const totalPlanned = teachingPlanned + officePlanned + livingPlanned + logisticsPlanned;
        
        // 汇总面积
        const teachingTotal = parseFloat(record.teaching_area_total) || 0;
        const officeTotal = parseFloat(record.office_area_total) || 0;
        const livingTotal = parseFloat(record.total_living_area_total) || 0;
        const dormitoryTotal = parseFloat(record.dormitory_area_total) || 0;
        const otherLivingTotal = parseFloat(record.other_living_area_total) || 0;
        const logisticsTotal = parseFloat(record.logistics_area_total) || 0;
        const totalSum = teachingTotal + officeTotal + livingTotal + logisticsTotal;
        
        // 测算面积
        const teachingRequired = parseFloat(record.teaching_area_required) || 0;
        const officeRequired = parseFloat(record.office_area_required) || 0;
        const dormitoryRequired = parseFloat(record.dormitory_area_required) || 0;
        const otherLivingRequired = parseFloat(record.other_living_area_required) || 0;
        const livingRequired = dormitoryRequired + otherLivingRequired;
        const logisticsRequired = parseFloat(record.logistics_area_required) || 0;
        const totalRequired = teachingRequired + officeRequired + livingRequired + logisticsRequired;
        
        // 缺额
        const teachingGap = parseFloat(record.teaching_area_gap) || 0;
        const officeGap = parseFloat(record.office_area_gap) || 0;
        const dormitoryGap = parseFloat(record.dormitory_area_gap) || 0;
        const otherLivingGap = parseFloat(record.other_living_area_gap) || 0;
        const livingGap = dormitoryGap + otherLivingGap;
        const logisticsGap = parseFloat(record.logistics_area_gap) || 0;
        const totalGapWithoutSpecial = parseFloat(record.total_area_gap_without_subsidy) || 0;
        const totalGapWithSpecial = parseFloat(record.total_area_gap_with_subsidy) || 0;
        
        // 特殊补助
        // 从 calculation_results JSON 中读取特殊补助项目数
        let specialSubsidyCount = 0;
        if (record.calculation_results) {
            try {
                const calcResults = typeof record.calculation_results === 'string' 
                    ? JSON.parse(record.calculation_results) 
                    : record.calculation_results;
                specialSubsidyCount = calcResults['特殊补助项目数'] || 0;
            } catch (e) {
                console.error('解析 calculation_results JSON 失败:', e);
            }
        }
        const specialSubsidyTotal = parseFloat(record.special_subsidy_total) || 0;
        
        // 学生数
        const fullTimeSpecialist = record.full_time_specialist || 0;
        const fullTimeUndergraduate = record.full_time_undergraduate || 0;
        const fullTimeMaster = record.full_time_master || 0;
        const fullTimeDoctor = record.full_time_doctor || 0;
        const fullTimeTotal = fullTimeSpecialist + fullTimeUndergraduate + fullTimeMaster + fullTimeDoctor;
        
        const internationalUndergraduate = record.international_undergraduate || 0;
        const internationalMaster = record.international_master || 0;
        const internationalDoctor = record.international_doctor || 0;
        const internationalTotal = internationalUndergraduate + internationalMaster + internationalDoctor;
        
        const studentTotal = fullTimeTotal + internationalTotal;
        
        summaryData.push({
            '单位/学校(机构)名称(章)': schoolName,
            '院校类别': cleanSchoolType(schoolType),
            '测算年份': year,
            '测算口径_合并': criteria,
            '计入测算的建筑面积': areaTypeText,
            '测算用户': submitterUser,
            '教学及辅助用房面积(㎡)_现状': teachingCurrent.toFixed(2),
            '办公用房面积(㎡)_现状': officeCurrent.toFixed(2),
            '生活用房总面积(㎡)_现状': livingCurrent.toFixed(2),
            '其中:学生宿舍面积(㎡)_现状': dormitoryCurrent.toFixed(2),
            '其中:其他生活用房面积(㎡)_现状': otherLivingCurrent.toFixed(2),
            '后勤辅助用房面积(㎡)_现状': logisticsCurrent.toFixed(2),
            '建筑总面积(㎡)_现状': totalCurrent.toFixed(2),
            '教学及辅助用房面积(㎡)_拟建成': teachingPlanned.toFixed(2),
            '办公用房面积(㎡)_拟建成': officePlanned.toFixed(2),
            '生活用房总面积(㎡)_拟建成': livingPlanned.toFixed(2),
            '其中:学生宿舍面积(㎡)_拟建成': dormitoryPlanned.toFixed(2),
            '其中:其他生活用房面积(㎡)_拟建成': otherLivingPlanned.toFixed(2),
            '后勤辅助用房面积(㎡)_拟建成': logisticsPlanned.toFixed(2),
            '建筑总面积(㎡)_拟建成': totalPlanned.toFixed(2),
            '教学及辅助用房面积(㎡)_汇总': teachingTotal.toFixed(2),
            '办公用房面积(㎡)_汇总': officeTotal.toFixed(2),
            '生活用房总面积(㎡)_汇总': livingTotal.toFixed(2),
            '其中:学生宿舍面积(㎡)_汇总': dormitoryTotal.toFixed(2),
            '其中:其他生活用房面积(㎡)_汇总': otherLivingTotal.toFixed(2),
            '后勤辅助用房面积(㎡)_汇总': logisticsTotal.toFixed(2),
            '建筑总面积(㎡)_汇总': totalSum.toFixed(2),
            '教学及辅助用房面积(㎡)_测算': teachingRequired.toFixed(2),
            '办公用房面积(㎡)_测算': officeRequired.toFixed(2),
            '生活用房总面积(㎡)_测算': livingRequired.toFixed(2),
            '其中:学生宿舍面积(㎡)_测算': dormitoryRequired.toFixed(2),
            '其中:其他生活用房面积(㎡)_测算': otherLivingRequired.toFixed(2),
            '后勤辅助用房面积(㎡)_测算': logisticsRequired.toFixed(2),
            '建筑总面积(㎡)_测算': totalRequired.toFixed(2),
            '教学及辅助用房面积(㎡)_缺额': teachingGap.toFixed(2),
            '办公用房面积(㎡)_缺额': officeGap.toFixed(2),
            '生活用房总面积(㎡)_缺额': livingGap.toFixed(2),
            '其中:学生宿舍面积(㎡)_缺额': dormitoryGap.toFixed(2),
            '其中:其他生活用房面积(㎡)_缺额': otherLivingGap.toFixed(2),
            '后勤辅助用房面积(㎡)_缺额': logisticsGap.toFixed(2),
            '建筑总面积(㎡)_缺额_不含特殊补助': totalGapWithoutSpecial.toFixed(2),
            '建筑总面积(㎡)_缺额_含特殊补助': totalGapWithSpecial.toFixed(2),
            '总间数(间)_特殊用房补助': specialSubsidyCount,
            '建筑总面积(㎡)_特殊用房补助': specialSubsidyTotal.toFixed(2),
            '专科全日制学生数(人)': fullTimeSpecialist,
            '本科全日制学生数(人)': fullTimeUndergraduate,
            '硕士全日制学生数(人)': fullTimeMaster,
            '博士全日制学生数(人)': fullTimeDoctor,
            '全日制学生总数(人)': fullTimeTotal,
            '学历本科留学生数(人)': internationalUndergraduate,
            '学历硕士留学生数(人)': internationalMaster,
            '学历博士留学生数(人)': internationalDoctor,
            '学历留学生总数(人)': internationalTotal,
            '学生总人数(人)': studentTotal
        });
    });
    
    return summaryData;
}

/**
 * 在线下载（前端测算结果直接下载）
 */
async function onlineDownload(req, res) {
    try {
        const { processedSchoolData, schoolData, analysisResult } = req.body;
        
        // 支持两种参数格式：新格式 processedSchoolData 和旧格式 schoolData
        let calculationData;
        if (processedSchoolData && Array.isArray(processedSchoolData)) {
            calculationData = processedSchoolData[0]; // 取数组第一个元素
        } else if (schoolData) {
            calculationData = schoolData;
        } else {
            return res.status(400).json({ error: '缺少计算结果数据' });
        }
        
        console.log('下载请求参数:', { hasProcessedSchoolData: !!processedSchoolData, hasSchoolData: !!schoolData });
        console.log('使用的计算数据包含填报单位:', calculationData['填报单位']);
        
        // 生成Excel文件
        const timestamp = Date.now();
        const schoolName = calculationData['学校名称'] || '在线计算';
        const year = calculationData['年份'] || new Date().getFullYear();
        const outputDir = path.join(__dirname, '..', 'output');
        
        // 确保output目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 生成时间戳字符串
        const now = new Date();
        const timeStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0') + 
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');
        
        // 统一文件名格式
        const fileName = `${schoolName}${year}年测算结果${timeStr}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        
        console.log('生成Excel文件:', fileName);
        console.log('文件路径:', filePath);
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建与图片格式一致的测算结果表
        const calcYear = calculationData['年份'] || new Date().getFullYear();
        const submitterUser = calculationData['填报单位'] || '未知用户';
        
        const data = [
            ['高校测算'],
            ['基本办学条件缺口（＞0表示存在缺口）', '', '', ''],
            ['', '', '', `测算时间：${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}`],
            ['测算年份', calcYear, '测算用户', submitterUser],
            [`单位/学校(机构)名称(章)`, calculationData['学校名称'] || '', '院校类型', cleanSchoolType(calculationData['院校类别'] || '')],
            ['', '', '', ''],
            ['规划学生数', '', '', ''],
            ['专科全日制学生数(人)', calculationData['全日制专科生人数'] || 0, '本科全日制学生数(人)', calculationData['全日制本科生人数'] || 0],
            ['硕士全日制学生数(人)', calculationData['全日制硕士生人数'] || 0, '博士全日制学生数(人)', calculationData['全日制博士生人数'] || 0],
            ['本科留学生数(人)', calculationData['留学生本科生人数'] || 0, '硕士留学生数(人)', calculationData['留学生硕士生人数'] || 0],
            ['博士留学生(人)', calculationData['留学生博士生人数'] || 0, '', ''],
            ['', '', '', ''],
            ['测算结果', '', '', ''],
            ['用房类型', '现状建筑面积(m²)', '测算建筑面积(m²)', '测算建筑面积缺额(m²)'],
            ['教学及辅助用房', formatAreaToTwoDecimals(calculationData['现有教学及辅助用房面积']), formatAreaToTwoDecimals(calculationData['总应配教学及辅助用房(A)']), formatAreaToTwoDecimals(calculationData['教学及辅助用房缺口(A)'])],
            ['办公用房', formatAreaToTwoDecimals(calculationData['现有办公用房面积']), formatAreaToTwoDecimals(calculationData['总应配办公用房(B)']), formatAreaToTwoDecimals(calculationData['办公用房缺口(B)'])],
            ['生活配套用房', formatAreaToTwoDecimals(calculationData['现有生活用房总面积']), formatAreaToTwoDecimals((calculationData['总应配学生宿舍(C1)'] || 0) + (calculationData['总应配其他生活用房(C2)'] || 0)), formatAreaToTwoDecimals((calculationData['学生宿舍缺口(C1)'] || 0) + (calculationData['其他生活用房缺口(C2)'] || 0))],
            ['其中:学生宿舍', formatAreaToTwoDecimals(calculationData['现有学生宿舍面积']), formatAreaToTwoDecimals(calculationData['总应配学生宿舍(C1)']), formatAreaToTwoDecimals(calculationData['学生宿舍缺口(C1)'])],
            ['其中:其他生活用房', formatAreaToTwoDecimals(calculationData['现有其他生活用房面积']), formatAreaToTwoDecimals(calculationData['总应配其他生活用房(C2)']), formatAreaToTwoDecimals(calculationData['其他生活用房缺口(C2)'])],
            ['后勤补助用房', formatAreaToTwoDecimals(calculationData['现有后勤辅助用房面积']), formatAreaToTwoDecimals(calculationData['总应配后勤辅助用房(D)']), formatAreaToTwoDecimals(calculationData['后勤辅助用房缺口(D)'])],
            ['小计', formatAreaToTwoDecimals((calculationData['现有教学及辅助用房面积'] || 0) + (calculationData['现有办公用房面积'] || 0) + (calculationData['现有生活用房总面积'] || 0) + (calculationData['现有后勤辅助用房面积'] || 0)), formatAreaToTwoDecimals((calculationData['总应配教学及辅助用房(A)'] || 0) + (calculationData['总应配办公用房(B)'] || 0) + (calculationData['总应配学生宿舍(C1)'] || 0) + (calculationData['总应配其他生活用房(C2)'] || 0) + (calculationData['总应配后勤辅助用房(D)'] || 0)), formatAreaToTwoDecimals(calculationData['建筑面积总缺口（不含特殊补助）'])],
            ['测算建筑面积总缺额（不含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(calculationData['建筑面积总缺口（不含特殊补助）'])],
            ['特殊补助建筑总面积(m²)', '', '', formatAreaToTwoDecimals(calculationData['特殊补助总面积'])],
            ['测算建筑面积总缺额（含特殊补助）(m²)', '', '', formatAreaToTwoDecimals(calculationData['建筑面积总缺口（含特殊补助）'])],
            ['备注', calculationData['备注'] || calculationData['remarks'] || '', '', '']
        ];
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 30 }, // 第一列
            { wch: 25 }, // 第二列  
            { wch: 30 }, // 第三列
            { wch: 25 }  // 第四列
        ];
        
        // 合并单元格
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // 标题行
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // 副标题行
            { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }, // 空行
            { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } }, // 规划学生数
            { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }, // 空行
            { s: { r: 21, c: 0 }, e: { r: 21, c: 2 } }, // 总缺额行
            { s: { r: 22, c: 0 }, e: { r: 22, c: 2 } }, // 补助面积行
            { s: { r: 23, c: 0 }, e: { r: 23, c: 2 } }, // 含补助总缺额行
            { s: { r: 24, c: 1 }, e: { r: 24, c: 3 } }  // 备注内容
        ];
        
        ws['!merges'] = merges;
        
        // 定义边框样式
        const borderStyle = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
        };
        
        // 设置单元格样式
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                
                // 添加边框到所有单元格
                ws[cellAddress].s.border = borderStyle;
                
                // 设置对齐方式
                ws[cellAddress].s.alignment = { 
                    horizontal: 'center', 
                    vertical: 'center',
                    wrapText: true 
                };
                
                // 特殊行的样式设置
                if (R === 0) { // 主标题
                    ws[cellAddress].s.font = { bold: true, size: 16, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'E6E6FA' } 
                    };
                } else if (R === 1) { // 副标题行
                    ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F0F8FF' } 
                    };
                } else if (R === 7 || R === 13) { // 小标题行
                    ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F0F8FF' } 
                    };
                } else if (R === 14) { // 表头行
                    ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'F5F5F5' } 
                    };
                } else if (R >= 15 && R <= 20) { // 数据行
                    ws[cellAddress].s.font = { size: 10 };
                    if (R % 2 === 0) {
                        ws[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'FAFAFA' } 
                        };
                    }
                } else if (R >= 21) { // 汇总行和备注行
                    ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { 
                        patternType: 'solid', 
                        fgColor: { rgb: 'FFE4E1' } 
                    };
                    // 备注行的合并单元格内容左对齐
                    if (R === 24 && C > 0) {
                        ws[cellAddress].s.alignment = { 
                            horizontal: 'left', 
                            vertical: 'center',
                            wrapText: true 
                        };
                    }
                }
            }
        }
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, "建筑规模测算结果");
        
        // 如果有特殊补助明细，创建特殊补助工作表
        if (calculationData['特殊补助明细'] && Array.isArray(calculationData['特殊补助明细']) && calculationData['特殊补助明细'].length > 0) {
            const subsidyData = [
                ['特殊补助明细'],
                [],
                ['补助项目名称', '补助面积(㎡)']
            ];
            
            calculationData['特殊补助明细'].forEach(item => {
                subsidyData.push([item.name || '', formatAreaToTwoDecimals(item.area)]);
            });
            
            const subsidyWs = XLSX.utils.aoa_to_sheet(subsidyData);
            subsidyWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
            
            // 合并标题
            subsidyWs['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
            ];
            
            // 为特殊补助工作表添加样式
            const subsidyRange = XLSX.utils.decode_range(subsidyWs['!ref']);
            for (let R = subsidyRange.s.r; R <= subsidyRange.e.r; ++R) {
                for (let C = subsidyRange.s.c; C <= subsidyRange.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!subsidyWs[cellAddress]) subsidyWs[cellAddress] = { t: 's', v: '' };
                    if (!subsidyWs[cellAddress].s) subsidyWs[cellAddress].s = {};
                    
                    // 添加边框
                    subsidyWs[cellAddress].s.border = {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    };
                    
                    // 设置对齐
                    subsidyWs[cellAddress].s.alignment = { 
                        horizontal: 'center', 
                        vertical: 'center',
                        wrapText: true 
                    };
                    
                    // 样式设置
                    if (R === 0) { // 标题行
                        subsidyWs[cellAddress].s.font = { bold: true, size: 14 };
                        subsidyWs[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'E6E6FA' } 
                        };
                    } else if (R === 2) { // 表头
                        subsidyWs[cellAddress].s.font = { bold: true, size: 11 };
                        subsidyWs[cellAddress].s.fill = { 
                            patternType: 'solid', 
                            fgColor: { rgb: 'F5F5F5' } 
                        };
                    } else if (R > 2) { // 数据行
                        subsidyWs[cellAddress].s.font = { size: 10 };
                        if (R % 2 === 1) {
                            subsidyWs[cellAddress].s.fill = { 
                                patternType: 'solid', 
                                fgColor: { rgb: 'FAFAFA' } 
                            };
                        }
                    }
                }
            }
            
            XLSX.utils.book_append_sheet(wb, subsidyWs, "特殊补助明细");
        }
        
        // 写入文件
        XLSX.writeFile(wb, filePath);
        
        console.log('Excel文件生成成功');
        
        // 返回下载URL
        const downloadUrl = `/download/${fileName}`;
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            fileName: fileName,
            message: '报告生成成功'
        });
        
    } catch (error) {
        console.error('生成下载文件时出错:', error);
        res.status(500).json({ error: '生成下载文件时出错: ' + error.message });
    }
}

/**
 * 下载批量测算结果（新版测算页面）
 */
async function downloadCalculationResults(req, res) {
    try {
        const { schoolName, schoolType, displayName, userName, calculationMethod, results } = req.body;
        
        if (!schoolName || !results || results.length === 0) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        // 默认缺口计算方式（向后兼容）
        const gapCalculationMethod = calculationMethod || '测算面积-建筑面积>0, 表示有缺口';
        
        // 优先使用前端传来的 displayName
        let displayNameToUse = displayName || userName || null;
        if (!displayNameToUse && req.session && req.session.user) {
            displayNameToUse = req.session.user.real_name || req.session.user.username || '未知用户';
        }

        console.log('开始生成批量测算结果Excel...', {
            schoolName,
            schoolType,
            displayName: displayNameToUse,
            calculationMethod: gapCalculationMethod,
            resultsCount: results.length
        });
        
        // 确保output目录存在
        const outputDir = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 生成时间戳
        const now = new Date();
        const timeStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0') + '_' +
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');
        
        // 存储所有生成的文件路径
        const generatedFiles = [];
        
        // 为每个测算结果生成独立的Excel文件
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            const result = item.result;
            const studentData = item.studentData;
            const calculationData = item.calculationData;
            
            // 获取年份和测算口径
            const planYear = item.year || new Date().getFullYear();
            const criteria = item.criteria || '未知口径';
            
            // 构建学生数数据
            const studentRows = [];
            studentRows.push([
                '专科全日制学生数(人)', 
                studentData.full_time_specialist || 0, 
                '本科全日制学生数(人)', 
                studentData.full_time_undergraduate || 0
            ]);
            studentRows.push([
                '硕士全日制学生数(人)', 
                studentData.full_time_master || 0, 
                '博士全日制学生数(人)', 
                studentData.full_time_doctor || 0
            ]);
            studentRows.push([
                '学历本科留学生(人)', 
                studentData.international_undergraduate || 0, 
                '学历硕士留学生(人)', 
                studentData.international_master || 0
            ]);
            studentRows.push([
                '学历博士留学生(人)', 
                studentData.international_doctor || 0, 
                '测算口径_合并', 
                criteria
            ]);
            
            // 获取选中的建筑面积类型
            const areaTypes = item.areaTypes || [];
            const areaTypeText = areaTypes.length > 0 ? areaTypes.join('、') : '未选择';
            
            // 获取各类现状面积
            const currentAreas = calculationData.currentAreas || {};
            const teachingCurrent = currentAreas.teaching || 0;
            const officeCurrent = currentAreas.office || 0;
            const livingCurrent = currentAreas.living || 0;
            const dormitoryCurrent = currentAreas.dormitory || 0;
            const otherLivingCurrent = currentAreas.otherLiving || 0;
            const logisticsCurrent = currentAreas.logistics || 0;
            const subtotalCurrent = teachingCurrent + officeCurrent + livingCurrent + logisticsCurrent;
            
            // 获取测算结果
            const teachingRequired = result['总应配教学及辅助用房(A)'] || 0;
            const officeRequired = result['总应配办公用房(B)'] || 0;
            const dormitoryRequired = result['总应配学生宿舍(C1)'] || 0;
            const otherLivingRequired = result['总应配其他生活用房(C2)'] || 0;
            const livingRequired = dormitoryRequired + otherLivingRequired;
            const logisticsRequired = result['总应配后勤辅助用房(D)'] || 0;
            const subtotalRequired = teachingRequired + officeRequired + livingRequired + logisticsRequired;
            
            // 获取缺口
            const teachingGap = result['教学及辅助用房缺口(A)'] || 0;
            const officeGap = result['办公用房缺口(B)'] || 0;
            const dormitoryGap = result['学生宿舍缺口(C1)'] || 0;
            const otherLivingGap = result['其他生活用房缺口(C2)'] || 0;
            const livingGap = dormitoryGap + otherLivingGap;
            const logisticsGap = result['后勤辅助用房缺口(D)'] || 0;
            const subtotalGap = teachingGap + officeGap + livingGap + logisticsGap;
            
            // 特殊补助
            const totalGapWithoutSpecial = result['建筑面积总缺口（不含特殊补助）'] || subtotalGap;
            const specialSubsidyArea = result['特殊补助总面积'] || 0;
            const totalGapWithSpecial = result['建筑面积总缺口（含特殊补助）'] || (totalGapWithoutSpecial + specialSubsidyArea);
            
            // 生成测算时间字符串
            const calcTime = new Date().toLocaleString('zh-CN', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-');
            
            // 构建Excel数据
            const data = [
                ['高校测算'],
                ['测算项目=' + gapCalculationMethod],
                ['', '', '', `测算时间：${calcTime}`],
                ['规划年度', planYear, '测算用户', displayNameToUse],
                ['单位/学校(机构)名称(章)', schoolName, '院校类型', cleanSchoolType(schoolType)],
                ['数据来源_建筑面积(m)_现状', '高校基础表', '计入测算的建筑面积', areaTypeText],
                [],
                ['规划学生数'],
                ...studentRows,
                [],
                ['测算结果'],
                ['', '建筑面积(m²)_汇总', '建筑面积(m²)_测算', '建筑面积(m²)_缺额'],
                ['用房类型', 'A', 'B', 'B-A'],
                ['教学及辅助用房', teachingCurrent.toFixed(2), teachingRequired.toFixed(2), teachingGap.toFixed(2)],
                ['办公用房', officeCurrent.toFixed(2), officeRequired.toFixed(2), officeGap.toFixed(2)],
                ['生活配套用房', livingCurrent.toFixed(2), livingRequired.toFixed(2), livingGap.toFixed(2)],
                ['其中:学生宿舍', dormitoryCurrent.toFixed(2), dormitoryRequired.toFixed(2), dormitoryGap.toFixed(2)],
                ['其中:其他生活用房', otherLivingCurrent.toFixed(2), otherLivingRequired.toFixed(2), otherLivingGap.toFixed(2)],
                ['后勤辅助用房', logisticsCurrent.toFixed(2), logisticsRequired.toFixed(2), logisticsGap.toFixed(2)],
                ['小计', subtotalCurrent.toFixed(2), subtotalRequired.toFixed(2), subtotalGap.toFixed(2)],
                [],
                ['建筑总面积(m²)_缺额_不含特殊补助', '', 'C', totalGapWithoutSpecial.toFixed(2)],
                ['特殊补助建筑面积(m²)', '', 'D', specialSubsidyArea.toFixed(2)],
                ['建筑总面积(m²)_缺额_含特殊补助', '', 'C+D', totalGapWithSpecial.toFixed(2)],
                []
            ];
            
            // 添加特殊补助明细
            if (result['特殊补助明细'] && result['特殊补助明细'].length > 0) {
                data.push(['特殊用房补助明细']);
                data.push(['特殊补助名称', '', '特殊补助建筑面积(m²)', '']);
                result['特殊补助明细'].forEach(subsidy => {
                    data.push([subsidy.name || '', '', (subsidy.area || 0).toFixed(2), '']);
                });
            }
            
            // 创建工作表
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // 设置列宽
            ws['!cols'] = [
                { wch: 35 },
                { wch: 20 },
                { wch: 30 },
                { wch: 25 }
            ];
            
            // 设置单元格合并
            const merges = [];
            let currentRow = 0;
            
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 高校测算
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 测算项目
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 2 } }); // 测算时间
            currentRow += 3; // 跳过规划年度、单位学校、数据来源
            currentRow++; // 空行
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 规划学生数
            currentRow += studentRows.length; // 跳过学生数据行
            currentRow++; // 空行
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 测算结果
            currentRow += 9; // 跳过表头和数据行
            currentRow++; // 空行
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 1 } }); // 总缺额
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 1 } }); // 特殊补助
            merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 1 } }); // 含补助总缺额
            
            if (result['特殊补助明细'] && result['特殊补助明细'].length > 0) {
                currentRow++; // 空行
                merges.push({ s: { r: currentRow++, c: 0 }, e: { r: currentRow - 1, c: 3 } }); // 特殊用房补助明细
                merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
                merges.push({ s: { r: currentRow++, c: 2 }, e: { r: currentRow - 1, c: 3 } });
                result['特殊补助明细'].forEach(() => {
                    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
                    merges.push({ s: { r: currentRow++, c: 2 }, e: { r: currentRow - 1, c: 3 } });
                });
            }
            
            ws['!merges'] = merges;
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '测算结果');
            
            // 生成文件名
            const resultFileName = `${schoolName}_${planYear}_${criteria}_${i + 1}_测算结果.xlsx`;
            const resultFilePath = path.join(outputDir, resultFileName);
            
            // 写入文件
            XLSX.writeFile(wb, resultFilePath);
            generatedFiles.push({ path: resultFilePath, name: resultFileName });
            
            console.log(`生成测算结果文件 ${i + 1}/${results.length}:`, resultFileName);
        }
        
        // 如果只有一条测算记录，直接下载单个Excel文件
        if (results.length === 1) {
            console.log('只有一条测算记录，直接下载单个Excel文件');
            
            const singleFile = generatedFiles[0];
            
            // 设置响应头
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(singleFile.name)}`);
            
            // 读取文件并发送
            const fileStream = fs.createReadStream(singleFile.path);
            fileStream.pipe(res);
            
            // 发送完成后删除临时文件
            fileStream.on('end', () => {
                fs.unlink(singleFile.path, (err) => {
                    if (err) console.error('删除临时文件失败:', err);
                });
                console.log('单个Excel文件已发送并清理完成');
            });
            
            return;
        }
        
        // 多条测算记录时，生成汇总表
        console.log('生成测算汇总表...');
        
        // 汇总表表头（完整版，与历史测算批量下载一致）
        const summaryHeaders = [
            '单位/学校(机构)名称(章)',
            '院校类别',
            '测算年份',
            '测算口径_合并',
            '计入测算的建筑面积',
            '测算用户',
            '教学及辅助用房面积(㎡)_现状',
            '办公用房面积(㎡)_现状',
            '生活用房总面积(㎡)_现状',
            '其中:学生宿舍面积(㎡)_现状',
            '其中:其他生活用房面积(㎡)_现状',
            '后勤辅助用房面积(㎡)_现状',
            '建筑总面积(㎡)_现状',
            '教学及辅助用房面积(㎡)_拟建成',
            '办公用房面积(㎡)_拟建成',
            '生活用房总面积(㎡)_拟建成',
            '其中:学生宿舍面积(㎡)_拟建成',
            '其中:其他生活用房面积(㎡)_拟建成',
            '后勤辅助用房面积(㎡)_拟建成',
            '建筑总面积(㎡)_拟建成',
            '教学及辅助用房面积(㎡)_汇总',
            '办公用房面积(㎡)_汇总',
            '生活用房总面积(㎡)_汇总',
            '其中:学生宿舍面积(㎡)_汇总',
            '其中:其他生活用房面积(㎡)_汇总',
            '后勤辅助用房面积(㎡)_汇总',
            '建筑总面积(㎡)_汇总',
            '教学及辅助用房面积(㎡)_测算',
            '办公用房面积(㎡)_测算',
            '生活用房总面积(㎡)_测算',
            '其中:学生宿舍面积(㎡)_测算',
            '其中:其他生活用房面积(㎡)_测算',
            '后勤辅助用房面积(㎡)_测算',
            '建筑总面积(㎡)_测算',
            '教学及辅助用房面积(㎡)_缺额',
            '办公用房面积(㎡)_缺额',
            '生活用房总面积(㎡)_缺额',
            '其中:学生宿舍面积(㎡)_缺额',
            '其中:其他生活用房面积(㎡)_缺额',
            '后勤辅助用房面积(㎡)_缺额',
            '建筑总面积(㎡)_缺额_不含特殊补助',
            '建筑总面积(㎡)_缺额_含特殊补助',
            '总间数(间)_特殊用房补助',
            '建筑总面积(㎡)_特殊用房补助',
            '专科全日制学生数(人)',
            '本科全日制学生数(人)',
            '硕士全日制学生数(人)',
            '博士全日制学生数(人)',
            '全日制学生总数(人)',
            '学历本科留学生数(人)',
            '学历硕士留学生数(人)',
            '学历博士留学生数(人)',
            '学历留学生总数(人)',
            '学生总人数(人)'
        ];
        
        const summaryData = [summaryHeaders];
        
        // 为每条测算记录生成一行数据
        results.forEach(item => {
            const result = item.result;
            const studentData = item.studentData;
            const areaTypes = item.areaTypes || [];
            const calculationData = item.calculationData || {};
            const baseline = calculationData.baseline || {};
            
            // 调试：检查result中的特殊补助数据
            console.log('测算结果中的特殊补助数据:', {
                特殊补助总面积: result['特殊补助总面积'],
                特殊补助项目数: result['特殊补助项目数'],
                特殊补助明细: result['特殊补助明细']
            });
            
            // 根据用户选择的areaTypes分别计算现状和拟建成
            let teachingCurrent = 0, officeCurrent = 0, livingCurrent = 0;
            let dormitoryCurrent = 0, logisticsCurrent = 0;
            let teachingPlanned = 0, officePlanned = 0, livingPlanned = 0;
            let dormitoryPlanned = 0, logisticsPlanned = 0;
            
            // 现状：如果选了"现状"
            if (areaTypes.includes('现状')) {
                teachingCurrent = parseFloat(baseline.current_teaching_area || 0);
                officeCurrent = parseFloat(baseline.current_office_area || 0);
                dormitoryCurrent = parseFloat(baseline.current_dormitory_area || 0);
                livingCurrent = parseFloat(baseline.current_living_total_area || 0);
                logisticsCurrent = parseFloat(baseline.current_logistics_area || 0);
            }
            
            // 拟建成：如果选了"拟建成_前期"或"拟建成_在建(含竣工)"
            if (areaTypes.includes('拟建成_前期')) {
                teachingPlanned += parseFloat(baseline.planned_teaching_area || 0);
                officePlanned += parseFloat(baseline.planned_office_area || 0);
                dormitoryPlanned += parseFloat(baseline.planned_dormitory_area || 0);
                livingPlanned += parseFloat(baseline.planned_living_total_area || 0);
                logisticsPlanned += parseFloat(baseline.planned_logistics_area || 0);
            }
            if (areaTypes.includes('拟建成_在建(含竣工)')) {
                teachingPlanned += parseFloat(baseline.under_construction_teaching_area || 0);
                officePlanned += parseFloat(baseline.under_construction_office_area || 0);
                dormitoryPlanned += parseFloat(baseline.under_construction_dormitory_area || 0);
                livingPlanned += parseFloat(baseline.under_construction_living_total_area || 0);
                logisticsPlanned += parseFloat(baseline.under_construction_logistics_area || 0);
            }
            
            // 计算其他生活用房（生活用房总面积 - 学生宿舍）
            const otherLivingCurrent = livingCurrent - dormitoryCurrent;
            const otherLivingPlanned = livingPlanned - dormitoryPlanned;
            
            // 现状总计
            const totalCurrent = teachingCurrent + officeCurrent + livingCurrent + logisticsCurrent;
            // 拟建成总计
            const totalPlanned = teachingPlanned + officePlanned + livingPlanned + logisticsPlanned;
            
            // 汇总面积（现状 + 拟建成）
            const teachingTotal = teachingCurrent + teachingPlanned;
            const officeTotal = officeCurrent + officePlanned;
            const livingTotal = livingCurrent + livingPlanned;
            const dormitoryTotal = dormitoryCurrent + dormitoryPlanned;
            const otherLivingTotal = otherLivingCurrent + otherLivingPlanned;
            const logisticsTotal = logisticsCurrent + logisticsPlanned;
            const totalSum = teachingTotal + officeTotal + livingTotal + logisticsTotal;
            
            // 测算面积
            const teachingRequired = result['总应配教学及辅助用房(A)'] || 0;
            const officeRequired = result['总应配办公用房(B)'] || 0;
            const dormitoryRequired = result['总应配学生宿舍(C1)'] || 0;
            const otherLivingRequired = result['总应配其他生活用房(C2)'] || 0;
            const livingRequired = dormitoryRequired + otherLivingRequired;
            const logisticsRequired = result['总应配后勤辅助用房(D)'] || 0;
            const totalRequired = teachingRequired + officeRequired + livingRequired + logisticsRequired;
            
            // 缺额
            const teachingGap = result['教学及辅助用房缺口(A)'] || 0;
            const officeGap = result['办公用房缺口(B)'] || 0;
            const dormitoryGap = result['学生宿舍缺口(C1)'] || 0;
            const otherLivingGap = result['其他生活用房缺口(C2)'] || 0;
            const livingGap = dormitoryGap + otherLivingGap;
            const logisticsGap = result['后勤辅助用房缺口(D)'] || 0;
            const totalGapWithoutSpecial = result['建筑面积总缺口（不含特殊补助）'] || 0;
            const totalGapWithSpecial = result['建筑面积总缺口（含特殊补助）'] || 0;
            
            // 特殊补助
            const specialSubsidyArea = result['特殊补助总面积'] || 0;
            const specialSubsidyCount = result['特殊补助项目数'] || 0;
            
            // 学生数
            const specialist = studentData.full_time_specialist || 0;
            const undergraduate = studentData.full_time_undergraduate || 0;
            const master = studentData.full_time_master || 0;
            const doctor = studentData.full_time_doctor || 0;
            const fullTimeTotal = specialist + undergraduate + master + doctor;
            
            const intlUndergrad = studentData.international_undergraduate || 0;
            const intlMaster = studentData.international_master || 0;
            const intlDoctor = studentData.international_doctor || 0;
            const intlTotal = intlUndergrad + intlMaster + intlDoctor;
            
            const studentTotal = fullTimeTotal + intlTotal;
            
            const row = [
                schoolName,
                cleanSchoolType(schoolType),
                item.year,
                item.criteria,
                areaTypes.join('、'),
                displayNameToUse,
                // 现状面积
                teachingCurrent.toFixed(2),
                officeCurrent.toFixed(2),
                livingCurrent.toFixed(2),
                dormitoryCurrent.toFixed(2),
                otherLivingCurrent.toFixed(2),
                logisticsCurrent.toFixed(2),
                totalCurrent.toFixed(2),
                // 拟建成面积
                teachingPlanned.toFixed(2),
                officePlanned.toFixed(2),
                livingPlanned.toFixed(2),
                dormitoryPlanned.toFixed(2),
                otherLivingPlanned.toFixed(2),
                logisticsPlanned.toFixed(2),
                totalPlanned.toFixed(2),
                // 汇总面积
                teachingTotal.toFixed(2),
                officeTotal.toFixed(2),
                livingTotal.toFixed(2),
                dormitoryTotal.toFixed(2),
                otherLivingTotal.toFixed(2),
                logisticsTotal.toFixed(2),
                totalSum.toFixed(2),
                // 测算面积
                teachingRequired.toFixed(2),
                officeRequired.toFixed(2),
                livingRequired.toFixed(2),
                dormitoryRequired.toFixed(2),
                otherLivingRequired.toFixed(2),
                logisticsRequired.toFixed(2),
                totalRequired.toFixed(2),
                // 缺额
                teachingGap.toFixed(2),
                officeGap.toFixed(2),
                livingGap.toFixed(2),
                dormitoryGap.toFixed(2),
                otherLivingGap.toFixed(2),
                logisticsGap.toFixed(2),
                totalGapWithoutSpecial.toFixed(2),
                totalGapWithSpecial.toFixed(2),
                // 特殊补助
                specialSubsidyCount,
                specialSubsidyArea.toFixed(2),
                // 学生数
                specialist,
                undergraduate,
                master,
                doctor,
                fullTimeTotal,
                intlUndergrad,
                intlMaster,
                intlDoctor,
                intlTotal,
                studentTotal
            ];
            
            summaryData.push(row);
        });
        
        // 创建汇总工作表
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        
        // 设置列宽
        const colWidths = summaryHeaders.map(() => ({ wch: 20 }));
        summaryWs['!cols'] = colWidths;
        
        // 生成独立的汇总Excel文件
        const summaryWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(summaryWb, summaryWs, '测算汇总');
        
        const summaryFileName = `${schoolName}_测算汇总.xlsx`;
        const summaryFilePath = path.join(outputDir, summaryFileName);
        XLSX.writeFile(summaryWb, summaryFilePath);
        generatedFiles.push({ path: summaryFilePath, name: summaryFileName });
        
        console.log('生成测算汇总文件:', summaryFileName);
        
        // 创建ZIP压缩包
        const zipFileName = `${schoolName}_测算结果.zip`;
        
        console.log('开始创建ZIP压缩包...', {
            zipFileName,
            filesCount: generatedFiles.length
        });
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(zipFileName)}`);
        
        // 创建archiver实例
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        // 监听错误
        archive.on('error', (err) => {
            console.error('ZIP压缩失败:', err);
            throw err;
        });
        
        // 监听结束
        archive.on('end', () => {
            console.log('ZIP压缩包生成完成');
            
            // 删除所有临时文件
            generatedFiles.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('删除临时文件失败:', file.name, err);
                });
            });
        });
        
        // 将压缩流通过管道传输到响应
        archive.pipe(res);
        
        // 将所有生成的Excel文件添加到压缩包
        generatedFiles.forEach(file => {
            archive.file(file.path, { name: file.name });
        });
        
        // 完成压缩
        await archive.finalize();
        
        console.log('ZIP压缩包已发送给客户端');
        
    } catch (error) {
        console.error('生成批量测算结果失败:', error);
        res.status(500).json({ error: '生成批量测算结果失败: ' + error.message });
    }
}

/**
 * 批量下载（数据管理页面）
 */
async function batchDownload(req, res) {
    try {
        const { year, school, user, calculationCriteria } = req.body;
        const userRole = req.session.user.role;
        const username = req.session.user.username;
        const userSchoolName = req.session.user.school_name;

        let userFilter = user && user !== 'all' ? user : null;
        let schoolName = school && school !== 'all' ? school : null;
        let criteriaFilter = calculationCriteria && calculationCriteria !== 'all' ? calculationCriteria : null;

        // 获取筛选条件下的所有记录
        const yearFilter = year && year !== 'all' ? parseInt(year) : null;
        let allRecords = await dataService.getAllSchoolRecords(yearFilter, schoolName, userRole, username, userSchoolName, userFilter, criteriaFilter);

        if (allRecords.length === 0) {
            return res.status(400).json({ error: '没有找到符合条件的数据' });
        }

        console.log(`批量下载：共找到 ${allRecords.length} 条记录`);

        // 按学校分组
        const schoolGroups = {};
        allRecords.forEach(record => {
            const school = record.school_name || '未知学校';
            if (!schoolGroups[school]) {
                schoolGroups[school] = [];
            }
            schoolGroups[school].push(record);
        });

        console.log(`批量下载：共 ${Object.keys(schoolGroups).length} 个学校`);

        const outputDir = path.join(__dirname, '..', 'output');
        
        // 创建临时目录
        const timestamp = Date.now();
        const tempDir = path.join(outputDir, `batch_${timestamp}`);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 为每个学校创建文件夹并生成文件
        for (const [schoolName, records] of Object.entries(schoolGroups)) {
            const schoolDir = path.join(tempDir, schoolName);
            if (!fs.existsSync(schoolDir)) {
                fs.mkdirSync(schoolDir, { recursive: true });
            }

            // 为每条记录生成测算结果表
            for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
                const record = records[recordIndex];
                const recordDate = record.created_at ? new Date(record.created_at) : new Date();
                const timeStr = recordDate.getFullYear().toString() + 
                               (recordDate.getMonth() + 1).toString().padStart(2, '0') + 
                               recordDate.getDate().toString().padStart(2, '0') + 
                               recordDate.getHours().toString().padStart(2, '0') + 
                               recordDate.getMinutes().toString().padStart(2, '0') + 
                               recordDate.getSeconds().toString().padStart(2, '0');
                
                const recordFileName = `${schoolName}_${record.year}年_${timeStr}_${recordIndex + 1}_测算结果.xlsx`;
                const recordFilePath = path.join(schoolDir, recordFileName);

                // 创建单条记录的Excel
                const wb = XLSX.utils.book_new();
                const formattedSheet = generateFormattedResultSheet(record);
                XLSX.utils.book_append_sheet(wb, formattedSheet, "建筑规模测算结果");
                XLSX.writeFile(wb, recordFilePath);
            }

            // 生成该学校的测算汇总表
            const summaryFileName = `${schoolName}_测算汇总表.xlsx`;
            const summaryFilePath = path.join(schoolDir, summaryFileName);
            const summaryWb = XLSX.utils.book_new();
            
            const mainData = generateWideTableSheet(records);
            const mainSheet = XLSX.utils.json_to_sheet(mainData);
            XLSX.utils.book_append_sheet(summaryWb, mainSheet, "测算汇总");
            
            XLSX.writeFile(summaryWb, summaryFilePath);
            
            console.log(`${schoolName} 文件夹已创建，包含 ${records.length} 条记录`);
        }

        // 生成所有记录的测算汇总表
        const allSummaryFileName = '批量导出测算汇总表.xlsx';
        const allSummaryFilePath = path.join(tempDir, allSummaryFileName);
        const allSummaryWb = XLSX.utils.book_new();
        
        const allMainData = generateWideTableSheet(allRecords);
        const allMainSheet = XLSX.utils.json_to_sheet(allMainData);
        XLSX.utils.book_append_sheet(allSummaryWb, allMainSheet, "测算汇总");
        
        XLSX.writeFile(allSummaryWb, allSummaryFilePath);

        // 打包成zip
        const finalZipFileName = `批量导出.zip`;
        const finalZipPath = path.join(outputDir, finalZipFileName);
        
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(finalZipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`批量导出.zip 已创建，大小: ${archive.pointer()} bytes`);
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            
            // 添加所有学校的文件夹
            for (const schoolName of Object.keys(schoolGroups)) {
                const schoolDir = path.join(tempDir, schoolName);
                archive.directory(schoolDir, schoolName);
            }
            
            // 添加总汇总表
            archive.file(allSummaryFilePath, { name: allSummaryFileName });
            
            archive.finalize();
        });

        // 清理临时目录
        fs.rmSync(tempDir, { recursive: true, force: true });

        const downloadUrl = `/download/${finalZipFileName}`;
        
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            fileName: finalZipFileName,
            recordCount: allRecords.length,
            schoolCount: Object.keys(schoolGroups).length,
            message: `成功打包 ${Object.keys(schoolGroups).length} 个学校的 ${allRecords.length} 条记录`
        });
        
    } catch (error) {
        console.error('批量下载失败:', error);
        res.status(500).json({ error: '批量下载失败: ' + error.message });
    }
}

/**
 * 下载历史记录
 */
async function downloadRecord(req, res) {
    try {
        const { id } = req.params;
        
        const recordData = await dataService.getSchoolRecordById(parseInt(id));
        
        if (!recordData) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }

        console.log('下载记录ID:', id);
        
        const schoolName = recordData.school_name || '未知学校';
        const schoolType = recordData.school_type || '未知';
        const year = recordData.year || new Date().getFullYear();
        const submitterUser = recordData.submitter_real_name || recordData.submitter_username || '未知用户';
        const criteria = recordData.population_calculation_scope || '规划学生数';
        
        // 使用generateFormattedResultSheet生成工作表
        const ws = generateFormattedResultSheet(recordData);
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '测算结果');
        
        // 生成文件名
        const recordDate = recordData.created_at ? new Date(recordData.created_at) : new Date();
        const timeStr = recordDate.getFullYear().toString() + 
                       (recordDate.getMonth() + 1).toString().padStart(2, '0') + 
                       recordDate.getDate().toString().padStart(2, '0') + 
                       recordDate.getHours().toString().padStart(2, '0') + 
                       recordDate.getMinutes().toString().padStart(2, '0') + 
                       recordDate.getSeconds().toString().padStart(2, '0');
        
        const fileName = `${schoolName}_${year}_${criteria}_测算结果.xlsx`;
        const outputDir = path.join(__dirname, '..', 'output');
        const filePath = path.join(outputDir, fileName);
        
        // 写入文件
        XLSX.writeFile(wb, filePath);
        
        console.log('生成历史记录下载文件:', fileName);
        
        // 读取文件并转换为base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64 = fileBuffer.toString('base64');
        
        // 清理临时文件
        fs.unlinkSync(filePath);
        
        // 返回base64数据和文件名
        res.json({
            success: true,
            fileName: fileName,
            fileData: base64
        });
        
    } catch (error) {
        console.error('下载记录失败:', error);
        res.status(500).json({ success: false, error: '下载记录失败: ' + error.message });
    }
}

/**
 * 下载文件（通用下载端点）
 */
function downloadFile(req, res) {
    const filename = req.params.filename;
    const outputDir = path.join(__dirname, '..', 'output');
    const filePath = path.join(outputDir, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('下载文件时出错:', err);
                res.status(500).json({ error: '下载文件时出错' });
            } else {
                // 下载成功后，延迟10分钟删除文件
                setTimeout(() => {
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`已删除下载完成的文件: ${filename}`);
                        }
                    } catch (deleteError) {
                        console.error(`删除已下载文件失败 ${filename}:`, deleteError.message);
                    }
                }, 10 * 60 * 1000); // 10分钟后删除
            }
        });
    } else {
        res.status(404).json({ error: '文件不存在' });
    }
}

module.exports = {
    onlineDownload,
    downloadCalculationResults,
    batchDownload,
    downloadRecord,
    downloadFile
};
