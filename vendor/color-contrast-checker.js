/**
 * 颜色对比度检查工具
 * 高优先级优化：颜色对比度检查
 * 
 * 确保所有文本符合 WCAG AA 标准（≥4.5:1 for normal text, ≥3:1 for large text）
 */

(function() {
    'use strict';

    /**
     * 计算相对亮度（根据 WCAG 2.1 标准）
     * @param {string} hex - 十六进制颜色值（如 #1D1D1F）
     * @returns {number} 相对亮度（0-1）
     */
    function getRelativeLuminance(hex) {
        // 移除 # 号
        hex = hex.replace('#', '');
        
        // 转换为 RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        // 应用 gamma 校正
        const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        
        // 计算相对亮度
        return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
    }

    /**
     * 计算对比度比率
     * @param {string} color1 - 第一个颜色（十六进制）
     * @param {string} color2 - 第二个颜色（十六进制）
     * @returns {number} 对比度比率
     */
    function getContrastRatio(color1, color2) {
        const l1 = getRelativeLuminance(color1);
        const l2 = getRelativeLuminance(color2);
        
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 检查颜色对比度是否符合 WCAG 标准
     * @param {string} foreground - 前景色（文本颜色）
     * @param {string} background - 背景色
     * @param {boolean} isLargeText - 是否为大文本（≥18px 或 ≥14px bold）
     * @returns {Object} 检查结果
     */
    function checkContrast(foreground, background, isLargeText = false) {
        const ratio = getContrastRatio(foreground, background);
        const minRatio = isLargeText ? 3.0 : 4.5;
        const passes = ratio >= minRatio;
        
        return {
            ratio: ratio.toFixed(2),
            minRequired: minRatio,
            passes: passes,
            level: passes ? (ratio >= 7.0 ? 'AAA' : 'AA') : 'FAIL',
            foreground: foreground,
            background: background
        };
    }

    /**
     * 检查所有主要颜色组合
     * @returns {Array} 检查结果数组
     */
    function checkAllColorCombinations() {
        const colors = {
            textPrimary: '#1D1D1F',
            textSecondary: '#6E6E73',
            textTertiary: '#86868B',
            bgPrimary: '#F5F5F7',
            bgSecondary: '#FFFFFF',
            bgBeige: '#F6E4C8'
        };

        const checks = [];

        // 主要文本在主要背景上
        checks.push({
            name: '主要文本在主要背景上',
            result: checkContrast(colors.textPrimary, colors.bgPrimary),
            isLargeText: false
        });

        // 主要文本在次要背景上
        checks.push({
            name: '主要文本在次要背景上',
            result: checkContrast(colors.textPrimary, colors.bgSecondary),
            isLargeText: false
        });

        // 次要文本在主要背景上
        checks.push({
            name: '次要文本在主要背景上',
            result: checkContrast(colors.textSecondary, colors.bgPrimary),
            isLargeText: false
        });

        // 次要文本在次要背景上
        checks.push({
            name: '次要文本在次要背景上',
            result: checkContrast(colors.textSecondary, colors.bgSecondary),
            isLargeText: false
        });

        // 主要文本在米色背景上（登录页面）
        checks.push({
            name: '主要文本在米色背景上',
            result: checkContrast(colors.textPrimary, colors.bgBeige),
            isLargeText: false
        });

        // 大文本检查（标题等）
        checks.push({
            name: '主要文本在主要背景上（大文本）',
            result: checkContrast(colors.textPrimary, colors.bgPrimary, true),
            isLargeText: true
        });

        checks.push({
            name: '次要文本在主要背景上（大文本）',
            result: checkContrast(colors.textSecondary, colors.bgPrimary, true),
            isLargeText: true
        });

        return checks;
    }

    /**
     * 生成对比度检查报告
     * @returns {string} HTML 格式的报告
     */
    function generateContrastReport() {
        const checks = checkAllColorCombinations();
        let report = '<div style="padding: 20px; font-family: monospace;">';
        report += '<h2>颜色对比度检查报告</h2>';
        report += '<table style="border-collapse: collapse; width: 100%; margin-top: 20px;">';
        report += '<tr><th style="border: 1px solid #ddd; padding: 8px;">组合</th>';
        report += '<th style="border: 1px solid #ddd; padding: 8px;">对比度</th>';
        report += '<th style="border: 1px solid #ddd; padding: 8px;">要求</th>';
        report += '<th style="border: 1px solid #ddd; padding: 8px;">状态</th></tr>';

        checks.forEach(check => {
            const { result } = check;
            const statusColor = result.passes ? '#28a745' : '#dc3545';
            const statusText = result.passes ? '✓ 通过' : '✗ 失败';
            const levelText = result.level === 'AAA' ? 'AAA' : result.level === 'AA' ? 'AA' : 'FAIL';

            report += `<tr style="background: ${result.passes ? '#d4edda' : '#f8d7da'};">`;
            report += `<td style="border: 1px solid #ddd; padding: 8px;">${check.name}</td>`;
            report += `<td style="border: 1px solid #ddd; padding: 8px;">${result.ratio}:1</td>`;
            report += `<td style="border: 1px solid #ddd; padding: 8px;">≥${result.minRequired}:1 ${check.isLargeText ? '(大文本)' : ''}</td>`;
            report += `<td style="border: 1px solid #ddd; padding: 8px; color: ${statusColor}; font-weight: bold;">${statusText} (${levelText})</td>`;
            report += '</tr>';
        });

        report += '</table>';
        report += '</div>';

        return report;
    }

    // 导出到全局
    if (typeof window !== 'undefined') {
        window.ColorContrastChecker = {
            getContrastRatio,
            checkContrast,
            checkAllColorCombinations,
            generateContrastReport
        };

        // 在开发模式下自动检查
        if (window.location.search.includes('check-contrast')) {
            console.log('=== 颜色对比度检查 ===');
            const checks = checkAllColorCombinations();
            checks.forEach(check => {
                const { result } = check;
                const status = result.passes ? '✓' : '✗';
                console.log(`${status} ${check.name}: ${result.ratio}:1 (要求: ≥${result.minRequired}:1) - ${result.level}`);
            });
        }
    }
})();

