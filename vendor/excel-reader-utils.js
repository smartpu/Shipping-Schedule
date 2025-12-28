/**
 * Excel 文件读取公共工具
 * 统一处理 Excel 文件读取、工作表查找、数据解析等逻辑
 */

(function() {
    'use strict';

    /**
     * 查找工作表（支持关键词匹配和索引回退）
     * @param {Array<string>} sheetNames - 所有工作表名称数组
     * @param {string|Array<string>} keywords - 关键词或关键词数组
     * @param {number|null} fallbackIndex - 备用索引（如果找不到匹配的工作表）
     * @returns {string|null} 工作表名称，未找到返回 null
     */
    function findSheetByName(sheetNames, keywords, fallbackIndex = null) {
        if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
            return null;
        }

        const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
        const lowerKeywords = keywordArray.map(k => k.toLowerCase());

        // 优先精确匹配
        for (const sheetName of sheetNames) {
            const lowerName = sheetName.toLowerCase();
            if (lowerKeywords.some(k => lowerName === k)) {
                return sheetName;
            }
        }

        // 其次部分匹配
        for (const sheetName of sheetNames) {
            const lowerName = sheetName.toLowerCase();
            if (lowerKeywords.some(k => lowerName.includes(k))) {
                return sheetName;
            }
        }

        // 最后使用备用索引
        if (typeof fallbackIndex === 'number' && fallbackIndex >= 0 && fallbackIndex < sheetNames.length) {
            return sheetNames[fallbackIndex];
        }

        return null;
    }

    /**
     * 读取 Excel 文件（统一接口）
     * @param {File|ArrayBuffer} fileOrBuffer - 文件对象或 ArrayBuffer
     * @param {Object} options - 读取选项
     * @param {boolean} options.cellDates - 是否自动转换日期（默认 false，避免栈溢出）
     * @param {boolean} options.cellNF - 是否保留数字格式（默认 false）
     * @param {boolean} options.raw - 是否返回原始值（默认 true）
     * @param {string|null} options.sheetName - 指定工作表名称（可选）
     * @param {string|Array<string>} options.sheetKeywords - 工作表关键词（可选）
     * @param {number|null} options.sheetIndex - 工作表索引（可选）
     * @returns {Promise<Object>} { workbook, sheetName, jsonData }
     */
    async function readExcelFile(fileOrBuffer, options = {}) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX 库未加载，请刷新页面重试');
        }

        const {
            cellDates = false,
            cellNF = false,
            raw = true,
            sheetName: specifiedSheetName = null,
            sheetKeywords = null,
            sheetIndex = null
        } = options;

        // 转换为 ArrayBuffer
        let arrayBuffer;
        if (fileOrBuffer instanceof File) {
            arrayBuffer = await fileOrBuffer.arrayBuffer();
        } else if (fileOrBuffer instanceof ArrayBuffer) {
            arrayBuffer = fileOrBuffer;
        } else {
            throw new Error('无效的文件类型，需要 File 或 ArrayBuffer');
        }

        // 读取工作簿
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: cellDates,
            cellNF: cellNF,
            cellText: false,
            dateNF: 'yyyy-mm-dd'
        });

        // 查找工作表
        let targetSheetName = specifiedSheetName;
        if (!targetSheetName && sheetKeywords) {
            targetSheetName = findSheetByName(workbook.SheetNames, sheetKeywords, sheetIndex);
        } else if (!targetSheetName && typeof sheetIndex === 'number') {
            targetSheetName = workbook.SheetNames[sheetIndex] || null;
        } else if (!targetSheetName) {
            targetSheetName = workbook.SheetNames[0] || null;
        }

        if (!targetSheetName) {
            throw new Error('未找到有效的工作表');
        }

        const worksheet = workbook.Sheets[targetSheetName];
        if (!worksheet) {
            throw new Error(`工作表 "${targetSheetName}" 不存在`);
        }

        // 转换为 JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: raw,
            defval: null
        });

        return {
            workbook,
            sheetName: targetSheetName,
            jsonData
        };
    }

    /**
     * 查找列（支持关键词匹配和索引回退）
     * @param {Object} firstRow - 第一行数据对象
     * @param {string|Array<string>} keywords - 关键词或关键词数组
     * @param {number|null} fallbackIndex - 备用索引
     * @returns {string|null} 列键名，未找到返回 null
     */
    function findColumn(firstRow, keywords, fallbackIndex = null) {
        if (!firstRow || typeof firstRow !== 'object') {
            return null;
        }

        const columnKeys = Object.keys(firstRow);
        const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
        const lowerKeywords = keywordArray.map(k => k.toLowerCase());

        // 优先精确匹配
        for (const key of columnKeys) {
            const lowerKey = String(key).toLowerCase();
            if (lowerKeywords.some(k => lowerKey === k)) {
                return key;
            }
        }

        // 其次部分匹配
        for (const key of columnKeys) {
            const lowerKey = String(key).toLowerCase();
            if (lowerKeywords.some(k => lowerKey.includes(k))) {
                return key;
            }
        }

        // 最后使用备用索引
        if (typeof fallbackIndex === 'number' && fallbackIndex >= 0 && fallbackIndex < columnKeys.length) {
            return columnKeys[fallbackIndex];
        }

        return null;
    }

    /**
     * 解析 week 工作表
     * @param {Object} workbook - XLSX 工作簿对象
     * @param {Object} options - 解析选项
     * @param {number} options.weekTextColumn - 周别文本列索引（默认 3）
     * @param {number} options.dateRangeColumn - 日期范围列索引（默认 0）
     * @returns {Object} weekDefinitionMap 或空对象
     */
    function parseWeekSheet(workbook, options = {}) {
        if (!workbook || !workbook.SheetNames) {
            return {};
        }

        const { weekTextColumn = 3, dateRangeColumn = 0 } = options;

        const weekSheetName = workbook.SheetNames.find(name =>
            name.toLowerCase() === 'week' || name.toLowerCase().includes('week')
        );

        if (!weekSheetName) {
            return {};
        }

        const weekWorksheet = workbook.Sheets[weekSheetName];
        if (!weekWorksheet) {
            return {};
        }

        const weekData = XLSX.utils.sheet_to_json(weekWorksheet, {
            header: 1,
            defval: null,
            raw: true
        });

        if (typeof window.parseWeekDefinitions === 'function') {
            return window.parseWeekDefinitions(weekData, {
                weekTextColumn: weekTextColumn,
                dateRangeColumn: dateRangeColumn
            });
        }

        return {};
    }

    /**
     * 读取 Excel 文件并解析 week 工作表（用于 001-04 和 365-04）
     * @param {File} file - 文件对象
     * @param {Object} options - 选项
     * @param {Object} options.weekConfig - week 工作表配置
     * @param {number} options.weekConfig.weekTextColumn - 周别文本列索引
     * @param {number} options.weekConfig.dateRangeColumn - 日期范围列索引
     * @param {Function} options.onWeekParsed - week 解析完成后的回调函数，接收 weekDefinitionMap
     * @returns {Promise<Array>} JSON 数据数组
     */
    async function readExcelFileWithWeek(file, options = {}) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX 库未加载，请刷新页面重试');
        }

        const { weekConfig = {}, onWeekParsed = null } = options;
        const { weekTextColumn = 3, dateRangeColumn = 0 } = weekConfig;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellNF: false });
                    
                    // 解析 week 工作表
                    const weekDefinitionMap = parseWeekSheet(workbook, {
                        weekTextColumn: weekTextColumn,
                        dateRangeColumn: dateRangeColumn
                    });
                    
                    // 如果提供了回调，调用它
                    if (onWeekParsed && typeof onWeekParsed === 'function') {
                        onWeekParsed(weekDefinitionMap);
                    }
                    
                    // 查找 schedule 工作表
                    const sheetName = workbook.SheetNames.find(name => 
                        name.toLowerCase().includes('schedule')
                    ) || workbook.SheetNames[0];
                    
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        raw: true, 
                        defval: null
                    });
                    
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.findSheetByName = window.findSheetByName || findSheetByName;
        window.readExcelFile = window.readExcelFile || readExcelFile;
        window.findColumn = window.findColumn || findColumn;
        window.parseWeekSheet = window.parseWeekSheet || parseWeekSheet;
        window.readExcelFileWithWeek = window.readExcelFileWithWeek || readExcelFileWithWeek;
    }
})();

