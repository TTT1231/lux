import { defineConfig } from 'vitest/config';

export default defineConfig({
   test: {
      coverage: {
         provider: 'v8',
         reporter: ['text', 'lcov', 'html', 'json-summary', 'json'],
         reportsDirectory: './coverage',
         include: ['src/**/*.ts'],
         exclude: ['src/index.ts'],
      },
      projects: [
         // 单元测试：并行、快速超时
         {
            test: {
               name: 'unit',
               include: ['tests/**/*.test.ts'],
            },
         },
         // 验收测试：串行、长超时（涉及真实文件系统和进程）,串行
         {
            test: {
               name: 'acceptance',
               include: ['tests/**/*.spec.ts'],
               pool: 'forks',
               fileParallelism: false,
               testTimeout: 30_000,
               hookTimeout: 60_000,
            },
         },
      ],
   },
});
