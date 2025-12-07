/**
 * AI API 统一配置模板
 * 
 * 使用方法：
 * 1. 复制此文件为 ai-config.js
 * 2. 填入你的 API Key
 * 
 * 配置说明：
 * - 如果某个提供商的 apiKey 为空字符串，则从 localStorage 读取（向后兼容）
 * - 如果配置了 apiKey，则优先使用配置文件中的值
 * - URL 和 Model 的配置逻辑相同
 */

const AI_CONFIG = {
  deepseek: {
    apiKey: '', // 在此填入 DeepSeek API Key，留空则从 localStorage 读取
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  },
  kimi: {
    apiKey: '', // 在此填入 KIMI/Moonshot API Key，留空则从 localStorage 读取
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-32k'
  },
  qwen: {
    apiKey: '', // 在此填入通义千问 API Key，留空则从 localStorage 读取
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-max'
  }
};

