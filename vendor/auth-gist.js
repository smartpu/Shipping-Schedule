/**
 * 基于 GitHub Gist 的用户验证和访问记录系统
 * 
 * 功能：
 * 1. 从 Vercel API 读取用户白名单（存储在 Gist）
 * 2. 验证用户信息是否在白名单中
 * 3. 未登录时禁用所有链接
 * 4. 登录后将访问记录保存到 Gist（通过 Vercel API）
 * 
 * 配置说明：
 * 1. 在 Vercel 环境变量中配置 GitHub Token 和 Gist ID
 * 2. 在 vendor/auth-gist.js 中设置 API_URL
 */

(function() {
    'use strict';

    // ========== 配置区域 ==========
    // Vercel Serverless Function 地址
    // 部署后更新为：https://your-project.vercel.app/api/gist-storage
    const GIST_API_URL = 'https://shipping-schedule.vercel.app/api/gist-storage';
    
    // 存储键名
    const AUTH_STORAGE_KEY = 'shipping_tools_auth';
    const AUTH_EXPIRY_DAYS = 7;
    // ==============================

    // 用户白名单（从 Gist 加载）
    let userWhitelist = [];

    /**
     * 带超时的 fetch 请求
     */
    async function fetchWithTimeout(url, options, timeout = 8000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`请求超时 (${timeout}ms)`);
            }
            throw error;
        }
    }

    /**
     * 带重试的请求函数
     */
    async function fetchWithRetry(url, options, retries = 2) {
        let lastError;
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetchWithTimeout(url, options);
                return response;
            } catch (error) {
                lastError = error;
                if (i < retries) {
                    const delay = Math.min(1000 * Math.pow(2, i), 5000);
                    console.warn(`[Auth] 请求失败，${delay}ms 后重试 (${i + 1}/${retries}):`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }

    /**
     * 从 Gist 加载用户白名单
     */
    async function loadWhitelist() {
        const url = `${GIST_API_URL}?type=whitelist`;
        console.log(`[Auth] 加载白名单: ${url}`);
        
        try {
            const response = await fetchWithRetry(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`加载白名单失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.warn('[Auth] 白名单数据格式错误，期望数组');
                userWhitelist = [];
                return [];
            }
            
            userWhitelist = data.map(user => ({
                name: (user.name || '').trim().toLowerCase(),
                phone: (user.phone || '').trim(),
                email: (user.email || '').trim().toLowerCase()
            }));
            
            console.log(`[Auth] 白名单加载成功，共 ${userWhitelist.length} 个用户`);
            return userWhitelist;
        } catch (error) {
            console.error('[Auth] 加载白名单失败:', {
                message: error.message,
                url: url
            });
            userWhitelist = [];
            return [];
        }
    }

    /**
     * 检查用户是否在白名单中
     */
    function isUserInWhitelist(name, phone, email) {
        if (userWhitelist.length === 0) {
            console.warn('白名单未加载，拒绝访问');
            return false;
        }

        const normalizedName = (name || '').trim().toLowerCase();
        const normalizedPhone = (phone || '').trim();
        const normalizedEmail = (email || '').trim().toLowerCase();

        return userWhitelist.some(user => {
            const phoneMatch = user.phone === normalizedPhone;
            const emailMatch = user.email === normalizedEmail;
            const nameMatch = !user.name || 
                            !normalizedName || 
                            user.name === normalizedName ||
                            normalizedName.includes(user.name) ||
                            user.name.includes(normalizedName);

            return phoneMatch && emailMatch && nameMatch;
        });
    }

    /**
     * 检查用户是否已通过验证
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
     */
    function saveAuth(name, phone, email) {
        const expiry = Date.now() + (AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const authData = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            timestamp: Date.now(),
            expiry: expiry,
            verified: true
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    }

    /**
     * 保存访问记录到 Gist
     */
    async function saveLogToGist(logEntry) {
        console.log('[Auth] 保存访问记录:', logEntry);
        
        try {
            const response = await fetchWithRetry(GIST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'addLog',
                    data: { logEntry }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`保存失败: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('[Auth] 访问记录保存成功:', result);
            return true;
        } catch (error) {
            console.error('[Auth] 保存访问记录失败:', {
                message: error.message,
                logEntry: logEntry
            });
            return false;
        }
    }

    /**
     * 禁用所有链接（未登录状态）
     */
    function disableAllLinks() {
        if (!document.getElementById('auth-lock-styles')) {
            const style = document.createElement('style');
            style.id = 'auth-lock-styles';
            style.textContent = `
                body.auth-locked a,
                body.auth-locked button:not(.auth-submit-btn):not(.send-code-btn),
                body.auth-locked [onclick],
                body.auth-locked input[type="button"],
                body.auth-locked input[type="submit"] {
                    pointer-events: none !important;
                    opacity: 0.5 !important;
                    cursor: not-allowed !important;
                }
                body.auth-locked a::after {
                    content: " (需要登录)";
                    font-size: 12px;
                    color: #999;
                }
            `;
            document.head.appendChild(style);
        }
        document.body.classList.add('auth-locked');
    }

    /**
     * 启用所有链接（已登录状态）
     */
    function enableAllLinks() {
        document.body.classList.remove('auth-locked');
    }

    /**
     * 初始化 Gist 验证系统
     */
    async function initGistAuth(pageName) {
        const authOverlay = document.getElementById('authOverlay');
        const authForm = document.getElementById('authForm');
        const nameInput = document.getElementById('userName');
        const phoneInput = document.getElementById('userPhone');
        const emailInput = document.getElementById('userEmail');
        const nameError = document.getElementById('nameError');
        const phoneError = document.getElementById('phoneError');
        const emailError = document.getElementById('emailError');

        if (!authOverlay || !authForm) {
            console.warn('验证模态框元素未找到');
            return;
        }

        // 先禁用所有链接
        disableAllLinks();

        // 加载白名单
        await loadWhitelist();

        // 如果已通过验证，直接启用链接
        if (checkAuth()) {
            authOverlay.classList.add('hidden');
            enableAllLinks();
            // 记录访问
            const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
            const logEntry = {
                page: pageName,
                name: authData.name || '未知',
                phone: authData.phone || '未知',
                email: authData.email || '未知',
                timestamp: Date.now(),
                date: new Date().toLocaleString('zh-CN')
            };
            saveLogToGist(logEntry);
            return;
        }

        // 显示验证模态框
        authOverlay.classList.remove('hidden');
        if (nameInput) nameInput.focus();

        // 表单提交处理
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = nameInput ? nameInput.value.trim() : '';
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

            // 验证姓名
            if (!name) {
                if (nameError) {
                    nameError.textContent = '请输入您的姓名';
                    nameError.classList.add('show');
                }
                if (nameInput) nameInput.focus();
                return;
            } else {
                if (nameError) nameError.classList.remove('show');
            }

            // 验证手机号
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phone || !phoneRegex.test(phone)) {
                if (phoneError) {
                    phoneError.textContent = '请输入有效的手机号';
                    phoneError.classList.add('show');
                }
                if (phoneInput) phoneInput.focus();
                return;
            } else {
                if (phoneError) phoneError.classList.remove('show');
            }

            // 验证邮箱
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                if (emailError) {
                    emailError.textContent = '请输入有效的邮箱地址';
                    emailError.classList.add('show');
                }
                if (emailInput) emailInput.focus();
                return;
            } else {
                if (emailError) emailError.classList.remove('show');
            }

            // 检查是否在白名单中
            if (!isUserInWhitelist(name, phone, email)) {
                if (emailError) {
                    emailError.textContent = '您不在访问白名单中，请联系管理员';
                    emailError.classList.add('show');
                }
                if (phoneError) {
                    phoneError.textContent = '手机号或邮箱不匹配';
                    phoneError.classList.add('show');
                }
                console.warn('用户不在白名单中');
                return;
            }

            // 验证通过，保存信息并启用链接
            saveAuth(name, phone, email);
            
            // 保存访问记录到 Gist
            const logEntry = {
                page: pageName,
                name: name,
                phone: phone,
                email: email,
                timestamp: Date.now(),
                date: new Date().toLocaleString('zh-CN')
            };
            await saveLogToGist(logEntry);

            authOverlay.classList.add('hidden');
            enableAllLinks();

            // 触发登录成功事件
            if (window.onGistAuthSuccess) {
                window.onGistAuthSuccess({ name, phone, email });
            }
        });

        // 实时验证提示
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (nameInput.value.trim() && nameError) {
                    nameError.classList.remove('show');
                }
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                const phone = phoneInput.value.trim();
                if (phone && /^1[3-9]\d{9}$/.test(phone) && phoneError) {
                    phoneError.classList.remove('show');
                }
            });
        }

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                const email = emailInput.value.trim();
                if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && emailError) {
                    emailError.classList.remove('show');
                }
            });
        }
    }

    // 导出到全局
    window.initGistAuth = initGistAuth;
    window.checkAuth = checkAuth;
    window.enableAllLinks = enableAllLinks;
    window.disableAllLinks = disableAllLinks;
    window.saveLogToGist = saveLogToGist;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const pageName = document.body.getAttribute('data-page') || 
                           window.location.pathname.split('/').pop() || 
                           'unknown';
            initGistAuth(pageName);
        });
    } else {
        const pageName = document.body.getAttribute('data-page') || 
                       window.location.pathname.split('/').pop() || 
                       'unknown';
        initGistAuth(pageName);
    }
})();

