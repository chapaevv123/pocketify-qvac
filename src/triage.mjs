import { MODEL } from './qvac-client.mjs';

export const CATEGORIES = ['billing', 'bug', 'access', 'feature', 'other'];
export const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'ticket_triage',
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES },
        summary: { type: 'string' },
      },
      required: ['category', 'summary'],
      additionalProperties: false,
    },
  },
};

export function parseTriage(content) {
  const clean = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('QVAC did not return a JSON object');
  let parsed;
  try { parsed = JSON.parse(clean.slice(start, end + 1)); }
  catch { throw new Error('QVAC returned invalid JSON'); }
  if (!CATEGORIES.includes(parsed.category) || typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
    throw new Error('QVAC returned an invalid category or empty summary');
  }
  return { category: parsed.category, summary: parsed.summary.trim() };
}

export function createTriageRequest(ticket, model = MODEL.name) {
  if (typeof ticket !== 'string' || !ticket.trim()) throw new Error('Ticket text is required');
  return {
    model,
    messages: [
      { role: 'system', content: 'Classify the support ticket. Categories: billing (charges, invoices, refunds), bug (broken behavior or errors), access (login, account, permissions), feature (request for new behavior), other (anything else). Return a JSON object with category and a one-sentence summary. Do not include private data in the summary.' },
      { role: 'user', content: ticket },
    ],
    response_format: RESPONSE_FORMAT,
  };
}

export function triageResponse(response) {
  return { ...parseTriage(response.choices[0].message.content), ...response.pocketify };
}

export async function triage(client, ticket) {
  return triageResponse(await client.chat.completions.create(createTriageRequest(ticket)));
}
