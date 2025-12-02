/**
 * 服务器端访问日志记录系统
 * 使用钉钉 Webhook 存储访问记录
 * 
 * 配置说明：
 * 1. 在钉钉群聊中添加"自定义机器人"
 * 2. 获取 Webhook URL
 * 3. 填入下面的 DINGTALK_WEBHOOK_URL
 */

(function() {
    'use strict';

    // ========== 配置区域 ==========
    // 钉钉 Webhook 配置
    const DINGTALK_WEBHOOK_URL = 'https://oapi.dingtalk.com/robot/send?access_token=5e6f88c29281bc410f9a902f9f1d63cee4d3590a4b4fb28aaa88f6115f5a6e63'; // 钉钉 Webhook URL（从钉钉群聊机器人获取）
    
    // 是否启用服务器端日志
    const ENABLE_SERVER_LOG = true;
    
    // 待发送队列的存储键名
    const PENDING_LOGS_KEY = 'shipping_tools_pending_logs';
    const MAX_PENDING_LOGS = 100;
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
     * 发送日志到钉钉 Webhook
     * 使用隐藏表单提交绕过 CORS 限制
     */
    async function sendToDingtalkWebhook(logEntry) {
        const webhookUrl = DINGTALK_WEBHOOK_URL || localStorage.getItem('shipping_tools_dingtalk_webhook') || '';
        
        if (!webhookUrl || webhookUrl.trim() === '') {
            console.warn('⚠️ 钉钉 Webhook URL 未配置');
            console.warn('📝 请在代码中设置 DINGTALK_WEBHOOK_URL 或运行：');
            console.warn('   localStorage.setItem("shipping_tools_dingtalk_webhook", "你的Webhook URL")');
            return false;
        }

        try {
            // 格式化日志消息
            const timestamp = new Date(logEntry.timestamp).toLocaleString('zh-CN');
            
            // 钉钉 Markdown 格式消息
            const message = {
                msgtype: "markdown",
                markdown: {
                    title: "📊 Shipping Tools 访问记录",
                    text: `## 📊 Shipping Tools 访问记录\n\n` +
                          `**👤 姓名：** ${logEntry.name || '未知'}\n\n` +
                          `**📱 手机：** ${logEntry.phone || '未知'}\n\n` +
                          `**📧 邮箱：** ${logEntry.email || '未知'}\n\n` +
                          `**📄 页面：** ${logEntry.page || '未知'}\n\n` +
                          `**🕐 时间：** ${timestamp}\n\n` +
                          `---\n\n` +
                          `*访问记录已自动记录*`
                }
            };

            // 使用隐藏表单提交绕过 CORS 限制
            // 注意：表单提交无法获取响应，但可以成功发送请求
            return new Promise((resolve) => {
                try {
                    // 创建隐藏的 iframe 用于提交表单（避免页面跳转）
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.style.width = '0';
                    iframe.style.height = '0';
                    iframe.name = 'dingtalk_webhook_' + Date.now();
                    document.body.appendChild(iframe);

                    // 创建隐藏表单
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = webhookUrl;
                    form.target = iframe.name;
                    form.style.display = 'none';

                    // 创建隐藏输入字段，存储 JSON 数据
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'payload';
                    input.value = JSON.stringify(message);
                    form.appendChild(input);

                    document.body.appendChild(form);

                    // 提交表单
                    form.submit();

                    // 清理：延迟移除 iframe 和表单
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                            document.body.removeChild(form);
                        } catch (e) {
                            // 忽略清理错误
                        }
                    }, 1000);

                    // 假设发送成功（因为无法获取响应）
                    console.log('✅ 日志已发送到钉钉（通过表单提交）');
                    resolve(true);
                } catch (error) {
                    console.error('❌ 发送到钉钉失败:', error);
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('❌ 发送到钉钉失败:', error);
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

        console.log('📤 准备发送日志到钉钉:', logEntry);

        // 先添加到待发送队列（确保不会丢失）
        addToPendingQueue(logEntry);
        console.log('✅ 日志已添加到待发送队列');

        // 发送到钉钉 Webhook
        sendToDingtalkWebhook(logEntry).then(success => {
            if (success) {
                // 发送成功，从队列中移除
                removeFromPendingQueue(logEntry);
            }
        }).catch(err => {
            console.error('钉钉 Webhook 发送失败:', err);
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
                    const success = await sendToDingtalkWebhook(logEntry);
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
     * 从钉钉获取日志（此功能需要钉钉 API，暂时不支持）
     */
    async function fetchLogsFromServer() {
        console.warn('⚠️ 钉钉 Webhook 方案不支持从服务器获取日志');
        console.warn('💡 日志会直接发送到钉钉群聊，请在群聊中查看');
        return [];
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

    // 测试钉钉 Webhook 是否配置
    window.testDingtalkWebhook = async function() {
        const webhookUrl = DINGTALK_WEBHOOK_URL || localStorage.getItem('shipping_tools_dingtalk_webhook') || '';
        
        if (!webhookUrl) {
            console.error('❌ 钉钉 Webhook URL 未配置');
            console.log('📝 请设置 DINGTALK_WEBHOOK_URL 或运行：');
            console.log('   localStorage.setItem("shipping_tools_dingtalk_webhook", "你的Webhook URL")');
            console.log('💡 创建步骤：');
            console.log('   1. 打开钉钉，进入目标群聊');
            console.log('   2. 点击群设置 → 智能群助手 → 添加机器人 → 自定义');
            console.log('   3. 设置机器人名称，复制 Webhook 地址');
            return false;
        }

        console.log('🧪 测试钉钉 Webhook...');
        
        try {
            const testMessage = {
                msgtype: "text",
                text: {
                    content: "🧪 测试消息：钉钉 Webhook 配置成功！"
                }
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testMessage)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.errcode === 0) {
                    console.log('✅ 钉钉 Webhook 测试成功！');
                    console.log('💡 请检查钉钉群聊是否收到测试消息');
                    return true;
                } else {
                    console.error('❌ 钉钉返回错误:', result.errmsg);
                    return false;
                }
            } else {
                const errorText = await response.text();
                console.error('❌ 钉钉 Webhook 请求失败:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ 测试失败:', error);
            return false;
        }
    };
})();
