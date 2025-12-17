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
// 港口顺序常量（与 Monitor-Sailing-Schedule 保持一致）
// ============================================

/**
 * 标准港口顺序（按照航线区域顺序排列）
 * 用于 001-04 和 365-04 的港口排序
 */
const STANDARD_PORT_ORDER = [
    // 美西
    '长滩', '洛杉矶',
    // 美东
    '纽约',
    // 加拿大
    '温哥华',
    // 墨西哥
    '曼萨尼约', '墨西哥曼萨尼约',
    // 中南美
    '巴尔博亚', '考赛多', '库特扎尔',
    // 南美西
    '布埃纳文图拉', '圣安东尼奥',
    // 南美东
    '桑托斯',
    // 欧基
    '鹿特丹', '费利克斯托',
    // 地西
    '巴塞罗那', '巴塞罗纳', '瓦伦西亚',
    // 黑海
    '伊斯坦布尔',
    // 中东
    '杰贝阿里', '达曼',
    // 红海
    '吉达',
    // 印巴
    '吉大', '吉大港', '科伦坡', '纳瓦西瓦', '那瓦西瓦', '清奈',
    // 澳洲
    '布里斯班',
    // 东非
    '蒙巴萨',
    // 南非
    '德班',
    // 西非
    '黑角', '特马',
    // 香港
    '香港',
    // 台湾
    '高雄',
    // 新加坡
    '新加坡',
    // 马来
    '巴生西', '巴生北', '巴西古单', '槟城', '丹戎帕拉帕斯',
    // 泰国
    '林查班',
    // 越南
    '盖梅港', '盖美', '海防', '胡志明', '同奈',
    // 柬埔寨
    '西哈努克',
    // 印尼
    '雅加达', '泗水',
    // 菲律宾
    '马尼拉南', '马尼拉北'
];

/**
 * 标准区域顺序（用于 365-04 的大类排序）
 */
const STANDARD_AREA_ORDER = [
    '北美洲',
    '拉丁美洲',
    '欧洲',
    '中东红海印巴',
    '澳洲',
    '非洲',
    '东南亚'
];

/**
 * 港口名称匹配规则（处理不同数据源的港口名称差异，与 Monitor-Sailing-Schedule 保持一致）
 */
const PORT_NAME_MAPPING = {
    // 美西
    'LONG BEACH': '长滩',
    'LONG BEACH, CA': '长滩',
    'LONG BEACH,CA': '长滩',
    'LONG BEACH CA': '长滩',
    '长滩,加利福尼亚州': '长滩',
    'LOS ANGELES': '洛杉矶',
    'LOS ANGELES, CA': '洛杉矶',
    'LOS ANGELES,CA': '洛杉矶',
    'LOS ANGELES CA': '洛杉矶',
    '洛杉矶,加利福尼亚州': '洛杉矶',
    // 美东
    'NEW YORK': '纽约',
    'NEW YORK,NY': '纽约',
    'NEW YORK, NY': '纽约',
    'NEW YORK NY': '纽约',
    '纽约,纽约州': '纽约',
    // 加拿大
    'VANCOUVER': '温哥华',
    'VANCOUVER.BC': '温哥华',
    'VANCOUVER,BC': '温哥华',
    'VANCOUVER, BC': '温哥华',
    'VANCOUVER BC': '温哥华',
    // 墨西哥
    'MANZANILLO': '曼萨尼约',
    'MANZANILLO,MX': '曼萨尼约',
    'MANZANILLO, MX': '曼萨尼约',
    'MANZANILLO MX': '曼萨尼约',
    '墨西哥曼萨尼约': '曼萨尼约',
    // 中南美
    'BALBOA': '巴尔博亚',
    'BALBOA(巴尔博亚)': '巴尔博亚',
    'CAUCEDO': '考赛多',
    'PUERTO QUETZAL': '库特扎尔',
    // 南美西
    'BUENAVENTURA': '布埃纳文图拉',
    'BUENAVENTURA(布埃纳文图拉)': '布埃纳文图拉',
    'SAN ANTONIO': '圣安东尼奥',
    'SAN ANTONIO, CHILE': '圣安东尼奥',
    'SAN ANTONIO,CHILE': '圣安东尼奥',
    'SAN ANTONIO CHILE': '圣安东尼奥',
    // 南美东
    'SANTOS': '桑托斯',
    'SANTOS(桑托斯)': '桑托斯',
    // 欧基
    'ROTTERDAM': '鹿特丹',
    'ROTTERDAM,NL': '鹿特丹',
    'ROTTERDAM, NL': '鹿特丹',
    'ROTTERDAM NL': '鹿特丹',
    'FELIXSTOWE': '费利克斯托',
    'FELIXSTOWE(费利克斯托)': '费利克斯托',
    // 地西
    'BARCELONA': '巴塞罗那',
    'BARCELONA(巴塞罗纳)': '巴塞罗那',
    '巴塞罗纳': '巴塞罗那',
    'VALENCIA': '瓦伦西亚',
    'VALENCIA,ES': '瓦伦西亚',
    'VALENCIA, ES': '瓦伦西亚',
    'VALENCIA ES': '瓦伦西亚',
    // 黑海
    'ISTANBUL': '伊斯坦布尔',
    'ISTANBUL(伊斯坦布尔)': '伊斯坦布尔',
    // 中东
    'JEBEL ALI': '杰贝阿里',
    'JEBEL ALI(杰贝阿里)': '杰贝阿里',
    'DAMMAM': '达曼',
    'DAMMAM(达曼)': '达曼',
    // 红海
    'JEDDAH': '吉达',
    'JEDDAH(吉达)': '吉达',
    // 印巴
    'CHATTOGRAM': '吉大',
    'CHATTOGRAM(吉大港)': '吉大',
    '吉大港': '吉大',
    'COLOMBO': '科伦坡',
    'COLOMBO(科伦坡)': '科伦坡',
    'NHAVA SHEVA': '纳瓦西瓦',
    'NHAVA SHEVA(那瓦西瓦)': '纳瓦西瓦',
    '那瓦西瓦': '纳瓦西瓦',
    'CHENNAI': '清奈',
    'CHENNAI(清奈)': '清奈',
    // 澳洲
    'BRISBANE': '布里斯班',
    'BRISBANE,AU': '布里斯班',
    'BRISBANE, AU': '布里斯班',
    'BRISBANE AU': '布里斯班',
    'BRISBANE,AU(布里斯班)': '布里斯班',
    // 东非
    'MOMBASA': '蒙巴萨',
    'MOMBASA(蒙巴萨)': '蒙巴萨',
    // 南非
    'DURBAN': '德班',
    'DURBAN(德班)': '德班',
    // 西非
    'POINTE NOIRE': '黑角',
    'POINTE NOIRE(黑角)': '黑角',
    'TEMA': '特马',
    'TEMA(特马)': '特马',
    // 香港
    'HONG KONG': '香港',
    'HONG KONG(香港)': '香港',
    // 台湾
    'KAOHSIUNG': '高雄',
    'KAOHSIUNG(高雄)': '高雄',
    // 新加坡
    'SINGAPORE': '新加坡',
    'SINGAPORE(新加坡)': '新加坡',
    // 马来
    'PORT KELANG N': '巴生北',
    'PORT KELANG N(巴生北)': '巴生北',
    'PORT KELANG NORTH': '巴生北',
    'PORT KELANG S': '巴生西',
    'PORT KELANG S(巴生西)': '巴生西',
    'PORT KELANG SOUTH': '巴生西',
    'PASIR GUDANG': '巴西古单',
    'PASIR GUDANG(巴西古单)': '巴西古单',
    'PENANG': '槟城',
    'PENANG(槟城)': '槟城',
    'TANJUNG PELEPAS': '丹戎帕拉帕斯',
    'TANJUNG PELEPAS(丹戎帕拉帕斯)': '丹戎帕拉帕斯',
    // 泰国
    'LAEM CHABANG': '林查班',
    'LAEM CHABANG(林查班)': '林查班',
    // 越南
    'CAI MEP': '盖梅港',
    'CAI MEP, VUNG TAU': '盖梅港',
    'CAI MEP,VUNG TAU': '盖梅港',
    'CAI MEP, VUNG TAU(盖梅港,头顿)': '盖梅港',
    '盖梅港,头顿': '盖梅港',
    '盖梅港, 头顿': '盖梅港',
    '盖美港,头顿': '盖梅港',
    '盖美港, 头顿': '盖梅港',
    '盖美': '盖梅港',
    'HAIPHONG': '海防',
    'HAIPHONG(海防)': '海防',
    'HOCHIMINH': '胡志明',
    'HO CHI MINH': '胡志明',
    'HOCHIMINH(胡志明)': '胡志明',
    'DONG NAI': '同奈',
    'DONG NAI(同奈)': '同奈',
    // 柬埔寨
    'SIHANOUKVILLE': '西哈努克',
    'SIHANOUKVILLE(西哈努克)': '西哈努克',
    // 印尼
    'JAKARTA': '雅加达',
    'JAKARTA(雅加达)': '雅加达',
    'SURABAYA': '泗水',
    'SURABAYA(泗水)': '泗水',
    // 菲律宾
    'MANILA N': '马尼拉北',
    'MANILA N(马尼拉北)': '马尼拉北',
    'MANILA NORTH': '马尼拉北',
    'MANILA S': '马尼拉南',
    'MANILA S(马尼拉南)': '马尼拉南',
    'MANILA SOUTH': '马尼拉南'
};

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
 * 标准化港口名称（更智能的匹配，与 Monitor-Sailing-Schedule 保持一致）
 * @param {string} portName - 原始港口名称
 * @returns {string} 标准化后的港口名称
 */
function normalizePortName(portName) {
    if (!portName) return '';
    
    let normalized = String(portName).trim();
    const originalNormalized = normalized;
    
    // 1. 先检查映射表（精确匹配）
    if (PORT_NAME_MAPPING[normalized]) {
        return PORT_NAME_MAPPING[normalized];
    }
    
    // 2. 处理英文格式：BALBOA(巴尔博亚) 或 BRISBANE,AU(布里斯班) 或 CHATTOGRAM(吉大港)
    if (normalized.includes('(') && normalized.includes(')')) {
        // 提取括号前的英文部分，尝试匹配
        const beforeBracket = normalized.split('(')[0].trim();
        const upperBeforeBracket = beforeBracket.toUpperCase();
        if (PORT_NAME_MAPPING[upperBeforeBracket]) {
            return PORT_NAME_MAPPING[upperBeforeBracket];
        }
        // 提取括号内的中文名称
        const match = normalized.match(/\(([^)]+)\)/);
        if (match && match[1]) {
            const chineseName = match[1].split(',')[0].trim(); // 如果有逗号，取第一部分
            if (PORT_NAME_MAPPING[chineseName]) {
                return PORT_NAME_MAPPING[chineseName];
            }
            // 直接使用括号内的中文名称（如果它在标准港口列表中）
            if (STANDARD_PORT_ORDER.includes(chineseName)) {
                return chineseName;
            }
            normalized = chineseName; // 更新 normalized 为中文部分，继续后续匹配
        }
    }
    
    // 3. 处理包含逗号的情况（如"盖梅港,头顿" -> "盖梅港" 或 "LOS ANGELES, CA" -> "LOS ANGELES"）
    if (normalized.includes(',')) {
        const mainPart = normalized.split(',')[0].trim();
        // 先检查原始格式（带逗号的完整格式）
        const upperFull = normalized.toUpperCase();
        if (PORT_NAME_MAPPING[upperFull]) {
            return PORT_NAME_MAPPING[upperFull];
        }
        // 检查主部分（中文或英文）
        if (PORT_NAME_MAPPING[mainPart]) {
            return PORT_NAME_MAPPING[mainPart];
        }
        // 检查英文格式：LOS ANGELES, CA -> LOS ANGELES
        const upperPart = mainPart.toUpperCase();
        if (PORT_NAME_MAPPING[upperPart]) {
            return PORT_NAME_MAPPING[upperPart];
        }
        // 对于中文格式，尝试直接匹配标准港口名称
        if (/[\u4e00-\u9fa5]/.test(mainPart)) {
            // 如果主部分是中文，尝试精确匹配标准港口
            if (STANDARD_PORT_ORDER.includes(mainPart)) {
                return mainPart;
            }
            // 尝试模糊匹配（包含关系）
            for (const standardPort of STANDARD_PORT_ORDER) {
                if (mainPart.includes(standardPort) || standardPort.includes(mainPart)) {
                    return standardPort;
                }
            }
        }
        normalized = mainPart; // 更新 normalized 为主部分，继续后续匹配
    }
    
    // 4. 处理点号分隔：VANCOUVER.BC -> VANCOUVER
    if (normalized.includes('.')) {
        const mainPart = normalized.split('.')[0].trim();
        const upperPart = mainPart.toUpperCase();
        if (PORT_NAME_MAPPING[upperPart]) {
            return PORT_NAME_MAPPING[upperPart];
        }
        normalized = mainPart; // 更新 normalized 为主部分，继续后续匹配
    }
    
    // 5. 处理括号内容（如"青岛(青岛)" -> "青岛"）
    if (normalized.includes('(')) {
        const beforeBracket = normalized.split('(')[0].trim();
        if (PORT_NAME_MAPPING[beforeBracket]) {
            return PORT_NAME_MAPPING[beforeBracket];
        }
        normalized = beforeBracket; // 更新 normalized 为括号前部分，继续后续匹配
    }
    
    // 6. 再次检查映射表（处理后的值）
    if (normalized !== originalNormalized && PORT_NAME_MAPPING[normalized]) {
        return PORT_NAME_MAPPING[normalized];
    }
    
    // 7. 检查大写格式（英文港口名）
    const upperNormalized = normalized.toUpperCase();
    if (PORT_NAME_MAPPING[upperNormalized]) {
        return PORT_NAME_MAPPING[upperNormalized];
    }
    
    // 8. 对于中文格式，先尝试精确匹配标准港口名称
    if (/[\u4e00-\u9fa5]/.test(normalized)) {
        // 精确匹配
        if (STANDARD_PORT_ORDER.includes(normalized)) {
            return normalized;
        }
        // 去除常见后缀（如"港"、"港口"等，但保留在标准名称中的）
        const cleaned = normalized.replace(/港$/, '').trim();
        if (cleaned !== normalized && STANDARD_PORT_ORDER.includes(cleaned)) {
            return cleaned;
        }
        // 模糊匹配（包含关系，优先匹配更长的标准名称）
        const matches = [];
        for (const standardPort of STANDARD_PORT_ORDER) {
            // 检查是否包含标准港口名（双向包含）
            if (normalized.includes(standardPort) || standardPort.includes(normalized) ||
                cleaned.includes(standardPort) || standardPort.includes(cleaned)) {
                matches.push({ port: standardPort, length: standardPort.length });
            }
        }
        if (matches.length > 0) {
            // 优先匹配最长的标准港口名
            matches.sort((a, b) => b.length - a.length);
            return matches[0].port;
        }
    }
    
    // 9. 如果以上都不匹配，返回原始值或其大写形式
    return normalized;
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
 * 根据标准港口顺序排序
 * @param {string[]} ports - 港口数组
 * @returns {string[]} 排序后的港口数组
 */
function sortPortsByStandardOrder(ports) {
    if (!Array.isArray(ports) || ports.length === 0) return ports;
    
    const portOrderMap = new Map();
    STANDARD_PORT_ORDER.forEach((port, index) => {
        portOrderMap.set(port, index);
    });
    
    return ports.sort((a, b) => {
        const indexA = portOrderMap.has(a) ? portOrderMap.get(a) : Infinity;
        const indexB = portOrderMap.has(b) ? portOrderMap.get(b) : Infinity;
        
        if (indexA !== Infinity && indexB !== Infinity) {
            return indexA - indexB;
        }
        if (indexA !== Infinity) return -1;
        if (indexB !== Infinity) return 1;
        return a.localeCompare(b, 'zh-Hans-CN');
    });
}

/**
 * 根据标准区域顺序排序
 * @param {string[]} areas - 区域数组
 * @returns {string[]} 排序后的区域数组
 */
function sortAreasByStandardOrder(areas) {
    if (!Array.isArray(areas) || areas.length === 0) return areas;
    
    // 确保 STANDARD_AREA_ORDER 存在（尝试本地和全局）
    const standardOrder = STANDARD_AREA_ORDER || 
        (typeof window !== 'undefined' ? window.STANDARD_AREA_ORDER : null);
    
    if (!standardOrder || !Array.isArray(standardOrder) || standardOrder.length === 0) {
        // 如果没有标准顺序，按字母排序
        return [...areas].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
    }
    
    const areaOrderMap = new Map();
    standardOrder.forEach((area, index) => {
        areaOrderMap.set(area, index);
    });
    
    // 处理区域名称变体（如"中东印巴红海" -> "中东红海印巴"）
    const normalizeAreaName = (areaName) => {
        if (!areaName) return areaName;
        // 如果包含"中东"、"印巴"、"红海"这些关键词，统一映射到"中东红海印巴"
        // 处理各种可能的组合：中东印巴红海、中东红海印巴、印巴红海中东等
        if (areaName.includes('中东') && (areaName.includes('印巴') || areaName.includes('红海'))) {
            return '中东红海印巴';
        }
        // 也处理只包含这些关键词的情况
        if ((areaName.includes('印巴') || areaName.includes('红海')) && areaName.includes('中东')) {
            return '中东红海印巴';
        }
        return areaName;
    };
    
    // 创建排序后的数组（不修改原数组）
    const sorted = [...areas].sort((a, b) => {
        const normalizedA = normalizeAreaName(a);
        const normalizedB = normalizeAreaName(b);
        const indexA = areaOrderMap.has(normalizedA) ? areaOrderMap.get(normalizedA) : Infinity;
        const indexB = areaOrderMap.has(normalizedB) ? areaOrderMap.get(normalizedB) : Infinity;
        
        if (indexA !== Infinity && indexB !== Infinity) {
            return indexA - indexB;
        }
        if (indexA !== Infinity) return -1;
        if (indexB !== Infinity) return 1;
        return a.localeCompare(b, 'zh-Hans-CN');
    });
    
    return sorted;
}

/**
 * 填充下拉选择框
 * @param {HTMLSelectElement} selectEl - 选择框元素
 * @param {string[]} options - 选项数组
 * @param {string} placeholder - 占位符文本
 * @param {string|string[]} selectedValues - 已选中的值
 * @param {boolean} shouldDisable - 是否禁用
 * @param {boolean} usePortOrder - 是否使用标准港口顺序排序（默认 false）
 * @param {boolean} useAreaOrder - 是否使用标准区域顺序排序（默认 false）
 */
function populateSelect(selectEl, options, placeholder, selectedValues, shouldDisable = false, usePortOrder = false, useAreaOrder = false) {
    if (!selectEl) return;
    
    // 先排序，再去重（保持排序后的顺序）
    let uniqueOptions;
    if (usePortOrder && typeof sortPortsByStandardOrder === 'function') {
        // 先排序，再去重
        const sorted = sortPortsByStandardOrder(options);
        uniqueOptions = Array.from(new Set(sorted));
    } else if (useAreaOrder) {
        // 先排序，再去重
        // 直接调用本地函数（它们在同一个作用域中）
        if (typeof sortAreasByStandardOrder === 'function') {
            const sorted = sortAreasByStandardOrder(options);
            uniqueOptions = Array.from(new Set(sorted));
        } else if (typeof window !== 'undefined' && typeof window.sortAreasByStandardOrder === 'function') {
            // 如果本地函数不可用，尝试使用全局函数
            const sorted = window.sortAreasByStandardOrder(options);
            uniqueOptions = Array.from(new Set(sorted));
        } else {
            // 如果函数不可用，先去重再按字母排序
            uniqueOptions = Array.from(new Set(options));
            uniqueOptions.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        }
    } else {
        // 先去重，再按字母排序（只有在没有指定排序方式时）
        uniqueOptions = Array.from(new Set(options));
        if (uniqueOptions.length > 0 && !usePortOrder && !useAreaOrder) {
            uniqueOptions.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        }
    }
    
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
    // 统一格式化日期为 YYYY/MM/DD，确保同一天、同船名航次的记录能正确去重
    let shipDate = record.shipDate || '';
    if (shipDate && typeof formatDateToYYYYMMDD === 'function') {
        const formatted = formatDateToYYYYMMDD(shipDate);
        if (formatted && formatted !== '未知') {
            shipDate = formatted;
        }
    }
    const capacity = record.capacity || 0;
    return `${shipName}|${shipDate}|${capacity}`;
}

/**
 * 提取船名（取第一段，兼容“船名/航次”或“船名 航次”）
 * @param {string} vesselText
 * @returns {string}
 */
function getVesselName(vesselText) {
    if (!vesselText) return '';
    const parts = String(vesselText).split(/[\/\s]+/).filter(Boolean);
    return parts[0] || '';
}

/**
 * 提取航次（取第二段，兼容“船名/航次”或“船名 航次”）
 * @param {string} vesselText
 * @returns {string}
 */
function getVoyageNumber(vesselText) {
    if (!vesselText) return '';
    const parts = String(vesselText).split(/[\/\s]+/).filter(Boolean);
    return parts.length > 1 ? parts[1] : '';
}

/**
 * 将日期格式化为 YYYYMMDD 的字符串，用于去重键
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatDateKey(date) {
    if (!date) return '';
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
    } catch (e) {
        return '';
    }
}

/**
 * 船期记录去重（统一标准，参考 Monitor-Sailing-Schedule）
 * 规则：
 *  - 完全重复：日期+港口+船名+船型+船公司+航次 相同 => 去重
 *  - 同船公司、同日期/港口/船名/船型，航次不同 => 视为重复（可能重复录入）
 *  - 船公司不同但其它相同 => 保留（可能共舱）
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
function deduplicateSailingItems(items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const seen = new Set();
    const result = [];

    items.forEach(item => {
        const vesselText = item.vessel || item.shipName || '';
        const vesselName = item.vesselName || getVesselName(vesselText);
        const voyageNumber = getVoyageNumber(vesselText);
        const shipType = item.shipType || '';
        const carrier = item.carrier || '';
        const port = item.port || '';
        const dateKey = formatDateKey(item.date || item.shipDate || '');

        // 完全重复键
        const exactKey = `${dateKey}_${port}_${vesselName}_${shipType}_${carrier}_${voyageNumber}`;
        // 同船公司但航次不同的重复键
        const similarKey = `${dateKey}_${port}_${vesselName}_${shipType}_${carrier}`;

        if (seen.has(exactKey) || seen.has(similarKey)) {
            return;
        }

        seen.add(exactKey);
        seen.add(similarKey);
        result.push({
            ...item,
            vesselName
        });
    });

    return result;
}

// 导出到全局，便于各页面复用
if (typeof window !== 'undefined') {
    window.getVesselName = window.getVesselName || getVesselName;
    window.getVoyageNumber = window.getVoyageNumber || getVoyageNumber;
    window.formatDateKey = window.formatDateKey || formatDateKey;
    window.deduplicateSailingItems = window.deduplicateSailingItems || deduplicateSailingItems;
    window.sortPortsByStandardOrder = window.sortPortsByStandardOrder || sortPortsByStandardOrder;
    window.sortAreasByStandardOrder = window.sortAreasByStandardOrder || sortAreasByStandardOrder;
    window.normalizePortName = window.normalizePortName || normalizePortName;
    window.STANDARD_PORT_ORDER = window.STANDARD_PORT_ORDER || STANDARD_PORT_ORDER;
    window.STANDARD_AREA_ORDER = window.STANDARD_AREA_ORDER || STANDARD_AREA_ORDER;
    window.PORT_NAME_MAPPING = window.PORT_NAME_MAPPING || PORT_NAME_MAPPING;
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
 * 检查两个周别是否加起来正好是7天（需要合并）
 * @param {string} weekCode1 - 第一个周别代码（如"202553"）
 * @param {string} weekCode2 - 第二个周别代码（如"202601"）
 * @returns {boolean} 如果两个周别加起来正好是7天，返回true
 */
function shouldMergeWeeks(weekCode1, weekCode2) {
    const range1 = getWeekDateRange(weekCode1);
    const range2 = getWeekDateRange(weekCode2);
    
    // 解析日期字符串（格式：YYYY/MM/DD）
    const parseDateStr = (dateStr) => {
        const parts = dateStr.split('/');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };
    
    const week1Sunday = parseDateStr(range1.sunday);
    const week1Saturday = parseDateStr(range1.saturday);
    const week2Sunday = parseDateStr(range2.sunday);
    const week2Saturday = parseDateStr(range2.saturday);
    
    // 计算两个周别覆盖的总天数
    const totalDays = Math.floor((week2Saturday - week1Sunday) / (1000 * 60 * 60 * 24)) + 1;
    
    // 如果总天数正好是7天，且week1的周六和week2的周日是连续的，说明需要合并
    if (totalDays === 7) {
        // 检查week1的周六和week2的周日是否连续（相差1天）
        const daysBetween = Math.floor((week2Sunday - week1Saturday) / (1000 * 60 * 60 * 24));
        if (daysBetween === 1) {
            return true;
        }
    }
    
    return false;
}

/**
 * 获取当周+未来4周（共5周）
 * 如果检测到需要合并的周别，会跳过被合并的周别，继续获取下一周
 * @returns {string[]} 周别代码数组
 */
function getWeekRange() {
    const weeks = [];
    const currentWeekCode = getCurrentWeekCode();
    
    // 解析当前周
    const currentYear = parseInt(currentWeekCode.substring(0, 4));
    const currentWeekNo = parseInt(currentWeekCode.substring(4));
    
    // 生成当周+未来4周（共5周）
    let skipNext = false; // 标记是否跳过下一周（因为被合并了）
    for (let i = 0; weeks.length < 5; i++) {
        let year = currentYear;
        let weekNo = currentWeekNo + i;
        
        // 处理跨年：如果周数超过53，则进入下一年
        if (weekNo > 53) {
            year = year + 1;
            weekNo = weekNo - 53;
        }
        
        const weekStr = String(year) + String(weekNo).padStart(2, '0');
        
        // 如果上一周需要与当前周合并，跳过当前周
        if (skipNext) {
            skipNext = false;
            continue;
        }
        
        weeks.push(weekStr);
        
        // 检查当前周是否需要与下一周合并
        if (weeks.length < 5) {
            let nextYear = year;
            let nextWeekNo = weekNo + 1;
            if (nextWeekNo > 53) {
                nextYear = year + 1;
                nextWeekNo = nextWeekNo - 53;
            }
            const nextWeekStr = String(nextYear) + String(nextWeekNo).padStart(2, '0');
            
            if (shouldMergeWeeks(weekStr, nextWeekStr)) {
                skipNext = true; // 标记下一周需要跳过
            }
        }
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
        debugWarn('loadedScripts 未定义，请在页面中声明');
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
        debugWarn('loadedWorkers 未定义，请在页面中声明');
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
        debugWarn('pdfJsReady 或 pdfJsLoadingPromise 未定义，请在页面中声明');
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
                    break;
                }
            } catch (error) {
                lastError = error;
                debugWarn('PDF.js 加载失败，尝试下一个源:', src.script, error);
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

/**
 * 解析 SCFI 表格数据（从 Freight Rates Watch 表格）
 * @param {string} text - PDF 文本内容
 * @returns {Object|null} 解析后的 SCFI 数据
 */
function parseScfiTable(text) {
    if (!text) {
        console.warn('[SCFI] parseScfiTable: 文本为空');
        return null;
    }
    
    console.log('[SCFI] parseScfiTable: 开始解析，文本长度:', text.length);
    console.log('[SCFI] parseScfiTable: 文本预览:', text.substring(0, 500));
    
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
        console.log('[SCFI] 找到表格表头，提取表格区域，长度:', tableText.length);
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
        console.log('[SCFI] 从日期列附近提取表格（评分:', bestScore, '），长度:', bestMatch.context.length);
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
        console.log('[SCFI] 从 "Freight Rates Watch" 提取表格（已排除描述性文字），长度:', tableText.length);
        return parseScfiTableFromText(tableText);
    }
    
    // 查找 "SCFI : Shanghai to" 后面的表格数据
    const scfiTableMatch = text.match(/SCFI\s*:\s*Shanghai\s+to[^\n]*[\s\S]{0,30000}/i);
    if (scfiTableMatch) {
        console.log('[SCFI] 找到 "SCFI : Shanghai to" 表格区域，长度:', scfiTableMatch[0].length);
        return parseScfiTableFromText(scfiTableMatch[0]);
    }
    
    // 查找 "Freight Rates Watch" 或 "SCFI" 关键词
    const scfiMatch = text.match(/Freight Rates Watch[\s\S]{0,10000}?SCFI[\s\S]{0,20000}/i);
    if (!scfiMatch) {
        console.warn('[SCFI] 未找到 "Freight Rates Watch" 关键词，尝试直接查找 SCFI');
        // 尝试直接查找 SCFI 表格
        const scfiDirectMatch = text.match(/SCFI[\s\S]{0,20000}/i);
        if (!scfiDirectMatch) {
            console.warn('[SCFI] 未找到 SCFI 关键词');
            return null;
        }
        console.log('[SCFI] 找到 SCFI 关键词，开始解析...');
        return parseScfiTableFromText(scfiDirectMatch[0]);
    }
    console.log('[SCFI] 找到 "Freight Rates Watch"，开始解析...');
    
    // 尝试查找包含航线名称的区域（如 Europe, USWC, India 等）
    // 如果提取的文本不包含航线名称，尝试从更大范围提取
    let tableText = scfiMatch[0];
    
    // 检查是否包含常见的航线关键词
    const routeKeywords = ['Europe', 'USWC', 'USEC', 'India', 'Persian Gulf', 'Australia', 'Africa', 'America', 'Japan', 'Korea', 'Southeast Asia'];
    const hasRouteKeywords = routeKeywords.some(keyword => tableText.includes(keyword));
    
    if (!hasRouteKeywords) {
        console.warn('[SCFI] 提取的文本不包含航线关键词，尝试从更大范围提取...');
        // 尝试从 "Freight Rates Watch" 后面提取更多内容
        const extendedMatch = text.match(/Freight Rates Watch[\s\S]{0,50000}/i);
        if (extendedMatch) {
            tableText = extendedMatch[0];
            console.log('[SCFI] 使用扩展范围提取，长度:', tableText.length);
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
        console.warn('[SCFI] parseScfiTableFromText: 表格文本为空');
        return null;
    }
    
    console.log('[SCFI] parseScfiTableFromText: 开始解析表格文本，长度:', tableText.length);
    
    // 输出完整文本用于调试（限制长度避免控制台过载）
    if (tableText.length > 0) {
        console.log('[SCFI] 完整提取文本（前1000字符）:', tableText.substring(0, 1000));
        if (tableText.length > 1000) {
            console.log('[SCFI] 完整提取文本（后500字符）:', tableText.substring(tableText.length - 500));
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
                console.log('[SCFI] 找到 SCFI 指数:', value);
                
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
                console.log('[SCFI] 提取的历史数据:', {
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
                    console.log('[SCFI] 从SCFI前找到指数:', value);
                    
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
                    console.log('[SCFI] 备用方法提取的历史数据:', {
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
    
    // 针对表格结构（行内包含名称、单位与 28-Nov-25 列价格），规整空白后基于名称捕获后续数字
    let tableArea = tableText;
    const startIdx = tableText.search(/Shanghai Container Freight Index|SCFI/i);
    if (startIdx >= 0) {
        tableArea = tableText.substring(startIdx);
    }
    // 规整多余空白为单个空格
    tableArea = tableArea.replace(/\s+/g, ' ').trim();
    console.log('[SCFI] 规整后的表格长度:', tableArea.length);
    console.log('[SCFI] 规整后预览:', tableArea.substring(0, 300));
    
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
                    console.log(`[SCFI] ✓ 成功添加航线 ${pattern.name}: ${result.price} ${unit}`, 
                        result.week1Price ? `(1周: ${result.week1Price}, 1月: ${result.month1Price}, 3月: ${result.quarter3Price}, 1年: ${result.year1Price})` : '');
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            // 如果所有模式都失败，输出最后一个模式的调试信息
            const lastResult = findPriceBeforeName(tableArea, pattern.patterns[pattern.patterns.length - 1]);
            console.warn(`[SCFI] 航线 ${pattern.name} ${lastResult.reason}`, lastResult.context ? `上下文: ${lastResult.context.substring(0, 100)}` : '');
        }
    });
    
    // 如果还是没找到，尝试更宽松的解析
    if (scfiData.routes.length === 0) {
        // 将文本按行分割
        const lines = tableArea.split(/\s+/).filter(line => line.length > 0);
        console.log('[SCFI] 尝试宽松解析，文本片段数:', lines.length);
        
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
    console.log('[SCFI] parseScfiTableFromText 最终结果:', result);
    if (result) {
        console.log(`[SCFI] 解析成功: SCFI指数=${result.index}, 航线数=${result.routes.length}`);
    } else {
        console.warn('[SCFI] 解析失败: 未找到有效的 SCFI 数据');
    }
    return result;
}

/**
 * 处理市场报告文件
 * @param {File} file - PDF文件
 * @returns {Promise<void>}
 */
async function handleMarketReportFile(file) {
    if (typeof marketReports === 'undefined') {
        debugWarn('marketReports 未定义，请在页面中声明');
        return;
    }
    try {
        const text = await extractTextFromPdf(file);
        let scfiData = null;
        
        // 尝试从第6页提取 SCFI 表格
        try {
            const page6Text = await extractTextFromPdfPage(file, 6);
            if (page6Text) {
                debugLog('第6页文本提取成功，长度:', page6Text.length);
                debugLog('第6页文本预览:', page6Text.substring(0, 1000));
                scfiData = parseScfiTable(page6Text);
                debugLog('从第6页解析 SCFI 结果:', scfiData);
                // 如果第6页没找到，尝试从全文搜索
                if (!scfiData) {
                    debugLog('第6页未找到 SCFI，尝试从全文搜索...');
                    scfiData = parseScfiTable(text);
                    debugLog('从全文解析 SCFI 结果:', scfiData);
                }
            } else {
                debugWarn('第6页文本为空，从全文搜索...');
                // 如果第6页提取失败，从全文搜索
                scfiData = parseScfiTable(text);
                debugLog('从全文解析 SCFI 结果:', scfiData);
            }
        } catch (error) {
            debugWarn('提取 SCFI 数据失败，尝试从全文搜索:', error);
            scfiData = parseScfiTable(text);
            debugLog('从全文解析 SCFI 结果（错误后）:', scfiData);
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
        debugError('解析PDF失败', file.name, error);
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
            debugWarn('自定义编码解析失败，回退到默认编码', error);
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
        debugWarn('bunkerData 或 bunkerStatusEl 未定义，请在页面中声明');
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
        debugWarn('ccfiData 或 ccfiStatusEl 未定义，请在页面中声明');
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
            debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
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
            debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { current });
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
        debugWarn('ccfiRoutes 未定义，请在页面中声明');
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
        debugLog('[CCFI] 文本长度:', normalized.length);
        debugLog('[CCFI] 文本前500字符:', normalized.substring(0, 500));
        // 查找包含航线中文名称的部分
        const routeLabels = ccfiRoutes.map(r => r.label);
        const foundLabels = [];
        routeLabels.forEach(label => {
            if (normalized.includes(label)) {
                foundLabels.push(label);
            }
        });
        debugLog('[CCFI] 找到的航线标签:', foundLabels);
        // 查找包含数字的部分（可能是价格数据）
        const numberMatches = normalized.match(/[\d,]+\.?\d*/g);
        if (numberMatches) {
            debugLog('[CCFI] 找到的数字数据（前30个）:', numberMatches.slice(0, 30));
        }
        // 查找包含英文航线名称的部分
        const routeMatches = normalized.match(/(JAPAN|EUROPE|AMERICA|KOREA|ASIA|MEDITERRANEAN|AUSTRALIA|AFRICA|PERSIAN|GULF|RED SEA)/gi);
        if (routeMatches) {
            debugLog('[CCFI] 找到的英文航线名称（前20个）:', routeMatches.slice(0, 20));
        }
        // 查找每个航线名称附近的文本内容（用于调试）
        const sampleRoutes = ['JAPAN', 'EUROPE', 'KOREA', 'ASIA'];
        sampleRoutes.forEach(keyword => {
            const index = normalized.indexOf(keyword);
            if (index !== -1) {
                const snippet = normalized.substring(Math.max(0, index - 50), index + 200);
                debugLog(`[CCFI] "${keyword}" 附近的文本:`, snippet);
            }
        });
        // 查找综合指数附近的文本内容
        const compositeIndex = normalized.indexOf('CHINA CONTAINERIZED FREIGHT INDEX');
        if (compositeIndex !== -1) {
            const snippet = normalized.substring(Math.max(0, compositeIndex - 50), compositeIndex + 200);
            debugLog(`[CCFI] "CHINA CONTAINERIZED FREIGHT INDEX" 附近的文本:`, snippet);
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
                        debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
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
                        debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { current });
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
                        debugLog(`[CCFI] ${strategyName}匹配成功: ${route.label}`, { previous, current, wow });
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
            debugWarn(`[CCFI] 未匹配到: ${route.label} (${route.match})`);
        }
    });
    
    if (getCachedDebugMode()) {
        debugLog(`[CCFI] 总共匹配到 ${result.routes.length} 条航线数据`);
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
        debugWarn('wciData 或 wciStatusEl 未定义，请在页面中声明');
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
                debugLog(`[WCI] 策略1匹配成功: ${code} (${label})`, { value });
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
                debugLog(`[WCI] 策略2匹配成功: ${code} (${label})`, { value });
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
                            debugLog(`[WCI] Fallback匹配成功: ${code} (${label})`, { value, pattern: pattern.toString() });
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
        debugWarn('wciCodeMap 未定义，请在页面中声明');
        return { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
    }
    const normalized = text.replace(/\r/g, ' ');
    const result = { timestamp: Date.now(), worldIndex: null, changePct: null, routes: [] };
    
    // 调试：检查文本内容（仅在调试模式下）
    const DEBUG_MODE = getCachedDebugMode();
    if (DEBUG_MODE) {
        debugLog('[WCI] 文本长度:', normalized.length);
        debugLog('[WCI] 文本前500字符:', normalized.substring(0, 500));
        const numberMatches = normalized.match(/\$\s*[\d,]+/g);
        if (numberMatches) {
            debugLog('[WCI] 找到的价格数据（前20个）:', numberMatches.slice(0, 20));
        }
        const cityMatches = normalized.match(/(Shanghai|Rotterdam|Los Angeles|New York|Genoa)/gi);
        if (cityMatches) {
            debugLog('[WCI] 找到的城市名称（前20个）:', cityMatches.slice(0, 20));
        }
        const wciCodeMatches = normalized.match(/WCI-[A-Z-]+/gi);
        if (wciCodeMatches) {
            debugLog('[WCI] 找到的 WCI 代码（前20个）:', wciCodeMatches.slice(0, 20));
        }
    }
    
    // 策略1和2：匹配代码和标签
    Object.entries(wciCodeMap).forEach(([code, label]) => {
        let matched = parseWciByCode(normalized, code, label, result);
        if (!matched) {
            matched = parseWciByLabel(normalized, code, label, result);
        }
        if (!matched && getCachedDebugMode()) {
            debugWarn(`[WCI] 未匹配到: ${code} (${label})`);
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
        debugWarn('fbxData 或 fbxStatusEl 未定义，请在页面中声明');
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
        debugWarn('fbxCodeMap 未定义，请在页面中声明');
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

// 导出函数到全局
if (typeof window !== 'undefined') {
    window.getBookingData = window.getBookingData || getBookingData;
    window.extractTextFromPdfPage = window.extractTextFromPdfPage || extractTextFromPdfPage;
    window.parseScfiTable = window.parseScfiTable || parseScfiTable;
    window.parseScfiTableFromText = window.parseScfiTableFromText || parseScfiTableFromText;
    window.buildScfiDataSection = window.buildScfiDataSection || buildScfiDataSection;
    window.extractTextFromPdf = window.extractTextFromPdf || extractTextFromPdf;
    window.handleMarketReportFile = window.handleMarketReportFile || handleMarketReportFile;
    window.renderMarketReportList = window.renderMarketReportList || renderMarketReportList;
    window.buildMarketReportsSection = window.buildMarketReportsSection || buildMarketReportsSection;
    window.buildBunkerDataSection = window.buildBunkerDataSection || buildBunkerDataSection;
    window.buildWciDataSection = window.buildWciDataSection || buildWciDataSection;
    window.buildFbxDataSection = window.buildFbxDataSection || buildFbxDataSection;
    window.buildBookingDataSection = window.buildBookingDataSection || buildBookingDataSection;
}
