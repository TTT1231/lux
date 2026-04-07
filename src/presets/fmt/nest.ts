import type { FmtPreset } from '../types';

export const nestFmt: FmtPreset = {
   name: 'nest',
   description: 'NestJS backend (enhancement mode)',

   // Never overwrite eslint.config.mjs — NestJS has its own ESLint setup
   neverOverwrite: ['eslint.config.mjs'],
   // Always overwrite .prettierrc — ensure consistent formatting
   forceOverwrite: ['.prettierrc'],

   // No ESLint generation — Nest CLI manages its own eslint.config.mjs

   prettier: () =>
      JSON.stringify(
         {
            semi: false,
            singleQuote: true,
            tabWidth: 2,
            trailingComma: 'all',
            printWidth: 100,
            endOfLine: 'lf',
         },
         null,
         2,
      ) + '\n',

   prettierIgnore: () => `# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
*.log
logs/

# Environment files
.env
.env.local
.env.*.local

# IDE files
.vscode/

# Coverage
coverage/

# Static assets
*.svg
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.woff
*.woff2
*.ttf
*.eot
`,

   // No stylelint for NestJS

   cspell: () =>
      JSON.stringify(
         {
            $schema:
               'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: ['nestjs', 'typeorm', 'dtos'],
            ignorePaths: [
               '/node_modules/',
               '/dist/',
               'pnpm-lock.yaml',
               '*.log',
               '*.test.ts',
               '*.spec.ts',
               '/__tests__/',
               '*.svg',
               '*.png',
            ],
         },
         null,
         2,
      ) + '\n',

   editorconfig: () => `root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
`,

   dependencies: {
      dev: ['prettier', 'cspell'],
   },

   // NestJS: only append new scripts, don't conflict with existing ones
   scripts: {
      cspell: 'cspell "src/**/*.{ts,js}"',
      'type:check': 'tsc --noEmit',
      'code:check': '<pm> lint && <pm> format:check',
      'code:check:all': '<pm> lint && <pm> format:check && <pm> cspell',
   },
};
