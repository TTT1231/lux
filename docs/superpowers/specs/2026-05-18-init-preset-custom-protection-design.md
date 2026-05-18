# init --preset 自定义预设保护

## 问题

`lux init --preset` 执行 `materializeAllPresets()` 时，可能误删 `~/.lux/preset/fmt/` 下用户创建的自定义预设目录。

## 需求

- 内置预设（web-vue、web-react 等）：可以覆盖，写入最新默认配置
- 自定义预设（用户手动创建的）：绝对不能被触碰

## 方案

`materializeAllPresets()` 只遍历 `FMT_PRESETS` 和 `VSCODE_PRESETS` 内置数组，按名称精确匹配。只有名称在内置列表中的预设目录才会被写入。自定义预设的目录名不在列表中，天然不会被碰。

## 修改范围

- `src/commands/init.ts` — `materializeAllPresets()` 函数
- `src/core/local-preset.ts` — `materializeFmtPreset()` 和 `materializeVscodePresetFromBuiltin()` 视需要加保护
- `tests/unit/` — 新增测试验证自定义预设不被触碰

## 具体逻辑

1. `materializeAllPresets()` 已通过遍历内置数组限制了操作范围
2. 确认 `materializeFmtPreset` / `materializeVscodePresetFromBuiltin` 内部没有超出预设名称范围的操作
3. 不添加日志、不添加备份、不改变其他行为

## 测试

- 单元测试：在 `~/.lux/preset/fmt/` 下同时存在内置预设目录和自定义预设目录时，运行 `materializeAllPresets()`，验证自定义预设目录内容不变
