/**
 * AI 分析工具统一管理模块
 * 用于 Market-Sailing-Schedule、001-04-market-analysis、365-04-market-watch 等工具
 * 
 * 提供统一的 AI 配置管理、API 调用、面板切换等功能
 */

/**
 * 默认 AI 提供商配置
 * @type {Object<string, Object>}
 */
const DEFAULT_AI_PROVIDERS = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    keyInputId: 'apiKeyInput',
    urlInputId: 'apiUrlInput',
    modelInputId: 'apiModelInput',
    buttonId: 'aiAnalysisBtn',
    loadingId: 'aiLoading',
    resultContainerId: 'aiResult',
    resultContentId: 'aiResultContent',
    defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    storagePrefix: 'deepseek', // 默认前缀，可通过 createAiProviders 自定义
    temperature: 0.7,
    maxTokens: 8000
  },
  kimi: {
    id: 'kimi',
    name: 'KIMI (Moonshot)',
    keyInputId: 'kimiApiKeyInput',
    urlInputId: 'kimiApiUrlInput',
    modelInputId: 'kimiModelInput',
    buttonId: 'kimiAnalysisBtn',
    loadingId: 'kimiAiLoading',
    resultContainerId: 'kimiAiResult',
    resultContentId: 'kimiAiResultContent',
    defaultUrl: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-32k',
    storagePrefix: 'kimi',
    temperature: 0.7,
    maxTokens: 8000
  },
  qwen: {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    keyInputId: 'qwenApiKeyInput',
    urlInputId: 'qwenApiUrlInput',
    modelInputId: 'qwenModelInput',
    buttonId: 'qwenAnalysisBtn',
    loadingId: 'qwenAiLoading',
    resultContainerId: 'qwenAiResult',
    resultContentId: 'qwenAiResultContent',
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-max',
    storagePrefix: 'qwen',
    temperature: 0.7,
    maxTokens: 8000
  }
};

/**
 * 创建 AI 提供商配置（支持自定义 storagePrefix）
 * @param {string} [storagePrefix=''] - 存储前缀（如 'sailing_' 或 ''）
 * @param {Object} [overrides={}] - 覆盖默认配置
 * @returns {Object<string, Object>} AI 提供商配置对象
 */
function createAiProviders(storagePrefix = '', overrides = {}) {
  const providers = {};
  
  Object.keys(DEFAULT_AI_PROVIDERS).forEach(key => {
    const defaultProvider = DEFAULT_AI_PROVIDERS[key];
    const customPrefix = storagePrefix ? `${storagePrefix}_${defaultProvider.storagePrefix}` : defaultProvider.storagePrefix;
    const override = overrides[key] || {};
    
    providers[key] = {
      ...defaultProvider,
      storagePrefix: customPrefix,
      ...override
    };
  });
  
  return providers;
}

/**
 * 加载 AI 配置到输入框
 * 优先从全局 AI_CONFIG 读取，如果没有则从 localStorage 读取
 * @param {Object<string, Object>} aiProviders - AI 提供商配置对象
 */
function loadAiConfigsFromStorage(aiProviders) {
  Object.values(aiProviders).forEach(provider => {
    const keyInput = document.getElementById(provider.keyInputId);
    const urlInput = document.getElementById(provider.urlInputId);
    const modelInput = document.getElementById(provider.modelInputId);
    
    // 优先级：localStorage（用户之前保存的值）> AI_CONFIG（配置文件默认值）
    // 注意：运行时 getAiConfigFromInputs 会直接读取输入框的值，确保用户当前输入优先
    
    // 首先从 localStorage 读取（用户之前保存的值）
    let savedKey = localStorage.getItem(`${provider.storagePrefix}_api_key`) || '';
    let savedUrl = localStorage.getItem(`${provider.storagePrefix}_api_url`) || provider.defaultUrl;
    let savedModel = localStorage.getItem(`${provider.storagePrefix}_model`) || provider.defaultModel;
    
    // 如果 localStorage 为空，且存在全局 AI_CONFIG，则使用配置文件的值（作为默认值）
    if (!savedKey && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id]) {
      const config = AI_CONFIG[provider.id];
      if (config.apiKey && config.apiKey.trim() !== '') {
        savedKey = config.apiKey;
      }
    }
    if (!savedUrl && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id]) {
      const config = AI_CONFIG[provider.id];
      if (config.apiUrl && config.apiUrl.trim() !== '') {
        savedUrl = config.apiUrl;
      } else {
        savedUrl = provider.defaultUrl;
      }
    }
    if (!savedModel && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id]) {
      const config = AI_CONFIG[provider.id];
      if (config.model && config.model.trim() !== '') {
        savedModel = config.model;
      } else {
        savedModel = provider.defaultModel;
      }
    }
    
    if (keyInput) keyInput.value = savedKey;
    if (urlInput) urlInput.value = savedUrl;
    if (modelInput) modelInput.value = savedModel;
  });
}

/**
 * 获取 AI 配置
 * @param {string} providerId - 提供商 ID
 * @param {Object<string, Object>} aiProviders - AI 提供商配置对象
 * @returns {Object|null} 配置对象，如果无效则返回 null
 */
function getAiConfigFromInputs(providerId, aiProviders) {
  const provider = aiProviders[providerId];
  if (!provider) return null;
  const keyInput = document.getElementById(provider.keyInputId);
  const urlInput = document.getElementById(provider.urlInputId);
  const modelInput = document.getElementById(provider.modelInputId);
  
  // 优先从输入框读取
  let apiKey = keyInput ? keyInput.value.trim() : '';
  let apiUrl = urlInput ? urlInput.value.trim() : '';
  let model = modelInput ? modelInput.value.trim() : '';
  
  // 如果输入框为空，尝试从 AI_CONFIG 读取（服务器配置）
  if (!apiKey && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id]) {
    const config = AI_CONFIG[provider.id];
    if (config.apiKey && config.apiKey.trim() !== '') {
      apiKey = config.apiKey;
    }
  }
  if (!apiUrl && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id]) {
    const config = AI_CONFIG[provider.id];
    if (config.apiUrl && config.apiUrl.trim() !== '') {
      apiUrl = config.apiUrl;
    }
  }
  if (!model && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id]) {
    const config = AI_CONFIG[provider.id];
    if (config.model && config.model.trim() !== '') {
      model = config.model;
    }
  }
  
  return {
    apiKey: apiKey || '',
    apiUrl: apiUrl || provider.defaultUrl,
    model: model || provider.defaultModel
  };
}

/**
 * 保存 AI 配置
 * @param {string} providerId - 提供商 ID
 * @param {Object<string, Object>} aiProviders - AI 提供商配置对象
 * @param {Function} [onSuccess] - 成功回调函数（可选，用于自定义成功提示）
 */
function saveAiConfigToStorage(providerId, aiProviders, onSuccess) {
  const provider = aiProviders[providerId];
  if (!provider) return;
  const config = getAiConfigFromInputs(providerId, aiProviders);
  if (!config) return;
  localStorage.setItem(`${provider.storagePrefix}_api_key`, config.apiKey);
  localStorage.setItem(`${provider.storagePrefix}_api_url`, config.apiUrl);
  localStorage.setItem(`${provider.storagePrefix}_model`, config.model);
  
  if (onSuccess) {
    onSuccess(provider.name);
  } else {
    alert(`${provider.name} API 配置已保存`);
  }
}

/**
 * 设置活动的 AI 面板
 * @param {string} providerId - 提供商 ID
 * @param {Object<string, Object>} aiProviders - AI 提供商配置对象
 * @returns {string} 当前活动的提供商 ID
 */
function setActiveAiPanel(providerId, aiProviders) {
  if (!aiProviders[providerId]) return null;
  
  const aiTabButtons = document.querySelectorAll('.ai-tab-btn');
  const aiPanels = document.querySelectorAll('.ai-panel');
  
  aiTabButtons.forEach(btn => {
    if (btn.dataset.provider === providerId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  aiPanels.forEach(panel => {
    if (panel.dataset.provider === providerId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
  
  return providerId;
}

/**
 * 初始化 AI 模块（设置标签页切换事件）
 * @param {Object<string, Object>} aiProviders - AI 提供商配置对象
 * @param {Function} [eventListenerManager] - 事件监听器管理器（可选，用于统一管理事件）
 * @returns {Function} 返回 setActiveAiPanel 的绑定函数
 */
function initAiModule(aiProviders, eventListenerManager = null) {
  const aiTabButtons = document.querySelectorAll('.ai-tab-btn');
  
  // 内部实现 setActiveAiPanel 逻辑，避免依赖全局函数
  const internalSetActiveAiPanel = (providerId) => {
    if (!aiProviders[providerId]) return null;
    
    const aiPanels = document.querySelectorAll('.ai-panel');
    
    aiTabButtons.forEach(btn => {
      if (btn.dataset.provider === providerId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    aiPanels.forEach(panel => {
      if (panel.dataset.provider === providerId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    return providerId;
  };
  
  const handleTabClick = (btn) => {
    const providerId = btn.dataset.provider;
    internalSetActiveAiPanel(providerId);
  };
  
  aiTabButtons.forEach(btn => {
    if (eventListenerManager && typeof eventListenerManager.add === 'function') {
      eventListenerManager.add(btn, 'click', () => handleTabClick(btn));
    } else {
      btn.addEventListener('click', () => handleTabClick(btn));
    }
  });
  
  // 返回绑定函数，方便外部调用
  return internalSetActiveAiPanel;
}

/**
 * 显示临时API Key使用提示对话框
 * @param {string} providerName - 提供商名称
 * @returns {Promise<boolean>} 用户是否确认继续
 */
async function showTempApiKeyWarning(providerName) {
  return new Promise((resolve) => {
    const message = `您当前使用的是临时 API Key（服务器配置）。\n\n强烈建议您自行申请自己的 API Key，以获得更好的使用体验和更高的调用额度。\n\n是否继续使用临时 API Key 进行分析？`;
    const confirmed = confirm(message);
    resolve(confirmed);
  });
}

/**
 * 运行 AI 分析
 * @param {string} providerId - 提供商 ID
 * @param {Object<string, Object>} aiProviders - AI 提供商配置对象
 * @param {Function} buildPrompt - 构建提示词的函数，返回 Promise<string> 或 string
 * @param {string} systemPrompt - 系统提示词
 * @param {Object} [options={}] - 选项
 * @param {Function} [options.onError] - 错误处理函数（可选，用于自定义错误提示）
 * @param {Function} [options.beforeAnalysis] - 分析前的异步操作（可选，如获取数据）
 * @returns {Promise<void>}
 */
async function executeAiAnalysis(providerId, aiProviders, buildPrompt, systemPrompt, options = {}) {
  const {
    onError = (message) => alert(message),
    beforeAnalysis = null
  } = options;
  
  const provider = aiProviders[providerId] || aiProviders.deepseek;
  if (!provider) return;
  
  const config = getAiConfigFromInputs(providerId, aiProviders);
  
  // 检查是否使用了临时API Key（从AI_CONFIG读取）
  const keyInput = document.getElementById(provider.keyInputId);
  const inputKey = keyInput ? keyInput.value.trim() : '';
  const isUsingTempKey = !inputKey && config.apiKey && typeof AI_CONFIG !== 'undefined' && AI_CONFIG[provider.id] && AI_CONFIG[provider.id].apiKey === config.apiKey;
  
  if (!config || !config.apiKey) {
    onError(`请先配置 ${provider?.name || 'AI'} 的 API Key`);
    return;
  }
  
  // 如果使用临时API Key，显示提示对话框
  if (isUsingTempKey) {
    const confirmed = await showTempApiKeyWarning(provider.name);
    if (!confirmed) {
      return;
    }
  }
  
  // 执行分析前的操作（如获取数据）
  if (beforeAnalysis && typeof beforeAnalysis === 'function') {
    await beforeAnalysis();
  }
  
  // 构建提示词
  const prompt = typeof buildPrompt === 'function' 
    ? await buildPrompt() 
    : buildPrompt;
  
  if (!prompt) {
    return;
  }

  const button = document.getElementById(provider.buttonId);
  const loading = document.getElementById(provider.loadingId);
  const resultContainer = document.getElementById(provider.resultContainerId);
  const resultContent = document.getElementById(provider.resultContentId);

  if (button) button.disabled = true;
  if (loading) loading.classList.remove('hidden');
  if (resultContainer) resultContainer.classList.add('hidden');

  try {
    const response = await fetch((config.apiUrl || provider.defaultUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || provider.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: provider.temperature,
        max_tokens: provider.maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || '分析结果为空';
    if (resultContent) {
      resultContent.textContent = analysisText;
    }
    if (resultContainer) {
      resultContainer.classList.remove('hidden');
    }
  } catch (error) {
    debugError('AI分析失败:', error);
    if (resultContent) {
      resultContent.textContent = `分析失败：${error.message}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. API URL / 模型是否正确`;
    }
    if (resultContainer) {
      resultContainer.classList.remove('hidden');
    }
    if (onError) {
      onError(`AI分析失败：${error.message}`);
    }
  } finally {
    if (button) button.disabled = false;
    if (loading) loading.classList.add('hidden');
  }
}

// 导出函数到全局
if (typeof window !== 'undefined') {
  window.createAiProviders = window.createAiProviders || createAiProviders;
  window.initAiModule = window.initAiModule || initAiModule;
  window.executeAiAnalysis = window.executeAiAnalysis || executeAiAnalysis;
  window.loadAiConfigsFromStorage = window.loadAiConfigsFromStorage || loadAiConfigsFromStorage;
  window.getAiConfigFromInputs = window.getAiConfigFromInputs || getAiConfigFromInputs;
  window.saveAiConfigToStorage = window.saveAiConfigToStorage || saveAiConfigToStorage;
}

