/**
 * 通用工具函数模块
 * 提供格式化、清理、文件管理等辅助功能
 */

const fs = require('fs');
const path = require('path');

// 输出目录配置
const outputDir = path.join(__dirname, '../../output');

/**
 * 格式化面积数值为两位小数
 * @param {number|string|null|undefined} value - 需要格式化的数值
 * @returns {string} 格式化后的字符串，如 "123.45" 或 "0.00"
 */
function formatAreaToTwoDecimals(value) {
    // 处理 null、undefined、空字符串等情况
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    
    // 转换为数字
    const numValue = parseFloat(value);
    
    // 如果转换失败（NaN），返回 0.00
    if (isNaN(numValue)) {
        return '0.00';
    }
    
    // 返回两位小数格式
    return numValue.toFixed(2);
}

/**
 * 清理院校类别字符串中的前缀
 * @param {string} schoolType - 院校类别字符串
 * @returns {string} 清理后的类别字符串
 */
function cleanSchoolType(schoolType) {
    if (!schoolType) return '';
    
    let cleanType = schoolType.toString();
    
    // 移除可能存在的前缀
    if (cleanType.includes('院校类别：')) {
        cleanType = cleanType.replace('院校类别：', '');
    }
    if (cleanType.includes('院校类别: ')) {
        cleanType = cleanType.replace('院校类别: ', '');
    }
    if (cleanType.includes('院校类型：')) {
        cleanType = cleanType.replace('院校类型：', '');
    }
    if (cleanType.includes('院校类型: ')) {
        cleanType = cleanType.replace('院校类型: ', '');
    }
    
    return cleanType.trim();
}

/**
 * 清理过期的临时文件
 * 删除 output 目录中超过 24 小时的文件
 * @returns {number} 删除的文件数量
 */
function cleanupOldFiles() {
    try {
        const files = fs.readdirSync(outputDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时，单位：毫秒
        
        let deletedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(outputDir, file);
            const stats = fs.statSync(filePath);
            
            // 如果文件超过24小时就删除
            if (now - stats.mtime.getTime() > maxAge) {
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`删除过期文件: ${file}`);
                } catch (error) {
                    console.error(`删除文件失败 ${file}:`, error.message);
                }
            }
        });
        
        if (deletedCount > 0) {
            console.log(`清理完成，共删除 ${deletedCount} 个过期文件`);
        }
        
        return deletedCount;
    } catch (error) {
        console.error('清理临时文件时出错:', error.message);
        return 0;
    }
}

/**
 * 启动定时清理任务
 * 立即执行一次，然后每2小时执行一次
 */
function startCleanupSchedule() {
    // 立即执行一次清理
    cleanupOldFiles();
    
    // 设置定时清理：每2小时执行一次
    setInterval(cleanupOldFiles, 2 * 60 * 60 * 1000);
    
    console.log('临时文件清理任务已启动（每2小时执行一次）');
}

module.exports = {
    formatAreaToTwoDecimals,
    cleanSchoolType,
    cleanupOldFiles,
    startCleanupSchedule
};
