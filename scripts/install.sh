#!/bin/bash

# 高校建筑面积缺口测算系统 - 安装脚本
# School Building Area Gap Analysis System - Installation Script
# Version: 2.0.0

set -e  # 遇到错误时立即退出

echo "========================================================"
echo "  高校建筑面积缺口测算系统 - 安装程序"
echo "  School Building Area Gap Analysis System - Installer"
echo "========================================================"
echo ""

# 系统环境检查
echo "[1/6] 检查系统环境..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js运行环境"
    echo "请先安装Node.js: https://nodejs.org/"
    echo "推荐版本: v16.0.0 或更高版本"
    exit 1
fi

# 检查Node.js版本
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

echo "Node.js版本: v$NODE_VERSION"

# 版本比较
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "错误: Node.js版本过低，需要 >= v$REQUIRED_VERSION"
    echo "请升级Node.js版本"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm包管理器"
    echo "请确保npm已正确安装"
    exit 1
fi

echo "npm版本: $(npm --version)"
echo "系统环境检查完成"
echo ""

# 安装项目依赖
echo "[2/6] 安装项目依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "项目依赖安装成功"
else
    echo "错误: 项目依赖安装失败"
    exit 1
fi
echo ""

# 创建必要的目录结构
echo "[3/6] 创建目录结构..."
mkdir -p uploads
mkdir -p output
mkdir -p data
mkdir -p config
mkdir -p backups

echo "目录结构创建完成:"
echo "  - uploads/     (文件上传目录)"
echo "  - output/      (输出文件目录)"
echo "  - data/        (数据存储目录)"
echo "  - config/      (配置文件目录)"
echo "  - backups/     (备份文件目录)"
echo ""

# 设置权限
echo "[4/6] 设置目录权限..."
chmod 755 uploads output data config backups
echo "目录权限设置完成"
echo ""

# 配置环境文件
echo "[5/6] 配置环境文件..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "已创建环境配置文件 (.env)"
        echo "注意: 请根据实际情况编辑 .env 文件中的配置参数"
    else
        echo "警告: .env.example 文件不存在，请手动创建 .env 文件"
    fi
else
    echo "环境配置文件已存在"
fi
echo ""

# 验证安装
echo "[6/6] 验证安装..."
if [ -f "server.js" ] && [ -f "package.json" ]; then
    echo "核心文件检查通过"
    
    # 检查端口是否被占用
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "端口3000已被占用，跳过启动测试"
    else
        # 测试启动
        echo "正在测试应用启动..."
        # 使用后台进程代替timeout
        node server.js &
        SERVER_PID=$!
        sleep 3
        
        if kill -0 $SERVER_PID 2>/dev/null; then
            echo "应用启动测试成功"
            kill $SERVER_PID 2>/dev/null
        else
            echo "警告: 应用启动测试失败，请检查配置"
        fi
    fi
else
    echo "错误: 核心文件缺失"
    exit 1
fi
echo ""

echo "========================================================"
echo "  安装完成!"
echo "========================================================"
echo ""
echo "应用启动命令:"
echo "  npm start           # 生产环境启动"
echo "  npm run dev         # 开发环境启动 (需要nodemon)"
echo ""
echo "系统访问地址:"
echo "  http://localhost:3000"
echo ""
echo "主要功能模块:"
echo "  - 数据填报系统      在线填写学校建筑面积信息"
echo "  - 数据管理系统      查看和管理历史数据记录"
echo "  - 统计分析系统      生成统计报告和数据分析"
echo "  - 用户管理系统      管理系统用户和权限"
echo ""
echo "配置说明:"
echo "  - 数据库配置: 编辑 .env 文件设置数据库连接"
echo "  - 详细文档: 查看 README.md 获取更多信息"
echo ""
echo "技术支持:"
echo "  - 项目地址: https://github.com/Caojie2001/school_area_project"
echo "  - 文档地址: 查看项目根目录下的文档文件"
echo ""
echo "安装完成! 现在可以启动应用了。"
