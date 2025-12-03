/**
 * GitHub Gist 存储服务
 * Vercel Serverless Function
 * 
 * 功能：
 * 1. 存储和读取访问记录
 * 2. 存储和读取用户白名单
 * 
 * 配置说明：
 * 1. 创建 GitHub Personal Access Token（需要 gist 权限）
 * 2. 创建两个 Gist：
 *    - 访问记录 Gist（获取 Gist ID）
 *    - 用户白名单 Gist（获取 Gist ID）
 * 3. 在 Vercel 环境变量中设置：
 *    - GITHUB_TOKEN: 你的 GitHub Token
 *    - ACCESS_LOG_GIST_ID: 访问记录 Gist ID
 *    - USER_WHITELIST_GIST_ID: 用户白名单 Gist ID
 */

// 从环境变量读取配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ACCESS_LOG_GIST_ID = process.env.ACCESS_LOG_GIST_ID || '';
const USER_WHITELIST_GIST_ID = process.env.USER_WHITELIST_GIST_ID || '';

const GITHUB_API_BASE = 'https://api.github.com';
const FETCH_TIMEOUT = 8000; // 8秒超时
const MAX_RETRIES = 2; // 最大重试次数

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(url, options, timeout = FETCH_TIMEOUT) {
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
            throw new Error(`请求超时 (${timeout}ms): ${url}`);
        }
        throw error;
    }
}

/**
 * 带重试的请求函数
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetchWithTimeout(url, options);
            return response;
        } catch (error) {
            lastError = error;
            if (i < retries) {
                // 等待后重试（指数退避）
                const delay = Math.min(1000 * Math.pow(2, i), 5000);
                console.warn(`请求失败，${delay}ms 后重试 (${i + 1}/${retries}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

/**
 * 获取 Gist 内容
 */
async function getGist(gistId) {
    if (!GITHUB_TOKEN || !gistId) {
        throw new Error('GitHub Token 或 Gist ID 未配置');
    }

    const url = `${GITHUB_API_BASE}/gists/${gistId}`;
    console.log(`[Gist API] 获取 Gist: ${gistId}`);
    
    try {
        const response = await fetchWithRetry(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            const errorMsg = `获取 Gist 失败: ${response.status} ${response.statusText} - ${errorText}`;
            console.error(`[Gist API] ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const gist = await response.json();
        
        // 获取第一个文件的内容
        const files = Object.values(gist.files);
        if (files.length === 0) {
            console.warn(`[Gist API] Gist ${gistId} 中没有文件`);
            return null;
        }

        const file = files[0];
        console.log(`[Gist API] 成功获取 Gist: ${gistId}, 文件: ${file.filename}`);
        return {
            content: file.content,
            filename: file.filename
        };
    } catch (error) {
        console.error(`[Gist API] 获取 Gist ${gistId} 失败:`, error.message);
        throw error;
    }
}

/**
 * 更新 Gist 内容
 */
async function updateGist(gistId, filename, content) {
    if (!GITHUB_TOKEN || !gistId) {
        throw new Error('GitHub Token 或 Gist ID 未配置');
    }

    const url = `${GITHUB_API_BASE}/gists/${gistId}`;
    console.log(`[Gist API] 更新 Gist: ${gistId}, 文件: ${filename}`);

    // 先获取现有 Gist（保留文件名）
    let existingGist;
    try {
        const gistResponse = await fetchWithRetry(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (gistResponse.ok) {
            existingGist = await gistResponse.json();
        }
    } catch (e) {
        // 忽略错误，继续创建新文件
        console.warn(`[Gist API] 获取现有 Gist 失败，将创建新文件:`, e.message);
    }

    // 构建文件对象（需要保留所有现有文件）
    const files = {};
    if (existingGist) {
        // 保留所有现有文件（但更新目标文件）
        Object.keys(existingGist.files).forEach(key => {
            files[key] = { content: existingGist.files[key].content };
        });
    }
    // 更新或创建目标文件
    files[filename] = { content: content };

    try {
        const response = await fetchWithRetry(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: files
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            const errorMsg = `更新 Gist 失败: ${response.status} ${response.statusText} - ${errorText}`;
            console.error(`[Gist API] ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log(`[Gist API] 成功更新 Gist: ${gistId}`);
        return result;
    } catch (error) {
        console.error(`[Gist API] 更新 Gist ${gistId} 失败:`, error.message);
        throw error;
    }
}

// 主处理函数
module.exports = async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { action, data } = req.body || {};

        // GET 请求：读取数据
        if (req.method === 'GET') {
            const { type } = req.query;

            if (type === 'whitelist') {
                // 读取用户白名单
                if (!USER_WHITELIST_GIST_ID) {
                    res.status(500).json({ 
                        error: '用户白名单 Gist ID 未配置',
                        message: '请在 Vercel 环境变量中设置 USER_WHITELIST_GIST_ID'
                    });
                    return;
                }

                const gist = await getGist(USER_WHITELIST_GIST_ID);
                if (!gist || !gist.content) {
                    res.status(200).json([]);
                    return;
                }

                try {
                    const users = JSON.parse(gist.content);
                    res.status(200).json(users);
                    return;
                } catch (parseError) {
                    console.error('[Gist API] 解析白名单 JSON 失败:', parseError);
                    res.status(500).json({ 
                        error: '解析白名单数据失败',
                        message: parseError.message
                    });
                    return;
                }
            }

            if (type === 'logs') {
                // 读取访问记录
                if (!ACCESS_LOG_GIST_ID) {
                    res.status(500).json({ 
                        error: '访问记录 Gist ID 未配置',
                        message: '请在 Vercel 环境变量中设置 ACCESS_LOG_GIST_ID'
                    });
                    return;
                }

                const gist = await getGist(ACCESS_LOG_GIST_ID);
                if (!gist || !gist.content) {
                    res.status(200).json([]);
                    return;
                }

                try {
                    const logs = JSON.parse(gist.content);
                    res.status(200).json(logs);
                    return;
                } catch (parseError) {
                    console.error('[Gist API] 解析访问记录 JSON 失败:', parseError);
                    res.status(500).json({ 
                        error: '解析访问记录数据失败',
                        message: parseError.message
                    });
                    return;
                }
            }

            res.status(400).json({ 
                error: '无效的 type 参数',
                message: 'type 必须是: whitelist 或 logs'
            });
            return;
        }

        // POST 请求：写入数据
        if (req.method === 'POST') {
            if (!action) {
                res.status(400).json({ 
                    error: '缺少 action 参数',
                    message: 'action 必须是: addLog, getLogs, getWhitelist'
                });
                return;
            }

            if (action === 'addLog') {
                // 添加访问记录
                if (!ACCESS_LOG_GIST_ID) {
                    res.status(500).json({ 
                        error: '访问记录 Gist ID 未配置'
                    });
                    return;
                }

                if (!data || !data.logEntry) {
                    res.status(400).json({ 
                        error: '缺少 logEntry 数据'
                    });
                    return;
                }

                // 获取现有记录
                let logs = [];
                try {
                    const gist = await getGist(ACCESS_LOG_GIST_ID);
                    if (gist && gist.content) {
                        try {
                            logs = JSON.parse(gist.content);
                            if (!Array.isArray(logs)) {
                                console.warn('[Gist API] 访问记录数据格式错误，重置为空数组');
                                logs = [];
                            }
                        } catch (parseError) {
                            console.error('[Gist API] 解析现有访问记录失败，创建新记录:', parseError);
                            logs = [];
                        }
                    }
                } catch (e) {
                    console.warn('[Gist API] 读取现有记录失败，创建新记录:', e.message);
                }

                // 添加新记录
                logs.unshift(data.logEntry);
                
                // 限制记录数量（最多保留 1000 条）
                const MAX_LOGS = 1000;
                if (logs.length > MAX_LOGS) {
                    logs = logs.slice(0, MAX_LOGS);
                }

                // 更新 Gist
                await updateGist(ACCESS_LOG_GIST_ID, 'access-logs.json', JSON.stringify(logs, null, 2));

                res.status(200).json({
                    success: true,
                    message: '访问记录已保存',
                    totalLogs: logs.length
                });
                return;
            }

            if (action === 'getLogs') {
                // 获取所有访问记录
                if (!ACCESS_LOG_GIST_ID) {
                    res.status(500).json({ 
                        error: '访问记录 Gist ID 未配置'
                    });
                    return;
                }

                const gist = await getGist(ACCESS_LOG_GIST_ID);
                if (!gist || !gist.content) {
                    res.status(200).json([]);
                    return;
                }

                try {
                    const logs = JSON.parse(gist.content);
                    res.status(200).json(logs);
                    return;
                } catch (parseError) {
                    console.error('[Gist API] 解析访问记录 JSON 失败:', parseError);
                    res.status(500).json({ 
                        error: '解析访问记录数据失败',
                        message: parseError.message
                    });
                    return;
                }
            }

            if (action === 'getWhitelist') {
                // 获取用户白名单
                if (!USER_WHITELIST_GIST_ID) {
                    res.status(500).json({ 
                        error: '用户白名单 Gist ID 未配置'
                    });
                    return;
                }

                const gist = await getGist(USER_WHITELIST_GIST_ID);
                if (!gist || !gist.content) {
                    res.status(200).json([]);
                    return;
                }

                try {
                    const users = JSON.parse(gist.content);
                    res.status(200).json(users);
                    return;
                } catch (parseError) {
                    console.error('[Gist API] 解析白名单 JSON 失败:', parseError);
                    res.status(500).json({ 
                        error: '解析白名单数据失败',
                        message: parseError.message
                    });
                    return;
                }
            }

            res.status(400).json({ 
                error: '无效的 action',
                message: 'action 必须是: addLog, getLogs, getWhitelist'
            });
        }
    } catch (error) {
        console.error('[Gist API] 操作失败:', {
            message: error.message,
            stack: error.stack,
            method: req.method,
            url: req.url,
            query: req.query,
            body: req.body
        });
        res.status(500).json({ 
            error: '操作失败',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

