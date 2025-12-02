/**
 * 服务器端访问日志记录系统
 * 使用飞书 Webhook 存储访问记录
 * 
 * 配置说明：
 * 1. 在飞书群聊中添加"自定义机器人"
 * 2. 获取 Webhook URL
 * 3. 填入下面的 FEISHU_WEBHOOK_URL
 */

(function() {
    'use strict';

    // ========== 配置区域 ==========
    // 飞书 Webhook 配置
    const FEISHU_WEBHOOK_URL = ''; // 飞书 Webhook URL（从飞书群聊机器人获取）
    
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
     * 发送日志到飞书 Webhook
     */
    async function sendToFeishuWebhook(logEntry) {
        const webhookUrl = FEISHU_WEBHOOK_URL || localStorage.getItem('shipping_tools_feishu_webhook') || '';
        
        if (!webhookUrl || webhookUrl.trim() === '') {
            console.warn('⚠️ 飞书 Webhook URL 未配置');
            console.warn('📝 请在代码中设置 FEISHU_WEBHOOK_URL 或运行：');
            console.warn('   localStorage.setItem("shipping_tools_feishu_webhook", "你的Webhook URL")');
            return false;
        }

        try {
            // 格式化日志消息
            const timestamp = new Date(logEntry.timestamp).toLocaleString('zh-CN');
            const message = {
                msg_type: "interactive",
                card: {
                    config: {
                        wide_screen_mode: true
                    },
                    header: {
                        title: {
                            tag: "plain_text",
                            content: "📊 Shipping Tools 访问记录"
                        },
                        template: "blue"
                    },
                    elements: [
                        {
                            tag: "div",
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        tag: "lark_md",
                                        content: "**👤 姓名：**\n" + (logEntry.name || '未知')
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        tag: "lark_md",
                                        content: "**📱 手机：**\n" + (logEntry.phone || '未知')
                                    }
                                }
                            ]
                        },
                        {
                            tag: "div",
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        tag: "lark_md",
                                        content: "**📧 邮箱：**\n" + (logEntry.email || '未知')
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        tag: "lark_md",
                                        content: "**📄 页面：**\n" + (logEntry.page || '未知')
                                    }
                                }
                            ]
                        },
                        {
                            tag: "div",
                            fields: [
                                {
                                    is_short: false,
                                    text: {
                                        tag: "lark_md",
                                        content: "**🕐 时间：**\n" + timestamp
                                    }
                                }
                            ]
                        },
                        {
                            tag: "hr"
                        },
                        {
                            tag: "note",
                            elements: [
                                {
                                    tag: "plain_text",
                                    content: "访问记录已自动记录"
                                }
                            ]
                        }
                    ]
                }
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.code === 0) {
                    console.log('✅ 日志已发送到飞书');
                    return true;
                } else {
                    console.error('❌ 飞书返回错误:', result.msg);
                    return false;
                }
            } else {
                const errorText = await response.text();
                console.error('❌ 飞书 Webhook 请求失败:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ 发送到飞书失败:', error);
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

        console.log('📤 准备发送日志到飞书:', logEntry);

        // 先添加到待发送队列（确保不会丢失）
        addToPendingQueue(logEntry);
        console.log('✅ 日志已添加到待发送队列');

        // 发送到飞书 Webhook
        sendToFeishuWebhook(logEntry).then(success => {
            if (success) {
                // 发送成功，从队列中移除
                removeFromPendingQueue(logEntry);
            }
        }).catch(err => {
            console.error('飞书 Webhook 发送失败:', err);
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
                    const success = await sendToFeishuWebhook(logEntry);
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
     * 从飞书获取日志（此功能需要飞书 API，暂时不支持）
     */
    async function fetchLogsFromServer() {
        console.warn('⚠️ 飞书 Webhook 方案不支持从服务器获取日志');
        console.warn('💡 日志会直接发送到飞书群聊，请在群聊中查看');
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

    // 测试飞书 Webhook 是否配置
    window.testFeishuWebhook = async function() {
        const webhookUrl = FEISHU_WEBHOOK_URL || localStorage.getItem('shipping_tools_feishu_webhook') || '';
        
        if (!webhookUrl) {
            console.error('❌ 飞书 Webhook URL 未配置');
            console.log('📝 请设置 FEISHU_WEBHOOK_URL 或运行：');
            console.log('   localStorage.setItem("shipping_tools_feishu_webhook", "你的Webhook URL")');
            return false;
        }

        console.log('🧪 测试飞书 Webhook...');
        
        try {
            const testMessage = {
                msg_type: "text",
                content: {
                    text: "🧪 测试消息：飞书 Webhook 配置成功！"
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
                if (result.code === 0) {
                    console.log('✅ 飞书 Webhook 测试成功！');
                    console.log('💡 请检查飞书群聊是否收到测试消息');
                    return true;
                } else {
                    console.error('❌ 飞书返回错误:', result.msg);
                    return false;
                }
            } else {
                const errorText = await response.text();
                console.error('❌ 飞书 Webhook 请求失败:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ 测试失败:', error);
            return false;
        }
    };
})();
