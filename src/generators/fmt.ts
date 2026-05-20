import path from 'node:path';
import type { FmtPreset, GenerateOptions, GenerateResult } from '../presets/types';
import { resolveConflict } from '../core/conflict-resolver';
import { writeFile, fileExists } from '../utils/fs';
import { logger } from '../utils/logger';
import { CONFIG_GETTERS, composeLintStaged, getPresetTsconfigEntries, hasTsconfigFile } from '../core/shared';

type FileAction = 'created' | 'overwritten' | 'skipped';

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
      : content
           .replace(/,?\s*'<lockfile>'/g, '')
           .replace(/'<lockfile>',?\s*/g, '')
           .replace(/<lockfile>\n?/g, '');

   try {
      writeFile(filepath, resolved);
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to write ${filename}: ${message}`);
      return null;
   }

   return exists ? 'overwritten' : 'created';
}

export function generateAllFmt(preset: FmtPreset, opts: GenerateOptions): GenerateResult {
   const result: GenerateResult = { created: [], overwritten: [], skipped: [] };

   for (const { filename, getContent } of CONFIG_GETTERS) {
      if (!opts.stylelint && filename.includes('stylelint')) continue;
      if (!opts.editorconfig && filename === '.editorconfig') continue;
      if (!opts.cspell && filename.includes('cspell')) continue;

      const content = getContent(preset);
      if (content === undefined) continue;

      const action = generateConfigFile(preset, filename, content, opts);
      if (action === 'created') result.created.push(filename);
      else if (action === 'overwritten') result.overwritten.push(filename);
      else if (action === 'skipped') result.skipped.push(filename);
   }

   const tsconfigEntries = getPresetTsconfigEntries(preset);
   if (tsconfigEntries.length > 0) {
      if (hasTsconfigFile(opts.cwd)) {
         result.skipped.push(...tsconfigEntries.map(([filename]) => filename));
      } else {
         for (const [filename, content] of tsconfigEntries) {
            const action = generateConfigFile(preset, filename, content, opts);
            if (action === 'created') result.created.push(filename);
            else if (action === 'overwritten') result.overwritten.push(filename);
            else if (action === 'skipped') result.skipped.push(filename);
         }
      }
   }

   if (opts.lintStaged) {
      const content = preset.lintStaged
         ? preset.lintStaged({ stylelint: opts.stylelint })
         : preset.lintStagedFragments
           ? JSON.stringify(composeLintStaged(preset.lintStagedFragments, { stylelint: opts.stylelint }), null, 2) +
             '\n'
           : undefined;

      if (content) {
         const action = generateConfigFile(preset, '.lintstagedrc.json', content, opts);
         if (action === 'created') result.created.push('.lintstagedrc.json');
         else if (action === 'overwritten') result.overwritten.push('.lintstagedrc.json');
         else if (action === 'skipped') result.skipped.push('.lintstagedrc.json');
      }
   }

   return result;
}
