/**
 * 统一错误处理模块
 * 用于所有工具页面，统一管理错误类型和错误消息
 * 
 * 使用方式：
 * 1. 在 HTML 中引入：<script src="vendor/error-handler.js"></script>
 * 2. 使用：showError(ErrorType.FILE_LOAD, 'XLSX_NOT_LOADED')
 * 3. 自定义错误消息：showError(ErrorType.FILE_LOAD, 'XLSX_NOT_LOADED', { message: '详细错误' })
 */

(function() {
    'use strict';

    /**
     * 错误类型枚举
     * @enum {string}
     */
    const ErrorType = {
        FILE_LOAD: 'FILE_LOAD',
        FILE_PARSE: 'FILE_PARSE',
        DATA_VALIDATION: 'DATA_VALIDATION',
        API_ERROR: 'API_ERROR',
        DOM_ERROR: 'DOM_ERROR',
        USER_ACTION: 'USER_ACTION',
        SYSTEM_ERROR: 'SYSTEM_ERROR'
    };

    /**
     * 统一的错误消息映射
     * 包含所有工具页面可能用到的错误消息
     * @type {Object<string, Object<string, string>>}
     */
    const ERROR_MESSAGES = {
        [ErrorType.FILE_LOAD]: {
            XLSX_NOT_LOADED: 'XLSX 库尚未加载完成，请稍候几秒后重试。\n\n如果问题持续，请检查网络连接或刷新页面。',
            PDF_LIBS_NOT_LOADED: 'PDF 导出功能所需的库尚未加载完成，请稍候几秒后重试。\n\n如果问题持续，请检查网络连接或刷新页面。',
            FILE_READ_FAILED: '读取文件失败：{message}',
            FILE_EMPTY: 'Excel 文件为空',
            NO_SHEETS: 'Excel文件中没有找到任何工作表'
        },
        [ErrorType.FILE_PARSE]: {
            PARSE_FAILED: '文件解析失败，请检查文件格式',
            MISSING_COLUMNS: '无法找到必要的列。请检查Excel文件格式。\n\n找到的列：{columns}',
            MISSING_REGION_PORT: '无法找到区域列或港口列。请检查Excel文件格式。\n\n找到的列：{columns}',
            NO_SCHEDULE_DATA: '当前时间范围内没有符合条件的船期数据'
        },
        [ErrorType.DATA_VALIDATION]: {
            DATA_EMPTY: '数据为空',
            NO_DATA: '没有可分析的数据',
            NO_ROUTE_DATA: '没有可分析的航线数据',
            NO_WEEK_DATA: '暂未找到可用于分析的周别',
            NO_ANALYSIS_DATA: '当周+未来四周数据不足，请检查 Excel 是否包含最新船期',
            NO_AREA_SELECTION: '请先选择区域（至少第一级）',
            NO_EXCEL_LOADED: '请先加载并解析 Excel 文件',
            NO_DATA_LOADED: '请先加载数据',
            NO_FILTERS: '请先选择筛选条件',
            NO_FILTERED_DATA: '筛选后没有可分析的数据',
            NO_DATA_FOR_ANALYSIS: '没有可分析的数据，请先加载Excel文件并选择筛选条件'
        },
        [ErrorType.API_ERROR]: {
            API_KEY_MISSING: '请先配置 {provider} 的 API Key',
            API_REQUEST_FAILED: 'API 请求失败：{message}',
            API_RESPONSE_ERROR: 'API 返回错误：{message}'
        },
        [ErrorType.DOM_ERROR]: {
            ELEMENT_NOT_FOUND: '未找到必要的页面元素：{element}'
        },
        [ErrorType.USER_ACTION]: {
            CONFIG_SAVED: '{provider} API 配置已保存'
        },
        [ErrorType.SYSTEM_ERROR]: {
            PDF_EXPORT_FAILED: '导出 PDF 失败：{message}',
            UNKNOWN_ERROR: '发生未知错误'
        }
    };

    /**
     * 调试日志函数（使用 vendor/debug-utils.js 中的函数，如果可用）
     * @param {string} type - 日志类型 ('log' 或 'error')
     * @param {string} message - 日志消息
     * @param {any} data - 日志数据
     */
    function debugLog(type, message, data) {
        if (typeof window !== 'undefined') {
            // 优先使用 debug-utils.js 中的函数
            if (type === 'error' && typeof window.debugError === 'function') {
                window.debugError(message, data);
            } else if (type === 'log' && typeof window.debugLog === 'function') {
                window.debugLog(message, data);
            } else if (typeof console !== 'undefined') {
                // 降级到 console（当 debug-utils.js 未加载时）
                if (type === 'error') {
                    console.error(message, data);
                } else {
                    console.log(message, data);
                }
            }
        }
    }

    /**
     * 显示友好的错误提示
     * @param {string} errorType - 错误类型（ErrorType 枚举值）
     * @param {string} errorKey - 错误键（ERROR_MESSAGES 中的键）
     * @param {Object<string, string>} [replacements={}] - 替换参数，用于替换消息中的占位符
     * @param {Error} [error=null] - 原始错误对象（可选，用于调试）
     */
    function showError(errorType, errorKey, replacements = {}, error = null) {
        const messages = ERROR_MESSAGES[errorType];
        
        // 如果找不到对应的错误类型或错误键，使用降级处理
        if (!messages || !messages[errorKey]) {
            const fallbackMsg = error ? error.message : '发生未知错误';
            if (typeof alert !== 'undefined') {
                alert(fallbackMsg);
            }
            if (error) {
                debugLog('error', '错误详情:', error);
            }
            return;
        }
        
        // 获取错误消息并替换占位符
        let message = messages[errorKey];
        Object.keys(replacements).forEach(key => {
            message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), replacements[key]);
        });
        
        // 显示错误提示
        if (typeof alert !== 'undefined') {
            alert(message);
        }
        
        // 记录错误到控制台（用于调试）
        if (error) {
            debugLog('log', '错误详情:', {
                type: errorType,
                key: errorKey,
                message: message,
                error: error
            });
        }
    }

    /**
     * 显示成功提示
     * @param {string} message - 提示消息
     */
    function showSuccess(message) {
        if (typeof alert !== 'undefined') {
            alert(message);
        }
    }

    /**
     * 添加自定义错误消息（允许页面扩展错误消息）
     * @param {string} errorType - 错误类型
     * @param {string} errorKey - 错误键
     * @param {string} message - 错误消息
     */
    function addErrorMessage(errorType, errorKey, message) {
        if (!ERROR_MESSAGES[errorType]) {
            ERROR_MESSAGES[errorType] = {};
        }
        ERROR_MESSAGES[errorType][errorKey] = message;
    }

    /**
     * 获取错误消息（不显示，仅返回消息文本）
     * @param {string} errorType - 错误类型
     * @param {string} errorKey - 错误键
     * @param {Object<string, string>} [replacements={}] - 替换参数
     * @returns {string} 错误消息文本
     */
    function getErrorMessage(errorType, errorKey, replacements = {}) {
        const messages = ERROR_MESSAGES[errorType];
        if (!messages || !messages[errorKey]) {
            return '发生未知错误';
        }
        
        let message = messages[errorKey];
        Object.keys(replacements).forEach(key => {
            message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), replacements[key]);
        });
        
        return message;
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.ErrorType = ErrorType;
        window.ERROR_MESSAGES = ERROR_MESSAGES;
        window.showError = showError;
        window.showSuccess = showSuccess;
        window.addErrorMessage = addErrorMessage;
        window.getErrorMessage = getErrorMessage;
    }

    // 如果是在 Node.js 环境中（用于测试）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            ErrorType,
            ERROR_MESSAGES,
            showError,
            showSuccess,
            addErrorMessage,
            getErrorMessage
        };
    }
})();

