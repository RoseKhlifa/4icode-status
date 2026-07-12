# ============================================
# 4i.codes 状态看板 Dockerfile
# 单节点 Next.js 16 + better-sqlite3 (native)
# ============================================

# ------- Stage 1: 基础镜像 -------
FROM node:22-alpine AS base
# native 依赖 (better-sqlite3) 需要构建工具
RUN apk add --no-cache python3 make g++

# ------- Stage 2: 装依赖 -------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# 使用 npm; native 模块会被重编译
RUN npm ci

# ------- Stage 3: 构建 -------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ------- Stage 4: 运行时 -------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=8800

# alpine 需要 libstdc++ 才能加载 native .node
RUN apk add --no-cache libstdc++

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# native .node 文件 (Next.js standalone tracing 会把 better-sqlite3 拷过来,
# 这里额外兜底: 显式带上 node_modules/better-sqlite3)
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# 运行时数据卷位置 - 部署时挂载到宿主机以持久化历史记录
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8800
VOLUME ["/app/data"]

CMD ["node", "server.js"]
