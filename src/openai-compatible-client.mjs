import { QvacClient } from './qvac-client.mjs';

export class OpenAICompatClient {
  constructor(config) {
    if (config.provider === 'qvac-sdk') {
      this.backend = new QvacClient();
      this.chat = this.backend.chat;
      return;
    }
    if (config.provider !== 'cloud-openai-compatible') throw new Error(`Unsupported provider: ${config.provider}`);
    if (process.env.POCKETIFY_ALLOW_CLOUD !== '1') {
      throw new Error('Cloud calls are disabled. Run Pocketify migration for free local QVAC inference. No API request was sent.');
    }
    if (typeof config.baseURL !== 'string' || !config.baseURL.startsWith('https://')) throw new Error('Cloud baseURL must use HTTPS');
    if (config.apiKeyEnv !== 'OPENAI_API_KEY') throw new Error('Unsupported cloud API key environment variable');
    const key = process.env[config.apiKeyEnv];
    if (!key) throw new Error(`Missing ${config.apiKeyEnv}; no API request was sent`);
    this.chat = { completions: { create: async (request) => {
      const response = await fetch(`${config.baseURL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`Cloud request failed with HTTP ${response.status}`);
      return response.json();
    } } };
  }

  async close() { await this.backend?.close(); }
}
