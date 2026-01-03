/**
 * PDF 处理工具函数
 * 
 * 从 market-analysis-utils.js 拆分出来的 PDF 处理相关函数
 * 包含：PDF.js 加载、PDF 文本提取、SCFI 表格解析、市场报告处理
 * 
 * 依赖：
 * - debug-utils.js: debugLog, debugWarn, debugError
 * 
 * 全局变量依赖（需要在页面中声明）：
 * - loadedScripts, loadedWorkers, pdfJsReady, pdfJsLoadingPromise
 * - marketReports, marketReportList
 */

(function() {
    'use strict';

    // ============================================
    // PDF.js 加载相关函数
    // ============================================

    /**
     * 加载脚本文件
     * @param {string} url - 脚本 URL
     * @returns {Promise<void>}
     */
    async function loadScript(url) {
        if (typeof loadedScripts === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('loadedScripts 未定义，请在页面中声明');
            }
            return;
        }
        if (loadedScripts.has(url)) {
            return;
        }
        const isFileProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:');
        // file:// 场景下，使用 <script src> 直接加载，避免 fetch 被 CORS 拦截
        if (isFileProtocol && !url.startsWith('http')) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = url;
                script.onload = () => resolve();
                script.onerror = (err) => reject(new Error(`无法加载脚本: ${url}, ${err?.message || err}`));
                document.head.appendChild(script);
            });
            loadedScripts.add(url);
            return;
        }

        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`无法加载脚本: ${url}`);
        }
        const code = await response.text();
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = code;
        document.head.appendChild(script);
        loadedScripts.add(url);
    }

    /**
     * 将Worker加载为Blob URL
     * @param {string} url - Worker URL
     * @returns {Promise<string>} Blob URL
     */
    async function loadWorkerAsBlob(url) {
        if (typeof loadedWorkers === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('loadedWorkers 未定义，请在页面中声明');
            }
            return null;
        }
        if (loadedWorkers.has(url)) {
            return loadedWorkers.get(url);
        }
        const isFileProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:');
        // file:// 场景下优先直接返回远程 CDN（避免本地 worker 的 fetch 被拦截）
        if (isFileProtocol && !url.startsWith('http')) {
            return null; // 由上层改用 CDN workerSrc
        }
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`无法加载Worker: ${url}`);
        }
        const code = await response.text();
        const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        loadedWorkers.set(url, blobUrl);
        return blobUrl;
    }

    /**
     * 确保PDF.js已加载
     * @returns {Promise<void>}
     */
    async function ensurePdfJsLoaded() {
        if (typeof pdfJsReady === 'undefined' || typeof pdfJsLoadingPromise === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('pdfJsReady 或 pdfJsLoadingPromise 未定义，请在页面中声明');
            }
            return;
        }
        if (typeof window.pdfjsLib !== 'undefined') {
            if (!pdfJsReady && pdfjsLib.GlobalWorkerOptions) {
                // 优先使用本地 worker，失败时使用 CDN
                try {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
                } catch (e) {
                    // 如果本地 worker 失败，使用 CDN
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                pdfJsReady = true;
            }
            return;
        }
        if (pdfJsLoadingPromise) {
            return pdfJsLoadingPromise;
        }
        pdfJsLoadingPromise = (async () => {
            const isFileProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:');
            const sources = isFileProtocol
                ? [
                    // file:// 场景直接使用 CDN，避免本地 fetch 被 CORS 拦截
                    {
                        script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
                        worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                    },
                    {
                        script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
                        worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
                    },
                    {
                        script: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
                        worker: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
                    }
                ]
                : [
                    {
                        script: 'vendor/pdf.min.js',  // 本地文件优先
                        worker: 'vendor/pdf.worker.min.js'
                    },
                    {
                        script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
                        worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                    },
                    {
                        script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
                        worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
                    },
                    {
                        script: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
                        worker: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
                    }
                ];
            let lastError = null;
            const errors = [];
            for (const src of sources) {
                try {
                    await loadScript(src.script);
                    if (window.pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                        // 优先使用本地 worker，失败时使用 CDN
                        if (src.worker.startsWith('vendor/') && !isFileProtocol) {
                            // 尝试使用本地 worker
                            try {
                                pdfjsLib.GlobalWorkerOptions.workerSrc = src.worker;
                            } catch (e) {
                                // 如果本地 worker 失败，使用 CDN
                                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                            }
                        } else {
                            // 直接使用 CDN URL；file:// 场景也走 CDN
                            pdfjsLib.GlobalWorkerOptions.workerSrc = src.worker;
                        }
                        pdfJsReady = true;
                        lastError = null;
                        if (window.debugLog) {
                            window.debugLog('PDF.js 加载成功，来源:', src.script);
                        }
                        break;
                    } else {
                        // 脚本加载成功，但 pdfjsLib 未定义
                        const error = new Error(`脚本已加载但 pdfjsLib 未定义: ${src.script}`);
                        lastError = error;
                        errors.push(`${src.script}: ${error.message}`);
                        if (window.debugWarn) {
                            window.debugWarn('PDF.js 脚本加载但库未定义:', src.script);
                        }
                    }
                } catch (error) {
                    lastError = error;
                    errors.push(`${src.script}: ${error.message || error}`);
                    if (window.debugWarn) {
                        window.debugWarn('PDF.js 加载失败，尝试下一个源:', src.script, error);
                    }
                }
            }
            if (!pdfJsReady) {
                pdfJsLoadingPromise = null;
                const errorDetails = errors.length > 0 ? '\n\n失败详情：\n' + errors.join('\n') : '';
                throw new Error('PDF 解析库加载失败: 所有源都失败' + errorDetails);
            }
        })();
        return pdfJsLoadingPromise;
    }

    // ============================================
    // PDF 文本提取函数
    // ============================================

    /**
     * 从PDF文件中提取文本
     * @param {File} file - PDF文件
     * @returns {Promise<string>} 提取的文本
     */
    async function extractTextFromPdf(file) {
        try {
            await ensurePdfJsLoaded();
        } catch (error) {
            throw new Error('PDF 解析库加载失败：' + (error.message || error) + '。请刷新页面重试。');
        }
        if (!window.pdfjsLib || !pdfjsLib.getDocument) {
            throw new Error('PDF 解析库尚未加载，请稍后重试');
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            const maxPages = Math.min(pdf.numPages, 20);
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map(item => item.str).join(' ');
                text += pageText + '\n';
                if (text.length > 20000) break;
            }
            return text.trim();
        } catch (error) {
            throw new Error('PDF 文件解析失败：' + (error.message || error));
        }
    }

    /**
     * 从PDF的指定页面提取文本（用于提取特定页面内容）
     * @param {File} file - PDF文件
     * @param {number} pageNumber - 页码（从1开始）
     * @returns {Promise<string>} 提取的文本
     */
    async function extractTextFromPdfPage(file, pageNumber) {
        try {
            await ensurePdfJsLoaded();
        } catch (error) {
            throw new Error('PDF 解析库加载失败：' + (error.message || error) + '。请刷新页面重试。');
        }
        if (!window.pdfjsLib || !pdfjsLib.getDocument) {
            throw new Error('PDF 解析库尚未加载，请稍后重试');
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            if (pageNumber < 1 || pageNumber > pdf.numPages) {
                return '';
            }
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            return pageText.trim();
        } catch (error) {
            throw new Error('PDF 页面解析失败：' + (error.message || error));
        }
    }

    // ============================================
    // SCFI 表格解析函数
    // ============================================

    /**
     * 解析 SCFI 表格数据（从 Freight Rates Watch 表格）
     * @param {string} text - PDF 文本内容
     * @returns {Object|null} 解析后的 SCFI 数据
     */
    function parseScfiTable(text) {
        if (!text) {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('[SCFI] parseScfiTable: 文本为空');
            }
            return null;
        }
        
        if (typeof window.debugLog === 'function') {
            window.debugLog('[SCFI] parseScfiTable: 开始解析，文本长度:', text.length);
            window.debugLog('[SCFI] parseScfiTable: 文本预览:', text.substring(0, 500));
        }
        
        // 优先查找包含表头"Shanghai Container Freight Index"和日期列"28-Nov-25"的表格区域
        // 这是实际的表格开始位置
        const tableHeaderPattern = /Shanghai Container Freight Index[\s\S]{0,500}?\d{1,2}[-/]\w{3}[-/]\d{2,4}/i;
        const tableHeaderMatch = text.match(tableHeaderPattern);
        if (tableHeaderMatch) {
            // 从表头开始，提取到表格结束（查找最后一个航线数据，避免包含描述性文字）
            const headerIndex = text.indexOf(tableHeaderMatch[0]);
            // 查找表格结束位置：最后一个航线名称后的合理距离，或者遇到明显的描述性文字
            const endMarkers = [
                /The Asia-Europe SCFIS rate/i,
                /Carriers.*December GRI/i,
                /Port congestion/i,
                /Asia-Europe Market/i,
                /Transpacific Market/i
            ];
            
            let endIndex = text.length;
            for (const marker of endMarkers) {
                const markerMatch = text.substring(headerIndex).match(marker);
                if (markerMatch && markerMatch.index < 50000) {
                    endIndex = Math.min(endIndex, headerIndex + markerMatch.index);
                }
            }
            
            // 如果没找到结束标记，提取最多40000字符（表格通常不会超过这个长度）
            const tableText = text.substring(headerIndex, Math.min(endIndex, headerIndex + 40000));
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 找到表格表头，提取表格区域，长度:', tableText.length);
            }
            return parseScfiTableFromText(tableText);
        }
        
        // 如果没找到表头，尝试查找包含日期列的区域
        const datePattern = /\d{1,2}[-/]\w{3}[-/]\d{2,4}/g;
        let bestMatch = null;
        let bestScore = 0;
        let dateMatch;
        
        while ((dateMatch = datePattern.exec(text)) !== null) {
            const dateIndex = dateMatch.index;
            // 检查这个日期附近是否包含表格特征（航线名称、单位等）
            const context = text.substring(Math.max(0, dateIndex - 2000), Math.min(text.length, dateIndex + 30000));
            let score = 0;
            if (context.includes('Shanghai Container Freight Index') || context.includes('SCFI')) score += 10;
            if (context.includes('$/teu') || context.includes('$/FEU')) score += 5;
            if (context.includes('Europe') || context.includes('USWC') || context.includes('USEC')) score += 3;
            if (context.includes('Base port')) score += 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { index: dateIndex, context: context };
            }
        }
        
        if (bestMatch && bestScore >= 8) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 从日期列附近提取表格（评分:', bestScore, '），长度:', bestMatch.context.length);
            }
            return parseScfiTableFromText(bestMatch.context);
        }
        
        // 最后尝试从 "Freight Rates Watch" 提取，但限制范围避免包含描述性文字
        const freightRatesMatch = text.match(/Freight Rates Watch[\s\S]{0,40000}/i);
        if (freightRatesMatch) {
            // 查找表格结束位置
            const freightText = freightRatesMatch[0];
            const endMarkers = [
                /The Asia-Europe SCFIS rate/i,
                /Carriers.*December GRI/i,
                /Port congestion/i
            ];
            
            let endPos = freightText.length;
            for (const marker of endMarkers) {
                const markerMatch = freightText.match(marker);
                if (markerMatch && markerMatch.index < 30000) {
                    endPos = Math.min(endPos, markerMatch.index);
                }
            }
            
            const tableText = freightText.substring(0, endPos);
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 从 "Freight Rates Watch" 提取表格（已排除描述性文字），长度:', tableText.length);
            }
            return parseScfiTableFromText(tableText);
        }
        
        // 查找 "SCFI : Shanghai to" 后面的表格数据
        const scfiTableMatch = text.match(/SCFI\s*:\s*Shanghai\s+to[^\n]*[\s\S]{0,30000}/i);
        if (scfiTableMatch) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 找到 "SCFI : Shanghai to" 表格区域，长度:', scfiTableMatch[0].length);
            }
            return parseScfiTableFromText(scfiTableMatch[0]);
        }
        
        // 查找 "Freight Rates Watch" 或 "SCFI" 关键词
        const scfiMatch = text.match(/Freight Rates Watch[\s\S]{0,10000}?SCFI[\s\S]{0,20000}/i);
        if (!scfiMatch) {
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('[SCFI] 未找到 "Freight Rates Watch" 关键词，尝试直接查找 SCFI');
                }
            // 尝试直接查找 SCFI 表格
            const scfiDirectMatch = text.match(/SCFI[\s\S]{0,20000}/i);
            if (!scfiDirectMatch) {
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('[SCFI] 未找到 SCFI 关键词');
                }
                return null;
            }
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 找到 SCFI 关键词，开始解析...');
            }
            return parseScfiTableFromText(scfiDirectMatch[0]);
        }
        if (typeof window.debugLog === 'function') {
            window.debugLog('[SCFI] 找到 "Freight Rates Watch"，开始解析...');
        }
        
        // 尝试查找包含航线名称的区域（如 Europe, USWC, India 等）
        // 如果提取的文本不包含航线名称，尝试从更大范围提取
        let tableText = scfiMatch[0];
        
        // 检查是否包含常见的航线关键词
        const routeKeywords = ['Europe', 'USWC', 'USEC', 'India', 'Persian Gulf', 'Australia', 'Africa', 'America', 'Japan', 'Korea', 'Southeast Asia'];
        const hasRouteKeywords = routeKeywords.some(keyword => tableText.includes(keyword));
        
        if (!hasRouteKeywords) {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('[SCFI] 提取的文本不包含航线关键词，尝试从更大范围提取...');
            }
            // 尝试从 "Freight Rates Watch" 后面提取更多内容
            const extendedMatch = text.match(/Freight Rates Watch[\s\S]{0,50000}/i);
            if (extendedMatch) {
                tableText = extendedMatch[0];
                if (typeof window.debugLog === 'function') {
                    window.debugLog('[SCFI] 使用扩展范围提取，长度:', tableText.length);
                }
            }
        }
        
        return parseScfiTableFromText(tableText);
    }

    /**
     * 从文本中解析 SCFI 表格数据
     * @param {string} tableText - 表格文本
     * @returns {Object|null} 解析后的数据
     */
    function parseScfiTableFromText(tableText) {
        if (!tableText) {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('[SCFI] parseScfiTableFromText: 表格文本为空');
            }
            return null;
        }
        
        if (typeof window.debugLog === 'function') {
            window.debugLog('[SCFI] parseScfiTableFromText: 开始解析表格文本，长度:', tableText.length);
        }
        
        // 输出完整文本用于调试（限制长度避免控制台过载）
        if (tableText.length > 0) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 完整提取文本（前1000字符）:', tableText.substring(0, 1000));
            }
            if (tableText.length > 1000) {
                if (typeof window.debugLog === 'function') {
                    window.debugLog('[SCFI] 完整提取文本（后500字符）:', tableText.substring(tableText.length - 500));
                }
            }
        }
        
        const scfiData = {
            index: null,
            routes: []
        };
        
        // 查找 SCFI 指数值
        // 根据提取的文本格式：... 1,403 SCFI（价格在SCFI前）
        const scfiIndexPatterns = [
            // 匹配：数字 SCFI（价格在SCFI前）
            /(\d{1,3}(?:,\d{3})+)\s+SCFI\b/i,
            /(\d{1,4}(?:\.\d+)?)\s+SCFI\b/i,
            // 匹配：SCFI 数字（传统格式）
            /SCFI[:\s]+(\d{1,3}(?:,\d{3})+)/i,
            /SCFI\s+(\d{1,3}(?:,\d{3})+)/i,
            /Shanghai Container Freight Index[:\s]+(\d{1,3}(?:,\d{3})+)/i,
            /SCFI[:\s]+(\d{1,4}(?:\.\d+)?)/i,
            /SCFI\s+(\d{1,4}(?:\.\d+)?)/i
        ];
        
        for (const pattern of scfiIndexPatterns) {
            const match = tableText.match(pattern);
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                // SCFI 指数通常在 500-10000 之间
                if (value >= 500 && value <= 10000) {
                    scfiData.index = value;
                    if (typeof window.debugLog === 'function') {
                        window.debugLog('[SCFI] 找到 SCFI 指数:', value);
                    }
                    
                    // 提取SCFI指数的历史数据
                    const scfiIndex = match.index + match[0].indexOf(match[1]);
                    const beforeScfi = tableText.substring(Math.max(0, scfiIndex - 800), scfiIndex);
                    
                    // 提取所有价格数字和百分比（与航线数据格式相同）
                    const allNumbers = [];
                    const allPercentages = [];
                    
                    const pricePattern = /(\d{1,3}(?:,\d{3})+|\d{1,4}(?:\.\d+)?)/g;
                    let priceMatch;
                    while ((priceMatch = pricePattern.exec(beforeScfi)) !== null) {
                        const priceStr = priceMatch[1].replace(/[\s,]/g, '');
                        const price = parseFloat(priceStr);
                        if (price >= 500 && price <= 10000) {
                            allNumbers.push({
                                index: priceMatch.index,
                                value: price
                            });
                        }
                    }
                    
                    const percentPattern = /([-+]?\d+\.?\d*)%/g;
                    let percentMatch;
                    while ((percentMatch = percentPattern.exec(beforeScfi)) !== null) {
                        const percentValue = parseFloat(percentMatch[1]);
                        allPercentages.push({
                            index: percentMatch.index,
                            value: percentValue
                        });
                    }
                    
                    // 按索引排序（从右到左，索引大的在前）
                    allNumbers.sort((a, b) => b.index - a.index);
                    allPercentages.sort((a, b) => b.index - a.index);
                    
                    // 根据实际PDF格式，从左到右是：百分比 价格 百分比 价格...
                    // 例如：-37.2% 2,234 -2.9% 1,445 -9.5% 1,551 0.7% 1,394
                    // 从右到左看，顺序是：价格 百分比 价格 百分比...
                    // 排序后（索引从大到小）：
                    // allNumbers[0] = 1,394 (1周价格，索引最大)
                    // allPercentages[0] = 0.7% (1周百分比，索引第二大)
                    // allNumbers[1] = 1,551 (1月价格，索引第三大)
                    // allPercentages[1] = -9.5% (1月百分比，索引第四大)
                    // allNumbers[2] = 1,445 (3月价格)
                    // allPercentages[2] = -2.9% (3月百分比)
                    // allNumbers[3] = 2,234 (1年价格)
                    // allPercentages[3] = -37.2% (1年百分比)
                    
                    // 配对策略：由于格式是"百分比 价格"（从左到右），从右到左看是"价格 百分比"
                    // 排序后索引从大到小，所以价格索引 > 对应百分比的索引
                    // 但实际配对关系：allNumbers[0] 应该和 allPercentages[0] 配对（都是索引最大的两个）
                    // 验证：allNumbers[i].index > allPercentages[i].index 应该成立
                    
                    // 智能配对：为每个价格找到索引最接近的百分比
                    // 由于格式是"百分比 价格"（从左到右），所以价格索引 > 百分比索引
                    // 为每个价格找到索引小于它但最接近的百分比
                    const pairs = [];
                    for (let i = 0; i < allNumbers.length; i++) {
                        const price = allNumbers[i];
                        // 找到索引小于price.index的所有百分比
                        const candidatePercentages = allPercentages.filter(p => p.index < price.index);
                        if (candidatePercentages.length > 0) {
                            // 找到索引最大的那个（最接近价格）
                            const matchedPercent = candidatePercentages.reduce((max, p) => p.index > max.index ? p : max);
                            // 检查这个百分比是否已经被使用
                            const alreadyUsed = pairs.some(p => p.changeIndex === matchedPercent.index);
                            if (!alreadyUsed) {
                                pairs.push({
                                    price: price.value,
                                    change: matchedPercent.value,
                                    priceIndex: price.index,
                                    changeIndex: matchedPercent.index
                                });
                            }
                        }
                    }
                    
                    // 按价格索引从大到小排序（从右到左）
                    pairs.sort((a, b) => b.priceIndex - a.priceIndex);
                    
                    // 根据实际顺序映射：从右到左是 1周、1月、3月、1年
                    // pairs[0] = 1周, pairs[1] = 1月, pairs[2] = 3月, pairs[3] = 1年
                    if (pairs.length >= 1) {
                        // 1周数据
                        scfiData.indexWeek1 = pairs[0].price;
                        scfiData.indexWeek1Change = pairs[0].change;
                    }
                    if (pairs.length >= 2) {
                        // 1月数据
                        scfiData.indexMonth1 = pairs[1].price;
                        scfiData.indexMonth1Change = pairs[1].change;
                    }
                    if (pairs.length >= 3) {
                        // 3月数据
                        scfiData.indexQuarter3 = pairs[2].price;
                        scfiData.indexQuarter3Change = pairs[2].change;
                    }
                    if (pairs.length >= 4) {
                        // 1年数据
                        scfiData.indexYear1 = pairs[3].price;
                        scfiData.indexYear1Change = pairs[3].change;
                    }
                    
                    // 调试输出
                    if (typeof window.debugLog === 'function') {
                        window.debugLog('[SCFI] 提取的历史数据:', {
                            current: scfiData.index,
                            week1: scfiData.indexWeek1,
                            week1Change: scfiData.indexWeek1Change,
                            month1: scfiData.indexMonth1,
                            month1Change: scfiData.indexMonth1Change,
                            quarter3: scfiData.indexQuarter3,
                            quarter3Change: scfiData.indexQuarter3Change,
                            year1: scfiData.indexYear1,
                            year1Change: scfiData.indexYear1Change,
                            allNumbers: allNumbers.map(n => ({ index: n.index, value: n.value })),
                            allPercentages: allPercentages.map(p => ({ index: p.index, value: p.value })),
                            beforeScfiPreview: beforeScfi.substring(Math.max(0, beforeScfi.length - 200))
                        });
                    }
                    
                    break;
                }
            }
        }
        
        // 如果还没找到，尝试从表格的第一行数据中提取
        if (!scfiData.index) {
            // 查找包含 "SCFI" 的文本，然后往前查找数字
            const scfiMatch = tableText.match(/\bSCFI\b/i);
            if (scfiMatch) {
                const scfiIndex = scfiMatch.index;
                const beforeScfi = tableText.substring(Math.max(0, scfiIndex - 800), scfiIndex);
                // 查找最后一个带逗号的数字（当前价格）
                const numMatch = beforeScfi.match(/(\d{1,3}(?:,\d{3})+)\s*$/);
                if (numMatch) {
                    const value = parseFloat(numMatch[1].replace(/,/g, ''));
                    if (value >= 500 && value <= 10000) {
                        scfiData.index = value;
                        if (typeof window.debugLog === 'function') {
                            window.debugLog('[SCFI] 从SCFI前找到指数:', value);
                        }
                        
                        // 提取SCFI指数的历史数据（格式与航线相同）
                        const allNumbers = [];
                        const allPercentages = [];
                        
                        // 提取所有价格数字
                        const pricePattern = /(\d{1,3}(?:,\d{3})+|\d{1,4}(?:\.\d+)?)/g;
                        let priceMatch;
                        while ((priceMatch = pricePattern.exec(beforeScfi)) !== null) {
                            const priceStr = priceMatch[1].replace(/[\s,]/g, '');
                            const price = parseFloat(priceStr);
                            if (price >= 500 && price <= 10000) {
                                allNumbers.push({
                                    index: priceMatch.index,
                                    value: price
                                });
                            }
                        }
                        
                        // 提取所有百分比
                        const percentPattern = /([-+]?\d+\.?\d*)%/g;
                        let percentMatch;
                        while ((percentMatch = percentPattern.exec(beforeScfi)) !== null) {
                            const percentValue = parseFloat(percentMatch[1]);
                            allPercentages.push({
                                index: percentMatch.index,
                                value: percentValue
                            });
                        }
                        
                        // 按索引排序（从右到左，索引大的在前）
                        allNumbers.sort((a, b) => b.index - a.index);
                        allPercentages.sort((a, b) => b.index - a.index);
                        
                        // 使用与上面相同的智能配对逻辑
                        // 为每个价格找到索引最接近的百分比
                        const pairs = [];
                        for (let i = 0; i < allNumbers.length; i++) {
                            const price = allNumbers[i];
                            // 找到索引小于price.index的所有百分比
                            const candidatePercentages = allPercentages.filter(p => p.index < price.index);
                            if (candidatePercentages.length > 0) {
                                // 找到索引最大的那个（最接近价格）
                                const matchedPercent = candidatePercentages.reduce((max, p) => p.index > max.index ? p : max);
                                // 检查这个百分比是否已经被使用
                                const alreadyUsed = pairs.some(p => p.changeIndex === matchedPercent.index);
                                if (!alreadyUsed) {
                                    pairs.push({
                                        price: price.value,
                                        change: matchedPercent.value,
                                        priceIndex: price.index,
                                        changeIndex: matchedPercent.index
                                    });
                                }
                            }
                        }
                        
                        // 按价格索引从大到小排序（从右到左）
                        pairs.sort((a, b) => b.priceIndex - a.priceIndex);
                        
                        // 根据实际顺序映射：从右到左是 1周、1月、3月、1年
                        if (pairs.length >= 1) {
                            scfiData.indexWeek1 = pairs[0].price;
                            scfiData.indexWeek1Change = pairs[0].change;
                        }
                        if (pairs.length >= 2) {
                            scfiData.indexMonth1 = pairs[1].price;
                            scfiData.indexMonth1Change = pairs[1].change;
                        }
                        if (pairs.length >= 3) {
                            scfiData.indexQuarter3 = pairs[2].price;
                            scfiData.indexQuarter3Change = pairs[2].change;
                        }
                        if (pairs.length >= 4) {
                            scfiData.indexYear1 = pairs[3].price;
                            scfiData.indexYear1Change = pairs[3].change;
                        }
                        
                        // 调试输出
                        if (typeof window.debugLog === 'function') {
                            window.debugLog('[SCFI] 备用方法提取的历史数据:', {
                                current: scfiData.index,
                                week1: scfiData.indexWeek1,
                                week1Change: scfiData.indexWeek1Change,
                                month1: scfiData.indexMonth1,
                                month1Change: scfiData.indexMonth1Change,
                                quarter3: scfiData.indexQuarter3,
                                quarter3Change: scfiData.indexQuarter3Change,
                                year1: scfiData.indexYear1,
                                year1Change: scfiData.indexYear1Change,
                                allNumbers: allNumbers.map(n => ({ index: n.index, value: n.value })),
                                allPercentages: allPercentages.map(p => ({ index: p.index, value: p.value })),
                                beforeScfiPreview: beforeScfi.substring(Math.max(0, beforeScfi.length - 200))
                            });
                        }
                    }
                }
            }
        }
        
        // 针对表格结构（行内包含名称、单位与 28-Nov-25 列价格），规整空白后基于名称捕获后续数字
        let tableArea = tableText;
        const startIdx = tableText.search(/Shanghai Container Freight Index|SCFI/i);
        if (startIdx >= 0) {
            tableArea = tableText.substring(startIdx);
        }
        // 规整多余空白为单个空格
        tableArea = tableArea.replace(/\s+/g, ' ').trim();
        if (typeof window.debugLog === 'function') {
            window.debugLog('[SCFI] 规整后的表格长度:', tableArea.length);
            window.debugLog('[SCFI] 规整后预览:', tableArea.substring(0, 300));
        }
        
        // 辅助：在名称前找到当前价格和历史数据（表格列顺序是反的：价格在名称前）
        // 格式：1年变化% 1年价格 3个月变化% 3个月价格 1个月变化% 1个月价格 1周变化% 1周价格 当前价格 单位 航线名称
        function findPriceBeforeName(area, namePattern) {
            // 先检查名称是否存在
            const nameRegex = new RegExp(namePattern, 'i');
            const nameMatch = area.match(nameRegex);
            if (!nameMatch) {
                return { found: false, reason: '名称未找到' };
            }
            
            const nameIndex = nameMatch.index;
            // 从名称往前查找（最多800个字符，以包含所有历史数据）
            const beforeName = area.substring(Math.max(0, nameIndex - 800), nameIndex);
            
            // 根据提取的文本格式：历史数据在单位前，单位在名称前
            // 格式：-53.8% 3,039 -5.2% 1,481 4.5% 1,344 2.7% 1,367 1,404 ˚ /teu Europe (Base port)
            // 顺序（从右到左）：当前价格 1周价格 1周变化% 1个月价格 1个月变化% 3个月价格 3个月变化% 1年价格 1年变化%
            
            // 查找单位（/teu 或 /FEU）
            const unitPattern = /[\/\s](?:teu|FEU|feu)\s*$/i;
            const unitMatch = beforeName.match(unitPattern);
            
            if (unitMatch) {
                // 确定单位
                const unitText = beforeName.substring(unitMatch.index);
                const unit = unitText.includes('/FEU') || unitText.includes('/feu') ? 'FEU' : 'TEU';
                
                // 在单位前提取所有数据
                const beforeUnit = beforeName.substring(0, unitMatch.index);
                
                // 解析格式：百分比 价格 百分比 价格 ... 当前价格
                // 从右到左：当前价格 -> 1周价格 1周变化% -> 1个月价格 1个月变化% -> 3个月价格 3个月变化% -> 1年价格 1年变化%
                
                // 提取所有数据：从左到右格式是"变化% 价格"，从右到左（在名称前）是"价格 变化%"
                // 格式：-53.8% 3,039 -5.2% 1,481 4.5% 1,344 2.7% 1,367 1,404 ˚ /teu
                // 从右到左：当前价格(1,404) -> 1周价格(1,367) 1周变化%(2.7%) -> 1个月价格(1,344) 1个月变化%(4.5%) -> 3个月价格(1,481) 3个月变化%(-5.2%) -> 1年价格(3,039) 1年变化%(-53.8%)
                
                // 提取所有数字和百分比（从右到左）
                const allNumbers = [];
                const allPercentages = [];
                
                // 提取所有价格数字（从右到左）
                const pricePattern = /(\d{1,3}(?:,\d{3})+|\d{1,4}(?:\.\d+)?)/g;
                let priceMatch;
                while ((priceMatch = pricePattern.exec(beforeUnit)) !== null) {
                    const priceStr = priceMatch[1].replace(/[\s,]/g, '');
                    const price = parseFloat(priceStr);
                    if (price >= 50 && price < 100000) {
                        allNumbers.push({
                            index: priceMatch.index,
                            value: price,
                            text: priceMatch[1]
                        });
                    }
                }
                
                // 提取所有百分比（从右到左）
                const percentPattern = /([-+]?\d+\.?\d*)%/g;
                let percentMatch;
                while ((percentMatch = percentPattern.exec(beforeUnit)) !== null) {
                    const percentValue = parseFloat(percentMatch[1]);
                    allPercentages.push({
                        index: percentMatch.index,
                        value: percentValue,
                        text: percentMatch[0]
                    });
                }
                
                // 按索引排序（从右到左，索引大的在前）
                allNumbers.sort((a, b) => b.index - a.index);
                allPercentages.sort((a, b) => b.index - a.index);
                
                if (allNumbers.length > 0) {
                    // 当前价格是最接近单位的（最后一个数字）
                    const currentPrice = allNumbers[0].value;
                    
                    const result = {
                        found: true,
                        price: currentPrice,
                        unit: unit,
                        // 历史数据
                        week1Price: null,
                        week1Change: null,
                        month1Price: null,
                        month1Change: null,
                        quarter3Price: null,
                        quarter3Change: null,
                        year1Price: null,
                        year1Change: null
                    };
                    
                    // 从右到左解析：当前价格 -> 1周价格 1周变化% -> 1个月价格 1个月变化% -> 3个月价格 3个月变化% -> 1年价格 1年变化%
                    // 格式：价格 变化% 价格 变化% ... 当前价格
                    // 所以：allNumbers[0] = 当前价格
                    //      allNumbers[1] = 1周价格，allPercentages[0] = 1周变化%（在1周价格前）
                    //      allNumbers[2] = 1个月价格，allPercentages[1] = 1个月变化%
                    //      allNumbers[3] = 3个月价格，allPercentages[2] = 3个月变化%
                    //      allNumbers[4] = 1年价格，allPercentages[3] = 1年变化%
                    
                    if (allNumbers.length >= 2) {
                        result.week1Price = allNumbers[1].value;
                        if (allPercentages.length >= 1 && allPercentages[0].index < allNumbers[1].index) {
                            result.week1Change = allPercentages[0].value;
                        }
                    }
                    
                    if (allNumbers.length >= 3) {
                        result.month1Price = allNumbers[2].value;
                        if (allPercentages.length >= 2 && allPercentages[1].index < allNumbers[2].index) {
                            result.month1Change = allPercentages[1].value;
                        }
                    }
                    
                    if (allNumbers.length >= 4) {
                        result.quarter3Price = allNumbers[3].value;
                        if (allPercentages.length >= 3 && allPercentages[2].index < allNumbers[3].index) {
                            result.quarter3Change = allPercentages[2].value;
                        }
                    }
                    
                    if (allNumbers.length >= 5) {
                        result.year1Price = allNumbers[4].value;
                        if (allPercentages.length >= 4 && allPercentages[3].index < allNumbers[4].index) {
                            result.year1Change = allPercentages[3].value;
                        }
                    }
                    
                    return result;
                }
            }
            
            // 如果没找到单位，尝试在名称前直接查找最后一个合理数字
            const pricePatterns = [
                /(\d{1,3}(?:,\d{3})+)\s+(?:[\/\s]*(?:teu|FEU|feu)\s*)?$/i,
                /(\d{1,4}(?:\.\d+)?)\s+(?:[\/\s]*(?:teu|FEU|feu)\s*)?$/i
            ];
            
            for (const pricePattern of pricePatterns) {
                const priceMatch = beforeName.match(pricePattern);
                if (priceMatch) {
                    const numStr = priceMatch[1].replace(/[\s,]/g, '');
                    const num = parseFloat(numStr);
                    if (num >= 50 && num < 100000) {
                        // 尝试从上下文确定单位
                        const context = beforeName.substring(Math.max(0, priceMatch.index - 50));
                        const unit = context.includes('/FEU') || context.includes('/feu') ? 'FEU' : 'TEU';
                        return { found: true, price: num, unit: unit, context: context };
                    }
                }
            }
            
            // 如果都没找到，返回上下文用于调试
            const context = beforeName.substring(Math.max(0, beforeName.length - 200));
            return { found: false, reason: '价格未找到', context: context };
        }
        
        // 航线匹配模式：先尝试完整格式，再尝试简化格式
        const routePatterns = [
            // 完整格式（带括号）
            { name: 'Europe (Base port)', patterns: ['Europe\\s*\\(Base\\s*port\\)', '\\bEurope\\b(?!\\s+(?:Market|SCFI|N\\.))'], unit: 'TEU' },
            { name: 'Mediterranean (Base port)', patterns: ['Mediterranean\\s*\\(Base\\s*port\\)', '\\bMediterranean\\b(?!\\s+US)'], unit: 'TEU' },
            { name: 'USWC (Base port)', patterns: ['USWC\\s*\\(Base\\s*port\\)', '\\bUSWC\\b(?!\\s*[/)])'], unit: 'FEU' },
            { name: 'USEC (Base port)', patterns: ['USEC\\s*\\(Base\\s*port\\)', '\\bUSEC\\b(?!\\s*[/)])'], unit: 'FEU' },
            { name: 'India (Nhava Sheva)', patterns: ['India\\s*\\(Nhava\\s*Sheva\\)', '\\bIndia\\b(?!\\s+\\()'], unit: 'TEU' },
            { name: 'Persian Gulf (Dubai)', patterns: ['Persian\\s*Gulf\\s*\\(Dubai\\)', 'Persian\\s*Gulf(?!\\s*\\()'], unit: 'TEU' },
            { name: 'Australia (Melbourne)', patterns: ['Australia\\s*\\(Melbourne\\)', '\\bAustralia\\b(?!\\s*\\()'], unit: 'TEU' },
            { name: 'East Africa (Mombasa)', patterns: ['East\\s*Africa\\s*\\(Mombasa\\)', 'East\\s*Africa(?!\\s*\\()'], unit: 'TEU' },
            { name: 'West Africa (Lagos)', patterns: ['West\\s*Africa\\s*\\(Lagos\\)', 'West\\s*Africa(?!\\s*\\()'], unit: 'TEU' },
            { name: 'South Africa (Durban)', patterns: ['South\\s*Africa\\s*\\(Durban\\)', 'South\\s*Africa(?!\\s*\\()'], unit: 'TEU' },
            { name: 'South America (Santos)', patterns: ['South\\s*America\\s*\\(Santos\\)', 'South\\s*America(?!\\s*\\()'], unit: 'FEU' },
            { name: 'Central America (Manzanillo)', patterns: ['Central\\s*America\\s*\\(Manzanillo\\)', 'Central\\s*America(?!\\s*\\()'], unit: 'TEU' },
            { name: 'West Japan (Osaka/Kobe)', patterns: ['West\\s*Japan\\s*\\(Osaka[\\s/]*Kobe\\)', 'West\\s*Japan(?!\\s*\\()'], unit: 'TEU' },
            { name: 'East Japan (Tokyo/Yokohama)', patterns: ['East\\s*Japan\\s*\\(Tokyo[\\s/]*Yokohama\\)', 'East\\s*Japan(?!\\s*\\()'], unit: 'TEU' },
            { name: 'Southeast Asia (Singapore)', patterns: ['Southeast\\s*Asia\\s*\\(Singapore\\)', 'Southeast\\s*Asia(?!\\s*\\()'], unit: 'TEU' },
            { name: 'Korea (Busan)', patterns: ['Korea\\s*\\(Busan\\)', '\\bKorea\\b(?!\\s*\\()'], unit: 'TEU' }
        ];
        
        routePatterns.forEach(pattern => {
            let found = false;
            // 尝试每个模式，直到找到匹配的
            for (const pat of pattern.patterns) {
                const result = findPriceBeforeName(tableArea, pat);
                if (result.found) {
                    // 检查是否已存在同名航线
                    const existing = scfiData.routes.find(r => r.name === pattern.name && r.unit === (result.unit || pattern.unit));
                    if (!existing) {
                        // 使用从表格中提取的单位，如果没有则使用预设单位
                        const unit = result.unit || pattern.unit;
                        const routeData = {
                            name: pattern.name,
                            current: result.price,
                            unit: unit
                        };
                        
                        // 添加历史数据
                        if (result.week1Price !== null) routeData.week1Price = result.week1Price;
                        if (result.week1Change !== null) routeData.week1Change = result.week1Change;
                        if (result.month1Price !== null) routeData.month1Price = result.month1Price;
                        if (result.month1Change !== null) routeData.month1Change = result.month1Change;
                        if (result.quarter3Price !== null) routeData.quarter3Price = result.quarter3Price;
                        if (result.quarter3Change !== null) routeData.quarter3Change = result.quarter3Change;
                        
                        // 检查是否是India/East Africa/Central America，这些航线没有上年数据
                        const routeNameLower = pattern.name.toLowerCase();
                        const hasNoYearData = routeNameLower.includes('india') || 
                                             routeNameLower.includes('nhava sheva') ||
                                             routeNameLower.includes('east africa') ||
                                             routeNameLower.includes('mombasa') ||
                                             routeNameLower.includes('central america') ||
                                             routeNameLower.includes('manzanillo');
                        
                        // 只有非India/East Africa/Central America的航线才添加上年数据
                        if (!hasNoYearData) {
                            if (result.year1Price !== null) routeData.year1Price = result.year1Price;
                            if (result.year1Change !== null) routeData.year1Change = result.year1Change;
                        }
                        // 对于India/East Africa/Central America，year1Price和year1Change保持为null，渲染时会显示"—"
                        
                        scfiData.routes.push(routeData);
                        if (typeof window.debugLog === 'function') {
                            window.debugLog(`[SCFI] ✓ 成功添加航线 ${pattern.name}: ${result.price} ${unit}`, 
                                result.week1Price ? `(1周: ${result.week1Price}, 1月: ${result.month1Price}, 3月: ${result.quarter3Price}, 1年: ${result.year1Price})` : '');
                        }
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                // 如果所有模式都失败，输出最后一个模式的调试信息
                const lastResult = findPriceBeforeName(tableArea, pattern.patterns[pattern.patterns.length - 1]);
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn(`[SCFI] 航线 ${pattern.name} ${lastResult.reason}`, lastResult.context ? `上下文: ${lastResult.context.substring(0, 100)}` : '');
                }
            }
        });
        
        // 如果还是没找到，尝试更宽松的解析
        if (scfiData.routes.length === 0) {
            // 将文本按行分割
            const lines = tableArea.split(/\s+/).filter(line => line.length > 0);
            if (typeof window.debugLog === 'function') {
                window.debugLog('[SCFI] 尝试宽松解析，文本片段数:', lines.length);
            }
            
            // 查找包含航线关键词和数字的行
            lines.forEach((line, index) => {
                if (line.length > 15 && line.length < 300) {
                    // 尝试匹配航线名称 + 数字的模式
                    const routeMatch = line.match(/([A-Za-z\s]+(?:\([^)]+\))?)\s+(\d{1,4}(?:[.,]\d+)?)/);
                    if (routeMatch) {
                        const routeName = routeMatch[1].trim();
                        const value = parseFloat(routeMatch[2].replace(/,/g, ''));
                        // 检查是否是合理的价格
                        if (value >= 100 && value < 100000 && routeName.length > 3) {
                            // 避免重复
                            const existing = scfiData.routes.find(r => r.name === routeName);
                            if (!existing) {
                                const unit = line.includes('/FEU') ? 'FEU' : (line.includes('/teu') || line.includes('/TEU') ? 'TEU' : '');
                                scfiData.routes.push({
                                    name: routeName,
                                    current: value,
                                    unit: unit
                                });
                            }
                        }
                    }
                }
            });
        }
        
        const result = scfiData.routes.length > 0 || scfiData.index ? scfiData : null;
        if (typeof window.debugLog === 'function') {
            window.debugLog('[SCFI] parseScfiTableFromText 最终结果:', result);
            if (result) {
                window.debugLog(`[SCFI] 解析成功: SCFI指数=${result.index}, 航线数=${result.routes.length}`);
            } else {
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('[SCFI] 解析失败: 未找到有效的 SCFI 数据');
                }
            }
        }
        return result;
    }

    // ============================================
    // 市场报告处理函数
    // ============================================

    /**
     * 处理市场报告文件
     * @param {File} file - PDF文件
     * @returns {Promise<void>}
     */
    async function handleMarketReportFile(file) {
        if (typeof marketReports === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('marketReports 未定义，请在页面中声明');
            }
            return;
        }
        try {
            const text = await extractTextFromPdf(file);
            let scfiData = null;
            
            // 尝试从第6页提取 SCFI 表格
            try {
                const page6Text = await extractTextFromPdfPage(file, 6);
                if (page6Text) {
                    if (window.debugLog) {
                        window.debugLog('第6页文本提取成功，长度:', page6Text.length);
                        window.debugLog('第6页文本预览:', page6Text.substring(0, 1000));
                    }
                    scfiData = parseScfiTable(page6Text);
                    if (window.debugLog) {
                        window.debugLog('从第6页解析 SCFI 结果:', scfiData);
                    }
                    // 如果第6页没找到，尝试从全文搜索
                    if (!scfiData) {
                        if (window.debugLog) {
                            window.debugLog('第6页未找到 SCFI，尝试从全文搜索...');
                        }
                        scfiData = parseScfiTable(text);
                        if (window.debugLog) {
                            window.debugLog('从全文解析 SCFI 结果:', scfiData);
                        }
                    }
                } else {
                    if (window.debugWarn) {
                        window.debugWarn('第6页文本为空，从全文搜索...');
                    }
                    // 如果第6页提取失败，从全文搜索
                    scfiData = parseScfiTable(text);
                    if (window.debugLog) {
                        window.debugLog('从全文解析 SCFI 结果:', scfiData);
                    }
                }
            } catch (error) {
                if (window.debugWarn) {
                    window.debugWarn('提取 SCFI 数据失败，尝试从全文搜索:', error);
                }
                scfiData = parseScfiTable(text);
                if (window.debugLog) {
                    window.debugLog('从全文解析 SCFI 结果（错误后）:', scfiData);
                }
            }
            
            if (text) {
                marketReports.push({
                    name: file.name,
                    text,
                    textLength: text.length,
                    scfiData: scfiData || undefined
                });
            }
            
            // 如果找到 SCFI 数据，触发更新事件
            if (scfiData && typeof window !== 'undefined' && typeof window.onScfiDataExtracted === 'function') {
                window.onScfiDataExtracted(scfiData, file.name);
            }
        } catch (error) {
            if (window.debugError) {
                window.debugError('解析PDF失败', file.name, error);
            }
            // 抛出异常，由调用方处理（更灵活的错误处理机制）
            throw new Error(`解析 ${file.name} 失败：${error.message || error}`);
        }
    }

    /**
     * 渲染市场报告列表
     */
    function renderMarketReportList() {
        if (typeof marketReportList === 'undefined' || !marketReportList) return;
        if (typeof marketReports === 'undefined' || !marketReports.length) {
            marketReportList.innerHTML = '<li>尚未载入市场报告</li>';
            return;
        }
        marketReportList.innerHTML = marketReports.map(report => `
            <li>
                <strong>${report.name}</strong>
                <span>${report.textLength} 字</span>
            </li>
        `).join('');
    }

    // ============================================
    // 导出到全局
    // ============================================
    
    if (typeof window !== 'undefined') {
        window.loadScript = window.loadScript || loadScript;
        window.loadWorkerAsBlob = window.loadWorkerAsBlob || loadWorkerAsBlob;
        window.ensurePdfJsLoaded = window.ensurePdfJsLoaded || ensurePdfJsLoaded;
        window.extractTextFromPdf = window.extractTextFromPdf || extractTextFromPdf;
        window.extractTextFromPdfPage = window.extractTextFromPdfPage || extractTextFromPdfPage;
        window.parseScfiTable = window.parseScfiTable || parseScfiTable;
        window.parseScfiTableFromText = window.parseScfiTableFromText || parseScfiTableFromText;
        window.handleMarketReportFile = window.handleMarketReportFile || handleMarketReportFile;
        window.renderMarketReportList = window.renderMarketReportList || renderMarketReportList;
    }

})();

