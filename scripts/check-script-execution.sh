#!/bin/bash

# 脚本执行状态检查工具
# 用于检查和展示 Claude Code 生产脚本的执行结果

set -e

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
    echo "║               Claude Code 生产脚本执行状态                  ║"
    echo "║                自动化部署执行结果跟踪                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 检查脚本文件是否存在
check_script_file() {
    local script_path="./claude_code_prod.sh"
    
    if [ -f "$script_path" ]; then
        log_success "✅ 脚本文件存在: $script_path"
        
        # 检查文件权限
        if [ -x "$script_path" ]; then
            log_success "✅ 脚本文件有执行权限"
        else
            log_warning "⚠️  脚本文件没有执行权限"
            return 1
        fi
        
        # 显示文件信息
        log_info "📋 文件信息:"
        echo "   大小: $(du -h "$script_path" | cut -f1)"
        echo "   修改时间: $(stat -f "%Sm" "$script_path" 2>/dev/null || stat -c "%y" "$script_path" 2>/dev/null)"
        echo "   权限: $(ls -la "$script_path" | awk '{print $1}')"
        
        return 0
    else
        log_error "❌ 脚本文件不存在: $script_path"
        return 1
    fi
}

# 检查执行日志
check_execution_log() {
    local log_file="/tmp/claude_code_prod_execution.log"
    
    if [ -f "$log_file" ]; then
        log_success "✅ 执行日志存在: $log_file"
        
        # 分析日志内容
        log_info "📊 日志分析:"
        
        # 获取执行开始和结束时间
        local start_time=$(head -1 "$log_file" | cut -d'[' -f2 | cut -d']' -f1)
        local end_time=$(tail -1 "$log_file" | cut -d'[' -f2 | cut -d']' -f1)
        
        echo "   开始时间: $start_time"
        echo "   结束时间: $end_time"
        
        # 检查执行结果
        if grep -q "执行成功" "$log_file"; then
            log_success "✅ 脚本执行成功"
        elif grep -q "执行失败" "$log_file"; then
            log_error "❌ 脚本执行失败"
        else
            log_warning "⚠️  执行状态不明确"
        fi
        
        # 检查关键操作
        echo ""
        log_info "🔍 关键操作检查:"
        
        if grep -i "claude" "$log_file" > /dev/null; then
            echo "   📝 发现 Claude 相关操作"
        fi
        
        if grep -i "auth\|login" "$log_file" > /dev/null; then
            echo "   🔐 发现认证相关操作"
        fi
        
        if grep -i "error\|failed" "$log_file" > /dev/null; then
            echo "   ❌ 发现错误信息"
        fi
        
        return 0
    else
        log_warning "⚠️  执行日志不存在: $log_file"
        echo "💡 脚本可能尚未执行"
        return 1
    fi
}

# 显示完整日志
show_full_log() {
    local log_file="/tmp/claude_code_prod_execution.log"
    
    if [ -f "$log_file" ]; then
        echo ""
        echo "📄 完整执行日志:"
        echo "================================"
        cat "$log_file"
        echo "================================"
    else
        log_warning "⚠️  日志文件不存在"
    fi
}

# 显示脚本内容预览
show_script_preview() {
    local script_path="./claude_code_prod.sh"
    
    if [ -f "$script_path" ]; then
        echo ""
        echo "📜 脚本内容预览 (前20行):"
        echo "================================"
        head -20 "$script_path"
        echo "================================"
        
        # 显示脚本基本信息
        echo ""
        log_info "🔍 脚本分析:"
        
        # 检查脚本类型
        if head -1 "$script_path" | grep -q "bash"; then
            echo "   类型: Bash 脚本"
        elif head -1 "$script_path" | grep -q "sh"; then
            echo "   类型: Shell 脚本"
        else
            echo "   类型: 未知"
        fi
        
        # 统计行数
        local line_count=$(wc -l < "$script_path")
        echo "   总行数: $line_count"
        
        # 检查关键命令
        if grep -q "curl\|wget" "$script_path"; then
            echo "   🌐 包含网络下载命令"
        fi
        
        if grep -q "npm\|node" "$script_path"; then
            echo "   📦 包含 Node.js 相关命令"
        fi
        
        if grep -q "claude" "$script_path"; then
            echo "   🤖 包含 Claude 相关命令"
        fi
    fi
}

# 生成状态报告
generate_status_report() {
    echo ""
    echo "📋 状态报告"
    echo "=========="
    echo ""
    
    # 脚本文件状态
    if [ -f "./claude_code_prod.sh" ]; then
        echo "📄 脚本文件: ✅ 存在"
        if [ -x "./claude_code_prod.sh" ]; then
            echo "🔐 执行权限: ✅ 已设置"
        else
            echo "🔐 执行权限: ❌ 未设置"
        fi
    else
        echo "📄 脚本文件: ❌ 不存在"
    fi
    
    # 执行日志状态
    if [ -f "/tmp/claude_code_prod_execution.log" ]; then
        echo "📊 执行日志: ✅ 存在"
        
        if grep -q "执行成功" "/tmp/claude_code_prod_execution.log"; then
            echo "✅ 执行结果: 成功"
        elif grep -q "执行失败" "/tmp/claude_code_prod_execution.log"; then
            echo "❌ 执行结果: 失败"
        else
            echo "⚠️  执行结果: 未知"
        fi
    else
        echo "📊 执行日志: ❌ 不存在"
    fi
    
    # Claude CLI 状态
    if command -v claude >/dev/null 2>&1; then
        echo "🤖 Claude CLI: ✅ 已安装"
        local version=$(claude --version 2>/dev/null || echo "未知版本")
        echo "   版本: $version"
        
        if claude auth status >/dev/null 2>&1; then
            echo "🔐 认证状态: ✅ 已认证"
        else
            echo "🔐 认证状态: ❌ 未认证"
        fi
    else
        echo "🤖 Claude CLI: ❌ 未安装"
    fi
    
    echo ""
}

# 主函数
main() {
    show_banner
    
    log_info "开始检查 Claude Code 生产脚本执行状态..."
    echo ""
    
    # 检查脚本文件
    check_script_file
    echo ""
    
    # 检查执行日志
    check_execution_log
    echo ""
    
    # 显示脚本预览
    show_script_preview
    echo ""
    
    # 生成状态报告
    generate_status_report
    
    # 询问是否显示完整日志
    if [ -f "/tmp/claude_code_prod_execution.log" ]; then
        echo ""
        read -p "是否查看完整执行日志? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            show_full_log
        fi
    fi
    
    log_success "✅ 状态检查完成"
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || ! grep -q "claude-code-sdk-ts" package.json; then
    log_error "请在 Claude Code SDK 项目根目录运行此脚本"
    exit 1
fi

# 运行主函数
main "$@"