import type { Command } from 'commander';
import { select, isCancel, cancel, outro } from '@clack/prompts';
import { INIT_TOOLS } from '../presets/init';
import { FMT_PRESETS } from '../presets/fmt';
import { VSCODE_PRESETS } from '../presets/vscode';
import { generateInitSkills } from '../generators/init';
import { materializeFmtPreset, materializeVscodePresetFromBuiltin } from '../core/local-preset';
import { logger } from '../utils/logger';
import type { GenerateOptions } from '../presets/types';

export function registerInitCommand(program: Command): void {
   program
      .command('init')
      .description('Initialize AI coding tool skills in current project')
      .option('--preset', 'Materialize all presets to ~/.lux/preset/ without writing to cwd')
      .action(async (options: { preset?: boolean }) => {
         if (options.preset) {
            await materializeAllPresets();
            return;
         }

         const toolOptions = INIT_TOOLS.map(tool => ({
            value: tool.name,
            label: tool.label,
         }));

         const selected = await select({
            message: 'Which AI coding tool do you use?',
            options: toolOptions,
         });

         if (isCancel(selected)) {
            cancel('Operation cancelled.');
            return;
         }

         const tool = INIT_TOOLS.find(t => t.name === selected);
         if (!tool) {
            logger.error(`Unknown tool: ${String(selected)}`);
            return;
         }

         const cwd = process.cwd();
         const result = generateInitSkills(tool.targetDir, cwd);

         if (result.copiedFiles.length === 0) {
            logger.warn('No skill files were copied.');
            return;
         }

         for (const file of result.copiedFiles) {
            logger.log(`  ${file}`);
         }

         outro(`Skills installed to ${tool.targetDir}/`);
      });
}

async function materializeAllPresets(): Promise<void> {
   const opts: GenerateOptions = {
      cwd: process.cwd(),
      force: false,
      dryRun: false,
      noStylelint: false,
      noEditorconfig: false,
   };

   for (const preset of FMT_PRESETS) {
      materializeFmtPreset(preset.name, preset, opts);
   }

   for (const preset of VSCODE_PRESETS) {
      materializeVscodePresetFromBuiltin(preset.name, preset);
   }

   logger.success('All presets materialized to ~/.lux/preset/');
}
