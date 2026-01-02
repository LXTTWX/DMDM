/**
 * 通用组件工具类
 * 提供各种UI组件的创建和管理功能
 */

class ComponentUtils {
    /**
     * 创建通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型: success, error, warning, info
     * @param {number} duration - 显示时长(毫秒)
     */
    static showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="${iconMap[type] || iconMap.info}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    /**
     * 创建确认对话框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 用户选择结果
     */
    static async showConfirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modalOverlay');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            const modalConfirm = document.getElementById('modalConfirm');
            const modalCancel = document.getElementById('modalCancel');

            modalTitle.textContent = title;
            modalBody.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-message">${message}</div>
                </div>
            `;

            modalConfirm.textContent = options.confirmText || '确认';
            modalCancel.textContent = options.cancelText || '取消';

            const onConfirm = () => {
                cleanup();
                resolve(true);
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                modalConfirm.removeEventListener('click', onConfirm);
                modalCancel.removeEventListener('click', onCancel);
                modal.classList.remove('active');
            };

            modalConfirm.addEventListener('click', onConfirm);
            modalCancel.addEventListener('click', onCancel);
            modal.classList.add('active');
        });
    }

    /**
     * 格式化日期
     * @param {Date|string} date - 日期对象或日期字符串
     * @param {string} format - 格式化模式
     * @returns {string} 格式化后的日期字符串
     */
    static formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间(毫秒)
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait) {
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
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 时间限制(毫秒)
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit) {
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
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 深拷贝对象
     * @param {Object} obj - 要拷贝的对象
     * @returns {Object} 拷贝后的对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    }

    /**
     * 本地存储工具
     */
    static storage = {
        /**
         * 设置本地存储
         * @param {string} key - 键
         * @param {any} value - 值
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('本地存储设置失败:', error);
            }
        },

        /**
         * 获取本地存储
         * @param {string} key - 键
         * @param {any} defaultValue - 默认值
         * @returns {any} 存储的值
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('本地存储获取失败:', error);
                return defaultValue;
            }
        },

        /**
         * 删除本地存储
         * @param {string} key - 键
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('本地存储删除失败:', error);
            }
        },

        /**
         * 清空所有本地存储
         */
        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('本地存储清空失败:', error);
            }
        }
    };
}

// 导出到全局
window.ComponentUtils = ComponentUtils;