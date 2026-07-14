# 4i.codes 状态看板

> 部署在 **[4i.codes/status](https://4i.codes/status)** — 实时监控 4i.codes API 中转平台上游各渠道的可用性、延迟与错误。

- 基于 [check-cx](https://github.com/BingZi-233/check-cx) 二次开发
- 保留 shadcn/ui + Tailwind 4 前端框架、Vercel AI SDK 探测框架
- **移除 Supabase 依赖**,改用本地 **SQLite** (better-sqlite3) 持久化历史
- **多渠道支持** — 每一份 provider 配置带 `groupName` 字段,同一个模型可以配多条 (不同 apiKey → 不同渠道) 分组显示
- **管理后台** — 无需 SSH 手工改文件,`/admin` 密码登录后可视化增删改 provider

> 📘 **完整部署清单看 [DEPLOY.md](./DEPLOY.md)**(git clone / tar 两种首次部署方式、nginx 反代、数据备份、忘密码、常见错误全在里面)
> 🛠️ **改代码 / 二开先看 [CONTRIBUTING.md](./CONTRIBUTING.md)**(目录导览、常见改动指引、已知陷阱)

---

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router, standalone) + React 19 |
| UI | shadcn/ui + Tailwind CSS 4 + lucide-react |
| 数据 | better-sqlite3 (单文件) + JSON provider 配置 |
| 探测 | Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| 部署 | Docker (multi-stage, 单节点) |

---

## 快速开始

### 1. 环境准备
- Node.js 20+
- 一台可以访问 `api.4i.codes` 的机器
- 一个 4i.codes API key (用于探测,建议单独申请一个低配额 key,不要复用生产 key)

### 2. 装依赖
```bash
npm install
```

### 3. 写 provider 配置

**推荐用管理后台**(见下方"管理后台"章节)。也可以手工建 `data/providers.json` (被 `.gitignore` 忽略):
```jsonc
[
  {
    "name": "GPT-5 · 主渠道",
    "type": "openai",
    "endpoint": "https://api.4i.codes/v1/chat/completions",
    "model": "gpt-5-mini",
    "apiKey": "sk-xxx-主渠道key",
    "groupName": "主渠道",
    "enabled": true
  },
  {
    "name": "GPT-5 · 备用渠道",
    "type": "openai",
    "endpoint": "https://api.4i.codes/v1/chat/completions",
    "model": "gpt-5-mini",
    "apiKey": "sk-xxx-备用渠道key",
    "groupName": "备用渠道",
    "enabled": true
  }
]
```
参考 `data/providers.example.json`。生产环境也可以把整段 JSON 放到环境变量 `PROVIDERS_JSON` 里,避免落盘。

### 4. 起服务
```bash
npm run dev              # http://localhost:8800
# 或生产:
npm run build && npm start
```
首次进页面会立即触发一次探测。之后每 `CHECK_POLL_INTERVAL_SECONDS` 秒 (默认 60) 自动探测一次。SQLite 文件默认写在 `data/status.db`。

---

## 管理后台

访问 `/admin/login`,首次启动时服务器日志会打印一次性密码:

```
╔══════════════════════════════════════════════════════════╗
║  4i.codes status — 管理端首次启动                        ║
║  URL:      /admin/login                                  ║
║  Password: 5xC9tRp2mQ8n                                  ║
║  ⚠ 请立即登录并到设置里修改密码                          ║
╚══════════════════════════════════════════════════════════╝
```

登录后可以:
- **新增/编辑/删除 provider**(直接写回 `data/providers.json`)
- **修改密码**(存 SQLite `admin_credentials`,scrypt 哈希)
- **设置基线天数**(`baselineDays` — "收录"列会展示 `max(实际天数, baselineDays)`)

API key **无回显**:列表里只显示 `sk-****xxxx` 后 4 位,编辑时留空则保留原值,填新值即替换。

如果忘记密码,SSH 到服务器:
```bash
sqlite3 /root/status/data/status.db "DELETE FROM admin_credentials"
# 重启服务, 日志会再次打印一次性密码
```

---

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PROVIDERS_JSON` | — | 整段 provider 配置 JSON;优先级高于文件 |
| `STATUS_PROVIDERS_PATH` | `data/providers.json` | provider 配置文件路径 |
| `STATUS_DB_PATH` | `data/status.db` | SQLite 数据文件路径 |
| `ADMIN_INITIAL_PASSWORD` | 随机 12 位 | 首次启动指定初始密码;省略则日志打印随机值 |
| `CHECK_POLL_INTERVAL_SECONDS` | `60` | 探测间隔 (15-600) |
| `CHECK_CONCURRENCY` | `5` | 单批并发数 (1-20) |
| `HISTORY_RETENTION_DAYS` | `30` | 历史保留天数 (7-365) |

参考 [`.env.example`](.env.example)。

---

## 部署

生产部署走 Docker,详见 [`DEPLOY.md`](./DEPLOY.md)。

- nginx 反代路径为 `4i.codes/status/`
- 数据卷挂载: `./data:/app/data` (SQLite + provider 配置)
- 单节点,不需要外部数据库/缓存

---

## API

- `GET /api/dashboard?trendPeriod=7d|15d|30d` — Dashboard 聚合数据 (带 ETag)

## Embed 模式 (用于 iframe 嵌入)

`4i.codes/console` 里 `/status-monitor` 页面通过 iframe 嵌入本站, 会自动追加 `?embed=1` 让本站隐藏顶栏和页脚, 避免与 console 侧栏重复.

**契约**:
- URL query 带 `embed=1` (或 `embed=true`) 时启用
- 见 `components/embed-mode.tsx` (读 query 给 `<html>` 加 `.embed-mode` class)
- CSS 规则在 `app/globals.css` 最下方(隐藏 `.ficodes-topbar` / `footer` / 撤销 body padding-top)

**手工验证**:直接访问 `https://4i.codes/status?embed=1` → 应该看到只有主内容,没有顶栏没有页脚。

---

## 目录

```
├── app/                    Next.js App Router
│   ├── page.tsx            主 Dashboard 页
│   ├── layout.tsx          顶栏 + 全局字体
│   └── api/dashboard/      数据聚合 API
├── components/             shadcn UI + 业务组件
│   ├── top-bar.tsx         4i.codes 胶囊顶栏
│   ├── dashboard-view.tsx  主视图 (来自 check-cx)
│   └── provider-card.tsx   单个 provider 卡片
├── lib/
│   ├── core/               探测调度 + 缓存 + 状态
│   │   ├── poller.ts       单节点后台轮询
│   │   ├── dashboard-data.ts
│   │   └── health-snapshot-service.ts
│   ├── database/           SQLite 持久化层
│   │   ├── sqlite.ts       连接单例 + schema
│   │   ├── history.ts      写入/读取历史
│   │   ├── availability.ts 7/15/30 天可用性聚合
│   │   └── config-loader.ts JSON provider 配置加载
│   ├── providers/          探测实现 (原 check-cx)
│   └── types/              统一类型
├── public/                 logo/字体/favicon
├── data/                   SQLite + 配置 (git-ignored)
├── Dockerfile
├── docker-compose.yml
├── DEPLOY.md
├── CONTRIBUTING.md
└── README.md
```

---

## 致谢

底层探测框架 fork 自 [`BingZi-233/check-cx`](https://github.com/BingZi-233/check-cx) (MIT)。原项目使用 Supabase 存储历史,支持多节点选举、后台管理平台、系统通知等丰富功能;4i.codes 这个 fork 精简为单节点 + SQLite + JSON 配置,更适合单个中转站长自管的场景。

## License

MIT (与上游一致)。
