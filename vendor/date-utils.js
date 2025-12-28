/**
 * 日期解析工具函数
 * 统一处理 Excel 日期序列号、字符串日期等多种格式
 */

/**
 * 解析 Excel 日期序列号为 Date 对象
 * @param {number} dateValue - Excel 日期序列号
 * @returns {Date|null} 解析后的日期对象，失败返回 null
 */
function parseExcelDateSerial(dateValue) {
    if (typeof dateValue !== 'number' || !isFinite(dateValue)) {
        return null;
    }
    
    // 优先使用 XLSX 的 parse_date_code 方法（最准确）
    if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
        try {
            const parsed = XLSX.SSF.parse_date_code(dateValue);
            if (parsed && parsed.y && parsed.m && parsed.d) {
                // XLSX 的 parse_date_code 返回的日期是 UTC 时间
                // 直接使用年月日创建本地日期对象，避免时区转换
                const date = new Date(parsed.y, parsed.m - 1, parsed.d);
                // 验证日期是否正确
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        } catch (error) {
            // 如果 XLSX 解析失败，使用备用方法
        }
    }
    
    // 备用方法：Excel 日期从 1900-01-01 开始，但 Excel 错误地认为 1900 是闰年
    // Excel 序列号 1 = 1900-01-01，序列号 0 = 1899-12-30（但 Excel 不支持 0）
    // 检查数字是否在合理范围内（1900-01-01 到 2100-12-31）
    if (dateValue > 0 && dateValue < 80000) {
        // Excel 的日期系统：序列号 1 = 1900-01-01
        // 使用 1899-12-30 作为基准（序列号 0 对应 1899-12-30）
        // 注意：序列号 1 需要 +2 天才能得到 1900-01-01（因为 1899-12-30 + 1天 = 1899-12-31）
        // 所以公式是：1899-12-30 + (dateValue + 1) 天
        const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
        const date = new Date(excelEpoch.getTime() + (dateValue + 1) * 86400000);
        
        // Excel 错误地认为 1900 是闰年，所以对于序列号 >= 61 的日期，需要减 1 天
        // 但序列号 1-60 不受影响（因为 1900-02-29 是序列号 60）
        // 序列号 61 开始需要减 1 天
        if (dateValue >= 61) {
            date.setDate(date.getDate() - 1);
        }
        
        // 验证日期是否合理
        if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
            return date;
        }
    }
    
    return null;
}

/**
 * 解析字符串日期为 Date 对象
 * @param {string} dateStr - 日期字符串
 * @returns {Date|null} 解析后的日期对象，失败返回 null
 */
function parseStringDate(dateStr) {
    if (typeof dateStr !== 'string') {
        return null;
    }
    
    const trimmed = dateStr.trim();
    if (!trimmed) {
        return null;
    }
    
    // 格式1: YYYY/MM/DD 或 YYYY-MM-DD 或 MM/DD/YYYY 或 DD/MM/YYYY
    if (trimmed.includes('/') || trimmed.includes('-')) {
        const separator = trimmed.includes('/') ? '/' : '-';
        const parts = trimmed.split(separator);
        if (parts.length === 3) {
            // 尝试 YYYY/MM/DD 格式
            let year = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1;
            let day = parseInt(parts[2], 10);
            
            // 如果第一部分是 4 位数，认为是 YYYY 格式
            if (parts[0].length === 4 && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
                if (year >= 1900 && year <= 2100 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
                    return new Date(year, month, day);
                }
            }
            // 如果第三部分是 4 位数，可能是 MM/DD/YYYY 或 DD/MM/YYYY
            else if (parts[2].length === 4) {
                const year4 = parseInt(parts[2], 10);
                const month4 = parseInt(parts[0], 10) - 1;
                const day4 = parseInt(parts[1], 10);
                if (!isNaN(year4) && !isNaN(month4) && !isNaN(day4)) {
                    if (year4 >= 1900 && year4 <= 2100 && month4 >= 0 && month4 < 12 && day4 >= 1 && day4 <= 31) {
                        return new Date(year4, month4, day4);
                    }
                }
            }
            // 尝试 DD/MM/YYYY 格式（如果第二部分可能是月份）
            else if (parts[1].length <= 2) {
                const day2 = parseInt(parts[0], 10);
                const month2 = parseInt(parts[1], 10) - 1;
                const year2 = parseInt(parts[2], 10);
                if (!isNaN(year2) && !isNaN(month2) && !isNaN(day2)) {
                    // 如果年份是 2 位数，转换为 4 位数
                    const fullYear = year2 < 100 ? (year2 < 50 ? 2000 + year2 : 1900 + year2) : year2;
                    if (fullYear >= 1900 && fullYear <= 2100 && month2 >= 0 && month2 < 12 && day2 >= 1 && day2 <= 31) {
                        return new Date(fullYear, month2, day2);
                    }
                }
            }
        }
    }
    // 格式2: Excel 序列号字符串（可能是小数）
    else if (/^\d+\.?\d*$/.test(trimmed)) {
        const excelDate = parseFloat(trimmed);
        return parseExcelDateSerial(excelDate);
    }
    // 格式3: 尝试使用 Date 构造函数直接解析
    else {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
            return parsed;
        }
    }
    
    return null;
}

/**
 * 统一解析日期值（支持多种格式）
 * @param {*} dateValue - 日期值（可能是 Date 对象、数字、字符串等）
 * @returns {Date|null} 解析后的日期对象，失败返回 null
 */
function parseDateValue(dateValue) {
    if (dateValue === null || dateValue === undefined || dateValue === '') {
        return null;
    }
    
    // 如果已经是 Date 对象
    if (dateValue instanceof Date) {
        // 检查日期是否有效
        if (isNaN(dateValue.getTime())) {
            return null;
        }
        return new Date(dateValue);
    }
    
    // 如果是数字（Excel 日期序列号）
    if (typeof dateValue === 'number') {
        return parseExcelDateSerial(dateValue);
    }
    
    // 如果是字符串
    if (typeof dateValue === 'string') {
        return parseStringDate(dateValue);
    }
    
    return null;
}

/**
 * 格式化日期为 YYYY/MM/DD 格式
 * @param {Date|string|number} dateValue - 日期值
 * @returns {string} 格式化后的日期字符串，失败返回原值或 '未知'
 */
function formatDateToYYYYMMDD(dateValue) {
    const date = parseDateValue(dateValue);
    if (!date || isNaN(date.getTime())) {
        return typeof dateValue === 'string' ? dateValue : '未知';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * 格式化 Date 对象为 YYYY/MM/DD 格式（简化版，直接接受 Date 对象）
 * @param {Date} date - Date 对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
}

/**
 * 解析日期字符串为 Date 对象（YYYY/MM/DD 格式）
 * @param {string} dateStr - 日期字符串（格式：YYYY/MM/DD 或 YYYY-MM-DD）
 * @returns {Date|null} 解析后的日期对象，失败返回 null
 */
function parseDateStr(dateStr) {
    if (typeof dateStr !== 'string') {
        return null;
    }
    const parts = dateStr.replace(/-/g, '/').split('/');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day);
        }
    }
    return new Date(dateStr);
}

/**
 * 格式化船期日期用于tooltip显示（带容错处理）
 * 支持多种日期格式：Date对象、Excel序列号、字符串等
 * @param {*} dateValue - 日期值（可能是Date对象、数字、字符串等）
 * @returns {string} 格式化后的日期字符串（YYYY/MM/DD），失败返回 '—'
 */
function formatShipDateForTooltip(dateValue) {
    // 空值检查
    if (dateValue === null || dateValue === undefined || dateValue === '') {
        return '—';
    }
    
    // 如果是Date对象，直接格式化
    if (dateValue instanceof Date) {
        if (!isNaN(dateValue.getTime())) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
        return '—';
    }
    
    // 如果是数字（Excel序列号），优先使用 parseExcelDateSerial
    if (typeof dateValue === 'number' && isFinite(dateValue)) {
        // 优先使用 parseExcelDateSerial（支持Excel日期序列号）
        if (typeof parseExcelDateSerial === 'function') {
            const date = parseExcelDateSerial(dateValue);
            if (date && !isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}/${month}/${day}`;
            }
        }
        // 如果 parseExcelDateSerial 不可用，使用标准转换公式（Excel日期从1900-01-01开始）
        // Excel序列号转换：序列号1 = 1900-01-01，基准是1899-12-30
        const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
        const date = new Date(excelEpoch.getTime() + (dateValue + 1) * 86400000);
        // Excel错误地认为1900是闰年，序列号>=61需要减1天
        if (dateValue >= 61) {
            date.setDate(date.getDate() - 1);
        }
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
        return '—';
    }
    
    // 如果是字符串，使用 parseDateValue 解析
    if (typeof dateValue === 'string') {
        if (typeof parseDateValue === 'function') {
            const date = parseDateValue(dateValue);
            if (date && !isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}/${month}/${day}`;
            }
        }
        // 如果字符串是数字格式，尝试转换为数字再解析
        const numValue = parseFloat(dateValue);
        if (!isNaN(numValue) && isFinite(numValue)) {
            return formatShipDateForTooltip(numValue); // 递归调用处理数字
        }
    }
    
    // 最后降级：转换为字符串
    const str = String(dateValue);
    return str && str.trim() ? str : '—';
}

/**
 * 格式化日期为键值字符串（用于去重、分组等）
 * 支持多种日期格式：Date对象、字符串、数字等
 * @param {Date|string|number} date - 日期值
 * @param {string} format - 格式类型：'YYYYMMDD'（默认，无分隔符）或 'YYYY-MM-DD'（带分隔符）
 * @returns {string} 格式化后的日期字符串，失败返回空字符串
 */
function formatDateKey(date, format = 'YYYYMMDD') {
    if (!date) return '';
    try {
        let d;
        if (date instanceof Date) {
            d = date;
        } else if (typeof date === 'number' && isFinite(date)) {
            // 如果是数字，尝试解析为Excel日期序列号
            if (typeof parseExcelDateSerial === 'function') {
                d = parseExcelDateSerial(date);
            } else {
                d = new Date(date);
            }
        } else if (typeof date === 'string') {
            // 如果是字符串，尝试解析
            if (typeof parseDateValue === 'function') {
                d = parseDateValue(date);
            } else {
                d = new Date(date);
            }
        } else {
            d = new Date(date);
        }
        
        if (!d || isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        } else {
            // 默认格式：YYYYMMDD（无分隔符，用于键值）
            return `${year}${month}${day}`;
        }
    } catch (e) {
        return '';
    }
}

// 导出函数到全局
if (typeof window !== 'undefined') {
    window.parseDateValue = window.parseDateValue || parseDateValue;
    window.formatDateToYYYYMMDD = window.formatDateToYYYYMMDD || formatDateToYYYYMMDD;
    window.formatDate = window.formatDate || formatDate;
    window.parseDateStr = window.parseDateStr || parseDateStr;
    window.formatShipDateForTooltip = window.formatShipDateForTooltip || formatShipDateForTooltip;
    window.parseExcelDateSerial = window.parseExcelDateSerial || parseExcelDateSerial;
    window.formatDateKey = window.formatDateKey || formatDateKey;
}

