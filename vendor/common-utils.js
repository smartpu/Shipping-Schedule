/**
 * 公共工具函数文件
 * 用于所有HTML工具页面
 * 
 * 包含：
 * - 自动加载XLSX和Chart.js
 * - 多选下拉框工具函数
 * - 统一防抖和节流函数
 * - 事件监听器管理（使用 AbortController）
 * - 其他通用工具函数
 */

// 提供 debug 函数的降级实现（如果 debug-utils.js 尚未加载）
(function() {
    if (typeof window !== 'undefined') {
        if (typeof window.debugLog !== 'function') {
            window.debugLog = function(...args) { 
                if (window.getCachedDebugMode && window.getCachedDebugMode()) {
                    console.log('[DEBUG]', ...args); 
                }
            };
        }
        if (typeof window.debugWarn !== 'function') {
            window.debugWarn = function(...args) { 
                if (window.getCachedDebugMode && window.getCachedDebugMode()) {
                    console.warn('[DEBUG]', ...args); 
                }
            };
        }
        if (typeof window.debugError !== 'function') {
            window.debugError = function(...args) { 
                if (window.getCachedDebugMode && window.getCachedDebugMode()) {
                    console.error('[DEBUG]', ...args); 
                }
            };
        }
    }
})();

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
 * 设置多选下拉框（使用浏览器默认行为，需要 Control 键才能多选）
 * @param {HTMLSelectElement} selectEl - 多选下拉框元素
 */
function setupMultiSelect(selectEl) {
    if (!selectEl || !selectEl.multiple) return;
    // 不阻止默认行为，让浏览器使用标准的 Control 键多选行为
    // 只需要确保 change 事件能正常触发即可
}

/**
 * 选中所有可用选项（跳过占位空值）
 * @param {HTMLSelectElement} selectEl
 */
function selectAllOptions(selectEl) {
    if (!selectEl || !selectEl.options) return;
    Array.from(selectEl.options).forEach(opt => {
        if (opt.value !== '') opt.selected = true;
    });
    selectEl.dispatchEvent(new Event('change'));
}

/**
 * 清除所有选中项
 * @param {HTMLSelectElement} selectEl
 */
function clearSelectOptions(selectEl) {
    if (!selectEl || !selectEl.options) return;
    Array.from(selectEl.options).forEach(opt => { opt.selected = false; });
    selectEl.dispatchEvent(new Event('change'));
}

/**
 * 优化移动端顶部按钮布局
 * 为不支持的浏览器提供降级方案
 */
function optimizeMobileButtonLayout() {
    if (window.innerWidth > 768) return; // 只在移动端执行
    
    const actionContainers = document.querySelectorAll('.section-intro-actions');
    actionContainers.forEach(container => {
        const buttons = Array.from(container.children);
        const buttonCount = buttons.length;
        
        // 移除之前的类
        container.classList.remove('has-2-buttons', 'has-3-buttons');
        
        if (buttonCount === 2) {
            container.classList.add('has-2-buttons');
        } else if (buttonCount === 3) {
            container.classList.add('has-3-buttons');
        }
    });
}

// 页面加载完成后执行
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            optimizeMobileButtonLayout();
            // 监听窗口大小变化
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(optimizeMobileButtonLayout, 250);
            });
        });
    } else {
        optimizeMobileButtonLayout();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(optimizeMobileButtonLayout, 250);
        });
    }
    
    // 导出函数
    window.optimizeMobileButtonLayout = optimizeMobileButtonLayout;
}

/**
 * 根据自定义顺序排序（未命中顺序的放在末尾，按字母排序）
 * @param {string[]} list
 * @param {string[]} order
 * @returns {string[]}
 */
function sortByCustomOrder(list, order) {
    if (!Array.isArray(list) || !Array.isArray(order)) return list || [];
    const orderMap = new Map(order.map((v, i) => [v, i]));
    return [...list].sort((a, b) => {
        const ai = orderMap.has(a) ? orderMap.get(a) : Infinity;
        const bi = orderMap.has(b) ? orderMap.get(b) : Infinity;
        if (ai !== bi) return ai - bi;
        return a.localeCompare(b, 'zh-Hans-CN');
    });
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.getSelectedValues = window.getSelectedValues || getSelectedValues;
    window.setupMultiSelect = window.setupMultiSelect || setupMultiSelect;
    window.selectAllOptions = window.selectAllOptions || selectAllOptions;
    window.clearSelectOptions = window.clearSelectOptions || clearSelectOptions;
    window.sortByCustomOrder = window.sortByCustomOrder || sortByCustomOrder;
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

// 导出 loadScript 到全局（供 pdf-utils.js 等使用）
if (typeof window !== 'undefined') {
    window.loadScript = window.loadScript || loadScript;
}

/**
 * 从 Data/index.json 自动加载 Excel 测试数据文件
 * @param {string} configKey - 配置文件中的键名（如 '001-04-market-analysis'）
 * @param {Function} onFileLoaded - 文件加载成功后的回调函数，接收 File 对象作为参数
 * @returns {Promise<void>}
 */
async function loadDefaultExcelFile(configKey, onFileLoaded) {
    // 检查是否在本地文件系统（file://协议），如果是则跳过自动加载
    if (window.location.protocol === 'file:') {
        if (typeof window.debugLog === 'function') {
            window.debugLog('本地文件系统环境，跳过自动加载，请手动选择文件');
        }
        return;
    }

    try {
        // 从 index.json 读取文件路径配置（完全依赖配置文件，不暴露路径信息）
        let excelFileName = null;
        try {
            const configResponse = await fetch('Data/index.json');
            if (configResponse.ok) {
                const config = await configResponse.json();
                if (config.files && config.files[configKey]) {
                    // 支持嵌套配置（如 Market-Sailing-Schedule）
                    const fileConfig = config.files[configKey];
                    if (typeof fileConfig === 'string') {
                        excelFileName = fileConfig;
                    } else if (typeof fileConfig === 'object') {
                        // 如果是对象，不支持单个文件加载，返回
                        if (typeof window.debugLog === 'function') {
                            window.debugLog('配置为多文件格式，请使用 loadDefaultExcelFiles 函数');
                        }
                        return;
                    }
                }
            }
        } catch (e) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('无法读取配置文件，请手动选择文件');
            }
            return;
        }

        if (!excelFileName) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('配置文件中未找到文件路径，请手动选择文件');
            }
            return;
        }

        const response = await fetch(`Data/${excelFileName}`);
        if (!response.ok) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('默认 Excel 文件不存在，等待用户手动选择');
            }
            return;
        }
        const blob = await response.blob();
        const file = new File([blob], excelFileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // 调用回调函数处理文件
        if (typeof onFileLoaded === 'function') {
            await onFileLoaded(file);
        }
    } catch (error) {
        // 如果是CORS错误，静默处理（本地文件系统环境）
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('本地文件系统环境，无法自动加载，请手动选择文件');
            }
        } else {
            console.log('自动加载 Excel 文件失败，等待用户手动选择:', error);
        }
    }
}

/**
 * 从 Data/index.json 自动加载多个 Excel 测试数据文件（用于 Market-Sailing-Schedule）
 * @param {string} configKey - 配置文件中的键名（如 'Market-Sailing-Schedule'）
 * @param {Object} onFileLoaded - 文件加载成功后的回调函数对象，包含 '001' 和 '365' 两个回调
 * @returns {Promise<void>}
 */
async function loadDefaultExcelFiles(configKey, onFileLoaded) {
    // 检查是否在本地文件系统（file://协议），如果是则跳过自动加载
    if (window.location.protocol === 'file:') {
        if (typeof window.debugLog === 'function') {
            window.debugLog('本地文件系统环境，跳过自动加载，请手动选择文件');
        }
        return;
    }

    // 从 index.json 读取文件路径配置（完全依赖配置文件，不暴露路径信息）
    let file001Name = null;
    let file365Name = null;
    try {
        const configResponse = await fetch('Data/index.json');
        if (configResponse.ok) {
            const config = await configResponse.json();
            if (config.files && config.files[configKey]) {
                const sailingScheduleConfig = config.files[configKey];
                if (typeof sailingScheduleConfig === 'object') {
                    if (sailingScheduleConfig['001']) file001Name = sailingScheduleConfig['001'];
                    if (sailingScheduleConfig['365']) file365Name = sailingScheduleConfig['365'];
                }
            }
        }
    } catch (e) {
        console.log('无法读取配置文件，请手动选择文件');
        return;
    }

    if (!file001Name || !file365Name) {
        console.log('配置文件中未找到文件路径，请手动选择文件');
        return;
    }

    // 加载 001 文件
    try {
        const response001 = await fetch(`Data/${file001Name}`);
        if (response001.ok) {
            const blob001 = await response001.blob();
            const file001 = new File([blob001], file001Name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            if (onFileLoaded && typeof onFileLoaded['001'] === 'function') {
                await onFileLoaded['001'](file001);
            }
        }
    } catch (error) {
        // 如果是CORS错误，静默处理（本地文件系统环境）
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('本地文件系统环境，无法自动加载，请手动选择文件');
            }
        } else {
            console.log('自动加载 001 文件失败:', error);
        }
    }

    // 加载 365 文件
    try {
        const response365 = await fetch(`Data/${file365Name}`);
        if (response365.ok) {
            const blob365 = await response365.blob();
            const file365 = new File([blob365], file365Name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            if (onFileLoaded && typeof onFileLoaded['365'] === 'function') {
                await onFileLoaded['365'](file365);
            }
        }
    } catch (error) {
        // 如果是CORS错误，静默处理（本地文件系统环境）
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('本地文件系统环境，无法自动加载，请手动选择文件');
            }
        } else {
            console.log('自动加载 365 文件失败:', error);
        }
    }
}

/**
 * 从 linerlytica/index.json 自动加载市场周报 PDF 文件
 * @param {Function} onFileLoaded - 文件加载成功后的回调函数，接收 File 对象作为参数
 * @returns {Promise<void>}
 */
async function loadDefaultMarketReports(onFileLoaded) {
    // 检查是否在本地文件系统（file://协议），如果是则跳过自动加载
    if (window.location.protocol === 'file:') {
        if (typeof window.debugLog === 'function') {
            window.debugLog('本地文件系统环境，跳过自动加载市场周报，请手动选择文件');
        }
        return;
    }

    try {
        // 首先尝试加载索引文件（如果存在）
        let pdfFileList = [];
        try {
            const indexResponse = await fetch('linerlytica/index.json');
            if (indexResponse.ok) {
                const indexData = await indexResponse.json();
                if (Array.isArray(indexData.files)) {
                    pdfFileList = indexData.files;
                }
            }
        } catch (e) {
            // 索引文件不存在，使用默认方法
        }

        // 如果没有索引文件，尝试加载常见的文件名模式
        if (pdfFileList.length === 0) {
            // 尝试常见的文件名模式（按优先级顺序）
            const commonPatterns = [
                // 当前周报的常见命名格式
                'Linerlytica-25MP50.pdf',
                'Linerlytica-Weekly.pdf',
                'Linerlytica.pdf',
                // 按日期格式（最近4周）
                ...(() => {
                    const patterns = [];
                    const currentDate = new Date();
                    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
                        const date = new Date(currentDate);
                        date.setDate(date.getDate() - (weekOffset * 7));
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        patterns.push(
                            `${year}-${month}-${day}.pdf`,
                            `${year}${month}${day}.pdf`,
                            `Linerlytica_${year}-${month}-${day}.pdf`,
                            `Weekly_${year}-${month}-${day}.pdf`,
                            `Linerlytica Weekly ${year}-${month}-${day}.pdf`
                        );
                    }
                    return patterns;
                })()
            ];
            
            // 尝试加载这些文件
            for (const fileName of commonPatterns) {
                try {
                    const response = await fetch(`linerlytica/${fileName}`);
                    if (response.ok) {
                        pdfFileList.push(fileName);
                        // 找到第一个就停止（因为通常只有最新的一个文件）
                        break;
                    }
                } catch (e) {
                    // 继续尝试下一个文件名
                }
            }
        }

        // 如果找到了PDF文件列表，加载它们
        if (pdfFileList.length > 0 && typeof onFileLoaded === 'function') {
            for (const fileName of pdfFileList) {
                try {
                    const response = await fetch(`linerlytica/${fileName}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        const file = new File([blob], fileName, { type: 'application/pdf' });
                        try {
                            await onFileLoaded(file);
                        } catch (fileError) {
                            // 捕获文件处理错误，继续处理其他文件
                            const warnFn = typeof window !== 'undefined' && typeof window.debugWarn === 'function' 
                                ? window.debugWarn 
                                : (typeof console !== 'undefined' ? console.warn : () => {});
                            warnFn(`处理文件 ${fileName} 时出错:`, fileError);
                        }
                    }
                } catch (e) {
                    // 忽略单个文件加载错误，继续加载其他文件
                }
            }
        }
    } catch (error) {
        // 如果是CORS错误，静默处理（本地文件系统环境）
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('本地文件系统环境，无法自动加载，请手动选择文件');
            }
        } else {
            console.log('自动加载市场周报失败:', error);
        }
    }
}

/**
 * 初始化001系列工具页面（公共函数）
 * 统一处理导航栏加载和身份验证检查
 * @param {string} currentPage - 当前页面文件名（如 '001-01-manual-download.html'）
 * @param {string} currentSection - 当前工具集（如 'tools001'）
 * @param {Function} [onInit] - 初始化完成后的回调函数（可选）
 */
function init001ToolPage(currentPage, currentSection = 'tools001', onInit = null, skipAuth = false) {
    // 加载导航栏
    window.addEventListener('DOMContentLoaded', () => {
        if (window.SidebarLoader) {
            window.SidebarLoader.load('#sidebar-placeholder', {
                currentPage: currentPage,
                currentSection: currentSection
            });
        } else {
            if (typeof window.debugError === 'function') {
                window.debugError(`[${currentPage}] SidebarLoader未加载`);
            } else if (typeof console !== 'undefined' && console.error) {
                console.error(`[${currentPage}] SidebarLoader未加载`);
            }
        }
        
        // 执行自定义初始化回调
        if (typeof onInit === 'function') {
            onInit();
        }
    });
    
    // 身份验证检查（立即执行，不等待DOM）
    // 某些工具（如单元测试工具）可能不需要身份验证
    if (!skipAuth) {
        const AUTH_STORAGE_KEY = 'shipping_tools_auth';
        const auth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!auth) {
            window.location.href = 'index.html';
        }
    }
}

/**
 * ==================== 统一防抖和节流工具函数 ====================
 * 高优先级优化：统一防抖实现
 */

/**
 * 防抖函数（Debounce）
 * 延迟执行函数，直到停止调用后等待指定时间
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒），默认 300ms
 * @param {boolean} immediate - 是否立即执行第一次调用，默认 false
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * 节流函数（Throttle）
 * 限制函数执行频率，每隔指定时间执行一次
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间间隔（毫秒），默认 300ms
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * ==================== 事件监听器管理（使用 AbortController）====================
 * 高优先级优化：事件监听器清理
 */

/**
 * 事件监听器管理器
 * 使用 AbortController 统一管理事件监听器，防止内存泄漏
 */
class EventListenerManager {
    constructor() {
        this.controllers = new Map();
    }

    /**
     * 添加事件监听器
     * @param {HTMLElement} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object|boolean} options - 事件选项（支持 AbortSignal）
     * @returns {AbortController} AbortController 实例，用于后续清理
     */
    add(element, event, handler, options = false) {
        if (!element) {
            console.warn('[EventListenerManager] 元素不存在，无法添加事件监听器');
            return null;
        }

        // 创建 AbortController
        const controller = new AbortController();
        const key = `${element.id || element.className || 'unknown'}-${event}`;

        // 合并 options，添加 signal
        const eventOptions = typeof options === 'object' 
            ? { ...options, signal: controller.signal }
            : { signal: controller.signal };

        // 添加事件监听器
        element.addEventListener(event, handler, eventOptions);

        // 存储 controller
        if (!this.controllers.has(key)) {
            this.controllers.set(key, []);
        }
        this.controllers.get(key).push({ element, event, handler, controller });

        return controller;
    }

    /**
     * 移除单个事件监听器
     * @param {HTMLElement} element - 目标元素
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     */
    remove(element, event, handler) {
        if (!element) return;

        const key = `${element.id || element.className || 'unknown'}-${event}`;
        const listeners = this.controllers.get(key);

        if (listeners) {
            const index = listeners.findIndex(l => l.handler === handler);
            if (index >= 0) {
                const { controller } = listeners[index];
                controller.abort(); // 中止信号会自动移除监听器
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    this.controllers.delete(key);
                }
            }
        }
    }

    /**
     * 移除元素的所有事件监听器
     * @param {HTMLElement} element - 目标元素
     */
    removeAll(element) {
        if (!element) return;

        const elementId = element.id || element.className || 'unknown';
        const keysToRemove = [];

        this.controllers.forEach((listeners, key) => {
            if (key.startsWith(elementId)) {
                listeners.forEach(({ controller }) => {
                    controller.abort();
                });
                keysToRemove.push(key);
            }
        });

        keysToRemove.forEach(key => this.controllers.delete(key));
    }

    /**
     * 清理所有事件监听器
     */
    cleanup() {
        this.controllers.forEach((listeners) => {
            listeners.forEach(({ controller }) => {
                controller.abort();
            });
        });
        this.controllers.clear();
    }

    /**
     * 获取管理器实例（单例模式）
     * @returns {EventListenerManager} 管理器实例
     */
    static getInstance() {
        if (!EventListenerManager.instance) {
            EventListenerManager.instance = new EventListenerManager();
        }
        return EventListenerManager.instance;
    }
}

// 创建全局实例
const globalEventManager = EventListenerManager.getInstance();

// 页面卸载时自动清理
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        globalEventManager.cleanup();
    });
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.loadDefaultExcelFile = window.loadDefaultExcelFile || loadDefaultExcelFile;
    window.loadDefaultExcelFiles = window.loadDefaultExcelFiles || loadDefaultExcelFiles;
    window.loadDefaultMarketReports = window.loadDefaultMarketReports || loadDefaultMarketReports;
    window.init001ToolPage = window.init001ToolPage || init001ToolPage;
    
    // 导出统一防抖和节流函数
    window.debounce = window.debounce || debounce;
    window.throttle = window.throttle || throttle;
    
    // 导出事件监听器管理器
    window.EventListenerManager = EventListenerManager;
    window.globalEventManager = globalEventManager;
}

