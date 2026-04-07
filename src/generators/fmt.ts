import path from 'node:path'
import type { FmtPreset, GenerateOptions } from '../presets/types'
import { resolveConflict } from '../core/conflict-resolver'
import { writeFile, fileExists } from '../utils/fs'
import { logger } from '../utils/logger'

/** Maps config filenames to their content getter on a FmtPreset */
const CONFIG_FILES: ReadonlyArray<{
  filename: string
  getContent: (preset: FmtPreset) => string | undefined
}> = [
  { filename: 'eslint.config.mjs', getContent: (p) => p.eslint?.() },
  { filename: '.prettierrc', getContent: (p) => p.prettier?.() },
  { filename: '.prettierignore', getContent: (p) => p.prettierIgnore?.() },
  { filename: 'stylelint.config.mjs', getContent: (p) => p.stylelint?.() },
  { filename: '.stylelintignore', getContent: (p) => p.stylelintIgnore?.() },
  { filename: 'cspell.json', getContent: (p) => p.cspell?.() },
  { filename: '.editorconfig', getContent: (p) => p.editorconfig?.() },
]

/**
 * Generate a config file from a preset.
 * Handles conflict resolution, --force, --dry-run.
 */
function generateConfigFile(
  preset: FmtPreset,
  filename: string,
  content: string,
  opts: GenerateOptions,
): boolean {
  const filepath = path.join(opts.cwd, filename)
  const exists = fileExists(filepath)
  const action = resolveConflict(filename, exists, preset, opts.force)

  if (action === 'skip') {
    logger.skip(filename, 'already exists')
    return false
  }

  if (opts.dryRun) {
    logger.info(`[dry-run] Would ${exists ? 'overwrite' : 'create'} ${filename}`)
    return true
  }

  writeFile(filepath, content)
  if (exists) {
    logger.overwrite(filename)
  } else {
    logger.create(filename)
  }
  return true
}

/**
 * Generate all fmt config files for a preset.
 * Returns list of generated filenames.
 */
export function generateAllFmt(preset: FmtPreset, opts: GenerateOptions): string[] {
  const generated: string[] = []

  for (const { filename, getContent } of CONFIG_FILES) {
    const content = getContent(preset)
    if (content === undefined) continue

    if (generateConfigFile(preset, filename, content, opts)) {
      generated.push(filename)
    }
  }

  return generated
}
