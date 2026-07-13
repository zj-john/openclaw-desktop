#!/bin/bash

# Windows 构建脚本
# 检测当前系统是否为 Windows，如果不是则提示用户

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    # 在 Windows 上构建
    npm run prepare:openclaw-bundle && tauri build --target x86_64-pc-windows-msvc
else
    echo "❌ 错误：Windows 构建只能在 Windows 系统上执行"
    echo ""
    echo "当前系统检测到: $OSTYPE"
    echo ""
    echo "可选方案："
    echo "  1. 在 Windows 机器上运行此脚本"
    echo "  2. 使用 GitHub Actions 进行 Windows 构建（推荐）"
    echo "     工作流: .github/workflows/release.yml"
    echo "  3. 使用虚拟机（如 VMware, Parallels）安装 Windows 进行构建"
    echo ""
    echo "注意事项："
    echo "  - macOS 上的 Windows 交叉编译需要安装 LLVM + cargo-xwin + Windows SDK"
    echo "  - 这是一个复杂且容易出错的过程，不推荐在开发机器上配置"
    echo "  - 推荐使用 CI/CD 或 Windows 环境进行构建"
    echo ""
    echo "如需查看本地构建脚本，请使用以下命令："
    echo "  npm run build:mac          # 构建 macOS 通用版本"
    echo "  npm run build:mac-intel    # 构建 Intel macOS 版本"
    echo "  npm run build:mac-arm      # 构建 Apple Silicon macOS 版本"
    exit 1
fi