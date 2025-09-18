/**
 * ==============================================
 * utils.js - 通用工具函数模块
 * ==============================================
 * 
 * 【文件职责】
 * - 提供通用的工具函数和实用方法
 * - 数据格式化和处理工具
 * - DOM操作辅助函数
 * - 时间日期处理工具
 * - 数值计算和格式化工具
 * 
 * 【主要功能模块】
 * 1. 数据格式化工具
 *    - formatNumber() 数字格式化
 *    - formatCurrency() 货币格式化
 *    - formatPercentage() 百分比格式化
 *    - formatFileSize() 文件大小格式化
 *    - formatPhoneNumber() 电话号码格式化
 * 
 * 2. 时间日期工具
 *    - formatDate() 日期格式化
 *    - formatDateTime() 日期时间格式化
 *    - parseDate() 日期解析
 *    - calculateDateDiff() 日期差计算
 *    - isValidDate() 日期有效性验证
 * 
 * 3. DOM操作工具
 *    - getElementById() 安全获取元素
 *    - addClass() 添加CSS类
 *    - removeClass() 移除CSS类
 *    - toggleClass() 切换CSS类
 *    - setElementValue() 设置元素值
 *    - getElementValue() 获取元素值
 * 
 * 4. 数据验证工具
 *    - validateEmail() 邮箱验证
 *    - validatePhone() 电话验证
 *    - validateNumber() 数字验证
 *    - validateRequired() 必填验证
 *    - validateLength() 长度验证
 * 
 * 5. 数组和对象工具
 *    - deepClone() 深拷贝
 *    - mergeObjects() 对象合并
 *    - sortArray() 数组排序
 *    - filterArray() 数组过滤
 *    - groupBy() 数组分组
 * 
 * 6. 字符串工具
 *    - capitalizeFirst() 首字母大写
 *    - truncateString() 字符串截断
 *    - escapeHtml() HTML转义
 * 
 * 7. 消息提示工具
 *    - showMessage() 显示消息提示
 *    - showSuccessMessage() 显示成功消息
 *    - showErrorMessage() 显示错误消息
 *    - showWarningMessage() 显示警告消息
 * 
 * 8. 表单工具
 *    - setDefaultValues() 设置表单默认值
 *    - formatToTwoDecimals() 格式化为两位小数
 *    - validateFormData() 验证表单数据
 *    - capitalize() 首字母大写
 *    - truncateText() 文本截断
 *    - removeSpaces() 移除空格
 *    - escapeHtml() HTML转义
 *    - generateId() 生成唯一ID
 * 
 * 7. 数学计算工具
 *    - roundToDecimals() 小数位数控制
 *    - calculatePercentage() 百分比计算
 *    - sumArray() 数组求和
 *    - averageArray() 数组平均值
 *    - findMinMax() 查找最值
 * 
 * 8. 事件处理工具
 *    - debounce() 防抖函数
 *    - throttle() 节流函数
 *    - addEventListeners() 批量添加事件监听
 *    - removeEventListeners() 批量移除事件监听
 * 
 * 9. 存储工具
 *    - setLocalStorage() 本地存储设置
 *    - getLocalStorage() 本地存储获取
 *    - removeLocalStorage() 本地存储移除
 *    - setSessionStorage() 会话存储设置
 * 
 * 10. 网络请求工具
 *    - makeRequest() 通用请求方法
 *    - handleResponse() 响应处理
 *    - handleError() 错误处理
 *    - uploadFile() 文件上传
 * 
 * 【常用常量】
 * - DATE_FORMATS: 日期格式常量
 * - NUMBER_FORMATS: 数字格式常量
 * - VALIDATION_PATTERNS: 验证正则表达式
 * - ERROR_MESSAGES: 错误消息常量
 */

// 常用常量定义
const Constants = {
    // 日期格式
    DATE_FORMATS: {
        YYYY_MM_DD: 'YYYY-MM-DD',
        YYYY_MM_DD_HH_MM: 'YYYY-MM-DD HH:mm',
        YYYY_MM_DD_HH_MM_SS: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // 数字格式
    NUMBER_FORMATS: {
        DECIMAL_2: 2,
        DECIMAL_4: 4,
        THOUSANDS_SEPARATOR: ','
    },
    
    // 验证正则表达式
    VALIDATION_PATTERNS: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE: /^1[3-9]\d{9}$/,
        NUMBER: /^\d+(\.\d+)?$/,
        CHINESE: /^[\u4e00-\u9fa5]+$/
    },
    
    // 错误消息
    ERROR_MESSAGES: {
        REQUIRED: '此字段为必填项',
        INVALID_EMAIL: '请输入有效的邮箱地址',
        INVALID_PHONE: '请输入有效的手机号码',
        INVALID_NUMBER: '请输入有效的数字',
        NETWORK_ERROR: '网络错误，请稍后重试'
    }
};

// ========================================
// 1. 数据格式化工具
// ========================================

/**
 * 格式化数字显示
 * @param {number|string} num 要格式化的数字
 * @param {number} decimals 小数位数，默认2位
 * @param {boolean} useThousandsSeparator 是否使用千分位分隔符，默认true
 * @returns {string} 格式化后的数字字符串
 */
function formatNumber(num, decimals = 2, useThousandsSeparator = true) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    
    const parsedNum = parseFloat(num);
    if (isNaN(parsedNum)) return '0.00';
    
    if (useThousandsSeparator) {
        return parsedNum.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    } else {
        return parsedNum.toFixed(decimals);
    }
}

/**
 * 格式化货币显示
 * @param {number|string} amount 金额
 * @param {string} currency 货币符号，默认¥
 * @param {number} decimals 小数位数，默认2位
 * @returns {string} 格式化后的货币字符串
 */
function formatCurrency(amount, currency = '¥', decimals = 2) {
    const formattedNumber = formatNumber(amount, decimals);
    return `${currency}${formattedNumber}`;
}

/**
 * 格式化百分比显示
 * @param {number} value 数值（0-1之间的小数或百分比数值）
 * @param {number} decimals 小数位数，默认1位
 * @param {boolean} isDecimal 输入值是否为小数形式（true: 0.5表示50%, false: 50表示50%）
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercentage(value, decimals = 1, isDecimal = true) {
    if (value === null || value === undefined || isNaN(value)) return '0.0%';
    
    const percentage = isDecimal ? parseFloat(value) * 100 : parseFloat(value);
    return `${percentage.toFixed(decimals)}%`;
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @param {number} decimals 小数位数，默认2位
 * @returns {string} 格式化后的文件大小字符串
 */
function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * 格式化电话号码
 * @param {string} phone 电话号码
 * @returns {string} 格式化后的电话号码
 */
function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '');
    
    // 手机号格式：138-1234-5678
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    
    // 固话格式：021-1234-5678
    if (cleaned.length >= 10) {
        const areaCode = cleaned.slice(0, 3);
        const prefix = cleaned.slice(3, 7);
        const suffix = cleaned.slice(7);
        return `${areaCode}-${prefix}-${suffix}`;
    }
    
    return phone;
}

// ========================================
// 2. 时间日期工具
// ========================================

/**
 * 格式化日期时间显示
 * @param {string|Date} dateInput 日期字符串或Date对象
 * @param {string} format 格式模板，默认 'YYYY-MM-DD HH:mm'
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(dateInput, format = 'YYYY-MM-DD HH:mm') {
    if (!dateInput) return '-';
    
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '-';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 格式化日期显示
 * @param {string|Date} dateInput 日期字符串或Date对象
 * @param {string} format 格式模板，默认 'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(dateInput, format = 'YYYY-MM-DD') {
    return formatDateTime(dateInput, format);
}

/**
 * 解析日期字符串
 * @param {string} dateString 日期字符串
 * @returns {Date|null} Date对象或null
 */
function parseDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * 计算日期差
 * @param {Date|string} date1 开始日期
 * @param {Date|string} date2 结束日期
 * @param {string} unit 单位：'days', 'hours', 'minutes', 'seconds'
 * @returns {number} 日期差
 */
function calculateDateDiff(date1, date2, unit = 'days') {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    
    switch (unit) {
        case 'days':
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        case 'hours':
            return Math.floor(diffMs / (1000 * 60 * 60));
        case 'minutes':
            return Math.floor(diffMs / (1000 * 60));
        case 'seconds':
            return Math.floor(diffMs / 1000);
        default:
            return diffMs;
    }
}

/**
 * 验证日期有效性
 * @param {string|Date} dateInput 日期输入
 * @returns {boolean} 是否为有效日期
 */
function isValidDate(dateInput) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date instanceof Date && !isNaN(date.getTime());
}

// ========================================
// 3. DOM操作工具
// ========================================

/**
 * 安全获取DOM元素
 * @param {string} id 元素ID
 * @returns {Element|null} DOM元素或null
 */
function safeGetElement(id) {
    try {
        return document.getElementById(id);
    } catch (error) {
        console.warn(`Element with id '${id}' not found:`, error);
        return null;
    }
}

/**
 * 添加CSS类
 * @param {Element|string} element 元素或元素ID
 * @param {string} className 类名
 */
function addClass(element, className) {
    const el = typeof element === 'string' ? safeGetElement(element) : element;
    if (el && el.classList) {
        el.classList.add(className);
    }
}

/**
 * 移除CSS类
 * @param {Element|string} element 元素或元素ID
 * @param {string} className 类名
 */
function removeClass(element, className) {
    const el = typeof element === 'string' ? safeGetElement(element) : element;
    if (el && el.classList) {
        el.classList.remove(className);
    }
}

/**
 * 切换CSS类
 * @param {Element|string} element 元素或元素ID
 * @param {string} className 类名
 */
function toggleClass(element, className) {
    const el = typeof element === 'string' ? safeGetElement(element) : element;
    if (el && el.classList) {
        el.classList.toggle(className);
    }
}

/**
 * 设置元素值
 * @param {Element|string} element 元素或元素ID
 * @param {any} value 要设置的值
 */
function setElementValue(element, value) {
    const el = typeof element === 'string' ? safeGetElement(element) : element;
    if (!el) return;
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.value = value;
    } else {
        el.textContent = value;
    }
}

/**
 * 获取元素值
 * @param {Element|string} element 元素或元素ID
 * @returns {any} 元素的值
 */
function getElementValue(element) {
    const el = typeof element === 'string' ? safeGetElement(element) : element;
    if (!el) return '';
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        return el.value;
    } else {
        return el.textContent || el.innerText;
    }
}

// ========================================
// 4. 数据验证工具
// ========================================

/**
 * 邮箱验证
 * @param {string} email 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return Constants.VALIDATION_PATTERNS.EMAIL.test(email.trim());
}

/**
 * 电话验证
 * @param {string} phone 电话号码
 * @returns {boolean} 是否为有效电话
 */
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/\D/g, '');
    return Constants.VALIDATION_PATTERNS.PHONE.test(cleaned);
}

/**
 * 数字验证
 * @param {any} value 要验证的值
 * @returns {boolean} 是否为有效数字
 */
function validateNumber(value) {
    if (value === null || value === undefined) return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

/**
 * 必填验证
 * @param {any} value 要验证的值
 * @returns {boolean} 是否不为空
 */
function validateRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

/**
 * 长度验证
 * @param {string} value 要验证的字符串
 * @param {number} minLength 最小长度
 * @param {number} maxLength 最大长度
 * @returns {boolean} 是否符合长度要求
 */
function validateLength(value, minLength = 0, maxLength = Infinity) {
    if (!value || typeof value !== 'string') return false;
    const length = value.trim().length;
    return length >= minLength && length <= maxLength;
}

// ========================================
// 5. 数组和对象工具
// ========================================

/**
 * 深拷贝对象
 * @param {any} obj 要拷贝的对象
 * @returns {any} 深拷贝后的对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
}

/**
 * 合并对象
 * @param {object} target 目标对象
 * @param {...object} sources 源对象
 * @returns {object} 合并后的对象
 */
function mergeObjects(target, ...sources) {
    if (!target || typeof target !== 'object') return {};
    
    sources.forEach(source => {
        if (source && typeof source === 'object') {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
                        target[key] = mergeObjects(target[key] || {}, source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
        }
    });
    
    return target;
}

/**
 * 数组排序
 * @param {Array} array 要排序的数组
 * @param {string|Function} key 排序键或排序函数
 * @param {boolean} ascending 是否升序，默认true
 * @returns {Array} 排序后的数组
 */
function sortArray(array, key, ascending = true) {
    if (!Array.isArray(array)) return [];
    
    return array.sort((a, b) => {
        let valueA, valueB;
        
        if (typeof key === 'function') {
            valueA = key(a);
            valueB = key(b);
        } else if (typeof key === 'string') {
            valueA = a[key];
            valueB = b[key];
        } else {
            valueA = a;
            valueB = b;
        }
        
        if (valueA < valueB) return ascending ? -1 : 1;
        if (valueA > valueB) return ascending ? 1 : -1;
        return 0;
    });
}

/**
 * 数组过滤
 * @param {Array} array 要过滤的数组
 * @param {Function|object} filter 过滤条件
 * @returns {Array} 过滤后的数组
 */
function filterArray(array, filter) {
    if (!Array.isArray(array)) return [];
    
    if (typeof filter === 'function') {
        return array.filter(filter);
    }
    
    if (typeof filter === 'object' && filter !== null) {
        return array.filter(item => {
            for (const key in filter) {
                if (filter.hasOwnProperty(key) && item[key] !== filter[key]) {
                    return false;
                }
            }
            return true;
        });
    }
    
    return array;
}

/**
 * 数组分组
 * @param {Array} array 要分组的数组
 * @param {string|Function} key 分组键或分组函数
 * @returns {object} 分组后的对象
 */
function groupBy(array, key) {
    if (!Array.isArray(array)) return {};
    
    return array.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {});
}

// ========================================
// 6. 字符串工具
// ========================================

/**
 * 首字母大写
 * @param {string} str 字符串
 * @returns {string} 首字母大写的字符串
 */
function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 文本截断
 * @param {string} text 文本
 * @param {number} maxLength 最大长度
 * @param {string} suffix 后缀，默认'...'
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength, suffix = '...') {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 移除空格
 * @param {string} str 字符串
 * @param {string} type 移除类型：'all'|'leading'|'trailing'|'both'，默认'both'
 * @returns {string} 处理后的字符串
 */
function removeSpaces(str, type = 'both') {
    if (!str || typeof str !== 'string') return '';
    
    switch (type) {
        case 'all':
            return str.replace(/\s/g, '');
        case 'leading':
            return str.replace(/^\s+/, '');
        case 'trailing':
            return str.replace(/\s+$/, '');
        case 'both':
        default:
            return str.trim();
    }
}

/**
 * HTML转义
 * @param {string} str 要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    
    return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * 生成唯一ID
 * @param {string} prefix 前缀，默认''
 * @param {number} length ID长度，默认8
 * @returns {string} 唯一ID
 */
function generateUniqueId(prefix = '', length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result + Date.now().toString(36);
}

/**
 * 转换为驼峰命名
 * @param {string} str 字符串
 * @returns {string} 驼峰命名字符串
 */
function toCamelCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
}

/**
 * 转换为短横线命名
 * @param {string} str 字符串
 * @returns {string} 短横线命名字符串
 */
function toKebabCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/([a-z])([A-Z])/g, '$1-$2')
              .replace(/[\s_]+/g, '-')
              .toLowerCase();
}

/**
 * 移除特殊字符
 * @param {string} str 字符串
 * @param {string} keep 保留的字符，默认为空字符串
 * @returns {string} 处理后的字符串
 */
function removeSpecialChars(str, keep = '') {
    if (!str || typeof str !== 'string') return '';
    const pattern = new RegExp(`[^a-zA-Z0-9${keep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
    return str.replace(pattern, '');
}

// ========================================
// 7. 数学计算工具
// ========================================

/**
 * 小数位数控制
 * @param {number} number 数字
 * @param {number} decimals 小数位数
 * @returns {number} 处理后的数字
 */
function roundToDecimals(number, decimals = 2) {
    if (!validateNumber(number)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(parseFloat(number) * factor) / factor;
}

/**
 * 百分比计算
 * @param {number} part 部分值
 * @param {number} total 总值
 * @param {number} decimals 小数位数，默认2
 * @returns {number} 百分比
 */
function calculatePercentage(part, total, decimals = 2) {
    if (!validateNumber(part) || !validateNumber(total) || total === 0) return 0;
    return roundToDecimals((parseFloat(part) / parseFloat(total)) * 100, decimals);
}

/**
 * 数组求和
 * @param {Array} array 数字数组
 * @param {string|Function} key 可选的属性键或提取函数
 * @returns {number} 求和结果
 */
function sumArray(array, key) {
    if (!Array.isArray(array)) return 0;
    
    return array.reduce((sum, item) => {
        let value;
        if (typeof key === 'function') {
            value = key(item);
        } else if (typeof key === 'string') {
            value = item[key];
        } else {
            value = item;
        }
        return sum + (validateNumber(value) ? parseFloat(value) : 0);
    }, 0);
}

/**
 * 数组平均值
 * @param {Array} array 数字数组
 * @param {string|Function} key 可选的属性键或提取函数
 * @returns {number} 平均值
 */
function averageArray(array, key) {
    if (!Array.isArray(array) || array.length === 0) return 0;
    return sumArray(array, key) / array.length;
}

/**
 * 查找最值
 * @param {Array} array 数字数组
 * @param {string|Function} key 可选的属性键或提取函数
 * @param {string} type 类型：'min'|'max'
 * @returns {number} 最值
 */
function findMinMax(array, key, type = 'max') {
    if (!Array.isArray(array) || array.length === 0) return 0;
    
    const values = array.map(item => {
        let value;
        if (typeof key === 'function') {
            value = key(item);
        } else if (typeof key === 'string') {
            value = item[key];
        } else {
            value = item;
        }
        return validateNumber(value) ? parseFloat(value) : 0;
    });
    
    return type === 'min' ? Math.min(...values) : Math.max(...values);
}

/**
 * 生成随机数
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {number} decimals 小数位数，默认0（整数）
 * @returns {number} 随机数
 */
function getRandomNumber(min = 0, max = 100, decimals = 0) {
    const random = Math.random() * (max - min) + min;
    return decimals > 0 ? roundToDecimals(random, decimals) : Math.floor(random);
}

/**
 * 限制数值范围
 * @param {number} value 值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 限制后的值
 */
function clampNumber(value, min, max) {
    return Math.min(Math.max(parseFloat(value) || 0, min), max);
}

// ========================================
// 8. 事件处理工具
// ========================================

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 批量添加事件监听
 * @param {Array} elements 元素数组
 * @param {string} event 事件类型
 * @param {Function} handler 事件处理函数
 */
function addEventListeners(elements, event, handler) {
    if (!Array.isArray(elements)) elements = [elements];
    elements.forEach(el => {
        if (el && el.addEventListener) {
            el.addEventListener(event, handler);
        }
    });
}

/**
 * 批量移除事件监听
 * @param {Array} elements 元素数组
 * @param {string} event 事件类型
 * @param {Function} handler 事件处理函数
 */
function removeEventListeners(elements, event, handler) {
    if (!Array.isArray(elements)) elements = [elements];
    elements.forEach(el => {
        if (el && el.removeEventListener) {
            el.removeEventListener(event, handler);
        }
    });
}

// ========================================
// 9. 存储工具
// ========================================

/**
 * 本地存储设置
 * @param {string} key 键
 * @param {any} value 值
 * @returns {boolean} 是否成功
 */
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('localStorage set error:', error);
        return false;
    }
}

/**
 * 本地存储获取
 * @param {string} key 键
 * @param {any} defaultValue 默认值
 * @returns {any} 存储的值
 */
function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('localStorage get error:', error);
        return defaultValue;
    }
}

/**
 * 本地存储移除
 * @param {string} key 键
 * @returns {boolean} 是否成功
 */
function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('localStorage remove error:', error);
        return false;
    }
}

/**
 * 会话存储设置
 * @param {string} key 键
 * @param {any} value 值
 * @returns {boolean} 是否成功
 */
function setSessionStorage(key, value) {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('sessionStorage set error:', error);
        return false;
    }
}

// ========================================
// 浏览器工具
// ========================================

/**
 * 获取URL查询参数
 * @param {string} name 参数名
 * @param {string} url 可选的URL，默认为当前页面
 * @returns {string|null} 参数值
 */
function getQueryParam(name, url = window.location.href) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(name);
}

/**
 * 设置URL查询参数
 * @param {string} name 参数名
 * @param {string} value 参数值
 * @param {boolean} updateHistory 是否更新历史记录，默认true
 */
function setQueryParam(name, value, updateHistory = true) {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    
    if (updateHistory) {
        window.history.pushState({}, '', url);
    } else {
        window.history.replaceState({}, '', url);
    }
}

/**
 * 获取Cookie
 * @param {string} name Cookie名称
 * @returns {string|null} Cookie值
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * 设置Cookie
 * @param {string} name Cookie名称
 * @param {string} value Cookie值
 * @param {number} days 过期天数，默认7天
 * @param {string} path 路径，默认'/'
 */
function setCookie(name, value, days = 7, path = '/') {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=${path}`;
}

/**
 * 删除Cookie
 * @param {string} name Cookie名称
 * @param {string} path 路径，默认'/'
 */
function deleteCookie(name, path = '/') {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=${path}`;
}

/**
 * 检测设备类型
 * @returns {object} 设备信息
 */
function detectDevice() {
    const ua = navigator.userAgent;
    
    return {
        isMobile: /Mobi|Android/i.test(ua),
        isTablet: /Tablet|iPad/i.test(ua),
        isDesktop: !/Mobi|Android|Tablet|iPad/i.test(ua),
        isIOS: /iPhone|iPad|iPod/i.test(ua),
        isAndroid: /Android/i.test(ua),
        browser: getBrowserInfo()
    };
}

/**
 * 获取浏览器信息
 * @returns {object} 浏览器信息
 */
function getBrowserInfo() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Firefox')) return { name: 'Firefox', version: ua.match(/Firefox\/(\d+)/)?.[1] };
    if (ua.includes('Chrome')) return { name: 'Chrome', version: ua.match(/Chrome\/(\d+)/)?.[1] };
    if (ua.includes('Safari')) return { name: 'Safari', version: ua.match(/Version\/(\d+)/)?.[1] };
    if (ua.includes('Edge')) return { name: 'Edge', version: ua.match(/Edge\/(\d+)/)?.[1] };
    
    return { name: 'Unknown', version: 'Unknown' };
}

// ========================================
// 10. 网络请求工具
// ========================================

/**
 * 通用请求方法
 * @param {string} url 请求URL
 * @param {object} options 请求选项
 * @returns {Promise} 请求结果
 */
async function makeRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 30000
    };
    
    const config = mergeObjects(defaultOptions, options);
    
    try {
        const response = await fetch(url, config);
        return await handleResponse(response);
    } catch (error) {
        throw handleError(error, `makeRequest: ${url}`);
    }
}

/**
 * 响应处理
 * @param {Response} response fetch响应对象
 * @returns {Promise} 处理后的响应数据
 */
async function handleResponse(response) {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    } else {
        return await response.text();
    }
}

/**
 * 错误处理
 * @param {Error} error 错误对象
 * @param {string} context 错误上下文
 * @returns {Error} 处理后的错误
 */
function handleError(error, context = '') {
    const errorMessage = error.message || Constants.ERROR_MESSAGES.NETWORK_ERROR;
    const contextMessage = context ? `[${context}] ` : '';
    
    console.error(`${contextMessage}${errorMessage}`, error);
    
    return new Error(`${contextMessage}${errorMessage}`);
}

/**
 * 文件上传
 * @param {string} url 上传URL
 * @param {File} file 文件对象
 * @param {object} options 额外选项
 * @returns {Promise} 上传结果
 */
async function uploadFile(url, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // 添加额外的表单数据
    if (options.data) {
        Object.keys(options.data).forEach(key => {
            formData.append(key, options.data[key]);
        });
    }
    
    const uploadOptions = {
        method: 'POST',
        body: formData,
        ...options.fetchOptions
    };
    
    // 不设置Content-Type，让浏览器自动设置
    delete uploadOptions.headers?.['Content-Type'];
    
    return makeRequest(url, uploadOptions);
}

// ========================================
// UI工具函数
// ========================================

/**
 * 显示消息提示
 * @param {string} message 消息内容
 * @param {string} type 消息类型 ('info', 'success', 'error', 'warning')
 * @param {number} duration 显示时长(毫秒)，默认3000ms
 */
function showMessage(message, type = 'info', duration = 3000) {
    // 创建消息提示元素
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 9999;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: opacity 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    // 根据类型设置颜色
    switch (type) {
        case 'success':
            messageDiv.style.background = '#28a745';
            break;
        case 'error':
            messageDiv.style.background = '#dc3545';
            break;
        case 'warning':
            messageDiv.style.background = '#ffc107';
            messageDiv.style.color = '#212529';
            break;
        default:
            messageDiv.style.background = '#17a2b8';
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // 动画显示
    requestAnimationFrame(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0)';
    });
    
    // 定时消失
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, duration);
}

/**
 * 显示确认对话框
 * @param {string} message 确认消息
 * @param {string} title 对话框标题
 * @returns {Promise<boolean>} 用户选择结果
 */
function showConfirm(message, title = '确认') {
    return new Promise((resolve) => {
        const result = confirm(`${title}\n\n${message}`);
        resolve(result);
    });
}

/**
 * 显示加载状态
 * @param {string} message 加载消息
 * @returns {function} 关闭加载的函数
 */
function showLoading(message = '加载中...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'global-loading';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
    `;
    
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 10px;">⏳</div>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(loadingDiv);
    
    // 返回关闭函数
    return function hideLoading() {
        const loading = document.getElementById('global-loading');
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }
    };
}

// ========================================
// 表单工具函数 (从 script.js 迁移)
// ========================================

/**
 * 格式化为两位小数（不带千分符）
 * @param {number|string} num 要格式化的数字
 * @returns {string} 格式化后的数字字符串
 */
function formatToTwoDecimals(num) {
    if (num === null || num === undefined || num === '') return '0.00';
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return '0.00';
    return parsed.toFixed(2);
}

/**
 * 设置表单默认值的辅助函数
 * @param {Array<string>} elementIds 元素ID数组
 * @param {string} defaultValue 默认值，默认为'0'
 */
function setDefaultValues(elementIds = [], defaultValue = '0') {
    const defaultElements = elementIds.length > 0 ? elementIds : [
        'fullTimeTotal', 'internationalTotal', 'totalStudents',
        'otherLivingArea', 'totalBuildingArea'
    ];
    
    defaultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && !element.value) {
            element.value = defaultValue;
        }
    });
}

/**
 * 显示成功消息的便捷方法
 * @param {string} message 消息内容
 * @param {number} duration 显示时长
 */
function showSuccessMessage(message, duration = 3000) {
    showMessage(message, 'success', duration);
}

/**
 * 显示错误消息的便捷方法
 * @param {string} message 消息内容
 * @param {number} duration 显示时长
 */
function showErrorMessage(message, duration = 5000) {
    showMessage(message, 'error', duration);
}

/**
 * 显示警告消息的便捷方法
 * @param {string} message 消息内容
 * @param {number} duration 显示时长
 */
function showWarningMessage(message, duration = 4000) {
    showMessage(message, 'warning', duration);
}

/**
 * 显示信息消息的便捷方法
 * @param {string} message 消息内容
 * @param {number} duration 显示时长
 */
function showInfoMessage(message, duration = 3000) {
    showMessage(message, 'info', duration);
}

// ========================================
// 全局导出
// ========================================

// 将所有工具函数添加到全局作用域
if (typeof window !== 'undefined') {
    // 创建 Utils 命名空间
    window.Utils = {
        // 数据格式化
        formatNumber,
        formatCurrency,
        formatPercentage,
        formatFileSize,
        formatPhoneNumber,
        
        // 时间日期
        formatDate,
        formatDateTime,
        parseDate,
        calculateDateDiff,
        isValidDate,
        
        // DOM操作
        getElementById: safeGetElement,
        addClass,
        removeClass,
        toggleClass,
        setElementValue,
        getElementValue,
        
        // 数据验证
        validateEmail,
        validatePhone,
        validateNumber,
        validateRequired,
        validateLength,
        
        // 数组和对象
        deepClone,
        mergeObjects,
        sortArray,
        filterArray,
        groupBy,
        
        // 字符串工具
        capitalizeFirstLetter: capitalize,
        toCamelCase,
        toKebabCase,
        truncateString: truncateText,
        removeSpecialChars,
        
        // 数学计算
        roundToDecimal: roundToDecimals,
        calculatePercentage,
        getRandomNumber,
        clampNumber,
        
        // 浏览器工具
        getQueryParam,
        setQueryParam,
        getCookie,
        setCookie,
        deleteCookie,
        detectDevice,
        
        // 网络请求
        makeRequest,
        handleApiError: handleError,
        uploadFile,
        
        // UI工具
        showMessage,
        showConfirm,
        showLoading,
        
        // 表单工具 (从 script.js 迁移)
        formatToTwoDecimals,
        setDefaultValues,
        showSuccessMessage,
        showErrorMessage,
        showWarningMessage,
        showInfoMessage
    };
    
    // 为了向后兼容，也将一些常用函数直接添加到 window 对象
    window.showMessage = showMessage;
    window.showConfirm = showConfirm;
    window.showLoading = showLoading;
    window.formatDate = formatDate;
    window.formatNumber = formatNumber;
    window.validateEmail = validateEmail;
    window.deepClone = deepClone;
    
    // 新增的表单工具函数也添加到全局
    window.formatToTwoDecimals = formatToTwoDecimals;
    window.setDefaultValues = setDefaultValues;
    window.showSuccessMessage = showSuccessMessage;
    window.showErrorMessage = showErrorMessage;
    window.showWarningMessage = showWarningMessage;
    window.showInfoMessage = showInfoMessage;
}

// 支持模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // 导出所有工具函数...
        formatNumber,
        formatCurrency,
        formatPercentage,
        formatFileSize,
        formatPhoneNumber,
        formatDate,
        formatDateTime,
        parseDate,
        calculateDateDiff,
        isValidDate,
        getElementById: safeGetElement,
        addClass,
        removeClass,
        toggleClass,
        setElementValue,
        getElementValue,
        validateEmail,
        validatePhone,
        validateNumber,
        validateRequired,
        validateLength,
        deepClone,
        mergeObjects,
        sortArray,
        filterArray,
        groupBy,
        capitalizeFirstLetter: capitalize,
        toCamelCase,
        toKebabCase,
        truncateString: truncateText,
        removeSpecialChars,
        roundToDecimal: roundToDecimals,
        calculatePercentage,
        getRandomNumber,
        clampNumber,
        getQueryParam,
        setQueryParam,
        getCookie,
        setCookie,
        deleteCookie,
        detectDevice,
        makeRequest,
        handleApiError: handleError,
        uploadFile,
        showMessage,
        showConfirm,
        showLoading
    };
}

// ========================================
// 模块信息
// ========================================

console.log('✅ 工具函数模块 (utils.js) 已加载');
console.log('📦 提供功能: 数据格式化、时间处理、DOM操作、数据验证、UI工具等');
console.log('🔗 全局访问: window.Utils 或直接使用函数名');
