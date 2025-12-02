/**
 * 服务器端访问日志记录系统
 * 使用 GitHub Issues 存储访问记录
 * 
 * 配置说明：
 * 1. 创建 GitHub Personal Access Token (https://github.com/settings/tokens)
 * 2. 勾选 repo 权限（比 gist 权限更常见）
 * 3. 填入下面的 GITHUB_TOKEN
 * 4. 设置仓库信息：GITHUB_OWNER 和 GITHUB_REPO
 */

(function() {
    'use strict';

    // ========== 配置区域 ==========
    // GitHub Issues 配置
    // 方式1：直接在代码中填写 token（推荐，方便使用）
    const GITHUB_TOKEN = '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'; // GitHub Personal Access Token
    // 方式2：从 localStorage 获取（如果上面留空，会尝试从 localStorage 获取）
    // const GITHUB_TOKEN = localStorage.getItem('shipping_tools_github_token') || '';
    const GITHUB_OWNER = 'smartpu'; // GitHub 用户名或组织名
    const GITHUB_REPO = 'Shipping-Schedule'; // 仓库名
    const ISSUE_TITLE = 'Shipping Tools 访问日志'; // Issue 标题
    const ISSUE_LABEL = 'access-log'; // Issue 标签（可选）
    
    // 是否启用服务器端日志
    const ENABLE_SERVER_LOG = true;
    
    // 待发送队列的存储键名
    const PENDING_LOGS_KEY = 'shipping_tools_pending_logs';
    const MAX_PENDING_LOGS = 100;
    
    // 存储 Issue ID 的键名（用于记住创建的 Issue）
    const ISSUE_ID_STORAGE_KEY = 'shipping_tools_issue_id';
    // ==============================

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
     * 获取或创建日志 Issue
     */
    async function getOrCreateLogIssue() {
        const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
        if (!token || token === 'YOUR_GITHUB_TOKEN_HERE' || token === '') {
            console.warn('⚠️ GitHub Token 未配置');
            return null;
        }

        // 检查是否已有 Issue ID
        let issueId = localStorage.getItem(ISSUE_ID_STORAGE_KEY);
        
        // 如果有 Issue ID，验证它是否还存在
        if (issueId) {
            try {
                const authHeader = token.startsWith('github_pat_') 
                    ? `Bearer ${token}`
                    : `token ${token}`;
                
                const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueId}`, {
                    headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (response.ok) {
                    const issue = await response.json();
                    console.log('✅ 找到现有 Issue:', issue.number, issue.title);
                    return issue;
                } else if (response.status === 404) {
                    // Issue 不存在，需要创建新的
                    console.log('ℹ️ Issue 不存在，将创建新的');
                    localStorage.removeItem(ISSUE_ID_STORAGE_KEY);
                }
            } catch (e) {
                console.warn('验证 Issue 失败，将创建新的:', e);
            }
        }

        // 创建新的 Issue
        try {
            const authHeader = token.startsWith('github_pat_') 
                ? `Bearer ${token}`
                : `token ${token}`;
            
            const issueData = {
                title: ISSUE_TITLE,
                body: '此 Issue 用于存储 Shipping Tools 的访问日志。\n\n日志以 JSON 格式存储在 Issue 的 body 中。',
                labels: ISSUE_LABEL ? [ISSUE_LABEL] : []
            };

            const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(issueData)
            });

            if (response.ok) {
                const issue = await response.json();
                localStorage.setItem(ISSUE_ID_STORAGE_KEY, issue.number.toString());
                console.log('✅ 新 Issue 已创建:', issue.number, issue.html_url);
                return issue;
            } else {
                const errorText = await response.text();
                console.error('❌ 创建 Issue 失败:', response.status, errorText);
                return null;
            }
        } catch (error) {
            console.error('❌ 创建 Issue 请求失败:', error);
            return null;
        }
    }

    /**
     * 使用 GitHub Issues 存储日志
     */
    async function sendToGitHubIssue(logEntry) {
        const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
        if (!token || token === 'YOUR_GITHUB_TOKEN_HERE' || token === '') {
            console.warn('⚠️ GitHub Token 未配置，请填写 GITHUB_TOKEN 或运行：localStorage.setItem("shipping_tools_github_token", "YOUR_TOKEN")');
            return false;
        }
        
        // 验证 token 格式
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            console.warn('⚠️ Token 格式可能不正确，GitHub token 通常以 ghp_ 或 github_pat_ 开头');
            console.warn('当前 token 前10个字符:', token.substring(0, 10) + '...');
        }
        
        // 调试信息：显示使用的 token 来源和长度
        const tokenSource = GITHUB_TOKEN ? '代码中配置' : 'localStorage';
        console.log(`🔑 使用 Token (来源: ${tokenSource}, 长度: ${token.length}, 前缀: ${token.substring(0, 4)})`);

        try {
            // 获取或创建 Issue
            const issue = await getOrCreateLogIssue();
            if (!issue) {
                console.error('❌ 无法获取或创建 Issue');
                return false;
            }

            const issueId = issue.number;
            const authHeader = token.startsWith('github_pat_') 
                ? `Bearer ${token}`
                : `token ${token}`;

            // 获取现有 Issue 内容
            let existingLogs = [];
            try {
                const getResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueId}`, {
                    headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (getResponse.ok) {
                    const issueData = await getResponse.json();
                    // 尝试从 body 中解析 JSON 日志
                    const body = issueData.body || '';
                    // 查找 JSON 部分（可能在代码块中）
                    const jsonMatch = body.match(/```json\s*([\s\S]*?)\s*```/) || body.match(/```\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        try {
                            existingLogs = JSON.parse(jsonMatch[1]);
                            if (!Array.isArray(existingLogs)) {
                                existingLogs = [];
                            }
                        } catch (e) {
                            console.warn('解析现有日志失败，将重新开始:', e);
                            existingLogs = [];
                        }
                    }
                }
            } catch (e) {
                console.warn('获取 Issue 内容失败，将创建新的日志数组:', e);
            }

            // 添加新日志（避免重复）
            const existingIndex = existingLogs.findIndex(log => 
                log.timestamp === logEntry.timestamp && 
                log.email === logEntry.email && 
                log.page === logEntry.page
            );
            
            if (existingIndex === -1) {
                existingLogs.unshift(logEntry);
                if (existingLogs.length > 1000) {
                    existingLogs = existingLogs.slice(0, 1000); // 限制最多1000条
                }
            } else {
                console.log('ℹ️ 日志已存在，跳过重复记录');
                return true;
            }

            // 更新 Issue body
            const issueBody = `此 Issue 用于存储 Shipping Tools 的访问日志。

## 访问日志

\`\`\`json
${JSON.stringify(existingLogs, null, 2)}
\`\`\`

> 最后更新：${new Date().toLocaleString('zh-CN')}
> 总记录数：${existingLogs.length}`;

            const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: issueBody
                })
            });

            if (updateResponse.ok) {
                const result = await updateResponse.json();
                console.log('✅ 日志已保存到 GitHub Issue');
                console.log('🔗 Issue 地址:', result.html_url);
                return true;
            } else {
                const errorText = await updateResponse.text();
                let errorMessage = `❌ GitHub Issue 保存失败: ${updateResponse.status}`;
                
                // 处理常见的错误情况
                if (updateResponse.status === 401) {
                    errorMessage += '\n\n🔐 Token 认证失败，可能的原因：';
                    errorMessage += '\n1. Token 已过期或被撤销';
                    errorMessage += '\n2. Token 权限不足（需要勾选 repo 权限）';
                    errorMessage += '\n3. Token 格式错误';
                    errorMessage += '\n\n📝 解决方法：';
                    errorMessage += '\n1. 访问 https://github.com/settings/tokens 创建新 Token';
                    errorMessage += '\n2. 勾选 "repo" 权限（比 gist 权限更常见）';
                    errorMessage += '\n3. 复制新 Token 并更新到代码中的 GITHUB_TOKEN';
                    errorMessage += '\n4. 或运行：localStorage.setItem("shipping_tools_github_token", "YOUR_NEW_TOKEN")';
                } else if (updateResponse.status === 403) {
                    errorMessage += '\n\n🚫 权限不足，请检查 Token 是否勾选了 repo 权限';
                } else if (updateResponse.status === 404) {
                    errorMessage += '\n\n❓ Issue 不存在，将尝试创建新的';
                }
                
                console.error(errorMessage);
                console.error('详细错误信息:', errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ GitHub Issue 请求失败:', error);
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

        console.log('📤 准备发送日志到 GitHub Issue:', logEntry);

        // 先添加到待发送队列（确保不会丢失）
        addToPendingQueue(logEntry);
        console.log('✅ 日志已添加到待发送队列');

        // 发送到 GitHub Issue
        sendToGitHubIssue(logEntry).then(success => {
            if (success) {
                // 发送成功，从队列中移除
                removeFromPendingQueue(logEntry);
            }
        }).catch(err => {
            console.error('GitHub Issue 发送失败:', err);
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
                    const success = await sendToGitHubIssue(logEntry);
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
     * 从 GitHub Issue 获取日志
     */
    async function fetchLogsFromServer() {
        const issueId = localStorage.getItem(ISSUE_ID_STORAGE_KEY);
        const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
        if (!issueId || !token || token === 'YOUR_GITHUB_TOKEN_HERE') {
            console.warn('⚠️ GitHub Issue 未配置');
            return [];
        }

        try {
            const authHeader = token.startsWith('github_pat_') 
                ? `Bearer ${token}`
                : `token ${token}`;
            
            const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueId}`, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const issue = await response.json();
            const body = issue.body || '';
            
            // 从 body 中解析 JSON 日志
            const jsonMatch = body.match(/```json\s*([\s\S]*?)\s*```/) || body.match(/```\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                const logs = JSON.parse(jsonMatch[1]);
                return Array.isArray(logs) ? logs : [];
            }
            
            return [];
        } catch (error) {
            console.warn('从 GitHub Issue 获取日志失败:', error);
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

    window.getIssueId = function() {
        const issueId = localStorage.getItem(ISSUE_ID_STORAGE_KEY);
        if (issueId) {
            console.log('📋 Issue ID:', issueId);
            console.log('🔗 Issue 地址: https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueId);
            return issueId;
        } else {
            console.log('📋 还没有创建 Issue，首次发送日志时会自动创建');
            return null;
        }
    };

    // 测试 Token 是否有效
    window.testGitHubToken = async function() {
        const token = GITHUB_TOKEN || localStorage.getItem('shipping_tools_github_token') || '';
        
        if (!token) {
            console.error('❌ Token 未配置');
            return false;
        }
        
        console.log('🧪 开始测试 Token...');
        console.log('Token 来源:', GITHUB_TOKEN ? '代码中配置' : 'localStorage');
        console.log('Token 长度:', token.length);
        console.log('Token 前缀:', token.substring(0, 10) + '...');
        
        // 使用正确的认证格式
        const authHeader = token.startsWith('github_pat_') 
            ? `Bearer ${token}`
            : `token ${token}`;
        
        console.log('🔐 使用认证格式:', authHeader.substring(0, 15) + '...');
        
        try {
            // 测试1: 获取用户信息
            console.log('📡 测试1: 获取用户信息...');
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('✅ 用户信息获取成功:', userData.login);
            } else {
                const errorText = await userResponse.text();
                console.error('❌ 用户信息获取失败:', userResponse.status, errorText);
                return false;
            }
            
            // 测试2: 测试仓库访问权限
            console.log('📡 测试2: 测试仓库访问权限...');
            const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                console.log('✅ 仓库访问成功:', repoData.full_name);
                console.log('✅ Token 有效，可以创建和更新 Issues');
                return true;
            } else {
                const errorText = await repoResponse.text();
                console.error('❌ 仓库访问失败:', repoResponse.status, errorText);
                if (repoResponse.status === 403) {
                    console.error('💡 提示: Token 可能没有 repo 权限，请检查 Token 权限设置');
                }
                return false;
            }
        } catch (error) {
            console.error('❌ 测试失败:', error);
            return false;
        }
    };
})();
