---
doc_type: spec
status: draft
supersedes: []
related: []
---

# 平台能力契约驱动的权限与托盘/引导渲染 + whisper 二进制注入 Spec

## Problem

当前实现里，权限引导、托盘菜单与部分文案仍在主进程/服务/渲染层内硬编码 macOS 语义，导致 Windows 分支会出现不必要的耦合与行为偏差。`whisper-engine` 仍直接按 `process.platform` 选二进制路径，降低可测试性与平台扩展能力。

目标是引入“平台配置契约（platform UI contract）”与“数据驱动渲染”，使不同平台只需切换配置即可得到不同菜单、权限展示与页面结果；同时把 whisper 可执行文件路径选择下沉到配置/运行时注入路径。

## Success

- 同一托盘/权限引导逻辑在 macOS 与 Windows 下可独立渲染：Windows 不依赖 macOS 专有权限 surface 的文案与流程。
- 权限 readiness 的 surface 列表、顺序、标签与按钮行为由平台 profile/config 决定；服务层不再承担平台文案/平台分支。
- `whisper-engine` 不再在内部直接读取 `process.platform` 来决定二进制名或路径。
- 在不改现有 IPC 事件命名的前提下，现有入口（权限开启、重检、打开设置）仍可工作。

## Out Of Scope

- 不引入新的权限采集能力；继续使用现有 permission gateway 产出的状态信息。
- 不修改词表、模型加载、转写后处理业务主逻辑。
- 不对 renderer 全新样式系统做重构；仅做 permission-onboarding 页面的数据渲染调整。
- 不做长列表国际化资源文件全面接入；文案 key 先映射现有文案语义。

## Critical Paths

1. 平台 profile 注入（`darwin`/`win32`）统一定义 `permission contract`、`tray contract` 与 `onboarding` 渲染字段。
2. 权限快照归一化（permission-readiness）在组装时按 profile 的 surface 契约过滤与排序，返回可直接渲染结构。
3. 托盘菜单与权限页面（`tray-manager` + `permission-onboarding.html`）改为只消费标准结构，不再硬编码 surface 或平台语义。
4. `whisper-engine` 由注入路径创建，`transcription-service` 负责编排与路径来源（runtime/profile）。

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- `platform.profile` 必须暴露统一 `uiContract`（或等效字段）并在 `platform/index.js` 的默认平台 API 下游可消费。
- `permission-readiness` 输出应为可序列化对象：`{ isReady, firstRunNeedsOnboarding, refreshedAt, surfaces, surfaceOrder? }`。
- `surfaces[<surfaceId>]` 至少包含 `status`，可含 `reason`、`cta`、`settingsTarget`、`labelKey`、`actionLabelKey`、`unsupported`。
- 托盘/引导层不得直接执行 `process.platform` 分支来决定显示内容。
- `whisper-engine` 的二进制路径必须通过外部参数提供（如 `whisperBinaryPath`/adapter 提供），不允许在引擎类内部根据平台分支。
- IPC 事件名保持不变（如 `open-permission-onboarding`、`recheck-permission-readiness`、`get-permission-readiness`）。

## Architecture Invariants

- 渲染逻辑与菜单构建是“数据驱动”：输入是 readiness + profile 契约。
- 业务服务只关心“就绪状态”和“可执行动作”，不关心平台特定文案。
- 平台差异集中在配置和适配器，不通过分散式硬编码分支散落在 services/renderer。
- 任何平台 surface 在 readiness 里不存在时，UI 不应创建该面板；除非 profile 明确要求 `unsupported` 提示。
- 失败与降级策略：缺失或异常配置时回退到“安全保守模型”（不就绪 + 支持最小 surface）。

## Failure Policy

- `permission-readiness` 若被注入无效 contract：回退到默认三 surface 兼容模型（`microphone`, `accessibility`, `inputMonitoring`）并按现有失败语义展示。
- `whisper` 运行时二进制配置缺失：记录错误并使用现有失败路径（fail fast + 诊断信息），禁止静默回退到错误平台二进制。
- 契约渲染时缺少文案 key：回退到稳定文案，不中断托盘/页面渲染。
- 权限设置跳转异常：保留既有 dialog 提示流程，不阻塞主循环，持续允许用户再次触发。

## Acceptance
<!-- drift_anchor: acceptance -->

- [ ] `permission-onboarding.html` 在 macOS 下渲染 microphone/accessibility/inputMonitoring 3 项并能触发对应设置。
- [ ] `permission-onboarding.html` 在 Windows 下按 contract 渲染兼容结果（至少显示可用 surface 与 unsupported 项，不出现 macOS 固定三项硬编码）。
- [ ] `tray-manager` 在 Windows 不再显示 macOS 专有文案分支文本，且 permission 状态菜单由 `surfaces` 数据驱动。
- [ ] `DictationService` 在平台切换时不出现 `process.platform` 分支/平台文案耦合。
- [ ] `whisper-engine` 不直接读取 `process.platform`；transcription 路径由运行时注入并可在测试中替换。
- [ ] 现有关键测试链路更新（permission-readiness / permission-service / dictation-service / tray-manager / composition-root / onboarding 页面）通过新的 contract 驱动断言。

## Deferred Decisions

- 是否把 tray/onboarding 的文案引导抽离为独立 i18n 资源文件（当前先用 profile keys + 映射 fallback）。
- 是否允许 profile-level 覆盖新增页面模板（`permission-onboarding.win32`）以满足将来 Windows 独立 UX 需求。
- 是否同步补齐 `docs/architecture` 与 `AGENT_INDEX` 中的“契约字段”说明（建议在计划阶段一次性更新）。
