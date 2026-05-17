# Cross-Platform Clipboard Support Design

Date: 2026-05-17
Branch: vpn-multi-support
Scope: `vpn` 命令的剪贴板功能 — 支持 macOS/Linux

## Motivation

`vpn.ts` 的 `copyToClipboard` 硬编码调用 Windows 独占的 `clip` 命令。在 macOS/Linux 上执行时会失败，用户只能看到终端输出而非剪贴板复制。跨平台排查确认这是全项目唯一会导致"Windows 正常但 macOS/Linux 失败"的功能点。

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | 方案 | 独立 platform 工具 + 改写 copyToClipboard | 小改动、可复用、符合现有 utils 模式 |
| D2 | 剪贴板命令 | clip / pbcopy / xclip | 系统自带（macOS），常见安装（Linux），不引入依赖 |
| D3 | xclip 未安装时的行为 | 走现有降级（打印到终端） | 不新增依赖，不增加复杂度 |
| D4 | platform 工具位置 | `src/utils/platform.ts` | 与 config.ts、deps.ts 等同级，语义清晰 |

## Changes

### 1. 新建 `src/utils/platform.ts`

导出 `getPlatform()` 函数，封装 `os.platform()` 调用。返回联合类型 `'win32' | 'darwin' | 'linux'`，方便类型安全的平台分发。

### 2. 修改 `src/commands/vpn.ts`

- 用平台映射表替代硬编码的 `clip`：

  ```
  win32 → clip
  darwin → pbcopy
  linux → xclip
  ```

- `copyToClipboard` 根据 `getPlatform()` 返回值选择命令
- 现有降级逻辑（失败时打印到终端）保持不变

### 不改动的部分

- `handleCopy`、`handleSet`、`handleUnset` 等函数不变
- 命令注册和 CLI 入口不变
- 不引入新的 npm 依赖

## 改动范围

| 文件 | 操作 | 改动量 |
|------|------|--------|
| `src/utils/platform.ts` | 新建 | ~5 行 |
| `src/commands/vpn.ts` | 改 copyToClipboard + import | ~10 行 |

## 测试策略

- 单元测试：mock `os.platform()` 验证三个平台各返回正确的剪贴板命令
- 单元测试：验证 `copyToClipboard` 在 spawnSync 失败时返回 `false`（降级路径）
