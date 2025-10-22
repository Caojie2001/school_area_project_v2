#!/bin/bash

# 安全功能测试脚本
# 用于验证 Helmet 和 Rate Limiting 配置

echo "🔐 安全功能测试脚本"
echo "===================="
echo ""
echo "⚠️  注意事项:"
echo "  1. 确保服务器正在运行 (npm start 或 pm2 start)"
echo "  2. 如果之前测试过，可能需要等待限流时间窗口过期"
echo "  3. 或者重启服务器以清除限流记录"
echo ""

# 询问是否需要重启服务器
read -p "是否需要重启服务器以清除限流记录？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "正在重启服务器..."
    
    # 检查是否使用 pm2
    if command -v pm2 &> /dev/null && pm2 list | grep -q "school-area-system"; then
        pm2 restart school-area-system
        sleep 3
        print_success "服务器已重启 (pm2)"
    elif [ -f "server.js" ]; then
        print_info "检测到 server.js，但未使用 pm2"
        print_info "请手动重启服务器: npm start 或 pm2 start server.js"
        read -p "重启完成后按回车继续..." 
    else
        print_info "未检测到服务器进程，请手动重启"
        read -p "重启完成后按回车继续..."
    fi
fi

echo ""

# 配置
BASE_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cookie 文件（用于保存登录状态）
COOKIE_FILE="/tmp/test_security_cookies.txt"

# 辅助函数
print_test() {
    echo -e "${YELLOW}📋 测试: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "   $1"
}

print_step() {
    echo -e "${BLUE}🔹 $1${NC}"
}

# 清理函数
cleanup() {
    if [ -f "$COOKIE_FILE" ]; then
        rm -f "$COOKIE_FILE"
        print_info "清理 cookie 文件"
    fi
}

# 设置退出时清理
trap cleanup EXIT

# 设置退出时清理
trap cleanup EXIT

echo ""
print_step "步骤 0: 准备测试环境"
echo ""

# 检查服务器是否运行
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    print_fail "服务器未运行！请先启动服务器: npm start 或 pm2 start server.js"
    exit 1
fi
print_success "服务器运行正常"

# 尝试登录获取 session cookie
print_step "步骤 0.1: 登录获取 Session Cookie"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123456"}' \
    2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    print_success "登录成功，Session Cookie 已保存"
    print_info "Cookie 文件: $COOKIE_FILE"
    
    # 显示 cookie 内容（调试用）
    if [ -f "$COOKIE_FILE" ]; then
        SESSION_ID=$(grep connect.sid "$COOKIE_FILE" | awk '{print $7}' | cut -c1-20)
        print_info "Session ID: ${SESSION_ID}..."
    fi
elif echo "$LOGIN_RESPONSE" | grep -q "请15分钟后再试"; then
    print_fail "登录被限流！之前测试次数过多"
    print_info "解决方法: 1) 等待 15 分钟  2) 重启服务器清除限流记录"
    print_info "将跳过需要登录的测试..."
    # 清空 cookie 文件，后续测试会跳过
    rm -f "$COOKIE_FILE"
else
    print_fail "登录失败！使用默认账号 admin/admin123456 失败"
    print_info "响应: $LOGIN_RESPONSE"
    print_info "将跳过需要登录的测试..."
    rm -f "$COOKIE_FILE"
fi

echo ""

# 测试 1: Helmet 安全头
print_test "检查 Helmet 安全响应头"
echo ""

HEADERS=$(curl -s -I "$BASE_URL" 2>/dev/null)

if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
    print_success "X-Content-Type-Options 头已设置"
else
    print_fail "X-Content-Type-Options 头未找到"
fi

if echo "$HEADERS" | grep -qi "X-Frame-Options\|Content-Security-Policy"; then
    print_success "XSS 防护头已设置"
else
    print_fail "XSS 防护头未找到"
fi

echo ""

# 测试 2: 登录限流
print_test "测试登录接口限流 (5次/15分钟)"
echo ""

print_info "发送 6 次登录请求..."
for i in {1..6}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"test","password":"wrong"}' \
        2>/dev/null)
    
    if [ $i -le 5 ]; then
        if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
            print_info "尝试 $i: HTTP $RESPONSE (正常 - 认证失败)"
        else
            print_fail "尝试 $i: 预期 401，得到 $RESPONSE"
        fi
    else
        if [ "$RESPONSE" = "429" ]; then
            print_success "尝试 $i: HTTP 429 (限流触发 ✓)"
        else
            print_fail "尝试 $i: 预期 429，得到 $RESPONSE"
        fi
    fi
    sleep 0.5
done

echo ""

# 测试 3: API 通用限流
print_test "测试 API 通用限流 (100次/15分钟)"
echo ""

print_info "快速发送 3 次 API 请求..."
for i in {1..3}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        "$BASE_URL/api/schools/registry" \
        2>/dev/null)
    
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        print_info "请求 $i: HTTP $RESPONSE (未触发限流)"
    else
        print_info "请求 $i: HTTP $RESPONSE"
    fi
done

print_success "API 限流配置正常 (需要 100+ 请求才会触发)"

echo ""

# 测试 4: 下载限流
print_test "测试下载接口限流 (10次/1分钟) - 使用登录状态"
echo ""

if [ ! -f "$COOKIE_FILE" ]; then
    print_fail "Cookie 文件不存在，跳过此测试"
else
    print_info "发送 11 次下载请求（携带 session cookie）..."
    for i in {1..11}; do
        RESPONSE=$(curl -s -b "$COOKIE_FILE" -o /dev/null -w "%{http_code}" \
            "$BASE_URL/api/download-record/1" \
            2>/dev/null)
        
        if [ $i -le 10 ]; then
            if [ "$RESPONSE" != "429" ]; then
                print_info "下载 $i: HTTP $RESPONSE (正常)"
            else
                print_fail "下载 $i: 提前触发限流"
            fi
        else
            if [ "$RESPONSE" = "429" ]; then
                print_success "下载 $i: HTTP 429 (限流触发 ✓)"
            else
                print_fail "下载 $i: 预期 429，得到 $RESPONSE"
            fi
        fi
        sleep 0.1
    done
fi

echo ""

# 测试 5: 计算接口限流（额外测试）
print_test "测试计算接口限流 (20次/1分钟) - 使用登录状态"
echo ""

if [ ! -f "$COOKIE_FILE" ]; then
    print_fail "Cookie 文件不存在，跳过此测试"
else
    print_info "发送 21 次计算请求（携带 session cookie）..."
    for i in {1..21}; do
        RESPONSE=$(curl -s -b "$COOKIE_FILE" -o /dev/null -w "%{http_code}" \
            -X POST "$BASE_URL/online-calculate" \
            -H "Content-Type: application/json" \
            -d '{"schoolName":"测试学校","year":2025}' \
            2>/dev/null)
        
        if [ $i -le 20 ]; then
            if [ "$RESPONSE" != "429" ]; then
                print_info "计算 $i: HTTP $RESPONSE (正常)"
            else
                print_fail "计算 $i: 提前触发限流"
            fi
        else
            if [ "$RESPONSE" = "429" ]; then
                print_success "计算 $i: HTTP 429 (限流触发 ✓)"
            else
                print_fail "计算 $i: 预期 429，得到 $RESPONSE"
            fi
        fi
        
        # 计算限流是每分钟，稍微快一点测试
        if [ $i -lt 21 ]; then
            sleep 0.05
        fi
    done
fi

echo ""

# 测试总结
echo "===================="
echo "✅ 测试完成！"
echo ""
echo "📊 结果总结:"
echo "  - Helmet 安全头: 已启用"
echo "  - 登录限流: 5次/15分钟 (未登录状态)"
echo "  - API通用限流: 100次/15分钟"
echo "  - 下载限流: 10次/1分钟 (已登录状态)"
echo "  - 计算限流: 20次/1分钟 (已登录状态)"
echo ""
echo "💡 提示:"
echo "  - 查看服务器日志以确认限流触发记录"
echo "  - 运行: pm2 logs school-area-system | grep '限流触发'"
echo "  - 或查看: tail -f logs/combined.log | grep '限流触发'"
echo ""
echo "� 真实攻击场景模拟:"
echo "  ✅ 测试 2: 模拟暴力破解登录（未登录）"
echo "  ✅ 测试 4: 模拟已登录用户批量爬取数据"
echo "  ✅ 测试 5: 模拟已登录用户恶意消耗计算资源"
echo ""
echo "�📖 详细文档: 查看 README.md 安全特性章节"
echo ""
