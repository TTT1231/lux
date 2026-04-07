import type { Command } from "commander";
import { VSCODE_PRESETS } from "../presets/vscode";
import { logger } from "../utils/logger.js";
import { resolvePreset } from "../utils/errors.js";
import {
  generateAllVscode,
  type GenerateOptions,
} from "../generators/vscode.js";

export function registerVscodeCommand(program: Command) {
  const vscode = program.command("vscode");

  vscode
    .command("init <preset>")
    .description("Initialize VSCode config with preset")
    .option("--force", "Force overwrite existing files")
    .option("--dry-run", "Preview without writing files")
    .action(
      async (
        presetName: string,
        options: { force?: boolean; dryRun?: boolean },
      ) => {
        const preset = resolvePreset(VSCODE_PRESETS, presetName);
        if (!preset) return;

        const cwd = process.cwd();
        const opts: GenerateOptions = {
          cwd,
          force: options.force ?? false,
          dryRun: options.dryRun ?? false,
        };

        logger.info(`Initializing vscode preset: ${preset.name}`);
        logger.info(`Description: ${preset.description}`);

        // Generate vscode config files
        const generated = generateAllVscode(preset, opts);

        if (generated.length === 0) {
          logger.warn("No files generated");
          return;
        }

        logger.success(`Generated ${generated.length} config file(s)`);
        logger.success("vscode init complete!");
      },
    );

  vscode
    .command("list")
    .description("List available vscode presets")
    .action(() => {
      logger.info("Available vscode presets:");
      for (const p of VSCODE_PRESETS) {
        console.log(`  ${p.name.padEnd(12)} ${p.description}`);
      }
    });
}
