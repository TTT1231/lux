## Context

`lux fmt` 通过 opt-in flags（`--stylelint`、`--editorconfig`）生成代码质量配置。现在需要添加 Git hooks 自动化能力，使开发者在 commit 前自动执行 lint/format。

现有的 opt-in 模式是"生成配置文件 + 安装依赖 + 注入 scripts"，所有配置文件通过 `CONFIG_FILES` 数组统一处理。husky 与此模式有本质差异：它需要创建目录结构、注入 `prepare`/`postinstall` script 并执行一次初始化。

关键约束：
- lint-staged 依赖 husky（需要在 git hook 中运行），husky 不依赖 lint-staged
- yarn 不支持 `prepare` script，必须用 `postinstall` 替代
- husky pre-commit 内容为固定模板，不因 preset 不同而变化

## Goals / Non-Goals

**Goals:**
- 为 `lux fmt` 添加 `--husky` 和 `--lint-staged` opt-in flags
- 支持所有主流 PM（npm、pnpm、yarn、bun），自动处理 `prepare` vs `postinstall` 差异
- lint-staged 配置（`.lintstagedrc.json`）走现有 CONFIG_FILES 固化流程
- `--lint-staged` 隐式启用 `--husky`（依赖链自动处理）
- 过滤逻辑与 `--stylelint` 完全一致

**Non-Goals:**
- 不支持自定义 hook 内容（pre-commit 固定模板）
- 不支持除 `pre-commit` 外的其他 git hooks
- 不处理 yarn 发布场景的 `pinst` 配置（仅影响发布到 npm 的场景，超出 lux 的范围）

## Decisions

### 1. husky 初始化方式：手动执行 vs 调用 `husky init`

**选择：手动执行（不调用 `husky init`）**

`husky init` 对 npm/pnpm/bun 能自动完成初始化，但对 yarn 不支持。采用统一的手动流程：ensureDir + writeFile + injectScript + spawn，只有 script 名称（`prepare` vs `postinstall`）根据 PM 变化。

理由：避免两套逻辑（husky init 路径 + yarn 手动路径），且 lux 已有 `ensureDir`、`writeFile`、`injectScript` 基础设施。

### 2. lint-staged 配置位置：`.lintstagedrc.json` vs `package.json`

**选择：`.lintstagedrc.json` 独立配置文件**

理由：走现有 `CONFIG_FILES` 固化流程，与其他工具（cspell、eslint）风格一致。固化后用户可自定义 glob/command 映射。

### 3. pre-commit hook 内容：固化 vs 动态生成

**选择：动态生成，不固化**

pre-commit 内容为固定两选一（`<pm> run lint-staged` 或 `<pm> run lint`），不含可自定义的配置。固化后用户没有修改的动力，反而增加维护复杂度。

### 4. `--lint-staged` 与 `--husky` 的依赖关系

**选择：`--lint-staged` 隐式启用 `--husky`**

lint-staged 必须在 git hook 中运行。如果用户只传 `--lint-staged` 不传 `--husky`，自动启用 husky 而非报错。降低用户认知负担。

### 5. pre-commit 执行命令：script 中转 vs 直接调用

**选择：通过 script 中转（`<pm> run lint-staged`）**

在 package.json 注入 `"lint-staged": "lint-staged"` script，pre-commit 通过 `<pm> run lint-staged` 调用。复用现有 `<pm>` 占位符机制，无需新增 PM 到 exec prefix 的映射。

### 6. yarn 的 `prepare` 替代方案

**选择：yarn 使用 `postinstall`**

husky 官方文档明确说明 yarn 不支持 `prepare` script。检测到 yarn 时注入 `"postinstall": "husky"` 替代 `"prepare": "husky"`，并在首次执行时运行 `yarn postinstall` 而非 `npm run prepare`。

## Over-Engineering Traps

- **不要构建通用 hook 管理系统**：只支持 `pre-commit`，不需要支持所有 13 种 git hooks
- **不要让 preset 自定义 hook 内容**：hook 内容由 flags + PM 决定，不是配置
- **不要处理 monorepo 场景的嵌套 husky**：超出 lux 当前范围
- **不要为 yarn 发布场景添加 `pinst`**：这是 npm 发布流程的问题，与项目初始化无关

## Risks / Trade-offs

- **[Risk] `husky init` 行为变更** → 手动执行流程不依赖 `husky init`，避免受其 API 变更影响。但需要确保手动流程与 husky 最新版本兼容。**Mitigation**：手动流程只依赖 husky 的核心能力（`core.hooksPath` 设置 + hook 文件执行），这些是 git 原生特性，非常稳定。

- **[Risk] Yarn `postinstall` 可能在 CI 中触发** → `postinstall` 在 `yarn install` 时自动运行，CI 环境可能不需要 hooks。**Mitigation**：husky 自身处理了这个问题（通过 `HUSKY=0` 环境变量），CI 环境通常设置此变量。

- **[Trade-off] pre-commit 不固化 → 每次 apply 动态生成** → 少了"固化后可自定义"的能力，但 pre-commit 内容本质上不需要自定义（要自定义的是 `.lintstagedrc.json` 里的 glob/command 映射）。
