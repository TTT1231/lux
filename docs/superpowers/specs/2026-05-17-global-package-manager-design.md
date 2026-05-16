# Global Package Manager Configuration

## Summary

Add a `lux_package_manager` configuration key to the existing `~/.lux/env.txt` config system, allowing users to override the default lockfile-based package manager detection with a global preference.

## Motivation

Currently lux uses an "auto" mode exclusively — it detects the package manager by checking for lockfiles (`bun.lockb`, `bun.lock`, `pnpm-lock.yaml`, `yarn.lock`) in the target project directory. Users who consistently use a specific package manager (e.g., pnpm) across all projects cannot set a global preference and must rely on lockfile detection each time.

## Design

### Configuration

- **Key**: `lux_package_manager`
- **Valid values**: `auto` | `bun` | `pnpm` | `yarn` | `npm`
- **Storage**: `~/.lux/env.txt` (same file as existing proxy config)
- **Default**: unset (equivalent to `auto`)

### Data Flow

```
lux set lux_package_manager=pnpm
  → config.ts: validate value ∈ {auto,bun,pnpm,yarn,npm}, write to ~/.lux/env.txt

detectPackageManager(cwd)
  → 1. Read ~/.lux/env.txt, get lux_package_manager
  → 2. If unset or "auto" → existing lockfile detection (unchanged)
  → 3. If specific PM set → check if corresponding lockfile exists in cwd
       → Match: use silently
       → Mismatch: logger.warn("Global config is pnpm but detected bun.lock"), still use global config
  → 4. Return PM

lux unset lux_package_manager
  → Remove key from env.txt, falls back to auto
```

### File Changes

| File | Change |
|---|---|
| `src/utils/config.ts` | Add `lux_package_manager` to `ALLOWED_KEYS` |
| `src/utils/deps.ts` | Modify `detectPackageManager()` to check global config first |
| `src/commands/vpn.ts` | Add PM value validation in `handleSet()` |

### Validation Rules

- Only values in `{auto, bun, pnpm, yarn, npm}` are accepted for `lux_package_manager`
- Invalid values produce an error and are not written
- Setting to `auto` is equivalent to unsetting (both result in lockfile detection)

### Default Behavior (No Configuration)

When `lux_package_manager` is not set in env.txt, `detectPackageManager()` runs exactly as it does today — lockfile-based auto-detection. Zero impact on existing users.

### Warning Behavior

When a global PM is configured but the target project has a different lockfile:

- Log a warning via `logger.warn()`
- Still use the globally configured PM (user's explicit choice takes priority)

## Out of Scope

- Project-level package manager override (e.g., `.luxrc`)
- Package manager version pinning
- Custom package manager executables
