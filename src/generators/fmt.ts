import path from 'node:path'
import type { FmtPreset } from '../presets/types.js'
import { resolveConflict } from '../core/conflict-resolver.js'
import { writeFile, fileExists } from '../utils/fs.js'
import { logger } from '../utils/logger.js'

export interface GenerateOptions {
  cwd: string
  force: boolean
  dryRun: boolean
}

/**
 * Generate a config file from a preset function.
 * Handles conflict resolution, --force, --dry-run.
 */
function generateConfigFile(
  preset: FmtPreset,
  filename: string,
  getContent: () => string | undefined,
  opts: GenerateOptions,
): boolean {
  const content = getContent()
  if (content === undefined) return false

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

/** Generate eslint.config.mjs */
export function generateEslint(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, 'eslint.config.mjs', () => preset.eslint?.(), opts)
}

/** Generate .prettierrc */
export function generatePrettier(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, '.prettierrc', () => preset.prettier?.(), opts)
}

/** Generate .prettierignore */
export function generatePrettierIgnore(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, '.prettierignore', () => preset.prettierIgnore?.(), opts)
}

/** Generate stylelint.config.mjs */
export function generateStylelint(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, 'stylelint.config.mjs', () => preset.stylelint?.(), opts)
}

/** Generate .stylelintignore */
export function generateStylelintIgnore(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, '.stylelintignore', () => preset.stylelintIgnore?.(), opts)
}

/** Generate cspell.json */
export function generateCspell(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, 'cspell.json', () => preset.cspell?.(), opts)
}

/** Generate .editorconfig */
export function generateEditorconfig(preset: FmtPreset, opts: GenerateOptions) {
  return generateConfigFile(preset, '.editorconfig', () => preset.editorconfig?.(), opts)
}

/**
 * Generate all fmt config files for a preset.
 * Returns list of generated filenames.
 */
export function generateAllFmt(preset: FmtPreset, opts: GenerateOptions): string[] {
  const generated: string[] = []

  const generators = [
    generateEslint,
    generatePrettier,
    generatePrettierIgnore,
    generateStylelint,
    generateStylelintIgnore,
    generateCspell,
    generateEditorconfig,
  ] as Array<(p: FmtPreset, o: GenerateOptions) => boolean>

  const filenames = [
    'eslint.config.mjs',
    '.prettierrc',
    '.prettierignore',
    'stylelint.config.mjs',
    '.stylelintignore',
    'cspell.json',
    '.editorconfig',
  ]

  for (let i = 0; i < generators.length; i++) {
    if (generators[i](preset, opts)) {
      generated.push(filenames[i])
    }
  }

  return generated
}
