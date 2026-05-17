import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import type { GenerateOptions, FmtPreset } from '../presets/types';
import { FMT_PRESETS } from '../presets/fmt';
import { logger } from '../utils/logger';
import { PresetNotFoundError } from '../utils/errors';
import { generateAllFmt } from '../generators/fmt';
import {
   detectPackageManager,
   getLockfileName,
   getRunPrefix,
   installDevDeps,
   addDepsToManifest,
} from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { fileExists, readJson, writeJson, ensureDir, writeFile } from '../utils/fs';
import {
   getLocalPresetDir,
   localPresetExists,
   resetLocalPreset,
   materializeFmtPreset,
   applyLocalFmtPreset,
   resolveLocalDeps,
   InvalidPackageJsonError,
   filterScripts,
   isValidCustomPreset,
   listCustomPresets,
   detectPresetCapabilities,
} from '../core/local-preset';
import {
   isNotStylelintDep,
   isNotEditorconfigDep,
   isNotCspellDep,
   isNotHuskyDep,
   isNotLintStagedDep,
} from '../core/shared';

interface FmtCommandOptions {
   force?: boolean;
   install?: boolean;
   dryRun?: boolean;
   stylelint?: boolean;
   editorconfig?: boolean;
   cspell?: boolean;
   husky?: boolean;
   lintStaged?: boolean;
   reset?: boolean;
}

export function registerFmtCommand(program: Command) {
   const fmt = program.command('fmt').description('Initialize formatting config with preset');

   fmt.argument('<preset>')
      .option('-F, --force', 'Force overwrite existing files')
      .option('--no-install', 'Skip dependency installation')
      .option('--dry-run', 'Preview without writing files')
      .option('--stylelint', 'Include Stylelint config generation')
      .option('--editorconfig', 'Include EditorConfig config generation')
      .option('--cspell', 'Include CSpell config generation')
      .option('--husky', 'Initialize husky for Git hooks')
      .option('--lint-staged', 'Set up lint-staged (implies --husky)')
      .option('--reset', 'Reset local preset and re-materialize from built-in')
      .action(async (presetName: string, options: FmtCommandOptions) => {
         const builtinPreset = FMT_PRESETS.find(p => p.name === presetName);
         const isBuiltin = builtinPreset !== undefined;

         // --reset + custom preset: warn and abort
         if (options.reset && !isBuiltin) {
            logger.warn(`"${presetName}" is a custom preset, --reset has no builtin to restore`);
            return;
         }

         const cwd = process.cwd();

         const pkgPath = path.join(cwd, 'package.json');
         if (fileExists(pkgPath) && readJson(pkgPath) === null) {
            logger.error(
               'package.json exists but is not valid JSON. Fix it first, then re-run this command.',
            );
            return;
         }

         if (isBuiltin) {
            // Builtin path
            if (options.reset) {
               resetLocalPreset('fmt', presetName);
            }

            const useLocal = localPresetExists('fmt', presetName);
            if (useLocal) {
               await executeLocalPath(cwd, presetName, options);
            } else {
               await executeBuiltinPath(cwd, presetName, builtinPreset, options);
            }
         } else if (isValidCustomPreset(presetName)) {
            // Custom preset path
            await executeLocalPath(cwd, presetName, options);
         } else {
            // Not found: error with fuzzy match against all names
            const builtinNames = new Set(FMT_PRESETS.map(p => p.name));
            const customNames = listCustomPresets().filter(n => !builtinNames.has(n));
            const allNames = [...builtinNames, ...customNames];
            const err = new PresetNotFoundError(presetName, allNames);
            logger.error(err.message);
            process.exitCode = 1;
         }
      });

   fmt.command('list')
      .description('List available fmt presets')
      .action(() => {
         const builtinNames = new Set(FMT_PRESETS.map(p => p.name));

         for (const p of FMT_PRESETS) {
            logger.log(`${p.name.padEnd(12)} ${p.description}`);
         }

         const customs = listCustomPresets().filter(name => !builtinNames.has(name));
         for (const name of customs) {
            logger.log(`${name.padEnd(12)} ${chalk.yellow('(custom)')}`);
         }
      });
}

async function executeLocalPath(
   cwd: string,
   presetName: string,
   options: FmtCommandOptions,
): Promise<void> {
   logger.log('Using local custom preset');

   const caps = detectPresetCapabilities(presetName);
   if (options.stylelint && !caps.hasStylelint) {
      logger.warn(
         '--stylelint has no effect: this custom preset has no stylelint config or dependencies',
      );
   }
   if (options.editorconfig && !caps.hasEditorconfig) {
      logger.warn(
         '--editorconfig has no effect: this custom preset has no editorconfig config or dependencies',
      );
   }
   if (options.cspell && !caps.hasCspell) {
      logger.warn(
         '--cspell has no effect: this custom preset has no cspell config or dependencies',
      );
   }
   if (options.lintStaged && !caps.hasLintStaged) {
      logger.warn(
         '--lint-staged has no effect: this custom preset has no lint-staged config or dependencies',
      );
   }

   const noHusky = options.husky !== true && options.lintStaged !== true;
   const noLintStaged = options.lintStaged !== true;

   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: options.editorconfig !== true,
      noCspell: options.cspell !== true,
      noHusky,
      noLintStaged,
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
      opts.noCspell,
      opts.noHusky,
      opts.noLintStaged,
   );

   const projectPkgPath = path.join(cwd, 'package.json');
   const projectPkg = readJson<Record<string, unknown>>(projectPkgPath);
   if (!projectPkg) return;

   const existingDeps = (projectPkg.devDependencies ?? {}) as Record<string, string>;
   const missing = depsToInstall.filter(dep => !existingDeps[dep]);

   if (missing.length === 0) return;

   if (opts.dryRun) {
      logger.log(`[dry-run] Would add to package.json: ${missing.join(', ')}`);
      if (!opts.noHusky) {
         await initHusky(cwd, pm, opts);
      }
      return;
   }

   if (options.install === false) {
      try {
         const filteredTemplateDeps = Object.fromEntries(
            Object.entries(templatePkg.devDependencies).filter(([k]) => missing.includes(k)),
         );
         const resolved = resolveLocalDeps(filteredTemplateDeps);
         const added = await addDepsToManifest(resolved, cwd);
         if (added.length > 0) {
            logger.success(`Added to package.json (skipped install): ${added.join(', ')}`);
         } else {
            logger.log('All dependencies already in package.json');
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         logger.warn(`Failed to fetch versions: ${message}. You can add dependencies manually.`);
      }
      if (!opts.noHusky) {
         await initHusky(cwd, pm, opts);
      }
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

   // Husky initialization
   if (!opts.noHusky) {
      await initHusky(cwd, pm, opts);
   }
}

async function executeBuiltinPath(
   cwd: string,
   presetName: string,
   preset: FmtPreset,
   options: FmtCommandOptions,
): Promise<void> {
   const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;
   const noHusky = options.husky !== true && options.lintStaged !== true;
   const noLintStaged = options.lintStaged !== true;
   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: options.editorconfig !== true,
      noCspell: options.cspell !== true,
      noHusky,
      noLintStaged,
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
      materializeFmtPreset(presetName, preset, opts);
   }

   if (!pm) {
      warnMissingPackageJson(preset, options.install !== false);
      return;
   }

   const scripts = preset.scripts
      ? filterScripts(
           preset.scripts,
           opts.noStylelint,
           opts.noEditorconfig,
           opts.noCspell,
           opts.noLintStaged,
        )
      : undefined;

   if (scripts) {
      await injectScripts(scripts, opts, pm);
   }

   if (!preset.dependencies?.dev) return;

   const devDeps = opts.noStylelint
      ? preset.dependencies.dev.filter(isNotStylelintDep)
      : preset.dependencies.dev;

   const noEditorconfigDeps = opts.noEditorconfig ? devDeps.filter(isNotEditorconfigDep) : devDeps;

   const noCspellDeps = opts.noCspell
      ? noEditorconfigDeps.filter(isNotCspellDep)
      : noEditorconfigDeps;

   const noHuskyDeps = opts.noHusky ? noCspellDeps.filter(isNotHuskyDep) : noCspellDeps;

   const finalDeps = opts.noLintStaged ? noHuskyDeps.filter(isNotLintStagedDep) : noHuskyDeps;

   if (opts.dryRun) {
      logger.log(`[dry-run] Would add to package.json: ${finalDeps.join(', ')}`);
      if (!opts.noHusky) {
         await initHusky(cwd, pm, opts);
      }
      return;
   }

   if (options.install === false) {
      try {
         const added = await addDepsToManifest(finalDeps, cwd);
         if (added.length > 0) {
            logger.success(`Added to package.json (skipped install): ${added.join(', ')}`);
         } else {
            logger.log('All dependencies already in package.json');
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         logger.warn(`Failed to fetch versions: ${message}. You can add dependencies manually.`);
      }
      if (!opts.noHusky) {
         await initHusky(cwd, pm, opts);
      }
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

   // Husky initialization
   if (!opts.noHusky) {
      await initHusky(cwd, pm, opts);
   }
}

/** Filter deps by opt-in flags */
function filterDeps(
   deps: string[],
   noStylelint: boolean,
   noEditorconfig: boolean,
   noCspell: boolean,
   noHusky: boolean,
   noLintStaged: boolean,
): string[] {
   let filtered = deps;
   if (noStylelint) filtered = filtered.filter(isNotStylelintDep);
   if (noEditorconfig) filtered = filtered.filter(isNotEditorconfigDep);
   if (noCspell) filtered = filtered.filter(isNotCspellDep);
   if (noHusky) filtered = filtered.filter(isNotHuskyDep);
   if (noLintStaged) filtered = filtered.filter(isNotLintStagedDep);
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

/** Map filenames to tool categories: eslint, prettier, stylelint, cspell, editorconfig, husky, lint-staged */
function summarizeFiles(filenames: string[]): string {
   const categories = new Set<string>();
   for (const name of filenames) {
      if (name.includes('eslint')) categories.add('eslint');
      else if (name.includes('prettier')) categories.add('prettier');
      else if (name.includes('stylelint')) categories.add('stylelint');
      else if (name.includes('cspell')) categories.add('cspell');
      else if (name.includes('editorconfig')) categories.add('editorconfig');
      else if (name.includes('husky')) categories.add('husky');
      else if (name.includes('lintstagedrc')) categories.add('lint-staged');
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

/** Initialize husky: create .husky/pre-commit, inject init script, execute once */
async function initHusky(cwd: string, pm: PackageManager, opts: GenerateOptions): Promise<void> {
   const pkgPath = path.join(cwd, 'package.json');
   const pkg = readJson<Record<string, unknown>>(pkgPath);
   if (!pkg) {
      logger.warn('package.json not found, skipping husky setup');
      return;
   }

   const prefix = getRunPrefix(pm);
   const isYarn = pm === 'yarn';
   const initScriptName = isYarn ? 'postinstall' : 'prepare';
   const hookCommand = opts.noLintStaged ? `${prefix} lint` : `${prefix} lint-staged`;

   // 1. Create .husky/pre-commit
   const huskyDir = path.join(cwd, '.husky');
   const preCommitPath = path.join(huskyDir, 'pre-commit');

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create .husky/pre-commit with: ${hookCommand}`);
      logger.log(`[dry-run] Would inject "${initScriptName}": "husky" script`);
      logger.log(`[dry-run] Would run ${prefix} ${initScriptName}`);
      return;
   }

   if (fileExists(preCommitPath) && !opts.force) {
      logger.log('Skipped .husky/pre-commit (already exists)');
   } else {
      ensureDir(huskyDir);
      writeFile(preCommitPath, `${hookCommand}\n`);
      fs.chmodSync(preCommitPath, 0o755);
   }

   // 2. Inject init script into package.json
   const scripts = (pkg.scripts ?? {}) as Record<string, string>;
   if (scripts[initScriptName] !== undefined && !opts.force) {
      logger.log(`Skipped script "${initScriptName}" (already exists)`);
   } else {
      scripts[initScriptName] = 'husky';
      pkg.scripts = scripts;
      writeJson(pkgPath, pkg);
      logger.log(`Injected "${initScriptName}" script for husky`);
   }

   // 3. Execute init script once
   logger.log(`Running ${prefix} ${initScriptName} to initialize git hooks...`);
   try {
      const args = isYarn ? ['postinstall'] : ['run', initScriptName];
      const { exitCode } = await execFileNoThrow(pm, args, { cwd });
      if (exitCode === 0) {
         logger.success('Husky initialized successfully');
      } else {
         logger.warn(`Husky init script exited with code ${exitCode}`);
      }
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
         `Husky init failed: ${message}. You can run "${prefix} ${initScriptName}" manually.`,
      );
   }
}
