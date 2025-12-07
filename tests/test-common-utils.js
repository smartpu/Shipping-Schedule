/**
 * 公共工具函数测试
 * 测试 vendor/common-utils.js 中的函数
 */

(function() {
    'use strict';

    // 加载函数（根据环境）
    let getSelectedValues, setupMultiSelect, escapeRegex, computePercentChange, 
        formatPercent, parseDate, loadCachedData, saveCachedData;
    
    if (typeof window !== 'undefined') {
        // 浏览器环境，函数应该是全局的
        getSelectedValues = window.getSelectedValues;
        setupMultiSelect = window.setupMultiSelect;
        escapeRegex = window.escapeRegex;
        computePercentChange = window.computePercentChange;
        formatPercent = window.formatPercent;
        parseDate = window.parseDate;
        loadCachedData = window.loadCachedData;
        saveCachedData = window.saveCachedData;
    } else if (typeof require !== 'undefined') {
        // Node.js 环境需要模拟 DOM
        // 这里只测试不依赖 DOM 的函数
    }

    /**
     * 公共工具函数测试套件
     */
    function testCommonUtils() {
        console.log('测试 escapeRegex 函数...');
        if (typeof escapeRegex === 'function') {
            assertEqual(escapeRegex('test'), 'test', '普通字符串应该保持不变');
            assertEqual(escapeRegex('test.test'), 'test\\.test', '点号应该被转义');
            assertEqual(escapeRegex('test*test'), 'test\\*test', '星号应该被转义');
            assertEqual(escapeRegex('test+test'), 'test\\+test', '加号应该被转义');
            assertEqual(escapeRegex('test?test'), 'test\\?test', '问号应该被转义');
            assertEqual(escapeRegex('test^test'), 'test\\^test', '脱字符应该被转义');
            assertEqual(escapeRegex('test$test'), 'test\\$test', '美元符号应该被转义');
            assertEqual(escapeRegex('test|test'), 'test\\|test', '竖线应该被转义');
            assertEqual(escapeRegex('test(test)'), 'test\\(test\\)', '括号应该被转义');
            assertEqual(escapeRegex('test[test]'), 'test\\[test\\]', '方括号应该被转义');
            assertEqual(escapeRegex('test{test}'), 'test\\{test\\}', '花括号应该被转义');
        }

        console.log('\n测试 computePercentChange 函数...');
        if (typeof computePercentChange === 'function') {
            assertEqual(computePercentChange(100, 50), 100, '100 相对于 50 应该是 100% 增长');
            assertEqual(computePercentChange(50, 100), -50, '50 相对于 100 应该是 -50% 变化');
            assertEqual(computePercentChange(100, 100), 0, '相同值应该是 0% 变化');
            assertNull(computePercentChange(100, 0), '除数为 0 应该返回 null');
            assertNull(computePercentChange(null, 100), 'null 值应该返回 null');
            assertNull(computePercentChange(100, null), 'null 值应该返回 null');
            assertNull(computePercentChange(NaN, 100), 'NaN 值应该返回 null');
            assertNull(computePercentChange(100, NaN), 'NaN 值应该返回 null');
        }

        console.log('\n测试 formatPercent 函数...');
        if (typeof formatPercent === 'function') {
            assertEqual(formatPercent(10.5), '+10.5%', '正数应该显示 + 号');
            assertEqual(formatPercent(-10.5), '-10.5%', '负数应该显示 - 号');
            assertEqual(formatPercent(0), '+0.0%', '0 应该显示 +0.0%');
            assertEqual(formatPercent(10.567, 2), '+10.57%', '应该支持指定小数位数');
            assertEqual(formatPercent(null), '—', 'null 应该返回 —');
            assertEqual(formatPercent(undefined), '—', 'undefined 应该返回 —');
            assertEqual(formatPercent(NaN), '—', 'NaN 应该返回 —');
        }

        console.log('\n测试 parseDate 函数...');
        if (typeof parseDate === 'function') {
            // 测试 Date 对象
            const date1 = new Date(2024, 0, 15);
            const parsed1 = parseDate(date1);
            assertNotNull(parsed1, 'Date 对象应该被解析');
            if (parsed1) {
                assertEqual(parsed1.getFullYear(), 2024, '年份应该正确');
                assertEqual(parsed1.getMonth(), 0, '月份应该正确');
                assertEqual(parsed1.getDate(), 15, '日期应该正确');
            }

            // 测试字符串日期
            const parsed2 = parseDate('2024/01/15');
            assertNotNull(parsed2, '字符串日期应该被解析');
            if (parsed2) {
                assertEqual(parsed2.getFullYear(), 2024, '字符串日期年份应该正确');
            }

            // 测试 null/undefined
            assertNull(parseDate(null), 'null 应该返回 null');
            assertNull(parseDate(undefined), 'undefined 应该返回 null');
            assertNull(parseDate(''), '空字符串应该返回 null');
        }

        console.log('\n测试缓存函数...');
        if (typeof saveCachedData === 'function' && typeof loadCachedData === 'function') {
            // 注意：这些测试需要 localStorage 支持
            if (typeof localStorage !== 'undefined') {
                const testKey = 'test_cache_key';
                const testData = { name: 'test', value: 123 };
                
                saveCachedData(testKey, testData);
                const loaded = loadCachedData(testKey);
                assertNotNull(loaded, '应该能加载缓存数据');
                if (loaded) {
                    assertEqual(loaded.name, 'test', '缓存数据应该正确');
                    assertEqual(loaded.value, 123, '缓存数据应该正确');
                }
                
                // 清理
                localStorage.removeItem(testKey);
            }
        }
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testCommonUtils = testCommonUtils;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testCommonUtils };
    }
})();

