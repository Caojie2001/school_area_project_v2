# 🐳 Docker 配置

本目录包含项目的 Docker 相关配置文件。

---

## 📁 文件说明

### `Dockerfile`
**Docker 镜像构建配置**

定义了应用的 Docker 镜像构建步骤。

**基础镜像**: `node:16-alpine`

**构建步骤**:
1. 复制 package.json 和 package-lock.json
2. 安装依赖 (`npm ci`)
3. 复制应用代码
4. 暴露端口 3000
5. 启动应用 (`npm start`)

---

### `.dockerignore`
**Docker 构建忽略文件**

指定在构建 Docker 镜像时应该忽略的文件和目录。

**忽略的内容**:
- `node_modules/` - 依赖会在容器内重新安装
- `.git/` - Git 历史不需要在镜像中
- `logs/` - 日志文件
- `backups/` - 备份文件
- `.env` - 环境变量（通过容器参数传入）

---

## 🚀 使用方法

### 构建镜像

#### 基础构建
```bash
# 在项目根目录执行
docker build -f docker/Dockerfile -t school-area-system .
```

#### 带标签构建
```bash
docker build -f docker/Dockerfile -t school-area-system:v2.1.1 .
docker build -f docker/Dockerfile -t school-area-system:latest .
```

---

### 运行容器

#### 基础运行
```bash
docker run -d \
  --name school-area-system \
  -p 3000:3000 \
  school-area-system
```

#### 完整配置运行
```bash
docker run -d \
  --name school-area-system \
  -p 3000:3000 \
  -e DB_HOST=mysql_host \
  -e DB_USER=root \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=school_area_db \
  -e DB_PORT=3306 \
  -e SESSION_SECRET=your-secret-key \
  -v /path/to/logs:/app/logs \
  -v /path/to/output:/app/output \
  --restart unless-stopped \
  school-area-system
```

#### 使用 .env 文件
```bash
docker run -d \
  --name school-area-system \
  -p 3000:3000 \
  --env-file .env \
  school-area-system
```

---

### 容器管理

#### 查看日志
```bash
# 实时查看
docker logs -f school-area-system

# 查看最近100行
docker logs --tail 100 school-area-system
```

#### 进入容器
```bash
docker exec -it school-area-system sh
```

#### 停止和重启
```bash
# 停止
docker stop school-area-system

# 启动
docker start school-area-system

# 重启
docker restart school-area-system
```

#### 删除容器
```bash
# 停止并删除
docker stop school-area-system
docker rm school-area-system

# 强制删除（运行中的容器）
docker rm -f school-area-system
```

---

## 🔗 Docker Compose（推荐）

### 创建 `docker-compose.yml`（计划中）

```yaml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: school-area-system
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=mysql
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=school_area_db
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ../logs:/app/logs
      - ../output:/app/output
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:5.7
    container_name: school-area-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=school_area_db
    volumes:
      - mysql_data:/var/lib/mysql
      - ../scripts/db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mysql_data:
```

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose -f docker/docker-compose.yml up -d

# 查看日志
docker-compose -f docker/docker-compose.yml logs -f

# 停止所有服务
docker-compose -f docker/docker-compose.yml down

# 停止并删除卷
docker-compose -f docker/docker-compose.yml down -v
```

---

## 🔧 镜像优化

### 多阶段构建（未来优化）

```dockerfile
# 构建阶段
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 运行阶段
FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 镜像大小优化技巧

1. **使用 alpine 镜像** - 已实现
2. **多阶段构建** - 计划中
3. **清理缓存**: `npm ci --only=production`
4. **.dockerignore 优化** - 已实现

---

## 📊 镜像信息

### 查看镜像大小
```bash
docker images school-area-system
```

### 查看镜像历史
```bash
docker history school-area-system
```

### 清理未使用的镜像
```bash
# 清理悬空镜像
docker image prune

# 清理所有未使用的镜像
docker image prune -a
```

---

## 🚢 生产部署建议

### 1. 使用环境变量
- 不要在镜像中硬编码敏感信息
- 使用 `--env-file` 或 `-e` 传递环境变量

### 2. 数据持久化
- 挂载 `logs/` 目录到宿主机
- 挂载 `output/` 目录到宿主机
- 数据库数据使用 Docker Volume

### 3. 网络配置
- 使用自定义网络连接容器
- 不要暴露数据库端口到公网

### 4. 资源限制
```bash
docker run -d \
  --name school-area-system \
  --memory="512m" \
  --cpus="1.0" \
  -p 3000:3000 \
  school-area-system
```

### 5. 健康检查
在 Dockerfile 中添加（未来优化）:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## 🐛 故障排查

### 容器无法启动
```bash
# 查看容器日志
docker logs school-area-system

# 查看容器详情
docker inspect school-area-system
```

### 数据库连接失败
```bash
# 检查环境变量
docker exec school-area-system env | grep DB_

# 测试数据库连接
docker exec school-area-system sh -c "nc -zv $DB_HOST $DB_PORT"
```

### 端口冲突
```bash
# 查看端口占用
lsof -i :3000

# 使用不同端口
docker run -d -p 3001:3000 school-area-system
```

---

## 📚 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Node.js Docker 最佳实践](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Dockerfile 参考](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

<div align="center">

**Docker 配置目录**  
容器化部署，简化运维

最后更新: 2025-10-23

</div>
