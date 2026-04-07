import type { FmtPreset } from '../presets/types.js'

/** Resolve what action to take when a file conflict occurs */
export function resolveConflict(
  filename: string,
  exists: boolean,
  preset: FmtPreset,
  forceFlag: boolean,
): 'create' | 'overwrite' | 'skip' {
  // Never overwrite list → always skip
  if (exists && preset.neverOverwrite?.includes(filename)) {
    return 'skip'
  }

  // Force overwrite list → always overwrite
  if (exists && preset.forceOverwrite?.includes(filename)) {
    return 'overwrite'
  }

  // File doesn't exist → create
  if (!exists) {
    return 'create'
  }

  // File exists + force flag → overwrite
  if (forceFlag) {
    return 'overwrite'
  }

  // File exists + no force → skip
  return 'skip'
}
