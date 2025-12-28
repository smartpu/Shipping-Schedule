/**
 * 周别定义解析器
 * 从Excel week工作表解析周别定义
 * 依赖：week-utils.js, date-utils.js
 */

/**
 * 解析Excel日期序列号为周别日期范围
 * @param {number} serialNumber - Excel日期序列号
 * @param {string} weekCode - 周别代码（YYYYWW格式）
 * @returns {Object|null} - {startDate: "yyyy/m/d", endDate: "yyyy/m/d"}，失败返回 null
 */
function parseExcelDateSerialToWeekRange(serialNumber, weekCode) {
    // 使用全局函数（从week-utils.js）
    const convertFunc = (typeof window !== 'undefined' && window.convertExcelDateToDateString) 
        ? window.convertExcelDateToDateString 
        : convertExcelDateToDateString;
    const dateStr = convertFunc(serialNumber);
    if (!dateStr) {
        return null;
    }
    
    // 根据周别代码计算该周的日期范围
    const calculateFunc = (typeof window !== 'undefined' && window.calculateWeekDateRange)
        ? window.calculateWeekDateRange
        : calculateWeekDateRange;
    const weekRange = calculateFunc(weekCode);
    if (weekRange.sunday && weekRange.saturday) {
        return {
            startDate: weekRange.sunday,
            endDate: weekRange.saturday
        };
    }
    
    // 如果计算失败，使用A列的日期作为开始，+6天作为结束
    const parseDateFunc = (typeof window !== 'undefined' && window.parseExcelDateSerial)
        ? window.parseExcelDateSerial
        : (typeof parseExcelDateSerial === 'function' ? parseExcelDateSerial : null);
    if (!parseDateFunc) {
        return null;
    }
    const date = parseDateFunc(serialNumber);
    if (date && !isNaN(date.getTime())) {
        const endDate = new Date(date);
        endDate.setDate(date.getDate() + 6);
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;
        const endDay = endDate.getDate();
        return {
            startDate: dateStr,
            endDate: `${endYear}/${endMonth}/${endDay}`
        };
    }
    
    return null;
}

/**
 * 解析日期范围字符串为周别日期范围
 * @param {string} dateRangeText - 日期范围字符串
 * @param {string} weekCode - 周别代码（YYYYWW格式）
 * @returns {Object|null} - {startDate: "yyyy/m/d", endDate: "yyyy/m/d"}，失败返回 null
 */
function parseDateRangeTextToWeekRange(dateRangeText, weekCode) {
    // 使用全局函数（从week-utils.js）
    const parseFunc = (typeof window !== 'undefined' && window.parseDateRangeString)
        ? window.parseDateRangeString
        : parseDateRangeString;
    const normalizeFunc = (typeof window !== 'undefined' && window.normalizeDateString)
        ? window.normalizeDateString
        : normalizeDateString;
    const calculateFunc = (typeof window !== 'undefined' && window.calculateWeekDateRange)
        ? window.calculateWeekDateRange
        : calculateWeekDateRange;
    
    const parsed = parseFunc(dateRangeText);
    if (!parsed) {
        return null;
    }
    
    // 如果是日期范围
    if (parsed.startDate && parsed.endDate) {
        return {
            startDate: normalizeFunc(parsed.startDate),
            endDate: normalizeFunc(parsed.endDate)
        };
    }
    
    // 如果是单个日期，根据周别代码计算周范围
    if (parsed.startDate && !parsed.endDate) {
        const weekRange = calculateFunc(weekCode);
        if (weekRange.sunday && weekRange.saturday) {
            return {
                startDate: weekRange.sunday,
                endDate: weekRange.saturday
            };
        }
    }
    
    return null;
}

/**
 * 解析周别定义（从 Excel week 工作表）
 * 严格按照D列（周别）和A列（日期范围）
 * 
 * @param {Array} weekData - week 工作表数据（二维数组，header: 1格式）
 * @param {Object} config - 配置对象 {weekTextColumn: 3, dateRangeColumn: 0}
 * @param {Function} logFunc - 日志函数（可选）
 * @returns {Object} - 周别定义映射表 {weekCode: {weekCode, weekText, sunday, saturday, range}}
 */
function parseWeekDefinitions(weekData, config = {}, logFunc = null) {
    const definitions = {};
    
    // 默认配置
    const D_COLUMN_INDEX = config.weekTextColumn !== undefined ? config.weekTextColumn : 3;
    const A_COLUMN_INDEX = config.dateRangeColumn !== undefined ? config.dateRangeColumn : 0;
    
    const log = logFunc || (() => {});
    const warn = logFunc || (() => {});
    const error = logFunc || (() => {});
    
    if (!Array.isArray(weekData) || weekData.length === 0) {
        error('week工作表数据为空');
        return definitions;
    }
    
    log(`使用列索引: D列=${D_COLUMN_INDEX}, A列=${A_COLUMN_INDEX}`);
    
    // 从第2行开始（跳过表头）
    for (let i = 1; i < weekData.length; i++) {
        const row = weekData[i];
        if (!row || !Array.isArray(row)) continue;
        
        // 读取D列：周别文本
        const weekText = row[D_COLUMN_INDEX] ? String(row[D_COLUMN_INDEX]).trim() : '';
        if (!weekText) continue;
        
        // 解析周别文本为YYYYWW格式（使用全局函数）
        const parseFunc = (typeof window !== 'undefined' && window.parseWeekText)
            ? window.parseWeekText
            : parseWeekText;
        const weekCode = parseFunc(weekText);
        if (!weekCode) {
            warn(`无法解析周别文本: "${weekText}"`);
            continue;
        }
        
        // 读取A列：日期范围
        const aColumnValue = row[A_COLUMN_INDEX];
        
        if (aColumnValue === null || aColumnValue === undefined || aColumnValue === '') {
            warn(`周别 ${weekCode} A列为空`);
            continue;
        }
        
        log(`周别 ${weekCode} (${weekText}) - A列原始值类型: ${typeof aColumnValue}, 值:`, aColumnValue);
        
        let startDateStr = '';
        let endDateStr = '';
        
        // 处理A列的值
        if (typeof aColumnValue === 'number') {
            // Excel日期序列号
            log(`周别 ${weekCode} A列是数字（Excel日期序列号）: ${aColumnValue}`);
            const range = parseExcelDateSerialToWeekRange(aColumnValue, weekCode);
            if (range) {
                startDateStr = range.startDate;
                endDateStr = range.endDate;
                log(`周别 ${weekCode} Excel日期序列号 ${aColumnValue} 转换为日期范围: "${startDateStr}~${endDateStr}"`);
            } else {
                warn(`周别 ${weekCode} 无法解析Excel日期序列号: ${aColumnValue}`);
                continue;
            }
        } else {
            // 日期范围字符串
            const aColumnText = String(aColumnValue).trim();
            log(`周别 ${weekCode} A列字符串内容: "${aColumnText}"`);
            
            const range = parseDateRangeTextToWeekRange(aColumnText, weekCode);
            if (range) {
                startDateStr = range.startDate;
                endDateStr = range.endDate;
                log(`周别 ${weekCode} 解析日期范围: "${startDateStr}~${endDateStr}"`);
            } else {
                warn(`周别 ${weekCode} A列日期范围格式无法识别: "${aColumnText}"`);
                continue;
            }
        }
        
        // 确保日期格式统一为 yyyy/m/d（不补零）
        const normalizeFunc = (typeof window !== 'undefined' && window.normalizeDateString)
            ? window.normalizeDateString
            : normalizeDateString;
        startDateStr = normalizeFunc(startDateStr);
        endDateStr = normalizeFunc(endDateStr);
        
        // 构建日期范围字符串
        const dateRange = `${startDateStr}~${endDateStr}`;
        
        // 保存到定义映射表
        definitions[weekCode] = {
            weekCode: weekCode,
            weekText: weekText,
            sunday: startDateStr,
            saturday: endDateStr,
            range: dateRange
        };
        
        log(`解析周别: ${weekCode} (${weekText}) -> ${dateRange}`);
    }
    
    const allWeekCodes = Object.keys(definitions).sort();
    log(`共解析 ${allWeekCodes.length} 个周别定义: ${allWeekCodes.join(', ')}`);
    
    return definitions;
}

/**
 * 计算周别日期范围（从实际数据中提取）
 * @param {Array} data - 数据行数组
 * @param {string} weekCol - 周别列键名
 * @param {string} shipDateCol - 开船日期列键名
 * @param {string[]} weekCodes - 周别代码数组
 * @returns {Object} - 周别日期范围映射表
 */
function calculateWeekDateRanges(data, weekCol, shipDateCol, weekCodes) {
    const ranges = {};
    
    // 使用全局函数（从week-utils.js）
    const parseFunc = (typeof window !== 'undefined' && window.parseWeekText)
        ? window.parseWeekText
        : parseWeekText;
    
    data.forEach(row => {
        const weekText = String(row[weekCol] ?? '').trim();
        const weekCode = parseFunc(weekText);
        if (!weekCode || !weekCodes.includes(weekCode)) return;
        
        let shipDate = row[shipDateCol];
        if (shipDate === null || shipDate === undefined) return;
        
        let dateObj = null;
        if (shipDate instanceof Date) {
            dateObj = shipDate;
        } else if (typeof shipDate === 'number') {
            dateObj = new Date((shipDate - 25569) * 86400 * 1000);
        } else if (typeof shipDate === 'string' && shipDate.trim()) {
            dateObj = new Date(shipDate);
        }
        
        if (dateObj && !isNaN(dateObj.getTime())) {
            if (!ranges[weekCode]) {
                ranges[weekCode] = { minDate: dateObj, maxDate: dateObj };
            } else {
                if (dateObj < ranges[weekCode].minDate) {
                    ranges[weekCode].minDate = dateObj;
                }
                if (dateObj > ranges[weekCode].maxDate) {
                    ranges[weekCode].maxDate = dateObj;
                }
            }
        }
    });
    
    return ranges;
}

// 导出到全局（只在函数未定义时才导出，避免覆盖）
if (typeof window !== 'undefined') {
    if (!window.parseWeekDefinitions) window.parseWeekDefinitions = parseWeekDefinitions;
    if (!window.calculateWeekDateRanges) window.calculateWeekDateRanges = calculateWeekDateRanges;
}

