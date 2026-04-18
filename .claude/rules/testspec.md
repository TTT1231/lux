# 测试文件命名规范

见 `.claude/CLAUDE.md` 的 Testing 部分。两条核心规则：

- 单元测试用 `*.test.ts`，验收测试用 `*.spec.ts`
- `tests/helpers/` 下的工具文件使用普通 `.ts`，不受此规则约束
