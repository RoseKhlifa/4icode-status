# 开发指南 (给未来的自己 / AI Agent)

如果你是 **未来的 Claude Code 会话** 或 **人类开发者** 打算改这个仓库,先读完这份文档再动手。

---

## 项目定位

- **URL**: `4i.codes/status/`
- **作用**: 实时监控 4i.codes 各上游渠道的接口可用性/延迟/错误率
- **技术栈**: Next.js 16 App Router + shadcn/ui + Tailwind 4 + better-sqlite3
- **上游**: fork 自 [BingZi-233/check-cx](https://github.com/BingZi-233/check-cx),但已经**移除 Supabase 依赖**换成 SQLite + JSON

---

## 目录结构 (哪些能改、哪些别乱碰)

```
app/                    Next.js 页面 (改这里改 UI 路由)
├── page.tsx            ← 主 Dashboard 页,4i 品牌 footer 在这
├── layout.tsx          ← 顶栏、字体、metadata
├── globals.css         ← ⚠ 4i 品牌色板/顶栏/字体都在这
└── api/dashboard/      ← 前端数据接口

components/
├── top-bar.tsx           ← 4i 胶囊顶栏 (与 landing/docs 保持一致)
├── dashboard-bootstrap.tsx  ← 首屏加载 + SWR 引导
├── dashboard-view.tsx    ← 主视图容器 (DashHeader + FilterBar + StatusTable)
├── dashboard-skeleton.tsx ← 骨架屏
├── dash-header.tsx       ← 顶部品牌横幅 + 正常/异常计数徽章
├── filter-bar.tsx        ← 分类/服务商/服务/通道下拉 + 时间窗口 tabs
├── status-table.tsx      ← 主表格 (9 列)
├── status-strip.tsx      ← 90 格监控条 (绿/黄/红/灰)
├── vendor-badge.tsx      ← 服务商小徽章 (CC/CX/GM/OA/AN)
├── provider-icon.tsx     ← lobehub 官方图标 (备用)
├── client-time.tsx       ← 客户端时间格式化 (避免 SSR 时区错乱)
└── ui/                   ← shadcn 生成的原子组件 (badge/card/table/hover-card 等)

lib/
├── core/
│   ├── poller.ts       ← 后台定时探测 (单节点,别加 leader-election)
│   ├── dashboard-data.ts ← 聚合数据 + ETag 缓存
│   ├── health-snapshot-service.ts ← 探测调度
│   ├── frontend-cache.ts ← 前端 SWR 缓存
│   ├── global-state.ts ← 全局状态 (poller timer, ping cache)
│   ├── polling-config.ts ← 轮询参数
│   └── status.ts       ← STATUS_META, PROVIDER_LABEL 显示映射
├── database/           ← ⚠ 已彻底改为 SQLite,别再引入 supabase
│   ├── sqlite.ts       ← 连接单例, schema DDL
│   ├── history.ts      ← check_history 表读写
│   ├── availability.ts ← 运行时窗口聚合
│   └── config-loader.ts ← JSON provider 配置
├── providers/          ← 来自 check-cx 的探测框架
│   ├── ai-sdk-check.ts ← 用 Vercel AI SDK 探测各家
│   ├── endpoint-ping.ts ← 端点 TCP/HTTP ping
│   └── challenge.ts    ← 数学题验证真回答
├── types/              ← 统一类型
└── utils/              ← 时间/错误/tag 辅助

public/
├── logo.png            ← 4i 品牌 logo
├── favicon.png
└── fonts/
    ├── HarmonyOS_SansSC_Regular.ttf
    └── JetBrainsMono-Regular.ttf

data/                   ← ⚠ .gitignore 忽略, 生产运维目录
├── providers.json      ← 生产配置 (不入库)
├── providers.example.json  ← 示例 (入库)
└── status.db           ← SQLite (不入库)
```

---

## 常见改动 → 该改哪里

| 需求 | 改动 |
|---|---|
| 加一个新的探测目标 (新模型 / 新渠道) | 编辑 `data/providers.json`,加一条 |
| 调整探测间隔/并发 | `.env` 里改 `CHECK_POLL_INTERVAL_SECONDS` / `CHECK_CONCURRENCY` |
| 换品牌色 | `app/globals.css` 顶部 `:root` 变量 |
| 改顶栏链接 | `components/top-bar.tsx` |
| 改首页文案 | `app/page.tsx` 里 h1 / p / footer |
| 加一个新的 provider type (比如 mistral) | `lib/types/provider.ts` 加 type; `lib/providers/ai-sdk-check.ts` 加分支 |
| 改可用率窗口 (加 90 天?) | `lib/database/availability.ts` 里 `PERIOD_DAYS`; `lib/types/dashboard.ts` 里 `AvailabilityPeriod` 加一枚 |
| 清空历史 | 删 `data/status.db*` 三个文件 |

---

## Provider 配置约定

**格式**:
```jsonc
{
  "name":      "GPT-5 · 主渠道",              // 卡片标题
  "type":      "openai",                        // openai | gemini | anthropic
  "endpoint":  "https://api.4i.codes/v1/chat/completions",  // 完整 URL
  "model":     "gpt-5-mini",                    // 模型 ID
  "apiKey":    "sk-xxx",                        // 探测用 key, 服务端保留, 不外泄
  "groupName": "主渠道",                        // ⚠ 多渠道分组的关键字段
  "enabled":   true,
  "is_maintenance": false                       // 可选, true 时卡片显示"维护中",不发探测
}
```

**id 是自动的**,不用手工指定 — `config-loader` 会根据 `type|endpoint|model|groupName|apiKey前8位hash|name` 生成稳定 id。同一份配置每次启动都是同一 id,历史不会断代。

**多渠道场景**:
- 想监控"同一模型走不同上游"→ 建多条同 `name` 前缀的配置,`groupName` 不同 (`主渠道` / `备用渠道` / `渠道A` / …)
- Dashboard 会按 `groupName` 分区展示

**Claude 反向渠道 (伪装)**:

Claude 系反向渠道 (走 `/v1/messages`) 通常会校验请求头,只有伪装成官方 Claude Code CLI 才能通过。加 `"disguise": "claude-code"` 就会自动注入:
- `User-Agent: claude-cli/2.1.114 (external, sdk-cli)`
- `X-App: cli`
- `anthropic-beta: claude-code-20250219,...`
- `anthropic-dangerous-direct-browser-access: true`
- `anthropic-version: 2023-06-01`
- Body: `{ metadata: {user_id: "..."}, system: [{text: "You are Claude Code...", type: "text"}] }`

预设定义在 `lib/providers/disguises.ts` — 新增伪装模板改这个文件即可。

**Claude 的两种探测路径**:
- **原生 `/v1/messages`**: `type: "anthropic"` + `endpoint: ".../v1/messages"` — 保底方式
- **OpenAI 兼容**: `type: "openai"` + `endpoint: ".../v1/chat/completions"` + `model: "claude-*"` — 仅适用于把 Claude 转成 OpenAI 格式的中转

---

## 已知陷阱

- **`better-sqlite3` 是 native 模块**:换 Node 版本后必须 `npm rebuild better-sqlite3`。Docker 部署自带 `python make g++`,不用担心。
- **Next.js standalone 打包**:`next.config.ts` 已经声明 `serverExternalPackages: ["better-sqlite3"]`,Dockerfile 还额外拷 `node_modules/better-sqlite3` 兜底。改这两处任一都要同步。
- **`app/globals.css` 里 `--background` 是 hex,不是 oklch**:上游用 `oklch()`,我们改成米黄墨系后直接写 hex,不要试图统一回 oklch 除非你想大改所有其他 token。
- **暗色模式已禁用**:`.dark` 类和 `:root` 变量几乎相同,顶栏太阳按钮是纯占位。别恢复 `next-themes`,layout.tsx 里没引它了。
- **单节点**:`poller.ts` 已经删掉 leader-election。如果将来要多节点,不要恢复 Supabase 那套 lease 表 — 用 Redis 或 Postgres advisory lock。

---

## 本地开发

```bash
npm install
cp data/providers.example.json data/providers.json
# 编辑 data/providers.json 填真实探测 key
npm run dev
```
访问 `http://localhost:8800/`。首屏会立即触发一次探测,60s 后自动再探。

**看数据库**:
```bash
sqlite3 data/status.db
sqlite> .tables
sqlite> SELECT config_id, status, checked_at FROM check_history ORDER BY checked_at DESC LIMIT 10;
```

**看探测行为**:直接看控制台 `[status]` 前缀的日志。失败会按 `groupName` 分组打印详细错误。

---

## 部署

见 [`DEPLOY.md`](./DEPLOY.md)。TL;DR:
```bash
docker compose build
docker compose up -d
```
nginx 反代 `4i.codes/status/` → `127.0.0.1:8800`,数据卷挂 `./data:/app/data`。

---

## 边界

- **不要提交 API key**。`data/` 目录被 `.gitignore` 覆盖,`.env` 也是。
- **不要开放注册/后台**。这是纯只读看板。如果需要后台改配置,直接 SSH 上服务器改 `data/providers.json`。
- **保留 `check-cx` 致谢**:footer 里 "探测框架二开自 check-cx" 那行不要拿掉,上游是 MIT。

---

## 联系

在 `4i.codes` 主域下的 4 个子服务是姊妹项目:
- `/` (静态) — landing
- `/doc/` (VuePress) — 文档
- `/status/` (本项目) — 状态看板
- `/contact` `/about` (静态) — 联系/关于

改一处品牌样式往往要同步改多个仓库。品牌调色板固定为 `paper #efe8df` + `ink #161311`,别擅自换色。
