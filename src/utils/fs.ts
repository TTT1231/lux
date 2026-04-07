import fs from 'node:fs'
import path from 'node:path'
import { logger } from './logger.js'

/** Check if a file exists */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

/** Ensure directory exists, create if missing */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/** Write file with directory auto-creation */
export function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf-8')
}

/** Read and parse JSON file, return null if not exists or parse error */
export function readJson<T = Record<string, unknown>>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Write JSON with 2-space indent + trailing newline */
export function writeJson(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2) + '\n'
  writeFile(filePath, content)
}

/** Backup a file by copying to <file>.bak */
export function backupFile(filePath: string): boolean {
  if (!fileExists(filePath)) return false
  const bakPath = filePath + '.bak'
  fs.copyFileSync(filePath, bakPath)
  logger.info(`Backed up ${path.basename(filePath)} → ${path.basename(bakPath)}`)
  return true
}

/**
 * Deep merge two objects.
 * Strategy parameter controls priority:
 * - 'preset': preset values override existing for conflict keys
 * - 'user': existing values override preset for conflict keys
 */
export function deepMerge<T extends Record<string, unknown>>(
  preset: T,
  existing: T,
  strategy?: {
    presetPriorityKeys?: Set<string>
    userPriorityKeys?: Set<string>
  },
): T {
  const result = { ...existing } as Record<string, unknown>

  for (const [key, presetVal] of Object.entries(preset)) {
    const existingVal = (existing as Record<string, unknown>)[key]

    // Key not in existing → use preset value
    if (existingVal === undefined) {
      result[key] = presetVal
      continue
    }

    // User priority key → keep existing
    if (strategy?.userPriorityKeys?.has(key)) {
      continue
    }

    // Both are objects (not null, not arrays) → recurse
    if (
      isPlainObject(presetVal) &&
      isPlainObject(existingVal)
    ) {
      result[key] = deepMerge(
        presetVal as Record<string, unknown>,
        existingVal as Record<string, unknown>,
        strategy,
      )
      continue
    }

    // Preset priority key or default → use preset value
    result[key] = presetVal
  }

  return result as T
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

/**
 * Write a config file with conflict handling
 * @returns true if file was written
 */
export function writeConfigFile(
  filePath: string,
  content: string,
  options: {
    force?: boolean
    mustOverwrite?: boolean
    neverOverwrite?: boolean
    dryRun?: boolean
    merge?: boolean
    mergeStrategy?: {
      presetPriorityKeys?: Set<string>
      userPriorityKeys?: Set<string>
    }
  },
): boolean {
  const { force, mustOverwrite, neverOverwrite, dryRun, merge, mergeStrategy } = options
  const exists = fileExists(filePath)

  // Never overwrite this file
  if (exists && neverOverwrite) {
    logger.skip(filePath, 'protected, will not modify')
    return false
  }

  // Merge mode (for .vscode/settings.json)
  if (exists && merge) {
    const existingContent = fs.readFileSync(filePath, 'utf-8')
    try {
      const existingData = JSON.parse(existingContent)
      const newData = JSON.parse(content)
      const merged = deepMerge(newData, existingData, mergeStrategy)

      if (dryRun) {
        logger.info(`[dry-run] Would merge ${path.basename(filePath)}`)
        return true
      }

      backupFile(filePath)
      writeJson(filePath, merged)
      logger.overwrite(filePath)
      return true
    } catch {
      logger.warn(`Failed to parse ${filePath}, overwriting`)
    }
  }

  // File exists, handle conflicts
  if (exists && !force && !mustOverwrite) {
    logger.skip(filePath, 'already exists (use --force to overwrite)')
    return false
  }

  // Write the file
  if (dryRun) {
    logger.info(`[dry-run] Would create ${path.basename(filePath)}`)
    return true
  }

  writeFile(filePath, content)
  if (exists) {
    logger.overwrite(filePath)
  } else {
    logger.create(filePath)
  }
  return true
}
