/**
 * 筛选器更新公共工具
 * 统一处理级联筛选、选项更新、搜索过滤等逻辑
 */

(function() {
    'use strict';

    /**
     * 防抖函数（通用）
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    function debounce(func, wait = 300) {
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
     * 过滤选项（根据搜索关键词）
     * @param {Array<string>} options - 选项数组
     * @param {string} searchValue - 搜索关键词
     * @returns {Array<string>} 过滤后的选项数组
     */
    function filterOptionsBySearch(options, searchValue) {
        if (!searchValue || !searchValue.trim()) {
            return options;
        }

        const lowerSearch = searchValue.toLowerCase().trim();
        return options.filter(option => {
            const lowerOption = String(option).toLowerCase();
            return lowerOption.includes(lowerSearch);
        });
    }

    /**
     * 更新多选下拉框选项
     * @param {HTMLSelectElement} selectElement - 下拉框元素
     * @param {Array<string>} options - 选项数组
     * @param {string} defaultLabel - 默认选项文本
     * @param {Array<string>} selectedValues - 已选中的值数组
     * @param {boolean} disabled - 是否禁用
     */
    function updateSelectOptions(selectElement, options, defaultLabel, selectedValues = [], disabled = false) {
        if (!selectElement) return;

        const currentSelected = Array.from(selectElement.selectedOptions)
            .map(option => option.value)
            .filter(value => value !== '');

        selectElement.innerHTML = '';

        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = defaultLabel;
        selectElement.appendChild(defaultOption);

        // 添加选项
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            if (selectedValues.includes(option)) {
                optionElement.selected = true;
            }
            selectElement.appendChild(optionElement);
        });

        selectElement.disabled = disabled;
    }

    /**
     * 获取多选下拉框的选中值
     * @param {HTMLSelectElement} selectElement - 下拉框元素
     * @returns {Array<string>} 选中值数组
     */
    function getSelectedValues(selectElement) {
        if (!selectElement) return [];
        return Array.from(selectElement.selectedOptions)
            .map(option => option.value)
            .filter(value => value !== '');
    }

    /**
     * 设置多选下拉框（支持点击切换选择）
     * @param {HTMLSelectElement} selectElement - 下拉框元素
     */
    function setupMultiSelect(selectElement) {
        if (!selectElement) return;
        selectElement.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const option = e.target;
            if (option.tagName === 'OPTION') {
                option.selected = !option.selected;
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    /**
     * 全选选项
     * @param {HTMLSelectElement} selectElement - 下拉框元素
     */
    function selectAllOptions(selectElement) {
        if (!selectElement) return;
        Array.from(selectElement.options).forEach(option => {
            option.selected = true;
        });
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * 清除所有选择
     * @param {HTMLSelectElement} selectElement - 下拉框元素
     */
    function clearSelectOptions(selectElement) {
        if (!selectElement) return;
        Array.from(selectElement.options).forEach(option => {
            option.selected = false;
        });
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * 为搜索输入添加防抖
     * @param {HTMLInputElement} searchInput - 搜索输入框
     * @param {Function} callback - 回调函数
     * @param {number} delay - 防抖延迟（毫秒）
     */
    function addDebouncedSearch(searchInput, callback, delay = 300) {
        if (!searchInput || typeof callback !== 'function') return;

        const debouncedCallback = debounce((e) => {
            callback(e);
        }, delay);

        searchInput.addEventListener('input', debouncedCallback);
    }

    /**
     * 初始化移动端筛选框展开/收缩功能
     * @param {string} filterContainerId - 筛选框容器ID（如 'destinationFilters' 或 'filtersContainer'）
     * @param {HTMLElement} moduleHeader - 模块标题元素（用于添加展开按钮）
     */
    function initMobileFilterToggle(filterContainerId, moduleHeader) {
        // 只在移动端执行
        if (window.innerWidth > 768) return;
        
        const filterContainer = document.getElementById(filterContainerId);
        if (!filterContainer || !moduleHeader) return;
        
        // 检查是否已存在按钮
        let toggleBtn = moduleHeader.querySelector('.filter-toggle-btn');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.className = 'filter-toggle-btn';
            toggleBtn.textContent = '展开筛选条件';
            toggleBtn.setAttribute('aria-label', '展开/收缩筛选条件');
            moduleHeader.appendChild(toggleBtn);
        }
        
        // 初始化状态：如果筛选框有 hidden 类，则隐藏；否则根据移动端规则处理
        const isHidden = filterContainer.classList.contains('hidden');
        if (!isHidden) {
            // 移动端默认隐藏，除非明确标记为 show
            if (!filterContainer.classList.contains('show')) {
                filterContainer.style.display = 'none';
            }
        }
        
        // 切换显示/隐藏
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = filterContainer.style.display !== 'none' && 
                             !filterContainer.classList.contains('hidden') &&
                             filterContainer.classList.contains('show');
            
            if (isVisible) {
                filterContainer.style.display = 'none';
                filterContainer.classList.remove('show');
                toggleBtn.classList.remove('expanded');
                toggleBtn.textContent = '展开筛选条件';
            } else {
                filterContainer.style.display = 'block';
                filterContainer.classList.add('show');
                filterContainer.classList.remove('hidden');
                toggleBtn.classList.add('expanded');
                toggleBtn.textContent = '收起筛选条件';
                
                // 展开时，确保筛选框选项已加载
                // 检查是否有空的select元素，如果有则尝试触发选项更新
                const selects = filterContainer.querySelectorAll('select[multiple]');
                let needsReload = false;
                selects.forEach(select => {
                    // 如果select只有默认选项（如"全部起运港"或"请先加载数据"），可能需要重新加载选项
                    const hasOnlyDefault = select.options.length <= 1 && 
                                          select.options[0] && 
                                          (select.options[0].value === '' || 
                                           select.options[0].textContent.includes('全部') ||
                                           select.options[0].textContent.includes('请先'));
                    if (hasOnlyDefault) {
                        needsReload = true;
                        // 触发一个自定义事件，让页面知道筛选框已展开，需要加载选项
                        const event = new CustomEvent('filterExpanded', {
                            detail: { containerId: filterContainerId, selectId: select.id }
                        });
                        window.dispatchEvent(event);
                    }
                });
                
                // 如果检测到需要重新加载，延迟一下再检查（给页面时间响应事件）
                if (needsReload) {
                    setTimeout(() => {
                        // 再次检查选项是否已加载
                        selects.forEach(select => {
                            if (select.options.length <= 1) {
                                console.warn(`[Filter] 筛选框 ${select.id} 选项未加载，可能需要手动触发选项更新`);
                            }
                        });
                    }, 500);
                }
            }
        });
    }

    /**
     * 自动检测并初始化所有筛选框的移动端展开/收缩功能
     */
    function initAllMobileFilterToggles() {
        if (window.innerWidth > 768) return;
        
        // 查找所有筛选框容器
        const filterContainers = [
            { id: 'destinationFilters', name: 'destinationFilters' },
            { id: 'filtersContainer', name: 'filtersContainer' },
            { id: 'marketFilterControls', name: 'marketFilterControls' } // 365-04 运费趋势筛选框
        ].map(item => {
            const el = document.getElementById(item.id);
            return el ? { element: el, id: item.id, name: item.name } : null;
        }).filter(item => item !== null);
        
        filterContainers.forEach(({ element: container, id, name }) => {
            // 查找对应的模块标题
            let moduleHeader = container.closest('.feature-section')?.querySelector('.module-header');
            if (!moduleHeader) {
                // 尝试查找父级模块标题
                moduleHeader = container.previousElementSibling?.querySelector('.module-header') ||
                              container.parentElement?.querySelector('.module-header') ||
                              container.closest('.module-card')?.querySelector('.module-header');
            }
            
            // 对于 marketFilterControls，它在 module-card 内部，需要找到对应的 feature-section
            if (!moduleHeader && name === 'marketFilterControls') {
                const featureSection = container.closest('#marketModule');
                if (featureSection) {
                    moduleHeader = featureSection.querySelector('.module-header');
                }
            }
            
            if (moduleHeader) {
                initMobileFilterToggle(id, moduleHeader);
            }
        });
    }

    // 页面加载完成后自动初始化
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initAllMobileFilterToggles, 100);
            });
        } else {
            setTimeout(initAllMobileFilterToggles, 100);
        }
        
        // 监听窗口大小变化
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                initAllMobileFilterToggles();
            }, 250);
        });
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.debounce = window.debounce || debounce;
        window.filterOptionsBySearch = window.filterOptionsBySearch || filterOptionsBySearch;
        window.updateSelectOptions = window.updateSelectOptions || updateSelectOptions;
        window.getSelectedValues = window.getSelectedValues || getSelectedValues;
        window.setupMultiSelect = window.setupMultiSelect || setupMultiSelect;
        window.selectAllOptions = window.selectAllOptions || selectAllOptions;
        window.clearSelectOptions = window.clearSelectOptions || clearSelectOptions;
        window.addDebouncedSearch = window.addDebouncedSearch || addDebouncedSearch;
        window.initMobileFilterToggle = window.initMobileFilterToggle || initMobileFilterToggle;
        window.initAllMobileFilterToggles = window.initAllMobileFilterToggles || initAllMobileFilterToggles;
    }
})();

