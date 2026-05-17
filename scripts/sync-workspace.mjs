#!/usr/bin/env node

// Generates worktree.code-workspace by scanning .claude/worktrees
// Usage: node scripts/sync-workspace.mjs

import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const worktreesDir = join(root, '.claude', 'worktrees');
const workspaceFile = join(root, 'worktree.code-workspace');

const folders = [{ path: '.' }];

if (existsSync(worktreesDir)) {
   const entries = readdirSync(worktreesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

   for (const dir of entries) {
      folders.push({ path: `.claude/worktrees/${dir.name}`, name: dir.name });
   }
}

const workspace = { folders, settings: {} };
writeFileSync(workspaceFile, JSON.stringify(workspace, null, '   ') + '\n');

const count = folders.length - 1;
console.log(`Updated worktree.code-workspace (${count} worktree${count !== 1 ? 's' : ''})`);
