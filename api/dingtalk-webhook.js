/**
 * Vercel Serverless Function
 * 作为钉钉 Webhook 的代理，解决 CORS 问题
 * 
 * 部署说明：
 * 1. 将项目部署到 Vercel
 * 2. 在 Vercel 环境变量中设置 DINGTALK_WEBHOOK_URL
 * 3. 或者直接在代码中配置（不推荐，但可以工作）
 */

// 钉钉 Webhook URL（可以从环境变量读取，或直接配置）
const DINGTALK_WEBHOOK_URL = process.env.DINGTALK_WEBHOOK_URL || 
    'https://oapi.dingtalk.com/robot/send?access_token=5e6f88c29281bc410f9a902f9f1d63cee4d3590a4b4fb28aaa88f6115f5a6e63';

// 使用 CommonJS 格式（Vercel 更兼容）
module.exports = async function handler(req, res) {
    // 设置 CORS 头，允许所有来源（或指定你的域名）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 允许 GET 请求用于测试
    if (req.method === 'GET') {
        res.status(200).json({ 
            message: 'DingTalk Webhook Proxy is running',
            method: req.method,
            timestamp: new Date().toISOString()
        });
        return;
    }

    // 只允许 POST 请求
    if (req.method !== 'POST') {
        res.status(405).json({ 
            error: 'Method not allowed',
            allowed: ['GET', 'POST', 'OPTIONS']
        });
        return;
    }

    try {
        // 获取请求体
        let message = req.body;
        
        // 如果 body 是字符串，尝试解析
        if (typeof message === 'string') {
            try {
                message = JSON.parse(message);
            } catch (e) {
                // 如果解析失败，保持原样
            }
        }

        if (!message) {
            res.status(400).json({ error: 'Request body is required' });
            return;
        }

        // 转发到钉钉 Webhook
        const response = await fetch(DINGTALK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        const result = await response.json();

        // 返回钉钉的响应
        res.status(response.status).json(result);
    } catch (error) {
        console.error('代理请求失败:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

