#!/usr/bin/env node
import path from 'node:path';
import { scanRepository } from './src/scanner.mjs';
import { migrateExample } from './src/migration.mjs';
import { evaluate } from './src/evaluation.mjs';
import { runTicket } from './examples/ticket-triage/app.mjs';

const [command, ...args] = process.argv.slice(2);
const help = `Pocketify CLI
  node pocketify.mjs scan [directory]
  node pocketify.mjs migrate [directory]
  node pocketify.mjs triage "ticket text"
  node pocketify.mjs eval [--offline]
  node pocketify.mjs help`;
try {
  if (command === 'scan') console.log(JSON.stringify(await scanRepository(path.resolve(args[0] || 'examples/ticket-triage')), null, 2));
  else if (command === 'migrate') console.log(JSON.stringify(await migrateExample(path.resolve(args[0] || 'examples/ticket-triage')), null, 2));
  else if (command === 'triage') console.log(JSON.stringify(await runTicket(args.join(' ')), null, 2));
  else if (command === 'eval') {
    const result = await evaluate({ offline: args.includes('--offline') });
    console.log(JSON.stringify({ accuracy: result.accuracy, medianLatencyMs: result.medianLatencyMs,
      model: result.model, offlineRequested: result.offlineRequested, networkProbe: result.networkProbe,
      report: 'reports/latest.html' }, null, 2));
    if (result.successfulInferences !== result.count) process.exitCode = 1;
  } else if (!command || command === 'help' || command === '--help') console.log(help);
  else throw new Error(`Unknown command: ${command}\n${help}`);
} catch (error) { console.error(`Pocketify: ${error.message}`); process.exit(1); }
