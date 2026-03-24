# Kory Whisper

[English README](./README.en.md)

Kory Whisper 是一个面向 macOS 的本地语音输入工具。你按住快捷键说话，应用会录音、用本地 Whisper 模型转写，然后把文字自动输入到当前光标所在的位置。

这份 README 以“用户下载下来就能用”为目标编写，优先说明安装、授权、首次启动和日常使用方法。

## 当前支持

- 当前稳定支持：macOS
- 当前推荐安装方式：下载 DMG 安装包
- 当前主要能力：
  - 本地 Whisper 转写，不上传语音
  - 长按快捷键开始录音，松开后自动输入
  - 自定义词表
  - 规则式 ASR 后处理
  - 可选提示音

## 下载与安装

### 方式一：下载 DMG 安装包

1. 下载发布页中的 `Kory Whisper` macOS 安装包
2. 双击打开 `.dmg`
3. 将 `Kory Whisper.app` 拖到“应用程序”
4. 从“应用程序”中启动 `Kory Whisper`

提示：

- 当前打包配置优先面向 Apple Silicon macOS
- 如果系统提示应用来源未验证，请在“系统设置 -> 隐私与安全性”中允许打开

### 方式二：从源码运行

适合开发者或需要自己调试的人：

```bash
git clone <repository-url>
cd Kory_whisper
npm install
npm start
```

## 第一次启动会发生什么

第一次启动时，应用通常会经历下面几个步骤：

1. 菜单栏出现 Kory Whisper 图标
2. 应用请求麦克风权限
3. 你第一次真正开始转写时，如果本机还没有对应 Whisper 模型，应用会提示下载模型
4. 下载完成后，模型会缓存在 `~/.kory-whisper/models/`

模型缓存说明：

- Whisper 模型会保存在 `~/.kory-whisper/models/`
- 同一台机器上的不同源码目录、不同 worktree、以及打包后的 app，会共用这份模型缓存

## 必须授予的权限

要让“说完之后自动输入到当前应用”正常工作，至少要完成下面两类授权。

### 1. 麦克风权限

- 第一次使用时点击“允许”
- 如果之前点过拒绝：
  - 打开“系统设置”
  - 进入“隐私与安全性 -> 麦克风”
  - 打开 `Kory Whisper` 的开关

### 2. 辅助功能权限

这是自动输入文字所必需的权限。

操作路径：

1. 打开“系统设置”
2. 进入“隐私与安全性 -> 辅助功能”
3. 把 `Kory Whisper` 加进去并启用

如果没有这个权限，应用可能可以录音和转写，但不能把文字输入到当前窗口。

### 3. 输入监控

某些 macOS 环境下，快捷键监听还可能依赖“输入监控”授权。

如果你发现：

- 菜单栏图标已经出现
- 但长按快捷键没有任何反应

请检查：

1. “系统设置”
2. “隐私与安全性 -> 输入监控”
3. 确认 `Kory Whisper` 已启用

## 最快上手

完成安装和授权后，按下面的方式使用：

1. 启动 `Kory Whisper`
2. 确认菜单栏出现图标
3. 把光标放到任意可输入文本的位置
4. 长按快捷键约 0.5 秒
5. 开始说话
6. 松开快捷键
7. 等待识别结果自动输入

默认快捷键是：

- 右 Command（`RIGHT COMMAND`）

设置页里也可以改成：

- 左 Command
- 右 Option
- 左 Option
- 右 Control
- 左 Control
- F13 / F14 / F15

## 设置页能做什么

设置页目前主要提供以下选项：

- 快捷键和长按时长
- Whisper 模型
- 识别语言
- 中文输出模式
- 是否启用 ASR 后处理
- 是否启用词表
- 是否启用标点优化
- 是否启用提示音

其中：

- `ASR 后处理` 是默认主路径的一部分，用来做规则式清洗
- 它不是旧版本里那种“可选 LLM 联网后处理”
- 旧的 `whisper.llm` 历史配置会被保留，但当前默认界面不会暴露这组配置

## 配置文件位置

主配置文件：

- `~/.kory-whisper/config.json`

词表文件：

- `~/.kory-whisper/vocabulary.json`

模型目录：

- `~/.kory-whisper/models/`

调试转写抓取目录：

- `~/.kory-whisper/debug-captures/`

## 推荐配置

如果你只是想尽快开始使用，可以先保持默认：

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

补充建议：

- 想更快启动和更低占用：用 `base`
- 想提升准确率：换 `small`
- 中文用户通常保持 `outputScript = simplified`
- 如果你常说专业术语，优先维护词表，而不是先改别的设置

## 自定义词表

编辑 `~/.kory-whisper/vocabulary.json`：

```json
{
  "words": [
    "OpenAI",
    "Anthropic",
    "TypeScript",
    "Kubernetes"
  ],
  "replacements": {
    "JMI": "Gemini",
    "mini max": "MiniMax"
  }
}
```

使用建议：

- `words`：作为识别提示词，适合品牌名、术语名、人名
- `replacements`：适合修正固定误识别

例如：

- Whisper 经常把 `Gemini` 识别成 `JMI`
- 就可以在 `replacements` 里写 `"JMI": "Gemini"`

## 常见问题

### 1. 应用启动了，但长按快捷键没有反应

通常检查这几项：

- 是否已授予“辅助功能”
- 是否已授予“输入监控”
- 当前快捷键是否和系统快捷键冲突

### 2. 可以录音，但没有自动输入到当前应用

通常是：

- 没有授予“辅助功能”
- 当前焦点窗口不接受模拟输入

### 3. 第一次转写时提示下载模型

这是正常行为。

- 模型首次下载后会缓存在 `~/.kory-whisper/models/`
- 以后同机复用，不需要重复下载

### 4. 识别结果术语不准

优先做这两件事：

- 在 `vocabulary.json` 里补 `words`
- 对固定误识别补 `replacements`

### 5. 下载源码后运行不起来

请确认：

```bash
npm install
npm start
```

如果你是普通用户，建议优先使用 DMG 安装包，而不是源码运行。

## 隐私说明

- 语音转写主路径使用本地 Whisper
- 语音文件不会默认上传到远端服务
- Whisper 模型、配置、词表和调试输出都保存在本机用户目录下

## 开发者说明

常用命令：

```bash
# 开发模式
npm run dev

# 测试 + 覆盖率 + 仓库硬门禁
npm run verify

# 构建
npm run build
```

当前仓库的主流程已经拆分为：

- `src/main/app/`
- `src/main/runtime/`
- `src/main/services/`
- `src/main/platform/`
- `src/main/post-processing/`

如果你是来改代码的，优先看仓库根目录的 `AGENTS.md`、`PROGRESS.md`、`NEXT_STEP.md`。

## 许可证

MIT
