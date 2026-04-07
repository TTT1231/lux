import type { VscodePreset, GenerateOptions } from '../presets/types'
import { mergeVscodeSettings } from '../core/merge-settings'
import { writeJson, readJson, fileExists, writeFile } from '../utils/fs'
import { logger } from '../utils/logger'

/**
 * Generate .vscode/settings.json from a vscode preset.
 * Always uses layered merge with backup.
 */
export function generateVscodeSettings(
  preset: VscodePreset,
  opts: GenerateOptions,
): boolean {
  const settingsPath = `${opts.cwd}/.vscode/settings.json`
  const presetSettings = preset.settings()

  if (opts.dryRun) {
    logger.info(`[dry-run] Would merge .vscode/settings.json`)
    return true
  }

  const existingSettings = readJson<Record<string, unknown>>(settingsPath)

  if (existingSettings) {
    // Backup before merge
    const backupPath = `${settingsPath}.bak`
    if (!fileExists(backupPath)) {
      writeFile(backupPath, JSON.stringify(existingSettings, null, 2) + '\n')
      logger.info(`Backed up .vscode/settings.json → settings.json.bak`)
    }

    const merged = mergeVscodeSettings(presetSettings, existingSettings)
    writeJson(settingsPath, merged)
    logger.overwrite('.vscode/settings.json')
  } else {
    writeJson(settingsPath, presetSettings)
    logger.create('.vscode/settings.json')
  }

  return true
}

/**
 * Generate .vscode/extensions.json from a vscode preset.
 */
export function generateVscodeExtensions(
  preset: VscodePreset,
  opts: GenerateOptions,
): boolean {
  const extensionsPath = `${opts.cwd}/.vscode/extensions.json`
  const extensions = preset.extensions()

  if (opts.dryRun) {
    logger.info(`[dry-run] Would create .vscode/extensions.json`)
    return true
  }

  writeJson(extensionsPath, { recommendations: extensions })
  logger.create('.vscode/extensions.json')
  return true
}

/**
 * Generate all vscode config files for a preset.
 * Returns list of generated filenames.
 */
export function generateAllVscode(preset: VscodePreset, opts: GenerateOptions): string[] {
  const generated: string[] = []
  if (generateVscodeSettings(preset, opts)) generated.push('.vscode/settings.json')
  if (generateVscodeExtensions(preset, opts)) generated.push('.vscode/extensions.json')
  return generated
}
