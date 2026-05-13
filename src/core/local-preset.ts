import fs from 'node:fs';
import path from 'node:path';
import type { FmtPreset, GenerateOptions } from '../presets/types';
import { mergeVscodeSettings } from './merge-settings';
import { fileExists, ensureDir, writeFile, readJson, writeJson } from '../utils/fs';
import { logger } from '../utils/logger';
import { detectPackageManager, getRunPrefix } from '../utils/deps';
import type { PackageManager } from '../utils/deps';

type PresetType = 'fmt' | 'vscode';

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

export function getLocalPresetDir(cwd: string, type: PresetType, presetName: string): string {
   return path.join(cwd, '.lux', 'preset', type, presetName);
}

export function localPresetExists(cwd: string, type: PresetType, presetName: string): boolean {
   const dir = getLocalPresetDir(cwd, type, presetName);
   return fs.existsSync(dir);
}

export function resetLocalPreset(cwd: string, type: PresetType, presetName: string): void {
   const dir = getLocalPresetDir(cwd, type, presetName);
   if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      logger.log(`Reset local preset: ${path.relative(cwd, dir)}`);
   }
}

export function materializeFmtPreset(
   cwd: string,
   presetName: string,
   generatedFiles: string[],
   preset: FmtPreset,
   opts: GenerateOptions,
): void {
   if (opts.dryRun) {
      logger.log('[dry-run] Would materialize local preset to .lux/preset/fmt/' + presetName);
      return;
   }

   const presetDir = getLocalPresetDir(cwd, 'fmt', presetName);
   ensureDir(presetDir);

   for (const filename of generatedFiles) {
      const src = path.join(cwd, filename);
      if (!fileExists(src)) continue;

      const content = fs.readFileSync(src, 'utf-8');
      writeFile(path.join(presetDir, filename), content);
   }

   const templatePkg = buildTemplatePackageJson(preset, opts);
   writeJson(path.join(presetDir, 'package.json'), templatePkg);

   logger.log(`Local preset created at ${path.relative(cwd, presetDir)}`);
}

export function materializeVscodePreset(cwd: string, presetName: string): void {
   const presetDir = getLocalPresetDir(cwd, 'vscode', presetName);
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

   logger.log(`Local preset created at ${path.relative(cwd, presetDir)}`);
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

   const presetDir = getLocalPresetDir(cwd, 'fmt', presetName);
   if (!fs.existsSync(presetDir)) {
      logger.warn(`Local preset not found at ${path.relative(cwd, presetDir)}`);
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

   const entries = fs.readdirSync(presetDir).filter(name => name !== 'package.json');

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
         result.created.push(filename);
         logger.log(`[dry-run] Would copy ${filename} from local preset`);
         continue;
      }

      const content = fs.readFileSync(path.join(presetDir, filename), 'utf-8');
      writeFile(destPath, content);
      result.created.push(filename);
   }

   const templatePkg = readJson<{
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
   }>(path.join(presetDir, 'package.json'));

   const projectPkg = readJson<Record<string, unknown>>(projectPkgPath);

   if (templatePkg && projectPkg) {
      const pm = detectPackageManager(cwd);
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

   const presetDir = getLocalPresetDir(cwd, 'vscode', presetName);
   if (!fs.existsSync(presetDir)) {
      logger.warn(`Local preset not found at ${path.relative(cwd, presetDir)}`);
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
         let recommendations = extensionsData.recommendations ?? [];
         if (opts.noStylelint) {
            recommendations = recommendations.filter(ext => ext !== STYLELINT_EXTENSION);
         }

         if (opts.dryRun) {
            result.created.push('.vscode/extensions.json');
            logger.log('[dry-run] Would create .vscode/extensions.json from local preset');
         } else {
            writeJson(path.join(cwd, '.vscode', 'extensions.json'), {
               recommendations,
            });
            result.created.push('.vscode/extensions.json');
         }
      }
   }

   return result;
}

function buildTemplatePackageJson(
   preset: FmtPreset,
   opts: GenerateOptions,
): Record<string, unknown> {
   const deps: Record<string, string> = {};
   if (preset.dependencies?.dev) {
      for (const dep of preset.dependencies.dev) {
         if (opts.noStylelint && STYLELINT_DEPS.has(dep)) continue;
         if (opts.noEditorconfig && dep.includes('editorconfig')) continue;
         deps[dep] = '<latest>';
      }
   }

   let scripts: Record<string, string> | undefined;
   if (preset.scripts) {
      if (opts.noStylelint) {
         scripts = filterStylelintScripts(preset.scripts);
      } else {
         scripts = { ...preset.scripts };
      }
   }

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
   pm: PackageManager,
   opts: GenerateOptions,
   result: ApplyLocalResult,
): Record<string, unknown> {
   const merged = { ...projectPkg };
   const prefix = getRunPrefix(pm);

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

      for (const [key, value] of Object.entries(templatePkg.scripts)) {
         if (opts.noStylelint && key.startsWith('stylelint')) continue;

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

function filterStylelintScripts(scripts: Record<string, string>): Record<string, string> {
   const filtered: Record<string, string> = {};
   for (const [key, value] of Object.entries(scripts)) {
      if (key.startsWith('stylelint')) continue;
      filtered[key] = value.replace(/\s*&&\s*<pm>\s+stylelint\S*/g, '');
   }
   return filtered;
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
