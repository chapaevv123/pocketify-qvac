import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { OpenAICompatClient } from '../../src/openai-compatible-client.mjs';
import { createTriageRequest, triageResponse } from '../../src/triage.mjs';

const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pocketify.json');
export async function runTicket(text) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const client = new OpenAICompatClient(config);
  try {
    const response = await client.chat.completions.create(createTriageRequest(text, config.model));
    return triageResponse(response);
  }
  finally { await client.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await runTicket(process.argv.slice(2).join(' ')), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
