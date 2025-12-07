/**
 * 统一的密码验证系统
 * 用于需要密码验证的页面
 * 
 * 使用方法：
 * 1. 在HTML的<head>中引入：<link rel="stylesheet" href="auth.css">
 * 2. 在HTML的<body>开始处添加密码验证模态框HTML结构
 * 3. 在HTML的</body>前引入：<script src="auth-password.js"></script>
 * 4. 调用 initPasswordAuth(correctPassword, onSuccess) 初始化验证
 *    - correctPassword: 正确的密码
 *    - onSuccess: 验证成功后的回调函数（可选）
 */

(function() {
    'use strict';

    // ========== 调试函数降级处理 ==========
    // 如果 debug-utils.js 还未加载，提供降级函数
    const debugLog = typeof window !== 'undefined' && window.debugLog 
        ? window.debugLog 
        : function() {}; // 静默忽略，避免错误
    const debugWarn = typeof window !== 'undefined' && window.debugWarn 
        ? window.debugWarn 
        : function() {}; // 静默忽略，避免错误
    const debugError = typeof window !== 'undefined' && window.debugError 
        ? window.debugError 
        : function() {}; // 静默忽略，避免错误
    // ====================================

    // 配置常量
    const PASSWORD_STORAGE_KEY = 'monitor_view_access_password';
    const SESSION_EXPIRY_HOURS = 24;

    /**
     * 检查密码是否已验证
     * @param {string} storageKey - 存储键名（可选，用于不同页面的不同密码）
     * @returns {boolean} 是否已通过验证
     */
    function checkPassword(storageKey) {
        const key = storageKey || PASSWORD_STORAGE_KEY;
        try {
            const passwordData = sessionStorage.getItem(key);
            if (!passwordData) return false;
            const data = JSON.parse(passwordData);
            const now = Date.now();
            // 检查是否在有效期内
            if (data.timestamp && (now - data.timestamp) > (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)) {
                sessionStorage.removeItem(key);
                return false;
            }
            return data.verified === true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 保存密码验证状态
     * @param {string} storageKey - 存储键名（可选）
     */
    function savePasswordVerification(storageKey) {
        const key = storageKey || PASSWORD_STORAGE_KEY;
        const passwordData = {
            verified: true,
            timestamp: Date.now()
        };
        sessionStorage.setItem(key, JSON.stringify(passwordData));
    }

    /**
     * 初始化密码验证系统
     * @param {string} correctPassword - 正确的密码
     * @param {Function} onSuccess - 验证成功后的回调函数（可选）
     * @param {string} storageKey - 存储键名（可选，用于不同页面的不同密码）
     */
    function initPasswordAuth(correctPassword, onSuccess, storageKey) {
        if (!correctPassword) {
            debugError('密码验证系统：未提供正确密码');
            return;
        }

        const key = storageKey || PASSWORD_STORAGE_KEY;
        const authOverlay = document.getElementById('passwordAuthOverlay');
        const authForm = document.getElementById('passwordAuthForm');
        const passwordInput = document.getElementById('passwordInput');
        const passwordError = document.getElementById('passwordError');

        if (!authOverlay || !authForm) {
            debugWarn('密码验证模态框元素未找到，请确保HTML中包含密码验证模态框结构');
            return;
        }

        // 如果已通过验证，直接隐藏模态框
        if (checkPassword(key)) {
            authOverlay.classList.add('hidden');
            document.body.classList.remove('auth-locked');
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess();
            }
            return;
        }

        // 显示验证模态框
        document.body.classList.add('auth-locked');
        authOverlay.classList.remove('hidden');
        if (passwordInput) passwordInput.focus();

        // 表单提交处理
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = passwordInput.value.trim();
            
            if (password === correctPassword) {
                passwordError.classList.remove('show');
                savePasswordVerification(key);
                authOverlay.classList.add('hidden');
                document.body.classList.remove('auth-locked');
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess();
                }
            } else {
                passwordError.classList.add('show');
                passwordInput.value = '';
                passwordInput.focus();
            }
        });

        // 实时验证提示
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                if (passwordInput.value.trim()) {
                    passwordError.classList.remove('show');
                }
            });
        }
    }

    // 导出初始化函数到全局作用域
    window.initPasswordAuth = initPasswordAuth;
    window.checkPassword = checkPassword;
})();

