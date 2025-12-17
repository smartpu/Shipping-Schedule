/**
 * HTML 模板工具函数
 * 用于动态生成重复的 HTML 结构，减少代码冗余
 */

/**
 * 生成"其他影响因素"表格 HTML
 * @param {string} [containerId] - 容器 ID（可选，如果提供则自动插入到该元素）
 * @returns {string} HTML 字符串
 */
function generateBookingDataTable(containerId) {
    const html = `
        <div class="booking-data-table">
            <h4>其他影响因素</h4>
            <table class="booking-table" id="bookingDataTable">
                <thead>
                    <tr>
                        <th>项目</th>
                        <th class="description-header">说明</th>
                    </tr>
                </thead>
                <tbody id="bookingDataBody">
                    <tr>
                        <td><input type="text" value="收货情况" class="booking-remark" readonly style="background: #f8f9fa; cursor: default;"></td>
                        <td class="description-cell">
                            <textarea class="booking-desc" placeholder="当周及未来2周订舱情况；主观判断目前处于旺季或淡季、重点流向表现、装载率预估等"></textarea>
                        </td>
                    </tr>
                    <tr>
                        <td><input type="text" value="码头情况" class="booking-remark" readonly style="background: #f8f9fa; cursor: default;"></td>
                        <td class="description-cell">
                            <textarea class="booking-desc" placeholder="起运港/目的港的拥堵情况、靠泊等待平均时间、天气或其他码头运营影响"></textarea>
                        </td>
                    </tr>
                    <tr>
                        <td><input type="text" value="额外运力" class="booking-remark" readonly style="background: #f8f9fa; cursor: default;"></td>
                        <td class="description-cell">
                            <textarea class="booking-desc" placeholder="具体船公司在某周临时加开/取消/减舱的情况（航线运力分析未覆盖的部分）"></textarea>
                        </td>
                    </tr>
                    <tr>
                        <td><input type="text" value="市场运费" class="booking-remark" readonly style="background: #f8f9fa; cursor: default;"></td>
                        <td class="description-cell">
                            <textarea class="booking-desc" placeholder="填写现行报价，市场上较为激进的高价或低价（如 XX 公司报价表）"></textarea>
                        </td>
                    </tr>
                    <tr>
                        <td><input type="text" value="其他事件" class="booking-remark" readonly style="background: #f8f9fa; cursor: default;"></td>
                        <td class="description-cell">
                            <textarea class="booking-desc" placeholder="如调高关税、出口退税、查验力度、环保政策变化等特殊事件"></textarea>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // 如果提供了容器 ID，自动插入
    if (containerId && typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    }
    
    return html;
}

/**
 * 生成船名航次标准化模态框 HTML
 * @param {string} [containerId] - 容器 ID（可选，如果提供则自动插入到该元素）
 * @returns {string} HTML 字符串
 */
function generateVesselVoyageModal(containerId) {
    const html = `
    <!-- 船名航次标准化选择模态框 -->
    <div id="vesselVoyageModal" class="vessel-voyage-modal hidden">
        <div class="vessel-voyage-modal-content">
            <div class="vessel-voyage-modal-header">
                <h2>🔍 船名航次标准化</h2>
                <p>发现以下船名航次去空格后相同但格式不同，请为每组选择一个标准格式：</p>
            </div>
            <div id="vesselVoyageList" class="vessel-voyage-list"></div>
            <div class="vessel-voyage-modal-footer">
                <button id="applyVesselVoyageReplace" class="btn btn-primary">应用替换并继续</button>
                <button id="skipVesselVoyageReplace" class="btn btn-secondary">跳过（保留原值）</button>
            </div>
        </div>
    </div>
    `;
    
    // 如果提供了容器 ID，自动插入
    if (containerId && typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    }
    
    return html;
}

/**
 * 生成目的港码头标准化模态框 HTML
 * @param {string} [containerId] - 容器 ID（可选，如果提供则自动插入到该元素）
 * @returns {string} HTML 字符串
 */
function generatePodWharfModal(containerId) {
    const html = `
    <!-- 目的港码头标准化选择模态框 -->
    <div id="podWharfModal" class="vessel-voyage-modal hidden">
        <div class="vessel-voyage-modal-content">
            <div class="vessel-voyage-modal-header">
                <h2>🔍 目的港码头标准化</h2>
                <p>发现以下目的港码头去空格后相同但格式不同，请为每组选择一个标准格式：</p>
            </div>
            <div id="podWharfList" class="vessel-voyage-list"></div>
            <div class="vessel-voyage-modal-footer">
                <button id="applyPodWharfReplace" class="btn btn-primary">应用替换并继续</button>
                <button id="skipPodWharfReplace" class="btn btn-secondary">跳过（保留原值）</button>
            </div>
        </div>
    </div>
    `;
    
    // 如果提供了容器 ID，自动插入
    if (containerId && typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    }
    
    return html;
}

/**
 * 生成两个标准化模态框（船名航次 + 目的港码头）
 * @param {string} [containerId] - 容器 ID（可选，如果提供则自动插入到该元素）
 * @returns {string} HTML 字符串
 */
function generateStandardizationModals(containerId) {
    const html = generateVesselVoyageModal() + '\n' + generatePodWharfModal();
    
    // 如果提供了容器 ID，自动插入
    if (containerId && typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    }
    
    return html;
}

/**
 * 生成 AI 配置面板 HTML（包含 3 个 AI 提供商的配置）
 * @param {string} [containerId] - 容器 ID（可选，如果提供则自动插入到该元素）
 * @returns {string} HTML 字符串
 */
function generateAiConfigPanels(containerId) {
    const html = `
            <div class="ai-tabs">
                <div class="ai-tab-buttons">
                    <button class="ai-tab-btn active" data-provider="deepseek">DeepSeek</button>
                    <button class="ai-tab-btn" data-provider="kimi">KIMI (Moonshot)</button>
                    <button class="ai-tab-btn" data-provider="qwen">通义千问 (Qwen)</button>
                </div>
                <span class="ai-tab-hint">可切换不同模型对比观点一致性</span>
            </div>
            <div class="ai-panels">
                <div class="ai-panel active" data-provider="deepseek">
                    <div class="api-config">
                        <h4>DeepSeek API 配置</h4>
                        <div class="api-input-group">
                            <label>API Key:</label>
                            <input type="password" id="apiKeyInput" placeholder="请输入 DeepSeek API Key">
                        </div>
                        <div class="api-input-group">
                            <label>API URL:</label>
                            <input type="text" id="apiUrlInput" placeholder="https://api.deepseek.com/v1/chat/completions" value="https://api.deepseek.com/v1/chat/completions">
                        </div>
                        <div class="api-input-group">
                            <label>模型 ID:</label>
                            <input type="text" id="apiModelInput" placeholder="deepseek-chat" value="deepseek-chat" list="deepseekModelOptions">
                        </div>
                        <button class="api-save-btn" onclick="saveAiConfig('deepseek')">保存配置</button>
                    </div>
                    <button class="ai-analysis-btn" id="aiAnalysisBtn" onclick="runAiAnalysis('deepseek')">使用 DeepSeek 分析</button>
                    <div id="aiLoading" class="ai-loading hidden">正在分析中</div>
                    <div id="aiResult" class="ai-result hidden">
                        <h4>DeepSeek 分析结果</h4>
                        <div class="ai-result-content" id="aiResultContent"></div>
                    </div>
                </div>
                <div class="ai-panel" data-provider="kimi">
                    <div class="api-config">
                        <h4>KIMI (Moonshot) API 配置</h4>
                        <div class="api-input-group">
                            <label>API Key:</label>
                            <input type="password" id="kimiApiKeyInput" placeholder="请输入 KIMI / Moonshot API Key">
                        </div>
                        <div class="api-input-group">
                            <label>API URL:</label>
                            <input type="text" id="kimiApiUrlInput" placeholder="https://api.moonshot.cn/v1/chat/completions" value="https://api.moonshot.cn/v1/chat/completions">
                        </div>
                        <div class="api-input-group">
                            <label>模型 ID:</label>
                            <input type="text" id="kimiModelInput" placeholder="moonshot-v1-32k" value="moonshot-v1-32k" list="kimiModelOptions">
                        </div>
                        <button class="api-save-btn" onclick="saveAiConfig('kimi')">保存配置</button>
                    </div>
                    <button class="ai-analysis-btn secondary" id="kimiAnalysisBtn" onclick="runAiAnalysis('kimi')">使用 KIMI 分析</button>
                    <div id="kimiAiLoading" class="ai-loading hidden">正在分析中</div>
                    <div id="kimiAiResult" class="ai-result hidden">
                        <h4>KIMI 分析结果</h4>
                        <div class="ai-result-content" id="kimiAiResultContent"></div>
                    </div>
                </div>
                <div class="ai-panel" data-provider="qwen">
                    <div class="api-config">
                        <h4>通义千问 (Qwen) API 配置</h4>
                        <div class="api-input-group">
                            <label>API Key:</label>
                            <input type="password" id="qwenApiKeyInput" placeholder="请输入通义千问 API Key">
                        </div>
                        <div class="api-input-group">
                            <label>API URL:</label>
                            <input type="text" id="qwenApiUrlInput" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" value="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions">
                        </div>
                        <div class="api-input-group">
                            <label>模型 ID:</label>
                            <input type="text" id="qwenModelInput" placeholder="qwen-max" value="qwen-max" list="qwenModelOptions">
                        </div>
                        <button class="api-save-btn" onclick="saveAiConfig('qwen')">保存配置</button>
                    </div>
                    <button class="ai-analysis-btn" id="qwenAnalysisBtn" onclick="runAiAnalysis('qwen')" style="background: #ff6b35;">使用通义千问分析</button>
                    <div id="qwenAiLoading" class="ai-loading hidden">正在分析中</div>
                    <div id="qwenAiResult" class="ai-result hidden">
                        <h4>通义千问 分析结果</h4>
                        <div class="ai-result-content" id="qwenAiResultContent"></div>
                    </div>
                </div>
            </div>
            <datalist id="deepseekModelOptions">
                <option value="deepseek-chat">基础对话模型（推荐）</option>
                <option value="deepseek-v3">V3 高性能模型（2024年12月发布）</option>
                <option value="deepseek-reasoner">推理模型（逻辑推理）</option>
                <option value="deepseek-r1">R1 推理模型（2025年1月发布）</option>
                <option value="deepseek-coder">代码模型</option>
            </datalist>
            <datalist id="kimiModelOptions">
                <option value="moonshot-v1-8k">8K 上下文（经济型）</option>
                <option value="moonshot-v1-32k">32K 上下文（推荐）</option>
                <option value="moonshot-v1-128k">128K 上下文（长文档）</option>
                <option value="moonshot-v1-k2">K2 模型（320亿参数，需确认API可用性）</option>
            </datalist>
            <datalist id="qwenModelOptions">
                <option value="qwen-turbo">Turbo 快速模型（经济型）</option>
                <option value="qwen-plus">Plus 平衡模型</option>
                <option value="qwen-max">Max 高性能模型（推荐，最佳性能）</option>
                <option value="qwen-max-longcontext">Max 长上下文模型</option>
            </datalist>
    `;
    
    // 如果提供了容器 ID，自动插入
    if (containerId && typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    }
    
    return html;
}

/**
 * 生成市场数据信息块 HTML（燃油行情、WCI、FBX、SCFI）
 * @param {string} [containerId] - 容器 ID（可选，如果提供则自动插入到该元素）
 * @returns {string} HTML 字符串
 */
function generateMarketDataInfoBlocks(containerId) {
    const html = `
            <div class="bunker-info">
                <div class="bunker-copy">
                    <h4>燃油行情（Ship & Bunker · 新加坡）</h4>
                    <p id="bunkerStatus">尚未抓取燃油报价</p>
                    <small id="bunkerUpdated" class="bunker-meta">最近更新时间：—</small>
                </div>
                <button class="action-btn" id="refreshBunkerBtn">更新燃油价格</button>
            </div>
            <div class="index-info">
                <div>
                    <h4>WCI 主要航线现货价</h4>
                    <p id="wciStatus">尚未抓取 WCI 数据</p>
                    <small id="wciUpdated" class="index-meta">最近更新时间：—</small>
                </div>
                <button class="action-btn" id="refreshWciBtn">更新 WCI</button>
            </div>
            <div class="index-info">
                <div>
                    <h4>FBX 全球航线指数</h4>
                    <p id="fbxStatus">尚未抓取 FBX 数据</p>
                    <small id="fbxUpdated" class="index-meta">最近更新时间：—</small>
                </div>
                <button class="action-btn" id="refreshFbxBtn">更新 FBX</button>
            </div>
            <div class="index-info" id="scfiInfoContainer" style="display: none;">
                <div>
                    <h4>SCFI 运价指数（来自市场报告）</h4>
                    <div id="scfiTableContainer"></div>
                    <small id="scfiSource" class="index-meta">数据来源：—</small>
                </div>
            </div>
    `;
    
    // 如果提供了容器 ID，自动插入
    if (containerId && typeof document !== 'undefined') {
        const container = document.getElementById(containerId);
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
    }
    
    return html;
}

/**
 * 绑定市场数据刷新按钮事件
 * @param {Object} options - 配置选项
 * @param {Function} [options.fetchBunkerData] - 抓取燃油数据的函数
 * @param {Function} [options.fetchWciData] - 抓取 WCI 数据的函数
 * @param {Function} [options.fetchFbxData] - 抓取 FBX 数据的函数
 * @param {HTMLElement} [options.bunkerStatusEl] - 燃油状态元素
 * @param {HTMLElement} [options.bunkerUpdatedEl] - 燃油更新时间元素
 * @param {HTMLElement} [options.wciStatusEl] - WCI 状态元素
 * @param {HTMLElement} [options.fbxStatusEl] - FBX 状态元素
 */
function bindMarketDataRefreshButtons(options = {}) {
    const {
        fetchBunkerData,
        fetchWciData,
        fetchFbxData,
        bunkerStatusEl,
        bunkerUpdatedEl,
        wciStatusEl,
        fbxStatusEl
    } = options;
    
    // 重新获取按钮引用（模板生成后）
    const refreshBunkerBtn = document.getElementById('refreshBunkerBtn');
    const refreshWciBtn = document.getElementById('refreshWciBtn');
    const refreshFbxBtn = document.getElementById('refreshFbxBtn');
    
    // 绑定事件
    if (refreshBunkerBtn && typeof fetchBunkerData === 'function') {
        refreshBunkerBtn.addEventListener('click', () => {
            fetchBunkerData(true).catch(error => {
                if (typeof debugWarn === 'function') {
                    debugWarn('燃油行情抓取失败', error);
                }
                if (bunkerStatusEl) bunkerStatusEl.textContent = '抓取失败，请稍后重试或检查网络';
                if (bunkerUpdatedEl) bunkerUpdatedEl.textContent = '最近更新时间：—';
            });
        });
    }
    
    if (refreshWciBtn && typeof fetchWciData === 'function') {
        refreshWciBtn.addEventListener('click', () => {
            fetchWciData(true).catch(error => {
                if (typeof debugWarn === 'function') {
                    debugWarn('WCI 抓取失败', error);
                }
                if (wciStatusEl) wciStatusEl.textContent = '抓取失败，请稍后重试';
            });
        });
    }
    
    if (refreshFbxBtn && typeof fetchFbxData === 'function') {
        refreshFbxBtn.addEventListener('click', () => {
            fetchFbxData(true).catch(error => {
                if (typeof debugWarn === 'function') {
                    debugWarn('FBX 抓取失败', error);
                }
                if (fbxStatusEl) fbxStatusEl.textContent = '抓取失败，请稍后重试';
            });
        });
    }
}

/**
 * 初始化市场分析页面（模板生成、AI 模块初始化、数据抓取）
 * @param {Object} options - 配置选项
 * @param {Function} [options.updateAiAnalysis] - 更新 AI 分析的函数
 * @param {Function} [options.fetchBunkerData] - 抓取燃油数据的函数
 * @param {Function} [options.fetchWciData] - 抓取 WCI 数据的函数
 * @param {Function} [options.fetchFbxData] - 抓取 FBX 数据的函数
 * @param {HTMLElement} [options.bunkerStatusEl] - 燃油状态元素
 * @param {HTMLElement} [options.bunkerUpdatedEl] - 燃油更新时间元素
 * @param {HTMLElement} [options.wciStatusEl] - WCI 状态元素
 * @param {HTMLElement} [options.fbxStatusEl] - FBX 状态元素
 */
function initMarketAnalysisPage(options = {}) {
    const {
        updateAiAnalysis,
        fetchBunkerData,
        fetchWciData,
        fetchFbxData,
        bunkerStatusEl,
        bunkerUpdatedEl,
        wciStatusEl,
        fbxStatusEl
    } = options;
    
    // 使用公共模板生成"其他影响因素"表格
    if (typeof window.generateBookingDataTable === 'function') {
        const container = document.getElementById('bookingDataTableContainer');
        if (container) {
            container.innerHTML = window.generateBookingDataTable();
        }
    }
    
    // 使用公共模板生成 AI 配置面板
    if (typeof window.generateAiConfigPanels === 'function') {
        const aiContainer = document.getElementById('aiConfigPanelsContainer');
        if (aiContainer) {
            aiContainer.innerHTML = window.generateAiConfigPanels();
        }
    }
    
    // 绑定市场数据刷新按钮事件（模板生成后）
    bindMarketDataRefreshButtons({
        fetchBunkerData,
        fetchWciData,
        fetchFbxData,
        bunkerStatusEl,
        bunkerUpdatedEl,
        wciStatusEl,
        fbxStatusEl
    });
    
    // 页面加载时显示 AI 模块（默认显示）
    if (typeof updateAiAnalysis === 'function') {
        updateAiAnalysis(false);
    }
    
    // 异步抓取市场数据
    if (typeof fetchBunkerData === 'function' || 
        typeof fetchWciData === 'function' || 
        typeof fetchFbxData === 'function') {
        Promise.allSettled([
            fetchBunkerData ? fetchBunkerData(false) : Promise.resolve(),
            fetchWciData ? fetchWciData(false) : Promise.resolve(),
            fetchFbxData ? fetchFbxData(false) : Promise.resolve()
        ]);
    }
}

// 导出函数到全局
if (typeof window !== 'undefined') {
    window.generateBookingDataTable = window.generateBookingDataTable || generateBookingDataTable;
    window.generateVesselVoyageModal = window.generateVesselVoyageModal || generateVesselVoyageModal;
    window.generatePodWharfModal = window.generatePodWharfModal || generatePodWharfModal;
    window.generateStandardizationModals = window.generateStandardizationModals || generateStandardizationModals;
    window.generateAiConfigPanels = window.generateAiConfigPanels || generateAiConfigPanels;
    window.generateMarketDataInfoBlocks = window.generateMarketDataInfoBlocks || generateMarketDataInfoBlocks;
    window.bindMarketDataRefreshButtons = window.bindMarketDataRefreshButtons || bindMarketDataRefreshButtons;
    window.initMarketAnalysisPage = window.initMarketAnalysisPage || initMarketAnalysisPage;
}
