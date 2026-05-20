import fs from 'node:fs';
import path from 'node:path';
import type { DepsRegistry } from '../presets/types';
import type { FmtPreset } from '../presets/types';

// --- VSCode stylelint constants ---

const STYLELINT_SETTINGS_PREFIXES = ['stylelint.', 'css.validate', 'less.validate', 'scss.validate'];

export const STYLELINT_EXTENSION = 'stylelint.vscode-stylelint';

// --- Config filename constants ---

export const STYLELINT_FILES = new Set(['stylelint.config.mjs', '.stylelintignore']);

export const EDITORCONFIG_FILE = '.editorconfig';

export const CSPELL_FILE = 'cspell.json';

const TSCONFIG_FILE_RE = /^tsconfig(?:\..+)?\.json$/i;

// --- Config file getters ---

export const CONFIG_GETTERS: ReadonlyArray<{
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

// --- Shared functions ---

export function filterStylelintSettings(settings: Record<string, unknown>): Record<string, unknown> {
   const filtered = Object.fromEntries(
      Object.entries(settings).filter(([key]) => !STYLELINT_SETTINGS_PREFIXES.some(prefix => key.startsWith(prefix))),
   );

   if (typeof filtered['editor.codeActionsOnSave'] === 'object' && filtered['editor.codeActionsOnSave'] !== null) {
      const actions = { ...(filtered['editor.codeActionsOnSave'] as Record<string, unknown>) };
      delete actions['source.fixAll.stylelint'];
      filtered['editor.codeActionsOnSave'] = actions;
   }

   return filtered;
}

// --- deps.json utilities ---

export function loadDepsJson(presetDir: string): DepsRegistry {
   const depsPath = path.join(presetDir, 'deps.json');

   if (!fs.existsSync(depsPath)) {
      throw new Error(`deps.json not found in "${presetDir}". Run with --reset to re-materialize the preset.`);
   }

   try {
      const raw = fs.readFileSync(depsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return validateDepsRegistry(parsed);
   } catch (error) {
      if (error instanceof SyntaxError) {
         throw new Error(
            `deps.json in "${presetDir}" is not valid JSON. Fix it or run with --reset to re-materialize.`,
            { cause: error },
         );
      }
      throw error;
   }
}

function validateDepsRegistry(data: unknown): DepsRegistry {
   if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('deps.json must be an object keyed by tool name');
   }

   for (const [key, entry] of Object.entries(data as Record<string, unknown>)) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
         throw new Error(`deps.json entry "${key}" must be an object`);
      }
   }

   return data as DepsRegistry;
}

export interface DepsFilterFlags {
   stylelint: boolean;
   cspell: boolean;
   editorconfig: boolean;
   husky: boolean;
   lintStaged: boolean;
}

export function collectDepsFromRegistry(registry: DepsRegistry, flags: DepsFilterFlags): Record<string, string> {
   const deps: Record<string, string> = {};

   // Always collect top-level custom deps (not gated by flags)
   if (registry.devDependencies) {
      Object.assign(deps, registry.devDependencies);
   }
   if (registry.dependencies) {
      Object.assign(deps, registry.dependencies);
   }

   // Collect tool-grouped deps based on flags
   const activeTools = new Set(['eslint', 'prettier']);

   if (flags.stylelint) activeTools.add('stylelint');
   if (flags.cspell) activeTools.add('cspell');
   if (flags.editorconfig) activeTools.add('editorconfig');
   if (flags.husky) activeTools.add('husky');
   if (flags.lintStaged) activeTools.add('lint-staged');

   for (const tool of activeTools) {
      const entry = registry[tool];
      if (!entry) continue;

      if (entry.devDependencies) {
         Object.assign(deps, entry.devDependencies);
      }
      if (entry.dependencies) {
         Object.assign(deps, entry.dependencies);
      }
   }

   return deps;
}

export function isTsconfigFile(filename: string): boolean {
   return TSCONFIG_FILE_RE.test(filename);
}

export function hasTsconfigFile(dir: string): boolean {
   if (!fs.existsSync(dir)) return false;

   return fs.readdirSync(dir, { withFileTypes: true }).some(entry => entry.isFile() && isTsconfigFile(entry.name));
}

export function getPresetTsconfigEntries(preset: FmtPreset): Array<[string, string]> {
   const files = preset.tsconfig?.() ?? {};
   return Object.entries(files).filter(([filename]) => isTsconfigFile(filename));
}

export function composeLintStaged(
   fragments: Record<string, Record<string, string[]>>,
   flags: { stylelint: boolean },
): Record<string, string[]> {
   const activeTools = ['eslint', 'prettier'];
   if (flags.stylelint) activeTools.push('stylelint');

   const result: Record<string, string[]> = {};

   for (const tool of activeTools) {
      const fragment = fragments[tool];
      if (!fragment) continue;

      for (const [glob, commands] of Object.entries(fragment)) {
         if (!result[glob]) {
            result[glob] = [];
         }
         result[glob].push(...commands);
      }
   }

   for (const [glob, commands] of Object.entries(result)) {
      if (commands.length === 0) {
         delete result[glob];
      }
   }

   return result;
}
