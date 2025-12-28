/**
 * PDF 导出工具函数
 * 用于将页面内容导出为 PDF
 * 
 * 依赖：
 * - html2canvas (动态加载)
 * - jsPDF (动态加载)
 * - loadScript (从 common-utils.js 或 window.loadScript)
 * - debugWarn (从 debug-utils.js 或 window.debugWarn)
 */

/**
 * 加载脚本（如果 common-utils.js 未加载，使用本地实现）
 * @param {string} src - 脚本URL
 * @returns {Promise<void>} 加载完成的Promise
 */
function loadScriptForPdf(src) {
    // 优先使用 common-utils.js 中的 loadScript
    if (typeof window !== 'undefined' && typeof window.loadScript === 'function') {
        return window.loadScript(src);
    }
    
    // 降级实现（如果 common-utils.js 未加载）
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * 加载 PDF 导出所需的库（html2canvas 和 jsPDF）
 * @returns {Promise<void>}
 */
async function loadPdfLibraries() {
    // 加载html2canvas（优先使用本地文件）
    if (typeof window.html2canvas === 'undefined') {
        const html2CanvasSources = [
            'vendor/html2canvas.min.js',  // 本地文件优先
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
            'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
        ];

        for (const src of html2CanvasSources) {
            try {
                await loadScriptForPdf(src);
                if (typeof window.html2canvas !== 'undefined') break;
            } catch (error) {
                const warnFn = typeof window !== 'undefined' && typeof window.debugWarn === 'function' 
                    ? window.debugWarn 
                    : (typeof console !== 'undefined' ? console.warn : () => {});
                warnFn('html2canvas 加载失败', src, error);
            }
        }
    }

    // 加载jsPDF（优先使用本地文件）
    if (typeof window.jspdf === 'undefined') {
        const jsPdfSources = [
            'vendor/jspdf.umd.min.js',  // 本地文件优先
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
            'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
        ];

        for (const src of jsPdfSources) {
            try {
                await loadScriptForPdf(src);
                if (typeof window.jspdf !== 'undefined') break;
            } catch (error) {
                const warnFn = typeof window !== 'undefined' && typeof window.debugWarn === 'function' 
                    ? window.debugWarn 
                    : (typeof console !== 'undefined' ? console.warn : () => {});
                warnFn('jsPDF 加载失败', src, error);
            }
        }
    }
}

/**
 * 将指定元素导出为 PDF
 * @param {HTMLElement|string} target - 要导出的元素或选择器
 * @param {Object} options - 导出选项
 * @param {string} options.fileName - 文件名（不含扩展名）
 * @param {Function} options.onStart - 开始导出时的回调
 * @param {Function} options.onComplete - 导出完成时的回调
 * @param {Function} options.onError - 导出失败时的回调
 * @returns {Promise<void>}
 */
/**
 * 创建标准的 PDF 导出函数（用于页面导出按钮）
 * @param {string} fileNamePrefix - 文件名前缀（如 "市场分析报告"）
 * @param {string} [buttonId='exportPdfBtn'] - 导出按钮 ID
 * @param {string} [targetSelector='.container'] - 要导出的目标选择器
 * @returns {Function} 返回导出函数
 */
function createExportPageToPdfFunction(fileNamePrefix, buttonId = 'exportPdfBtn', targetSelector = '.container') {
    return async function exportPageToPdf() {
        const exportBtn = document.getElementById(buttonId);
        if (!exportBtn) return;
        
        try {
            // 生成文件名：前缀_年月日.pdf
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const fileName = `${fileNamePrefix}_${year}${month}${day}`;
            
            // 使用 vendor/pdf-utils.js 中的 exportToPdf 函数
            await exportToPdf(targetSelector, {
                fileName: fileName,
                onStart: () => {
                    exportBtn.disabled = true;
                    exportBtn.textContent = '正在导出...';
                },
                onComplete: () => {
                    exportBtn.textContent = '导出PDF';
                    exportBtn.disabled = false;
                },
                onError: (error) => {
                    const errorFn = typeof window !== 'undefined' && typeof window.debugError === 'function' 
                        ? window.debugError 
                        : (typeof console !== 'undefined' ? console.error : () => {});
                    errorFn('导出PDF失败:', error);
                    if (typeof window !== 'undefined' && typeof window.showError === 'function' && typeof window.ErrorType !== 'undefined') {
                        window.showError(window.ErrorType.SYSTEM_ERROR, 'PDF_EXPORT_FAILED', { 
                            message: error.message || String(error) 
                        }, error);
                    }
                    exportBtn.textContent = '导出PDF';
                    exportBtn.disabled = false;
                }
            });
        } catch (error) {
            const errorFn = typeof window !== 'undefined' && typeof window.debugError === 'function' 
                ? window.debugError 
                : (typeof console !== 'undefined' ? console.error : () => {});
            errorFn('导出PDF失败:', error);
            if (typeof window !== 'undefined' && typeof window.showError === 'function' && typeof window.ErrorType !== 'undefined') {
                window.showError(window.ErrorType.SYSTEM_ERROR, 'PDF_EXPORT_FAILED', { 
                    message: error.message || String(error) 
                }, error);
            }
            if (exportBtn) {
                exportBtn.textContent = '导出PDF';
                exportBtn.disabled = false;
            }
        }
    };
}

async function exportToPdf(target, options = {}) {
    const {
        fileName = `导出_${new Date().toISOString().split('T')[0]}`,
        onStart,
        onComplete,
        onError
    } = options;

    // 检查库是否加载
    if (!window.html2canvas || !window.jspdf) {
        // 尝试加载库
        await loadPdfLibraries();
        if (!window.html2canvas || !window.jspdf) {
            const error = new Error('PDF 导出功能所需的库尚未加载完成，请稍候几秒后重试。\n\n如果问题持续，请检查网络连接或刷新页面。');
            if (onError) onError(error);
            throw error;
        }
    }

    try {
        if (onStart) onStart();

        // 获取目标元素
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) {
            throw new Error('找不到要导出的元素');
        }

        // 保存原始滚动位置
        const previousScroll = window.scrollY;
        window.scrollTo(0, 0);

        // 使用html2canvas截图
        const canvas = await html2canvas(element, {
            scale: Math.min(window.devicePixelRatio || 1, 1.5),
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        });

        // 恢复滚动位置
        window.scrollTo(0, previousScroll);

        // 转换为图片
        const maxBytes = 2 * 1024 * 1024;
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let byteSize = dataUrl.length * 0.75;
        while (byteSize > maxBytes && quality > 0.4) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            byteSize = dataUrl.length * 0.75;
        }

        // 创建PDF
        const pdf = new window.jspdf.jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // 添加第一页
        pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        // 如果内容超过一页，添加更多页
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;
        }

        // 保存PDF
        pdf.save(`${fileName}.pdf`);

        if (onComplete) onComplete();
    } catch (error) {
        const errorFn = typeof window !== 'undefined' && typeof window.debugError === 'function' 
            ? window.debugError 
            : (typeof console !== 'undefined' ? console.error : () => {});
        errorFn('导出PDF失败:', error);
        if (onError) onError(error);
        throw error;
    }
}

/**
 * 检查并加载 PDF 库（支持多种加载方式）
 * @returns {Promise<{hasHtml2Canvas: boolean, hasJsPdf: boolean, JsPDFConstructor: Function|null}>}
 */
async function checkAndLoadPdfLibraries() {
    // 如果库已加载，直接返回
    if (window.html2canvas && window.jspdf) {
        let JsPDFConstructor = null;
        if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
            JsPDFConstructor = window.jspdf.jsPDF;
        } else if (window.jspdf && typeof window.jspdf === 'function') {
            JsPDFConstructor = window.jspdf;
        } else if (window.jsPDF && typeof window.jsPDF === 'function') {
            JsPDFConstructor = window.jsPDF;
        }
        return {
            hasHtml2Canvas: true,
            hasJsPdf: !!JsPDFConstructor,
            JsPDFConstructor: JsPDFConstructor
        };
    }

    // 尝试加载库
    if (typeof window.loadPdfLibraries === 'function') {
        await window.loadPdfLibraries();
    } else {
        await loadPdfLibraries();
    }
    
    // 等待库初始化
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 检查加载结果
    const hasHtml2Canvas = typeof window.html2canvas !== 'undefined';
    let hasJsPdf = false;
    let JsPDFConstructor = null;
    
    if (typeof window.jspdf !== 'undefined') {
        if (typeof window.jspdf.jsPDF === 'function') {
            hasJsPdf = true;
            JsPDFConstructor = window.jspdf.jsPDF;
        } else if (typeof window.jspdf === 'function') {
            hasJsPdf = true;
            JsPDFConstructor = window.jspdf;
        }
    } else if (typeof window.jsPDF !== 'undefined' && typeof window.jsPDF === 'function') {
        hasJsPdf = true;
        JsPDFConstructor = window.jsPDF;
    }
    
    return { hasHtml2Canvas, hasJsPdf, JsPDFConstructor };
}

/**
 * 转换图表为图片数据
 * @param {string|string[]} chartCanvasIds - 图表 canvas ID 或 ID 数组
 * @returns {Promise<Map<string, string>>} 返回 canvasId -> imageData 的映射
 */
async function convertChartsToImages(chartCanvasIds) {
    const chartImageDataMap = new Map();
    const chartIds = Array.isArray(chartCanvasIds) ? chartCanvasIds : (chartCanvasIds ? [chartCanvasIds] : []);
    
    for (const canvasId of chartIds) {
        const chartCanvas = document.getElementById(canvasId);
        if (!chartCanvas || typeof Chart === 'undefined') continue;
        
        try {
            // 确保图表容器和 wrapper 可见
            const chartContainer = chartCanvas.closest('.chart-container');
            const chartWrapper = chartCanvas.closest('.chart-wrapper');
            
            if (chartContainer && chartContainer.classList.contains('hidden')) {
                chartContainer.classList.remove('hidden');
            }
            if (chartWrapper && chartWrapper.classList.contains('hidden')) {
                chartWrapper.classList.remove('hidden');
            }
            
            // 等待图表容器显示和渲染
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const chart = Chart.getChart(chartCanvas);
            if (chart) {
                // 更新图表以确保数据最新
                chart.update('none');
                // 等待图表更新完成
                await new Promise(resolve => setTimeout(resolve, 300));
                const imageData = chartCanvas.toDataURL('image/png', 1.0);
                chartImageDataMap.set(canvasId, imageData);
            } else {
                // 如果没有 Chart 实例，直接尝试从 canvas 获取数据
                await new Promise(resolve => setTimeout(resolve, 200));
                const imageData = chartCanvas.toDataURL('image/png', 1.0);
                chartImageDataMap.set(canvasId, imageData);
            }
        } catch (e) {
            const warnFn = typeof window !== 'undefined' && typeof window.debugWarn === 'function' 
                ? window.debugWarn 
                : (typeof console !== 'undefined' ? console.warn : () => {});
            warnFn(`无法转换图表 ${canvasId}:`, e);
        }
    }
    
    return chartImageDataMap;
}

/**
 * 创建临时容器并克隆元素
 * @param {HTMLElement|HTMLElement[]} elements - 要克隆的元素或元素数组
 * @param {Map<string, string>} chartImageDataMap - 图表图片数据映射
 * @returns {HTMLElement} 临时容器元素
 */
function createTempContainerWithClones(elements, chartImageDataMap) {
    const elementArray = Array.isArray(elements) ? elements : [elements];
    const maxWidth = Math.max(...elementArray.map(el => el.offsetWidth || 800));
    
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: ${maxWidth}px;
        background: #f5f5f0;
        padding: 20px;
    `;
    
    // 克隆元素并替换图表
    const clonedElements = elementArray.map(el => {
        const cloned = el.cloneNode(true);
        
        // 替换所有已转换的图表 canvas
        chartImageDataMap.forEach((imageData, canvasId) => {
            const clonedChartCanvas = cloned.querySelector(`#${canvasId}`);
            if (clonedChartCanvas) {
                const img = document.createElement('img');
                img.src = imageData;
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                clonedChartCanvas.parentNode.replaceChild(img, clonedChartCanvas);
            }
        });
        
        return cloned;
    });
    
    clonedElements.forEach(cloned => tempContainer.appendChild(cloned));
    return tempContainer;
}

/**
 * 压缩图片数据以控制文件大小
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {number} maxBytes - 最大字节数（默认 2MB）
 * @returns {string} 压缩后的 data URL
 */
function compressImageData(canvas, maxBytes = 2 * 1024 * 1024) {
    let quality = 0.8;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    let byteSize = dataUrl.length * 0.75;
    
    while (byteSize > maxBytes && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        byteSize = dataUrl.length * 0.75;
    }
    
    return dataUrl;
}

/**
 * 创建 PDF 并分页
 * @param {string} dataUrl - 图片数据 URL
 * @param {string} fileName - 文件名
 * @param {Function} JsPDFConstructor - jsPDF 构造函数
 * @param {HTMLCanvasElement} canvas - Canvas 元素（用于获取实际尺寸）
 */
function createPdfWithPagination(dataUrl, fileName, JsPDFConstructor, canvas) {
    const pdf = new JsPDFConstructor('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    
    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
    }
    
    pdf.save(`${fileName}.pdf`);
}

/**
 * 公共 PDF 导出函数（支持模块导出，包含图表转换）
 * @param {Object} options - 导出选项
 * @param {string} options.fileName - 文件名（不含扩展名）
 * @param {HTMLElement|HTMLElement[]} options.elements - 要导出的元素或元素数组
 * @param {string} [options.chartCanvasId] - 单个图表 canvas ID
 * @param {string[]} [options.chartCanvasIds] - 多个图表 canvas ID 数组
 * @param {string} [options.exportBtnId='exportPdfBtn'] - 导出按钮 ID
 * @returns {Promise<void>}
 */
async function exportToPdfCommon(options) {
    const { 
        fileName, 
        elements, 
        chartCanvasId, 
        chartCanvasIds,
        exportBtnId = 'exportPdfBtn'
    } = options;
    
    // 支持单个图表 ID 或多个图表 ID 数组
    const chartIds = chartCanvasIds || (chartCanvasId ? [chartCanvasId] : []);
    const exportBtn = document.getElementById(exportBtnId);
    if (!exportBtn) {
        const errorFn = typeof window !== 'undefined' && typeof window.debugError === 'function' 
            ? window.debugError 
            : (typeof console !== 'undefined' ? console.error : () => {});
        errorFn('导出按钮未找到:', exportBtnId);
        return;
    }

    try {
        // 检查并加载 PDF 库
        const { hasHtml2Canvas, hasJsPdf, JsPDFConstructor } = await checkAndLoadPdfLibraries();
        
        if (!hasHtml2Canvas || !hasJsPdf) {
            const missingLibs = [];
            if (!hasHtml2Canvas) missingLibs.push('html2canvas');
            if (!hasJsPdf) missingLibs.push('jsPDF');
            
            const errorFn = typeof window !== 'undefined' && typeof window.debugError === 'function' 
                ? window.debugError 
                : (typeof console !== 'undefined' ? console.error : () => {});
            errorFn('PDF库加载失败详情:', {
                html2canvas: typeof window.html2canvas,
                jspdf: typeof window.jspdf,
                jsPDF: typeof window.jsPDF,
                missingLibs: missingLibs
            });
            
            if (typeof window !== 'undefined' && typeof window.showError === 'function' && typeof window.ErrorType !== 'undefined') {
                window.showError(window.ErrorType.SYSTEM_ERROR, 'PDF_EXPORT_FAILED', { 
                    message: `PDF 导出功能所需的库加载失败：${missingLibs.join('、')}。\n\n请检查：\n1. 网络连接是否正常\n2. vendor/html2canvas.min.js 和 vendor/jspdf.umd.min.js 文件是否存在\n3. 浏览器控制台的错误信息\n\n如果问题持续，请刷新页面后重试。` 
                });
            }
            return;
        }

        exportBtn.disabled = true;
        exportBtn.textContent = '正在导出...';

        // 确保元素是数组
        const elementArray = Array.isArray(elements) ? elements : [elements];
        
        // 记录隐藏状态并显示元素
        const hiddenStates = elementArray.map(el => ({
            element: el,
            wasHidden: el.classList.contains('hidden')
        }));
        hiddenStates.forEach(({ element, wasHidden }) => {
            if (wasHidden) {
                element.classList.remove('hidden');
            }
        });

        // 处理图表转换
        const chartImageDataMap = await convertChartsToImages(chartIds);

        // 等待所有元素渲染完成
        await new Promise(resolve => setTimeout(resolve, 200));

        // 创建临时容器并克隆元素
        const tempContainer = createTempContainerWithClones(elementArray, chartImageDataMap);
        document.body.appendChild(tempContainer);
        await new Promise(resolve => setTimeout(resolve, 200));

        // 保存原始滚动位置
        const previousScroll = window.scrollY;
        window.scrollTo(0, 0);

        // 使用html2canvas截图
        const canvas = await window.html2canvas(tempContainer, {
            scale: Math.min(window.devicePixelRatio || 1, 1.5),
            useCORS: true,
            backgroundColor: '#f5f5f0',
            logging: false,
            scrollY: 0,
            windowWidth: tempContainer.offsetWidth,
            windowHeight: tempContainer.scrollHeight
        });

        // 清理临时容器
        document.body.removeChild(tempContainer);

        // 恢复元素隐藏状态
        hiddenStates.forEach(({ element, wasHidden }) => {
            if (wasHidden) {
                element.classList.add('hidden');
            }
        });

        // 恢复滚动位置
        window.scrollTo(0, previousScroll);

        // 压缩图片数据
        const dataUrl = compressImageData(canvas);

        // 创建PDF并分页
        createPdfWithPagination(dataUrl, fileName, JsPDFConstructor, canvas);

        exportBtn.textContent = '导出PDF';
        exportBtn.disabled = false;
    } catch (error) {
        const errorFn = typeof window !== 'undefined' && typeof window.debugError === 'function' 
            ? window.debugError 
            : (typeof console !== 'undefined' ? console.error : () => {});
        errorFn('导出PDF失败:', error);
        
        if (typeof window !== 'undefined' && typeof window.showError === 'function' && typeof window.ErrorType !== 'undefined') {
            window.showError(window.ErrorType.SYSTEM_ERROR, 'PDF_EXPORT_FAILED', { 
                message: error.message || String(error) 
            }, error);
        }
        
        if (exportBtn) {
            exportBtn.textContent = '导出PDF';
            exportBtn.disabled = false;
        }
    }
}

// 导出函数到全局
if (typeof window !== 'undefined') {
    window.exportToPdf = window.exportToPdf || exportToPdf;
    window.createExportPageToPdfFunction = window.createExportPageToPdfFunction || createExportPageToPdfFunction;
    window.loadPdfLibraries = window.loadPdfLibraries || loadPdfLibraries;
    window.exportToPdfCommon = window.exportToPdfCommon || exportToPdfCommon;
}

