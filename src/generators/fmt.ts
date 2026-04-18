import path from 'node:path';
import type { FmtPreset, GenerateOptions, GenerateResult } from '../presets/types';
import { resolveConflict } from '../core/conflict-resolver';
import { writeFile, fileExists } from '../utils/fs';

/** Maps config filenames to their content getter on a FmtPreset */
const CONFIG_FILES: ReadonlyArray<{
   filename: string;
   getContent: (preset: FmtPreset) => string | undefined;
}> = [
   { filename: 'eslint.config.mjs', getContent: p => p.eslint?.() },
   { filename: '.prettierrc', getContent: p => p.prettier?.() },
   { filename: '.prettierignore', getContent: p => p.prettierIgnore?.() },
   { filename: 'stylelint.config.mjs', getContent: p => p.stylelint?.() },
   { filename: '.stylelintignore', getContent: p => p.stylelintIgnore?.() },
   { filename: 'cspell.json', getContent: p => p.cspell?.() },
   { filename: '.editorconfig', getContent: p => p.editorconfig?.() },
];

type FileAction = 'created' | 'overwritten' | 'skipped';

/**
 * Generate a config file from a preset.
 * Handles conflict resolution, --force, --dry-run.
 * Replaces <lockfile> placeholder with the detected lockfile name.
 */
function generateConfigFile(
   preset: FmtPreset,
   filename: string,
   content: string,
   opts: GenerateOptions,
): FileAction | null {
   const filepath = path.join(opts.cwd, filename);
   const exists = fileExists(filepath);
   const action = resolveConflict(filename, exists, preset, opts.force);

   if (action === 'skip') return 'skipped';

   if (opts.dryRun) return exists ? 'overwritten' : 'created';

   const resolved = opts.lockfile
      ? content.replace(/<lockfile>/g, opts.lockfile)
      : content.replace(/<lockfile>\n?/g, '');
   writeFile(filepath, resolved);
   return exists ? 'overwritten' : 'created';
}

/**
 * Generate all fmt config files for a preset.
 * Returns structured result for the caller to format output.
 */
export function generateAllFmt(preset: FmtPreset, opts: GenerateOptions): GenerateResult {
   const result: GenerateResult = { created: [], overwritten: [], skipped: [] };

   for (const { filename, getContent } of CONFIG_FILES) {
      const content = getContent(preset);
      if (content === undefined) continue;

      const action = generateConfigFile(preset, filename, content, opts);
      if (action === 'created') result.created.push(filename);
      else if (action === 'overwritten') result.overwritten.push(filename);
      else if (action === 'skipped') result.skipped.push(filename);
   }

   return result;
}
