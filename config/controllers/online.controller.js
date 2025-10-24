/**
 * 在线计算控制器
 * 处理在线计算、Excel下载和批量下载功能
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const dataService = require('../dataService');
const { calculateBuildingAreaGap } = require('../utils/calculator');
const { formatAreaToTwoDecimals, cleanSchoolType } = require('../utils/helpers');
const { generateFormattedResultSheet } = require('../utils/excelGenerator');

// 输出目录配置
const outputDir = path.join(__dirname, '../../output');

/**
 * 在线计算接口
 * POST /online-calculate
 */
async function onlineCalculate(req, res) {
    try {
        const { schoolData, specialSubsidies } = req.body;
        
        if (!schoolData) {
            return res.status(400).json({ error: '缺少学校数据' });
        }
        
        // 计算建筑面积缺口
        const analysisResult = await calculateBuildingAreaGap(schoolData, specialSubsidies || []);
        
        // 根据学校名称从数据库获取院校类型（已在calculateBuildingAreaGap中获取）
        const schoolType = analysisResult['学校类型'] || '综合院校';
        
        // 添加处理时间和来源信息
        const processedSchoolData = {
            ...schoolData,
            ...analysisResult,
            '来源方式': '在线填写',
            '处理时间': new Date().toLocaleString('zh-CN'),
            '特殊补助记录数': specialSubsidies ? specialSubsidies.length : 0,
            '院校类别': schoolType,  // 添加院校类型信息
            // 确保包含显示所需的字段
            '现有其他生活用房面积': analysisResult['现有其他生活用房面积（计算）'] || 0,
            '年份': schoolData['年份'] || new Date().getFullYear()
        };
        
        // 保存数据到数据库
        try {
            console.log('开始保存数据到数据库...');
            const submitterUsername = req.session?.user?.username || 'anonymous';
            const submitterRealName = req.session?.user?.real_name || submitterUsername;
            const schoolInfoId = await dataService.saveSchoolInfo(schoolData, specialSubsidies, analysisResult, submitterUsername);
            console.log('数据保存成功，学校ID:', schoolInfoId);
            
            // 在响应中添加数据库保存信息
            processedSchoolData['数据库记录ID'] = schoolInfoId;
            processedSchoolData['填报单位'] = submitterRealName || submitterUsername;
        } catch (dbError) {
            console.error('数据库保存失败:', dbError);
            // 数据库保存失败不影响计算结果返回，只记录错误
            processedSchoolData['数据库状态'] = '保存失败: ' + dbError.message;
        }
        
        res.json({
            success: true,
            schoolData: processedSchoolData,
            analysisResult: analysisResult,
            message: '在线计算完成'
        });
        
    } catch (error) {
        console.error('在线计算时出错:', error);
        res.status(500).json({ error: '在线计算时出错: ' + error.message });
    }
}

/**
 * 在线计算结果下载
 * POST /online-download
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
            { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 25 }
        ];
        
        // 合并单元格
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
            { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },
            { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } },
            { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } },
            { s: { r: 21, c: 0 }, e: { r: 21, c: 2 } },
            { s: { r: 22, c: 0 }, e: { r: 22, c: 2 } },
            { s: { r: 23, c: 0 }, e: { r: 23, c: 2 } },
            { s: { r: 24, c: 1 }, e: { r: 24, c: 3 } }
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
                
                ws[cellAddress].s.border = borderStyle;
                ws[cellAddress].s.alignment = { 
                    horizontal: 'center', 
                    vertical: 'center',
                    wrapText: true 
                };
                
                // 特殊行的样式设置
                if (R === 0) {
                    ws[cellAddress].s.font = { bold: true, size: 16, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'E6E6FA' } };
                } else if (R === 1) {
                    ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'F0F8FF' } };
                } else if (R === 7 || R === 13) {
                    ws[cellAddress].s.font = { bold: true, size: 12, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'F0F8FF' } };
                } else if (R === 14) {
                    ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } };
                } else if (R >= 15 && R <= 20) {
                    ws[cellAddress].s.font = { size: 10 };
                    if (R % 2 === 0) {
                        ws[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'FAFAFA' } };
                    }
                } else if (R >= 21) {
                    ws[cellAddress].s.font = { bold: true, size: 11, color: { rgb: '000000' } };
                    ws[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'FFE4E1' } };
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
            subsidyWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
            
            const subsidyRange = XLSX.utils.decode_range(subsidyWs['!ref']);
            for (let R = subsidyRange.s.r; R <= subsidyRange.e.r; ++R) {
                for (let C = subsidyRange.s.c; C <= subsidyRange.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!subsidyWs[cellAddress]) subsidyWs[cellAddress] = { t: 's', v: '' };
                    if (!subsidyWs[cellAddress].s) subsidyWs[cellAddress].s = {};
                    
                    subsidyWs[cellAddress].s.border = borderStyle;
                    subsidyWs[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                    
                    if (R === 0) {
                        subsidyWs[cellAddress].s.font = { bold: true, size: 14 };
                        subsidyWs[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'E6E6FA' } };
                    } else if (R === 2) {
                        subsidyWs[cellAddress].s.font = { bold: true, size: 11 };
                        subsidyWs[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } };
                    } else if (R > 2) {
                        subsidyWs[cellAddress].s.font = { size: 10 };
                        if (R % 2 === 1) {
                            subsidyWs[cellAddress].s.fill = { patternType: 'solid', fgColor: { rgb: 'FAFAFA' } };
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
 * 批量下载测算结果
 * POST /api/download-calculation-results
 * 支持单个Excel下载或多个Excel打包ZIP下载
 */
async function downloadCalculationResults(req, res) {
    try {
        const { schoolName, schoolType, displayName, userName, calculationMethod, results } = req.body;
        
        if (!schoolName || !results || results.length === 0) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const gapCalculationMethod = calculationMethod || '测算面积-建筑面积>0, 表示有缺口';
        
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
        
        const generatedFiles = [];
        
        // 为每个测算结果生成独立的Excel文件（代码太长，使用excelGenerator）
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            const result = item.result;
            const studentData = item.studentData;
            const calculationData = item.calculationData;
            
            const planYear = item.year || new Date().getFullYear();
            const criteria = item.criteria || '未知口径';
            
            // 构建完整的school对象用于生成Excel
            const schoolDataForExcel = {
                school_name: schoolName,
                school_type: schoolType,
                year: planYear,
                population_calculation_scope: criteria,
                submitter_real_name: displayNameToUse,
                submitter_username: displayNameToUse,
                full_time_specialist: studentData.full_time_specialist || 0,
                full_time_undergraduate: studentData.full_time_undergraduate || 0,
                full_time_master: studentData.full_time_master || 0,
                full_time_doctor: studentData.full_time_doctor || 0,
                international_undergraduate: studentData.international_undergraduate || 0,
                international_master: studentData.international_master || 0,
                international_doctor: studentData.international_doctor || 0,
                // 面积数据
                teaching_area_current: calculationData.currentAreas?.teaching || 0,
                office_area_current: calculationData.currentAreas?.office || 0,
                total_living_area_current: calculationData.currentAreas?.living || 0,
                dormitory_area_current: calculationData.currentAreas?.dormitory || 0,
                other_living_area_current: calculationData.currentAreas?.otherLiving || 0,
                logistics_area_current: calculationData.currentAreas?.logistics || 0,
                teaching_area_required: result['总应配教学及辅助用房(A)'] || 0,
                office_area_required: result['总应配办公用房(B)'] || 0,
                total_living_area_required: (result['总应配学生宿舍(C1)'] || 0) + (result['总应配其他生活用房(C2)'] || 0),
                dormitory_area_required: result['总应配学生宿舍(C1)'] || 0,
                other_living_area_required: result['总应配其他生活用房(C2)'] || 0,
                logistics_area_required: result['总应配后勤辅助用房(D)'] || 0,
                teaching_area_gap: result['教学及辅助用房缺口(A)'] || 0,
                office_area_gap: result['办公用房缺口(B)'] || 0,
                dormitory_area_gap: result['学生宿舍缺口(C1)'] || 0,
                other_living_area_gap: result['其他生活用房缺口(C2)'] || 0,
                total_living_area_gap: (result['学生宿舍缺口(C1)'] || 0) + (result['其他生活用房缺口(C2)'] || 0),
                logistics_area_gap: result['后勤辅助用房缺口(D)'] || 0,
                total_area_gap_without_subsidy: result['建筑面积总缺口（不含特殊补助）'] || 0,
                total_area_gap_with_subsidy: result['建筑面积总缺口（含特殊补助）'] || 0,
                special_subsidy_total: result['特殊补助总面积'] || 0,
                special_subsidies: JSON.stringify(result['特殊补助明细'] || []),
                include_current_area: item.areaTypes?.includes('现状'),
                include_preliminary_area: item.areaTypes?.includes('拟建成_前期'),
                include_under_construction_area: item.areaTypes?.includes('拟建成_在建(含竣工)'),
                include_special_subsidy: item.areaTypes?.includes('特殊补助')
            };
            
            // 使用generateFormattedResultSheet生成工作表
            const ws = generateFormattedResultSheet(schoolDataForExcel);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '测算结果');
            
            const resultFileName = `${schoolName}_${planYear}_${criteria}_${i + 1}_测算结果.xlsx`;
            const resultFilePath = path.join(outputDir, resultFileName);
            
            XLSX.writeFile(wb, resultFilePath);
            generatedFiles.push({ path: resultFilePath, name: resultFileName });
            
            console.log(`生成测算结果文件 ${i + 1}/${results.length}:`, resultFileName);
        }
        
        // 生成汇总Excel（简化版，保留核心数据）
        const summaryHeaders = [
            '单位/学校名称', '院校类别', '测算年份', '测算口径', '计入测算的建筑面积', '测算用户',
            '教学及辅助用房(m²)_现状', '办公用房(m²)_现状', '生活用房(m²)_现状', '学生宿舍(m²)_现状',
            '其他生活用房(m²)_现状', '后勤辅助用房(m²)_现状', '建筑总面积(m²)_现状',
            '教学及辅助用房(m²)_测算', '办公用房(m²)_测算', '生活用房(m²)_测算', '学生宿舍(m²)_测算',
            '其他生活用房(m²)_测算', '后勤辅助用房(m²)_测算', '建筑总面积(m²)_测算',
            '教学及辅助用房(m²)_缺额', '办公用房(m²)_缺额', '生活用房(m²)_缺额', '学生宿舍(m²)_缺额',
            '其他生活用房(m²)_缺额', '后勤辅助用房(m²)_缺额',
            '建筑总面积(m²)_缺额_不含特殊补助', '建筑总面积(m²)_缺额_含特殊补助',
            '特殊补助项目数', '特殊补助面积(m²)',
            '专科生(人)', '本科生(人)', '硕士生(人)', '博士生(人)', '全日制总数(人)',
            '本科留学生(人)', '硕士留学生(人)', '博士留学生(人)', '留学生总数(人)', '学生总人数(人)'
        ];
        
        const summaryData = [summaryHeaders];
        
        results.forEach(item => {
            const result = item.result;
            const studentData = item.studentData;
            const areaTypes = item.areaTypes || [];
            const calculationData = item.calculationData || {};
            const currentAreas = calculationData.currentAreas || {};
            
            const teachingCurrent = currentAreas.teaching || 0;
            const officeCurrent = currentAreas.office || 0;
            const livingCurrent = currentAreas.living || 0;
            const dormitoryCurrent = currentAreas.dormitory || 0;
            const otherLivingCurrent = currentAreas.otherLiving || 0;
            const logisticsCurrent = currentAreas.logistics || 0;
            const totalCurrent = teachingCurrent + officeCurrent + livingCurrent + logisticsCurrent;
            
            const teachingRequired = result['总应配教学及辅助用房(A)'] || 0;
            const officeRequired = result['总应配办公用房(B)'] || 0;
            const dormitoryRequired = result['总应配学生宿舍(C1)'] || 0;
            const otherLivingRequired = result['总应配其他生活用房(C2)'] || 0;
            const livingRequired = dormitoryRequired + otherLivingRequired;
            const logisticsRequired = result['总应配后勤辅助用房(D)'] || 0;
            const totalRequired = teachingRequired + officeRequired + livingRequired + logisticsRequired;
            
            const teachingGap = result['教学及辅助用房缺口(A)'] || 0;
            const officeGap = result['办公用房缺口(B)'] || 0;
            const dormitoryGap = result['学生宿舍缺口(C1)'] || 0;
            const otherLivingGap = result['其他生活用房缺口(C2)'] || 0;
            const livingGap = dormitoryGap + otherLivingGap;
            const logisticsGap = result['后勤辅助用房缺口(D)'] || 0;
            const totalGapWithoutSpecial = result['建筑面积总缺口（不含特殊补助）'] || 0;
            const totalGapWithSpecial = result['建筑面积总缺口（含特殊补助）'] || 0;
            
            const specialSubsidyArea = result['特殊补助总面积'] || 0;
            const specialSubsidyCount = (result['特殊补助明细'] || []).length;
            
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
                schoolName, cleanSchoolType(schoolType), item.year, item.criteria,
                areaTypes.join('、'), displayNameToUse,
                teachingCurrent.toFixed(2), officeCurrent.toFixed(2), livingCurrent.toFixed(2),
                dormitoryCurrent.toFixed(2), otherLivingCurrent.toFixed(2), logisticsCurrent.toFixed(2),
                totalCurrent.toFixed(2),
                teachingRequired.toFixed(2), officeRequired.toFixed(2), livingRequired.toFixed(2),
                dormitoryRequired.toFixed(2), otherLivingRequired.toFixed(2), logisticsRequired.toFixed(2),
                totalRequired.toFixed(2),
                teachingGap.toFixed(2), officeGap.toFixed(2), livingGap.toFixed(2),
                dormitoryGap.toFixed(2), otherLivingGap.toFixed(2), logisticsGap.toFixed(2),
                totalGapWithoutSpecial.toFixed(2), totalGapWithSpecial.toFixed(2),
                specialSubsidyCount, specialSubsidyArea.toFixed(2),
                specialist, undergraduate, master, doctor, fullTimeTotal,
                intlUndergrad, intlMaster, intlDoctor, intlTotal, studentTotal
            ];
            
            summaryData.push(row);
        });
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = summaryHeaders.map(() => ({ wch: 20 }));
        
        const summaryWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(summaryWb, summaryWs, '测算汇总');
        
        const summaryFileName = `${schoolName}_测算汇总.xlsx`;
        const summaryFilePath = path.join(outputDir, summaryFileName);
        XLSX.writeFile(summaryWb, summaryFilePath);
        generatedFiles.push({ path: summaryFilePath, name: summaryFileName });
        
        console.log('生成测算汇总文件:', summaryFileName);
        
        // 如果只有一条测算记录，直接下载单个Excel文件
        if (results.length === 1) {
            console.log('只有一条测算记录，直接下载单个Excel文件');
            
            const singleFile = generatedFiles[0];
            
            // 删除汇总文件
            if (generatedFiles.length > 1) {
                fs.unlink(summaryFilePath, (err) => {
                    if (err) console.error('删除汇总文件失败:', err);
                });
            }
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(singleFile.name)}`);
            
            const fileStream = fs.createReadStream(singleFile.path);
            fileStream.pipe(res);
            
            fileStream.on('end', () => {
                fs.unlink(singleFile.path, (err) => {
                    if (err) console.error('删除临时文件失败:', err);
                });
                console.log('单个Excel文件已发送并清理完成');
            });
            
            return;
        }
        
        // 多条测算记录时，创建ZIP压缩包
        const zipFileName = `${schoolName}测算.zip`;
        const zipFilePath = path.join(outputDir, zipFileName);
        
        console.log('开始创建ZIP压缩包...', { zipFileName, filesCount: generatedFiles.length });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(zipFileName)}`);
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err) => {
            console.error('ZIP压缩失败:', err);
            throw err;
        });
        
        archive.on('end', () => {
            console.log('ZIP压缩包生成完成');
            generatedFiles.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('删除临时文件失败:', file.name, err);
                });
            });
        });
        
        archive.pipe(res);
        
        generatedFiles.forEach(file => {
            archive.file(file.path, { name: file.name });
        });
        
        await archive.finalize();
        
        console.log('ZIP压缩包已发送给客户端');
        
    } catch (error) {
        console.error('生成Excel文件失败:', error);
        res.status(500).json({ error: '生成Excel文件失败: ' + error.message });
    }
}

module.exports = {
    onlineCalculate,
    onlineDownload,
    downloadCalculationResults
};
