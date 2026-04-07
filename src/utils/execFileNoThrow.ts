import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ExecResult {
   stdout: string;
   stderr: string;
   exitCode: number | null;
}

/**
 * Safe exec wrapper.
 * Uses exec (shell mode) for cross-platform .cmd resolution (pnpm.cmd, npm.cmd).
 */
export async function execFileNoThrow(
   command: string,
   args: string[],
   options?: { cwd?: string },
): Promise<ExecResult> {
   const cmdStr = args.length > 0 ? `${command} ${args.join(' ')}` : command;

   try {
      const { stdout, stderr } = await execAsync(cmdStr, {
         cwd: options?.cwd,
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
   } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string; code?: string };
      return {
         stdout: (error.stdout ?? '').trim(),
         stderr: (error.stderr ?? '').trim(),
         exitCode: error.code === 'ENOENT' ? null : 1,
      };
   }
}
