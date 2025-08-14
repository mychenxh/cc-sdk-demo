#!/bin/bash

# Claude CLI 认证脚本
# 用于在 Railway 环境中完成 Claude CLI 认证

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# 显示横幅
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   Claude CLI 认证脚本                        ║"
    echo "║              Railway 环境半自动化认证流程                    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 显示使用说明
show_instructions() {
    echo "📋 认证流程说明:"
    echo "=================="
    echo ""
    echo "此脚本将帮助您完成 Railway 环境中的 Claude CLI 认证："
    echo ""
    echo "1. 📡 连接到 Railway 环境"
    echo "2. 🔍 检查 Claude CLI 安装状态"
    echo "3. 🔐 启动 Claude CLI 认证流程"
    echo "4. 🌐 在浏览器中完成 OAuth 认证"
    echo "5. ✅ 验证认证结果"
    echo "6. 🧪 测试应用功能"
    echo ""
    echo "⚠️  重要提示:"
    echo "- 您需要在浏览器中手动完成 OAuth 认证"
    echo "- 请准备好您的 Anthropic 账户凭据"
    echo "- 整个过程约需要 2-3 分钟"
    echo ""
    echo "按 Enter 键继续..."
    read -r
}

# 检查 Railway CLI
check_railway_cli() {
    log_info "检查 Railway CLI 状态..."
    
    if ! command_exists railway; then
        log_error "Railway CLI 未安装"
        log_info "请先运行: ./scripts/railway-setup.sh"
        exit 1
    fi
    
    if ! railway whoami >/dev/null 2>&1; then
        log_error "未登录到 Railway"
        log_info "请先运行: ./scripts/railway-setup.sh"
        exit 1
    fi
    
    log_success "Railway CLI 状态正常"
}

# 连接到 Railway SSH
connect_railway_ssh() {
    log_step "连接到 Railway 环境..."
    
    # 检查项目连接
    if ! railway status >/dev/null 2>&1; then
        log_error "未连接到 Railway 项目"
        log_info "请先运行: ./scripts/railway-setup.sh"
        exit 1
    fi
    
    log_success "Railway SSH 连接准备就绪"
}

# 在 Railway 环境中执行认证命令
perform_claude_auth() {
    log_step "开始 Claude CLI 认证流程..."
    echo ""
    
    # 显示认证步骤说明
    echo "🔐 Claude CLI 认证步骤:"
    echo "======================="
    echo ""
    echo "1. 系统将连接到 Railway 环境并启动认证"
    echo "2. Claude CLI 会显示一个认证 URL"
    echo "3. 请复制该 URL 并在浏览器中打开"
    echo "4. 使用您的 Anthropic 账户登录并授权"
    echo "5. 授权完成后，CLI 会显示认证成功"
    echo ""
    echo "准备好了吗？按 Enter 键开始认证..."
    read -r
    
    # 构建认证命令
    local auth_commands="
        echo '🔍 检查 Claude CLI 安装...'
        if command -v claude >/dev/null 2>&1; then
            claude --version
            echo '✅ Claude CLI 已安装'
        else
            echo '❌ Claude CLI 未安装'
            echo '请检查 railway.json 配置'
            exit 1
        fi
        
        echo ''
        echo '🔐 开始 Claude CLI 认证...'
        echo '=============================='
        echo '请按照以下步骤操作：'
        echo '1. 复制下面显示的认证 URL'
        echo '2. 在浏览器中打开该 URL'
        echo '3. 使用 Anthropic 账户登录'
        echo '4. 完成授权后等待认证完成'
        echo '=============================='
        echo ''
        
        claude login
        
        echo ''
        echo '🔍 验证认证状态...'
        claude auth status
        
        echo ''
        echo '✅ Claude CLI 认证流程完成'
    "
    
    # 执行认证
    log_info "正在连接到 Railway 环境..."
    if railway ssh --command "$auth_commands"; then
        log_success "Claude CLI 认证命令执行完成"
    else
        log_error "Claude CLI 认证执行失败"
        log_info "请检查错误信息并重试"
        exit 1
    fi
}

# 验证认证状态
verify_auth_status() {
    log_step "验证认证状态..."
    
    # 获取项目 URL
    local domain=$(railway domains 2>/dev/null | head -1 | awk '{print $1}' || echo "")
    if [ -z "$domain" ]; then
        log_warning "无法获取项目域名，请手动验证"
        return 0
    fi
    
    local api_url="https://$domain/api/auth-check"
    
    log_info "检查认证状态: $api_url"
    
    # 等待几秒钟让服务启动
    sleep 5
    
    # 检查认证状态
    if command -v curl >/dev/null 2>&1; then
        local response=$(curl -s "$api_url" 2>/dev/null || echo "")
        if [ -n "$response" ]; then
            local authenticated=$(echo "$response" | grep -o '"authenticated":[^,]*' | cut -d':' -f2 | tr -d ' "')
            if [ "$authenticated" = "true" ]; then
                log_success "✅ Claude CLI 认证成功"
                echo "📱 应用地址: https://$domain"
                echo "🔐 认证检查: $api_url"
                return 0
            fi
        fi
    fi
    
    log_warning "⚠️  认证状态验证失败，请手动检查"
    echo "📱 应用地址: https://$domain"
    echo "🔐 手动检查: https://$domain/api/auth-check"
}

# 测试应用功能
test_application() {
    log_step "测试应用功能..."
    
    # 获取项目 URL
    local domain=$(railway domains 2>/dev/null | head -1 | awk '{print $1}' || echo "")
    if [ -z "$domain" ]; then
        log_warning "无法获取项目域名，跳过应用测试"
        return 0
    fi
    
    local health_url="https://$domain/api/health"
    
    log_info "测试应用健康状态: $health_url"
    
    if command -v curl >/dev/null 2>&1; then
        local response=$(curl -s "$health_url" 2>/dev/null || echo "")
        if [ -n "$response" ] && echo "$response" | grep -q '"status":"ok"'; then
            log_success "✅ 应用健康状态正常"
        else
            log_warning "⚠️  应用健康状态异常"
        fi
    fi
    
    # 显示访问信息
    echo ""
    echo "🎉 应用访问信息:"
    echo "================"
    echo "📱 主页: https://$domain/"
    echo "🧪 演示页面: https://$domain/simple-real-demo.html"
    echo "🔍 健康检查: https://$domain/api/health"
    echo "🔐 认证状态: https://$domain/api/auth-check"
    echo "📚 Railway 指导: https://$domain/api/railway-guide"
    echo ""
}

# 显示后续步骤
show_next_steps() {
    echo "📋 后续步骤建议:"
    echo "================"
    echo ""
    echo "1. 🧪 测试 Claude SDK 功能"
    echo "   - 访问演示页面进行测试"
    echo "   - 尝试不同的查询和工具"
    echo ""
    echo "2. 🔍 监控应用状态"
    echo "   - 运行: ./scripts/verify-auth.sh"
    echo "   - 定期检查认证状态"
    echo ""
    echo "3. 📚 查看详细文档"
    echo "   - 阅读: RAILWAY_DEPLOYMENT.md"
    echo "   - 了解故障排除方法"
    echo ""
    echo "4. 🔄 定期维护"
    echo "   - Railway 重新部署后可能需要重新认证"
    echo "   - 运行健康检查脚本确保服务正常"
    echo ""
}

# 主函数
main() {
    show_banner
    show_instructions
    
    log_info "开始 Claude CLI 认证流程..."
    echo ""
    
    check_railway_cli
    echo ""
    
    connect_railway_ssh
    echo ""
    
    perform_claude_auth
    echo ""
    
    verify_auth_status
    echo ""
    
    test_application
    echo ""
    
    show_next_steps
    
    log_success "🎉 Claude CLI 认证流程完成！"
    echo ""
    log_info "感谢使用自动化认证脚本！"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || ! grep -q "claude-code-sdk-ts" package.json; then
    log_error "请在 Claude Code SDK 项目根目录运行此脚本"
    exit 1
fi

# 运行主函数
main "$@"