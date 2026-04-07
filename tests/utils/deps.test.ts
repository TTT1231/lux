import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectPackageManager, getRunPrefix } from '../../src/utils/deps';

describe('getRunPrefix', () => {
   it('returns correct prefix for each package manager', () => {
      expect(getRunPrefix('pnpm')).toBe('pnpm run');
      expect(getRunPrefix('yarn')).toBe('yarn run');
      expect(getRunPrefix('npm')).toBe('npm run');
   });
});

describe('detectPackageManager', () => {
   let tmpDir = '';

   afterEach(() => {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('detects pnpm from pnpm-lock.yaml', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });

   it('detects yarn from yarn.lock', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('yarn');
   });

   it('defaults to npm when no lockfile', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      expect(detectPackageManager(tmpDir)).toBe('npm');
   });

   it('pnpm takes priority over yarn', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });
});
