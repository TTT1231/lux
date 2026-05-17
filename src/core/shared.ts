import type { FmtPreset } from '../presets/types';

// --- VSCode stylelint constants ---

export const STYLELINT_SETTINGS_PREFIXES = [
   'stylelint.',
   'css.validate',
   'less.validate',
   'scss.validate',
];

export const STYLELINT_EXTENSION = 'stylelint.vscode-stylelint';

// --- Dependency sets ---

export const STYLELINT_DEPS = new Set([
   'stylelint',
   'stylelint-config-standard-scss',
   'stylelint-order',
   'stylelint-scss',
   '@stylistic/stylelint-plugin',
   'postcss-html',
   'postcss-scss',
]);

export const HUSKY_DEPS = new Set(['husky']);

export const LINTSTAGED_DEPS = new Set(['lint-staged']);

// --- Config filename constants ---

export const STYLELINT_FILES = new Set(['stylelint.config.mjs', '.stylelintignore']);

export const EDITORCONFIG_FILE = '.editorconfig';

export const CSPELL_FILE = 'cspell.json';

export const LINTSTAGED_FILE = '.lintstagedrc.json';

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
   { filename: '.lintstagedrc.json', getContent: p => p.lintStaged?.() },
];

// --- Shared functions ---

export function filterStylelintSettings(settings: Record<string, unknown>): Record<string, unknown> {
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

export function isNotStylelintDep(dep: string): boolean {
   if (dep.includes('stylelint')) return false;
   if (dep === 'postcss-html' || dep === 'postcss-scss') return false;
   return true;
}

export function isNotEditorconfigDep(dep: string): boolean {
   return !dep.includes('editorconfig');
}

export function isNotCspellDep(dep: string): boolean {
   return dep !== 'cspell';
}

export function isNotHuskyDep(dep: string): boolean {
   return dep !== 'husky';
}

export function isNotLintStagedDep(dep: string): boolean {
   return dep !== 'lint-staged';
}
