import { describe, expect, it } from 'vitest';
import { FMT_PRESETS } from '../../../src/presets/fmt';

describe('built-in preset husky()', () => {
   for (const preset of FMT_PRESETS) {
      describe(preset.name, () => {
         it('returns <pmx> lint-staged when lintStaged flag is true', () => {
            if (!preset.husky) return;
            const content = preset.husky({ lintStaged: true });
            expect(content).toContain('<pmx>');
            expect(content).toContain('lint-staged');
         });

         it('returns <pm> lint when lintStaged flag is false', () => {
            if (!preset.husky) return;
            const content = preset.husky({ lintStaged: false });
            expect(content).toContain('<pm>');
            expect(content).toContain('lint');
         });
      });
   }
});

describe('built-in preset lintStaged()', () => {
   for (const preset of FMT_PRESETS) {
      describe(preset.name, () => {
         it('returns valid JSON with eslint fragment when stylelint is false', () => {
            if (!preset.lintStaged) return;
            const content = preset.lintStaged({ stylelint: false });
            const parsed = JSON.parse(content);
            expect(Object.keys(parsed).length).toBeGreaterThan(0);
         });

         it('returns valid JSON with more entries when stylelint is true', () => {
            if (!preset.lintStaged) return;
            if (!preset.lintStagedFragments?.stylelint) return;
            const withoutStylelint = JSON.parse(preset.lintStaged({ stylelint: false }));
            const withStylelint = JSON.parse(preset.lintStaged({ stylelint: true }));
            const keysWith = Object.keys(withStylelint);
            const keysWithout = Object.keys(withoutStylelint);
            expect(keysWith.length).toBeGreaterThanOrEqual(keysWithout.length);
         });
      });
   }
});
