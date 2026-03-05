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
