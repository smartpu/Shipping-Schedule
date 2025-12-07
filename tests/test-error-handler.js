/**
 * 错误处理模块测试
 * 测试 vendor/error-handler.js 中的函数
 */

// 需要先加载 error-handler.js
// 在浏览器中：<script src="vendor/error-handler.js"></script>
// 在 Node.js 中：const errorHandler = require('../vendor/error-handler.js');

(function() {
    'use strict';

    // 如果是在浏览器环境，使用全局变量
    // 如果是在 Node.js 环境，使用 require
    let ErrorType, showError, showSuccess, addErrorMessage, getErrorMessage;
    
    if (typeof window !== 'undefined') {
        ErrorType = window.ErrorType;
        showError = window.showError;
        showSuccess = window.showSuccess;
        addErrorMessage = window.addErrorMessage;
        getErrorMessage = window.getErrorMessage;
    } else if (typeof require !== 'undefined') {
        const errorHandler = require('../vendor/error-handler.js');
        ErrorType = errorHandler.ErrorType;
        showError = errorHandler.showError;
        showSuccess = errorHandler.showSuccess;
        addErrorMessage = errorHandler.addErrorMessage;
        getErrorMessage = errorHandler.getErrorMessage;
    }

    /**
     * 错误处理模块测试套件
     */
    function testErrorHandler() {
        console.log('测试 ErrorType 枚举...');
        assertNotNull(ErrorType, 'ErrorType 应该存在');
        assertEqual(ErrorType.FILE_LOAD, 'FILE_LOAD', 'ErrorType.FILE_LOAD 应该为 "FILE_LOAD"');
        assertEqual(ErrorType.FILE_PARSE, 'FILE_PARSE', 'ErrorType.FILE_PARSE 应该为 "FILE_PARSE"');
        assertEqual(ErrorType.DATA_VALIDATION, 'DATA_VALIDATION', 'ErrorType.DATA_VALIDATION 应该为 "DATA_VALIDATION"');
        assertEqual(ErrorType.API_ERROR, 'API_ERROR', 'ErrorType.API_ERROR 应该为 "API_ERROR"');
        assertEqual(ErrorType.DOM_ERROR, 'DOM_ERROR', 'ErrorType.DOM_ERROR 应该为 "DOM_ERROR"');
        assertEqual(ErrorType.USER_ACTION, 'USER_ACTION', 'ErrorType.USER_ACTION 应该为 "USER_ACTION"');
        assertEqual(ErrorType.SYSTEM_ERROR, 'SYSTEM_ERROR', 'ErrorType.SYSTEM_ERROR 应该为 "SYSTEM_ERROR"');

        console.log('\n测试 getErrorMessage 函数...');
        const message1 = getErrorMessage(ErrorType.FILE_LOAD, 'XLSX_NOT_LOADED');
        assertNotNull(message1, 'getErrorMessage 应该返回消息');
        assert(message1.includes('XLSX'), '消息应该包含 "XLSX"');

        const message2 = getErrorMessage(ErrorType.FILE_LOAD, 'FILE_READ_FAILED', { message: '测试错误' });
        assert(message2.includes('测试错误'), '消息应该包含替换参数');

        const message3 = getErrorMessage(ErrorType.FILE_LOAD, 'NON_EXISTENT_KEY');
        assertEqual(message3, '发生未知错误', '不存在的错误键应该返回默认消息');

        console.log('\n测试 addErrorMessage 函数...');
        addErrorMessage(ErrorType.FILE_LOAD, 'TEST_ERROR', '这是一个测试错误消息');
        const testMessage = getErrorMessage(ErrorType.FILE_LOAD, 'TEST_ERROR');
        assertEqual(testMessage, '这是一个测试错误消息', 'addErrorMessage 应该添加自定义错误消息');

        console.log('\n测试占位符替换...');
        const messageWithPlaceholder = getErrorMessage(ErrorType.API_ERROR, 'API_KEY_MISSING', { provider: 'DeepSeek' });
        assert(messageWithPlaceholder.includes('DeepSeek'), '占位符应该被正确替换');
        assert(!messageWithPlaceholder.includes('{provider}'), '占位符不应该保留在最终消息中');

        console.log('\n测试多个占位符替换...');
        const messageMultiple = getErrorMessage(ErrorType.API_ERROR, 'API_REQUEST_FAILED', { message: '网络错误' });
        assert(messageMultiple.includes('网络错误'), '多个占位符应该被正确替换');
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testErrorHandler = testErrorHandler;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testErrorHandler };
    }
})();

