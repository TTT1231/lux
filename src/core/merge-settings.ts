/**
 * Keys where preset value takes priority during VSCode settings merge.
 * These are linting/formatting related — must be correct for tooling to work.
 */
export const PRESET_PRIORITY_KEYS = new Set([
   // Editor formatting
   'editor.formatOnSave',
   'editor.defaultFormatter',
   'editor.tabSize',
   'editor.detectIndentation',
   'editor.codeActionsOnSave',

   // ESLint
   'eslint.validate',
   'eslint.options',

   // Stylelint
   'stylelint.enable',
   'stylelint.validate',
   'stylelint.customSyntax',
   'stylelint.snippet',
   'stylelint.packageManager',
   'css.validate',
   'less.validate',
   'scss.validate',

   // TypeScript
   'js/ts.tsdk.path',
   'js/ts.inlayHints.enumMemberValues.enabled',
   'js/ts.preferences.preferTypeOnlyAutoImports',
   'js/ts.preferences.includePackageJsonAutoImports',
   'js/ts.preferences.importModuleSpecifier',
   'js/ts.suggest.autoImports',

   // CSpell
   'cSpell.words',
   'cSpell.language',

   // Package manager
   'npm.packageManager',
]);

/**
 * Keys where user value takes priority during VSCode settings merge.
 * These are personal preference — respect user's existing config.
 */
export const USER_PRIORITY_KEYS = new Set([
   // Cursor/animation
   'editor.cursorBlinking',
   'editor.cursorSmoothCaretAnimation',
   'editor.renderWhitespace',
   'editor.guides.indentation',
   'editor.largeFileOptimizations',

   // Theme/appearance
   'workbench.iconTheme',
   'workbench.colorTheme',

   // Suggestions
   'editor.inlineSuggest.enabled',
   'editor.suggestSelection',
   'editor.acceptSuggestionOnEnter',
   'editor.bracketPairColorization.enabled',
   'editor.autoClosingBrackets',
   'editor.autoClosingOvertype',
]);

/**
 * Merge preset and existing VSCode settings with priority rules:
 * - lint/format keys → preset wins (ensures tooling works correctly)
 * - personal preference keys → user wins(respects habits)
 * - uncategorized keys → preset wins
 */
export function mergeVscodeSettings(
   preset: Record<string, unknown>,
   existing: Record<string, unknown>,
): Record<string, unknown> {
   const result: Record<string, unknown> = { ...existing };

   for (const [key, presetVal] of Object.entries(preset)) {
      const existingVal = existing[key];

      // Key not in existing → add from preset
      if (existingVal === undefined) {
         result[key] = presetVal;
         continue;
      }

      // User priority → keep existing
      if (USER_PRIORITY_KEYS.has(key)) {
         continue;
      }

      // Both are plain objects → deep merge
      if (isPlainObject(presetVal) && isPlainObject(existingVal)) {
         result[key] = mergeVscodeSettings(
            presetVal as Record<string, unknown>,
            existingVal as Record<string, unknown>,
         );
         continue;
      }

      // Preset priority (or default) → use preset value
      result[key] = presetVal;
   }

   return result;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
   return typeof val === 'object' && val !== null && !Array.isArray(val);
}
