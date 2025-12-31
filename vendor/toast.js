/**
 * Toast 提示组件
 * 中优先级优化：错误处理和反馈 - 移动端专用 Toast 提示
 * 
 * 功能：
 * - 支持成功、错误、警告、信息四种类型
 * - 移动端优化设计
 * - 自动消失
 * - 支持多个 Toast 堆叠显示
 * - 符合 Apple 设计规范
 */

(function() {
    'use strict';

    /**
     * Toast 管理器
     */
    class ToastManager {
        constructor() {
            this.toasts = [];
            this.container = null;
            this.maxToasts = 3; // 最多同时显示 3 个 Toast
            this.init();
        }

        /**
         * 初始化 Toast 容器
         */
        init() {
            // 创建 Toast 容器
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.container);
        }

        /**
         * 显示 Toast
         * @param {string} message - 提示消息
         * @param {string} type - 类型：'success' | 'error' | 'warning' | 'info'
         * @param {Object} options - 配置选项
         * @param {number} options.duration - 显示时长（毫秒），默认 3000
         * @param {boolean} options.dismissible - 是否可手动关闭，默认 true
         * @param {string} options.position - 位置：'top' | 'bottom' | 'center'，默认 'bottom'
         * @returns {HTMLElement} Toast 元素
         */
        show(message, type = 'info', options = {}) {
            const {
                duration = 3000,
                dismissible = true,
                position = 'bottom'
            } = options;

            // 如果超过最大数量，移除最旧的
            if (this.toasts.length >= this.maxToasts) {
                const oldestToast = this.toasts.shift();
                this.removeToast(oldestToast);
            }

            // 创建 Toast 元素
            const toast = document.createElement('div');
            toast.className = `toast toast-${type} toast-${position}`;
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

            // 图标
            const icon = this.getIcon(type);
            
            // 消息内容
            const messageEl = document.createElement('div');
            messageEl.className = 'toast-message';
            messageEl.textContent = message;

            // 组装 Toast
            toast.appendChild(icon);
            toast.appendChild(messageEl);

            // 如果可关闭，添加关闭按钮
            if (dismissible) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'toast-close';
                closeBtn.innerHTML = '✕';
                closeBtn.setAttribute('aria-label', '关闭提示');
                closeBtn.addEventListener('click', () => {
                    this.removeToast(toast);
                });
                toast.appendChild(closeBtn);
            }

            // 添加到容器
            this.container.appendChild(toast);
            this.toasts.push(toast);

            // 触发显示动画
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            // 自动移除
            if (duration > 0) {
                setTimeout(() => {
                    this.removeToast(toast);
                }, duration);
            }

            return toast;
        }

        /**
         * 移除 Toast
         * @param {HTMLElement} toast - Toast 元素
         */
        removeToast(toast) {
            if (!toast || !toast.parentNode) return;

            toast.classList.remove('show');
            toast.classList.add('hide');

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                const index = this.toasts.indexOf(toast);
                if (index > -1) {
                    this.toasts.splice(index, 1);
                }
            }, 300); // 等待动画完成
        }

        /**
         * 获取图标
         * @param {string} type - 类型
         * @returns {HTMLElement} 图标元素
         */
        getIcon(type) {
            const icon = document.createElement('div');
            icon.className = 'toast-icon';

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            icon.textContent = icons[type] || icons.info;
            return icon;
        }

        /**
         * 显示成功提示
         * @param {string} message - 消息
         * @param {Object} options - 配置选项
         */
        success(message, options = {}) {
            return this.show(message, 'success', { duration: 3000, ...options });
        }

        /**
         * 显示错误提示
         * @param {string} message - 消息
         * @param {Object} options - 配置选项
         */
        error(message, options = {}) {
            return this.show(message, 'error', { duration: 4000, ...options });
        }

        /**
         * 显示警告提示
         * @param {string} message - 消息
         * @param {Object} options - 配置选项
         */
        warning(message, options = {}) {
            return this.show(message, 'warning', { duration: 3500, ...options });
        }

        /**
         * 显示信息提示
         * @param {string} message - 消息
         * @param {Object} options - 配置选项
         */
        info(message, options = {}) {
            return this.show(message, 'info', { duration: 3000, ...options });
        }

        /**
         * 清除所有 Toast
         */
        clear() {
            this.toasts.forEach(toast => {
                this.removeToast(toast);
            });
        }
    }

    // 创建全局实例
    if (typeof window !== 'undefined') {
        window.toast = window.toast || new ToastManager();
        
        // 便捷方法
        window.showToast = (message, type = 'info', options = {}) => {
            return window.toast.show(message, type, options);
        };
        window.showSuccess = (message, options = {}) => {
            return window.toast.success(message, options);
        };
        window.showErrorToast = (message, options = {}) => {
            return window.toast.error(message, options);
        };
        window.showWarning = (message, options = {}) => {
            return window.toast.warning(message, options);
        };
        window.showInfo = (message, options = {}) => {
            return window.toast.info(message, options);
        };
    }
})();

