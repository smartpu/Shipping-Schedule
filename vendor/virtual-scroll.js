/**
 * 虚拟滚动组件
 * 中优先级优化：虚拟滚动实现
 * 
 * 对超过 100 行的表格实现虚拟滚动，提升性能
 */

(function() {
    'use strict';

    /**
     * 虚拟滚动管理器
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     */
    class VirtualScroll {
        constructor(container, options = {}) {
            this.container = container;
            this.options = {
                itemHeight: options.itemHeight || 40, // 每行高度（px）
                buffer: options.buffer || 5, // 缓冲区行数
                threshold: options.threshold || 100, // 启用虚拟滚动的行数阈值
                ...options
            };

            this.data = [];
            this.scrollTop = 0;
            this.containerHeight = 0;
            this.visibleStart = 0;
            this.visibleEnd = 0;
            this.totalHeight = 0;

            this.init();
        }

        /**
         * 初始化虚拟滚动
         */
        init() {
            if (!this.container) {
                console.warn('[VirtualScroll] 容器元素不存在');
                return;
            }

            // 创建虚拟滚动容器结构
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'virtual-scroll-wrapper';
            this.wrapper.style.cssText = `
                position: relative;
                overflow-y: auto;
                overflow-x: hidden;
                height: 100%;
                -webkit-overflow-scrolling: touch;
            `;

            this.content = document.createElement('div');
            this.content.className = 'virtual-scroll-content';
            this.content.style.cssText = `
                position: relative;
            `;

            this.viewport = document.createElement('div');
            this.viewport.className = 'virtual-scroll-viewport';
            this.viewport.style.cssText = `
                position: relative;
            `;

            // 组装结构
            this.wrapper.appendChild(this.content);
            this.content.appendChild(this.viewport);

            // 替换原容器内容
            const originalContent = Array.from(this.container.children);
            originalContent.forEach(child => {
                this.container.removeChild(child);
            });
            this.container.appendChild(this.wrapper);

            // 绑定滚动事件
            this.wrapper.addEventListener('scroll', this.handleScroll.bind(this));
            
            // 监听窗口大小变化
            window.addEventListener('resize', this.debounce(() => {
                this.updateDimensions();
                this.render();
            }, 250));

            this.updateDimensions();
        }

        /**
         * 防抖函数
         */
        debounce(func, wait) {
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
         * 设置数据
         * @param {Array} data - 数据数组
         * @param {Function} renderItem - 渲染单个项目的函数
         */
        setData(data, renderItem) {
            this.data = data || [];
            this.renderItem = renderItem;
            this.totalHeight = this.data.length * this.options.itemHeight;
            this.content.style.height = `${this.totalHeight}px`;
            
            // 如果数据量小于阈值，不使用虚拟滚动
            if (this.data.length < this.options.threshold) {
                this.renderAll();
                return;
            }

            this.render();
        }

        /**
         * 更新容器尺寸
         */
        updateDimensions() {
            this.containerHeight = this.wrapper.clientHeight;
            this.visibleCount = Math.ceil(this.containerHeight / this.options.itemHeight) + this.options.buffer * 2;
        }

        /**
         * 处理滚动事件
         */
        handleScroll() {
            this.scrollTop = this.wrapper.scrollTop;
            this.render();
        }

        /**
         * 计算可见范围
         */
        calculateVisibleRange() {
            const start = Math.max(0, Math.floor(this.scrollTop / this.options.itemHeight) - this.options.buffer);
            const end = Math.min(this.data.length, start + this.visibleCount);
            this.visibleStart = start;
            this.visibleEnd = end;
        }

        /**
         * 渲染可见项目
         */
        render() {
            if (this.data.length < this.options.threshold) {
                return;
            }

            this.calculateVisibleRange();

            // 清空视口
            this.viewport.innerHTML = '';
            this.viewport.style.transform = `translateY(${this.visibleStart * this.options.itemHeight}px)`;

            // 渲染可见项目
            for (let i = this.visibleStart; i < this.visibleEnd; i++) {
                if (this.data[i] && this.renderItem) {
                    const item = this.renderItem(this.data[i], i);
                    if (item) {
                        item.style.height = `${this.options.itemHeight}px`;
                        this.viewport.appendChild(item);
                    }
                }
            }
        }

        /**
         * 渲染所有项目（当数据量小于阈值时）
         */
        renderAll() {
            this.viewport.innerHTML = '';
            this.viewport.style.transform = 'translateY(0)';

            this.data.forEach((item, index) => {
                if (this.renderItem) {
                    const element = this.renderItem(item, index);
                    if (element) {
                        element.style.height = `${this.options.itemHeight}px`;
                        this.viewport.appendChild(element);
                    }
                }
            });
        }

        /**
         * 滚动到指定索引
         * @param {number} index - 目标索引
         */
        scrollToIndex(index) {
            if (index < 0 || index >= this.data.length) return;
            const scrollTop = index * this.options.itemHeight;
            this.wrapper.scrollTop = scrollTop;
        }

        /**
         * 更新单个项目
         * @param {number} index - 项目索引
         * @param {*} data - 新数据
         */
        updateItem(index, data) {
            if (index < 0 || index >= this.data.length) return;
            this.data[index] = data;
            
            // 如果该项目在可见范围内，重新渲染
            if (index >= this.visibleStart && index < this.visibleEnd) {
                this.render();
            }
        }

        /**
         * 销毁虚拟滚动
         */
        destroy() {
            if (this.wrapper) {
                this.wrapper.removeEventListener('scroll', this.handleScroll);
            }
            if (this.container && this.wrapper) {
                this.container.removeChild(this.wrapper);
            }
        }
    }

    /**
     * 为表格启用虚拟滚动
     * @param {HTMLElement} tableContainer - 表格容器
     * @param {Array} rows - 表格行数据
     * @param {Function} renderRow - 渲染行的函数
     * @param {Object} options - 配置选项
     * @returns {VirtualScroll} 虚拟滚动实例
     */
    function enableVirtualScrollForTable(tableContainer, rows, renderRow, options = {}) {
        if (!tableContainer || !rows || rows.length < (options.threshold || 100)) {
            // 数据量不足，不需要虚拟滚动
            return null;
        }

        const virtualScroll = new VirtualScroll(tableContainer, {
            itemHeight: options.itemHeight || 40,
            threshold: options.threshold || 100,
            buffer: options.buffer || 5,
            ...options
        });

        virtualScroll.setData(rows, renderRow);

        return virtualScroll;
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.VirtualScroll = VirtualScroll;
        window.enableVirtualScrollForTable = enableVirtualScrollForTable;
    }
})();

