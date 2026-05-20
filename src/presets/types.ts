/** Per-tool dependency registry */
export interface DepsRegistry {
   /** Custom deps — always collected, not gated by flags. Supports <latest>. */
   devDependencies?: Record<string, string>;
   dependencies?: Record<string, string>;
   /** Tool-grouped deps — collected based on flags */
   [tool: string]:
      | {
           dependencies?: Record<string, string>;
           devDependencies?: Record<string, string>;
        }
      | Record<string, string>
      | undefined;
}

/** Result of file generation */
export interface GenerateResult {
   created: string[];
   overwritten: string[];
   skipped: string[];
}

/** Options for file generation */
export interface GenerateOptions {
   cwd: string;
   force: boolean;
   dryRun: boolean;
   stylelint: boolean;
   editorconfig: boolean;
   cspell: boolean;
   husky: boolean;
   lintStaged: boolean;
   lockfile?: string;
}

/** fmt preset — manages project-level formatting tools */
export interface FmtPreset {
   name: string;
   description: string;
   eslint?: () => string;
   prettier?: () => string;
   prettierIgnore?: () => string;
   stylelint?: () => string;
   stylelintIgnore?: () => string;
   cspell?: () => string;
   editorconfig?: () => string;
   /** Fallback TypeScript config files, copied only when the target project has no tsconfig*.json */
   tsconfig?: () => Record<string, string>;
   /** Per-tool dependency data (statically imported from deps.json) */
   deps?: DepsRegistry;
   scripts?: Record<string, string>;
   /** Per-tool lint-staged fragments for dynamic composition */
   lintStagedFragments?: Record<string, Record<string, string[]>>;
   /** Husky pre-commit hook 内容模板，支持 <pm> 和 <pmx> 占位符 */
   husky?: (flags: { lintStaged: boolean }) => string;
   /** lint-staged 配置内容（JSON string），flags 用于决定包含哪些片段 */
   lintStaged?: (flags: { stylelint: boolean }) => string;
   /** Files to always overwrite even without --force */
   forceOverwrite?: string[];
   /** Files to never overwrite even with --force */
   neverOverwrite?: string[];
}

/** vscode preset — manages editor configuration */
export interface VscodePreset {
   name: string;
   description: string;
   settings: () => Record<string, unknown>;
   extensions: () => string[];
}
