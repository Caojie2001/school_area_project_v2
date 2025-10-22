-- 高校建筑面积缺口测算系统数据库初始化脚本
-- 使用说明：请手动执行此SQL文件来创建数据库和表结构
-- 执行命令：mysql -u root -p < db.sql

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `school_area_management` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE `school_area_management`;

-- 创建学校注册表
CREATE TABLE IF NOT EXISTS `school_registry` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `school_name` VARCHAR(255) NOT NULL UNIQUE COMMENT '学校名称',
    `school_type` VARCHAR(50) DEFAULT '综合院校' COMMENT '院校类型',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入学校注册数据
INSERT IGNORE INTO `school_registry` (`school_name`, `school_type`) VALUES
('上海大学', '综合院校'),
('上海交通大学医学院', '医药院校'),
('上海理工大学', '理工院校'),
('上海师范大学', '师范院校'),
('上海科技大学', '理工院校'),
('华东政法大学', '政法院校'),
('上海海事大学', '理工院校'),
('上海海洋大学', '理工院校'),
('上海中医药大学', '医药院校'),
('上海体育大学', '体育院校'),
('上海音乐学院', '艺术院校'),
('上海戏剧学院', '艺术院校'),
('上海电力大学', '理工院校'),
('上海对外经贸大学', '财经院校'),
('上海应用技术大学', '理工院校'),
('上海立信会计金融学院', '财经院校'),
('上海工程技术大学', '理工院校'),
('上海第二工业大学', '理工院校'),
('上海商学院', '财经院校'),
('上海电机学院', '理工院校'),
('上海政法学院', '政法院校'),
('上海健康医学院', '医药院校'),
('上海出版印刷高等专科学校', '理工院校'),
('上海旅游高等专科学校', '师范院校'),
('上海城建职业学院', '理工院校'),
('上海电子信息职业技术学院', '理工院校'),
('上海工艺美术职业学院', '理工院校'),
('上海农林职业技术学院', '农业院校'),
('上海健康医学院附属卫生学校(上海健康护理职业学院(筹))', '医药院校');

-- 创建计算历史表
CREATE TABLE IF NOT EXISTS `calculation_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `school_registry_id` INT NOT NULL COMMENT '关联的学校注册ID',
    `year` INT NOT NULL COMMENT '测算年份',
    `submitter_username` VARCHAR(50) NULL COMMENT '填报单位用户名',
    `base_year` INT NULL COMMENT '基准年份',
    `full_time_total` INT DEFAULT 0 COMMENT '全日制学生总数（人）',
    `full_time_undergraduate` INT DEFAULT 0 COMMENT '全日制本科生人数',
    `full_time_specialist` INT DEFAULT 0 COMMENT '全日制专科生人数',
    `full_time_master` INT DEFAULT 0 COMMENT '全日制硕士生人数',
    `full_time_doctor` INT DEFAULT 0 COMMENT '全日制博士生人数',
    `international_total` INT DEFAULT 0 COMMENT '学历留学生总数（人）',
    `international_undergraduate` INT DEFAULT 0 COMMENT '留学生本科生人数',
    `international_master` INT DEFAULT 0 COMMENT '留学生硕士生人数',
    `international_doctor` INT DEFAULT 0 COMMENT '留学生博士生人数',
    `total_students` INT DEFAULT 0 COMMENT '学生总人数',
    
    -- 测算口径字段
    `building_area_calculation_scope` VARCHAR(100) DEFAULT '应配建筑面积' COMMENT '建筑面积测算口径',
    `population_calculation_scope` VARCHAR(100) DEFAULT '规划学生数' COMMENT '预计人口测算口径',
    `include_current_area` TINYINT(1) DEFAULT 1 COMMENT '是否包含现状建筑面积',
    `include_preliminary_area` TINYINT(1) DEFAULT 1 COMMENT '是否包含拟建成前期建筑面积',
    `include_under_construction_area` TINYINT(1) DEFAULT 1 COMMENT '是否包含拟建成在建建筑面积',
    `include_special_subsidy` TINYINT(1) DEFAULT 1 COMMENT '是否包含特殊补助面积',
    `baseline_area_composition` TEXT COMMENT '建筑面积底数构成（JSON格式）',
    
    -- 教学及辅助用房面积（按阶段）
    `teaching_area_current` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_现状',
    `teaching_area_preliminary` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_拟建成前期',
    `teaching_area_under_construction` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_拟建成在建',
    `teaching_area_planned` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_拟建成',
    `teaching_area_total` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_汇总',
    `teaching_area_required` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_测算',
    `teaching_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '教学及辅助用房面积_缺额',
    
    -- 办公用房面积（按阶段）
    `office_area_current` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_现状',
    `office_area_preliminary` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_拟建成前期',
    `office_area_under_construction` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_拟建成在建',
    `office_area_planned` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_拟建成',
    `office_area_total` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_汇总',
    `office_area_required` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_测算',
    `office_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '办公用房面积_缺额',
    
    -- 生活配套用房（按阶段）
    `total_living_area_current` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_现状',
    `total_living_area_preliminary` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_拟建成前期',
    `total_living_area_under_construction` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_拟建成在建',
    `total_living_area_planned` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_拟建成',
    `total_living_area_total` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_汇总',
    `total_living_area_required` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_测算',
    `total_living_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '生活配套用房面积_缺额',
    
    -- 生活配套用房 - 其中：学生宿舍（按阶段）
    `dormitory_area_current` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_现状',
    `dormitory_area_preliminary` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_拟建成前期',
    `dormitory_area_under_construction` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_拟建成在建',
    `dormitory_area_planned` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_拟建成',
    `dormitory_area_total` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_汇总',
    `dormitory_area_required` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_测算',
    `dormitory_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '学生宿舍面积_缺额',
    
    -- 生活配套用房 - 其中：其他生活用房（按阶段）
    `other_living_area_current` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_现状',
    `other_living_area_preliminary` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_拟建成前期',
    `other_living_area_under_construction` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_拟建成在建',
    `other_living_area_planned` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_拟建成',
    `other_living_area_total` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_汇总',
    `other_living_area_required` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_测算',
    `other_living_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '其他生活用房面积_缺额',
    
    -- 后勤辅助用房面积（按阶段）
    `logistics_area_current` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_现状',
    `logistics_area_preliminary` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_拟建成前期',
    `logistics_area_under_construction` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_拟建成在建',
    `logistics_area_planned` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_拟建成',
    `logistics_area_total` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_汇总',
    `logistics_area_required` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_测算',
    `logistics_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '后勤辅助用房面积_缺额',
    
    -- 建筑总面积（按阶段）
    `current_building_area` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_现状',
    `preliminary_building_area` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_拟建成前期',
    `under_construction_building_area` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_拟建成在建',
    `planned_building_area` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_拟建成',
    `total_building_area` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_汇总',
    `required_building_area` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_测算',
    `building_area_gap` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑总面积_缺额',
    
    -- 特殊补助和缺口汇总
    `total_area_gap_with_subsidy` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑面积总缺口（含特殊补助）',
    `total_area_gap_without_subsidy` DECIMAL(12,2) DEFAULT 0 COMMENT '建筑面积总缺口（不含特殊补助）',
    `special_subsidy_total` DECIMAL(12,2) DEFAULT 0 COMMENT '特殊补助总面积',
    `calculation_results` LONGTEXT COMMENT '计算结果详情（JSON格式）',
    `remarks` TEXT COMMENT '备注',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建计算历史特殊补助表
CREATE TABLE IF NOT EXISTS `special_subsidies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `school_info_id` INT NOT NULL COMMENT '关联的计算历史记录ID（对应calculation_history.id）',
    `subsidy_name` VARCHAR(200) NOT NULL COMMENT '补助名称',
    `subsidy_area` DECIMAL(12,2) NOT NULL COMMENT '补助面积',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (`school_info_id`) REFERENCES `calculation_history`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码（加密后）',
    `real_name` VARCHAR(100) COMMENT '真实姓名',
    `email` VARCHAR(100) COMMENT '邮箱',
    `role` ENUM('admin', 'construction_center', 'school') DEFAULT 'school' COMMENT '用户角色',
    `school_name` VARCHAR(200) NULL COMMENT '学校用户对应的学校名称',
    `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '用户状态',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `last_login` TIMESTAMP NULL COMMENT '最后登录时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建基础面积标准配置表
CREATE TABLE IF NOT EXISTS `basic_area_standards` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `school_type` VARCHAR(50) NOT NULL COMMENT '院校类型',
    `room_type` VARCHAR(100) NOT NULL COMMENT '用房类型',
    `standard_value` DECIMAL(8,2) NOT NULL COMMENT '标准值（平方米/人）',
    `description` VARCHAR(255) COMMENT '说明',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `unique_school_room_type` (`school_type`, `room_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建补贴面积标准配置表（三重索引结构）
CREATE TABLE IF NOT EXISTS `subsidized_area_standards` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `school_type` VARCHAR(50) NOT NULL COMMENT '院校类型',
    `room_type` VARCHAR(50) NOT NULL COMMENT '用房类型',
    `subsidy_type` VARCHAR(50) NOT NULL COMMENT '补贴类型',
    `standard_value` DECIMAL(8,2) NOT NULL COMMENT '标准值（平方米/人）',
    `description` VARCHAR(255) COMMENT '说明',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY `unique_school_room_subsidy` (`school_type`, `room_type`, `subsidy_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 创建基础建筑面积底数表
-- =====================================================
CREATE TABLE IF NOT EXISTS `baseline_building_areas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID（主键）',
    `school_name` VARCHAR(255) NOT NULL COMMENT '学校名称',
    `school_registry_id` INT NOT NULL COMMENT '关联学校注册表ID',
    `submitter_username` VARCHAR(50) NULL COMMENT '提交人用户名',
    `data_source` VARCHAR(200) NULL COMMENT '数据来源说明',
    
    -- 现状建筑面积
    `current_teaching_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '教学及辅助用房面积(㎡)_现状',
    `current_office_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '办公用房面积(㎡)_现状',
    `current_logistics_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '后勤辅助用房面积(㎡)_现状',
    `current_living_total_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '生活配套用房面积(㎡)_现状',
    `current_dormitory_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其中：学生宿舍面积(㎡)_现状',
    `current_other_living_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其中：其他生活用房面积(㎡)_现状',
    `current_total_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '建筑总面积(㎡)_现状',
    
    -- 拟建成_前期
    `planned_teaching_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '教学及辅助用房面积(㎡)_拟建成前期',
    `planned_office_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '办公用房面积(㎡)_拟建成前期',
    `planned_logistics_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '后勤辅助用房面积(㎡)_拟建成前期',
    `planned_living_total_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '生活配套用房面积(㎡)_拟建成前期',
    `planned_dormitory_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其中：学生宿舍面积(㎡)_拟建成前期',
    `planned_other_living_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其中：其他生活用房面积(㎡)_拟建成前期',
    `planned_total_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '建筑总面积(㎡)_拟建成前期',
    
    -- 拟建成_在建
    `under_construction_teaching_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '教学及辅助用房面积(㎡)_拟建成在建',
    `under_construction_office_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '办公用房面积(㎡)_拟建成在建',
    `under_construction_logistics_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '后勤辅助用房面积(㎡)_拟建成在建',
    `under_construction_living_total_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '生活配套用房面积(㎡)_拟建成在建',
    `under_construction_dormitory_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其中：学生宿舍面积(㎡)_拟建成在建',
    `under_construction_other_living_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其中：其他生活用房面积(㎡)_拟建成在建',
    `under_construction_total_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '建筑总面积(㎡)_拟建成在建',
    
    `remarks` TEXT NULL COMMENT '备注说明',
    
    UNIQUE KEY `unique_school_submitter` (`school_name`, `submitter_username`),
    FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry`(`id`) ON DELETE CASCADE,
    INDEX `idx_baseline_school_name` (`school_name`),
    INDEX `idx_baseline_submitter` (`submitter_username`),
    INDEX `idx_baseline_school_registry` (`school_registry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='基础建筑面积底数表';

-- 基础建筑面积底数表触发器：插入时自动计算
DROP TRIGGER IF EXISTS `before_insert_baseline_areas`;
DELIMITER $$
CREATE TRIGGER `before_insert_baseline_areas`
BEFORE INSERT ON `baseline_building_areas`
FOR EACH ROW
BEGIN
    SET NEW.current_other_living_area = NEW.current_living_total_area - NEW.current_dormitory_area;
    SET NEW.planned_other_living_area = NEW.planned_living_total_area - NEW.planned_dormitory_area;
    SET NEW.under_construction_other_living_area = NEW.under_construction_living_total_area - NEW.under_construction_dormitory_area;
    
    SET NEW.current_total_area = NEW.current_teaching_area + NEW.current_office_area + 
                                  NEW.current_logistics_area + NEW.current_living_total_area;
    SET NEW.planned_total_area = NEW.planned_teaching_area + NEW.planned_office_area + 
                                 NEW.planned_logistics_area + NEW.planned_living_total_area;
    SET NEW.under_construction_total_area = NEW.under_construction_teaching_area + NEW.under_construction_office_area + 
                                            NEW.under_construction_logistics_area + NEW.under_construction_living_total_area;
END$$
DELIMITER ;

-- 基础建筑面积底数表触发器：更新时自动计算
DROP TRIGGER IF EXISTS `before_update_baseline_areas`;
DELIMITER $$
CREATE TRIGGER `before_update_baseline_areas`
BEFORE UPDATE ON `baseline_building_areas`
FOR EACH ROW
BEGIN
    SET NEW.current_other_living_area = NEW.current_living_total_area - NEW.current_dormitory_area;
    SET NEW.planned_other_living_area = NEW.planned_living_total_area - NEW.planned_dormitory_area;
    SET NEW.under_construction_other_living_area = NEW.under_construction_living_total_area - NEW.under_construction_dormitory_area;
    
    SET NEW.current_total_area = NEW.current_teaching_area + NEW.current_office_area + 
                                  NEW.current_logistics_area + NEW.current_living_total_area;
    SET NEW.planned_total_area = NEW.planned_teaching_area + NEW.planned_office_area + 
                                 NEW.planned_logistics_area + NEW.planned_living_total_area;
    SET NEW.under_construction_total_area = NEW.under_construction_teaching_area + NEW.under_construction_office_area + 
                                            NEW.under_construction_logistics_area + NEW.under_construction_living_total_area;
END$$
DELIMITER ;

-- =====================================================
-- 创建特殊补助建筑面积底数表
-- =====================================================
CREATE TABLE IF NOT EXISTS `special_subsidy_baseline_areas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID（主键）',
    `school_name` VARCHAR(255) NOT NULL COMMENT '学校名称',
    `school_registry_id` INT NOT NULL COMMENT '关联学校注册表ID',
    `submitter_username` VARCHAR(50) NULL COMMENT '提交人用户名',
    `data_source` VARCHAR(200) NULL COMMENT '数据来源说明',
    `data_source_date` DATE NULL COMMENT '数据统计截止日期',
    `subsidy_name` VARCHAR(200) NOT NULL COMMENT '特殊补助名称',
    `subsidy_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '特殊补助面积(㎡)',
    `remarks` TEXT NULL COMMENT '补助说明/备注',
    
    UNIQUE KEY `unique_school_subsidy_submitter` (`school_name`, `subsidy_name`, `submitter_username`),
    FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry`(`id`) ON DELETE CASCADE,
    INDEX `idx_special_subsidy_school_name` (`school_name`),
    INDEX `idx_special_subsidy_name` (`subsidy_name`),
    INDEX `idx_special_subsidy_submitter` (`submitter_username`),
    INDEX `idx_special_subsidy_school_registry` (`school_registry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='特殊补助建筑面积底数表';

-- =====================================================
-- 创建学生数数据来源表
-- =====================================================
CREATE TABLE IF NOT EXISTS `student_data_sources` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '数据来源ID（主键）',
    `data_source` VARCHAR(100) NOT NULL UNIQUE COMMENT '数据来源名称',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生数数据来源表';

-- 插入预定义的数据来源
INSERT IGNORE INTO `student_data_sources` (`data_source`) VALUES
('高校基础表（2025）'),
('高校基础表（2026）'),
('上级部门核定（待核定）'),
('上级部门核定（已核定）'),
('学校自供'),
('抄告规模（十四五）'),
('抄告规模（十五五）');

-- =====================================================
-- 创建规划学生数表
-- =====================================================
-- 创建规划学生数表
-- =====================================================
CREATE TABLE IF NOT EXISTS `planned_student_numbers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID（主键）',
    `school_name` VARCHAR(255) NOT NULL COMMENT '学校名称',
    `year` INT NOT NULL COMMENT '规划年份',
    `school_registry_id` INT NOT NULL COMMENT '学校注册表ID',
    `submitter_username` VARCHAR(50) DEFAULT NULL COMMENT '提交人用户名',
    `calculation_criteria` VARCHAR(100) DEFAULT NULL COMMENT '测算口径',
    
    -- 全日制学生数
    `full_time_total` INT DEFAULT 0 COMMENT '全日制学生总数（人）',
    `full_time_specialist` INT DEFAULT 0 COMMENT '专科全日制学生总数（人）',
    `full_time_undergraduate` INT DEFAULT 0 COMMENT '本科全日制学生总数（人）',
    `full_time_master` INT DEFAULT 0 COMMENT '硕士全日制学生总数（人）',
    `full_time_doctor` INT DEFAULT 0 COMMENT '博士全日制学生总数（人）',
    
    -- 学历留学生数
    `international_total` INT DEFAULT 0 COMMENT '学历留学生总数（人）',
    `international_undergraduate` INT DEFAULT 0 COMMENT '学历本科留学生数（人）',
    `international_master` INT DEFAULT 0 COMMENT '学历硕士留学生数（人）',
    `international_doctor` INT DEFAULT 0 COMMENT '学历博士留学生数（人）',
    
    -- 学生总数
    `student_grand_total` INT DEFAULT 0 COMMENT '学生总人数（人）',
    
    -- 时间戳
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY `unique_user_school_year_criteria` (`submitter_username`, `school_name`, `year`, `calculation_criteria`),
    FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry`(`id`) ON DELETE CASCADE,
    INDEX `idx_planned_students_school_name` (`school_name`),
    INDEX `idx_planned_students_year` (`year`),
    INDEX `idx_planned_students_submitter` (`submitter_username`),
    INDEX `idx_planned_students_school_year` (`school_registry_id`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='规划学生数表';

-- 规划学生数表触发器：插入时自动计算
DROP TRIGGER IF EXISTS `before_insert_planned_students`;
DELIMITER $$
CREATE TRIGGER `before_insert_planned_students`
BEFORE INSERT ON `planned_student_numbers`
FOR EACH ROW
BEGIN
    SET NEW.full_time_total = COALESCE(NEW.full_time_specialist, 0) + 
                              COALESCE(NEW.full_time_undergraduate, 0) + 
                              COALESCE(NEW.full_time_master, 0) + 
                              COALESCE(NEW.full_time_doctor, 0);
    
    SET NEW.international_total = COALESCE(NEW.international_undergraduate, 0) + 
                                  COALESCE(NEW.international_master, 0) + 
                                  COALESCE(NEW.international_doctor, 0);
    
    SET NEW.student_grand_total = NEW.full_time_total + NEW.international_total;
END$$
DELIMITER ;

-- 规划学生数表触发器：更新时自动计算
DROP TRIGGER IF EXISTS `before_update_planned_students`;
DELIMITER $$
CREATE TRIGGER `before_update_planned_students`
BEFORE UPDATE ON `planned_student_numbers`
FOR EACH ROW
BEGIN
    SET NEW.full_time_total = COALESCE(NEW.full_time_specialist, 0) + 
                              COALESCE(NEW.full_time_undergraduate, 0) + 
                              COALESCE(NEW.full_time_master, 0) + 
                              COALESCE(NEW.full_time_doctor, 0);
    
    SET NEW.international_total = COALESCE(NEW.international_undergraduate, 0) + 
                                  COALESCE(NEW.international_master, 0) + 
                                  COALESCE(NEW.international_doctor, 0);
    
    SET NEW.student_grand_total = NEW.full_time_total + NEW.international_total;
END$$
DELIMITER ;

-- =====================================================
-- 创建现状面积预设表
-- =====================================================
CREATE TABLE IF NOT EXISTS `current_area_presets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID（主键）',
    `school_registry_id` INT NOT NULL COMMENT '关联学校注册表ID',
    `data_source` VARCHAR(200) NOT NULL COMMENT '数据来源说明（必填，用于区分同一学校的不同数据源）',
    `teaching_area_current` DECIMAL(12,2) DEFAULT 0.00 COMMENT '教学及辅助用房面积_现状（㎡）',
    `office_area_current` DECIMAL(12,2) DEFAULT 0.00 COMMENT '办公用房面积_现状（㎡）',
    `total_living_area_current` DECIMAL(12,2) DEFAULT 0.00 COMMENT '生活配套用房面积_现状（㎡）',
    `dormitory_area_current` DECIMAL(12,2) DEFAULT 0.00 COMMENT '学生宿舍面积_现状（㎡）',
    `other_living_area_current` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其他生活用房面积_现状（㎡）',
    `logistics_area_current` DECIMAL(12,2) DEFAULT 0.00 COMMENT '后勤辅助用房面积_现状（㎡）',
    `current_building_area` DECIMAL(12,2) DEFAULT 0.00 COMMENT '建筑总面积_现状（㎡）',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY `unique_school_data_source` (`school_registry_id`, `data_source`),
    FOREIGN KEY (`school_registry_id`) REFERENCES `school_registry`(`id`) ON DELETE CASCADE,
    INDEX `idx_current_area_presets_school` (`school_registry_id`),
    INDEX `idx_current_area_presets_source` (`data_source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='现状面积预设表（支持同一学校的多个数据来源）';

-- 现状面积预设表触发器：插入时自动计算
DROP TRIGGER IF EXISTS `before_insert_current_area_presets`;
DELIMITER $$
CREATE TRIGGER `before_insert_current_area_presets`
BEFORE INSERT ON `current_area_presets`
FOR EACH ROW
BEGIN
    -- 自动计算其他生活用房面积
    SET NEW.other_living_area_current = NEW.total_living_area_current - NEW.dormitory_area_current;
    
    -- 自动计算建筑总面积
    SET NEW.current_building_area = NEW.teaching_area_current + NEW.office_area_current + 
                                     NEW.logistics_area_current + NEW.total_living_area_current;
END$$
DELIMITER ;

-- 现状面积预设表触发器：更新时自动计算
DROP TRIGGER IF EXISTS `before_update_current_area_presets`;
DELIMITER $$
CREATE TRIGGER `before_update_current_area_presets`
BEFORE UPDATE ON `current_area_presets`
FOR EACH ROW
BEGIN
    -- 自动计算其他生活用房面积
    SET NEW.other_living_area_current = NEW.total_living_area_current - NEW.dormitory_area_current;
    
    -- 自动计算建筑总面积
    SET NEW.current_building_area = NEW.teaching_area_current + NEW.office_area_current + 
                                     NEW.logistics_area_current + NEW.total_living_area_current;
END$$
DELIMITER ;

-- 创建索引以提高查询性能
CREATE INDEX `idx_school_registry_name` ON `school_registry`(`school_name`);
CREATE INDEX `idx_school_registry_type` ON `school_registry`(`school_type`);
CREATE INDEX `idx_calculation_history_school_id` ON `calculation_history`(`school_registry_id`);
CREATE INDEX `idx_calculation_history_year` ON `calculation_history`(`year`);
CREATE INDEX `idx_calculation_history_submitter` ON `calculation_history`(`submitter_username`);
CREATE INDEX `idx_calculation_history_school_year` ON `calculation_history`(`school_registry_id`, `year`);
CREATE INDEX `idx_special_subsidies_calc_history_id` ON `special_subsidies`(`school_info_id`);
-- 注意: username字段已经有UNIQUE约束，无需额外创建索引
CREATE INDEX `idx_users_role` ON `users`(`role`);
CREATE INDEX `idx_basic_area_standards_room_type` ON `basic_area_standards`(`room_type`);
CREATE INDEX `idx_subsidized_area_standards_school_type` ON `subsidized_area_standards`(`school_type`);
CREATE INDEX `idx_subsidized_area_standards_room_type` ON `subsidized_area_standards`(`room_type`);
CREATE INDEX `idx_subsidized_area_standards_subsidy_type` ON `subsidized_area_standards`(`subsidy_type`);

-- 创建默认管理员账户
-- 用户名: admin, 密码: admin123456 (请在生产环境中修改)
-- 加密后的密码hash值对应 "admin123456"
INSERT IGNORE INTO `users` (`username`, `password`, `real_name`, `role`, `status`) VALUES 
('admin', '$2b$10$eBpq4jsfIMlKK5KrOYAx8ucE2GZeTZoQzcoyx3UMS6sV0r8ach5i2', '系统管理员', 'admin', 'active');

-- 插入基础面积标准数据（按院校类型分类）
INSERT IGNORE INTO `basic_area_standards` (`school_type`, `room_type`, `standard_value`, `description`) VALUES
-- 综合院校
('综合院校', '教学及辅助用房', 12.95, '综合院校教学及辅助用房基础标准'),
('综合院校', '办公用房', 2.00, '综合院校办公用房基础标准'),
('综合院校', '学生宿舍', 10.00, '综合院校学生宿舍基础标准'),
('综合院校', '其他生活用房', 2.00, '综合院校其他生活用房基础标准'),
('综合院校', '后勤辅助用房', 1.55, '综合院校后勤辅助用房基础标准'),
-- 师范院校
('师范院校', '教学及辅助用房', 12.95, '师范院校教学及辅助用房基础标准'),
('师范院校', '办公用房', 2.00, '师范院校办公用房基础标准'),
('师范院校', '学生宿舍', 10.00, '师范院校学生宿舍基础标准'),
('师范院校', '其他生活用房', 2.00, '师范院校其他生活用房基础标准'),
('师范院校', '后勤辅助用房', 1.55, '师范院校后勤辅助用房基础标准'),
-- 理工院校
('理工院校', '教学及辅助用房', 15.95, '理工院校教学及辅助用房基础标准'),
('理工院校', '办公用房', 2.00, '理工院校办公用房基础标准'),
('理工院校', '学生宿舍', 10.00, '理工院校学生宿舍基础标准'),
('理工院校', '其他生活用房', 2.00, '理工院校其他生活用房基础标准'),
('理工院校', '后勤辅助用房', 1.55, '理工院校后勤辅助用房基础标准'),
-- 医药院校
('医药院校', '教学及辅助用房', 15.95, '医药院校教学及辅助用房基础标准'),
('医药院校', '办公用房', 2.00, '医药院校办公用房基础标准'),
('医药院校', '学生宿舍', 10.00, '医药院校学生宿舍基础标准'),
('医药院校', '其他生活用房', 2.00, '医药院校其他生活用房基础标准'),
('医药院校', '后勤辅助用房', 1.55, '医药院校后勤辅助用房基础标准'),
-- 农业院校
('农业院校', '教学及辅助用房', 15.95, '农业院校教学及辅助用房基础标准'),
('农业院校', '办公用房', 2.00, '农业院校办公用房基础标准'),
('农业院校', '学生宿舍', 10.00, '农业院校学生宿舍基础标准'),
('农业院校', '其他生活用房', 2.00, '农业院校其他生活用房基础标准'),
('农业院校', '后勤辅助用房', 1.55, '农业院校后勤辅助用房基础标准'),
-- 政法院校
('政法院校', '教学及辅助用房', 7.95, '政法院校教学及辅助用房基础标准'),
('政法院校', '办公用房', 2.00, '政法院校办公用房基础标准'),
('政法院校', '学生宿舍', 10.00, '政法院校学生宿舍基础标准'),
('政法院校', '其他生活用房', 2.00, '政法院校其他生活用房基础标准'),
('政法院校', '后勤辅助用房', 1.55, '政法院校后勤辅助用房基础标准'),
-- 财经院校
('财经院校', '教学及辅助用房', 7.95, '财经院校教学及辅助用房基础标准'),
('财经院校', '办公用房', 2.00, '财经院校办公用房基础标准'),
('财经院校', '学生宿舍', 10.00, '财经院校学生宿舍基础标准'),
('财经院校', '其他生活用房', 2.00, '财经院校其他生活用房基础标准'),
('财经院校', '后勤辅助用房', 1.55, '财经院校后勤辅助用房基础标准'),
-- 体育院校
('体育院校', '教学及辅助用房', 22.00, '体育院校教学及辅助用房基础标准'),
('体育院校', '办公用房', 2.20, '体育院校办公用房基础标准'),
('体育院校', '学生宿舍', 10.00, '体育院校学生宿舍基础标准'),
('体育院校', '其他生活用房', 2.00, '体育院校其他生活用房基础标准'),
('体育院校', '后勤辅助用房', 1.80, '体育院校后勤辅助用房基础标准'),
-- 艺术院校
('艺术院校', '教学及辅助用房', 53.50, '艺术院校教学及辅助用房基础标准'),
('艺术院校', '办公用房', 3.50, '艺术院校办公用房基础标准'),
('艺术院校', '学生宿舍', 10.50, '艺术院校学生宿舍基础标准'),
('艺术院校', '其他生活用房', 2.00, '艺术院校其他生活用房基础标准'),
('艺术院校', '后勤辅助用房', 2.00, '艺术院校后勤辅助用房基础标准'),
-- 外语院校
('外语院校', '教学及辅助用房', 0.00, '外语院校教学及辅助用房基础标准'),
('外语院校', '办公用房', 0.00, '外语院校办公用房基础标准'),
('外语院校', '学生宿舍', 0.00, '外语院校学生宿舍基础标准'),
('外语院校', '其他生活用房', 0.00, '外语院校其他生活用房基础标准'),
('外语院校', '后勤辅助用房', 0.00, '外语院校后勤辅助用房基础标准');

-- 插入补贴面积标准数据（三重索引结构）
INSERT IGNORE INTO `subsidized_area_standards` (`school_type`, `room_type`, `subsidy_type`, `standard_value`, `description`) VALUES
-- 综合院校补贴标准
('综合院校', '教学及辅助用房', '全日制硕士', 3.00, '综合院校全日制硕士生教学及辅助用房补贴'),
('综合院校', '教学及辅助用房', '全日制博士', 3.00, '综合院校全日制博士生教学及辅助用房补贴'),
('综合院校', '教学及辅助用房', '留学生', 0.00, '综合院校留学生教学及辅助用房补贴'),
('综合院校', '教学及辅助用房', '留学生硕士', 3.00, '综合院校留学生硕士生教学及辅助用房补贴'),
('综合院校', '教学及辅助用房', '留学生博士', 3.00, '综合院校留学生博士生教学及辅助用房补贴'),
('综合院校', '办公用房', '全日制硕士', 2.00, '综合院校全日制硕士生办公用房补贴'),
('综合院校', '办公用房', '全日制博士', 2.00, '综合院校全日制博士生办公用房补贴'),
('综合院校', '办公用房', '留学生', 0.00, '综合院校留学生办公用房补贴'),
('综合院校', '办公用房', '留学生硕士', 2.00, '综合院校留学生硕士生办公用房补贴'),
('综合院校', '办公用房', '留学生博士', 2.00, '综合院校留学生博士生办公用房补贴'),
('综合院校', '学生宿舍', '全日制硕士', 5.00, '综合院校全日制硕士生宿舍补贴'),
('综合院校', '学生宿舍', '全日制博士', 14.00, '综合院校全日制博士生宿舍补贴'),
('综合院校', '学生宿舍', '留学生', 0.00, '综合院校留学生宿舍补贴'),
('综合院校', '学生宿舍', '留学生硕士', 5.00, '综合院校留学生硕士生宿舍补贴'),
('综合院校', '学生宿舍', '留学生博士', 14.00, '综合院校留学生博士生宿舍补贴'),
('综合院校', '其他生活用房', '全日制硕士', 0.00, '综合院校全日制硕士生其他生活用房补贴'),
('综合院校', '其他生活用房', '全日制博士', 0.00, '综合院校全日制博士生其他生活用房补贴'),
('综合院校', '其他生活用房', '留学生', 19.00, '综合院校留学生其他生活用房补贴'),
('综合院校', '其他生活用房', '留学生硕士', 0.00, '综合院校留学生硕士生其他生活用房补贴'),
('综合院校', '其他生活用房', '留学生博士', 0.00, '综合院校留学生博士生其他生活用房补贴'),
('综合院校', '后勤辅助用房', '全日制硕士', 0.00, '综合院校全日制硕士生后勤辅助用房补贴'),
('综合院校', '后勤辅助用房', '全日制博士', 0.00, '综合院校全日制博士生后勤辅助用房补贴'),
('综合院校', '后勤辅助用房', '留学生', 0.00, '综合院校留学生后勤辅助用房补贴'),
('综合院校', '后勤辅助用房', '留学生硕士', 0.00, '综合院校留学生硕士生后勤辅助用房补贴'),
('综合院校', '后勤辅助用房', '留学生博士', 0.00, '综合院校留学生博士生后勤辅助用房补贴'),
-- 师范院校补贴标准
('师范院校', '教学及辅助用房', '全日制硕士', 3.00, '师范院校全日制硕士生教学及辅助用房补贴'),
('师范院校', '教学及辅助用房', '全日制博士', 3.00, '师范院校全日制博士生教学及辅助用房补贴'),
('师范院校', '教学及辅助用房', '留学生', 0.00, '师范院校留学生教学及辅助用房补贴'),
('师范院校', '教学及辅助用房', '留学生硕士', 3.00, '师范院校留学生硕士生教学及辅助用房补贴'),
('师范院校', '教学及辅助用房', '留学生博士', 3.00, '师范院校留学生博士生教学及辅助用房补贴'),
('师范院校', '办公用房', '全日制硕士', 2.00, '师范院校全日制硕士生办公用房补贴'),
('师范院校', '办公用房', '全日制博士', 2.00, '师范院校全日制博士生办公用房补贴'),
('师范院校', '办公用房', '留学生', 0.00, '师范院校留学生办公用房补贴'),
('师范院校', '办公用房', '留学生硕士', 2.00, '师范院校留学生硕士生办公用房补贴'),
('师范院校', '办公用房', '留学生博士', 2.00, '师范院校留学生博士生办公用房补贴'),
('师范院校', '学生宿舍', '全日制硕士', 5.00, '师范院校全日制硕士生宿舍补贴'),
('师范院校', '学生宿舍', '全日制博士', 14.00, '师范院校全日制博士生宿舍补贴'),
('师范院校', '学生宿舍', '留学生', 0.00, '师范院校留学生宿舍补贴'),
('师范院校', '学生宿舍', '留学生硕士', 5.00, '师范院校留学生硕士生宿舍补贴'),
('师范院校', '学生宿舍', '留学生博士', 14.00, '师范院校留学生博士生宿舍补贴'),
('师范院校', '其他生活用房', '全日制硕士', 0.00, '师范院校全日制硕士生其他生活用房补贴'),
('师范院校', '其他生活用房', '全日制博士', 0.00, '师范院校全日制博士生其他生活用房补贴'),
('师范院校', '其他生活用房', '留学生', 19.00, '师范院校留学生其他生活用房补贴'),
('师范院校', '其他生活用房', '留学生硕士', 0.00, '师范院校留学生硕士生其他生活用房补贴'),
('师范院校', '其他生活用房', '留学生博士', 0.00, '师范院校留学生博士生其他生活用房补贴'),
('师范院校', '后勤辅助用房', '全日制硕士', 0.00, '师范院校全日制硕士生后勤辅助用房补贴'),
('师范院校', '后勤辅助用房', '全日制博士', 0.00, '师范院校全日制博士生后勤辅助用房补贴'),
('师范院校', '后勤辅助用房', '留学生', 0.00, '师范院校留学生后勤辅助用房补贴'),
('师范院校', '后勤辅助用房', '留学生硕士', 0.00, '师范院校留学生硕士生后勤辅助用房补贴'),
('师范院校', '后勤辅助用房', '留学生博士', 0.00, '师范院校留学生博士生后勤辅助用房补贴'),
-- 理工院校补贴标准  
('理工院校', '教学及辅助用房', '全日制硕士', 3.00, '理工院校全日制硕士生教学及辅助用房补贴'),
('理工院校', '教学及辅助用房', '全日制博士', 3.00, '理工院校全日制博士生教学及辅助用房补贴'),
('理工院校', '教学及辅助用房', '留学生', 0.00, '理工院校留学生教学及辅助用房补贴'),
('理工院校', '教学及辅助用房', '留学生硕士', 3.00, '理工院校留学生硕士生教学及辅助用房补贴'),
('理工院校', '教学及辅助用房', '留学生博士', 3.00, '理工院校留学生博士生教学及辅助用房补贴'),
('理工院校', '办公用房', '全日制硕士', 2.00, '理工院校全日制硕士生办公用房补贴'),
('理工院校', '办公用房', '全日制博士', 2.00, '理工院校全日制博士生办公用房补贴'),
('理工院校', '办公用房', '留学生', 0.00, '理工院校留学生办公用房补贴'),
('理工院校', '办公用房', '留学生硕士', 2.00, '理工院校留学生硕士生办公用房补贴'),
('理工院校', '办公用房', '留学生博士', 2.00, '理工院校留学生博士生办公用房补贴'),
('理工院校', '学生宿舍', '全日制硕士', 5.00, '理工院校全日制硕士生宿舍补贴'),
('理工院校', '学生宿舍', '全日制博士', 14.00, '理工院校全日制博士生宿舍补贴'),
('理工院校', '学生宿舍', '留学生', 0.00, '理工院校留学生宿舍补贴'),
('理工院校', '学生宿舍', '留学生硕士', 5.00, '理工院校留学生硕士生宿舍补贴'),
('理工院校', '学生宿舍', '留学生博士', 14.00, '理工院校留学生博士生宿舍补贴'),
('理工院校', '其他生活用房', '全日制硕士', 0.00, '理工院校全日制硕士生其他生活用房补贴'),
('理工院校', '其他生活用房', '全日制博士', 0.00, '理工院校全日制博士生其他生活用房补贴'),
('理工院校', '其他生活用房', '留学生', 19.00, '理工院校留学生其他生活用房补贴'),
('理工院校', '其他生活用房', '留学生硕士', 0.00, '理工院校留学生硕士生其他生活用房补贴'),
('理工院校', '其他生活用房', '留学生博士', 0.00, '理工院校留学生博士生其他生活用房补贴'),
('理工院校', '后勤辅助用房', '全日制硕士', 0.00, '理工院校全日制硕士生后勤辅助用房补贴'),
('理工院校', '后勤辅助用房', '全日制博士', 0.00, '理工院校全日制博士生后勤辅助用房补贴'),
('理工院校', '后勤辅助用房', '留学生', 0.00, '理工院校留学生后勤辅助用房补贴'),
('理工院校', '后勤辅助用房', '留学生硕士', 0.00, '理工院校留学生硕士生后勤辅助用房补贴'),
('理工院校', '后勤辅助用房', '留学生博士', 0.00, '理工院校留学生博士生后勤辅助用房补贴'),
-- 医药院校补贴标准
('医药院校', '教学及辅助用房', '全日制硕士', 3.00, '医药院校全日制硕士生教学及辅助用房补贴'),
('医药院校', '教学及辅助用房', '全日制博士', 3.00, '医药院校全日制博士生教学及辅助用房补贴'),
('医药院校', '教学及辅助用房', '留学生', 0.00, '医药院校留学生教学及辅助用房补贴'),
('医药院校', '教学及辅助用房', '留学生硕士', 3.00, '医药院校留学生硕士生教学及辅助用房补贴'),
('医药院校', '教学及辅助用房', '留学生博士', 3.00, '医药院校留学生博士生教学及辅助用房补贴'),
('医药院校', '办公用房', '全日制硕士', 2.00, '医药院校全日制硕士生办公用房补贴'),
('医药院校', '办公用房', '全日制博士', 2.00, '医药院校全日制博士生办公用房补贴'),
('医药院校', '办公用房', '留学生', 0.00, '医药院校留学生办公用房补贴'),
('医药院校', '办公用房', '留学生硕士', 2.00, '医药院校留学生硕士生办公用房补贴'),
('医药院校', '办公用房', '留学生博士', 2.00, '医药院校留学生博士生办公用房补贴'),
('医药院校', '学生宿舍', '全日制硕士', 5.00, '医药院校全日制硕士生宿舍补贴'),
('医药院校', '学生宿舍', '全日制博士', 14.00, '医药院校全日制博士生宿舍补贴'),
('医药院校', '学生宿舍', '留学生', 0.00, '医药院校留学生宿舍补贴'),
('医药院校', '学生宿舍', '留学生硕士', 5.00, '医药院校留学生硕士生宿舍补贴'),
('医药院校', '学生宿舍', '留学生博士', 14.00, '医药院校留学生博士生宿舍补贴'),
('医药院校', '其他生活用房', '全日制硕士', 0.00, '医药院校全日制硕士生其他生活用房补贴'),
('医药院校', '其他生活用房', '全日制博士', 0.00, '医药院校全日制博士生其他生活用房补贴'),
('医药院校', '其他生活用房', '留学生', 19.00, '医药院校留学生其他生活用房补贴'),
('医药院校', '其他生活用房', '留学生硕士', 0.00, '医药院校留学生硕士生其他生活用房补贴'),
('医药院校', '其他生活用房', '留学生博士', 0.00, '医药院校留学生博士生其他生活用房补贴'),
('医药院校', '后勤辅助用房', '全日制硕士', 0.00, '医药院校全日制硕士生后勤辅助用房补贴'),
('医药院校', '后勤辅助用房', '全日制博士', 0.00, '医药院校全日制博士生后勤辅助用房补贴'),
('医药院校', '后勤辅助用房', '留学生', 0.00, '医药院校留学生后勤辅助用房补贴'),
('医药院校', '后勤辅助用房', '留学生硕士', 0.00, '医药院校留学生硕士生后勤辅助用房补贴'),
('医药院校', '后勤辅助用房', '留学生博士', 0.00, '医药院校留学生博士生后勤辅助用房补贴'),
-- 农业院校补贴标准
('农业院校', '教学及辅助用房', '全日制硕士', 3.00, '农业院校全日制硕士生教学及辅助用房补贴'),
('农业院校', '教学及辅助用房', '全日制博士', 3.00, '农业院校全日制博士生教学及辅助用房补贴'),
('农业院校', '教学及辅助用房', '留学生', 0.00, '农业院校留学生教学及辅助用房补贴'),
('农业院校', '教学及辅助用房', '留学生硕士', 3.00, '农业院校留学生硕士生教学及辅助用房补贴'),
('农业院校', '教学及辅助用房', '留学生博士', 3.00, '农业院校留学生博士生教学及辅助用房补贴'),
('农业院校', '办公用房', '全日制硕士', 2.00, '农业院校全日制硕士生办公用房补贴'),
('农业院校', '办公用房', '全日制博士', 2.00, '农业院校全日制博士生办公用房补贴'),
('农业院校', '办公用房', '留学生', 0.00, '农业院校留学生办公用房补贴'),
('农业院校', '办公用房', '留学生硕士', 2.00, '农业院校留学生硕士生办公用房补贴'),
('农业院校', '办公用房', '留学生博士', 2.00, '农业院校留学生博士生办公用房补贴'),
('农业院校', '学生宿舍', '全日制硕士', 5.00, '农业院校全日制硕士生宿舍补贴'),
('农业院校', '学生宿舍', '全日制博士', 14.00, '农业院校全日制博士生宿舍补贴'),
('农业院校', '学生宿舍', '留学生', 0.00, '农业院校留学生宿舍补贴'),
('农业院校', '学生宿舍', '留学生硕士', 5.00, '农业院校留学生硕士生宿舍补贴'),
('农业院校', '学生宿舍', '留学生博士', 14.00, '农业院校留学生博士生宿舍补贴'),
('农业院校', '其他生活用房', '全日制硕士', 0.00, '农业院校全日制硕士生其他生活用房补贴'),
('农业院校', '其他生活用房', '全日制博士', 0.00, '农业院校全日制博士生其他生活用房补贴'),
('农业院校', '其他生活用房', '留学生', 19.00, '农业院校留学生其他生活用房补贴'),
('农业院校', '其他生活用房', '留学生硕士', 0.00, '农业院校留学生硕士生其他生活用房补贴'),
('农业院校', '其他生活用房', '留学生博士', 0.00, '农业院校留学生博士生其他生活用房补贴'),
('农业院校', '后勤辅助用房', '全日制硕士', 0.00, '农业院校全日制硕士生后勤辅助用房补贴'),
('农业院校', '后勤辅助用房', '全日制博士', 0.00, '农业院校全日制博士生后勤辅助用房补贴'),
('农业院校', '后勤辅助用房', '留学生', 0.00, '农业院校留学生后勤辅助用房补贴'),
('农业院校', '后勤辅助用房', '留学生硕士', 0.00, '农业院校留学生硕士生后勤辅助用房补贴'),
('农业院校', '后勤辅助用房', '留学生博士', 0.00, '农业院校留学生博士生后勤辅助用房补贴'),
-- 政法院校补贴标准
('政法院校', '教学及辅助用房', '全日制硕士', 3.00, '政法院校全日制硕士生教学及辅助用房补贴'),
('政法院校', '教学及辅助用房', '全日制博士', 3.00, '政法院校全日制博士生教学及辅助用房补贴'),
('政法院校', '教学及辅助用房', '留学生', 0.00, '政法院校留学生教学及辅助用房补贴'),
('政法院校', '教学及辅助用房', '留学生硕士', 3.00, '政法院校留学生硕士生教学及辅助用房补贴'),
('政法院校', '教学及辅助用房', '留学生博士', 3.00, '政法院校留学生博士生教学及辅助用房补贴'),
('政法院校', '办公用房', '全日制硕士', 2.00, '政法院校全日制硕士生办公用房补贴'),
('政法院校', '办公用房', '全日制博士', 2.00, '政法院校全日制博士生办公用房补贴'),
('政法院校', '办公用房', '留学生', 0.00, '政法院校留学生办公用房补贴'),
('政法院校', '办公用房', '留学生硕士', 2.00, '政法院校留学生硕士生办公用房补贴'),
('政法院校', '办公用房', '留学生博士', 2.00, '政法院校留学生博士生办公用房补贴'),
('政法院校', '学生宿舍', '全日制硕士', 5.00, '政法院校全日制硕士生宿舍补贴'),
('政法院校', '学生宿舍', '全日制博士', 14.00, '政法院校全日制博士生宿舍补贴'),
('政法院校', '学生宿舍', '留学生', 0.00, '政法院校留学生宿舍补贴'),
('政法院校', '学生宿舍', '留学生硕士', 5.00, '政法院校留学生硕士生宿舍补贴'),
('政法院校', '学生宿舍', '留学生博士', 14.00, '政法院校留学生博士生宿舍补贴'),
('政法院校', '其他生活用房', '全日制硕士', 0.00, '政法院校全日制硕士生其他生活用房补贴'),
('政法院校', '其他生活用房', '全日制博士', 0.00, '政法院校全日制博士生其他生活用房补贴'),
('政法院校', '其他生活用房', '留学生', 19.00, '政法院校留学生其他生活用房补贴'),
('政法院校', '其他生活用房', '留学生硕士', 0.00, '政法院校留学生硕士生其他生活用房补贴'),
('政法院校', '其他生活用房', '留学生博士', 0.00, '政法院校留学生博士生其他生活用房补贴'),
('政法院校', '后勤辅助用房', '全日制硕士', 0.00, '政法院校全日制硕士生后勤辅助用房补贴'),
('政法院校', '后勤辅助用房', '全日制博士', 0.00, '政法院校全日制博士生后勤辅助用房补贴'),
('政法院校', '后勤辅助用房', '留学生', 0.00, '政法院校留学生后勤辅助用房补贴'),
('政法院校', '后勤辅助用房', '留学生硕士', 0.00, '政法院校留学生硕士生后勤辅助用房补贴'),
('政法院校', '后勤辅助用房', '留学生博士', 0.00, '政法院校留学生博士生后勤辅助用房补贴'),
-- 财经院校补贴标准
('财经院校', '教学及辅助用房', '全日制硕士', 3.00, '财经院校全日制硕士生教学及辅助用房补贴'),
('财经院校', '教学及辅助用房', '全日制博士', 3.00, '财经院校全日制博士生教学及辅助用房补贴'),
('财经院校', '教学及辅助用房', '留学生', 0.00, '财经院校留学生教学及辅助用房补贴'),
('财经院校', '教学及辅助用房', '留学生硕士', 3.00, '财经院校留学生硕士生教学及辅助用房补贴'),
('财经院校', '教学及辅助用房', '留学生博士', 3.00, '财经院校留学生博士生教学及辅助用房补贴'),
('财经院校', '办公用房', '全日制硕士', 2.00, '财经院校全日制硕士生办公用房补贴'),
('财经院校', '办公用房', '全日制博士', 2.00, '财经院校全日制博士生办公用房补贴'),
('财经院校', '办公用房', '留学生', 0.00, '财经院校留学生办公用房补贴'),
('财经院校', '办公用房', '留学生硕士', 2.00, '财经院校留学生硕士生办公用房补贴'),
('财经院校', '办公用房', '留学生博士', 2.00, '财经院校留学生博士生办公用房补贴'),
('财经院校', '学生宿舍', '全日制硕士', 5.00, '财经院校全日制硕士生宿舍补贴'),
('财经院校', '学生宿舍', '全日制博士', 14.00, '财经院校全日制博士生宿舍补贴'),
('财经院校', '学生宿舍', '留学生', 0.00, '财经院校留学生宿舍补贴'),
('财经院校', '学生宿舍', '留学生硕士', 5.00, '财经院校留学生硕士生宿舍补贴'),
('财经院校', '学生宿舍', '留学生博士', 14.00, '财经院校留学生博士生宿舍补贴'),
('财经院校', '其他生活用房', '全日制硕士', 0.00, '财经院校全日制硕士生其他生活用房补贴'),
('财经院校', '其他生活用房', '全日制博士', 0.00, '财经院校全日制博士生其他生活用房补贴'),
('财经院校', '其他生活用房', '留学生', 19.00, '财经院校留学生其他生活用房补贴'),
('财经院校', '其他生活用房', '留学生硕士', 0.00, '财经院校留学生硕士生其他生活用房补贴'),
('财经院校', '其他生活用房', '留学生博士', 0.00, '财经院校留学生博士生其他生活用房补贴'),
('财经院校', '后勤辅助用房', '全日制硕士', 0.00, '财经院校全日制硕士生后勤辅助用房补贴'),
('财经院校', '后勤辅助用房', '全日制博士', 0.00, '财经院校全日制博士生后勤辅助用房补贴'),
('财经院校', '后勤辅助用房', '留学生', 0.00, '财经院校留学生后勤辅助用房补贴'),
('财经院校', '后勤辅助用房', '留学生硕士', 0.00, '财经院校留学生硕士生后勤辅助用房补贴'),
('财经院校', '后勤辅助用房', '留学生博士', 0.00, '财经院校留学生博士生后勤辅助用房补贴'),
-- 体育院校补贴标准
('体育院校', '教学及辅助用房', '全日制硕士', 3.00, '体育院校全日制硕士生教学及辅助用房补贴'),
('体育院校', '教学及辅助用房', '全日制博士', 3.00, '体育院校全日制博士生教学及辅助用房补贴'),
('体育院校', '教学及辅助用房', '留学生', 0.00, '体育院校留学生教学及辅助用房补贴'),
('体育院校', '教学及辅助用房', '留学生硕士', 3.00, '体育院校留学生硕士生教学及辅助用房补贴'),
('体育院校', '教学及辅助用房', '留学生博士', 3.00, '体育院校留学生博士生教学及辅助用房补贴'),
('体育院校', '办公用房', '全日制硕士', 2.00, '体育院校全日制硕士生办公用房补贴'),
('体育院校', '办公用房', '全日制博士', 2.00, '体育院校全日制博士生办公用房补贴'),
('体育院校', '办公用房', '留学生', 0.00, '体育院校留学生办公用房补贴'),
('体育院校', '办公用房', '留学生硕士', 2.00, '体育院校留学生硕士生办公用房补贴'),
('体育院校', '办公用房', '留学生博士', 2.00, '体育院校留学生博士生办公用房补贴'),
('体育院校', '学生宿舍', '全日制硕士', 5.00, '体育院校全日制硕士生宿舍补贴'),
('体育院校', '学生宿舍', '全日制博士', 14.00, '体育院校全日制博士生宿舍补贴'),
('体育院校', '学生宿舍', '留学生', 0.00, '体育院校留学生宿舍补贴'),
('体育院校', '学生宿舍', '留学生硕士', 5.00, '体育院校留学生硕士生宿舍补贴'),
('体育院校', '学生宿舍', '留学生博士', 14.00, '体育院校留学生博士生宿舍补贴'),
('体育院校', '其他生活用房', '全日制硕士', 0.00, '体育院校全日制硕士生其他生活用房补贴'),
('体育院校', '其他生活用房', '全日制博士', 0.00, '体育院校全日制博士生其他生活用房补贴'),
('体育院校', '其他生活用房', '留学生', 19.00, '体育院校留学生其他生活用房补贴'),
('体育院校', '其他生活用房', '留学生硕士', 0.00, '体育院校留学生硕士生其他生活用房补贴'),
('体育院校', '其他生活用房', '留学生博士', 0.00, '体育院校留学生博士生其他生活用房补贴'),
('体育院校', '后勤辅助用房', '全日制硕士', 0.00, '体育院校全日制硕士生后勤辅助用房补贴'),
('体育院校', '后勤辅助用房', '全日制博士', 0.00, '体育院校全日制博士生后勤辅助用房补贴'),
('体育院校', '后勤辅助用房', '留学生', 0.00, '体育院校留学生后勤辅助用房补贴'),
('体育院校', '后勤辅助用房', '留学生硕士', 0.00, '体育院校留学生硕士生后勤辅助用房补贴'),
('体育院校', '后勤辅助用房', '留学生博士', 0.00, '体育院校留学生博士生后勤辅助用房补贴'),
-- 艺术院校补贴标准
('艺术院校', '教学及辅助用房', '全日制硕士', 3.00, '艺术院校全日制硕士生教学及辅助用房补贴'),
('艺术院校', '教学及辅助用房', '全日制博士', 3.00, '艺术院校全日制博士生教学及辅助用房补贴'),
('艺术院校', '教学及辅助用房', '留学生', 0.00, '艺术院校留学生教学及辅助用房补贴'),
('艺术院校', '教学及辅助用房', '留学生硕士', 3.00, '艺术院校留学生硕士生教学及辅助用房补贴'),
('艺术院校', '教学及辅助用房', '留学生博士', 3.00, '艺术院校留学生博士生教学及辅助用房补贴'),
('艺术院校', '办公用房', '全日制硕士', 2.00, '艺术院校全日制硕士生办公用房补贴'),
('艺术院校', '办公用房', '全日制博士', 2.00, '艺术院校全日制博士生办公用房补贴'),
('艺术院校', '办公用房', '留学生', 0.00, '艺术院校留学生办公用房补贴'),
('艺术院校', '办公用房', '留学生硕士', 2.00, '艺术院校留学生硕士生办公用房补贴'),
('艺术院校', '办公用房', '留学生博士', 2.00, '艺术院校留学生博士生办公用房补贴'),
('艺术院校', '学生宿舍', '全日制硕士', 5.00, '艺术院校全日制硕士生宿舍补贴'),
('艺术院校', '学生宿舍', '全日制博士', 14.00, '艺术院校全日制博士生宿舍补贴'),
('艺术院校', '学生宿舍', '留学生', 0.00, '艺术院校留学生宿舍补贴'),
('艺术院校', '学生宿舍', '留学生硕士', 5.00, '艺术院校留学生硕士生宿舍补贴'),
('艺术院校', '学生宿舍', '留学生博士', 14.00, '艺术院校留学生博士生宿舍补贴'),
('艺术院校', '其他生活用房', '全日制硕士', 0.00, '艺术院校全日制硕士生其他生活用房补贴'),
('艺术院校', '其他生活用房', '全日制博士', 0.00, '艺术院校全日制博士生其他生活用房补贴'),
('艺术院校', '其他生活用房', '留学生', 19.00, '艺术院校留学生其他生活用房补贴'),
('艺术院校', '其他生活用房', '留学生硕士', 0.00, '艺术院校留学生硕士生其他生活用房补贴'),
('艺术院校', '其他生活用房', '留学生博士', 0.00, '艺术院校留学生博士生其他生活用房补贴'),
('艺术院校', '后勤辅助用房', '全日制硕士', 0.00, '艺术院校全日制硕士生后勤辅助用房补贴'),
('艺术院校', '后勤辅助用房', '全日制博士', 0.00, '艺术院校全日制博士生后勤辅助用房补贴'),
('艺术院校', '后勤辅助用房', '留学生', 0.00, '艺术院校留学生后勤辅助用房补贴'),
('艺术院校', '后勤辅助用房', '留学生硕士', 0.00, '艺术院校留学生硕士生后勤辅助用房补贴'),
('艺术院校', '后勤辅助用房', '留学生博士', 0.00, '艺术院校留学生博士生后勤辅助用房补贴'),
-- 外语院校（按要求全部设为0）
('外语院校', '教学及辅助用房', '全日制硕士', 0.00, '外语院校全日制硕士生教学及辅助用房补贴'),
('外语院校', '教学及辅助用房', '全日制博士', 0.00, '外语院校全日制博士生教学及辅助用房补贴'),
('外语院校', '教学及辅助用房', '留学生', 0.00, '外语院校留学生教学及辅助用房补贴'),
('外语院校', '教学及辅助用房', '留学生硕士', 0.00, '外语院校留学生硕士生教学及辅助用房补贴'),
('外语院校', '教学及辅助用房', '留学生博士', 0.00, '外语院校留学生博士生教学及辅助用房补贴'),
('外语院校', '办公用房', '全日制硕士', 0.00, '外语院校全日制硕士生办公用房补贴'),
('外语院校', '办公用房', '全日制博士', 0.00, '外语院校全日制博士生办公用房补贴'),
('外语院校', '办公用房', '留学生', 0.00, '外语院校留学生办公用房补贴'),
('外语院校', '办公用房', '留学生硕士', 0.00, '外语院校留学生硕士生办公用房补贴'),
('外语院校', '办公用房', '留学生博士', 0.00, '外语院校留学生博士生办公用房补贴'),
('外语院校', '学生宿舍', '全日制硕士', 0.00, '外语院校全日制硕士生宿舍补贴'),
('外语院校', '学生宿舍', '全日制博士', 0.00, '外语院校全日制博士生宿舍补贴'),
('外语院校', '学生宿舍', '留学生', 0.00, '外语院校留学生宿舍补贴'),
('外语院校', '学生宿舍', '留学生硕士', 0.00, '外语院校留学生硕士生宿舍补贴'),
('外语院校', '学生宿舍', '留学生博士', 0.00, '外语院校留学生博士生宿舍补贴'),
('外语院校', '其他生活用房', '全日制硕士', 0.00, '外语院校全日制硕士生其他生活用房补贴'),
('外语院校', '其他生活用房', '全日制博士', 0.00, '外语院校全日制博士生其他生活用房补贴'),
('外语院校', '其他生活用房', '留学生', 0.00, '外语院校留学生其他生活用房补贴'),
('外语院校', '其他生活用房', '留学生硕士', 0.00, '外语院校留学生硕士生其他生活用房补贴'),
('外语院校', '其他生活用房', '留学生博士', 0.00, '外语院校留学生博士生其他生活用房补贴'),
('外语院校', '后勤辅助用房', '全日制硕士', 0.00, '外语院校全日制硕士生后勤辅助用房补贴'),
('外语院校', '后勤辅助用房', '全日制博士', 0.00, '外语院校全日制博士生后勤辅助用房补贴'),
('外语院校', '后勤辅助用房', '留学生', 0.00, '外语院校留学生后勤辅助用房补贴'),
('外语院校', '后勤辅助用房', '留学生硕士', 0.00, '外语院校留学生硕士生后勤辅助用房补贴'),
('外语院校', '后勤辅助用房', '留学生博士', 0.00, '外语院校留学生博士生后勤辅助用房补贴');
