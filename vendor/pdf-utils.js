/**
 * PDF 导出工具函数
 * 用于将页面内容导出为 PDF
 * 
 * 依赖：
 * - html2canvas (动态加载)
 * - jsPDF (动态加载)
 */

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
                await loadScript(src);
                if (typeof window.html2canvas !== 'undefined') break;
            } catch (error) {
                debugWarn('html2canvas 加载失败', src, error);
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
                await loadScript(src);
                if (typeof window.jspdf !== 'undefined') break;
            } catch (error) {
                debugWarn('jsPDF 加载失败', src, error);
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
        debugError('导出PDF失败:', error);
        if (onError) onError(error);
        throw error;
    }
}

