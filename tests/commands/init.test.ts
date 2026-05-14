import { describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerInitCommand } from '../../src/commands/init';

vi.mock('@clack/prompts', () => ({
   select: vi.fn(),
   isCancel: vi.fn(),
   cancel: vi.fn(),
   outro: vi.fn(),
}));

describe('registerInitCommand', () => {
   it('registers init command with correct description', () => {
      const program = new Command();
      program.exitOverride();
      registerInitCommand(program);

      const initCmd = program.commands.find(cmd => cmd.name() === 'init');
      expect(initCmd).toBeDefined();
      expect(initCmd!.description()).toBe('Initialize skills or materialize presets');
   });

   it('init command has no required arguments', () => {
      const program = new Command();
      program.exitOverride();
      registerInitCommand(program);

      const initCmd = program.commands.find(cmd => cmd.name() === 'init');
      expect(initCmd!.registeredArguments).toHaveLength(0);
   });
});
