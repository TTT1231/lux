import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'presets', 'skills');
const destDir = path.join(rootDir, 'dist', 'skills');

if (!fs.existsSync(srcDir)) {
   console.warn('Warning: src/presets/skills/ not found, skipping asset copy.');
   process.exit(0);
}

fs.cpSync(srcDir, destDir, { recursive: true, force: true });
console.log(`Copied skill assets to ${destDir}`);
