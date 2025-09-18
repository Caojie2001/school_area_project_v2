const { getPool } = require('./database');

// 保存学校信息（包含计算结果）
async function saveSchoolInfo(schoolData, specialSubsidies = null, calculationResults = null, submitterUsername = null) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 删除同一学校-测算年份-填报单位组合的旧记录
        const schoolName = schoolData['学校名称'];
        const year = schoolData['年份'];
        const submitter = submitterUsername || 'system';
        
        console.log(`删除旧记录: 学校=${schoolName}, 测算年份=${year}, 填报单位=${submitter}`);
        
        // 获取要删除的记录ID（用于删除关联的特殊补助记录）
        // 严格按照 学校名称+测算年份+测算用户 作为唯一标识
        const [existingRecords] = await connection.execute(`
            SELECT ch.id FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            WHERE sr.school_name = ? AND ch.year = ? AND ch.submitter_username = ?
        `, [schoolName, year, submitter]);
        
        // 删除关联的特殊补助记录
        if (existingRecords.length > 0) {
            const recordIds = existingRecords.map(record => record.id);
            const placeholders = recordIds.map(() => '?').join(',');
            await connection.execute(`
                DELETE FROM special_subsidies 
                WHERE school_info_id IN (${placeholders})
            `, recordIds);
            
            console.log(`删除了 ${recordIds.length} 条旧记录的特殊补助数据`);
        }
        
        // 删除主记录
        const [deleteResult] = await connection.execute(`
            DELETE ch FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            WHERE sr.school_name = ? AND ch.year = ? AND ch.submitter_username = ?
        `, [schoolName, year, submitter]);
        
        console.log(`删除了 ${deleteResult.affectedRows} 条学校主记录`);
        
        // 准备计算结果数据
        let calcData = {
            current_building_area: 0,
            required_building_area: 0,
            teaching_area_gap: 0,
            office_area_gap: 0,
            dormitory_area_gap: 0,
            other_living_area_gap: 0,
            logistics_area_gap: 0,
            total_area_gap_with_subsidy: 0,
            total_area_gap_without_subsidy: 0,
            special_subsidy_total: 0,
            calculation_results: null
        };
        
        if (calculationResults) {
            calcData.current_building_area = calculationResults['现有建筑总面积'] || 0;
            calcData.required_building_area = calculationResults['应配建筑总面积'] || 0;
            calcData.teaching_area_gap = calculationResults['教学及辅助用房缺口(A)'] || 0;
            calcData.office_area_gap = calculationResults['办公用房缺口(B)'] || 0;
            calcData.dormitory_area_gap = calculationResults['学生宿舍缺口(C1)'] || 0;
            calcData.other_living_area_gap = calculationResults['其他生活用房缺口(C2)'] || 0;
            calcData.logistics_area_gap = calculationResults['后勤辅助用房缺口(D)'] || 0;
            calcData.total_area_gap_with_subsidy = calculationResults['建筑面积总缺口（含特殊补助）'] || 0;
            calcData.total_area_gap_without_subsidy = calculationResults['建筑面积总缺口（不含特殊补助）'] || 0;
            calcData.special_subsidy_total = calculationResults['特殊补助总面积'] || 0;
            calcData.calculation_results = JSON.stringify(calculationResults);
        }
        
        console.log('准备插入的数据:', {
            schoolName: schoolData['学校名称'],
            year: schoolData['年份'],
            calcData: calcData
        });
        
        // 调试：检查关键字段
        console.log('关键字段检查:', {
            schoolName: schoolData['学校名称'],
            schoolType: schoolData['学校类型'],
            year: schoolData['年份'],
            submitterUsername: submitterUsername
        });
        
        // 获取或创建学校注册信息
        let schoolRegistryId;
        const [existingSchool] = await connection.execute(`
            SELECT id FROM school_registry WHERE school_name = ?
        `, [schoolData['学校名称']]);
        
        if (existingSchool.length > 0) {
            schoolRegistryId = existingSchool[0].id;
            // 更新学校类型（可能有变化）
            await connection.execute(`
                UPDATE school_registry SET school_type = ? WHERE id = ?
            `, [schoolData['学校类型'] || '综合院校', schoolRegistryId]);
        } else {
            // 创建新的学校注册记录
            const [schoolRegResult] = await connection.execute(`
                INSERT INTO school_registry (school_name, school_type) VALUES (?, ?)
            `, [schoolData['学校名称'], schoolData['学校类型'] || '综合院校']);
            schoolRegistryId = schoolRegResult.insertId;
        }
        
        console.log('schoolRegistryId:', schoolRegistryId);
        console.log('即将插入的参数数量检查...');
        
        // 构建参数数组并检查undefined值
        const insertParams = [
            schoolRegistryId,
            schoolData['年份'],
            submitterUsername || 'system',
            schoolData['年份'], // base_year 使用同样的年份
            schoolData['全日制本科生人数'] || 0,
            schoolData['全日制专科生人数'] || 0,
            schoolData['全日制硕士生人数'] || 0,
            schoolData['全日制博士生人数'] || 0,
            schoolData['留学生本科生人数'] || 0,
            0, // international_specialist 固定为0，因为通常没有留学生专科生
            schoolData['留学生硕士生人数'] || 0,
            schoolData['留学生博士生人数'] || 0,
            schoolData['学生总人数'] || 0,
            schoolData['现有教学及辅助用房面积'] || 0,
            schoolData['现有办公用房面积'] || 0,
            schoolData['现有生活用房总面积'] || 0,
            schoolData['现有学生宿舍面积'] || 0,
            schoolData['现有后勤辅助用房面积'] || 0,
            calcData.current_building_area || 0,
            calcData.required_building_area || 0,
            calcData.teaching_area_gap || 0,
            calcData.office_area_gap || 0,
            calcData.dormitory_area_gap || 0,
            calcData.other_living_area_gap || 0,
            calcData.logistics_area_gap || 0,
            calcData.total_area_gap_with_subsidy || 0,
            calcData.total_area_gap_without_subsidy || 0,
            calcData.special_subsidy_total || 0,
            calcData.calculation_results || null,
            schoolData['备注'] || null
        ];
        
        // 检查是否有undefined值
        const undefinedIndex = insertParams.findIndex(param => param === undefined);
        if (undefinedIndex !== -1) {
            console.log(`参数数组中第${undefinedIndex}个参数是undefined:`, insertParams[undefinedIndex]);
            console.log('完整参数数组:', insertParams);
            throw new Error(`参数数组中第${undefinedIndex}个参数是undefined`);
        }
        
        console.log(`参数数组长度: ${insertParams.length}, 都不是undefined`);
        
        // 插入新的计算历史记录
        const [schoolResult] = await connection.execute(`
            INSERT INTO calculation_history (
                school_registry_id, year, submitter_username, base_year, full_time_undergraduate, full_time_specialist, 
                full_time_master, full_time_doctor, international_undergraduate, international_specialist,
                international_master, international_doctor, total_students, teaching_area, 
                office_area, total_living_area, dormitory_area, logistics_area,
                current_building_area, required_building_area, teaching_area_gap, office_area_gap,
                dormitory_area_gap, other_living_area_gap, logistics_area_gap, total_area_gap_with_subsidy,
                total_area_gap_without_subsidy, special_subsidy_total, calculation_results, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, insertParams);
        
        const schoolInfoId = schoolResult.insertId;
        
        // 插入特殊补助信息
        if (specialSubsidies && specialSubsidies.length > 0) {
            for (const subsidy of specialSubsidies) {
                await connection.execute(`
                    INSERT INTO special_subsidies (school_info_id, subsidy_name, subsidy_area)
                    VALUES (?, ?, ?)
                `, [
                    schoolInfoId,
                    subsidy['特殊用房补助名称'] || subsidy.name || subsidy['name'],
                    subsidy['补助面积（m²）'] || subsidy.area || subsidy['area']
                ]);
            }
        }
        
        await connection.commit();
        return schoolInfoId;
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 根据用户权限获取学校信息历史记录
async function getSchoolHistoryByUser(userRole, userSchoolName = null, username = null, year = null) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                ch.id,
                sr.school_name,
                sr.school_type,
                ch.year,
                ch.submitter_username,
                ch.full_time_undergraduate,
                ch.full_time_specialist,
                ch.full_time_master,
                ch.full_time_doctor,
                ch.international_undergraduate,
                ch.international_specialist,
                ch.international_master,
                ch.international_doctor,
                ch.total_students,
                ch.teaching_area,
                ch.office_area,
                ch.total_living_area,
                ch.dormitory_area,
                ch.logistics_area,
                ch.current_building_area,
                ch.required_building_area,
                ch.teaching_area_gap,
                ch.office_area_gap,
                ch.dormitory_area_gap,
                ch.other_living_area_gap,
                ch.logistics_area_gap,
                ch.total_area_gap_with_subsidy,
                ch.total_area_gap_without_subsidy,
                ch.special_subsidy_total,
                ch.calculation_results,
                ch.remarks,
                ch.created_at
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
        `;
        
        let whereConditions = [];
        let params = [];
        
        // 根据用户角色添加过滤条件
        if (userRole === 'school') {
            // 学校用户只能看到自己填报的记录
            whereConditions.push('(sr.school_name = ? AND ch.submitter_username = ?)');
            params.push(userSchoolName, username);
        } else if (userRole === 'construction_center') {
            // 基建中心可以看到所有记录
            // 不添加额外过滤条件
        } else if (userRole === 'admin') {
            // 管理员可以看到所有记录
            // 不添加额外过滤条件
        }
        
        // 按年份过滤
        if (year) {
            whereConditions.push('ch.year = ?');
            params.push(year);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY ch.created_at DESC, sr.school_name ASC';
        
        const [rows] = await pool.execute(query, params);
        return rows;
        
    } catch (error) {
        console.error('获取学校历史记录失败:', error);
        throw error;
    }
}

// 获取学校信息历史记录
async function getSchoolHistory(year = null) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                ch.id,
                sr.school_name,
                sr.school_type,
                ch.year,
                ch.full_time_undergraduate,
                ch.full_time_specialist,
                ch.full_time_master,
                ch.full_time_doctor,
                ch.international_undergraduate,
                ch.international_specialist,
                ch.international_master,
                ch.international_doctor,
                ch.total_students,
                ch.teaching_area,
                ch.office_area,
                ch.total_living_area,
                ch.dormitory_area,
                ch.logistics_area,
                ch.current_building_area,
                ch.required_building_area,
                ch.teaching_area_gap,
                ch.office_area_gap,
                ch.dormitory_area_gap,
                ch.other_living_area_gap,
                ch.logistics_area_gap,
                ch.total_area_gap_with_subsidy,
                ch.total_area_gap_without_subsidy,
                ch.special_subsidy_total,
                ch.calculation_results,
                ch.remarks,
                ch.created_at,
                GROUP_CONCAT(
                    CONCAT('{"特殊用房补助名称":"', ss.subsidy_name, '","补助面积（m²）":', ss.subsidy_area, '}')
                    SEPARATOR ','
                ) as special_subsidies_json
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            LEFT JOIN special_subsidies ss ON ch.id = ss.school_info_id
        `;
        
        let params = [];
        if (year) {
            query += ' WHERE ch.year = ?';
            params.push(year);
        }
        
        query += `
            GROUP BY ch.id
            ORDER BY ch.created_at DESC, sr.school_name ASC
        `;
        
        const [rows] = await pool.execute(query, params);
        
        // 处理特殊补助数据
        const results = rows.map(row => ({
            ...row,
            special_subsidies: row.special_subsidies_json ? 
                `[${row.special_subsidies_json}]` : '[]'
        }));
        
        return results;
        
    } catch (error) {
        console.error('获取学校历史记录失败:', error);
        throw error;
    }
}

// 获取最新的学校记录
async function getLatestSchoolRecords(year = null, schoolName = null, baseYear = null, userRole = null, username = null, userSchoolName = null, userFilter = null) {
    const pool = await getPool();
    
    try {
        // 如果指定了具体用户筛选，或者所有筛选条件都指定了，直接查询所有匹配记录
        if (userFilter && userFilter !== 'all') {
            // 指定了具体用户，返回该用户的所有匹配记录
            return await getAllSchoolRecords(year, schoolName, userRole, username, userSchoolName, userFilter);
        }
        
        // 如果是"所有测算用户"，也返回所有匹配的记录
        if (!userFilter || userFilter === 'all') {
            return await getAllSchoolRecords(year, schoolName, userRole, username, userSchoolName, null);
        }
        
        // 原有的"最新记录"逻辑（保留以防需要）
        let query = `
            SELECT 
                ch.*,
                sr.school_name,
                sr.school_type,
                u.real_name as submitter_real_name,
                GROUP_CONCAT(
                    CONCAT('{"特殊用房补助名称":"', ss.subsidy_name, '","补助面积（m²）":', ss.subsidy_area, '}')
                    SEPARATOR ','
                ) as special_subsidies_json
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            LEFT JOIN special_subsidies ss ON ch.id = ss.school_info_id
            LEFT JOIN users u ON ch.submitter_username = u.username
            INNER JOIN (
                SELECT sr2.school_name, ch2.year, ch2.submitter_username, MAX(ch2.created_at) as max_created_at
                FROM calculation_history ch2
                JOIN school_registry sr2 ON ch2.school_registry_id = sr2.id
                LEFT JOIN users u2 ON ch2.submitter_username = u2.username
        `;
        
        let params = [];
        let whereConditions = [];
        
        // 用户权限过滤（在子查询中）
        if (userRole === 'school') {
            // 学校用户只能查看自己学校自己填报的数据
            whereConditions.push('sr2.school_name = ? AND ch2.submitter_username = ?');
            params.push(userSchoolName, username);
        }
        
        if (year) {
            whereConditions.push('ch2.year = ?');
            params.push(year);
        }
        
        if (schoolName) {
            whereConditions.push('sr2.school_name = ?');
            params.push(schoolName);
        }
        
        if (userFilter) {
            whereConditions.push('(u2.real_name = ? OR (u2.real_name IS NULL AND ch2.submitter_username = ?))');
            params.push(userFilter, userFilter);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += `
                GROUP BY school_name, year, submitter_username
            ) latest ON sr.school_name = latest.school_name 
                     AND ch.year = latest.year
                     AND ch.submitter_username = latest.submitter_username
                     AND ch.created_at = latest.max_created_at
        `;
        
        // 再次添加筛选条件到主查询
        let mainWhereConditions = [];
        let mainParams = [];
        
        // 用户权限过滤（在主查询中）
        if (userRole === 'school') {
            // 学校用户只能查看自己学校自己填报的数据
            mainWhereConditions.push('sr.school_name = ? AND ch.submitter_username = ?');
            mainParams.push(userSchoolName, username);
        }
        
        if (year) {
            mainWhereConditions.push('ch.year = ?');
            mainParams.push(year);
        }
        
        if (schoolName) {
            mainWhereConditions.push('sr.school_name = ?');
            mainParams.push(schoolName);
        }
        
        if (userFilter) {
            mainWhereConditions.push('(u.real_name = ? OR (u.real_name IS NULL AND ch.submitter_username = ?))');
            mainParams.push(userFilter, userFilter);
        }
        
        if (mainWhereConditions.length > 0) {
            query += ' WHERE ' + mainWhereConditions.join(' AND ');
            params = [...params, ...mainParams];
        }
        
        query += `
            GROUP BY ch.id
            ORDER BY ch.year DESC, sr.school_name ASC, ch.submitter_username ASC
        `;
        
        const [rows] = await pool.execute(query, params);
        
        // 处理特殊补助数据
        const results = rows.map(row => ({
            ...row,
            special_subsidies: row.special_subsidies_json ? 
                `[${row.special_subsidies_json}]` : '[]'
        }));
        
        return results;
        
    } catch (error) {
        console.error('获取最新学校记录失败:', error);
        throw error;
    }
}

// 获取所有学校记录（不限制为最新记录）
async function getAllSchoolRecords(year = null, schoolName = null, userRole = null, username = null, userSchoolName = null, userFilter = null) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                ch.*,
                sr.school_name,
                sr.school_type,
                u.real_name as submitter_real_name,
                GROUP_CONCAT(
                    CONCAT('{"特殊用房补助名称":"', ss.subsidy_name, '","补助面积（m²）":', ss.subsidy_area, '}')
                    SEPARATOR ','
                ) as special_subsidies_json
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            LEFT JOIN special_subsidies ss ON ch.id = ss.school_info_id
            LEFT JOIN users u ON ch.submitter_username = u.username
        `;
        
        let params = [];
        let whereConditions = [];
        
        // 用户权限过滤
        if (userRole === 'school') {
            // 学校用户只能查看自己学校自己填报的数据
            whereConditions.push('sr.school_name = ? AND ch.submitter_username = ?');
            params.push(userSchoolName, username);
        }
        
        if (year) {
            whereConditions.push('ch.year = ?');
            params.push(year);
        }
        
        if (schoolName) {
            whereConditions.push('sr.school_name = ?');
            params.push(schoolName);
        }
        
        if (userFilter) {
            whereConditions.push('(u.real_name = ? OR (u.real_name IS NULL AND ch.submitter_username = ?))');
            params.push(userFilter, userFilter);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += `
            GROUP BY ch.id
            ORDER BY sr.school_name ASC, ch.year DESC, ch.submitter_username ASC, ch.created_at DESC
        `;
        
        const [rows] = await pool.execute(query, params);
        
        // 处理特殊补助数据
        const results = rows.map(row => ({
            ...row,
            special_subsidies: row.special_subsidies_json ? 
                `[${row.special_subsidies_json}]` : '[]'
        }));
        
        return results;
        
    } catch (error) {
        console.error('获取所有学校记录失败:', error);
        throw error;
    }
}

// 获取可用年份列表
async function getAvailableYears() {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT year 
            FROM calculation_history 
            WHERE year IS NOT NULL 
            ORDER BY year DESC
        `);
        
        return rows.map(row => row.year);
    } catch (error) {
        console.error('获取可用年份失败:', error);
        return [];
    }
}

// 获取特定学校的可用年份
async function getAvailableYearsBySchool(schoolName) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT ch.year 
            FROM calculation_history ch
            INNER JOIN school_registry sr ON ch.school_registry_id = sr.id
            WHERE ch.year IS NOT NULL 
              AND sr.school_name = ?
            ORDER BY ch.year DESC
        `, [schoolName]);
        
        return rows.map(row => row.year);
    } catch (error) {
        console.error('获取学校可用年份失败:', error);
        return [];
    }
}

// 获取可用的测算用户列表
async function getAvailableSubmitterUsers() {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT ch.submitter_username, u.real_name
            FROM calculation_history ch
            LEFT JOIN users u ON ch.submitter_username = u.username
            WHERE ch.submitter_username IS NOT NULL 
            ORDER BY ch.submitter_username ASC
        `);
        
        return rows.map(row => ({
            username: row.submitter_username,
            real_name: row.real_name,
            display_name: row.real_name ? `${row.real_name}(${row.submitter_username})` : row.submitter_username
        }));
    } catch (error) {
        console.error('获取可用测算用户失败:', error);
        return [];
    }
}

// 获取特定学校的测算用户列表
async function getAvailableSubmitterUsersBySchool(schoolName) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT ch.submitter_username 
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            WHERE ch.submitter_username IS NOT NULL AND sr.school_name = ?
            ORDER BY ch.submitter_username ASC
        `, [schoolName]);
        
        return rows.map(row => row.submitter_username);
    } catch (error) {
        console.error('获取学校测算用户失败:', error);
        return [];
    }
}

// 获取特殊补助信息
async function getSpecialSubsidies(calculationHistoryId) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                subsidy_name as '特殊用房补助名称',
                subsidy_area as '补助面积（m²）'
            FROM special_subsidies
            WHERE school_info_id = ?
            ORDER BY id
        `, [calculationHistoryId]);
        
        return rows;
    } catch (error) {
        console.error('获取特殊补助信息失败:', error);
        return [];
    }
}

// 获取统计数据
async function getStatistics(year = null) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                COUNT(*) as total_schools,
                SUM(ch.total_students) as total_students,
                SUM(ch.current_building_area) as total_current_area,
                SUM(ch.required_building_area) as total_required_area,
                SUM(ch.total_area_gap_with_subsidy) as total_gap,
                AVG(ch.total_students) as avg_students,
                AVG(ch.current_building_area) as avg_current_area,
                MIN(ch.year) as earliest_year,
                MAX(ch.year) as latest_year
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
        `;
        
        let params = [];
        if (year) {
            query += ' WHERE ch.year = ?';
            params.push(year);
        }
        
        const [rows] = await pool.execute(query, params);
        const stats = rows[0] || {};
        
        // 获取学校类型统计
        let typeQuery = `
            SELECT 
                sr.school_type,
                COUNT(*) as count,
                SUM(ch.total_students) as students,
                SUM(ch.current_building_area) as current_area,
                SUM(ch.required_building_area) as required_area,
                SUM(ch.total_area_gap_with_subsidy) as gap
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
        `;
        
        if (year) {
            typeQuery += ' WHERE ch.year = ?';
        }
        
        typeQuery += ' GROUP BY sr.school_type ORDER BY count DESC';
        
        const [typeRows] = await pool.execute(typeQuery, params);
        
        return {
            overall: stats,
            by_type: typeRows
        };
        
    } catch (error) {
        console.error('获取统计数据失败:', error);
        throw error;
    }
}

// 删除学校记录
async function deleteSchoolRecord(id) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 先删除特殊补助记录（由于外键约束，MySQL会自动删除）
        await connection.execute('DELETE FROM special_subsidies WHERE school_info_id = ?', [id]);
        
        // 删除学校信息记录
        const [result] = await connection.execute('DELETE FROM calculation_history WHERE id = ?', [id]);
        
        await connection.commit();
        
        if (result.affectedRows === 0) {
            throw new Error('记录不存在或已被删除');
        }
        
        return { affectedRows: result.affectedRows };
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 删除学校组合记录（按测算年份-学校名称组合删除记录，可选择按用户筛选）
async function deleteSchoolCombination(schoolName, baseYear, year, submitterUsername = null) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 构建WHERE条件
        const whereConditions = ['sr.school_name = ?', 'ch.year = ?'];
        const params = [schoolName, year];
        
        // 如果指定了用户，添加用户筛选条件
        if (submitterUsername) {
            whereConditions.push('ch.submitter_username = ?');
            params.push(submitterUsername);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // 首先获取要删除的记录ID，用于删除特殊补助
        const [recordsToDelete] = await connection.execute(
            `SELECT ch.id FROM calculation_history ch JOIN school_registry sr ON ch.school_registry_id = sr.id WHERE ${whereClause}`,
            params
        );
        
        let totalDeletedCount = 0;
        
        // 删除特殊补助记录
        if (recordsToDelete.length > 0) {
            const recordIds = recordsToDelete.map(record => record.id);
            const placeholders = recordIds.map(() => '?').join(',');
            
            const [subsidiesResult] = await connection.execute(
                `DELETE FROM special_subsidies WHERE school_info_id IN (${placeholders})`,
                recordIds
            );
            
            console.log(`删除特殊补助记录: ${subsidiesResult.affectedRows} 条`);
        }
        
        // 删除学校信息记录
        const [result] = await connection.execute(
            `DELETE ch FROM calculation_history ch JOIN school_registry sr ON ch.school_registry_id = sr.id WHERE ${whereClause}`,
            params
        );
        
        totalDeletedCount = result.affectedRows;
        
        await connection.commit();
        
        const userInfo = submitterUsername ? `, 用户=${submitterUsername}` : ' (所有用户)';
        console.log(`删除学校组合记录完成: 学校=${schoolName}, 基准年份=${baseYear}, 测算年份=${year}${userInfo}, 删除记录数=${totalDeletedCount}`);
        
        return { deletedCount: totalDeletedCount };
        
    } catch (error) {
        await connection.rollback();
        console.error('删除学校组合记录失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 清空所有数据
async function clearAllData() {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 先删除特殊补助表的数据
        await connection.execute('DELETE FROM special_subsidies');
        
        // 再删除学校信息表的数据
        await connection.execute('DELETE FROM calculation_history');
        
        // 重置自增ID
        await connection.execute('ALTER TABLE special_subsidies AUTO_INCREMENT = 1');
        await connection.execute('ALTER TABLE calculation_history AUTO_INCREMENT = 1');
        
        await connection.commit();
        
        return { message: '所有数据已清空' };
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 根据ID获取学校记录
async function getSchoolRecordById(id) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                ch.*,
                sr.school_name,
                sr.school_type,
                u.real_name as submitter_real_name,
                GROUP_CONCAT(
                    CONCAT('{"特殊用房补助名称":"', ss.subsidy_name, '","补助面积（m²）":', ss.subsidy_area, '}')
                    SEPARATOR ','
                ) as special_subsidies_json
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            LEFT JOIN special_subsidies ss ON ch.id = ss.school_info_id
            LEFT JOIN users u ON ch.submitter_username = u.username
            WHERE ch.id = ?
            GROUP BY ch.id
        `, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        const result = {
            ...rows[0],
            special_subsidies: rows[0].special_subsidies_json ? 
                `[${rows[0].special_subsidies_json}]` : '[]'
        };
        
        return result;
        
    } catch (error) {
        console.error('获取学校记录失败:', error);
        throw error;
    }
}

// 通用查询执行函数
async function executeQuery(query, params = []) {
    const pool = await getPool();
    
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('数据库查询错误:', error);
        throw error;
    }
}

// 测试数据库连接
async function testConnection() {
    try {
        const pool = await getPool();
        const connection = await pool.getConnection();
        
        // 执行一个简单的查询来测试连接
        const [result] = await connection.execute('SELECT 1 as test');
        connection.release();
        
        return { success: true, message: '数据库连接正常' };
    } catch (error) {
        console.error('数据库连接测试失败:', error);
        throw error;
    }
}

// 获取学校注册表中的所有学校
async function getSchoolRegistry() {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT school_name, school_type 
            FROM school_registry 
            ORDER BY school_name ASC
        `);
        
        return rows;
    } catch (error) {
        console.error('获取学校注册表失败:', error);
        return [];
    }
}

module.exports = {
    saveSchoolInfo,
    getSchoolHistory,
    getSchoolHistoryByUser,
    getLatestSchoolRecords,
    getAllSchoolRecords,
    getAvailableYears,
    getAvailableYearsBySchool,
    getAvailableSubmitterUsers,
    getAvailableSubmitterUsersBySchool,
    getSpecialSubsidies,
    getStatistics,
    deleteSchoolRecord,
    deleteSchoolCombination,
    clearAllData,
    getSchoolRecordById,
    getSchoolRegistry,
    executeQuery,
    testConnection
};
