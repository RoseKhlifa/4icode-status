# 4icode-status 更新部署指南

## 项目概况

- **项目类型**: Next.js 16 (App Router) + Better-SQLite3
- **运行方式**: pm2 管理 `npm start`
- **监听端口**: 8800
- **公网访问**: https://4i.codes/status/
- **pm2 名称**: `4icode-status`

## 快速更新流程

```bash
cd /root/4icode-status

# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖(如有新增)
npm install

# 3. 构建生产版本(重要:必须带环境变量)
STATUS_BASE_PATH=/status npm run build

# 4. 重启 pm2 服务
pm2 restart 4icode-status --update-env

# 5. 验证
sleep 3
pm2 list | grep 4icode-status
curl -sI https://4i.codes/status/ | head -5
```

## 详细说明

### 1. 拉取代码

```bash
cd /root/4icode-status
git pull origin main
```

检查更新内容:
```bash
git log -1 --stat
```

### 2. 安装依赖

只在 `package.json` 有变化时需要:
```bash
npm install
```

### 3. 构建应用

**⚠️ 关键:必须带 `STATUS_BASE_PATH=/status` 环境变量**

```bash
STATUS_BASE_PATH=/status npm run build
```

**为什么必须设置此变量?**
- Next.js 在构建时生成静态资源路径
- 设置后,HTML 引用 `/status/_next/...` 而非 `/_next/...`
- nginx 反代配置为 `/status/` 开头,不设置会导致资源 404

构建成功标志:
```
✓ Compiled successfully in X.Xs
✓ Generating static pages (4/4)
Route (app)
├ ○ /
├ ƒ /admin
└ ƒ /api/dashboard
```

### 4. 重启 pm2

```bash
pm2 restart 4icode-status --update-env
```

参数说明:
- `--update-env`: 确保重启后环境变量生效
- 不用 `pm2 reload`,因为这是单进程服务

### 5. 验证部署

```bash
# 等待启动
sleep 3

# 检查进程状态
pm2 list | grep 4icode-status
# 应显示: status: online, uptime: 几秒

# 检查日志
pm2 logs 4icode-status --lines 20 --nostream

# 验证本地访问
curl -sI http://127.0.0.1:8800/status/

# 验证公网访问
curl -sI https://4i.codes/status/

# 验证静态资源路径
curl -s http://127.0.0.1:8800/status/ | grep -o 'src="/[^"]*"' | head -3
# 应显示: src="/status/_next/static/..."
```

### 6. 验证功能

浏览器打开 https://4i.codes/status/:
1. 检查页面正常加载(无 MIME type 错误)
2. 检查控制台无 JS/CSS 加载失败
3. 检查状态监控数据是否刷新
4. 检查管理页面 `/status/admin/login` 是否可访问

## pm2 配置

当前配置文件: `ecosystem.config.cjs`

```javascript
module.exports = {
  apps: [{
    name: '4icode-status',
    script: 'npm',
    args: 'start',
    env: { STATUS_BASE_PATH: '/status' },
  }],
};
```

**重要环境变量:**
- `STATUS_BASE_PATH=/status` - 反代路径前缀(必须)
- `STATUS_STANDALONE=1` - Docker 部署时设置(pm2 不需要)

## nginx 配置

相关配置片段(`/opt/1panel/www/conf.d/4i.codes.conf`):

```nginx
location /status/ {
    proxy_pass http://127.0.0.1:8800;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 90s;
    proxy_send_timeout 90s;
}
```

**注意:**
- 不需要单独配置 `/_next/` 路由
- Next.js 的 `basePath` 会让所有资源都在 `/status/_next/` 下
- nginx 的 `/status/` 会捕获所有子路径

## 常见问题

### 问题 1: 浏览器报 "MIME type 'text/html' is not supported stylesheet"

**原因**: 构建时未设置 `STATUS_BASE_PATH=/status`

**症状**:
```
Refused to apply style from 'https://4i.codes/_next/static/chunks/xxx.css' 
because its MIME type ('text/html') is not a supported stylesheet MIME type
```

**修复**:
```bash
cd /root/4icode-status
STATUS_BASE_PATH=/status npm run build
pm2 restart 4icode-status --update-env
```

**验证**:
```bash
curl -s http://127.0.0.1:8800/status/ | grep 'href="/' | head -3
# 应该看到: href="/status/_next/..." 而非 href="/_next/..."
```

### 问题 2: pm2 显示 stopped 或 errored

```bash
# 查看详细错误
pm2 logs 4icode-status --err --lines 50

# 常见原因:
# - 端口 8800 被占用
# - .next 构建产物损坏
# - 数据库文件权限问题

# 完全重启
pm2 delete 4icode-status
pm2 start ecosystem.config.cjs
```

### 问题 3: 数据库锁定错误

```bash
# SQLite 数据库位置
ls -lh /root/4icode-status/data/*.db

# 如果有 .db-wal 或 .db-shm 锁文件,先停服务
pm2 stop 4icode-status
# 删除锁文件
rm -f /root/4icode-status/data/*.db-wal
rm -f /root/4icode-status/data/*.db-shm
pm2 start 4icode-status
```

### 问题 4: 依赖安装失败

```bash
# 清理重装
cd /root/4icode-status
rm -rf node_modules package-lock.json
npm install

# 如果 better-sqlite3 编译失败
npm rebuild better-sqlite3
```

## 开发调试

本地开发(无需 basePath):
```bash
npm run dev
# 访问 http://localhost:3000
```

本地测试生产构建:
```bash
STATUS_BASE_PATH=/status npm run build
STATUS_BASE_PATH=/status npm start
# 访问 http://localhost:3000/status/
```

查看实时日志:
```bash
pm2 logs 4icode-status
```

监控资源:
```bash
pm2 monit
```

## 数据库管理

数据库文件位置: `/root/4icode-status/data/`

```bash
# 查看数据库
ls -lh /root/4icode-status/data/

# 备份数据库
cp /root/4icode-status/data/status.db /root/4icode-status/data/status.db.backup

# SQLite 命令行查询
sqlite3 /root/4icode-status/data/status.db "SELECT * FROM providers LIMIT 5;"
```

## 性能优化

### 内存使用

```bash
# 查看当前内存
pm2 list | grep 4icode-status

# 如果内存持续增长,重启
pm2 restart 4icode-status
```

### 日志管理

```bash
# 清理日志
pm2 flush 4icode-status

# 设置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 自动化脚本

创建 `/root/update-status.sh`:

```bash
#!/bin/bash
set -e

cd /root/4icode-status

echo "=== Pulling latest changes ==="
git pull origin main

echo "=== Installing dependencies ==="
npm install

echo "=== Building with basePath ==="
STATUS_BASE_PATH=/status npm run build

echo "=== Restarting pm2 ==="
pm2 restart 4icode-status --update-env

echo "=== Waiting for startup ==="
sleep 3

echo "=== Verification ==="
pm2 list | grep 4icode-status
curl -sI https://4i.codes/status/ | head -5

echo "✅ Status monitor updated successfully!"
```

使用:
```bash
chmod +x /root/update-status.sh
/root/update-status.sh
```

## 注意事项

1. **必须设置 STATUS_BASE_PATH**: 构建和运行时都需要
2. **不要直接 `pm2 start npm`**: 使用 `ecosystem.config.cjs` 确保环境变量
3. **数据库文件**: 不要删除 `data/` 目录,包含历史监控数据
4. **端口占用**: 确保 8800 端口空闲
5. **nginx 已配置**: 不需要修改 nginx,只需重启应用
6. **Cloudflare 缓存**: 静态资源更新后可能需要清除 CDN 缓存

## 监控与告警

```bash
# 设置 pm2 启动时自动重启
pm2 startup
pm2 save

# 查看崩溃重启次数
pm2 list
# 如果 restart 列数字很大,说明应用频繁崩溃

# 监控 CPU/内存
pm2 monit
```
