/**
 * 公共库加载器
 * 统一处理 XLSX 和 Chart.js 的加载，支持多个CDN源和fallback机制
 */

(function() {
    'use strict';

    // 提供 debug 函数的降级实现（如果 debug-utils.js 尚未加载）
    const debugLog = typeof window !== 'undefined' && typeof window.debugLog === 'function'
        ? window.debugLog
        : function(...args) { console.log('[lib-loader]', ...args); };
    
    const debugWarn = typeof window !== 'undefined' && typeof window.debugWarn === 'function'
        ? window.debugWarn
        : function(...args) { console.warn('[lib-loader]', ...args); };
    
    const debugError = typeof window !== 'undefined' && typeof window.debugError === 'function'
        ? window.debugError
        : function(...args) { console.error('[lib-loader]', ...args); };

    /**
     * 通用库加载函数
     * @param {string} globalName - 全局变量名（如 'XLSX' 或 'Chart'）
     * @param {string[]} localSources - 本地文件路径数组（优先使用）
     * @param {string[]} remoteSources - CDN源数组（作为fallback）
     * @param {string} libraryName - 库名称（用于错误消息）
     * @returns {Promise<boolean>} 加载是否成功
     */
    function loadLibrary(globalName, localSources, remoteSources, libraryName) {
        // 如果库已加载，直接返回成功
        if (typeof window[globalName] !== 'undefined') {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            let currentIndex = 0;
            // 处理本地路径：如果是相对路径，根据当前脚本位置调整
            const adjustedLocalSources = localSources.map(src => {
                // 如果路径以 vendor/ 开头，检查是否需要调整为 ../vendor/
                if (src.startsWith('vendor/')) {
                    // 检查当前页面路径，如果在 tests/ 目录下，需要添加 ../
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/tests/') || currentPath.includes('\\tests\\')) {
                        return '../' + src;
                    }
                }
                return src;
            });
            const allSources = [...adjustedLocalSources, ...remoteSources];

            function tryLoadNext() {
                if (currentIndex >= allSources.length) {
                    debugError(`${libraryName} 无法加载，请检查网络或手动刷新后重试`);
                    resolve(false);
                    return;
                }

                const url = allSources[currentIndex];
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                
                script.onload = () => {
                    if (typeof window[globalName] !== 'undefined') {
                        const sourceType = currentIndex < adjustedLocalSources.length ? '本地' : 'CDN';
                        debugLog(`${libraryName} loaded from ${sourceType}:`, url);
                        resolve(true);
                    } else {
                        // 加载了但库未定义，尝试下一个
                        currentIndex++;
                        tryLoadNext();
                    }
                };
                
                script.onerror = () => {
                    const sourceType = currentIndex < adjustedLocalSources.length ? '本地' : 'CDN';
                    debugWarn(`${libraryName} load failed from ${sourceType}:`, url, 'trying next...');
                    currentIndex++;
                    tryLoadNext();
                };
                
                document.head.appendChild(script);
            }

            tryLoadNext();
        });
    }

    /**
     * 加载XLSX库
     * 优先使用本地文件，失败时回退到CDN
     */
    function ensureXlsx() {
        const localSources = [
            'vendor/xlsx.full.min.js'
        ];
        const remoteSources = [
            'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
            'https://cdn.jsdelivr.net/npm/xlsx@0.20.3/dist/xlsx.full.min.js',
            'https://unpkg.com/xlsx@0.20.3/dist/xlsx.full.min.js',
            // 如果最新版本不可用，回退到0.18.5
            'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        ];
        return loadLibrary('XLSX', localSources, remoteSources, 'XLSX');
    }

    /**
     * 加载Chart.js库
     * 优先使用本地文件，失败时回退到CDN
     */
    function ensureChartJs() {
        const localSources = [
            'vendor/chart.umd.min.js'
        ];
        const remoteSources = [
            'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js',
            'https://unpkg.com/chart.js@4.5.1/dist/chart.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.1/chart.umd.min.js',
            // 如果4.5.1不可用，回退到4.4.6
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js',
            'https://unpkg.com/chart.js@4.4.6/dist/chart.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.6/chart.umd.min.js',
            // 如果4.4.6不可用，回退到4.4.0
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
            'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
        ];
        return loadLibrary('Chart', localSources, remoteSources, 'Chart.js');
    }

    /**
     * 加载 ExcelJS 库（支持样式的 Excel 导出库）
     * 优先使用本地文件，失败时回退到CDN
     * ExcelJS 是一个独立的库，完全支持样式、颜色、字体等
     */
    function ensureExcelJS() {
        // 如果已经加载了 ExcelJS
        if (typeof ExcelJS !== 'undefined') {
            return Promise.resolve(true);
        }
        
        const localSources = [
            'vendor/exceljs.min.js'
        ];
        const remoteSources = [
            'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
            'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
        ];
        return loadLibrary('ExcelJS', localSources, remoteSources, 'ExcelJS');
    }

    // 导出到全局
    window.ensureXlsx = ensureXlsx;
    window.ensureChartJs = ensureChartJs;
    window.ensureExcelJS = ensureExcelJS;
})();

