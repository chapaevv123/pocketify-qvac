import { copyFile, readFile, rename, writeFile, constants } from 'node:fs/promises';
import path from 'node:path';
import { scanRepository } from './scanner.mjs';

export const LOCAL_CONFIG = { provider: 'qvac-sdk', model: 'QWEN3_600M_INST_Q4' };

export async function migrateExample(root) {
  const scan = await scanRepository(root);
  if (!scan.supportedMigration) throw new Error('Migration supports only a repository with OpenAICompatClient and root pocketify.json');
  const file = path.join(scan.root, 'pocketify.json');
  const current = JSON.parse(await readFile(file, 'utf8'));
  if (current.provider === 'qvac-sdk' && current.model === LOCAL_CONFIG.model) return { changed: false, file };
  if (current.provider !== 'cloud-openai-compatible' || typeof current.baseURL !== 'string' || !/^https:\/\//.test(current.baseURL) ||
      typeof current.model !== 'string' || 'apiKey' in current) {
    throw new Error('Unsupported cloud config; no files changed');
  }
  const next = { ...LOCAL_CONFIG, migratedFrom: { provider: current.provider, baseURL: current.baseURL, model: current.model } };
  const backup = `${file}.cloud.backup`;
  try { await copyFile(file, backup, constants.COPYFILE_EXCL); }
  catch (error) {
    if (error.code !== 'EEXIST' || (await readFile(backup, 'utf8')) !== (await readFile(file, 'utf8'))) {
      throw new Error(`Backup already exists with different content: ${backup}`, { cause: error });
    }
  }
  const temporary = `${file}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { flag: 'wx' });
    await rename(temporary, file);
  } catch (error) { throw new Error(`Migration failed; backup is ${backup}: ${error.message}`, { cause: error }); }
  return { changed: true, file, backup };
}
