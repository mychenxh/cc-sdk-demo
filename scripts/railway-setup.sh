#!/bin/bash

# Railway Claude CLI 自动化设置脚本
# 用于自动配置 Railway 环境和 Claude CLI 认证

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 显示横幅
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    Railway Claude CLI Setup                   ║"
    echo "║                    自动化设置和认证脚本                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查和安装 Railway CLI
install_railway_cli() {
    log_info "检查 Railway CLI 安装状态..."
    
    if command_exists railway; then
        local version=$(railway --version 2>/dev/null || echo "unknown")
        log_success "Railway CLI 已安装: $version"
        return 0
    fi
    
    log_warning "Railway CLI 未安装，开始安装..."
    
    # 尝试不同的安装方法
    if command_exists npm; then
        log_info "使用 npm 安装 Railway CLI..."
        npm install -g @railway/cli
    elif command_exists brew; then
        log_info "使用 Homebrew 安装 Railway CLI..."
        brew install railway
    else
        log_error "未找到 npm 或 brew，请手动安装 Railway CLI"
        log_info "安装命令: npm install -g @railway/cli"
        exit 1
    fi
    
    # 验证安装
    if command_exists railway; then
        local version=$(railway --version)
        log_success "Railway CLI 安装成功: $version"
    else
        log_error "Railway CLI 安装失败"
        exit 1
    fi
}

# Railway 登录
railway_login() {
    log_info "检查 Railway 登录状态..."
    
    if railway whoami >/dev/null 2>&1; then
        local user=$(railway whoami)
        log_success "已登录到 Railway: $user"
        return 0
    fi
    
    log_warning "未登录到 Railway，开始登录流程..."
    log_info "请在浏览器中完成 Railway 登录"
    
    railway login
    
    # 验证登录
    if railway whoami >/dev/null 2>&1; then
        local user=$(railway whoami)
        log_success "Railway 登录成功: $user"
    else
        log_error "Railway 登录失败"
        exit 1
    fi
}

# 连接到项目
connect_project() {
    log_info "检查项目连接状态..."
    
    # 检查是否已连接项目
    if [ -f ".railway/project.json" ] || railway status >/dev/null 2>&1; then
        log_success "已连接到 Railway 项目"
        return 0
    fi
    
    log_info "连接到 Railway 项目..."
    
    # 尝试自动连接
    if railway link >/dev/null 2>&1; then
        log_success "项目连接成功"
    else
        log_warning "自动连接失败，请手动选择项目"
        railway link
    fi
}

# 显示项目信息
show_project_info() {
    log_info "项目信息:"
    railway status
    echo ""
    
    log_info "项目域名:"
    railway domains
    echo ""
}

# 主函数
main() {
    show_banner
    
    log_info "开始 Railway 环境设置..."
    echo ""
    
    # 执行设置步骤
    install_railway_cli
    echo ""
    
    railway_login
    echo ""
    
    connect_project
    echo ""
    
    show_project_info
    echo ""
    
    log_success "Railway 环境设置完成！"
    echo ""
    log_info "下一步: 运行 ./scripts/claude-auth.sh 完成 Claude CLI 认证"
}

# 检查是否在正确的目录
if [ ! -f "package.json" ] || ! grep -q "claude-code-sdk-ts" package.json; then
    log_error "请在 Claude Code SDK 项目根目录运行此脚本"
    exit 1
fi

# 运行主函数
main "$@"