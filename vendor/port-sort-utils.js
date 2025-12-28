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
// 共 443 个港口（2025-12-28 更新）
const EMBEDDED_PORTS_SORT_MAP = {
    "USLAX":0,"USLGB":1,"USOAK":2,"USPAE":3,"USPDX":4,"USSEA":5,"USTIW":6,"USBAL":7,"USBOS":8,"USCHS":9,
    "USHOU":11,"USJAX":12,"USMIA":13,"USMOB":14,"USMSY":15,"USNYC":16,"USORF":17,"USSAV":18,"USTPA":19,"USPHL":20,
    "USPEF":21,"USILM":22,"CAHAL":23,"CAPRR":24,"CAVAN":25,"USDUT":26,"USHNL":27,"MXESE":28,"MXLZC":29,"MXZLO":30,
    "CLARI":31,"CLCNL":32,"CLIQQ":33,"CLLQN":34,"CLPAG":35,"CLSAI":36,"CLSVE":37,"CLVAP":38,"COBUN":39,"COCTG":40,
    "ECGYE":41,"PECHY":42,"PECLL":43,"ECPSJ":44,"ARBUE":45,"BRIOA":46,"BRITJ":47,"BRNVT":48,"BRPEC":49,"BRPNG":50,
    "BRRIG":51,"BRRIO":52,"BRSSA":53,"BRSSZ":54,"BRSUA":55,"BRVIX":56,"UYMVD":57,"BRIGI":58,"BRIBB":59,"BSFPO":60,
    "DOCAU":61,"GTPRQ":62,"JMKIN":63,"PABLB":64,"PACTB":65,"PAMIT":66,"PAONX":67,"BEANR":68,"BEZEE":69,"DEBRV":70,
    "DEHAM":71,"FRLEH":72,"GBFXT":73,"GBSOU":74,"NLRTM":75,"DEWVN":76,"DKAAR":77,"FRDKK":78,"GBLGP":79,"LTKLJ":80,
    "PLGDN":81,"PLGDY":82,"PTSIE":83,"RULED":84,"RUNVS":85,"SEGOT":86,"ESAGP":87,"ESALG":88,"ESBCN":89,"ESVLC":90,
    "FRFOS":91,"ITGIT":92,"ITGOA":93,"ITSPE":94,"ITVDL":95,"MTMAR":96,"EGALY":97,"EGDAM":98,"EGEDK":99,"EGPSD":100,
    "GRPIR":101,"HRRJK":102,"ILASH":103,"ILHFA":104,"ITTRS":105,"LBBEY":106,"SIKOP":107,"TRDRC":108,"TRMER":109,"TRALI":110,
    "TRTEK":111,"TRYAR":112,"TRISK":113,"EGAKI":114,"TRGEM":115,"TRIST":116,"ROCND":117,"UAODS":118,"TRGEB":119,"TREYP":120,
    "DZALG":121,"LYMRA":122,"MATNG":123,"MACAS":124,"AEAUH":125,"AEJEA":126,"AEKLF":127,"BHBAH":128,"IQUQR":129,"IRBND":130,
    "IRZBR":131,"LBKYE":132,"OMDQM":133,"OMSLL":134,"OMSOH":135,"QAHMD":136,"SADMM":137,"SAJUB":138,"DJJIB":139,"EGSOK":140,
    "JOAQJ":141,"SAJEC":142,"SAJED":143,"YEADE":144,"SAKAC":145,"BDCGP":146,"BDMGL":147,"INCCU":148,"INCOK":149,"INENR":150,
    "INGGV":151,"INHAL":152,"INHZR":153,"INKAT":154,"INMAA":155,"INMUN":156,"INNML":157,"INNSA":158,"INPAV":159,"INTUT":160,
    "INVTZ":161,"INVZJ":162,"LKCMB":163,"LKHBA":164,"PKBQM":165,"PKKHI":166,"AUADL":167,"AUBNE":168,"AUDAM":169,"AUDRW":170,
    "AUFRE":171,"AUGLT":172,"AUMEL":173,"AUNTL":174,"AUPHE":175,"AUPKL":176,"AUSYD":177,"AUTSV":178,"CXXCH":179,"NZAKL":180,
    "NZBLU":181,"NZLYT":182,"NZMAP":183,"NZNPE":184,"NZNSN":185,"NZPOE":186,"NZTIU":187,"NZTRG":188,"NZWLG":189,"ASPPG":190,
    "FJLTK":191,"FJSUV":192,"FMKSA":193,"FMPNI":194,"FMTKK":195,"KITRW":196,"MHMAJ":197,"MHQEE":198,"NCBDB":199,"NCNOU":200,
    "PFPPT":201,"PGBAS":202,"PGKIM":203,"PGLAE":204,"PGLNV":205,"PGMAG":206,"PGPOM":207,"PGRAB":208,"SBHIR":209,"SBNOR":210,
    "TLDIL":211,"TOTBU":212,"VUSAN":213,"VUVLI":214,"WSAPW":215,"NCVAV":216,"FMYAP":217,"GUAPR":218,"MPSPN":219,"PWROR":220,
    "KELAU":221,"KEMBA":222,"MGTMM":223,"MUPLU":224,"MZBEW":225,"MZMNC":226,"MZMPM":227,"REREU":228,"TZDAR":229,"TZMYW":230,
    "SOBBO":231,"ZACPT":232,"ZADUR":233,"ZAZBA":234,"AOLAD":235,"AOLOB":236,"BJCOO":237,"CGPNR":238,"CIABJ":239,"CMKBI":240,
    "GHTEM":241,"NAWVB":242,"NGLKK":243,"NGLOS":244,"NGONN":245,"TGLFW":246,"SGSIN":247,"MYBKI":248,"MYBTU":249,"MYKCH":250,
    "MYKUA":251,"MYLBU":252,"MYMKZ":253,"MYMYY":254,"MYPEN":255,"MYPGU":256,"MYPKG":257,"MYSBW":258,"MYSDK":259,"MYTPP":260,
    "MYTWU":261,"BNMUA":262,"MMRGN":263,"THBKK":264,"THLCH":265,"THSGZ":266,"THSRI":267,"VNC8Q":268,"VNCUA":269,"VNDAD":270,
    "VNDNA":271,"VNHPH":272,"VNNGH":273,"VNSGN":274,"VNTOT":275,"VNUIH":276,"VNCLN":277,"KHKOS":278,"IDBEN":279,"IDBLW":280,
    "IDBTM":281,"IDDUM":282,"IDFTG":283,"IDJKT":284,"IDKOE":285,"IDKTJ":286,"IDLAM":287,"IDMAK":288,"IDPLM":289,"IDPNJ":290,
    "IDPNK":291,"IDSRG":292,"IDSUB":293,"PHBCD":294,"PHBTG":295,"PHCEB":296,"PHCGY":298,"PHCSI":299,"PHCTB":300,"PHDVO":302,
    "PHGES":303,"PHIGN":304,"PHMNL":305,"PHPPS":306,"PHSFS":307,"PHTAG":308,"PHZAM":309,"HKHKG":310,"TWKEL":311,"TWKHH":312,
    "TWTPE":313,"TWTXG":314,"CNBYQ":315,"CNCGS":316,"CNCWN":317,"CNDCB":318,"CNDDG":319,"CNDFG":320,"CNDGG":321,"CNDJA":322,
    "CNDLC":323,"CNFOC":324,"CNGAO":325,"CNGZG":326,"CNHUH":327,"CNJIA":328,"CNLYG":329,"CNNGB":330,"CNNJG":331,"CNNSA":332,
    "CNNTG":333,"CNPTJ":334,"CNQID":335,"CNQZH":336,"CNQZL":337,"CNRZH":338,"CNSHA":339,"CNSHD":340,"CNSHK":342,"CNSHP":343,
    "CNSTG":344,"CNTAC":345,"CNTAO":346,"CNTGS":347,"CNTXG":348,"CNWEF":349,"CNWEI":350,"CNWHG":351,"CNWHI":352,"CNWNZ":353,
    "CNXMN":354,"CNYIK":355,"CNYPG":356,"CNYTG":357,"CNYTN":358,"CNZJG":359,"CNZNG":360,"CNZUH":361,"KRBNP":362,"KRCHA":363,
    "KRINC":364,"KRKPO":365,"KRKUV":366,"KRKWA":367,"KRMAS":368,"KRMOK":369,"KRPTK":370,"KRPUS":371,"KRTSN":372,"KRUSN":373,
    "JPCHB":374,"JPHIC":375,"JPKSM":376,"JPKWS":377,"JPNGO":378,"JPSMZ":379,"JPTYO":381,"JPYOK":382,"JPMAI":383,"JPOSA":384,
    "JPSSK":385,"JPUKB":386,"JPWAK":387,"JPYKK":388,"JPFKY":389,"JPHIJ":391,"JPMIZ":392,"JPTAK":393,"JPTKS":394,"JPTKY":395,
    "JPHSM":396,"JPHTD":397,"JPIMI":398,"JPKMJ":399,"JPKOJ":400,"JPMOJ":401,"JPNGS":402,"JPOIT":403,"JPSBS":404,"JPSDI":405,
    "JPTBT":406,"JPYAT":407,"JPAXT":408,"JPHHE":409,"JPIWK":410,"JPKIJ":411,"JPKIS":412,"JPKNZ":413,"JPMYK":414,"JPNAN":415,
    "JPNAO":416,"JPOMZ":417,"JPONA":418,"JPSDJ":419,"JPSHS":420,"JPSKT":421,"JPSMN":422,"JPTHS":423,"JPTOY":424,"JPTRG":425,
    "JPUBJ":426,"JPIMB":427,"JPIYM":428,"JPKCZ":429,"JPKOM":430,"JPMYJ":431,"JPKUH":432,"JPMUR":433,"JPOTR":434,"JPSPK":435,
    "JPTMK":436,"JPISG":437,"JPNAH":438,"JPOKA":439,"RUDYR":440,"RUEGV":441,"RUGDX":442,"RUKOR":443,"RUNJK":444,"RUPKC":445,
    "RUVNN":446,"RUVVO":447,"RUVYP":448
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
        
        // 区域最大索引映射（基于Material-parsed_ports_list.txt文件中的实际数据）
        this.regionLastIndices = {
            '美西': 6, '美东': 19, '加拿大': 22, '墨西哥': 27, '南美西': 40, '南美东': 53,
            '中美洲': 61, '欧基港': 69, '欧洲偏港': 80, '地西': 90, '地东': 106, '黑海': 108,
            '中东': 125, '红海': 131, '印巴': 152, '澳大利亚': 165, '新西兰': 175,
            '南太平洋': 201, '西太平洋': 205, '东非': 215, '南非': 218, '西非': 230,
            '新马越泰': 261, '印尼菲律宾': 292, '中国香港': 293, '中国台湾': 297,
            '中国': 344, '韩国': 356, '关东': 365, '关西': 371, '关西/濑户内海': 378,
            '九州': 390, '本州': 409, '四国岛': 414, '北海道': 419, '冲绳': 422, '远东': 431
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
            const response = await fetch('data/Material-parsed_ports_list.txt');
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
            const response = await fetch('data/Material-parsed_ports_list.txt');
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
        
        // 如果找不到，尝试通过 PORT_NAME_MAPPING 查找标准化中文名称，再查找代码
        if (typeof window !== 'undefined' && typeof window.PORT_NAME_MAPPING !== 'undefined') {
            const portMapping = window.PORT_NAME_MAPPING;
            const mappedCN = portMapping[normalized] || portMapping[upper];
            if (mappedCN && this.portNameToCodeMap[mappedCN]) {
                return this.portNameToCodeMap[mappedCN];
            }
        }
        
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
