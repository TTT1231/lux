## Why

fmt 命令目前支持通过 `--stylelint`、`--editorconfig` opt-in 生成配置，但缺少 Git hooks 自动化能力。开发者每次 commit 前需要手动跑 lint/format，容易遗漏。husky + lint-staged 是 Node.js 社区标准的 pre-commit 自动化方案。

## What Changes

- 新增 `--husky` opt-in flag：安装 husky，创建 `.husky/pre-commit` hook，注入 `prepare`（或 yarn 的 `postinstall`）script 并执行一次初始化
- 新增 `--lint-staged` opt-in flag：安装 lint-staged，生成 `.lintstagedrc.json` 配置文件，注入 `"lint-staged"` script；隐式启用 `--husky`（lint-staged 依赖 git hooks）
- lint-staged 配置通过 `FmtPreset.lintStaged` 字段定义，每个 preset 定义自己的 glob/command 映射
- husky pre-commit 内容为固定模板（`<pm> run lint-staged` 或 `<pm> run lint`），不固化到本地预设；`.lintstagedrc.json` 走现有 CONFIG_FILES 固化流程
- yarn 包管理器使用 `postinstall` 替代 `prepare`（yarn 不支持 `prepare` script）

## Capabilities

### New Capabilities
- `husky-lint-staged`: husky 初始化 + lint-staged 配置生成的完整能力，包括 flag 解析、PM 差异处理、固化/过滤逻辑

### Modified Capabilities
- `fmt-command`: 新增 `--husky` 和 `--lint-staged` flags，新增 `noHusky` / `noLintStaged` GenerateOptions 字段，husky 初始化在 builtin/local 两条路径中均需执行
- `local-preset`: CONFIG_GETTERS 新增 `.lintstagedrc.json`，过滤逻辑新增 lint-staged 相关 deps/scripts/files，detectPresetCapabilities 新增 husky/lint-staged 能力检测

## Impact

- `src/presets/types.ts`: FmtPreset 新增 `lintStaged?: () => string` 字段，GenerateOptions 新增 `noHusky` / `noLintStaged`
- `src/presets/fmt/*.ts`: 所有 preset 新增 `lintStaged` 字段、`husky` + `lint-staged` 依赖
- `src/commands/fmt.ts`: 注册 `--husky` / `--lint-staged` flags，新增 husky 初始化逻辑（ensureDir + writeFile + injectScript + spawn）
- `src/generators/fmt.ts`: CONFIG_FILES 新增 `.lintstagedrc.json`，过滤逻辑新增 husky/lint-staged
- `src/core/local-preset.ts`: CONFIG_GETTERS、filterDeps、filterScripts、detectPresetCapabilities 扩展
- 新增依赖: `husky`、`lint-staged`（作为 preset 的 devDependencies 生成到目标项目）
