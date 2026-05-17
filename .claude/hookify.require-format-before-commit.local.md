---
name: require-format-before-commit
enabled: true
event: bash
pattern: git\s+commit
action: warn
---

Before committing, you **must** run code formatting and quality checks:

```bash
bun run lint   # eslint + prettier check + cspell
```

If any check fails, fix issues first:

```bash
bun lint:fix     # eslint fix + prettier write
```

Only proceed with the commit after all checks pass. Do not skip formatting checks.
