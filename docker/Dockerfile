# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --omit=dev && npm cache clean --force

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 添加构建时间戳，用于使缓存失效
ARG BUILD_DATE
ENV BUILD_DATE=$BUILD_DATE

# 复制应用程序代码
COPY --chown=nodejs:nodejs . .

# 创建必要的目录
RUN mkdir -p output uploads config/certs && \
    chown -R nodejs:nodejs output uploads config

# 暴露端口（HTTP 和 HTTPS）
EXPOSE 3000 3443

# 切换到非root用户
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["npm", "start"]