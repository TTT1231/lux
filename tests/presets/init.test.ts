import { describe, expect, it } from 'vitest';
import { INIT_TOOLS } from '../../src/presets/init';

describe('INIT_TOOLS', () => {
   it('contains exactly 2 tools', () => {
      expect(INIT_TOOLS).toHaveLength(2);
   });

   it('has claude tool with correct properties', () => {
      const claude = INIT_TOOLS.find(t => t.name === 'claude');
      expect(claude).toBeDefined();
      expect(claude!.label).toBe('Claude Code');
      expect(claude!.targetDir).toBe('.claude/skills');
   });

   it('has opencode tool with correct properties', () => {
      const opencode = INIT_TOOLS.find(t => t.name === 'opencode');
      expect(opencode).toBeDefined();
      expect(opencode!.label).toBe('OpenCode');
      expect(opencode!.targetDir).toBe('.opencode/skills');
   });

   it('each tool has a unique name', () => {
      const names = INIT_TOOLS.map(t => t.name);
      expect(new Set(names).size).toBe(names.length);
   });

   it('each tool has non-empty label and targetDir', () => {
      for (const tool of INIT_TOOLS) {
         expect(tool.label.length).toBeGreaterThan(0);
         expect(tool.targetDir.length).toBeGreaterThan(0);
      }
   });
});
