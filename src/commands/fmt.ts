import path from 'node:path';
import type { Command } from 'commander';
import type { GenerateOptions } from '../presets/types';
import { FMT_PRESETS } from '../presets/fmt';
import { logger } from '../utils/logger';
import { resolvePreset } from '../utils/errors';
import { generateAllFmt } from '../generators/fmt';
import { detectPackageManager, getLockfileName, getRunPrefix, installDevDeps } from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import { fileExists, readJson, writeJson } from '../utils/fs';

export function registerFmtCommand(program: Command) {
   const fmt = program.command('fmt').description('Initialize formatting config with preset');

   fmt.argument('<preset>')
      .option('-F, --force', 'Force overwrite existing files')
      .option('--no-install', 'Skip dependency installation')
      .option('--dry-run', 'Preview without writing files')
      .action(
         async (
            presetName: string,
            options: { force?: boolean; install?: boolean; dryRun?: boolean },
         ) => {
            const preset = resolvePreset(FMT_PRESETS, presetName);
            if (!preset) return;

            const cwd = process.cwd();
            const pm = fileExists(path.join(cwd, 'package.json'))
               ? detectPackageManager(cwd)
               : undefined;
            const opts: GenerateOptions = {
               cwd,
               force: options.force ?? false,
               dryRun: options.dryRun ?? false,
               lockfile: pm ? getLockfileName(pm) : undefined,
            };

            const result = generateAllFmt(preset, opts);
            const files = [...result.created, ...result.overwritten];

            if (files.length === 0 && result.skipped.length === 0) {
               logger.warn('No files to generate for this preset');
               return;
            }

            if (opts.dryRun) {
               if (files.length > 0) {
                  logger.log(`[dry-run] Would create ${files.join(', ')}`);
               }
               if (result.skipped.length > 0) {
                  logger.log(`[dry-run] Skipped ${result.skipped.join(', ')} (already exists)`);
               }
            } else {
               if (result.created.length > 0) {
                  logger.log(
                     `Created ${summarizeFiles(result.created)} config ${result.created.length} file${result.created.length > 1 ? 's' : ''}`,
                  );
               }
               if (result.overwritten.length > 0) {
                  logger.log(
                     `Overwritten ${summarizeFiles(result.overwritten)} config ${result.overwritten.length} file${result.overwritten.length > 1 ? 's' : ''}`,
                  );
               }
               if (result.skipped.length > 0) {
                  logger.log(
                     `Skipped ${result.skipped.length} file${result.skipped.length > 1 ? 's' : ''} (already exists)`,
                  );
               }
            }

            if (!pm) {
               const tasks: string[] = [];
               if (preset.scripts) tasks.push('script injection');
               if (preset.dependencies?.dev && options.install !== false)
                  tasks.push('dependency installation');
               if (tasks.length > 0) {
                  logger.warn(`package.json not found, skipping ${tasks.join(' and ')}`);
               }
            } else {
               if (preset.scripts) {
                  await injectScripts(preset.scripts, opts, pm);
               }

               if (preset.dependencies?.dev && options.install !== false) {
                  if (opts.dryRun) {
                     logger.log(`[dry-run] Would install: ${preset.dependencies.dev.join(', ')}`);
                  } else {
                     try {
                        logger.log(`Installing dependencies with ${pm}...`);
                        await installDevDeps(preset.dependencies.dev, cwd, pm);
                     } catch {
                        logger.warn('Dependency installation failed. You can install manually.');
                     }
                  }
               } else if (preset.dependencies?.dev && options.install === false) {
                  const deps = preset.dependencies.dev;
                  logger.log(`Dependencies: ${deps.join(', ')}`);
               }
            }
         },
      );

   fmt.command('list')
      .description('List available fmt presets')
      .action(() => {
         for (const p of FMT_PRESETS) {
            console.log(`${p.name.padEnd(12)} ${p.description}`);
         }
      });
}

/** Map filenames to tool categories: eslint, prettier, stylelint, cspell, editorconfig */
function summarizeFiles(filenames: string[]): string {
   const categories = new Set<string>();
   for (const name of filenames) {
      if (name.includes('eslint')) categories.add('eslint');
      else if (name.includes('prettier')) categories.add('prettier');
      else if (name.includes('stylelint')) categories.add('stylelint');
      else if (name.includes('cspell')) categories.add('cspell');
      else if (name.includes('editorconfig')) categories.add('editorconfig');
   }
   return [...categories].join(', ');
}

/** Inject scripts into package.json, respecting conflict handling */
async function injectScripts(
   scripts: Record<string, string>,
   opts: GenerateOptions,
   pm: PackageManager,
): Promise<void> {
   const pkgPath = path.join(opts.cwd, 'package.json');
   const pkg = readJson<Record<string, unknown>>(pkgPath);

   if (!pkg) {
      logger.warn('package.json not found, skipping script injection');
      return;
   }

   const existingScripts = (pkg.scripts ?? {}) as Record<string, string>;
   const prefix = getRunPrefix(pm);

   const resolvedScripts: Record<string, string> = {};
   for (const [key, value] of Object.entries(scripts)) {
      resolvedScripts[key] = value.replace(/<pm>/g, prefix);
   }

   let added = 0;
   let skipped = 0;

   for (const [key, value] of Object.entries(resolvedScripts)) {
      if (existingScripts[key] !== undefined && !opts.force) {
         skipped++;
         continue;
      }

      if (opts.dryRun) {
         added++;
         continue;
      }

      existingScripts[key] = value;
      added++;
   }

   if (added > 0 && !opts.dryRun) {
      pkg.scripts = existingScripts;
      writeJson(pkgPath, pkg);
      logger.log(
         `Added ${added} script${added > 1 ? 's' : ''} to package.json${skipped > 0 ? ` (${skipped} skipped)` : ''}`,
      );
   }
}
