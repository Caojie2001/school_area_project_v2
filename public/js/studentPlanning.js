/**
 * 规划学生数管理页面脚本
 * 用于管理学校的规划学生数数据
 */

// ==========================================
// 全局变量
// ==========================================
let currentSchoolData = null;

// ==========================================
// 页面初始化
// ==========================================

/**
 * 初始化页面
 */
function initializePage() {
    console.log('📢 规划学生数管理页面初始化');
    
    // 加载学校列表
    loadSchools();
    
    // 绑定事件
    bindEvents();
    
    console.log('✅ 页面初始化完成');
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
    // 保存按钮
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveStudentData);
    }
    
    // 重置按钮
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', resetForm);
    }
    
    // 加载按钮
    const loadButton = document.getElementById('loadButton');
    if (loadButton) {
        loadButton.addEventListener('click', loadStudentData);
    }
}

// ==========================================
// 学校选择相关
// ==========================================

/**
 * 加载学校列表
 */
async function loadSchools() {
    const schoolSelect = document.getElementById('schoolName');
    
    try {
        const response = await fetch('/api/schools', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('获取学校列表失败');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // 清空现有选项
            schoolSelect.innerHTML = '<option value="">请选择学校</option>';
            
            // 添加学校选项
            result.data.forEach(school => {
                const option = document.createElement('option');
                option.value = school.school_name;
                option.textContent = school.school_name;
                option.dataset.schoolType = school.school_type || '';
                option.dataset.schoolId = school.id;
                schoolSelect.appendChild(option);
            });
            
            console.log(`✅ 已加载 ${result.data.length} 所学校`);
        }
    } catch (error) {
        console.error('加载学校列表失败:', error);
        showMessage('加载学校列表失败: ' + error.message, 'error');
    }
}

/**
 * 处理学校选择变化
 */
function handleSchoolChange() {
    const schoolSelect = document.getElementById('schoolName');
    const selectedOption = schoolSelect.options[schoolSelect.selectedIndex];
    const schoolTypeDisplay = document.getElementById('schoolTypeDisplay');
    
    if (schoolSelect.value && schoolTypeDisplay) {
        // 显示学校类型
        const schoolType = selectedOption.dataset.schoolType || '';
        schoolTypeDisplay.textContent = schoolType ? `学校类型: ${schoolType}` : '';
        schoolTypeDisplay.style.display = 'block';
        
        console.log('已选择学校:', schoolSelect.value, '学校类型:', schoolType);
        
        // 自动加载该学校的学生数数据
        autoLoadStudentData(schoolSelect.value);
    } else if (schoolTypeDisplay) {
        // 隐藏学校类型
        schoolTypeDisplay.textContent = '';
        schoolTypeDisplay.style.display = 'none';
        
        // 清空表单
        resetForm();
    }
}

/**
 * 自动加载学生数据
 */
async function autoLoadStudentData(schoolName) {
    try {
        console.log('📢 自动加载学生数数据:', schoolName);
        
        // 获取当前用户信息
        const user = AuthManager.getCurrentUser();
        const username = user?.username;
        
        if (!username) {
            console.warn('无法获取用户信息，跳过自动加载');
            return;
        }
        
        // 调用 API 获取学生数数据
        const response = await fetch(
            `/api/planned-students?schoolName=${encodeURIComponent(schoolName)}&submitterUsername=${encodeURIComponent(username)}`,
            { credentials: 'include' }
        );
        
        if (!response.ok) {
            console.log('该学校暂无学生数数据');
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            const data = result.data[0];
            console.log('✅ 自动加载学生数数据成功:', data);
            
            // 填充表单
            fillFormWithData(data);
        } else {
            console.log('ℹ️ 该学校暂无学生数数据');
        }
    } catch (error) {
        console.error('自动加载学生数数据失败:', error);
        // 静默处理，不显示错误
    }
}

// ==========================================
// 数据操作
// ==========================================

/**
 * 保存学生数数据
 */
async function saveStudentData() {
    try {
        console.log('📢 保存学生数数据');
        
        // 收集数据
        const data = collectFormData();
        if (!data) return;
        
        // 验证数据
        const validation = validateStudentData(data);
        if (!validation.valid) {
            showMessage(validation.message, 'error');
            return;
        }
        
        // 确认操作
        if (!confirm(`确定要保存规划学生数数据吗？\n\n学校：${data.schoolName}`)) {
            return;
        }
        
        // 显示加载状态
        const saveButton = document.getElementById('saveButton');
        const originalText = saveButton.textContent;
        saveButton.textContent = '保存中...';
        saveButton.disabled = true;
        
        // 调用 API
        const response = await fetch('/api/planned-students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('规划学生数数据保存成功！', 'success');
        } else {
            throw new Error(result.message || '保存失败');
        }
        
    } catch (error) {
        console.error('保存学生数数据失败:', error);
        showMessage('保存失败: ' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        const saveButton = document.getElementById('saveButton');
        saveButton.textContent = '保存规划学生数';
        saveButton.disabled = false;
    }
}

/**
 * 加载学生数数据
 */
async function loadStudentData() {
    try {
        const schoolName = document.getElementById('schoolName').value;
        
        if (!schoolName) {
            showMessage('请先选择学校', 'warning');
            return;
        }
        
        // 获取当前用户信息
        const user = AuthManager.getCurrentUser();
        const username = user?.username;
        
        if (!username) {
            showMessage('无法获取用户信息', 'error');
            return;
        }
        
        showMessage('正在加载数据...', 'info');
        
        // 调用 API
        const response = await fetch(
            `/api/planned-students?schoolName=${encodeURIComponent(schoolName)}&submitterUsername=${encodeURIComponent(username)}`,
            { credentials: 'include' }
        );
        
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            const data = result.data[0];
            fillFormWithData(data);
            showMessage('数据加载成功', 'success');
        } else {
            showMessage('未找到已保存的数据', 'warning');
        }
        
    } catch (error) {
        console.error('加载数据失败:', error);
        showMessage('加载数据失败: ' + error.message, 'error');
    }
}

/**
 * 收集表单数据
 */
function collectFormData() {
    const schoolName = document.getElementById('schoolName').value;
    
    if (!schoolName) {
        showMessage('请先选择学校', 'warning');
        return null;
    }
    
    return {
        schoolName: schoolName,
        currentStudentCount: parseInt(document.getElementById('currentStudentCount').value) || 0,
        currentDataSource: document.getElementById('currentDataSource').value?.trim() || '',
        currentDataDate: document.getElementById('currentDataDate').value || null,
        currentRemarks: document.getElementById('currentRemarks').value?.trim() || '',
        plannedStudentCount: parseInt(document.getElementById('plannedStudentCount').value) || 0,
        plannedYear: parseInt(document.getElementById('plannedYear').value) || null,
        plannedDataSource: document.getElementById('plannedDataSource').value?.trim() || '',
        plannedRemarks: document.getElementById('plannedRemarks').value?.trim() || ''
    };
}

/**
 * 验证学生数数据
 */
function validateStudentData(data) {
    // 检查学生数是否为负数
    if (data.currentStudentCount < 0) {
        return {
            valid: false,
            message: '现状学生数不能为负数'
        };
    }
    
    if (data.plannedStudentCount < 0) {
        return {
            valid: false,
            message: '规划学生数不能为负数'
        };
    }
    
    // 检查规划年份
    if (data.plannedYear && (data.plannedYear < 2024 || data.plannedYear > 2050)) {
        return {
            valid: false,
            message: '规划年份应在 2024-2050 之间'
        };
    }
    
    return { valid: true };
}

/**
 * 填充表单数据
 */
function fillFormWithData(data) {
    console.log('📊 填充表单数据:', data);
    
    // 填充现状学生数
    document.getElementById('currentStudentCount').value = data.current_student_count || 0;
    document.getElementById('currentDataSource').value = data.current_data_source || '';
    document.getElementById('currentDataDate').value = data.current_data_date || '';
    document.getElementById('currentRemarks').value = data.current_remarks || '';
    
    // 填充规划学生数
    document.getElementById('plannedStudentCount').value = data.planned_student_count || 0;
    document.getElementById('plannedYear').value = data.planned_year || '';
    document.getElementById('plannedDataSource').value = data.planned_data_source || '';
    document.getElementById('plannedRemarks').value = data.planned_remarks || '';
    
    console.log('✅ 表单数据填充完成');
}

/**
 * 重置表单
 */
function resetForm() {
    if (confirm('确定要重置表单吗？所有未保存的数据将丢失。')) {
        // 清空所有输入框
        document.getElementById('currentStudentCount').value = '0';
        document.getElementById('currentDataSource').value = '';
        document.getElementById('currentDataDate').value = '';
        document.getElementById('currentRemarks').value = '';
        
        document.getElementById('plannedStudentCount').value = '0';
        document.getElementById('plannedYear').value = '';
        document.getElementById('plannedDataSource').value = '';
        document.getElementById('plannedRemarks').value = '';
        
        showMessage('表单已重置', 'info');
    }
}

// ==========================================
// 工具函数
// ==========================================

/**
 * 显示消息提示
 */
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
    
    // 添加样式（如果还没有）
    if (!document.getElementById('message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            .message {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            }
            .message-info {
                background: #e3f2fd;
                color: #1976d2;
                border-left: 4px solid #1976d2;
            }
            .message-success {
                background: #e8f5e9;
                color: #388e3c;
                border-left: 4px solid #388e3c;
            }
            .message-warning {
                background: #fff3e0;
                color: #f57c00;
                border-left: 4px solid #f57c00;
            }
            .message-error {
                background: #ffebee;
                color: #d32f2f;
                border-left: 4px solid #d32f2f;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}
