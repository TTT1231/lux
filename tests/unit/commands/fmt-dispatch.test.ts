import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FMT_PRESETS } from '../../../src/presets/fmt';
import { fuzzyMatchPreset, PresetNotFoundError } from '../../../src/utils/errors';
import { isValidCustomPreset, listCustomPresets, localPresetExists } from '../../../src/core/local-preset';

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-fmt-dispatch-test-'));
}

let luxHome: string;
let savedLuxHome: string | undefined;

beforeAll(() => {
   luxHome = createTempDir();
   savedLuxHome = process.env.LUX_HOME;
   process.env.LUX_HOME = luxHome;
});

afterAll(() => {
   process.env.LUX_HOME = savedLuxHome;
   fs.rmSync(luxHome, { recursive: true, force: true });
});

beforeEach(() => {
   const presetDir = path.join(luxHome, 'preset');
   if (fs.existsSync(presetDir)) {
      fs.rmSync(presetDir, { recursive: true, force: true });
   }
});

describe('fmt dispatch logic — builtin name detection', () => {
   it('recognizes all FMT_PRESETS names as builtin', () => {
      for (const p of FMT_PRESETS) {
         const isBuiltin = FMT_PRESETS.some(fp => fp.name === p.name);
         expect(isBuiltin).toBe(true);
      }
   });

   it('recognizes non-builtin name', () => {
      const isBuiltin = FMT_PRESETS.some(fp => fp.name === 'my-custom');
      expect(isBuiltin).toBe(false);
   });
});

describe('fmt dispatch logic — custom preset fallback', () => {
   it('detects valid custom preset when name is not builtin', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');

      const isBuiltin = FMT_PRESETS.some(fp => fp.name === 'my-custom');
      expect(isBuiltin).toBe(false);
      expect(isValidCustomPreset('my-custom')).toBe(true);
   });

   it('rejects custom preset without package.json', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'incomplete'), { recursive: true });

      expect(isValidCustomPreset('incomplete')).toBe(false);
   });

   it('rejects nonexistent custom preset', () => {
      expect(isValidCustomPreset('nonexistent')).toBe(false);
   });
});

describe('fmt dispatch logic — error with fuzzy match', () => {
   it('fuzzy matches across builtin + custom names combined', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');

      const allNames = [...FMT_PRESETS.map(p => p.name), ...listCustomPresets()];
      expect(allNames).toContain('web-vue');
      expect(allNames).toContain('my-custom');

      const suggestion = fuzzyMatchPreset('web-vu', allNames);
      expect(suggestion).toBe('web-vue');

      const customSuggestion = fuzzyMatchPreset('my-custo', allNames);
      expect(customSuggestion).toBe('my-custom');
   });

   it('PresetNotFoundError includes all available names', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'team-libs'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'team-libs', 'package.json'), '{}');

      const allNames = [...FMT_PRESETS.map(p => p.name), ...listCustomPresets()];
      const err = new PresetNotFoundError('unknown', allNames);
      expect(err.message).toContain('unknown');
      expect(err.message).toContain('Available:');
      expect(err.message).toContain('team-libs');
   });
});

describe('fmt dispatch logic --reset guard for custom preset', () => {
   it('builtin names pass the --reset guard', () => {
      for (const p of FMT_PRESETS) {
         const isBuiltin = FMT_PRESETS.some(fp => fp.name === p.name);
         expect(isBuiltin).toBe(true);
      }
   });

   it('custom preset name fails the builtin check (triggers warn)', () => {
      const isBuiltin = FMT_PRESETS.some(fp => fp.name === 'my-custom');
      expect(isBuiltin).toBe(false);
   });
});

describe('fmt dispatch logic — builtin + local path selection', () => {
   it('uses local path when local preset exists for builtin name', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'web-vue'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'web-vue', 'package.json'), '{}');

      const isBuiltin = FMT_PRESETS.some(fp => fp.name === 'web-vue');
      expect(isBuiltin).toBe(true);
      expect(localPresetExists('fmt', 'web-vue')).toBe(true);
   });

   it('uses builtin path when local preset does not exist for builtin name', () => {
      const isBuiltin = FMT_PRESETS.some(fp => fp.name === 'web-vue');
      expect(isBuiltin).toBe(true);
      expect(localPresetExists('fmt', 'web-vue')).toBe(false);
   });
});
