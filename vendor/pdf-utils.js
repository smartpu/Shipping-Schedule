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
                    exportBtn.textContent = '导出整页 PDF';
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
                    exportBtn.textContent = '导出整页 PDF';
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
                exportBtn.textContent = '导出整页 PDF';
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

// 导出函数到全局
if (typeof window !== 'undefined') {
    window.exportToPdf = window.exportToPdf || exportToPdf;
    window.createExportPageToPdfFunction = window.createExportPageToPdfFunction || createExportPageToPdfFunction;
    window.loadPdfLibraries = window.loadPdfLibraries || loadPdfLibraries;
}

