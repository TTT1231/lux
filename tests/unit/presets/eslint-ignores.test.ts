import { describe, expect, it } from 'vitest';
import { webVueFmt } from '../../../src/presets/fmt/web-vue';
import { webReactFmt } from '../../../src/presets/fmt/web-react';
import { nodeFmt } from '../../../src/presets/fmt/node';
import { uniappFmt } from '../../../src/presets/fmt/uniapp';
import { electronVueFmt } from '../../../src/presets/fmt/electron-vue';

const PRESETS_WITH_ESLINT = [
   { name: 'web-vue', preset: webVueFmt },
   { name: 'web-react', preset: webReactFmt },
   { name: 'node', preset: nodeFmt },
   { name: 'uniapp', preset: uniappFmt },
   { name: 'electron-vue', preset: electronVueFmt },
] as const;

describe('ESLint preset ignores', () => {
   it.each(PRESETS_WITH_ESLINT)('$name: includes node_modules/ and lockfile in ignores', ({ preset }) => {
      const config = preset.eslint!();

      expect(config).toContain('node_modules/');
      expect(config).toContain('<lockfile>');
   });

   it.each(PRESETS_WITH_ESLINT)('$name: includes dist/ in ignores', ({ preset }) => {
      const config = preset.eslint!();
      expect(config).toContain('dist/');
   });

   it('node preset includes eslint.config.mjs in ignores', () => {
      const config = nodeFmt.eslint!();
      expect(config).toContain('eslint.config.mjs');
   });

   it('uniapp preset includes unpackage/ in ignores', () => {
      const config = uniappFmt.eslint!();
      expect(config).toContain('unpackage/');
   });
});
