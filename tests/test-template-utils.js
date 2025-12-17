/**
 * 模板工具函数测试
 * 测试 vendor/template-utils.js 中的函数
 */

(function() {
    'use strict';

    // 加载函数（根据环境）
    let generateBookingDataTable, generateAiConfigPanels, generateMarketDataInfoBlocks,
        generateVesselVoyageModal, generatePodWharfModal, generateStandardizationModals,
        initMarketAnalysisPage, bindMarketDataRefreshButtons;
    
    if (typeof window !== 'undefined') {
        // 浏览器环境，函数应该是全局的
        generateBookingDataTable = window.generateBookingDataTable;
        generateAiConfigPanels = window.generateAiConfigPanels;
        generateMarketDataInfoBlocks = window.generateMarketDataInfoBlocks;
        generateVesselVoyageModal = window.generateVesselVoyageModal;
        generatePodWharfModal = window.generatePodWharfModal;
        generateStandardizationModals = window.generateStandardizationModals;
        initMarketAnalysisPage = window.initMarketAnalysisPage;
        bindMarketDataRefreshButtons = window.bindMarketDataRefreshButtons;
    }

    /**
     * 模板工具函数测试套件
     */
    function testTemplateUtils() {
        console.log('测试 generateBookingDataTable 函数...');
        if (typeof generateBookingDataTable === 'function') {
            const html = generateBookingDataTable();
            assertNotNull(html, 'generateBookingDataTable 应该返回 HTML 字符串');
            assert(html.includes('booking-data-table'), 'HTML 应该包含 booking-data-table 类');
            assert(html.includes('bookingDataBody'), 'HTML 应该包含 bookingDataBody ID');
            assert(html.includes('其他影响因素'), 'HTML 应该包含"其他影响因素"标题');
            assert(html.includes('收货情况'), 'HTML 应该包含"收货情况"行');
            assert(html.includes('码头情况'), 'HTML 应该包含"码头情况"行');
        } else {
            console.warn('generateBookingDataTable 函数未找到，跳过测试');
        }

        console.log('\n测试 generateAiConfigPanels 函数...');
        if (typeof generateAiConfigPanels === 'function') {
            const html = generateAiConfigPanels();
            assertNotNull(html, 'generateAiConfigPanels 应该返回 HTML 字符串');
            assert(html.includes('ai-tabs'), 'HTML 应该包含 ai-tabs 类');
            assert(html.includes('ai-tab-btn'), 'HTML 应该包含 ai-tab-btn 类');
            assert(html.includes('data-provider="deepseek"'), 'HTML 应该包含 deepseek 提供商');
            assert(html.includes('data-provider="kimi"'), 'HTML 应该包含 kimi 提供商');
            assert(html.includes('data-provider="qwen"'), 'HTML 应该包含 qwen 提供商');
            assert(html.includes('ai-panel'), 'HTML 应该包含 ai-panel 类');
            assert(html.includes('apiKeyInput'), 'HTML 应该包含 API Key 输入框');
        } else {
            console.warn('generateAiConfigPanels 函数未找到，跳过测试');
        }

        console.log('\n测试 generateMarketDataInfoBlocks 函数...');
        if (typeof generateMarketDataInfoBlocks === 'function') {
            const html = generateMarketDataInfoBlocks();
            assertNotNull(html, 'generateMarketDataInfoBlocks 应该返回 HTML 字符串');
            assert(html.includes('bunker-info'), 'HTML 应该包含 bunker-info 类');
            assert(html.includes('index-info'), 'HTML 应该包含 index-info 类');
            assert(html.includes('bunkerStatus'), 'HTML 应该包含 bunkerStatus ID');
            assert(html.includes('wciStatus'), 'HTML 应该包含 wciStatus ID');
            assert(html.includes('fbxStatus'), 'HTML 应该包含 fbxStatus ID');
        } else {
            console.warn('generateMarketDataInfoBlocks 函数未找到，跳过测试');
        }

        console.log('\n测试 generateVesselVoyageModal 函数...');
        if (typeof generateVesselVoyageModal === 'function') {
            const html = generateVesselVoyageModal();
            assertNotNull(html, 'generateVesselVoyageModal 应该返回 HTML 字符串');
            assert(html.includes('modal'), 'HTML 应该包含 modal 类');
        } else {
            console.warn('generateVesselVoyageModal 函数未找到，跳过测试');
        }

        console.log('\n测试 generatePodWharfModal 函数...');
        if (typeof generatePodWharfModal === 'function') {
            const html = generatePodWharfModal();
            assertNotNull(html, 'generatePodWharfModal 应该返回 HTML 字符串');
            assert(html.includes('modal'), 'HTML 应该包含 modal 类');
        } else {
            console.warn('generatePodWharfModal 函数未找到，跳过测试');
        }

        console.log('\n测试 generateStandardizationModals 函数...');
        if (typeof generateStandardizationModals === 'function') {
            const html = generateStandardizationModals();
            assertNotNull(html, 'generateStandardizationModals 应该返回 HTML 字符串');
            assert(html.includes('modal'), 'HTML 应该包含 modal 类');
        } else {
            console.warn('generateStandardizationModals 函数未找到，跳过测试');
        }

        console.log('\n测试 initMarketAnalysisPage 函数...');
        if (typeof initMarketAnalysisPage === 'function') {
            // 创建测试 DOM 元素
            const container = document.createElement('div');
            container.id = 'bookingDataTableContainer';
            document.body.appendChild(container);
            
            const aiContainer = document.createElement('div');
            aiContainer.id = 'aiConfigPanelsContainer';
            document.body.appendChild(aiContainer);
            
            const marketContainer = document.createElement('div');
            marketContainer.id = 'marketDataInfoBlocksContainer';
            document.body.appendChild(marketContainer);

            // 测试函数调用（不传入参数，测试默认行为）
            try {
                initMarketAnalysisPage({});
                assert(true, 'initMarketAnalysisPage 应该可以无错误调用');
            } catch (error) {
                assert(false, `initMarketAnalysisPage 调用失败: ${error.message}`);
            }

            // 清理
            document.body.removeChild(container);
            document.body.removeChild(aiContainer);
            document.body.removeChild(marketContainer);
        } else {
            console.warn('initMarketAnalysisPage 函数未找到，跳过测试');
        }

        console.log('\n测试 bindMarketDataRefreshButtons 函数...');
        if (typeof bindMarketDataRefreshButtons === 'function') {
            // 创建测试 DOM 元素
            const refreshBunkerBtn = document.createElement('button');
            refreshBunkerBtn.id = 'refreshBunkerBtn';
            document.body.appendChild(refreshBunkerBtn);
            
            const refreshWciBtn = document.createElement('button');
            refreshWciBtn.id = 'refreshWciBtn';
            document.body.appendChild(refreshWciBtn);
            
            const refreshFbxBtn = document.createElement('button');
            refreshFbxBtn.id = 'refreshFbxBtn';
            document.body.appendChild(refreshFbxBtn);

            // 测试函数调用
            try {
                bindMarketDataRefreshButtons({
                    fetchBunkerData: () => Promise.resolve(),
                    fetchWciData: () => Promise.resolve(),
                    fetchFbxData: () => Promise.resolve()
                });
                assert(true, 'bindMarketDataRefreshButtons 应该可以无错误调用');
            } catch (error) {
                assert(false, `bindMarketDataRefreshButtons 调用失败: ${error.message}`);
            }

            // 清理
            document.body.removeChild(refreshBunkerBtn);
            document.body.removeChild(refreshWciBtn);
            document.body.removeChild(refreshFbxBtn);
        } else {
            console.warn('bindMarketDataRefreshButtons 函数未找到，跳过测试');
        }
    }

    // 导出测试函数
    if (typeof window !== 'undefined') {
        window.testTemplateUtils = testTemplateUtils;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { testTemplateUtils };
    }
})();
