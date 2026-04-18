import type { Command } from 'commander';
import type { GenerateOptions } from '../presets/types';
import { VSCODE_PRESETS } from '../presets/vscode';
import { logger } from '../utils/logger';
import { resolvePreset } from '../utils/errors';
import { generateAllVscode } from '../generators/vscode';

export function registerVscodeCommand(program: Command) {
   const vscode = program.command('vscode').description('Initialize VSCode config with preset');

   vscode
      .argument('<preset>')
      .option('-F, --force', 'Force overwrite existing files')
      .option('--dry-run', 'Preview without writing files')
      .action(async (presetName: string, options: { force?: boolean; dryRun?: boolean }) => {
         const preset = resolvePreset(VSCODE_PRESETS, presetName);
         if (!preset) return;

         const cwd = process.cwd();
         const opts: GenerateOptions = {
            cwd,
            force: options.force ?? false,
            dryRun: options.dryRun ?? false,
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
      });

   vscode
      .command('list')
      .description('List available vscode presets')
      .action(() => {
         for (const p of VSCODE_PRESETS) {
            console.log(`${p.name.padEnd(12)} ${p.description}`);
         }
      });
}
