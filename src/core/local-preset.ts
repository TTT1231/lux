import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FmtPreset, GenerateOptions, VscodePreset } from '../presets/types';
import { mergeVscodeSettings } from './merge-settings';
import { fileExists, ensureDir, writeFile, readFile, readJson, writeJson } from '../utils/fs';
import { logger } from '../utils/logger';
import { detectPackageManager, getRunPrefix } from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import {
   CONFIG_GETTERS,
   STYLELINT_FILES,
   EDITORCONFIG_FILE,
   CSPELL_FILE,
   LINTSTAGED_FILE,
   STYLELINT_DEPS,
   HUSKY_DEPS,
   LINTSTAGED_DEPS,
   STYLELINT_EXTENSION,
   filterStylelintSettings,
   isNotStylelintDep,
   isNotEditorconfigDep,
   isNotLintStagedDep,
} from './shared';

type PresetType = 'fmt' | 'vscode';

function getLuxDir(): string {
   return process.env.LUX_HOME || path.join(os.homedir(), '.lux');
}

export function getLocalPresetDir(type: PresetType, presetName: string): string {
   if (!isValidPresetName(presetName)) {
      throw new Error(`Invalid preset name: "${presetName}"`);
   }
   return path.join(getLuxDir(), 'preset', type, presetName);
}

export function isValidPresetName(name: string): boolean {
   return name.length > 0 && !name.includes('/') && !name.includes('\\') && !name.includes('..');
}

export function listCustomPresets(): string[] {
   const fmtDir = path.join(getLuxDir(), 'preset', 'fmt');
   if (!fileExists(fmtDir)) return [];

   const entries = fs.readdirSync(fmtDir, { withFileTypes: true });
   const result: string[] = [];

   for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!isValidPresetName(entry.name)) continue;

      const pkgPath = path.join(fmtDir, entry.name, 'package.json');
      if (fileExists(pkgPath)) {
         result.push(entry.name);
      }
   }

   return result;
}

export function isValidCustomPreset(name: string): boolean {
   if (!isValidPresetName(name)) return false;

   const presetDir = path.join(getLuxDir(), 'preset', 'fmt', name);
   if (!fileExists(presetDir)) return false;

   const pkgPath = path.join(presetDir, 'package.json');
   return fileExists(pkgPath);
}

export function localPresetExists(type: PresetType, presetName: string): boolean {
   const dir = getLocalPresetDir(type, presetName);
   return fileExists(dir);
}

export function resetLocalPreset(type: PresetType, presetName: string): void {
   const dir = getLocalPresetDir(type, presetName);
   if (fileExists(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      logger.log(`Reset local preset: ${dir}`);
   }
}

export function materializeFmtPreset(
   presetName: string,
   preset: FmtPreset,
   opts: GenerateOptions,
): void {
   if (opts.dryRun) {
      logger.log('[dry-run] Would materialize local preset to ~/.lux/preset/fmt/' + presetName);
      return;
   }

   const presetDir = getLocalPresetDir('fmt', presetName);
   ensureDir(presetDir);

   for (const { filename, getContent } of CONFIG_GETTERS) {
      const content = getContent(preset);
      if (content === undefined) continue;

      const resolved = opts.lockfile
         ? content.replace(/<lockfile>/g, opts.lockfile)
         : content.replace(/<lockfile>\n?/g, '');

      writeFile(path.join(presetDir, filename), resolved);
   }

   const templatePkg = buildTemplatePackageJson(preset);
   writeJson(path.join(presetDir, 'package.json'), templatePkg);

   logger.log(`Local preset created at ${presetDir}`);
}

export function materializeVscodePreset(cwd: string, presetName: string): void {
   const presetDir = getLocalPresetDir('vscode', presetName);
   ensureDir(presetDir);

   const settingsSrc = path.join(cwd, '.vscode', 'settings.json');
   const settingsContent = readFile(settingsSrc);
   if (settingsContent !== null) {
      writeFile(path.join(presetDir, 'settings.json'), settingsContent);
   }

   const extensionsSrc = path.join(cwd, '.vscode', 'extensions.json');
   const extensionsContent = readFile(extensionsSrc);
   if (extensionsContent !== null) {
      writeFile(path.join(presetDir, 'extensions.json'), extensionsContent);
   }

   logger.log(`Local preset created at ${presetDir}`);
}

export function materializeVscodePresetFromBuiltin(presetName: string, preset: VscodePreset): void {
   const presetDir = getLocalPresetDir('vscode', presetName);
   ensureDir(presetDir);

   const settings = preset.settings();
   writeJson(path.join(presetDir, 'settings.json'), settings);

   const extensions = preset.extensions();
   writeJson(path.join(presetDir, 'extensions.json'), { recommendations: extensions });

   logger.log(`Local preset created at ${presetDir}`);
}

export interface ApplyLocalResult {
   created: string[];
   overwritten: string[];
   skipped: string[];
   scriptsAdded: number;
   scriptsSkipped: number;
}

export class InvalidPackageJsonError extends Error {
   constructor(public readonly filePath: string) {
      super(`package.json exists but is not valid JSON: ${filePath}`);
   }
}

export function applyLocalFmtPreset(
   cwd: string,
   presetName: string,
   opts: GenerateOptions,
): ApplyLocalResult {
   const result: ApplyLocalResult = {
      created: [],
      overwritten: [],
      skipped: [],
      scriptsAdded: 0,
      scriptsSkipped: 0,
   };

   const presetDir = getLocalPresetDir('fmt', presetName);
   if (!fileExists(presetDir)) {
      logger.warn(`Local preset not found at ${presetDir}`);
      return result;
   }

   const projectPkgPath = path.join(cwd, 'package.json');
   if (fileExists(projectPkgPath)) {
      const parsed = readJson(projectPkgPath);
      if (parsed === null) {
         throw new InvalidPackageJsonError(projectPkgPath);
      }
   }

   const entries = fs
      .readdirSync(presetDir)
      .filter(name => name !== 'package.json' && fs.statSync(path.join(presetDir, name)).isFile());

   for (const filename of entries) {
      if (opts.noStylelint && STYLELINT_FILES.has(filename)) continue;
      if (opts.noEditorconfig && filename === EDITORCONFIG_FILE) continue;
      if (opts.noCspell && filename === CSPELL_FILE) continue;
      if (opts.noLintStaged && filename === LINTSTAGED_FILE) continue;

      const destPath = path.join(cwd, filename);
      const exists = fileExists(destPath);

      if (exists && !opts.force) {
         result.skipped.push(filename);
         if (opts.dryRun) {
            logger.log(`[dry-run] Skipped ${filename} (already exists)`);
         }
         continue;
      }

      if (opts.dryRun) {
         (exists ? result.overwritten : result.created).push(filename);
         logger.log(`[dry-run] Would copy ${filename} from local preset`);
         continue;
      }

      const content = readFile(path.join(presetDir, filename));
      if (content !== null) {
         writeFile(destPath, content);
         (exists ? result.overwritten : result.created).push(filename);
      }
   }

   const templatePkg = readJson<{
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
   }>(path.join(presetDir, 'package.json'));

   const projectPkg = readJson<Record<string, unknown>>(projectPkgPath);

   if (templatePkg && projectPkg) {
      const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;
      const merged = mergeTemplateIntoProject(templatePkg, projectPkg, pm, opts, result);
      if (!opts.dryRun) {
         writeJson(projectPkgPath, merged);
      }
   }

   return result;
}

export function applyLocalVscodePreset(
   cwd: string,
   presetName: string,
   opts: GenerateOptions,
): ApplyLocalResult {
   const result: ApplyLocalResult = {
      created: [],
      overwritten: [],
      skipped: [],
      scriptsAdded: 0,
      scriptsSkipped: 0,
   };

   const presetDir = getLocalPresetDir('vscode', presetName);
   if (!fileExists(presetDir)) {
      logger.warn(`Local preset not found at ${presetDir}`);
      return result;
   }

   const settingsSrc = path.join(presetDir, 'settings.json');
   if (fileExists(settingsSrc)) {
      const presetSettings = readJson<Record<string, unknown>>(settingsSrc);
      const filteredSettings = opts.noStylelint
         ? filterStylelintSettings(presetSettings ?? {})
         : presetSettings;

      if (filteredSettings) {
         const settingsDest = path.join(cwd, '.vscode', 'settings.json');
         const existingSettings = readJson<Record<string, unknown>>(settingsDest);

         if (existingSettings) {
            if (opts.dryRun) {
               result.overwritten.push('.vscode/settings.json');
               logger.log('[dry-run] Would merge .vscode/settings.json from local preset');
            } else {
               const merged = mergeVscodeSettings(filteredSettings, existingSettings);
               writeJson(settingsDest, merged);
               result.overwritten.push('.vscode/settings.json');
            }
         } else {
            if (opts.dryRun) {
               result.created.push('.vscode/settings.json');
               logger.log('[dry-run] Would create .vscode/settings.json from local preset');
            } else {
               writeJson(settingsDest, filteredSettings);
               result.created.push('.vscode/settings.json');
            }
         }
      }
   }

   const extensionsSrc = path.join(presetDir, 'extensions.json');
   if (fileExists(extensionsSrc)) {
      const extensionsData = readJson<{ recommendations: string[] }>(extensionsSrc);
      if (extensionsData) {
         let presetRecommendations = extensionsData.recommendations ?? [];
         if (opts.noStylelint) {
            presetRecommendations = presetRecommendations.filter(
               ext => ext !== STYLELINT_EXTENSION,
            );
         }

         if (opts.dryRun) {
            result.created.push('.vscode/extensions.json');
            logger.log('[dry-run] Would create .vscode/extensions.json from local preset');
         } else {
            const extensionsDest = path.join(cwd, '.vscode', 'extensions.json');
            const existingExtensions = readJson<{ recommendations: string[] }>(extensionsDest);
            const existingRecommendations = existingExtensions?.recommendations ?? [];
            const merged = [...new Set([...existingRecommendations, ...presetRecommendations])];
            writeJson(extensionsDest, { recommendations: merged });
            result.created.push('.vscode/extensions.json');
         }
      }
   }

   return result;
}

function buildTemplatePackageJson(preset: FmtPreset): Record<string, unknown> {
   const deps: Record<string, string> = {};
   if (preset.dependencies?.dev) {
      for (const dep of preset.dependencies.dev) {
         deps[dep] = '<latest>';
      }
   }

   const scripts = preset.scripts ? { ...preset.scripts } : undefined;

   const result: Record<string, unknown> = {};
   if (Object.keys(deps).length > 0) {
      result.devDependencies = deps;
   }
   if (scripts && Object.keys(scripts).length > 0) {
      result.scripts = scripts;
   }
   return result;
}

function mergeTemplateIntoProject(
   templatePkg: { devDependencies?: Record<string, string>; scripts?: Record<string, string> },
   projectPkg: Record<string, unknown>,
   pm: PackageManager | undefined,
   opts: GenerateOptions,
   result: ApplyLocalResult,
): Record<string, unknown> {
   const merged = { ...projectPkg };
   const prefix = pm ? getRunPrefix(pm) : '';

   if (templatePkg.devDependencies) {
      const existingDeps = (merged.devDependencies ?? {}) as Record<string, string>;
      const newDeps: Record<string, string> = { ...existingDeps };

      for (const [dep, version] of Object.entries(templatePkg.devDependencies)) {
         if (opts.noStylelint && STYLELINT_DEPS.has(dep)) continue;
         if (opts.noEditorconfig && dep.includes('editorconfig')) continue;
         if (opts.noCspell && dep === 'cspell') continue;
         if (opts.noHusky && HUSKY_DEPS.has(dep)) continue;
         if (opts.noLintStaged && LINTSTAGED_DEPS.has(dep)) continue;

         if (existingDeps[dep] === undefined && version !== '<latest>') {
            newDeps[dep] = version;
         }
      }
      merged.devDependencies = newDeps;
   }

   if (templatePkg.scripts) {
      const existingScripts = (merged.scripts ?? {}) as Record<string, string>;
      const newScripts = { ...existingScripts };

      const filteredScripts = filterScripts(
         templatePkg.scripts,
         opts.noStylelint,
         opts.noEditorconfig,
         opts.noCspell,
         opts.noLintStaged,
      );

      for (const [key, value] of Object.entries(filteredScripts)) {
         const resolved = value.replace(/<pm>/g, prefix);

         if (existingScripts[key] !== undefined && !opts.force) {
            result.scriptsSkipped++;
            if (opts.dryRun) {
               logger.log(`[dry-run] Skipped script "${key}" (already exists)`);
            } else {
               logger.log(`Skipped script "${key}" (already exists)`);
            }
            continue;
         }

         if (opts.dryRun) {
            result.scriptsAdded++;
            logger.log(`[dry-run] Would add script "${key}"`);
            continue;
         }

         newScripts[key] = resolved;
         result.scriptsAdded++;
      }
      merged.scripts = newScripts;
   }

   return merged;
}

export function filterScripts(
   scripts: Record<string, string>,
   noStylelint: boolean,
   noEditorconfig: boolean,
   noCspell: boolean,
   noLintStaged = false,
): Record<string, string> {
   const filtered: Record<string, string> = {};

   for (const [key, value] of Object.entries(scripts)) {
      if (noStylelint && key.includes('stylelint')) continue;
      if (noEditorconfig && key.includes('editorconfig')) continue;
      if (noCspell && key.includes('cspell')) continue;
      if (noLintStaged && key.includes('lint-staged')) continue;

      let resolved = value;
      if (noStylelint) {
         resolved = resolved.replace(/\s*&&\s*stylelint\s+"[^"]*".*/g, '');
      }
      if (noCspell) {
         // Strip " && cspell ..." segment from chain scripts.
         // cspell may appear mid-chain (e.g. before tsc/stylelint), so we must
         // stop at the next "&&" rather than consuming to end-of-line.
         resolved = resolved.replace(/\s*&&\s*cspell\s+[^&]*/g, '');
         // Clean up any malformed "cmd&&" (missing space before &&) after strip
         resolved = resolved.replace(/(\S)&&/g, '$1 &&');
      }
      filtered[key] = resolved;
   }

   return filtered;
}

export function detectPresetCapabilities(presetName: string): {
   hasStylelint: boolean;
   hasEditorconfig: boolean;
   hasCspell: boolean;
   hasLintStaged: boolean;
} {
   const presetDir = path.join(getLuxDir(), 'preset', 'fmt', presetName);
   const entries = fs.readdirSync(presetDir);

   const hasStylelintFile = entries.some(f => STYLELINT_FILES.has(f));
   const pkg = readJson<{ devDependencies?: Record<string, string> }>(
      path.join(presetDir, 'package.json'),
   );
   const hasStylelintDep = pkg?.devDependencies
      ? Object.keys(pkg.devDependencies).some(d => isNotStylelintDep(d) === false)
      : false;

   const hasEditorconfigFile = entries.includes(EDITORCONFIG_FILE);
   const hasEditorconfigDep = pkg?.devDependencies
      ? Object.keys(pkg.devDependencies).some(d => !isNotEditorconfigDep(d))
      : false;

   const hasCspellFile = entries.includes(CSPELL_FILE);
   const hasCspellDep = pkg?.devDependencies
      ? Object.keys(pkg.devDependencies).some(d => d === 'cspell')
      : false;

   const hasLintStagedFile = entries.includes(LINTSTAGED_FILE);
   const hasLintStagedDep = pkg?.devDependencies
      ? Object.keys(pkg.devDependencies).some(d => isNotLintStagedDep(d) === false)
      : false;

   return {
      hasStylelint: hasStylelintFile || hasStylelintDep,
      hasEditorconfig: hasEditorconfigFile || hasEditorconfigDep,
      hasCspell: hasCspellFile || hasCspellDep,
      hasLintStaged: hasLintStagedFile || hasLintStagedDep,
   };
}

export function resolveLocalDeps(deps: Record<string, string>): string[] {
   const packages: string[] = [];
   for (const [name, version] of Object.entries(deps)) {
      if (version === '<latest>') {
         packages.push(name);
      } else {
         packages.push(`${name}@${version}`);
      }
   }
   return packages;
}
