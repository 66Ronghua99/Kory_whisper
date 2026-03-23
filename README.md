# Kory Whisper

基于 OpenAI Whisper 的 macOS 本地语音输入工具。

## 功能特性

- 🎙️ **本地语音识别** - 使用 Whisper 模型，无需联网
- 🔑 **长按快捷键** - 右 Command (⌘) 长按触发（可自定义）
- 📝 **自定义词表** - 增强专业术语识别准确度
- 🤖 **可选轻量 LLM 后处理** - 联网提升断句/术语稳定性（默认关闭）
- 🖥️ **系统级输入** - 在任何应用中都能使用
- 🔒 **隐私保护** - 语音数据本地处理，不上传

## 系统要求

- macOS 10.15+ (Intel/Apple Silicon)
- 麦克风权限
- 辅助功能权限（用于模拟键盘输入）

## 安装

### 方式1：下载 DMG 安装（推荐）

1. 下载 `Kory Whisper-0.1.0-arm64.dmg`（Apple Silicon）或对应 Intel 版本
2. 双击打开 DMG，将应用拖到 **应用程序** 文件夹
3. 从 **启动台** 或 **应用程序** 文件夹打开

### 方式2：从源码运行

```bash
git clone <repository-url>
cd kory-whisper
npm install
npm start
```

## 首次使用：授予权限

第一次打开应用时，macOS 会要求授予以下权限：

### 1. 麦克风权限
- 系统会弹出提示，点击 **"允许"**

### 2. 辅助功能权限（关键）
1. 打开 **系统设置** → **隐私与安全性** → **辅助功能**
2. 点击左下角 **+** 按钮
3. 在应用程序中找到 **Kory Whisper**，选中并点击 **打开**
4. 确保 Kory Whisper 右侧的开关为 **开启** 状态

> ⚠️ **注意**：如果没有授予辅助功能权限，应用无法模拟键盘输入。

## 使用方法

1. 启动应用后，会在菜单栏显示图标
2. **长按右 Command (⌘)** 约 500ms 开始录音
3. 对着麦克风说话
4. 松开按键，等待识别结果自动输入

**可用快捷键**（在设置中可更改）：
- 右 Command ⌘ (默认)
- 左 Command ⌘
- 右 Option ⌥
- 左 Option ⌥
- 右 Control ⌃
- F13, F14, F15（如有）

## 配置

配置文件位于 `~/.kory-whisper/config.json`。
Whisper 模型会统一缓存在 `~/.kory-whisper/models/`，不同 worktree、源码路径和打包 app 会共享同一份模型文件：

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
    "enablePunctuation": true,
    "llm": {
      "enabled": false,
      "model": "gpt-4o-mini",
      "apiKey": "",
      "timeoutMs": 1200,
      "minChars": 18,
      "maxChars": 180
    }
  },
  "vocabulary": {
    "enabled": true
  }
}
```

可选快捷键值：`RIGHT COMMAND`, `LEFT COMMAND`, `RIGHT OPTION`, `LEFT OPTION`, `RIGHT CTRL`, `LEFT CTRL`, `F13`, `F14`, `F15`
可选模型值：`base`（默认）或 `small`（更准，稍慢）

### 可选轻量 LLM（速度权衡）

- 默认关闭，仅在文本长度落在阈值内才触发（`minChars ~ maxChars`）。
- 超时会自动回退本地规则结果，不阻塞输入。
- 可通过设置页填写 API Key（本地保存），或设置环境变量：

```bash
export KORY_LLM_API_KEY="your_api_key"
```

- 速度优先建议：`timeoutMs <= 1000`, `minChars >= 24`。
- 质量优先建议：`timeoutMs 1200~1800`，并继续维护 `vocabulary.replacements`。
- Finder 启动时若环境变量未生效，优先在设置页填写 API Key。

## 自定义词表

编辑 `~/.kory-whisper/vocabulary.json`：

```json
{
  "words": [
    "Claude",
    "OpenAI",
    "Anthropic",
    "TypeScript",
    "Kubernetes",
    "..."
  ],
  "replacements": {
    "JMI": "Gemini",
    "mini max": "MiniMax"
  }
}
```

`words` 会作为识别提示词；`replacements` 会在识别后做文本纠正，适合修正专有词误识别。

## 开发

```bash
# 开发模式
npm run dev

# 打包
npm run build
```

## 许可证

MIT License
