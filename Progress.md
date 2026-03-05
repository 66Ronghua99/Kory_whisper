# Kory Whisper - 项目进度

## 当前迭代目标
开发基于 whisper.cpp 的 macOS 语音输入应用

## 已完成 (DONE)
- [x] 技术方案规划
- [x] 用户偏好确认 (右⌘长按、JSON词表、AppleScript、Menubar)
- [x] 快捷键修改: F13 → 右 Command (所有Mac都支持)
- [x] 项目初始化和依赖安装
- [x] whisper.cpp 编译与准备
- [x] Whisper base 模型下载 (141MB)
- [x] 核心模块实现
  - [x] 主进程入口 (index.js)
  - [x] 配置管理器 (config-manager.js)
  - [x] 全局快捷键管理 (shortcut-manager.js)
  - [x] 音频录制 (audio-recorder.js)
  - [x] Whisper 推理引擎 (whisper-engine.js)
  - [x] AppleScript 输入模拟 (input-simulator.js)
  - [x] 菜单栏管理 (tray-manager.js)
  - [x] 设置界面 (settings.html)
- [x] 依赖安装 (sox)

## 已完成 (DONE)
- [x] 应用打包
  - [x] DMG 安装包生成 (217MB，包含模型)
  - [x] 自动模型下载功能
  - [x] 打包配置优化 (extraResources)
- [x] 修复 whisper-cli 动态库依赖问题
  - [x] 从源码编译静态链接的 whisper-cli
  - [x] 创建应用图标 (iconTemplate.png)
  - [x] 测试语音识别功能正常

## 进行中 (IN PROGRESS)
- [x] 测试完整流程
  - [x] 修复键盘卡死问题 (延迟初始化 + 不阻止事件传播)
  - [x] 测试快捷键触发录音 (成功)
  - [x] 测试语音识别结果输入 (成功)
  - [x] 修复录音文件格式问题 (sox 替换 node-record-lpcm16)
  - [x] 修复 Finder 启动权限提示与快捷键监听初始化 (await + 权限引导)
  - [x] 修复 Finder 启动时 rec 命令路径问题 (PATH 补全 + 绝对路径探测)
  - [x] 增加菜单栏录音状态可视反馈 (●/…/✓/!)
  - [x] 增加简体中文输出转换（OpenCC + 设置项）
  - [x] 增加词表后处理纠错（replacements）与轻量断句优化
  - [x] 支持模型切换（base/small）与按配置自动下载
  - [x] 增加可选轻量 LLM 后处理（默认关闭，超时自动回退）
  - [ ] 测试权限请求流程

## 待办 (TODO)
- [ ] 代码签名 (Apple Developer ID)
- [ ] 发布到 GitHub Releases

## 待办 (TODO)
- [ ] 创建应用图标
- [ ] 代码签名 (Apple Developer ID)
- [ ] 发布到 GitHub Releases

## 技术栈
- Electron + Node.js
- whisper.cpp (本地推理)
- node-global-key-listener (全局快捷键)
- AppleScript (系统输入)

## 关键文件路径
- 配置: `~/.kory-whisper/config.json`
- 词表: `~/.kory-whisper/vocabulary.json`
- 模型: `./models/ggml-{base|small}.bin`
