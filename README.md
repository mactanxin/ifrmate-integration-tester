# iframe-integration-tester

一个用于前端联调的本地工作台，专门测试 Web 系统被其他系统通过 `iframe` 嵌套时的统一登录、`token` 下发、`postMessage` 通信、登出联动，以及嵌入策略配置。

适合这些场景：

- 宿主系统通过 `iframe` 嵌入业务系统
- 宿主系统需要向子系统发送登录态或刷新 `token`
- 需要验证子系统在 `iframe` 内的加载、通信和登出行为
- 需要快速排查 `X-Frame-Options`、`CSP frame-ancestors`、第三方 Cookie、移动端宽度等嵌入问题

## 页面说明

- `/`
  `Iframe Lab`，主工作台，用于配置 `iframe`、获取真实 `token`、发送消息、查看事件日志
- `/playbook`
  `Integration Playbook`，内置排查思路，方便联调时快速定位问题

## 已支持功能

根据 [`src/pages/iframe-lab-page.tsx`](/Users/xintan/Workspace/code/react/iframe-integration-tester/src/pages/iframe-lab-page.tsx) 当前实现，主页面支持这些能力：

### 1. iframe 目标预览

- 输入并实时预览目标 URL
- 自动补全 URL 协议
  不带协议时默认补成 `https://`
- 内置常用本地目标快捷按钮
  `http://localhost:3001`、`http://localhost:3000`、`http://localhost:5173`
- 支持在工作台内直接重载 iframe
- 支持新标签页直接打开目标地址

### 2. iframe 嵌入参数调试

- 自定义 `title`
- 自定义 iframe 高度
- 支持桌面、平板、手机三种宽度预设
  `100%`、`820px`、`390px`
- 支持手工输入任意宽度
- 支持编辑 `sandbox` 属性
- 支持编辑 `allow` 权限策略
- 根据当前配置自动生成完整 iframe 嵌入代码
- 一键复制生成的 iframe snippet

### 3. 真实登录取 token

- 支持输入用户名和密码
- 密码会先做浏览器端 `SHA-256` 再发起登录请求
- 调用真实登录接口获取后端返回的原始 token
- 自动把原始 token 包装成：
  `Basic` + `btoa(encodeURI(\`${token}:${Date.now()}\`))`
- 获取成功后会：
  - 展示最新 `raw token`
  - 展示最新 `aiumsToken`
  - 更新请求时间、成功时间、登录状态
  - 写入 `localStorage.aiumsToken`
- 页面会把最新 token 自动填充到消息草稿中，方便继续向 iframe 发送

当前代码内默认登录配置为：

- `backendBase`: `https://192.168.21.220:443/`
- `loginPath`: `/dev/aiums/auth/login/`

注意：

- 当前请求实际使用的是 `loginPath`
- 本地开发时依赖 Vite 代理把 `/dev/*` 转发到 `https://192.168.21.220:443`
- `backendBase` 目前主要用于页面展示和日志说明，不参与实际请求拼接
- `Backend` 和 `Login path` 在页面中是只读展示
- 如果需要对接新的登录环境，需要改源码中的默认值

### 4. postMessage 联调

- 支持手工编辑任意 JSON 消息体
- 支持向 iframe 发送自定义 `postMessage`
- 发送时会根据目标地址自动计算 `targetOrigin`
- 如果 iframe 还没加载完成，会阻止发送并记录日志
- 如果消息不是合法 JSON，会提示错误并记录日志

默认消息草稿为：

```json
{
  "type": "PING",
  "source": "iframe-integration-lab",
  "timestamp": "2026-04-02T00:00:00.000Z"
}
```

### 5. TOKEN / LOGOUT 内置消息

- 支持一键发送 `TOKEN` 消息给 iframe
- 支持一键发送 `LOGOUT` 消息给 iframe
- 执行强制登出时会同时清理本地 `localStorage.aiumsToken`

当前内置消息结构如下：

```json
{
  "type": "TOKEN",
  "payload": {
    "token": "<aiumsToken>",
    "expireIn": 3600
  },
  "timestamp": 1710000000000,
  "id": "msg_1710000000000"
}
```

```json
{
  "type": "LOGOUT",
  "payload": {
    "timestamp": 1710000000000
  }
}
```

### 6. 自动响应 iframe 请求

父页面会监听 `window.message`，并自动记录收到的消息。

当 iframe 发送以下消息类型时：

- `READY`
- `REFRESH_TOKEN`

如果当前父页面已经拿到真实 token，工作台会自动回发一条 `TOKEN` 消息。

如果这时还没有可用 token，也会在日志里明确提示。

### 7. 事件日志与检查清单

- 自动记录这些关键事件：
  - 工作台初始化
  - iframe 加载完成
  - 自定义消息发送
  - `TOKEN` 发送
  - `LOGOUT` 发送
  - 收到 iframe 回传消息
  - token 获取成功或失败
- 日志最多保留最近 12 条
- 内置 iframe 集成检查清单，覆盖：
  - `X-Frame-Options` / `frame-ancestors`
  - 第三方 Cookie / SSO 限制
  - `postMessage` 结构与 `origin` 校验
  - 高度、滚动和移动端宽度适配

## 环境变量

可选。在本地新建 `.env.local`：

```bash
VITE_IFRAME_TEST_USERNAME=用户名
VITE_IFRAME_TEST_PASSWORD=密码
```

用途：

- 预填工作台中的用户名
- 预填工作台中的密码

如果不配置，页面仍然可以正常使用，只是需要手工输入账号密码。

## 本地启动

安装依赖：

```bash
pnpm install
```

启动开发环境：

```bash
pnpm dev
```

默认访问：

```text
http://localhost:5173
```

其他可用命令：

```bash
pnpm build
pnpm lint
pnpm preview
```

## 推荐联调方式

### 场景 1：验证 iframe 是否能正常加载

1. 输入目标 URL
2. 先不要发 token，直接看 iframe 是否能打开
3. 如果打不开，优先检查：
   `X-Frame-Options`、`CSP frame-ancestors`、https/http 混用、登录页 Cookie 策略

### 场景 2：验证父页向子页下发 token

1. 在工作台中获取真实 token
2. 点击 `Send TOKEN`
3. 在子系统里检查是否正确接收到 `postMessage`
4. 确认子系统是否按约定格式完成登录态接管

### 场景 3：验证子页主动请求 token

1. 子页加载后向父页发送 `READY` 或 `REFRESH_TOKEN`
2. 工作台自动回发 `TOKEN`
3. 通过日志确认双方消息结构和时序是否一致

### 场景 4：验证登出联动

1. 点击 `Force logout`
2. 检查父页面本地 token 是否被清除
3. 检查 iframe 是否收到 `LOGOUT`
4. 检查子系统是否完成退出或跳回未登录状态

## 当前限制

- 登录接口地址目前写死在页面源码里，不支持在界面动态修改
- 自动响应逻辑目前只识别 `READY` 和 `REFRESH_TOKEN`
- 只支持发送 JSON 格式消息
- 页面本身不会绕过目标站点的嵌入安全策略；如果目标站点禁止被 iframe 引用，这个工具也无法强行嵌入

## 分享给团队时建议说明

可以直接把这个工具定义为：

> 一个用于 iframe 集成联调的本地实验台，专门帮助前端验证嵌入加载、统一登录 token 下发、postMessage 握手、刷新 token 和登出联动。

推荐提醒使用者先按这个顺序排查：

1. 先确认目标站点允许被嵌入
2. 再确认 iframe 能正常加载
3. 再确认 `postMessage` 双向通信
4. 最后再做 token 登录态和移动端 UI 回归
