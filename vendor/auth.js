/**
 * 统一的用户验证系统
 * 用于所有需要用户身份验证的页面（姓名+手机号+邮箱）
 * 
 * 使用方法：
 * 1. 在HTML的<head>中引入：<link rel="stylesheet" href="auth.css">
 * 2. 在HTML的<body>开始处添加验证模态框HTML结构
 * 3. 在HTML的</body>前引入：<script src="auth.js"></script>
 * 4. 调用 initUserAuth(pageName) 初始化验证，pageName为当前页面文件名
 */

(function() {
    'use strict';

    // 配置常量
    const AUTH_STORAGE_KEY = 'shipping_tools_auth';
    const AUTH_EXPIRY_DAYS = 7;
    const ACCESS_LOG_KEY = 'shipping_tools_access_log';
    const MAX_LOG_ENTRIES = 100;

    /**
     * 检查用户是否已通过验证
     * @returns {boolean} 是否已通过验证
     */
    function checkAuth() {
        try {
            const authData = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!authData) return false;
            const data = JSON.parse(authData);
            const now = Date.now();
            if (data.expiry && now > data.expiry) {
                localStorage.removeItem(AUTH_STORAGE_KEY);
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 保存用户验证信息
     * @param {string} name - 姓名
     * @param {string} phone - 手机号
     * @param {string} email - 邮箱
     */
    function saveAuth(name, phone, email) {
        const expiry = Date.now() + (AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const authData = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            timestamp: Date.now(),
            expiry: expiry
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    }

    /**
     * 记录页面访问日志
     * @param {string} pageName - 页面名称
     */
    function logAccess(pageName) {
        try {
            const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
            const logEntry = {
                page: pageName,
                name: authData.name || '未知',
                phone: authData.phone || '未知',
                email: authData.email || '未知',
                timestamp: Date.now(),
                date: new Date().toLocaleString('zh-CN')
            };
            
            // 本地存储（保留原有功能）
            let logs = [];
            try {
                const existingLogs = localStorage.getItem(ACCESS_LOG_KEY);
                if (existingLogs) logs = JSON.parse(existingLogs);
            } catch (e) {
                logs = [];
            }
            logs.unshift(logEntry);
            if (logs.length > MAX_LOG_ENTRIES) logs = logs.slice(0, MAX_LOG_ENTRIES);
            localStorage.setItem(ACCESS_LOG_KEY, JSON.stringify(logs));
            
            // 发送到服务器（如果已配置）
            if (window.sendLogToServer) {
                window.sendLogToServer(logEntry);
            }
        } catch (e) {
            console.warn('记录访问日志失败', e);
        }
    }

    /**
     * 初始化用户验证系统
     * @param {string} pageName - 当前页面文件名，用于记录访问日志
     */
    function initUserAuth(pageName) {
        const authOverlay = document.getElementById('authOverlay');
        const authForm = document.getElementById('authForm');
        const nameInput = document.getElementById('userName');
        const phoneInput = document.getElementById('userPhone');
        const emailInput = document.getElementById('userEmail');
        const nameError = document.getElementById('nameError');
        const phoneError = document.getElementById('phoneError');
        const emailError = document.getElementById('emailError');

        if (!authOverlay || !authForm) {
            console.warn('验证模态框元素未找到，请确保HTML中包含验证模态框结构');
            return;
        }

        // 如果已通过验证，直接隐藏模态框
        if (checkAuth()) {
            authOverlay.classList.add('hidden');
            document.body.classList.remove('auth-locked');
            if (pageName) logAccess(pageName);
            return;
        }

        // 显示验证模态框
        document.body.classList.add('auth-locked');
        authOverlay.classList.remove('hidden');
        if (nameInput) nameInput.focus();

        // 表单提交处理
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            
            // 验证姓名
            if (!name) {
                nameError.classList.add('show');
                nameInput.focus();
                return;
            } else {
                nameError.classList.remove('show');
            }

            // 验证手机号
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phone || !phoneRegex.test(phone)) {
                phoneError.classList.add('show');
                phoneInput.focus();
                return;
            } else {
                phoneError.classList.remove('show');
            }

            // 验证邮箱
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                emailError.classList.add('show');
                emailInput.focus();
                return;
            } else {
                emailError.classList.remove('show');
            }

            // 验证通过，保存信息并隐藏模态框
            saveAuth(name, phone, email);
            if (pageName) logAccess(pageName);
            authOverlay.classList.add('hidden');
            document.body.classList.remove('auth-locked');
        });

        // 实时验证提示
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (nameInput.value.trim()) nameError.classList.remove('show');
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                const phone = phoneInput.value.trim();
                if (phone && /^1[3-9]\d{9}$/.test(phone)) {
                    phoneError.classList.remove('show');
                }
            });
        }

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                const email = emailInput.value.trim();
                if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    emailError.classList.remove('show');
                }
            });
        }
    }

    // 导出初始化函数到全局作用域
    window.initUserAuth = initUserAuth;

    // 如果DOM已加载，自动初始化（需要页面提供pageName）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // 从data-page属性获取页面名称
            const pageName = document.body.getAttribute('data-page') || 
                           document.querySelector('script[data-page]')?.getAttribute('data-page') ||
                           window.location.pathname.split('/').pop() || 
                           'unknown';
            initUserAuth(pageName);
        });
    } else {
        const pageName = document.body.getAttribute('data-page') || 
                       document.querySelector('script[data-page]')?.getAttribute('data-page') ||
                       window.location.pathname.split('/').pop() || 
                       'unknown';
        initUserAuth(pageName);
    }
})();

