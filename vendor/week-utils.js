/**
 * 周数工具函数库
 * 标准实现：经过多次调试验证的周数计算逻辑
 * 所有工具应使用此标准实现，确保周数计算的一致性
 */

/**
 * 解析周别文本为周别代码（YYYYWW格式）
 * 支持格式：
 * - YYYYWW（如 202552）
 * - YYYY/WW 或 YYYY-WW（如 2025/52 或 2025-52）
 * - YYYY年第WW周（如 2025年第52周）
 * 
 * @param {string|number} weekText - 周别文本
 * @returns {string|null} - 周别代码（YYYYWW格式），失败返回 null
 */
function parseWeekText(weekText) {
    if (!weekText) return null;
    const text = String(weekText).trim();
    
    // 匹配 YYYYWW 格式（如 202547）
    const match1 = text.match(/^(\d{4})(\d{2})$/);
    if (match1) {
        return match1[0];
    }
    
    // 匹配 YYYY/WW 或 YYYY-WW 格式（如 2025/47 或 2025-47）
    const match2 = text.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (match2) {
        const year = match2[1];
        const week = String(match2[2]).padStart(2, '0');
        return `${year}${week}`;
    }
    
    // 匹配 "YYYY年第WW周" 格式（如 2025年第47周）
    const match3 = text.match(/(\d{4})年第(\d{1,2})周/);
    if (match3) {
        const year = match3[1];
        const week = String(match3[2]).padStart(2, '0');
        return `${year}${week}`;
    }
    
    return null;
}

/**
 * 获取ISO周数（周从周一开始）
 * @param {Date} date - 日期对象
 * @returns {number} - ISO周数（1-53）
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 获取周数（ISO标准，但周从周日开始）
 * 标准实现：第1周是包含1月4日的周，周从周日开始到周六结束
 * 与 calculateWeekDateRange 函数保持一致
 * 
 * @param {Date} date - 日期对象
 * @returns {number} - 周数（1-53）
 */
function getWeekNumber(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    
    // ISO周计算：第1周是包含1月4日的周
    // 1. 找到1月4日
    const jan4 = new Date(year, 0, 4);
    
    // 2. 找到1月4日所在的周的周日（周从周日开始）
    const jan4DayOfWeek = jan4.getDay(); // 0=周日，1=周一，...，6=周六
    const firstWeekSunday = new Date(jan4);
    firstWeekSunday.setDate(jan4.getDate() - jan4DayOfWeek);
    
    // 3. 找到给定日期所在的周的周日
    const dayOfWeek = d.getDay(); // 0=周日，1=周一，...，6=周六
    const dateSunday = new Date(d);
    dateSunday.setDate(d.getDate() - dayOfWeek);
    
    // 4. 计算周数 = (dateSunday - firstWeekSunday) / 7 + 1
    const diffTime = dateSunday - firstWeekSunday;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let weekNo = Math.floor(diffDays / 7) + 1;
    
    // 5. 处理跨年情况
    if (weekNo < 1) {
        // 如果周数小于1，说明是上一年的最后几周
        // 计算上一年的周数
        const prevYear = year - 1;
        const prevJan4 = new Date(prevYear, 0, 4);
        const prevJan4DayOfWeek = prevJan4.getDay();
        const prevFirstWeekSunday = new Date(prevJan4);
        prevFirstWeekSunday.setDate(prevJan4.getDate() - prevJan4DayOfWeek);
        
        // 计算上一年的最后一周（12月31日所在周）
        const prevDec31 = new Date(prevYear, 11, 31);
        const prevDec31DayOfWeek = prevDec31.getDay();
        const prevDec31Sunday = new Date(prevDec31);
        prevDec31Sunday.setDate(prevDec31.getDate() - prevDec31DayOfWeek);
        
        const prevDiffTime = prevDec31Sunday - prevFirstWeekSunday;
        const prevDiffDays = Math.floor(prevDiffTime / (1000 * 60 * 60 * 24));
        const prevLastWeek = Math.floor(prevDiffDays / 7) + 1;
        
        // 如果上一年的最后一周包含当前日期，返回上一年的周数
        if (dateSunday >= prevFirstWeekSunday && dateSunday <= prevDec31Sunday) {
            const prevDiffTime2 = dateSunday - prevFirstWeekSunday;
            const prevDiffDays2 = Math.floor(prevDiffTime2 / (1000 * 60 * 60 * 24));
            weekNo = Math.floor(prevDiffDays2 / 7) + 1;
            return weekNo;
        }
        
        // 否则返回上一年的最后一周
        return prevLastWeek;
    }
    
    // 6. 如果周数超过52/53，检查是否属于下一年的第一周
    if (weekNo > 53) {
        // 检查下一年的第1周是否已经开始
        const nextYear = year + 1;
        const nextJan4 = new Date(nextYear, 0, 4);
        const nextJan4DayOfWeek = nextJan4.getDay();
        const nextFirstWeekSunday = new Date(nextJan4);
        nextFirstWeekSunday.setDate(nextJan4.getDate() - nextJan4DayOfWeek);
        
        // 如果当前日期在下一年的第1周范围内，返回1
        if (dateSunday >= nextFirstWeekSunday) {
            return 1;
        }
        
        // 否则返回当前年的最后一周（通常是52或53）
        return 52; // 或53，取决于年份
    }
    
    return weekNo;
}

/**
 * 获取当前周别代码（YYYYWW格式）
 * @returns {string} - 当前周别代码（如 "202552"）
 */
function getCurrentWeekCode() {
    const now = new Date();
    const year = now.getFullYear();
    const week = getISOWeek(now);
    return `${year}${String(week).padStart(2, '0')}`;
}

/**
 * 根据周别代码计算该周的日期范围（周日到周六）
 * 标准实现：ISO周计算，第1周是包含1月4日的周，周从周日开始
 * 
 * @param {string} weekCode - 周别代码（YYYYWW格式，如 "202552"）
 * @returns {Object} - {sunday: "yyyy/m/d", saturday: "yyyy/m/d", range: "yyyy/m/d~yyyy/m/d"}
 */
function calculateWeekDateRange(weekCode) {
    if (!weekCode || weekCode.length !== 6) {
        return { sunday: '', saturday: '', range: '' };
    }
    
    const year = parseInt(weekCode.substring(0, 4), 10);
    const weekNo = parseInt(weekCode.substring(4), 10);
    
    // ISO周计算：第1周是包含1月4日的周
    // 1. 找到1月4日
    const jan4 = new Date(year, 0, 4);
    
    // 2. 找到1月4日所在的周的周日（周从周日开始）
    // jan4.getDay() 返回 0-6，0=周日，1=周一，...，6=周六
    const jan4DayOfWeek = jan4.getDay(); // 0=周日，1=周一，...，6=周六
    // 计算1月4日所在周的周日：往前推 jan4DayOfWeek 天
    const firstWeekSunday = new Date(jan4);
    firstWeekSunday.setDate(jan4.getDate() - jan4DayOfWeek);
    
    // 3. 计算第N周的周日 = 第1周周日 + (N-1) * 7天
    const targetWeekSunday = new Date(firstWeekSunday);
    targetWeekSunday.setDate(firstWeekSunday.getDate() + (weekNo - 1) * 7);
    
    // 4. 计算该周的周六（周日+6天）
    const targetWeekSaturday = new Date(targetWeekSunday);
    targetWeekSaturday.setDate(targetWeekSunday.getDate() + 6);
    
    // 5. 格式化为 yyyy/m/d（不补零）
    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return `${y}/${m}/${day}`;
    };
    
    const sundayStr = formatDate(targetWeekSunday);
    const saturdayStr = formatDate(targetWeekSaturday);
    
    return {
        sunday: sundayStr,
        saturday: saturdayStr,
        range: `${sundayStr}~${saturdayStr}`
    };
}

/**
 * 获取周别日期范围（别名函数，保持向后兼容）
 * @param {string} weekCode - 周别代码（YYYYWW格式）
 * @returns {Object} - {sunday, saturday, range}
 */
function getWeekDateRange(weekCode) {
    return calculateWeekDateRange(weekCode);
}

/**
 * 规范化日期字符串格式为 yyyy/m/d（去除补零）
 * @param {string} dateStr - 日期字符串（如 "2025/12/21" 或 "2025/12/07"）
 * @returns {string} - 规范化后的日期字符串（如 "2025/12/21" 或 "2025/12/7"）
 */
function normalizeDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    // 匹配 yyyy/mm/dd 或 yyyy/m/d 格式
    const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (match) {
        const year = match[1];
        const month = parseInt(match[2], 10); // 去除前导零
        const day = parseInt(match[3], 10); // 去除前导零
        return `${year}/${month}/${day}`;
    }
    return dateStr;
}

/**
 * 解析Excel日期序列号为日期字符串（yyyy/m/d格式）
 * @param {number} serialNumber - Excel日期序列号
 * @returns {string|null} - 日期字符串（yyyy/m/d格式），失败返回 null
 */
function convertExcelDateToDateString(serialNumber) {
    if (typeof serialNumber !== 'number' || !isFinite(serialNumber)) {
        return null;
    }
    
    let parseDateFunc = null;
    if (typeof parseExcelDateSerial === 'function') {
        parseDateFunc = parseExcelDateSerial;
    } else if (typeof window !== 'undefined' && typeof window.parseExcelDateSerial === 'function') {
        parseDateFunc = window.parseExcelDateSerial;
    }
    
    if (parseDateFunc) {
        const date = parseDateFunc(serialNumber);
        if (date && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}/${month}/${day}`;
        }
    }
    
    // 降级方案：手动计算Excel日期序列号
    if (serialNumber > 0 && serialNumber < 80000) {
        const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
        const date = new Date(excelEpoch.getTime() + (serialNumber + 1) * 86400000);
        if (serialNumber >= 61) {
            date.setDate(date.getDate() - 1);
        }
        
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}/${month}/${day}`;
        }
    }
    
    return null;
}

/**
 * 解析日期范围字符串
 * 支持格式：
 * - YYYY/MM/DD~YYYY/MM/DD
 * - YYYY-MM-DD~YYYY-MM-DD
 * - MM/DD/YY~MM/DD/YY
 * - 单个日期 YYYY/MM/DD 或 MM/DD/YY
 * 
 * @param {string} dateRangeText - 日期范围字符串
 * @returns {Object|null} - {startDate: "yyyy/m/d", endDate: "yyyy/m/d"}，失败返回 null
 */
function parseDateRangeString(dateRangeText) {
    if (!dateRangeText || typeof dateRangeText !== 'string') {
        return null;
    }
    
    const text = dateRangeText.trim();
    const dateRangePatterns = [
        // 标准格式：YYYY/MM/DD~YYYY/MM/DD
        /(\d{4}\/\d{1,2}\/\d{1,2})\s*[-~至]{1,2}\s*(\d{4}\/\d{1,2}\/\d{1,2})/,
        // 横线格式：YYYY-MM-DD~YYYY-MM-DD
        /(\d{4}-\d{1,2}-\d{1,2})\s*[-~至]{1,2}\s*(\d{4}-\d{1,2}-\d{1,2})/,
        // MM/DD/YY~MM/DD/YY格式（需要转换为YYYY/MM/DD）
        /(\d{1,2}\/\d{1,2}\/\d{2})\s*[-~至]{1,2}\s*(\d{1,2}\/\d{1,2}\/\d{2})/,
        // 单个日期：YYYY/MM/DD
        /^(\d{4}\/\d{1,2}\/\d{1,2})$/,
        // 单个日期：MM/DD/YY
        /^(\d{1,2}\/\d{1,2}\/\d{2})$/
    ];
    
    for (const pattern of dateRangePatterns) {
        const match = text.match(pattern);
        if (match) {
            if (match.length === 3) {
                // 日期范围格式
                let startDateStr = match[1];
                let endDateStr = match[2];
                
                // 如果是MM/DD/YY格式，需要转换为YYYY/MM/DD
                if (startDateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                    const startParts = startDateStr.split('/');
                    const endParts = endDateStr.split('/');
                    
                    if (startParts.length === 3 && endParts.length === 3) {
                        const startYY = parseInt(startParts[2], 10);
                        const endYY = parseInt(endParts[2], 10);
                        const startYear = startYY < 50 ? 2000 + startYY : 1900 + startYY;
                        const endYear = endYY < 50 ? 2000 + endYY : 1900 + endYY;
                        
                        startDateStr = `${startYear}/${parseInt(startParts[0], 10)}/${parseInt(startParts[1], 10)}`;
                        endDateStr = `${endYear}/${parseInt(endParts[0], 10)}/${parseInt(endParts[1], 10)}`;
                    }
                } else {
                    // 规范化已有的日期字符串格式（去除补零）
                    startDateStr = normalizeDateString(startDateStr);
                    endDateStr = normalizeDateString(endDateStr);
                }
                
                return { startDate: startDateStr, endDate: endDateStr };
            } else if (match.length === 2) {
                // 单个日期格式
                const dateStr = match[1];
                let date = null;
                
                if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
                    const parts = dateStr.split('/');
                    date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                    const parts = dateStr.split('/');
                    const yy = parseInt(parts[2], 10);
                    const year = yy < 50 ? 2000 + yy : 1900 + yy;
                    date = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
                }
                
                if (date && !isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    const dateStr = `${year}/${month}/${day}`;
                    return { startDate: dateStr, endDate: null }; // 单个日期，endDate为null表示需要计算
                }
            }
        }
    }
    
    return null;
}

// 导出到全局（如果不在模块环境中）
// 注意：只在函数未定义时才导出，避免覆盖已有实现
if (typeof window !== 'undefined') {
    if (!window.parseWeekText) window.parseWeekText = parseWeekText;
    if (!window.getISOWeek) window.getISOWeek = getISOWeek;
    if (!window.getWeekNumber) window.getWeekNumber = getWeekNumber; // 新增：统一周数计算函数
    if (!window.getCurrentWeekCode) window.getCurrentWeekCode = getCurrentWeekCode;
    if (!window.calculateWeekDateRange) window.calculateWeekDateRange = calculateWeekDateRange;
    if (!window.getWeekDateRange) window.getWeekDateRange = getWeekDateRange;
    if (!window.normalizeDateString) window.normalizeDateString = normalizeDateString;
    if (!window.convertExcelDateToDateString) window.convertExcelDateToDateString = convertExcelDateToDateString;
    if (!window.parseDateRangeString) window.parseDateRangeString = parseDateRangeString;
}

