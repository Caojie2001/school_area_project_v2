const { getPool } = require('./database');

// 保存学校信息（包含计算结果）
async function saveSchoolInfo(schoolData, specialSubsidies = null, calculationResults = null, submitterUsername = null) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const schoolName = schoolData['学校名称'];
        const year = schoolData['年份'];
        const submitter = submitterUsername || 'system';
        
        console.log(`📝 准备插入新测算记录（不覆盖旧记录）: 学校=${schoolName}, 测算年份=${year}, 填报单位=${submitter}`);
        
        const toInt = (value) => {
            if (value === undefined || value === null || value === '') {
                return 0;
            }
            const num = parseInt(value, 10);
            return Number.isNaN(num) ? 0 : num;
        };

    // 准备计算结果数据（支持77字段结构）
    let calcData = {
            // 学生数据
            full_time_total: schoolData['全日制学生总数'] || 0,
            international_total: schoolData['留学生总数'] || 0,
            
            // 建筑面积测算范围设置
            building_area_calculation_scope: schoolData['建筑面积测算范围'] || '应配建筑面积',
            population_calculation_scope: schoolData['人口测算范围'] || '规划学生数',
            include_current_area: schoolData['是否包含现有面积'] !== false ? 1 : 0,
            include_preliminary_area: schoolData['是否包含初步计划面积'] !== false ? 1 : 0,
            include_under_construction_area: schoolData['是否包含在建面积'] !== false ? 1 : 0,
            include_special_subsidy: schoolData['是否包含特殊补助'] !== false ? 1 : 0,
            
            // 基线面积组成（JSON格式）
            baseline_area_composition: schoolData['基线面积组成'] ? JSON.stringify(schoolData['基线面积组成']) : null,
            
            // 教学及辅助用房 - 7阶段
            teaching_area_current: schoolData['现有教学及辅助用房面积'] || schoolData['现有教学面积'] || calculationResults?.['现有教学面积'] || 0,
            teaching_area_preliminary: schoolData['初步计划教学面积'] || calculationResults?.['初步计划教学面积'] || 0,
            teaching_area_under_construction: schoolData['在建教学面积'] || calculationResults?.['在建教学面积'] || 0,
            teaching_area_planned: 0, // 将在下面计算：preliminary + under_construction
            teaching_area_total: schoolData['合计教学面积'] || calculationResults?.['合计教学面积'] || 0,
            teaching_area_required: schoolData['应配教学面积'] || calculationResults?.['应配教学面积'] || 0,
            teaching_area_gap: schoolData['教学面积缺口'] || calculationResults?.['教学面积缺口'] || calculationResults?.['教学及辅助用房缺口(A)'] || 0,
            
            // 办公用房 - 7阶段
            office_area_current: schoolData['现有办公用房面积'] || schoolData['现有办公面积'] || calculationResults?.['现有办公面积'] || 0,
            office_area_preliminary: schoolData['初步计划办公面积'] || calculationResults?.['初步计划办公面积'] || 0,
            office_area_under_construction: schoolData['在建办公面积'] || calculationResults?.['在建办公面积'] || 0,
            office_area_planned: 0, // 将在下面计算：preliminary + under_construction
            office_area_total: schoolData['合计办公面积'] || calculationResults?.['合计办公面积'] || 0,
            office_area_required: schoolData['应配办公面积'] || calculationResults?.['应配办公面积'] || 0,
            office_area_gap: schoolData['办公面积缺口'] || calculationResults?.['办公面积缺口'] || calculationResults?.['办公用房缺口(B)'] || 0,
            
            // 生活用房总面积 - 7阶段
            total_living_area_current: schoolData['现有生活用房总面积'] || schoolData['现有生活总面积'] || calculationResults?.['现有生活总面积'] || 0,
            total_living_area_preliminary: schoolData['初步计划生活总面积'] || calculationResults?.['初步计划生活总面积'] || 0,
            total_living_area_under_construction: schoolData['在建生活总面积'] || calculationResults?.['在建生活总面积'] || 0,
            total_living_area_planned: 0, // 将在下面计算：preliminary + under_construction
            total_living_area_total: schoolData['合计生活总面积'] || calculationResults?.['合计生活总面积'] || 0,
            total_living_area_required: schoolData['应配生活总面积'] || calculationResults?.['应配生活总面积'] || 0,
            total_living_area_gap: schoolData['生活总面积缺口'] || calculationResults?.['生活总面积缺口'] || 0,
            
            // 学生宿舍 - 7阶段
            dormitory_area_current: schoolData['现有学生宿舍面积'] || schoolData['现有宿舍面积'] || calculationResults?.['现有宿舍面积'] || 0,
            dormitory_area_preliminary: schoolData['初步计划宿舍面积'] || calculationResults?.['初步计划宿舍面积'] || 0,
            dormitory_area_under_construction: schoolData['在建宿舍面积'] || calculationResults?.['在建宿舍面积'] || 0,
            dormitory_area_planned: 0, // 将在下面计算：preliminary + under_construction
            dormitory_area_total: schoolData['合计宿舍面积'] || calculationResults?.['合计宿舍面积'] || 0,
            dormitory_area_required: schoolData['应配宿舍面积'] || calculationResults?.['应配宿舍面积'] || 0,
            dormitory_area_gap: schoolData['宿舍面积缺口'] || calculationResults?.['宿舍面积缺口'] || calculationResults?.['学生宿舍缺口(C1)'] || 0,
            
            // 其他生活用房 - 7阶段
            other_living_area_current: schoolData['现有其他生活面积'] || calculationResults?.['现有其他生活面积'] || 0,
            other_living_area_preliminary: schoolData['初步计划其他生活面积'] || calculationResults?.['初步计划其他生活面积'] || 0,
            other_living_area_under_construction: schoolData['在建其他生活面积'] || calculationResults?.['在建其他生活面积'] || 0,
            other_living_area_planned: 0, // 将在下面计算：preliminary + under_construction
            other_living_area_total: schoolData['合计其他生活面积'] || calculationResults?.['合计其他生活面积'] || 0,
            other_living_area_required: schoolData['应配其他生活面积'] || calculationResults?.['应配其他生活面积'] || 0,
            other_living_area_gap: schoolData['其他生活面积缺口'] || calculationResults?.['其他生活面积缺口'] || calculationResults?.['其他生活用房缺口(C2)'] || 0,
            
            // 后勤辅助用房 - 7阶段
            logistics_area_current: schoolData['现有后勤辅助用房面积'] || schoolData['现有后勤面积'] || calculationResults?.['现有后勤面积'] || 0,
            logistics_area_preliminary: schoolData['初步计划后勤面积'] || calculationResults?.['初步计划后勤面积'] || 0,
            logistics_area_under_construction: schoolData['在建后勤面积'] || calculationResults?.['在建后勤面积'] || 0,
            logistics_area_planned: 0, // 将在下面计算：preliminary + under_construction
            logistics_area_total: schoolData['合计后勤面积'] || calculationResults?.['合计后勤面积'] || 0,
            logistics_area_required: schoolData['应配后勤面积'] || calculationResults?.['应配后勤面积'] || 0,
            logistics_area_gap: schoolData['后勤面积缺口'] || calculationResults?.['后勤面积缺口'] || calculationResults?.['后勤辅助用房缺口(D)'] || 0,
            
            // 建筑总面积 - 7阶段
            current_building_area: schoolData['现有建筑总面积'] || calculationResults?.['现有建筑总面积'] || 0,
            preliminary_building_area: schoolData['初步计划建筑总面积'] || calculationResults?.['初步计划建筑总面积'] || 0,
            under_construction_building_area: schoolData['在建建筑总面积'] || calculationResults?.['在建建筑总面积'] || 0,
            planned_building_area: 0, // 将在下面计算：preliminary + under_construction
            total_building_area: schoolData['合计建筑总面积'] || calculationResults?.['合计建筑总面积'] || 0,
            required_building_area: schoolData['应配建筑总面积'] || calculationResults?.['应配建筑总面积'] || 0,
            building_area_gap: schoolData['建筑总面积缺口'] || calculationResults?.['建筑总面积缺口'] || 0,
            
            // 缺口汇总
            total_area_gap_with_subsidy: schoolData['含补助总缺口'] || calculationResults?.['含补助总缺口'] || calculationResults?.['建筑面积总缺口（含特殊补助）'] || 0,
            total_area_gap_without_subsidy: schoolData['不含补助总缺口'] || calculationResults?.['不含补助总缺口'] || calculationResults?.['建筑面积总缺口（不含特殊补助）'] || 0,
            special_subsidy_total: schoolData['特殊补助总面积'] || calculationResults?.['特殊补助总面积'] || 0,
            
            // 计算结果JSON
            calculation_results: calculationResults ? JSON.stringify(calculationResults) : null
        };
        
        const toNumberValue = (value) => {
            if (value === undefined || value === null || value === '') {
                return 0;
            }
            const num = typeof value === 'number' ? value : parseFloat(value);
            return Number.isFinite(num) ? num : 0;
        };

        const roundToTwo = (value) => {
            const num = toNumberValue(value);
            return Math.round(num * 100) / 100;
        };

        const pickNumericValue = (...candidates) => {
            for (const candidate of candidates) {
                if (candidate === undefined || candidate === null || candidate === '') {
                    continue;
                }
                const num = typeof candidate === 'number' ? candidate : parseFloat(candidate);
                if (Number.isFinite(num)) {
                    return num;
                }
            }
            return 0;
        };

        const getResultValue = (...keys) => {
            if (!calculationResults) return 0;
            const values = keys.map(key => calculationResults[key]).filter(value => value !== undefined);
            return pickNumericValue(...values);
        };

        const numericFields = [
            'teaching_area_current', 'teaching_area_preliminary', 'teaching_area_under_construction', 'teaching_area_planned', 'teaching_area_total', 'teaching_area_required', 'teaching_area_gap',
            'office_area_current', 'office_area_preliminary', 'office_area_under_construction', 'office_area_planned', 'office_area_total', 'office_area_required', 'office_area_gap',
            'total_living_area_current', 'total_living_area_preliminary', 'total_living_area_under_construction', 'total_living_area_planned', 'total_living_area_total', 'total_living_area_required', 'total_living_area_gap',
            'dormitory_area_current', 'dormitory_area_preliminary', 'dormitory_area_under_construction', 'dormitory_area_planned', 'dormitory_area_total', 'dormitory_area_required', 'dormitory_area_gap',
            'other_living_area_current', 'other_living_area_preliminary', 'other_living_area_under_construction', 'other_living_area_planned', 'other_living_area_total', 'other_living_area_required', 'other_living_area_gap',
            'logistics_area_current', 'logistics_area_preliminary', 'logistics_area_under_construction', 'logistics_area_planned', 'logistics_area_total', 'logistics_area_required', 'logistics_area_gap',
            'current_building_area', 'preliminary_building_area', 'under_construction_building_area', 'planned_building_area', 'total_building_area', 'required_building_area', 'building_area_gap',
            'total_area_gap_with_subsidy', 'total_area_gap_without_subsidy', 'special_subsidy_total'
        ];

        numericFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(calcData, field)) {
                calcData[field] = roundToTwo(calcData[field]);
            }
        });

        const sumToTwo = (...values) => {
            const total = values.reduce((sum, value) => sum + toNumberValue(value), 0);
            return Math.round(total * 100) / 100;
        };

        // 重新计算“拟建成”数据及各类合计、应配值
        calcData.teaching_area_planned = sumToTwo(calcData.teaching_area_preliminary, calcData.teaching_area_under_construction);
        calcData.office_area_planned = sumToTwo(calcData.office_area_preliminary, calcData.office_area_under_construction);
        calcData.dormitory_area_planned = sumToTwo(calcData.dormitory_area_preliminary, calcData.dormitory_area_under_construction);
        calcData.other_living_area_planned = sumToTwo(calcData.other_living_area_preliminary, calcData.other_living_area_under_construction);
        calcData.logistics_area_planned = sumToTwo(calcData.logistics_area_preliminary, calcData.logistics_area_under_construction);

        // 生活用房按组成对齐，避免合计与分项不一致
        calcData.total_living_area_current = sumToTwo(calcData.dormitory_area_current, calcData.other_living_area_current);
        calcData.total_living_area_preliminary = sumToTwo(calcData.dormitory_area_preliminary, calcData.other_living_area_preliminary);
        calcData.total_living_area_under_construction = sumToTwo(calcData.dormitory_area_under_construction, calcData.other_living_area_under_construction);
        calcData.total_living_area_planned = sumToTwo(calcData.dormitory_area_planned, calcData.other_living_area_planned);
        calcData.total_living_area_total = sumToTwo(calcData.total_living_area_current, calcData.total_living_area_planned);

        calcData.teaching_area_total = sumToTwo(calcData.teaching_area_current, calcData.teaching_area_planned);
        calcData.office_area_total = sumToTwo(calcData.office_area_current, calcData.office_area_planned);
        calcData.dormitory_area_total = sumToTwo(calcData.dormitory_area_current, calcData.dormitory_area_planned);
        calcData.other_living_area_total = sumToTwo(calcData.other_living_area_current, calcData.other_living_area_planned);
        calcData.logistics_area_total = sumToTwo(calcData.logistics_area_current, calcData.logistics_area_planned);

        // 建筑总量按分项合计，确保导出与明细一致
        calcData.current_building_area = sumToTwo(
            calcData.teaching_area_current,
            calcData.office_area_current,
            calcData.total_living_area_current,
            calcData.logistics_area_current
        );
        calcData.preliminary_building_area = sumToTwo(
            calcData.teaching_area_preliminary,
            calcData.office_area_preliminary,
            calcData.total_living_area_preliminary,
            calcData.logistics_area_preliminary
        );
        calcData.under_construction_building_area = sumToTwo(
            calcData.teaching_area_under_construction,
            calcData.office_area_under_construction,
            calcData.total_living_area_under_construction,
            calcData.logistics_area_under_construction
        );
        calcData.planned_building_area = sumToTwo(
            calcData.teaching_area_planned,
            calcData.office_area_planned,
            calcData.total_living_area_planned,
            calcData.logistics_area_planned
        );
        calcData.total_building_area = sumToTwo(
            calcData.teaching_area_total,
            calcData.office_area_total,
            calcData.total_living_area_total,
            calcData.logistics_area_total
        );

        let teachingRequired = pickNumericValue(
            getResultValue('总应配教学及辅助用房(A)', '应配教学面积', '教学及辅助用房面积(㎡)_测算'),
            calcData.teaching_area_required
        );
        let officeRequired = pickNumericValue(
            getResultValue('总应配办公用房(B)', '应配办公面积', '办公用房面积(㎡)_测算'),
            calcData.office_area_required
        );
        let dormitoryRequired = pickNumericValue(
            getResultValue('总应配学生宿舍(C1)', '应配宿舍面积', '其中:学生宿舍面积(㎡)_测算'),
            calcData.dormitory_area_required
        );
        let otherLivingRequired = pickNumericValue(
            getResultValue('总应配其他生活用房(C2)', '应配其他生活面积', '其中:其他生活用房面积(㎡)_测算'),
            calcData.other_living_area_required
        );
        let livingRequired = pickNumericValue(
            getResultValue('总应配生活用房总面积', '应配生活总面积', '生活用房总面积(㎡)_测算'),
            calcData.total_living_area_required,
            dormitoryRequired + otherLivingRequired
        );
        let logisticsRequired = pickNumericValue(
            getResultValue('总应配后勤辅助用房(D)', '应配后勤面积', '后勤辅助用房面积(㎡)_测算'),
            calcData.logistics_area_required
        );

        calcData.teaching_area_required = roundToTwo(teachingRequired);
        teachingRequired = calcData.teaching_area_required;
        calcData.office_area_required = roundToTwo(officeRequired);
        officeRequired = calcData.office_area_required;
        calcData.dormitory_area_required = roundToTwo(dormitoryRequired);
        dormitoryRequired = calcData.dormitory_area_required;
        calcData.other_living_area_required = roundToTwo(otherLivingRequired);
        otherLivingRequired = calcData.other_living_area_required;
        calcData.total_living_area_required = roundToTwo(livingRequired);
        livingRequired = calcData.total_living_area_required;
        calcData.logistics_area_required = roundToTwo(logisticsRequired);
        logisticsRequired = calcData.logistics_area_required;

        const livingGap = pickNumericValue(
            calcData.total_living_area_gap,
            calcData.dormitory_area_gap + calcData.other_living_area_gap
        );
        calcData.total_living_area_gap = roundToTwo(livingGap);

        let requiredBuildingArea = pickNumericValue(
            getResultValue('应配建筑总面积', '总应配建筑总面积', '建筑总面积(㎡)_测算'),
            calcData.required_building_area,
            teachingRequired + officeRequired + livingRequired + logisticsRequired
        );
        calcData.required_building_area = roundToTwo(requiredBuildingArea);
        const specialSubsidyTotal = pickNumericValue(
            getResultValue('特殊补助总面积', '建筑总面积(㎡)_特殊用房补助'),
            calcData.special_subsidy_total
        );
        calcData.special_subsidy_total = roundToTwo(specialSubsidyTotal);

        const gapFromComponents = calcData.teaching_area_gap + calcData.office_area_gap + calcData.total_living_area_gap + calcData.logistics_area_gap;

        const buildingGapWithoutSubsidy = pickNumericValue(
            getResultValue('建筑面积总缺口（不含特殊补助）', '测算建筑面积总缺额（不含特殊补助）(m²)', '建筑总面积(㎡)_缺额_不含特殊补助'),
            calcData.total_area_gap_without_subsidy,
            calcData.building_area_gap,
            calcData.required_building_area - calcData.total_building_area,
            gapFromComponents
        );
        const buildingGapWithSubsidy = pickNumericValue(
            getResultValue('建筑面积总缺口（含特殊补助）', '测算建筑面积总缺额（含特殊补助）(m²)', '建筑总面积(㎡)_缺额_含特殊补助'),
            calcData.total_area_gap_with_subsidy,
            buildingGapWithoutSubsidy + specialSubsidyTotal,
            calcData.total_area_gap_without_subsidy + specialSubsidyTotal
        );

        calcData.total_area_gap_without_subsidy = roundToTwo(buildingGapWithoutSubsidy);
        calcData.total_area_gap_with_subsidy = roundToTwo(
            pickNumericValue(
                buildingGapWithSubsidy,
                calcData.total_area_gap_without_subsidy + calcData.special_subsidy_total
            )
        );
        calcData.building_area_gap = roundToTwo(
            pickNumericValue(
                getResultValue('建筑面积总缺口（不含特殊补助）', '测算建筑面积总缺额（不含特殊补助）(m²)', '建筑总面积(㎡)_缺额_不含特殊补助'),
                calcData.building_area_gap,
                calcData.total_area_gap_without_subsidy,
                calcData.required_building_area - calcData.total_building_area
            )
        );

        // 重新计算学生相关合计数，确保写入数据库的总数准确
    const fullTimeUndergraduate = toInt(schoolData['全日制本科生人数'] ?? schoolData['full_time_undergraduate']);
    const fullTimeSpecialist = toInt(schoolData['全日制专科生人数'] ?? schoolData['full_time_specialist']);
    const fullTimeMaster = toInt(schoolData['全日制硕士生人数'] ?? schoolData['full_time_master']);
    const fullTimeDoctor = toInt(schoolData['全日制博士生人数'] ?? schoolData['full_time_doctor']);

    const internationalUndergraduate = toInt(schoolData['留学生本科生人数'] ?? schoolData['international_undergraduate']);
    const internationalMaster = toInt(schoolData['留学生硕士生人数'] ?? schoolData['international_master']);
    const internationalDoctor = toInt(schoolData['留学生博士生人数'] ?? schoolData['international_doctor']);

    const fullTimeTotal = fullTimeUndergraduate + fullTimeSpecialist + fullTimeMaster + fullTimeDoctor;
    const internationalTotal = internationalUndergraduate + internationalMaster + internationalDoctor;
    const totalStudents = fullTimeTotal + internationalTotal;

    calcData.full_time_total = fullTimeTotal;
    calcData.international_total = internationalTotal;
    schoolData['学生总人数'] = totalStudents;

    // 记录“拟建成”字段计算结果，便于调试校验
        console.log('✅ 已计算"拟建成"字段（= 拟建成前期 + 拟建成在建）:', {
            教学及辅助用房: `${calcData.teaching_area_preliminary} + ${calcData.teaching_area_under_construction} = ${calcData.teaching_area_planned}`,
            办公用房: `${calcData.office_area_preliminary} + ${calcData.office_area_under_construction} = ${calcData.office_area_planned}`,
            生活用房总面积: `${calcData.total_living_area_preliminary} + ${calcData.total_living_area_under_construction} = ${calcData.total_living_area_planned}`,
            学生宿舍: `${calcData.dormitory_area_preliminary} + ${calcData.dormitory_area_under_construction} = ${calcData.dormitory_area_planned}`,
            其他生活用房: `${calcData.other_living_area_preliminary} + ${calcData.other_living_area_under_construction} = ${calcData.other_living_area_planned}`,
            后勤辅助用房: `${calcData.logistics_area_preliminary} + ${calcData.logistics_area_under_construction} = ${calcData.logistics_area_planned}`,
            建筑总面积: `${calcData.preliminary_building_area} + ${calcData.under_construction_building_area} = ${calcData.planned_building_area}`
        });
        
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
            SELECT id, school_type FROM school_registry WHERE school_name = ?
        `, [schoolData['学校名称']]);
        
        if (existingSchool.length > 0) {
            schoolRegistryId = existingSchool[0].id;
            // 注意：不再自动更新学校类型，保持数据库中的原有类型
            // 学校类型应该在 school_registry 表中维护，不应该在每次测算时被覆盖
            console.log('使用已存在的学校记录，ID:', schoolRegistryId, '类型:', existingSchool[0].school_type);
        } else {
            // 创建新的学校注册记录时，从 schoolData 中获取类型，如果没有则使用默认值
            const schoolType = schoolData['学校类型'] || '综合院校';
            const [schoolRegResult] = await connection.execute(`
                INSERT INTO school_registry (school_name, school_type) VALUES (?, ?)
            `, [schoolData['学校名称'], schoolType]);
            schoolRegistryId = schoolRegResult.insertId;
            console.log('创建新学校记录，ID:', schoolRegistryId, '类型:', schoolType);
        }
        
        console.log('schoolRegistryId:', schoolRegistryId);
        console.log('即将插入的参数数量检查...');
        
        // 构建参数数组（支持77字段）
        const insertParams = [
            // 基本信息
            schoolRegistryId,
            schoolData['年份'],
            submitterUsername || 'system',
            schoolData['基准年'] || schoolData['年份'], // base_year
            
            // 学生数据（10个字段）
            fullTimeUndergraduate,
            fullTimeSpecialist,
            fullTimeMaster,
            fullTimeDoctor,
            fullTimeTotal,
            internationalUndergraduate,
            internationalMaster,
            internationalDoctor,
            internationalTotal,
            totalStudents,
            
            // 测算范围设置（5个字段）
            calcData.building_area_calculation_scope,
            calcData.population_calculation_scope,
            calcData.include_current_area,
            calcData.include_preliminary_area,
            calcData.include_under_construction_area,
            calcData.include_special_subsidy,
            calcData.baseline_area_composition,
            
            // 教学及辅助用房 - 7阶段
            calcData.teaching_area_current,
            calcData.teaching_area_preliminary,
            calcData.teaching_area_under_construction,
            calcData.teaching_area_planned,
            calcData.teaching_area_total,
            calcData.teaching_area_required,
            calcData.teaching_area_gap,
            
            // 办公用房 - 7阶段
            calcData.office_area_current,
            calcData.office_area_preliminary,
            calcData.office_area_under_construction,
            calcData.office_area_planned,
            calcData.office_area_total,
            calcData.office_area_required,
            calcData.office_area_gap,
            
            // 生活用房总面积 - 7阶段
            calcData.total_living_area_current,
            calcData.total_living_area_preliminary,
            calcData.total_living_area_under_construction,
            calcData.total_living_area_planned,
            calcData.total_living_area_total,
            calcData.total_living_area_required,
            calcData.total_living_area_gap,
            
            // 学生宿舍 - 7阶段
            calcData.dormitory_area_current,
            calcData.dormitory_area_preliminary,
            calcData.dormitory_area_under_construction,
            calcData.dormitory_area_planned,
            calcData.dormitory_area_total,
            calcData.dormitory_area_required,
            calcData.dormitory_area_gap,
            
            // 其他生活用房 - 7阶段
            calcData.other_living_area_current,
            calcData.other_living_area_preliminary,
            calcData.other_living_area_under_construction,
            calcData.other_living_area_planned,
            calcData.other_living_area_total,
            calcData.other_living_area_required,
            calcData.other_living_area_gap,
            
            // 后勤辅助用房 - 7阶段
            calcData.logistics_area_current,
            calcData.logistics_area_preliminary,
            calcData.logistics_area_under_construction,
            calcData.logistics_area_planned,
            calcData.logistics_area_total,
            calcData.logistics_area_required,
            calcData.logistics_area_gap,
            
            // 建筑总面积 - 7阶段
            calcData.current_building_area,
            calcData.preliminary_building_area,
            calcData.under_construction_building_area,
            calcData.planned_building_area,
            calcData.total_building_area,
            calcData.required_building_area,
            calcData.building_area_gap,
            
            // 缺口汇总
            calcData.total_area_gap_with_subsidy,
            calcData.total_area_gap_without_subsidy,
            calcData.special_subsidy_total,
            
            // 其他
            calcData.calculation_results,
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
        
        // 插入新的计算历史记录（77字段完整版）
        const [schoolResult] = await connection.execute(`
            INSERT INTO calculation_history (
                school_registry_id, year, submitter_username, base_year,
                full_time_undergraduate, full_time_specialist, full_time_master, full_time_doctor, full_time_total,
                international_undergraduate, international_master, international_doctor, international_total, total_students,
                building_area_calculation_scope, population_calculation_scope,
                include_current_area, include_preliminary_area, include_under_construction_area, include_special_subsidy,
                baseline_area_composition,
                teaching_area_current, teaching_area_preliminary, teaching_area_under_construction, teaching_area_planned,
                teaching_area_total, teaching_area_required, teaching_area_gap,
                office_area_current, office_area_preliminary, office_area_under_construction, office_area_planned,
                office_area_total, office_area_required, office_area_gap,
                total_living_area_current, total_living_area_preliminary, total_living_area_under_construction, total_living_area_planned,
                total_living_area_total, total_living_area_required, total_living_area_gap,
                dormitory_area_current, dormitory_area_preliminary, dormitory_area_under_construction, dormitory_area_planned,
                dormitory_area_total, dormitory_area_required, dormitory_area_gap,
                other_living_area_current, other_living_area_preliminary, other_living_area_under_construction, other_living_area_planned,
                other_living_area_total, other_living_area_required, other_living_area_gap,
                logistics_area_current, logistics_area_preliminary, logistics_area_under_construction, logistics_area_planned,
                logistics_area_total, logistics_area_required, logistics_area_gap,
                current_building_area, preliminary_building_area, under_construction_building_area, planned_building_area,
                total_building_area, required_building_area, building_area_gap,
                total_area_gap_with_subsidy, total_area_gap_without_subsidy, special_subsidy_total,
                calculation_results, remarks
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?
            )
        `, insertParams);
        
        const schoolInfoId = schoolResult.insertId;
        
        console.log(`✅ 测算记录已成功插入，记录ID: ${schoolInfoId}`);
        
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
            console.log(`✅ 已插入 ${specialSubsidies.length} 条特殊补助记录`);
        }
        
        await connection.commit();
        console.log(`✅ 事务提交成功，学校=${schoolName}, 年份=${year}, 用户=${submitter}`);
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
                ch.*,
                sr.school_name,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM calculation_history ch
            JOIN school_registry sr ON ch.school_registry_id = sr.id
            LEFT JOIN users u ON ch.submitter_username = u.username
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
async function getLatestSchoolRecords(year = null, schoolName = null, baseYear = null, userRole = null, username = null, userSchoolName = null, userFilter = null, calculationCriteria = null) {
    const pool = await getPool();
    
    try {
        // 始终返回所有匹配的记录，不限制为最新记录
        // 这样可以看到同一学校、同一年份、同一用户的所有历史测算记录
        return await getAllSchoolRecords(year, schoolName, userRole, username, userSchoolName, userFilter, calculationCriteria);
        
    } catch (error) {
        console.error('获取学校记录失败:', error);
        throw error;
    }
}

// 获取所有学校记录（不限制为最新记录）
async function getAllSchoolRecords(year = null, schoolName = null, userRole = null, username = null, userSchoolName = null, userFilter = null, calculationCriteria = null) {
    const pool = await getPool();
    
    try {
        console.log('📋 getAllSchoolRecords 调用参数:', { year, schoolName, userRole, username, userSchoolName, userFilter, calculationCriteria });
        
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
            // 检查 userFilter 是否为数组
            if (Array.isArray(userFilter)) {
                // 多个用户筛选
                const userPlaceholders = userFilter.map(() => '?').join(',');
                whereConditions.push(`(u.real_name IN (${userPlaceholders}) OR (u.real_name IS NULL AND ch.submitter_username IN (${userPlaceholders})))`);
                params.push(...userFilter, ...userFilter);
            } else {
                // 单个用户筛选（保持向后兼容）
                whereConditions.push('(u.real_name = ? OR (u.real_name IS NULL AND ch.submitter_username = ?))');
                params.push(userFilter, userFilter);
            }
        }
        
        // 测算口径筛选
        if (calculationCriteria) {
            // 使用 population_calculation_scope 字段进行筛选
            // 这个字段可能包含类似 "规划学生数" 这样的值
            whereConditions.push('ch.population_calculation_scope = ?');
            params.push(calculationCriteria);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += `
            GROUP BY ch.id
            ORDER BY sr.school_name ASC, ch.year DESC, ch.submitter_username ASC, ch.created_at DESC
        `;
        
        console.log('🔍 执行SQL查询:', query);
        console.log('📊 查询参数:', params);
        
        const [rows] = await pool.execute(query, params);
        
        console.log(`✅ 查询返回 ${rows.length} 条记录`);
        if (rows.length > 0) {
            console.log('记录详情:', rows.map(r => ({ 
                id: r.id, 
                school: r.school_name, 
                year: r.year, 
                submitter: r.submitter_username,
                created_at: r.created_at 
            })));
        }
        
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

// =====================================================
// baseline_building_areas 表操作 (基础建筑面积底数表)
// =====================================================

// 获取所有基础面积底数记录
async function getAllBaselineAreas(filters = {}) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                bba.*,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM baseline_building_areas bba
            JOIN school_registry sr ON bba.school_registry_id = sr.id
            LEFT JOIN users u ON bba.submitter_username = u.username
        `;
        
        const whereConditions = [];
        const params = [];
        
        if (filters.schoolName) {
            whereConditions.push('bba.school_name = ?');
            params.push(filters.schoolName);
        }
        
        // baseline_building_areas 表没有 year 字段，忽略此过滤条件
        // if (filters.year) {
        //     whereConditions.push('bba.year = ?');
        //     params.push(filters.year);
        // }
        
        if (filters.submitterUsername) {
            whereConditions.push('bba.submitter_username = ?');
            params.push(filters.submitterUsername);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY bba.school_name ASC';
        
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('获取基础面积底数失败:', error);
        throw error;
    }
}

// 根据ID获取单条基础面积底数记录
async function getBaselineAreaById(id) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                bba.*,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM baseline_building_areas bba
            JOIN school_registry sr ON bba.school_registry_id = sr.id
            LEFT JOIN users u ON bba.submitter_username = u.username
            WHERE bba.id = ?
        `, [id]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取基础面积底数记录失败:', error);
        throw error;
    }
}

// 根据学校和年份获取基础面积底数
// 根据学校名称获取基础面积底数记录（不再使用year参数，因为表中已无year字段）
async function getBaselineAreaBySchoolYear(schoolName, year) {
    const pool = await getPool();
    
    try {
        // baseline_building_areas 表中没有 year 字段，每个学校只有一条记录
        // 保留函数签名以兼容旧代码，但忽略 year 参数
        const [rows] = await pool.execute(`
            SELECT bba.*
            FROM baseline_building_areas bba
            WHERE bba.school_name = ?
        `, [schoolName]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取基础面积底数记录失败:', error);
        throw error;
    }
}

// 创建或更新基础面积底数记录
async function saveBaselineArea(data) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 获取 school_registry_id
        const [schoolRows] = await connection.execute(
            'SELECT id FROM school_registry WHERE school_name = ?',
            [data.school_name]
        );
        
        if (schoolRows.length === 0) {
            throw new Error(`学校 "${data.school_name}" 未在系统中注册`);
        }
        
        const schoolRegistryId = schoolRows[0].id;
        
        // 检查是否已存在记录（baseline_building_areas 表中每个学校只有一条记录）
        const [existing] = await connection.execute(
            'SELECT id FROM baseline_building_areas WHERE school_name = ?',
            [data.school_name]
        );
        
        if (existing.length > 0) {
            // 更新现有记录
            const updateQuery = `
                UPDATE baseline_building_areas SET
                    school_registry_id = ?,
                    submitter_username = ?,
                    data_source = ?,
                    current_teaching_area = ?,
                    current_office_area = ?,
                    current_logistics_area = ?,
                    current_living_total_area = ?,
                    current_dormitory_area = ?,
                    planned_teaching_area = ?,
                    planned_office_area = ?,
                    planned_logistics_area = ?,
                    planned_living_total_area = ?,
                    planned_dormitory_area = ?,
                    under_construction_teaching_area = ?,
                    under_construction_office_area = ?,
                    under_construction_logistics_area = ?,
                    under_construction_living_total_area = ?,
                    under_construction_dormitory_area = ?,
                    remarks = ?
                WHERE id = ?
            `;
            
            await connection.execute(updateQuery, [
                schoolRegistryId,
                data.submitter_username || null,
                data.data_source || null,
                data.current_teaching_area || 0,
                data.current_office_area || 0,
                data.current_logistics_area || 0,
                data.current_living_total_area || 0,
                data.current_dormitory_area || 0,
                data.planned_teaching_area || 0,
                data.planned_office_area || 0,
                data.planned_logistics_area || 0,
                data.planned_living_total_area || 0,
                data.planned_dormitory_area || 0,
                data.under_construction_teaching_area || 0,
                data.under_construction_office_area || 0,
                data.under_construction_logistics_area || 0,
                data.under_construction_living_total_area || 0,
                data.under_construction_dormitory_area || 0,
                data.remarks || null,
                existing[0].id
            ]);
            
            await connection.commit();
            return { success: true, id: existing[0].id, message: '基础面积底数更新成功' };
        } else {
            // 插入新记录
            const insertQuery = `
                INSERT INTO baseline_building_areas (
                    school_name, school_registry_id, submitter_username,
                    data_source,
                    current_teaching_area, current_office_area, current_logistics_area,
                    current_living_total_area, current_dormitory_area,
                    planned_teaching_area, planned_office_area, planned_logistics_area,
                    planned_living_total_area, planned_dormitory_area,
                    under_construction_teaching_area, under_construction_office_area,
                    under_construction_logistics_area, under_construction_living_total_area,
                    under_construction_dormitory_area, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(insertQuery, [
                data.school_name,
                schoolRegistryId,
                data.submitter_username || null,
                data.data_source || null,
                data.current_teaching_area || 0,
                data.current_office_area || 0,
                data.current_logistics_area || 0,
                data.current_living_total_area || 0,
                data.current_dormitory_area || 0,
                data.planned_teaching_area || 0,
                data.planned_office_area || 0,
                data.planned_logistics_area || 0,
                data.planned_living_total_area || 0,
                data.planned_dormitory_area || 0,
                data.under_construction_teaching_area || 0,
                data.under_construction_office_area || 0,
                data.under_construction_logistics_area || 0,
                data.under_construction_living_total_area || 0,
                data.under_construction_dormitory_area || 0,
                data.remarks || null
            ]);
            
            await connection.commit();
            return { success: true, id: result.insertId, message: '基础面积底数创建成功' };
        }
    } catch (error) {
        await connection.rollback();
        console.error('保存基础面积底数失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 删除基础面积底数记录
async function deleteBaselineArea(id) {
    const pool = await getPool();
    
    try {
        const [result] = await pool.execute(
            'DELETE FROM baseline_building_areas WHERE id = ?',
            [id]
        );
        
        return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? '删除成功' : '记录不存在' };
    } catch (error) {
        console.error('删除基础面积底数失败:', error);
        throw error;
    }
}

// =====================================================
// special_subsidy_baseline_areas 表操作 (特殊补助底数表)
// =====================================================

// 获取所有特殊补助底数记录
async function getAllSpecialSubsidyBaselines(filters = {}) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                ssba.*,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM special_subsidy_baseline_areas ssba
            JOIN school_registry sr ON ssba.school_registry_id = sr.id
            LEFT JOIN users u ON ssba.submitter_username = u.username
        `;
        
        const whereConditions = [];
        const params = [];
        
        if (filters.schoolName) {
            whereConditions.push('ssba.school_name = ?');
            params.push(filters.schoolName);
        }
        
        // special_subsidy_baseline_areas 表没有 year 字段，忽略此过滤条件
        // if (filters.year) {
        //     whereConditions.push('ssba.year = ?');
        //     params.push(filters.year);
        // }
        
        if (filters.subsidyName) {
            whereConditions.push('ssba.subsidy_name LIKE ?');
            params.push(`%${filters.subsidyName}%`);
        }
        
        if (filters.submitterUsername) {
            whereConditions.push('ssba.submitter_username = ?');
            params.push(filters.submitterUsername);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY ssba.school_name ASC, ssba.subsidy_area DESC';
        
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('获取特殊补助底数失败:', error);
        throw error;
    }
}

// 根据学校获取特殊补助底数列表（不再使用year参数，因为表中已无year字段）
async function getSpecialSubsidyBaselinesBySchoolYear(schoolName, year) {
    const pool = await getPool();
    
    try {
        // special_subsidy_baseline_areas 表中没有 year 字段
        // 保留函数签名以兼容旧代码，但忽略 year 参数
        const [rows] = await pool.execute(`
            SELECT ssba.*
            FROM special_subsidy_baseline_areas ssba
            WHERE ssba.school_name = ?
            ORDER BY ssba.subsidy_area DESC
        `, [schoolName]);
        
        return rows;
    } catch (error) {
        console.error('获取特殊补助底数列表失败:', error);
        throw error;
    }
}

// 根据ID获取特殊补助底数记录
async function getSpecialSubsidyBaselineById(id) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                ssba.*,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM special_subsidy_baseline_areas ssba
            JOIN school_registry sr ON ssba.school_registry_id = sr.id
            LEFT JOIN users u ON ssba.submitter_username = u.username
            WHERE ssba.id = ?
        `, [id]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取特殊补助底数记录失败:', error);
        throw error;
    }
}

// 创建或更新特殊补助底数记录
async function saveSpecialSubsidyBaseline(data) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 获取 school_registry_id
        const [schoolRows] = await connection.execute(
            'SELECT id FROM school_registry WHERE school_name = ?',
            [data.school_name]
        );
        
        if (schoolRows.length === 0) {
            throw new Error(`学校 "${data.school_name}" 未在系统中注册`);
        }
        
        const schoolRegistryId = schoolRows[0].id;
        
        // 检查是否已存在记录（同一学校、补助名称）
        // special_subsidy_baseline_areas 表中没有 year 字段
        const [existing] = await connection.execute(
            'SELECT id FROM special_subsidy_baseline_areas WHERE school_name = ? AND subsidy_name = ?',
            [data.school_name, data.subsidy_name]
        );
        
        if (existing.length > 0) {
            // 更新现有记录
            const updateQuery = `
                UPDATE special_subsidy_baseline_areas SET
                    school_registry_id = ?,
                    submitter_username = ?,
                    data_source = ?,
                    data_source_date = ?,
                    subsidy_area = ?,
                    remarks = ?
                WHERE id = ?
            `;
            
            await connection.execute(updateQuery, [
                schoolRegistryId,
                data.submitter_username || null,
                data.data_source || null,
                data.data_source_date || null,
                data.subsidy_area || 0,
                data.remarks || null,
                existing[0].id
            ]);
            
            await connection.commit();
            return { success: true, id: existing[0].id, message: '特殊补助底数更新成功' };
        } else {
            // 插入新记录
            const insertQuery = `
                INSERT INTO special_subsidy_baseline_areas (
                    school_name, school_registry_id, submitter_username,
                    data_source, data_source_date, subsidy_name, subsidy_area, remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(insertQuery, [
                data.school_name,
                schoolRegistryId,
                data.submitter_username || null,
                data.data_source || null,
                data.data_source_date || null,
                data.subsidy_name,
                data.subsidy_area || 0,
                data.remarks || null
            ]);
            
            await connection.commit();
            return { success: true, id: result.insertId, message: '特殊补助底数创建成功' };
        }
    } catch (error) {
        await connection.rollback();
        console.error('保存特殊补助底数失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 删除特殊补助底数记录
async function deleteSpecialSubsidyBaseline(id) {
    const pool = await getPool();
    
    try {
        const [result] = await pool.execute(
            'DELETE FROM special_subsidy_baseline_areas WHERE id = ?',
            [id]
        );
        
        return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? '删除成功' : '记录不存在' };
    } catch (error) {
        console.error('删除特殊补助底数失败:', error);
        throw error;
    }
}

// =====================================================
// planned_student_numbers 表操作 (规划学生数表)
// =====================================================

// 获取所有规划学生数记录
async function getAllPlannedStudents(filters = {}) {
    const pool = await getPool();
    
    try {
        let query = `
            SELECT 
                psn.*,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM planned_student_numbers psn
            JOIN school_registry sr ON psn.school_registry_id = sr.id
            LEFT JOIN users u ON psn.submitter_username = u.username
        `;
        
        const whereConditions = [];
        const params = [];
        
        if (filters.schoolName) {
            whereConditions.push('psn.school_name = ?');
            params.push(filters.schoolName);
        }
        
        if (filters.year) {
            whereConditions.push('psn.year = ?');
            params.push(filters.year);
        }
        
        if (filters.submitterUsername) {
            whereConditions.push('psn.submitter_username = ?');
            params.push(filters.submitterUsername);
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY psn.year DESC, psn.school_name ASC';
        
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('获取规划学生数失败:', error);
        throw error;
    }
}

// 根据ID获取规划学生数记录
async function getPlannedStudentsById(id) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                psn.*,
                sr.school_type,
                u.real_name as submitter_real_name
            FROM planned_student_numbers psn
            JOIN school_registry sr ON psn.school_registry_id = sr.id
            LEFT JOIN users u ON psn.submitter_username = u.username
            WHERE psn.id = ?
        `, [id]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取规划学生数记录失败:', error);
        throw error;
    }
}

// 根据学校和年份获取规划学生数
async function getPlannedStudentsBySchoolYear(schoolName, year) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT psn.*
            FROM planned_student_numbers psn
            WHERE psn.school_name = ? AND psn.year = ?
        `, [schoolName, year]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取规划学生数记录失败:', error);
        throw error;
    }
}

// 创建或更新规划学生数记录
async function savePlannedStudents(data) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 获取 school_registry_id
        const [schoolRows] = await connection.execute(
            'SELECT id FROM school_registry WHERE school_name = ?',
            [data.school_name]
        );
        
        if (schoolRows.length === 0) {
            throw new Error(`学校 "${data.school_name}" 未在系统中注册`);
        }
        
        const schoolRegistryId = schoolRows[0].id;
        
        // 检查是否已存在记录
        const [existing] = await connection.execute(
            'SELECT id FROM planned_student_numbers WHERE school_name = ? AND year = ?',
            [data.school_name, data.year]
        );
        
        if (existing.length > 0) {
            // 更新现有记录
            const updateQuery = `
                UPDATE planned_student_numbers SET
                    school_registry_id = ?,
                    submitter_username = ?,
                    calculation_criteria = ?,
                    full_time_specialist = ?,
                    full_time_undergraduate = ?,
                    full_time_master = ?,
                    full_time_doctor = ?,
                    international_undergraduate = ?,
                    international_master = ?,
                    international_doctor = ?
                WHERE id = ?
            `;
            
            await connection.execute(updateQuery, [
                schoolRegistryId,
                data.submitter_username || null,
                data.calculation_criteria || null,
                data.full_time_specialist || 0,
                data.full_time_undergraduate || 0,
                data.full_time_master || 0,
                data.full_time_doctor || 0,
                data.international_undergraduate || 0,
                data.international_master || 0,
                data.international_doctor || 0,
                existing[0].id
            ]);
            
            await connection.commit();
            return { success: true, id: existing[0].id, message: '规划学生数更新成功' };
        } else {
            // 插入新记录
            const insertQuery = `
                INSERT INTO planned_student_numbers (
                    school_name, year, school_registry_id, submitter_username,
                    calculation_criteria, full_time_specialist, full_time_undergraduate,
                    full_time_master, full_time_doctor, international_undergraduate,
                    international_master, international_doctor
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(insertQuery, [
                data.school_name,
                data.year,
                schoolRegistryId,
                data.submitter_username || null,
                data.calculation_criteria || null,
                data.full_time_specialist || 0,
                data.full_time_undergraduate || 0,
                data.full_time_master || 0,
                data.full_time_doctor || 0,
                data.international_undergraduate || 0,
                data.international_master || 0,
                data.international_doctor || 0
            ]);
            
            await connection.commit();
            return { success: true, id: result.insertId, message: '规划学生数创建成功' };
        }
    } catch (error) {
        await connection.rollback();
        console.error('保存规划学生数失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 删除规划学生数记录
async function deletePlannedStudents(id) {
    const pool = await getPool();
    
    try {
        const [result] = await pool.execute(
            'DELETE FROM planned_student_numbers WHERE id = ?',
            [id]
        );
        
        return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? '删除成功' : '记录不存在' };
    } catch (error) {
        console.error('删除规划学生数失败:', error);
        throw error;
    }
}

// =====================================================
// current_area_presets 表操作 (现状面积预设表)
// =====================================================

// 获取所有现状面积预设记录
async function getAllCurrentAreaPresets() {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                cap.*,
                sr.school_name,
                sr.school_type
            FROM current_area_presets cap
            JOIN school_registry sr ON cap.school_registry_id = sr.id
            ORDER BY sr.school_name ASC
        `);
        
        return rows;
    } catch (error) {
        console.error('获取现状面积预设列表失败:', error);
        throw error;
    }
}

// 根据ID获取现状面积预设记录
async function getCurrentAreaPresetById(id) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                cap.*,
                sr.school_name,
                sr.school_type
            FROM current_area_presets cap
            JOIN school_registry sr ON cap.school_registry_id = sr.id
            WHERE cap.id = ?
        `, [id]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取现状面积预设记录失败:', error);
        throw error;
    }
}

// 根据学校获取现状面积预设（返回该学校的所有数据来源）
async function getCurrentAreaPresetBySchool(schoolName) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                cap.*,
                sr.school_name,
                sr.school_type
            FROM current_area_presets cap
            JOIN school_registry sr ON cap.school_registry_id = sr.id
            WHERE sr.school_name = ?
            ORDER BY cap.data_source ASC
        `, [schoolName]);
        
        return rows; // 返回数组，支持多条记录
    } catch (error) {
        console.error('获取现状面积预设记录失败:', error);
        throw error;
    }
}

// 根据学校和数据来源获取现状面积预设
async function getCurrentAreaPresetBySchoolAndSource(schoolName, dataSource) {
    const pool = await getPool();
    
    try {
        const [rows] = await pool.execute(`
            SELECT 
                cap.*,
                sr.school_name,
                sr.school_type
            FROM current_area_presets cap
            JOIN school_registry sr ON cap.school_registry_id = sr.id
            WHERE sr.school_name = ? AND cap.data_source = ?
        `, [schoolName, dataSource]);
        
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('获取现状面积预设记录失败:', error);
        throw error;
    }
}

// 创建或更新现状面积预设记录
async function saveCurrentAreaPreset(data) {
    const pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 验证必填字段
        if (!data.data_source || data.data_source.trim() === '') {
            throw new Error('数据来源（data_source）为必填字段');
        }
        
        // 获取 school_registry_id
        let schoolRegistryId;
        if (data.school_registry_id) {
            schoolRegistryId = data.school_registry_id;
        } else if (data.school_name) {
            const [schoolRows] = await connection.execute(
                'SELECT id FROM school_registry WHERE school_name = ?',
                [data.school_name]
            );
            
            if (schoolRows.length === 0) {
                throw new Error(`学校 "${data.school_name}" 未在系统中注册`);
            }
            
            schoolRegistryId = schoolRows[0].id;
        } else {
            throw new Error('必须提供 school_registry_id 或 school_name');
        }
        
        // 检查是否已存在记录（同一学校+数据来源组合只能有一条记录）
        const [existing] = await connection.execute(
            'SELECT id FROM current_area_presets WHERE school_registry_id = ? AND data_source = ?',
            [schoolRegistryId, data.data_source.trim()]
        );
        
        if (existing.length > 0) {
            // 更新现有记录
            const updateQuery = `
                UPDATE current_area_presets SET
                    teaching_area_current = ?,
                    office_area_current = ?,
                    total_living_area_current = ?,
                    dormitory_area_current = ?,
                    logistics_area_current = ?
                WHERE school_registry_id = ? AND data_source = ?
            `;
            
            await connection.execute(updateQuery, [
                data.teaching_area_current || 0,
                data.office_area_current || 0,
                data.total_living_area_current || 0,
                data.dormitory_area_current || 0,
                data.logistics_area_current || 0,
                schoolRegistryId,
                data.data_source.trim()
            ]);
            
            await connection.commit();
            return { success: true, id: existing[0].id, message: '现状面积预设更新成功' };
        } else {
            // 插入新记录
            const insertQuery = `
                INSERT INTO current_area_presets (
                    school_registry_id,
                    data_source,
                    teaching_area_current,
                    office_area_current,
                    total_living_area_current,
                    dormitory_area_current,
                    logistics_area_current
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await connection.execute(insertQuery, [
                schoolRegistryId,
                data.data_source.trim(),
                data.teaching_area_current || 0,
                data.office_area_current || 0,
                data.total_living_area_current || 0,
                data.dormitory_area_current || 0,
                data.logistics_area_current || 0
            ]);
            
            await connection.commit();
            return { success: true, id: result.insertId, message: '现状面积预设创建成功' };
        }
    } catch (error) {
        await connection.rollback();
        console.error('保存现状面积预设失败:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 删除现状面积预设记录
async function deleteCurrentAreaPreset(id) {
    const pool = await getPool();
    
    try {
        const [result] = await pool.execute(
            'DELETE FROM current_area_presets WHERE id = ?',
            [id]
        );
        
        return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? '删除成功' : '记录不存在' };
    } catch (error) {
        console.error('删除现状面积预设失败:', error);
        throw error;
    }
}

// 获取学生规划参数（按年份分组）
async function getStudentPlanningParams(userRole = null, username = null, schoolName = null) {
    const pool = await getPool();
    
    try {
        console.log('📋 getStudentPlanningParams 调用参数:', { userRole, username, schoolName });
        
        let query = `
            SELECT 
                psn.id,
                psn.year,
                psn.calculation_criteria,
                psn.school_name,
                psn.submitter_username,
                psn.student_grand_total,
                psn.created_at
            FROM planned_student_numbers psn
        `;
        
        const conditions = [];
        const params = [];
        
        // 学校用户只能看到自己提交的或本校的学生规划参数
        if (userRole === 'school' && username && schoolName) {
            conditions.push('(psn.submitter_username = ? OR psn.school_name = ?)');
            params.push(username, schoolName);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY psn.year DESC, psn.created_at DESC';
        
        console.log('🔍 执行SQL查询:', query);
        console.log('📊 查询参数:', params);
        
        const [rows] = await pool.execute(query, params);
        
        console.log(`✅ 查询到 ${rows.length} 条学生规划参数记录`);
        
        // 按年份分组，并对年份+测算口径进行去重
        const groupedByYear = {};
        const seen = new Set(); // 用于跟踪已经添加的 年份+测算口径 组合
        
        rows.forEach(row => {
            const year = row.year.toString();
            const criteria = row.calculation_criteria || '默认口径';
            const key = `${year}_${criteria}`; // 创建唯一键
            
            // 如果这个组合还没有被添加过
            if (!seen.has(key)) {
                seen.add(key);
                
                if (!groupedByYear[year]) {
                    groupedByYear[year] = [];
                }
                
                groupedByYear[year].push({
                    id: row.id,
                    calculation_criteria: criteria,
                    school_name: row.school_name,
                    submitter_username: row.submitter_username,
                    student_grand_total: row.student_grand_total,
                    created_at: row.created_at
                });
            }
        });
        
        // 转换为数组格式
        const result = Object.keys(groupedByYear)
            .sort((a, b) => parseInt(b) - parseInt(a)) // 年份降序
            .map(year => ({
                year,
                items: groupedByYear[year]
            }));
        
        console.log('📦 返回分组数据（已去重）:', JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        console.error('获取学生规划参数失败:', error);
        throw error;
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
    testConnection,
    // 新增：基础建筑面积底数表方法
    getAllBaselineAreas,
    getBaselineAreaById,
    getBaselineAreaBySchoolYear,
    saveBaselineArea,
    deleteBaselineArea,
    // 新增：特殊补助底数表方法
    getAllSpecialSubsidyBaselines,
    getSpecialSubsidyBaselineById,
    getSpecialSubsidyBaselinesBySchoolYear,
    saveSpecialSubsidyBaseline,
    deleteSpecialSubsidyBaseline,
    // 新增：规划学生数表方法
    getAllPlannedStudents,
    getPlannedStudentsById,
    getPlannedStudentsBySchoolYear,
    savePlannedStudents,
    deletePlannedStudents,
    // 新增：现状面积预设表方法
    getAllCurrentAreaPresets,
    getCurrentAreaPresetById,
    getCurrentAreaPresetBySchool,
    getCurrentAreaPresetBySchoolAndSource,
    saveCurrentAreaPreset,
    deleteCurrentAreaPreset,
    // 新增：学生规划参数方法
    getStudentPlanningParams
};
