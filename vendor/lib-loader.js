/**
 * 公共库加载器
 * 统一处理 XLSX 和 Chart.js 的加载，支持多个CDN源和fallback机制
 */

(function() {
    'use strict';

    /**
     * 通用库加载函数
     * @param {string} globalName - 全局变量名（如 'XLSX' 或 'Chart'）
     * @param {string[]} remoteSources - CDN源数组
     * @param {string} libraryName - 库名称（用于错误消息）
     * @returns {Promise<boolean>} 加载是否成功
     */
    function loadLibrary(globalName, remoteSources, libraryName) {
        // 如果库已加载，直接返回成功
        if (typeof window[globalName] !== 'undefined') {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            let currentIndex = 0;

            function tryLoadNext() {
                if (currentIndex >= remoteSources.length) {
                    debugError(`${libraryName} 无法加载，请检查网络或手动刷新后重试`);
                    resolve(false);
                    return;
                }

                const url = remoteSources[currentIndex];
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                
                script.onload = () => {
                    if (typeof window[globalName] !== 'undefined') {
                        debugLog(`${libraryName} loaded from`, url);
                        resolve(true);
                    } else {
                        // 加载了但库未定义，尝试下一个
                        currentIndex++;
                        tryLoadNext();
                    }
                };
                
                script.onerror = () => {
                    debugWarn(`${libraryName} load failed from`, url, 'trying next...');
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
     * 使用 script 标签直接加载，避免浏览器的跟踪防护阻止
     */
    function ensureXlsx() {
        const remoteSources = [
            'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        ];
        return loadLibrary('XLSX', remoteSources, 'XLSX');
    }

    /**
     * 加载Chart.js库
     * 使用 script 标签直接加载，避免浏览器的跟踪防护阻止
     */
    function ensureChartJs() {
        const remoteSources = [
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
            'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
        ];
        return loadLibrary('Chart', remoteSources, 'Chart.js');
    }

    // 导出到全局
    window.ensureXlsx = ensureXlsx;
    window.ensureChartJs = ensureChartJs;
})();

