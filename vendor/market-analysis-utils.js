/**
 * 市场分析工具 - AI 提示词构建函数
 * 用于 001-04-market-analysis.html 和 365-04-market-watch.html
 *
 * 注意：本文件已精简，仅保留核心 AI 提示词构建函数
 * 
 * 已拆分的功能模块：
 * - 数据标准化函数 → vendor/data-normalization-utils.js
 * - 周别处理函数 → vendor/week-processing-utils.js
 * - PDF处理函数 → vendor/pdf-processing-utils.js
 * - 市场数据抓取函数 → vendor/market-data-fetchers.js
 * 
 * 请使用 window.* 访问已拆分的函数（如 window.normalizePortName, window.parseWeekText 等）
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
 * 从页面获取"其他影响因素"表格数据
 * @param {string} [tableBodyId='bookingDataBody'] - 表格 tbody 的 ID
 * @returns {Array<Object>} 数据数组，每个对象包含 remark 和 description
 */
function getBookingData(tableBodyId = 'bookingDataBody') {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return [];
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const data = [];
    
    rows.forEach(row => {
        const remarkInput = row.querySelector('.booking-remark');
        const descInput = row.querySelector('.booking-desc');
        const remark = remarkInput ? remarkInput.value.trim() : '';
        const description = descInput ? descInput.value.trim() : '';
        
        if (remark || description) {
            data.push({
                remark,
                description
            });
        }
    });
    
    return data;
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
        // 使用 formatPercent 函数（如果可用），否则手动格式化
        const formatPercent = (typeof window !== 'undefined' && typeof window.formatPercent === 'function')
            ? window.formatPercent
            : (val) => {
                if (val === null || val === undefined || isNaN(val)) return '—';
                return val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
            };
        const wowText = typeof route.wow === 'number' ? formatPercent(route.wow) : '—';
        prompt += `- ${route.label}：${currentText}（上期 ${previousText}，WoW ${wowText}）\n`;
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
    // 使用 formatPercent 函数（如果可用），否则手动格式化
    const formatPercent = (typeof window !== 'undefined' && typeof window.formatPercent === 'function')
        ? window.formatPercent
        : (val) => {
            if (val === null || val === undefined || isNaN(val)) return '—';
            return val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
        };
    
    if (typeof wciData.worldIndex === 'number') {
        const changeValue = typeof wciData.worldIndexWoW === 'number'
            ? formatPercent(wciData.worldIndexWoW)
            : (typeof wciData.changePct === 'number' ? `${wciData.changePct >= 0 ? '+' : ''}${wciData.changePct}% WoW` : '');
        prompt += `- 全球指数：${wciData.worldIndex.toLocaleString()} USD/FEU${changeValue && changeValue !== '—' ? `（WoW ${changeValue}）` : ''}\n`;
    }
    if (wciData.routes?.length) {
        wciData.routes.slice(0, 6).forEach(route => {
            const codeLabel = route.code ? `${route.code} ` : '';
            const wowText = typeof route.wow === 'number' ? formatPercent(route.wow) : '';
            prompt += `- ${codeLabel}${route.route}：${route.rate.toLocaleString()} USD/FEU${wowText && wowText !== '—' ? `（WoW ${wowText}）` : ''}\n`;
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

    // 使用 formatPercent 函数（如果可用），否则手动格式化
    const formatPercent = (typeof window !== 'undefined' && typeof window.formatPercent === 'function')
        ? window.formatPercent
        : (val) => {
            if (val === null || val === undefined || isNaN(val)) return '—';
            return val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;
        };
    
    let prompt = `\n【Freightos FBX 航线指数】
`;
    fbxData.indices.forEach(item => {
        const wowText = typeof item.wow === 'number' ? formatPercent(item.wow) : '';
        prompt += `- ${item.label}：${item.rate.toLocaleString()} USD/FEU${wowText && wowText !== '—' ? `（WoW ${wowText}）` : ''}\n`;
    });

    return prompt;
}

/**
 * 构建 SCFI 数据部分（从市场报告中提取）
 * @param {Array} marketReports - 市场报告数组
 * @returns {string} 提示词片段
 */
function buildScfiDataSection(marketReports) {
    if (!marketReports || !Array.isArray(marketReports)) {
        return '';
    }
    
    // 查找包含 SCFI 数据的报告
    const reportsWithScfi = marketReports.filter(report => report.scfiData);
    if (reportsWithScfi.length === 0) {
        return '';
    }
    
    // 使用最新的报告数据
    const latestReport = reportsWithScfi[reportsWithScfi.length - 1];
    const scfiData = latestReport.scfiData;
    
    let prompt = `\n【上海出口集装箱运价指数（SCFI）- 来自 ${latestReport.name}】
`;
    
    if (scfiData.index) {
        prompt += `- SCFI 综合指数：${scfiData.index.toLocaleString()}\n`;
    }
    
    if (scfiData.routes && scfiData.routes.length > 0) {
        scfiData.routes.forEach(route => {
            const unitText = route.unit ? ` ${route.unit}` : '';
            const currentText = typeof route.current === 'number' 
                ? route.current.toLocaleString() 
                : '—';
            prompt += `- ${route.name}：${currentText}${unitText}\n`;
        });
    }
    
    return prompt;
}

// ============================================
// 导出函数到全局
// ============================================
if (typeof window !== 'undefined') {
    window.prepareAnalysisData = window.prepareAnalysisData || prepareAnalysisData;
    window.buildDataOverview = window.buildDataOverview || buildDataOverview;
    window.buildDetailedData001 = window.buildDetailedData001 || buildDetailedData001;
    window.buildDetailedData365 = window.buildDetailedData365 || buildDetailedData365;
    window.buildBookingDataSection = window.buildBookingDataSection || buildBookingDataSection;
    window.buildMarketReportsSection = window.buildMarketReportsSection || buildMarketReportsSection;
    window.buildBunkerDataSection = window.buildBunkerDataSection || buildBunkerDataSection;
    window.getBookingData = window.getBookingData || getBookingData;
    window.buildCcfiDataSection = window.buildCcfiDataSection || buildCcfiDataSection;
    window.buildWciDataSection = window.buildWciDataSection || buildWciDataSection;
    window.buildFbxDataSection = window.buildFbxDataSection || buildFbxDataSection;
    window.buildScfiDataSection = window.buildScfiDataSection || buildScfiDataSection;
}
