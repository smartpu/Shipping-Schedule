/**
 * 数据标准化工具函数
 * 
 * 从 market-analysis-utils.js 拆分出来的数据标准化相关函数和常量
 * 包含：港口名称标准化、航线标签管理、排序函数、去重函数等
 * 
 * 依赖：
 * - date-utils.js: formatDateKey (通过 window)
 * - common-utils.js: formatDateToYYYYMMDD (可能)
 * - debug-utils.js: debugLog, debugWarn, debugError
 * 
 * 所有函数和常量已导出到全局 window 对象
 */

(function() {
    'use strict';

    // ============================================
    // 常量定义
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
     * 标准化港口名称（基于 Material-parsed_ports_list.txt 新格式）
     * 返回标准化显示格式：[英文名|代码|区域]
     * @param {string} portName - 原始港口名称（可能是中文、英文、代码或混合格式）
     * @returns {string} 标准化后的港口显示格式：[英文名|代码|区域]，如果找不到则返回原值
     */
    function normalizePortName(portName) {
        if (!portName) return '';
        
        const normalized = String(portName).trim();
        if (!normalized) return '';
        
        // 如果已经是标准化显示格式（[英文名|代码|区域]），直接返回
        if (normalized.startsWith('[') && normalized.includes('|')) {
            const codeMatch = normalized.match(/\|([A-Z0-9]+)\|/);
            if (codeMatch && codeMatch[1]) {
                // 验证代码是否有效
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const code = codeMatch[1];
                    if (window.portSortUtils.portCodeSortMap && window.portSortUtils.portCodeSortMap[code]) {
                        return normalized; // 已经是标准格式且代码有效
                    }
                } else {
                    return normalized; // 无法验证，但格式正确，返回
                }
            }
        }
        
        // 优先使用 portSortUtils 进行标准化（如果可用）
        if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
            const standardized = window.portSortUtils.getStandardizedDisplay(normalized);
            if (standardized && standardized !== normalized && standardized.startsWith('[')) {
                return standardized;
            }
        }
        
        // 降级方案：使用旧的映射表逻辑（兼容性）
        let result = normalized;
        const originalNormalized = normalized;
        
        // 1. 先检查映射表（精确匹配）
        if (PORT_NAME_MAPPING[normalized]) {
            result = PORT_NAME_MAPPING[normalized];
            // 如果映射结果是中文，尝试通过 portSortUtils 获取标准化显示格式
            if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                const standardized = window.portSortUtils.getStandardizedDisplay(result);
                if (standardized && standardized.startsWith('[')) {
                    return standardized;
                }
            }
            return result;
        }
        
        // 2. 处理英文格式：BALBOA(巴尔博亚) 或 BRISBANE,AU(布里斯班) 或 CHATTOGRAM(吉大港)
        if (normalized.includes('(') && normalized.includes(')')) {
            // 提取括号前的英文部分，尝试匹配
            const beforeBracket = normalized.split('(')[0].trim();
            const upperBeforeBracket = beforeBracket.toUpperCase();
            if (PORT_NAME_MAPPING[upperBeforeBracket]) {
                result = PORT_NAME_MAPPING[upperBeforeBracket];
                // 尝试获取标准化显示格式
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
            // 提取括号内的中文名称
            const match = normalized.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                const chineseName = match[1].split(',')[0].trim(); // 如果有逗号，取第一部分
                if (PORT_NAME_MAPPING[chineseName]) {
                    result = PORT_NAME_MAPPING[chineseName];
                    // 尝试获取标准化显示格式
                    if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                        const standardized = window.portSortUtils.getStandardizedDisplay(result);
                        if (standardized && standardized.startsWith('[')) {
                            return standardized;
                        }
                    }
                    return result;
                }
                // 直接使用括号内的中文名称（如果它在标准港口列表中）
                if (STANDARD_PORT_ORDER.includes(chineseName)) {
                    result = chineseName;
                    // 尝试获取标准化显示格式
                    if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                        const standardized = window.portSortUtils.getStandardizedDisplay(result);
                        if (standardized && standardized.startsWith('[')) {
                            return standardized;
                        }
                    }
                    return result;
                }
            }
        }
        
        // 3. 处理包含逗号的情况（如"盖梅港,头顿" -> "盖梅港" 或 "LOS ANGELES, CA" -> "LOS ANGELES"）
        if (normalized.includes(',')) {
            const mainPart = normalized.split(',')[0].trim();
            // 先检查原始格式（带逗号的完整格式）
            const upperFull = normalized.toUpperCase();
            if (PORT_NAME_MAPPING[upperFull]) {
                result = PORT_NAME_MAPPING[upperFull];
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
            // 检查主部分（中文或英文）
            if (PORT_NAME_MAPPING[mainPart]) {
                result = PORT_NAME_MAPPING[mainPart];
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
            // 检查英文格式：LOS ANGELES, CA -> LOS ANGELES
            const upperPart = mainPart.toUpperCase();
            if (PORT_NAME_MAPPING[upperPart]) {
                result = PORT_NAME_MAPPING[upperPart];
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
            // 对于中文格式，尝试直接匹配标准港口名称
            if (/[\u4e00-\u9fa5]/.test(mainPart)) {
                // 如果主部分是中文，尝试精确匹配标准港口
                if (STANDARD_PORT_ORDER.includes(mainPart)) {
                    result = mainPart;
                    if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                        const standardized = window.portSortUtils.getStandardizedDisplay(result);
                        if (standardized && standardized.startsWith('[')) {
                            return standardized;
                        }
                    }
                    return result;
                }
                // 尝试模糊匹配（包含关系）
                for (const standardPort of STANDARD_PORT_ORDER) {
                    if (mainPart.includes(standardPort) || standardPort.includes(mainPart)) {
                        result = standardPort;
                        if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                            const standardized = window.portSortUtils.getStandardizedDisplay(result);
                            if (standardized && standardized.startsWith('[')) {
                                return standardized;
                            }
                        }
                        return result;
                    }
                }
            }
        }
        
        // 4. 处理点号分隔：VANCOUVER.BC -> VANCOUVER
        if (normalized.includes('.')) {
            const mainPart = normalized.split('.')[0].trim();
            const upperPart = mainPart.toUpperCase();
            if (PORT_NAME_MAPPING[upperPart]) {
                result = PORT_NAME_MAPPING[upperPart];
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
        }
        
        // 5. 处理括号内容（如"青岛(青岛)" -> "青岛"）
        if (normalized.includes('(')) {
            const beforeBracket = normalized.split('(')[0].trim();
            if (PORT_NAME_MAPPING[beforeBracket]) {
                result = PORT_NAME_MAPPING[beforeBracket];
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
        }
        
        // 6. 再次检查映射表（处理后的值）
        if (normalized !== originalNormalized && PORT_NAME_MAPPING[normalized]) {
            result = PORT_NAME_MAPPING[normalized];
            if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                const standardized = window.portSortUtils.getStandardizedDisplay(result);
                if (standardized && standardized.startsWith('[')) {
                    return standardized;
                }
            }
            return result;
        }
        
        // 7. 检查大写格式（英文港口名）
        const upperNormalized = normalized.toUpperCase();
        if (PORT_NAME_MAPPING[upperNormalized]) {
            result = PORT_NAME_MAPPING[upperNormalized];
            if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                const standardized = window.portSortUtils.getStandardizedDisplay(result);
                if (standardized && standardized.startsWith('[')) {
                    return standardized;
                }
            }
            return result;
        }
        
        // 8. 对于中文格式，先尝试精确匹配标准港口名称
        if (/[\u4e00-\u9fa5]/.test(normalized)) {
            // 精确匹配
            if (STANDARD_PORT_ORDER.includes(normalized)) {
                result = normalized;
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
            // 去除常见后缀（如"港"、"港口"等，但保留在标准名称中的）
            const cleaned = normalized.replace(/港$/, '').trim();
            if (cleaned !== normalized && STANDARD_PORT_ORDER.includes(cleaned)) {
                result = cleaned;
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
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
                result = matches[0].port;
                if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                    const standardized = window.portSortUtils.getStandardizedDisplay(result);
                    if (standardized && standardized.startsWith('[')) {
                        return standardized;
                    }
                }
                return result;
            }
        }
        
        // 9. 最后尝试通过 portSortUtils 获取标准化显示格式（即使没有找到映射）
        if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
            const standardized = window.portSortUtils.getStandardizedDisplay(normalized);
            if (standardized && standardized !== normalized && standardized.startsWith('[')) {
                return standardized;
            }
        }
        
        // 10. 如果以上都不匹配，返回原始值
        return normalized;
    }

    /**
     * 航线标签映射表（全局）
     * 用于存储航线ID到航线标签的映射关系
     */
    if (typeof window !== 'undefined' && !window.routeLabelMap) {
        window.routeLabelMap = {};
    }
    const routeLabelMap = typeof window !== 'undefined' ? window.routeLabelMap : {};

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
     * @param {string[]} ports - 港口数组（可能是中文、英文、代码或标准化格式）
     * @returns {string[]} 排序后的港口数组（标准化显示格式：[英文名|代码|区域]）
     */
    function sortPortsByStandardOrder(ports) {
        if (!Array.isArray(ports) || ports.length === 0) return ports;
        
        // 优先使用 portSortUtils 进行排序（如果可用）
        if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
            try {
                const sorted = window.portSortUtils.sortPortNames(ports);
                if (sorted && sorted.length === ports.length) {
                    return sorted;
                }
            } catch (error) {
                console.warn('portSortUtils.sortPortNames 失败，使用降级方案:', error);
            }
        }
        
        // 降级方案：使用旧的排序逻辑
        const portOrderMap = new Map();
        STANDARD_PORT_ORDER.forEach((port, index) => {
            portOrderMap.set(port, index);
        });
        
        // 先标准化港口名称，再排序
        const normalizedPorts = ports.map(port => {
            // 如果已经是标准化格式，提取中文名用于排序
            if (port.startsWith('[') && port.includes('|')) {
                // 尝试从标准化格式中提取信息用于排序
                return port;
            }
            // 标准化港口名称
            const normalized = normalizePortName(port);
            return normalized;
        });
        
        const sorted = normalizedPorts.sort((a, b) => {
            // 提取用于排序的键（中文名或英文名）
            let keyA = a;
            let keyB = b;
            
            // 如果是标准化格式，提取英文名或代码用于排序
            if (a.startsWith('[') && a.includes('|')) {
                const parts = a.match(/\[([^\]]+)\]/);
                if (parts && parts[1]) {
                    const standardParts = parts[1].split('|');
                    keyA = standardParts[0] || a; // 使用英文名
                }
            }
            if (b.startsWith('[') && b.includes('|')) {
                const parts = b.match(/\[([^\]]+)\]/);
                if (parts && parts[1]) {
                    const standardParts = parts[1].split('|');
                    keyB = standardParts[0] || b; // 使用英文名
                }
            }
            
            // 尝试从映射表获取排序索引
            const indexA = portOrderMap.has(keyA) ? portOrderMap.get(keyA) : Infinity;
            const indexB = portOrderMap.has(keyB) ? portOrderMap.get(keyB) : Infinity;
            
            if (indexA !== Infinity && indexB !== Infinity) {
                return indexA - indexB;
            }
            if (indexA !== Infinity) return -1;
            if (indexB !== Infinity) return 1;
            return keyA.localeCompare(keyB, 'zh-Hans-CN');
        });
        
        // 如果排序后的结果不是标准化格式，尝试转换为标准化格式
        return sorted.map(port => {
            // 如果已经是标准化格式，直接返回
            if (port.startsWith('[') && port.includes('|')) {
                return port;
            }
            // 尝试获取标准化显示格式
            if (typeof window !== 'undefined' && typeof window.portSortUtils !== 'undefined') {
                const standardized = window.portSortUtils.getStandardizedDisplay(port);
                if (standardized && standardized.startsWith('[')) {
                    return standardized;
                }
            }
            return port;
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
     * 提取船名（取第一段，兼容"船名/航次"或"船名 航次"）
     * @param {string} vesselText
     * @returns {string}
     */
    function getVesselName(vesselText) {
        if (!vesselText) return '';
        const parts = String(vesselText).split(/[\/\s]+/).filter(Boolean);
        return parts[0] || '';
    }

    /**
     * 提取航次（取第二段，兼容"船名/航次"或"船名 航次"）
     * @param {string} vesselText
     * @returns {string}
     */
    function getVoyageNumber(vesselText) {
        if (!vesselText) return '';
        const parts = String(vesselText).split(/[\/\s]+/).filter(Boolean);
        return parts.length > 1 ? parts[1] : '';
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
            // 直接使用 window.formatDateKey（来自 date-utils.js），避免递归
            const dateKey = (typeof window !== 'undefined' && typeof window.formatDateKey === 'function')
                ? window.formatDateKey(item.date || item.shipDate || '', 'YYYYMMDD')
                : '';

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

    // ============================================
    // 导出常量和函数到全局
    // ============================================
    if (typeof window !== 'undefined') {
        // 导出常量
        window.STANDARD_PORT_ORDER = window.STANDARD_PORT_ORDER || STANDARD_PORT_ORDER;
        window.STANDARD_AREA_ORDER = window.STANDARD_AREA_ORDER || STANDARD_AREA_ORDER;
        window.PORT_NAME_MAPPING = window.PORT_NAME_MAPPING || PORT_NAME_MAPPING;
        
        // 导出函数
        window.normalizeDestinationValue = window.normalizeDestinationValue || normalizeDestinationValue;
        window.normalizePortName = window.normalizePortName || normalizePortName;
        window.registerRouteLabel = window.registerRouteLabel || registerRouteLabel;
        window.getRouteLabel = window.getRouteLabel || getRouteLabel;
        window.sortPortsByStandardOrder = window.sortPortsByStandardOrder || sortPortsByStandardOrder;
        window.sortAreasByStandardOrder = window.sortAreasByStandardOrder || sortAreasByStandardOrder;
        window.populateSelect = window.populateSelect || populateSelect;
        window.buildShipSignature = window.buildShipSignature || buildShipSignature;
        window.getVesselName = window.getVesselName || getVesselName;
        window.getVoyageNumber = window.getVoyageNumber || getVoyageNumber;
        window.deduplicateSailingItems = window.deduplicateSailingItems || deduplicateSailingItems;
    }

})();

