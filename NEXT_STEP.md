# Next Step

## 测试本地 LLM 后处理（llama-server 方案）

### 测试步骤

1. **启动应用**
   ```bash
   cd /Users/cory/codes/Kory_whisper
   npm start
   ```

2. **观察日志**（应有以下输出）:
   - `[LocalLLM] Starting llama-server...`
   - `[LocalLLM] Server ready on port 8080`

3. **验证服务**
   ```bash
   lsof -i :8080
   # 应看到 llama-server 进程
   ```

4. **语音测试**
   - 长按右 Command 说话
   - 观察输出是否经过 LLM 修正

5. **验证退出**
   - 退出应用后 `lsof -i :8080` 应无结果

---

### 验收标准

| 条件 | 期望结果 |
|------|----------|
| 服务启动 | 日志显示 "Server ready on port 8080" |
| 推理处理 | 日志显示 "Processed: ..." |
| 超时回退 | 超时时输出原始 Whisper 结果 |
| 退出清理 | 退出后服务进程终止 |

---

详细闭环设计: `.plan/local_llm_postprocess.md`
