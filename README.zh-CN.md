# Kory Whisper

[English README](./README.md)

Kory Whisper 是一个面向 macOS 的本地语音输入工具。你按住快捷键说话，松开后自动转写并输入到当前焦点输入框。

## 当前支持

- 当前稳定支持：macOS
- Windows：开发中（尚未对外发布）
- 推荐安装方式：下载 DMG 安装包
- 当前能力：
  - 本地 Whisper 转写（默认不上传语音内容）
  - 长按快捷键开始录音，松开后自动注入文本
  - 自定义词表
  - 规则式 ASR 后处理
  - 可选提示音

## 下载与安装

### 方式一：DMG 安装（推荐）

1. 从发布页下载 `Kory Whisper` macOS 安装包
2. 双击 `.dmg`
3. 将 `Kory Whisper.app` 拖入「应用程序」
4. 从「应用程序」启动 `Kory Whisper`

说明：

- 当前打包主要面向 Apple Silicon 的 macOS
- 如果提示“来自身份不明开发者”，到“系统设置 -> 隐私与安全性”放行

### 方式二：源码运行（开发者）

```bash
git clone <repository-url>
cd Kory_whisper
npm install
npm start
```

如果你是普通用户，建议优先使用 DMG，降低运行环境差异。

## 首次启动流程

首次启动通常会经历：

1. 菜单栏出现图标
2. 请求麦克风权限
3. 首次真实转写时可能提示下载模型
4. 模型文件写入 `~/.kory-whisper/models/`

## 必须授权

要完整可用“自动输入”流程，需要至少满足以下授权：

- 麦克风
- 辅助功能
- 某些环境下的输入监控（可否用由系统设置决定）

常用路径：

- `系统设置 -> 隐私与安全性 -> 麦克风`
- `系统设置 -> 隐私与安全性 -> 辅助功能`
- `系统设置 -> 隐私与安全性 -> 输入监控`

## 使用方式

1. 启动 `Kory Whisper`
2. 确认菜单栏图标出现
3. 将光标放到可输入区域
4. 长按默认快捷键（约 500ms）
5. 说话
6. 松开按键
7. 等待文本自动输入

默认快捷键：`RIGHT COMMAND`

可选：

- `LEFT COMMAND`
- `RIGHT OPTION`
- `LEFT OPTION`
- `RIGHT CONTROL`
- `LEFT CONTROL`
- `F13`、`F14`、`F15`

## 设置项

- 快捷键与长按时长
- Whisper 模型
- 识别语言
- 输出脚本（简体/繁体）
- ASR 后处理开关
- 词表开关
- 标点优化
- 提示音

## 重要路径

- 配置：`~/.kory-whisper/config.json`
- 词表：`~/.kory-whisper/vocabulary.json`
- 模型：`~/.kory-whisper/models/`
- 调试抓图：`~/.kory-whisper/debug-captures/`

## 模型文件与存储

应用会先检查本地模型文件是否存在且大小符合阈值，否则会触发下载。

| 模型档位 | 文件名            | 约大小    |
| --- | --- | --- |
| base   | `ggml-base.bin`    | 141 MB |
| small  | `ggml-small.bin`   | 466 MB |
| medium | `ggml-medium.bin`  | 769 MB |

模型解析后的最终路径是：

- `~/.kory-whisper/models/<filename>`

该目录为用户级共享目录，不受源码目录变化影响。

## 安装与模型下载排障（最常见问题）

当本机未发现当前模型时，首次会弹出下载框：

1. 下载模型
2. 退出

### 下载失败常见原因

- 网络不通或不稳定
- 企业代理/VPN/防火墙拦截 `huggingface.co`
- 无法写入 `~/.kory-whisper/models/` 目录
- 下载到一半文件损坏（体积明显过小）
- 当前环境未能显示授权/交互窗口

### 排查与恢复步骤

1. 换到可稳定访问外网的网络
2. 在弹窗中重试下载
3. 如果仍失败，清理可能损坏文件后重试：

```bash
rm -f ~/.kory-whisper/models/ggml-base.bin
rm -f ~/.kory-whisper/models/ggml-small.bin
rm -f ~/.kory-whisper/models/ggml-medium.bin
```

4. 仅保留你当前在设置中启用的模型，避免切换模型造成重复判断
5. 若依旧被拦截，按下面“自行安装”流程操作

### 自行安装模型（放哪里、放什么）

支持的模型文件必须放在：

- `~/.kory-whisper/models/`

文件名必须与模型一致：

- base -> `ggml-base.bin`
- small -> `ggml-small.bin`
- medium -> `ggml-medium.bin`

#### 方式 A：从源码仓库拷贝（已有模型时）

```bash
cp <你的仓库路径>/models/ggml-base.bin ~/.kory-whisper/models/
# 或
cp <你的仓库路径>/models/ggml-small.bin ~/.kory-whisper/models/
```

#### 方式 B：使用命令行下载

```bash
mkdir -p ~/.kory-whisper/models
curl -L -o ~/.kory-whisper/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

按你实际配置改成 `ggml-small.bin` 或 `ggml-medium.bin`。

安装后重启应用即可。

可用下面命令快速确认文件存在与大小：

```bash
ls -lh ~/.kory-whisper/models/
```

最低生效阈值：

- `ggml-base.bin` > 100 MB
- `ggml-small.bin` > 300 MB
- `ggml-medium.bin` > 700 MB

若远小于上述阈值，说明下载异常，请重新放置。

### 反馈建议带上这些信息

建议反馈时给出：

- macOS 版本与芯片类型
- 安装来源（DMG / 源码）
- 设置中的模型档位
- 下载错误弹窗完整文案
- `ls -lh ~/.kory-whisper/models/` 输出

## 常见流程问题

- 图标有了但长按无反应
  - 检查辅助功能与输入监控权限是否打开
  - 检查系统快捷键是否冲突
- 可以录音但不自动输入
  - 通常是缺少辅助功能权限
  - 当前窗口不接受模拟输入事件
- 切换模型后仍提示缺模型
  - 确认对应文件是否在 `~/.kory-whisper/models/`
  - 文件名是否和设置匹配

## 推荐配置

```json
{
  "shortcut": {
    "key": "RIGHT COMMAND",
    "longPressDuration": 500
  },
  "whisper": {
    "model": "base",
    "language": "zh",
    "outputScript": "simplified",
    "enablePunctuation": true
  },
  "postProcessing": {
    "enabled": true
  },
  "vocabulary": {
    "enabled": true
  },
  "audioCues": {
    "enabled": true
  }
}
```

## 自定义词表

编辑 `~/.kory-whisper/vocabulary.json`，补充领域词汇和固定误识别映射。

## 开发者说明

常用命令：

```bash
npm run dev
npm run verify
npm run build
```

## 隐私

- 默认本地转写，无需联网上传语音
- 语音转写配置、模型、词表和调试输出保存在当前用户目录

## 许可证

MIT
