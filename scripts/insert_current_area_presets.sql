-- 为每个学校在 current_area_presets 表中插入三条记录
-- 数据源分别为：自填、高校基础表、SEC数据
-- 所有面积值均设置为 0

USE `school_area_management`;

-- 为所有学校插入三条记录（自填、高校基础表、SEC数据）
INSERT INTO `current_area_presets` (
    `school_registry_id`, 
    `data_source`,
    `teaching_area_current`,
    `office_area_current`,
    `total_living_area_current`,
    `dormitory_area_current`,
    `other_living_area_current`,
    `logistics_area_current`,
    `current_building_area`
)
SELECT 
    id,
    '自填',
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00
FROM `school_registry`
UNION ALL
SELECT 
    id,
    '高校基础表',
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00
FROM `school_registry`
UNION ALL
SELECT 
    id,
    'SEC数据',
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00
FROM `school_registry`;

-- 验证插入结果
SELECT 
    sr.school_name,
    cap.data_source,
    cap.teaching_area_current,
    cap.office_area_current,
    cap.total_living_area_current,
    cap.dormitory_area_current,
    cap.logistics_area_current,
    cap.current_building_area
FROM `current_area_presets` cap
JOIN `school_registry` sr ON cap.school_registry_id = sr.id
ORDER BY sr.id, cap.data_source;
