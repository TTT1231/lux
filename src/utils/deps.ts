import { fileExists } from './fs.js'
import { logger } from './logger.js'
import { resolveVersions } from '../presets/versions.js'
import { execFileNoThrow } from './execFileNoThrow.js'

export type PackageManager = 'pnpm' | 'yarn' | 'npm'

/** Detect package manager from lockfile in the given directory */
export function detectPackageManager(cwd: string): PackageManager {
  if (fileExists(`${cwd}/pnpm-lock.yaml`)) return 'pnpm'
  if (fileExists(`${cwd}/yarn.lock`)) return 'yarn'
  return 'npm'
}

/** Get the run command prefix for the detected package manager */
export function getRunPrefix(pm: PackageManager): string {
  switch (pm) {
    case 'pnpm': return 'pnpm run'
    case 'yarn': return 'yarn run'
    case 'npm': return 'npm run'
  }
}

/** Install devDependencies using the detected package manager */
export async function installDevDeps(
  packages: string[],
  cwd: string,
  pm?: PackageManager,
): Promise<void> {
  const manager = pm ?? detectPackageManager(cwd)
  const resolvedPackages = resolveVersions(packages)

  logger.info(`Installing ${resolvedPackages.length} devDependencies via ${manager}...`)

  const cmd = manager === 'pnpm'
    ? ['pnpm', 'add', '-D', ...resolvedPackages]
    : manager === 'yarn'
      ? ['yarn', 'add', '-D', ...resolvedPackages]
      : ['npm', 'install', '-D', ...resolvedPackages]

  const { stderr, exitCode } = await execFileNoThrow(cmd[0], cmd.slice(1), { cwd })

  if (exitCode !== 0) {
    logger.error(`Failed to install dependencies: ${stderr}`)
    throw new Error(`Dependency installation failed (exit code ${exitCode})`)
  }

  logger.success(`Installed ${resolvedPackages.length} packages`)
}
