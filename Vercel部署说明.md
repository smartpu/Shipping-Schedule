# Vercel 部署说明

## 部署步骤

### 1. 准备 Vercel 账号
- 访问 [Vercel](https://vercel.com)
- 使用 GitHub 账号登录（推荐）

### 2. 部署项目
有两种方式：

#### 方式一：通过 GitHub 自动部署（推荐）
1. 将项目推送到 GitHub 仓库
2. 在 Vercel 中点击 "New Project"
3. 导入你的 GitHub 仓库
4. Vercel 会自动检测项目并部署

#### 方式二：使用 Vercel CLI
```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录执行
vercel
```

### 3. 配置环境变量
1. 在 Vercel 项目设置中找到 "Environment Variables"
2. 添加环境变量：
   - **Name**: `DINGTALK_WEBHOOK_URL`
   - **Value**: 你的钉钉 Webhook URL（例如：`https://oapi.dingtalk.com/robot/send?access_token=...`）

或者直接在 `api/dingtalk-webhook.js` 中配置（不推荐，但可以工作）

### 4. 获取部署后的函数 URL
部署完成后，Vercel 会提供一个 URL，例如：
- `https://your-project.vercel.app/api/dingtalk-webhook`

### 5. 更新前端代码
在 `vendor/server-log.js` 中更新 `PROXY_API_URL`：
```javascript
const PROXY_API_URL = 'https://your-project.vercel.app/api/dingtalk-webhook';
```

## 测试
在浏览器控制台运行：
```javascript
testDingtalkWebhook()
```

如果看到 "✅ Vercel 代理测试成功！"，说明配置正确。

## 注意事项
- Vercel 免费版有请求限制，但对于访问日志记录应该足够
- 如果使用自定义域名，需要更新 `PROXY_API_URL`
- 环境变量修改后需要重新部署才能生效

