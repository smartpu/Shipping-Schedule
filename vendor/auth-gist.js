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

    // ========== 配置区域 ==========
    // Vercel Serverless Function 地址
    // 使用相对路径，自动适配当前域名（支持自定义域名）
    const GIST_API_URL = '/api/gist-storage';
    
    // 存储键名
    const AUTH_STORAGE_KEY = 'shipping_tools_auth';
    const AUTH_EXPIRY_DAYS = 7;
    
    // 检测是否为本地测试模式（file:// 协议或 URL 参数 localtest=true）
    const isLocalTestMode = window.location.protocol === 'file:' || 
                           new URLSearchParams(window.location.search).get('localtest') === 'true';
    
    // 本地测试用户配置（允许跳过登录验证）
    const LOCAL_TEST_USER = {
        name: 'smartpu',
        email: 'smartpu@evergreen-shipping.cn',
        phone: '18653202580',
        password: '18653202580'
    };
    
    /**
     * 检查是否为本地测试用户
     * @param {Object} authData - 认证数据
     * @returns {boolean} 是否为本地测试用户
     */
    function isLocalTestUser(authData) {
        if (!authData) return false;
        
        const nameMatch = (authData.name || '').trim().toLowerCase() === LOCAL_TEST_USER.name.toLowerCase();
        const emailMatch = (authData.email || '').trim().toLowerCase() === LOCAL_TEST_USER.email.toLowerCase();
        // 支持 phone 或 password 字段（index.html 使用 password 作为 phone）
        const phoneOrPassword = (authData.phone || authData.password || '').trim();
        const phoneMatch = phoneOrPassword === LOCAL_TEST_USER.phone;
        
        return nameMatch && emailMatch && phoneMatch;
    }
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
                    debugWarn(`[Auth] 请求失败，${delay}ms 后重试 (${i + 1}/${retries}):`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }

    /**
     * 从 Gist 验证用户是否在白名单中（服务端验证，不返回所有用户信息）
     * @param {string} name - 用户名
     * @param {string} phone - 手机号/密码
     * @param {string} email - 邮箱
     * @returns {Promise<Object|null>} 匹配的用户信息，未匹配返回 null
     */
    async function verifyUserInWhitelist(name, phone, email) {
        // 本地测试模式：跳过验证
        if (isLocalTestMode) {
            debugLog('[Auth] 本地测试模式：跳过白名单验证');
            return null;
        }
        
        const normalizedName = (name || '').trim();
        const normalizedPhone = (phone || '').trim();
        const normalizedEmail = (email || '').trim();
        
        const url = `${GIST_API_URL}?type=whitelist&name=${encodeURIComponent(normalizedName)}&phone=${encodeURIComponent(normalizedPhone)}&email=${encodeURIComponent(normalizedEmail)}`;
        debugLog(`[Auth] 验证用户是否在白名单中: ${normalizedName}`);
        console.log('[Auth] 开始验证用户:', {
            name: normalizedName,
            phone: normalizedPhone ? '***' : 'missing',
            email: normalizedEmail,
            url: url
        });
        
        try {
            const response = await fetchWithRetry(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('[Auth] API 响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`验证失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('[Auth] API 返回数据:', data);
            
            // 新格式：返回 { authorized: true, user: {...} } 或 { authorized: false }
            if (data && typeof data === 'object' && 'authorized' in data) {
                if (data.authorized && data.user) {
                    // 将匹配的用户信息添加到白名单缓存中（用于后续权限检查）
                    const userInfo = {
                        name: normalizedName.toLowerCase(),
                        phone: normalizedPhone,
                        email: normalizedEmail.toLowerCase(),
                        level: data.user.level || 'user',
                        groups: data.user.groups || []
                    };
                    
                    // 如果白名单中没有该用户，添加到缓存
                    const existingIndex = userWhitelist.findIndex(u => 
                        u.phone === normalizedPhone && u.email === normalizedEmail.toLowerCase()
                    );
                    if (existingIndex === -1) {
                        userWhitelist.push(userInfo);
                    } else {
                        userWhitelist[existingIndex] = userInfo;
                    }
                    
                    debugLog(`[Auth] 用户验证成功: ${normalizedName}`);
                    console.log('[Auth] 用户验证成功:', {
                        name: data.user.name,
                        level: data.user.level,
                        groups: data.user.groups
                    });
                    return userInfo;
                } else {
                    const reason = data.message || '未知原因';
                    debugWarn(`[Auth] 用户不在白名单中: ${normalizedName}, 原因: ${reason}`);
                    console.warn('[Auth] 用户不在白名单中:', {
                        name: normalizedName,
                        reason: reason,
                        response: data
                    });
                    return null;
                }
            }
            
            // 旧格式兼容：返回数组（向后兼容）
            if (Array.isArray(data)) {
                const matchedUser = data.find(user => {
                    const userPhone = (user.phone || '').trim();
                    const userEmail = (user.email || '').trim().toLowerCase();
                    const userName = (user.name || '').trim().toLowerCase();
                    
                    return userPhone === normalizedPhone && 
                           userEmail === normalizedEmail.toLowerCase() && 
                           (!userName || userName === normalizedName.toLowerCase());
                });
                
                if (matchedUser) {
                    const userInfo = {
                        name: normalizedName.toLowerCase(),
                        phone: normalizedPhone,
                        email: normalizedEmail.toLowerCase(),
                        level: matchedUser.level || 'user',
                        groups: matchedUser.groups || []
                    };
                    
                    const existingIndex = userWhitelist.findIndex(u => 
                        u.phone === normalizedPhone && u.email === normalizedEmail.toLowerCase()
                    );
                    if (existingIndex === -1) {
                        userWhitelist.push(userInfo);
                    } else {
                        userWhitelist[existingIndex] = userInfo;
                    }
                    
                    return userInfo;
                }
            }
            
            return null;
        } catch (error) {
            debugError('[Auth] 验证用户失败:', {
                message: error.message,
                url: url,
                name: normalizedName,
                phone: normalizedPhone ? '***' : 'missing',
                email: normalizedEmail
            });
            console.error('[Auth] 验证用户失败详情:', {
                error: error.message,
                stack: error.stack,
                url: url,
                name: normalizedName,
                phone: normalizedPhone ? '***' : 'missing',
                email: normalizedEmail
            });
            // 在控制台显示明显的错误提示
            console.error('%c[Auth] 验证失败 - 请检查上述错误信息', 'color: red; font-size: 14px; font-weight: bold;');
            return null;
        }
    }

    /**
     * 从 Gist 加载用户白名单（已废弃，改为使用 verifyUserInWhitelist）
     * 保留此函数以保持向后兼容，但实际使用服务端验证
     */
    async function loadWhitelist() {
        // 本地测试模式：跳过白名单加载
        if (isLocalTestMode) {
            debugLog('[Auth] 本地测试模式：跳过白名单加载');
            userWhitelist = [];
            return [];
        }
        
        // 不再加载所有用户，白名单验证改为按需验证
        // 触发白名单加载完成事件（保持兼容性）
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('whitelistLoaded', {
                detail: { userCount: userWhitelist.length }
            });
            window.dispatchEvent(event);
        }
        
        return userWhitelist;
    }

    /**
     * 检查用户是否在白名单中（同步函数，用于降级处理）
     * 注意：此函数只检查本地缓存，如果缓存为空，返回 false
     * 建议使用 verifyUserInWhitelist 进行服务端验证
     */
    function isUserInWhitelist(name, phone, email) {
        // 检查是否为本地测试用户
        const normalizedName = (name || '').trim().toLowerCase();
        const normalizedPhone = (phone || '').trim();
        const normalizedEmail = (email || '').trim().toLowerCase();
        
        const isTestUser = normalizedName === LOCAL_TEST_USER.name.toLowerCase() &&
                          normalizedEmail === LOCAL_TEST_USER.email.toLowerCase() &&
                          normalizedPhone === LOCAL_TEST_USER.phone;
        
        if (isTestUser) {
            debugLog('[Auth] 检测到本地测试用户，允许访问');
            return true;
        }
        
        // 本地测试模式（file:// 协议）：允许所有用户访问
        if (isLocalTestMode && window.location.protocol === 'file:') {
            debugLog('[Auth] 本地文件系统模式：允许访问');
            return true;
        }
        
        // 如果本地缓存为空，返回 false（需要调用 verifyUserInWhitelist 进行服务端验证）
        if (userWhitelist.length === 0) {
            debugWarn('[Auth] 本地白名单缓存为空，建议使用 verifyUserInWhitelist 进行服务端验证');
            return false;
        }

        return userWhitelist.some(user => {
            // 精确匹配：name/phone/email 必须完全匹配
            const phoneMatch = user.phone === normalizedPhone;
            const emailMatch = user.email === normalizedEmail;
            const nameMatch = !user.name || 
                            !normalizedName || 
                            user.name.toLowerCase() === normalizedName;

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
        // 本地测试模式：跳过记录保存
        if (isLocalTestMode) {
            debugLog('[Auth] 本地测试模式：跳过访问记录保存');
            return true;
        }
        
        debugLog('[Auth] 保存访问记录:', logEntry);
        console.log('[Auth] 开始保存访问记录到 Gist:', {
            apiUrl: GIST_API_URL,
            logEntry: logEntry,
            timestamp: new Date().toISOString()
        });
        
        try {
            const requestBody = {
                action: 'addLog',
                data: { logEntry }
            };
            
            console.log('[Auth] 发送请求到 API:', {
                url: GIST_API_URL,
                method: 'POST',
                body: requestBody
            });
            
            const response = await fetchWithRetry(GIST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[Auth] API 响应状态:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `保存失败: ${response.status} ${response.statusText}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error) {
                        errorMessage += ` - ${errorJson.error}`;
                    }
                    if (errorJson.message) {
                        errorMessage += ` (${errorJson.message})`;
                    }
                    console.error('[Auth] API 返回错误:', errorJson);
                } catch (e) {
                    errorMessage += ` - ${errorText.substring(0, 200)}`;
                    console.error('[Auth] API 返回错误文本:', errorText.substring(0, 500));
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('[Auth] 访问记录保存成功:', result);
            debugLog('[Auth] 访问记录保存成功:', result);
            return true;
        } catch (error) {
            // 增强错误日志，包含更多诊断信息
            const errorInfo = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                logEntry: logEntry,
                apiUrl: GIST_API_URL,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                location: window.location.href
            };
            debugError('[Auth] 保存访问记录失败:', errorInfo);
            console.error('[Auth] 访问记录保存失败详情:', errorInfo);
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
     * 获取当前用户认证数据
     * @returns {Object|null} 用户认证数据，未登录返回 null
     */
    function getAuthData() {
        try {
            const authData = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!authData) return null;
            const data = JSON.parse(authData);
            const now = Date.now();
            if (data.expiry && now > data.expiry) {
                localStorage.removeItem(AUTH_STORAGE_KEY);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    /**
     * 从白名单中获取用户信息
     * @param {Object} authData - 认证数据
     * @returns {Object|null} 用户信息，未找到返回 null
     */
    function getUserFromWhitelist(authData) {
        if (!authData || userWhitelist.length === 0) return null;
        
        const normalizedName = (authData.name || '').trim().toLowerCase();
        // 注意：index.html 中 phone 字段是从 password 复制的，所以优先使用 phone，如果没有则使用 password
        const normalizedPhone = (authData.phone || authData.password || '').trim();
        const normalizedEmail = (authData.email || '').trim().toLowerCase();

        return userWhitelist.find(user => {
            // 精确匹配：name/phone/email 必须完全匹配
            // 注意：user.name 在 verifyUserInWhitelist 中已经被转换为小写
            const phoneMatch = user.phone === normalizedPhone;
            const emailMatch = user.email === normalizedEmail;
            // user.name 已经是小写，直接比较
            const nameMatch = !user.name || 
                            !normalizedName || 
                            user.name === normalizedName;

            return phoneMatch && emailMatch && nameMatch;
        }) || null;
    }

    /**
     * 等待白名单加载完成
     * @param {number} timeout - 超时时间（毫秒），默认 10000ms
     * @returns {Promise<boolean>} 是否加载成功
     */
    async function waitForWhitelist(timeout = 10000) {
        // 本地测试模式：直接返回 true
        if (isLocalTestMode) {
            return true;
        }
        
        // 如果已经加载，直接返回
        if (userWhitelist.length > 0) {
            return true;
        }
        
        // 如果正在加载，等待加载完成事件
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            // 先尝试立即加载
            loadWhitelist().then(() => {
                resolve(userWhitelist.length > 0);
            }).catch(() => {
                resolve(false);
            });
            
            // 监听加载完成事件（作为备用）
            const handler = () => {
                if (userWhitelist.length > 0) {
                    window.removeEventListener('whitelistLoaded', handler);
                    resolve(true);
                }
            };
            window.addEventListener('whitelistLoaded', handler);
            
            // 超时处理
            setTimeout(() => {
                window.removeEventListener('whitelistLoaded', handler);
                if (userWhitelist.length === 0) {
                    debugWarn('[Auth] 等待白名单加载超时');
                    resolve(false);
                }
            }, timeout);
        });
    }

    /**
     * 检查用户是否有权限访问指定工具组
     * @param {string} toolGroup - 工具组名称 (tools001, tools365, market, monitor, admin)
     * @param {boolean} waitForLoad - 是否等待白名单加载完成，默认 false（同步检查）
     * @returns {boolean|Promise<boolean>} 是否有权限（如果 waitForLoad=true，返回 Promise）
     */
    function hasPermission(toolGroup, waitForLoad = false) {
        // 本地测试模式：允许所有访问
        if (isLocalTestMode) {
            return waitForLoad ? Promise.resolve(true) : true;
        }

        const authData = getAuthData();
        if (!authData) {
            return waitForLoad ? Promise.resolve(false) : false;
        }
        
        // 检查是否为本地测试用户（即使不在白名单中，也允许访问）
        if (isLocalTestUser(authData)) {
            return waitForLoad ? Promise.resolve(true) : true;
        }
        
        // 如果白名单未加载
        if (userWhitelist.length === 0) {
            if (waitForLoad) {
                // 异步等待加载完成
                return waitForWhitelist().then((loaded) => {
                    if (!loaded) {
                        debugWarn('[Auth] 白名单未加载，无法检查权限');
                        return false;
                    }
                    return checkPermissionInternal(authData, toolGroup);
                });
            } else {
                debugWarn('[Auth] 白名单未加载，无法检查权限');
                return false;
            }
        }
        
        return waitForLoad ? Promise.resolve(checkPermissionInternal(authData, toolGroup)) : checkPermissionInternal(authData, toolGroup);
    }
    
    /**
     * 内部权限检查函数（假设白名单已加载）
     * @param {Object} authData - 认证数据
     * @param {string} toolGroup - 工具组名称
     * @returns {boolean} 是否有权限
     */
    function checkPermissionInternal(authData, toolGroup) {
        const user = getUserFromWhitelist(authData);
        if (!user) {
            debugWarn('[Auth] 用户不在白名单中，无法检查权限', {
                name: authData.name,
                email: authData.email,
                phone: authData.phone ? '***' : 'missing'
            });
            return false;
        }
        
        // 如果用户组为空或包含 '*'，表示全部权限
        if (!user.groups || user.groups.length === 0 || user.groups.includes('*')) {
            return true;
        }
        
        return user.groups.includes(toolGroup);
    }

    /**
     * 获取工具组名称（根据页面名称）
     * @param {string} pageName - 页面名称
     * @returns {string|null} 工具组名称
     */
    function getToolGroupFromPage(pageName) {
        if (!pageName) return null;
        
        const pageNameLower = pageName.toLowerCase();
        
        // 001 系列工具
        if (pageNameLower.includes('001-')) {
            return 'tools001';
        }
        
        // 365 系列工具
        if (pageNameLower.includes('365-')) {
            return 'tools365';
        }
        
        // Market 系列工具
        if (pageNameLower.includes('market-')) {
            return 'market';
        }
        
        // Monitor 系列工具
        if (pageNameLower.includes('monitor-')) {
            return 'monitor';
        }
        
        // Admin 系列工具
        if (pageNameLower.includes('admin-')) {
            return 'admin';
        }
        
        // Dashboard
        if (pageNameLower.includes('dashboard')) {
            return null; // Dashboard 不需要权限检查
        }
        
        return null;
    }

    /**
     * 更新用户组信息到 Gist
     * @param {string} userName - 用户名
     * @param {Array<string>} groups - 新的用户组列表
     * @returns {Promise<boolean>} 是否成功
     */
    async function updateUserGroups(userName, groups) {
        if (isLocalTestMode) {
            debugLog('[Auth] 本地测试模式：跳过用户组更新');
            return true;
        }

        try {
            // 加载当前白名单
            await loadWhitelist();
            
            // 更新用户组
            const userIndex = userWhitelist.findIndex(user => 
                user.name === userName.toLowerCase() || 
                user.name.includes(userName.toLowerCase()) ||
                userName.toLowerCase().includes(user.name)
            );
            
            if (userIndex === -1) {
                throw new Error(`用户 "${userName}" 未找到`);
            }
            
            userWhitelist[userIndex].groups = groups || [];
            
            // 保存到 Gist
            const response = await fetchWithRetry(GIST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateWhitelist',
                    data: { users: userWhitelist }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`更新失败: ${response.status} ${response.statusText} - ${errorText}`);
            }

            debugLog('[Auth] 用户组更新成功');
            return true;
        } catch (error) {
            debugError('[Auth] 更新用户组失败:', error);
            return false;
        }
    }

    /**
     * 批量更新多个用户的用户组
     * @param {Array<{name: string, groups: Array<string>}>} updates - 更新列表
     * @returns {Promise<boolean>} 是否成功
     */
    async function batchUpdateUserGroups(updates) {
        if (isLocalTestMode) {
            debugLog('[Auth] 本地测试模式：跳过批量用户组更新');
            return true;
        }

        try {
            // 加载当前白名单
            await loadWhitelist();
            
            // 批量更新
            updates.forEach(update => {
                const userIndex = userWhitelist.findIndex(user => 
                    user.name === update.name.toLowerCase() || 
                    user.name.includes(update.name.toLowerCase()) ||
                    update.name.toLowerCase().includes(user.name)
                );
                
                if (userIndex !== -1) {
                    userWhitelist[userIndex].groups = update.groups || [];
                }
            });
            
            // 保存到 Gist
            const response = await fetchWithRetry(GIST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateWhitelist',
                    data: { users: userWhitelist }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`批量更新失败: ${response.status} ${response.statusText} - ${errorText}`);
            }

            debugLog('[Auth] 批量用户组更新成功');
            return true;
        } catch (error) {
            debugError('[Auth] 批量更新用户组失败:', error);
            return false;
        }
    }

    /**
     * 检查页面访问权限并重定向
     * @param {string} pageName - 页面名称
     * @param {string} toolGroup - 工具组名称
     * @returns {Promise<boolean>} 是否有权限
     */
    async function checkPageAccess(pageName, toolGroup) {
        // 检查是否已登录
        const authData = getAuthData();
        
        // 检查是否为本地测试用户（允许跳过验证）
        const isTestUser = isLocalTestUser(authData);
        
        if (!authData) {
            // 未登录，重定向到 index.html（除非当前就在 index.html）
            const currentPath = window.location.pathname;
            const isIndexPage = currentPath.endsWith('index.html') || 
                               currentPath.endsWith('/') || 
                               currentPath === '';
            
            if (!isIndexPage) {
                debugLog('[Auth] 未登录，重定向到登录页面');
                window.location.href = 'index.html';
                return false;
            }
            return false;
        }
        
        // 如果是本地测试用户，允许访问（跳过白名单验证）
        if (isTestUser) {
            debugLog('[Auth] 本地测试用户，允许访问');
            return true;
        }

        // 其他用户必须通过白名单验证
        // 确保白名单已加载
        await waitForWhitelist();
        
        // 检查用户是否在白名单中
        let user = getUserFromWhitelist(authData);
        console.log('[Auth] checkPageAccess - 本地缓存检查结果:', { 
            found: !!user, 
            cacheSize: userWhitelist.length,
            authData: { 
                name: authData.name, 
                phone: authData.phone || authData.password ? '***' : 'missing',
                email: authData.email 
            }
        });
        
        // 如果缓存中没有，使用服务端验证
        if (!user) {
            console.log('[Auth] checkPageAccess - 本地缓存中未找到用户，使用服务端验证');
            const phone = authData.phone || authData.password || '';
            user = await verifyUserInWhitelist(
                authData.name || '',
                phone,
                authData.email || ''
            );
            
            console.log('[Auth] checkPageAccess - 服务端验证结果:', { 
                found: !!user, 
                userInfo: user ? { name: user.name, level: user.level } : null 
            });
        }
        
        if (!user) {
            const errorMsg = `[Auth] checkPageAccess - 用户不在白名单中，重定向到登录页面\n` +
                           `用户信息: name=${authData.name}, phone=${authData.phone || authData.password ? '***' : 'missing'}, email=${authData.email}\n` +
                           `请检查控制台日志获取更多信息`;
            debugWarn(errorMsg);
            console.error('[Auth] checkPageAccess - 验证失败，即将重定向:', {
                authData: {
                    name: authData.name,
                    phone: authData.phone || authData.password ? '***' : 'missing',
                    email: authData.email
                },
                cacheSize: userWhitelist.length,
                url: window.location.href
            });
            
            // 延迟跳转，让用户有时间查看日志
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 清除无效的认证数据
            localStorage.removeItem(AUTH_STORAGE_KEY);
            const currentPath = window.location.pathname;
            const isIndexPage = currentPath.endsWith('index.html') || 
                               currentPath.endsWith('/') || 
                               currentPath === '';
            if (!isIndexPage) {
                window.location.href = 'index.html';
            }
            return false;
        }

        // 如果指定了工具组，检查权限（等待白名单加载）
        if (toolGroup) {
            const hasAccess = await hasPermission(toolGroup, true);
            if (!hasAccess) {
                debugWarn(`[Auth] 用户无权限访问工具组: ${toolGroup}`);
                // 显示提示并重定向到 dashboard
                alert(`您没有权限访问 ${toolGroup} 系列工具`);
                window.location.href = 'dashboard.html';
                return false;
            }
        }

        return true;
    }

    /**
     * 初始化 Gist 验证系统
     */
    async function initGistAuth(pageName) {
        // 检查登录状态和权限（如果指定了工具组）
        // 注意：这里不重定向，让 checkPageAccess 处理
        const authOverlay = document.getElementById('authOverlay');
        const authForm = document.getElementById('authForm');
        const nameInput = document.getElementById('userName');
        // 查找密码输入框（phone 字段现在存储的是密码，不再是手机号）
        // 优先查找 userPassword（index.html 使用），如果不存在则查找 userPhone
        const phoneInput = document.getElementById('userPassword') || document.getElementById('userPhone');
        const emailInput = document.getElementById('userEmail');
        const nameError = document.getElementById('nameError');
        const phoneError = document.getElementById('passwordError') || document.getElementById('phoneError');
        const emailError = document.getElementById('emailError');

        if (!authOverlay || !authForm) {
            debugWarn('验证模态框元素未找到');
            return;
        }

        // 本地测试模式：检查是否为本地测试用户
        if (isLocalTestMode) {
            const authData = getAuthData();
            const isTestUser = isLocalTestUser(authData);
            
            if (isTestUser) {
                debugLog('[Auth] 本地测试模式：检测到测试用户，允许访问');
                authOverlay.classList.add('hidden');
                enableAllLinks();
                return;
            } else if (!checkAuth()) {
                // 如果不是测试用户且未登录，重定向到 index.html
                const currentPath = window.location.pathname;
                const isIndexPage = currentPath.endsWith('index.html') || 
                                   currentPath.endsWith('/') || 
                                   currentPath === '';
                if (!isIndexPage) {
                    debugLog('[Auth] 本地测试模式：未登录且非测试用户，重定向到登录页面');
                    window.location.href = 'index.html';
                    return;
                }
            }
        }

        // 先禁用所有链接
        disableAllLinks();

        // 加载白名单
        await loadWhitelist();

        // 如果已通过验证，直接启用链接
        if (checkAuth()) {
            const authData = getAuthData();
            const isTestUser = isLocalTestUser(authData);
            
            // 检查用户是否在白名单中（测试用户跳过）
            if (!isTestUser) {
                // 先检查本地缓存
                let user = getUserFromWhitelist(authData);
                debugLog('[Auth] 本地缓存检查结果:', { 
                    found: !!user, 
                    cacheSize: userWhitelist.length,
                    authData: { 
                        name: authData.name, 
                        phone: authData.phone || authData.password ? '***' : 'missing',
                        email: authData.email 
                    }
                });
                
                // 如果缓存中没有，使用服务端验证
                if (!user) {
                    debugLog('[Auth] 本地缓存中未找到用户，使用服务端验证');
                    // 注意：index.html 中 phone 字段是从 password 复制的
                    const phone = authData.phone || authData.password || '';
                    user = await verifyUserInWhitelist(
                        authData.name || '',
                        phone,
                        authData.email || ''
                    );
                    
                    debugLog('[Auth] 服务端验证结果:', { 
                        found: !!user, 
                        userInfo: user ? { name: user.name, level: user.level } : null 
                    });
                    
                    if (!user) {
                        const errorMsg = `[Auth] 用户不在白名单中，重定向到登录页面\n` +
                                       `用户信息: name=${authData.name}, phone=${authData.phone || authData.password ? '***' : 'missing'}, email=${authData.email}\n` +
                                       `请检查控制台日志获取更多信息`;
                        debugWarn(errorMsg);
                        console.error('[Auth] 验证失败，即将重定向:', {
                            authData: {
                                name: authData.name,
                                phone: authData.phone || authData.password ? '***' : 'missing',
                                email: authData.email
                            },
                            cacheSize: userWhitelist.length,
                            url: window.location.href
                        });
                        
                        // 延迟跳转，让用户有时间查看日志
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        localStorage.removeItem(AUTH_STORAGE_KEY);
                        const currentPath = window.location.pathname;
                        const isIndexPage = currentPath.endsWith('index.html') || 
                                           currentPath.endsWith('/') || 
                                           currentPath === '';
                        if (!isIndexPage) {
                            window.location.href = 'index.html';
                        }
                        return;
                    }
                    
                    // 验证成功后，再次检查缓存（应该能找到）
                    user = getUserFromWhitelist(authData);
                    if (!user) {
                        debugWarn('[Auth] 验证成功但缓存中仍未找到用户，可能存在数据不一致');
                    }
                }
            }
            
            authOverlay.classList.add('hidden');
            enableAllLinks();
            // 记录访问（使用 await 确保保存完成，但不阻塞页面加载）
            if (authData) {
                const logEntry = {
                    page: pageName,
                    name: authData.name || '未知',
                    phone: authData.phone || '未知',
                    email: authData.email || '未知',
                    timestamp: Date.now(),
                    date: new Date().toLocaleString('zh-CN')
                };
                // 异步保存，不阻塞页面加载，但会等待保存完成
                // 使用 await 确保错误被正确捕获和记录
                (async () => {
                    try {
                        debugLog('[Auth] 开始保存访问记录（已登录用户）:', logEntry);
                        const result = await saveLogToGist(logEntry);
                        if (!result) {
                            debugWarn('[Auth] 访问记录保存返回 false，可能保存失败');
                            console.warn('[Auth] 访问记录保存失败，请检查：', {
                                apiUrl: GIST_API_URL,
                                logEntry: logEntry,
                                timestamp: new Date().toISOString()
                            });
                        } else {
                            debugLog('[Auth] 访问记录保存成功（已登录用户）');
                        }
                    } catch (error) {
                        debugError('[Auth] 访问记录保存失败（非阻塞）:', error);
                        console.error('[Auth] 访问记录保存异常:', {
                            error: error.message,
                            stack: error.stack,
                            apiUrl: GIST_API_URL,
                            logEntry: logEntry,
                            timestamp: new Date().toISOString()
                        });
                    }
                })();
            }
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

            // 验证密码（phone 字段现在存储的是密码，不再是手机号）
            // 密码验证：允许字母、数字和特殊符号
            const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/;
            if (!phone || phone.length === 0) {
                if (phoneError) {
                    phoneError.textContent = '请输入密码';
                    phoneError.classList.add('show');
                }
                if (phoneInput) phoneInput.focus();
                return;
            } else if (!passwordRegex.test(phone)) {
                if (phoneError) {
                    phoneError.textContent = '密码只能包含字母、数字和特殊符号';
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

            // 检查是否在白名单中（使用服务端验证）
            const verifiedUser = await verifyUserInWhitelist(name, phone, email);
            if (!verifiedUser) {
                if (emailError) {
                    emailError.textContent = '您不在访问白名单中，请联系管理员';
                    emailError.classList.add('show');
                }
                if (phoneError) {
                    phoneError.textContent = '密码或邮箱不匹配';
                    phoneError.classList.add('show');
                }
                debugWarn('用户不在白名单中');
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
            // 等待保存完成，如果失败会记录错误但不影响登录流程
            debugLog('[Auth] 开始保存访问记录（新登录）:', logEntry);
            await saveLogToGist(logEntry).catch(error => {
                debugError('[Auth] 登录时访问记录保存失败（非阻塞）:', error);
                console.error('[Auth] 登录时访问记录保存异常:', {
                    error: error.message,
                    stack: error.stack,
                    apiUrl: GIST_API_URL,
                    logEntry: logEntry,
                    timestamp: new Date().toISOString()
                });
            });

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
                // 密码验证：允许字母、数字和特殊符号（phone 字段现在存储的是密码）
                const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/;
                if (phone && passwordRegex.test(phone) && phoneError) {
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
    window.getAuthData = getAuthData;
    window.getUserFromWhitelist = getUserFromWhitelist;
    window.hasPermission = hasPermission;
    window.checkPageAccess = checkPageAccess;
    window.updateUserGroups = updateUserGroups;
    window.batchUpdateUserGroups = batchUpdateUserGroups;
    window.getToolGroupFromPage = getToolGroupFromPage;
    window.waitForWhitelist = waitForWhitelist;
    window.verifyUserInWhitelist = verifyUserInWhitelist;

    // 自动初始化（带权限检查）
    async function autoInitWithAuth() {
        const pageName = document.body.getAttribute('data-page') || 
                       window.location.pathname.split('/').pop() || 
                       'unknown';
        
        // 获取工具组
        const toolGroup = getToolGroupFromPage(pageName);
        
        // 检查页面访问权限
        const hasAccess = await checkPageAccess(pageName, toolGroup);
        
        if (!hasAccess) {
            // 如果没有权限且未重定向，说明是权限问题（不是登录问题）
            if (getAuthData()) {
                // 已登录但无权限，可以显示提示
                debugWarn(`[Auth] 用户无权限访问: ${pageName} (工具组: ${toolGroup})`);
            }
            return;
        }
        
        // 有权限，继续初始化
        await initGistAuth(pageName);
    }

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitWithAuth);
    } else {
        autoInitWithAuth();
    }
})();

