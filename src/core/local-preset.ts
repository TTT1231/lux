import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FmtPreset, GenerateOptions, VscodePreset } from '../presets/types';
import { mergeVscodeSettings } from './merge-settings';
import { fileExists, ensureDir, writeFile, readJson, writeJson } from '../utils/fs';
import { logger } from '../utils/logger';
import { detectPackageManager, getRunPrefix } from '../utils/deps';
import type { PackageManager } from '../utils/deps';

type PresetType = 'fmt' | 'vscode';

const CONFIG_GETTERS: ReadonlyArray<{
   filename: string;
   getContent: (preset: FmtPreset) => string | undefined;
}> = [
   { filename: 'eslint.config.mjs', getContent: p => p.eslint?.() },
   { filename: '.prettierrc', getContent: p => p.prettier?.() },
   { filename: '.prettierignore', getContent: p => p.prettierIgnore?.() },
   { filename: 'stylelint.config.mjs', getContent: p => p.stylelint?.() },
   { filename: '.stylelintignore', getContent: p => p.stylelintIgnore?.() },
   { filename: 'cspell.json', getContent: p => p.cspell?.() },
   { filename: '.editorconfig', getContent: p => p.editorconfig?.() },
];

const STYLELINT_FILES = new Set(['stylelint.config.mjs', '.stylelintignore']);
const EDITORCONFIG_FILE = '.editorconfig';

const STYLELINT_SETTINGS_PREFIXES = [
   'stylelint.',
   'css.validate',
   'less.validate',
   'scss.validate',
];

const STYLELINT_DEPS = new Set([
   'stylelint',
   'stylelint-config-standard-scss',
   'stylelint-order',
   'stylelint-scss',
   '@stylistic/stylelint-plugin',
   'postcss-html',
   'postcss-scss',
]);

const STYLELINT_EXTENSION = 'stylelint.vscode-stylelint';

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
   if (!fs.existsSync(fmtDir)) return [];

   const entries = fs.readdirSync(fmtDir, { withFileTypes: true });
   const result: string[] = [];

   for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!isValidPresetName(entry.name)) continue;

      const pkgPath = path.join(fmtDir, entry.name, 'package.json');
      if (fs.existsSync(pkgPath)) {
         result.push(entry.name);
      }
   }

   return result;
}

export function isValidCustomPreset(name: string): boolean {
   if (!isValidPresetName(name)) return false;

   const presetDir = path.join(getLuxDir(), 'preset', 'fmt', name);
   if (!fs.existsSync(presetDir)) return false;

   const pkgPath = path.join(presetDir, 'package.json');
   return fs.existsSync(pkgPath);
}

export function localPresetExists(type: PresetType, presetName: string): boolean {
   const dir = getLocalPresetDir(type, presetName);
   return fs.existsSync(dir);
}

export function resetLocalPreset(type: PresetType, presetName: string): void {
   const dir = getLocalPresetDir(type, presetName);
   if (fs.existsSync(dir)) {
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
   if (fileExists(settingsSrc)) {
      const content = fs.readFileSync(settingsSrc, 'utf-8');
      writeFile(path.join(presetDir, 'settings.json'), content);
   }

   const extensionsSrc = path.join(cwd, '.vscode', 'extensions.json');
   if (fileExists(extensionsSrc)) {
      const content = fs.readFileSync(extensionsSrc, 'utf-8');
      writeFile(path.join(presetDir, 'extensions.json'), content);
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
   if (!fs.existsSync(presetDir)) {
      logger.warn(`Local preset not found at ${presetDir}`);
      return result;
   }

   const projectPkgPath = path.join(cwd, 'package.json');
   if (fileExists(projectPkgPath)) {
      try {
         JSON.parse(fs.readFileSync(projectPkgPath, 'utf-8'));
      } catch {
         throw new InvalidPackageJsonError(projectPkgPath);
      }
   }

   const entries = fs
      .readdirSync(presetDir)
      .filter(name => name !== 'package.json' && fs.statSync(path.join(presetDir, name)).isFile());

   for (const filename of entries) {
      if (opts.noStylelint && STYLELINT_FILES.has(filename)) continue;
      if (opts.noEditorconfig && filename === EDITORCONFIG_FILE) continue;

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

      const content = fs.readFileSync(path.join(presetDir, filename), 'utf-8');
      writeFile(destPath, content);
      (exists ? result.overwritten : result.created).push(filename);
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
   if (!fs.existsSync(presetDir)) {
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

function filterStylelintSettings(settings: Record<string, unknown>): Record<string, unknown> {
   const filtered = Object.fromEntries(
      Object.entries(settings).filter(
         ([key]) => !STYLELINT_SETTINGS_PREFIXES.some(prefix => key.startsWith(prefix)),
      ),
   );

   if (
      typeof filtered['editor.codeActionsOnSave'] === 'object' &&
      filtered['editor.codeActionsOnSave'] !== null
   ) {
      const actions = { ...(filtered['editor.codeActionsOnSave'] as Record<string, unknown>) };
      delete actions['source.fixAll.stylelint'];
      filtered['editor.codeActionsOnSave'] = actions;
   }

   return filtered;
}

export function filterScripts(
   scripts: Record<string, string>,
   noStylelint: boolean,
   noEditorconfig: boolean,
): Record<string, string> {
   const filtered: Record<string, string> = {};

   for (const [key, value] of Object.entries(scripts)) {
      if (noStylelint && key.includes('stylelint')) continue;
      if (noEditorconfig && key.includes('editorconfig')) continue;

      let resolved = value;
      if (noStylelint) {
         resolved = resolved.replace(/\s*&&\s*stylelint\s+"[^"]*".*/g, '');
      }
      filtered[key] = resolved;
   }

   return filtered;
}

export function detectPresetCapabilities(presetName: string): {
   hasStylelint: boolean;
   hasEditorconfig: boolean;
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

   return {
      hasStylelint: hasStylelintFile || hasStylelintDep,
      hasEditorconfig: hasEditorconfigFile || hasEditorconfigDep,
   };
}

function isNotStylelintDep(dep: string): boolean {
   if (dep.includes('stylelint')) return false;
   if (dep === 'postcss-html' || dep === 'postcss-scss') return false;
   return true;
}

function isNotEditorconfigDep(dep: string): boolean {
   return !dep.includes('editorconfig');
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
