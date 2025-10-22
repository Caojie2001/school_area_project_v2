/**
 * 新版高校测算页面 - JavaScript 模块
 * 文件: dataEntryNew.js
 * 创建时间: 2025-10-16
 */

const DataEntryNewManager = {
    // 初始化标志
    initialized: false,

    /**
     * 初始化模块
     */
    async initialize() {
        if (this.initialized) {
            console.log('DataEntryNewManager 已经初始化');
            return;
        }

        console.log('初始化 DataEntryNewManager...');
        
        try {
            // 加载学校列表
            await this.loadSchoolList();
            
            // 绑定表单事件
            this.initFormEvents();
            
            this.initialized = true;
            console.log('DataEntryNewManager 初始化完成');
        } catch (error) {
            console.error('DataEntryNewManager 初始化失败:', error);
            throw error;
        }
    },

    /**
     * 加载学校列表
     */
    async loadSchoolList() {
        try {
            const response = await fetch('/api/schools/registry', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('获取学校列表失败');
            }
            
            const result = await response.json();
            const schoolSelect = document.getElementById('schoolNameNew');
            
            if (!schoolSelect) {
                console.warn('未找到学校选择框');
                return;
            }
            
            if (result.success && result.data) {
                // 清空现有选项
                schoolSelect.innerHTML = '<option value="">请选择学校</option>';
                
                // 添加学校选项
                result.data.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.school_name;
                    option.textContent = school.school_name;
                    option.dataset.schoolType = school.school_type || '';
                    schoolSelect.appendChild(option);
                });
                
                // 如果是学校用户，固定选择对应学校
                const user = window.AuthManager?.getCurrentUser();
                if (user && user.role === 'school' && user.school_name) {
                    schoolSelect.value = user.school_name;
                    schoolSelect.disabled = true;
                    schoolSelect.style.background = '#e9ecef';
                    schoolSelect.style.cursor = 'not-allowed';
                    
                    // 触发学校变化事件以显示学校类型
                    if (typeof handleSchoolChangeNew === 'function') {
                        handleSchoolChangeNew();
                    }
                    
                    console.log('学校用户，已固定学校选择:', user.school_name);
                }
                
                console.log('学校列表加载成功，共', result.data.length, '所学校');
            }
        } catch (error) {
            console.error('加载学校列表失败:', error);
            this.showError('加载学校列表失败: ' + error.message);
        }
    },

    /**
     * 初始化表单事件
     */
    initFormEvents() {
        console.log('绑定表单事件...');
        
        // 学生人数输入框变化时自动计算总数
        const studentInputs = [
            'fullTimeSpecialist', 
            'fullTimeUndergraduate', 
            'fullTimeMaster', 
            'fullTimeDoctor',
            'internationalUndergraduate', 
            'internationalMaster', 
            'internationalDoctor'
        ];
        
        studentInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateTotalStudents());
            }
        });

        // 面积输入框变化时自动计算总面积
        const areaInputs = [
            'teachingArea', 
            'officeArea', 
            'dormitoryArea', 
            'logisticsArea'
        ];
        
        areaInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateTotalArea());
            }
        });

        // 表单提交事件
        const form = document.getElementById('newCalculationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        console.log('表单事件绑定完成');
    },

    /**
     * 计算学生总数
     */
    calculateTotalStudents() {
        const total = 
            parseInt(document.getElementById('fullTimeSpecialist')?.value || 0) +
            parseInt(document.getElementById('fullTimeUndergraduate')?.value || 0) +
            parseInt(document.getElementById('fullTimeMaster')?.value || 0) +
            parseInt(document.getElementById('fullTimeDoctor')?.value || 0) +
            parseInt(document.getElementById('internationalUndergraduate')?.value || 0) +
            parseInt(document.getElementById('internationalMaster')?.value || 0) +
            parseInt(document.getElementById('internationalDoctor')?.value || 0);
        
        const totalInput = document.getElementById('totalStudents');
        if (totalInput) {
            totalInput.value = total;
        }
        
        return total;
    },

    /**
     * 计算总面积
     */
    calculateTotalArea() {
        const total = 
            parseFloat(document.getElementById('teachingArea')?.value || 0) +
            parseFloat(document.getElementById('officeArea')?.value || 0) +
            parseFloat(document.getElementById('dormitoryArea')?.value || 0) +
            parseFloat(document.getElementById('logisticsArea')?.value || 0);
        
        const totalInput = document.getElementById('totalArea');
        if (totalInput) {
            totalInput.value = total.toFixed(2);
        }
        
        return total;
    },

    /**
     * 处理表单提交
     */
    handleFormSubmit(e) {
        e.preventDefault();
        
        const schoolName = document.getElementById('schoolName')?.value;
        if (!schoolName) {
            this.showError('请选择学校');
            return;
        }

        const totalStudents = this.calculateTotalStudents();
        const currentArea = this.calculateTotalArea();
        
        // 简单计算示例：假设每个学生需要20平米
        const plannedArea = totalStudents * 20;
        const gap = plannedArea - currentArea;

        // 显示结果
        this.displayResults({
            totalStudents,
            currentArea,
            plannedArea,
            gap
        });
    },

    /**
     * 显示计算结果
     */
    displayResults(results) {
        const { totalStudents, currentArea, plannedArea, gap } = results;
        
        // 更新结果显示
        const resultElements = {
            resultTotalStudents: totalStudents.toLocaleString(),
            resultCurrentArea: currentArea.toLocaleString() + ' m²',
            resultPlannedArea: plannedArea.toLocaleString() + ' m²',
            resultGap: gap.toLocaleString() + ' m²'
        };
        
        Object.entries(resultElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // 显示结果区域
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'block';
            
            // 平滑滚动到结果区域
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    /**
     * 重置表单
     */
    resetForm() {
        const form = document.getElementById('newCalculationForm');
        if (form) {
            form.reset();
        }
        
        // 重置计算字段
        const totalStudents = document.getElementById('totalStudents');
        const totalArea = document.getElementById('totalArea');
        
        if (totalStudents) totalStudents.value = '0';
        if (totalArea) totalArea.value = '0';
        
        // 隐藏结果区域
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
        
        console.log('表单已重置');
    },

    /**
     * 显示错误信息
     */
    showError(message) {
        alert(message);
        console.error(message);
    },

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        alert(message);
        console.log(message);
    }
};

// 导出到全局作用域
window.DataEntryNewManager = DataEntryNewManager;

// 定义全局函数供HTML调用
window.resetNewForm = function() {
    DataEntryNewManager.resetForm();
};
