# Phase 4: Whisper Windows 二进制

## 目标
获取 Windows 可执行的 whisper-cli。

## 交付物
新增: `bin/whisper-cli.exe`

## 实现步骤

### 1. 下载预编译版本

```bash
# 创建 bin 目录
mkdir -p bin

# 下载 whisper.cpp Windows BLAS 版本 (16.5MB, 带加速)
gh release download v1.8.3 -p "whisper-blas-bin-x64.zip" -D /tmp/whisper-win

# 解压
unzip /tmp/whisper-win/whisper-blas-bin-x64.zip -d bin/

# 查看解压内容
ls -la bin/
```

### 2. 重命名文件

```bash
# 查找可执行文件
ls bin/*

# 重命名为统一名称
mv bin/whisper-blas.exe bin/whisper-cli.exe
```

### 3. 验证运行

```bash
# 测试 --help 是否正常 (Windows)
./bin/whisper-cli.exe --help
```

## Whisper.cpp Release 信息

| 文件名 | 大小 | 说明 |
|--------|------|------|
| whisper-bin-x64.zip | 3.9 MB | 基础版本，无加速 |
| whisper-blas-bin-x64.zip | 16.5 MB | BLAS 加速版本（推荐） |

**下载链接**: https://github.com/ggml-org/whisper.cpp/releases/tag/v1.8.3

## 验证标准

- [ ] `bin/whisper-cli.exe` 存在
- [ ] Windows 上运行 `bin/whisper-cli.exe --help` 无报错

## 验证命令

```bash
# 检查文件存在
ls -la bin/whisper-cli.exe

# Windows 测试 (PowerShell)
.\bin\whisper-cli.exe --help
```

## 依赖前置
- 无

## 后续阶段
- Phase 5: electron-builder 配置
