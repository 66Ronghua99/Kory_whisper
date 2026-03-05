# Kory Whisper - 经验记录

## 开发环境
- macOS (Apple Silicon)
- Node.js 18+
- Python 3.9+ (用于 whisper.cpp 编译)
- sox (音频录制依赖) - `brew install sox`

## 已知问题与解决方案

### 快捷键选择
2024-03-04: 默认快捷键从 F13 改为 **右 Command (RIGHT COMMAND)**
- 原因: MacBook 没有 F13 键
- 可用选项: RIGHT COMMAND, LEFT COMMAND, RIGHT OPTION, LEFT OPTION, RIGHT CTRL, F13-F15
- node-global-key-listener 使用的键名需要大写

### 权限问题
macOS 需要以下权限：
1. 辅助功能 (Accessibility) - 用于模拟键盘输入
2. 麦克风 - 用于录制音频
3. 屏幕录制 (可选) - 用于获取光标位置

### whisper.cpp 集成方式
有两种方式：
1. 直接编译 whisper.cpp 得到二进制文件
2. 使用 node.js 绑定 (如 whisper-node)

推荐方式1：直接调用二进制更稳定

## 最佳实践
- 音频采样率必须是 16kHz (Whisper 要求)
- 使用 AppleScript 输入时注意转义特殊字符
- 模型文件较大，考虑从 GitHub Release 下载而非打包进应用

### 2024-03-04 whisper-cli 动态库问题修复
**问题**: bin/whisper-cli 运行时提示缺少 libwhisper.1.dylib 等动态库
**原因**: 原二进制文件是在其他机器编译的，硬编码了 rpath `/tmp/whisper.cpp/build/src/`
**解决方案**:
1. 从 GitHub 下载 whisper.cpp 源码 (v1.7.4)
2. 使用 cmake 编译静态链接版本:
   ```bash
   cmake -B build -DGGML_METAL=ON -DBUILD_SHARED_LIBS=OFF
   cmake --build build -j$(sysctl -n hw.ncpu)
   ```
3. 复制 `build/bin/whisper-cli` 到项目目录
**注意事项**: 必须使用 `-DBUILD_SHARED_LIBS=OFF` 确保静态链接，避免依赖问题

### 2024-03-04 模型路径问题修复
**问题**: 应用反复提示下载模型，即使模型文件已存在
**原因**: `ModelDownloader` 使用源码路径 `../../models`，但打包后模型在 `process.resourcesPath/models/`
**解决方案**:
1. 在 `index.js` 中添加 `getModelsDir()` 方法统一处理路径
2. 延迟初始化 `ModelDownloader`，传入正确的 `modelsDir`
3. 开发环境: `./models/`，打包后: `process.resourcesPath/models/`

### 2024-03-05 录音文件格式问题修复
**问题**: Whisper 识别卡死，显示音频时长 67108 秒（实际 3 秒）
**原因**: `node-record-lpcm16` 库生成的 WAV 文件头错误，文件大小字段显示 2GB
**解决方案**:
1. 用 `sox` (rec 命令) 替换 `node-record-lpcm16`
2. 使用 `spawn` 启动 sox 进程录制
3. `rec -r 16000 -c 1 -b 16 -e signed-integer output.wav`
**验证**: 录音 2.6 秒，识别耗时 284ms，结果正确

### 2026-03-05 Finder 双击启动后无法触发快捷键
**问题**: 终端运行 `.app/Contents/MacOS/Kory Whisper` 可监听按键，但 Finder 双击后无法触发长按录音。

**根因**:
1. 权限链路不完整：只检查了辅助功能，未明确引导输入监控（Input Monitoring），且未触发系统原生授权弹窗。
2. 监听初始化存在“假成功”：`node-global-key-listener.addListener()` 是异步的，之前未 `await`，初始化日志可能显示成功但监听器实际未启动。
3. Finder 启动环境变量更精简，`PATH` 可能不包含 Homebrew 路径；`spawn('rec')` 会因找不到 sox 的 `rec` 可执行文件而失败。

**修复方案**:
1. 将快捷键初始化改为 `async` 并 `await addListener()`，失败时向上抛错。
2. 为 MacKeyServer 增加 `onError/onInfo` 日志，定位子进程失败原因。
3. 启动时调用 `isTrustedAccessibilityClient(true)` 触发系统授权提示，并在 UI 中同时引导“辅助功能 + 输入监控”。
4. 权限检查完成后再初始化快捷键，降低竞态问题。
5. 录音模块增加 `rec` 路径自动探测（`/opt/homebrew/bin/rec` 等），并将录音启动失败写入日志与托盘错误提示。

**补充建议**:
- 正式发布前完成 Developer ID 签名与公证，避免每次重打包导致 TCC 记录不稳定。

### 2026-03-05 长按后无顶部可见提示（但可输入）
**现象**: 长按快捷键后，日志有 `Long press started`，最终可输入文本，但菜单栏没有明显“正在监听/录音”提示。

**原因**:
1. 应用此前依赖系统级麦克风/权限提示，这类提示不是每次长按都会出现。
2. Tray 只更新了 tooltip 和菜单项状态，未设置菜单栏标题指示。

**解决方案**:
1. 在 `TrayManager` 增加统一状态视觉函数 `applyStateVisuals()`。
2. 根据状态设置菜单栏标题：`recording=●`、`processing=…`、`success=✓`、`error=!`、`idle=空`。
3. 在 `setRecordingState/showProcessingState/showSuccessState/showErrorState` 中统一调用，确保状态切换可见且一致。
