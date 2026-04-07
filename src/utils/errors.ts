import chalk from 'chalk'

export class CliError extends Error {
  code: string
  suggestion?: string

  constructor(message: string, code: string, suggestion?: string) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.suggestion = suggestion
  }
}

export class PresetNotFoundError extends CliError {
  constructor(name: string, available: string[]) {
    const suggestion = fuzzyMatchPreset(name, available)
    const msg = suggestion
      ? `Preset '${name}' not found. Did you mean '${suggestion}'?`
      : `Preset '${name}' not found. Available: ${available.join(', ')}`
    super(msg, 'PRESET_NOT_FOUND', suggestion ?? undefined)
  }
}

export function fuzzyMatchPreset(input: string, available: string[]): string | null {
  // Levenshtein distance for fuzzy matching
  let best = null as string | null
  let bestDist = Infinity

  for (const name of available) {
    const dist = levenshtein(input.toLowerCase(), name.toLowerCase())
    if (dist < bestDist && dist <= Math.max(2, Math.floor(name.length / 3))) {
      bestDist = dist
      best = name
    }
  }

  return best
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[])

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[m][n]
}

interface Named {
  name: string
}

export function resolvePreset<T extends Named>(presets: T[], name: string): T | undefined {
  const found = presets.find(p => p.name === name)
  if (!found) {
    const err = new PresetNotFoundError(name, presets.map(p => p.name))
    console.error(chalk.red('✖'), err.message)
    process.exit(1)
  }
  return found
}
