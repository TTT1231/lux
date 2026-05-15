import type { Command } from 'commander';
import type { GenerateOptions, VscodePreset } from '../presets/types';
import { VSCODE_PRESETS } from '../presets/vscode';
import { logger } from '../utils/logger';
import { resolvePreset, PresetNotFoundError } from '../utils/errors';
import { generateAllVscode } from '../generators/vscode';
import {
   localPresetExists,
   resetLocalPreset,
   materializeVscodePreset,
   applyLocalVscodePreset,
} from '../core/local-preset';

export function registerVscodeCommand(program: Command) {
   const vscode = program.command('vscode').description('Initialize VSCode config with preset');

   vscode
      .argument('<preset>')
      .option('-F, --force', 'Force overwrite existing files')
      .option('--dry-run', 'Preview without writing files')
      .option('--stylelint', 'Include Stylelint settings and extension')
      .option('--reset', 'Reset local preset and re-materialize from built-in')
      .action(
         async (
            presetName: string,
            options: {
               force?: boolean;
               dryRun?: boolean;
               stylelint?: boolean;
               reset?: boolean;
            },
         ) => {
            const preset = resolvePreset(VSCODE_PRESETS, presetName);
            if (!preset) {
               const err = new PresetNotFoundError(
                  presetName,
                  VSCODE_PRESETS.map(p => p.name),
               );
               logger.error(err.message);
               process.exitCode = 1;
               return;
            }

            const cwd = process.cwd();

            if (options.reset) {
               resetLocalPreset('vscode', presetName);
            }

            const useLocal = localPresetExists('vscode', presetName);

            if (useLocal) {
               executeVscodeLocalPath(cwd, presetName, options);
            } else {
               executeVscodeBuiltinPath(cwd, presetName, preset, options);
            }
         },
      );

   vscode
      .command('list')
      .description('List available vscode presets')
      .action(() => {
         for (const p of VSCODE_PRESETS) {
            console.log(`${p.name.padEnd(12)} ${p.description}`);
         }
      });
}

function executeVscodeLocalPath(
   cwd: string,
   presetName: string,
   options: { force?: boolean; dryRun?: boolean; stylelint?: boolean },
): void {
   logger.log('Using local custom preset');

   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: false,
   };

   const result = applyLocalVscodePreset(cwd, presetName, opts);
   const files = [...result.created, ...result.overwritten];

   if (files.length === 0) {
      logger.warn('No files generated');
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create ${files.join(', ')} from local preset`);
      return;
   }

   logger.log(`Created ${files.join(', ')} from local preset`);
}

function executeVscodeBuiltinPath(
   cwd: string,
   presetName: string,
   preset: VscodePreset,
   options: { force?: boolean; dryRun?: boolean; stylelint?: boolean },
): void {
   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: false,
   };

   const result = generateAllVscode(preset, opts);
   const files = [...result.created, ...result.overwritten];

   if (files.length === 0) {
      logger.warn('No files generated');
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create ${files.join(', ')}`);
      return;
   }

   logger.log(`Created ${files.join(', ')}`);

   materializeVscodePreset(cwd, presetName);
}
