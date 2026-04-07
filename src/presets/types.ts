/** Options for file generation */
export interface GenerateOptions {
   cwd: string;
   force: boolean;
   dryRun: boolean;
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
   dependencies?: { dev?: string[] };
   scripts?: Record<string, string>;
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
