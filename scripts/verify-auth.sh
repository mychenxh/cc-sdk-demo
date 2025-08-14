#!/bin/bash

# Claude CLI 认证状态验证脚本
# 用于检查 Railway 环境中的应用状态和 Claude CLI 认证状态

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
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

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

# 显示横幅
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                  认证状态验证脚本                           ║"
    echo "║             检查 Railway 应用和 Claude CLI 状态              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查 Railway CLI 状态
check_railway_cli() {
    log_info "检查 Railway CLI 状态..."
    
    if ! command_exists railway; then
        log_error "❌ Railway CLI 未安装"
        log_info "解决方案: ./scripts/railway-setup.sh"
        return 1
    fi
    
    if ! railway whoami >/dev/null 2>&1; then
        log_error "❌ 未登录到 Railway"
        log_info "解决方案: railway login"
        return 1
    fi
    
    if ! railway status >/dev/null 2>&1; then
        log_error "❌ 未连接到 Railway 项目"
        log_info "解决方案: railway link"
        return 1
    fi
    
    local user=$(railway whoami 2>/dev/null)
    log_success "✅ Railway CLI 状态正常 - 用户: $user"
    return 0
}

# 获取项目信息
get_project_info() {
    log_info "获取项目信息..."
    
    local domain=$(railway domains 2>/dev/null | head -1 | awk '{print $1}' || echo "")
    local project_id=$(railway status 2>/dev/null | grep -o 'Project ID: [^[:space:]]*' | cut -d' ' -f3 || echo "")
    local service_name=$(railway status 2>/dev/null | grep -o 'Service: [^[:space:]]*' | cut -d' ' -f2 || echo "")
    
    echo "DOMAIN=$domain"
    echo "PROJECT_ID=$project_id"
    echo "SERVICE_NAME=$service_name"
}

# 检查应用健康状态
check_application_health() {
    local domain=$1
    log_info "检查应用健康状态..."
    
    if [ -z "$domain" ]; then
        log_error "❌ 无法获取项目域名"
        return 1
    fi
    
    local health_url="https://$domain/api/health"
    
    if ! command_exists curl; then
        log_warning "⚠️  curl 未安装，跳过健康检查"
        return 0
    fi
    
    log_debug "检查 URL: $health_url"
    
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$health_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "❌ 无法连接到应用"
        log_debug "错误详情: $response"
        return 1
    fi
    
    case $http_code in
        200)
            if echo "$body" | grep -q '"status":"ok"'; then
                log_success "✅ 应用健康状态正常"
                log_debug "响应: $(echo "$body" | head -c 100)..."
                return 0
            else
                log_warning "⚠️  应用响应异常"
                log_debug "响应: $body"
                return 1
            fi
            ;;
        404)
            log_error "❌ 应用端点未找到 (404)"
            log_info "可能原因: 应用未正确部署"
            return 1
            ;;
        500)
            log_error "❌ 应用服务器错误 (500)"
            log_info "可能原因: Claude CLI 认证问题"
            return 1
            ;;
        *)
            log_error "❌ 应用返回 HTTP $http_code"
            log_debug "响应: $body"
            return 1
            ;;
    esac
}

# 检查 Claude CLI 认证状态
check_claude_auth() {
    local domain=$1
    log_info "检查 Claude CLI 认证状态..."
    
    if [ -z "$domain" ]; then
        log_error "❌ 无法获取项目域名"
        return 1
    fi
    
    local auth_url="https://$domain/api/auth-check"
    
    if ! command_exists curl; then
        log_warning "⚠️  curl 未安装，跳过认证检查"
        return 0
    fi
    
    log_debug "检查 URL: $auth_url"
    
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$auth_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "❌ 无法连接到认证检查端点"
        return 1
    fi
    
    case $http_code in
        200)
            local authenticated=$(echo "$body" | grep -o '"authenticated":[^,]*' | cut -d':' -f2 | tr -d ' "')
            local cli_version=$(echo "$body" | grep -o '"cli_version":"[^"]*"' | cut -d'"' -f4)
            local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            if [ "$authenticated" = "true" ]; then
                log_success "✅ Claude CLI 认证成功"
                [ -n "$cli_version" ] && log_debug "CLI 版本: $cli_version"
                return 0
            else
                case $status in
                    "warning")
                        log_warning "⚠️  Claude CLI 已安装但需要认证"
                        [ -n "$cli_version" ] && log_debug "CLI 版本: $cli_version"
                        log_info "解决方案: ./scripts/claude-auth.sh"
                        return 1
                        ;;
                    "error")
                        log_error "❌ Claude CLI 未安装或配置错误"
                        log_info "解决方案: 检查 railway.json 配置"
                        return 1
                        ;;
                    *)
                        log_warning "⚠️  Claude CLI 认证状态未知"
                        log_debug "响应: $body"
                        return 1
                        ;;
                esac
            fi
            ;;
        404)
            log_error "❌ 认证检查端点未找到 (404)"
            log_info "可能原因: 应用版本不匹配"
            return 1
            ;;
        500)
            log_error "❌ 认证检查服务器错误 (500)"
            log_info "可能原因: Claude CLI 问题"
            return 1
            ;;
        *)
            log_error "❌ 认证检查返回 HTTP $http_code"
            log_debug "响应: $body"
            return 1
            ;;
    esac
}

# 在 Railway 环境中直接检查
check_railway_environment() {
    log_info "直接检查 Railway 环境..."
    
    local check_commands="
        echo '🔍 检查 Railway 环境...'
        echo 'Node 版本:' \$(node --version 2>/dev/null || echo '未安装')
        echo 'NPM 版本:' \$(npm --version 2>/dev/null || echo '未安装')
        echo ''
        
        echo '🔍 检查 Claude CLI...'
        if command -v claude >/dev/null 2>&1; then
            echo '✅ Claude CLI 已安装:' \$(claude --version)
            echo ''
            echo '🔐 检查认证状态...'
            if claude auth status 2>/dev/null | grep -i -E '(authenticated|logged in|authorized)'; then
                echo '✅ Claude CLI 已认证'
            else
                echo '❌ Claude CLI 未认证'
                echo '需要运行: claude login'
            fi
        else
            echo '❌ Claude CLI 未安装'
            echo '需要检查 railway.json 配置'
        fi
    "
    
    log_info "正在连接到 Railway 环境..."
    if railway ssh --command "$check_commands"; then
        log_success "✅ Railway 环境检查完成"
        return 0
    else
        log_error "❌ Railway 环境检查失败"
        return 1
    fi
}

# 生成状态报告
generate_report() {
    local railway_ok=$1
    local app_health=$2
    local claude_auth=$3
    local env_check=$4
    local domain=$5
    
    echo ""
    echo "📊 状态报告"
    echo "=========="
    echo ""
    
    # Railway CLI 状态
    echo "🚂 Railway CLI: $([ "$railway_ok" = "0" ] && echo "✅ 正常" || echo "❌ 异常")"
    
    # 应用健康状态
    echo "🌐 应用健康: $([ "$app_health" = "0" ] && echo "✅ 正常" || echo "❌ 异常")"
    
    # Claude CLI 认证
    echo "🔐 Claude 认证: $([ "$claude_auth" = "0" ] && echo "✅ 已认证" || echo "❌ 未认证")"
    
    # 环境检查
    echo "🖥️  环境检查: $([ "$env_check" = "0" ] && echo "✅ 正常" || echo "❌ 异常")"
    
    echo ""
    
    # 项目信息
    if [ -n "$domain" ]; then
        echo "📱 应用地址: https://$domain/"
        echo "🔍 健康检查: https://$domain/api/health"
        echo "🔐 认证状态: https://$domain/api/auth-check"
        echo ""
    fi
    
    # 整体状态
    local total_issues=$((railway_ok + app_health + claude_auth + env_check))
    if [ "$total_issues" -eq 0 ]; then
        echo "🎉 整体状态: 完美运行"
        echo "✅ 所有系统都正常工作"
    elif [ "$total_issues" -le 2 ]; then
        echo "⚠️  整体状态: 部分问题"
        echo "📝 建议检查并修复上述问题"
    else
        echo "❌ 整体状态: 需要修复"
        echo "🔧 建议运行完整的设置流程"
    fi
    
    echo ""
}

# 显示建议
show_recommendations() {
    local railway_ok=$1
    local app_health=$2
    local claude_auth=$3
    local env_check=$4
    
    echo "🔧 修复建议"
    echo "=========="
    echo ""
    
    if [ "$railway_ok" != "0" ]; then
        echo "🚂 Railway CLI 问题:"
        echo "   运行: ./scripts/railway-setup.sh"
        echo ""
    fi
    
    if [ "$app_health" != "0" ]; then
        echo "🌐 应用健康问题:"
        echo "   检查: railway logs"
        echo "   重启: railway restart"
        echo ""
    fi
    
    if [ "$claude_auth" != "0" ]; then
        echo "🔐 Claude CLI 认证问题:"
        echo "   运行: ./scripts/claude-auth.sh"
        echo ""
    fi
    
    if [ "$env_check" != "0" ]; then
        echo "🖥️  环境问题:"
        echo "   检查: railway status"
        echo "   重新部署: railway up"
        echo ""
    fi
    
    echo "📚 更多帮助:"
    echo "   文档: RAILWAY_DEPLOYMENT.md"
    echo "   健康检查: ./scripts/health-check.sh"
    echo ""
}

# 主函数
main() {
    show_banner
    
    log_info "开始验证认证状态..."
    echo ""
    
    # 初始化状态变量
    local railway_ok=1
    local app_health=1
    local claude_auth=1
    local env_check=1
    local domain=""
    
    # 检查 Railway CLI
    if check_railway_cli; then
        railway_ok=0
    fi
    echo ""
    
    # 获取项目信息
    if [ "$railway_ok" = "0" ]; then
        local project_info=$(get_project_info)
        eval "$project_info"
    fi
    echo ""
    
    # 检查应用健康状态
    if [ -n "$DOMAIN" ]; then
        if check_application_health "$DOMAIN"; then
            app_health=0
        fi
    else
        log_error "❌ 跳过应用健康检查 - 无域名信息"
    fi
    echo ""
    
    # 检查 Claude CLI 认证状态
    if [ -n "$DOMAIN" ]; then
        if check_claude_auth "$DOMAIN"; then
            claude_auth=0
        fi
    else
        log_error "❌ 跳过认证检查 - 无域名信息"
    fi
    echo ""
    
    # 直接检查 Railway 环境
    if [ "$railway_ok" = "0" ]; then
        if check_railway_environment; then
            env_check=0
        fi
    else
        log_error "❌ 跳过环境检查 - Railway CLI 问题"
    fi
    echo ""
    
    # 生成报告
    generate_report $railway_ok $app_health $claude_auth $env_check "$DOMAIN"
    
    # 显示建议
    show_recommendations $railway_ok $app_health $claude_auth $env_check
    
    log_success "✅ 状态验证完成"
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || ! grep -q "claude-code-sdk-ts" package.json; then
    log_error "请在 Claude Code SDK 项目根目录运行此脚本"
    exit 1
fi

# 运行主函数
main "$@"