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
    }
})();

