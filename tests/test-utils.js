/**
 * 测试工具函数
 * 简单的测试框架，用于在浏览器中运行测试
 */

(function() {
    'use strict';

    // 测试结果统计
    let testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    /**
     * 断言函数
     * @param {boolean} condition - 断言条件
     * @param {string} message - 错误消息
     */
    function assert(condition, message) {
        testResults.total++;
        if (condition) {
            testResults.passed++;
            console.log(`✓ ${message}`);
        } else {
            testResults.failed++;
            const error = `✗ ${message}`;
            testResults.errors.push(error);
            console.error(error);
        }
    }

    /**
     * 断言两个值相等
     * @param {*} actual - 实际值
     * @param {*} expected - 期望值
     * @param {string} message - 测试消息
     */
    function assertEqual(actual, expected, message) {
        const condition = actual === expected || 
                         (typeof actual === 'object' && typeof expected === 'object' && 
                          JSON.stringify(actual) === JSON.stringify(expected));
        assert(condition, message || `期望 ${expected}，实际得到 ${actual}`);
    }

    /**
     * 断言值不为 null 或 undefined
     * @param {*} value - 要检查的值
     * @param {string} message - 测试消息
     */
    function assertNotNull(value, message) {
        assert(value !== null && value !== undefined, message || '值不应为 null 或 undefined');
    }

    /**
     * 断言值为 null 或 undefined
     * @param {*} value - 要检查的值
     * @param {string} message - 测试消息
     */
    function assertNull(value, message) {
        assert(value === null || value === undefined, message || '值应为 null 或 undefined');
    }

    /**
     * 运行所有测试
     * @param {Object} testSuite - 测试套件对象
     */
    function runTests(testSuite) {
        console.log('开始运行测试...\n');
        testResults = { total: 0, passed: 0, failed: 0, errors: [] };

        Object.keys(testSuite).forEach(suiteName => {
            console.log(`\n测试套件: ${suiteName}`);
            console.log('─'.repeat(50));
            
            const tests = testSuite[suiteName];
            if (typeof tests === 'function') {
                tests();
            } else if (typeof tests === 'object') {
                Object.keys(tests).forEach(testName => {
                    try {
                        tests[testName]();
                    } catch (error) {
                        testResults.failed++;
                        testResults.total++;
                        const errorMsg = `✗ ${testName}: ${error.message}`;
                        testResults.errors.push(errorMsg);
                        console.error(errorMsg);
                        console.error(error.stack);
                    }
                });
            }
        });

        // 输出测试结果摘要
        console.log('\n' + '='.repeat(50));
        console.log('测试结果摘要:');
        console.log(`总计: ${testResults.total}`);
        console.log(`通过: ${testResults.passed}`);
        console.log(`失败: ${testResults.failed}`);
        
        if (testResults.errors.length > 0) {
            console.log('\n失败的测试:');
            testResults.errors.forEach(error => console.error(error));
        }

        return testResults;
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.assert = assert;
        window.assertEqual = assertEqual;
        window.assertNotNull = assertNotNull;
        window.assertNull = assertNull;
        window.runTests = runTests;
        window.testResults = testResults;
    }

    // Node.js 环境
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            assert,
            assertEqual,
            assertNotNull,
            assertNull,
            runTests,
            testResults
        };
    }
})();

