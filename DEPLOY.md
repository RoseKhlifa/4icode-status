# 部署到 4i.codes/status

面向单节点 Linux 服务器 (Debian/Ubuntu/Alpine) 的部署清单。

---

## 0. 前置

- 域名 `4i.codes` 已经指向该服务器
- nginx 已经反代 `/` (首页)、`/doc/` (文档)、`/contact`、`/about`;这一步给 `/status/` 路径新增反代
- 一台可以出网访问 `api.4i.codes` 的机器 (即部署服务器本身,如果 API 不同源就当 CDN 出口)
- 一份专用的低配额 **探测 API key** (每个渠道一份;不要用生产大 key)

---

## 1. clone

```bash
mkdir -p /opt/4icode && cd /opt/4icode
git clone git@github.com:RoseKhlifa/4icode-status.git status
cd status
```

---

## 2. 写 provider 配置

**方案 A: 落文件 (推荐日常运维)**
```bash
mkdir -p data
cp data/providers.example.json data/providers.json
vim data/providers.json    # 填真实 apiKey
chmod 600 data/providers.json
```
`data/` 会被 `.gitignore`,不会被 git push 出去。

**方案 B: 落环境变量 (推荐 CI/托管平台)**
把整段 JSON 塞 `.env`:
```env
PROVIDERS_JSON=[{"name":"GPT-5 (主渠道)","type":"openai","endpoint":"https://api.4i.codes/v1/chat/completions","model":"gpt-5-mini","apiKey":"sk-xxx","groupName":"主渠道","enabled":true}]
```

---

## 3. Docker 部署 (推荐)

```bash
cp .env.example .env
# 按需调整轮询间隔、并发等
docker compose build
docker compose up -d
docker logs -f 4icode-status
```
容器启动后应该在日志里看到:
```
[status] 初始化后台轮询器，interval=60000ms，首次探测预计 ...
```
数据卷 `./data` 挂到容器 `/app/data`,SQLite 文件与 provider 配置都在里面。

---

## 4. 直接 Node 部署 (无 Docker)

```bash
# native 模块要求 python + make + g++
sudo apt install -y python3 make g++ build-essential

# 安装 + 构建
npm ci
npm run build

# 用 pm2 常驻
npm i -g pm2
pm2 start "npm start" --name 4icode-status
pm2 save
pm2 startup
```

---

## 5. nginx 反代

在 `4i.codes` 站点配置里加:

```nginx
server {
    server_name 4i.codes;
    listen 443 ssl http2;
    # ... 已有 ssl_certificate 等 ...

    # 已有的路由
    location = / { root /var/www/4icode-landing; try_files /index.html =404; }
    location /doc/ { root /var/www/4icode-docs/dist; }
    location = /contact { root /var/www/4icode-landing; try_files /contact.html =404; }
    location = /about   { root /var/www/4icode-landing; try_files /about.html   =404; }

    # 新增: 4i.codes/status → 状态看板容器
    location /status/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # SSE / streaming (未来若做实时刷新有用)
        proxy_buffering off;
    }
}
```

注意: `location /status/` 后面的 `/` 和 `proxy_pass http://127.0.0.1:3000/;` 的 `/` 都不能少 —— 否则 `/status/foo` 会被转成 `http://127.0.0.1:3000/status/foo`,Next.js 不认。

如果希望状态看板本身也走 `/status` 路径 (即 Next.js basePath),后续可以在 `next.config.ts` 里加 `basePath: "/status"`,同时把 nginx 那行的两个尾斜杠都去掉。

reload nginx:
```bash
nginx -t && systemctl reload nginx
```

访问 `https://4i.codes/status/` 检查:
- 看到 4i.codes 米色胶囊顶栏
- Dashboard 会先出骨架屏,然后填入 provider 卡片
- 60 秒后自动刷一次

---

## 6. 常见问题

**Q: `better-sqlite3` 装不上?**
- alpine: `apk add python3 make g++`
- ubuntu: `apt install python3 make g++ build-essential`
- 或者直接用 Docker 部署,Dockerfile 已经带了这些工具链

**Q: 日志一直报 `未找到 provider 配置`?**
- 检查 `.env` 里 `PROVIDERS_JSON` 是否完整 (JSON 转义要小心) 或 `data/providers.json` 是否存在且可读
- 容器场景: `docker exec 4icode-status ls /app/data`

**Q: 想清空历史,重新累计?**
```bash
docker compose down
rm data/status.db data/status.db-wal data/status.db-shm
docker compose up -d
```

**Q: 想加新渠道/新模型?**
- 编辑 `data/providers.json`,加一条即可 (无需重启,`config-loader` 每轮询周期都会重读)
- `id` 是从 `type+endpoint+model+groupName+apiKey前8位hash` 派生,同一份配置 → 同一 id,历史不会断代
