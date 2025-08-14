#!/bin/bash

# 健康检查和自动恢复脚本
# 用于监控 Railway 应用状态并在出现问题时自动恢复

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
ORANGE='\033[0;33m'
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

log_action() {
    echo -e "${CYAN}[ACTION]${NC} $1"
}

log_recovery() {
    echo -e "${ORANGE}[RECOVERY]${NC} $1"
}

# 显示横幅
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                  健康检查和自动恢复                         ║"
    echo "║              监控 Railway 应用状态并自动修复                ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 加载配置
load_config() {
    # 默认配置
    MAX_RETRIES=3
    RETRY_DELAY=30
    HEALTH_CHECK_INTERVAL=300  # 5分钟
    LOG_FILE="health-check.log"
    
    # 从环境变量覆盖配置
    [ -n "$MAX_RETRIES" ] && MAX_RETRIES="$MAX_RETRIES"
    [ -n "$RETRY_DELAY" ] && RETRY_DELAY="$RETRY_DELAY"
    [ -n "$HEALTH_CHECK_INTERVAL" ] && HEALTH_CHECK_INTERVAL="$HEALTH_CHECK_INTERVAL"
    [ -n "$LOG_FILE" ] && LOG_FILE="$LOG_FILE"
    
    log_debug "配置: MAX_RETRIES=$MAX_RETRIES, RETRY_DELAY=$RETRY_DELAY"
}

# 日志记录
log_to_file() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
        log_to_file "DEBUG" "$1"
    fi
}

# 检查 Railway CLI 状态
check_railway_cli() {
    log_info "检查 Railway CLI 状态..."
    
    if ! command_exists railway; then
        log_error "❌ Railway CLI 未安装"
        log_to_file "ERROR" "Railway CLI 未安装"
        return 1
    fi
    
    if ! railway whoami >/dev/null 2>&1; then
        log_error "❌ 未登录到 Railway"
        log_to_file "ERROR" "未登录到 Railway"
        return 1
    fi
    
    if ! railway status >/dev/null 2>&1; then
        log_error "❌ 未连接到 Railway 项目"
        log_to_file "ERROR" "未连接到 Railway 项目"
        return 1
    fi
    
    local user=$(railway whoami 2>/dev/null)
    log_success "✅ Railway CLI 状态正常 - 用户: $user"
    log_to_file "INFO" "Railway CLI 状态正常: $user"
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
    
    log_to_file "INFO" "项目信息: domain=$domain, project_id=$project_id, service=$service_name"
}

# 检查应用健康状态
check_application_health() {
    local domain=$1
    log_info "检查应用健康状态..."
    
    if [ -z "$domain" ]; then
        log_error "❌ 无法获取项目域名"
        log_to_file "ERROR" "无法获取项目域名"
        return 1
    fi
    
    local health_url="https://$domain/api/health"
    
    if ! command_exists curl; then
        log_warning "⚠️  curl 未安装，跳过健康检查"
        log_to_file "WARNING" "curl 未安装，跳过健康检查"
        return 0
    fi
    
    log_debug "检查 URL: $health_url"
    
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 10 --max-time 30 "$health_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "❌ 无法连接到应用"
        log_to_file "ERROR" "无法连接到应用: $health_url"
        return 1
    fi
    
    case $http_code in
        200)
            if echo "$body" | grep -q '"status":"ok"'; then
                log_success "✅ 应用健康状态正常"
                log_to_file "INFO" "应用健康状态正常"
                return 0
            else
                log_warning "⚠️  应用响应异常"
                log_to_file "WARNING" "应用响应异常: $body"
                return 1
            fi
            ;;
        404)
            log_error "❌ 应用端点未找到 (404)"
            log_to_file "ERROR" "应用端点未找到 (404)"
            return 1
            ;;
        500)
            log_error "❌ 应用服务器错误 (500)"
            log_to_file "ERROR" "应用服务器错误 (500)"
            return 1
            ;;
        *)
            log_error "❌ 应用返回 HTTP $http_code"
            log_to_file "ERROR" "应用返回 HTTP $http_code: $body"
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
        log_to_file "ERROR" "无法获取项目域名"
        return 1
    fi
    
    local auth_url="https://$domain/api/auth-check"
    
    if ! command_exists curl; then
        log_warning "⚠️  curl 未安装，跳过认证检查"
        log_to_file "WARNING" "curl 未安装，跳过认证检查"
        return 0
    fi
    
    log_debug "检查 URL: $auth_url"
    
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 10 --max-time 30 "$auth_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "❌ 无法连接到认证检查端点"
        log_to_file "ERROR" "无法连接到认证检查端点: $auth_url"
        return 1
    fi
    
    case $http_code in
        200)
            local authenticated=$(echo "$body" | grep -o '"authenticated":[^,]*' | cut -d':' -f2 | tr -d ' "')
            local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            if [ "$authenticated" = "true" ]; then
                log_success "✅ Claude CLI 认证成功"
                log_to_file "INFO" "Claude CLI 认证成功"
                return 0
            else
                case $status in
                    "warning")
                        log_warning "⚠️  Claude CLI 已安装但需要认证"
                        log_to_file "WARNING" "Claude CLI 需要认证"
                        return 1
                        ;;
                    "error")
                        log_error "❌ Claude CLI 未安装或配置错误"
                        log_to_file "ERROR" "Claude CLI 配置错误"
                        return 1
                        ;;
                    *)
                        log_warning "⚠️  Claude CLI 认证状态未知"
                        log_to_file "WARNING" "Claude CLI 认证状态未知"
                        return 1
                        ;;
                esac
            fi
            ;;
        404)
            log_error "❌ 认证检查端点未找到 (404)"
            log_to_file "ERROR" "认证检查端点未找到 (404)"
            return 1
            ;;
        500)
            log_error "❌ 认证检查服务器错误 (500)"
            log_to_file "ERROR" "认证检查服务器错误 (500)"
            return 1
            ;;
        *)
            log_error "❌ 认证检查返回 HTTP $http_code"
            log_to_file "ERROR" "认证检查返回 HTTP $http_code"
            return 1
            ;;
    esac
}

# 自动恢复 Railway 服务
recover_railway_service() {
    log_action "开始自动恢复 Railway 服务..."
    
    # 尝试重启服务
    log_recovery "尝试重启 Railway 服务..."
    if railway restart >/dev/null 2>&1; then
        log_success "✅ Railway 服务重启成功"
        log_to_file "INFO" "Railway 服务重启成功"
        
        # 等待服务启动
        log_info "等待服务启动 ($RETRY_DELAY 秒)..."
        sleep "$RETRY_DELAY"
        return 0
    else
        log_error "❌ Railway 服务重启失败"
        log_to_file "ERROR" "Railway 服务重启失败"
        return 1
    fi
}

# 自动重新部署
auto_redeploy() {
    log_action "开始自动重新部署..."
    
    log_recovery "触发重新部署..."
    if railway up >/dev/null 2>&1; then
        log_success "✅ 重新部署成功"
        log_to_file "INFO" "重新部署成功"
        
        # 等待部署完成
        log_info "等待部署完成 (60 秒)..."
        sleep 60
        return 0
    else
        log_error "❌ 重新部署失败"
        log_to_file "ERROR" "重新部署失败"
        return 1
    fi
}

# 修复 Claude CLI 认证
fix_claude_auth() {
    log_action "开始修复 Claude CLI 认证..."
    
    local fix_commands="
        echo '🔧 修复 Claude CLI 认证...'
        echo '检查 CLI 安装...'
        if command -v claude >/dev/null 2>&1; then
            echo '✅ Claude CLI 已安装:' \$(claude --version)
            echo ''
            echo '🔐 尝试重新认证...'
            claude login || echo '认证失败，需要手动操作'
            echo ''
            echo '🔍 验证认证状态...'
            claude auth status || echo '认证状态检查失败'
        else
            echo '❌ Claude CLI 未安装'
            echo '需要检查构建配置'
        fi
    "
    
    log_recovery "在 Railway 环境中修复认证..."
    if railway ssh --command "$fix_commands"; then
        log_success "✅ Claude CLI 认证修复命令执行完成"
        log_to_file "INFO" "Claude CLI 认证修复完成"
        return 0
    else
        log_error "❌ Claude CLI 认证修复失败"
        log_to_file "ERROR" "Claude CLI 认证修复失败"
        return 1
    fi
}

# 发送通知
send_notification() {
    local message=$1
    
    # 这里可以集成各种通知方式
    # 例如: Slack, Discord, Email, Telegram 等
    
    log_info "发送通知: $message"
    log_to_file "NOTIFICATION" "$message"
    
    # 如果配置了 Webhook，可以发送 HTTP 请求
    if [ -n "$WEBHOOK_URL" ]; then
        if command_exists curl; then
            curl -s -X POST "$WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \"$message\"}" >/dev/null 2>&1 || true
        fi
    fi
}

# 健康检查主流程
health_check() {
    local retry_count=0
    local railway_ok=1
    local app_health=1
    local claude_auth=1
    local domain=""
    
    # 检查 Railway CLI
    if check_railway_cli; then
        railway_ok=0
    fi
    
    # 获取项目信息
    if [ "$railway_ok" = "0" ]; then
        local project_info=$(get_project_info)
        eval "$project_info"
    fi
    
    # 检查应用健康状态
    if [ -n "$DOMAIN" ]; then
        if check_application_health "$DOMAIN"; then
            app_health=0
        fi
    fi
    
    # 检查 Claude CLI 认证状态
    if [ -n "$DOMAIN" ]; then
        if check_claude_auth "$DOMAIN"; then
            claude_auth=0
        fi
    fi
    
    # 判断整体健康状态
    local total_issues=$((railway_ok + app_health + claude_auth))
    
    if [ "$total_issues" -eq 0 ]; then
        log_success "🎉 所有系统健康状态正常"
        log_to_file "INFO" "健康检查通过"
        return 0
    else
        log_warning "⚠️  发现 $total_issues 个问题，开始自动恢复..."
        log_to_file "WARNING" "发现 $total_issues 个问题"
        
        # 尝试自动恢复
        while [ $retry_count -lt $MAX_RETRIES ]; do
            retry_count=$((retry_count + 1))
            log_info "尝试恢复 ($retry_count/$MAX_RETRIES)..."
            
            # 恢复应用健康状态
            if [ "$app_health" != "0" ]; then
                if recover_railway_service; then
                    # 重新检查应用健康状态
                    if check_application_health "$DOMAIN"; then
                        app_health=0
                        log_success "✅ 应用健康状态已恢复"
                    else
                        # 如果重启失败，尝试重新部署
                        if auto_redeploy; then
                            if check_application_health "$DOMAIN"; then
                                app_health=0
                                log_success "✅ 应用健康状态已恢复（重新部署）"
                            fi
                        fi
                    fi
                fi
            fi
            
            # 恢复 Claude CLI 认证
            if [ "$claude_auth" != "0" ]; then
                if fix_claude_auth; then
                    sleep 10  # 等待认证生效
                    if check_claude_auth "$DOMAIN"; then
                        claude_auth=0
                        log_success "✅ Claude CLI 认证已恢复"
                    fi
                fi
            fi
            
            # 检查恢复结果
            local remaining_issues=$((railway_ok + app_health + claude_auth))
            if [ "$remaining_issues" -eq 0 ]; then
                log_success "🎉 所有问题已恢复"
                log_to_file "INFO" "所有问题已恢复"
                send_notification "✅ Railway 应用已自动恢复"
                return 0
            fi
            
            if [ $retry_count -lt $MAX_RETRIES ]; then
                log_info "等待 $RETRY_DELAY 秒后重试..."
                sleep "$RETRY_DELAY"
            fi
        done
        
        log_error "❌ 自动恢复失败，需要手动干预"
        log_to_file "ERROR" "自动恢复失败"
        send_notification "❌ Railway 应用自动恢复失败，需要手动检查"
        return 1
    fi
}

# 持续监控模式
monitor_mode() {
    log_info "启动持续监控模式..."
    log_info "健康检查间隔: $HEALTH_CHECK_INTERVAL 秒"
    
    while true; do
        log_info "执行健康检查..."
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[$timestamp] 开始健康检查..."
        
        if health_check; then
            log_success "✅ 健康检查通过"
        else
            log_error "❌ 健康检查失败"
        fi
        
        log_info "下次检查时间: $(date -d "+$HEALTH_CHECK_INTERVAL seconds" '+%Y-%m-%d %H:%M:%S')"
        echo "----------------------------------------"
        
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -c, --check         执行一次性健康检查"
    echo "  -m, --monitor       启动持续监控模式"
    echo "  -d, --debug         启用调试模式"
    echo "  --max-retries N     最大重试次数 (默认: 3)"
    echo "  --retry-delay S     重试延迟秒数 (默认: 30)"
    echo "  --interval S        监控间隔秒数 (默认: 300)"
    echo ""
    echo "示例:"
    echo "  $0 --check          执行一次性健康检查"
    echo "  $0 --monitor        启动持续监控"
    echo "  $0 --max-retries 5 --retry-delay 60  自定义重试参数"
    echo ""
}

# 主函数
main() {
    local mode="check"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--check)
                mode="check"
                shift
                ;;
            -m|--monitor)
                mode="monitor"
                shift
                ;;
            -d|--debug)
                export DEBUG=true
                shift
                ;;
            --max-retries)
                export MAX_RETRIES="$2"
                shift 2
                ;;
            --retry-delay)
                export RETRY_DELAY="$2"
                shift 2
                ;;
            --interval)
                export HEALTH_CHECK_INTERVAL="$2"
                shift 2
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    show_banner
    load_config
    
    case $mode in
        "check")
            log_info "执行一次性健康检查..."
            health_check
            ;;
        "monitor")
            monitor_mode
            ;;
    esac
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || ! grep -q "claude-code-sdk-ts" package.json; then
    log_error "请在 Claude Code SDK 项目根目录运行此脚本"
    exit 1
fi

# 运行主函数
main "$@"