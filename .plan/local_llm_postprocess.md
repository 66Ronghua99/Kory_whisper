# 闭环设计：本地 LLM 后处理

## 目标
集成 qwen2.5-0.5b-instruct 本地模型，提升 Whisper 转写准确性

## 架构
- **模式**: llama-server 后台服务（启动一次，常驻内存）
- **模型**: qwen2.5-0.5b-instruct-q3_k_m.gguf (~412MB)
- **内存**: ~300MB（Q4 量化）
- **调用**: HTTP API (localhost:118080)
- **延迟**: ~200-500ms/次

## 约束
- **延迟容忍**: ≤ 1s，超时回退
- **回退条件**:
  1. 服务未启动 → 回退 Whisper 原始结果
  2. 推理超时 1s → 回退 Whisper 原始结果

## 交付物
| 文件 | 描述 |
|------|------|
| `models/postprocess/qwen2.5-0.5b-instruct-q3_k_m.gguf` | GGUF 模型文件 |
| `src/main/local-llm.js` | llama-server HTTP 封装 |
| `src/main/whisper-engine.js` | 集成后处理 |
| `src/main/config-manager.js` | 配置支持 |

## 配置
```json
{
  "whisper": {
    "llm": {
      "enabled": true,
      "provider": "local",
      "local": {
        "modelPath": "./models/qwen2.5-0.5b-instruct-q3_k_m.gguf",
        "timeoutMs": 1000,
        "maxTokens": 240,
        "port": 18080
      }
    }
  }
}
```

---

## 闭环测试标准

### M1: 服务启动 ✅
- [ ] **检查点**: 启动应用后，日志显示 `[LocalLLM] Server ready on port 18080`
- [ ] **验证**: `lsof -i :18080` 能看到 llama-server 进程

### M2: HTTP API 可用 ✅
- [ ] **检查点**: `curl http://localhost:18080/v1/models` 返回模型信息
- [ ] **验证**: 无需手动，服务自动启动

### M3: 推理正常 ✅
- [ ] **检查点**: 语音输入后，日志显示 `[LocalLLM] Processed: ...`
- [ ] **验证**: 输出文本经过 LLM 修正（非原始 Whisper 输出）

### M4: 推理超时回退 ✅
- [ ] **检查点**: 推理超过 1s，日志显示 `[LocalLLM] Timeout, fallback to original`
- [ ] **验证**: 最终输出仍是 Whisper 原始结果

### M5: 服务停止 ✅
- [ ] **检查点**: 退出应用后，`lsof -i :18080` 无结果
- [ ] **验证**: llama-server 进程已终止

---

## 测试命令

```bash
# 1. 检查模型文件
ls -la models/*.gguf

# 2. 启动应用
npm start

# 3. 观察日志（应有）:
# [LocalLLM] Starting llama-server...
# [LocalLLM] Server ready on port 18080

# 4. 检查服务
lsof -i :18080

# 5. 语音测试
# 长按右 Command 说话

# 6. 检查退出
# 退出后 lsof -i :18080 应无结果
```

## 回退流程
```
Whisper 转写 → 本地 LLM HTTP API
    ├── 响应成功 → 输出 LLM 结果
    ├── 超时 1s → 回退 Whisper 结果
    └── 服务未启动 → 回退 Whisper 结果
```
