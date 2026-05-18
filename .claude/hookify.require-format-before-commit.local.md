---
name: require-format-before-commit
enabled: true
event: bash
pattern: git\s+commit
action: warn
---

Before committing, the following must all pass (exit code 0):

- `bun run type:check` — TypeScript type check
- `bun run cspell` — Spell check

After any fix, re-run the failed command to verify.
