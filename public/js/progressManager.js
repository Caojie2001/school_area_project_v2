/**
 * ==============================================
 * progressManager.js - 进度显示管理模块
 * ==============================================
 * 
 * 【文件职责】
 * - 统一管理系统中的进度显示功能
 * - 提供标准化的进度条和加载状态显示
 * - 支持多种进度显示样式和配置
 * - 处理进度动画和状态切换
 */

// ========================================
// 进度管理器主类
// ========================================

const ProgressManager = {
    // 当前活动的进度实例
    currentProgress: null,
    
    /**
     * 显示进度条
     * @param {Object} options 进度配置选项
     */
    show(options = {}) {
        const config = {
            title: '处理中...',
            message: '请稍候',
            showPercentage: true,
            showMessage: true,
            position: 'center', // 'center', 'top', 'bottom'
            style: 'modern', // 'modern', 'classic', 'minimal'
            ...options
        };
        
        this.hide(); // 先隐藏已存在的进度
        this.currentProgress = this.createProgressElement(config);
        document.body.appendChild(this.currentProgress);
        
        // 动画显示
        requestAnimationFrame(() => {
            this.currentProgress.classList.add('show');
        });
        
        return this;
    },
    
    /**
     * 更新进度
     * @param {number} percentage 进度百分比 (0-100)
     * @param {string} message 进度消息
     */
    update(percentage, message) {
        if (!this.currentProgress) return this;
        
        const progressFill = this.currentProgress.querySelector('.progress-fill');
        const progressText = this.currentProgress.querySelector('.progress-text');
        const progressMessage = this.currentProgress.querySelector('.progress-message');
        const progressPercentage = this.currentProgress.querySelector('.progress-percentage');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        
        if (message && progressMessage) {
            progressMessage.textContent = message;
        }
        
        return this;
    },
    
    /**
     * 隐藏进度条
     */
    hide() {
        if (this.currentProgress) {
            this.currentProgress.classList.add('hide');
            setTimeout(() => {
                if (this.currentProgress && this.currentProgress.parentNode) {
                    this.currentProgress.parentNode.removeChild(this.currentProgress);
                }
                this.currentProgress = null;
            }, 300);
        }
        return this;
    },
    
    /**
     * 创建进度条元素
     * @param {Object} config 配置选项
     * @returns {HTMLElement} 进度条元素
     */
    createProgressElement(config) {
        const container = document.createElement('div');
        container.className = `progress-overlay progress-${config.style} progress-${config.position}`;
        
        const styles = this.getProgressStyles();
        if (!document.getElementById('progress-manager-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'progress-manager-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
        
        container.innerHTML = `
            <div class="progress-container">
                <div class="progress-content">
                    ${config.title ? `<div class="progress-title">${config.title}</div>` : ''}
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-info">
                        ${config.showPercentage ? '<span class="progress-percentage">0%</span>' : ''}
                        ${config.showMessage ? `<span class="progress-message">${config.message}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        return container;
    },
    
    /**
     * 获取进度条样式
     * @returns {string} CSS样式字符串
     */
    getProgressStyles() {
        return `
            .progress-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .progress-overlay.show {
                opacity: 1;
            }
            
            .progress-overlay.hide {
                opacity: 0;
            }
            
            .progress-container {
                background: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 300px;
                max-width: 400px;
                transform: translateY(-20px);
                transition: transform 0.3s ease;
            }
            
            .progress-overlay.show .progress-container {
                transform: translateY(0);
            }
            
            .progress-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
                text-align: center;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 15px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #0056b3);
                border-radius: 4px;
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                color: #666;
            }
            
            .progress-percentage {
                font-weight: 600;
                color: #007bff;
            }
            
            .progress-message {
                flex: 1;
                text-align: right;
            }
            
            /* 不同样式变体 */
            .progress-modern .progress-fill {
                background: linear-gradient(90deg, #28a745, #20c997);
            }
            
            .progress-classic .progress-container {
                border-radius: 4px;
            }
            
            .progress-classic .progress-bar {
                height: 12px;
            }
            
            .progress-minimal .progress-container {
                background: transparent;
                box-shadow: none;
                color: white;
            }
            
            .progress-minimal .progress-title {
                color: white;
            }
            
            .progress-minimal .progress-info {
                color: rgba(255, 255, 255, 0.8);
            }
            
            /* 位置变体 */
            .progress-top {
                align-items: flex-start;
                padding-top: 50px;
            }
            
            .progress-bottom {
                align-items: flex-end;
                padding-bottom: 50px;
            }
        `;
    }
};

// ========================================
// 兼容性函数（从 script.js 迁移）
// ========================================

/**
 * 显示进度（兼容旧版本）
 */
function showProgress() {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.style.display = 'block';
        progressSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // 如果没有找到传统的进度区域，使用新的进度管理器
        ProgressManager.show({
            title: '处理中',
            message: '请稍候...'
        });
    }
}

/**
 * 更新进度（兼容旧版本）
 * @param {number} percentage 进度百分比
 * @param {string} text 进度文本
 */
function updateProgress(percentage, text) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        // 使用传统的进度元素
        progressFill.style.width = percentage + '%';
        progressText.textContent = text;
    } else {
        // 使用新的进度管理器
        ProgressManager.update(percentage, text);
    }
}

/**
 * 隐藏进度（兼容旧版本）
 */
function hideProgress() {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.style.display = 'none';
    } else {
        ProgressManager.hide();
    }
}

// ========================================
// 导出到全局作用域
// ========================================

if (typeof window !== 'undefined') {
    // 主进度管理器
    window.ProgressManager = ProgressManager;
    
    // 兼容性函数
    window.showProgress = showProgress;
    window.updateProgress = updateProgress;
    window.hideProgress = hideProgress;
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ProgressManager,
        showProgress,
        updateProgress,
        hideProgress
    };
}
