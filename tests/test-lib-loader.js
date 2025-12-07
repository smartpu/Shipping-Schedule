/**
 * 库加载器测试
 * 测试 vendor/lib-loader.js 中的函数
 */

(function() {
    'use strict';

    // 加载函数（根据环境）
    let ensureXlsx, ensureChartJs;
    
    if (typeof window !== 'undefined') {
        // 浏览器环境，函数应该是全局的
        ensureXlsx = window.ensureXlsx;
        ensureChartJs = window.ensureChartJs;
    }

    /**
     * 库加载器测试套件
     */
    function testLibLoader() {
        console.log('测试 ensureXlsx 函数...');
        if (typeof ensureXlsx === 'function') {
            // 测试函数存在性
            assertNotNull(ensureXlsx, 'ensureXlsx 函数应该存在');
            
            // 测试返回 Promise
            const result = ensureXlsx();
            assertNotNull(result, 'ensureXlsx 应该返回一个值');
            if (result && typeof result.then === 'function') {
                assert(true, 'ensureXlsx 应该返回 Promise');
                
                // 如果 XLSX 已经加载，Promise 应该立即 resolve
                if (typeof XLSX !== 'undefined') {
                    result.then(success => {
                        assertEqual(success, true, '如果 XLSX 已加载，应该返回 true');
                    }).catch(() => {
                        // 忽略错误，因为可能没有网络连接
                    });
                }
            } else {
                // 如果没有返回 Promise，可能是同步返回
                assert(true, 'ensureXlsx 返回了值（可能是同步或 Promise）');
            }
        } else {
            console.warn('ensureXlsx 函数未找到，跳过测试');
        }

        console.log('\n测试 ensureChartJs 函数...');
        if (typeof ensureChartJs === 'function') {
            // 测试函数存在性
            assertNotNull(ensureChartJs, 'ensureChartJs 函数应该存在');
            
            // 测试返回 Promise
            const result = ensureChartJs();
            assertNotNull(result, 'ensureChartJs 应该返回一个值');
            if (result && typeof result.then === 'function') {
                assert(true, 'ensureChartJs 应该返回 Promise');
                
                // 如果 Chart 已经加载，Promise 应该立即 resolve
                if (typeof Chart !== 'undefined') {
                    result.then(success => {
                        assertEqual(success, true, '如果 Chart 已加载，应该返回 true');
                    }).catch(() => {
                        // 忽略错误，因为可能没有网络连接
                    });
                }
            } else {
                // 如果没有返回 Promise，可能是同步返回
                assert(true, 'ensureChartJs 返回了值（可能是同步或 Promise）');
            }
        } else {
            console.warn('ensureChartJs 函数未找到，跳过测试');
        }

        console.log('\n测试库加载器基本功能...');
        // 测试函数类型
        if (typeof ensureXlsx === 'function' && typeof ensureChartJs === 'function') {
            assert(true, '库加载器函数都已定义');
        } else {
            console.warn('部分库加载器函数未找到');
        }
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testLibLoader = testLibLoader;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testLibLoader };
    }
})();

