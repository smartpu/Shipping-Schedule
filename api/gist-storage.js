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
 * 
 * 访问记录管理策略：
 * - 时间窗口：自动保留最近 90 天的记录，过期记录自动清理
 * - 文件大小限制：GitHub Gists 单个文件最大 1MB，系统限制为 0.95MB（留出安全余量）
 * - 存储格式：使用压缩 JSON 格式（不格式化）以节省空间
 * - 自动清理：如果文件仍超过限制，按时间从旧到新删除记录
 * 
 * 如果访问量很大（如一周超过 1000 条），系统会：
 * 1. 优先清理超过 90 天的旧记录
 * 2. 如果仍超过文件大小限制，自动删除最旧的记录
 * 3. 确保文件大小始终在限制范围内
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
                    console.error('[Gist API] 访问记录 Gist ID 未配置，请检查 Vercel 环境变量 ACCESS_LOG_GIST_ID');
                    res.status(500).json({ 
                        error: '访问记录 Gist ID 未配置',
                        message: '请在 Vercel 环境变量中设置 ACCESS_LOG_GIST_ID'
                    });
                    return;
                }

                if (!GITHUB_TOKEN) {
                    console.error('[Gist API] GitHub Token 未配置，请检查 Vercel 环境变量 GITHUB_TOKEN');
                    res.status(500).json({ 
                        error: 'GitHub Token 未配置',
                        message: '请在 Vercel 环境变量中设置 GITHUB_TOKEN'
                    });
                    return;
                }

                if (!data || !data.logEntry) {
                    console.error('[Gist API] 缺少 logEntry 数据');
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
                
                // 数据管理策略：
                // 1. 时间窗口：只保留最近 90 天的记录（自动清理过期数据）
                // 2. 文件大小限制：GitHub Gists 单个文件最大 1MB，系统限制为 0.95MB（留出安全余量）
                // 3. 压缩存储：使用压缩 JSON 格式（不格式化）以节省空间，可存储更多记录
                // 4. 智能清理：如果文件仍超过限制，按时间从旧到新删除记录
                
                const RETENTION_DAYS = 90; // 保留最近 90 天的记录
                const MAX_FILE_SIZE_MB = 0.95; // 最大文件大小 0.95MB（留出安全余量）
                const currentTime = Date.now();
                const retentionTime = currentTime - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
                
                // 1. 清理过期记录（超过保留期的记录）
                const beforeCleanup = logs.length;
                logs = logs.filter(log => {
                    const logTime = log.timestamp || (log.date ? new Date(log.date).getTime() : 0);
                    return logTime >= retentionTime;
                });
                const cleanedCount = beforeCleanup - logs.length;
                if (cleanedCount > 0) {
                    console.log(`[Gist API] 已清理 ${cleanedCount} 条超过 ${RETENTION_DAYS} 天的过期记录`);
                }
                
                // 2. 检查文件大小（使用压缩格式）
                let jsonString = JSON.stringify(logs); // 压缩格式，不使用格式化
                let fileSizeMB = Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);
                
                // 3. 如果文件仍然过大，按时间从旧到新删除记录
                if (fileSizeMB > MAX_FILE_SIZE_MB) {
                    console.warn(`[Gist API] 文件大小 ${fileSizeMB.toFixed(2)}MB 超过限制（${MAX_FILE_SIZE_MB}MB），开始清理旧记录`);
                    
                    // 按时间戳排序（最新的在前）
                    logs.sort((a, b) => {
                        const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
                        const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
                        return timeB - timeA;
                    });
                    
                    // 二分查找合适的记录数量
                    let left = 0;
                    let right = logs.length;
                    let optimalCount = logs.length;
                    
                    while (left < right) {
                        const mid = Math.floor((left + right) / 2);
                        const testLogs = logs.slice(0, mid);
                        const testJson = JSON.stringify(testLogs);
                        const testSizeMB = Buffer.byteLength(testJson, 'utf8') / (1024 * 1024);
                        
                        if (testSizeMB <= MAX_FILE_SIZE_MB) {
                            optimalCount = mid;
                            left = mid + 1;
                        } else {
                            right = mid;
                        }
                    }
                    
                    if (optimalCount < logs.length) {
                        const removedCount = logs.length - optimalCount;
                        logs = logs.slice(0, optimalCount);
                        console.warn(`[Gist API] 已自动删除 ${removedCount} 条最旧的记录，保留 ${optimalCount} 条记录`);
                        
                        // 重新计算文件大小
                        jsonString = JSON.stringify(logs);
                        fileSizeMB = Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);
                    }
                }
                
                // 4. 更新 Gist（使用压缩格式存储）
                try {
                    await updateGist(ACCESS_LOG_GIST_ID, 'access-logs.json', jsonString);
                    console.log(`[Gist API] 访问记录已保存：${logs.length} 条记录，文件大小 ${fileSizeMB.toFixed(3)}MB`);

                    res.status(200).json({
                        success: true,
                        message: '访问记录已保存',
                        totalLogs: logs.length
                    });
                    return;
                } catch (updateError) {
                    console.error('[Gist API] 更新 Gist 失败:', {
                        message: updateError.message,
                        stack: updateError.stack,
                        gistId: ACCESS_LOG_GIST_ID
                    });
                    res.status(500).json({
                        error: '更新 Gist 失败',
                        message: updateError.message
                    });
                    return;
                }
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

