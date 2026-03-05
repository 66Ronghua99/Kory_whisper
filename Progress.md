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
- [x] 应用打包 (DMG)
- [x] 测试完整流程

## 待办 (TODO)
- [ ] 代码签名 (Apple Developer ID)
- [ ] 发布到 GitHub Releases

---

# Windows 移植计划

## 阶段总览

| 阶段 | 名称 | 交付物 | 状态 |
|------|------|--------|------|
| Phase 1 | 平台抽象层 | `src/main/platform/` 目录 | ✅ |
| Phase 2 | 音频录制改造 | `audio-win32.js` | ✅ |
| Phase 3 | 输入模拟改造 | `input-win32.js` | ✅ |
| Phase 4 | Whisper Windows 二进制 | `bin/whisper-cli.exe` | ⬜ |
| Phase 5 | electron-builder 配置 | `package.json` | ⬜ |
| Phase 6 | 主进程适配 | `index.js` | ⬜ |
| Phase 7 | 回归测试 (Mac) | 验证通过 | ⬜ |
| Phase 8 | Windows 构建 | `.exe` 安装包 | ⬜ |

## 已确认决策
- **ffmpeg 策略**: 打包进安装包 (~150MB)
- **Windows UI**: 系统托盘
- **快捷键默认**: 右 Alt (RightAlt)

---

## 当前执行任务

### Phase 1: 平台抽象层 ✅

**目标**: 创建跨平台模块抽象

**详细文档**: [./.plan/phase1_platform_abstraction.md](./.plan/phase1_platform_abstraction.md)

**交付物**:
```
src/main/platform/
├── index.js           # 平台检测与工厂函数
├── audio-darwin.js   # macOS sox 录制
├── audio-win32.js    # Windows ffmpeg 录制
├── input-darwin.js   # macOS 输入模拟
└── input-win32.js    # Windows 输入模拟
```

**验证命令**:
```bash
node -e "require('./src/main/platform')"
```

---

### Phase 2: 音频录制改造

**目标**: 使主进程使用平台抽象层

**详细文档**: [./.plan/phase2_audio_recorder.md](./.plan/phase2_audio_recorder.md)

**交付物**:
- 修改 `src/main/index.js` 使用 `platform.getAudioRecorder()`
- 修改 `src/main/index.js` 使用 `platform.getInputSimulator()`

---

## 技术栈
- Electron + Node.js
- whisper.cpp (本地推理)
- node-global-key-listener (全局快捷键)
- AppleScript (系统输入)

## 关键文件路径
- 配置: `~/.kory-whisper/config.json`
- 词表: `~/.kory-whisper/vocabulary.json`
- 模型: `./models/ggml-{base|small}.bin`
