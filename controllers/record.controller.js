const path = require('path');
const fs = require('fs');
const { getPool } = require('../config/database');
const dataService = require('../config/dataService');

/**
 * 删除单条学校记录
 */
async function deleteSchoolRecord(req, res) {
    try {
        const recordId = parseInt(req.params.id, 10);

        if (Number.isNaN(recordId)) {
            return res.status(400).json({ error: '无效的记录ID' });
        }

        const record = await dataService.getSchoolRecordById(recordId);

        if (!record) {
            return res.status(404).json({ error: '记录不存在或已被删除' });
        }

        const userRole = req.session.user?.role;
        const currentUsername = req.session.user?.username;

        // 学校用户只能删除自己的记录
        if (userRole === 'school' && record.submitter_username !== currentUsername) {
            return res.status(403).json({ error: '无权删除该记录' });
        }

        await dataService.deleteSchoolRecord(recordId);

        res.json({
            success: true,
            message: '记录删除成功'
        });
    } catch (error) {
        console.error('删除记录失败:', error);
        res.status(500).json({ error: '删除记录失败: ' + error.message });
    }
}

/**
 * 删除学校组合记录（按测算年份-学校名称-测算用户组合删除记录）
 */
async function deleteSchoolCombination(req, res) {
    try {
        const { schoolName, year, submitterUsername } = req.body;
        
        if (!schoolName || !year) {
            return res.status(400).json({ error: '学校名称和测算年份不能为空' });
        }

        // 获取当前用户信息
        const userRole = req.session.user?.role;
        const currentUsername = req.session.user?.username;
        
        console.log('删除学校组合记录:', { schoolName, year, submitterUsername, userRole, currentUsername });
        
        let finalSubmitterUsername = submitterUsername;
        
        // 如果是学校用户，只能删除自己的记录
        if (userRole === 'school') {
            finalSubmitterUsername = currentUsername;
            console.log('学校用户只能删除自己的记录:', finalSubmitterUsername);
        }
        // 管理员和基建中心用户可以删除指定用户的记录
        
        const result = await dataService.deleteSchoolCombination(schoolName, null, year, finalSubmitterUsername);
        
        const userInfo = finalSubmitterUsername ? ` (用户: ${finalSubmitterUsername})` : ' (所有用户)';
        res.json({
            success: true,
            message: `删除成功，共删除 ${result.deletedCount} 条记录${userInfo}`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('删除学校组合记录失败:', error);
        res.status(500).json({ error: '删除学校组合记录失败: ' + error.message });
    }
}

/**
 * 清空所有数据 - 危险操作，仅限管理员
 */
async function clearAllData(req, res) {
    try {
        // 记录操作日志
        console.warn(`[安全警告] 管理员 ${req.session.user.username} (ID: ${req.session.user.id}) 正在执行清空所有数据操作`);
        
        await dataService.clearAllData();
        
        console.log(`[操作完成] 所有数据已被管理员 ${req.session.user.username} 清空`);
        
        res.json({
            success: true,
            message: '所有数据已清空'
        });
    } catch (error) {
        console.error('清空数据失败:', error);
        res.status(500).json({ error: '清空数据失败: ' + error.message });
    }
}

/**
 * 清理临时文件 - 仅限管理员
 */
function cleanupTempFiles(req, res) {
    try {
        console.log(`[文件清理] 管理员 ${req.session.user.username} 正在执行文件清理操作`);
        
        const outputDir = path.join(__dirname, '..', 'output');
        
        // 清理输出文件夹中的旧文件（保留最近的5个文件）
        const outputFiles = fs.readdirSync(outputDir)
            .map(file => ({
                name: file,
                path: path.join(outputDir, file),
                time: fs.statSync(path.join(outputDir, file)).mtime
            }))
            .sort((a, b) => b.time - a.time);
        
        // 删除超过5个的旧文件
        let deletedCount = 0;
        if (outputFiles.length > 5) {
            const filesToDelete = outputFiles.slice(5);
            filesToDelete.forEach(file => {
                fs.unlinkSync(file.path);
                deletedCount++;
            });
        }
        
        res.json({ 
            success: true, 
            message: '临时文件清理完成',
            deletedCount: deletedCount,
            remainingCount: Math.min(outputFiles.length, 5)
        });
    } catch (error) {
        console.error('清理文件时出错:', error);
        res.status(500).json({ error: '清理文件时出错: ' + error.message });
    }
}

module.exports = {
    deleteSchoolRecord,
    deleteSchoolCombination,
    clearAllData,
    cleanupTempFiles
};
