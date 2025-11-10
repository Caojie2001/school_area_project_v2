/**
 * Excel 生成工具模块
 * 提供格式化的 Excel 测算结果表格生成功能
 */

const XLSX = require('xlsx');
const { formatAreaToTwoDecimals } = require('./helpers');

/**
 * 生成格式化的测算结果 Excel 工作表
 * @param {Object} school - 学校测算数据对象
 * @returns {Object} XLSX 工作表对象
 */
function generateFormattedResultSheet(school) {
    const toNumber = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const buildAreaTypesText = () => {
        const flags = [];
        if (school.include_current_area) flags.push('现状');
        if (school.include_preliminary_area) flags.push('拟建成_前期');
        if (school.include_under_construction_area) flags.push('拟建成_在建(含竣工)');
        if (school.include_special_subsidy) flags.push('特殊补助');
        return flags.length > 0 ? flags.join('、') : '未选择';
    };

    // 解析特殊补助数据
    let specialSubsidies = [];
    let specialSubsidyTotalArea = 0;
    
    try {
        if (school.special_subsidies) {
            specialSubsidies = JSON.parse(school.special_subsidies);
            if (Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                specialSubsidyTotalArea = specialSubsidies.reduce((sum, item) => {
                    const area = item['补助面积（m²）'] ?? item['特殊补助建筑面积(m²)'] ?? item.area;
                    return sum + toNumber(area);
                }, 0);
            }
        }
    } catch (e) {
        console.warn('解析特殊补助数据失败:', e);
    }

    if (specialSubsidyTotalArea === 0) {
        specialSubsidyTotalArea = toNumber(school.special_subsidy_total);
    }

    // 汇总面积（根据选中的类型计算）
    const includesCurrent = school.include_current_area ? true : false;
    const includesPreliminary = school.include_preliminary_area ? true : false;
    const includesUnderConstruction = school.include_under_construction_area ? true : false;
    
    // 调试日志
    console.log('🔍 excelGenerator - 学校:', school.school_name);
    console.log('  选中类型:', { includesCurrent, includesPreliminary, includesUnderConstruction });
    console.log('  数据库值 - 教学:', {
        current: school.teaching_area_current,
        preliminary: school.teaching_area_preliminary,
        under_construction: school.teaching_area_under_construction
    });
    
    const teachingTotal = 
        (includesCurrent ? toNumber(school.teaching_area_current) : 0) +
        (includesPreliminary ? toNumber(school.teaching_area_preliminary) : 0) +
        (includesUnderConstruction ? toNumber(school.teaching_area_under_construction) : 0);
    
    const officeTotal = 
        (includesCurrent ? toNumber(school.office_area_current) : 0) +
        (includesPreliminary ? toNumber(school.office_area_preliminary) : 0) +
        (includesUnderConstruction ? toNumber(school.office_area_under_construction) : 0);
    
    const livingTotal = 
        (includesCurrent ? toNumber(school.total_living_area_current) : 0) +
        (includesPreliminary ? toNumber(school.total_living_area_preliminary) : 0) +
        (includesUnderConstruction ? toNumber(school.total_living_area_under_construction) : 0);
    
    const dormitoryTotal = 
        (includesCurrent ? toNumber(school.dormitory_area_current) : 0) +
        (includesPreliminary ? toNumber(school.dormitory_area_preliminary) : 0) +
        (includesUnderConstruction ? toNumber(school.dormitory_area_under_construction) : 0);
    
    const otherLivingTotal = 
        (includesCurrent ? toNumber(school.other_living_area_current) : 0) +
        (includesPreliminary ? toNumber(school.other_living_area_preliminary) : 0) +
        (includesUnderConstruction ? toNumber(school.other_living_area_under_construction) : 0);
    
    const logisticsTotal = 
        (includesCurrent ? toNumber(school.logistics_area_current) : 0) +
        (includesPreliminary ? toNumber(school.logistics_area_preliminary) : 0) +
        (includesUnderConstruction ? toNumber(school.logistics_area_under_construction) : 0);

    // 应配面积
    const teachingRequired = toNumber(school.teaching_area_required);
    const officeRequired = toNumber(school.office_area_required);
    const livingRequired = toNumber(school.total_living_area_required);
    const dormitoryRequired = toNumber(school.dormitory_area_required);
    const otherLivingRequired = toNumber(school.other_living_area_required);
    const logisticsRequired = toNumber(school.logistics_area_required);

    // 缺额
    const teachingAreaGap = toNumber(school.teaching_area_gap);
    const officeAreaGap = toNumber(school.office_area_gap);
    const dormitoryAreaGap = toNumber(school.dormitory_area_gap);
    const otherLivingAreaGap = toNumber(school.other_living_area_gap);
    const totalLivingAreaGap = toNumber(school.total_living_area_gap) || (dormitoryAreaGap + otherLivingAreaGap);
    const logisticsAreaGap = toNumber(school.logistics_area_gap);

    const subtotalTotal = teachingTotal + officeTotal + livingTotal + logisticsTotal;
    const subtotalRequired = teachingRequired + officeRequired + livingRequired + logisticsRequired;

    const totalAreaGapWithoutSubsidy = toNumber(school.total_area_gap_without_subsidy) || (teachingAreaGap + officeAreaGap + totalLivingAreaGap + logisticsAreaGap);
    const totalAreaGapWithSubsidy = toNumber(school.total_area_gap_with_subsidy) || (totalAreaGapWithoutSubsidy + specialSubsidyTotalArea);

    // 学生数据
    const fullTimeSpecialist = parseInt(school.full_time_specialist, 10) || 0;
    const fullTimeUndergraduate = parseInt(school.full_time_undergraduate, 10) || 0;
    const fullTimeMaster = parseInt(school.full_time_master, 10) || 0;
    const fullTimeDoctor = parseInt(school.full_time_doctor, 10) || 0;
    const internationalUndergraduate = parseInt(school.international_undergraduate, 10) || 0;
    const internationalMaster = parseInt(school.international_master, 10) || 0;
    const internationalDoctor = parseInt(school.international_doctor, 10) || 0;

    // 获取院校类别，清理可能的前缀
    let schoolType = school.school_type || '';
    if (schoolType.includes('院校类型：')) {
        schoolType = schoolType.replace('院校类型：', '');
    }
    if (schoolType.includes('院校类别：')) {
        schoolType = schoolType.replace('院校类别：', '');
    }

    // 获取提交用户信息
    const submitterUser = school.submitter_real_name || school.submitter_username || '未知用户';
    const calcYear = parseInt(school.year) || new Date().getFullYear();
    
    // 获取测算口径
    const criteria = school.population_calculation_scope || '未知口径';
    
    // 获取计入测算的建筑面积类型（从数据库无法获取，默认值）
    const areaTypeText = buildAreaTypesText();
    
    // 缺口计算方式（默认值）
    const gapCalculationMethod = '测算面积-建筑面积>0, 表示有缺口';

    // 创建与data-entry-new一致的表格数据
    const data = [
        ['高校测算'],
        ['测算项目=' + gapCalculationMethod],
        ['', '', '', `测算时间：${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}`],
        ['规划年度', calcYear, '测算用户', submitterUser],
        [`单位/学校(机构)名称(章)`, school.school_name || '', '院校类型', schoolType],
        ['数据来源_建筑面积(m)_现状', '高校基础表', '计入测算的建筑面积', areaTypeText],
        [''],
        ['规划学生数'],
        ['专科全日制学生数(人)', fullTimeSpecialist, '本科全日制学生数(人)', fullTimeUndergraduate],
        ['硕士全日制学生数(人)', fullTimeMaster, '博士全日制学生数(人)', fullTimeDoctor],
        ['学历本科留学生(人)', internationalUndergraduate, '学历硕士留学生(人)', internationalMaster],
        ['学历博士留学生(人)', internationalDoctor, '测算口径_合并', criteria],
        [''],
        ['测算结果'],
        ['', '建筑面积(m²)_汇总', '建筑面积(m²)_测算', '建筑面积(m²)_缺额'],
        ['用房类型', 'A', 'B', 'B-A'],
        ['教学及辅助用房', formatAreaToTwoDecimals(teachingTotal), formatAreaToTwoDecimals(teachingRequired), formatAreaToTwoDecimals(teachingAreaGap)],
        ['办公用房', formatAreaToTwoDecimals(officeTotal), formatAreaToTwoDecimals(officeRequired), formatAreaToTwoDecimals(officeAreaGap)],
        ['生活配套用房', formatAreaToTwoDecimals(livingTotal), formatAreaToTwoDecimals(livingRequired), formatAreaToTwoDecimals(totalLivingAreaGap)],
        ['其中:学生宿舍', formatAreaToTwoDecimals(dormitoryTotal), formatAreaToTwoDecimals(dormitoryRequired), formatAreaToTwoDecimals(dormitoryAreaGap)],
        ['其中:其他生活用房', formatAreaToTwoDecimals(otherLivingTotal), formatAreaToTwoDecimals(otherLivingRequired), formatAreaToTwoDecimals(otherLivingAreaGap)],
        ['后勤辅助用房', formatAreaToTwoDecimals(logisticsTotal), formatAreaToTwoDecimals(logisticsRequired), formatAreaToTwoDecimals(logisticsAreaGap)],
        ['小计', formatAreaToTwoDecimals(subtotalTotal), formatAreaToTwoDecimals(subtotalRequired), formatAreaToTwoDecimals(totalAreaGapWithoutSubsidy)],
        [''],
        ['建筑总面积(m²)_缺额_不含特殊补助', '', 'C', formatAreaToTwoDecimals(totalAreaGapWithoutSubsidy)],
        ['特殊补助建筑面积(m²)', '', 'D', formatAreaToTwoDecimals(specialSubsidyTotalArea)],
        ['建筑总面积(m²)_缺额_含特殊补助', '', 'C+D', formatAreaToTwoDecimals(totalAreaGapWithSubsidy)],
        []
    ];
    
    // 添加特殊补助明细
    if (specialSubsidies.length > 0) {
        data.push(['特殊用房补助明细']);
        data.push(['特殊补助名称', '', '特殊补助建筑面积(m²)', '']);
        specialSubsidies.forEach(subsidy => {
            const subsidyName = subsidy['特殊用房补助名称'] || subsidy['补助项目'] || subsidy.name || '';
            const subsidyArea = subsidy['补助面积（m²）'] ?? subsidy['特殊补助建筑面积(m²)'] ?? subsidy.area;
            data.push([subsidyName, '', formatAreaToTwoDecimals(toNumber(subsidyArea)), '']);
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
    
    // 第1行：高校测算 (A1:D1)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
    currentRow++;
    
    // 第2行：测算项目 (A2:D2)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
    currentRow++;
    
    // 第3行：测算时间，只合并A3:C3，D3显示时间
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } });
    currentRow++;
    
    currentRow++; // 第4行：规划年度等，不合并
    currentRow++; // 第5行：单位学校等，不合并
    currentRow++; // 第6行：数据来源等，不合并
    
    currentRow++; // 第7行：空行
    
    // 第8行：规划学生数 (A8:D8)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
    currentRow++;
    
    // 跳过学生数据行（4行）
    currentRow += 4;
    
    currentRow++; // 空行
    
    // 测算结果标题 (A?:D?)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
    currentRow++;
    
    currentRow++; // 表头第1行（建筑面积_汇总等）
    currentRow++; // 表头第2行（A B B-A）
    
    // 跳过数据行（7行）
    currentRow += 7;
    
    currentRow++; // 空行
    
    // 最后三行的第1、2列合并
    // 建筑总面积_缺额_不含特殊补助 (A?:B?)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
    currentRow++;
    
    // 特殊补助建筑面积 (A?:B?)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
    currentRow++;
    
    // 建筑总面积_缺额_含特殊补助 (A?:B?)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
    currentRow++;
    
    currentRow++; // 空行
    
    // 如果有特殊补助明细
    if (specialSubsidies.length > 0) {
        // 特殊用房补助明细标题 (A?:D?)
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
        currentRow++;
        
        // 表头：特殊补助名称(A?:B?), 特殊补助建筑面积(C?:D?)
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
        merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });
        currentRow++;
        
        // 每条补助明细：第1、2列合并，第3、4列合并
        specialSubsidies.forEach(() => {
            merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
            merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });
            currentRow++;
        });
    }
    
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
                if (R === 24 && C > 0) { // 第25行（索引24）的备注内容
                    ws[cellAddress].s.alignment = { 
                        horizontal: 'left', 
                        vertical: 'center',
                        wrapText: true 
                    };
                }
            }
        }
    }
    
    return ws;
}

module.exports = {
    generateFormattedResultSheet
};
