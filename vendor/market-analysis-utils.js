/**
 * 市场分析工具共享函数文件
 * 用于 001-04-market-analysis.html 和 365-04-market-watch.html
 *
 * 包含：
 * - 数据工具函数（normalizeDestinationValue, registerRouteLabel, getRouteLabel等）
 * - 周别处理函数（parseWeekText, getWeekRange, getWeekDateRange等）
 * - PDF处理函数（loadScript, ensurePdfJsLoaded, extractTextFromPdf等）
 * - 市场数据抓取函数（fetchBunkerData, fetchCcfiData, fetchWciData, fetchFbxData等）
 * - 其他共享工具函数
 */

// ============================================
// 全局配置
// ============================================

// 注意：getDebugMode 和 getCachedDebugMode 函数已在 vendor/debug-utils.js 中定义
// 如果 debug-utils.js 已加载，直接使用；否则提供降级实现
if (typeof window !== 'undefined' && typeof window.getCachedDebugMode === 'undefined') {
    // 降级实现（仅在 debug-utils.js 未加载时使用）
    let _cachedDebugMode = null;
    window.getCachedDebugMode = function() {
        if (_cachedDebugMode === null) {
            if (typeof window !== 'undefined') {
                try {
                    _cachedDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
                } catch (e) {
                    _cachedDebugMode = false;
                }
            } else {
                _cachedDebugMode = false;
            }
        }
        return _cachedDebugMode;
    };
}

// ============================================
// 数据工具函数
// ============================================

/**
 * 规范化目的地值
 * @param {any} value - 原始值
 * @returns {string} 规范化后的字符串，如果为空则返回'未分配'
 */
function normalizeDestinationValue(value) {
    const text = String(value ?? '').trim();
    return text || '未分配';
}

/**
 * 注册航线标签（用于统一航线ID对应的标签）
 * @param {string} routeId - 航线ID
 * @param {string} routeText - 航线文本
 */
function registerRouteLabel(routeId, routeText) {
    if (!routeId) return;
    const cleaned = String(routeText ?? '').trim();
    if (!cleaned) return;
    const current = routeLabelMap[routeId];
    if (!current || cleaned.length > current.length) {
        routeLabelMap[routeId] = cleaned;
    }
}

/**
 * 获取航线标签
 * @param {string} routeId - 航线ID
 * @param {string} fallback - 备用标签
 * @returns {string} 航线标签
 */
function getRouteLabel(routeId, fallback) {
    if (routeId && routeLabelMap[routeId]) {
        return routeLabelMap[routeId];
    }
    const cleaned = String(fallback ?? '').trim();
    return cleaned || '未知航线';
}

/**
 * 填充下拉选择框
 * @param {HTMLSelectElement} selectEl - 选择框元素
 * @param {string[]} options - 选项数组
 * @param {string} placeholder - 占位符文本
 * @param {string|string[]} selectedValues - 已选中的值
 * @param {boolean} shouldDisable - 是否禁用
 */
function populateSelect(selectEl, options, placeholder, selectedValues, shouldDisable = false) {
    if (!selectEl) return;
    const uniqueOptions = Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
    const selectedArray = Array.isArray(selectedValues)
        ? selectedValues
        : (selectedValues ? [selectedValues] : []);
    const selectedSet = new Set(selectedArray);
    selectEl.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    if (!selectedSet.size) {
        placeholderOption.selected = true;
    }
    selectEl.appendChild(placeholderOption);
    uniqueOptions.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        if (selectedSet.has(optionValue)) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    });
    selectEl.disabled = shouldDisable || uniqueOptions.length === 0;
}

/**
 * 构建船舶签名（用于去重）
 * @param {Object} record - 记录对象
 * @returns {string} 船舶签名
 */
function buildShipSignature(record) {
    const shipName = record.shipName || '';
    const shipDate = record.shipDate || '';
    const capacity = record.capacity || 0;
    return `${shipName}|${shipDate}|${capacity}`;
}

// ============================================
// 周别处理函数
// ============================================

/**
 * 解析周别文本
 * @param {string} weekText - 周别文本（如"2025年第47周"、"202547"、"2025-47"等）
 * @returns {string|null} 周别代码（如"202547"），解析失败返回null
 */
function parseWeekText(weekText) {
    if (!weekText) return null;
    const text = String(weekText).trim();
    
    // 尝试匹配"2025年第47周"格式
    const match1 = text.match(/(\d{4})年[第]?(\d{1,2})周/);
    if (match1) {
        const year = parseInt(match1[1]);
        const week = parseInt(match1[2]);
        return String(year) + String(week).padStart(2, '0');
    }
    
    // 尝试匹配"202547"格式（已经是目标格式）
    const match2 = text.match(/^(\d{4})(\d{2})$/);
    if (match2) {
        return text;
    }
    
    // 尝试匹配"2025-47"或"2025/47"格式
    const match3 = text.match(/(\d{4})[-/](\d{1,2})/);
    if (match3) {
        const year = parseInt(match3[1]);
        const week = parseInt(match3[2]);
        return String(year) + String(week).padStart(2, '0');
    }
    
    return null;
}

/**
 * 获取当前周的周别代码
 * @returns {string} 周别代码（如"202547"）
 */
function getCurrentWeekCode() {
    const today = new Date();
    const year = today.getFullYear();
    const weekNo = getWeekNumber(today);
    return String(year) + String(weekNo).padStart(2, '0');
}

/**
 * 获取当周+未来4周（共5周）
 * @returns {string[]} 周别代码数组
 */
function getWeekRange() {
    const weeks = [];
    const currentWeekCode = getCurrentWeekCode();
    
    // 解析当前周
    const currentYear = parseInt(currentWeekCode.substring(0, 4));
    const currentWeekNo = parseInt(currentWeekCode.substring(4));
    
    // 生成当周+未来4周（共5周）
    for (let i = 0; i < 5; i++) {
        let year = currentYear;
        let weekNo = currentWeekNo + i;
        
        // 处理跨年
        if (weekNo > 53) {
            year = year + 1;
            weekNo = weekNo - 53;
        }
        
        const weekStr = String(year) + String(weekNo).padStart(2, '0');
        weeks.push(weekStr);
    }
    
    return weeks;
}

/**
 * 获取周数（周日到周六为一周）
 * @param {Date} date - 日期对象
 * @returns {number} 周数（1-53）
 */
function getWeekNumber(date) {
    const d = new Date(date);
    // 将日期调整到该周的周日（周日是0，周六是6）
    const dayOfWeek = d.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek); // 调整到该周的周日
    
    // 计算该周日所在年份的1月1日
    const yearStart = new Date(sunday.getFullYear(), 0, 1);
    // 找到1月1日所在周的周日
    const yearStartDay = yearStart.getDay();
    const yearStartSunday = new Date(yearStart);
    yearStartSunday.setDate(yearStart.getDate() - yearStartDay);
    
    // 计算周数（从1月1日所在周的周日开始计算）
    const diffTime = sunday - yearStartSunday;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNo = Math.floor(diffDays / 7) + 1;
    
    // 处理跨年情况
    if (weekNo < 1) {
        // 如果周数小于1，说明是上一年的最后几周
        const prevYear = new Date(sunday.getFullYear() - 1, 11, 31);
        return getWeekNumber(prevYear);
    }
    
    // 如果周数超过52/53，可能需要调整年份
    if (weekNo > 53) {
        return 1; // 下一年的第一周
    }
    
    return weekNo;
}

/**
 * 保留ISO周数函数用于兼容（但实际使用getWeekNumber）
 * @param {Date} date - 日期对象
 * @returns {number} 周数
 */
function getISOWeek(date) {
    return getWeekNumber(date);
}

/**
 * 根据周别代码（如202547）获取该周的周日到周六日期范围
 * @param {string} weekCode - 周别代码（如"202547"）
 * @returns {Object} 包含sunday、saturday和range的对象
 */
function getWeekDateRange(weekCode) {
    const year = parseInt(weekCode.substring(0, 4));
    const weekNo = parseInt(weekCode.substring(4));
    
    // 计算该年1月1日
    const yearStart = new Date(year, 0, 1);
    // 找到1月1日所在周的周日
    const yearStartDay = yearStart.getDay();
    const yearStartSunday = new Date(yearStart);
    yearStartSunday.setDate(yearStart.getDate() - yearStartDay);
    
    // 计算目标周的周日（第weekNo周的周日）
    const targetSunday = new Date(yearStartSunday);
    targetSunday.setDate(yearStartSunday.getDate() + (weekNo - 1) * 7);
    
    // 计算该周的周六
    const targetSaturday = new Date(targetSunday);
    targetSaturday.setDate(targetSunday.getDate() + 6);
    
    // 格式化日期为 YYYY/MM/DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }
    
    return {
        sunday: formatDate(targetSunday),
        saturday: formatDate(targetSaturday),
        range: `${formatDate(targetSunday)}~${formatDate(targetSaturday)}`
    };
}

// ============================================
// PDF处理函数
// ============================================

// 全局变量（需要在页面中声明）
// const loadedScripts = new Set();
// const loadedWorkers = new Map();
// let pdfJsReady = false;
// let pdfJsLoadingPromise = null;

/**
 * 加载脚本
 * @param {string} url - 脚本URL
 */
async function loadScript(url) {
    if (typeof loadedScripts === 'undefined') {
        console.warn('loadedScripts 未定义，请在页面中声明');
        return;
    }
    if (loadedScripts.has(url)) {
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
        console.warn('loadedWorkers 未定义，请在页面中声明');
        return null;
    }
    if (loadedWorkers.has(url)) {
        return loadedWorkers.get(url);
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
        console.warn('pdfJsReady 或 pdfJsLoadingPromise 未定义，请在页面中声明');
        return;
    }
    if (typeof window.pdfjsLib !== 'undefined') {
        if (!pdfJsReady && pdfjsLib.GlobalWorkerOptions) {
            // 直接使用 CDN URL，避免 Blob URL 问题
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            pdfJsReady = true;
        }
        return;
    }
    if (pdfJsLoadingPromise) {
        return pdfJsLoadingPromise;
    }
    pdfJsLoadingPromise = (async () => {
        const sources = [
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
        for (const src of sources) {
            try {
                await loadScript(src.script);
                if (window.pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                    // 直接使用 CDN URL，不尝试 Blob URL
                    pdfjsLib.GlobalWorkerOptions.workerSrc = src.worker;
                    pdfJsReady = true;
                    lastError = null;
                    break;
                }
            } catch (error) {
                lastError = error;
                console.warn('PDF.js 加载失败，尝试下一个源:', src.script, error);
            }
        }
        if (!pdfJsReady) {
            pdfJsLoadingPromise = null;
            throw new Error('PDF 解析库加载失败: ' + (lastError?.message || '所有源都失败'));
        }
    })();
    return pdfJsLoadingPromise;
}

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
 * 处理市场报告文件
 * @param {File} file - PDF文件
 * @returns {Promise<void>}
 */
async function handleMarketReportFile(file) {
    if (typeof marketReports === 'undefined') {
        console.warn('marketReports 未定义，请在页面中声明');
        return;
    }
    try {
        const text = await extractTextFromPdf(file);
        if (text) {
            marketReports.push({
                name: file.name,
                text,
                textLength: text.length
            });
        }
    } catch (error) {
        console.error('解析PDF失败', file.name, error);
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
        marketReportList.innerHTML = '<li>尚未上传市场报告</li>';
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
// 市场数据抓取函数
// ============================================

/**
 * 从缓存应用WoW（周环比）数据
 * @param {Object} current - 当前数据
 * @param {Object} previous - 之前的数据
 * @param {Object} options - 选项
 */
function applyWoWFromCache(current, previous, options = {}) {
    if (!current || !previous) return;
    const { routeKey = 'code', valueKey = 'rate', targetCollection = 'routes' } = options;
    const prevCollection = previous[targetCollection] || [];
    const prevMap = new Map();
    if (Array.isArray(prevCollection)) {
        prevCollection.forEach(item => {
            const key = item[routeKey] || item.route;
            if (key && typeof item[valueKey] === 'number') {
                prevMap.set(key, item[valueKey]);
            }
        });
    }
    const currentCollection = current[targetCollection] || [];
    if (Array.isArray(currentCollection)) {
        currentCollection.forEach(item => {
            const key = item[routeKey] || item.route;
            if (key && prevMap.has(key) && typeof item[valueKey] === 'number') {
                const wow = computePercentChange(item[valueKey], prevMap.get(key));
                if (wow !== null) {
                    item.wow = wow;
                }
            }
        });
    }
    if (typeof current.worldIndex === 'number' && typeof previous.worldIndex === 'number') {
        current.worldIndexWoW = computePercentChange(current.worldIndex, previous.worldIndex);
    }
}

/**
 * 获取文本内容（支持自定义编码）
 * @param {string} url - URL
 * @param {Object} options - 选项（如encoding）
 * @returns {Promise<string>} 文本内容
 */
async function fetchTextContent(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`无法加载数据：${response.status} ${response.statusText}`);
    }
    if (options.encoding && window.TextDecoder) {
        try {
            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder(options.encoding);
            return decoder.decode(buffer);
        } catch (error) {
            console.warn('自定义编码解析失败，回退到默认编码', error);
        }
    }
    return response.text();
}

/**
 * 抓取燃油数据
 * @param {boolean} force - 是否强制刷新
 * @returns {Promise<Object>} 燃油数据
 */
async function fetchBunkerData(force = false) {
    if (typeof bunkerData === 'undefined' || typeof bunkerStatusEl === 'undefined') {
        console.warn('bunkerData 或 bunkerStatusEl 未定义，请在页面中声明');
        return null;
    }
    const sixHours = 6 * 60 * 60 * 1000;
    if (!force && bunkerData && Date.now() - bunkerData.timestamp < sixHours) {
        updateBunkerStatus();
        return bunkerData;
    }
    bunkerStatusEl && (bunkerStatusEl.textContent = '正在从 Ship & Bunker 抓取...');
    const text = await fetchTextContent('https://r.jina.ai/https://www.shipandbunker.com/prices');
    const tables = extractBunkerTables(text);
    const result = { timestamp: Date.now(), source: 'Ship & Bunker' };
    const fuelOrder = [
        { key: 'vlsfo', label: 'VLSFO 0.5%', tableIndex: 0 },
        { key: 'mgo', label: 'MGO 0.1%', tableIndex: 1 },
        { key: 'ifo380', label: 'IFO380', tableIndex: 2 }
    ];
    fuelOrder.forEach(item => {
        const tableText = tables[item.tableIndex];
        if (tableText) {
            const parsed = parseBunkerTable(tableText);
            if (parsed) {
                result[item.key] = { ...parsed, label: item.label };
            }
        }
    });
    bunkerData = result;
    updateBunkerStatus();
    return bunkerData;
}

/**
 * 提取燃油表格
 * @param {string} text - 文本内容
 * @returns {string[]} 表格数组
 */
function extractBunkerTables(text) {
    const normalized = text.replace(/\r/g, '');
    const tables = [];
    const regex = /\| Port \|[\s\S]*?(?=\n\n|$)/g;
    let match;
    while ((match = regex.exec(normalized)) !== null) {
        tables.push(match[0]);
    }
    return tables;
}

/**
 * 解析燃油表格
 * @param {string} tableText - 表格文本
 * @returns {Object|null} 解析结果
 */
function parseBunkerTable(tableText) {
    const sgLine = tableText.split('\n').find(line => line.includes('[Singapore]'));
    if (!sgLine) return null;
    const cols = sgLine.split('|').map(col => col.trim());
    const price = parseFloat(cols[2]);
    const change = parseFloat((cols[3] || '').replace(/[^\d+\-\.]/g, ''));
    if (!isFinite(price)) return null;
    return {
        price,
        delta: isFinite(change) ? change : null
    };
}

/**
 * 更新燃油状态显示
 */
function updateBunkerStatus() {
    if (typeof bunkerStatusEl === 'undefined' || !bunkerStatusEl) return;
    if (typeof bunkerData === 'undefined' || !bunkerData || (!bunkerData.vlsfo && !bunkerData.mgo)) {
        bunkerStatusEl.textContent = '尚未抓取燃油报价';
        if (typeof bunkerUpdatedEl !== 'undefined' && bunkerUpdatedEl) {
            bunkerUpdatedEl.textContent = '最近更新时间：—';
        }
        return;
    }
    const parts = [];
    if (bunkerData.vlsfo) {
        parts.push(describeBunkerLine('VLSFO 0.5%', bunkerData.vlsfo));
    }
    if (bunkerData.mgo) {
        parts.push(describeBunkerLine('MGO 0.1%', bunkerData.mgo));
    }
    if (bunkerData.ifo380) {
        parts.push(describeBunkerLine('IFO380', bunkerData.ifo380));
    }
    bunkerStatusEl.textContent = parts.join('；');
    if (typeof bunkerUpdatedEl !== 'undefined' && bunkerUpdatedEl) {
        bunkerUpdatedEl.textContent = `最近更新时间：${new Date(bunkerData.timestamp).toLocaleString()}`;
    }
}

/**
 * 描述燃油行
 * @param {string} label - 标签
 * @param {Object} data - 数据
 * @returns {string} 描述文本
 */
function describeBunkerLine(label, data) {
    const priceText = typeof data.price === 'number' ? `${data.price.toFixed(2)} USD/t` : '—';
    let deltaText = '';
    if (typeof data.delta === 'number') {
        const formatted = data.delta >= 0 ? `+${data.delta.toFixed(2)}` : data.delta.toFixed(2);
        deltaText = `（WoW ${formatted}）`;
    }
    return `${label}：${priceText}${deltaText}`;
}

// CCFI 航线配置（需要在页面中声明或使用全局变量）
// const ccfiRoutes = [
//     { label: '综合指数', match: 'CHINA CONTAINERIZED FREIGHT INDEX', parenthesized: false },
//     { label: '日本航线', match: 'JAPAN SERVICE', parenthesized: true },
//     { label: '欧洲航线', match: 'EUROPE SERVICE', parenthesized: true },
//     { label: '美西航线', match: 'W/C AMERICA SERVICE', parenthesized: true },
//     { label: '美东航线', match: 'E/C AMERICA SERVICE', parenthesized: true },
//     { label: '韩国航线', match: 'KOREA SERVICE', parenthesized: true },
//     { label: '东南亚航线', match: 'SOUTHEAST ASIA SERVICE', parenthesized: true },
//     { label: '地中海航线', match: 'MEDITERRANEAN SERVICE', parenthesized: true },
//     { label: '澳新航线', match: 'AUSTRALIA/NEW ZEALAND SERVICE', parenthesized: true },
//     { label: '南非航线', match: 'SOUTH AFRICA SERVICE', parenthesized: true },
//     { label: '南美航线', match: 'SOUTH AMERICA SERVICE', parenthesized: true },
//     { label: '东西非航线', match: 'WEST EAST AFRICA SERVICE', parenthesized: true },
//     { label: '波红航线', match: 'PERSIAN GULF/RED SEA SERVICE', parenthesized: true }
// ];

/**
 * 抓取CCFI数据
 * @param {boolean} force - 是否强制刷新
 * @returns {Promise<Object>} CCFI数据
 */
async function fetchCcfiData(force = false) {
    if (typeof ccfiData === 'undefined' || typeof ccfiStatusEl === 'undefined') {
        console.warn('ccfiData 或 ccfiStatusEl 未定义，请在页面中声明');
        return null;
    }
    const sixHours = 6 * 60 * 60 * 1000;
    if (!force && ccfiData && Date.now() - ccfiData.timestamp < sixHours) {
        renderCcfiStatus();
        return ccfiData;
    }
    if (ccfiStatusEl) ccfiStatusEl.textContent = '正在抓取 CCFI 数据...';
    const url = 'https://r.jina.ai/https://www.sse.net.cn/index/singleIndex?indexType=ccfi';
    const text = await fetchTextContent(url, { encoding: 'gb18030' });
    ccfiData = parseCcfiText(text);
    if (typeof CACHE_KEYS !== 'undefined' && typeof saveCachedData !== 'undefined') {
        saveCachedData(CACHE_KEYS.ccfi, ccfiData);
    }
    renderCcfiStatus();
    return ccfiData;
}

/**
 * 解析并验证 CCFI 匹配结果
 * @param {Array<string>} match - 正则匹配结果数组
 * @param {Object} route - 航线配置对象
 * @param {string} strategyName - 策略名称（用于调试）
 * @returns {Object|null} 解析后的路由数据，如果验证失败返回 null
 */
function parseAndValidateCcfiMatch(match, route, strategyName) {
    // 解析数字（支持逗号分隔符）
    const parseNumber = (str) => {
        if (!str) return null;
        return parseFloat(String(str).replace(/,/g, ''));
    };
    
    const previous = parseNumber(match[1]);
    const current = parseNumber(match[2]);
    const wow = match[3] ? parseNumber(match[3]) : null;
    
    // 验证数字是否合理（CCFI 指数通常在 50-5000 之间）
    const previousValid = previous !== null && isFinite(previous) && previous > 50 && previous < 5000;
    const currentValid = current !== null && isFinite(current) && current > 50 && current < 5000;
    const wowValid = wow !== null && isFinite(wow) && Math.abs(wow) < 100; // WoW 通常在 -100% 到 100% 之间
    
    if (previousValid && currentValid) {
        const result = {
            id: route.match,
            label: route.label,
            previous: previous,
            current: current,
            wow: wowValid ? wow : null
        };
        
        if (getCachedDebugMode()) {
            console.log(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
        }
        
        return result;
    }
    
    return null;
}

/**
 * 解析并验证 CCFI 匹配结果（仅当前值）
 * @param {Array<string>} match - 正则匹配结果数组
 * @param {Object} route - 航线配置对象
 * @param {string} strategyName - 策略名称（用于调试）
 * @returns {Object|null} 解析后的路由数据，如果验证失败返回 null
 */
function parseAndValidateCcfiMatchCurrentOnly(match, route, strategyName) {
    const parseNumber = (str) => {
        if (!str) return null;
        return parseFloat(String(str).replace(/,/g, ''));
    };
    
    const current = parseNumber(match[1]);
    const currentValid = current !== null && isFinite(current) && current > 50 && current < 5000;
    
    if (currentValid) {
        const result = {
            id: route.match,
            label: route.label,
            previous: null,
            current: current,
            wow: null
        };
        
        if (getCachedDebugMode()) {
            console.log(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { current });
        }
        
        return result;
    }
    
    return null;
}

/**
 * 正则表达式缓存（用于优化 CCFI 匹配性能）
 * @type {Map<string, RegExp>}
 */
const regexCache = new Map();

/**
 * 获取或创建正则表达式（带缓存）
 * @param {string} pattern - 正则表达式模式
 * @param {string} flags - 正则表达式标志
 * @returns {RegExp} 正则表达式对象
 */
function getCachedRegex(pattern, flags = 'gi') {
    const key = `${pattern}::${flags}`;
    if (!regexCache.has(key)) {
        regexCache.set(key, new RegExp(pattern, flags));
    }
    return regexCache.get(key);
}

/**
 * 尝试匹配 CCFI 航线数据（优化版：使用缓存的正则表达式）
 * @param {RegExp|string} regexOrPattern - 正则表达式对象或模式字符串
 * @param {string} normalized - 规范化后的文本
 * @param {Object} route - 航线配置对象
 * @param {string} strategyName - 策略名称
 * @param {Function} parseFn - 解析函数（parseAndValidateCcfiMatch 或 parseAndValidateCcfiMatchCurrentOnly）
 * @returns {Object|null} 解析后的路由数据，如果匹配失败返回 null
 */
function tryMatchCcfiRoute(regexOrPattern, normalized, route, strategyName, parseFn) {
    // 如果传入的是字符串，使用缓存的正则表达式
    const regex = typeof regexOrPattern === 'string' 
        ? getCachedRegex(regexOrPattern) 
        : regexOrPattern;
    
    regex.lastIndex = 0;
    let match;
    // 限制最大匹配次数，避免无限循环（每个策略最多尝试 10 次）
    let maxAttempts = 10;
    while ((match = regex.exec(normalized)) !== null && maxAttempts-- > 0) {
        const result = parseFn(match, route, strategyName);
        if (result) {
            return result;
        }
    }
    return null;
}

/**
 * 解析CCFI文本（支持HTML表格格式）
 * @param {string} text - 文本内容或HTML内容
 * @returns {Object} CCFI数据
 */
function parseCcfiText(text) {
    if (typeof ccfiRoutes === 'undefined') {
        console.warn('ccfiRoutes 未定义，请在页面中声明');
        return { timestamp: Date.now(), period: null, routes: [] };
    }
    
    // 尝试解析HTML表格格式
    const htmlMatch = text.match(/<table[^>]*class=["']lb1["'][^>]*>[\s\S]*?<\/table>/i);
    if (htmlMatch) {
        return parseCcfiFromHtml(htmlMatch[0]);
    }
    
    // 如果找不到HTML表格，使用原来的文本解析方式
    const normalized = text.replace(/\r/g, '');
    const headerMatch = normalized.match(/上期(\d{4}-\d{2}-\d{2}).*?本期(\d{4}-\d{2}-\d{2})/);
    const result = {
        timestamp: Date.now(),
        period: headerMatch ? { previous: headerMatch[1], current: headerMatch[2] } : null,
        routes: []
    };
    
    // 调试：检查文本内容（仅在调试模式下）
    const DEBUG_MODE = getCachedDebugMode();
    if (DEBUG_MODE) {
        console.log('[CCFI] 文本长度:', normalized.length);
        console.log('[CCFI] 文本前500字符:', normalized.substring(0, 500));
        // 查找包含航线中文名称的部分
        const routeLabels = ccfiRoutes.map(r => r.label);
        const foundLabels = [];
        routeLabels.forEach(label => {
            if (normalized.includes(label)) {
                foundLabels.push(label);
            }
        });
        console.log('[CCFI] 找到的航线标签:', foundLabels);
        // 查找包含数字的部分（可能是价格数据）
        const numberMatches = normalized.match(/[\d,]+\.?\d*/g);
        if (numberMatches) {
            console.log('[CCFI] 找到的数字数据（前30个）:', numberMatches.slice(0, 30));
        }
        // 查找包含英文航线名称的部分
        const routeMatches = normalized.match(/(JAPAN|EUROPE|AMERICA|KOREA|ASIA|MEDITERRANEAN|AUSTRALIA|AFRICA|PERSIAN|GULF|RED SEA)/gi);
        if (routeMatches) {
            console.log('[CCFI] 找到的英文航线名称（前20个）:', routeMatches.slice(0, 20));
        }
        // 查找每个航线名称附近的文本内容（用于调试）
        const sampleRoutes = ['JAPAN', 'EUROPE', 'KOREA', 'ASIA'];
        sampleRoutes.forEach(keyword => {
            const index = normalized.indexOf(keyword);
            if (index !== -1) {
                const snippet = normalized.substring(Math.max(0, index - 50), index + 200);
                console.log(`[CCFI] "${keyword}" 附近的文本:`, snippet);
            }
        });
        // 查找综合指数附近的文本内容
        const compositeIndex = normalized.indexOf('CHINA CONTAINERIZED FREIGHT INDEX');
        if (compositeIndex !== -1) {
            const snippet = normalized.substring(Math.max(0, compositeIndex - 50), compositeIndex + 200);
            console.log(`[CCFI] "CHINA CONTAINERIZED FREIGHT INDEX" 附近的文本:`, snippet);
        }
    }
    
    // 预编译常用正则表达式模式（性能优化）
    const escapedRoutes = ccfiRoutes.map(route => ({
        ...route,
        escaped: escapeRegex(route.match),
        target: route.parenthesized ? `\\(${escapeRegex(route.match)}\\)` : escapeRegex(route.match),
        labelEscaped: escapeRegex(route.label || '')
    }));
    
    escapedRoutes.forEach((route, index) => {
        let found = false;
        
        // 策略1：匹配表格格式（支持 | 分隔符和空格分隔）
        // 格式1：航线名称 | 上期值 | 本期值 | WoW值（如：CHINA CONTAINERIZED FREIGHT INDEX | 1121.80 | 1114.89 | -0.6）
        // 格式2：航线名称 上期值 本期值 WoW值（如：CHINA CONTAINERIZED FREIGHT INDEX 1121.80 1114.89 -0.6）
        // 先尝试匹配表格格式（| 分隔），限制匹配范围在航线名称后500字符内，避免匹配到其他航线的数据
        // 使用字符串模式，让 tryMatchCcfiRoute 使用缓存的正则表达式
        const tablePattern = `${route.target}[\\s\\S]{0,500}([\\d,\\.]+)\\s*[|]\\s*([\\d,\\.]+)\\s*[|]\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
        let matchResult = tryMatchCcfiRoute(tablePattern, normalized, route, '策略1（表格格式）', parseAndValidateCcfiMatch);
        if (matchResult) {
            result.routes.push(matchResult);
            found = true;
        }
        
        // 如果表格格式匹配失败，尝试空格分隔格式
        if (!found) {
            const spacePattern = `${route.target}[\\s\\S]{0,500}([\\d,\\.]+)\\s+([\\d,\\.]+)\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
            matchResult = tryMatchCcfiRoute(spacePattern, normalized, route, '策略1（空格格式）', parseAndValidateCcfiMatch);
            if (matchResult) {
                result.routes.push(matchResult);
                found = true;
            }
        }
        
        // 策略1.5：匹配格式 (航线名称)数字（只有当前值，没有上期值和WoW）
        // 这是最常见的格式，如 (JAPAN SERVICE)960.49
        // 但首先尝试匹配表格格式：航线名称 | 上期值 | 本期值 | WoW值
        if (!found && route.parenthesized && route.match) {
            // 先尝试匹配表格格式：\(航线名称\) | 上期值 | 本期值 | WoW值
            const parenthesizedTablePattern = `${route.target}[\\s\\S]{0,500}\\s*[|]\\s*([\\d,\\.]+)\\s*[|]\\s*([\\d,\\.]+)\\s*[|]\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
            matchResult = tryMatchCcfiRoute(parenthesizedTablePattern, normalized, route, '策略1.5（表格格式）', parseAndValidateCcfiMatch);
            if (matchResult) {
                result.routes.push(matchResult);
                found = true;
            }
            
            // 如果表格格式匹配失败，尝试空格分隔格式
            if (!found) {
                const parenthesizedSpacePattern = `${route.target}[\\s\\S]{0,500}([\\d,\\.]+)\\s+([\\d,\\.]+)\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
                matchResult = tryMatchCcfiRoute(parenthesizedSpacePattern, normalized, route, '策略1.5（空格格式）', parseAndValidateCcfiMatch);
                if (matchResult) {
                    result.routes.push(matchResult);
                    found = true;
                }
            }
            
            // 如果表格格式和空格格式都匹配失败，尝试匹配 (航线名称)数字 格式（仅当前值）
            if (!found) {
                const currentOnlyPattern = `${route.target}([\\d,\\.]+)`;
                matchResult = tryMatchCcfiRoute(currentOnlyPattern, normalized, route, '策略1.5（仅当前值）', parseAndValidateCcfiMatchCurrentOnly);
                if (matchResult) {
                    result.routes.push(matchResult);
                    found = true;
                }
            }
        }
        
        // 策略1.6：如果策略1.5失败，尝试匹配航线名称的关键词（如 "JAPAN" 而不是 "JAPAN SERVICE"）
        if (!found && route.match) {
            // 提取关键词：对于 "JAPAN SERVICE"，提取 "JAPAN"；对于 "W/C AMERICA SERVICE"，提取 "AMERICA"
            // 对于 "SOUTHEAST ASIA SERVICE"，提取 "ASIA"；对于 "SOUTH AFRICA SERVICE"，提取 "AFRICA"
            let keywords = route.match.split(/\s+/).filter(word => 
                word.length > 2 && 
                !word.match(/^(SERVICE|W\/C|E\/C|NEW|ZEALAND|GULF|RED|SEA|SOUTHEAST|WEST|EAST)$/i)
            );
            
            // 特殊处理：对于 "SOUTHEAST ASIA"，使用 "ASIA"；对于 "SOUTH AFRICA"，使用 "AFRICA"
            if (route.match.includes('SOUTHEAST ASIA')) {
                keywords = ['ASIA'];
            } else if (route.match.includes('SOUTH AFRICA')) {
                keywords = ['AFRICA'];
            } else if (route.match.includes('SOUTH AMERICA')) {
                keywords = ['AMERICA'];
            } else if (route.match.includes('WEST EAST AFRICA')) {
                keywords = ['AFRICA'];
            } else if (route.match.includes('PERSIAN GULF/RED SEA')) {
                keywords = ['PERSIAN', 'GULF', 'RED'];
            } else if (route.match.includes('AUSTRALIA/NEW ZEALAND')) {
                keywords = ['AUSTRALIA'];
            }
            
            if (keywords.length > 0) {
                // 尝试每个关键词，匹配格式 (关键词 SERVICE)数字 或 (关键词)数字
                for (const keyword of keywords) {
                    const keywordEscaped = escapeRegex(keyword);
                    // 匹配格式：\(关键词[^)]*\)数字（允许关键词后面有其他内容）
                    const keywordPattern = `\\([^)]*${keywordEscaped}[^)]*\\)([\\d,\\.]+)`;
                    matchResult = tryMatchCcfiRoute(keywordPattern, normalized, route, `策略1.6（关键词: ${keyword}）`, parseAndValidateCcfiMatchCurrentOnly);
                    if (matchResult) {
                        result.routes.push(matchResult);
                        found = true;
                        break;
                    }
                }
            }
        }
        
        // 策略2：如果直接匹配失败，尝试匹配中文标签（如"综合指数"、"日本航线"等）
        if (!found && route.label) {
            // 更宽松的匹配：允许标签和数字之间有更多字符
            const labelPattern = `${route.labelEscaped}[：:：\\s]*([\\d,\\.]+)[^\\d]{0,200}?([\\d,\\.]+)[^\\d]{0,200}?([+\\-]?\\d+(?:\\.\\d+)?)`;
            matchResult = tryMatchCcfiRoute(labelPattern, normalized, route, '策略2', (match, route, strategyName) => {
                const parseNumber = (str) => {
                    if (!str) return null;
                    return parseFloat(String(str).replace(/,/g, ''));
                };
                const previous = parseNumber(match[1]);
                const current = parseNumber(match[2]);
                const wow = match[3] ? parseNumber(match[3]) : null;
                if (isFinite(previous) || isFinite(current)) {
                    const result = {
                        id: route.match,
                        label: route.label,
                        previous: isFinite(previous) ? previous : null,
                        current: isFinite(current) ? current : null,
                        wow: isFinite(wow) ? wow : null
                    };
                    if (getCachedDebugMode()) {
                        console.log(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
                    }
                    return result;
                }
                return null;
            });
            if (matchResult) {
                result.routes.push(matchResult);
                found = true;
            }
        }
        
        // 策略3：如果前两种都失败，尝试更宽松的匹配（只匹配标签后的第一个数字作为当前值）
        if (!found && route.label) {
            // 匹配格式：标签 + 当前值（可能没有上期值）
            const labelCurrentPattern = `${route.labelEscaped}[：:：\\s]*([\\d,\\.]+)`;
            matchResult = tryMatchCcfiRoute(labelCurrentPattern, normalized, route, '策略3', (match, route, strategyName) => {
                const parseNumber = (str) => {
                    if (!str) return null;
                    return parseFloat(String(str).replace(/,/g, ''));
                };
                const current = parseNumber(match[1]);
                if (isFinite(current) && current > 0) {
                    const result = {
                        id: route.match,
                        label: route.label,
                        previous: null,
                        current: current,
                        wow: null
                    };
                    if (getCachedDebugMode()) {
                        console.log(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { current });
                    }
                    return result;
                }
                return null;
            });
            if (matchResult) {
                result.routes.push(matchResult);
                found = true;
            }
        }
        
        // 策略4：如果前三种都失败，尝试匹配英文航线名称（用于处理编码问题）
        if (!found && route.match) {
            // 匹配格式：英文航线名称 + 数字 + 数字 + 百分比
            const matchPattern = `${route.escaped}[\\s\\S]{0,5000}([\\d,\\.]+)\\s+([\\d,\\.]+)\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
            matchResult = tryMatchCcfiRoute(matchPattern, normalized, route, '策略4', (match, route, strategyName) => {
                const parseNumber = (str) => {
                    if (!str) return null;
                    return parseFloat(String(str).replace(/,/g, ''));
                };
                const previous = parseNumber(match[1]);
                const current = parseNumber(match[2]);
                const wow = match[3] ? parseNumber(match[3]) : null;
                if (isFinite(previous) || isFinite(current)) {
                    const result = {
                        id: route.match,
                        label: route.label,
                        previous: isFinite(previous) ? previous : null,
                        current: isFinite(current) ? current : null,
                        wow: isFinite(wow) ? wow : null
                    };
                    if (getCachedDebugMode()) {
                        console.log(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
                    }
                    return result;
                }
                return null;
            });
            if (matchResult) {
                result.routes.push(matchResult);
                found = true;
            }
        }
        
        if (!found && getCachedDebugMode()) {
            console.warn(`[CCFI] 未匹配到: ${route.label} (${route.match})`);
        }
    });
    
    if (getCachedDebugMode()) {
        console.log(`[CCFI] 总共匹配到 ${result.routes.length} 条航线数据`);
    }
    
    return result;
}

/**
 * 从HTML表格中解析CCFI数据
 * @param {string} html - HTML表格内容
 * @returns {Object} CCFI数据
 */
function parseCcfiFromHtml(html) {
    const result = {
        timestamp: Date.now(),
        period: null,
        routes: []
    };
    
    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 查找表格
    const table = tempDiv.querySelector('table.lb1') || tempDiv.querySelector('table');
    if (!table) {
        return result;
    }
    
    // 查找表头行
    const headerRow = table.querySelector('tr.csx1') || table.querySelector('tr');
    if (!headerRow) {
        return result;
    }
    
    // 提取表头中的日期
    const headerCells = headerRow.querySelectorAll('td');
    if (headerCells.length >= 3) {
        const prevDateText = headerCells[1].textContent || '';
        const currDateText = headerCells[2].textContent || '';
        
        // 从文本中提取日期（格式：上期\n2025-11-28）
        const prevDateMatch = prevDateText.match(/(\d{4}-\d{2}-\d{2})/);
        const currDateMatch = currDateText.match(/(\d{4}-\d{2}-\d{2})/);
        
        if (prevDateMatch && currDateMatch) {
            const prevDate = prevDateMatch[1];
            const currDate = currDateMatch[1];
            // 转换日期格式：2025-11-28 -> 2025/11/28
            result.period = {
                previous: prevDate.replace(/-/g, '/'),
                current: currDate.replace(/-/g, '/')
            };
        }
    }
    
    // 提取数据行
    const dataRows = Array.from(table.querySelectorAll('tr')).slice(1); // 跳过表头行
    
    dataRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) {
            return;
        }
        
        // 第一列：航线名称
        const routeNameCell = cells[0];
        let routeName = '';
        
        // 提取航线名称（支持<p>标签格式）
        const pTags = routeNameCell.querySelectorAll('p');
        if (pTags.length > 0) {
            routeName = Array.from(pTags).map(p => p.textContent.trim()).join(' ');
        } else {
            routeName = routeNameCell.textContent.trim();
        }
        
        // 第二列：上期数值
        const prevValueText = cells[1].textContent.trim();
        const prevValue = parseFloat(prevValueText.replace(/,/g, '')) || null;
        
        // 第三列：本期数值
        const currValueText = cells[2].textContent.trim();
        const currValue = parseFloat(currValueText.replace(/,/g, '')) || null;
        
        // 第四列：涨跌百分比
        const wowText = cells[3].textContent.trim().replace('%', '');
        const wow = parseFloat(wowText) || null;
        
        // 匹配航线配置
        if (routeName && (prevValue !== null || currValue !== null)) {
            // 查找匹配的航线配置
            let matchedRoute = null;
            
            // 先尝试精确匹配中文名称
            matchedRoute = ccfiRoutes.find(r => routeName.includes(r.label));
            
            // 如果没找到，尝试匹配英文名称
            if (!matchedRoute) {
                matchedRoute = ccfiRoutes.find(r => {
                    const matchText = r.match.toUpperCase();
                    return routeName.toUpperCase().includes(matchText) || 
                           matchText.includes(routeName.toUpperCase());
                });
            }
            
            // 如果还是没找到，尝试匹配部分关键词
            if (!matchedRoute) {
                const routeKeywords = {
                    '综合指数': '综合指数',
                    '日本': '日本航线',
                    '欧洲': '欧洲航线',
                    '美西': '美西航线',
                    '美东': '美东航线',
                    '韩国': '韩国航线',
                    '东南亚': '东南亚航线',
                    '地中海': '地中海航线',
                    '澳新': '澳新航线',
                    '南非': '南非航线',
                    '南美': '南美航线',
                    '东西非': '东西非航线',
                    '波红': '波红航线'
                };
                
                for (const [keyword, label] of Object.entries(routeKeywords)) {
                    if (routeName.includes(keyword)) {
                        matchedRoute = ccfiRoutes.find(r => r.label === label);
                        if (matchedRoute) break;
                    }
                }
            }
            
            if (matchedRoute) {
                result.routes.push({
                    id: matchedRoute.match,
                    label: matchedRoute.label,
                    previous: prevValue,
                    current: currValue,
                    wow: wow
                });
            } else {
                // 如果没有匹配到配置，使用原始航线名称
                result.routes.push({
                    id: routeName,
                    label: routeName,
                    previous: prevValue,
                    current: currValue,
                    wow: wow
                });
            }
        }
    });
    
    return result;
}

/**
 * 渲染CCFI状态
 */
function renderCcfiStatus() {
    if (typeof ccfiStatusEl === 'undefined' || !ccfiStatusEl) return;
    if (typeof ccfiData === 'undefined' || !ccfiData || !ccfiData.routes?.length) {
        ccfiStatusEl.textContent = '尚未抓取 CCFI 数据';
        if (typeof ccfiUpdatedEl !== 'undefined' && ccfiUpdatedEl) {
            ccfiUpdatedEl.textContent = '最近更新时间：—';
        }
        return;
    }
    const lines = [];
    const prevDate = ccfiData.period?.previous || '';
    const currDate = ccfiData.period?.current || '';
    
    ccfiData.routes.forEach(route => {
        const formatNumber = (num) => {
            if (typeof num !== 'number' || !isFinite(num)) return '—';
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        
        const formatWow = (wow) => {
            if (typeof wow !== 'number' || !isFinite(wow)) return '—';
            return `${wow >= 0 ? '+' : ''}${wow.toFixed(1)}%`;
        };
        
        const prevValue = formatNumber(route.previous);
        const currValue = formatNumber(route.current);
        const wowValue = formatWow(route.wow);
        
        // 格式：航线名称：上期(日期) 数值，本期(日期) 数值，WoW 涨跌幅%
        if (prevDate && currDate && route.previous !== null && route.current !== null) {
            lines.push(`${route.label}：上期(${prevDate}) ${prevValue}，本期(${currDate}) ${currValue}，WoW ${wowValue}`);
        } else if (route.current !== null) {
            // 如果没有上期值，只显示本期值
            if (currDate) {
                lines.push(`${route.label}：本期(${currDate}) ${currValue}`);
            } else {
                lines.push(`${route.label}：本期 ${currValue}`);
            }
        }
    });
    
    ccfiStatusEl.textContent = lines.join('\n');
    if (typeof ccfiUpdatedEl !== 'undefined' && ccfiUpdatedEl) {
        ccfiUpdatedEl.textContent = `最近更新时间：${new Date(ccfiData.timestamp).toLocaleString()}`;
    }
}

// WCI 代码映射（需要在页面中声明或使用全局变量）
// const wciCodeMap = {
//     'WCI-COMPOSITE': '全球综合',
//     'WCI-SHA-RTM': '上海 → 鹿特丹',
//     'WCI-RTM-SHA': '鹿特丹 → 上海',
//     'WCI-SHA-GOA': '上海 → 热那亚',
//     'WCI-SHA-LAX': '上海 → 洛杉矶',
//     'WCI-LAX-SHA': '洛杉矶 → 上海',
//     'WCI-SHA-NYC': '上海 → 纽约',
//     'WCI-NYC-RTM': '纽约 → 鹿特丹',
//     'WCI-RTM-NYC': '鹿特丹 → 纽约'
// };

/**
 * 抓取WCI数据
 * @param {boolean} force - 是否强制刷新
 * @returns {Promise<Object>} WCI数据
 */
async function fetchWciData(force = false) {
    if (typeof wciData === 'undefined' || typeof wciStatusEl === 'undefined') {
        console.warn('wciData 或 wciStatusEl 未定义，请在页面中声明');
        return null;
    }
    const sixHours = 6 * 60 * 60 * 1000;
    if (!force && wciData && Date.now() - wciData.timestamp < sixHours) {
        renderWciStatus();
        return wciData;
    }
    if (wciStatusEl) wciStatusEl.textContent = '正在抓取 WCI 数据...';
    const url = 'https://r.jina.ai/https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry';
    const text = await fetchTextContent(url);
    if (typeof CACHE_KEYS !== 'undefined' && typeof loadCachedData !== 'undefined') {
        const previousCache = loadCachedData(CACHE_KEYS.wci);
        wciData = parseWciText(text);
        applyWoWFromCache(wciData, previousCache, { routeKey: 'code', valueKey: 'rate', targetCollection: 'routes' });
        if (typeof saveCachedData !== 'undefined') {
            saveCachedData(CACHE_KEYS.wci, wciData);
        }
    } else {
        wciData = parseWciText(text);
    }
    renderWciStatus();
    return wciData;
}

/**
 * 解析WCI文本 - 策略1：匹配代码格式（WCI-XXX）
 * @param {string} normalized - 规范化后的文本
 * @param {string} code - WCI代码
 * @param {string} label - 航线标签
 * @param {Object} result - 结果对象
 * @returns {boolean} 是否匹配成功
 */
function parseWciByCode(normalized, code, label, result) {
    const regex = getCachedRegex(`${code}\\s*(?:=|:)?\\s*\\$?([\\d,]+(?:\\.\\d+)?)`, 'gi');
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(normalized)) !== null) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (isFinite(value) && value > 0) {
            if (code === 'WCI-COMPOSITE') {
                result.worldIndex = value;
                // 尝试匹配 WoW 百分比
                const changeRegex = getCachedRegex(`${code}[^%]*(?:\\(|\\s)([+\\-]?\\d+(?:\\.\\d+)?)%`, 'i');
                const changeMatch = normalized.match(changeRegex);
                if (changeMatch) {
                    result.changePct = parseFloat(changeMatch[1]);
                }
            } else {
                result.routes.push({ code, route: label, rate: value });
            }
            if (getCachedDebugMode()) {
                console.log(`[WCI] 策略1匹配成功: ${code} (${label})`, { value });
            }
            return true;
        }
    }
    return false;
}

/**
 * 解析WCI文本 - 策略2：匹配中文标签格式
 * @param {string} normalized - 规范化后的文本
 * @param {string} code - WCI代码
 * @param {string} label - 航线标签
 * @param {Object} result - 结果对象
 * @returns {boolean} 是否匹配成功
 */
function parseWciByLabel(normalized, code, label, result) {
    if (code === 'WCI-COMPOSITE') return false;
    
    const labelEscaped = escapeRegex(label);
    const labelRegex = getCachedRegex(`${labelEscaped}[：:：\\s]*\\$?([\\d,]+(?:\\.\\d+)?)`, 'gi');
    labelRegex.lastIndex = 0;
    let labelMatch;
    while ((labelMatch = labelRegex.exec(normalized)) !== null) {
        const value = parseFloat(labelMatch[1].replace(/,/g, ''));
        if (isFinite(value) && value > 0) {
            result.routes.push({ code, route: label, rate: value });
            if (getCachedDebugMode()) {
                console.log(`[WCI] 策略2匹配成功: ${code} (${label})`, { value });
            }
            return true;
        }
    }
    return false;
}

/**
 * 解析WCI文本 - 策略3：Fallback匹配（更宽松的匹配）
 * @param {string} normalized - 规范化后的文本
 * @param {Set} matchedCodes - 已匹配的代码集合
 * @param {Object} wciCodeMap - WCI代码映射
 * @param {Object} result - 结果对象
 */
function parseWciByFallback(normalized, matchedCodes, wciCodeMap, result) {
    if (matchedCodes.size >= Object.keys(wciCodeMap).length - 1) return; // -1 因为 WCI-COMPOSITE 不算在 routes 中
    
    const fallbackMap = [
        { code: 'WCI-SHA-RTM', label: wciCodeMap['WCI-SHA-RTM'], patterns: [
            /Shanghai.*?Rotterdam[^$]*\$?\s*(\d[\d,]*)/i,
            /SHA.*?RTM[^$]*\$?\s*(\d[\d,]*)/i,
            /上海.*?鹿特丹[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-SHA-GOA', label: wciCodeMap['WCI-SHA-GOA'], patterns: [
            /Shanghai.*?Genoa[^$]*\$?\s*(\d[\d,]*)/i,
            /SHA.*?GOA[^$]*\$?\s*(\d[\d,]*)/i,
            /上海.*?热那亚[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-SHA-LAX', label: wciCodeMap['WCI-SHA-LAX'], patterns: [
            /Shanghai.*?Los Angeles[^$]*\$?\s*(\d[\d,]*)/i,
            /SHA.*?LAX[^$]*\$?\s*(\d[\d,]*)/i,
            /上海.*?洛杉矶[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-SHA-NYC', label: wciCodeMap['WCI-SHA-NYC'], patterns: [
            /Shanghai.*?New York[^$]*\$?\s*(\d[\d,]*)/i,
            /SHA.*?NYC[^$]*\$?\s*(\d[\d,]*)/i,
            /上海.*?纽约[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-RTM-SHA', label: wciCodeMap['WCI-RTM-SHA'], patterns: [
            /Rotterdam.*?Shanghai[^$]*\$?\s*(\d[\d,]*)/i,
            /RTM.*?SHA[^$]*\$?\s*(\d[\d,]*)/i,
            /鹿特丹.*?上海[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-LAX-SHA', label: wciCodeMap['WCI-LAX-SHA'], patterns: [
            /Los Angeles.*?Shanghai[^$]*\$?\s*(\d[\d,]*)/i,
            /LAX.*?SHA[^$]*\$?\s*(\d[\d,]*)/i,
            /洛杉矶.*?上海[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-NYC-RTM', label: wciCodeMap['WCI-NYC-RTM'], patterns: [
            /New York.*?Rotterdam[^$]*\$?\s*(\d[\d,]*)/i,
            /NYC.*?RTM[^$]*\$?\s*(\d[\d,]*)/i,
            /纽约.*?鹿特丹[^$]*\$?\s*(\d[\d,]*)/i
        ]},
        { code: 'WCI-RTM-NYC', label: wciCodeMap['WCI-RTM-NYC'], patterns: [
            /Rotterdam.*?New York[^$]*\$?\s*(\d[\d,]*)/i,
            /RTM.*?NYC[^$]*\$?\s*(\d[\d,]*)/i,
            /鹿特丹.*?纽约[^$]*\$?\s*(\d[\d,]*)/i
        ]}
    ];
    
    fallbackMap.forEach(({ code, label, patterns }) => {
        if (!matchedCodes.has(code)) {
            for (const pattern of patterns) {
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(normalized)) !== null) {
                    const value = parseFloat(match[1].replace(/,/g, ''));
                    if (isFinite(value) && value > 0) {
                        result.routes.push({ code, route: label, rate: value });
                        matchedCodes.add(code);
                        if (getCachedDebugMode()) {
                            console.log(`[WCI] Fallback匹配成功: ${code} (${label})`, { value, pattern: pattern.toString() });
                        }
                        break;
                    }
                }
                if (matchedCodes.has(code)) break;
            }
        }
    });
}

/**
 * 解析WCI文本 - 匹配复合指数
 * @param {string} normalized - 规范化后的文本
 * @param {Object} result - 结果对象
 */
function parseWciComposite(normalized, result) {
    if (result.worldIndex !== null) return;
    
    const compositeMatch = normalized.match(/World Container Index.*?(decreased|increased)\s+(\d+)%\s+to\s+\$([\d,]+)/i);
    if (compositeMatch) {
        const sign = compositeMatch[1].toLowerCase().includes('decrease') ? -1 : 1;
        result.changePct = sign * parseFloat(compositeMatch[2]);
        const compositeValue = parseFloat(compositeMatch[3].replace(/,/g, ''));
        if (isFinite(compositeValue)) {
            result.worldIndex = compositeValue;
        }
    }
}

/**
 * 解析WCI文本
 * @param {string} text - 文本内容
 * @returns {Object} WCI数据
 */
function parseWciText(text) {
    if (typeof wciCodeMap === 'undefined') {
        console.warn('wciCodeMap 未定义，请在页面中声明');
        return { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
    }
    const normalized = text.replace(/\r/g, ' ');
    const result = { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
    
    // 调试：检查文本内容（仅在调试模式下）
    const DEBUG_MODE = getCachedDebugMode();
    if (DEBUG_MODE) {
        console.log('[WCI] 文本长度:', normalized.length);
        console.log('[WCI] 文本前500字符:', normalized.substring(0, 500));
        const numberMatches = normalized.match(/\$\s*[\d,]+/g);
        if (numberMatches) {
            console.log('[WCI] 找到的价格数据（前20个）:', numberMatches.slice(0, 20));
        }
        const cityMatches = normalized.match(/(Shanghai|Rotterdam|Los Angeles|New York|Genoa)/gi);
        if (cityMatches) {
            console.log('[WCI] 找到的城市名称（前20个）:', cityMatches.slice(0, 20));
        }
        const wciCodeMatches = normalized.match(/WCI-[A-Z-]+/gi);
        if (wciCodeMatches) {
            console.log('[WCI] 找到的 WCI 代码（前20个）:', wciCodeMatches.slice(0, 20));
        }
    }
    
    // 策略1和2：匹配代码和标签
    Object.entries(wciCodeMap).forEach(([code, label]) => {
        let matched = parseWciByCode(normalized, code, label, result);
        if (!matched) {
            matched = parseWciByLabel(normalized, code, label, result);
        }
        if (!matched && getCachedDebugMode()) {
            console.warn(`[WCI] 未匹配到: ${code} (${label})`);
        }
    });
    
    // 策略3：Fallback匹配
    const matchedCodes = new Set(result.routes.map(r => r.code));
    parseWciByFallback(normalized, matchedCodes, wciCodeMap, result);
    
    // 匹配复合指数
    parseWciComposite(normalized, result);
    
    return result;
}

/**
 * 渲染WCI状态
 */
function renderWciStatus() {
    if (typeof wciStatusEl === 'undefined' || !wciStatusEl) return;
    if (typeof wciData === 'undefined' || !wciData) {
        wciStatusEl.textContent = '尚未抓取 WCI 数据';
        if (typeof wciUpdatedEl !== 'undefined' && wciUpdatedEl) {
            wciUpdatedEl.textContent = '最近更新时间：—';
        }
        return;
    }
    const lines = [];
    if (typeof wciData.worldIndex === 'number') {
        let headline = `全球指数：${wciData.worldIndex.toLocaleString()} USD/FEU`;
        if (typeof wciData.worldIndexWoW === 'number') {
            headline += `（WoW ${formatPercent(wciData.worldIndexWoW)}）`;
        } else if (typeof wciData.changePct === 'number') {
            headline += `（${wciData.changePct >= 0 ? '+' : ''}${wciData.changePct}% WoW）`;
        }
        lines.push(headline);
    }
    if (wciData.routes?.length) {
        wciData.routes.slice(0, 8).forEach(route => {
            const codeLabel = route.code ? `${route.code} ` : '';
            let detail = `${codeLabel}${route.route}：${route.rate.toLocaleString()} USD/FEU`;
            if (typeof route.wow === 'number') {
                detail += `（WoW ${formatPercent(route.wow)}）`;
            }
            lines.push(detail);
        });
    }
    wciStatusEl.textContent = lines.length ? lines.join('\n') : '未解析到航线价格';
    if (typeof wciUpdatedEl !== 'undefined' && wciUpdatedEl) {
        wciUpdatedEl.textContent = `最近更新时间：${new Date(wciData.timestamp).toLocaleString()}`;
    }
}

// FBX 代码映射（需要在页面中声明或使用全局变量）
// const fbxCodeMap = {
//     FBX: 'FBX（Freightos Baltic Index 全球综合）',
//     FBX01: 'FBX01 中国/东亚 → 北美西海岸',
//     FBX02: 'FBX02 北美西海岸 → 中国/东亚',
//     FBX03: 'FBX03 中国/东亚 → 北美东海岸',
//     FBX04: 'FBX04 北美东海岸 → 中国/东亚',
//     FBX11: 'FBX11 中国/东亚 → 北欧',
//     FBX12: 'FBX12 北欧 → 中国/东亚',
//     FBX13: 'FBX13 中国/东亚 → 地中海',
//     FBX14: 'FBX14 地中海 → 中国/东亚',
//     FBX21: 'FBX21 北美东海岸 → 北欧',
//     FBX22: 'FBX22 北欧 → 北美东海岸',
//     FBX24: 'FBX24 欧洲 → 南美东海岸',
//     // ... 更多映射
// };

/**
 * 抓取FBX数据
 * @param {boolean} force - 是否强制刷新
 * @returns {Promise<Object>} FBX数据
 */
async function fetchFbxData(force = false) {
    if (typeof fbxData === 'undefined' || typeof fbxStatusEl === 'undefined') {
        console.warn('fbxData 或 fbxStatusEl 未定义，请在页面中声明');
        return null;
    }
    const threeHours = 3 * 60 * 60 * 1000;
    if (!force && fbxData && Date.now() - fbxData.timestamp < threeHours) {
        renderFbxStatus();
        return fbxData;
    }
    if (fbxStatusEl) fbxStatusEl.textContent = '正在抓取 FBX 数据...';
    const url = 'https://r.jina.ai/https://fbx.freightos.com/';
    const text = await fetchTextContent(url);
    fbxData = parseFbxText(text);
    if (typeof CACHE_KEYS !== 'undefined' && typeof saveCachedData !== 'undefined') {
        saveCachedData(CACHE_KEYS.fbx, fbxData);
    }
    renderFbxStatus();
    return fbxData;
}

/**
 * 解析FBX文本
 * @param {string} text - 文本内容
 * @returns {Object} FBX数据
 */
function parseFbxText(text) {
    if (typeof fbxCodeMap === 'undefined') {
        console.warn('fbxCodeMap 未定义，请在页面中声明');
        return { timestamp: Date.now(), indices: [] };
    }
    const normalized = text.replace(/\r/g, '');
    const indices = [];
    Object.entries(fbxCodeMap).forEach(([code, label]) => {
        const idx = normalized.indexOf(code);
        if (idx === -1) return;
        const segment = normalized.slice(idx, idx + 300);
        const priceMatch = segment.match(/\$([0-9.,]+)/);
        const changeMatch = segment.match(/([+\-]?\d+(?:\.\d+)?)%/);
        if (priceMatch) {
            const rate = parseFloat(priceMatch[1].replace(/,/g, ''));
            if (isFinite(rate)) {
                indices.push({
                    code,
                    label,
                    rate,
                    wow: changeMatch ? parseFloat(changeMatch[1]) : null
                });
            }
        }
    });
    return { timestamp: Date.now(), indices };
}

/**
 * 渲染FBX状态
 */
function renderFbxStatus() {
    if (typeof fbxStatusEl === 'undefined' || !fbxStatusEl) return;
    if (typeof fbxData === 'undefined' || !fbxData || !fbxData.indices?.length) {
        fbxStatusEl.textContent = '尚未抓取 FBX 数据';
        if (typeof fbxUpdatedEl !== 'undefined' && fbxUpdatedEl) {
            fbxUpdatedEl.textContent = '最近更新时间：—';
        }
        return;
    }
    const lines = [];
    fbxData.indices.forEach(item => {
        let line = `${item.label}：${item.rate.toLocaleString()} USD/FEU`;
        if (typeof item.wow === 'number') {
            line += `（WoW ${formatPercent(item.wow)}）`;
        }
        lines.push(line);
    });
    fbxStatusEl.textContent = lines.join('\n');
    if (typeof fbxUpdatedEl !== 'undefined' && fbxUpdatedEl) {
        fbxUpdatedEl.textContent = `最近更新时间：${new Date(fbxData.timestamp).toLocaleString()}`;
    }
}

// ============================================
// AI 提示词构建辅助函数
// ============================================

/**
 * 准备分析数据（公共逻辑）
 * @param {Array} analysisGroups - 分析组数据
 * @param {Array} weekColumns - 周别列数据
 * @param {Function} showError - 错误显示函数
 * @param {Object} ErrorType - 错误类型枚举
 * @returns {Object|null} 返回 { analysisData, weeklySummary, analysisWeekCodes, analysisWeekLabels } 或 null
 */
function prepareAnalysisData(analysisGroups, weekColumns, showError, ErrorType) {
    if (!analysisGroups.length) {
        showError(ErrorType.DATA_VALIDATION, 'NO_ROUTE_DATA');
        return null;
    }

    const weekCodes = weekColumns.map(week => week.code);
    if (!weekCodes.length) {
        showError(ErrorType.DATA_VALIDATION, 'NO_WEEK_DATA');
        return null;
    }

    const labelByCode = {};
    weekColumns.forEach(week => {
        const range = week.range ? ` (${week.range})` : '';
        labelByCode[week.code] = `${week.label}${range}`;
    });

    const analysisWeekCodes = weekCodes.length > 1 ? weekCodes.slice(1) : weekCodes;
    if (!analysisWeekCodes.length) {
        showError(ErrorType.DATA_VALIDATION, 'NO_ANALYSIS_DATA');
        return null;
    }
    const analysisWeekLabels = analysisWeekCodes.map(code => labelByCode[code] || code);

    const analysisData = [];
    const weeklySummary = {};
    analysisWeekCodes.forEach(code => {
        weeklySummary[code] = { capacity: 0, ships: 0 };
    });

    analysisGroups.forEach(item => {
        const weekData = {};
        analysisWeekCodes.forEach(weekCode => {
            const ships = item.weeks[weekCode] || [];
            const totalCapacity = ships.reduce((sum, ship) => sum + (ship.capacity || 0), 0);
            const shipCount = ships.length;
            weeklySummary[weekCode].capacity += totalCapacity;
            weeklySummary[weekCode].ships += shipCount;
            weekData[weekCode] = {
                capacity: totalCapacity,
                ships: shipCount
            };
        });
        analysisData.push({
            ...item, // 保留所有原始字段（port, routeLabel, area, subArea, country等）
            weeks: weekData
        });
    });

    if (!analysisData.length) {
        showError(ErrorType.DATA_VALIDATION, 'NO_ROUTE_DATA');
        return null;
    }

    return { analysisData, weeklySummary, analysisWeekCodes, analysisWeekLabels };
}

/**
 * 构建数据概览部分
 * @param {string} destinationSummary - 目的地摘要
 * @param {number} routeCount - 航线数量
 * @param {Array} analysisWeekCodes - 分析周别代码
 * @param {Array} analysisWeekLabels - 分析周别标签
 * @param {Object} weeklySummary - 周别汇总数据
 * @returns {string} 提示词片段
 */
function buildDataOverview(destinationSummary, routeCount, analysisWeekCodes, analysisWeekLabels, weeklySummary) {
    let prompt = `请分析以下船期数据，提供专业的趋势分析和预测：

【数据概览】
分析目的港路径：${destinationSummary}
分析航线数量：${routeCount}条

【当周+未来四周数据汇总】
`;

    analysisWeekCodes.forEach((weekCode, index) => {
        const weekLabel = analysisWeekLabels[index];
        const summary = weeklySummary[weekCode];
        prompt += `周别 ${weekLabel} (${weekCode}): 总运力 ${summary.capacity.toLocaleString()} TEU, 总派船数 ${summary.ships}艘\n`;
    });

    return prompt;
}

/**
 * 构建详细数据部分（001-04格式：只有port）
 * @param {Array} analysisData - 分析数据
 * @param {Array} analysisWeekCodes - 分析周别代码
 * @param {Array} analysisWeekLabels - 分析周别标签
 * @returns {string} 提示词片段
 */
function buildDetailedData001(analysisData, analysisWeekCodes, analysisWeekLabels) {
    let prompt = `\n【详细数据】
`;

    analysisData.forEach(item => {
        prompt += `\n港口：${item.port || '未分配'}，航线：${item.routeLabel || '未知航线'}\n`;
        analysisWeekCodes.forEach((weekCode, index) => {
            const weekLabel = analysisWeekLabels[index];
            const weekData = item.weeks[weekCode] || {};
            prompt += `  周别 ${weekLabel}: 运力 ${weekData.capacity.toLocaleString()} TEU, 派船 ${weekData.ships}艘\n`;
        });
    });

    return prompt;
}

/**
 * 构建详细数据部分（365-04格式：包含area/subArea/country/port）
 * @param {Array} analysisData - 分析数据
 * @param {Array} analysisWeekCodes - 分析周别代码
 * @param {Array} analysisWeekLabels - 分析周别标签
 * @returns {string} 提示词片段
 */
function buildDetailedData365(analysisData, analysisWeekCodes, analysisWeekLabels) {
    let prompt = `\n【详细数据】
`;

    analysisData.forEach(item => {
        prompt += `\n区域：${item.area} / ${item.subArea || '无子区域'} / ${item.country || '无国家信息'} / 港口：${item.port}，航线：${item.routeLabel || '未知航线'}\n`;
        analysisWeekCodes.forEach((weekCode, index) => {
            const weekLabel = analysisWeekLabels[index];
            const weekData = item.weeks[weekCode] || {};
            prompt += `  周别 ${weekLabel}: 运力 ${weekData.capacity.toLocaleString()} TEU, 派船 ${weekData.ships}艘\n`;
        });
    });

    return prompt;
}

/**
 * 构建其他影响因素部分
 * @param {Array} bookingData - 订舱数据
 * @returns {string} 提示词片段
 */
function buildBookingDataSection(bookingData) {
    if (!bookingData || bookingData.length === 0) {
        return '';
    }

    let prompt = `\n【其他影响因素（用户补充）】
`;
    bookingData.forEach((item, index) => {
        const title = item.remark || `数据项 ${index + 1}`;
        const description = item.description || '（用户未填写）';
        prompt += `\n- ${title}：${description}\n`;
    });

    return prompt;
}

/**
 * 构建市场周报部分
 * @param {Array} marketReports - 市场报告数组
 * @returns {string} 提示词片段
 */
function buildMarketReportsSection(marketReports) {
    if (!marketReports || marketReports.length === 0) {
        return '';
    }

    let prompt = `\n【市场周报 / 指数节选】
（以下内容来自用户上传PDF，请优先参考）
`;
    marketReports.forEach((report, index) => {
        const snippet = report.text.length > 1200 ? report.text.slice(0, 1200) + '…' : report.text;
        prompt += `\n报告 ${index + 1}（${report.name}）：
${snippet}
`;
    });

    return prompt;
}

/**
 * 构建燃油行情部分
 * @param {Object} bunkerData - 燃油数据
 * @returns {string} 提示词片段
 */
function buildBunkerDataSection(bunkerData) {
    if (!bunkerData || (!bunkerData.vlsfo && !bunkerData.mgo && !bunkerData.ifo380)) {
        return '';
    }

    let prompt = `\n【燃油行情（Ship & Bunker · 新加坡）】
`;
    if (bunkerData.vlsfo) {
        const delta = typeof bunkerData.vlsfo.delta === 'number' ? (bunkerData.vlsfo.delta >= 0 ? `+${bunkerData.vlsfo.delta.toFixed(2)}` : bunkerData.vlsfo.delta.toFixed(2)) : 'N/A';
        prompt += `- VLSFO 0.5%：${bunkerData.vlsfo.price?.toFixed(2) ?? 'N/A'} USD/t${delta !== 'N/A' ? `（WoW ${delta}）` : ''}\n`;
    }
    if (bunkerData.mgo) {
        const delta = typeof bunkerData.mgo.delta === 'number' ? (bunkerData.mgo.delta >= 0 ? `+${bunkerData.mgo.delta.toFixed(2)}` : bunkerData.mgo.delta.toFixed(2)) : 'N/A';
        prompt += `- MGO 0.1%：${bunkerData.mgo.price?.toFixed(2) ?? 'N/A'} USD/t${delta !== 'N/A' ? `（WoW ${delta}）` : ''}\n`;
    }
    if (bunkerData.ifo380) {
        const delta = typeof bunkerData.ifo380.delta === 'number' ? (bunkerData.ifo380.delta >= 0 ? `+${bunkerData.ifo380.delta.toFixed(2)}` : bunkerData.ifo380.delta.toFixed(2)) : 'N/A';
        prompt += `- IFO380：${bunkerData.ifo380.price?.toFixed(2) ?? 'N/A'} USD/t${delta !== 'N/A' ? `（WoW ${delta}）` : ''}\n`;
    }
    prompt += `（抓取时间：${new Date(bunkerData.timestamp).toLocaleString()}）\n`;

    return prompt;
}

/**
 * 构建CCFI数据部分
 * @param {Object} ccfiData - CCFI数据
 * @returns {string} 提示词片段
 */
function buildCcfiDataSection(ccfiData) {
    if (!ccfiData || !ccfiData.routes?.length) {
        return '';
    }

    let prompt = `\n【中国出口集装箱运价指数（CCFI）】
`;
    if (ccfiData.period) {
        prompt += `- 本期 ${ccfiData.period.current || '—'}，对比上期 ${ccfiData.period.previous || '—'}\n`;
    }
    ccfiData.routes.forEach(route => {
        const currentText = typeof route.current === 'number' ? route.current.toLocaleString() : '—';
        const previousText = typeof route.previous === 'number' ? route.previous.toLocaleString() : '—';
        prompt += `- ${route.label}：${currentText}（上期 ${previousText}，WoW ${formatPercent(route.wow)}）\n`;
    });

    return prompt;
}

/**
 * 构建WCI数据部分
 * @param {Object} wciData - WCI数据
 * @returns {string} 提示词片段
 */
function buildWciDataSection(wciData) {
    if (!wciData || (typeof wciData.worldIndex !== 'number' && !wciData.routes?.length)) {
        return '';
    }

    let prompt = `\n【Drewry WCI 现货趋势】
`;
    if (typeof wciData.worldIndex === 'number') {
        const changeValue = typeof wciData.worldIndexWoW === 'number'
            ? `（WoW ${formatPercent(wciData.worldIndexWoW)}）`
            : (typeof wciData.changePct === 'number' ? `（${wciData.changePct >= 0 ? '+' : ''}${wciData.changePct}% WoW）` : '');
        prompt += `- 全球指数：${wciData.worldIndex.toLocaleString()} USD/FEU${changeValue}\n`;
    }
    if (wciData.routes?.length) {
        wciData.routes.slice(0, 6).forEach(route => {
            const codeLabel = route.code ? `${route.code} ` : '';
            const wowText = typeof route.wow === 'number' ? `（WoW ${formatPercent(route.wow)}）` : '';
            prompt += `- ${codeLabel}${route.route}：${route.rate.toLocaleString()} USD/FEU${wowText}\n`;
        });
    }

    return prompt;
}

/**
 * 构建FBX数据部分
 * @param {Object} fbxData - FBX数据
 * @returns {string} 提示词片段
 */
function buildFbxDataSection(fbxData) {
    if (!fbxData || !fbxData.indices?.length) {
        return '';
    }

    let prompt = `\n【Freightos FBX 航线指数】
`;
    fbxData.indices.forEach(item => {
        const wowText = typeof item.wow === 'number' ? `（WoW ${formatPercent(item.wow)}）` : '';
        prompt += `- ${item.label}：${item.rate.toLocaleString()} USD/FEU${wowText}\n`;
    });

    return prompt;
}

