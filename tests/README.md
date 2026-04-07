# Tests

验收测试（Acceptance Tests）—— 从用户视角验证 CLI 完整行为。

## 运行

```bash
pnpm test        # 构建后运行全部测试
pnpm test:watch  # 监听模式
```

## 目录结构

```
tests/
├── helpers/
│   └── cli-runner.ts   # 测试基础设施：临时目录 + CLI 执行 + 文件断言
├── acceptance.spec.ts   # 验收测试：10 个用户场景
└── README.md
```

## helpers/cli-runner.ts

测试工具层，提供 `createTestContext()` 创建隔离的临时目录环境：

| 方法 | 用途 |
|------|------|
| `run(args)` | 在临时目录中执行 `lux` CLI，返回 stdout/stderr/exitCode |
| `fileExists(path)` | 检查文件是否存在 |
| `readFile(path)` | 读取文件内容 |
| `readJsonFile(path)` | 读取并解析 JSON |
| `writeFile(path, content)` | 写入种子文件 |
| `writeJsonFile(path, data)` | 写入 JSON 种子文件 |
| `cleanup()` | 删除临时目录（afterEach 自动调用） |

## 验收场景一览

| # | 场景 | 验证内容 |
|---|------|----------|
| 1 | 新 Vue 项目一键初始化 | fmt + vscode 完整流程，所有文件和内容正确 |
| 2 | 已有项目重跑 | 无 `--force` 保留自定义，有 `--force` 覆盖 |
| 3 | 已有 VSCode 设置合并 | 用户偏好保留，工具配置强制覆盖，备份 + 深度合并 |
| 4 | `--dry-run` 预览 | 不写任何文件，输出包含预览标记 |
| 5 | pnpm 锁文件检测 | `<pm>` 占位符解析为 `pnpm run` |
| 6 | NestJS 特殊规则 | neverOverwrite 保护 eslint，forceOverwrite 强制更新 prettier |
| 7 | 预设名打错 | 模糊匹配建议 + exitCode 1 |
| 8 | list 命令 | 列出所有预设名称 |
| 9 | 没有 package.json | 配置文件正常创建，脚本注入跳过并警告 |
| 10 | 所有预设产出合法 | 每个 preset 的 JSON 可解析、内容非空 |

## 编写新测试

每个测试用例代表一个完整的用户场景：

```typescript
it('用户做了某事，期望某个结果', () => {
  ctx = createTestContext({
    files: { 'package.json': '...' }  // 可选：种子文件
  })

  const result = ctx.run(['fmt', 'init', 'web', '--no-install'])
  expect(result.exitCode).toBe(0)

  // 断言最终文件系统状态
  expect(ctx.fileExists('.prettierrc')).toBe(true)
})
```
