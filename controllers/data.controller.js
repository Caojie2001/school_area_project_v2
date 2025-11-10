/**
 * Data Controller
 * 负责规划学生数和现状面积预设的业务逻辑
 */

const { getPool } = require('../config/database');
const dataService = require('../config/dataService');

// =====================================================
// 现状面积预设管理
// =====================================================

/**
 * 获取所有现状面积预设列表
 * GET /api/current-area-presets
 */
exports.getAllCurrentAreaPresets = async (req, res) => {
    try {
        const records = await dataService.getAllCurrentAreaPresets();
        res.json({ success: true, data: records });
    } catch (error) {
        console.error('获取现状面积预设列表失败:', error);
        res.status(500).json({ success: false, message: '获取现状面积预设列表失败: ' + error.message });
    }
};

/**
 * 根据ID获取现状面积预设
 * GET /api/current-area-presets/:id
 */
exports.getCurrentAreaPresetById = async (req, res) => {
    try {
        const record = await dataService.getCurrentAreaPresetById(req.params.id);
        if (record) {
            res.json({ success: true, data: record });
        } else {
            res.status(404).json({ success: false, message: '记录不存在' });
        }
    } catch (error) {
        console.error('获取现状面积预设记录失败:', error);
        res.status(500).json({ success: false, message: '获取现状面积预设记录失败: ' + error.message });
    }
};

/**
 * 根据学校名称获取现状面积预设（返回该学校的所有数据来源）
 * GET /api/current-area-presets/school/:schoolName
 */
exports.getCurrentAreaPresetBySchool = async (req, res) => {
    try {
        const schoolName = decodeURIComponent(req.params.schoolName);
        const records = await dataService.getCurrentAreaPresetBySchool(schoolName);
        if (records && records.length > 0) {
            res.json({ success: true, data: records });
        } else {
            res.status(404).json({ success: false, message: '该学校没有现状面积预设记录' });
        }
    } catch (error) {
        console.error('获取现状面积预设记录失败:', error);
        res.status(500).json({ success: false, message: '获取现状面积预设记录失败: ' + error.message });
    }
};

/**
 * 根据学校名称和数据来源获取现状面积预设
 * GET /api/current-area-presets/school/:schoolName/source/:dataSource
 */
exports.getCurrentAreaPresetBySchoolAndSource = async (req, res) => {
    try {
        const schoolName = decodeURIComponent(req.params.schoolName);
        const dataSource = decodeURIComponent(req.params.dataSource);
        const record = await dataService.getCurrentAreaPresetBySchoolAndSource(schoolName, dataSource);
        if (record) {
            res.json({ success: true, data: record });
        } else {
            res.status(404).json({ success: false, message: '未找到指定的现状面积预设记录' });
        }
    } catch (error) {
        console.error('获取现状面积预设记录失败:', error);
        res.status(500).json({ success: false, message: '获取现状面积预设记录失败: ' + error.message });
    }
};

/**
 * 创建或更新现状面积预设
 * POST /api/current-area-presets
 */
exports.saveCurrentAreaPreset = async (req, res) => {
    try {
        const result = await dataService.saveCurrentAreaPreset(req.body);
        res.json({ success: true, message: '保存成功', data: result });
    } catch (error) {
        console.error('保存现状面积预设记录失败:', error);
        res.status(500).json({ success: false, message: '保存现状面积预设记录失败: ' + error.message });
    }
};

/**
 * 删除现状面积预设记录
 * DELETE /api/current-area-presets/:id
 */
exports.deleteCurrentAreaPreset = async (req, res) => {
    try {
        await dataService.deleteCurrentAreaPreset(req.params.id);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除现状面积预设记录失败:', error);
        res.status(500).json({ success: false, message: '删除现状面积预设记录失败: ' + error.message });
    }
};

// =====================================================
// 规划学生数管理
// =====================================================

/**
 * 获取规划学生数列表（支持按学校、年份、测算口径筛选）
 * GET /api/planned-students
 */
exports.getPlannedStudents = async (req, res) => {
    try {
        const { schoolName, year, calculation_criteria } = req.query;
        const currentUser = req.session.user?.username || req.session.username;
        
        console.log('===== 规划学生数查询 =====');
        console.log('查询参数:', { schoolName, year, calculation_criteria });
        console.log('Session数据:', {
            'req.session.user': req.session.user,
            'req.session.username': req.session.username,
            'currentUser': currentUser
        });
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                error: '未找到当前用户信息' 
            });
        }
        
        const pool = await getPool();
        
        let query = `
            SELECT 
                psn.*,
                u.real_name as creator_name,
                u.username as creator_username
            FROM planned_student_numbers psn
            LEFT JOIN users u ON psn.submitter_username = u.username
            WHERE psn.submitter_username = ?
        `;
        const params = [currentUser];
        
        // 添加筛选条件
        if (schoolName && schoolName !== 'all') {
            query += ' AND psn.school_name = ?';
            params.push(schoolName);
        }
        
        if (year && year !== 'all') {
            query += ' AND psn.year = ?';
            params.push(parseInt(year));
        }
        
        // 添加测算口径筛选
        if (calculation_criteria && calculation_criteria !== 'all') {
            query += ' AND psn.calculation_criteria = ?';
            params.push(calculation_criteria);
        }
        
        query += ' ORDER BY psn.updated_at DESC, psn.year DESC';
        
        console.log('执行SQL查询:', query);
        console.log('查询参数:', params);
        console.log('当前用户:', currentUser);
        
        const [rows] = await pool.query(query, params);
        
        console.log('规划学生数查询结果:', rows.length, '条');
        if (rows.length > 0) {
            console.log('第一条记录完整数据:', JSON.stringify(rows[0], null, 2));
            console.log('第一条记录关键字段:', {
                id: rows[0].id,
                school_name: rows[0].school_name,
                submitter_username: rows[0].submitter_username,
                creator_name: rows[0].creator_name,
                creator_username: rows[0].creator_username
            });
        }
        
        res.json({ 
            success: true, 
            data: rows,
            count: rows.length 
        });
    } catch (error) {
        console.error('获取规划学生数列表失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取规划学生数列表失败',
            message: error.message 
        });
    }
};

/**
 * 创建或更新规划学生数
 * POST /api/planned-students
 */
exports.savePlannedStudents = async (req, res) => {
    try {
        const {
            schoolName,
            year,
            calculationCriteria,
            fullTimeSpecialist,
            fullTimeUndergraduate,
            fullTimeMaster,
            fullTimeDoctor,
            internationalUndergraduate,
            internationalMaster,
            internationalDoctor,
            forceOverwrite // 新增参数：是否强制覆盖
        } = req.body;
        
        const username = req.session.username || req.session.user?.username;
        
        console.log('保存规划学生数:', {
            schoolName,
            year,
            calculationCriteria,
            username,
            forceOverwrite
        });
        
        const pool = await getPool();
        
        // 获取学校注册表ID
        const [schoolRows] = await pool.query(
            'SELECT id FROM school_registry WHERE school_name = ?',
            [schoolName]
        );
        
        if (schoolRows.length === 0) {
            return res.status(400).json({
                success: false,
                error: '学校不存在'
            });
        }
        
        const schoolRegistryId = schoolRows[0].id;
        
        // 检查是否已存在该用户-学校-年份-测算口径的记录
        const [existingRows] = await pool.query(
            `SELECT id FROM planned_student_numbers 
             WHERE submitter_username = ? AND school_name = ? AND year = ? AND calculation_criteria = ?`,
            [username, schoolName, year, calculationCriteria]
        );
        
        if (existingRows.length > 0) {
            // 如果记录已存在且没有设置强制覆盖标志，返回需要确认的响应
            if (!forceOverwrite) {
                return res.json({
                    success: false,
                    requireConfirmation: true,
                    message: '该测算口径记录已存在',
                    existingId: existingRows[0].id
                });
            }
            
            // 用户已确认覆盖，执行更新操作
            const updateQuery = `
                UPDATE planned_student_numbers SET
                    full_time_specialist = ?,
                    full_time_undergraduate = ?,
                    full_time_master = ?,
                    full_time_doctor = ?,
                    international_undergraduate = ?,
                    international_master = ?,
                    international_doctor = ?
                WHERE id = ?
            `;
            
            await pool.query(updateQuery, [
                fullTimeSpecialist || 0,
                fullTimeUndergraduate || 0,
                fullTimeMaster || 0,
                fullTimeDoctor || 0,
                internationalUndergraduate || 0,
                internationalMaster || 0,
                internationalDoctor || 0,
                existingRows[0].id
            ]);
            
            res.json({
                success: true,
                message: '规划学生数更新成功',
                id: existingRows[0].id
            });
        } else {
            // 插入新记录
            const insertQuery = `
                INSERT INTO planned_student_numbers (
                    school_name,
                    year,
                    school_registry_id,
                    submitter_username,
                    calculation_criteria,
                    full_time_specialist,
                    full_time_undergraduate,
                    full_time_master,
                    full_time_doctor,
                    international_undergraduate,
                    international_master,
                    international_doctor
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await pool.query(insertQuery, [
                schoolName,
                year,
                schoolRegistryId,
                username,
                calculationCriteria,
                fullTimeSpecialist || 0,
                fullTimeUndergraduate || 0,
                fullTimeMaster || 0,
                fullTimeDoctor || 0,
                internationalUndergraduate || 0,
                internationalMaster || 0,
                internationalDoctor || 0
            ]);
            
            res.json({
                success: true,
                message: '规划学生数创建成功',
                id: result.insertId
            });
        }
    } catch (error) {
        console.error('保存规划学生数失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '保存规划学生数失败',
            message: error.message 
        });
    }
};

/**
 * 删除规划学生数
 * DELETE /api/planned-students/:id
 */
exports.deletePlannedStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        await pool.query('DELETE FROM planned_student_numbers WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: '规划学生数删除成功'
        });
    } catch (error) {
        console.error('删除规划学生数失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '删除规划学生数失败',
            message: error.message 
        });
    }
};
