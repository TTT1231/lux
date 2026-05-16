import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FMT_PRESETS } from '../../../src/presets/fmt';
import { listCustomPresets } from '../../../src/core/local-preset';

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-fmt-list-test-'));
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

describe('fmt list — builtin only', () => {
   it('lists all builtin presets when no custom presets exist', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      expect(fs.existsSync(fmtDir)).toBe(false);

      const customPresets = listCustomPresets();
      expect(customPresets).toEqual([]);
   });
});

describe('fmt list — builtin + custom', () => {
   it('identifies custom presets that are not builtin names', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');

      const customs = listCustomPresets().filter(name => !FMT_PRESETS.some(p => p.name === name));
      expect(customs).toContain('my-custom');
   });

   it('does not list directories without package.json', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');
      fs.mkdirSync(path.join(fmtDir, 'incomplete'), { recursive: true });

      const customs = listCustomPresets();
      expect(customs).toContain('my-custom');
      expect(customs).not.toContain('incomplete');
   });

   it('builtin names with local preset dir should not appear as custom', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'web-vue'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'web-vue', 'package.json'), '{}');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');

      const customs = listCustomPresets().filter(name => !FMT_PRESETS.some(p => p.name === name));
      expect(customs).not.toContain('web-vue');
      expect(customs).toContain('my-custom');
   });
});
