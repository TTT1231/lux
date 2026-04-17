import type { VscodePreset, GenerateOptions, GenerateResult } from '../presets/types';
import { mergeVscodeSettings } from '../core/merge-settings';
import { writeJson, readJson, fileExists, writeFile } from '../utils/fs';
import { logger } from '../utils/logger';

/**
 * Generate .vscode/settings.json from a vscode preset.
 * Always uses layered merge with backup.
 */
export function generateVscodeSettings(
   preset: VscodePreset,
   opts: GenerateOptions,
): 'created' | 'overwritten' | null {
   const settingsPath = `${opts.cwd}/.vscode/settings.json`;

   if (opts.dryRun) {
      const existingSettings = readJson<Record<string, unknown>>(settingsPath);
      return existingSettings ? 'overwritten' : 'created';
   }

   const presetSettings = preset.settings();
   const existingSettings = readJson<Record<string, unknown>>(settingsPath);

   if (existingSettings) {
      const backupPath = `${settingsPath}.bak`;
      if (!fileExists(backupPath)) {
         writeFile(backupPath, JSON.stringify(existingSettings, null, 2) + '\n');
         logger.log(`Backed up .vscode/settings.json → settings.json.bak`);
      }

      const merged = mergeVscodeSettings(presetSettings, existingSettings);
      writeJson(settingsPath, merged);
      return 'overwritten';
   }

   writeJson(settingsPath, presetSettings);
   return 'created';
}

/**
 * Generate .vscode/extensions.json from a vscode preset.
 */
export function generateVscodeExtensions(
   preset: VscodePreset,
   opts: GenerateOptions,
): 'created' | null {
   if (opts.dryRun) return 'created';

   writeJson(`${opts.cwd}/.vscode/extensions.json`, { recommendations: preset.extensions() });
   return 'created';
}

/**
 * Generate all vscode config files for a preset.
 * Returns structured result for the caller to format output.
 */
export function generateAllVscode(preset: VscodePreset, opts: GenerateOptions): GenerateResult {
   const result: GenerateResult = { created: [], overwritten: [], skipped: [] };

   const settingsAction = generateVscodeSettings(preset, opts);
   if (settingsAction === 'created') result.created.push('.vscode/settings.json');
   else if (settingsAction === 'overwritten') result.overwritten.push('.vscode/settings.json');

   const extAction = generateVscodeExtensions(preset, opts);
   if (extAction === 'created') result.created.push('.vscode/extensions.json');

   return result;
}
