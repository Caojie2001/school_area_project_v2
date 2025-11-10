/**
 * ==============================================
 * dataEntry.js - 数据填报功能模块
 * ==============================================
 * 
 * 【文件职责】
 * - 数据填报表单的初始化和管理
 * - 学生数据和建筑面积的计算逻辑
 * - 表单验证和数据提交
 * - 学校信息的动态加载和更新
 * - 补助数据的计算和管理
 */

// ========================================
// 表单状态管理
// ========================================

const FormState = {
    LOADING: 'loading',
    READY: 'ready',
    CALCULATING: 'calculating',
    SUBMITTING: 'submitting'
};

// 当前表单状态
let currentFormState = FormState.READY;

// ========================================
// 计算标准常量
// ========================================

const CalculationStandards = {
    // 学生折算系数
    STUDENT_COEFFICIENTS: {
        specialist: 1.0,
        undergraduate: 1.0,
        master: 1.5,
        doctor: 2.0,
        international: 1.0
    },
    
    // 建筑面积标准 (平方米/人)
    BUILDING_STANDARDS: {
        teaching: 14,      // 教学用房标准
        office: 5,         // 行政办公用房标准
        logistics: 8,      // 后勤及辅助用房标准
        dormitory: 6.5,    // 宿舍标准
        living: 2.5        // 其他生活用房标准
    }
};

// ========================================
// 年份选择器管理器 (重新实现)
// ========================================

const YearSelectorManager = {
    currentYearGridIndex: 0,
    
    // 初始化事件监听器
    init() {
        // 添加遮罩层点击关闭功能
        document.addEventListener('click', (e) => {
            // 关闭通用年份选择器
            const yearOverlay = document.getElementById('yearGridOverlay');
            if (e.target === yearOverlay) {
                this.hideYearGrid();
            }
        });
    },
    
    // 通用年份选择器
    showYearGrid() {
        const overlay = document.getElementById('yearGridOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            const yearInput = document.getElementById('year');
            const currentYear = new Date().getFullYear();
            const inputYear = parseInt(yearInput ? yearInput.value : currentYear) || currentYear;
            this.currentYearGridIndex = Math.floor((inputYear - (currentYear - 4)) / 9);
            this.updateYearGrid();
            document.addEventListener('keydown', this.handleYearGridKeyboard.bind(this));
        }
    },
    
    hideYearGrid() {
        const overlay = document.getElementById('yearGridOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.removeEventListener('keydown', this.handleYearGridKeyboard.bind(this));
        }
    },
    
    moveYearGrid(direction) {
        this.currentYearGridIndex += direction;
        this.updateYearGrid();
    },
    
    updateYearGrid() {
        const yearGrid = document.getElementById('yearGrid');
        const yearRangeText = document.getElementById('yearRangeText');
        const yearInput = document.getElementById('year');
        const currentYear = new Date().getFullYear();
        const inputYear = parseInt(yearInput ? yearInput.value : currentYear) || currentYear;
        
        if (!yearGrid || !yearRangeText) return;
        
        const baseYear = currentYear - 4 + (this.currentYearGridIndex * 9);
        const years = [];
        
        for (let i = 0; i < 9; i++) {
            years.push(baseYear + i);
        }
        
        yearRangeText.textContent = `${years[0]} - ${years[8]}`;
        
        yearGrid.innerHTML = '';
        years.forEach(year => {
            const yearItem = document.createElement('div');
            yearItem.className = 'year-item';
            yearItem.textContent = year;
            yearItem.onclick = () => this.selectYear(year);
            
            if (year === currentYear) {
                yearItem.classList.add('current');
            }
            
            if (year === inputYear) {
                yearItem.classList.add('selected');
            }
            
            yearGrid.appendChild(yearItem);
        });
    },
    
    selectYear(year) {
        const yearInput = document.getElementById('year');
        if (yearInput) {
            yearInput.value = year;
            const event = new Event('change', { bubbles: true });
            yearInput.dispatchEvent(event);
        }
        this.hideYearGrid();
    },
    
    handleYearGridKeyboard(e) {
        switch(e.key) {
            case 'Escape':
                this.hideYearGrid();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.moveYearGrid(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveYearGrid(1);
                break;
        }
    }
};

// ========================================
// 数据填报管理器
// ========================================

const DataEntryManager = {
    
    /**
     * 初始化数据填报模块
     */
    async initialize() {
        try {
            console.log('开始初始化数据填报模块...');
            
            // 初始化年份选择器
            YearSelectorManager.init();
            
            // 初始化表单
            this.initializeForm();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 加载学校选项
            await this.loadSchoolOptions();
            
            // 初始化按钮状态
            this.updateCalculateButtonState();
            
            console.log('数据填报模块初始化完成');
            
        } catch (error) {
            console.error('数据填报模块初始化失败:', error);
        }
    },
    
    /**
     * 初始化表单
     */
    initializeForm() {
        // 重置表单状态
        currentFormState = FormState.READY;
        
        // 重置编辑模式（当页面初始化时，用户可能已经完成编辑）
        if (typeof AutoRefreshManager !== 'undefined') {
            // 延迟一点重置，避免与编辑填充冲突
            setTimeout(() => {
                AutoRefreshManager.setEditMode(false);
            }, 2000);
        }
        
        // 初始化计算
        this.calculateTotalStudents();
        this.calculateTotalBuildingArea();
        this.calculateOtherLivingArea();
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 学校选择事件已在HTML中通过onchange属性绑定
        // 调用 updateSchoolType() -> handleSchoolChange()
        
        // 表单提交事件
        const form = document.getElementById('onlineDataForm');
        if (form) {
            // 移除可能存在的旧监听器
            form.removeEventListener('submit', this.handleFormSubmit);
            // 添加新的监听器
            form.addEventListener('submit', (event) => this.handleFormSubmit(event));
            console.log('表单提交事件监听器已绑定');
        }
        
        // 为所有建筑面积输入字段添加事件监听器
        const buildingAreaInputs = [
            'teachingArea', 'officeArea', 'logisticsArea', 'totalLivingArea', 'dormitoryArea'
        ];
        
        buildingAreaInputs.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('input', (event) => {
                    // 调用计算函数
                    if (fieldId === 'totalLivingArea' || fieldId === 'dormitoryArea') {
                        this.calculateOtherLivingArea();
                    }
                    this.calculateTotalBuildingArea();
                    
                    // 调用验证函数
                    this.validateBuildingAreaInput(event.target);
                });
            }
        });
        
        // 为所有学生人数输入字段添加事件监听器
        const studentInputs = [
            'fullTimeSpecialist', 'fullTimeUndergraduate', 'fullTimeMaster', 'fullTimeDoctor',
            'internationalUndergraduate', 'internationalMaster', 'internationalDoctor'
        ];
        
        studentInputs.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('input', (event) => {
                    this.calculateTotalStudents();
                    this.validateStudentNumberInput(event.target);
                });
            }
        });
        
        // 学生数据输入事件（已在HTML中通过oninput设置）
        // 建筑面积输入事件（已在HTML中通过oninput设置）
        
        // 初始化按钮状态检查
        this.updateCalculateButtonState();
    },
    
    /**
     * 检查页面是否有错误
     * @returns {boolean} 是否有错误
     */
    hasPageErrors() {
        // 检查是否有错误的输入框
        const errorInputs = document.querySelectorAll('.form-control.error');
        // 检查是否有显示的错误消息
        const errorMessages = document.querySelectorAll('.form-group.has-error .error-message');
        
        // 检查学校是否已选择（必填项）
        const schoolSelect = document.getElementById('schoolName');
        const schoolNotSelected = !schoolSelect || !schoolSelect.value;
        
        // 只要有表单验证错误或学校未选择就禁用按钮
        // 不再检查学生总数和建筑面积，允许用户输入0或空值，在提交时再验证
        return errorInputs.length > 0 || 
               errorMessages.length > 0 || 
               schoolNotSelected;
    },
    
    /**
     * 更新计算分析按钮状态
     */
    updateCalculateButtonState() {
        const calculateButton = document.getElementById('calculateButton');
        if (!calculateButton) return;
        
        const hasErrors = this.hasPageErrors();
        
        if (hasErrors) {
            calculateButton.disabled = true;
            calculateButton.classList.add('disabled');
            calculateButton.style.cursor = 'not-allowed';
        } else {
            calculateButton.disabled = false;
            calculateButton.classList.remove('disabled');
            calculateButton.style.cursor = 'pointer';
        }
    },
    
    /**
     * 加载学校选项
     */
    async loadSchoolOptions() {
        const schoolSelect = document.getElementById('schoolName');
        if (!schoolSelect) return;
        
        try {
            currentFormState = FormState.LOADING;
            
            const response = await DataEntryAPI.getSchools();
            
            if (response.success && response.schools) {
                // 清空现有选项
                schoolSelect.innerHTML = '<option value="">请选择高校</option>';
                
                // 添加学校选项
                response.schools.forEach(school => {
                    const option = document.createElement('option');
                    option.value = school.school_name;
                    option.textContent = school.school_name;
                    schoolSelect.appendChild(option);
                });
                
                console.log(`加载了 ${response.schools.length} 个学校选项`);
                
                // 检查当前用户是否为学校用户，如果是则自动设置学校名称
                this.handleSchoolUserAutoSelection();
            } else {
                console.warn('获取学校列表失败:', response.message);
            }
            
        } catch (error) {
            console.error('加载学校选项失败:', error);
        } finally {
            currentFormState = FormState.READY;
        }
    },
    
    /**
     * 处理学校用户的自动选择
     */
    handleSchoolUserAutoSelection() {
        // 获取当前用户信息
        const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
        
        if (currentUser && currentUser.role === 'school' && currentUser.school_name) {
            const schoolSelect = document.getElementById('schoolName');
            if (schoolSelect) {
                // 设置学校名称
                schoolSelect.value = currentUser.school_name;
                
                // 只有在还没有设置样式的情况下才设置（避免与auth.js重复）
                if (!schoolSelect.hasAttribute('data-locked')) {
                    schoolSelect.style.backgroundColor = '#f5f5f5';
                    schoolSelect.style.cursor = 'not-allowed';
                    schoolSelect.style.pointerEvents = 'none';
                    schoolSelect.setAttribute('data-locked', 'true');
                }
                
                console.log(`学校用户自动选择学校: ${currentUser.school_name}`);
                
                // 立即更新学校类型显示
                this.updateSchoolType();
            }
        }
    },
    
    /**
     * 处理学校选择变更
     */
    handleSchoolChange() {
        console.log('=== 学校选择已变更，开始重置表单 ===');
        
        const schoolNameSelect = document.getElementById('schoolName');
        if (!schoolNameSelect) {
            console.warn('找不到学校选择器元素');
            return;
        }
        
        const selectedSchool = schoolNameSelect.value;
        console.log('选择的学校:', selectedSchool);
        
        // 如果没有选择学校，只更新学校类型显示
        if (!selectedSchool) {
            console.log('未选择学校，只更新学校类型');
            this.updateSchoolType();
            return;
        }
        
        // 保存当前选择的学校
        const savedSchool = selectedSchool;
        console.log('开始重置表单，保留学校:', savedSchool);
        
        // 重置所有数字输入字段
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.value = '0';
        });
        
        // 恢复学校选择（不重置学校选择器本身）
        schoolNameSelect.value = savedSchool;
        
        // 重置年份选择
        const yearInput = document.getElementById('year');
        if (yearInput) {
            yearInput.value = '2025';
        }
        
        // 重置备注字段
        const remarksField = document.getElementById('remarks');
        if (remarksField) {
            remarksField.value = '';
        }
        
        // 清空特殊补助
        const specialSubsidiesContainer = document.getElementById('specialSubsidies');
        if (specialSubsidiesContainer) {
            specialSubsidiesContainer.innerHTML = '';
        }
        
        // 清空分析结果区域
        this.clearAnalysisResults();
        
        // 重新计算所有字段
        this.calculateTotalStudents();
        this.calculateTotalBuildingArea();
        this.calculateOtherLivingArea();
        
        // 清除所有错误状态
        const errorInputs = document.querySelectorAll('.form-control.error');
        errorInputs.forEach(input => {
            this.clearFieldError(input);
        });
        
        // 更新学校类型显示
        this.updateSchoolType();
        
        // 更新按钮状态
        this.updateCalculateButtonState();
        
        // 重置编辑模式（切换学校时，结束编辑模式）
        if (typeof AutoRefreshManager !== 'undefined') {
            AutoRefreshManager.setEditMode(false);
        }
        
        console.log('表单已重置，保留学校:', savedSchool);
    },
    
    /**
     * 更新学校类型显示
     */
    async updateSchoolType() {
        const schoolNameSelect = document.getElementById('schoolName');
        const schoolTypeDisplay = document.getElementById('schoolTypeDisplay');
        
        if (!schoolNameSelect || !schoolTypeDisplay) {
            return;
        }
        
        const selectedSchool = schoolNameSelect.value;
        if (!selectedSchool) {
            schoolTypeDisplay.textContent = '';
            return;
        }
        
        try {
            const data = await DataEntryAPI.getSchoolType(selectedSchool);
            
            if (data.success) {
                schoolTypeDisplay.textContent = `学校类型: ${data.schoolType}`;
            } else {
                schoolTypeDisplay.textContent = '学校类型: 未指定';
            }
        } catch (error) {
            console.error('获取学校类型失败:', error);
            schoolTypeDisplay.textContent = '学校类型: 获取失败';
        }
    },
    
    /**
     * 计算学生总数
     */
    calculateTotalStudents() {
        console.log('开始计算学生总数...');
        
        // 全日制学生
        const fullTimeSpecialistEl = document.getElementById('fullTimeSpecialist');
        const fullTimeUndergraduateEl = document.getElementById('fullTimeUndergraduate');
        const fullTimeMasterEl = document.getElementById('fullTimeMaster');
        const fullTimeDoctorEl = document.getElementById('fullTimeDoctor');
        
        const fullTimeSpecialist = parseInt(fullTimeSpecialistEl ? fullTimeSpecialistEl.value : 0) || 0;
        const fullTimeUndergraduate = parseInt(fullTimeUndergraduateEl ? fullTimeUndergraduateEl.value : 0) || 0;
        const fullTimeMaster = parseInt(fullTimeMasterEl ? fullTimeMasterEl.value : 0) || 0;
        const fullTimeDoctor = parseInt(fullTimeDoctorEl ? fullTimeDoctorEl.value : 0) || 0;
        
        const fullTimeTotal = fullTimeSpecialist + fullTimeUndergraduate + fullTimeMaster + fullTimeDoctor;
        
        // 留学生（不包括专科生）
        const internationalUndergraduateEl = document.getElementById('internationalUndergraduate');
        const internationalMasterEl = document.getElementById('internationalMaster');
        const internationalDoctorEl = document.getElementById('internationalDoctor');
        
        const internationalUndergraduate = parseInt(internationalUndergraduateEl ? internationalUndergraduateEl.value : 0) || 0;
        const internationalMaster = parseInt(internationalMasterEl ? internationalMasterEl.value : 0) || 0;
        const internationalDoctor = parseInt(internationalDoctorEl ? internationalDoctorEl.value : 0) || 0;
        
        const internationalTotal = internationalUndergraduate + internationalMaster + internationalDoctor;
        
        // 更新显示
        const fullTimeTotalEl = document.getElementById('fullTimeTotal');
        if (fullTimeTotalEl) {
            fullTimeTotalEl.value = fullTimeTotal;
            console.log('设置全日制总数:', fullTimeTotal);
        }
        
        const internationalTotalEl = document.getElementById('internationalTotal');
        if (internationalTotalEl) {
            internationalTotalEl.value = internationalTotal;
            console.log('设置留学生总数:', internationalTotal);
        }
        
        // 计算总学生数
        const totalStudents = fullTimeTotal + internationalTotal;
        const totalStudentsEl = document.getElementById('totalStudents');
        if (totalStudentsEl) {
            totalStudentsEl.value = totalStudents;
            console.log('设置学生总人数:', totalStudents);
        }
        
        console.log('计算完成:', { fullTimeTotal, internationalTotal, totalStudents });
        
        // 更新按钮状态
        this.updateCalculateButtonState();
        
        return {
            fullTimeTotal,
            internationalTotal,
            totalStudents,
            breakdown: {
                fullTimeSpecialist,
                fullTimeUndergraduate,
                fullTimeMaster,
                fullTimeDoctor,
                internationalUndergraduate,
                internationalMaster,
                internationalDoctor
            }
        };
    },
    
    /**
     * 计算建筑总面积
     */
    calculateTotalBuildingArea() {
        console.log('开始计算建筑总面积...');
        
        // 获取各类建筑面积输入值
        const teachingAreaEl = document.getElementById('teachingArea');
        const officeAreaEl = document.getElementById('officeArea');
        const logisticsAreaEl = document.getElementById('logisticsArea');
        const totalLivingAreaEl = document.getElementById('totalLivingArea');
        const dormitoryAreaEl = document.getElementById('dormitoryArea');
        
        const teachingArea = parseFloat(teachingAreaEl ? teachingAreaEl.value : 0) || 0;
        const officeArea = parseFloat(officeAreaEl ? officeAreaEl.value : 0) || 0;
        const logisticsArea = parseFloat(logisticsAreaEl ? logisticsAreaEl.value : 0) || 0;
        const totalLivingArea = parseFloat(totalLivingAreaEl ? totalLivingAreaEl.value : 0) || 0;
        const dormitoryArea = parseFloat(dormitoryAreaEl ? dormitoryAreaEl.value : 0) || 0;
        
        // 计算总建筑面积
        const totalBuildingArea = teachingArea + officeArea + logisticsArea + totalLivingArea;
        
        // 更新总面积显示
        const totalBuildingAreaEl = document.getElementById('totalBuildingArea');
        if (totalBuildingAreaEl) {
            totalBuildingAreaEl.value = totalBuildingArea.toFixed(2);
            console.log('设置建筑总面积:', totalBuildingArea);
        }
        
        console.log('建筑面积计算完成:', {
            teachingArea,
            officeArea,
            logisticsArea,
            totalLivingArea,
            dormitoryArea,
            totalBuildingArea
        });
        
        // 更新按钮状态
        this.updateCalculateButtonState();
        
        return {
            teachingArea,
            officeArea,
            logisticsArea,
            totalLivingArea,
            dormitoryArea,
            totalBuildingArea
        };
    },
    
    /**
     * 计算其他生活用房面积
     */
    calculateOtherLivingArea() {
        console.log('开始计算其他生活用房面积...');
        
        const totalLivingAreaEl = document.getElementById('totalLivingArea');
        const dormitoryAreaEl = document.getElementById('dormitoryArea');
        const otherLivingAreaEl = document.getElementById('otherLivingArea');
        
        const totalLivingArea = parseFloat(totalLivingAreaEl ? totalLivingAreaEl.value : 0) || 0;
        const dormitoryArea = parseFloat(dormitoryAreaEl ? dormitoryAreaEl.value : 0) || 0;
        
        // 其他生活用房 = 生活用房总面积 - 宿舍面积
        const otherLivingArea = Math.max(0, totalLivingArea - dormitoryArea);
        
        if (otherLivingAreaEl) {
            otherLivingAreaEl.value = otherLivingArea.toFixed(2);
            console.log('设置其他生活用房面积:', otherLivingArea);
        }
        
        // 触发验证检查宿舍面积和生活用房总面积的关系
        if (dormitoryAreaEl) {
            this.validateBuildingAreaInput(dormitoryAreaEl);
        }
        
        return {
            totalLivingArea,
            dormitoryArea,
            otherLivingArea
        };
    },
    
    /**
     * 提交在线数据
     */
    async submitOnlineData() {
        if (currentFormState === FormState.SUBMITTING) {
            console.warn('数据正在提交中，请勿重复提交');
            return;
        }
        
        try {
            currentFormState = FormState.SUBMITTING;
            console.log('开始提交数据...');
            
            // 验证表单数据
            const validationResult = this.validateAllData();
            if (!validationResult.isValid) {
                showAlert('error', `数据验证失败: ${validationResult.errors.join(', ')}`);
                return;
            }
            
            // 收集表单数据
            const formData = this.formatSubmissionData();
            
            // 提交数据
            const response = await DataEntryAPI.submitData(formData);
            
            if (response.success) {
                showAlert('success', '数据提交成功！');
                console.log('数据提交成功:', response);
                // 注意：根据需求，提交后不触发整页刷新，保持当前页面以便继续“计算分析”
            } else {
                showAlert('error', `数据提交失败: ${response.message}`);
                console.error('数据提交失败:', response);
            }
            
        } catch (error) {
            console.error('提交数据时发生错误:', error);
            showAlert('error', '数据提交时发生错误，请稍后重试');
        } finally {
            currentFormState = FormState.READY;
        }
    },
    
    /**
     * 验证所有数据
     */
    validateAllData() {
        const errors = [];
        
        // 验证学校选择
        const schoolName = document.getElementById('schoolName')?.value;
        if (!schoolName) {
            errors.push('请选择学校');
        }
        
        // 验证学生数据
        const studentData = this.calculateTotalStudents();
        if (studentData.totalStudents <= 0) {
            errors.push('学生总数必须大于0');
        }
        
        // 验证建筑面积数据
        const buildingData = this.calculateTotalBuildingArea();
        if (buildingData.totalBuildingArea <= 0) {
            errors.push('建筑总面积必须大于0');
        }
        
        // 验证补助信息
        const subsidyValid = this.validateSubsidyAreas();
        if (!subsidyValid) {
            errors.push('请检查补助信息');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    /**
     * 格式化提交数据
     */
    formatSubmissionData() {
        const studentData = this.calculateTotalStudents();
        const buildingData = this.calculateTotalBuildingArea();
        const livingData = this.calculateOtherLivingArea();
        
        return {
            schoolName: document.getElementById('schoolName')?.value,
            year: new Date().getFullYear(),
            students: studentData,
            buildings: buildingData,
            living: livingData,
            submittedAt: new Date().toISOString(),
            submittedBy: AuthManager.getCurrentUser()?.username
        };
    },
    
    /**
     * 清空页面内容（页面切换时使用，不需要用户确认）
     */
    clearPageContent() {
        console.log('正在清空高校测算页面内容...');
        
        // 获取当前用户信息
        const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
        const isSchoolUser = currentUser && currentUser.role === 'school';
        
        // 重置所有数字输入字段
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.value = '0';
        });
        
        // 重置学校选择（学校用户不清空学校名称）
        const schoolSelect = document.getElementById('schoolName');
        if (schoolSelect) {
            // 如果是学校用户，保留当前学校名称；否则清空
            if (isSchoolUser && currentUser.school_name) {
                // 学校用户保持学校名称不变
                schoolSelect.value = currentUser.school_name;
                console.log('学校用户清空页面：保留学校名称', currentUser.school_name);
            } else {
                // 管理员和建设中心用户清空学校选择
                schoolSelect.value = '';
                console.log('非学校用户清空页面：清空学校名称');
            }
        }
        
        // 重置年份选择
        const yearInput = document.getElementById('year');
        if (yearInput) {
            yearInput.value = '2025';
        }
        
        // 重置备注字段
        const remarksField = document.getElementById('remarks');
        if (remarksField) {
            remarksField.value = '';
        }
        
        // 重置学校类型显示（学校用户保留学校类型信息）
        const schoolTypeDisplay = document.getElementById('schoolTypeDisplay');
        if (schoolTypeDisplay) {
            const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
            
            // 如果是学校用户且选择了学校，触发学校变更事件来更新学校类型
            if (currentUser && currentUser.role === 'school' && currentUser.school_name) {
                // 触发学校选择器的change事件来更新学校类型
                const schoolSelect = document.getElementById('schoolName');
                if (schoolSelect) {
                    this.updateSchoolType();
                }
            } else {
                // 非学校用户清空学校类型显示
                schoolTypeDisplay.textContent = '';
            }
        }
        
        // 清空特殊补助
        const specialSubsidiesContainer = document.getElementById('specialSubsidies');
        if (specialSubsidiesContainer) {
            specialSubsidiesContainer.innerHTML = '';
        }
        
        // 清空分析结果区域
        this.clearAnalysisResults();
        
        // 重新计算所有字段
        this.calculateTotalStudents();
        this.calculateTotalBuildingArea();
        this.calculateOtherLivingArea();
        
        // 清除所有错误状态
        const errorInputs = document.querySelectorAll('.form-control.error');
        errorInputs.forEach(input => {
            this.clearFieldError(input);
        });
        
        // 更新按钮状态
        this.updateCalculateButtonState();
        
        // 重置编辑模式（页面切换时，结束编辑模式）
        if (typeof AutoRefreshManager !== 'undefined') {
            AutoRefreshManager.setEditMode(false);
        }
        
        console.log('高校测算页面内容已清空');
    },
    
    /**
     * 清空分析结果区域
     */
    clearAnalysisResults() {
        // 清空所有分析结果相关的容器内容，但不隐藏容器
        const analysisContainers = [
            'analysisResultsContent',
            'onlineAnalysisResults',
            'calculationResults',
            'resultsSummary',
            'resultsDetails',
            'analysisOutput'
        ];
        
        analysisContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
                // 注意：不设置 display = 'none'，让正常的显示逻辑来控制
            }
        });
        
        // 对于 analysisResultsSection，只清空内容，保持隐藏状态但不强制设置
        const analysisSection = document.getElementById('analysisResultsSection');
        if (analysisSection && analysisSection.style.display !== 'none') {
            // 只有当前是显示状态时才隐藏，避免干扰正常显示逻辑
            analysisSection.style.display = 'none';
        }
        
        // 重置进度区域但不清空，保持功能完整
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none'; // 隐藏但不清空
        }
        
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = '0%'; // 重置进度条宽度
        }
        
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = '准备计算...'; // 重置进度文本
        }
        
        // 清空任何可能存在的结果表格
        const resultTables = document.querySelectorAll('.results-table, .analysis-table');
        resultTables.forEach(table => {
            table.remove();
        });
        
        // 清空统计信息显示区域（但不包括进度条）
        const statisticsElements = document.querySelectorAll('.statistics-display, .calculation-summary');
        statisticsElements.forEach(element => {
            element.remove();
        });
        
        // 清空特殊补助汇总信息
        const subsidySummaries = document.querySelectorAll('.subsidy-summary');
        subsidySummaries.forEach(summary => {
            summary.remove();
        });
        
        // 清空全局分析结果变量（如果存在）
        if (typeof globalAnalysisResult !== 'undefined') {
            globalAnalysisResult = null;
        }
        
        // 清空window.globalAnalysisResult
        if (typeof window !== 'undefined' && window.globalAnalysisResult) {
            window.globalAnalysisResult = null;
        }
        
        console.log('分析结果和统计信息已清空（保留进度条功能）');
    },
    
    /**
     * 重置表单
     */
    resetForm() {
        // 显示确认弹窗
        if (!confirm('确定要清空表单吗？此操作将清除所有已填写的数据，且无法撤销。')) {
            return; // 用户取消，不执行清空操作
        }
        
        // 获取当前用户信息
        const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
        const isSchoolUser = currentUser && currentUser.role === 'school';
        
        // 重置所有数字输入字段
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.value = '0';
        });
        
        // 重置学校选择（学校用户不清空学校名称）
        const schoolSelect = document.getElementById('schoolName');
        if (schoolSelect) {
            // 如果是学校用户，保留当前学校名称；否则清空
            if (isSchoolUser && currentUser.school_name) {
                // 学校用户保持学校名称不变
                schoolSelect.value = currentUser.school_name;
                console.log('学校用户重置表单：保留学校名称', currentUser.school_name);
            } else {
                // 管理员和建设中心用户清空学校选择
                schoolSelect.value = '';
                console.log('非学校用户重置表单：清空学校名称');
            }
        }
        
        // 重置年份选择
        const yearInput = document.getElementById('year');
        if (yearInput) {
            yearInput.value = '2025';
        }
        
        // 重置备注字段
        const remarksField = document.getElementById('remarks');
        if (remarksField) {
            remarksField.value = '';
        }
        
        // 重置学校类型显示（学校用户保留学校类型信息）
        const schoolTypeDisplay = document.getElementById('schoolTypeDisplay');
        if (schoolTypeDisplay) {
            // 如果是学校用户且选择了学校，触发学校变更事件来更新学校类型
            if (isSchoolUser && currentUser.school_name) {
                // 触发学校选择器的change事件来更新学校类型
                const schoolSelect = document.getElementById('schoolName');
                if (schoolSelect) {
                    this.updateSchoolType();
                }
            } else {
                // 非学校用户清空学校类型显示
                schoolTypeDisplay.textContent = '';
            }
        }
        
        // 清空特殊补助
        const specialSubsidiesContainer = document.getElementById('specialSubsidies');
        if (specialSubsidiesContainer) {
            specialSubsidiesContainer.innerHTML = '';
        }
        
        // 重新计算所有字段
        this.calculateTotalStudents();
        this.calculateTotalBuildingArea();
        this.calculateOtherLivingArea();
        
        // 清除所有错误状态
        const errorInputs = document.querySelectorAll('.form-control.error');
        errorInputs.forEach(input => {
            this.clearFieldError(input);
        });
        
        // 更新按钮状态
        this.updateCalculateButtonState();
        
        // 重置编辑模式（用户手动清空表单时，结束编辑模式）
        if (typeof AutoRefreshManager !== 'undefined') {
            AutoRefreshManager.setEditMode(false);
        }
        
        console.log('表单已清空');
        
        // 显示清空成功提示
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: #28a745; 
            color: white; 
            padding: 12px 20px; 
            border-radius: 6px; 
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        message.textContent = '表单已清空';
        document.body.appendChild(message);
        
        // 3秒后移除提示
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 3000);
    },
    
    /**
     * 处理在线表单提交（从 script.js 迁移）
     */
    /**
     * 实时验证建筑面积输入
     * @param {HTMLElement} element - 输入框元素
     */
    validateBuildingAreaInput(element) {
        const value = parseFloat(element.value);
        
        // 清除之前的错误状态
        this.clearFieldError(element);
        
        // 检查负值（无论浏览器是否阻止，都要检查）
        if (element.value !== '' && (isNaN(value) || value < 0)) {
            this.showFieldError(element, '建筑面积不能为负数');
            return;
        }
        
        // 特殊验证：宿舍面积和生活用房总面积的关系
        if (element.id === 'dormitoryArea' || element.id === 'totalLivingArea') {
            const totalLivingArea = parseFloat(document.getElementById('totalLivingArea').value) || 0;
            const dormitoryArea = parseFloat(document.getElementById('dormitoryArea').value) || 0;
            
            const dormElement = document.getElementById('dormitoryArea');
            const totalLivingElement = document.getElementById('totalLivingArea');
            
            // 清除两个字段的关系验证错误（保留负值验证错误）
            [dormElement, totalLivingElement].forEach(el => {
                if (el !== element) { // 不影响当前正在输入的字段
                    const elValue = parseFloat(el.value);
                    // 只清除关系验证错误，如果字段本身没有负值错误就清除
                    if (!(el.value !== '' && (isNaN(elValue) || elValue < 0))) {
                        this.clearFieldError(el);
                    }
                }
            });
            
            // 检查逻辑关系（只有在两个值都非负时才检查关系）
            if (dormitoryArea >= 0 && totalLivingArea >= 0 && dormitoryArea > totalLivingArea) {
                this.showFieldError(dormElement, '学生宿舍面积不能大于生活用房总面积');
                this.showFieldError(totalLivingElement, '生活用房总面积不能小于学生宿舍面积');
            }
        }
    },

    /**
     * 验证建筑面积输入
     * @returns {boolean} 验证是否通过
     */
    validateBuildingAreas() {
        const buildingFields = [
            { id: 'teachingArea', name: '教学及辅助用房面积' },
            { id: 'officeArea', name: '办公用房面积' },
            { id: 'logisticsArea', name: '后勤辅助用房面积' },
            { id: 'totalLivingArea', name: '生活用房总面积' },
            { id: 'dormitoryArea', name: '学生宿舍面积' }
        ];

        let hasError = false;
        let errorMessages = [];

        // 清除之前的错误状态
        buildingFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                this.clearFieldError(element);
            }
        });

        // 验证每个字段
        buildingFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                const value = parseFloat(element.value) || 0;
                
                if (value < 0) {
                    hasError = true;
                    errorMessages.push(`${field.name}不能为负数`);
                    this.showFieldError(element, `${field.name}不能为负数`);
                }
            }
        });

        // 验证宿舍面积不能大于生活用房总面积
        const totalLivingArea = parseFloat(document.getElementById('totalLivingArea').value) || 0;
        const dormitoryArea = parseFloat(document.getElementById('dormitoryArea').value) || 0;
        
        // 检查宿舍面积是否大于生活用房总面积
        if (dormitoryArea > totalLivingArea) {
            hasError = true;
            errorMessages.push('学生宿舍面积不能大于生活用房总面积');
            
            const dormElement = document.getElementById('dormitoryArea');
            const totalLivingElement = document.getElementById('totalLivingArea');
            
            this.showFieldError(dormElement, '学生宿舍面积不能大于生活用房总面积');
            this.showFieldError(totalLivingElement, '生活用房总面积不能小于学生宿舍面积');
        }
        
        // 额外检查：如果生活用房总面积为0但宿舍面积大于0，也是错误的
        if (totalLivingArea === 0 && dormitoryArea > 0) {
            hasError = true;
            errorMessages.push('生活用房总面积不能为0，因为学生宿舍面积大于0');
            
            const totalLivingElement = document.getElementById('totalLivingArea');
            this.showFieldError(totalLivingElement, '生活用房总面积不能为0，因为学生宿舍面积大于0');
        }

        // 如果有错误，显示提示
        if (hasError) {
            const errorMessage = '请检查以下问题：\n• ' + errorMessages.join('\n• ');
            if (typeof showErrorMessage === 'function') {
                showErrorMessage(errorMessage);
            } else {
                alert(errorMessage);
            }
            
            // 滚动到第一个错误字段
            const firstErrorField = buildingFields.find(field => {
                const element = document.getElementById(field.id);
                return element && element.classList.contains('error');
            });
            
            if (firstErrorField) {
                const element = document.getElementById(firstErrorField.id);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => element.focus(), 300);
            }
        }

        return !hasError;
    },

    /**
     * 显示字段错误提示
     * @param {HTMLElement} element - 输入框元素
     * @param {string} message - 错误消息
     */
    showFieldError(element, message) {
        const formGroup = element.closest('.form-group');
        if (!formGroup) return;
        
        // 添加错误样式
        element.classList.add('error');
        element.style.borderColor = '#e74c3c';
        element.style.backgroundColor = '#fdf2f2';
        formGroup.classList.add('has-error');
        
        // 检查是否已有错误消息元素
        let errorElement = formGroup.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            formGroup.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        
        // 更新按钮状态
        this.updateCalculateButtonState();
    },

    /**
     * 清除字段错误提示
     * @param {HTMLElement} element - 输入框元素
     */
    clearFieldError(element) {
        const formGroup = element.closest('.form-group');
        if (!formGroup) return;
        
        // 清除错误样式
        element.classList.remove('error');
        element.style.borderColor = '#ddd';
        element.style.backgroundColor = 'white';
        formGroup.classList.remove('has-error');
        
        // 移除错误消息
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
        
        // 更新按钮状态
        this.updateCalculateButtonState();
    },

    /**
     * 实时验证学生人数输入
     * @param {HTMLElement} element - 输入框元素
     */
    validateStudentNumberInput(element) {
        const value = parseFloat(element.value);
        
        // 清除之前的错误状态
        this.clearFieldError(element);
        
        // 检查负值（无论浏览器是否阻止，都要检查）
        if (element.value !== '' && (isNaN(value) || value < 0)) {
            this.showFieldError(element, '学生人数不能为负数');
        }
    },

    /**
     * 验证学生人数输入
     * @returns {boolean} 验证是否通过
     */
    validateStudentNumbers() {
        const studentFields = [
            { id: 'fullTimeSpecialist', name: '专科全日制学生数' },
            { id: 'fullTimeUndergraduate', name: '本科全日制学生数' },
            { id: 'fullTimeMaster', name: '硕士全日制学生数' },
            { id: 'fullTimeDoctor', name: '博士全日制学生数' },
            { id: 'internationalUndergraduate', name: '本科留学生数' },
            { id: 'internationalMaster', name: '硕士留学生数' },
            { id: 'internationalDoctor', name: '博士留学生数' }
        ];

        let hasError = false;
        let errorMessages = [];

        // 清除之前的错误状态
        studentFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                this.clearFieldError(element);
            }
        });

        // 验证每个字段
        studentFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                const value = parseFloat(element.value) || 0;
                
                if (value < 0) {
                    hasError = true;
                    errorMessages.push(`${field.name}不能为负数`);
                    this.showFieldError(element, `${field.name}不能为负数`);
                }
            }
        });

        // 如果有错误，显示提示
        if (hasError) {
            const errorMessage = '请检查以下问题：\n• ' + errorMessages.join('\n• ');
            if (typeof showErrorMessage === 'function') {
                showErrorMessage(errorMessage);
            } else {
                alert(errorMessage);
            }
            
            // 滚动到第一个错误字段
            const firstErrorField = studentFields.find(field => {
                const element = document.getElementById(field.id);
                return element && element.classList.contains('error');
            });
            
            if (firstErrorField) {
                const element = document.getElementById(firstErrorField.id);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => element.focus(), 300);
            }
        }

        return !hasError;
    },

    /**
     * 验证必填项
     * @returns {boolean} 验证是否通过
     */
    validateRequiredFields() {
        const requiredFields = [
            { id: 'schoolName', name: '学校名称' },
            { id: 'year', name: '年份' }
        ];

        let hasError = false;
        let errorMessages = [];

        // 清除之前的错误状态
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                this.clearFieldError(element);
            }
        });

        // 验证每个字段
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                const value = element.value ? element.value.trim() : '';
                
                if (!value) {
                    hasError = true;
                    errorMessages.push(`${field.name}为必填项，不能为空`);
                    this.showFieldError(element, `${field.name}为必填项，不能为空`);
                }
            }
        });

        // 如果有错误，显示提示
        if (hasError) {
            const errorMessage = '请检查以下问题：\n• ' + errorMessages.join('\n• ');
            if (typeof showErrorMessage === 'function') {
                showErrorMessage(errorMessage);
            } else {
                alert(errorMessage);
            }
            
            // 滚动到第一个错误字段
            const firstErrorField = requiredFields.find(field => {
                const element = document.getElementById(field.id);
                return element && element.classList.contains('error');
            });
            
            if (firstErrorField) {
                const element = document.getElementById(firstErrorField.id);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => element.focus(), 300);
            }
        }

        return !hasError;
    },

    /**
     * 实时验证必填项输入
     * @param {HTMLElement} element - 输入框元素
     */
    validateRequiredInput(element) {
        const value = element.value ? element.value.trim() : '';
        
        // 清除之前的错误状态
        this.clearFieldError(element);
        
        // 如果值为空，添加错误样式
        if (!value) {
            this.showFieldError(element, '此字段为必填项，不能为空');
        }
    },

    /**
     * 验证补助名称输入
     * @param {HTMLElement} element - 输入元素
     * @param {boolean} isAutoFill - 是否为自动填充，自动填充时不立即显示错误
     */
    validateSubsidyNameInput(element, isAutoFill = false) {
        const value = element.value.trim();
        
        // 清除之前的错误状态
        this.clearFieldError(element);
        
        // 如果是自动填充且有值，不显示错误
        if (isAutoFill && value !== '') {
            return;
        }
        
        // 检查是否为空
        if (value === '') {
            this.showFieldError(element, '特殊用房补助名称不能为空');
        }
    },

    /**
     * 实时验证补助面积输入
     * @param {HTMLElement} element - 输入框元素
     * @param {boolean} isAutoFill - 是否为自动填充，自动填充时不立即显示错误
     */
    validateSubsidyAreaInput(element, isAutoFill = false) {
        const value = parseFloat(element.value);
        
        // 清除之前的错误状态
        this.clearFieldError(element);
        
        // 如果是自动填充且值大于0，不显示错误
        if (isAutoFill && value > 0) {
            return;
        }
        
        // 检查是否大于0
        if (element.value !== '' && (isNaN(value) || value <= 0)) {
            this.showFieldError(element, '特殊用房补助建筑面积必须大于0');
        }
    },

    /**
     * 处理补助名称输入（标记用户交互）
     * @param {HTMLElement} element - 输入元素
     */
    handleSubsidyNameInput(element) {
        // 标记用户已经开始输入
        element.dataset.userInteracted = 'true';
        
        // 清除错误状态（允许用户输入时清除错误）
        this.clearFieldError(element);
        
        // 如果输入为空，立即显示错误
        if (element.value.trim() === '') {
            this.validateSubsidyNameInput(element, false);
        }
    },

    /**
     * 处理补助面积输入（标记用户交互）
     * @param {HTMLElement} element - 输入元素
     */
    handleSubsidyAreaInput(element) {
        // 标记用户已经开始输入
        element.dataset.userInteracted = 'true';
        
        // 更新汇总
        this.updateSubsidySummary();
        
        // 清除错误状态（允许用户输入时清除错误）
        this.clearFieldError(element);
        
        // 如果值无效，立即显示错误
        const value = parseFloat(element.value);
        if (element.value !== '' && (isNaN(value) || value <= 0)) {
            this.validateSubsidyAreaInput(element, false);
        }
    },

    /**
     * 验证补助信息（名称和面积）
     * @returns {boolean} 验证是否通过
     */
    validateSubsidyAreas() {
        const subsidyNameInputs = document.querySelectorAll('input[name="subsidyName[]"]');
        const subsidyAreaInputs = document.querySelectorAll('input[name="subsidyArea[]"]');
        
        let hasError = false;
        let errorMessages = [];

        // 清除之前的错误状态
        subsidyNameInputs.forEach(element => {
            this.clearFieldError(element);
        });
        subsidyAreaInputs.forEach(element => {
            this.clearFieldError(element);
        });

        // 验证每个补助名称和面积字段
        subsidyNameInputs.forEach((nameElement, index) => {
            const nameValue = nameElement.value.trim();
            const areaElement = subsidyAreaInputs[index];
            const areaValue = areaElement ? parseFloat(areaElement.value) : 0;
            
            // 验证补助名称
            if (nameValue === '') {
                hasError = true;
                errorMessages.push(`第${index + 1}个补助名称不能为空`);
                this.showFieldError(nameElement, '补助名称不能为空');
            }
            
            // 验证补助面积（必须大于0）
            if (areaElement && (isNaN(areaValue) || areaValue <= 0)) {
                hasError = true;
                errorMessages.push(`第${index + 1}个补助建筑面积必须大于0`);
                this.showFieldError(areaElement, '补助建筑面积必须大于0');
            }
        });

        // 如果有错误，显示提示
        if (hasError) {
            const errorMessage = '请检查以下问题：\n• ' + errorMessages.join('\n• ');
            if (typeof showErrorMessage === 'function') {
                showErrorMessage(errorMessage);
            } else {
                alert(errorMessage);
            }
            
            // 滚动到第一个错误字段
            const allInputs = [...subsidyNameInputs, ...subsidyAreaInputs];
            const firstErrorField = allInputs.find(element => {
                return element.classList.contains('error');
            });
            
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => firstErrorField.focus(), 300);
            }
        }

        return !hasError;
    },

    async handleFormSubmit(event) {
        event.preventDefault();
        
        // 验证必填项
        const requiredValidation = this.validateRequiredFields();
        
        // 验证学生人数输入
        const studentValidation = this.validateStudentNumbers();
        
        // 验证建筑面积输入
        const buildingValidation = this.validateBuildingAreas();
        
        // 验证补助面积输入
        const subsidyValidation = this.validateSubsidyAreas();
        
        // 如果任何验证失败，停止提交
        if (!requiredValidation || !studentValidation || !buildingValidation || !subsidyValidation) {
            return;
        }
        
        try {
            const formData = new FormData(event.target);
            
            // 收集特殊补助数据
            const specialSubsidies = this.getSpecialSubsidiesData();
            
            // 构造数据对象
            const schoolData = this.formatOnlineSubmissionData(formData);
            
            // 显示进度
            if (typeof showProgress === 'function') showProgress();
            if (typeof updateProgress === 'function') updateProgress(20, '正在处理数据...');
            
            // 发送到服务器处理
            const response = await fetch('/online-calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schoolData: schoolData,
                    specialSubsidies: specialSubsidies
                })
            });
            
            if (typeof updateProgress === 'function') updateProgress(60, '正在计算分析...');
            
            if (!response.ok) {
                throw new Error(`服务器错误: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (typeof updateProgress === 'function') updateProgress(100, '计算完成!');
            
            // 显示结果
            setTimeout(() => {
                if (typeof hideProgress === 'function') hideProgress();
                this.displayCalculationResult(result);
            }, 500);
            
        } catch (error) {
            console.error('计算失败:', error);
            if (typeof hideProgress === 'function') hideProgress();
            if (typeof showErrorMessage === 'function') {
                showErrorMessage('计算失败: ' + error.message);
            } else {
                alert('计算失败: ' + error.message);
            }
        }
    },
    
    /**
     * 获取特殊补助数据
     */
    getSpecialSubsidiesData() {
        const specialSubsidies = [];
        const subsidyNames = document.querySelectorAll('input[name="subsidyName[]"]');
        const subsidyAreas = document.querySelectorAll('input[name="subsidyArea[]"]');
        
        for (let i = 0; i < subsidyNames.length; i++) {
            const name = subsidyNames[i] ? subsidyNames[i].value.trim() : '';
            const area = subsidyAreas[i] ? parseFloat(subsidyAreas[i].value) : 0;
            
            if (name && area > 0) {
                specialSubsidies.push({
                    '特殊用房补助名称': name,
                    '补助面积（m²）': parseFloat(area.toFixed(2))
                });
            }
        }
        
        return specialSubsidies;
    },
    
    /**
     * 格式化在线提交数据
     */
    formatOnlineSubmissionData(formData) {
        // 获取学校名称
        let finalSchoolName = formData.get('schoolName');
        if (!finalSchoolName) {
            const schoolNameSelect = document.getElementById('schoolName');
            if (schoolNameSelect) {
                finalSchoolName = schoolNameSelect.value;
            }
            // 如果还是没有，尝试从全局用户信息获取
            if (!finalSchoolName && typeof currentUser !== 'undefined' && currentUser && currentUser.school_name) {
                finalSchoolName = currentUser.school_name;
            }
        }
        
        // 获取学校类型
        const schoolTypeDisplay = document.getElementById('schoolTypeDisplay');
        const schoolTypeText = schoolTypeDisplay ? schoolTypeDisplay.textContent : '';
        const schoolType = schoolTypeText ? schoolTypeText.replace('学校类型: ', '') : null;
        
        // 兼容历史字段：优先用本科字段，无则用本专科字段
        let fullTimeUndergraduate = formData.get('fullTimeUndergraduate');
        let fullTimeSpecialist = formData.get('fullTimeSpecialist');
        let fullTimeBachelorAndSpecialist = formData.get('fullTimeBachelorAndSpecialist');

        let undergraduateVal = null;
        if (fullTimeUndergraduate !== null && fullTimeUndergraduate !== undefined && fullTimeUndergraduate !== "") {
            undergraduateVal = parseInt(fullTimeUndergraduate) || 0;
        } else if (fullTimeBachelorAndSpecialist !== null && fullTimeBachelorAndSpecialist !== undefined && fullTimeBachelorAndSpecialist !== "") {
            undergraduateVal = parseInt(fullTimeBachelorAndSpecialist) || 0;
        } else {
            undergraduateVal = 0;
        }

        let specialistVal = parseInt(fullTimeSpecialist) || 0;

        const schoolData = {
            '学校名称': finalSchoolName,
            '学校类型': schoolType,
            '年份': parseInt(formData.get('year')),
            '全日制本科生人数': undergraduateVal,
            '全日制专科生人数': specialistVal,
            '全日制硕士生人数': parseInt(formData.get('fullTimeMaster')) || 0,
            '全日制博士生人数': parseInt(formData.get('fullTimeDoctor')) || 0,
            '留学生本科生人数': parseInt(formData.get('internationalUndergraduate')) || 0,
            '留学生专科生人数': parseInt(formData.get('internationalSpecialist')) || 0,
            '留学生硕士生人数': parseInt(formData.get('internationalMaster')) || 0,
            '留学生博士生人数': parseInt(formData.get('internationalDoctor')) || 0,
            '学生总人数': parseInt(document.getElementById('totalStudents').value.replace(/,/g, '')), // 移除千分符
            '现有教学及辅助用房面积': parseFloat(formData.get('teachingArea')),
            '现有办公用房面积': parseFloat(formData.get('officeArea')),
            '现有生活用房总面积': parseFloat(formData.get('totalLivingArea')),
            '现有学生宿舍面积': parseFloat(formData.get('dormitoryArea')),
            '现有后勤辅助用房面积': parseFloat(formData.get('logisticsArea')),
            '备注': formData.get('remarks') || ''
        };
        return schoolData;
    },
    
    /**
     * 显示计算结果
     */
    displayCalculationResult(result) {
        // 保存完整的结果数据供下载使用
        if (typeof window !== 'undefined') {
            window.globalAnalysisResult = result;
        }
        
        // 显示详细的分析结果
        if (typeof displayOnlineCalculationResult === 'function') {
            displayOnlineCalculationResult(result);
        } else if (typeof showAnalysisResults === 'function') {
            showAnalysisResults([result.schoolData]);
        }
        
        // 滚动到分析结果区域
        const analysisSection = document.getElementById('analysisResultsSection');
        if (analysisSection) {
            analysisSection.scrollIntoView({ behavior: 'smooth' });
        }
    },
    
    /**
     * 更新学校类型显示
     */
    async updateSchoolType() {
        const schoolSelect = document.getElementById('schoolName');
        const schoolTypeDisplay = document.getElementById('schoolTypeDisplay');
        
        if (!schoolSelect || !schoolTypeDisplay) {
            return;
        }
        
        const selectedSchool = schoolSelect.value;
        if (!selectedSchool) {
            schoolTypeDisplay.textContent = '';
            this.updateCalculateButtonState();
            return;
        }
        
        try {
            // 从API获取学校类型映射
            const response = await fetch('/api/schools/type-mapping');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success && result.data) {
                const schoolType = result.data[selectedSchool];
                if (schoolType) {
                    schoolTypeDisplay.textContent = `学校类型: ${schoolType}`;
                } else {
                    schoolTypeDisplay.textContent = '学校类型: 未知';
                }
            } else {
                throw new Error('获取学校类型映射失败');
            }
        } catch (error) {
            console.error('获取学校类型失败:', error);
            // 降级处理：使用硬编码的学校类型作为备选
            const fallbackSchoolTypes = {
                '上海大学': '综合院校',
                '上海交通大学医学院': '医药院校',
                '上海理工大学': '理工院校',
                '上海师范大学': '师范院校',
                '上海科技大学': '理工院校',
                '华东政法大学': '政法院校',
                '上海海事大学': '理工院校',
                '上海海洋大学': '理工院校',
                '上海中医药大学': '医药院校',
                '上海体育大学': '体育院校',
                '上海音乐学院': '艺术院校',
                '上海戏剧学院': '艺术院校',
                '上海电力大学': '理工院校',
                '上海对外经贸大学': '财经院校',
                '上海应用技术大学': '理工院校',
                '上海立信会计金融学院': '财经院校',
                '上海工程技术大学': '理工院校',
                '上海第二工业大学': '理工院校',
                '上海商学院': '财经院校',
                '上海电机学院': '理工院校',
                '上海政法学院': '政法院校',
                '上海健康医学院': '医药院校',
                '上海出版印刷高等专科学校': '理工院校',
                '上海旅游高等专科学校': '师范院校',
                '上海城建职业学院': '理工院校',
                '上海电子信息职业技术学院': '理工院校',
                '上海工艺美术职业学院': '理工院校',
                '上海农林职业技术学院': '农业院校',
                '上海健康医学院附属卫生学校(上海健康护理职业学院(筹))': '医药院校'
            };
            
            const fallbackType = fallbackSchoolTypes[selectedSchool];
            if (fallbackType) {
                schoolTypeDisplay.textContent = `学校类型: ${fallbackType}`;
            } else {
                schoolTypeDisplay.textContent = '学校类型: 未知';
            }
        }
        
        // 更新按钮状态
        this.updateCalculateButtonState();
    },
    
    /**
     * 特殊补助管理功能
     */
    addSubsidy() {
        const container = document.getElementById('specialSubsidies');
        if (!container) {
            console.error('找不到特殊补助容器');
            return;
        }
        
        // 如果是第一个补助项，添加表头
        if (container.children.length === 0) {
            const headerHtml = `
                <div class="subsidy-header" style="display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-weight: bold; color: #495057;">
                    <div style="flex: 2; margin-right: 15px;">特殊用房补助名称 *</div>
                    <div style="flex: 1; margin-right: 15px;">特殊用房补助建筑面积(m²) *</div>
                    <div style="width: 80px;">操作</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', headerHtml);
        }
        
        // 创建新的补助项
        const subsidyHtml = `
            <div class="subsidy-item" style="display: flex; align-items: center; margin-bottom: 10px; padding: 10px; background: white; border: 1px solid #e9ecef; border-radius: 5px;">
                <div style="flex: 2; margin-right: 15px;">
                    <div class="form-group">
                        <input type="text" name="subsidyName[]" placeholder="例如：重点实验室补助" class="form-control subsidy-name-input" oninput="DataEntryManager.handleSubsidyNameInput(this);" onblur="DataEntryManager.validateSubsidyNameInput(this, false);" style="background: white; border: 1px solid #ddd; padding: 8px; border-radius: 4px; width: 100%;">
                    </div>
                </div>
                <div style="flex: 1; margin-right: 15px;">
                    <div class="form-group">
                        <input type="number" name="subsidyArea[]" value="0.00" step="0.01" class="form-control subsidy-area-input" oninput="DataEntryManager.handleSubsidyAreaInput(this);" onblur="formatSubsidyArea(this); DataEntryManager.validateSubsidyAreaInput(this, false);" onchange="DataEntryManager.validateSubsidyAreaInput(this, false);" style="background: white; border: 1px solid #ddd; padding: 8px; border-radius: 4px; width: 100%;">
                    </div>
                </div>
                <div style="width: 80px;">
                    <button type="button" onclick="DataEntryManager.removeSubsidy(this)" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">删除</button>
                </div>
            </div>
        `;
        
        // 插入到汇总行之前
        const summaryRow = container.querySelector('.subsidy-summary');
        if (summaryRow) {
            summaryRow.insertAdjacentHTML('beforebegin', subsidyHtml);
        } else {
            container.insertAdjacentHTML('beforeend', subsidyHtml);
            // 添加汇总行
            this.addSubsidySummary();
        }
        
        this.updateSubsidySummary();
        
        // 延迟验证新添加的补助项，让用户知道需要填写
        setTimeout(() => {
            const newItems = container.querySelectorAll('.subsidy-item:not(.subsidy-summary)');
            if (newItems.length > 0) {
                const lastItem = newItems[newItems.length - 1];
                const nameInput = lastItem.querySelector('input[name="subsidyName[]"]');
                const areaInput = lastItem.querySelector('input[name="subsidyArea[]"]');
                
                if (nameInput) {
                    this.validateSubsidyNameInput(nameInput, false);
                }
                if (areaInput) {
                    this.validateSubsidyAreaInput(areaInput, false);
                }
            }
        }, 100);
    },
    
    /**
     * 删除补助项
     */
    removeSubsidy(button) {
        const subsidyItem = button.closest('.subsidy-item');
        if (subsidyItem) {
            subsidyItem.remove();
            
            // 检查是否还有补助项（除了汇总行）
            const container = document.getElementById('specialSubsidies');
            const remainingItems = container.querySelectorAll('.subsidy-item:not(.subsidy-summary)');
            
            if (remainingItems.length === 0) {
                // 如果没有补助项了，清空整个容器（包括表头和汇总行）
                container.innerHTML = '';
            } else {
                this.updateSubsidySummary();
            }
            
            // 更新按钮状态
            this.updateCalculateButtonState();
        }
    },
    
    /**
     * 添加补助汇总行
     */
    addSubsidySummary() {
        const container = document.getElementById('specialSubsidies');
        if (!container || container.querySelector('.subsidy-summary')) return;
        
        const summaryHtml = `
            <div class="subsidy-summary subsidy-item" style="display: flex; align-items: center; margin-top: 15px; padding: 10px; background: transparent; border: none; border-radius: 5px; font-weight: bold;">
                <div style="flex: 2; margin-right: 15px;">
                    <div style="margin-bottom: 5px; color: #495057; font-size: 14px;">特殊用房补助数量</div>
                    <input type="text" id="subsidyTotalCount" readonly class="form-control calculated-field" value="0" style="background: #f5f5f5; border: none; padding: 8px; border-radius: 4px; width: 100%; font-weight: bold; text-align: center;">
                </div>
                <div style="flex: 1; margin-right: 15px;">
                    <div style="margin-bottom: 5px; color: #495057; font-size: 14px;">特殊用房补助建筑总面积(m²)</div>
                    <input type="text" id="subsidyTotalArea" readonly class="form-control calculated-field" value="0.00" style="background: #f5f5f5; border: none; padding: 8px; border-radius: 4px; width: 100%; font-weight: bold; text-align: center;">
                </div>
                <div style="width: 80px;"></div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', summaryHtml);
    },
    
    /**
     * 更新补助汇总
     */
    updateSubsidySummary() {
        const container = document.getElementById('specialSubsidies');
        if (!container) return;
        
        const subsidyInputs = container.querySelectorAll('input[name="subsidyArea[]"]');
        const nameInputs = container.querySelectorAll('input[name="subsidyName[]"]');
        let total = 0;
        let count = 0;
        
        subsidyInputs.forEach((input, index) => {
            const value = parseFloat(input.value) || 0;
            total += value;
        });
        
        // 计算所有添加的补助项目数量（不论是否填写）
        count = subsidyInputs.length;
        
        const totalInput = document.getElementById('subsidyTotalArea');
        if (totalInput) {
            totalInput.value = total.toFixed(2);
        }
        
        const countInput = document.getElementById('subsidyTotalCount');
        if (countInput) {
            countInput.value = count;
        }
    }
};

// ========================================
// 兼容性函数（保持向后兼容）
// ========================================

/**
 * 初始化在线表单（兼容性）
 */
function initializeOnlineForm() {
    return DataEntryManager.initialize();
}

/**
 * 计算学生总数（兼容性）
 */
function calculateTotalStudents() {
    return DataEntryManager.calculateTotalStudents();
}

/**
 * 计算建筑总面积（兼容性）
 */
function calculateTotalBuildingArea() {
    return DataEntryManager.calculateTotalBuildingArea();
}

/**
 * 计算其他生活用房面积（兼容性）
 */
function calculateOtherLivingArea() {
    return DataEntryManager.calculateOtherLivingArea();
}

/**
 * 更新学校类型（兼容性）
 */
function updateSchoolType() {
    return DataEntryManager.updateSchoolType();
}

/**
 * 提交在线数据（兼容性）
 */
function submitOnlineData() {
    return DataEntryManager.submitOnlineData();
}

/**
 * 处理在线表单提交（兼容性）
 */
function handleOnlineFormSubmit(event) {
    return DataEntryManager.handleFormSubmit(event);
}

/**
 * 特殊补助管理函数（兼容性）
 */
function addSubsidy() {
    return DataEntryManager.addSubsidy();
}

function removeSubsidy(button) {
    return DataEntryManager.removeSubsidy(button);
}

function updateSubsidySummary() {
    return DataEntryManager.updateSubsidySummary();
}

function formatSubsidyArea(input) {
    const value = parseFloat(input.value) || 0;
    input.value = (typeof formatToTwoDecimals === 'function') ? formatToTwoDecimals(value) : value.toFixed(2);
    // 触发汇总更新
    DataEntryManager.updateSubsidySummary();
    // 触发验证
    DataEntryManager.validateSubsidyAreaInput(input, false);
};

/**
 * 验证学生人数输入（全局函数）
 */
function validateStudentInput(element) {
    if (typeof DataEntryManager !== 'undefined') {
        DataEntryManager.validateStudentNumberInput(element);
    } else {
        console.error('DataEntryManager is not defined');
    }
}

/**
 * 验证建筑面积输入（全局函数）
 */
function validateBuildingAreaInput(element) {
    console.log('validateBuildingAreaInput called for:', element.id, 'value:', element.value);
    if (typeof DataEntryManager !== 'undefined') {
        DataEntryManager.validateBuildingAreaInput(element);
    } else {
        console.error('DataEntryManager is not defined');
    }
}

/**
 * 验证必填项输入（全局函数）
 */
function validateRequiredInput(element) {
    if (typeof DataEntryManager !== 'undefined') {
        DataEntryManager.validateRequiredInput(element);
    }
}

/**
 * 验证补助面积输入（全局函数）
 */
function validateSubsidyAreaInput(element) {
    if (typeof DataEntryManager !== 'undefined') {
        DataEntryManager.validateSubsidyAreaInput(element, false);
    }
}

// ========================================
// 兼容性函数（保持向后兼容）
// ========================================

/**
 * 初始化在线表单（兼容性）
 */
function initializeOnlineForm() {
    return DataEntryManager.initialize();
}

/**
 * 计算学生总数（兼容性）
 */
function calculateTotalStudents() {
    return DataEntryManager.calculateTotalStudents();
}

/**
 * 计算建筑总面积（兼容性）
 */
function calculateTotalBuildingArea() {
    return DataEntryManager.calculateTotalBuildingArea();
}

/**
 * 计算其他生活用房面积（兼容性）
 */
function calculateOtherLivingArea() {
    return DataEntryManager.calculateOtherLivingArea();
}

/**
 * 更新学校类型（兼容性）
 * 现在调用 handleSchoolChange 来同时重置表单
 */
function updateSchoolType() {
    console.log('全局 updateSchoolType 被调用，转发到 handleSchoolChange');
    return DataEntryManager.handleSchoolChange();
}

/**
 * 提交在线数据（兼容性）
 */
function submitOnlineData() {
    return DataEntryManager.submitOnlineData();
}

// ========================================
// 导出到全局作用域
// ========================================

if (typeof window !== 'undefined') {
    // 主管理器
    window.DataEntryManager = DataEntryManager;
    window.YearSelectorManager = YearSelectorManager;
    
    // 年份选择器函数 (向后兼容)
    window.showYearGrid = () => YearSelectorManager.showYearGrid();
    window.hideYearGrid = () => YearSelectorManager.hideYearGrid();
    window.moveYearGrid = (direction) => YearSelectorManager.moveYearGrid(direction);
    window.updateYearGrid = () => YearSelectorManager.updateYearGrid();
    window.selectYear = (year) => YearSelectorManager.selectYear(year);
    window.handleYearGridKeyboard = (event) => YearSelectorManager.handleYearGridKeyboard(event);
    
    // 兼容性函数
    window.initializeOnlineForm = initializeOnlineForm;
    window.calculateTotalStudents = calculateTotalStudents;
    window.calculateTotalBuildingArea = calculateTotalBuildingArea;
    window.calculateOtherLivingArea = calculateOtherLivingArea;
    window.submitOnlineData = submitOnlineData;
    window.updateSchoolType = updateSchoolType;
    window.handleOnlineFormSubmit = handleOnlineFormSubmit;
    window.resetForm = () => DataEntryManager.resetForm();
    
    // 特殊补助管理函数
    window.addSubsidy = addSubsidy;
    window.removeSubsidy = removeSubsidy;
    window.updateSubsidySummary = updateSubsidySummary;
    window.formatSubsidyArea = formatSubsidyArea;
    
    // 验证函数
    window.validateStudentInput = validateStudentInput;
    window.validateBuildingAreaInput = validateBuildingAreaInput;
    window.validateRequiredInput = validateRequiredInput;
    window.validateSubsidyAreaInput = validateSubsidyAreaInput;
    
    // 常量
    window.FormState = FormState;
    window.CalculationStandards = CalculationStandards;
}

// ========================================
// 模块信息
// ========================================

console.log('✅ 数据填报模块 (dataEntry.js) 已加载');
console.log('📦 提供功能: 学生计算、建筑面积计算、数据提交、表单管理');
console.log('🔗 依赖模块: api.js, utils.js, auth.js');
