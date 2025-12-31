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
     * 创建移动端筛选弹出框
     * @param {HTMLSelectElement} selectElement - 多选下拉框元素
     * @param {string} label - 筛选框标签
     */
    function createMobileFilterModal(selectElement, label) {
        if (!selectElement || window.innerWidth > 1024) return null;
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'mobile-filter-modal';
        modal.innerHTML = `
            <div class="mobile-filter-modal-overlay"></div>
            <div class="mobile-filter-modal-content">
                <div class="mobile-filter-modal-header">
                    <h3>${label}</h3>
                    <button class="mobile-filter-modal-close" aria-label="关闭">✕</button>
                </div>
                <div class="mobile-filter-modal-search">
                    <input type="text" class="mobile-filter-search-input" placeholder="搜索..." autocomplete="off">
                </div>
                <div class="mobile-filter-modal-list">
                    <!-- 选项列表将动态生成 -->
                </div>
                <div class="mobile-filter-modal-footer">
                    <button class="mobile-filter-btn-select-all">全部选择</button>
                    <button class="mobile-filter-btn-clear">清除选择</button>
                    <button class="mobile-filter-btn-confirm">确认</button>
                </div>
            </div>
        `;
        
        // 生成选项列表
        const listContainer = modal.querySelector('.mobile-filter-modal-list');
        const searchInput = modal.querySelector('.mobile-filter-search-input');
        let allOptions = [];
        let filteredOptions = [];
        
        function renderOptions(options) {
            listContainer.innerHTML = '';
            options.forEach(option => {
                if (option.value === '') return; // 跳过默认选项
                
                const item = document.createElement('div');
                item.className = 'mobile-filter-option';
                if (option.selected) {
                    item.classList.add('selected');
                }
                item.innerHTML = `
                    <input type="checkbox" value="${option.value}" ${option.selected ? 'checked' : ''} id="mobile-opt-${selectElement.id}-${option.value}">
                    <label for="mobile-opt-${selectElement.id}-${option.value}">${option.textContent}</label>
                `;
                listContainer.appendChild(item);
            });
        }
        
        function updateOptions() {
            allOptions = Array.from(selectElement.options).filter(opt => opt.value !== '');
            filteredOptions = allOptions;
            renderOptions(filteredOptions);
        }
        
        // 搜索功能
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filteredOptions = allOptions.filter(opt => 
                opt.textContent.toLowerCase().includes(searchTerm)
            );
            renderOptions(filteredOptions);
        });
        
        // 全选
        modal.querySelector('.mobile-filter-btn-select-all').addEventListener('click', () => {
            filteredOptions.forEach(opt => opt.selected = true);
            modal.querySelectorAll('.mobile-filter-option input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
                cb.closest('.mobile-filter-option').classList.add('selected');
            });
        });
        
        // 清除
        modal.querySelector('.mobile-filter-btn-clear').addEventListener('click', () => {
            filteredOptions.forEach(opt => opt.selected = false);
            modal.querySelectorAll('.mobile-filter-option input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.closest('.mobile-filter-option').classList.remove('selected');
            });
        });
        
        // 确认
        modal.querySelector('.mobile-filter-btn-confirm').addEventListener('click', () => {
            // 同步选择状态
            modal.querySelectorAll('.mobile-filter-option input[type="checkbox"]').forEach(cb => {
                const option = allOptions.find(opt => opt.value === cb.value);
                if (option) {
                    option.selected = cb.checked;
                }
            });
            
            // 触发change事件
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 更新显示
            updateFilterDisplay(selectElement);
            
            // 关闭模态框
            modal.remove();
        });
        
        // 关闭按钮
        modal.querySelector('.mobile-filter-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        modal.querySelector('.mobile-filter-modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
        
        // 选项点击切换
        listContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const item = e.target.closest('.mobile-filter-option');
                if (e.target.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            }
        });
        
        // 初始化选项
        updateOptions();
        
        return modal;
    }
    
    /**
     * 更新筛选框显示（显示已选择的数量）
     * @param {HTMLSelectElement} selectElement - 多选下拉框元素
     */
    function updateFilterDisplay(selectElement, isLoading = false) {
        if (!selectElement || window.innerWidth > 1024) return;
        
        const selectedCount = Array.from(selectElement.selectedOptions).filter(opt => opt.value !== '').length;
        const totalCount = selectElement.options.length - 1; // 减去默认选项
        
        // 查找或创建显示元素
        let displayElement = selectElement.parentElement.querySelector('.mobile-filter-display');
        if (!displayElement) {
            displayElement = document.createElement('div');
            displayElement.className = 'mobile-filter-display';
            selectElement.parentElement.insertBefore(displayElement, selectElement);
        }
        
        // 移除加载状态类
        displayElement.classList.remove('loading');
        
        if (isLoading) {
            displayElement.innerHTML = `<span class="loading-spinner"></span> 加载中...`;
            displayElement.classList.add('loading');
        } else if (selectedCount === 0) {
            displayElement.textContent = `0个项目`;
            displayElement.classList.add('empty');
        } else {
            displayElement.textContent = `已选择 ${selectedCount} / ${totalCount} 项`;
            displayElement.classList.remove('empty');
        }
    }
    
    /**
     * 初始化移动端筛选框弹出功能
     * @param {HTMLSelectElement} selectElement - 多选下拉框元素
     */
    function initMobileFilterSelect(selectElement) {
        if (!selectElement || window.innerWidth > 1024) return;
        
        // 隐藏原始select
        selectElement.style.display = 'none';
        
        // 创建显示区域
        const displayElement = document.createElement('div');
        displayElement.className = 'mobile-filter-display';
        displayElement.setAttribute('role', 'button');
        displayElement.setAttribute('tabindex', '0');
        selectElement.parentElement.insertBefore(displayElement, selectElement);
        
        // 获取标签
        const label = selectElement.previousElementSibling?.textContent || 
                     selectElement.parentElement.querySelector('label')?.textContent || 
                     '选择选项';
        
        // 点击显示弹出框
        displayElement.addEventListener('click', () => {
            const modal = createMobileFilterModal(selectElement, label);
            if (modal) {
                document.body.appendChild(modal);
            }
        });
        
        // 键盘支持
        displayElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                displayElement.click();
            }
        });
        
        // 初始化显示
        updateFilterDisplay(selectElement);
        
        // 监听选择变化
        selectElement.addEventListener('change', () => {
            updateFilterDisplay(selectElement);
        });
    }
    
    /**
     * 初始化移动端筛选框展开/收缩功能
     * @param {string} filterContainerId - 筛选框容器ID（如 'destinationFilters' 或 'filtersContainer'）
     * @param {HTMLElement} moduleHeader - 模块标题元素（用于添加展开按钮）
     */
    function initMobileFilterToggle(filterContainerId, moduleHeader) {
        // 只在移动端执行（包括iPad）
        if (window.innerWidth > 1024) return;
        
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
        
        // 为所有多选框初始化移动端弹出功能
        const selects = filterContainer.querySelectorAll('select[multiple]');
        selects.forEach(select => {
            initMobileFilterSelect(select);
        });
        
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
                const selects = filterContainer.querySelectorAll('select[multiple]');
                let needsReload = false;
                selects.forEach(select => {
                    const hasOnlyDefault = select.options.length <= 1 && 
                                          select.options[0] && 
                                          (select.options[0].value === '' || 
                                           select.options[0].textContent.includes('全部') ||
                                           select.options[0].textContent.includes('请先'));
                    if (hasOnlyDefault) {
                        needsReload = true;
                        const event = new CustomEvent('filterExpanded', {
                            detail: { containerId: filterContainerId, selectId: select.id }
                        });
                        window.dispatchEvent(event);
                    }
                });
                
                if (needsReload) {
                    setTimeout(() => {
                        selects.forEach(select => {
                            if (select.options.length <= 1) {
                                console.warn(`[Filter] 筛选框 ${select.id} 选项未加载，可能需要手动触发选项更新`);
                            } else {
                                // 选项已加载，更新显示
                                updateFilterDisplay(select);
                            }
                        });
                    }, 500);
                } else {
                    // 选项已存在，更新显示
                    selects.forEach(select => {
                        updateFilterDisplay(select);
                    });
                }
            }
        });
    }

    /**
     * 自动检测并初始化所有筛选框的移动端展开/收缩功能
     */
    function initAllMobileFilterToggles() {
        if (window.innerWidth > 1024) return;
        
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
        window.initMobileFilterSelect = window.initMobileFilterSelect || initMobileFilterSelect;
        window.updateFilterDisplay = window.updateFilterDisplay || updateFilterDisplay;
    }
})();

