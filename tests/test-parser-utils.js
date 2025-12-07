/**
 * 解析工具函数测试
 * 测试 vendor/parser-utils.js 中的函数
 */

(function() {
    'use strict';

    // 加载函数
    let toCsvCell, rowsToCsv, generateTimestampFilename;
    
    if (typeof window !== 'undefined') {
        toCsvCell = window.toCsvCell;
        rowsToCsv = window.rowsToCsv;
        generateTimestampFilename = window.generateTimestampFilename;
    }

    /**
     * 解析工具函数测试套件
     */
    function testParserUtils() {
        console.log('测试 toCsvCell 函数...');
        if (typeof toCsvCell === 'function') {
            assertEqual(toCsvCell('test'), 'test', '普通字符串应该保持不变');
            assertEqual(toCsvCell('test,test'), '"test,test"', '包含逗号的字符串应该用引号包裹');
            assertEqual(toCsvCell('test"test'), '"test""test"', '包含引号的字符串应该转义引号');
            assertEqual(toCsvCell('test\ntest'), '"test\ntest"', '包含换行符的字符串应该用引号包裹');
            assertEqual(toCsvCell(null), '', 'null 应该返回空字符串');
            assertEqual(toCsvCell(undefined), '', 'undefined 应该返回空字符串');
            assertEqual(toCsvCell(123), '123', '数字应该转换为字符串');
        }

        console.log('\n测试 rowsToCsv 函数...');
        if (typeof rowsToCsv === 'function') {
            const rows1 = [
                ['name', 'age', 'city'],
                ['Alice', 25, 'Beijing'],
                ['Bob', 30, 'Shanghai']
            ];
            const csv1 = rowsToCsv(rows1);
            assert(csv1.includes('name,age,city'), 'CSV 应该包含表头');
            assert(csv1.includes('Alice,25,Beijing'), 'CSV 应该包含数据行');
            assert(csv1.includes('Bob,30,Shanghai'), 'CSV 应该包含所有数据');

            const rows2 = [
                ['name', 'description'],
                ['Test', 'This is a "quoted" text']
            ];
            const csv2 = rowsToCsv(rows2);
            assert(csv2.includes('"This is a ""quoted"" text"'), 'CSV 应该正确转义引号');
        }

        console.log('\n测试 generateTimestampFilename 函数...');
        if (typeof generateTimestampFilename === 'function') {
            const filename1 = generateTimestampFilename('test', 'csv');
            assert(filename1.startsWith('test-'), '文件名应该以前缀开头');
            assert(filename1.endsWith('.csv'), '文件名应该以扩展名结尾');
            assert(filename1.includes('-'), '文件名应该包含时间戳分隔符');

            const filename2 = generateTimestampFilename('data', 'xlsx');
            assert(filename2.startsWith('data-'), '文件名应该以前缀开头');
            assert(filename2.endsWith('.xlsx'), '文件名应该以扩展名结尾');
        }
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testParserUtils = testParserUtils;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testParserUtils };
    }
})();

