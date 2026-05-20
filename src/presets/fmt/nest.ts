import { composeLintStaged } from '../../core/shared';
import type { DepsRegistry, FmtPreset } from '../types';
import depsData from './nest/deps.json';
import { nestTsconfigFiles } from './tsconfig';

const deps = depsData as DepsRegistry;

const lintStagedFragments = {
   eslint: {
      '*.{ts,js}': ['eslint --fix'],
   },
   prettier: {
      '*.{ts,js}': ['prettier --write'],
   },
};

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

   prettierIgnore: () => `node_modules/
<lockfile>
dist/
build/
coverage/
`,

   cspell: () =>
      JSON.stringify(
         {
            $schema: 'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: ['nestjs', 'typeorm', 'dtos'],
            ignorePaths: ['**/*.svg', '**/*.png'],
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

   tsconfig: nestTsconfigFiles,

   deps,

   scripts: {
      eslint: 'eslint "{src,apps,libs,test}/**/*.ts" --cache --cache-location node_modules/.cache/eslint',
      'eslint:fix': 'eslint "{src,apps,libs,test}/**/*.ts" --cache --cache-location node_modules/.cache/eslint --fix',
      cspell: 'cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*"',
      'type:check': 'tsc --noEmit',
      format: 'prettier --write "src/**/*.{ts,js,json}"',
      'lint-staged': 'lint-staged',
   },

   lintStagedFragments,

   husky: ({ lintStaged }) => {
      if (lintStaged) {
         return '<pmx> lint-staged\n';
      }
      return '<pm> type:check\n';
   },

   lintStaged: ({ stylelint }) => {
      const composed = composeLintStaged(lintStagedFragments, { stylelint });
      return JSON.stringify(composed, null, 2) + '\n';
   },
};
