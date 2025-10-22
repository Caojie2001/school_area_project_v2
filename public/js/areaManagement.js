/**
 * 建筑面积管理模块
 * 用于管理现状面积、基线建筑面积、特殊补助底数、规划学生数等数据
 */

// 全局变量
let currentAreaRecordId = null; // 当前编辑的现状面积记录ID

// ==========================================
// 1. 现状面积管理
// ==========================================

/**
 * 加载学校的所有数据来源
 */
async function loadCurrentAreaDataSources() {
    const schoolName = document.getElementById('currentAreaSchool').value;
    const dataSourceSelect = document.getElementById('dataSource');
    
    if (!schoolName) {
        dataSourceSelect.innerHTML = '<option value="">请先选择学校</option>';
        document.getElementById('currentAreaDataSection').style.display = 'none';
        return;
    }
    
    try {
        // 获取该学校的所有数据来源
        const response = await fetch(
            `/api/current-area-presets/school/${encodeURIComponent(schoolName)}`,
            { credentials: 'include' }
        );
        
        if (response.ok) {
            const result = await response.json();
            
            // 重置下拉框
            dataSourceSelect.innerHTML = '<option value="">请选择数据来源</option>';
            
            // 添加预设选项
            const presetSources = ['自填', '高校基础表', 'SEC数据'];
            const existingSources = result.data ? result.data.map(item => item.data_source) : [];
            
            presetSources.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source + (existingSources.includes(source) ? ' ✓' : '');
                dataSourceSelect.appendChild(option);
            });
            
            // 添加其他已存在的数据来源
            if (result.data) {
                result.data.forEach(item => {
                    if (!presetSources.includes(item.data_source)) {
                        const option = document.createElement('option');
                        option.value = item.data_source;
                        option.textContent = item.data_source + ' ✓';
                        dataSourceSelect.appendChild(option);
                    }
                });
            }
        } else {
            throw new Error('加载数据来源失败');
        }
    } catch (error) {
        console.error('加载数据来源失败:', error);
        showMessage('加载数据来源失败：' + error.message, 'error');
    }
}

/**
 * 加载现状面积数据
 */
async function loadCurrentAreaData() {
    const schoolName = document.getElementById('currentAreaSchool').value;
    const dataSource = document.getElementById('dataSource').value;
    
    if (!schoolName || !dataSource) {
        document.getElementById('currentAreaDataSection').style.display = 'none';
        return;
    }

    try {
        // 调用API获取数据
        const response = await fetch(
            `/api/current-area-presets/school/${encodeURIComponent(schoolName)}/source/${encodeURIComponent(dataSource)}`, 
            { credentials: 'include' }
        );

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                fillCurrentAreaForm(result.data);
                document.getElementById('currentAreaDataSection').style.display = 'block';
            }
        } else if (response.status === 404) {
            // 没有找到数据，显示空表单
            resetCurrentAreaForm();
            currentAreaRecordId = null;
            document.getElementById('currentAreaDataSection').style.display = 'block';
        } else {
            showMessage('加载数据失败', 'error');
        }
    } catch (error) {
        console.error('加载现状面积数据失败:', error);
        showMessage('加载数据失败: ' + error.message, 'error');
    }
}

/**
 * 填充现状面积数据到表单
 * @param {Object} data - 数据对象
 */
function fillCurrentAreaForm(data) {
    currentAreaRecordId = data.id;
    
    document.getElementById('teachingArea').value = (data.teaching_area_current || 0).toFixed(2);
    document.getElementById('officeArea').value = (data.office_area_current || 0).toFixed(2);
    document.getElementById('logisticsArea').value = (data.logistics_area_current || 0).toFixed(2);
    document.getElementById('totalLivingArea').value = (data.total_living_area_current || 0).toFixed(2);
    document.getElementById('dormitoryArea').value = (data.dormitory_area_current || 0).toFixed(2);
    document.getElementById('otherLivingArea').value = (data.other_living_area_current || 0).toFixed(2);
    document.getElementById('totalArea').value = (data.current_building_area || 0).toFixed(2);
}

/**
 * 重置现状面积表单
 */
function resetCurrentAreaForm() {
    currentAreaRecordId = null;
    
    document.getElementById('teachingArea').value = '0.00';
    document.getElementById('officeArea').value = '0.00';
    document.getElementById('logisticsArea').value = '0.00';
    document.getElementById('totalLivingArea').value = '0.00';
    document.getElementById('dormitoryArea').value = '0.00';
    document.getElementById('otherLivingArea').value = '0.00';
    document.getElementById('totalArea').value = '0.00';
}

/**
 * 创建新的数据来源
 */
function createNewCurrentArea() {
    const schoolName = document.getElementById('currentAreaSchool').value;
    
    if (!schoolName) {
        showMessage('请先选择学校', 'warning');
        return;
    }
    
    const newSource = prompt('请输入新的数据来源名称（例如：2024年统计数据、实地测量数据等）：');
    
    if (newSource && newSource.trim()) {
        const dataSourceSelect = document.getElementById('dataSource');
        
        // 检查是否已存在
        const existingOptions = Array.from(dataSourceSelect.options).map(opt => opt.value);
        if (existingOptions.includes(newSource.trim())) {
            showMessage('该数据来源已存在，请直接选择', 'warning');
            dataSourceSelect.value = newSource.trim();
            loadCurrentAreaData();
        } else {
            // 添加新选项
            const option = document.createElement('option');
            option.value = newSource.trim();
            option.textContent = newSource.trim();
            dataSourceSelect.appendChild(option);
            dataSourceSelect.value = newSource.trim();
            
            // 重置表单，准备输入新数据
            resetCurrentAreaForm();
            document.getElementById('currentAreaDataSection').style.display = 'block';
            showMessage('请填写数据后点击保存按钮', 'info');
        }
    }
}

/**
 * 计算现状面积总计
 */
function calculateCurrentTotal() {
    const teaching = getFieldValue('teachingArea');
    const office = getFieldValue('officeArea');
    const logistics = getFieldValue('logisticsArea');
    const totalLiving = getFieldValue('totalLivingArea');
    const dormitory = getFieldValue('dormitoryArea');

    // 计算其他生活用房面积
    const otherLiving = totalLiving - dormitory;
    setFieldValue('otherLivingArea', otherLiving, 2);

    // 计算建筑总面积
    const total = teaching + office + totalLiving + logistics;
    setFieldValue('totalArea', total, 2);
}

/**
 * 保存现状面积数据
 */
async function saveCurrentAreaData() {
    const schoolName = document.getElementById('currentAreaSchool').value;
    const dataSource = document.getElementById('dataSource').value;
    
    if (!schoolName) {
        showMessage('请选择学校', 'warning');
        return;
    }
    
    if (!dataSource) {
        showMessage('请选择数据来源', 'warning');
        return;
    }

    try {
        // 收集数据
        const data = {
            school_name: schoolName,
            data_source: dataSource,
            teaching_area_current: getFieldValue('teachingArea'),
            office_area_current: getFieldValue('officeArea'),
            total_living_area_current: getFieldValue('totalLivingArea'),
            dormitory_area_current: getFieldValue('dormitoryArea'),
            logistics_area_current: getFieldValue('logisticsArea')
        };

        // 调用API保存数据
        const response = await fetch('/api/current-area-presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('✅ 保存成功！', 'success');
            // 重新加载数据来源列表和数据
            await loadCurrentAreaDataSources();
            await loadCurrentAreaData();
        } else {
            showMessage('❌ 保存失败: ' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('保存现状面积数据失败:', error);
        showMessage('❌ 保存失败: ' + error.message, 'error');
    }
}

/**
 * 删除现状面积数据
 */
async function deleteCurrentAreaData() {
    if (!currentAreaRecordId) {
        showMessage('当前没有可删除的数据', 'warning');
        return;
    }
    
    const schoolName = document.getElementById('currentAreaSchool').value;
    const dataSource = document.getElementById('dataSource').value;
    
    if (!confirm(`确定要删除 ${schoolName} 的「${dataSource}」数据来源吗？\n此操作不可恢复！`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/current-area-presets/${currentAreaRecordId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('✅ 删除成功！', 'success');
            // 重新加载数据来源列表
            await loadCurrentAreaDataSources();
            // 隐藏数据区域
            document.getElementById('currentAreaDataSection').style.display = 'none';
            document.getElementById('dataSource').value = '';
            currentAreaRecordId = null;
        } else {
            showMessage('❌ 删除失败: ' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('删除现状面积数据失败:', error);
        showMessage('❌ 删除失败: ' + error.message, 'error');
    }
}

// ==========================================
// 2. 工具函数
// ==========================================

/**
 * 获取用户信息
 * @returns {Object} 用户信息对象
 */
function getUserInfo() {
    try {
        return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return {};
    }
}

/**
 * 获取字段值
 * @param {string} fieldId - 字段ID
 * @returns {number} 字段值
 */
function getFieldValue(fieldId) {
    const element = document.getElementById(fieldId);
    return parseFloat(element?.value || 0) || 0;
}

/**
 * 设置字段值
 * @param {string} fieldId - 字段ID
 * @param {number} value - 值
 * @param {number} decimals - 小数位数
 */
function setFieldValue(fieldId, value, decimals = 2) {
    const element = document.getElementById(fieldId);
    if (element) {
        element.value = parseFloat(value || 0).toFixed(decimals);
    }
}

/**
 * 显示元素
 * @param {string} elementId - 元素ID
 */
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

/**
 * 隐藏元素
 * @param {string} elementId - 元素ID
 */
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * 显示消息提示
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型（success/error/warning/info）
 */
function showMessage(message, type = 'info') {
    // 移除现有消息
    const existingMessage = document.querySelector('.floating-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${
        type === 'success' ? 'success' : 
        type === 'error' ? 'danger' : 
        type === 'warning' ? 'warning' : 
        'info'
    } floating-message`;
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

/**
 * 格式化数字
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
function formatNumber(value, decimals = 2) {
    return parseFloat(value || 0).toFixed(decimals);
}

/**
 * 验证数字输入
 * @param {HTMLElement} input - 输入元素
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否有效
 */
function validateNumberInput(input, min = 0, max = Infinity) {
    const value = parseFloat(input.value);
    if (isNaN(value) || value < min || value > max) {
        input.classList.add('is-invalid');
        return false;
    }
    input.classList.remove('is-invalid');
    return true;
}

// ==========================================
// 3. 全局暴露函数（供HTML调用）
// ==========================================

// 将函数暴露到全局作用域
if (typeof window !== 'undefined') {
    window.loadCurrentAreaData = loadCurrentAreaData;
    window.calculateCurrentTotal = calculateCurrentTotal;
    window.saveCurrentAreaData = saveCurrentAreaData;
    window.showMessage = showMessage;
    window.getUserInfo = getUserInfo;
}
