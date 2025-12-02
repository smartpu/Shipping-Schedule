/**
 * 公共库加载器
 * 统一处理 XLSX 和 Chart.js 的加载，支持多个CDN源和fallback机制
 */

(function() {
    'use strict';

    /**
     * 加载XLSX库
     * 使用 script 标签直接加载，避免浏览器的跟踪防护阻止
     */
    function ensureXlsx() {
        if (typeof XLSX !== 'undefined') {
            return Promise.resolve(true);
        }

        const remoteSources = [
            'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        ];

        return new Promise((resolve) => {
            let currentIndex = 0;

            function tryLoadNext() {
                if (currentIndex >= remoteSources.length) {
                    console.error('XLSX 无法加载，请检查网络或手动刷新后重试');
                    resolve(false);
                    return;
                }

                const url = remoteSources[currentIndex];
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                
                script.onload = () => {
                    if (typeof XLSX !== 'undefined') {
                        console.log('XLSX loaded from', url);
                        resolve(true);
                    } else {
                        // 加载了但XLSX未定义，尝试下一个
                        currentIndex++;
                        tryLoadNext();
                    }
                };
                
                script.onerror = () => {
                    console.warn('XLSX load failed from', url, 'trying next...');
                    currentIndex++;
                    tryLoadNext();
                };
                
                document.head.appendChild(script);
            }

            tryLoadNext();
        });
    }

    /**
     * 加载Chart.js库
     * 使用 script 标签直接加载，避免浏览器的跟踪防护阻止
     */
    function ensureChartJs() {
        if (typeof Chart !== 'undefined') {
            return Promise.resolve(true);
        }

        const remoteSources = [
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
            'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
        ];

        return new Promise((resolve) => {
            let currentIndex = 0;

            function tryLoadNext() {
                if (currentIndex >= remoteSources.length) {
                    console.error('Chart.js 无法加载，请检查网络或手动刷新后重试');
                    resolve(false);
                    return;
                }

                const url = remoteSources[currentIndex];
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                
                script.onload = () => {
                    if (typeof Chart !== 'undefined') {
                        console.log('Chart.js loaded from', url);
                        resolve(true);
                    } else {
                        // 加载了但Chart未定义，尝试下一个
                        currentIndex++;
                        tryLoadNext();
                    }
                };
                
                script.onerror = () => {
                    console.warn('Chart.js load failed from', url, 'trying next...');
                    currentIndex++;
                    tryLoadNext();
                };
                
                document.head.appendChild(script);
            }

            tryLoadNext();
        });
    }

    // 导出到全局
    window.ensureXlsx = ensureXlsx;
    window.ensureChartJs = ensureChartJs;

    // 自动初始化（如果页面需要）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // 可以根据页面需要自动加载
            // ensureXlsx();
            // ensureChartJs();
        });
    } else {
        // DOM已经加载完成
        // ensureXlsx();
        // ensureChartJs();
    }
})();

