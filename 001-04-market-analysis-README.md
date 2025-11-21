# Market Analysis · 市场分析 使用说明

## 工具简介

**Market Analysis · 市场分析** 是一款面向港口维度的航线运力与 AI 分析工具。通过一份包含 `schedule` 工作表的 Excel、可选的市场周报 PDF 以及 DeepSeek / KIMI / 通义千问 API Key，即可完成港口运力洞察、供需趋势可视化与 AI 决策建议输出。工具聚焦以下两大模块：

1. **Module 01 · 航线运力分析 (SAILING SCHEDULE PULSE)**
2. **Module 02 · AI 趋势分析 (AI TREND ANALYSIS)**

---

## 快速开始

### 前置准备

1. **Excel 数据**：`schedule` 工作表，列格式详见“数据格式说明”
2. **市场周报（可选）**：如 Alphaliner Newsletter、Linerlytica Weekly 等 PDF
3. **AI API 密钥（可选）**：DeepSeek / KIMI (Moonshot) / 通义千问 (Qwen)

### 基本流程

1. 打开 `001-04-market-analysis.html`
2. 顶部上传区：
   - 点击“选择Excel文件”，上传包含 `schedule` 工作表的 Excel
   - 点击“上传市场周报 (PDF)”（可选，可多选）
3. 当 Excel 解析成功后，港口筛选、表格、图表和 AI 模块自动显示
4. 根据需求完成筛选、AI 分析，必要时点击“导出整页 PDF”

---

## 核心功能模块

### Module 01 · 航线运力分析 (SAILING SCHEDULE PULSE)

**定位**：港口多选筛选 + 航线搜索 + 五周运力/派船趋势

#### 主要功能

- **港口多选筛选**：仅需勾选一个或多个港口即可联动表格与趋势图
- **航线搜索**：在“共舱船公司”表头输入关键词即可实时过滤
- **视图模式**：`全部 / 运力 / 派船` 三种显示模式，快速聚焦指标
- **周别统计**：自动提取“当前周 + 未来四周”，表头显示 YYYY/WW + 日期范围
- **趋势图**：堆积柱（运力） + 折线（派船），带双 Y 轴便于对比
- **明细提示**：悬停表格单元格查看船名/航次、TEU、开船日期
- **汇总行**：自动累计所选港口下的每周运力与派船数，便于总结

#### 使用建议

1. 选择港口 → 选填航线搜索 → 切换视图
2. 若港口数据较多，可分批勾选以获得更清晰的趋势图
3. Tooltip 会列出详细船期，方便核对船名/运力信息

---

### Module 02 · AI 趋势分析 (AI TREND ANALYSIS)

**定位**：DeepSeek × KIMI × 通义千问 三模型交叉验证，输出涨/维/降建议和九大项分析

#### 主要能力

- **其他影响因素输入**：收货情况、码头情况、额外运力、市场运费、其他事件
- **外部数据抓取**：
  - Ship & Bunker：VLSFO / MGO / IFO380（含 WoW）
  - CCFI：综合 + 12 条航线指数（含 WoW）
  - WCI：全球综合 + 8 条航线现货价（含 WoW）
  - FBX：FBX 综合 + 13 条航线指数（含 WoW）
- **AI 分析输出**：本周结论、需求/供给/突发/内部策略/指数解读、风险提示、下周展望等九大板块
- **三模型配置**：
  - **DeepSeek**：`deepseek-chat`（默认）及 `deepseek-v3`、`deepseek-reasoner`、`deepseek-r1`、`deepseek-coder` 等模型
  - **KIMI (Moonshot)**：`moonshot-v1-32k`（默认）及 `moonshot-v1-8k`、`moonshot-v1-128k`、`moonshot-v1-k2` 等模型
  - **通义千问 (Qwen)**：`qwen-max`（默认，推荐）及 `qwen-turbo`、`qwen-plus`、`qwen-max-longcontext` 等模型
  - API Key、URL、模型选择都会保存在浏览器 `localStorage`

#### 触发条件

1. 至少选择一个港口并加载出运力数据
2. 已配置有效 API Key
3. 点击"使用 DeepSeek 分析"、"使用 KIMI 分析"或"使用通义千问分析"

---

## 详细使用指南

### Step 1：上传数据

1. **Excel**：点击“选择Excel文件”，上传包含 `schedule` 工作表的文件
2. **市场周报（可选）**：点击“上传市场周报 (PDF)”，可一次多选
3. **成功提示**：港口筛选区、运力表、趋势图、AI 模块会自动显示

### Step 2：配置 Module 01

1. **港口筛选**：在左侧多选框勾选港口（支持 Ctrl / Shift / 鼠标直接点选）
2. **航线搜索**：在“共舱船公司”输入框输入关键词（中文/英文均可）
3. **视图切换**：根据需要切换 `全部 / 运力 / 派船`
4. **查看趋势图**：底部自动显示五周堆积柱 + 折线对比

### Step 3：配置 Module 02

1. **填写影响因素（可选）**：五个文本域对 AI 结论影响权重高
2. **刷新外部数据**：燃油、CCFI、WCI、FBX 可单独刷新并缓存 6 小时
3. **配置 API**：分别在 DeepSeek、KIMI、通义千问面板输入 Key / URL / 模型 ID
4. **运行 AI**：点击按钮后耐心等待（约 10–30 秒），若失败可查看错误提示

### Step 4：导出 PDF

1. 收起不需要展示的区块（如使用说明）
2. 点击“导出整页 PDF”，等待生成 `市场分析报告.pdf`

---

## 数据格式说明

### Excel（`schedule` 工作表）

| Excel 列 | 内容 | 列定位 | 说明 |
|----------|------|--------|------|
| **港口** | 目的港名称 | **B 列** | 纯文本，如 `BALBOA (巴尔博亚)` |
| **航线ID** | 航线标识 | **C 列** | 例如 `ROUTE001` |
| **共舱船公司** | 航线/船公司名称 | **G 列** | 如 `OCEAN ALLIANCE` |
| **船名/航次** | 船名与航次 | **I 列** | 例如 `MSC OSCAR/123W` |
| **运力 (TEU)** | 集装箱位 | **L 列** | 数值，如 `14000` |
| **船期 (开船日)** | 开船日期 | **M 列** | 日期字符串 |
| **周别** | YYYYWW 或“2025年第47周” | **R 列** | 当前周及未来四周 |

> ⚠️ 列必须保持在指定列号（B/C/G/I/L/M/R），如需调整请同步修改代码映射。

### 周别规则

- 支持格式：`202547`、`2025年第47周`、`2025-47`、`2025/47`
- 周定义：周日 → 周六，例如 `2025/11/16 ~ 2025/11/22` 为 `2025/47`

### PDF 周报

- 支持多份 PDF（如 Linerlytica Weekly、Alphaliner Newsletter 等），解析后优先供 AI 引用

---

## AI 分析说明

### 数据优先级

1. Excel `schedule` 数据（港口运力/派船）
2. “其他影响因素”手工输入
3. 上传 PDF 周报
4. 外部抓取（Ship & Bunker、CCFI、WCI、FBX）
5. 官方/公开渠道（当上面数据不足时引用并标注来源）

### 输出结构

1. 本周结论（涨/维/降 + 核心逻辑）
2. 五大类评分表（需求/供给/突发/内部策略/指数）
3. 需求面分析
4. 供给面分析
5. 突发事件影响
6. 内部策略与成本
7. 指数解读（SCFI/WCI/FBX/CCFI）
8. 风险提示
9. 下周展望与建议

---

## 常见问题

### Excel 加载失败？

- 确认文件中存在 `schedule` 工作表
- 列顺序是否保持 B/C/G/I/L/M/R
- 浏览器 Console 是否有错误

### 港口筛选没显示？

- Excel 解析失败或列名不匹配
- 刷新页面重新上传

### AI 分析失败？

- 检查 API Key、URL、模型 ID
- 确认网络可访问 DeepSeek / KIMI / 通义千问
- 查看提示信息（如配额不足、接口错误）

### PDF 导出异常？

- 确保网络能加载 html2canvas / jsPDF
- 页面过长或浏览器内存不足时，建议分模块导出

---

## 技术说明

### 浏览器要求

- Chrome / Edge 最新版（推荐）
- 支持 Firefox / Safari，但需确保可加载外部 CDN

### 数据存储

- API 配置、外部数据缓存均存储在浏览器 `localStorage`
- Excel / PDF 内容仅在本地浏览器内解析，不上传服务器

### 隐私与安全

- 上传的 Excel、PDF、API Key 均仅在本地使用
- 若包含敏感信息，建议预先脱敏

---

## 目录结构示例

```
Shipping Schedule/
├─ 001-01-manual-download.html            ← 维运网手动下载工具
├─ 001-02-schedule-parser.html            ← 维运网船期解析工具
├─ 001-03-market-schedule.xlsx            ← 数据源示例
├─ 001-04-market-analysis.html            ← 本工具
└─ 001-04-market-analysis-README.md       ← 本说明文档
```

---

## 更新日志（当前版本）

- ✅ 单一 Excel (`schedule`) 驱动
- ✅ 港口多选筛选 + 航线搜索
- ✅ 五周运力 / 派船趋势图
- ✅ 三模型 AI 分析（DeepSeek + KIMI + 通义千问）
- ✅ 市场周报 PDF 解析
- ✅ Ship & Bunker / CCFI / WCI / FBX 抓取
- ✅ 全页面 PDF 导出

---

## 技术支持

遇到问题可检查：

1. 浏览器 Console（F12 → Console）
2. Excel 列名是否对应 B/C/G/I/L/M/R
3. 网络是否能访问外部 CDN / API
4. API Key / URL / 模型 ID 是否正确

---

## 使用声明

资料整合自用户 Excel、用户上传市场周报、Ship & Bunker、上海航运交易所、Drewry、Freightos 等公开渠道，仅供内部研判，不构成对外报价或投资建议。  
AI 服务由 DeepSeek / KIMI / 通义千问 API 驱动，所有调用费用与合规责任由使用者自担，涉及客户或敏感数据时请先完成脱敏处理。


