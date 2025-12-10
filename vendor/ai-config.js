/**
 * AI API 统一配置
 * 
 * 由于工具已有限制访问机制，可以直接在此配置 API KEY
 * 访客无需手动输入即可使用 AI 分析功能
 * 
 * 配置说明：
 * - 如果某个提供商的 apiKey 为空字符串，则从 localStorage 读取（向后兼容）
 * - 如果配置了 apiKey，则优先使用配置文件中的值
 * - URL 和 Model 的配置逻辑相同
 */

const AI_CONFIG = {
  deepseek: {
    apiKey: 'sk-77789d84466340ad912190f65c38c7a8', // 在此填入 DeepSeek API Key，留空则从 localStorage 读取
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  },
  kimi: {
    apiKey: 'sk-Xd6kb43VMGB1VxM1UQ6fhIKEPPR8kSOmpfBl8HPQkOZ7puOQ', // 在此填入 KIMI/Moonshot API Key，留空则从 localStorage 读取
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-32k'
  },
  qwen: {
    apiKey: 'sk-37669b2f75af4ce4ba6e009ae0f6ce42', // 在此填入通义千问 API Key，留空则从 localStorage 读取
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max'
  }
};

