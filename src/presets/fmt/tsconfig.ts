function json(data: unknown): string {
   return JSON.stringify(data, null, 2) + '\n';
}

function webCompilerOptions(extra: Record<string, unknown> = {}): Record<string, unknown> {
   return {
      target: 'ES2022',
      useDefineForClassFields: true,
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      allowJs: false,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      ...extra,
   };
}

function nodeConfigCompilerOptions(): Record<string, unknown> {
   return {
      target: 'ES2022',
      lib: ['ES2022'],
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
   };
}

export function vueWebTsconfigFiles(): Record<string, string> {
   const include = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'];

   return {
      'tsconfig.json': json({
         compilerOptions: webCompilerOptions({ jsx: 'preserve' }),
         include,
         exclude: ['node_modules', 'dist', 'coverage'],
      }),
      'tsconfig.app.json': json({
         extends: './tsconfig.json',
         include,
      }),
      'tsconfig.node.json': json({
         compilerOptions: nodeConfigCompilerOptions(),
         include: ['vite.config.*', 'vitest.config.*', 'playwright.config.*'],
         exclude: ['node_modules', 'dist', 'coverage'],
      }),
   };
}

export function reactWebTsconfigFiles(): Record<string, string> {
   const include = ['src/**/*.ts', 'src/**/*.tsx'];

   return {
      'tsconfig.json': json({
         compilerOptions: webCompilerOptions({ jsx: 'react-jsx' }),
         include,
         exclude: ['node_modules', 'dist', 'coverage'],
      }),
      'tsconfig.app.json': json({
         extends: './tsconfig.json',
         include,
      }),
      'tsconfig.node.json': json({
         compilerOptions: nodeConfigCompilerOptions(),
         include: ['vite.config.*', 'vitest.config.*', 'playwright.config.*'],
         exclude: ['node_modules', 'dist', 'coverage'],
      }),
   };
}

export function electronVueTsconfigFiles(): Record<string, string> {
   const include = [
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.vue',
      'electron/**/*.ts',
      'electron/**/*.tsx',
      'main/**/*.ts',
      'preload/**/*.ts',
   ];

   return {
      'tsconfig.json': json({
         compilerOptions: webCompilerOptions({ jsx: 'preserve' }),
         include,
         exclude: ['node_modules', 'dist', 'release', 'out', 'coverage'],
      }),
      'tsconfig.app.json': json({
         extends: './tsconfig.json',
         include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
      }),
      'tsconfig.node.json': json({
         compilerOptions: nodeConfigCompilerOptions(),
         include: ['electron/**/*.ts', 'main/**/*.ts', 'preload/**/*.ts', 'vite.config.*', 'electron.vite.config.*'],
         exclude: ['node_modules', 'dist', 'release', 'out', 'coverage'],
      }),
   };
}

export function uniappTsconfigFiles(): Record<string, string> {
   return {
      'tsconfig.json': json({
         compilerOptions: webCompilerOptions({ jsx: 'preserve' }),
         include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
         exclude: ['node_modules', 'dist', 'unpackage', 'coverage'],
      }),
   };
}

export function nodeTsconfigFiles(): Record<string, string> {
   return {
      'tsconfig.json': json({
         compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            noEmit: true,
         },
         include: ['src/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts'],
         exclude: ['node_modules', 'dist', 'build', 'coverage'],
      }),
   };
}

export function nestTsconfigFiles(): Record<string, string> {
   return {
      'tsconfig.json': json({
         compilerOptions: {
            module: 'commonjs',
            target: 'ES2021',
            lib: ['ES2021'],
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            noEmit: true,
         },
         include: ['src/**/*.ts', 'apps/**/*.ts', 'libs/**/*.ts', 'test/**/*.ts'],
         exclude: ['node_modules', 'dist', 'coverage'],
      }),
   };
}
