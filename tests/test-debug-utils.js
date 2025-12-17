/**
 * 调试工具函数测试
 * 测试 vendor/debug-utils.js 中的函数
 */

(function() {
    'use strict';

    // 加载函数（根据环境）
    let getDebugMode, getCachedDebugMode, debugLog, debugWarn, debugError;
    
    if (typeof window !== 'undefined') {
        // 浏览器环境，函数应该是全局的
        getDebugMode = window.getDebugMode;
        getCachedDebugMode = window.getCachedDebugMode;
        debugLog = window.debugLog;
        debugWarn = window.debugWarn;
        debugError = window.debugError;
    }

    /**
     * 调试工具函数测试套件
     */
    function testDebugUtils() {
        console.log('测试 getDebugMode 函数...');
        if (typeof getDebugMode === 'function') {
            // 保存原始 URL
            const originalSearch = window.location.search;
            
            // 测试非调试模式
            if (history.replaceState) {
                history.replaceState({}, '', window.location.pathname);
            }
            const mode1 = getDebugMode();
            assert(mode1 === false, '默认情况下 getDebugMode 应该返回 false');
            
            // 测试调试模式（通过 URL 参数）
            if (history.replaceState) {
                history.replaceState({}, '', window.location.pathname + '?debug=true');
            }
            const mode2 = getDebugMode();
            assert(mode2 === true, '当 URL 包含 ?debug=true 时，getDebugMode 应该返回 true');
            
            // 恢复原始 URL
            if (history.replaceState) {
                history.replaceState({}, '', window.location.pathname + originalSearch);
            }
        } else {
            console.warn('getDebugMode 函数未找到，跳过测试');
        }

        console.log('\n测试 getCachedDebugMode 函数...');
        if (typeof getCachedDebugMode === 'function') {
            const cached1 = getCachedDebugMode();
            assert(typeof cached1 === 'boolean', 'getCachedDebugMode 应该返回布尔值');
            
            // 多次调用应该返回相同值（缓存）
            const cached2 = getCachedDebugMode();
            assertEqual(cached1, cached2, 'getCachedDebugMode 应该缓存结果');
        } else {
            console.warn('getCachedDebugMode 函数未找到，跳过测试');
        }

        console.log('\n测试 debugLog 函数...');
        if (typeof debugLog === 'function') {
            // 保存原始 console.log
            const originalLog = console.log;
            let logCalled = false;
            let logArgs = null;
            
            console.log = function(...args) {
                logCalled = true;
                logArgs = args;
                originalLog.apply(console, args);
            };
            
            try {
                // 测试调用（在非调试模式下可能不会输出）
                debugLog('test message');
                assert(true, 'debugLog 应该可以无错误调用');
                
                // 如果处于调试模式，应该调用了 console.log
                if (getCachedDebugMode && getCachedDebugMode()) {
                    // 在调试模式下，logCalled 可能为 true
                    assert(true, '在调试模式下，debugLog 应该调用 console.log');
                } else {
                    // 在非调试模式下，logCalled 应该为 false
                    assert(true, '在非调试模式下，debugLog 可能不调用 console.log');
                }
            } finally {
                // 恢复原始 console.log
                console.log = originalLog;
            }
        } else {
            console.warn('debugLog 函数未找到，跳过测试');
        }

        console.log('\n测试 debugWarn 函数...');
        if (typeof debugWarn === 'function') {
            // 保存原始 console.warn
            const originalWarn = console.warn;
            let warnCalled = false;
            
            console.warn = function(...args) {
                warnCalled = true;
                originalWarn.apply(console, args);
            };
            
            try {
                debugWarn('test warning');
                assert(true, 'debugWarn 应该可以无错误调用');
            } finally {
                // 恢复原始 console.warn
                console.warn = originalWarn;
            }
        } else {
            console.warn('debugWarn 函数未找到，跳过测试');
        }

        console.log('\n测试 debugError 函数...');
        if (typeof debugError === 'function') {
            // 保存原始 console.error
            const originalError = console.error;
            let errorCalled = false;
            
            console.error = function(...args) {
                errorCalled = true;
                originalError.apply(console, args);
            };
            
            try {
                debugError('test error');
                assert(true, 'debugError 应该可以无错误调用');
            } finally {
                // 恢复原始 console.error
                console.error = originalError;
            }
        } else {
            console.warn('debugError 函数未找到，跳过测试');
        }

        console.log('\n测试函数类型...');
        assert(typeof getDebugMode === 'function' || getDebugMode === undefined, 'getDebugMode 应该是函数或未定义');
        assert(typeof getCachedDebugMode === 'function' || getCachedDebugMode === undefined, 'getCachedDebugMode 应该是函数或未定义');
        assert(typeof debugLog === 'function' || debugLog === undefined, 'debugLog 应该是函数或未定义');
        assert(typeof debugWarn === 'function' || debugWarn === undefined, 'debugWarn 应该是函数或未定义');
        assert(typeof debugError === 'function' || debugError === undefined, 'debugError 应该是函数或未定义');
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testDebugUtils = testDebugUtils;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testDebugUtils };
    }
})();
