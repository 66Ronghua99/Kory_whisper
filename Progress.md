# Kory Whisper - 项目进度

## 当前状态：本地 LLM 后处理开发中

### 项目阶段
- **平台**: macOS (主), Windows (待移植)
- **核心功能**: 语音输入 → Whisper 转写 → 系统输入

### 进度

| 模块 | 状态 |
|------|------|
| 核心语音输入 | ✅ 完成 |
| 应用打包 (DMG) | ✅ 完成 |
| Windows 移植 (Phase 1-3) | ✅ 完成 |
| 本地 LLM 后处理 | 🔄 开发中 (llama-server 方案已实现，待测试) |
| 代码签名 | ⬜ 待处理 |

### 文档
- 闭环设计: `.plan/local_llm_postprocess.md`
- 经验记录: `MEMORY.md`
- 下一步: `NEXT_STEP.md`

### 技术栈
- Electron + Node.js
- whisper.cpp + llama.cpp
- sox（音频录制）
- AppleScript（系统输入）
