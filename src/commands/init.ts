import type { Command } from 'commander';
import chalk from 'chalk';
import { select, isCancel, cancel, outro } from '@clack/prompts';
import { INIT_TOOLS } from '../presets/init';
import { FMT_PRESETS } from '../presets/fmt';
import { VSCODE_PRESETS } from '../presets/vscode';
import { generateInitSkills } from '../generators/init';
import { materializeFmtPreset, materializeVscodePresetFromBuiltin } from '../core/local-preset';
import { detectPackageManager, getLockfileName } from '../utils/deps';
import { fileExists } from '../utils/fs';
import { logger } from '../utils/logger';
import type { GenerateOptions } from '../presets/types';

export function registerInitCommand(program: Command): void {
   program
      .command('init')
      .description('Initialize skills or materialize presets')
      .option('--preset', 'Materialize all presets to ~/.lux/preset/ without writing to cwd')
      .action(async (options: { preset?: boolean }) => {
         if (options.preset) {
            materializeAllPresets();
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

         if (result.skillNames.length === 0) {
            logger.warn('No skill files were copied.');
            return;
         }

         outro(chalk.green(`Success installed lux skills to ${tool.targetDir}`));
      });
}

function materializeAllPresets(): void {
   const cwd = process.cwd();
   const pm = fileExists(`${cwd}/package.json`) ? detectPackageManager(cwd) : undefined;

   const opts: GenerateOptions = {
      cwd,
      force: false,
      dryRun: false,
      stylelint: false,
      editorconfig: false,
      cspell: false,
      husky: false,
      lintStaged: false,
      lockfile: pm ? getLockfileName(pm) : undefined,
   };

   for (const preset of FMT_PRESETS) {
      materializeFmtPreset(preset.name, preset, opts);
   }

   for (const preset of VSCODE_PRESETS) {
      materializeVscodePresetFromBuiltin(preset.name, preset);
   }

   logger.success('All presets materialized to ~/.lux/preset/');
}
