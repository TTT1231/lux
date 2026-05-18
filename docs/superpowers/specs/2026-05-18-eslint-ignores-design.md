# ESLint Flat Config Ignores

**Date:** 2026-05-18
**Status:** Approved

## Problem

ESLint v9+ (flat config) no longer supports `.eslintignore` and `.gitignore` for ignore rules. All ignores must be declared via the `ignores` field in the ESLint config. Current preset templates lack proper `ignores` entries — only `node` and `web-react` have partial ignores, and neither includes `node_modules` or lockfile patterns.

## Solution

Add an `ignores` config object to all preset ESLint templates using the existing `<lockfile>` placeholder. The replacement is already handled by `generateConfigFile` in `generators/fmt.ts` (lines 24-26), so no generator changes are needed.

## Ignores per Preset

| Preset       | ignores values                                    |
| ------------ | ------------------------------------------------- |
| `web-vue`    | `node_modules/`, `<lockfile>`, `dist/`            |
| `web-react`  | `node_modules/`, `<lockfile>`, `dist/`            |
| `node`       | `node_modules/`, `<lockfile>`, `eslint.config.mjs`, `dist/` |
| `uniapp`     | `node_modules/`, `<lockfile>`, `dist/`, `unpackage/` |
| `electron-vue` | `node_modules/`, `<lockfile>`, `dist/`          |
| `nest`       | No ESLint config (NestJS manages its own)         |

## Conflict Handling

Existing behavior is correct:
- `eslint.config.mjs` exists + no `--force` → skip (user keeps their config)
- `eslint.config.mjs` exists + `--force` → overwrite with preset template
- `eslint.config.mjs` does not exist → create from preset template

No new conflict resolution logic needed.

## Changes

5 preset template files only (ESLint config string):

1. `src/presets/fmt/web-vue.ts` — add ignores block
2. `src/presets/fmt/web-react.ts` — update ignores block
3. `src/presets/fmt/node.ts` — update ignores block
4. `src/presets/fmt/uniapp.ts` — add ignores block
5. `src/presets/fmt/electron-vue.ts` — add ignores block
