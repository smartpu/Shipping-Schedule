/**
 * 解析工具通用函数文件
 * 用于 001-02, 365-02 系列解析工具页面
 *
 * 包含：
 * - 日志记录函数
 * - CSV 导出相关函数
 * - 文件下载函数
 */

/**
 * 创建日志记录函数
 * @param {HTMLElement|string} logBoxOrSelector - 日志容器元素或选择器
 * @param {Object} options - 选项
 * @param {boolean} options.useClassName - 是否使用 className 而不是 style.color（默认 false，使用 style.color）
 * @returns {Function} 日志记录函数
 */
function createLogger(logBoxOrSelector, options = {}) {
    const logBox = typeof logBoxOrSelector === 'string' 
        ? document.querySelector(logBoxOrSelector)
        : logBoxOrSelector;
    
    if (!logBox) {
        console.warn('日志容器未找到，将使用 console.log');
        return (message, colorOrClass) => {
            console.log(`[LOG] ${message}`);
        };
    }

    const useClassName = options.useClassName || false;

    return function log(message, colorOrClass) {
        const div = document.createElement('div');
        if (colorOrClass) {
            if (useClassName) {
                // 使用 className（如 'err', 'ok', 'warn'）
                div.className = colorOrClass;
            } else {
                // 使用 style.color（支持颜色字符串如 '#b00020'）
                if (colorOrClass.startsWith('#')) {
                    div.style.color = colorOrClass;
                } else {
                    // 如果不是颜色值，也尝试作为类名
                    div.className = colorOrClass;
                }
            }
        }
        div.textContent = message;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    };
}

/**
 * 将值转换为 CSV 单元格格式
 * @param {any} value - 要转换的值
 * @returns {string} CSV 格式的单元格值
 */
function toCsvCell(value) {
    if (value == null) return '';
    const str = String(value);
    // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

/**
 * 将行数组转换为 CSV 字符串
 * @param {Array<Array>} rows - 行数组，每行是一个数组
 * @returns {string} CSV 格式的字符串
 */
function rowsToCsv(rows) {
    return rows.map(row => row.map(toCsvCell).join(',')).join('\n');
}

/**
 * 下载 Blob 内容为文件
 * @param {string|Blob} content - 要下载的内容（字符串或 Blob）
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型，默认为 'text/csv;charset=utf-8'
 */
function downloadBlob(content, filename, mimeType = 'text/csv;charset=utf-8') {
    const blob = content instanceof Blob 
        ? content 
        : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    // 清理 URL 对象（延迟 5 秒以确保下载完成）
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * 生成带时间戳的文件名
 * @param {string} prefix - 文件名前缀
 * @param {string} extension - 文件扩展名（不含点号），默认为 'csv'
 * @returns {string} 带时间戳的文件名
 */
function generateTimestampFilename(prefix, extension = 'csv') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `${prefix}-${timestamp}.${extension}`;
}

/**
 * DOM 辅助函数
 */

/**
 * 获取元素的文本内容（去除空白）
 * @param {HTMLElement|null} el - DOM 元素
 * @returns {string} 文本内容
 */
function text(el) {
    return el ? (el.textContent || '').trim() : '';
}

/**
 * 查找单个子元素
 * @param {HTMLElement|null} el - 父元素
 * @param {string} selector - CSS 选择器
 * @returns {HTMLElement|null} 找到的元素
 */
function find(el, selector) {
    return el ? el.querySelector(selector) : null;
}

/**
 * 查找所有匹配的子元素
 * @param {HTMLElement|null} el - 父元素
 * @param {string} selector - CSS 选择器
 * @returns {HTMLElement[]} 找到的元素数组
 */
function findAll(el, selector) {
    return el ? Array.from(el.querySelectorAll(selector)) : [];
}

/**
 * 渲染表格预览
 * @param {Array<Array>} rows - 行数据数组
 * @param {HTMLElement|string} containerOrSelector - 容器元素或选择器
 * @param {HTMLElement|string} tableOrSelector - 表格元素或选择器
 * @param {Array<string>} headers - 表头数组
 * @param {number} maxRows - 最大显示行数，默认 50
 */
function renderPreview(rows, containerOrSelector, tableOrSelector, headers, maxRows = 50) {
    const container = typeof containerOrSelector === 'string' 
        ? document.querySelector(containerOrSelector) 
        : containerOrSelector;
    const table = typeof tableOrSelector === 'string' 
        ? document.querySelector(tableOrSelector) 
        : tableOrSelector;
    
    if (!table) {
        console.warn('表格元素未找到');
        return;
    }
    
    // 如果没有提供 headers，尝试从第一行获取
    if (!headers && rows.length > 0) {
        headers = rows[0].map((_, i) => `列${i + 1}`);
    }
    
    if (!headers) {
        console.warn('表头未提供');
        return;
    }
    
    table.innerHTML = '';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    const displayRows = Math.min(rows.length, maxRows);
    for (let i = 0; i < displayRows; i++) {
        const tr = document.createElement('tr');
        rows[i].forEach(c => {
            const td = document.createElement('td');
            td.textContent = c || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    
    if (container) {
        container.classList.toggle('hidden', rows.length === 0);
    }
}

/**
 * 统一清洗：去除前后空白，压缩内部空白到单空格，移除换行与制表
 * @param {any} value - 要清洗的值
 * @returns {string} 清洗后的字符串
 */
function clean(value) {
    if (value == null) return '';
    const cleanedString = String(value)
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return cleanedString;
}

// 导出函数到全局
if (typeof window !== 'undefined') {
    window.clean = window.clean || clean;
    window.createLogger = window.createLogger || createLogger;
    window.toCsvCell = window.toCsvCell || toCsvCell;
    window.rowsToCsv = window.rowsToCsv || rowsToCsv;
    window.downloadBlob = window.downloadBlob || downloadBlob;
    window.generateTimestampFilename = window.generateTimestampFilename || generateTimestampFilename;
    window.text = window.text || text;
    window.find = window.find || find;
    window.findAll = window.findAll || findAll;
    window.renderPreview = window.renderPreview || renderPreview;
}

