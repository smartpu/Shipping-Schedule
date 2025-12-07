# Shipping Schedule Tools · 航运工具集

一套完整的航运船期分析工具集，支持 Excel 数据解析、市场分析、AI 趋势预测等功能。

## 📋 项目简介

本项目提供了一系列专业的航运船期分析工具，包括：

- **市场分析工具** (`001-04-market-analysis.html`) - 航线运力分析与 AI 趋势预测
- **市场观察工具** (`365-04-market-watch.html`) - 运费走势图与运力分析
- **船期监控工具** (`Monitor-Sailing-Schedule.html`) - 船期表分析与 AI 分析
- **其他工具** - 船期解析、数据下载等

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:smartpu/Shipping-Schedule.git
cd Shipping-Schedule
```

### 2. 配置 AI API Key（可选）

项目支持使用 AI 分析功能，需要配置 API Key：

1. 复制模板文件：
   ```bash
   cp vendor/ai-config.example.js vendor/ai-config.js
   ```

2. 编辑 `vendor/ai-config.js`，填入你的 API Key：
   ```javascript
   const AI_CONFIG = {
     deepseek: {
       apiKey: 'your-deepseek-api-key',
       // ...
     },
     kimi: {
       apiKey: 'your-kimi-api-key',
       // ...
     },
     qwen: {
       apiKey: 'your-qwen-api-key',
       // ...
     }
   };
   ```

3. **重要**：`ai-config.js` 已在 `.gitignore` 中，不会被提交到 Git

### 3. 使用工具

直接在浏览器中打开 `index.html` 即可使用所有工具。

## 📁 项目结构

```
Shipping-Schedule/
├── index.html                          # 首页
├── 001-04-market-analysis.html        # 市场分析工具
├── 365-04-market-watch.html           # 市场观察工具
├── Monitor-Sailing-Schedule.html       # 船期监控工具
├── vendor/                             # 共享工具函数
│   ├── ai-utils.js                    # AI 工具统一管理
│   ├── ai-config.example.js           # AI 配置模板
│   ├── ai-prompts.js                  # AI 提示词
│   ├── market-analysis-utils.js       # 市场分析工具函数
│   ├── error-handler.js              # 错误处理
│   ├── debug-utils.js                # 调试工具
│   └── ...
├── api/                                # 服务器端 API
│   └── gist-storage.js                # Gist 存储服务
├── tests/                              # 测试文件
└── README.md                           # 本文件
```

## 🔧 功能特性

### 核心功能

- ✅ Excel 文件解析（支持 .xlsx, .xls）
- ✅ 船期数据分析和可视化
- ✅ 市场运价趋势分析
- ✅ AI 趋势预测（支持 DeepSeek、KIMI、通义千问）
- ✅ PDF 导出功能
- ✅ 多维度数据筛选

### AI 分析功能

- 支持三个 AI 模型：DeepSeek、KIMI (Moonshot)、通义千问
- 统一的 API 配置管理
- 临时 API Key 提示机制
- 8000 tokens 输出长度

## 📚 文档

每个工具都有详细的 README 文档：

- [市场分析工具说明](001-04-market-analysis-README.html)
- [市场观察工具说明](365-04-market-watch-README.html)
- [船期监控工具说明](Monitor-Sailing-Schedule-README.html)

## 🔐 安全说明

### API Key 管理

- `vendor/ai-config.js` 包含 API Key，**不会**被提交到 Git
- 使用 `vendor/ai-config.example.js` 作为模板
- 项目已有访问控制机制（GitHub Gist 白名单）

### 敏感文件

以下文件/目录已在 `.gitignore` 中：

- `vendor/ai-config.js` - API Key 配置文件
- `Data/` - 数据文件目录
- `001-view-source/`, `365-view-source/`, `365-view-full/` - 下载的网页文件
- `python/` - Python 脚本目录

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **图表**: Chart.js
- **Excel 解析**: XLSX.js
- **PDF 处理**: PDF.js, html2canvas, jsPDF
- **部署**: Vercel (Serverless Functions)

## 📊 代码质量

项目代码质量优秀，已通过完整代码审查：

- ⭐⭐⭐⭐⭐ 代码组织
- ⭐⭐⭐⭐⭐ 代码风格
- ⭐⭐⭐⭐⭐ 错误处理
- ⭐⭐⭐⭐⭐ 调试工具
- ⭐⭐⭐⭐ 安全性
- ⭐⭐⭐⭐ 性能
- ⭐⭐⭐⭐⭐ 可维护性

## 🧪 测试

项目包含测试框架和测试文件，位于 `tests/` 目录。

运行测试：
1. 打开 `tests/index.html`
2. 点击"运行所有测试"按钮

## 📝 更新日志

### 最新版本

- ✅ 统一调试代码使用 `debugLog/debugWarn/debugError`
- ✅ 统一 maxTokens 配置为 8000
- ✅ 更新 README 文档，完善 API Key 使用说明
- ✅ 实现跨年周别合并逻辑（AI 提示词）
- ✅ 添加 `ai-config.example.js` 模板文件
- ✅ 更新 `.gitignore` 排除敏感配置文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📄 许可证

本项目仅供内部使用。

## 🔗 相关链接

- GitHub: https://github.com/smartpu/Shipping-Schedule
- 部署地址: （如果已部署）

---

**最后更新**: 2025-12-07

