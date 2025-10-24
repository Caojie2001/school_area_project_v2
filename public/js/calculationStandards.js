/**
 * ==============================================
 * calculationStandards.js - 测算标准管理模块
 * ==============================================
 * 
 * 【文件职责】
 * - 管理建筑面积测算标准的配置
 * - 基础面积标准和补贴面积标准的管理
 * - 学校类型映射的管理
 * - 标准配置的导入导出
 * - 变更历史的记录和查看
 */

// ========================================
// 测算标准管理器
// ========================================

const CalculationStandardsManager = {
    
    // 当前配置数据
    currentStandards: {
        basicStandards: {},
        subsidizedStandards: {},
        schoolMapping: {},
        changeHistory: []
    },
    
    // 待保存的更改缓存
    pendingChanges: [],
    
    // 默认配置
    defaultStandards: {
        basicStandards: {
            '综合院校': { '教学及辅助用房': 12.95, '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '师范院校': { '教学及辅助用房': 12.95, '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '理工院校': { '教学及辅助用房': 15.95, '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '医药院校': { '教学及辅助用房': 15.95, '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '农业院校': { '教学及辅助用房': 15.95, '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '政法院校': { '教学及辅助用房': 7.95,  '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '财经院校': { '教学及辅助用房': 7.95,  '办公用房': 2.0, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.55 },
            '外语院校': { '教学及辅助用房': 0.0,   '办公用房': 0.0, '学生宿舍': 0.0,  '其他生活用房': 0.0, '后勤辅助用房': 0.0  },
            '艺术院校': { '教学及辅助用房': 53.50, '办公用房': 3.5, '学生宿舍': 10.5, '其他生活用房': 2.0, '后勤辅助用房': 2.0  },
            '体育院校': { '教学及辅助用房': 22.00, '办公用房': 2.2, '学生宿舍': 10.0, '其他生活用房': 2.0, '后勤辅助用房': 1.80 }
        },
        subsidizedStandards: {
            '综合院校': { // 综合院校
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '师范院校': { // 师范类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '理工院校': { // 工科类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '医药院校': { // 医学类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '农业院校': { // 农林类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '政法院校': { // 政法类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '财经院校': { // 财经类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '外语院校': { // 外语类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '艺术院校': { // 艺术类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            },
            '体育院校': { // 体育类
                '教学及辅助用房': {'全日制硕士': 3, '全日制博士': 3, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '办公用房': {'全日制硕士': 2, '全日制博士': 2, '留学生': 0, '留学生硕士': 0, '留学生博士': 0},
                '学生宿舍': {'全日制硕士': 5, '全日制博士': 14, '留学生': 0, '留学生硕士': 5, '留学生博士': 14},
                '其他生活用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 19, '留学生硕士': 0, '留学生博士': 0},
                '后勤辅助用房': {'全日制硕士': 0, '全日制博士': 0, '留学生': 0, '留学生硕士': 0, '留学生博士': 0}
            }
        }
    },
    
    /**
     * 初始化标准管理器
     */
    async initialize() {
        try {
            console.log('开始初始化测算标准管理器...');
            
            // 加载当前标准配置
            await this.loadStandards();
            
            // 加载学校映射数据
            await this.loadSchoolMappings();
            
            console.log('测算标准管理器初始化完成');
            
        } catch (error) {
            console.error('测算标准管理器初始化失败:', error);
            if (window.showMessage) {
                showMessage('标准管理器初始化失败: ' + error.message, 'error');
            }
        }
    },
    
    /**
     * 从服务器加载标准配置
     */
    async loadStandards() {
        try {
            // 使用新的API方法
            const data = await CalculationStandardsAPI.getStandards();
            
            if (data.success) {
                    console.log('收到服务器数据:', data);
                    
                    // 处理基础标准数据 - API现在返回按院校类型组织的结构
                    this.currentStandards.basicStandards = {};
                    
                    if (data.basicStandards && Object.keys(data.basicStandards).length > 0) {
                        // API返回的数据已经是按院校类型和用房类型组织的，直接使用
                        this.currentStandards.basicStandards = data.basicStandards;
                    } else {
                        // 如果数据库没有数据，使用默认配置
                        this.currentStandards.basicStandards = { ...this.defaultStandards.basicStandards };
                    }
                    
                    // 处理补贴标准数据 - 转换数据库格式到前端格式
                    this.currentStandards.subsidizedStandards = {};
                    if (data.subsidizedStandards) {
                        for (const [schoolType, roomTypes] of Object.entries(data.subsidizedStandards)) {
                            this.currentStandards.subsidizedStandards[schoolType] = {};
                            
                            // 三重索引结构：院校类型 -> 用房类型 -> 补贴类型
                            for (const [roomType, subsidyTypes] of Object.entries(roomTypes)) {
                                this.currentStandards.subsidizedStandards[schoolType][roomType] = {};
                                
                                // 复制所有补贴类型的标准值
                                for (const [subsidyType, standardValue] of Object.entries(subsidyTypes)) {
                                    this.currentStandards.subsidizedStandards[schoolType][roomType][subsidyType] = standardValue || 0;
                                }
                            }
                        }
                    } else {
                        // 如果数据库没有补贴数据，使用默认配置
                        this.currentStandards.subsidizedStandards = { ...this.defaultStandards.subsidizedStandards };
                    }
                    
                    // 处理院校类型映射
                    this.currentStandards.schoolMapping = data.schoolMapping || {};
                    
                    console.log('处理后的数据结构:', this.currentStandards);
                    
                    // 更新界面显示
                    this.updateBasicStandardsDisplay();
                    this.updateSubsidizedStandardsDisplay();
                    
                    if (window.showMessage) {
                        showMessage('标准配置加载成功', 'success');
                    }
                } else {
                    console.warn('获取标准配置失败:', data.message);
                    // 使用默认配置
                    this.useDefaultStandards();
                }
        } catch (error) {
            console.error('加载标准配置失败:', error);
            this.useDefaultStandards();
        }
    },
    
    /**
     * 使用默认标准配置
     */
    useDefaultStandards() {
        this.currentStandards.basicStandards = { ...this.defaultStandards.basicStandards };
        this.currentStandards.subsidizedStandards = { ...this.defaultStandards.subsidizedStandards };
        
        this.updateBasicStandardsDisplay();
        this.updateSubsidizedStandardsDisplay();
        
        showMessage('已加载默认标准配置', 'warning');
    },
    
    /**
     * 更新综合标准显示
     */
    updateBasicStandardsDisplay() {
        this.generateComprehensiveTable();
    },

    /**
     * 生成综合标准表格
     */
    generateComprehensiveTable() {
        const leftTbody = document.getElementById('comprehensiveStandardsTableLeft');
        const contentTbody = document.getElementById('comprehensiveStandardsTable');
        if (!leftTbody || !contentTbody) return;

        const schoolTypes = [
            { code: '综合院校', name: '综合院校' },
            { code: '师范院校', name: '师范院校' },
            { code: '理工院校', name: '理工院校' },
            { code: '医药院校', name: '医药院校' },
            { code: '农业院校', name: '农业院校' },
            { code: '政法院校', name: '政法院校' },
            { code: '财经院校', name: '财经院校' },
            { code: '外语院校', name: '外语院校' },
            { code: '艺术院校', name: '艺术院校' },
            { code: '体育院校', name: '体育院校' }
        ];

        const roomTypes = [
            { field: 'A', dbName: '教学及辅助用房', name: '教学及辅助用房', isMain: true },
            { field: 'B', dbName: '办公用房', name: '办公用房', isMain: true },
            { field: 'Living', name: '生活配套用房', isCalculated: true },
            { field: 'C1', dbName: '学生宿舍', name: '其中:学生宿舍', isMain: true, isSubItem: true },
            { field: 'C2', dbName: '其他生活用房', name: '其中:其他生活用房', isMain: true, isSubItem: true },
            { field: 'D', dbName: '后勤辅助用房', name: '后勤辅助用房', isMain: true }
        ];

        leftTbody.innerHTML = '';
        contentTbody.innerHTML = '';

        schoolTypes.forEach((schoolType, schoolIndex) => {
            roomTypes.forEach((roomType, roomIndex) => {
                // 创建左侧行（院校类别和用房类型）
                const leftRow = document.createElement('tr');
                
                // 添加院校类别分割线（除第一个院校类别外）
                if (schoolIndex > 0 && roomIndex === 0) {
                    leftRow.className = 'school-type-separator';
                }
                
                // 院校类别列 - 只在第一行显示
                if (roomIndex === 0) {
                    const schoolCell = document.createElement('td');
                    schoolCell.className = 'school-type';
                    schoolCell.textContent = schoolType.name;
                    schoolCell.rowSpan = roomTypes.length;
                    leftRow.appendChild(schoolCell);
                }

                // 用房类型列
                const roomTypeCell = document.createElement('td');
                roomTypeCell.className = roomType.isSubItem ? 'room-type sub-type' : 'room-type';
                roomTypeCell.textContent = roomType.name;
                leftRow.appendChild(roomTypeCell);

                leftTbody.appendChild(leftRow);

                // 创建内容行（基础面积和补贴面积）
                const contentRow = document.createElement('tr');
                
                // 添加院校类别分割线（除第一个院校类别外）
                let className = '';
                if (schoolIndex > 0 && roomIndex === 0) {
                    className = 'school-type-separator';
                }

                if (roomType.isCalculated) {
                    // 生活配套用房是计算行，显示C1+C2的总和
                    className += (className ? ' calculated-row' : 'calculated-row');
                    contentRow.className = className;
                    
                    // 基础生均面积
                    const basicCell = document.createElement('td');
                    const c1Basic = this.getStandardValue(schoolType.code, 'C1', 'basic');
                    const c2Basic = this.getStandardValue(schoolType.code, 'C2', 'basic');
                    basicCell.textContent = (c1Basic + c2Basic).toFixed(2);
                    contentRow.appendChild(basicCell);

                    // 硕士补贴
                    const masterCell = document.createElement('td');
                    const c1Master = this.getStandardValue(schoolType.code, 'C1', '全日制硕士');
                    const c2Master = this.getStandardValue(schoolType.code, 'C2', '全日制硕士');
                    masterCell.textContent = (c1Master + c2Master).toFixed(2);
                    contentRow.appendChild(masterCell);

                    // 博士补贴
                    const doctorCell = document.createElement('td');
                    const c1Doctor = this.getStandardValue(schoolType.code, 'C1', '全日制博士');
                    const c2Doctor = this.getStandardValue(schoolType.code, 'C2', '全日制博士');
                    doctorCell.textContent = (c1Doctor + c2Doctor).toFixed(2);
                    contentRow.appendChild(doctorCell);

                    // 留学生补贴
                    const intlCell = document.createElement('td');
                    const c1Intl = this.getStandardValue(schoolType.code, 'C1', '留学生');
                    const c2Intl = this.getStandardValue(schoolType.code, 'C2', '留学生');
                    intlCell.textContent = (c1Intl + c2Intl).toFixed(2);
                    contentRow.appendChild(intlCell);

                    // 留学生硕士生补贴
                    const intlMasterCell = document.createElement('td');
                    const c1IntlMaster = this.getStandardValue(schoolType.code, 'C1', '留学生硕士');
                    const c2IntlMaster = this.getStandardValue(schoolType.code, 'C2', '留学生硕士');
                    intlMasterCell.textContent = (c1IntlMaster + c2IntlMaster).toFixed(2);
                    contentRow.appendChild(intlMasterCell);

                    // 留学生博士生补贴
                    const intlDoctorCell = document.createElement('td');
                    const c1IntlDoctor = this.getStandardValue(schoolType.code, 'C1', '留学生博士');
                    const c2IntlDoctor = this.getStandardValue(schoolType.code, 'C2', '留学生博士');
                    intlDoctorCell.textContent = (c1IntlDoctor + c2IntlDoctor).toFixed(2);
                    contentRow.appendChild(intlDoctorCell);
                } else {
                    // 可编辑行
                    if (className) {
                        contentRow.className = className;
                    }
                    
                    // 基础生均面积
                    const basicCell = document.createElement('td');
                    const basicInput = document.createElement('input');
                    basicInput.type = 'number';
                    basicInput.step = '0.01';
                    basicInput.min = '0';
                    basicInput.value = this.getStandardValue(schoolType.code, roomType.field, 'basic');
                    basicInput.dataset.schoolType = schoolType.code;
                    basicInput.dataset.roomType = roomType.field;
                    basicInput.dataset.valueType = 'basic';
                    basicInput.addEventListener('change', () => this.updateLocalValue(basicInput));
                    basicCell.appendChild(basicInput);
                    contentRow.appendChild(basicCell);

                    // 硕士补贴
                    const masterCell = document.createElement('td');
                    const masterInput = document.createElement('input');
                    masterInput.type = 'number';
                    masterInput.step = '0.01';
                    masterInput.min = '0';
                    masterInput.value = this.getStandardValue(schoolType.code, roomType.field, '全日制硕士');
                    masterInput.dataset.schoolType = schoolType.code;
                    masterInput.dataset.roomType = roomType.field;
                    masterInput.dataset.valueType = '全日制硕士';
                    masterInput.addEventListener('change', () => this.updateLocalValue(masterInput));
                    masterCell.appendChild(masterInput);
                    contentRow.appendChild(masterCell);

                    // 博士补贴
                    const doctorCell = document.createElement('td');
                    const doctorInput = document.createElement('input');
                    doctorInput.type = 'number';
                    doctorInput.step = '0.01';
                    doctorInput.min = '0';
                    doctorInput.value = this.getStandardValue(schoolType.code, roomType.field, '全日制博士');
                    doctorInput.dataset.schoolType = schoolType.code;
                    doctorInput.dataset.roomType = roomType.field;
                    doctorInput.dataset.valueType = '全日制博士';
                    doctorInput.addEventListener('change', () => this.updateLocalValue(doctorInput));
                    doctorCell.appendChild(doctorInput);
                    contentRow.appendChild(doctorCell);

                    // 留学生补贴
                    const intlCell = document.createElement('td');
                    const intlInput = document.createElement('input');
                    intlInput.type = 'number';
                    intlInput.step = '0.01';
                    intlInput.min = '0';
                    intlInput.value = this.getStandardValue(schoolType.code, roomType.field, '留学生');
                    intlInput.dataset.schoolType = schoolType.code;
                    intlInput.dataset.roomType = roomType.field;
                    intlInput.dataset.valueType = '留学生';
                    intlInput.addEventListener('change', () => this.updateLocalValue(intlInput));
                    intlCell.appendChild(intlInput);
                    contentRow.appendChild(intlCell);

                    // 留学生硕士生补贴
                    const intlMasterCell = document.createElement('td');
                    const intlMasterInput = document.createElement('input');
                    intlMasterInput.type = 'number';
                    intlMasterInput.step = '0.01';
                    intlMasterInput.min = '0';
                    intlMasterInput.value = this.getStandardValue(schoolType.code, roomType.field, '留学生硕士');
                    intlMasterInput.dataset.schoolType = schoolType.code;
                    intlMasterInput.dataset.roomType = roomType.field;
                    intlMasterInput.dataset.valueType = '留学生硕士';
                    intlMasterInput.addEventListener('change', () => this.updateLocalValue(intlMasterInput));
                    intlMasterCell.appendChild(intlMasterInput);
                    contentRow.appendChild(intlMasterCell);

                    // 留学生博士生补贴
                    const intlDoctorCell = document.createElement('td');
                    const intlDoctorInput = document.createElement('input');
                    intlDoctorInput.type = 'number';
                    intlDoctorInput.step = '0.01';
                    intlDoctorInput.min = '0';
                    intlDoctorInput.value = this.getStandardValue(schoolType.code, roomType.field, '留学生博士');
                    intlDoctorInput.dataset.schoolType = schoolType.code;
                    intlDoctorInput.dataset.roomType = roomType.field;
                    intlDoctorInput.dataset.valueType = '留学生博士';
                    intlDoctorInput.addEventListener('change', () => this.updateLocalValue(intlDoctorInput));
                    intlDoctorCell.appendChild(intlDoctorInput);
                    contentRow.appendChild(intlDoctorCell);
                }

                contentTbody.appendChild(contentRow);
            });
        });

        // 同步滚动
        this.setupScrollSync();
    },

    /**
     * 设置滚动同步
     */
    setupScrollSync() {
        const frozenLeft = document.querySelector('.frozen-left');
        const frozenHeader = document.querySelector('.frozen-header');
        const scrollableContent = document.querySelector('.scrollable-content');
        
        if (!frozenLeft || !frozenHeader || !scrollableContent) return;

        // 同步垂直滚动（左侧列与内容区域）
        scrollableContent.addEventListener('scroll', () => {
            frozenLeft.scrollTop = scrollableContent.scrollTop;
            frozenHeader.scrollLeft = scrollableContent.scrollLeft;
        });

        frozenLeft.addEventListener('scroll', () => {
            scrollableContent.scrollTop = frozenLeft.scrollTop;
        });

        // 同步水平滚动（表头与内容区域）
        frozenHeader.addEventListener('scroll', () => {
            scrollableContent.scrollLeft = frozenHeader.scrollLeft;
        });
    },

    /**
     * 获取标准值
     */
    getStandardValue(schoolType, roomType, valueType) {
        if (valueType === 'basic') {
            // 对于基础标准，需要将前端的房间类型代码映射到数据库的中文名称
            const roomTypeMapping = {
                'A': '教学及辅助用房',
                'B': '办公用房',
                'C1': '学生宿舍', 
                'C2': '其他生活用房',
                'D': '后勤辅助用房'
            };
            
            const dbRoomType = roomTypeMapping[roomType] || roomType;
            // 基础标准现在按院校类型组织: basicStandards[schoolType][dbRoomType]
            return this.currentStandards.basicStandards[schoolType]?.[dbRoomType] || 0;
        } else {
            // 对于补贴标准，需要将前端的房间类型代码映射到数据库的中文名称
            const roomTypeMapping = {
                'A': '教学及辅助用房',
                'B': '办公用房',
                'C1': '学生宿舍',
                'C2': '其他生活用房',
                'D': '后勤辅助用房'
            };
            
            const dbRoomType = roomTypeMapping[roomType] || roomType;
            // 使用三重索引结构：院校类型 -> 用房类型 -> 补贴类型
            return this.currentStandards.subsidizedStandards[schoolType]?.[dbRoomType]?.[valueType] || 0;
        }
    },

    /**
     * 使用默认标准配置
     */
    useDefaultStandards() {
        console.log('使用默认标准配置');
        this.currentStandards = JSON.parse(JSON.stringify(this.defaultStandards));
        this.updateBasicStandardsDisplay();
        this.updateSubsidizedStandardsDisplay();
        if (window.showMessage) {
            showMessage('已加载默认标准配置', 'info');
        }
    },

    /**
     * 更新本地标准值（不立即保存到服务器）
     */
    updateLocalValue(input) {
        const schoolType = input.dataset.schoolType;
        const roomType = input.dataset.roomType;
        const valueType = input.dataset.valueType;
        const value = parseFloat(input.value) || 0;

        // 根据valueType确定更新类型
        let updateType, updateRoomType, updateSubsidyType;
        
        if (valueType === 'basic') {
            updateType = 'basic';
            // 将前端的房间类型代码映射到数据库中的名称
            const roomTypeMapping = {
                'A': '教学及辅助用房',
                'B': '办公用房',
                'C1': '学生宿舍',
                'C2': '其他生活用房',
                'D': '后勤辅助用房'
            };
            updateRoomType = roomTypeMapping[roomType];
        } else {
            updateType = 'subsidized';
            // valueType 现在代表补贴类型，roomType 代表用房类型
            // 将用房类型代码映射到数据库的中文名称
            const roomTypeMapping = {
                'A': '教学及辅助用房',
                'B': '办公用房', 
                'C1': '学生宿舍',
                'C2': '其他生活用房',
                'D': '后勤辅助用房'
            };
            updateRoomType = roomTypeMapping[roomType];
            updateSubsidyType = valueType; // valueType现在是补贴类型（如'全日制硕士'）
        }
        
        if (!updateRoomType) {
            console.error('无法映射房间类型:', valueType, roomType);
            return;
        }
        
        // 更新本地数据缓存
        if (valueType === 'basic') {
            // 对于基础标准，更新院校类型结构（使用映射后的数据库字段名）
            if (!this.currentStandards.basicStandards[schoolType]) {
                this.currentStandards.basicStandards[schoolType] = {};
            }
            this.currentStandards.basicStandards[schoolType][updateRoomType] = value;
        } else {
            // 对于补贴标准，使用新的三重索引结构：院校类型 -> 用房类型 -> 补贴类型（使用映射后的数据库字段名）
            if (!this.currentStandards.subsidizedStandards[schoolType]) {
                this.currentStandards.subsidizedStandards[schoolType] = {};
            }
            if (!this.currentStandards.subsidizedStandards[schoolType][updateRoomType]) {
                this.currentStandards.subsidizedStandards[schoolType][updateRoomType] = {};
            }
            this.currentStandards.subsidizedStandards[schoolType][updateRoomType][valueType] = value;
        }
        
        // 添加到待保存的更改列表
        const changeKey = `${updateType}-${schoolType}-${updateRoomType}-${updateSubsidyType || ''}`;
        const existingChangeIndex = this.pendingChanges.findIndex(change => change.key === changeKey);
        
        const changeData = {
            key: changeKey,
            type: updateType,
            schoolType: schoolType,
            roomType: updateRoomType,
            value: value
        };
        
        if (updateType === 'subsidized') {
            changeData.subsidyType = updateSubsidyType;
        }
        
        if (existingChangeIndex >= 0) {
            // 更新已存在的更改
            this.pendingChanges[existingChangeIndex] = changeData;
        } else {
            // 添加新的更改
            this.pendingChanges.push(changeData);
        }
        
        // 视觉反馈：给输入框添加"已修改"的样式
        input.classList.add('modified');
        
        // 更新保存按钮状态
        this.updateSaveButtonState();
    },

    /**
     * 更新保存按钮状态
     */
    updateSaveButtonState() {
        const saveButton = document.querySelector('button[onclick="saveAllStandards()"]');
        if (saveButton) {
            if (this.pendingChanges.length > 0) {
                saveButton.textContent = `保存所有配置 (${this.pendingChanges.length}项待保存)`;
                saveButton.classList.add('btn-warning');
                saveButton.classList.remove('btn-primary');
            } else {
                saveButton.textContent = '保存所有配置';
                saveButton.classList.add('btn-primary');
                saveButton.classList.remove('btn-warning');
            }
        }
    },

    /**
     * 更新标准值（原方法，现在用于批量保存）
     */
    async updateStandardValue(input) {
        const schoolType = input.dataset.schoolType;
        const roomType = input.dataset.roomType;
        const valueType = input.dataset.valueType;
        const value = parseFloat(input.value) || 0;

        try {
            // 根据valueType确定更新类型
            let updateType, updateRoomType, updateSubsidyType;
            
            if (valueType === 'basic') {
                updateType = 'basic';
                // 将前端的房间类型代码映射到数据库中的名称
                const roomTypeMapping = {
                    'A': '教学及辅助用房',
                    'B': '办公用房',
                    'C1': '学生宿舍',
                    'C2': '学生宿舍', // C2 也是学生宿舍的一部分
                    'D': '后勤辅助用房'
                };
                updateRoomType = roomTypeMapping[roomType];
            } else {
                updateType = 'subsidized';
                // valueType 现在代表补贴类型，roomType 代表用房类型
                // 将用房类型代码映射到数据库的中文名称
                const roomTypeMapping = {
                    'A': '教学及辅助用房',
                    'B': '办公用房', 
                    'C1': '学生宿舍',
                    'C2': '其他生活用房',
                    'D': '后勤辅助用房'
                };
                updateRoomType = roomTypeMapping[roomType];
                updateSubsidyType = valueType; // valueType现在是补贴类型（如'全日制硕士'）
            }
            
            if (!updateRoomType) {
                console.error('无法映射房间类型:', valueType, roomType);
                return;
            }
            
            // 调用API更新单个标准值
            const requestBody = {
                type: updateType,
                schoolType: schoolType,
                roomType: updateRoomType,
                value: value
            };
            
            // 如果是补贴标准，添加补贴类型参数
            if (updateType === 'subsidized') {
                requestBody.subsidyType = updateSubsidyType;
            }
            
            const response = await fetch('/api/calculation-standards/single', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 更新本地数据
                    if (valueType === 'basic') {
                        // 对于基础标准，更新院校类型结构
                        if (!this.currentStandards.basicStandards[schoolType]) {
                            this.currentStandards.basicStandards[schoolType] = {};
                        }
                        this.currentStandards.basicStandards[schoolType][roomType] = value;
                    } else {
                        // 对于补贴标准，使用新的三重索引结构：院校类型 -> 用房类型 -> 补贴类型
                        if (!this.currentStandards.subsidizedStandards[schoolType]) {
                            this.currentStandards.subsidizedStandards[schoolType] = {};
                        }
                        if (!this.currentStandards.subsidizedStandards[schoolType][updateRoomType]) {
                            this.currentStandards.subsidizedStandards[schoolType][updateRoomType] = {};
                        }
                        this.currentStandards.subsidizedStandards[schoolType][updateRoomType][valueType] = value;
                    }
                    
                    // 重新计算生活配套用房的总和
                    this.generateComprehensiveTable();
                    
                    // 显示成功消息
                    if (window.showMessage) {
                        showMessage('标准值更新成功', 'success');
                    }
                } else {
                    console.error('更新标准值失败:', data.message);
                    if (window.showMessage) {
                        showMessage('更新标准值失败: ' + data.message, 'error');
                    }
                }
            } else {
                throw new Error('网络请求失败');
            }
        } catch (error) {
            console.error('更新标准值时发生错误:', error);
            if (window.showMessage) {
                showMessage('更新标准值时发生错误', 'error');
            }
        }
    },
    
    /**
     * 更新补贴标准显示（已整合到综合表格中）
     */
    updateSubsidizedStandardsDisplay() {
        // 补贴标准现在在综合表格中显示，无需单独更新
        this.generateComprehensiveTable();
    },
    
    /**
     * 加载学校映射数据
     */
    async loadSchoolMappings() {
        try {
            const data = await CalculationStandardsAPI.getSchoolTypeMappings();
            
            if (data.success) {
                this.currentStandards.schoolMapping = data.mappings || {};
            } else {
                console.warn('获取学校映射失败:', data.message);
            }
        } catch (error) {
            console.error('加载学校映射失败:', error);
        }
    },
    
    /**
     * 收集所有标准数据
     */
    collectAllStandards() {
        // 从综合表格中收集所有标准
        const basicStandards = {};
        const subsidizedStandards = {};

        // 收集基础标准和补贴标准
        const inputs = document.querySelectorAll('#comprehensiveStandardsTable input');
        inputs.forEach(input => {
            const schoolType = input.dataset.schoolType;
            const roomType = input.dataset.roomType;
            const valueType = input.dataset.valueType;
            const value = parseFloat(input.value) || 0;

            if (valueType === 'basic') {
                if (!basicStandards[schoolType]) {
                    basicStandards[schoolType] = {};
                }
                basicStandards[schoolType][roomType] = value;
            } else {
                // 补贴标准按院校类型组织
                if (!subsidizedStandards[schoolType]) {
                    subsidizedStandards[schoolType] = {};
                }
                if (!subsidizedStandards[schoolType][roomType]) {
                    subsidizedStandards[schoolType][roomType] = {};
                }
                subsidizedStandards[schoolType][roomType][valueType] = value;
            }
        });

        return {
            basicStandards,
            subsidizedStandards,
            schoolMapping: this.currentStandards.schoolMapping
        };
    },
    
    /**
     * 验证标准数据
     */
    validateStandards(standards) {
        const errors = [];
        
        // 验证基础标准
        Object.keys(standards.basicStandards).forEach(type => {
            const typeStandards = standards.basicStandards[type];
            Object.keys(typeStandards).forEach(field => {
                if (typeStandards[field] < 0) {
                    errors.push(`${type}类型的${field}字段不能为负数`);
                }
            });
        });
        
        // 验证补贴标准
        Object.keys(standards.subsidizedStandards).forEach(roomType => {
            const roomStandards = standards.subsidizedStandards[roomType];
            Object.keys(roomStandards).forEach(studentType => {
                if (roomStandards[studentType] < 0) {
                    errors.push(`${roomType}类型房间的${studentType}补贴不能为负数`);
                }
            });
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    /**
     * 保存所有标准配置
     */
    async saveAllStandards() {
        try {
            // 显示保存状态
            const saveButton = document.querySelector('button[onclick="saveAllStandards()"]');
            const originalText = saveButton ? saveButton.textContent : '保存配置';
            if (saveButton) {
                saveButton.textContent = '保存中...';
                saveButton.disabled = true;
            }
            
            // 收集所有标准数据
            const allStandards = this.collectAllStandards();
            
            // 验证数据
            const validation = this.validateStandards(allStandards);
            if (!validation.isValid) {
                showMessage('数据验证失败: ' + validation.errors.join(', '), 'error');
                return;
            }
            
            // 使用新的API保存
            const result = await CalculationStandardsAPI.updateStandards(allStandards);
            
            if (result.success) {
                // 保存成功
                this.pendingChanges = [];
                this.updateSaveButtonState();
                
                // 移除所有"已修改"样式
                document.querySelectorAll('input.modified').forEach(input => {
                    input.classList.remove('modified');
                });
                
                showMessage('配置保存成功！', 'success');
                
                // 重新加载标准数据以确保同步
                await this.loadStandards();
            } else {
                throw new Error(result.message || '保存失败');
            }
            
        } catch (error) {
            console.error('保存标准配置失败:', error);
            showMessage('保存失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            const saveButton = document.querySelector('button[onclick="saveAllStandards()"]');
            if (saveButton) {
                saveButton.textContent = '保存配置';
                saveButton.disabled = false;
            }
        }
    }
};

// ========================================
// 全局操作函数
// ========================================

/**
 * 保存所有标准
 */
async function saveAllStandards() {
    try {
        await CalculationStandardsAPI.updateStandards(CalculationStandardsManager.pendingChanges);
        showMessage('所有标准保存成功！', 'success');
        // 清空待保存的更改
        CalculationStandardsManager.pendingChanges = [];
        CalculationStandardsManager.updateSaveButtonState();
        // 重新加载数据
        await loadAllStandards();
    } catch (error) {
        console.error('保存所有标准失败:', error);
        showMessage('保存失败: ' + error.message, 'error');
    }
}

/**
 * 加载所有标准数据
 */
async function loadAllStandards() {
    try {
        await CalculationStandardsManager.loadStandards();
        await CalculationStandardsManager.loadSchoolMappings();
        showMessage('标准数据加载完成', 'success');
    } catch (error) {
        console.error('加载标准数据失败:', error);
        showMessage('加载失败: ' + error.message, 'error');
    }
}

/**
 * 重置所有标准为默认值 - 已禁用
 */
/*
function resetAllStandards() {
    if (confirm('确认要重置所有标准为默认值吗？此操作将覆盖当前的自定义配置。')) {
        CalculationStandardsManager.useDefaultStandards();
        showMessage('已重置为默认标准配置', 'success');
    }
}
*/

/**
 * 重置单个基础标准
 */
function resetBasicStandard(type) {
    const defaultStandards = CalculationStandardsManager.defaultStandards.basicStandards[type];
    if (!defaultStandards) return;
    
    const row = document.querySelector(`tr[data-type="${type}"]`);
    if (row) {
        Object.keys(defaultStandards).forEach(field => {
            const input = row.querySelector(`input[data-field="${field}"]`);
            if (input) {
                input.value = defaultStandards[field];
            }
        });
    }
    
    showMessage(`${type}类型标准已重置为默认值`, 'success');
}

/**
 * 查看变更详情
 */
function viewChangeDetail(index) {
    const record = CalculationStandardsManager.currentStandards.changeHistory[index];
    if (!record) return;
    
    const details = `
变更时间: ${new Date(record.changeTime).toLocaleString()}
变更人员: ${record.changeUser}
变更类型: ${record.changeType}
变更说明: ${record.changeDescription}

变更详情:
${JSON.stringify(record.changeDetails || {}, null, 2)}
    `;
    
    alert(details);
}

/**
 * 回滚变更
 */
function rollbackChange(index) {
    const record = CalculationStandardsManager.currentStandards.changeHistory[index];
    if (!record) return;
    
    if (confirm(`确认要回滚到 ${new Date(record.changeTime).toLocaleString()} 的配置吗？`)) {
        showMessage('回滚功能开发中...', 'warning');
        // TODO: 实现回滚逻辑
    }
}

// ========================================
// 导出到全局作用域
// ========================================

if (typeof window !== 'undefined') {
    window.CalculationStandardsManager = CalculationStandardsManager;
    window.saveAllStandards = saveAllStandards;
    // window.resetAllStandards = resetAllStandards; // 已禁用重置功能
    window.resetBasicStandard = resetBasicStandard;
    window.viewChangeDetail = viewChangeDetail;
    window.rollbackChange = rollbackChange;
}

// ========================================
// 模块信息
// ========================================

console.log('测算标准管理模块 (calculationStandards.js) 已加载');
console.log('提供功能: 标准配置管理、变更历史');
console.log('依赖模块: componentManager.js, auth.js');
