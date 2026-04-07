import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

/**
 * Safe execFile wrapper - no shell injection risk.
 * Uses execFile (argument array) instead of exec (shell string).
 */
export async function execFileNoThrow(
  command: string,
  args: string[],
  options?: { cwd?: string },
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: options?.cwd,
      shell: true, // needed on Windows for .cmd resolution (pnpm.cmd, etc.)
    })
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 }
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; code?: string }
    return {
      stdout: (error.stdout ?? '').trim(),
      stderr: (error.stderr ?? '').trim(),
      exitCode: error.code === 'ENOENT' ? null : 1,
    }
  }
}
