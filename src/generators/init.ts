import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger';

interface InitGenerateResult {
   skillNames: string[];
   targetDir: string;
}

function resolveSkillsDir(): string {
   const entryDir = path.dirname(process.argv[1] ?? '');
   return path.resolve(entryDir, 'skills');
}

function listTopLevelEntries(dir: string): string[] {
   return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
}

export function generateInitSkills(targetBaseDir: string, cwd: string): InitGenerateResult {
   const skillsDir = resolveSkillsDir();

   if (!fs.existsSync(skillsDir)) {
      logger.error(`Bundled skills directory not found: ${skillsDir}`);
      logger.error('Please run "lux build" or reinstall lux.');
      return { skillNames: [], targetDir: targetBaseDir };
   }

   const skillNames = listTopLevelEntries(skillsDir);
   const targetPath = path.resolve(cwd, targetBaseDir);

   try {
      fs.cpSync(skillsDir, targetPath, { recursive: true, force: true });
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to copy skills to ${targetPath}: ${message}`);
      return { skillNames: [], targetDir: targetBaseDir };
   }

   return { skillNames, targetDir: targetBaseDir };
}
