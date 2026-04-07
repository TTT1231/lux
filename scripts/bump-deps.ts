/**
 * 从 npm registry 拉取最新版本，更新 src/presets/versions.ts
 *
 * 用法：pnpm bump:deps
 */
import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VERSIONS_PATH = path.resolve(__dirname, '../src/presets/versions.ts')

interface VersionMap {
  [pkg: string]: string
}

/** 从 versions.ts 中提取当前版本映射 */
function readCurrentVersions(): VersionMap {
  const content = fs.readFileSync(VERSIONS_PATH, 'utf-8')
  const versions: VersionMap = {}
  const regex = /^\s*(?:["']([^"']+)["']|([a-zA-Z@][\w@/.-]*))\s*:\s*["']([^"']+)["']/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    versions[match[1] ?? match[2]] = match[3]
  }
  return versions
}

/** 查询单个包的最新版本 */
async function getLatestVersion(pkg: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`npm view ${pkg} version`, { encoding: 'utf-8' })
    return stdout.trim()
  } catch {
    console.warn(`  ⚠ 无法获取 ${pkg} 的版本，跳过`)
    return null
  }
}

/** 生成 versions.ts 文件内容 */
function generateFile(versions: VersionMap): string {
  const entries = Object.entries(versions)
    .map(([pkg, version]) => {
      const key = /^[\w$]+$/.test(pkg) ? pkg : `"${pkg}"`
      return `  ${key}: "${version}",`
    })
    .join('\n')

  return `/** Managed dependency versions for reproducible installs */
export const DEPS_VERSIONS: Record<string, string> = {
${entries}
}

/** Resolve versions for a list of package names */
export function resolveVersions(packages: string[]): string[] {
  return packages.map(pkg => {
    const version = DEPS_VERSIONS[pkg]
    return version ? \`\${pkg}@\${version}\` : pkg
  })
}
`
}

/** 比较并收集需要更新的版本 */
function collectUpdates(
  current: VersionMap,
  results: ReadonlyArray<{ pkg: string; latest: string | null }>,
): { newVersions: VersionMap; updated: number } {
  const newVersions: VersionMap = {}
  let updated = 0

  for (const { pkg, latest } of results) {
    const currentVersion = current[pkg]

    if (!latest) {
      newVersions[pkg] = currentVersion
      continue
    }

    const currentRaw = currentVersion.replace('^', '')

    if (currentRaw !== latest) {
      console.log(`  ↑ ${pkg}: ${currentRaw} → ${latest}`)
      newVersions[pkg] = `^${latest}`
      updated++
    } else {
      console.log(`  ✓ ${pkg}: ${currentRaw}`)
      newVersions[pkg] = currentVersion
    }
  }

  return { newVersions, updated }
}

async function main(): Promise<void> {
  try {
    const current = readCurrentVersions()
    const packages = Object.keys(current)

    console.log(`正在并行检查 ${packages.length} 个依赖的最新版本...\n`)

    const results = await Promise.all(
      packages.map(async (pkg) => ({
        pkg,
        latest: await getLatestVersion(pkg),
      })),
    )

    const { newVersions, updated } = collectUpdates(current, results)

    if (updated === 0) {
      console.log('\n所有依赖已是最新版本，无需更新')
    } else {
      fs.writeFileSync(VERSIONS_PATH, generateFile(newVersions))
      console.log(`\n已更新 ${updated} 个依赖版本 → src/presets/versions.ts`)
    }
  } catch (error) {
    console.error('更新依赖版本失败:', error)
    process.exit(1)
  }
}

main()
