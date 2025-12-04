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
        alert(`解析 ${file.name} 失败：${error.message || error}`);
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
 * 解析CCFI文本
 * @param {string} text - 文本内容
 * @returns {Object} CCFI数据
 */
function parseCcfiText(text) {
    if (typeof ccfiRoutes === 'undefined') {
        console.warn('ccfiRoutes 未定义，请在页面中声明');
        return { timestamp: Date.now(), period: null, routes: [] };
    }
    const normalized = text.replace(/\r/g, '');
    const headerMatch = normalized.match(/上期(\d{4}-\d{2}-\d{2}).*?本期(\d{4}-\d{2}-\d{2})/);
    const result = {
        timestamp: Date.now(),
        period: headerMatch ? { previous: headerMatch[1], current: headerMatch[2] } : null,
        routes: []
    };
    ccfiRoutes.forEach(route => {
        const escaped = escapeRegex(route.match);
        const target = route.parenthesized ? `\\(${escaped}\\)` : escaped;
        const regex = new RegExp(`${target}[\\s\\S]{0,80}?([\\d\\.]+)\\s+([\\d\\.]+)\\s*([+\\-]?\\d+(?:\\.\\d+)?)`, 'i');
        const match = normalized.match(regex);
        if (match) {
            const previous = parseFloat(match[1]);
            const current = parseFloat(match[2]);
            const wow = parseFloat(match[3]);
            result.routes.push({
                id: route.match,
                label: route.label,
                previous: isFinite(previous) ? previous : null,
                current: isFinite(current) ? current : null,
                wow: isFinite(wow) ? wow : null
            });
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
    if (ccfiData.period) {
        lines.push(`本期：${ccfiData.period.current || '—'}（对比上期 ${ccfiData.period.previous || '—'}）`);
    }
    ccfiData.routes.forEach(route => {
        const currentText = typeof route.current === 'number' ? route.current.toLocaleString() : '—';
        const previousText = typeof route.previous === 'number' ? route.previous.toLocaleString() : '—';
        lines.push(`${route.label}：${currentText}（上期 ${previousText}，WoW ${formatPercent(route.wow)}）`);
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
    Object.entries(wciCodeMap).forEach(([code, label]) => {
        const regex = new RegExp(`${code}\\s*(?:=|:)?\\s*\\$?([\\d,]+(?:\\.\\d+)?)`, 'i');
        const match = normalized.match(regex);
        if (match) {
            const value = parseFloat(match[1].replace(/,/g, ''));
            if (isFinite(value)) {
                if (code === 'WCI-COMPOSITE') {
                    result.worldIndex = value;
                    const changeRegex = new RegExp(`${code}[^%]*(?:\\(|\\s)([+\\-]?\\d+(?:\\.\\d+)?)%`, 'i');
                    const changeMatch = normalized.match(changeRegex);
                    if (changeMatch) {
                        result.changePct = parseFloat(changeMatch[1]);
                    }
                } else {
                    result.routes.push({ code, route: label, rate: value });
                }
            }
        }
    });
    if (!result.routes.length) {
        const fallbackMap = [
            { code: 'WCI-SHA-RTM', label: wciCodeMap['WCI-SHA-RTM'], regex: /Shanghai to Rotterdam[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-SHA-GOA', label: wciCodeMap['WCI-SHA-GOA'], regex: /Shanghai to Genoa[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-SHA-LAX', label: wciCodeMap['WCI-SHA-LAX'], regex: /to Los Angeles[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-SHA-NYC', label: wciCodeMap['WCI-SHA-NYC'], regex: /Shanghai to New York[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-RTM-SHA', label: wciCodeMap['WCI-RTM-SHA'], regex: /Rotterdam to Shanghai[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-LAX-SHA', label: wciCodeMap['WCI-LAX-SHA'], regex: /Los Angeles to Shanghai[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-NYC-RTM', label: wciCodeMap['WCI-NYC-RTM'], regex: /New York to Rotterdam[^$]*\$(\d[\d,]*)/i },
            { code: 'WCI-RTM-NYC', label: wciCodeMap['WCI-RTM-NYC'], regex: /Rotterdam to New York[^$]*\$(\d[\d,]*)/i }
        ];
        fallbackMap.forEach(({ code, label, regex }) => {
            const match = normalized.match(regex);
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                if (isFinite(value)) {
                    result.routes.push({ code, route: label, rate: value });
                }
            }
        });
    }
    if (result.worldIndex === null) {
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

