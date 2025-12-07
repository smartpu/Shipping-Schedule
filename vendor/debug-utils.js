/**
 * 调试工具函数
 * 统一管理所有页面的调试功能，避免重复代码
 */

(function() {
    'use strict';

    /**
     * 获取调试模式状态
     * @returns {boolean} 是否为调试模式
     */
    function getDebugMode() {
        if (typeof window === 'undefined') return false;
        try {
            return new URLSearchParams(window.location.search).get('debug') === 'true';
        } catch (e) {
            return false;
        }
    }

    // 缓存 DEBUG_MODE 值，避免重复解析 URL 参数
    let _cachedDebugMode = null;
    function getCachedDebugMode() {
        if (_cachedDebugMode === null) {
            _cachedDebugMode = getDebugMode();
        }
        return _cachedDebugMode;
    }

    /**
     * 调试日志函数（仅在调试模式下输出）
     * @param {...*} args - 要输出的参数
     */
    function debugLog(...args) {
        if (getCachedDebugMode()) {
            console.log('[DEBUG]', ...args);
        }
    }

    /**
     * 调试警告函数（仅在调试模式下输出）
     * @param {...*} args - 要输出的参数
     */
    function debugWarn(...args) {
        if (getCachedDebugMode()) {
            console.warn('[DEBUG]', ...args);
        }
    }

    /**
     * 调试错误函数（仅在调试模式下输出）
     * @param {...*} args - 要输出的参数
     */
    function debugError(...args) {
        if (getCachedDebugMode()) {
            console.error('[DEBUG]', ...args);
        }
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.getDebugMode = getDebugMode;
        window.getCachedDebugMode = getCachedDebugMode;
        window.debugLog = debugLog;
        window.debugWarn = debugWarn;
        window.debugError = debugError;
    }

    // 支持 CommonJS
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getDebugMode,
            getCachedDebugMode,
            debugLog,
            debugWarn,
            debugError
        };
    }
})();

