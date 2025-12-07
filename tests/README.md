# 单元测试说明

## 📋 概述

本目录包含 Shipping Tools 项目的单元测试文件。测试使用简单的自定义测试框架，可以在浏览器中直接运行。

## 🚀 运行测试

### 方法一：在浏览器中运行（推荐）

1. 打开 `tests/index.html` 文件
2. 点击"运行所有测试"按钮
3. 查看控制台输出和测试结果摘要

### 方法二：在浏览器控制台中运行

1. 打开任意工具页面（如 `index.html`）
2. 打开浏览器开发者工具（F12）
3. 在控制台中输入：

```javascript
// 加载测试文件
const script1 = document.createElement('script');
script1.src = 'tests/test-utils.js';
document.head.appendChild(script1);

const script2 = document.createElement('script');
script2.src = 'tests/test-error-handler.js';
document.head.appendChild(script2);

// 等待加载后运行测试
setTimeout(() => {
    testErrorHandler();
}, 1000);
```

## 📁 文件结构

```
tests/
├── index.html                      # 测试运行器（浏览器界面）
├── test-utils.js                   # 测试工具函数（断言、运行器等）
├── test-error-handler.js           # 错误处理模块测试
├── test-common-utils.js            # 公共工具函数测试
├── test-parser-utils.js            # 解析工具函数测试
├── test-date-utils.js              # 日期工具函数测试
├── test-lib-loader.js              # 库加载器测试
├── test-ai-utils.js                # AI 工具函数测试
├── test-pdf-utils.js                # PDF 工具函数测试
├── test-market-analysis-utils.js    # 市场分析工具函数测试
└── README.md                        # 本文件
```

## 🧪 测试覆盖

### 已测试的模块

1. **错误处理模块** (`vendor/error-handler.js`)
   - ErrorType 枚举
   - getErrorMessage 函数
   - addErrorMessage 函数
   - 占位符替换功能

2. **公共工具函数** (`vendor/common-utils.js`)
   - escapeRegex 函数
   - computePercentChange 函数
   - formatPercent 函数
   - parseDate 函数
   - 缓存函数（loadCachedData, saveCachedData）

3. **解析工具函数** (`vendor/parser-utils.js`)
   - toCsvCell 函数
   - rowsToCsv 函数
   - generateTimestampFilename 函数

4. **日期工具函数** (`vendor/date-utils.js`)
   - parseExcelDateSerial 函数
   - parseStringDate 函数
   - parseDateValue 函数
   - formatDateToYYYYMMDD 函数

5. **库加载器** (`vendor/lib-loader.js`)
   - ensureXlsx 函数
   - ensureChartJs 函数

6. **AI 工具函数** (`vendor/ai-utils.js`)
   - createAiProviders 函数
   - getAiConfigFromInputs 函数
   - loadAiConfigsFromStorage 函数
   - saveAiConfigToStorage 函数
   - initAiModule 函数
   - executeAiAnalysis 函数

7. **PDF 工具函数** (`vendor/pdf-utils.js`)
   - loadPdfLibraries 函数
   - exportToPdf 函数

8. **市场分析工具函数** (`vendor/market-analysis-utils.js`)
   - parseWciText 函数及其子函数（parseWciByCode, parseWciByLabel, parseWciByFallback, parseWciComposite）
   - prepareAnalysisData 函数
   - buildDataOverview 函数
   - buildDetailedData001 函数
   - buildDetailedData365 函数
   - buildBookingDataSection 函数
   - buildMarketReportsSection 函数
   - buildBunkerDataSection 函数
   - buildCcfiDataSection 函数
   - buildWciDataSection 函数
   - buildFbxDataSection 函数

## 📝 添加新测试

### 步骤

1. 创建新的测试文件，例如 `test-new-module.js`
2. 在文件中定义测试函数：

```javascript
function testNewModule() {
    console.log('测试新模块...');
    assertEqual(newFunction('input'), 'expected', '测试消息');
    // 更多测试...
}
```

3. 在 `tests/index.html` 中添加测试套件：

```javascript
const testSuites = {
    '新模块': () => {
        testNewModule();
    },
    // ... 其他测试套件
};
```

4. 在 `tests/index.html` 中加载测试文件：

```html
<script src="test-new-module.js"></script>
```

## 🔧 测试工具函数

### assert(condition, message)
断言条件为真。

```javascript
assert(1 + 1 === 2, '1 + 1 应该等于 2');
```

### assertEqual(actual, expected, message)
断言两个值相等。

```javascript
assertEqual(add(1, 2), 3, 'add(1, 2) 应该返回 3');
```

### assertNotNull(value, message)
断言值不为 null 或 undefined。

```javascript
assertNotNull(getValue(), 'getValue() 不应该返回 null');
```

### assertNull(value, message)
断言值为 null 或 undefined。

```javascript
assertNull(getNullValue(), 'getNullValue() 应该返回 null');
```

## 📊 测试结果

测试运行后会显示：
- **总计**：总测试数
- **通过**：通过的测试数
- **失败**：失败的测试数
- **错误列表**：失败的测试详情

## 🎯 最佳实践

1. **测试命名**：使用描述性的测试消息
2. **测试覆盖**：测试正常情况、边界情况和错误情况
3. **独立性**：每个测试应该独立，不依赖其他测试
4. **可读性**：测试代码应该清晰易懂

## 🔍 调试测试

如果测试失败：

1. 查看控制台输出，找到失败的测试
2. 检查测试消息，了解期望值和实际值
3. 检查被测试的函数实现
4. 修复问题后重新运行测试

## 📚 相关文档

- [代码质量报告](../CODE_QUALITY_REPORT.md)
- [项目 README](../README.md)（如果存在）

---

*最后更新：2024年*

