import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateInitSkills } from '../../../src/generators/init';

describe('generateInitSkills', () => {
   let tmpDir: string;
   let skillsSourceDir: string;
   let originalArgv: string[];

   beforeEach(() => {
      originalArgv = process.argv;
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lux-init-test-'));
      skillsSourceDir = path.join(tmpDir, 'skills');
      fs.mkdirSync(path.join(skillsSourceDir, 'lux'), { recursive: true });
      fs.writeFileSync(path.join(skillsSourceDir, 'lux', 'skill.md'), '# Lux Skill');
   });

   afterEach(() => {
      process.argv = originalArgv;
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('copies files to target directory', () => {
      process.argv = ['node', path.join(tmpDir, 'index.js')];

      const targetDir = '.claude/skills';
      const result = generateInitSkills(targetDir, tmpDir);

      expect(result.copiedFiles).toContain('.claude/skills/lux/skill.md');
      expect(fs.existsSync(path.join(tmpDir, '.claude', 'skills', 'lux', 'skill.md'))).toBe(true);
   });

   it('returns empty array when skills dir does not exist', () => {
      const emptyTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lux-empty-'));
      try {
         process.argv = ['node', path.join(emptyTmpDir, 'index.js')];

         const result = generateInitSkills('.claude/skills', emptyTmpDir);
         expect(result.copiedFiles).toHaveLength(0);
      } finally {
         fs.rmSync(emptyTmpDir, { recursive: true, force: true });
      }
   });

   it('overwrites existing files', () => {
      const existingTarget = path.join(tmpDir, '.claude', 'skills', 'lux');
      fs.mkdirSync(existingTarget, { recursive: true });
      fs.writeFileSync(path.join(existingTarget, 'skill.md'), 'old content');

      process.argv = ['node', path.join(tmpDir, 'index.js')];

      const result = generateInitSkills('.claude/skills', tmpDir);

      const content = fs.readFileSync(path.join(existingTarget, 'skill.md'), 'utf-8');
      expect(content).toBe('# Lux Skill');
      expect(result.copiedFiles.length).toBeGreaterThan(0);
   });

   it('creates nested directory structure', () => {
      fs.mkdirSync(path.join(skillsSourceDir, 'nested', 'deep'), { recursive: true });
      fs.writeFileSync(path.join(skillsSourceDir, 'nested', 'deep', 'file.md'), 'nested');

      process.argv = ['node', path.join(tmpDir, 'index.js')];

      const result = generateInitSkills('.claude/skills', tmpDir);

      expect(result.copiedFiles).toContain('.claude/skills/lux/skill.md');
      expect(result.copiedFiles).toContain('.claude/skills/nested/deep/file.md');
   });

   it('returns targetDir in result', () => {
      process.argv = ['node', path.join(tmpDir, 'index.js')];

      const result = generateInitSkills('.opencode/skills', tmpDir);
      expect(result.targetDir).toBe('.opencode/skills');
   });
});
