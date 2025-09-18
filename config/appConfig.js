/**
 * ==============================================
 * appConfig.js - 系统应用配置
 * ==============================================
 * 
 * 【文件职责】
 * - 系统全局配置参数
 * - 业务规则配置
 * - 计算标准配置
 */

// 系统配置
const AppConfig = {
    // 应用信息
    app: {
        name: '高校建筑面积缺口计算器',
        version: '2.0.0',
        description: '用于计算高校建筑面积缺口的现代化Web应用',
        author: 'School Area Calculator Team'
    },

    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        sessionSecret: process.env.SESSION_SECRET || 'school-area-calculator-secret',
        corsOrigin: process.env.CORS_ORIGIN || '*'
    },

    // 业务配置
    business: {
        // 支持的学校类型
        schoolTypes: [
            '综合类大学',
            '理工类院校',
            '师范类院校',
            '医学类院校',
            '艺术类院校',
            '体育类院校',
            '农林类院校',
            '财经类院校',
            '政法类院校',
            '民族类院校',
            '语言类院校',
            '军事类院校'
        ],

        // 用户角色
        userRoles: [
            { value: 'admin', label: '系统管理员', permissions: ['*'] },
            { value: 'construction_center', label: '建设中心', permissions: ['view_all', 'export_all', 'statistics'] },
            { value: 'school', label: '学校用户', permissions: ['view_own', 'edit_own', 'export_own'] }
        ],

        // 数据导出配置
        export: {
            maxRecords: 10000,
            allowedFormats: ['xlsx', 'csv'],
            batchSize: 500
        },

        // 分页配置
        pagination: {
            defaultPageSize: 20,
            maxPageSize: 100
        }
    },

    // 计算标准配置
    calculationStandards: {
        // 生均建筑面积标准 (平方米/人)
        AREA_STANDARDS: {
            teaching: 14,      // 教学用房标准
            office: 5,         // 行政办公用房标准
            logistics: 8,      // 后勤及辅助用房标准
            dormitory: 6.5,    // 宿舍标准
            living: 2.5        // 其他生活用房标准
        },

        // 学生类型权重
        STUDENT_WEIGHTS: {
            fullTime: {
                specialist: 1.0,     // 专科生权重
                undergraduate: 1.0,  // 本科生权重
                master: 1.5,         // 硕士生权重
                doctor: 2.0          // 博士生权重
            },
            international: {
                undergraduate: 1.0,  // 留学本科生权重
                master: 1.5,         // 留学硕士生权重
                doctor: 2.0          // 留学博士生权重
            }
        },

        // 特殊补助配置
        SPECIAL_SUBSIDIES: {
            maxItems: 10,           // 最大特殊补助项目数
            maxAreaPerItem: 50000,  // 单项最大面积(平方米)
            allowedTypes: [
                '实验室建设',
                '图书馆扩建',
                '体育设施',
                '学生活动中心',
                '教师公寓',
                '其他'
            ]
        }
    },

    // 文件上传配置
    upload: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ],
        uploadDir: './uploads'
    },

    // 安全配置
    security: {
        bcryptRounds: 10,
        sessionMaxAge: 24 * 60 * 60 * 1000, // 24小时
        maxLoginAttempts: 5,
        lockoutDuration: 30 * 60 * 1000     // 30分钟
    },

    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        maxSize: '20m'
    }
};

module.exports = AppConfig;
