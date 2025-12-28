/**
 * 周别处理工具函数
 * 
 * 从 market-analysis-utils.js 拆分出来的周别处理相关函数
 * 包含：周别文本解析、周别代码获取、周别范围计算等
 * 
 * 依赖：
 * - 无外部依赖（自包含）
 * 
 * 所有函数已导出到全局 window 对象
 */

(function() {
    'use strict';

    // ============================================
    // 周别处理函数
    // ============================================

    /**
     * 解析周别文本
     * @param {string} weekText - 周别文本（如"2025年第47周"、"202547"、"2025-47"等）
     * @returns {string|null} 周别代码（如"202547"），解析失败返回null
     */
    function parseWeekText(weekText) {
        if (!weekText) return null;
        const text = String(weekText).trim();
        
        // 尝试匹配"2025年第47周"格式
        const match1 = text.match(/(\d{4})年[第]?(\d{1,2})周/);
        if (match1) {
            const year = parseInt(match1[1]);
            const week = parseInt(match1[2]);
            return String(year) + String(week).padStart(2, '0');
        }
        
        // 尝试匹配"202547"格式（已经是目标格式）
        const match2 = text.match(/^(\d{4})(\d{2})$/);
        if (match2) {
            return text;
        }
        
        // 尝试匹配"2025-47"或"2025/47"格式
        const match3 = text.match(/(\d{4})[-/](\d{1,2})/);
        if (match3) {
            const year = parseInt(match3[1]);
            const week = parseInt(match3[2]);
            return String(year) + String(week).padStart(2, '0');
        }
        
        return null;
    }

    /**
     * 获取当前周的周别代码
     * @returns {string} 周别代码（如"202547"）
     */
    function getCurrentWeekCode() {
        const today = new Date();
        const year = today.getFullYear();
        const weekNo = getWeekNumber(today);
        return String(year) + String(weekNo).padStart(2, '0');
    }

    /**
     * 检查两个周别是否加起来正好是7天（需要合并）
     * @param {string} weekCode1 - 第一个周别代码（如"202553"）
     * @param {string} weekCode2 - 第二个周别代码（如"202601"）
     * @returns {boolean} 如果两个周别加起来正好是7天，返回true
     */
    function shouldMergeWeeks(weekCode1, weekCode2) {
        const range1 = getWeekDateRange(weekCode1);
        const range2 = getWeekDateRange(weekCode2);
        
        // 解析日期字符串（格式：YYYY/MM/DD）
        const parseDateStr = (dateStr) => {
            const parts = dateStr.split('/');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        };
        
        const week1Sunday = parseDateStr(range1.sunday);
        const week1Saturday = parseDateStr(range1.saturday);
        const week2Sunday = parseDateStr(range2.sunday);
        const week2Saturday = parseDateStr(range2.saturday);
        
        // 计算两个周别覆盖的总天数
        const totalDays = Math.floor((week2Saturday - week1Sunday) / (1000 * 60 * 60 * 24)) + 1;
        
        // 如果总天数正好是7天，且week1的周六和week2的周日是连续的，说明需要合并
        if (totalDays === 7) {
            // 检查week1的周六和week2的周日是否连续（相差1天）
            const daysBetween = Math.floor((week2Sunday - week1Saturday) / (1000 * 60 * 60 * 24));
            if (daysBetween === 1) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 获取当周+未来N周
     * 如果检测到需要合并的周别，会跳过被合并的周别，继续获取下一周
     * @param {number} weekCount - 总周数（默认5，即当周+未来4周）
     * @returns {string[]} 周别代码数组
     */
    function getWeekRange(weekCount = 5) {
        const weeks = [];
        const currentWeekCode = getCurrentWeekCode();
        
        // 解析当前周
        const currentYear = parseInt(currentWeekCode.substring(0, 4));
        const currentWeekNo = parseInt(currentWeekCode.substring(4));
        
        // 生成当周+未来N周
        let skipNext = false; // 标记是否跳过下一周（因为被合并了）
        for (let i = 0; weeks.length < weekCount; i++) {
            let year = currentYear;
            let weekNo = currentWeekNo + i;
            
            // 处理跨年：如果周数超过53，则进入下一年
            if (weekNo > 53) {
                year = year + 1;
                weekNo = weekNo - 53;
            }
            
            const weekStr = String(year) + String(weekNo).padStart(2, '0');
            
            // 如果上一周需要与当前周合并，跳过当前周
            if (skipNext) {
                skipNext = false;
                continue;
            }
            
            weeks.push(weekStr);
            
            // 检查当前周是否需要与下一周合并
            if (weeks.length < weekCount) {
                let nextYear = year;
                let nextWeekNo = weekNo + 1;
                if (nextWeekNo > 53) {
                    nextYear = year + 1;
                    nextWeekNo = nextWeekNo - 53;
                }
                const nextWeekStr = String(nextYear) + String(nextWeekNo).padStart(2, '0');
                
                if (shouldMergeWeeks(weekStr, nextWeekStr)) {
                    skipNext = true; // 标记下一周需要跳过
                }
            }
        }
        
        return weeks;
    }

    /**
     * 获取周数（周日到周六为一周）
     * @param {Date} date - 日期对象
     * @returns {number} 周数（1-53）
     */
    function getWeekNumber(date) {
        const d = new Date(date);
        // 将日期调整到该周的周日（周日是0，周六是6）
        const dayOfWeek = d.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const sunday = new Date(d);
        sunday.setDate(d.getDate() - dayOfWeek); // 调整到该周的周日
        
        // 计算该周日所在年份的1月1日
        const yearStart = new Date(sunday.getFullYear(), 0, 1);
        // 找到1月1日所在周的周日
        const yearStartDay = yearStart.getDay();
        const yearStartSunday = new Date(yearStart);
        yearStartSunday.setDate(yearStart.getDate() - yearStartDay);
        
        // 计算周数（从1月1日所在周的周日开始计算）
        const diffTime = sunday - yearStartSunday;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weekNo = Math.floor(diffDays / 7) + 1;
        
        // 处理跨年情况
        if (weekNo < 1) {
            // 如果周数小于1，说明是上一年的最后几周
            const prevYear = new Date(sunday.getFullYear() - 1, 11, 31);
            return getWeekNumber(prevYear);
        }
        
        // 如果周数超过52/53，可能需要调整年份
        if (weekNo > 53) {
            return 1; // 下一年的第一周
        }
        
        return weekNo;
    }

    /**
     * 保留ISO周数函数用于兼容（但实际使用getWeekNumber）
     * @param {Date} date - 日期对象
     * @returns {number} 周数
     */
    function getISOWeek(date) {
        return getWeekNumber(date);
    }

    /**
     * 根据周别代码（如202547）获取该周的周日到周六日期范围
     * @param {string} weekCode - 周别代码（如"202547"）
     * @returns {Object} 包含sunday、saturday和range的对象
     */
    function getWeekDateRange(weekCode) {
        const year = parseInt(weekCode.substring(0, 4));
        const weekNo = parseInt(weekCode.substring(4));
        
        // 计算该年1月1日
        const yearStart = new Date(year, 0, 1);
        // 找到1月1日所在周的周日
        const yearStartDay = yearStart.getDay();
        const yearStartSunday = new Date(yearStart);
        yearStartSunday.setDate(yearStart.getDate() - yearStartDay);
        
        // 计算目标周的周日（第weekNo周的周日）
        const targetSunday = new Date(yearStartSunday);
        targetSunday.setDate(yearStartSunday.getDate() + (weekNo - 1) * 7);
        
        // 计算该周的周六
        const targetSaturday = new Date(targetSunday);
        targetSaturday.setDate(targetSunday.getDate() + 6);
        
        // 格式化日期为 YYYY/MM/DD
        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
        
        return {
            sunday: formatDate(targetSunday),
            saturday: formatDate(targetSaturday),
            range: `${formatDate(targetSunday)}~${formatDate(targetSaturday)}`
        };
    }

    // ============================================
    // 导出函数到全局
    // ============================================
    // 注意：week-utils.js 已经包含了 parseWeekText, getCurrentWeekCode, getWeekDateRange, getWeekNumber, getISOWeek
    // 这里只导出 week-utils.js 中没有的函数，避免覆盖已有实现
    if (typeof window !== 'undefined') {
        // 只导出 week-utils.js 中没有的函数
        if (!window.shouldMergeWeeks) window.shouldMergeWeeks = shouldMergeWeeks;
        if (!window.getWeekRange) window.getWeekRange = getWeekRange;
        
        // 如果 week-utils.js 未加载，则导出所有函数（降级方案）
        if (!window.parseWeekText) window.parseWeekText = parseWeekText;
        if (!window.getCurrentWeekCode) window.getCurrentWeekCode = getCurrentWeekCode;
        if (!window.getWeekNumber) window.getWeekNumber = getWeekNumber;
        if (!window.getISOWeek) window.getISOWeek = getISOWeek;
        if (!window.getWeekDateRange) window.getWeekDateRange = getWeekDateRange;
    }

})();

