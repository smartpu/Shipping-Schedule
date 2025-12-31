/**
 * 骨架屏加载组件
 * 中优先级优化：骨架屏加载状态
 * 
 * 为表格和数据加载提供骨架屏，提升感知性能
 */

(function() {
    'use strict';

    /**
     * 创建表格骨架屏
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     * @param {number} options.rows - 行数，默认 5
     * @param {number} options.cols - 列数，默认 4
     * @returns {HTMLElement} 骨架屏元素
     */
    function createTableSkeleton(container, options = {}) {
        const { rows = 5, cols = 4 } = options;
        
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-table';
        skeleton.setAttribute('aria-label', '加载中...');
        skeleton.setAttribute('role', 'status');
        
        // 创建表头骨架
        const headerRow = document.createElement('div');
        headerRow.className = 'skeleton-row skeleton-header';
        for (let i = 0; i < cols; i++) {
            const cell = document.createElement('div');
            cell.className = 'skeleton-cell';
            headerRow.appendChild(cell);
        }
        skeleton.appendChild(headerRow);
        
        // 创建数据行骨架
        for (let r = 0; r < rows; r++) {
            const row = document.createElement('div');
            row.className = 'skeleton-row';
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'skeleton-cell';
                // 最后一列可能较短
                if (c === cols - 1) {
                    cell.style.width = '60%';
                }
                row.appendChild(cell);
            }
            skeleton.appendChild(row);
        }
        
        if (container) {
            container.appendChild(skeleton);
        }
        
        return skeleton;
    }

    /**
     * 创建卡片骨架屏
     * @param {HTMLElement} container - 容器元素
     * @param {number} count - 卡片数量，默认 3
     * @returns {HTMLElement} 骨架屏元素
     */
    function createCardSkeleton(container, count = 3) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-cards';
        skeleton.setAttribute('aria-label', '加载中...');
        skeleton.setAttribute('role', 'status');
        
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'skeleton-card';
            
            // 标题
            const title = document.createElement('div');
            title.className = 'skeleton-line skeleton-title';
            card.appendChild(title);
            
            // 内容行
            for (let j = 0; j < 3; j++) {
                const line = document.createElement('div');
                line.className = 'skeleton-line';
                if (j === 2) {
                    line.style.width = '60%';
                }
                card.appendChild(line);
            }
            
            skeleton.appendChild(card);
        }
        
        if (container) {
            container.appendChild(skeleton);
        }
        
        return skeleton;
    }

    /**
     * 移除骨架屏
     * @param {HTMLElement} skeleton - 骨架屏元素
     */
    function removeSkeleton(skeleton) {
        if (skeleton && skeleton.parentNode) {
            skeleton.classList.add('skeleton-fade-out');
            setTimeout(() => {
                if (skeleton.parentNode) {
                    skeleton.parentNode.removeChild(skeleton);
                }
            }, 300);
        }
    }

    /**
     * 显示加载状态（带骨架屏）
     * @param {HTMLElement} container - 容器元素
     * @param {string} type - 类型：'table' 或 'card'
     * @param {Object} options - 配置选项
     * @returns {Function} 清理函数，调用后移除骨架屏
     */
    function showSkeletonLoader(container, type = 'table', options = {}) {
        if (!container) {
            console.warn('[SkeletonLoader] 容器元素不存在');
            return () => {};
        }

        let skeleton;
        if (type === 'table') {
            skeleton = createTableSkeleton(container, options);
        } else if (type === 'card') {
            skeleton = createCardSkeleton(container, options.count);
        } else {
            console.warn('[SkeletonLoader] 未知的骨架屏类型:', type);
            return () => {};
        }

        // 返回清理函数
        return () => {
            removeSkeleton(skeleton);
        };
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.SkeletonLoader = {
            createTableSkeleton,
            createCardSkeleton,
            removeSkeleton,
            showSkeletonLoader
        };
    }
})();

