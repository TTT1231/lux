import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger';

interface InitGenerateResult {
   copiedFiles: string[];
   targetDir: string;
}

function resolveSkillsDir(): string {
   const entryDir = path.dirname(process.argv[1] ?? '');
   return path.resolve(entryDir, 'skills');
}

function listFilesRecursive(dir: string, base: string): string[] {
   const entries = fs.readdirSync(dir, { withFileTypes: true });
   const files: string[] = [];

   for (const entry of entries) {
      const childBase = `${base}/${entry.name}`;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
         files.push(...listFilesRecursive(fullPath, childBase));
      } else {
         files.push(childBase);
      }
   }

   return files;
}

export function generateInitSkills(targetBaseDir: string, cwd: string): InitGenerateResult {
   const skillsDir = resolveSkillsDir();

   if (!fs.existsSync(skillsDir)) {
      logger.error(`Bundled skills directory not found: ${skillsDir}`);
      logger.error('Please run "lux build" or reinstall lux.');
      return { copiedFiles: [], targetDir: targetBaseDir };
   }

   const targetPath = path.resolve(cwd, targetBaseDir);

   try {
      fs.cpSync(skillsDir, targetPath, { recursive: true, force: true });
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to copy skills to ${targetPath}: ${message}`);
      return { copiedFiles: [], targetDir: targetBaseDir };
   }

   const copiedFiles = fs.existsSync(targetPath)
      ? listFilesRecursive(targetPath, targetBaseDir)
      : [];

   return { copiedFiles, targetDir: targetBaseDir };
}
