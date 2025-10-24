const dataService = require('../config/dataService');
const { getPool } = require('../config/database');

// ========================================
// 基线建筑面积 (Baseline Areas)
// ========================================

/**
 * 获取基线建筑面积列表（支持筛选）
 */
exports.getAllBaselineAreas = async (req, res) => {
    try {
        // 获取当前登录用户
        const currentUser = req.session.user?.username || req.session.username;
        
        const filters = {
            schoolName: req.query.school_name || req.query.schoolName,
            year: req.query.year,
            submitterUsername: currentUser  // 强制使用当前登录用户过滤
        };
        
        console.log('查询建筑面积底数 - 当前用户:', currentUser, '学校:', filters.schoolName);
        
        const result = await dataService.getAllBaselineAreas(filters);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取基线建筑面积列表失败:', error);
        res.status(500).json({ success: false, message: '获取基线建筑面积列表失败: ' + error.message });
    }
};

/**
 * 根据ID获取单条基线建筑面积记录
 */
exports.getBaselineAreaById = async (req, res) => {
    try {
        const result = await dataService.getBaselineAreaById(req.params.id);
        if (result) {
            res.json({ success: true, data: result });
        } else {
            res.status(404).json({ success: false, message: '记录不存在' });
        }
    } catch (error) {
        console.error('获取基线建筑面积记录失败:', error);
        res.status(500).json({ success: false, message: '获取基线建筑面积记录失败: ' + error.message });
    }
};

/**
 * 根据学校名称和年份获取基线建筑面积
 */
exports.getBaselineAreaBySchoolYear = async (req, res) => {
    try {
        const result = await dataService.getBaselineAreaBySchoolYear(req.params.schoolName, req.params.year);
        if (result) {
            res.json({ success: true, data: result });
        } else {
            res.status(404).json({ success: false, message: '记录不存在' });
        }
    } catch (error) {
        console.error('获取基线建筑面积记录失败:', error);
        res.status(500).json({ success: false, message: '获取基线建筑面积记录失败: ' + error.message });
    }
};

/**
 * 创建或更新基线建筑面积记录
 */
exports.saveBaselineArea = async (req, res) => {
    try {
        // 从session中获取提交人用户名
        const submitterUsername = req.session?.user?.username;
        if (!submitterUsername) {
            return res.status(401).json({ success: false, message: '未登录或会话已过期' });
        }
        
        const data = {
            ...req.body,
            submitter_username: submitterUsername
        };
        
        const result = await dataService.saveBaselineArea(data);
        res.json({ success: true, message: '保存成功', data: result });
    } catch (error) {
        console.error('保存基线建筑面积记录失败:', error);
        res.status(500).json({ success: false, message: '保存基线建筑面积记录失败: ' + error.message });
    }
};

/**
 * 删除基线建筑面积记录
 */
exports.deleteBaselineArea = async (req, res) => {
    try {
        await dataService.deleteBaselineArea(req.params.id);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除基线建筑面积记录失败:', error);
        res.status(500).json({ success: false, message: '删除基线建筑面积记录失败: ' + error.message });
    }
};

/**
 * 更新底数（覆盖式保存）
 */
exports.updateBaselineAreas = async (req, res) => {
    try {
        // 从session中获取提交人用户名
        const submitterUsername = req.session?.user?.username;
        if (!submitterUsername) {
            return res.status(401).json({ success: false, message: '未登录或会话已过期' });
        }

        const { schoolName, baselineData, specialSubsidies } = req.body;
        
        if (!schoolName) {
            return res.status(400).json({ success: false, message: '学校名称不能为空' });
        }

        const pool = await getPool();
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // 1. 获取 school_registry_id
            const [schoolRows] = await connection.query(
                'SELECT id FROM school_registry WHERE school_name = ?',
                [schoolName]
            );
            
            if (schoolRows.length === 0) {
                throw new Error('学校不存在');
            }
            
            const schoolRegistryId = schoolRows[0].id;

            // 2. 删除该提交人-学校组合下的旧底数记录
            await connection.query(
                'DELETE FROM baseline_building_areas WHERE school_name = ? AND submitter_username = ?',
                [schoolName, submitterUsername]
            );

            // 3. 插入新的底数记录
            if (baselineData) {
                await connection.query(`
                    INSERT INTO baseline_building_areas (
                        school_name, school_registry_id, submitter_username, data_source,
                        current_teaching_area, current_office_area, current_logistics_area,
                        current_living_total_area, current_dormitory_area,
                        planned_teaching_area, planned_office_area, planned_logistics_area,
                        planned_living_total_area, planned_dormitory_area,
                        under_construction_teaching_area, under_construction_office_area,
                        under_construction_logistics_area, under_construction_living_total_area,
                        under_construction_dormitory_area, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    schoolName,
                    schoolRegistryId,
                    submitterUsername,
                    baselineData.data_source || '自填',
                    baselineData.current_teaching_area || 0,
                    baselineData.current_office_area || 0,
                    baselineData.current_logistics_area || 0,
                    baselineData.current_living_total_area || 0,
                    baselineData.current_dormitory_area || 0,
                    baselineData.planned_teaching_area || 0,
                    baselineData.planned_office_area || 0,
                    baselineData.planned_logistics_area || 0,
                    baselineData.planned_living_total_area || 0,
                    baselineData.planned_dormitory_area || 0,
                    baselineData.under_construction_teaching_area || 0,
                    baselineData.under_construction_office_area || 0,
                    baselineData.under_construction_logistics_area || 0,
                    baselineData.under_construction_living_total_area || 0,
                    baselineData.under_construction_dormitory_area || 0,
                    baselineData.remarks || null
                ]);
            }

            // 4. 删除该提交人-学校组合下的旧特殊补助记录
            await connection.query(
                'DELETE FROM special_subsidy_baseline_areas WHERE school_name = ? AND submitter_username = ?',
                [schoolName, submitterUsername]
            );

            // 5. 插入新的特殊补助记录
            if (specialSubsidies && Array.isArray(specialSubsidies) && specialSubsidies.length > 0) {
                for (const subsidy of specialSubsidies) {
                    if (subsidy.subsidy_name && subsidy.subsidy_area) {
                        await connection.query(`
                            INSERT INTO special_subsidy_baseline_areas (
                                school_name, school_registry_id, submitter_username,
                                data_source, subsidy_name, subsidy_area, remarks
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                            schoolName,
                            schoolRegistryId,
                            submitterUsername,
                            baselineData?.data_source || '自填',
                            subsidy.subsidy_name,
                            subsidy.subsidy_area || 0,
                            subsidy.remarks || null
                        ]);
                    }
                }
            }

            await connection.commit();
            res.json({ 
                success: true, 
                message: '底数更新成功',
                data: {
                    schoolName,
                    submitterUsername,
                    baselineUpdated: !!baselineData,
                    subsidiesCount: specialSubsidies?.length || 0
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('更新底数失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新底数失败: ' + error.message 
        });
    }
};

// ========================================
// 特殊补助基线面积 (Special Subsidy Baselines)
// ========================================

/**
 * 获取特殊补助基线面积列表（支持筛选）
 */
exports.getAllSpecialSubsidyBaselines = async (req, res) => {
    try {
        // 获取当前登录用户
        const currentUser = req.session.user?.username || req.session.username;
        
        const filters = {
            schoolName: req.query.school_name || req.query.schoolName,
            year: req.query.year,
            subsidyName: req.query.subsidyName,
            submitterUsername: currentUser  // 强制使用当前登录用户过滤
        };
        
        console.log('查询特殊补助 - 当前用户:', currentUser, '学校:', filters.schoolName);
        
        const result = await dataService.getAllSpecialSubsidyBaselines(filters);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取特殊补助基线面积列表失败:', error);
        res.status(500).json({ success: false, message: '获取特殊补助基线面积列表失败: ' + error.message });
    }
};

/**
 * 根据ID获取单条特殊补助基线面积记录
 */
exports.getSpecialSubsidyBaselineById = async (req, res) => {
    try {
        const result = await dataService.getSpecialSubsidyBaselineById(req.params.id);
        if (result) {
            res.json({ success: true, data: result });
        } else {
            res.status(404).json({ success: false, message: '记录不存在' });
        }
    } catch (error) {
        console.error('获取特殊补助基线面积记录失败:', error);
        res.status(500).json({ success: false, message: '获取特殊补助基线面积记录失败: ' + error.message });
    }
};

/**
 * 根据学校名称和年份获取特殊补助基线面积列表
 */
exports.getSpecialSubsidyBaselinesBySchoolYear = async (req, res) => {
    try {
        const result = await dataService.getSpecialSubsidyBaselinesBySchoolYear(req.params.schoolName, req.params.year);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取特殊补助基线面积列表失败:', error);
        res.status(500).json({ success: false, message: '获取特殊补助基线面积列表失败: ' + error.message });
    }
};

/**
 * 创建或更新特殊补助基线面积记录
 */
exports.saveSpecialSubsidyBaseline = async (req, res) => {
    try {
        // 从session中获取提交人用户名
        const submitterUsername = req.session?.user?.username;
        if (!submitterUsername) {
            return res.status(401).json({ success: false, message: '未登录或会话已过期' });
        }
        
        const data = {
            ...req.body,
            submitter_username: submitterUsername
        };
        
        const result = await dataService.saveSpecialSubsidyBaseline(data);
        res.json({ success: true, message: '保存成功', data: result });
    } catch (error) {
        console.error('保存特殊补助基线面积记录失败:', error);
        res.status(500).json({ success: false, message: '保存特殊补助基线面积记录失败: ' + error.message });
    }
};

/**
 * 删除特殊补助基线面积记录
 */
exports.deleteSpecialSubsidyBaseline = async (req, res) => {
    try {
        await dataService.deleteSpecialSubsidyBaseline(req.params.id);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除特殊补助基线面积记录失败:', error);
        res.status(500).json({ success: false, message: '删除特殊补助基线面积记录失败: ' + error.message });
    }
};

// ========================================
// 计算标准 (Calculation Standards)
// ========================================

// 注意：这些方法需要访问 server.js 中的全局变量
// 需要将 loadCalculationStandards, SCHOOL_NAME_TO_TYPE 等导出或重构

/**
 * 获取计算标准（仅管理员）
 * 注意：此方法需要访问 server.js 中的标准数据
 */
exports.getCalculationStandards = async (req, res) => {
    try {
        const pool = await getPool();
        
        // 获取基础面积标准
        const [basicRows] = await pool.execute(
            'SELECT school_type, room_type, standard_value FROM basic_area_standards WHERE is_active = 1'
        );
        
        // 获取补贴面积标准
        const [subsidizedRows] = await pool.execute(
            'SELECT school_type, room_type, subsidy_type, standard_value FROM subsidized_area_standards WHERE is_active = 1'
        );
        
        // 获取所有院校类型
        const [schoolTypesRows] = await pool.execute(
            'SELECT DISTINCT school_type FROM basic_area_standards WHERE is_active = 1'
        );
        const schoolTypes = schoolTypesRows.map(row => row.school_type);
        
        // 组织基础标准数据
        const basicStandards = {};
        basicRows.forEach(row => {
            if (!basicStandards[row.school_type]) {
                basicStandards[row.school_type] = {};
            }
            basicStandards[row.school_type][row.room_type] = parseFloat(row.standard_value);
        });
        
        // 组织补贴标准数据（三重索引）
        const subsidizedStandards = {};
        subsidizedRows.forEach(row => {
            if (!subsidizedStandards[row.school_type]) {
                subsidizedStandards[row.school_type] = {};
            }
            if (!subsidizedStandards[row.school_type][row.room_type]) {
                subsidizedStandards[row.school_type][row.room_type] = {};
            }
            subsidizedStandards[row.school_type][row.room_type][row.subsidy_type] = parseFloat(row.standard_value);
        });
        
        // 组织院校类型列表
        const schoolMapping = {};
        schoolTypes.forEach(type => {
            schoolMapping[type] = type;
        });
        
        res.json({
            success: true,
            basicStandards,
            subsidizedStandards,
            schoolMapping,
            schoolTypes
        });
    } catch (error) {
        console.error('获取测算标准失败:', error);
        res.status(500).json({ success: false, message: '获取测算标准失败' });
    }
};

/**
 * 测试端点 - 仅限管理员访问
 */
exports.testStandards = async (req, res) => {
    try {
        const pool = await getPool();
        
        const [basicRows] = await pool.execute(
            'SELECT school_type, room_type, standard_value FROM basic_area_standards WHERE is_active = 1 LIMIT 10'
        );
        
        res.json({
            success: true,
            sampleData: basicRows,
            message: 'Test endpoint working'
        });
    } catch (error) {
        console.error('测试端点失败:', error);
        res.status(500).json({ success: false, message: '测试失败' });
    }
};

/**
 * 保存测算标准配置（仅管理员）
 * 支持两种数据格式：
 * 1. 对象格式：{ basicStandards: {...}, subsidizedStandards: {...} }
 * 2. 数组格式（前端pendingChanges）：[ { type, schoolType, roomType, subsidyType, value }, ... ]
 */
exports.saveCalculationStandards = async (req, res) => {
    try {
        let changes = req.body;
        
        // 如果是数组格式（前端 pendingChanges），转换为对象格式
        if (Array.isArray(changes)) {
            const basicStandards = {};
            const subsidizedStandards = {};
            
            for (const change of changes) {
                if (change.type === 'basic') {
                    // 基础标准：二重索引 schoolType -> roomType
                    if (!basicStandards[change.schoolType]) {
                        basicStandards[change.schoolType] = {};
                    }
                    basicStandards[change.schoolType][change.roomType] = change.value;
                } else if (change.type === 'subsidized') {
                    // 补贴标准：三重索引 schoolType -> roomType -> subsidyType
                    if (!subsidizedStandards[change.schoolType]) {
                        subsidizedStandards[change.schoolType] = {};
                    }
                    if (!subsidizedStandards[change.schoolType][change.roomType]) {
                        subsidizedStandards[change.schoolType][change.roomType] = {};
                    }
                    subsidizedStandards[change.schoolType][change.roomType][change.subsidyType] = change.value;
                }
            }
            
            changes = { basicStandards, subsidizedStandards };
        }
        
        const { basicStandards, subsidizedStandards, schoolMapping } = changes;
        
        // 验证数据格式（允许只更新其中一种）
        if (!basicStandards && !subsidizedStandards) {
            return res.status(400).json({ success: false, message: '标准配置数据不完整' });
        }
        
        const pool = await getPool();
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // 更新基础面积标准
            if (basicStandards && Object.keys(basicStandards).length > 0) {
                for (const [schoolType, roomTypes] of Object.entries(basicStandards)) {
                    for (const [roomType, value] of Object.entries(roomTypes)) {
                        await connection.execute(
                            `UPDATE basic_area_standards 
                             SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                             WHERE school_type = ? AND room_type = ?`,
                            [value, schoolType, roomType]
                        );
                    }
                }
            }
            
            // 更新补贴面积标准（三重索引结构）
            if (subsidizedStandards && Object.keys(subsidizedStandards).length > 0) {
                for (const [schoolType, roomTypes] of Object.entries(subsidizedStandards)) {
                    for (const [roomType, subsidyTypes] of Object.entries(roomTypes)) {
                        for (const [subsidyType, value] of Object.entries(subsidyTypes)) {
                            await connection.execute(
                                `UPDATE subsidized_area_standards 
                                 SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                                 WHERE school_type = ? AND room_type = ? AND subsidy_type = ?`,
                                [value, schoolType, roomType, subsidyType]
                            );
                        }
                    }
                }
            }
            
            await connection.commit();
            
            // TODO: 重新加载动态标准数据（需要重构）
            // await loadCalculationStandards();
            
            res.json({
                success: true,
                message: '测算标准配置保存成功'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('保存测算标准失败:', error);
        res.status(500).json({ success: false, message: '保存测算标准失败' });
    }
};

/**
 * 更新单个标准值（仅管理员）
 */
exports.updateSingleStandard = async (req, res) => {
    try {
        const { type, schoolType, roomType, subsidyType, value } = req.body;
        
        if (!type || !roomType || value === undefined) {
            return res.status(400).json({ success: false, message: '参数不完整' });
        }
        
        const pool = await getPool();
        
        if (type === 'basic') {
            if (!schoolType) {
                return res.status(400).json({ success: false, message: '学校类型不能为空' });
            }
            
            await pool.execute(
                `UPDATE basic_area_standards 
                 SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE school_type = ? AND room_type = ?`,
                [value, schoolType, roomType]
            );
            
        } else if (type === 'subsidized') {
            if (!schoolType || !subsidyType) {
                return res.status(400).json({ success: false, message: '院校类型和补贴类型不能为空' });
            }
            
            await pool.execute(
                `UPDATE subsidized_area_standards 
                 SET standard_value = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE school_type = ? AND room_type = ? AND subsidy_type = ?`,
                [value, schoolType, roomType, subsidyType]
            );
        }
        
        // TODO: 重新加载动态标准数据（需要重构）
        // await loadCalculationStandards();
        
        res.json({
            success: true,
            message: '标准值更新成功'
        });
    } catch (error) {
        console.error('更新标准值失败:', error);
        res.status(500).json({ success: false, message: '更新标准值失败' });
    }
};

/**
 * 获取学校类型映射（仅管理员）
 * 注意：需要访问 SCHOOL_NAME_TO_TYPE
 */
exports.getSchoolMappings = (req, res) => {
    try {
        // TODO: 从数据库或配置文件加载映射
        res.json({
            success: true,
            mappings: {}  // 需要重构以访问 SCHOOL_NAME_TO_TYPE
        });
    } catch (error) {
        console.error('获取学校映射失败:', error);
        res.status(500).json({ success: false, message: '获取学校映射失败' });
    }
};

/**
 * 更新学校类型映射（仅管理员）
 */
exports.updateSchoolMappings = (req, res) => {
    try {
        const { mappings } = req.body;
        
        if (!mappings || typeof mappings !== 'object') {
            return res.status(400).json({ success: false, message: '映射数据格式错误' });
        }
        
        // TODO: 更新到数据库或配置文件
        // Object.assign(SCHOOL_NAME_TO_TYPE, mappings);
        
        const changeRecord = {
            changeTime: new Date().toISOString(),
            changeUser: req.session.user.username,
            changeType: '学校映射更新',
            changeDescription: '更新了学校类型映射配置',
            changeDetails: { mappings }
        };
        
        // TODO: 将变更记录保存到数据库
        
        res.json({
            success: true,
            message: '学校类型映射更新成功'
        });
    } catch (error) {
        console.error('更新学校映射失败:', error);
        res.status(500).json({ success: false, message: '更新学校映射失败' });
    }
};

/**
 * 重新加载院校类型映射（仅管理员）
 */
exports.reloadSchoolTypeMapping = async (req, res) => {
    try {
        // TODO: 重新加载映射逻辑
        // SCHOOL_TYPE_CACHE = null;
        // await loadSchoolTypeMapping();
        
        res.json({
            success: true,
            message: '院校类型映射重新加载成功'
        });
    } catch (error) {
        console.error('重新加载院校类型映射失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '重新加载院校类型映射失败',
            error: error.message 
        });
    }
};

/**
 * 获取标准变更历史（仅管理员）
 */
exports.getStandardsHistory = async (req, res) => {
    try {
        // TODO: 从数据库获取变更历史
        res.json({
            success: true,
            history: []
        });
    } catch (error) {
        console.error('获取标准变更历史失败:', error);
        res.status(500).json({ success: false, message: '获取标准变更历史失败' });
    }
};
