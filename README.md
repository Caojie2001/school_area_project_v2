# 🏫 高校建筑面积缺口测算系统 V2# 🏫 高校建筑面积缺口测算系统 V2



<div align="center">[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Version](https://img.shields.io/badge/version-2.1.1-blue.svg)[![MySQL](https://img.shields.io/badge/mysql-%3E%3D5.7-blue)](https://www.mysql.com/)

![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

![License](https://img.shields.io/badge/license-MIT-green.svg)## 📖 项目简介



**专业的高校建筑面积测算与管理平台**高校建筑面积缺口测算系统是一个专业的 Web 应用平台，面向教育管理部门和高校管理者，用于精准计算和深入分析高校建筑面积的规划需求与现状之间的差距。



[功能特性](#-功能特性) •系统支持多院校类型（综合、理工、师范、医药、艺术等10类），涵盖5种用房类型（教学及辅助用房、办公用房、学生宿舍、其他生活用房、后勤辅助用房），提供完整的数据录入、计算、分析、导出工作流。

[快速开始](#-快速开始) •

[使用说明](#-详细使用说明) •### 🎯 核心价值

[API文档](#-api-接口文档) •

[测试](#-测试)- **标准化测算**：基于国家教育部建筑面积标准，自动化计算各类用房缺口

- **多维度分析**：支持按年份、院校类型、学校进行多维度统计分析

</div>- **权限分级管理**：三级角色体系（管理员/基建中心/学校），精细化权限控制

- **数据可追溯**：完整的历史记录保存，支持数据回溯和趋势分析

---- **安全可靠**：HTTPS加密传输、密码加密存储、SQL注入防护等多重安全保障



## 📋 项目简介### 🌟 主要功能



高校建筑面积缺口测算系统V2是一个面向上海市教育委员会和高校基建中心的专业化管理平台，用于精确计算和管理各高校的建筑面积配置标准、现状面积和缺口情况。#### 1️⃣ 数据录入与管理

- ✅ **智能数据录入**（data-entry-new.html）：

### 核心价值  - 学校选择自动加载规划学生数据

- 🎯 **科学决策支撑** - 为教委和高校提供数据驱动的基建规划依据  - 学校切换自动重置表单和计算结果

- 📊 **标准化管理** - 统一的面积测算标准和数据格式  - 支持全日制和留学生各学历层次人数录入

- 🔄 **全流程追踪** - 从数据录入到报表导出的完整闭环  - 实时数据验证和错误提示

- 🔐 **权限分级** - 管理员、基建中心、学校用户三级权限体系- ✅ **现状面积录入**：

  - 教学及辅助用房面积（含现有/初步规划/在建/规划）

---  - 办公用房、学生宿舍、其他生活用房、后勤辅助用房

  - 支持分阶段数据录入（现状→规划→汇总）

## ✨ 功能特性- ✅ **特殊补助管理**：动态添加/删除特殊补助项目及面积

- ✅ **Excel批量导入**：支持标准格式Excel文件批量导入（兼容功能）

### 1️⃣ 数据录入与管理

- ✅ **智能表单** - 规划学生数自动加载，7大用房类型分类录入#### 2️⃣ 智能计算引擎

- ✅ **实时计算** - 自动计算应配面积、汇总面积、缺口面积- ✅ **多阶段面积计算**：

- ✅ **特殊补助** - 支持自定义补助项目和面积  - 现有面积（current）

- ✅ **历史管理** - 完整的录入历史追溯和修改功能  - 初步规划面积（preliminary）

- ✅ **数据验证** - 前后端双重验证，确保数据准确性  - 在建面积（under_construction）

  - 规划面积（planned）

### 2️⃣ 标准配置管理  - 汇总面积（total = current + preliminary + under_construction + planned）

- ✅ **基础标准** - 按院校类型和用房类型配置基础面积标准  - 应配面积（required）

- ✅ **补贴标准** - 支持规划/在校学生数补贴面积配置  - 缺口面积（gap = required - total）

- ✅ **动态调整** - 管理员可随时调整标准值- ✅ **基础面积计算**：根据院校类型和学生规模自动计算基础面积

- ✅ **版本控制** - 标准变更历史记录- ✅ **补贴面积计算**：研究生、留学生专项补贴面积自动叠加

- ✅ **缺口分析**：7个维度（现有/初步规划/在建/规划/汇总/应配/缺口）× 5种用房类型

### 3️⃣ 统计分析- ✅ **双重缺口计算**：生成含/不含特殊补助的双重缺口数据

- ✅ **多维度统计** - 按院校类型、用房类型、年份分析- ✅ **即时预览**：实时计算结果预览和冻结表头展示

- ✅ **趋势分析** - 年度数据对比和趋势图表- ✅ **数据持久化修复**：解决字段名映射错误，确保计算结果正确保存到数据库（77个字段）

- ✅ **缺口预警** - 自动识别面积缺口较大的院校

- ✅ **总体概览** - 全市高校建筑面积汇总统计#### 3️⃣ 统计分析模块

- 📊 **概览统计**：总体缺口、学校数量、年度对比等关键指标

### 4️⃣ 报表导出- 📊 **院校类型分析**：按10种院校类型分组统计

- ✅ **Excel导出** - 单条记录/批量导出为Excel文件- 📊 **趋势分析**：多年度数据趋势图表展示

- ✅ **格式规范** - 统一的报表模板和字段结构- 📊 **学校排名**：按缺口面积、学生规模等维度排名

- ✅ **历史下载** - 支持下载任意历史记录- 📊 **批量导出**：支持筛选条件批量导出Excel报表

- ✅ **批量操作** - 一键导出所有学校数据

#### 4️⃣ 用户与权限管理

### 5️⃣ 用户权限管理- 👤 **三级角色体系**：

- ✅ **三级权限** - 管理员、基建中心、学校用户  - **管理员**：全部权限，包括用户管理、标准配置

- ✅ **账号管理** - 用户创建、禁用、删除功能  - **基建中心**：查看所有数据、统计分析、批量导出

- ✅ **密码安全** - BCrypt加密存储，支持修改密码  - **学校用户**：仅能录入和查看本校数据

- ✅ **会话管理** - 基于Session的认证机制- 👤 **用户生命周期管理**：创建、修改、禁用、删除

- 👤 **密码安全**：BCrypt加密存储、密码修改功能

### 6️⃣ 安全防护 🛡️- 👤 **登录审计**：记录最后登录时间

- ✅ **HTTP安全头** - Helmet防护（XSS、点击劫持、MIME嗅探）

- ✅ **请求限流** - 5级限流策略（登录、下载、计算、批量、通用API）#### 5️⃣ 标准配置管理（管理员专用）

- ✅ **暴力破解防护** - 登录接口严格限流（5次/15分钟）- ⚙️ **基础面积标准**：按院校类型和用房类型配置平方米/人标准

- ✅ **数据爬取防护** - 下载接口限流（10次/分钟）- ⚙️ **补贴面积标准**：三重索引（院校类型+用房类型+补贴类型）

- ✅ **资源滥用防护** - 计算接口限流（20次/分钟）- ⚙️ **学校类型映射**：管理学校与院校类型的对应关系

- ⚙️ **标准版本控制**：支持标准历史版本查询和管理

### 7️⃣ 在线测算- ⚙️ **批量更新**：支持批量修改和导入标准数据

- ✅ **即时计算** - 无需保存即可测算面积缺口

- ✅ **Excel下载** - 测算结果直接导出为Excel#### 6️⃣ 历史记录管理

- ✅ **参数调整** - 灵活修改学生数和面积参数- 📋 **多维度查询**：按学校名称、年份、提交人筛选

- 📋 **详情查看**：查看历史计算的完整详情和结果（含77个字段）

---- 📋 **记录删除**：支持单条和批量删除历史记录（已修复空参数错误）

- 📋 **数据导出**：单条或批量导出为Excel文件（已修复字段映射：使用*_total字段）

## 🏗️ 技术架构- 📋 **数据对比**：同一学校不同年份数据对比



### 后端技术栈#### 7️⃣ 最近优化与修复（2025年1月）

- **Node.js** (>= 16.0.0) - 服务器运行环境- 🔧 **数据库持久化修复**：

- **Express.js** (4.18.2) - Web应用框架  - 修复字段名映射错误（现有教学及辅助用房面积 vs 现有教学面积）

- **MySQL** (>= 5.7) - 关系型数据库  - 修复变量类型错误（const → let）

- **BCrypt** - 密码加密  - 添加数值规范化处理（toNumberValue, roundToTwo, pickNumericValue）

- **Express-Session** - 会话管理- 🔧 **下载功能修复**：

- **Helmet** (^7.x) - HTTP安全头  - 修复历史下载使用错误字段（*_current → *_total）

- **Express-Rate-Limit** (^7.x) - 请求限流  - 确保Excel导出显示正确的汇总数据

- **XLSX.js** - Excel文件处理- 🔧 **用户体验优化**：

- **CORS** - 跨域资源共享  - 实现学校选择自动重置功能（保留学校选择，清空规划表和结果）

  - 改进表单交互逻辑

### 前端技术栈- 🔧 **API稳定性修复**：

- **原生JavaScript (ES6+)** - 无框架依赖  - 修复删除操作空指针错误（apiDelete函数）

- **模块化架构** - 代码分层清晰  - 移除重复函数定义

- **响应式设计** - 适配不同屏幕尺寸

- **Chart.js** - 数据可视化（统计图表）---



### 数据库设计## 🛠️ 技术架构

- **8张核心数据表** - 结构化数据存储

- **触发器机制** - 自动数据同步### 后端技术栈

- **索引优化** - 高效查询性能```

- **事务支持** - 数据一致性保证├── Node.js 16.0.0+          # JavaScript运行时环境

├── Express.js 4.18.2        # Web应用框架

---├── MySQL 5.7+               # 关系型数据库

├── mysql2 3.14.3            # MySQL驱动（Promise支持）

## 🚀 快速开始├── BCrypt 6.0.0             # 密码加密库

├── XLSX 0.18.5              # Excel文件处理

### 环境要求├── express-session 1.18.2   # Session会话管理

- Node.js >= 16.0.0├── dotenv 17.2.1            # 环境变量管理

- MySQL >= 5.7├── cors 2.8.5               # 跨域资源共享

- npm >= 7.0.0├── archiver 7.0.1           # 文件压缩（批量导出）

└── https                    # HTTPS/SSL安全传输

### 安装步骤```



#### 1. 克隆项目### 前端技术栈

```bash```

git clone https://github.com/Caojie2001/school_area_project_v2.git├── HTML5                    # 标记语言

cd school_area_project_v2├── CSS3                     # 样式表（模块化设计）

```│   ├── base.css            # 基础样式和重置

│   ├── layout.css          # 布局和栅格系统

#### 2. 安装依赖│   ├── components.css      # UI组件样式

```bash│   ├── forms.css           # 表单样式

npm install│   ├── tables.css          # 表格样式

```│   ├── frozen-table.css    # 冻结表格样式

│   ├── results.css         # 结果展示样式

#### 3. 配置数据库│   └── responsive.css      # 响应式媒体查询

```bash└── JavaScript (ES6+)        # 原生JavaScript

# 登录MySQL    ├── 模块化设计（独立JS文件）

mysql -u root -p    ├── 组件化架构

    ├── 事件驱动编程

# 创建数据库    └── Promise/Async异步处理

CREATE DATABASE school_area_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;```



# 导入数据库结构和初始数据### 数据库设计

mysql -u root -p school_area_db < scripts/db.sql```sql

```核心数据表（6个）:

├── users                        # 用户表（3种角色）

#### 4. 配置环境变量├── school_registry              # 学校注册表（29所上海高校）

```bash├── calculation_history          # 计算历史记录表（77个字段）

# 复制环境变量模板├── special_subsidies            # 特殊补助表（关联历史记录）

cp .env.example .env├── basic_area_standards         # 基础面积标准配置表（50条标准）

└── subsidized_area_standards    # 补贴面积标准配置表（250条标准）

# 编辑 .env 文件，配置数据库连接```

vi .env

```### 系统架构特点

- ✅ **前后端分离**：RESTful API设计，前后端解耦

`.env` 文件示例：- ✅ **会话管理**：基于Session的用户认证机制

```env- ✅ **安全防护**：SQL注入、XSS、CSRF、路径穿越等多重防护

# 数据库配置- ✅ **响应式设计**：支持桌面端和移动端自适应

DB_HOST=localhost- ✅ **模块化代码**：高内聚低耦合的模块化组织

DB_USER=root

DB_PASSWORD=your_password---

DB_NAME=school_area_db

DB_PORT=3306## 📋 环境要求



# 服务器配置### 必需环境

PORT=3000| 软件 | 版本要求 | 说明 |

SESSION_SECRET=your-secret-key-change-this-in-production|------|---------|------|

| Node.js | >= 16.0.0 | JavaScript运行时 |

# HTTPS配置（可选）| npm | >= 8.0.0 | Node包管理器 |

HTTPS_ENABLED=false| MySQL | >= 5.7 | 关系型数据库 |

HTTPS_FORCE_REDIRECT=false

```### 推荐配置

- **操作系统**: macOS / Linux / Windows 10+

#### 5. 启动服务器- **内存**: >= 4GB RAM

```bash- **磁盘空间**: >= 1GB 可用空间

# 开发环境- **浏览器**: Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+

npm start

---

# 生产环境（使用PM2）

npm install -g pm2## 🚀 快速开始

pm2 start server.js --name school-area-system

pm2 save### 1. 克隆项目

pm2 startup```bash

```git clone https://github.com/Caojie2001/school_area_project_v2.git

cd school_area_project_v2

#### 6. 访问系统```

打开浏览器访问: `http://localhost:3000`

### 2. 安装依赖

**默认管理员账号**:```bash

- 用户名: `admin`npm install

- 密码: `admin123456````



⚠️ **重要**: 首次登录后请立即修改默认密码！### 3. 配置数据库



---#### 3.1 启动MySQL服务

```bash

## 📖 详细使用说明# macOS (使用Homebrew)

brew services start mysql

### 1️⃣ 管理员操作流程

# Linux (Ubuntu/Debian)

#### 首次系统配置sudo systemctl start mysql

1. **登录系统** - 使用admin/admin123456

2. **修改密码** - 个人中心→修改密码# Windows

3. **创建用户** - 用户管理→新增用户# 在服务管理器中启动MySQL服务

   - 创建基建中心账号```

   - 为每所学校创建学校账号

4. **配置标准** - 标准管理→查看/修改标准#### 3.2 创建数据库并导入数据

   - 检查基础面积标准```bash

   - 检查补贴面积标准# 方式一：直接导入（推荐）

   - 确认学校类型映射mysql -u root -p < db.sql



#### 日常管理操作# 方式二：手动执行

- **用户管理** - 启用/禁用/删除用户mysql -u root -p

- **数据审核** - 查看所有学校提交的数据# 进入MySQL后执行：

- **系统维护** - 数据备份、标准调整source /path/to/db.sql;

```

### 2️⃣ 基建中心操作流程

**默认创建的数据库名**: `school_area_management`

1. **登录系统** - 使用分配的账号

2. **查看统计** - 统计分析页面### 4. 配置环境变量

   - 查看总体概览

   - 按院校类型分析创建 `.env` 文件并配置：

   - 年度趋势分析

3. **数据导出** - 批量导出Excel报表```bash

4. **数据查询** - 查看所有学校历史记录# 复制示例文件（如果有）

cp .env.example .env

### 3️⃣ 学校用户操作流程

# 或手动创建 .env 文件

#### 数据录入流程touch .env

1. **登录系统** - 使用学校账号```

2. **选择学校和年份** - 高校测算→选择学校和测算年份

   - 系统自动加载规划学生数据编辑 `.env` 文件，添加以下配置：

   - 切换学校时自动重置表单

3. **录入/确认学生数据**```env

   - 全日制本科/专科/硕士/博士# 数据库配置

   - 留学生本科/专科/硕士/博士DB_HOST=localhost

4. **录入现状面积**（7个维度）DB_PORT=3306

   - 现有面积（current）DB_USER=root

   - 初步规划面积（preliminary）DB_PASSWORD=your_mysql_password

   - 在建面积（under_construction）DB_NAME=school_area_management

   - 规划面积（planned）

   - （汇总、应配、缺口由系统自动计算）# 服务器配置

5. **添加特殊补助**（可选）PORT=3000

   - 补助项目名称HTTPS_PORT=3443

   - 补助面积

6. **提交保存**# Session密钥（请修改为随机字符串）

7. **下载Excel** - 可下载本次录入的Excel报表SESSION_SECRET=your-secret-key-change-this-in-production



#### 历史记录查询# HTTPS配置

1. **数据管理页面** - 查看本校所有历史记录SSL_KEY_PATH=./config/certs/key.pem

2. **筛选功能** - 按年份、时间筛选SSL_CERT_PATH=./config/certs/cert.pem

3. **详情查看** - 点击记录查看详细数据HTTPS_FORCE_REDIRECT=false

4. **重新下载** - 任意历史记录都可重新下载Excel

# 环境

---NODE_ENV=development

```

## 🔐 安全特性

### 5. 生成SSL证书（可选，用于HTTPS）

### 认证与授权

- ✅ **Session会话管理** - express-session实现```bash

- ✅ **密码加密存储** - BCrypt加密（10轮加盐）# 进入证书目录

- ✅ **基于角色的访问控制** - 三级权限体系cd config/certs

- ✅ **路由中间件保护** - requireAuth, requireAdmin等

# 运行证书生成脚本

### 数据安全bash generate_cert.sh

- ✅ **SQL注入防护** - 参数化查询（mysql2）

- ✅ **XSS防护** - 输入验证和输出转义 + Helmet CSP# 或手动生成

- ✅ **CSRF保护** - Session和Cookie安全配置openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

- ✅ **路径穿越防护** - 路径验证中间件```

- ✅ **URL重定向防护** - 白名单机制

### 6. 启动服务

### 传输安全

- ✅ **HTTPS/SSL支持** - 自签名或CA证书```bash

- ✅ **HTTPS强制重定向** - 可配置# 生产环境启动

- ✅ **Secure Cookie** - HTTPS环境下启用npm start

- ✅ **CORS配置** - 跨域请求控制

# 开发环境启动（支持热重载，需要安装nodemon）

### HTTP安全头（Helmet v7+）npm run dev

- ✅ **Content-Security-Policy** - 防止XSS攻击```

- ✅ **X-Content-Type-Options** - 防止MIME类型嗅探

- ✅ **X-Frame-Options** - 防止点击劫持### 7. 访问应用

- ✅ **Strict-Transport-Security** - 强制HTTPS

- ✅ **跨域资源策略** - 允许跨域资源共享启动成功后，在浏览器中访问：



### 请求限流（express-rate-limit v7+）- **HTTP**: http://localhost:3000

- **HTTPS**: https://localhost:3443

#### 限流配置总览

### 8. 登录系统

| 路由 | 限制 | 时间窗口 | 防御目的 |

|------|------|---------|----------|使用默认管理员账号登录：

| `/api/*`（通用） | 100次 | 15分钟 | 防止API滥用 |

| `/api/auth/login` ⭐ | 5次 | 15分钟 | **防暴力破解** |```

| `/online-calculate` | 20次 | 1分钟 | 防资源滥用 |用户名: admin

| `/api/download-record/:id` | 10次 | 1分钟 | **防数据爬取** |密码: admin123456

| `/online-download` | 10次 | 1分钟 | 防批量下载 |```

| `/api/batch-export` | 5次 | 1分钟 | 防批量操作滥用 |

| `/api/school-combination` | 5次 | 1分钟 | 防批量删除滥用 |**⚠️ 安全提示**: 首次登录后请立即修改管理员密码！



#### 限流日志记录---

当请求被限流时,系统会自动记录以下信息:

```## 📁 项目结构

[时间戳] 限流触发 - 登录限流（可能的暴力破解尝试）

  IP: 192.168.1.100```

  用户: 未登录school_area_project_250922/

  路径: /api/auth/login│

  User-Agent: Mozilla/5.0...├── 📂 config/                           # 配置文件目录

```│   ├── database.js                      # 数据库连接池配置（~60行）

│   ├── authService.js                   # 用户认证服务（236行）

#### 安全测试│   ├── dataService.js                   # 数据操作服务（~500行，已修复字段映射）

使用 `test/test_security.sh` 脚本测试安全配置:│   ├── routes.js                        # 路由配置文件

```bash│   ├── appConfig.js                     # 应用配置

./test/test_security.sh│   └── 📂 certs/                        # SSL证书目录

```│       ├── cert.pem                     # SSL证书文件

│       ├── key.pem                      # SSL私钥文件

测试包括:│       ├── generate_cert.sh             # 证书生成脚本

1. Helmet HTTP安全头验证│       └── README.md                    # 证书说明

2. 登录接口限流测试（防暴力破解）│

3. API接口限流测试├── 📂 public/                           # 前端静态资源目录

4. 下载接口限流测试（防爬取）│   ├── index.html                       # 主页面（登录后首页）

5. 计算接口限流测试（防资源滥用）│   ├── login.html                       # 登录页面（默认重定向到data-entry-new.html）

│   │

#### 监控建议│   ├── 📂 html/                         # HTML页面模块

```bash│   │   ├── data-entry.html              # 数据录入页面（旧版）

# 查看限流触发次数│   │   ├── data-entry-new.html          # 数据录入页面（新版，当前使用）

grep "限流触发" logs/combined.log | wc -l│   │   ├── data-management.html         # 历史记录管理页面

│   │   ├── statistics.html              # 统计分析页面

# 找出被限流最多的IP│   │   ├── calculation-standards.html   # 标准配置管理页面（管理员）

grep "限流触发" logs/combined.log | grep -oP 'IP: \K[0-9.]+' | sort | uniq -c | sort -nr│   │   └── user-management.html         # 用户管理页面（管理员）

│   │

# 查看登录暴力破解尝试│   ├── 📂 js/                           # JavaScript模块（模块化架构）

grep "登录限流" logs/combined.log│   │   ├── main.js                      # 主应用入口（752行）

```│   │   ├── auth.js                      # 认证模块

│   │   ├── api.js                       # API调用封装（已修复apiDelete）

### 输入验证│   │   ├── utils.js                     # 工具函数库

- ✅ **长度限制** - 防止过长输入│   │   ├── dataEntry.js                 # 数据录入逻辑

- ✅ **特殊字符过滤** - 移除危险字符│   │   ├── dataManagement.js            # 数据管理逻辑

- ✅ **数据类型验证** - 前后端双重验证│   │   ├── statistics.js                # 统计分析逻辑

- ✅ **业务逻辑验证** - 数据合理性检查│   │   ├── calculationStandards.js      # 标准管理逻辑

│   │   ├── userManagement.js            # 用户管理逻辑

### 安全检查清单│   │   ├── componentManager.js          # 组件管理器

- [x] ✅ Helmet安全头已启用│   │   └── progressManager.js           # 进度管理器

- [x] ✅ 通用API限流已配置│   │

- [x] ✅ 登录接口限流已配置（防暴力破解）│   ├── 📂 css/                          # 样式文件（模块化，约2000行总计）

- [x] ✅ 计算接口限流已配置│   │   ├── main.css                     # 主样式入口

- [x] ✅ 下载接口限流已配置（防数据爬取）│   │   ├── base.css                     # 基础样式和重置

- [x] ✅ 批量操作限流已配置│   │   ├── layout.css                   # 布局和栅格系统

- [x] ✅ 限流日志记录已启用│   │   ├── components.css               # UI组件样式

- [ ] ⏳ 配置监控告警（建议）│   │   ├── forms.css                    # 表单样式

- [ ] ⏳ 定期审查日志（建议每周一次）│   │   ├── tables.css                   # 表格样式

│   │   ├── frozen-table.css             # 冻结表格样式（新增）

---│   │   ├── results.css                  # 结果展示样式

│   │   ├── responsive.css               # 响应式媒体查询

## 🧪 测试│   │   └── student-fields.css           # 学生字段特定样式

│   │

### 运行所有测试（推荐）│   ├── 📂 components/                   # 可复用HTML组件

```bash│   │   ├── page-header.html             # 页面头部组件

# 运行完整测试套件│   │   ├── sidebar.html                 # 侧边栏组件（含data-entry-new链接）

./test/run_all_tests.sh│   │   └── page-template.html           # 页面模板

```│   │

│   └── 📂 assets/                       # 静态资源（图片、图标等）

### 运行安全测试│

```bash├── 📂 scripts/                          # 脚本工具目录

# 只测试 Helmet 和 Rate Limiting 配置│   ├── generate_user_sql.js             # 生成用户SQL脚本

./test/test_security.sh│   └── seed_users.js                    # 批量创建用户脚本

```│

├── 📂 data/                             # 数据文件目录

**测试内容**:│   └── 📂 原型/                         # 原型设计文件

- ✅ HTTP 安全响应头验证（Helmet）│

- ✅ 登录接口限流（防暴力破解）├── 📂 backups/                          # 备份文件目录

- ✅ API 通用限流测试│   ├── cookies.txt                      # Cookie备份

- ✅ 下载接口限流（防数据爬取）│   ├── 📂 backup_20250905T052821/       # 数据库备份（按日期）

- ✅ 计算接口限流（防资源滥用）│   ├── 📂 backup_20250905T052857/       # 数据库备份

│   ├── 📂 css_backup_20250814_135311/   # 样式文件备份

**查看测试结果**:│   └── 📂 js_backup_20250814_135325/    # JavaScript文件备份

```bash│

# 查看限流触发日志├── 📂 documents/                        # 文档目录

pm2 logs school-area-system | grep "限流触发"├── 📂 output/                           # 输出文件目录（导出的Excel等）

├── 📂 delete/                           # 待删除/已废弃文件

# 或查看文件日志│   ├── reset_database.sh                # 数据库重置脚本

tail -f logs/combined.log | grep "限流触发"│   └── reset_database.sql               # 数据库重置SQL

```│

├── 📄 server.js                         # 主服务器文件（5230行，核心API）

**更多测试文档**: 查看 [test/README.md](test/README.md)├── 📄 db.sql                            # 数据库初始化脚本（488行）

├── 📄 package.json                      # NPM包配置文件

---├── 📄 package-lock.json                 # NPM依赖锁定文件

├── 📄 .env                              # 环境变量配置（需自行创建）

## 📡 API 接口文档├── 📄 .gitignore                        # Git忽略文件配置

├── 📄 Dockerfile                        # Docker容器配置

### 认证接口├── 📄 install.sh                        # 安装脚本

├── 📄 cookies.txt                       # Cookie配置

#### POST `/api/auth/login`└── 📄 README.md                         # 项目说明文档（本文件）

登录接口```



**请求体**:### 核心文件说明

```json

{| 文件 | 行数 | 主要功能 | 最近修改 |

  "username": "admin",|------|------|----------|---------|

  "password": "admin123456"| `server.js` | 5230 | Express服务器主文件，包含所有API路由 | 修复下载字段映射 |

}| `config/dataService.js` | ~500 | 数据库持久化服务，saveSchoolInfo核心函数 | 修复字段名映射、变量类型 |

```| `public/html/data-entry-new.html` | ~1800 | 数据录入主页面（当前使用版本） | 添加学校切换重置功能 |

| `public/js/api.js` | ~330 | API客户端封装，所有HTTP请求 | 修复apiDelete空指针 |

**成功响应**:| `public/js/main.js` | 752 | 前端主应用入口和路由控制 | - |

```json| `db.sql` | 488 | 数据库建表脚本，6个核心表 | - |

{| `config/database.js` | ~60 | MySQL连接池配置 | - |

  "success": true,| `config/authService.js` | 236 | 用户认证服务（登录、权限） | - |

  "message": "登录成功",

  "user": {---

    "id": 1,

    "username": "admin",## 🗄️ 数据库详细设计

    "role": "admin",

    "school_name": null### 数据表关系图

  }```

}users (用户表)

```    ↓

calculation_history (计算历史) ← school_registry (学校注册表)

**限流**: 5次/15分钟    ↓

special_subsidies (特殊补助)

---

basic_area_standards (基础面积标准)

#### POST `/api/auth/logout`subsidized_area_standards (补贴面积标准)

登出接口```



**成功响应**:### 核心表结构

```json

{#### 📊 1. users - 用户表

  "success": true,| 字段名 | 类型 | 说明 | 约束 |

  "message": "登出成功"|--------|------|------|------|

}| id | INT | 用户ID | 主键、自增 |

```| username | VARCHAR(50) | 用户名 | 唯一、非空 |

| password | VARCHAR(255) | 密码 | BCrypt加密 |

---| real_name | VARCHAR(100) | 真实姓名 | |

| email | VARCHAR(100) | 邮箱 | |

### 数据接口| role | ENUM | 角色 | admin/construction_center/school |

| school_name | VARCHAR(200) | 关联学校 | 学校用户必填 |

#### POST `/api/school-data`| status | ENUM | 状态 | active/inactive |

保存学校面积数据| created_at | TIMESTAMP | 创建时间 | 默认当前时间 |

| updated_at | TIMESTAMP | 更新时间 | 自动更新 |

**请求头**:| last_login | TIMESTAMP | 最后登录 | |

```

Cookie: connect.sid=<session-id>**初始数据**: 1个管理员账号 (admin/admin123456)

Content-Type: application/json

```#### 🏫 2. school_registry - 学校注册表

| 字段名 | 类型 | 说明 | 约束 |

**请求体**:|--------|------|------|------|

```json| id | INT | 学校ID | 主键、自增 |

{| school_name | VARCHAR(255) | 学校名称 | 唯一、非空 |

  "schoolName": "上海大学",| school_type | VARCHAR(50) | 院校类型 | 10种类型之一 |

  "schoolType": "综合类",| created_at | TIMESTAMP | 创建时间 | |

  "year": 2025,| updated_at | TIMESTAMP | 更新时间 | |

  "students": {

    "fulltime_undergrad": 20000,**预置数据**: 29所上海高校数据

    "fulltime_master": 5000

    // ...#### 📝 3. calculation_history - 计算历史表（核心表，77个字段）

  },

  "areas": {**基础信息字段**:

    "teaching": {| 字段名 | 类型 | 说明 |

      "current": 50000,|--------|------|------|

      "preliminary": 60000| id | INT | 记录ID（主键） |

      // ...| school_name | VARCHAR(255) | 学校名称 |

    }| school_type | VARCHAR(50) | 院校类型 |

    // ...| year | INT | 测算年份 |

  },| submitter | VARCHAR(100) | 提交人 |

  "specialSubsidies": [| submission_date | TIMESTAMP | 提交日期 |

    {

      "name": "特殊项目",**学生数据字段（8个）**:

      "area": 1000| 字段名 | 类型 | 说明 |

    }|--------|------|------|

  ]| full_time_undergraduate | INT | 全日制本科生 |

}| full_time_specialist | INT | 全日制专科生 |

```| full_time_master | INT | 全日制硕士生 |

| full_time_doctor | INT | 全日制博士生 |

**成功响应**:| international_undergraduate | INT | 留学生本科 |

```json| international_specialist | INT | 留学生专科 |

{| international_master | INT | 留学生硕士 |

  "success": true,| international_doctor | INT | 留学生博士 |

  "message": "数据保存成功",

  "id": 123**面积字段（7个维度 × 5种用房类型 = 35个）**:

}维度包括：

```- `*_current`: 现有面积

- `*_preliminary`: 初步规划面积

---- `*_under_construction`: 在建面积

- `*_planned`: 规划面积

#### GET `/api/school-data`- `*_total`: 汇总面积（=current+preliminary+under_construction+planned）

获取学校数据列表- `*_required`: 应配面积

- `*_gap`: 缺口面积（=required-total）

**查询参数**:

- `schoolName`: 学校名称（可选）用房类型包括：

- `year`: 年份（可选）- `teaching_area_*`: 教学及辅助用房

- `office_area_*`: 办公用房

**成功响应**:- `dormitory_area_*`: 学生宿舍

```json- `other_living_area_*`: 其他生活用房

{- `logistics_area_*`: 后勤辅助用房

  "success": true,

  "data": [**汇总结果字段**:

    {| 字段名 | 类型 | 说明 |

      "id": 1,|--------|------|------|

      "school_name": "上海大学",| total_student_count | INT | 学生总数 |

      "year": 2025,| required_building_area | DECIMAL(12,2) | 应配建筑总面积 |

      "submit_time": "2025-01-01T12:00:00.000Z"| total_area_gap_with_subsidy | DECIMAL(12,2) | 总缺口（含特殊补助） |

      // ...| total_area_gap_without_subsidy | DECIMAL(12,2) | 总缺口（不含特殊补助） |

    }| calculation_results | LONGTEXT | 详细计算结果（JSON） |

  ]

}**重要说明**：

```- 2025年1月修复：字段名映射错误（如 `现有教学及辅助用房面积` 需映射到 `teaching_area_current`）

- 下载功能已修复：使用 `*_total` 字段而非 `*_current` 字段

---

#### 🎁 4. special_subsidies - 特殊补助表

#### GET `/api/download-record/:id`| 字段名 | 类型 | 说明 | 约束 |

下载单条记录Excel|--------|------|------|------|

| id | INT | 补助ID | 主键 |

**限流**: 10次/分钟| school_info_id | INT | 关联计算历史ID | 外键 |

| subsidy_name | VARCHAR(200) | 补助名称 | 非空 |

**成功响应**: Excel文件下载| subsidy_area | DECIMAL(12,2) | 补助面积 | 非空 |



---#### ⚙️ 5. basic_area_standards - 基础面积标准表

| 字段名 | 类型 | 说明 | 约束 |

#### POST `/api/batch-export`|--------|------|------|------|

批量导出Excel| id | INT | 标准ID | 主键 |

| school_type | VARCHAR(50) | 院校类型 | 非空 |

**限流**: 5次/分钟| room_type | VARCHAR(100) | 用房类型 | 非空 |

| standard_value | DECIMAL(8,2) | 标准值(㎡/人) | 非空 |

**请求体**:| description | VARCHAR(255) | 说明 | |

```json| is_active | BOOLEAN | 是否启用 | 默认TRUE |

{

  "ids": [1, 2, 3]**唯一约束**: (school_type, room_type)  

}**数据量**: 10种院校类型 × 5种用房类型 = 50条

```

#### ⚙️ 6. subsidized_area_standards - 补贴面积标准表

**成功响应**: Excel文件下载| 字段名 | 类型 | 说明 | 约束 |

|--------|------|------|------|

---| id | INT | 标准ID | 主键 |

| school_type | VARCHAR(50) | 院校类型 | 非空 |

### 在线测算接口| room_type | VARCHAR(50) | 用房类型 | 非空 |

| subsidy_type | VARCHAR(50) | 补贴类型 | 非空 |

#### POST `/online-calculate`| standard_value | DECIMAL(8,2) | 标准值(㎡/人) | 非空 |

在线计算（不保存）

**唯一约束**: (school_type, room_type, subsidy_type)  

**限流**: 20次/分钟**数据量**: 10种院校类型 × 5种用房类型 × 5种补贴类型 = 250条



**请求体**: 同 `/api/school-data`### 院校类型（10种）

1. **综合院校** - 基础标准：12.95㎡/人（教学）

**成功响应**:2. **师范院校** - 基础标准：12.95㎡/人（教学）

```json3. **理工院校** - 基础标准：15.95㎡/人（教学）

{4. **医药院校** - 基础标准：15.95㎡/人（教学）

  "success": true,5. **农业院校** - 基础标准：15.95㎡/人（教学）

  "calculation": {6. **政法院校** - 基础标准：7.95㎡/人（教学）

    "teaching": {7. **财经院校** - 基础标准：7.95㎡/人（教学）

      "total": 50000,8. **体育院校** - 基础标准：22.00㎡/人（教学）

      "required": 60000,9. **艺术院校** - 基础标准：53.50㎡/人（教学）

      "gap": -1000010. **外语院校** - 基础标准：待配置

    }

    // ...---

  }

}## 🔌 核心API接口

```

### 认证相关 (Authentication)

---```

POST   /api/auth/login              # 用户登录

## 🗄️ 数据库设计POST   /api/auth/logout             # 用户登出

GET    /api/auth/status             # 获取登录状态

### 核心数据表POST   /api/auth/change-password    # 修改密码

POST   /api/auth/create-user        # 创建用户（管理员）

#### 1. `users` - 用户表GET    /api/users                   # 用户列表（管理员）

存储系统用户信息PUT    /api/auth/user/:id/status    # 更新用户状态（管理员）

- `id`: 主键DELETE /api/auth/user/:id           # 删除用户（管理员）

- `username`: 用户名（唯一）```

- `password`: 密码（BCrypt加密）

- `role`: 角色（admin/construction_center/school）### 学校数据 (Schools)

- `school_name`: 所属学校```

- `real_name`: 真实姓名GET    /api/schools/registry        # 学校注册表

- `is_enabled`: 启用状态GET    /api/schools/names           # 学校名称列表

- `created_at`: 创建时间GET    /api/schools/types           # 院校类型列表

GET    /api/schools/by-type/:type   # 按类型获取学校

#### 2. `calculation_history` - 计算历史表GET    /api/schools/detail/:name    # 学校详细信息

存储面积计算记录（77个字段）GET    /api/school-history/:name    # 学校历史记录

- 学校基本信息（school_name, school_type, year）```

- 学生数据（8个字段）

- 7大用房类型面积数据（每种7个维度 = 49个字段）### 计算功能 (Calculation)

- 特殊补助数据```

- 提交信息（submitter_id, submit_time）POST   /online-calculate            # 执行在线计算

                                    # 调用 dataService.saveSchoolInfo()

#### 3. `school_registry` - 学校注册表                                    # 77个字段持久化到数据库

存储学校基本信息

- `school_name`: 学校名称（主键）POST   /online-download             # 下载计算结果（Excel）

- `school_type`: 院校类型GET    /api/download-record/:id     # 下载历史记录（Excel）

- `location`: 地址                                    # 已修复：使用 *_total 字段

- `created_at`: 注册时间

GET    /api/view-record/:id         # 查看记录详情（JSON）

#### 4. `basic_area_standards` - 基础面积标准```

按院校类型和用房类型的基础标准

- `school_type`: 院校类型### 统计分析 (Statistics)

- `area_type`: 用房类型```

- `standard_value`: 标准值（平方米/生）GET    /api/statistics              # 统计数据概览

GET    /api/statistics/schools      # 学校统计

#### 5. `subsidized_area_standards` - 补贴面积标准GET    /api/statistics/overview     # 总体概览

规划/在校学生数的补贴标准GET    /api/statistics/trends       # 趋势分析

- `school_type`: 院校类型POST   /api/batch-export            # 批量导出（Excel）

- `area_type`: 用房类型```

- `criteria`: 计算依据（规划/在校）

- `subsidy_value`: 补贴值### 标准管理 (Standards) - 管理员权限

```

#### 6. `planned_students` - 规划学生数GET    /api/calculation-standards   # 获取所有标准

各学校的规划学生数配置POST   /api/calculation-standards   # 批量更新标准

- `school_name`: 学校名称PUT    /api/calculation-standards/single # 更新单个标准

- `year`: 年份GET    /api/standards-history       # 标准历史版本

- 8类学生数字段GET    /api/school-mappings         # 学校类型映射

POST   /api/school-mappings         # 更新类型映射

#### 7. `special_subsidies` - 特殊补助```

特殊补助项目记录

- `calculation_id`: 关联计算记录### 记录管理 (Records)

- `subsidy_name`: 补助名称```

- `subsidy_area`: 补助面积GET    /api/overview/records        # 历史记录列表（分页）

DELETE /api/school-record/:id       # 删除单条记录

#### 8. `current_area_presets` - 现有面积预设                                    # 已修复：apiDelete空指针错误

现有面积的预设值

- `school_name`: 学校名称DELETE /api/school-combination      # 批量删除记录

- `year`: 年份```

- 7种用房类型的现有面积

---

---

## 🔐 安全特性

## 🚢 部署指南

### 认证与授权

### 使用PM2部署（推荐）- ✅ **Session会话管理** - express-session实现

- ✅ **密码加密存储** - BCrypt加密（10轮加盐）

#### 1. 安装PM2- ✅ **基于角色的访问控制** - 三级权限体系

```bash- ✅ **路由中间件保护** - requireAuth, requireAdmin等

npm install -g pm2

```### 数据安全

- ✅ **SQL注入防护** - 参数化查询（mysql2）

#### 2. 启动应用- ✅ **XSS防护** - 输入验证和输出转义 + Helmet CSP

```bash- ✅ **CSRF保护** - Session和Cookie安全配置

pm2 start server.js --name school-area-system- ✅ **路径穿越防护** - 路径验证中间件

```- ✅ **URL重定向防护** - 白名单机制



#### 3. 配置开机自启### 传输安全

```bash- ✅ **HTTPS/SSL支持** - 自签名或CA证书

pm2 startup- ✅ **HTTPS强制重定向** - 可配置

pm2 save- ✅ **Secure Cookie** - HTTPS环境下启用

```- ✅ **CORS配置** - 跨域请求控制



#### 4. 常用PM2命令### HTTP安全头（Helmet v7+）

```bash- ✅ **Content-Security-Policy** - 防止XSS攻击

# 查看状态- ✅ **X-Content-Type-Options** - 防止MIME类型嗅探

pm2 status- ✅ **X-Frame-Options** - 防止点击劫持

- ✅ **Strict-Transport-Security** - 强制HTTPS

# 查看日志- ✅ **跨域资源策略** - 允许跨域资源共享

pm2 logs school-area-system

### 请求限流（express-rate-limit v7+）

# 重启应用

pm2 restart school-area-system#### 限流配置总览



# 停止应用| 路由 | 限制 | 时间窗口 | 防御目的 |

pm2 stop school-area-system|------|------|---------|----------|

| `/api/*`（通用） | 100次 | 15分钟 | 防止API滥用 |

# 删除应用| `/api/auth/login` ⭐ | 5次 | 15分钟 | **防暴力破解** |

pm2 delete school-area-system| `/online-calculate` | 20次 | 1分钟 | 防资源滥用 |

| `/api/download-record/:id` | 10次 | 1分钟 | **防数据爬取** |

# 监控| `/online-download` | 10次 | 1分钟 | 防批量下载 |

pm2 monit| `/api/batch-export` | 5次 | 1分钟 | 防批量操作滥用 |

```| `/api/school-combination` | 5次 | 1分钟 | 防批量删除滥用 |



### 使用Docker部署#### 限流日志记录

当请求被限流时,系统会自动记录以下信息:

#### 1. 构建镜像```

```bash[时间戳] 限流触发 - 登录限流（可能的暴力破解尝试）

docker build -t school-area-system .  IP: 192.168.1.100

```  用户: 未登录

  路径: /api/auth/login

#### 2. 运行容器  User-Agent: Mozilla/5.0...

```bash```

docker run -d \

  --name school-area-system \#### 安全测试

  -p 3000:3000 \使用 `test_security.sh` 脚本测试安全配置:

  -e DB_HOST=your_mysql_host \```bash

  -e DB_USER=root \chmod +x test_security.sh

  -e DB_PASSWORD=your_password \./test_security.sh

  -e DB_NAME=school_area_db \```

  school-area-system

```测试包括:

1. Helmet HTTP安全头验证

### HTTPS配置2. 登录接口限流测试（防暴力破解）

3. API接口限流测试

#### 1. 生成SSL证书4. 下载接口限流测试（防爬取）

```bash

# 使用自签名证书（开发环境）#### 监控建议

cd config/certs```bash

./generate_cert.sh# 查看限流触发次数

grep "限流触发" logs/combined.log | wc -l

# 或使用Let's Encrypt（生产环境）

certbot certonly --standalone -d yourdomain.com# 找出被限流最多的IP

```grep "限流触发" logs/combined.log | grep -oP 'IP: \K[0-9.]+' | sort | uniq -c | sort -nr



#### 2. 配置环境变量# 查看登录暴力破解尝试

```envgrep "登录限流" logs/combined.log

HTTPS_ENABLED=true```

HTTPS_FORCE_REDIRECT=true

```### 输入验证

- ✅ **长度限制** - 防止过长输入

#### 3. 重启服务- ✅ **特殊字符过滤** - 移除危险字符

```bash- ✅ **数据类型验证** - 前后端双重验证

pm2 restart school-area-system- ✅ **业务逻辑验证** - 数据合理性检查

```

### 安全检查清单

---- [x] ✅ Helmet安全头已启用

- [x] ✅ 通用API限流已配置

## ❓ 常见问题- [x] ✅ 登录接口限流已配置（防暴力破解）

- [x] ✅ 计算接口限流已配置

### Q1: 首次安装后无法登录？- [x] ✅ 下载接口限流已配置（防数据爬取）

**A**: 确认数据库是否正确导入：- [x] ✅ 批量操作限流已配置

```bash- [x] ✅ 限流日志记录已启用

mysql -u root -p school_area_db -e "SELECT * FROM users WHERE username='admin';"- [ ] ⏳ 配置监控告警（建议）

```- [ ] ⏳ 定期审查日志（建议每周一次）



### Q2: 数据保存后查询不到？---

**A**: 检查以下几点：

1. 确认字段名映射正确（参考`config/dataService.js`）## 📖 详细使用说明

2. 检查数据库连接状态

3. 查看服务器日志：`pm2 logs`### 1️⃣ 管理员操作流程



### Q3: Excel导出显示0值？#### 首次系统配置

**A**: 已在v2.1.0修复，确保使用最新版本代码1. **登录系统** - 使用admin/admin123456

2. **修改密码** - 个人中心→修改密码

### Q4: 如何添加新学校？3. **创建用户** - 用户管理→新增用户

**A**:    - 创建基建中心账号

1. 管理员登录→用户管理   - 为每所学校创建学校账号

2. 新增学校账号4. **配置标准** - 标准管理→查看/修改标准

3. 在`school_registry`表中添加学校信息   - 检查基础面积标准

4. 配置该学校的规划学生数   - 检查补贴面积标准

   - 确认学校类型映射

### Q5: 如何修改面积标准？

**A**:#### 日常管理操作

1. 管理员登录→标准管理- **用户管理** - 启用/禁用/删除用户

2. 找到对应的院校类型和用房类型- **数据审核** - 查看所有学校提交的数据

3. 修改标准值并保存- **系统维护** - 数据备份、标准调整



### Q6: 忘记管理员密码？### 2️⃣ 基建中心操作流程

**A**:

```sql1. **登录系统** - 使用分配的账号

-- 直接在数据库中重置密码为 admin1234562. **查看统计** - 统计分析页面

UPDATE users    - 查看总体概览

SET password = '$2b$10$eBpq4jsfIMlKK5KrOYAx8ucE2GZeTZoQzcoyx3UMS6sV0r8ach5i2'    - 按院校类型分析

WHERE username = 'admin';   - 年度趋势分析

```3. **数据导出** - 批量导出Excel报表

4. **数据查询** - 查看所有学校历史记录

### Q7: 如何备份数据？

**A**:### 3️⃣ 学校用户操作流程

```bash

# 备份整个数据库#### 数据录入流程（使用data-entry-new.html）

mysqldump -u root -p school_area_db > backup_$(date +%Y%m%d).sql1. **登录系统** - 使用学校账号

2. **选择学校和年份** - 高校测算→选择学校和测算年份

# 只备份数据（不含结构）   - 系统自动加载规划学生数据

mysqldump -u root -p --no-create-info school_area_db > data_backup.sql   - 切换学校时自动重置表单（2025年1月新增）

```3. **录入/确认学生数据**

   - 全日制本科/专科/硕士/博士

### Q8: 如何升级系统？   - 留学生本科/专科/硕士/博士

**A**:4. **录入现状面积**（7个维度）

```bash   - 现有面积（current）

# 1. 备份数据库   - 初步规划面积（preliminary）

mysqldump -u root -p school_area_db > backup.sql   - 在建面积（under_construction）

   - 规划面积（planned）

# 2. 拉取最新代码   - （汇总、应配、缺口由系统自动计算）

git pull origin main5. **添加特殊补助**（可选）

   - 补助项目名称

# 3. 更新依赖   - 补助面积

npm install6. **执行计算** - 点击"计算"按钮

   - 系统计算77个字段

# 4. 重启服务   - 实时预览计算结果（冻结表头）

pm2 restart school-area-system7. **保存结果** - 确认无误后保存到数据库

```8. **导出报表** - 下载Excel文件（已修复字段映射）



---#### 历史记录查询

1. **历史测算页面** - 查看本校历史记录

## 📝 更新日志2. **筛选查询** - 按年份筛选

3. **查看详情** - 点击记录查看详细计算结果

### Version 2.1.1 (2025-10-22) - 安全增强版本 🛡️4. **导出数据** - 下载历史记录Excel（使用*_total字段）

- 🔐 **安全功能增强**：5. **删除记录** - 删除错误记录（已修复空指针错误）

  - 新增 Helmet (v7+) HTTP 安全响应头

  - 实施 5 级请求限流策略（express-rate-limit v7+）### 4️⃣ Excel文件格式说明

  - 登录接口严格限流（5次/15分钟，防暴力破解）

  - 下载接口限流（10次/分钟，防数据爬取）#### 导入格式（可选功能）

  - 计算接口限流（20次/分钟，防资源滥用）```

  - 批量操作限流（5次/分钟）学校名称 | 年份 | 全日制本科生 | 全日制专科生 | ...

  - 通用API限流（100次/15分钟）上海大学 | 2025 | 10000 | 2000 | ...

- 📊 **安全日志系统**：```

  - 限流触发自动记录（IP、用户、路径、User-Agent）

  - 区分不同类型的安全威胁（暴力破解、数据爬取等）#### 导出格式（包含所有7个维度）

- 🧪 **测试框架**：**基本信息**:

  - 创建 `test/` 目录用于测试脚本- 学校名称、院校类型、测算年份

  - 实现自动化安全测试脚本（test_security.sh）- 提交人、提交时间

  - 支持登录状态模拟和限流验证

  - 自动化 Helmet 配置验证**学生数据**:

- 📁 **项目结构优化**：- 各学历层次学生人数

  - 删除 `delete/` 目录（包含硬编码密码的废弃脚本）- 学生总数

  - 整理 `backups/` 目录（database/ 和 frontend_old/）

  - 移动 `db.sql` 到 `scripts/` 目录**面积数据**（5种用房类型）:

  - 清理临时文件（cookies.txt, server.log）- 现有面积（current）

- 初步规划面积（preliminary）

### Version 2.1.0 (2025-01-XX) - 重大修复版本- 在建面积（under_construction）

- 🔧 **数据库持久化修复**：- 规划面积（planned）

  - 修复字段名映射错误（现有教学及辅助用房面积 vs 现有教学面积）- 汇总面积（total）✅ 已修复

  - 修复const变量重新赋值错误- 应配面积（required）

  - 添加数值规范化处理函数- 缺口面积（gap）

  - 确保77个字段正确保存到数据库

- 🔧 **下载功能修复**：**汇总数据**:

  - 修复历史下载使用错误字段（teaching_area_current → teaching_area_total）- 总缺口（含/不含特殊补助）

  - 修复所有用房类型的字段映射（5种用房类型）- 特殊补助明细

- 🔧 **用户体验优化**：

  - 实现学校选择自动重置功能---

  - 改进data-entry-new.html表单交互逻辑

  - 保留学校选择，清空规划表和计算结果## 🚀 部署指南

- 🔧 **API稳定性修复**：

  - 修复api.js中apiDelete函数的空指针错误### 开发环境部署

  - 移除重复的函数定义```bash

  - 添加data && null检查# 1. 安装依赖

npm install

### Version 2.0.0 (2025-10-13)

- ✨ 完整的项目文档# 2. 配置环境变量

- ✨ 详细的API接口说明cp .env.example .env

- ✨ 数据库设计文档# 编辑.env文件

- ✨ 部署指南和常见问题解答

# 3. 初始化数据库

### Version 1.0.0mysql -u root -p < db.sql

- 🎉 初始版本发布

- ✅ 核心功能实现# 4. 启动开发服务器

- ✅ 29所上海高校数据预置npm run dev

```

---

### 生产环境部署

## 🤝 贡献指南

#### 方式一：传统部署

欢迎贡献代码、报告问题或提出改进建议！```bash

# 1. 克隆代码到服务器

### 如何贡献git clone https://github.com/Caojie2001/school_area_project_v2.git

cd school_area_project_v2

1. Fork本项目

2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)# 2. 安装生产依赖

3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)npm install --production

4. 推送到分支 (`git push origin feature/AmazingFeature`)

5. 开启Pull Request# 3. 配置环境变量（生产环境）

nano .env

### 代码规范# 设置 NODE_ENV=production

- 遵循现有代码风格# 配置数据库连接

- 添加必要的注释# 设置强密码SESSION_SECRET

- 确保所有测试通过

- 更新相关文档# 4. 生成SSL证书（如需HTTPS）

cd config/certs

---bash generate_cert.sh



## 📄 许可证# 5. 使用PM2启动（进程管理）

npm install -g pm2

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件pm2 start server.js --name school-area-system

pm2 save

---pm2 startup



## 👥 团队# 6. 配置Nginx反向代理（可选）

```

- **开发者**: CaoJie

- **项目**: 上海市教育委员会高校建筑面积管理系统#### 方式二：Docker部署

- **联系方式**: [GitHub](https://github.com/Caojie2001)```bash

# 1. 构建镜像

---docker build -t school-area-system .



## 🔗 相关链接# 2. 运行容器

docker run -d \

- [GitHub仓库](https://github.com/Caojie2001/school_area_project_v2)  --name school-area-system \

- [问题反馈](https://github.com/Caojie2001/school_area_project_v2/issues)  -p 3000:3000 \

- [测试文档](test/README.md)  -p 3443:3443 \

  -e DB_HOST=your_db_host \

---  -e DB_PASSWORD=your_db_password \

  school-area-system

<div align="center">

# 3. 查看日志

**高校建筑面积缺口测算系统 V2**docker logs -f school-area-system

```

专业 • 安全 • 高效

### 数据库备份建议

Made with ❤️ by CaoJie```bash

# 定期备份数据库（建议每天）

</div>mysqldump -u root -p school_area_management > backup_$(date +%Y%m%d).sql


# 恢复数据库
mysql -u root -p school_area_management < backup_20250101.sql
```

---

## 🧪 测试账号

系统预置了一个管理员账号用于测试：

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | admin | admin123456 | 全部权限 |

**⚠️ 重要提示**:
1. 首次登录后立即修改默认密码
2. 生产环境务必修改SESSION_SECRET
3. 定期更新用户密码
4. 定期备份数据库

---

## ❓ 常见问题 (FAQ)

### Q1: 数据库连接失败？
**A**: 检查以下几点：
1. MySQL服务是否已启动
2. `.env`文件中的数据库配置是否正确
3. 数据库用户权限是否足够
4. 数据库是否已通过`db.sql`初始化

### Q2: 历史下载Excel显示0值？
**A**: 
- ✅ 已修复（2025年1月）
- 问题原因：server.js使用了错误的字段名（*_current而非*_total）
- 解决方案：已更新为使用*_total字段

### Q3: 计算后数据保存失败或显示0？
**A**:
- ✅ 已修复（2025年1月）
- 问题原因：字段名映射错误、const变量重新赋值
- 解决方案：
  - 添加字段名fallback映射
  - 将const改为let
  - 添加数值规范化函数

### Q4: 删除记录时报错"Cannot convert undefined or null to object"？
**A**:
- ✅ 已修复（2025年1月）
- 问题原因：apiDelete函数未检查data是否为null
- 解决方案：添加`data &&`空值检查

### Q5: 切换学校后表单数据没有清空？
**A**:
- ✅ 已修复（2025年1月）
- 问题原因：handleSchoolChangeNew未重置表单
- 解决方案：添加清空逻辑（保留学校选择，清空其他）

### Q6: 如何添加新的学校？
**A**: 
1. 管理员登录系统
2. 直接在数据库`school_registry`表中插入新记录
3. 或联系开发人员添加迁移脚本

### Q7: 如何修改计算标准？
**A**:
1. 管理员登录→标准管理
2. 找到对应的院校类型和用房类型
3. 修改标准值并保存

### Q8: Excel导出乱码？
**A**: 
- 系统使用UTF-8编码
- 在Excel中打开时选择"数据→从文本/CSV"
- 或使用WPS Office打开（自动识别UTF-8）

### Q9: 忘记管理员密码？
**A**:
```sql
-- 直接在数据库中重置密码为 admin123456
UPDATE users 
SET password = '$2b$10$eBpq4jsfIMlKK5KrOYAx8ucE2GZeTZoQzcoyx3UMS6sV0r8ach5i2' 
WHERE username = 'admin';
```

### Q10: 如何升级系统？
**A**:
```bash
# 1. 备份数据库
mysqldump -u root -p school_area_management > backup.sql

# 2. 拉取最新代码
git pull origin main

# 3. 更新依赖
npm install

# 4. 重启服务
pm2 restart school-area-system
```

---

## 🧪 测试

### 运行所有测试（推荐）
```bash
# 运行完整测试套件
./test/run_all_tests.sh
```

### 运行安全测试
```bash
# 只测试 Helmet 和 Rate Limiting 配置
./test/test_security.sh
```

**测试内容**:
- ✅ HTTP 安全响应头验证（Helmet）
- ✅ 登录接口限流（防暴力破解）
- ✅ API 通用限流测试
- ✅ 下载接口限流（防数据爬取）
- ✅ 计算接口限流（防资源滥用）

**查看测试结果**:
```bash
# 查看限流触发日志
pm2 logs school-area-system | grep "限流触发"

# 或查看文件日志
tail -f logs/combined.log | grep "限流触发"
```

**更多测试文档**: 查看 [test/README.md](test/README.md)

---

## 📝 更新日志

### Version 2.1.1 (2025-10-22) - 安全增强版本 🛡️
- 🔐 **安全功能增强**：
  - 新增 Helmet (v7+) HTTP 安全响应头
  - 实施 5 级请求限流策略（express-rate-limit v7+）
  - 登录接口严格限流（5次/15分钟，防暴力破解）
  - 下载接口限流（10次/分钟，防数据爬取）
  - 计算接口限流（20次/分钟，防资源滥用）
  - 批量操作限流（5次/分钟）
  - 通用API限流（100次/15分钟）
- 📊 **安全日志系统**：
  - 限流触发自动记录（IP、用户、路径、User-Agent）
  - 区分不同类型的安全威胁（暴力破解、数据爬取等）
- 🧪 **测试框架**：
  - 创建 `test/` 目录用于测试脚本
  - 实现自动化安全测试脚本（test_security.sh）
  - 支持登录状态模拟和限流验证
  - 自动化 Helmet 配置验证
- 📄 **文档完善**：
  - 整合 SECURITY.md 内容到主 README
  - 添加详细的限流配置表格
  - 提供安全监控命令示例
  - 创建测试目录文档（test/README.md）

### Version 2.1.0 (2025-01-XX) - 重大修复版本
- 🔧 **数据库持久化修复**：
  - 修复字段名映射错误（现有教学及辅助用房面积 vs 现有教学面积）
  - 修复const变量重新赋值错误
  - 添加数值规范化处理函数
  - 确保77个字段正确保存到数据库
- 🔧 **下载功能修复**：
  - 修复历史下载使用错误字段（teaching_area_current → teaching_area_total）
  - 修复所有用房类型的字段映射（5种用房类型）
- 🔧 **用户体验优化**：
  - 实现学校选择自动重置功能
  - 改进data-entry-new.html表单交互逻辑
  - 保留学校选择，清空规划表和计算结果
- 🔧 **API稳定性修复**：
  - 修复api.js中apiDelete函数的空指针错误
  - 移除重复的函数定义
  - 添加data && null检查
- 📄 **文档更新**：
  - 更新项目结构说明
  - 添加详细的修复说明
  - 更新常见问题解答

### Version 2.0.0 (2025-10-13)
- ✨ 完整的项目文档
- ✨ 详细的API接口说明
- ✨ 数据库设计文档
- ✨ 部署指南和常见问题解答

### Version 1.0.0
- 🎉 初始版本发布
- ✅ 核心功能实现
- ✅ 29所上海高校数据预置

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

### 如何贡献

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 代码规范
- 使用有意义的变量和函数名
- 添加适当的注释
- 遵循现有代码风格
- 提交前测试功能
- 修复bug时在commit中说明问题和解决方案

---

## 🐛 已知问题与修复进展

| 问题 | 状态 | 修复版本 | 说明 |
|------|------|---------|------|
| 历史下载显示0值 | ✅ 已修复 | v2.1.0 | 使用*_total字段 |
| 数据库字段映射错误 | ✅ 已修复 | v2.1.0 | 添加fallback映射 |
| const变量重新赋值 | ✅ 已修复 | v2.1.0 | 改为let |
| 删除操作空指针 | ✅ 已修复 | v2.1.0 | 添加空值检查 |
| 学校切换不重置表单 | ✅ 已修复 | v2.1.0 | 添加重置逻辑 |

---

## 📄 许可证

本项目基于 **MIT许可证** 开源。详见 [LICENSE](LICENSE) 文件。

---

## 👥 联系方式

- **项目维护者**: CaoJie
- **GitHub**: [@Caojie2001](https://github.com/Caojie2001)
- **项目地址**: [school_area_project_v2](https://github.com/Caojie2001/school_area_project_v2)
- **问题反馈**: [GitHub Issues](https://github.com/Caojie2001/school_area_project_v2/issues)

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和使用者！

特别感谢：
- 上海市教育委员会提供的建筑面积标准
- 29所参与高校的数据支持
- 所有提出问题和建议的用户

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给它一个Star！⭐**

© 2025 高校建筑面积缺口测算系统 V2 | Made with ❤️ by CaoJie

**最后更新**: 2025年1月 | Version 2.1.0

</div>
