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
    const sign = value >= 0 ? '+' : '';
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
        debugWarn('加载缓存失败', error);
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
        debugWarn('写入缓存失败', error);
    }
}

/**
 * 解析日期值（统一入口，向后兼容）
 * 支持多种日期格式：Date对象、Excel序列号、字符串格式
 * 如果 date-utils.js 已加载，使用其 parseDateValue 函数；否则使用简化版本
 * @param {*} dateValue - 日期值（可能是Date、数字、字符串等）
 * @returns {Date|null} 解析后的Date对象，如果解析失败则返回null
 */
function parseDate(dateValue) {
    // 如果 date-utils.js 已加载，使用其更完善的实现
    if (typeof parseDateValue === 'function') {
        return parseDateValue(dateValue);
    }
    
    // 否则使用简化版本（向后兼容）
    if (dateValue === null || dateValue === undefined || dateValue === '') return null;
    
    // 如果已经是Date对象
    if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) return null;
        return new Date(dateValue);
    } 
    // 如果是数字（Excel日期序列号）
    else if (typeof dateValue === 'number') {
        // 优先使用 XLSX 的 parse_date_code 方法（如果可用）
        if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
            try {
                const parsed = XLSX.SSF.parse_date_code(dateValue);
                if (parsed && parsed.y && parsed.m && parsed.d) {
                    const date = new Date(parsed.y, parsed.m - 1, parsed.d);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            } catch (error) {
                // 如果 XLSX 解析失败，使用备用方法
            }
        }
        
        // 备用方法
        if (dateValue > 0 && dateValue < 80000) {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
            if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
                return date;
            }
        }
    }
    // 如果是字符串
    else if (typeof dateValue === 'string') {
        const dateStr = dateValue.trim();
        if (!dateStr) return null;
        
        // 格式1: YYYY/MM/DD 或 YYYY-MM-DD
        if (dateStr.includes('/') || dateStr.includes('-')) {
            const separator = dateStr.includes('/') ? '/' : '-';
            const parts = dateStr.split(separator);
            if (parts.length === 3) {
                let year = parseInt(parts[0], 10);
                let month = parseInt(parts[1], 10) - 1;
                let day = parseInt(parts[2], 10);
                
                if (parts[0].length === 4 && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    if (year >= 1900 && year <= 2100 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
                        return new Date(year, month, day);
                    }
                }
            }
        }
        // 格式2: Excel序列号字符串
        else if (/^\d+\.?\d*$/.test(dateStr)) {
            const excelDate = parseFloat(dateStr);
            if (excelDate > 0 && excelDate < 80000) {
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
                if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
                    return date;
                }
            }
        }
        // 格式3: 尝试使用Date构造函数直接解析
        else {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
                return parsed;
            }
        }
    }
    
    return null;
}

/**
 * 动态加载外部脚本
 * @param {string} src - 脚本URL
 * @returns {Promise<void>} 加载完成的Promise
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 检查是否已加载
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

