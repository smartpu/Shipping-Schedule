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

/**
 * 获取 Gist 内容
 */
async function getGist(gistId) {
    if (!GITHUB_TOKEN || !gistId) {
        throw new Error('GitHub Token 或 Gist ID 未配置');
    }

    const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`获取 Gist 失败: ${response.status} - ${error}`);
    }

    const gist = await response.json();
    
    // 获取第一个文件的内容
    const files = Object.values(gist.files);
    if (files.length === 0) {
        return null;
    }

    const file = files[0];
    return {
        content: file.content,
        filename: file.filename
    };
}

/**
 * 更新 Gist 内容
 */
async function updateGist(gistId, filename, content) {
    if (!GITHUB_TOKEN || !gistId) {
        throw new Error('GitHub Token 或 Gist ID 未配置');
    }

    // 先获取现有 Gist（保留文件名）
    let existingGist;
    try {
        const gistResponse = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
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

    const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
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
        const error = await response.text();
        throw new Error(`更新 Gist 失败: ${response.status} - ${error}`);
    }

    return await response.json();
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

                const users = JSON.parse(gist.content);
                res.status(200).json(users);
                return;
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

                const logs = JSON.parse(gist.content);
                res.status(200).json(logs);
                return;
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
                        logs = JSON.parse(gist.content);
                    }
                } catch (e) {
                    console.warn('读取现有记录失败，创建新记录:', e);
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

                const logs = JSON.parse(gist.content);
                res.status(200).json(logs);
                return;
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

                const users = JSON.parse(gist.content);
                res.status(200).json(users);
                return;
            }

            res.status(400).json({ 
                error: '无效的 action',
                message: 'action 必须是: addLog, getLogs, getWhitelist'
            });
        }
    } catch (error) {
        console.error('Gist 存储操作失败:', error);
        res.status(500).json({ 
            error: '操作失败',
            message: error.message 
        });
    }
};

