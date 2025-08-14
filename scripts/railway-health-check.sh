#!/bin/bash

# Railway 部署状态检查脚本
# 用于监控 Claude SDK 在 Railway 上的部署状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
RAILWAY_URL="https://cc-sdk-demo-production.up.railway.app"
HEALTH_CHECK_INTERVAL=30
MAX_CHECKS=20

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

# 显示横幅
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                Railway 部署状态检查                         ║"
    echo "║            监控 Claude SDK 部署和功能状态                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖工具..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，将使用基本文本处理"
        USE_JQ=false
    else
        USE_JQ=true
    fi
    
    log_success "依赖检查完成"
}

# 检查应用健康状态
check_app_health() {
    log_info "检查应用健康状态..."
    
    local health_url="$RAILWAY_URL/api/health"
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 10 --max-time 30 "$health_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "无法连接到应用"
        return 1
    fi
    
    case $http_code in
        200)
            if echo "$body" | grep -q '"status":"ok"'; then
                log_success "✅ 应用健康状态正常"
                return 0
            else
                log_warning "⚠️  应用响应异常"
                return 1
            fi
            ;;
        *)
            log_error "❌ 应用返回 HTTP $http_code"
            return 1
            ;;
    esac
}

# 检查 Claude CLI 认证状态
check_claude_auth() {
    log_info "检查 Claude CLI 认证状态..."
    
    local auth_url="$RAILWAY_URL/api/auth-check"
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 10 --max-time 30 "$auth_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "无法连接到认证检查端点"
        return 1
    fi
    
    case $http_code in
        200)
            if [ "$USE_JQ" = true ]; then
                local authenticated=$(echo "$body" | jq -r '.authenticated')
                local status=$(echo "$body" | jq -r '.status')
            else
                local authenticated=$(echo "$body" | grep -o '"authenticated":[^,]*' | cut -d':' -f2 | tr -d ' "')
                local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            fi
            
            if [ "$authenticated" = "true" ]; then
                log_success "✅ Claude CLI 认证成功"
                return 0
            else
                case $status in
                    "warning")
                        log_warning "⚠️  Claude CLI 已安装但需要认证"
                        return 1
                        ;;
                    "error")
                        log_error "❌ Claude CLI 未安装或配置错误"
                        return 1
                        ;;
                    *)
                        log_warning "⚠️  Claude CLI 认证状态未知"
                        return 1
                        ;;
                esac
            fi
            ;;
        *)
            log_error "❌ 认证检查返回 HTTP $http_code"
            return 1
            ;;
    esac
}

# 检查脚本执行状态
check_script_execution() {
    log_info "检查脚本执行状态..."
    
    local script_url="$RAILWAY_URL/api/script-execution-status"
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" --connect-timeout 10 --max-time 30 "$script_url" 2>/dev/null || echo "")
    local http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ -z "$http_code" ]; then
        log_error "无法连接到脚本执行状态端点"
        return 1
    fi
    
    case $http_code in
        200)
            if [ "$USE_JQ" = true ]; then
                local script_ready=$(echo "$body" | jq -r '.summary.script_ready')
                local executed=$(echo "$body" | jq -r '.summary.executed')
                local execution_success=$(echo "$body" | jq -r '.summary.execution_success')
                local claude_ready=$(echo "$body" | jq -r '.summary.claude_ready')
            else
                local script_ready=$(echo "$body" | grep -o '"script_ready":[^,]*' | cut -d':' -f2 | tr -d ' "')
                local executed=$(echo "$body" | grep -o '"executed":[^,]*' | cut -d':' -f2 | tr -d ' "')
                local execution_success=$(echo "$body" | grep -o '"execution_success":[^,]*' | cut -d':' -f2 | tr -d ' "')
                local claude_ready=$(echo "$body" | grep -o '"claude_ready":[^,]*' | cut -d':' -f2 | tr -d ' "')
            fi
            
            log_info "脚本状态:"
            echo "   - 脚本就绪: $script_ready"
            echo "   - 已执行: $executed"
            echo "   - 执行成功: $execution_success"
            echo "   - Claude 就绪: $claude_ready"
            
            if [ "$script_ready" = "true" ] && [ "$claude_ready" = "true" ]; then
                log_success "✅ 脚本状态正常"
                return 0
            else
                log_warning "⚠️  脚本状态需要关注"
                return 1
            fi
            ;;
        *)
            log_error "❌ 脚本状态检查返回 HTTP $http_code"
            return 1
            ;;
    esac
}

# 测试流式查询功能
test_streaming_query() {
    log_info "测试流式查询功能..."
    
    local streaming_url="$RAILWAY_URL/api/streaming-query"
    local test_prompt="Hello, please respond with a simple greeting."
    
    # 使用 curl 测试流式查询
    local temp_file=$(mktemp)
    
    if timeout 60 curl -s -X POST "$streaming_url" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\":\"$test_prompt\"}" > "$temp_file" 2>/dev/null; then
        
        local response_length=$(wc -c < "$temp_file")
        if [ "$response_length" -gt 0 ]; then
            log_success "✅ 流式查询功能正常 (响应长度: $response_length 字节)"
            rm -f "$temp_file"
            return 0
        else
            log_error "❌ 流式查询响应为空"
            rm -f "$temp_file"
            return 1
        fi
    else
        log_error "❌ 流式查询测试超时或失败"
        rm -f "$temp_file"
        return 1
    fi
}

# 生成状态报告
generate_report() {
    log_info "生成状态报告..."
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="railway-status-report-$(date '+%Y%m%d_%H%M%S').txt"
    
    {
        echo "Railway 部署状态报告"
        echo "======================"
        echo "检查时间: $timestamp"
        echo "部署URL: $RAILWAY_URL"
        echo ""
        
        echo "应用健康状态:"
        check_app_health >/dev/null 2>&1 && echo "✅ 正常" || echo "❌ 异常"
        
        echo ""
        echo "Claude CLI 认证状态:"
        check_claude_auth >/dev/null 2>&1 && echo "✅ 正常" || echo "❌ 异常"
        
        echo ""
        echo "脚本执行状态:"
        check_script_execution >/dev/null 2>&1 && echo "✅ 正常" || echo "❌ 异常"
        
        echo ""
        echo "流式查询功能:"
        test_streaming_query >/dev/null 2>&1 && echo "✅ 正常" || echo "❌ 异常"
        
        echo ""
        echo "建议:"
        echo "1. 定期运行此脚本监控部署状态"
        echo "2. 如果发现异常，检查 Railway 构建日志"
        echo "3. 确保 CLAUDE_API_KEY 环境变量已正确设置"
        echo "4. 必要时手动触发重新部署"
        
    } > "$report_file"
    
    log_success "✅ 状态报告已生成: $report_file"
    echo "   报告内容:"
    cat "$report_file"
}

# 持续监控模式
monitor_mode() {
    log_info "启动持续监控模式..."
    log_info "检查间隔: $HEALTH_CHECK_INTERVAL 秒"
    log_info "最大检查次数: $MAX_CHECKS"
    
    local check_count=0
    local success_count=0
    
    while [ $check_count -lt $MAX_CHECKS ]; do
        check_count=$((check_count + 1))
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        
        echo ""
        echo "[$timestamp] 检查 #$check_count/$MAX_CHECKS"
        echo "----------------------------------------"
        
        local all_passed=true
        
        if ! check_app_health; then
            all_passed=false
        fi
        
        if ! check_claude_auth; then
            all_passed=false
        fi
        
        if ! check_script_execution; then
            all_passed=false
        fi
        
        if ! test_streaming_query; then
            all_passed=false
        fi
        
        if [ "$all_passed" = true ]; then
            success_count=$((success_count + 1))
            log_success "✅ 所有检查通过"
        else
            log_error "❌ 部分检查失败"
        fi
        
        if [ $check_count -lt $MAX_CHECKS ]; then
            log_info "下次检查时间: $(date -d "+$HEALTH_CHECK_INTERVAL seconds" '+%Y-%m-%d %H:%M:%S')"
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
    done
    
    echo ""
    echo "监控完成:"
    echo "   总检查次数: $check_count"
    echo "   成功次数: $success_count"
    echo "   成功率: $((success_count * 100 / check_count))%"
    
    if [ $success_count -eq $check_count ]; then
        log_success "🎉 所有检查均通过！"
    else
        log_warning "⚠️  存在失败检查，建议进一步调查"
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -c, --check         执行一次性检查"
    echo "  -m, --monitor       启动持续监控模式"
    echo "  -r, --report        生成状态报告"
    echo "  --interval S        监控间隔秒数 (默认: 30)"
    echo "  --max-checks N      最大检查次数 (默认: 20)"
    echo ""
    echo "示例:"
    echo "  $0 --check          执行一次性检查"
    echo "  $0 --monitor        启动持续监控"
    echo "  $0 --report         生成状态报告"
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
            -r|--report)
                mode="report"
                shift
                ;;
            --interval)
                HEALTH_CHECK_INTERVAL="$2"
                shift 2
                ;;
            --max-checks)
                MAX_CHECKS="$2"
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
    check_dependencies
    
    case $mode in
        "check")
            log_info "执行一次性检查..."
            check_app_health
            check_claude_auth
            check_script_execution
            test_streaming_query
            ;;
        "monitor")
            monitor_mode
            ;;
        "report")
            generate_report
            ;;
    esac
}

# 运行主函数
main "$@"