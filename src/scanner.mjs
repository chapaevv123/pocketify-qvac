import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const SKIP = new Set(['node_modules', '.git', '.qvac', 'dist', 'build', 'coverage']);
const PATTERNS = [
  ['openai-import', /(?:from\s*['"]openai['"]|require\(['"]openai['"]\))/g],
  ['openai-constructor', /new\s+OpenAI\s*\(/g],
  ['chat-completions', /\.chat\.completions\.create\s*\(/g],
  ['responses-api', /\.responses\.create\s*\(/g],
  ['pocketify-client', /new\s+OpenAICompatClient\s*\(/g],
];

export async function scanRepository(root, { maxFiles = 500 } = {}) {
  const base = await realpath(root);
  const findings = [];
  let count = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.isFile() || !EXT.has(path.extname(entry.name))) continue;
      if (++count > maxFiles) throw new Error(`Scan limit exceeded (${maxFiles} source files)`);
      if ((await stat(full)).size > 1024 * 1024) continue;
      const source = await readFile(full, 'utf8');
      for (const [kind, regex] of PATTERNS) {
        for (const match of source.matchAll(regex)) {
          const line = source.slice(0, match.index).split('\n').length;
          findings.push({ file: path.relative(base, full).replaceAll('\\', '/'), line, kind });
        }
      }
    }
  }
  await walk(base);
  return { root: base, scannedFiles: count, findings,
    supportedMigration: findings.some((x) => x.kind === 'pocketify-client') &&
      (await fileExists(path.join(base, 'pocketify.json'))) };
}

async function fileExists(file) { try { await stat(file); return true; } catch { return false; } }
