import path from "node:path";
import type { Command } from "commander";
import { FMT_PRESETS } from "../presets/fmt";
import { logger } from "../utils/logger.js";
import { resolvePreset } from "../utils/errors.js";
import { generateAllFmt, type GenerateOptions } from "../generators/fmt.js";
import {
  detectPackageManager,
  installDevDeps,
  getRunPrefix,
} from "../utils/deps.js";
import { readJson, writeJson, fileExists } from "../utils/fs.js";

export function registerFmtCommand(program: Command) {
  const fmt = program.command("fmt");

  fmt
    .command("init <preset>")
    .description("Initialize formatting config with preset")
    .option("--force", "Force overwrite existing files")
    .option("--no-install", "Skip dependency installation")
    .option("--dry-run", "Preview without writing files")
    .action(
      async (
        presetName: string,
        options: { force?: boolean; install?: boolean; dryRun?: boolean },
      ) => {
        const preset = resolvePreset(FMT_PRESETS, presetName);
        if (!preset) return;

        const cwd = process.cwd();
        const opts: GenerateOptions = {
          cwd,
          force: options.force ?? false,
          dryRun: options.dryRun ?? false,
        };

        logger.info(`Initializing fmt preset: ${preset.name}`);
        logger.info(`Description: ${preset.description}`);

        // Generate config files
        const generated = generateAllFmt(preset, opts);

        if (generated.length === 0) {
          logger.warn("No files generated");
          return;
        }

        logger.success(`Generated ${generated.length} config file(s)`);

        // Inject scripts into package.json
        if (preset.scripts) {
          await injectScripts(preset.scripts, opts);
        }

        // Install dependencies
        if (preset.dependencies?.dev && options.install !== false) {
          if (opts.dryRun) {
            logger.info(
              `[dry-run] Would install: ${preset.dependencies.dev.join(", ")}`,
            );
          } else {
            try {
              await installDevDeps(preset.dependencies.dev, cwd);
            } catch {
              logger.warn(
                "Dependency installation failed. You can install manually.",
              );
            }
          }
        } else if (preset.dependencies?.dev && options.install === false) {
          logger.info("Dependencies to install:");
          for (const dep of preset.dependencies.dev) {
            console.log(`  - ${dep}`);
          }
        }

        logger.success("fmt init complete!");
      },
    );

  fmt
    .command("list")
    .description("List available fmt presets")
    .action(() => {
      logger.info("Available fmt presets:");
      for (const p of FMT_PRESETS) {
        console.log(`  ${p.name.padEnd(12)} ${p.description}`);
      }
    });
}

/** Inject scripts into package.json, respecting conflict handling */
async function injectScripts(
  scripts: Record<string, string>,
  opts: GenerateOptions,
): Promise<void> {
  const pkgPath = path.join(opts.cwd, "package.json");
  const pkg = readJson<Record<string, unknown>>(pkgPath);

  if (!pkg) {
    logger.warn("package.json not found, skipping scripts injection");
    return;
  }

  const existingScripts = (pkg.scripts ?? {}) as Record<string, string>;
  const pm = detectPackageManager(opts.cwd);
  const prefix = getRunPrefix(pm);

  // Resolve <pm> placeholders in script values
  const resolvedScripts: Record<string, string> = {};
  for (const [key, value] of Object.entries(scripts)) {
    resolvedScripts[key] = value.replace(/<pm>/g, prefix);
  }

  let added = 0;
  let skipped = 0;

  for (const [key, value] of Object.entries(resolvedScripts)) {
    if (existingScripts[key] !== undefined && !opts.force) {
      logger.skip(`script:${key}`, "already exists");
      skipped++;
      continue;
    }

    if (opts.dryRun) {
      logger.info(`[dry-run] Would add script: ${key}`);
      added++;
      continue;
    }

    existingScripts[key] = value;
    added++;
  }

  if (added > 0 && !opts.dryRun) {
    pkg.scripts = existingScripts;
    writeJson(pkgPath, pkg);
    logger.success(`Scripts: ${added} added, ${skipped} skipped`);
  }
}
