/**
 * 公共工具函数文件
 * 用于所有HTML工具页面
 * 
 * 包含：
 * - 自动加载XLSX和Chart.js
 * - 多选下拉框工具函数
 * - 其他通用工具函数
 */

// 自动加载XLSX和Chart.js（立即执行，不等待DOM）
(function() {
    function loadLibraries() {
        if (typeof ensureXlsx !== 'undefined') {
            ensureXlsx();
        }
        if (typeof ensureChartJs !== 'undefined') {
            ensureChartJs();
        }
    }
    
    // 立即尝试加载
    loadLibraries();
    
    // 如果lib-loader.js还没加载完，等待一下再试
    if (typeof ensureXlsx === 'undefined' || typeof ensureChartJs === 'undefined') {
        setTimeout(loadLibraries, 100);
    }
})();

/**
 * 获取多选下拉框的选中值
 * @param {HTMLSelectElement} selectEl - 多选下拉框元素
 * @returns {string[]} 选中值的数组
 */
function getSelectedValues(selectEl) {
    if (!selectEl) return [];
    return Array.from(selectEl.selectedOptions || [])
        .map(option => option.value)
        .filter(value => value);
}

/**
 * 设置多选下拉框的点击切换功能
 * @param {HTMLSelectElement} selectEl - 多选下拉框元素
 */
function setupMultiSelect(selectEl) {
    if (!selectEl || !selectEl.multiple) return;
    selectEl.addEventListener('mousedown', (event) => {
        const option = event.target;
        if (!option || option.tagName !== 'OPTION') return;
        event.preventDefault();
        if (option.value === '') {
            Array.from(selectEl.options).forEach(opt => {
                opt.selected = false;
            });
        } else {
            option.selected = !option.selected;
        }
        selectEl.dispatchEvent(new Event('change'));
    });
}

/**
 * 转义正则表达式特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 计算百分比变化
 * @param {number} current - 当前值
 * @param {number} previous - 之前的值
 * @returns {number|null} 百分比变化，如果无法计算则返回null
 */
function computePercentChange(current, previous) {
    if (typeof current !== 'number' || typeof previous !== 'number' || !isFinite(current) || !isFinite(previous) || previous === 0) {
        return null;
    }
    return ((current - previous) / previous) * 100;
}

/**
 * 格式化百分比
 * @param {number} value - 百分比值
 * @param {number} digits - 小数位数，默认1
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercent(value, digits = 1) {
    if (typeof value !== 'number' || !isFinite(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(digits)}%`;
}

/**
 * 从localStorage加载缓存数据
 * @param {string} key - 缓存键
 * @returns {any|null} 缓存的数据，如果不存在或出错则返回null
 */
function loadCachedData(key) {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        console.warn('加载缓存失败', error);
        return null;
    }
}

/**
 * 保存数据到localStorage
 * @param {string} key - 缓存键
 * @param {any} data - 要保存的数据
 */
function saveCachedData(key, data) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('写入缓存失败', error);
    }
}

