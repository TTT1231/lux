## 1. deps.json 数据层

- [ ] 1.1 定义 `DepsRegistry` 类型（`Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>`），放在 `src/core/shared.ts`
- [ ] 1.2 实现 `loadDepsJson(presetDir: string): DepsRegistry` 统一加载函数，读 JSON + 校验格式，损坏时抛明确错误
- [ ] 1.3 为每个 builtin preset 创建 `src/presets/fmt/<name>/deps.json`，按工具分组填写实际依赖和版本（web-vue, web-react, nest, node, uniapp, electron-vue）
- [ ] 1.4 从各 preset TypeScript 文件中移除 `dependencies: { dev: [...] }` 字段
- [ ] 1.5 删除 `isNotStylelintDep`、`isNotEditorconfigDep`、`isNotCspellDep`、`isNotHuskyDep`、`isNotLintStagedDep` 函数（`src/core/shared.ts`）
- [ ] 1.6 删除 `STYLELINT_DEPS`、`HUSKY_DEPS`、`LINTSTAGED_DEPS` Set 常量（`src/core/shared.ts`）

## 2. Flag 语义翻转

- [ ] 2.1 `GenerateOptions` 接口字段从 `noStylelint/noCspell/noEditorconfig/noHusky/noLintStaged` 改为 `stylelint/cspell/editorconfig/husky/lintStaged`（boolean，默认 false）
- [ ] 2.2 `commands/fmt.ts` 中构建 opts 的逻辑翻转：`stylelint: options.stylelint === true` 替代 `noStylelint: options.stylelint !== true`
- [ ] 2.3 全局搜索替换所有消费 `opts.noXxx` / `opts.noStylelint` 等的条件判断为 `opts.xxx` / `opts.stylelint`（涉及 `generateAllFmt`、`filterScripts`、`filterDeps`、`injectScripts` 等）

## 3. Scripts 拆分

- [ ] 3.1 修改各 preset 的 `scripts` 定义：从聚合 `lint`/`lint:fix` 改为 8 个独立脚本（`eslint`、`eslint:fix`、`stylelint`、`stylelint:fix`、`cspell`、`type:check`、`format`、`lint-staged`），每个 preset 带自己的 glob
- [ ] 3.2 重写 `filterScripts()`：从正则剥离内容改为按 key 删除（检查 key 是否包含工具名），移除所有 regex 逻辑
- [ ] 3.3 更新 `commands/fmt.ts` 中的 `injectScripts` 调用，确保只加不删的行为不变
- [ ] 3.4 验证 `injectScripts` 不碰用户已有的 `lint` / `lint:fix` 脚本

## 4. 依赖安装重构

- [ ] 4.1 重写 `commands/fmt.ts` 中 `filterDeps`：从遍历扁平数组 + isNotXxxDep 过滤 → 根据 flag 读取 deps.json 对应工具组，收集所有活跃工具的包列表
- [ ] 4.2 实现 `collectDepsFromRegistry(registry: DepsRegistry, flags: { stylelint: boolean; cspell: boolean; ... }): string[]` 函数，合并所有活跃工具 + 常驻工具（eslint, prettier）的依赖
- [ ] 4.3 确保 `installDevDeps` 的只装不删行为不变（已有的跳过）

## 5. lint-staged 动态组合

- [ ] 5.1 在 `FmtPreset` 接口中用 `lintStagedFragments` 替换 `lintStaged` 函数，类型为 `Record<string, Record<string, string[]>>`
- [ ] 5.2 修改各 preset 的 `lintStaged` → `lintStagedFragments`，按工具分片定义
- [ ] 5.3 实现 `composeLintStaged(fragments, flags)` 函数：按 flag 选片 → glob 合并（同 glob 的命令数组合并）→ 空 glob key 清理
- [ ] 5.4 修改 `src/generators/fmt.ts` 的 `.lintstagedrc.json` 生成：从 `preset.lintStaged()` 调用改为 `composeLintStaged(preset.lintStagedFragments, opts)`

## 6. Materialize / Apply 路径改造

- [ ] 6.1 修改 `buildTemplatePackageJson()`：移除 `devDependencies` 构建逻辑，只保留 `scripts`
- [ ] 6.2 修改 materialize 流程：额外复制 builtin preset 的 `deps.json` 到 `~/.lux/preset/fmt/<name>/deps.json`
- [ ] 6.3 从 `CONFIG_GETTERS` 中移除 `.lintstagedrc.json` 条目（lint-staged 不固化，每次动态组合）
- [ ] 6.4 重写 `resolveLocalDeps()`：从读 template `package.json` 的 `<latest>` 占位符改为读 `deps.json` 工具分组
- [ ] 6.5 重写 `mergeTemplateIntoProject()` 依赖合并部分：从遍历 template `devDependencies` + Set 判断 → 根据 flag 从 `deps.json` 收集活跃工具的包列表
- [ ] 6.6 修改 `detectPresetCapabilities` / 自动检测逻辑：从 `isNotStylelintDep` 判断 → 读 `deps.json` 工具组与项目 `package.json` 做交集
- [ ] 6.7 处理旧 materialized preset 缺少 `deps.json` 的情况：报错 + 建议 `--reset`

## 7. 测试

### 7.1 数据层测试

- [ ] 7.1.1 `loadDepsJson` 单元测试：正常加载返回正确结构
- [ ] 7.1.2 `loadDepsJson` 单元测试：JSON 损坏时抛出明确错误
- [ ] 7.1.3 `loadDepsJson` 单元测试：文件缺失时抛出明确错误
- [ ] 7.1.4 `loadDepsJson` 单元测试：含 `<latest>` 占位符时正确透传

### 7.2 filterScripts 测试

- [ ] 7.2.1 按 key 删除：`stylelint` flag false 时移除 `stylelint` 和 `stylelint:fix`
- [ ] 7.2.2 按 key 删除：`cspell` flag false 时移除 `cspell` key
- [ ] 7.2.3 按 key 删除：多个 flag 同时 false 时正确组合
- [ ] 7.2.4 不影响其他 key：`eslint`/`format` 等常驻脚本保留

### 7.3 composeLintStaged 测试

- [ ] 7.3.1 全 flag 激活：所有工具分片合并输出
- [ ] 7.3.2 部分 flag：stylelint false 时不包含 stylelint 分片
- [ ] 7.3.3 空 glob 清理：排除分片后空 glob key 被移除
- [ ] 7.3.4 同 glob 合并：eslint + prettier 对 `*.{ts,js}` 的命令合并为一个数组

### 7.4 collectDepsFromRegistry 测试

- [ ] 7.4.1 活跃工具收集：指定 flag 对应工具的 deps 全部返回
- [ ] 7.4.2 常驻工具：eslint + prettier deps 始终返回
- [ ] 7.4.3 包去重：多个工具组有相同包名时只出现一次

### 7.5 集成 / 回归测试

- [ ] 7.5.1 `mergeTemplateIntoProject` 回归：flag 翻转后依赖合并行为正确（opts.stylelint 而非 opts.noStylelint）
- [ ] 7.5.2 `resolveLocalDeps` 回归：从 deps.json 读取后正确解析 `<latest>` 占位符
- [ ] 7.5.3 `injectScripts` 回归：只添加不删除，用户已有 lint/lint:fix 不被触碰
- [ ] 7.5.4 `detectPresetCapabilities` 回归：从 deps.json 工具组检测能力而非 isNotXxxDep

### 7.6 验收测试更新

- [ ] 7.6.1 更新现有验收测试以适配新的脚本结构（8 个独立脚本替代聚合脚本）
