import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import type { GenerateOptions } from '../presets/types';
import { FMT_PRESETS } from '../presets/fmt';
import { logger } from '../utils/logger';
import { resolvePreset } from '../utils/errors';
import { generateAllFmt } from '../generators/fmt';
import {
   detectPackageManager,
   getLockfileName,
   getRunPrefix,
   installDevDeps,
   addDepsToManifest,
} from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import { fileExists, readJson, writeJson } from '../utils/fs';
import {
   getLocalPresetDir,
   localPresetExists,
   resetLocalPreset,
   materializeFmtPreset,
   applyLocalFmtPreset,
   resolveLocalDeps,
   InvalidPackageJsonError,
} from '../core/local-preset';

/** Filter stylelint-related scripts when stylelint is not enabled */
function filterStylelintScripts(scripts: Record<string, string>): Record<string, string> {
   const filtered: Record<string, string> = {};
   for (const [key, value] of Object.entries(scripts)) {
      if (key.startsWith('stylelint')) continue;
      filtered[key] = value.replace(/\s*&&\s*<pm>\s+stylelint\S*/g, '');
   }
   return filtered;
}

/** Check if a dependency is NOT stylelint-related */
function isNotStylelintDep(dep: string): boolean {
   if (dep.includes('stylelint')) return false;
   if (dep === 'postcss-html' || dep === 'postcss-scss') return false;
   return true;
}

/** Check if a dependency is NOT editorconfig-related */
function isNotEditorconfigDep(dep: string): boolean {
   return !dep.includes('editorconfig');
}

export function registerFmtCommand(program: Command) {
   const fmt = program.command('fmt').description('Initialize formatting config with preset');

   fmt.argument('<preset>')
      .option('-F, --force', 'Force overwrite existing files')
      .option('--no-install', 'Skip dependency installation')
      .option('--dry-run', 'Preview without writing files')
      .option('--stylelint', 'Include Stylelint config generation')
      .option('--editorconfig', 'Include EditorConfig config generation')
      .option('--reset', 'Reset local preset and re-materialize from built-in')
      .action(
         async (
            presetName: string,
            options: {
               force?: boolean;
               install?: boolean;
               dryRun?: boolean;
               stylelint?: boolean;
               editorconfig?: boolean;
               reset?: boolean;
            },
         ) => {
            const preset = resolvePreset(FMT_PRESETS, presetName);
            if (!preset) return;

            const cwd = process.cwd();

            const pkgPath = path.join(cwd, 'package.json');
            if (fileExists(pkgPath)) {
               try {
                  JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
               } catch {
                  logger.error(
                     'package.json exists but is not valid JSON. Fix it first, then re-run this command.',
                  );
                  return;
               }
            }

            if (options.reset) {
               resetLocalPreset('fmt', presetName);
            }

            const useLocal = localPresetExists('fmt', presetName);

            if (useLocal) {
               await executeLocalPath(cwd, presetName, preset, options);
            } else {
               await executeBuiltinPath(cwd, presetName, preset, options);
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

async function executeLocalPath(
   cwd: string,
   presetName: string,
   preset: { dependencies?: { dev?: string[] }; scripts?: Record<string, string> },
   options: {
      force?: boolean;
      install?: boolean;
      dryRun?: boolean;
      stylelint?: boolean;
      editorconfig?: boolean;
   },
): Promise<void> {
   logger.log('Using local custom preset');

   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: options.editorconfig !== true,
   };

   let result: Awaited<ReturnType<typeof applyLocalFmtPreset>>;
   try {
      result = applyLocalFmtPreset(cwd, presetName, opts);
   } catch (error) {
      if (error instanceof InvalidPackageJsonError) {
         logger.error(
            'package.json exists but is not valid JSON. Fix it first, then re-run this command.',
         );
         return;
      }
      throw error;
   }
   const allFiles = [...result.created, ...result.overwritten];

   if (allFiles.length > 0 || result.skipped.length > 0) {
      logApplyResult(result);
   }

   if (result.scriptsAdded > 0 || result.scriptsSkipped > 0) {
      logger.log(
         `Added ${result.scriptsAdded} script${result.scriptsAdded > 1 ? 's' : ''} to package.json${result.scriptsSkipped > 0 ? ` (${result.scriptsSkipped} skipped)` : ''}`,
      );
   }

   const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;

   if (!pm) return;

   const templatePkgPath = path.join(getLocalPresetDir('fmt', presetName), 'package.json');
   const templatePkg = readJson<{
      devDependencies?: Record<string, string>;
   }>(templatePkgPath);

   if (!templatePkg?.devDependencies) return;

   const depsToInstall = filterDeps(
      Object.keys(templatePkg.devDependencies),
      opts.noStylelint,
      opts.noEditorconfig,
   );

   const projectPkgPath = path.join(cwd, 'package.json');
   const projectPkg = readJson<Record<string, unknown>>(projectPkgPath);
   if (!projectPkg) return;

   const existingDeps = (projectPkg.devDependencies ?? {}) as Record<string, string>;
   const missing = depsToInstall.filter(dep => !existingDeps[dep]);

   if (missing.length === 0) return;

   if (options.install === false) {
      const resolved = resolveLocalDeps(templatePkg.devDependencies);
      const added = await addDepsToManifest(resolved, cwd);
      if (added.length > 0) {
         logger.success(`Added to package.json (skipped install): ${added.join(', ')}`);
      } else {
         logger.log('All dependencies already in package.json');
      }
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would install: ${missing.join(', ')}`);
      return;
   }

   try {
      logger.log(`Installing dependencies with ${pm}...`);
      const resolved = resolveLocalDeps(
         Object.fromEntries(
            Object.entries(templatePkg.devDependencies).filter(([k]) => missing.includes(k)),
         ),
      );
      await installDevDeps(resolved, cwd, pm);
      logger.success('Dependencies installed successfully');
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Dependency installation failed: ${message}. You can install manually.`);
   }
}

async function executeBuiltinPath(
   cwd: string,
   presetName: string,
   preset: {
      scripts?: Record<string, string>;
      dependencies?: { dev?: string[] };
   },
   options: {
      force?: boolean;
      install?: boolean;
      dryRun?: boolean;
      stylelint?: boolean;
      editorconfig?: boolean;
   },
): Promise<void> {
   const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;
   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: options.editorconfig !== true,
      lockfile: pm ? getLockfileName(pm) : undefined,
   };

   const result = generateAllFmt(preset, opts);
   const allFiles = [...result.created, ...result.overwritten];

   if (allFiles.length === 0 && result.skipped.length === 0) {
      logger.warn('No files to generate for this preset');
      return;
   }

   logGenerationResult(result, opts.dryRun);

   if (!opts.dryRun) {
      materializeFmtPreset(presetName, preset as never, opts);
   }

   if (!pm) {
      warnMissingPackageJson(preset, options.install !== false);
      return;
   }

   const scripts =
      opts.noStylelint && preset.scripts ? filterStylelintScripts(preset.scripts) : preset.scripts;

   if (scripts) {
      await injectScripts(scripts, opts, pm);
   }

   if (!preset.dependencies?.dev) return;

   const devDeps = opts.noStylelint
      ? preset.dependencies.dev.filter(isNotStylelintDep)
      : preset.dependencies.dev;

   const finalDeps = opts.noEditorconfig ? devDeps.filter(isNotEditorconfigDep) : devDeps;

   if (options.install === false) {
      const added = await addDepsToManifest(finalDeps, cwd);
      if (added.length > 0) {
         logger.success(`Added to package.json (skipped install): ${added.join(', ')}`);
      } else {
         logger.log('All dependencies already in package.json');
      }
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would install: ${finalDeps.join(', ')}`);
      return;
   }

   try {
      logger.log(`Installing dependencies with ${pm}...`);
      await installDevDeps(finalDeps, cwd, pm);
      logger.success('Dependencies installed successfully');
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Dependency installation failed: ${message}. You can install manually.`);
   }
}

/** Filter deps by stylelint and editorconfig flags */
function filterDeps(deps: string[], noStylelint: boolean, noEditorconfig: boolean): string[] {
   let filtered = deps;
   if (noStylelint) filtered = filtered.filter(isNotStylelintDep);
   if (noEditorconfig) filtered = filtered.filter(isNotEditorconfigDep);
   return filtered;
}

/** Log file generation results, branching on dry-run vs real mode */
function logGenerationResult(
   result: { created: string[]; overwritten: string[]; skipped: string[] },
   dryRun: boolean,
): void {
   const files = [...result.created, ...result.overwritten];

   if (dryRun) {
      if (files.length > 0) {
         logger.log(`[dry-run] Would create ${files.join(', ')}`);
      }
      if (result.skipped.length > 0) {
         logger.log(`[dry-run] Skipped ${result.skipped.join(', ')} (already exists)`);
      }
      return;
   }

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

/** Log apply local preset results */
function logApplyResult(result: {
   created: string[];
   overwritten: string[];
   skipped: string[];
}): void {
   if (result.created.length > 0) {
      logger.log(
         `Created ${summarizeFiles(result.created)} config ${result.created.length} file${result.created.length > 1 ? 's' : ''} from local preset`,
      );
   }
   if (result.overwritten.length > 0) {
      logger.log(
         `Overwritten ${summarizeFiles(result.overwritten)} config ${result.overwritten.length} file${result.overwritten.length > 1 ? 's' : ''} from local preset`,
      );
   }
   if (result.skipped.length > 0) {
      logger.log(
         `Skipped ${result.skipped.length} file${result.skipped.length > 1 ? 's' : ''} (already exists)`,
      );
   }
}

/** Warn about skipped tasks when package.json is missing */
function warnMissingPackageJson(
   preset: { scripts?: Record<string, string>; dependencies?: { dev?: string[] } },
   installEnabled: boolean,
): void {
   const tasks: string[] = [];
   if (preset.scripts) tasks.push('script injection');
   if (preset.dependencies?.dev && installEnabled) tasks.push('dependency installation');
   if (tasks.length > 0) {
      logger.warn(`package.json not found, skipping ${tasks.join(' and ')}`);
   }
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
