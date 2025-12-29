/**
 * 市场数据抓取工具函数
 * 
 * 从 market-analysis-utils.js 拆分出来的市场数据抓取相关函数
 * 包含：Bunker、CCFI、WCI、FBX 等市场数据的抓取和解析
 * 
 * 依赖：
 * - common-utils.js: escapeRegex, computePercentChange, formatPercent
 * - debug-utils.js: debugLog, debugWarn, debugError, getCachedDebugMode
 * 
 * 全局变量依赖（需要在页面中声明）：
 * - bunkerData, bunkerStatusEl, bunkerUpdatedEl
 * - ccfiData, ccfiStatusEl, ccfiUpdatedEl, ccfiRoutes
 * - wciData, wciStatusEl, wciUpdatedEl, wciCodeMap
 * - fbxData, fbxStatusEl, fbxUpdatedEl, fbxCodeMap
 * - CACHE_KEYS, loadCachedData, saveCachedData
 */

(function() {
    'use strict';

    // ============================================
    // 工具函数
    // ============================================

    /**
     * 从缓存中应用 WoW（周环比）数据
     * @param {Object} current - 当前数据
     * @param {Object} previous - 上期数据
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
                    const wow = window.computePercentChange ? window.computePercentChange(item[valueKey], prevMap.get(key)) : null;
                    if (wow !== null) {
                        item.wow = wow;
                    }
                }
            });
        }
        if (typeof current.worldIndex === 'number' && typeof previous.worldIndex === 'number') {
            current.worldIndexWoW = window.computePercentChange ? window.computePercentChange(current.worldIndex, previous.worldIndex) : null;
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
                if (window.debugWarn) {
                    window.debugWarn('自定义编码解析失败，回退到默认编码', error);
                }
            }
        }
        return response.text();
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

    // ============================================
    // Bunker 数据抓取
    // ============================================

    /**
     * 抓取燃油数据
     * @param {boolean} force - 是否强制刷新
     * @returns {Promise<Object>} 燃油数据
     */
    async function fetchBunkerData(force = false) {
        if (typeof bunkerData === 'undefined' || typeof bunkerStatusEl === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('bunkerData 或 bunkerStatusEl 未定义，请在页面中声明');
            }
            return null;
        }
        const sixHours = 6 * 60 * 60 * 1000;
        if (!force && bunkerData && Date.now() - bunkerData.timestamp < sixHours) {
            updateBunkerStatus();
            return bunkerData;
        }
        if (bunkerStatusEl) {
            bunkerStatusEl.textContent = '正在从 Ship & Bunker 抓取...';
        }
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

    // ============================================
    // CCFI 数据抓取
    // ============================================

    /**
     * 抓取CCFI数据
     * @param {boolean} force - 是否强制刷新
     * @returns {Promise<Object>} CCFI数据
     */
    async function fetchCcfiData(force = false) {
        if (typeof ccfiData === 'undefined' || typeof ccfiStatusEl === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('ccfiData 或 ccfiStatusEl 未定义，请在页面中声明');
            }
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
     */
    function parseAndValidateCcfiMatch(match, route, strategyName) {
        const parseNumber = (str) => {
            if (!str) return null;
            return parseFloat(String(str).replace(/,/g, ''));
        };
        
        const previous = parseNumber(match[1]);
        const current = parseNumber(match[2]);
        const wow = match[3] ? parseNumber(match[3]) : null;
        
        const previousValid = previous !== null && isFinite(previous) && previous > 50 && previous < 5000;
        const currentValid = current !== null && isFinite(current) && current > 50 && current < 5000;
        const wowValid = wow !== null && isFinite(wow) && Math.abs(wow) < 100;
        
        if (previousValid && currentValid) {
            const result = {
                id: route.match,
                label: route.label,
                previous: previous,
                current: current,
                wow: wowValid ? wow : null
            };
            
            if (window.getCachedDebugMode && window.getCachedDebugMode()) {
                if (window.debugLog) {
                    window.debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
                }
            }
            
            return result;
        }
        
        return null;
    }

    /**
     * 解析并验证 CCFI 匹配结果（仅当前值）
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
            
            if (window.getCachedDebugMode && window.getCachedDebugMode()) {
                if (window.debugLog) {
                    window.debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { current });
                }
            }
            
            return result;
        }
        
        return null;
    }

    /**
     * 尝试匹配 CCFI 航线数据
     */
    function tryMatchCcfiRoute(regexOrPattern, normalized, route, strategyName, parseFn) {
        const regex = typeof regexOrPattern === 'string' 
            ? getCachedRegex(regexOrPattern) 
            : regexOrPattern;
        
        regex.lastIndex = 0;
        let match;
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
     */
    function parseCcfiText(text) {
        if (typeof ccfiRoutes === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('ccfiRoutes 未定义，请在页面中声明');
            }
            return { timestamp: Date.now(), period: null, routes: [] };
        }
        
        const htmlMatch = text.match(/<table[^>]*class=["']lb1["'][^>]*>[\s\S]*?<\/table>/i);
        if (htmlMatch) {
            return parseCcfiFromHtml(htmlMatch[0]);
        }
        
        const normalized = text.replace(/\r/g, '');
        const headerMatch = normalized.match(/上期(\d{4}-\d{2}-\d{2}).*?本期(\d{4}-\d{2}-\d{2})/);
        const result = {
            timestamp: Date.now(),
            period: headerMatch ? { previous: headerMatch[1], current: headerMatch[2] } : null,
            routes: []
        };
        
        const DEBUG_MODE = window.getCachedDebugMode ? window.getCachedDebugMode() : false;
        if (DEBUG_MODE && window.debugLog) {
            window.debugLog('[CCFI] 文本长度:', normalized.length);
        }
        
        const escapeRegex = window.escapeRegex || function(text) {
            return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };
        
        const escapedRoutes = ccfiRoutes.map(route => ({
            ...route,
            escaped: escapeRegex(route.match),
            target: route.parenthesized ? `\\(${escapeRegex(route.match)}\\)` : escapeRegex(route.match),
            labelEscaped: escapeRegex(route.label || '')
        }));
        
        escapedRoutes.forEach((route) => {
            let found = false;
            
            const tablePattern = `${route.target}[\\s\\S]{0,500}([\\d,\\.]+)\\s*[|]\\s*([\\d,\\.]+)\\s*[|]\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
            let matchResult = tryMatchCcfiRoute(tablePattern, normalized, route, '策略1（表格格式）', parseAndValidateCcfiMatch);
            if (matchResult) {
                result.routes.push(matchResult);
                found = true;
            }
            
            if (!found) {
                const spacePattern = `${route.target}[\\s\\S]{0,500}([\\d,\\.]+)\\s+([\\d,\\.]+)\\s*([+\\-]?\\d+(?:\\.\\d+)?)`;
                matchResult = tryMatchCcfiRoute(spacePattern, normalized, route, '策略1（空格格式）', parseAndValidateCcfiMatch);
                if (matchResult) {
                    result.routes.push(matchResult);
                    found = true;
                }
            }
            
            if (!found && route.parenthesized && route.match) {
                const currentOnlyPattern = `${route.target}([\\d,\\.]+)`;
                matchResult = tryMatchCcfiRoute(currentOnlyPattern, normalized, route, '策略1.5（仅当前值）', parseAndValidateCcfiMatchCurrentOnly);
                if (matchResult) {
                    result.routes.push(matchResult);
                    found = true;
                }
            }
            
            if (!found && route.label) {
                const labelCurrentPattern = `${route.labelEscaped}[：:：\\s]*([\\d,\\.]+)`;
                matchResult = tryMatchCcfiRoute(labelCurrentPattern, normalized, route, '策略3', (match, route, strategyName) => {
                    const parseNumber = (str) => {
                        if (!str) return null;
                        return parseFloat(String(str).replace(/,/g, ''));
                    };
                    const current = parseNumber(match[1]);
                    if (isFinite(current) && current > 0) {
                        return {
                            id: route.match,
                            label: route.label,
                            previous: null,
                            current: current,
                            wow: null
                        };
                    }
                    return null;
                });
                if (matchResult) {
                    result.routes.push(matchResult);
                    found = true;
                }
            }
        });
        
        return result;
    }

    /**
     * 从HTML表格中解析CCFI数据
     */
    function parseCcfiFromHtml(html) {
        const result = {
            timestamp: Date.now(),
            period: null,
            routes: []
        };
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const table = tempDiv.querySelector('table.lb1') || tempDiv.querySelector('table');
        if (!table) {
            return result;
        }
        
        const headerRow = table.querySelector('tr.csx1') || table.querySelector('tr');
        if (!headerRow) {
            return result;
        }
        
        const headerCells = headerRow.querySelectorAll('td');
        if (headerCells.length >= 3) {
            const prevDateText = headerCells[1].textContent || '';
            const currDateText = headerCells[2].textContent || '';
            
            const prevDateMatch = prevDateText.match(/(\d{4}-\d{2}-\d{2})/);
            const currDateMatch = currDateText.match(/(\d{4}-\d{2}-\d{2})/);
            
            if (prevDateMatch && currDateMatch) {
                result.period = {
                    previous: prevDateMatch[1].replace(/-/g, '/'),
                    current: currDateMatch[1].replace(/-/g, '/')
                };
            }
        }
        
        const dataRows = Array.from(table.querySelectorAll('tr')).slice(1);
        
        dataRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) {
                return;
            }
            
            const routeNameCell = cells[0];
            let routeName = '';
            
            const pTags = routeNameCell.querySelectorAll('p');
            if (pTags.length > 0) {
                routeName = Array.from(pTags).map(p => p.textContent.trim()).join(' ');
            } else {
                routeName = routeNameCell.textContent.trim();
            }
            
            const prevValueText = cells[1].textContent.trim();
            const prevValue = parseFloat(prevValueText.replace(/,/g, '')) || null;
            
            const currValueText = cells[2].textContent.trim();
            const currValue = parseFloat(currValueText.replace(/,/g, '')) || null;
            
            const wowText = cells[3].textContent.trim().replace('%', '');
            const wow = parseFloat(wowText) || null;
            
            if (routeName && (prevValue !== null || currValue !== null)) {
                let matchedRoute = null;
                
                if (typeof ccfiRoutes !== 'undefined') {
                    matchedRoute = ccfiRoutes.find(r => routeName.includes(r.label));
                    
                    if (!matchedRoute) {
                        matchedRoute = ccfiRoutes.find(r => {
                            const matchText = r.match.toUpperCase();
                            return routeName.toUpperCase().includes(matchText) || 
                                   matchText.includes(routeName.toUpperCase());
                        });
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
            
            if (prevDate && currDate && route.previous !== null && route.current !== null) {
                lines.push(`${route.label}：上期(${prevDate}) ${prevValue}，本期(${currDate}) ${currValue}，WoW ${wowValue}`);
            } else if (route.current !== null) {
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

    // 导出到全局
    window.applyWoWFromCache = applyWoWFromCache;
    window.fetchTextContent = fetchTextContent;
    window.getCachedRegex = getCachedRegex;
    window.fetchBunkerData = fetchBunkerData;
    window.extractBunkerTables = extractBunkerTables;
    window.parseBunkerTable = parseBunkerTable;
    window.updateBunkerStatus = updateBunkerStatus;
    window.describeBunkerLine = describeBunkerLine;
    window.fetchCcfiData = fetchCcfiData;
    window.parseAndValidateCcfiMatch = parseAndValidateCcfiMatch;
    window.parseAndValidateCcfiMatchCurrentOnly = parseAndValidateCcfiMatchCurrentOnly;
    window.tryMatchCcfiRoute = tryMatchCcfiRoute;
    window.parseCcfiText = parseCcfiText;
    window.parseCcfiFromHtml = parseCcfiFromHtml;
    window.renderCcfiStatus = renderCcfiStatus;

    // ============================================
    // WCI 数据抓取
    // ============================================

    /**
     * 尝试嵌入 Canva 设计到页面
     * @param {HTMLElement} container - 容器元素
     * @returns {Promise<boolean>} 是否成功嵌入
     */
    async function tryEmbedCanvaDesign(container) {
        if (!container) return false;
        
        const canvaUrl = 'https://www.canva.com/design/DAGyvxw2Quo/_qToj2NPUekM-ohMfZ9v9A/view?embed';
        
        return new Promise((resolve) => {
            // 创建 iframe
            const iframe = document.createElement('iframe');
            iframe.src = canvaUrl;
            // 使用 max-width: 900px 和 width: 100%，确保在大屏幕上达到 900px，小屏幕上响应式
            iframe.style.width = '100%';
            iframe.style.maxWidth = '900px';
            iframe.style.height = '500px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
            iframe.style.background = '#f5f5f5';
            iframe.style.display = 'block';
            iframe.allow = 'fullscreen';
            iframe.title = 'WCI 主要航线现货价';
            
            // 确保容器可以容纳 900px 宽度的 iframe
            // 移除容器的宽度限制，让它能够扩展到 900px
            if (container) {
                container.style.width = '100%';
                container.style.maxWidth = '900px';
                container.style.display = 'block';
                // 确保父元素（p 标签）也不限制宽度
                const parentP = container.parentElement;
                if (parentP && parentP.tagName === 'P') {
                    parentP.style.width = '100%';
                    parentP.style.maxWidth = '900px';
                    parentP.style.display = 'block';
                }
                // 确保 index-info 内的 div 也不限制宽度
                const parentDiv = parentP ? parentP.parentElement : null;
                if (parentDiv && parentDiv.classList.contains('index-info')) {
                    const contentDiv = parentDiv.querySelector('div:first-child');
                    if (contentDiv) {
                        contentDiv.style.width = '100%';
                        contentDiv.style.maxWidth = '900px';
                        contentDiv.style.flex = '1 1 auto';
                    }
                }
            }
            
            // 检测 iframe 是否成功加载
            let loadTimeout;
            const checkLoaded = () => {
                clearTimeout(loadTimeout);
                // 检查 iframe 内容是否加载（通过检查 iframe 的 contentWindow）
                try {
                    // 如果 iframe 加载成功，contentWindow 应该存在
                    if (iframe.contentWindow) {
                        // 等待一段时间确保内容渲染
                        setTimeout(() => {
                            // 检查 iframe 是否可见（简单检查）
                            const rect = iframe.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        }, 2000);
                    } else {
                        resolve(false);
                    }
                } catch (e) {
                    // 跨域限制，无法访问 contentWindow
                    // 但这不意味着加载失败，可能是正常情况
                    setTimeout(() => {
                        const rect = iframe.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }, 2000);
                }
            };
            
            // 设置超时（5秒后如果还没加载，认为失败）
            loadTimeout = setTimeout(() => {
                resolve(false);
            }, 5000);
            
            iframe.onload = checkLoaded;
            iframe.onerror = () => {
                clearTimeout(loadTimeout);
                resolve(false);
            };
            
            // 清空容器并添加 iframe
            container.innerHTML = '';
            container.appendChild(iframe);
        });
    }

    /**
     * 抓取WCI数据（优先尝试嵌入 Canva 设计，失败则解析文本）
     */
    async function fetchWciData(force = false) {
        if (typeof wciData === 'undefined' || typeof wciStatusEl === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('wciData 或 wciStatusEl 未定义，请在页面中声明');
            }
            return null;
        }
        const sixHours = 6 * 60 * 60 * 1000;
        if (!force && wciData && Date.now() - wciData.timestamp < sixHours) {
            renderWciStatus();
            return wciData;
        }
        if (wciStatusEl) wciStatusEl.textContent = '正在加载 WCI 数据...';
        
        // 第一步：尝试嵌入 Canva 设计到页面
        const canvaEmbedded = await tryEmbedCanvaDesign(wciStatusEl);
        
        if (canvaEmbedded) {
            // 嵌入成功，更新状态
            if (wciStatusEl) {
                // iframe 已经在容器中，不需要额外操作
                // 但我们可以尝试从 iframe 中提取数据（如果可能）
                // 由于跨域限制，通常无法直接访问 iframe 内容
                // 所以这里我们只显示嵌入的设计，不进行数据解析
                if (window.debugLog) {
                    window.debugLog('Canva 设计已成功嵌入到页面');
                }
            }
            if (typeof wciUpdatedEl !== 'undefined' && wciUpdatedEl) {
                wciUpdatedEl.textContent = `最近更新时间：${new Date().toLocaleString()}（实时显示）`;
            }
            // 返回一个标记，表示使用了嵌入方式
            return { timestamp: Date.now(), embedded: true, source: 'canva-embed' };
        }
        
        // 第二步：如果嵌入失败，使用文本解析方式
        if (window.debugWarn) {
            window.debugWarn('Canva 嵌入失败，使用文本解析方式');
        }
        
        if (wciStatusEl) wciStatusEl.textContent = '正在抓取 WCI 数据...';
        
        // 使用 Canva 嵌入链接（通过代理服务获取内容）
        const canvaUrl = 'https://www.canva.com/design/DAGyvxw2Quo/_qToj2NPUekM-ohMfZ9v9A/view?embed';
        const url = `https://r.jina.ai/${canvaUrl}`;
        
        try {
            const text = await fetchTextContent(url);
            if (typeof CACHE_KEYS !== 'undefined' && typeof loadCachedData !== 'undefined') {
                const previousCache = loadCachedData(CACHE_KEYS.wci);
                wciData = parseWciFromCanva(text);
                applyWoWFromCache(wciData, previousCache, { routeKey: 'code', valueKey: 'rate', targetCollection: 'routes' });
                if (typeof saveCachedData !== 'undefined') {
                    saveCachedData(CACHE_KEYS.wci, wciData);
                }
            } else {
                wciData = parseWciFromCanva(text);
            }
        } catch (error) {
            if (window.debugError) {
                window.debugError('WCI 数据抓取失败，尝试使用备用方法:', error);
            }
            // 备用方法：如果 Canva 链接失败，尝试原来的方法
            const fallbackUrl = 'https://r.jina.ai/https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry';
            const text = await fetchTextContent(fallbackUrl);
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
        }
        
        renderWciStatus();
        return wciData;
    }

    /**
     * 从 Canva 页面解析 WCI 数据（表格格式）
     * Canva 表格格式：
     * - 列：ROUTE / Route code / 11 Dec 2025 / 18 Dec 2025 / 25 Dec 2025 / Weekly change (%)
     * - 行：Composite Index, Shanghai - Rotterdam, Rotterdam - Shanghai, 等
     */
    function parseWciFromCanva(text) {
        if (typeof wciCodeMap === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('wciCodeMap 未定义，请在页面中声明');
            }
            return { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
        }
        
        const normalized = text.replace(/\r/g, ' ').replace(/\n/g, ' ');
        const result = { timestamp: Date.now(), worldIndex: null, worldIndexWoW: null, changePct: null, routes: [] };
        
        // 解析更新时间（从 Canva 卡片中提取）
        // 格式：最近更新时间: 2025/12/28 13:56:04
        const updateTimeMatch = normalized.match(/最近更新时间[：:]\s*(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}:\d{2})/i);
        if (updateTimeMatch) {
            try {
                const timeStr = updateTimeMatch[1];
                const date = new Date(timeStr.replace(/\//g, '-'));
                if (!isNaN(date.getTime())) {
                    result.timestamp = date.getTime();
                }
            } catch (e) {
                // 忽略日期解析错误
            }
        }
        
        // 解析 Composite Index（从表格中）
        // 格式：Composite Index / WCI-COMPOSITE / $1,957 / $2,182 / $2,213 / 1%
        const compositeMatch = normalized.match(/Composite\s+Index[^$]*WCI-COMPOSITE[^$]*\$([\d,]+)[^$]*\$([\d,]+)[^$]*\$([\d,]+)[^%]*(\d+)%/i);
        if (compositeMatch) {
            // 三个价格值：第一个是 11 Dec，第二个是 18 Dec，第三个是 25 Dec（最新）
            const price11Dec = parseFloat(compositeMatch[1].replace(/,/g, ''));
            const price18Dec = parseFloat(compositeMatch[2].replace(/,/g, ''));
            const price25Dec = parseFloat(compositeMatch[3].replace(/,/g, ''));
            
            // 取最新的价格（25 Dec 2025，即第三个值）作为 worldIndex
            if (isFinite(price25Dec) && price25Dec > 0) {
                result.worldIndex = price25Dec;
                // 保存所有三个日期的价格
                result.price11Dec = isFinite(price11Dec) && price11Dec > 0 ? price11Dec : null;
                result.price18Dec = isFinite(price18Dec) && price18Dec > 0 ? price18Dec : null;
                
                // 解析 Weekly change
                const changeValue = parseFloat(compositeMatch[4]);
                if (isFinite(changeValue)) {
                    // 检查是否有向上箭头或 "increased" 关键词
                    const contextBefore = normalized.substring(0, normalized.indexOf(compositeMatch[0]));
                    const contextAfter = normalized.substring(normalized.indexOf(compositeMatch[0]), normalized.indexOf(compositeMatch[0]) + 500);
                    const isIncrease = contextAfter.includes('↑') || contextAfter.includes('increased') || 
                                      contextAfter.toLowerCase().includes('up') || changeValue >= 0;
                    result.worldIndexWoW = isIncrease ? changeValue : -changeValue;
                    result.changePct = result.worldIndexWoW;
                }
            }
        }
        
        // 解析各航线数据（从表格中）
        // 表格格式：Shanghai - Rotterdam / WCI-SHA-RTM / $2,361 / $2,539 / $2,584 / 2%
        const routeOrder = [
            { code: 'WCI-COMPOSITE', label: 'Composite Index', routeName: 'Composite Index' },
            { code: 'WCI-SHA-RTM', label: '上海 → 鹿特丹', routeName: 'Shanghai - Rotterdam' },
            { code: 'WCI-RTM-SHA', label: '鹿特丹 → 上海', routeName: 'Rotterdam - Shanghai' },
            { code: 'WCI-SHA-GOA', label: '上海 → 热那亚', routeName: 'Shanghai - Genoa' },
            { code: 'WCI-SHA-LAX', label: '上海 → 洛杉矶', routeName: 'Shanghai - Los Angeles' },
            { code: 'WCI-LAX-SHA', label: '洛杉矶 → 上海', routeName: 'Los Angeles - Shanghai' },
            { code: 'WCI-SHA-NYC', label: '上海 → 纽约', routeName: 'Shanghai - New York' },
            { code: 'WCI-NYC-RTM', label: '纽约 → 鹿特丹', routeName: 'New York - Rotterdam' },
            { code: 'WCI-RTM-NYC', label: '鹿特丹 → 纽约', routeName: 'Rotterdam - New York' }
        ];
        
        routeOrder.forEach(({ code, label, routeName }) => {
            if (code === 'WCI-COMPOSITE') {
                // Composite Index 已经解析，跳过
                return;
            }
            
            // 匹配表格行：Route Name / Route Code / $price1 / $price2 / $price3 / change%
            // 使用路由名称和代码的组合来匹配
            const routeNameEscaped = routeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const codeEscaped = code.replace(/-/g, '\\-');
            
            // 尝试匹配：Route Name + Route Code + 三个价格 + Weekly change
            const tableRowMatch = normalized.match(
                new RegExp(`${routeNameEscaped}[^$]*${codeEscaped}[^$]*\\$([\\d,]+)[^$]*\\$([\\d,]+)[^$]*\\$([\\d,]+)[^%]*(\\d+)%`, 'i')
            );
            
            if (tableRowMatch) {
                // 三个价格值：第一个是 11 Dec，第二个是 18 Dec，第三个是 25 Dec（最新）
                const price11Dec = parseFloat(tableRowMatch[1].replace(/,/g, ''));
                const price18Dec = parseFloat(tableRowMatch[2].replace(/,/g, ''));
                const price25Dec = parseFloat(tableRowMatch[3].replace(/,/g, ''));
                
                // 取最新的价格（25 Dec 2025，即第三个值）作为 rate
                if (isFinite(price25Dec) && price25Dec > 0) {
                    const changeValue = parseFloat(tableRowMatch[4]);
                    const isIncrease = normalized.indexOf(tableRowMatch[0]) < normalized.indexOf(tableRowMatch[4])
                        ? normalized.substring(normalized.indexOf(tableRowMatch[0]), normalized.indexOf(tableRowMatch[4])).includes('↑') ||
                          normalized.substring(normalized.indexOf(tableRowMatch[0]), normalized.indexOf(tableRowMatch[4])).includes('increased')
                        : changeValue >= 0;
                    
                    result.routes.push({
                        code,
                        route: label,
                        rate: price25Dec, // 最新价格（25 Dec）
                        wow: isFinite(changeValue) ? (isIncrease ? changeValue : -changeValue) : null,
                        // 保存所有三个日期的价格用于表格显示
                        price11Dec: isFinite(price11Dec) && price11Dec > 0 ? price11Dec : null,
                        price18Dec: isFinite(price18Dec) && price18Dec > 0 ? price18Dec : null,
                        price25Dec: price25Dec
                    });
                    return; // 已从表格解析，跳过其他方法
                }
            }
            
            // 备用方法：只匹配代码和最新价格
            const codePriceMatch = normalized.match(new RegExp(`${codeEscaped}[^$]*25\\s+Dec\\s+2025[^$]*\\$([\\d,]+)`, 'i'));
            if (codePriceMatch) {
                const value = parseFloat(codePriceMatch[1].replace(/,/g, ''));
                if (isFinite(value) && value > 0) {
                    // 尝试解析 Weekly change
                    const weeklyChangeMatch = normalized.match(new RegExp(`${codeEscaped}[^%]*Weekly\\s+change[^%]*(\\d+)%`, 'i'));
                    let wowValue = null;
                    if (weeklyChangeMatch) {
                        const changeValue = parseFloat(weeklyChangeMatch[1]);
                        if (isFinite(changeValue)) {
                            const isIncrease = normalized.indexOf(codeEscaped) < normalized.indexOf(weeklyChangeMatch[0])
                                ? normalized.substring(normalized.indexOf(codeEscaped), normalized.indexOf(weeklyChangeMatch[0])).includes('↑') ||
                                  normalized.substring(normalized.indexOf(codeEscaped), normalized.indexOf(weeklyChangeMatch[0])).includes('increased')
                                : changeValue >= 0;
                            wowValue = isIncrease ? changeValue : -changeValue;
                        }
                    }
                    
                    result.routes.push({
                        code,
                        route: label,
                        rate: value,
                        wow: wowValue
                    });
                }
            }
        });
        
        return result;
    }

    /**
     * 解析WCI文本
     */
    function parseWciText(text) {
        if (typeof wciCodeMap === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('wciCodeMap 未定义，请在页面中声明');
            }
            return { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
        }
        const normalized = text.replace(/\r/g, ' ');
        const result = { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
        
        const escapeRegex = window.escapeRegex || function(text) {
            return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };
        
        Object.entries(wciCodeMap).forEach(([code, label]) => {
            const regex = getCachedRegex(`${code}\\s*(?:=|:)?\\s*\\$?([\\d,]+(?:\\.\\d+)?)`, 'gi');
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(normalized)) !== null) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                if (isFinite(value) && value > 0) {
                    if (code === 'WCI-COMPOSITE') {
                        result.worldIndex = value;
                        const changeRegex = getCachedRegex(`${code}[^%]*(?:\\(|\\s)([+\\-]?\\d+(?:\\.\\d+)?)%`, 'i');
                        const changeMatch = normalized.match(changeRegex);
                        if (changeMatch) {
                            result.changePct = parseFloat(changeMatch[1]);
                        }
                    } else {
                        result.routes.push({ code, route: label, rate: value });
                    }
                    break;
                }
            }
            
            if (code !== 'WCI-COMPOSITE') {
                const labelEscaped = escapeRegex(label);
                const labelRegex = getCachedRegex(`${labelEscaped}[：:：\\s]*\\$?([\\d,]+(?:\\.\\d+)?)`, 'gi');
                labelRegex.lastIndex = 0;
                let labelMatch;
                while ((labelMatch = labelRegex.exec(normalized)) !== null) {
                    const value = parseFloat(labelMatch[1].replace(/,/g, ''));
                    if (isFinite(value) && value > 0) {
                        result.routes.push({ code, route: label, rate: value });
                        break;
                    }
                }
            }
        });
        
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
     * 渲染WCI状态（表格格式）
     */
    function renderWciStatus() {
        if (typeof wciStatusEl === 'undefined' || !wciStatusEl) return;
        
        // 如果数据是嵌入模式，不进行文本渲染（iframe 已经显示）
        if (typeof wciData !== 'undefined' && wciData && wciData.embedded) {
            // 检查容器中是否已经有 iframe
            const existingIframe = wciStatusEl.querySelector('iframe');
            if (existingIframe) {
                // iframe 已存在，不需要重新渲染
                return;
            }
        }
        
        if (typeof wciData === 'undefined' || !wciData) {
            wciStatusEl.textContent = '尚未抓取 WCI 数据';
            if (typeof wciUpdatedEl !== 'undefined' && wciUpdatedEl) {
                wciUpdatedEl.textContent = '最近更新时间：—';
            }
            return;
        }
        
        // 清除可能存在的 iframe（如果嵌入失败，回退到表格显示）
        const existingIframe = wciStatusEl.querySelector('iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        // 构建表格 HTML
        const formatPercent = window.formatPercent || function(value) {
            if (typeof value !== 'number' || !isFinite(value)) return '—';
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
        };
        
        const formatPrice = (price) => {
            if (price === null || price === undefined || !isFinite(price)) return '—';
            return `$${price.toLocaleString()}`;
        };
        
        // 创建表格容器，设置合适的宽度和高度
        let tableHtml = '<div class="wci-table-container" style="max-width: 900px; max-height: 450px; overflow-x: auto; overflow-y: auto; margin-top: 10px;">';
        tableHtml += '<table class="wci-table" style="width: 100%; min-width: 800px; border-collapse: collapse; font-size: 12px;">';
        
        // 表头
        tableHtml += '<thead><tr style="background: #f5f5f5; font-weight: bold; position: sticky; top: 0; z-index: 10;">';
        tableHtml += '<th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd; width: 18%;">ROUTE</th>';
        tableHtml += '<th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd; width: 15%;">Route code</th>';
        tableHtml += '<th style="padding: 6px 8px; text-align: right; border: 1px solid #ddd; width: 14%;">11 Dec 2025</th>';
        tableHtml += '<th style="padding: 6px 8px; text-align: right; border: 1px solid #ddd; width: 14%;">18 Dec 2025</th>';
        tableHtml += '<th style="padding: 6px 8px; text-align: right; border: 1px solid #ddd; width: 14%;">25 Dec 2025</th>';
        tableHtml += '<th style="padding: 6px 8px; text-align: right; border: 1px solid #ddd; width: 15%;">Weekly change (%)</th>';
        tableHtml += '</tr></thead><tbody>';
        
        // Composite Index 行
        if (typeof wciData.worldIndex === 'number') {
            const wowText = typeof wciData.worldIndexWoW === 'number' 
                ? formatPercent(wciData.worldIndexWoW)
                : (typeof wciData.changePct === 'number' ? formatPercent(wciData.changePct) : '—');
            const wowValue = typeof wciData.worldIndexWoW === 'number' 
                ? wciData.worldIndexWoW 
                : (typeof wciData.changePct === 'number' ? wciData.changePct : null);
            
            // 尝试从数据中获取历史价格（如果已解析）
            const price11Dec = wciData.price11Dec || null;
            const price18Dec = wciData.price18Dec || null;
            const price25Dec = wciData.worldIndex;
            
            tableHtml += '<tr style="background: #f9f9f9;">';
            tableHtml += '<td style="padding: 5px 8px; border: 1px solid #ddd; font-weight: bold; white-space: nowrap;">Composite Index</td>';
            tableHtml += '<td style="padding: 5px 8px; border: 1px solid #ddd; white-space: nowrap; font-size: 11px;">WCI-COMPOSITE</td>';
            tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap;">${formatPrice(price11Dec)}</td>`;
            tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap;">${formatPrice(price18Dec)}</td>`;
            tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap;">${formatPrice(price25Dec)}</td>`;
            tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap; color: ${wowValue !== null && wowValue > 0 ? '#28a745' : wowValue !== null && wowValue < 0 ? '#dc3545' : '#6c757d'};">
                ${wowText !== '—' ? (wowValue > 0 ? '↑ ' : '') + wowText : '—'}
            </td>`;
            tableHtml += '</tr>';
        }
        
        // 各航线行（按固定顺序）
        const routeOrder = [
            { code: 'WCI-SHA-RTM', label: 'Shanghai - Rotterdam' },
            { code: 'WCI-RTM-SHA', label: 'Rotterdam - Shanghai' },
            { code: 'WCI-SHA-GOA', label: 'Shanghai - Genoa' },
            { code: 'WCI-SHA-LAX', label: 'Shanghai - Los Angeles' },
            { code: 'WCI-LAX-SHA', label: 'Los Angeles - Shanghai' },
            { code: 'WCI-SHA-NYC', label: 'Shanghai - New York' },
            { code: 'WCI-NYC-RTM', label: 'New York - Rotterdam' },
            { code: 'WCI-RTM-NYC', label: 'Rotterdam - New York' }
        ];
        
        routeOrder.forEach(({ code, label }) => {
            const route = wciData.routes?.find(r => r.code === code);
            if (route) {
                const price11Dec = route.price11Dec || null;
                const price18Dec = route.price18Dec || null;
                const price25Dec = route.rate || null;
                const wowText = typeof route.wow === 'number' ? formatPercent(route.wow) : '—';
                
                tableHtml += '<tr>';
                tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; white-space: nowrap;">${label}</td>`;
                tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; white-space: nowrap; font-size: 11px;">${code}</td>`;
                tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap;">${formatPrice(price11Dec)}</td>`;
                tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap;">${formatPrice(price18Dec)}</td>`;
                tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap;">${formatPrice(price25Dec)}</td>`;
                tableHtml += `<td style="padding: 5px 8px; border: 1px solid #ddd; text-align: right; white-space: nowrap; color: ${typeof route.wow === 'number' && route.wow > 0 ? '#28a745' : typeof route.wow === 'number' && route.wow < 0 ? '#dc3545' : '#6c757d'};">
                    ${wowText !== '—' ? (route.wow > 0 ? '↑ ' : '') + wowText : '—'}
                </td>`;
                tableHtml += '</tr>';
            }
        });
        
        tableHtml += '</tbody></table></div>';
        
        // 如果没有数据，显示提示
        if (!wciData.routes?.length && typeof wciData.worldIndex !== 'number') {
            wciStatusEl.textContent = '未解析到航线价格';
        } else {
            wciStatusEl.innerHTML = tableHtml;
        }
        
        if (typeof wciUpdatedEl !== 'undefined' && wciUpdatedEl) {
            wciUpdatedEl.textContent = `最近更新时间：${new Date(wciData.timestamp).toLocaleString()}`;
        }
    }

    // ============================================
    // FBX 数据抓取
    // ============================================

    /**
     * 抓取FBX数据
     */
    async function fetchFbxData(force = false) {
        if (typeof fbxData === 'undefined' || typeof fbxStatusEl === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('fbxData 或 fbxStatusEl 未定义，请在页面中声明');
            }
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
     */
    function parseFbxText(text) {
        if (typeof fbxCodeMap === 'undefined') {
            if (window.debugWarn) {
                window.debugWarn('fbxCodeMap 未定义，请在页面中声明');
            }
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
        const formatPercent = window.formatPercent || function(value) {
            if (typeof value !== 'number' || !isFinite(value)) return '—';
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
        };
        
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

    // 导出到全局
    window.fetchWciData = fetchWciData;
    window.tryEmbedCanvaDesign = tryEmbedCanvaDesign;
    window.parseWciText = parseWciText;
    window.parseWciFromCanva = parseWciFromCanva;
    window.renderWciStatus = renderWciStatus;
    window.fetchFbxData = fetchFbxData;
    window.parseFbxText = parseFbxText;
    window.renderFbxStatus = renderFbxStatus;

})();

