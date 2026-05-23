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
   getExecPrefix,
   installDevDeps,
   addDepsToManifest,
} from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { fileExists, readJson, writeJson, ensureDir, writeFile, readFile } from '../utils/fs';
import {
   getLocalPresetDir,
   localPresetExists,
   resetLocalPreset,
   materializeFmtPreset,
   applyLocalFmtPreset,
   InvalidPackageJsonError,
   filterScripts,
   isValidCustomPreset,
   listCustomPresets,
   detectPresetCapabilities,
} from '../core/local-preset';
import { collectDepsFromRegistry, loadDepsJson } from '../core/shared';

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

interface MissingPackageJsonCapabilities {
   scripts?: Record<string, string>;
   deps?: unknown;
   husky?: boolean;
}

const HUSKY_HOOKS = [
   'pre-commit',
   'pre-merge-commit',
   'prepare-commit-msg',
   'commit-msg',
   'post-commit',
   'applypatch-msg',
   'pre-applypatch',
   'post-applypatch',
   'pre-rebase',
   'post-rewrite',
   'post-checkout',
   'post-merge',
   'pre-push',
   'pre-auto-gc',
] as const;

const HUSKY_RUNNER = `#!/usr/bin/env sh
[ "$HUSKY" = "2" ] && set -x
hook_name=$(basename "$0")
hook_script="$(dirname "$(dirname "$0")")/$hook_name"

[ ! -f "$hook_script" ] && exit 0
[ "\${HUSKY-}" = "0" ] && exit 0

export PATH="node_modules/.bin:$PATH"
sh -e "$hook_script" "$@"
exit_code=$?

[ $exit_code != 0 ] && echo "husky - $hook_name script failed (code $exit_code)"
[ $exit_code = 127 ] && echo "husky - command not found in PATH=$PATH"
exit $exit_code
`;

const HUSKY_DEPRECATED_SH = `echo "husky - DEPRECATED

Please remove the following two lines from $0:

#!/usr/bin/env sh
. \\"\\$(dirname -- \\"\\$0\\")/_/husky.sh\\"

They WILL FAIL in v10.0.0
"
`;

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
            process.exitCode = 1;
            return;
         }

         const cwd = process.cwd();

         const pkgPath = path.join(cwd, 'package.json');
         if (fileExists(pkgPath) && readJson(pkgPath) === null) {
            logger.error('package.json exists but is not valid JSON. Fix it first, then re-run this command.');
            process.exitCode = 1;
            return;
         }

         if (isBuiltin) {
            // Builtin path
            if (options.reset) {
               if (options.dryRun) {
                  const dir = getLocalPresetDir('fmt', presetName);
                  logger.log(`[dry-run] Would reset local preset: ${dir}`);
               } else {
                  resetLocalPreset('fmt', presetName);
               }
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

async function executeLocalPath(cwd: string, presetName: string, options: FmtCommandOptions): Promise<void> {
   logger.log('Using local custom preset');

   const caps = detectPresetCapabilities(presetName);
   if (options.stylelint && !caps.hasStylelint) {
      logger.warn('--stylelint has no effect: this custom preset has no stylelint config or dependencies');
   }
   if (options.editorconfig && !caps.hasEditorconfig) {
      logger.warn('--editorconfig has no effect: this custom preset has no editorconfig config or dependencies');
   }
   if (options.cspell && !caps.hasCspell) {
      logger.warn('--cspell has no effect: this custom preset has no cspell config or dependencies');
   }
   if (options.lintStaged && !caps.hasLintStaged) {
      logger.warn('--lint-staged has no effect: this custom preset has no lint-staged config or dependencies');
   }

   const husky = options.husky === true || options.lintStaged === true;
   const lintStaged = options.lintStaged === true;

   const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;

   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      stylelint: options.stylelint === true,
      editorconfig: options.editorconfig === true,
      cspell: options.cspell === true,
      husky,
      lintStaged,
      lockfile: pm ? getLockfileName(pm) : undefined,
   };

   // Read hook content from materialized preset
   const hookTemplatePath = path.join(getLocalPresetDir('fmt', presetName), '.husky', 'pre-commit');
   let hookContent: string | undefined;
   if (opts.husky && fileExists(hookTemplatePath)) {
      hookContent = readFile(hookTemplatePath) ?? undefined;
      // Strip lint-staged from hook content if --lint-staged is not passed
      if (hookContent && !opts.lintStaged) {
         hookContent = hookContent.replace(/<pmx>\s*lint-staged/g, '<pm> type:check');
      }
   }

   let result: Awaited<ReturnType<typeof applyLocalFmtPreset>>;
   try {
      result = applyLocalFmtPreset(cwd, presetName, opts);
   } catch (error) {
      if (error instanceof InvalidPackageJsonError) {
         logger.error('package.json exists but is not valid JSON. Fix it first, then re-run this command.');
         process.exitCode = 1;
         return;
      }
      throw error;
   }
   const allFiles = [...result.created, ...result.overwritten];

   if (allFiles.length > 0 || result.skipped.length > 0) {
      logApplyResult(result, opts.dryRun);
   }

   if (result.scriptsAdded > 0 || result.scriptsSkipped > 0) {
      logger.log(
         `Added ${result.scriptsAdded} script${result.scriptsAdded > 1 ? 's' : ''} to package.json${result.scriptsSkipped > 0 ? ` (${result.scriptsSkipped} skipped)` : ''}`,
      );
   }

   if (!pm) {
      warnMissingPackageJson(getLocalMissingPackageJsonCapabilities(presetName, opts), options.install !== false);
      return;
   }

   const presetDir = getLocalPresetDir('fmt', presetName);
   let registry;
   try {
      registry = loadDepsJson(presetDir);
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(message);
      process.exitCode = 1;
      return;
   }

   const depsToInstall = collectDepsFromRegistry(registry, {
      stylelint: opts.stylelint,
      cspell: opts.cspell,
      editorconfig: opts.editorconfig,
      husky: opts.husky,
      lintStaged: opts.lintStaged,
   });

   const projectPkgPath = path.join(cwd, 'package.json');
   const projectPkg = readJson<Record<string, unknown>>(projectPkgPath);
   if (!projectPkg) return;

   const existingDeps = (projectPkg.devDependencies ?? {}) as Record<string, string>;
   const depNames = Object.keys(depsToInstall);
   const missing = depNames.filter(dep => !existingDeps[dep]);

   if (missing.length === 0) {
      if (opts.husky) {
         await initHusky(cwd, pm, opts, hookContent);
      }
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would add to package.json: ${missing.join(', ')}`);
      if (opts.husky) {
         await initHusky(cwd, pm, opts, hookContent);
      }
      return;
   }

   if (options.install === false) {
      try {
         const added = await addDepsToManifest(missing, cwd);
         if (added.length > 0) {
            logger.success(`Added to package.json (skipped install): ${added.join(', ')}`);
         } else {
            logger.log('All dependencies already in package.json');
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         logger.warn(`Failed to fetch versions: ${message}. You can add dependencies manually.`);
      }
      if (opts.husky) {
         await initHusky(cwd, pm, opts, hookContent);
      }
      return;
   }

   try {
      logger.log(`Installing dependencies with ${pm}...`);
      await installDevDeps(missing, cwd, pm);
      logger.success('Dependencies installed successfully');
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Dependency installation failed: ${message}. You can install manually.`);
   }

   // Husky initialization
   if (opts.husky) {
      await initHusky(cwd, pm, opts, hookContent);
   }
}

async function executeBuiltinPath(
   cwd: string,
   presetName: string,
   preset: FmtPreset,
   options: FmtCommandOptions,
): Promise<void> {
   const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;
   const husky = options.husky === true || options.lintStaged === true;
   const lintStaged = options.lintStaged === true;
   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      stylelint: options.stylelint === true,
      editorconfig: options.editorconfig === true,
      cspell: options.cspell === true,
      husky,
      lintStaged,
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

   const scripts = preset.scripts
      ? filterScripts(preset.scripts, {
           stylelint: opts.stylelint,
           editorconfig: opts.editorconfig,
           cspell: opts.cspell,
           lintStaged: opts.lintStaged,
        })
      : undefined;

   if (!pm) {
      warnMissingPackageJson({ scripts, deps: preset.deps, husky: opts.husky }, options.install !== false);
      return;
   }

   if (scripts) {
      await injectScripts(scripts, opts, pm);
   }

   if (!preset.deps) return;

   const depsToInstall = collectDepsFromRegistry(preset.deps, {
      stylelint: opts.stylelint,
      cspell: opts.cspell,
      editorconfig: opts.editorconfig,
      husky: opts.husky,
      lintStaged: opts.lintStaged,
   });

   const projectPkgPath = path.join(cwd, 'package.json');
   const projectPkg = readJson<Record<string, unknown>>(projectPkgPath);
   if (!projectPkg) return;

   const existingDeps = (projectPkg.devDependencies ?? {}) as Record<string, string>;
   const depNames = Object.keys(depsToInstall);
   const missing = depNames.filter(dep => !existingDeps[dep]);

   const hookContent = preset.husky?.({ lintStaged: opts.lintStaged });

   if (missing.length === 0) {
      if (opts.husky) {
         await initHusky(cwd, pm, opts, hookContent);
      }
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would add to package.json: ${missing.join(', ')}`);
      if (opts.husky) {
         await initHusky(cwd, pm, opts, hookContent);
      }
      return;
   }

   if (options.install === false) {
      try {
         const added = await addDepsToManifest(missing, cwd);
         if (added.length > 0) {
            logger.success(`Added to package.json (skipped install): ${added.join(', ')}`);
         } else {
            logger.log('All dependencies already in package.json');
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         logger.warn(`Failed to fetch versions: ${message}. You can add dependencies manually.`);
      }
      if (opts.husky) {
         await initHusky(cwd, pm, opts, hookContent);
      }
      return;
   }

   try {
      logger.log(`Installing dependencies with ${pm}...`);
      await installDevDeps(missing, cwd, pm);
      logger.success('Dependencies installed successfully');
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Dependency installation failed: ${message}. You can install manually.`);
   }

   // Husky initialization
   if (opts.husky) {
      await initHusky(cwd, pm, opts, hookContent);
   }
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
         `Overwritten ${summarizeFiles(result.overwritten)} config ${result.overwritten.length > 1 ? 's' : ''}`,
      );
   }
   if (result.skipped.length > 0) {
      logger.log(`Skipped ${result.skipped.length} file${result.skipped.length > 1 ? 's' : ''} (already exists)`);
   }
}

/** Log apply local preset results */
function logApplyResult(result: { created: string[]; overwritten: string[]; skipped: string[] }, dryRun = false): void {
   const createVerb = dryRun ? 'Would create' : 'Created';
   const overwriteVerb = dryRun ? 'Would overwrite' : 'Overwritten';
   if (result.created.length > 0) {
      logger.log(
         `${createVerb} ${summarizeFiles(result.created)} config ${result.created.length} file${result.created.length > 1 ? 's' : ''} from local preset`,
      );
   }
   if (result.overwritten.length > 0) {
      logger.log(
         `${overwriteVerb} ${summarizeFiles(result.overwritten)} config ${result.overwritten.length > 1 ? 's' : ''} from local preset`,
      );
   }
   if (result.skipped.length > 0) {
      logger.log(`Skipped ${result.skipped.length} file${result.skipped.length > 1 ? 's' : ''} (already exists)`);
   }
}

/** Warn about skipped tasks when package.json is missing */
function warnMissingPackageJson(capabilities: MissingPackageJsonCapabilities, installEnabled: boolean): void {
   const tasks: string[] = [];
   if (capabilities.scripts && Object.keys(capabilities.scripts).length > 0) tasks.push('script injection');
   if (capabilities.deps) tasks.push(installEnabled ? 'dependency installation' : 'dependency manifest update');
   if (capabilities.husky) tasks.push('husky setup');
   if (tasks.length > 0) {
      logger.warn(`package.json not found, skipping ${formatTaskList(tasks)}`);
   }
}

function getLocalMissingPackageJsonCapabilities(
   presetName: string,
   opts: GenerateOptions,
): MissingPackageJsonCapabilities {
   const presetDir = getLocalPresetDir('fmt', presetName);
   const templatePkg = readJson<{ scripts?: Record<string, string> }>(path.join(presetDir, 'package.json'));
   const scripts = templatePkg?.scripts
      ? filterScripts(templatePkg.scripts, {
           stylelint: opts.stylelint,
           editorconfig: opts.editorconfig,
           cspell: opts.cspell,
           lintStaged: opts.lintStaged,
        })
      : undefined;

   return {
      scripts,
      deps: fileExists(path.join(presetDir, 'deps.json')),
      husky: opts.husky,
   };
}

function formatTaskList(tasks: string[]): string {
   if (tasks.length <= 1) return tasks[0] ?? '';
   if (tasks.length === 2) return `${tasks[0]} and ${tasks[1]}`;
   return `${tasks.slice(0, -1).join(', ')}, and ${tasks[tasks.length - 1]}`;
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
      else if (name.includes('tsconfig')) categories.add('tsconfig');
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

   const rawScripts = pkg.scripts ?? {};
   if (typeof rawScripts !== 'object' || Array.isArray(rawScripts)) {
      logger.warn(
         `package.json "scripts" is ${Array.isArray(rawScripts) ? 'an array' : typeof rawScripts}, expected an object — treating as empty`,
      );
      pkg.scripts = {};
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

/** Initialize husky: inject init script, create support files directly, then write pre-commit hook */
async function initHusky(cwd: string, pm: PackageManager, opts: GenerateOptions, hookContent?: string): Promise<void> {
   const gitDir = path.join(cwd, '.git');
   if (!fileExists(gitDir)) {
      logger.warn('Git repository not found. Husky and lint-staged require a git repo — skipping.');
      return;
   }

   const pkgPath = path.join(cwd, 'package.json');
   const pkg = readJson<Record<string, unknown>>(pkgPath);
   if (!pkg) {
      logger.warn('package.json not found, skipping husky setup');
      return;
   }

   const isYarn = pm === 'yarn';
   const initScriptName = isYarn ? 'postinstall' : 'prepare';
   const prefix = getRunPrefix(pm);

   // Resolve hook template with tag replacement
   const template = hookContent ?? (opts.lintStaged ? '<pmx> lint-staged\n' : '<pm> type:check\n');
   const resolvedHook = template.replace(/<pmx>/g, getExecPrefix(pm)).replace(/<pm>/g, prefix);

   const huskyDir = path.join(cwd, '.husky');
   const preCommitPath = path.join(huskyDir, 'pre-commit');

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create .husky/pre-commit with: ${resolvedHook.trim()}`);
      logger.log('[dry-run] Would initialize husky support files under .husky/_');
      logger.log(`[dry-run] Would inject "${initScriptName}": "husky" script`);
      return;
   }

   // 1. Inject init script into package.json
   const scripts = (pkg.scripts ?? {}) as Record<string, string>;
   if (scripts[initScriptName] !== undefined && !opts.force) {
      logger.log(`Skipped script "${initScriptName}" (already exists)`);
   } else {
      scripts[initScriptName] = 'husky';
      pkg.scripts = scripts;
      writeJson(pkgPath, pkg);
      logger.log(`Injected "${initScriptName}" script for husky`);
   }

   // 2. Create Husky support files directly so --no-install does not depend on node_modules/.bin/husky.
   const bootstrapped = await ensureHuskyBootstrap(cwd, huskyDir);
   if (bootstrapped) {
      logger.success('Husky support files initialized successfully');
   }

   // 3. Overwrite .husky/pre-commit with correct content (replaces husky's default)
   //    Always write — husky init creates default content that must be replaced.
   ensureDir(huskyDir);
   writeFile(preCommitPath, resolvedHook);
   fs.chmodSync(preCommitPath, 0o755);
}

async function ensureHuskyBootstrap(cwd: string, huskyDir: string): Promise<boolean> {
   const hooksDir = path.join(huskyDir, '_');
   const runnerPath = path.join(hooksDir, 'h');
   const preCommitShimPath = path.join(hooksDir, 'pre-commit');

   const { exitCode, stderr } = await execFileNoThrow('git', ['config', 'core.hooksPath', '.husky/_'], { cwd });
   if (exitCode !== 0) {
      const detail = stderr ? `: ${stderr}` : '';
      logger.warn(`Failed to configure git hooks path${detail}`);
      return false;
   }

   if (fileExists(runnerPath) && fileExists(preCommitShimPath)) {
      return false;
   }

   ensureDir(hooksDir);
   writeFile(path.join(hooksDir, '.gitignore'), '*\n');
   writeFile(runnerPath, HUSKY_RUNNER);
   fs.chmodSync(runnerPath, 0o755);

   const shim = '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n';
   for (const hook of HUSKY_HOOKS) {
      const hookPath = path.join(hooksDir, hook);
      writeFile(hookPath, shim);
      fs.chmodSync(hookPath, 0o755);
   }

   writeFile(path.join(hooksDir, 'husky.sh'), HUSKY_DEPRECATED_SH);

   return true;
}
