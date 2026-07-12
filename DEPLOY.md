# 部署到 4i.codes/status

面向单节点 Linux 服务器 (Debian/Ubuntu/Alpine) 的完整部署清单。

- 首次部署 → [1. 首次部署](#1-首次部署) → [2. 装依赖](#2-装依赖) → [3. 起服务](#3-起服务) → [4. 首次登录管理后台](#4-首次登录管理后台) → [5. nginx 反代](#5-nginx-反代)
- 后续更新 → [6. 后续更新流程 (git pull)](#6-后续更新流程-git-pull)
- 出问题了 → [7. 数据备份与恢复](#7-数据备份与恢复) · [8. 忘记管理密码](#8-忘记管理密码) · [9. 常见错误排查](#9-常见错误排查)
- 参数细节 → [10. 环境变量](#10-环境变量)

---

## 0. 前置

- 一台可以访问 `api.4i.codes` 的服务器 (至少 512M 内存, SQLite + Next.js standalone 占用很小)
- 域名 `4i.codes` 已经指向该服务器 (如果只是内网用可跳过 nginx 那节)
- 一份或多份**探测用**的 API key
  - 每个渠道单独一把,不要复用生产大 key
  - 建议低配额,只需能发 chat completions 请求

---

## 1. 首次部署

### 方案 A: `git clone` (推荐, 后续 `git pull` 直接更新)

```bash
cd /root
git clone git@github.com:RoseKhlifa/4icode-status.git status
# 如果服务器没配 SSH key, 用 https:
# git clone https://github.com/RoseKhlifa/4icode-status.git status
cd status
```

如果 `git@github.com` 不通,配一下 SSH key:

```bash
ssh-keygen -t ed25519 -C "4i.codes-server"   # 一路回车
cat ~/.ssh/id_ed25519.pub
# 复制输出 → GitHub Settings → SSH keys → New SSH key 贴上
ssh -T git@github.com    # 测试
```

### 方案 B: `tar.gz` (适合没 git 或临时试)

```bash
# 本地打包好后 scp 上去
scp G:/TOKEN/4icode/4icode-status.tar.gz root@<IP>:/root/

# 服务器上
cd /root
tar -xzf 4icode-status.tar.gz    # 解出 /root/status/
cd status
```

**⚠ 从 tar 想切到 git 流程**: 见 [6. 后续更新流程 (git pull)](#6-后续更新流程-git-pull) 底部"从 tar 迁移到 git"。

---

## 2. 装依赖

```bash
# native 依赖 (better-sqlite3 要 python + make + g++ 编译)
apt update
apt install -y python3 make g++ build-essential

# Node 依赖 (.npmrc 已设 npmmirror 国内镜像)
npm install
```

**alpine 用户**:
```bash
apk add --no-cache python3 make g++ libstdc++
```

---

## 3. 起服务

两种方式二选一。

### 方式 A — Docker Compose (最省心)

```bash
docker compose build
docker compose up -d
docker logs -f 4icode-status
```

容器启动后应该看到:
```
[status] 初始化后台轮询器，interval=60000ms，首次探测预计 ...
╔══════════════════════════════════════════════════════════╗
║  4i.codes status — 管理端首次启动                        ║
║  URL:      /admin/login                                  ║
║  Password: 5xC9tRp2mQ8n              ← 记下来!            ║
║  ⚠ 请立即登录并到设置里修改密码                          ║
║  ⚠ 此密码仅本次显示, 不再重复输出                        ║
╚══════════════════════════════════════════════════════════╝
```

数据卷 `./data` 挂到容器 `/app/data`,SQLite 文件与 provider 配置都在里面。

### 方式 B — pm2 + Node 直起

```bash
npm run build
npm i -g pm2
pm2 start "npm start" --name 4icode-status
pm2 save
pm2 startup            # 让 pm2 开机自启, 按提示复制 systemctl 命令跑一下
pm2 logs 4icode-status --lines 100
```

同样, `pm2 logs` 里首次启动会打印**一次性初始密码**。**必须记下来**,再看不到了(想再看只能删掉 credentials 表重启,见 [8. 忘记管理密码](#8-忘记管理密码))。

---

## 4. 首次登录管理后台

```
http://<你的IP>:8800/admin/login
```
或 (nginx 反代之后)
```
https://4i.codes/status/admin/login
```

- 输入日志里的一次性密码 → 进 `/admin`
- 点右上"修改密码" → 改成你能记住的
- 点"新增 provider" → 填 name / vendor / service / type / endpoint / model / apiKey / groupName 等
- 保存后 60 秒内(通常十几秒)看板就出现新卡片

**关于伪装 (Claude 反向渠道)**:
- `type` 选 `anthropic (/v1/messages 原生)`
- `endpoint` 填 `https://api.4i.codes/v1/messages`
- **伪装模板** 选 `Claude Code CLI` — 会自动注入 5 个必要的 header + system prompt

参考 `data/providers.example.json` 里的两条 cc-kiro / cc逆向 示例。

---

## 5. nginx 反代

在你的 `4i.codes` 站点配置里加一段:

```nginx
server {
    server_name 4i.codes;
    listen 443 ssl http2;
    # ... 已有 ssl_certificate 等 ...

    # 已有路由 (示例)
    location = /            { root /var/www/4icode-landing; try_files /index.html =404; }
    location /doc/          { root /var/www/4icode-docs/dist; }
    location = /contact     { root /var/www/4icode-landing; try_files /contact.html =404; }
    location = /about       { root /var/www/4icode-landing; try_files /about.html   =404; }

    # 新增: 4i.codes/status → 状态看板容器
    location /status/ {
        proxy_pass http://127.0.0.1:8800/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;    # ⚠ 关键: cookie Secure 判断靠它
        proxy_buffering off;
    }
}
```

**⚠ 两个尾斜杠都不能省** — `location /status/` 后面的 `/` 和 `proxy_pass http://127.0.0.1:8800/;` 的 `/` 都不能少,否则 `/status/foo` 会被转成 `http://127.0.0.1:8800/status/foo`, Next.js 不认。

reload nginx:
```bash
nginx -t && systemctl reload nginx
```

访问 `https://4i.codes/status/` 检查:
- 看到 4i.codes 米色胶囊顶栏
- Dashboard 骨架屏 → 填入 provider 卡片
- 60 秒后自动刷新一次

---

## 6. 后续更新流程 (git pull)

日常更新非常清爽:

```bash
cd /root/status
git pull
npm install       # 只有 package.json 变了才需要
npm run build
pm2 restart 4icode-status
# 或 docker compose up -d --build
```

`data/` 目录被 `.gitignore` 保护, `git pull` 不会覆盖里面的 `providers.json` 和 `status.db*`。

### 从 tar 迁移到 git

如果你之前是用 tar.gz 解压部署的, `/root/status` 里没有 `.git`, 直接 `git pull` 会失败。**推荐做法** (备份 → 重 clone → 恢复):

```bash
pm2 stop 4icode-status
cd /root
cp -a status/data /root/status-data-backup    # 备份运营数据
mv status status.tar-legacy                    # 老目录搬走 (万一挂了能回滚)

git clone git@github.com:RoseKhlifa/4icode-status.git status
cd status
cp -a /root/status-data-backup/. data/         # 恢复运营数据
ls -la data/                                    # 应看到 providers.json + status.db*

npm install && npm run build
pm2 start 4icode-status
pm2 logs 4icode-status --lines 30              # 确认无报错

rm -rf /root/status.tar-legacy /root/status-data-backup    # 确认没问题再删
```

---

## 7. 数据备份与恢复

**运营数据一共两个文件**:
- `data/providers.json` — provider 配置 (含 apiKey,注意保密)
- `data/status.db` — SQLite 探测历史 (还有同目录的 `status.db-wal` `status.db-shm` 两个 WAL 副本)

### 定期备份 (cron)

```bash
# crontab -e
0 3 * * * tar -czf /backup/4icode-status-$(date +%Y%m%d).tar.gz -C /root/status data
```

### 备份到远端 (rsync)

```bash
rsync -avz --delete /root/status/data/ user@backup-host:/backup/4icode-status/
```

### 手工恢复

```bash
pm2 stop 4icode-status    # 或 docker compose down

tar -xzf /backup/4icode-status-20260712.tar.gz -C /root/status
# 覆盖 data/, providers.json + status.db 都回来了

pm2 start 4icode-status   # 或 docker compose up -d
```

---

## 8. 忘记管理密码

密码存在 SQLite 里 (scrypt 哈希, 不可反解), 只能重置:

```bash
sqlite3 /root/status/data/status.db "DELETE FROM admin_credentials"
pm2 restart 4icode-status
# 或 docker compose restart

pm2 logs 4icode-status --lines 30
# 日志会再次打印一次性初始密码
```

也可以预置密码, 避免每次重启看日志:
```bash
# 在 .env 里加
ADMIN_INITIAL_PASSWORD=your-known-password
# 再执行上面的 DELETE + restart
```

---

## 9. 常见错误排查

### Q: 登录页输密码点按钮没反应, 也不跳转

**症状**: F12 Network 里看到 `/api/admin/login` 返回 200, 但页面卡在登录页。

**原因**: 你走 http 直连 (比如 `http://IP:8800`), 老版本代码里 cookie 会带 `Secure` 标记, 被浏览器丢掉。

**解决**: 最新版本 (`9940ed4` 之后) 已经修复,`git pull && npm run build && pm2 restart` 即可。或者用 https + nginx 访问。

### Q: 后台改动 provider 后, 前台 5-10 分钟才更新

**原因**: 老版本有 4 层缓存叠加。

**解决**: 最新版本已修 — 后台保存立刻:
1. 触发一次即时探测
2. 清服务端 dashboardCache
3. 前端每 60s tick 用 forceFresh 拉新
4. `/api/dashboard` 响应加 `no-store` 头

改完 60 秒内一定能看到。如果还没,`Ctrl+F5` 硬刷新绕开浏览器缓存。

### Q: `better-sqlite3` 装不上 / 报 node-gyp 错

```bash
# Debian/Ubuntu
apt install -y python3 make g++ build-essential

# Alpine
apk add --no-cache python3 make g++ libstdc++

# 之后
rm -rf node_modules
npm install
```

如果国内网不通, `.npmrc` 里已经设好了 `registry=https://registry.npmmirror.com/`。

### Q: `[status] 未找到 provider 配置`

**原因**: `data/providers.json` 不存在,`PROVIDERS_JSON` 环境变量也没设。

**解决**:
- 走后台: 直接进 `/admin` → "新增 provider",保存后会自动生成 `data/providers.json`
- 走文件: `cp data/providers.example.json data/providers.json && vim data/providers.json`

### Q: nginx 反代后, `/status/` 路径下静态资源 404

**原因**: nginx `location /status/` 或 `proxy_pass` 的尾斜杠丢了。

**解决**: 严格照 [5. nginx 反代](#5-nginx-反代) 的配置来, 两处 `/` 都不能省。

### Q: Claude 渠道一直显示 0.00% / 401 / 403

**原因**: Claude 反向渠道会校验客户端指纹, 必须伪装成 Claude Code CLI。

**解决**: 后台编辑该 provider → **伪装模板** 选 `Claude Code CLI` → 保存。

---

## 10. 环境变量

支持通过 `.env` 或 `docker compose` 的 `environment` 段注入。

| 变量 | 默认 | 说明 |
|---|---|---|
| `PROVIDERS_JSON` | — | 整段 provider 配置 JSON;优先级高于文件。生产不推荐,更适合托管平台无落盘场景 |
| `STATUS_PROVIDERS_PATH` | `data/providers.json` | provider 配置文件路径 |
| `STATUS_DB_PATH` | `data/status.db` | SQLite 数据文件路径 |
| `ADMIN_INITIAL_PASSWORD` | 随机 12 位 | 首次启动指定初始密码;省略则日志打印随机值 |
| `CHECK_POLL_INTERVAL_SECONDS` | `60` | 探测间隔 (15-600) |
| `CHECK_CONCURRENCY` | `5` | 单批并发数 (1-20) |
| `HISTORY_RETENTION_DAYS` | `30` | 历史保留天数 (7-365) |
| `NODE_ENV` | — | Docker 里设 `production`;开发时不设 |
| `NEXT_DISABLE_STANDALONE` | — | 设 `1` 关闭 standalone 打包 (一般不用) |

`.env` 示例:
```env
# 探测参数
CHECK_POLL_INTERVAL_SECONDS=60
CHECK_CONCURRENCY=8
HISTORY_RETENTION_DAYS=30

# 预置管理密码 (可选; 省略则日志打印随机)
# ADMIN_INITIAL_PASSWORD=your-strong-password
```

---

## 附录: 完整目录布局参考

```
/root/status/                       ← git 仓库根
├── app/                             ← Next.js App Router
├── components/                      ← React 组件
├── lib/                             ← 探测 / 缓存 / admin 逻辑
├── public/                          ← 静态资源 (logo / 字体 / vendor SVG)
├── data/                            ← ⚠ .gitignore 忽略, 运营数据
│   ├── providers.json               ← 你的真实 provider 配置 (含 apiKey)
│   ├── providers.example.json       ← 示例 (入库, 参考用)
│   └── status.db                    ← SQLite 探测历史
├── .env                             ← ⚠ .gitignore 忽略, 环境变量
├── .env.example                     ← 示例
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
├── DEPLOY.md                        ← 就是这份文档
└── CONTRIBUTING.md                  ← 开发指南 (给未来的你/AI agent)
```
