## 1. Local preset 层 — 发现与验证

- [ ] 1.1 在 `src/core/local-preset.ts` 新增 `listCustomPresets(): string[]`，扫描 `~/.lux/preset/fmt/` 目录，过滤出含 `package.json` 的有效子目录，排除 `isValidPresetName` 校验失败的名称
- [ ] 1.2 新增 `isValidCustomPreset(name: string): boolean`，校验目录存在 + `package.json` 存在 + 名称合法
- [ ] 1.3 为 `listCustomPresets` 和 `isValidCustomPreset` 编写单元测试（正常扫描、空目录、无 package.json、路径穿越）

## 2. Script entry 过滤增强（共用函数）

- [ ] 2.1 在 `src/core/local-preset.ts` 新增导出函数 `filterScripts(scripts, noStylelint, noEditorconfig): Record<string, string>`：key 含 `stylelint` → 整条删除；key 含 `editorconfig` → 整条删除；剩余 entry 剥内联 `&& stylelint "..."` 片段
- [ ] 2.2 修改 `src/core/local-preset.ts` 的 `mergeTemplateIntoProject`：script 循环体改为调用 `filterScripts`（传入 noStylelint/noEditorconfig），删除内联的 replace 逻辑
- [ ] 2.3 修改 `src/commands/fmt.ts`：删除本地 `filterStylelintScripts` 函数，builtin 路径改为调用共用的 `filterScripts`（同时覆盖 noStylelint + noEditorconfig 两个 flag）
- [ ] 2.4 为 `filterScripts` 编写单元测试（独立 stylelint entry 删除、混合 lint 剥内联、editorconfig entry 删除、两个 flag 组合、大小写敏感校验）

## 3. resolvePreset 改造 + fmt 命令分发逻辑重构

- [ ] 3.1 修改 `src/utils/errors.ts` 的 `resolvePreset`：删除 `process.exit(1)` 调用，改为 `return undefined`
- [ ] 3.2 修改 `src/commands/vscode.ts` 调用 `resolvePreset` 处：添加 `if (!preset) return` guard（行为不变，vscode 仍 exit 但通过 caller 控制）
- [ ] 3.3 重写 `src/commands/fmt.ts` action handler 的 preset 查找逻辑：不再调用 `resolvePreset`，改为自行判断 name 是否在 `FMT_PRESETS` 中，不存在时 fallback 到 `isValidCustomPreset`
- [ ] 3.4 预设名不存在时：收集 builtin + custom 全部名称，调用 `fuzzyMatchPreset` 生成友好错误提示
- [ ] 3.5 `--reset` + 自定义预设：检测到非 builtin 名称时 warn 并 return，不执行任何操作
- [ ] 3.6 为 resolvePreset 新行为编写单元测试（返回 undefined 而非 process.exit）
- [ ] 3.7 为 fmt 新分发逻辑编写单元测试（builtin + local 存在、builtin + local 不存在、custom 存在、custom 不存在、--reset 对自定义预设）

## 4. fmt list 增强

- [ ] 4.1 修改 `fmt list` action：调用 `listCustomPresets()`，与 `FMT_PRESETS` 名称取差集得到自定义列表
- [ ] 4.2 输出格式：内置预设在前（原有格式），自定义预设在后，标记 `(custom)` 并用 `chalk.yellow` 着色
- [ ] 4.3 编写单元测试（仅有 builtin、builtin + custom、无 custom 目录、无 package.json 的目录不展示）

## 5. 单元测试 + Lint

- [ ] 5.1 运行 `bun run test --project unit` 确保单元测试通过（不跑全量验收测试，太耗时）
- [ ] 5.2 运行 `bun run lint` 确认无 lint 错误

## 6. 真实场景端到端验证（临时目录）

前置准备（只需一次）：
- `bun run build`
- 在 `~/.lux/preset/fmt/test-custom/` 创建完整自定义预设（含 eslint.config.mjs, .prettierrc, .prettierignore, stylelint.config.mjs, .stylelintignore, .editorconfig, cspell.json, package.json），package.json 中包含 devDependencies（eslint, prettier, stylelint, cspell, editorconfig 相关）和 scripts（lint 含内联 stylelint、stylelint:check 独立 entry、editorconfig:check 独立 entry、format）
- 每个测试场景：创建临时目录 → 写入 `package.json` + `bun.lock`（让 lux 检测 bun PM）→ 执行命令 → 验证结果（读文件/package.json 内容）→ 清空临时目录

### 6A. fmt list 测试

- [ ] 6A.1 运行 `fmt list` → 验证输出包含内置预设 + `test-custom (custom)` 标记，内置在前自定义在后，无 package.json 的目录不出现

### 6B. 自定义预设基础执行

- [ ] 6B.1 新建临时目录 → `fmt test-custom --no-install` → 验证：eslint.config.mjs, .prettierrc, .prettierignore, cspell.json 已复制到项目根；package.json 已合并 devDependencies 和 scripts（stylelint 相关文件和 script 不应出现，因为没加 --stylelint）；输出含 "Using local custom preset"

### 6C. --stylelint flag 测试

- [ ] 6C.1 新建临时目录 → `fmt test-custom --stylelint --no-install` → 验证：stylelint.config.mjs, .stylelintignore 已复制；stylelint 相关 devDependencies 已合并；`stylelint:check` script 已注入；lint script 中内联 stylelint 片段保留
- [ ] 6C.2 新建临时目录 → `fmt test-custom --no-install`（不加 --stylelint）→ 验证：stylelint.config.mjs, .stylelintignore 未复制；stylelint 相关 devDependencies 未合并；`stylelint:check` script 未注入；lint script 中内联 stylelint 片段已被剥掉（仅保留 eslint 部分）

### 6D. --editorconfig flag 测试

- [ ] 6D.1 新建临时目录 → `fmt test-custom --editorconfig --no-install` → 验证：.editorconfig 已复制；editorconfig 相关 devDependencies 已合并；`editorconfig:check` script 已注入
- [ ] 6D.2 新建临时目录 → `fmt test-custom --no-install`（不加 --editorconfig）→ 验证：.editorconfig 未复制；editorconfig 相关 devDependencies 未合并；`editorconfig:check` script 未注入

### 6E. --stylelint + --editorconfig 组合

- [ ] 6E.1 新建临时目录 → `fmt test-custom --stylelint --editorconfig --no-install` → 验证：所有文件复制、所有 deps 和 scripts 注入完整

### 6F. --force 覆盖测试

- [ ] 6F.1 新建临时目录 → 先创建一个已有的 .prettierrc → `fmt test-custom --force --no-install` → 验证：.prettierrc 被覆盖为预设版本
- [ ] 6F.2 新建临时目录 → 先创建一个已有的 .prettierrc → `fmt test-custom --no-install`（无 --force）→ 验证：.prettierrc 未被覆盖，输出含 "Skipped"

### 6G. --dry-run 测试

- [ ] 6G.1 新建临时目录 → `fmt test-custom --dry-run` → 验证：项目目录中无任何新文件生成，输出含 "[dry-run]" 预览信息

### 6H. --reset 测试

- [ ] 6H.1 新建临时目录 → `fmt test-custom --reset` → 验证：输出含 warn 提示，目录中无文件变更，命令中止

### 6I. 错误路径测试

- [ ] 6I.1 新建临时目录 → `fmt nonexistent-name --no-install` → 验证：输出含 "not found" 错误 + fuzzy match 建议（合并 builtin + custom 名称）
- [ ] 6I.2 在 `~/.lux/preset/fmt/test-empty/` 创建空目录（无 package.json）→ `fmt test-empty --no-install` → 验证：输出含 "not found" 错误（无 package.json 视为无效预设）

### 6J. 清理

- [ ] 6J.1 删除所有临时测试目录
- [ ] 6J.2 删除 `~/.lux/preset/fmt/test-custom/` 和 `~/.lux/preset/fmt/test-empty/`
