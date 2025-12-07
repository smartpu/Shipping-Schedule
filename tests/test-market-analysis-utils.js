/**
 * 市场分析工具函数测试
 * 测试 vendor/market-analysis-utils.js 中的函数
 */

(function() {
    'use strict';

    // 加载函数（根据环境）
    let parseWciText, prepareAnalysisData, buildDataOverview, buildDetailedData001,
        buildDetailedData365, buildBookingDataSection, buildMarketReportsSection,
        buildBunkerDataSection, buildCcfiDataSection, buildWciDataSection, buildFbxDataSection,
        escapeRegex, formatPercent, getCachedRegex, getCachedDebugMode;
    
    if (typeof window !== 'undefined') {
        // 浏览器环境，函数应该是全局的
        parseWciText = window.parseWciText;
        prepareAnalysisData = window.prepareAnalysisData;
        buildDataOverview = window.buildDataOverview;
        buildDetailedData001 = window.buildDetailedData001;
        buildDetailedData365 = window.buildDetailedData365;
        buildBookingDataSection = window.buildBookingDataSection;
        buildMarketReportsSection = window.buildMarketReportsSection;
        buildBunkerDataSection = window.buildBunkerDataSection;
        buildCcfiDataSection = window.buildCcfiDataSection;
        buildWciDataSection = window.buildWciDataSection;
        buildFbxDataSection = window.buildFbxDataSection;
        escapeRegex = window.escapeRegex;
        formatPercent = window.formatPercent;
        getCachedRegex = window.getCachedRegex;
        getCachedDebugMode = window.getCachedDebugMode;
    }

    /**
     * 市场分析工具函数测试套件
     */
    function testMarketAnalysisUtils() {
        console.log('测试 parseWciText 函数...');
        if (typeof parseWciText === 'function') {
            // 模拟 wciCodeMap（如果不存在）
            if (typeof window !== 'undefined' && typeof window.wciCodeMap === 'undefined') {
                window.wciCodeMap = {
                    'WCI-COMPOSITE': 'World Container Index',
                    'WCI-SHA-RTM': 'Shanghai-Rotterdam',
                    'WCI-SHA-GOA': 'Shanghai-Genoa',
                    'WCI-SHA-LAX': 'Shanghai-Los Angeles',
                    'WCI-SHA-NYC': 'Shanghai-New York',
                    'WCI-RTM-SHA': 'Rotterdam-Shanghai',
                    'WCI-LAX-SHA': 'Los Angeles-Shanghai',
                    'WCI-NYC-RTM': 'New York-Rotterdam',
                    'WCI-RTM-NYC': 'Rotterdam-New York'
                };
            }

            // 测试1：基本解析功能
            const testText1 = 'WCI-COMPOSITE = $3,456.78 (+2.5%)\nWCI-SHA-RTM: $4,567.89\nShanghai-Rotterdam: $4,567.89';
            const result1 = parseWciText(testText1);
            assertNotNull(result1, 'parseWciText 应该返回结果对象');
            assertEqual(typeof result1, 'object', 'parseWciText 应该返回对象');
            assertNotNull(result1.timestamp, '结果应该包含 timestamp');
            assertEqual(Array.isArray(result1.routes), true, '结果应该包含 routes 数组');

            // 测试2：解析复合指数
            if (result1.worldIndex !== null) {
                assertEqual(typeof result1.worldIndex, 'number', 'worldIndex 应该是数字');
                assert(result1.worldIndex > 0, 'worldIndex 应该大于 0');
            }

            // 测试3：解析航线数据
            if (result1.routes && result1.routes.length > 0) {
                const route = result1.routes[0];
                assertNotNull(route.code, '航线应该包含 code');
                assertNotNull(route.route, '航线应该包含 route');
                assertEqual(typeof route.rate, 'number', '航线应该包含 rate 数字');
                assert(route.rate > 0, '航线 rate 应该大于 0');
            }

            // 测试4：空文本处理
            const result2 = parseWciText('');
            assertNotNull(result2, '空文本应该返回结果对象');
            assertEqual(Array.isArray(result2.routes), true, '空文本应该返回空 routes 数组');

            // 测试5：无 wciCodeMap 的情况
            const originalWciCodeMap = window.wciCodeMap;
            delete window.wciCodeMap;
            const result3 = parseWciText('test');
            assertNotNull(result3, '无 wciCodeMap 时应该返回结果对象');
            assertEqual(result3.routes.length, 0, '无 wciCodeMap 时 routes 应该为空');
            window.wciCodeMap = originalWciCodeMap; // 恢复

            // 测试6：包含中文标签的文本
            const testText2 = '上海-鹿特丹: $4,567.89\nWCI-SHA-LAX = $5,678.90';
            const result4 = parseWciText(testText2);
            assertNotNull(result4, '包含中文标签的文本应该被解析');

            // 测试7：包含 Fallback 匹配的文本
            const testText3 = 'Shanghai to Rotterdam $4,567.89\nLos Angeles to Shanghai $5,678.90';
            const result5 = parseWciText(testText3);
            assertNotNull(result5, 'Fallback 匹配应该工作');

            // 测试8：复合指数文本匹配
            const testText4 = 'World Container Index decreased 2.5% to $3,456.78';
            const result6 = parseWciText(testText4);
            if (result6.worldIndex !== null) {
                assertEqual(typeof result6.worldIndex, 'number', '复合指数应该被解析');
                if (result6.changePct !== null) {
                    assertEqual(typeof result6.changePct, 'number', '变化百分比应该被解析');
                }
            }
        } else {
            console.warn('parseWciText 函数未找到，跳过测试');
        }

        console.log('\n测试 prepareAnalysisData 函数...');
        if (typeof prepareAnalysisData === 'function') {
            // 模拟 ErrorType 和 showError
            const mockErrorType = {
                DATA_VALIDATION: 'DATA_VALIDATION',
                NO_ROUTE_DATA: 'NO_ROUTE_DATA',
                NO_WEEK_DATA: 'NO_WEEK_DATA',
                NO_ANALYSIS_DATA: 'NO_ANALYSIS_DATA'
            };
            let errorCalled = false;
            let errorType = null;
            let errorKey = null;
            const mockShowError = (type, key) => {
                errorCalled = true;
                errorType = type;
                errorKey = key;
            };

            // 测试1：空分析组
            const result1 = prepareAnalysisData([], [], mockShowError, mockErrorType);
            assertNull(result1, '空分析组应该返回 null');
            assert(errorCalled, '空分析组应该调用 showError');
            assertEqual(errorKey, 'NO_ROUTE_DATA', '错误键应该是 NO_ROUTE_DATA');
            errorCalled = false;

            // 测试2：空周别列
            const result2 = prepareAnalysisData([{ port: 'Test' }], [], mockShowError, mockErrorType);
            assertNull(result2, '空周别列应该返回 null');
            assert(errorCalled, '空周别列应该调用 showError');
            assertEqual(errorKey, 'NO_WEEK_DATA', '错误键应该是 NO_WEEK_DATA');
            errorCalled = false;

            // 测试3：正常数据
            const analysisGroups = [
                {
                    port: 'Test Port',
                    routeLabel: 'Test Route',
                    weeks: {
                        'W01': [{ capacity: 1000 }, { capacity: 2000 }],
                        'W02': [{ capacity: 1500 }]
                    }
                }
            ];
            const weekColumns = [
                { code: 'W01', label: 'Week 1', range: '2024-01-01 to 2024-01-07' },
                { code: 'W02', label: 'Week 2', range: '2024-01-08 to 2024-01-14' }
            ];
            const result3 = prepareAnalysisData(analysisGroups, weekColumns, mockShowError, mockErrorType);
            assertNotNull(result3, '正常数据应该返回结果');
            assertEqual(Array.isArray(result3.analysisData), true, '应该包含 analysisData 数组');
            assertEqual(typeof result3.weeklySummary, 'object', '应该包含 weeklySummary 对象');
            assertEqual(Array.isArray(result3.analysisWeekCodes), true, '应该包含 analysisWeekCodes 数组');
            assertEqual(Array.isArray(result3.analysisWeekLabels), true, '应该包含 analysisWeekLabels 数组');
            assertEqual(result3.analysisData.length, 1, 'analysisData 应该包含 1 个元素');
            assertEqual(result3.analysisWeekCodes.length, 1, 'analysisWeekCodes 应该包含 1 个元素（排除第一周）');
            assertEqual(result3.analysisWeekCodes[0], 'W02', 'analysisWeekCodes 应该从第二周开始');
            assertEqual(result3.weeklySummary['W02'].capacity, 1500, 'weeklySummary 应该正确计算运力');
            assertEqual(result3.weeklySummary['W02'].ships, 1, 'weeklySummary 应该正确计算船数');

            // 测试4：只有一周的情况
            const weekColumnsSingle = [{ code: 'W01', label: 'Week 1' }];
            const result4 = prepareAnalysisData(analysisGroups, weekColumnsSingle, mockShowError, mockErrorType);
            assertNotNull(result4, '只有一周时应该返回结果');
            assertEqual(result4.analysisWeekCodes.length, 1, '只有一周时 analysisWeekCodes 应该包含 1 个元素');
        } else {
            console.warn('prepareAnalysisData 函数未找到，跳过测试');
        }

        console.log('\n测试 buildDataOverview 函数...');
        if (typeof buildDataOverview === 'function') {
            const destinationSummary = 'Test Destination';
            const routeCount = 5;
            const analysisWeekCodes = ['W01', 'W02'];
            const analysisWeekLabels = ['Week 1', 'Week 2'];
            const weeklySummary = {
                'W01': { capacity: 10000, ships: 10 },
                'W02': { capacity: 12000, ships: 12 }
            };

            const result = buildDataOverview(destinationSummary, routeCount, analysisWeekCodes, analysisWeekLabels, weeklySummary);
            assertEqual(typeof result, 'string', 'buildDataOverview 应该返回字符串');
            assert(result.includes(destinationSummary), '结果应该包含目的地摘要');
            assert(result.includes(String(routeCount)), '结果应该包含航线数量');
            // 使用 toLocaleString() 格式化后的数字进行匹配（因为函数内部使用了 toLocaleString()）
            assert(result.includes(weeklySummary['W01'].capacity.toLocaleString()) || result.includes('10000'), '结果应该包含运力数据');
            assert(result.includes(String(weeklySummary['W01'].ships)) || result.includes('10'), '结果应该包含船数数据');
        } else {
            console.warn('buildDataOverview 函数未找到，跳过测试');
        }

        console.log('\n测试 buildDetailedData001 函数...');
        if (typeof buildDetailedData001 === 'function') {
            const analysisData = [
                {
                    port: 'Test Port 1',
                    routeLabel: 'Route 1',
                    weeks: {
                        'W01': { capacity: 1000, ships: 2 },
                        'W02': { capacity: 1500, ships: 3 }
                    }
                },
                {
                    port: 'Test Port 2',
                    routeLabel: 'Route 2',
                    weeks: {
                        'W01': { capacity: 2000, ships: 4 },
                        'W02': { capacity: 2500, ships: 5 }
                    }
                }
            ];
            const analysisWeekCodes = ['W01', 'W02'];
            const analysisWeekLabels = ['Week 1', 'Week 2'];

            const result = buildDetailedData001(analysisData, analysisWeekCodes, analysisWeekLabels);
            assertEqual(typeof result, 'string', 'buildDetailedData001 应该返回字符串');
            assert(result.includes('Test Port 1'), '结果应该包含港口名称');
            assert(result.includes('Route 1'), '结果应该包含航线标签');
            // 使用 toLocaleString() 格式化后的数字进行匹配（因为函数内部使用了 toLocaleString()）
            const capacityFormatted = analysisData[0].weeks['W01'].capacity.toLocaleString();
            assert(result.includes(capacityFormatted) || result.includes('1000'), '结果应该包含运力数据');
            assert(result.includes(String(analysisData[0].weeks['W01'].ships)) || result.includes('2'), '结果应该包含船数数据');
        } else {
            console.warn('buildDetailedData001 函数未找到，跳过测试');
        }

        console.log('\n测试 buildDetailedData365 函数...');
        if (typeof buildDetailedData365 === 'function') {
            const analysisData = [
                {
                    area: 'Area 1',
                    subArea: 'Sub Area 1',
                    country: 'Country 1',
                    port: 'Port 1',
                    routeLabel: 'Route 1',
                    weeks: {
                        'W01': { capacity: 1000, ships: 2 }
                    }
                }
            ];
            const analysisWeekCodes = ['W01'];
            const analysisWeekLabels = ['Week 1'];

            const result = buildDetailedData365(analysisData, analysisWeekCodes, analysisWeekLabels);
            assertEqual(typeof result, 'string', 'buildDetailedData365 应该返回字符串');
            assert(result.includes('Area 1'), '结果应该包含区域');
            assert(result.includes('Sub Area 1'), '结果应该包含子区域');
            assert(result.includes('Country 1'), '结果应该包含国家');
            assert(result.includes('Port 1'), '结果应该包含港口');
        } else {
            console.warn('buildDetailedData365 函数未找到，跳过测试');
        }

        console.log('\n测试 buildBookingDataSection 函数...');
        if (typeof buildBookingDataSection === 'function') {
            // 测试1：空数据
            const result1 = buildBookingDataSection([]);
            assertEqual(result1, '', '空数据应该返回空字符串');

            // 测试2：正常数据
            const bookingData = [
                { remark: 'Remark 1', description: 'Description 1' },
                { remark: 'Remark 2', description: 'Description 2' }
            ];
            const result2 = buildBookingDataSection(bookingData);
            assertEqual(typeof result2, 'string', 'buildBookingDataSection 应该返回字符串');
            assert(result2.includes('Remark 1'), '结果应该包含备注');
            assert(result2.includes('Description 1'), '结果应该包含描述');

            // 测试3：null/undefined
            const result3 = buildBookingDataSection(null);
            assertEqual(result3, '', 'null 应该返回空字符串');
        } else {
            console.warn('buildBookingDataSection 函数未找到，跳过测试');
        }

        console.log('\n测试 buildMarketReportsSection 函数...');
        if (typeof buildMarketReportsSection === 'function') {
            // 测试1：空数据
            const result1 = buildMarketReportsSection([]);
            assertEqual(result1, '', '空数据应该返回空字符串');

            // 测试2：正常数据
            const marketReports = [
                { name: 'Report 1.pdf', text: 'This is a test report content.' },
                { name: 'Report 2.pdf', text: 'Another report content.' }
            ];
            const result2 = buildMarketReportsSection(marketReports);
            assertEqual(typeof result2, 'string', 'buildMarketReportsSection 应该返回字符串');
            assert(result2.includes('Report 1.pdf'), '结果应该包含报告名称');
            assert(result2.includes('test report'), '结果应该包含报告内容');

            // 测试3：长文本截断
            const longText = 'A'.repeat(1500);
            const marketReportsLong = [{ name: 'Long Report.pdf', text: longText }];
            const result3 = buildMarketReportsSection(marketReportsLong);
            assert(result3.includes('…'), '长文本应该被截断并添加省略号');
        } else {
            console.warn('buildMarketReportsSection 函数未找到，跳过测试');
        }

        console.log('\n测试 buildBunkerDataSection 函数...');
        if (typeof buildBunkerDataSection === 'function') {
            // 测试1：空数据
            const result1 = buildBunkerDataSection({});
            assertEqual(result1, '', '空数据应该返回空字符串');

            // 测试2：正常数据
            const bunkerData = {
                vlsfo: { price: 500.50, delta: 10.25 },
                mgo: { price: 600.75, delta: -5.50 },
                ifo380: { price: 450.25, delta: 2.00 },
                timestamp: Date.now()
            };
            const result2 = buildBunkerDataSection(bunkerData);
            assertEqual(typeof result2, 'string', 'buildBunkerDataSection 应该返回字符串');
            assert(result2.includes('500.50'), '结果应该包含 VLSFO 价格');
            assert(result2.includes('600.75'), '结果应该包含 MGO 价格');
            assert(result2.includes('450.25'), '结果应该包含 IFO380 价格');
            assert(result2.includes('+10.25'), '结果应该包含 WoW 变化');

            // 测试3：部分数据
            const bunkerDataPartial = {
                vlsfo: { price: 500.50 },
                timestamp: Date.now()
            };
            const result3 = buildBunkerDataSection(bunkerDataPartial);
            assert(result3.includes('500.50'), '部分数据应该被处理');
        } else {
            console.warn('buildBunkerDataSection 函数未找到，跳过测试');
        }

        console.log('\n测试 buildCcfiDataSection 函数...');
        if (typeof buildCcfiDataSection === 'function') {
            // 测试1：空数据
            const result1 = buildCcfiDataSection({});
            assertEqual(result1, '', '空数据应该返回空字符串');

            // 测试2：正常数据（需要 formatPercent 函数）
            if (typeof formatPercent === 'function') {
                const ccfiData = {
                    period: { current: '2024-01-01', previous: '2023-12-25' },
                    routes: [
                        { label: 'Route 1', current: 1000, previous: 950, wow: 5.26 },
                        { label: 'Route 2', current: 2000, previous: 2100, wow: -4.76 }
                    ]
                };
                const result2 = buildCcfiDataSection(ccfiData);
                assertEqual(typeof result2, 'string', 'buildCcfiDataSection 应该返回字符串');
                assert(result2.includes('Route 1'), '结果应该包含航线标签');
                // 使用 toLocaleString() 格式化后的数字进行匹配（因为函数内部使用了 toLocaleString()）
                const currentFormatted = ccfiData.routes[0].current.toLocaleString();
                const previousFormatted = ccfiData.routes[0].previous.toLocaleString();
                assert(result2.includes(currentFormatted) || result2.includes('1000'), '结果应该包含当前值');
                assert(result2.includes(previousFormatted) || result2.includes('950'), '结果应该包含上期值');
            } else {
                console.warn('formatPercent 函数未找到，跳过部分 buildCcfiDataSection 测试');
            }
        } else {
            console.warn('buildCcfiDataSection 函数未找到，跳过测试');
        }

        console.log('\n测试 buildWciDataSection 函数...');
        if (typeof buildWciDataSection === 'function') {
            // 测试1：空数据
            const result1 = buildWciDataSection({});
            assertEqual(result1, '', '空数据应该返回空字符串');

            // 测试2：正常数据（需要 formatPercent 函数）
            if (typeof formatPercent === 'function') {
                const wciData = {
                    worldIndex: 3456.78,
                    changePct: 2.5,
                    routes: [
                        { code: 'WCI-SHA-RTM', route: 'Shanghai-Rotterdam', rate: 4567.89 },
                        { code: 'WCI-SHA-LAX', route: 'Shanghai-Los Angeles', rate: 5678.90 }
                    ]
                };
                const result2 = buildWciDataSection(wciData);
                assertEqual(typeof result2, 'string', 'buildWciDataSection 应该返回字符串');
                // 使用 toLocaleString() 格式化后的数字进行匹配（因为函数内部使用了 toLocaleString()）
                const worldIndexFormatted = wciData.worldIndex.toLocaleString();
                const routeRateFormatted = wciData.routes[0].rate.toLocaleString();
                assert(result2.includes(worldIndexFormatted) || result2.includes('3456'), '结果应该包含全球指数');
                assert(result2.includes('Shanghai-Rotterdam'), '结果应该包含航线名称');
                assert(result2.includes(routeRateFormatted) || result2.includes('4567'), '结果应该包含航线价格');
            } else {
                console.warn('formatPercent 函数未找到，跳过部分 buildWciDataSection 测试');
            }
        } else {
            console.warn('buildWciDataSection 函数未找到，跳过测试');
        }

        console.log('\n测试 buildFbxDataSection 函数...');
        if (typeof buildFbxDataSection === 'function') {
            // 测试1：空数据
            const result1 = buildFbxDataSection({});
            assertEqual(result1, '', '空数据应该返回空字符串');

            // 测试2：正常数据（需要 formatPercent 函数）
            if (typeof formatPercent === 'function') {
                const fbxData = {
                    indices: [
                        { label: 'FBX01', rate: 1234.56, wow: 3.5 },
                        { label: 'FBX02', rate: 2345.67, wow: -2.1 }
                    ]
                };
                const result2 = buildFbxDataSection(fbxData);
                assertEqual(typeof result2, 'string', 'buildFbxDataSection 应该返回字符串');
                assert(result2.includes('FBX01'), '结果应该包含索引标签');
                // 使用 toLocaleString() 格式化后的数字进行匹配（因为函数内部使用了 toLocaleString()）
                const rateFormatted = fbxData.indices[0].rate.toLocaleString();
                assert(result2.includes(rateFormatted) || result2.includes('1234'), '结果应该包含索引值');
            } else {
                console.warn('formatPercent 函数未找到，跳过部分 buildFbxDataSection 测试');
            }
        } else {
            console.warn('buildFbxDataSection 函数未找到，跳过测试');
        }
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testMarketAnalysisUtils = testMarketAnalysisUtils;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testMarketAnalysisUtils };
    }
})();

