import type { Command } from 'commander';
import { select, isCancel, cancel, outro } from '@clack/prompts';
import { INIT_TOOLS } from '../presets/init';
import { generateInitSkills } from '../generators/init';
import { logger } from '../utils/logger';

export function registerInitCommand(program: Command): void {
   program
      .command('init')
      .description('Initialize AI coding tool skills in current project')
      .action(async () => {
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
