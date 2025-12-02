/**
 * 服务器端访问日志记录系统
 * 使用 GitHub Gist 存储访问记录
 * 
 * 配置说明：
 * 1. 创建 GitHub Personal Access Token (https://github.com/settings/tokens)
 * 2. 勾选 gist 权限
 * 3. 填入下面的 GITHUB_TOKEN
 */

(function() {
    'use strict';

    // ========== 配置区域 ==========
    // GitHub Gist 配置
    // 方式1：直接在代码中填写 token（推荐，方便使用）
    const GITHUB_TOKEN = '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'; // GitHub Personal Access Token
    // 方式2：从 localStorage 获取（如果上面留空，会尝试从 localStorage 获取）
    // const GITHUB_TOKEN = localStorage.getItem('shipping_tools_github_token') || '';
    const GITHUB_GIST_ID = localStorage.getItem('shipping_tools_gist_id') || ''; // Gist ID（留空会自动创建）
    const GITHUB_USERNAME = 'smartpu'; // 你的 GitHub 用户名
    
    // 是否启用服务器端日志
    const ENABLE_SERVER_LOG = true;
    
    // 待发送队列的存储键名
    const PENDING_LOGS_KEY = 'shipping_tools_pending_logs';
    const MAX_PENDING_LOGS = 100;
    // ==============================

    // 存储 Gist ID 的键名（用于记住自动创建的 Gist）
    const GIST_ID_STORAGE_KEY = 'shipping_tools_gist_id';

    /**
     * 将日志添加到待发送队列
     */
    function addToPendingQueue(logEntry) {
        try {
            let pendingLogs = [];
            const stored = localStorage.getItem(PENDING_LOGS_KEY);
            if (stored) {
                pendingLogs = JSON.parse(stored);
            }
            
            pendingLogs.push({
                ...logEntry,
                retryCount: 0,
                lastRetry: Date.now()
            });
            
            if (pendingLogs.length > MAX_PENDING_LOGS) {
                pendingLogs = pendingLogs.slice(-MAX_PENDING_LOGS);
            }
            
            localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pendingLogs));
        } catch (e) {
            console.warn('保存待发送队列失败:', e);
        }
    }

    /**
     * 使用 GitHub Gist 存储日志
     */
    async function sendToGitHubGist(logEntry) {
        // 优先使用代码中配置的 token，如果没有则从 localStorage 获取
        const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
        if (!token || token === 'YOUR_GITHUB_TOKEN_HERE' || token === '') {
            console.warn('⚠️ GitHub Token 未配置，请填写 GITHUB_TOKEN 或运行：localStorage.setItem("shipping_tools_github_token", "YOUR_TOKEN")');
            return false;
        }

        try {
            // 获取或创建 Gist ID
            let gistId = GITHUB_GIST_ID;
            if (!gistId || gistId === 'YOUR_GIST_ID_HERE') {
                // 尝试从本地存储获取之前创建的 Gist ID
                gistId = localStorage.getItem(GIST_ID_STORAGE_KEY) || '';
            }

            let existingContent = '';
            
            // 如果已有 Gist ID，尝试获取现有内容
            if (gistId) {
                try {
                    const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
                    const getResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    
                    if (getResponse.ok) {
                        const gist = await getResponse.json();
                        const filename = Object.keys(gist.files)[0];
                        existingContent = gist.files[filename].content || '';
                        console.log('✅ 成功获取现有 Gist 内容');
                    } else if (getResponse.status === 401) {
                        // Token 认证失败
                        console.error('❌ Token 认证失败，请检查 Token 是否有效');
                        console.error('💡 提示：访问 https://github.com/settings/tokens 创建新 Token，确保勾选 gist 权限');
                        return false;
                    } else if (getResponse.status === 404) {
                        // Gist 不存在，需要创建新的
                        console.log('ℹ️ Gist 不存在，将创建新的');
                        gistId = '';
                    }
                } catch (e) {
                    console.warn('获取 Gist 失败，将创建新的:', e);
                    gistId = '';
                }
            }

            // 解析现有内容
            let logs = [];
            if (existingContent) {
                try {
                    logs = JSON.parse(existingContent);
                    if (!Array.isArray(logs)) {
                        logs = [];
                    }
                } catch (e) {
                    console.warn('解析现有日志失败，将重新开始:', e);
                    logs = [];
                }
            }

            // 添加新日志（避免重复）
            const existingIndex = logs.findIndex(log => 
                log.timestamp === logEntry.timestamp && 
                log.email === logEntry.email && 
                log.page === logEntry.page
            );
            
            if (existingIndex === -1) {
                logs.unshift(logEntry);
                if (logs.length > 1000) {
                    logs = logs.slice(0, 1000); // 限制最多1000条
                }
            } else {
                console.log('ℹ️ 日志已存在，跳过重复记录');
                return true;
            }

            // 更新 Gist
            const gistData = {
                description: 'Shipping Tools 访问日志',
                public: false, // 私有 Gist
                files: {
                    'access-logs.json': {
                        content: JSON.stringify(logs, null, 2)
                    }
                }
            };

            const url = gistId 
                ? `https://api.github.com/gists/${gistId}`
                : 'https://api.github.com/gists';

            const method = gistId ? 'PATCH' : 'POST';

            console.log(`📤 ${method === 'POST' ? '创建' : '更新'} Gist...`);

            // 使用从 localStorage 获取的 token
            const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const result = await response.json();
                const newGistId = result.id;
                
                // 保存 Gist ID 到本地存储
                if (!gistId) {
                    localStorage.setItem(GIST_ID_STORAGE_KEY, newGistId);
                    console.log('✅ 新 Gist 已创建，ID 已保存:', newGistId);
                }
                
                console.log('✅ 日志已保存到 GitHub Gist');
                console.log('🔗 Gist 地址:', result.html_url);
                return true;
            } else {
                const errorText = await response.text();
                let errorMessage = `❌ GitHub Gist 保存失败: ${response.status}`;
                
                // 处理常见的错误情况
                if (response.status === 401) {
                    errorMessage += '\n\n🔐 Token 认证失败，可能的原因：';
                    errorMessage += '\n1. Token 已过期或被撤销';
                    errorMessage += '\n2. Token 权限不足（需要勾选 gist 权限）';
                    errorMessage += '\n3. Token 格式错误';
                    errorMessage += '\n\n📝 解决方法：';
                    errorMessage += '\n1. 访问 https://github.com/settings/tokens 创建新 Token';
                    errorMessage += '\n2. 勾选 "gist" 权限';
                    errorMessage += '\n3. 复制新 Token 并更新到代码中的 GITHUB_TOKEN';
                    errorMessage += '\n4. 或运行：localStorage.setItem("shipping_tools_github_token", "YOUR_NEW_TOKEN")';
                } else if (response.status === 403) {
                    errorMessage += '\n\n🚫 权限不足，请检查 Token 是否勾选了 gist 权限';
                } else if (response.status === 404) {
                    errorMessage += '\n\n❓ Gist 不存在，将尝试创建新的';
                }
                
                console.error(errorMessage);
                console.error('详细错误信息:', errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ GitHub Gist 请求失败:', error);
            return false;
        }
    }

    /**
     * 发送访问日志到服务器
     */
    function sendLogToServer(logEntry) {
        if (!ENABLE_SERVER_LOG) {
            console.log('服务器端日志已禁用');
            return;
        }

        console.log('📤 准备发送日志到 GitHub Gist:', logEntry);

        // 先添加到待发送队列（确保不会丢失）
        addToPendingQueue(logEntry);
        console.log('✅ 日志已添加到待发送队列');

        // 发送到 GitHub Gist
        sendToGitHubGist(logEntry).then(success => {
            if (success) {
                // 发送成功，从队列中移除
                removeFromPendingQueue(logEntry);
            }
        }).catch(err => {
            console.error('GitHub Gist 发送失败:', err);
        });
    }

    /**
     * 从待发送队列中移除已发送的日志
     */
    function removeFromPendingQueue(logEntry) {
        try {
            const stored = localStorage.getItem(PENDING_LOGS_KEY);
            if (!stored) return;
            
            let pendingLogs = JSON.parse(stored);
            pendingLogs = pendingLogs.filter(log => 
                !(log.timestamp === logEntry.timestamp && 
                  log.email === logEntry.email && 
                  log.page === logEntry.page)
            );
            
            if (pendingLogs.length > 0) {
                localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pendingLogs));
            } else {
                localStorage.removeItem(PENDING_LOGS_KEY);
            }
        } catch (e) {
            console.warn('从队列移除日志失败:', e);
        }
    }

    /**
     * 尝试重试待发送队列中的日志
     */
    async function retryPendingLogs() {
        if (!ENABLE_SERVER_LOG) {
            return;
        }

        try {
            const stored = localStorage.getItem(PENDING_LOGS_KEY);
            if (!stored) return;
            
            const pendingLogs = JSON.parse(stored);
            if (pendingLogs.length === 0) return;

            const now = Date.now();
            const RETRY_INTERVAL = 10000; // 10秒后重试
            const MAX_RETRIES = 20;

            console.log(`🔄 开始重试 ${pendingLogs.length} 条待发送日志...`);

            const remainingLogs = [];
            
            for (const logEntry of pendingLogs) {
                if (logEntry.retryCount >= MAX_RETRIES) {
                    console.warn('⚠️ 日志重试次数过多，已放弃:', logEntry);
                    continue;
                }

                const timeSinceLastRetry = now - logEntry.lastRetry;
                if (timeSinceLastRetry < RETRY_INTERVAL) {
                    remainingLogs.push(logEntry);
                    continue;
                }

                console.log(`📤 重试发送日志 (第${logEntry.retryCount + 1}次):`, logEntry);

                try {
                    const success = await sendToGitHubGist(logEntry);
                    if (success) {
                        console.log('✅ 待发送日志已成功发送');
                        // 不添加到 remainingLogs，表示已成功
                    } else {
                        logEntry.retryCount = (logEntry.retryCount || 0) + 1;
                        logEntry.lastRetry = Date.now();
                        remainingLogs.push(logEntry);
                    }
                } catch (error) {
                    logEntry.retryCount = (logEntry.retryCount || 0) + 1;
                    logEntry.lastRetry = Date.now();
                    remainingLogs.push(logEntry);
                    console.warn('重试发送日志失败:', error);
                }
            }

            // 更新待发送队列
            if (remainingLogs.length > 0) {
                localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remainingLogs));
                console.log(`📋 还有 ${remainingLogs.length} 条日志待发送`);
            } else {
                localStorage.removeItem(PENDING_LOGS_KEY);
                console.log('✅ 所有待发送日志已处理完成');
            }
        } catch (e) {
            console.warn('重试待发送日志时出错:', e);
        }
    }

    /**
     * 从 GitHub Gist 获取日志
     */
    async function fetchLogsFromServer() {
        const gistId = GITHUB_GIST_ID || localStorage.getItem(GIST_ID_STORAGE_KEY);
        const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
        if (!gistId || !token || token === 'YOUR_GITHUB_TOKEN_HERE') {
            console.warn('GitHub Gist 未配置');
            return [];
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const gist = await response.json();
            const filename = Object.keys(gist.files)[0];
            const content = gist.files[filename].content;
            const logs = JSON.parse(content);
            return Array.isArray(logs) ? logs : [];
        } catch (error) {
            console.warn('从 GitHub Gist 获取日志失败:', error);
            return [];
        }
    }

    // 定期重试待发送的日志
    if (typeof window !== 'undefined') {
        // 页面加载后立即尝试一次
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    console.log('🔄 页面加载完成，检查待发送日志...');
                    retryPendingLogs();
                }, 2000);
            });
        } else {
            setTimeout(() => {
                console.log('🔄 检查待发送日志...');
                retryPendingLogs();
            }, 2000);
        }

        // 每5分钟自动重试一次
        setInterval(() => {
            console.log('🔄 定期检查待发送日志...');
            retryPendingLogs();
        }, 5 * 60 * 1000);

        // 当网络状态恢复时也尝试重试
        window.addEventListener('online', () => {
            console.log('🌐 网络已恢复，尝试发送待发送的日志');
            setTimeout(retryPendingLogs, 1000);
        });
    }

    // 导出到全局作用域
    window.sendLogToServer = sendLogToServer;
    window.fetchLogsFromServer = fetchLogsFromServer;
    window.retryPendingLogs = retryPendingLogs;

    // 调试函数
    window.checkPendingLogs = function() {
        const stored = localStorage.getItem(PENDING_LOGS_KEY);
        if (stored) {
            const logs = JSON.parse(stored);
            console.log(`📋 当前待发送日志数量: ${logs.length}`, logs);
            return logs;
        } else {
            console.log('📋 当前没有待发送的日志');
            return [];
        }
    };

    window.getGistId = function() {
        const gistId = localStorage.getItem(GIST_ID_STORAGE_KEY);
        if (gistId) {
            console.log('📋 Gist ID:', gistId);
            console.log('🔗 Gist 地址: https://gist.github.com/' + GITHUB_USERNAME + '/' + gistId);
            return gistId;
        } else {
            console.log('📋 还没有创建 Gist，首次发送日志时会自动创建');
            return null;
        }
    };
})();
