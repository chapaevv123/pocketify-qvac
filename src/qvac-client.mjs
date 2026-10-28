import { loadModel, completion, unloadModel, QWEN3_600M_INST_Q4 } from '@qvac/sdk';

export const MODEL = QWEN3_600M_INST_Q4;

export class QvacClient {
  constructor() {
    this.modelId = null;
    this.loadMs = null;
    this.chat = { completions: { create: (request) => this.create(request) } };
  }

  async open() {
    if (this.modelId) return;
    const start = performance.now();
    try {
      this.modelId = await loadModel({
        modelSrc: MODEL,
        modelConfig: { ctx_size: 2048, reasoning_budget: 0 },
      });
      this.loadMs = Math.round(performance.now() - start);
    } catch (error) {
      throw new Error(`QVAC model unavailable. Run the gate and check qvac.config.json: ${error.message}`, { cause: error });
    }
  }

  async create({ model, messages, response_format }) {
    if (model !== MODEL.name) throw new Error(`Unsupported model: ${model}. Expected ${MODEL.name}`);
    if (!Array.isArray(messages) || !messages.length) throw new Error('messages must be a nonempty array');
    await this.open();
    const started = performance.now();
    const run = completion({
      modelId: this.modelId,
      history: messages.map(({ role, content }) => ({ role, content })),
      stream: true,
      kvCache: false,
      captureThinking: true,
      ...(response_format ? { responseFormat: response_format } : {}),
    });
    const final = await run.final;
    const content = final.content || final.raw?.fullText || '';
    return {
      model: MODEL.name,
      choices: [{ message: { role: 'assistant', content } }],
      pocketify: { inferenceMs: Math.round(performance.now() - started), modelId: this.modelId,
        clientRssBytes: process.memoryUsage().rss },
    };
  }

  async close() {
    if (!this.modelId) return;
    const modelId = this.modelId;
    this.modelId = null;
    await unloadModel({ modelId });
  }
}
