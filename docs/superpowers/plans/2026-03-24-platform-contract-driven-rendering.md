---
doc_type: plan
status: draft
implements:
  - docs/superpowers/specs/2026-03-24-platform-permission-ui-contract-design.md
verified_by: []
supersedes: []
related: []
---

# 平台契约驱动的权限契约注入与渲染方案

**For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec Path:** `docs/superpowers/specs/2026-03-24-platform-permission-ui-contract-design.md`

**Goal:** 去耦主进程权限/托盘/渲染层中的 macOS 内容，通过平台 profile 提供 `uiContract`，实现 renderer 与 tray 的数据驱动渲染，并将 whisper 二进制路径注入移出平台分支逻辑。

**Allowed Write Scope:** `src/main/platform/`, `src/main/services/`, `src/main/app/`, `src/main/tray-manager.js`, `src/renderer/permission-onboarding.html`, `docs/superpowers/plans/`, `docs/superpowers/specs/`

**Verification Commands:** `npm run lint`, `npm test`

**Evidence Location:** `artifacts/platform-contract-driven-rendering/`

**Rule:** 不扩展当前 scope。新的变更请求需通过 `CHANGE_REQUEST_TEMPLATE.md` 提交。

## File Map

- Create: `docs/superpowers/plans/2026-03-24-platform-contract-driven-rendering.md`
- Modify: `src/main/platform/profiles/darwin-profile.js`
- Modify: `src/main/platform/profiles/win32-profile.js`
- Modify: `src/main/services/permission-readiness.js`
- Modify: `src/main/services/permission-service.js`
- Modify: `src/main/services/dictation-service.js`
- Modify: `src/main/app/composition-root.js`
- Modify: `src/main/tray-manager.js`
- Modify: `src/main/services/transcription-service.js`
- Modify: `src/main/whisper-engine.js`
- Modify: `src/renderer/permission-onboarding.html`

## Tasks

### Task 1: 平台 Contract 定义

- [ ] 在 `darwin-profile.js` 和 `win32-profile.js` 增加 `uiContract.permission` 配置（surface schema、排序、标签与动作文案）
- [ ] 验证默认/备选平台都返回可序列化 surface 列表

### Task 2: 权限 Snapshot 按 Contract 组装

- [ ] `permission-readiness.js` 增加可选 `permissionContract` 入参与 `surfaceOrder` 输出
- [ ] `permission-service.js` 在 `getReadiness/recheckReadiness/ensureStartupPermissions` 中注入 contract
- [ ] 保持 legacy raw facts 输入的兼容行为

### Task 3: 数据驱动渲染接入

- [ ] 在 `composition-root` 将 `platform.profile.uiContract` 下发到 `permission-service` 与 renderer config
- [ ] `tray-manager` 使用 runtime contract 渲染权限菜单/标签
- [ ] `permission-onboarding.html` 改为基于 `get-config` 下发的 contract 动态渲染卡片

### Task 4: whisper 二进制注入去平台分支

- [ ] `whisper-engine.js` 移除 `process.platform` 分支推断逻辑，使用注入的 `whisperBin`
- [ ] `transcription-service.js` 显式注入 `runtimePaths.whisperBinPath`，并保持 `whisperEngine` 可替换性
