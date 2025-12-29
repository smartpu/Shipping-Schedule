/**
 * 港口排序工具模块
 * 用于 001-01-manual-download.html、365-01-manual-download.html 等工具
 * 
 * 提供：
 * - 从 Material-parsed_ports_list.txt 解析港口列表（新格式：4部分）
 * - 港口代码提取函数
 * - 区域信息提取函数
 * - 港口排序索引计算函数
 * - 区域最大索引映射
 * - 港口标准化显示格式：[英文名|代码|区域]
 * 
 * 文件格式说明：
 * 每行格式：alphaliner港口, [标准化港口英文名|代码|区域], 365数据港口, "001数据港口"
 * 例如：Los Angeles (incl San Pedro), [LOS ANGELES CA|USLAX|美西], 北美洲美西美国洛杉矶, "LOS ANGELES,CA(洛杉矶,加利福尼亚州)"
 */

// 嵌入的港口列表排序映射（避免CORS问题）
// 基于 Material-parsed_ports_list.txt 文件生成（从第二部分 [英文名|代码|区域] 提取）
// 共 481 个港口（2025-12-28 更新，已排序）
const EMBEDDED_PORTS_SORT_MAP = {
    "USLAX":0, "USLGB":1, "USOAK":2, "USPAE":3, "USPDX":4, "USSEA":5, "USTIW":6, "USDUT":7, "USHNL":8, "USBAL":9,
    "USBOS":10, "USCHS":11, "USHOU":12, "USILM":14, "USJAX":15, "USMIA":16, "USMOB":17, "USMSY":18, "USNYC":19, "USORF":20,
    "USPEF":21, "USPHL":22, "USSAV":23, "USTPA":24, "CACAL":25, "CAEDM":26, "CAHAL":27, "CAMTR":28, "CAPRR":29, "CATOR":30,
    "CAVAN":31, "MXESE":32, "MXLZC":33, "MXZLO":34, "CLARI":35, "CLCNL":36, "CLIQQ":37, "CLLQN":38, "CLPAG":39, "CLSAI":40,
    "CLSVE":41, "CLVAP":42, "COBAQ":43, "COBUN":44, "COCTG":45, "ECGYE":46, "ECPSJ":47, "PECHY":48, "PECLL":49, "ARBUE":50,
    "BRIBB":51, "BRIGI":52, "BRIOA":53, "BRITJ":54, "BRNVT":55, "BRPEC":56, "BRPNG":57, "BRRIG":58, "BRRIO":59, "BRSSA":60,
    "BRSSZ":61, "BRSUA":62, "BRVIX":63, "PYASU":64, "UYMVD":65, "BSFPO":66, "CRPTC":67, "DOCAU":68, "GTPRQ":69, "HNPCR":70,
    "JMKIN":71, "NICIO":72, "PABLB":73, "PACFZ":74, "PACTB":75, "PAMIT":76, "PAONX":77, "SVAQJ":78, "TTPOS":79, "VELAG":80,
    "VEPBL":81, "BEANR":82, "BEZEE":83, "DEBRV":84, "DEHAM":85, "FRLEH":86, "GBFXT":87, "GBSOU":88, "NLRTM":89, "DEWVN":90,
    "DKAAR":91, "FRDKK":92, "GBLGP":93, "HUBUD":94, "IEDUB":95, "LTKLJ":96, "PLGDN":97, "PLGDY":98, "PTLEI":99, "PTSIE":100,
    "RULED":101, "RUNVS":102, "SEGOT":103, "ESAGP":104, "ESALG":105, "ESBCN":106, "ESVLC":107, "FRFOS":108, "ITGIT":109, "ITGOA":110,
    "ITNAP":111, "ITSPE":112, "ITVDL":113, "MTMAR":114, "ALDRZ":115, "EGAKI":116, "EGALY":117, "EGDAM":118, "EGEDK":119, "EGPSD":120,
    "GRPIR":121, "GRSKG":122, "HRRJK":123, "ILASH":124, "ILHFA":125, "ITTRS":126, "ITVCE":127, "LBBEY":128, "SIKOP":129, "TRALI":130,
    "TRDRC":131, "TRISK":132, "TRMER":133, "TRTEK":134, "TRYAR":135, "BGVAR":136, "GEPTI":137, "ROCND":138, "TREYP":139, "TRGEB":140,
    "TRGEM":141, "TRIST":142, "UAODS":143, "DZALG":144, "LYMRA":145, "MACAS":146, "MATNG":147, "AEAJM":148, "AEAUH":149, "AEJEA":150,
    "AEKLF":151, "AESHJ":152, "BHBAH":153, "IQUQR":154, "IRBND":155, "IRZBR":156, "KWSAA":157, "KWSWK":158, "LBKYE":159, "OMDQM":160,
    "OMSLL":161, "OMSOH":162, "QAHMD":163, "SADMM":164, "SAJUB":165, "SARYP":166, "DJJIB":167, "EGSOK":168, "JOAQJ":169, "SAJEC":170,
    "SAJED":171, "SAKAC":172, "YEADE":173, "YEHOD":174, "BDCGP":175, "BDMGL":176, "INCCU":177, "INCOK":178, "INENR":179, "INGGV":180,
    "INHAL":181, "INHZR":182, "INKAT":183, "INMAA":184, "INMUN":185, "INNML":186, "INNSA":187, "INPAV":188, "INTUT":189, "INVTZ":190,
    "INVZJ":191, "LKCMB":192, "LKHBA":193, "MVMLM":194, "PKBQM":195, "PKKHI":196, "AUADL":197, "AUBNE":198, "AUDAM":199, "AUDRW":200,
    "AUFRE":201, "AUGLT":202, "AUMEL":203, "AUNTL":204, "AUPHE":205, "AUPKL":206, "AUSYD":207, "AUTSV":208, "CXXCH":209, "NZAKL":210,
    "NZBLU":211, "NZLYT":212, "NZMAP":213, "NZNPE":214, "NZNSN":215, "NZPOE":216, "NZTIU":217, "NZTRG":218, "NZWLG":219, "ASPPG":220,
    "FJLTK":221, "FJSUV":222, "FMKSA":223, "FMPNI":224, "FMTKK":225, "KITRW":226, "MHMAJ":227, "MHQEE":228, "NCBDB":229, "NCNOU":230,
    "NCVAV":231, "PFPPT":232, "PGBAS":233, "PGKIM":234, "PGLAE":235, "PGLNV":236, "PGMAG":237, "PGPOM":238, "PGRAB":239, "SBHIR":240,
    "SBNOR":241, "TLDIL":242, "TOTBU":243, "VUSAN":244, "VUVLI":245, "WSAPW":246, "FMYAP":247, "GUAPR":248, "MPSPN":249, "PWROR":250,
    "KELAU":251, "KEMBA":252, "MGTMM":253, "MUPLU":254, "MZBEW":255, "MZMNC":256, "MZMPM":257, "REREU":258, "SOBBO":259, "TZDAR":260,
    "TZMYW":261, "ZACPT":262, "ZADUR":263, "ZAZBA":264, "AOLAD":265, "AOLOB":266, "BJCOO":267, "CDMAT":268, "CGPNR":269, "CIABJ":270,
    "CMDLA":271, "CMKBI":272, "GHTEM":273, "GNCKY":274, "LRMLW":275, "NAWVB":276, "NGLKK":277, "NGLOS":278, "NGONN":279, "SLFNA":280,
    "SNDKR":281, "TGLFW":282, "BNMUA":283, "KHKOS":284, "KHPNH":285, "MMRGN":286, "MYBKI":287, "MYBTU":288, "MYKCH":289, "MYKUA":290,
    "MYLBU":291, "MYMKZ":292, "MYMYY":293, "MYPEN":294, "MYPGU":295, "MYPKG":296, "MYSBW":297, "MYSDK":298, "MYTPP":299, "MYTWU":300,
    "SGSIN":301, "THBKK":302, "THLCH":303, "THLKR":304, "THSGZ":305, "THSRI":306, "VNC8Q":307, "VNCLN":308, "VNCUA":309, "VNDAD":310,
    "VNDNA":311, "VNHPH":312, "VNNGH":313, "VNSGN":314, "VNTOT":315, "VNUIH":316, "IDBEN":317, "IDBLW":318, "IDBTM":319, "IDDUM":320,
    "IDFTG":321, "IDJKT":322, "IDKOE":323, "IDKTJ":324, "IDLAM":325, "IDMAK":326, "IDPLM":327, "IDPNJ":328, "IDPNK":329, "IDSRG":330,
    "IDSUB":331, "PHBCD":332, "PHBTG":333, "PHCEB":334, "PHCGY":335, "PHCSI":337, "PHCTB":338, "PHDVO":339, "PHGES":341, "PHIGN":342,
    "PHMNL":343, "PHPPS":344, "PHSFS":345, "PHTAG":346, "PHZAM":347, "HKHKG":348, "TWKEL":349, "TWKHH":350, "TWTPE":351, "TWTXG":352,
    "CNBYQ":353, "CNCGS":354, "CNCWN":355, "CNDCB":356, "CNDDG":357, "CNDFG":358, "CNDGG":359, "CNDJA":360, "CNDLC":361, "CNFOC":362,
    "CNGAO":363, "CNGZG":364, "CNHUH":365, "CNJIA":366, "CNLYG":367, "CNNGB":368, "CNNJG":369, "CNNSA":370, "CNNTG":371, "CNPTJ":372,
    "CNQID":373, "CNQZH":374, "CNQZL":375, "CNRZH":376, "CNSHA":377, "CNSHD":378, "CNSHK":379, "CNSHP":381, "CNSTG":382, "CNTAC":383,
    "CNTAO":384, "CNTGS":385, "CNTXG":386, "CNWEF":387, "CNWEI":388, "CNWHG":389, "CNWHI":390, "CNWNZ":391, "CNXMN":392, "CNYIK":393,
    "CNYPG":394, "CNYTG":395, "CNYTN":396, "CNZJG":397, "CNZNG":398, "CNZUH":399, "KRBNP":400, "KRCHA":401, "KRINC":402, "KRKPO":403,
    "KRKUV":404, "KRKWA":405, "KRMAS":406, "KRMOK":407, "KRPTK":408, "KRPUS":409, "KRTSN":410, "KRUSN":411, "JPCHB":412, "JPHIC":413,
    "JPKSM":414, "JPKWS":415, "JPNGO":416, "JPSMZ":417, "JPTYO":418, "JPYOK":420, "JPMAI":421, "JPOSA":422, "JPSSK":423, "JPUKB":424,
    "JPWAK":425, "JPYKK":426, "JPFKY":427, "JPHIJ":428, "JPMIZ":430, "JPTAK":431, "JPTKS":432, "JPTKY":433, "JPHSM":434, "JPHTD":435,
    "JPIMI":436, "JPKMJ":437, "JPKOJ":438, "JPMOJ":439, "JPNGS":440, "JPOIT":441, "JPSBS":442, "JPSDI":443, "JPTBT":444, "JPYAT":445,
    "JPAXT":446, "JPHHE":447, "JPIWK":448, "JPKIJ":449, "JPKIS":450, "JPKNZ":451, "JPMYK":452, "JPNAN":453, "JPNAO":454, "JPOMZ":455,
    "JPONA":456, "JPSDJ":457, "JPSHS":458, "JPSKT":459, "JPSMN":460, "JPTHS":461, "JPTOY":462, "JPTRG":463, "JPUBJ":464, "JPIMB":465,
    "JPIYM":466, "JPKCZ":467, "JPKOM":468, "JPMYJ":469, "JPKUH":470, "JPMUR":471, "JPOTR":472, "JPSPK":473, "JPTMK":474, "JPISG":475,
    "JPNAH":476, "JPOKA":477, "RUDYR":478, "RUEGV":479, "RUGDX":480, "RUKOR":481, "RUNJK":482, "RUPKC":483, "RUVNN":484, "RUVVO":485,
    "RUVYP":486
};

/**
 * 港口排序工具类
 */
class PortSortUtils {
    constructor() {
        // 港口代码排序映射（优先使用嵌入数据，避免CORS问题）
        this.portCodeSortMap = {}; // {code: sortIndex}
        this.regionMaxIndexMap = {}; // {region: maxIndex} 每个区域的最大索引
        this.portsListLoaded = false;
        this.unknownPortCounter = {}; // {region: counter} 用于同一区域内多个未知港口的排序
        
        // 港口名称到代码的映射（用于标准化显示）
        this.portNameToCodeMap = {}; // {normalizedName: code}
        this.portCodeToDisplayMap = {}; // {code: {code, englishName, region, displayText: "[英文名|代码|区域]"}}
        this.portsMappingLoaded = false;
        
        // 港口信息完整映射（从 Material-parsed_ports_list.txt 解析）
        // 格式：{code: {alphalinerName, standardName, englishName, code, region, port365, port001, sortIndex}}
        this.portInfoMap = {}; // {code: portInfo}
        
        // 区域最大索引映射（基于Material-parsed_ports_list.txt文件中的实际数据，已按区域和代码排序）
        this.regionLastIndices = {
            '美西': 6, '美东': 24, '加拿大': 31, '墨西哥': 34, '南美西': 49, '南美东': 65,
            '中美洲': 81, '欧基港': 89, '欧洲偏港': 103, '地西': 114, '地东': 135, '黑海': 143,
            '中东': 166, '红海': 174, '印巴': 196, '澳大利亚': 209, '新西兰': 219, '南太平洋': 246,
            '西太平洋': 250, '东非': 261, '南非': 264, '西非': 282, '新马越泰': 316, '印尼菲律宾': 347,
            '中国香港': 348, '中国台湾': 352, '中国': 399, '韩国': 411, '关东': 420, '关西': 426,
            '关西/濑户内海': 433, '九州': 445, '本州': 464, '四国岛': 469, '北海道': 474, '冲绳': 477,
            '远东': 486
        };
    }

    /**
     * 解析 Material-parsed_ports_list.txt 新格式
     * 格式：alphaliner港口, [标准化港口英文名|代码|区域], 365数据港口, "001数据港口"
     * @param {string} line - 文件行内容
     * @returns {Object|null} 解析后的港口信息对象
     */
    parsePortLine(line) {
        if (!line || !line.trim()) return null;
        
        // 分割4部分：alphaliner港口, [标准化港口|代码|区域], 365数据港口, "001数据港口"
        // 注意：第二部分用方括号，第四部分用引号，需要用正则精确匹配
        const parts = [];
        let currentPart = '';
        let inBrackets = false;
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '[' && !inBrackets && !inQuotes) {
                if (currentPart.trim()) {
                    parts.push(currentPart.trim());
                    currentPart = '';
                }
                inBrackets = true;
                currentPart += char;
            } else if (char === ']' && inBrackets) {
                currentPart += char;
                parts.push(currentPart.trim());
                currentPart = '';
                inBrackets = false;
            } else if (char === '"' && !inBrackets) {
                if (!inQuotes && currentPart.trim()) {
                    // 第三部分结束，开始第四部分
                    parts.push(currentPart.trim());
                    currentPart = '';
                }
                inQuotes = !inQuotes;
                if (inQuotes) {
                    currentPart += char;
                } else {
                    currentPart += char;
                    parts.push(currentPart.trim());
                    currentPart = '';
                }
            } else if (char === ',' && !inBrackets && !inQuotes) {
                // 普通逗号分隔符
                if (currentPart.trim()) {
                    parts.push(currentPart.trim());
                    currentPart = '';
                }
            } else {
                currentPart += char;
            }
        }
        
        // 添加最后一部分
        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }
        
        if (parts.length < 2) return null;
        
        const alphalinerName = parts[0] || '';
        const standardPart = parts[1] || ''; // [英文名|代码|区域]
        const port365 = parts[2] || '';
        const port001 = parts[3] || ''; // 可能包含引号
        
        // 解析标准化部分：[英文名|代码|区域]
        let englishName = '';
        let code = '';
        let region = '';
        
        if (standardPart.startsWith('[') && standardPart.endsWith(']')) {
            const content = standardPart.slice(1, -1);
            const standardParts = content.split('|').map(p => p.trim());
            if (standardParts.length >= 1) englishName = standardParts[0];
            if (standardParts.length >= 2) code = standardParts[1];
            if (standardParts.length >= 3) region = standardParts[2];
        }
        
        // 清理 port001（去除引号）
        const port001Clean = port001.replace(/^"|"$/g, '');
        
        if (!code) return null;
        
        return {
            alphalinerName,
            standardName: englishName, // 标准化英文名
            englishName,
            code,
            region,
            port365,
            port001: port001Clean
        };
    }

    /**
     * 加载港口列表文件并创建排序映射和名称映射
     */
    async loadPortsList() {
        if (this.portsListLoaded && this.portsMappingLoaded) return;
        
        // 优先使用嵌入的数据（避免CORS问题）
        if (typeof EMBEDDED_PORTS_SORT_MAP !== 'undefined' && Object.keys(EMBEDDED_PORTS_SORT_MAP).length > 0) {
            this.portCodeSortMap = EMBEDDED_PORTS_SORT_MAP;
            this.portsListLoaded = true;
            // 从嵌入数据构建名称映射（需要从文件加载完整信息）
            await this.loadPortsMapping();
            if (typeof window.debugLog === 'function') {
                window.debugLog('港口列表已加载（嵌入数据），共', Object.keys(this.portCodeSortMap).length, '个港口代码');
            }
            return;
        }
        
        // 备用方案：尝试从文件加载（仅在非file://协议下）
        if (window.location.protocol === 'file:') {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('本地文件系统环境，使用嵌入的港口列表数据');
            }
            await this.loadPortsMapping();
            return;
        }
        
        try {
            const response = await fetch('Data/Material-parsed_ports_list.txt');
            if (!response.ok) {
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('无法加载港口列表文件，使用嵌入数据');
                }
                await this.loadPortsMapping();
                return;
            }
            const text = await response.text();
            const lines = text.split('\n').filter(l => l.trim());
            
            // 解析每一行（新格式）
            lines.forEach((line, index) => {
                const portInfo = this.parsePortLine(line);
                if (portInfo && portInfo.code) {
                    const code = portInfo.code;
                    
                    // 使用行号作为排序索引（文件已经按正确顺序排序）
                    this.portCodeSortMap[code] = index;
                    
                    // 保存完整港口信息
                    this.portInfoMap[code] = {
                        ...portInfo,
                        sortIndex: index
                    };
                    
                    // 构建名称到代码的映射（支持多种名称格式）
                    const allVariants = new Set();
                    
                    // 1. 标准化英文名
                    if (portInfo.englishName) {
                        allVariants.add(portInfo.englishName);
                        allVariants.add(portInfo.englishName.toUpperCase());
                        allVariants.add(portInfo.englishName.toLowerCase());
                    }
                    
                    // 2. Alphaliner名称
                    if (portInfo.alphalinerName) {
                        allVariants.add(portInfo.alphalinerName);
                        allVariants.add(portInfo.alphalinerName.toUpperCase());
                        allVariants.add(portInfo.alphalinerName.toLowerCase());
                    }
                    
                    // 3. 365数据港口名称（提取中文部分）
                    if (portInfo.port365) {
                        // 格式：北美洲美西美国洛杉矶 -> 提取"洛杉矶"
                        const cnMatch = portInfo.port365.match(/[\u4e00-\u9fa5]+$/);
                        if (cnMatch) {
                            allVariants.add(cnMatch[0]);
                        }
                        allVariants.add(portInfo.port365);
                    }
                    
                    // 4. 001数据港口名称（格式：QINGDAO(青岛) 或 LOS ANGELES,CA(洛杉矶,加利福尼亚州)）
                    if (portInfo.port001) {
                        // 提取英文部分（逗号前，括号前）
                        const enMatch = portInfo.port001.match(/^([^(,]+)/);
                        if (enMatch) {
                            const enPart = enMatch[1].trim();
                            allVariants.add(enPart);
                            allVariants.add(enPart.toUpperCase());
                            allVariants.add(enPart.toLowerCase());
                            // 处理逗号分隔的格式（如 "LOS ANGELES,CA"）
                            if (enPart.includes(',')) {
                                const beforeComma = enPart.split(',')[0].trim();
                                allVariants.add(beforeComma);
                                allVariants.add(beforeComma.toUpperCase());
                            }
                        }
                        // 提取中文部分（括号内，逗号前）
                        const cnMatch = portInfo.port001.match(/\(([^,)]+)/);
                        if (cnMatch) {
                            const cnPart = cnMatch[1].trim();
                            allVariants.add(cnPart);
                            // 去除"港"后缀（如果存在）
                            if (cnPart.endsWith('港')) {
                                allVariants.add(cnPart.slice(0, -1));
                            }
                        }
                        allVariants.add(portInfo.port001);
                    }
                    
                    // 5. 代码本身
                    allVariants.add(code);
                    
                    // 将所有变体映射到代码
                    allVariants.forEach(variant => {
                        if (variant && variant.trim()) {
                            this.portNameToCodeMap[variant] = code;
                            this.portNameToCodeMap[variant.trim()] = code;
                        }
                    });
                    
                    // 构建代码到标准化显示格式的映射：[英文名|代码|区域]
                    this.portCodeToDisplayMap[code] = {
                        code: code,
                        englishName: portInfo.englishName,
                        region: portInfo.region,
                        displayText: `[${portInfo.englishName}|${code}|${portInfo.region}]`
                    };
                }
            });
            
            this.portsListLoaded = true;
            this.portsMappingLoaded = true;
            if (typeof window.debugLog === 'function') {
                window.debugLog('港口列表已加载（从文件），共', Object.keys(this.portCodeSortMap).length, '个港口代码');
            }
        } catch (error) {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('加载港口列表失败，使用嵌入数据:', error);
            }
            await this.loadPortsMapping();
        }
    }

    /**
     * 从文件加载港口名称映射（用于标准化显示）
     */
    async loadPortsMapping() {
        if (this.portsMappingLoaded) return;
        
        // 备用方案：尝试从文件加载（仅在非file://协议下）
        if (window.location.protocol === 'file:') {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('本地文件系统环境，无法加载港口映射文件');
            }
            this.portsMappingLoaded = true;
            return;
        }
        
        try {
            const response = await fetch('Data/Material-parsed_ports_list.txt');
            if (!response.ok) {
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('无法加载港口映射文件');
                }
                this.portsMappingLoaded = true;
                return;
            }
            const text = await response.text();
            const lines = text.split('\n').filter(l => l.trim());
            
            // 解析每一行（新格式）
            lines.forEach((line) => {
                const portInfo = this.parsePortLine(line);
                if (portInfo && portInfo.code) {
                    const code = portInfo.code;
                    
                    // 构建更全面的名称到代码的映射
                    const allVariants = new Set();
                    
                    // 1. 标准化英文名
                    if (portInfo.englishName) {
                        allVariants.add(portInfo.englishName);
                        allVariants.add(portInfo.englishName.toUpperCase());
                        allVariants.add(portInfo.englishName.toLowerCase());
                        // 处理空格和逗号变体
                        const variants = [
                            portInfo.englishName.replace(/\s+/g, ' '),
                            portInfo.englishName.replace(/,/g, ''),
                            portInfo.englishName.replace(/\s+/g, '')
                        ];
                        variants.forEach(v => {
                            if (v && v !== portInfo.englishName) {
                                allVariants.add(v);
                                allVariants.add(v.toUpperCase());
                            }
                        });
                    }
                    
                    // 2. Alphaliner名称
                    if (portInfo.alphalinerName) {
                        allVariants.add(portInfo.alphalinerName);
                        allVariants.add(portInfo.alphalinerName.toUpperCase());
                        // 提取括号前的主要名称
                        const beforeBracket = portInfo.alphalinerName.split('(')[0].trim();
                        if (beforeBracket && beforeBracket !== portInfo.alphalinerName) {
                            allVariants.add(beforeBracket);
                            allVariants.add(beforeBracket.toUpperCase());
                        }
                    }
                    
                    // 3. 365数据港口名称
                    if (portInfo.port365) {
                        allVariants.add(portInfo.port365);
                        // 提取中文部分
                        const cnMatch = portInfo.port365.match(/[\u4e00-\u9fa5]+$/);
                        if (cnMatch) {
                            allVariants.add(cnMatch[0]);
                        }
                    }
                    
                    // 4. 001数据港口名称（格式：QINGDAO(青岛) 或 LOS ANGELES,CA(洛杉矶,加利福尼亚州)）
                    if (portInfo.port001) {
                        // 提取英文部分（逗号前，括号前）
                        const enMatch = portInfo.port001.match(/^([^(,]+)/);
                        if (enMatch) {
                            const enPart = enMatch[1].trim();
                            allVariants.add(enPart);
                            allVariants.add(enPart.toUpperCase());
                            allVariants.add(enPart.toLowerCase());
                            // 处理逗号分隔的格式（如 "LOS ANGELES,CA"）
                            if (enPart.includes(',')) {
                                const beforeComma = enPart.split(',')[0].trim();
                                allVariants.add(beforeComma);
                                allVariants.add(beforeComma.toUpperCase());
                            }
                        }
                        // 提取中文部分（括号内，逗号前）
                        const cnMatch = portInfo.port001.match(/\(([^,)]+)/);
                        if (cnMatch) {
                            const cnPart = cnMatch[1].trim();
                            allVariants.add(cnPart);
                            // 去除"港"后缀（如果存在）
                            if (cnPart.endsWith('港')) {
                                allVariants.add(cnPart.slice(0, -1));
                            }
                        }
                        allVariants.add(portInfo.port001);
                    }
                    
                    // 5. 代码本身
                    allVariants.add(code);
                    
                    // 将所有变体映射到代码
                    allVariants.forEach(variant => {
                        if (variant && variant.trim()) {
                            this.portNameToCodeMap[variant] = code;
                            this.portNameToCodeMap[variant.trim()] = code;
                        }
                    });
                    
                    // 构建代码到标准化显示格式的映射：[英文名|代码|区域]
                    this.portCodeToDisplayMap[code] = {
                        code: code,
                        englishName: portInfo.englishName,
                        region: portInfo.region,
                        displayText: `[${portInfo.englishName}|${code}|${portInfo.region}]`
                    };
                }
            });
            
            this.portsMappingLoaded = true;
            if (typeof window.debugLog === 'function') {
                window.debugLog('港口映射已加载，共', Object.keys(this.portNameToCodeMap).length, '个映射');
            }
        } catch (error) {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('加载港口映射失败:', error);
            }
            this.portsMappingLoaded = true;
        }
    }

    /**
     * 根据标准化港口名称获取代码（支持东西南北港口模糊匹配）
     * @param {string} normalizedPortName - 标准化后的港口名称（中文或英文）
     * @returns {string} 港口代码，如果找不到则返回原值
     */
    getCodeByPortName(normalizedPortName) {
        if (!normalizedPortName) return '';
        const normalized = String(normalizedPortName).trim();
        
        // 如果已经是代码格式（如 USLAX），直接返回
        if (this.portCodeSortMap[normalized]) {
            return normalized;
        }
        
        // 如果已经是标准化显示格式（[英文名|代码|区域]），提取代码
        const codeMatch = normalized.match(/\[([^\]]+)\]/);
        if (codeMatch && codeMatch[1]) {
            const parts = codeMatch[1].split('|');
            if (parts.length >= 2) {
                const extractedCode = parts[1].trim();
                if (this.portCodeSortMap[extractedCode]) {
                    return extractedCode;
                }
            }
        }
        
        // 直接查找映射
        if (this.portNameToCodeMap[normalized]) {
            return this.portNameToCodeMap[normalized];
        }
        
        // 尝试大写格式
        const upper = normalized.toUpperCase();
        if (this.portNameToCodeMap[upper]) {
            return this.portNameToCodeMap[upper];
        }
        
        // 特殊处理：东西南北港口模糊匹配
        // 如果找不到，尝试去掉方位词再找（如"巴生西" -> "巴生"）
        const directionPatterns = [
            { pattern: /([东西南北]+)$/, remove: true }, // 中文方位词
            { pattern: /(NORTH|SOUTH|EAST|WEST|N|S|E|W)$/i, remove: true } // 英文方位词
        ];
        
        for (const { pattern, remove } of directionPatterns) {
            if (pattern.test(normalized)) {
                // 去掉方位词
                const withoutDirection = normalized.replace(pattern, '').trim();
                if (withoutDirection && withoutDirection !== normalized) {
                    const code = this.getCodeByPortName(withoutDirection);
                    if (code && code !== withoutDirection) {
                        return code;
                    }
                }
                
                // 反向：如果只有基础名称，尝试添加方位词查找
                // 例如：如果输入"巴生"，尝试查找"巴生西"、"巴生北"等
                const directionWords = {
                    '东': ['EAST', 'E'],
                    '西': ['WEST', 'W', 'SOUTH'],
                    '南': ['SOUTH', 'S'],
                    '北': ['NORTH', 'N']
                };
                
                // 尝试添加各个方位词
                for (const [cnDir, enDirs] of Object.entries(directionWords)) {
                    // 尝试中文方位词
                    const withCnDir = withoutDirection + cnDir;
                    if (this.portNameToCodeMap[withCnDir]) {
                        return this.portNameToCodeMap[withCnDir];
                    }
                    // 尝试英文方位词
                    for (const enDir of enDirs) {
                        const withEnDir = withoutDirection + ' ' + enDir;
                        const withEnDirUpper = withoutDirection.toUpperCase() + ' ' + enDir;
                        if (this.portNameToCodeMap[withEnDir] || this.portNameToCodeMap[withEnDirUpper]) {
                            return this.portNameToCodeMap[withEnDir] || this.portNameToCodeMap[withEnDirUpper];
                        }
                    }
                }
            }
        }
        
        // 注意：PORT_NAME_MAPPING 已移除，所有港口标准化现在通过 Material-parsed_ports_list.txt 处理
        
        // 如果找不到，返回原值
        return normalized;
    }

    /**
     * 根据代码获取标准化显示文本（[英文名|代码|区域]）
     * @param {string} code - 港口代码
     * @returns {string} 标准化显示文本，格式：[英文名|代码|区域]
     */
    getDisplayTextByCode(code) {
        if (!code) return '';
        if (this.portCodeToDisplayMap[code]) {
            return this.portCodeToDisplayMap[code].displayText;
        }
        return code; // 如果找不到，返回代码本身
    }

    /**
     * 根据标准化港口名称获取标准化显示文本
     * @param {string} normalizedPortName - 标准化后的港口名称（中文或英文）
     * @returns {string} 标准化显示文本，格式：[英文名|代码|区域]
     */
    getStandardizedDisplay(normalizedPortName) {
        if (!normalizedPortName) return '';
        const normalized = String(normalizedPortName).trim();
        
        // 如果已经是标准化显示格式（[英文名|代码|区域]），直接返回
        if (normalized.startsWith('[') && normalized.includes('|')) {
            const codeMatch = normalized.match(/\|([A-Z0-9]+)\|/);
            if (codeMatch && codeMatch[1] && this.portCodeSortMap[codeMatch[1]]) {
                return normalized; // 已经是标准格式
            }
        }
        
        // 尝试获取代码
        let code = this.getCodeByPortName(normalized);
        
        // 如果找不到代码，尝试通过 PORT_NAME_MAPPING 查找标准化中文名称
        if ((!code || code === normalized) && typeof window !== 'undefined' && typeof window.PORT_NAME_MAPPING !== 'undefined') {
            const portMapping = window.PORT_NAME_MAPPING;
            const mappedCN = portMapping[normalized] || portMapping[normalized.toUpperCase()];
            if (mappedCN && mappedCN !== normalized) {
                // 使用映射后的中文名称再次查找代码
                code = this.getCodeByPortName(mappedCN);
            }
        }
        
        // 如果找到了代码，返回标准化显示格式
        if (code && code !== normalized && this.portCodeToDisplayMap[code]) {
            return this.portCodeToDisplayMap[code].displayText;
        }
        
        // 如果找不到映射，返回原值
        return normalizedPortName;
    }

    /**
     * 对港口名称数组进行排序（按照标准化顺序）
     * @param {Array<string>} portNames - 港口名称数组（可能是标准化中文名称或标准化显示格式）
     * @returns {Array<string>} 排序后的数组（显示标准化格式：[英文名|代码|区域]）
     */
    sortPortNames(portNames) {
        this.resetUnknownPortCounter();
        
        // 将港口名称转换为包含代码和区域的对象
        const portData = portNames.map(name => {
            // 如果已经是标准化显示格式（[英文名|代码|区域]），提取代码
            let code = '';
            let normalizedName = name;
            const standardFormatMatch = name.match(/\[([^\]]+)\]/);
            if (standardFormatMatch && standardFormatMatch[1]) {
                const parts = standardFormatMatch[1].split('|');
                if (parts.length >= 2) {
                    code = parts[1].trim();
                    normalizedName = parts[0].trim(); // 英文名
                }
            } else {
                // 如果不是标准化格式，尝试获取代码
                code = this.getCodeByPortName(name);
                normalizedName = name;
            }
            
            // 如果仍然没有代码，尝试通过 PORT_NAME_MAPPING 查找
            if (!code || code === normalizedName) {
                if (typeof window !== 'undefined' && typeof window.PORT_NAME_MAPPING !== 'undefined') {
                    const portMapping = window.PORT_NAME_MAPPING;
                    const mappedCN = portMapping[normalizedName] || portMapping[normalizedName.toUpperCase()];
                    if (mappedCN && mappedCN !== normalizedName) {
                        normalizedName = mappedCN;
                        code = this.getCodeByPortName(mappedCN);
                    }
                }
            }
            
            // 尝试从映射中获取区域信息
            let region = '';
            if (code && this.portCodeToDisplayMap[code]) {
                region = this.portCodeToDisplayMap[code].region || '';
            }
            
            return {
                originalName: name,
                normalizedName: normalizedName,
                code: code,
                region: region,
                sortIndex: this.getSortIndexByCode(code, region)
            };
        });
        
        // 排序
        portData.sort((a, b) => {
            if (a.sortIndex !== b.sortIndex) {
                return a.sortIndex - b.sortIndex;
            }
            // 如果索引相同，按代码字母顺序排序
            return (a.code || '').localeCompare(b.code || '');
        });
        
        // 返回标准化显示格式
        return portData.map(item => {
            if (item.code && this.portCodeToDisplayMap[item.code]) {
                return this.portCodeToDisplayMap[item.code].displayText;
            }
            // 如果找不到映射，但已有代码，使用 [英文名|代码|区域] 格式
            if (item.code && item.code !== item.normalizedName) {
                const region = item.region || '';
                return `[${item.normalizedName}|${item.code}|${region}]`;
            }
            return item.originalName;
        });
    }

    /**
     * 从文本中提取代码（[xx|xx|xx]第二个xx）
     * @param {string} text - 包含[xx|xx|xx]格式的文本
     * @returns {string} 港口代码
     */
    extractCode(text) {
        if (!text) return '';
        // 查找 [xx|xx|xx] 格式，提取第二个xx（代码）
        const match = text.match(/\[([^\]]+)\]/);
        if (match) {
            const parts = match[1].split('|');
            if (parts.length >= 2) {
                return parts[1].trim();
            }
        }
        return '';
    }
    
    /**
     * 从文本中提取区域（[xx|xx|xx]第三个xx）
     * @param {string} text - 包含[xx|xx|xx]格式的文本
     * @returns {string} 区域名称
     */
    extractRegion(text) {
        if (!text) return '';
        // 查找 [xx|xx|xx] 格式，提取第三个xx（区域）
        const match = text.match(/\[([^\]]+)\]/);
        if (match) {
            const parts = match[1].split('|');
            if (parts.length >= 3) {
                return parts[2].trim();
            }
        }
        return '';
    }

    /**
     * 从文本中提取显示名字（[xx|xx|xx]第一个xx）
     * @param {string} text - 包含[xx|xx|xx]格式的文本
     * @returns {string} 显示名字
     */
    extractDisplayName(text) {
        if (!text) return '';
        // 查找 [xx|xx|xx] 格式，提取第一个xx（名字）
        const match = text.match(/\[([^\]]+)\]/);
        if (match) {
            const parts = match[1].split('|');
            if (parts.length >= 1) {
                return parts[0].trim();
            }
        }
        // 如果无法提取，返回完整值
        return text;
    }

    /**
     * 根据区域名称获取该区域的最后一个索引
     * @param {string} region - 区域名称
     * @returns {number} 该区域的最后一个索引
     */
    getLastIndexByRegion(region) {
        if (!region) return 999999;
        // 如果已经计算过该区域的最大索引，直接返回
        if (this.regionMaxIndexMap.hasOwnProperty(region)) {
            return this.regionMaxIndexMap[region];
        }
        
        if (this.regionLastIndices.hasOwnProperty(region)) {
            this.regionMaxIndexMap[region] = this.regionLastIndices[region];
            return this.regionLastIndices[region];
        }
        
        // 未知区域，返回一个较大的值
        return 999998;
    }
    
    /**
     * 重置未知港口计数器（在排序前调用）
     */
    resetUnknownPortCounter() {
        this.unknownPortCounter = {};
    }
    
    /**
     * 根据代码和区域获取排序索引
     * @param {string} code - 港口代码
     * @param {string} region - 区域名称（可选）
     * @returns {number} 排序索引
     */
    getSortIndexByCode(code, region = '') {
        if (this.portCodeSortMap.hasOwnProperty(code)) {
            return this.portCodeSortMap[code];
        }
        // 如果代码不在列表中，但知道区域，则排在该区域的最后
        if (region) {
            const regionLastIndex = this.getLastIndexByRegion(region);
            // 对于同一区域内的多个未知港口，使用动态计数器
            if (!this.unknownPortCounter.hasOwnProperty(region)) {
                this.unknownPortCounter[region] = 0;
            }
            this.unknownPortCounter[region]++;
            return regionLastIndex + this.unknownPortCounter[region];
        }
        return 999999; // 完全未知的排在最后
    }

    /**
     * 对港口数据数组进行排序
     * @param {Array} ports - 港口数据数组，每个元素应包含 code 和 region 属性
     * @returns {Array} 排序后的数组
     */
    sortPorts(ports) {
        this.resetUnknownPortCounter();
        return ports.sort((a, b) => {
            const indexA = this.getSortIndexByCode(a.code, a.region);
            const indexB = this.getSortIndexByCode(b.code, b.region);
            // 如果索引相同（都是未知港口），按代码字母顺序排序
            if (indexA === indexB && indexA >= 999998) {
                return (a.code || '').localeCompare(b.code || '');
            }
            return indexA - indexB;
        });
    }

    /**
     * 统一的港口排序函数（用于 001-04、365-04、Monitor-Sailing-Schedule）
     * 排序规则：
     * 1. 按照区域顺序排序（用户指定的区域顺序）
     * 2. 在相同区域内，按照港口代码升序排序
     * 
     * @param {Array<string>} portNames - 港口名称数组（可以是任何格式）
     * @param {Array<string>} [dataOrder] - 可选：已废弃，保留参数以兼容旧代码
     * @returns {Array<string>} 排序后的数组（标准化格式：[英文名|代码|区域]）
     */
    sortPortsByDataAndRegion(portNames, dataOrder = null) {
        if (!Array.isArray(portNames) || portNames.length === 0) return portNames;
        
        // 区域顺序（用户指定）
        const REGION_ORDER = [
            '美西', '美东', '加拿大', '墨西哥', '南美西', '南美东', '中美洲',
            '欧基港', '欧洲偏港', '地西', '地东', '黑海', '中东', '红海', '印巴',
            '澳大利亚', '新西兰', '南太平洋', '西太平洋', '东非', '南非', '西非',
            '新马越泰', '印尼菲律宾', '中国香港', '中国台湾', '中国', '韩国',
            '关东', '关西', '关西/濑户内海', '九州', '本州', '四国岛', '北海道', '冲绳', '远东'
        ];
        
        // 构建区域顺序映射（支持多种区域名称格式）
        const regionOrderMap = new Map();
        REGION_ORDER.forEach((region, index) => {
            regionOrderMap.set(region, index);
            // 同时支持有空格和无空格的版本（如"印尼 菲律宾"和"印尼菲律宾"）
            const normalizedRegion = region.replace(/\s+/g, '');
            if (normalizedRegion !== region) {
                // 如果原始区域有空格，也添加无空格版本
                regionOrderMap.set(normalizedRegion, index);
            }
            // 对于特定区域，也支持有空格版本（如果原始是无空格）
            // 例如："印尼菲律宾" -> "印尼 菲律宾"
            if (region === '印尼菲律宾') {
                regionOrderMap.set('印尼 菲律宾', index);
            }
        });
        
        // 区域名称规范化函数（处理空格问题）
        const normalizeRegionName = (regionName) => {
            if (!regionName) return '';
            // 移除所有空格，统一为无空格版本
            return regionName.replace(/\s+/g, '');
        };
        
        // 将港口名称转换为包含排序信息的对象
        const portData = portNames.map((name, originalIndex) => {
            // 提取代码和区域
            let code = '';
            let region = '';
            let normalizedName = name;
            
            // 如果已经是标准化显示格式（[英文名|代码|区域]），提取信息
            const standardFormatMatch = name.match(/\[([^\]]+)\]/);
            if (standardFormatMatch && standardFormatMatch[1]) {
                const parts = standardFormatMatch[1].split('|');
                if (parts.length >= 2) {
                    code = parts[1].trim();
                    normalizedName = parts[0].trim();
                    if (parts.length >= 3) {
                        region = parts[2].trim();
                    }
                }
            } else {
                // 如果不是标准化格式，尝试获取代码和区域
                code = this.getCodeByPortName(name);
                if (code && this.portCodeToDisplayMap[code]) {
                    region = this.portCodeToDisplayMap[code].region || '';
                }
            }
            
            // 规范化区域名称（处理空格问题）
            const normalizedRegion = normalizeRegionName(region);
            
            // 获取区域顺序索引（先尝试原始名称，再尝试规范化名称）
            let regionOrderIndex = regionOrderMap.has(region) 
                ? regionOrderMap.get(region) 
                : (regionOrderMap.has(normalizedRegion) 
                    ? regionOrderMap.get(normalizedRegion) 
                    : Infinity);
            
            return {
                originalName: name,
                normalizedName: normalizedName,
                code: code,
                region: region,
                regionOrderIndex: regionOrderIndex,
                originalIndex: originalIndex
            };
        });
        
        // 排序
        portData.sort((a, b) => {
            // 1. 按照区域顺序排序
            if (a.regionOrderIndex !== b.regionOrderIndex) {
                return a.regionOrderIndex - b.regionOrderIndex;
            }
            
            // 2. 在相同区域内，按照港口代码升序排序
            if (a.code && b.code) {
                const codeCompare = a.code.localeCompare(b.code);
                if (codeCompare !== 0) {
                    return codeCompare;
                }
            }
            
            // 3. 如果代码相同或都没有代码，保持原始顺序
            return a.originalIndex - b.originalIndex;
        });
        
        // 返回标准化显示格式
        return portData.map(item => {
            // 如果已经有标准化格式，直接返回
            if (item.originalName.startsWith('[') && item.originalName.includes('|')) {
                return item.originalName;
            }
            
            // 否则构建标准化格式
            if (item.code && this.portCodeToDisplayMap[item.code]) {
                return this.portCodeToDisplayMap[item.code].displayText;
            }
            
            // 如果找不到映射，但已有代码和区域，使用 [英文名|代码|区域] 格式
            if (item.code && item.region) {
                return `[${item.normalizedName}|${item.code}|${item.region}]`;
            }
            
            // 降级方案：返回原始名称
            return item.originalName;
        });
    }

    /**
     * HTML转义函数
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 创建全局实例
const portSortUtils = new PortSortUtils();

// 导出到全局作用域（供其他工具使用）
if (typeof window !== 'undefined') {
    window.portSortUtils = portSortUtils;
    window.EMBEDDED_PORTS_SORT_MAP = EMBEDDED_PORTS_SORT_MAP;
}
