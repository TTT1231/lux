---
name: require-format-before-commit
enabled: true
event: bash
pattern: git\s+commit
action: warn
---

`bun run lint` must pass (exit code 0) before committing. After any fix, re-run `bun run lint` to verify — `lint:fix` does not fix TypeScript type errors.
