# DoraHacks submission draft (English)

## Title and pitch

**Pocketify — move a cloud ticket workflow onto your own device.**

Pocketify scans a supported JavaScript integration, safely migrates its configuration to Tether QVAC, and measures local ticket triage quality and speed against a synthetic, independently labeled dataset.

## Project description

Support teams often send ticket text to a cloud LLM just to choose a queue and write a short summary. Pocketify demonstrates this workflow running on hardware the developer controls. The bundled Ticket Triage app uses an OpenAI-compatible `chat.completions.create` client shape. A scanner identifies common JS/TS LLM call sites. A migration command validates and backs up the supported example config, then routes requests to the official `@qvac/sdk`. The evaluator runs ten synthetic tickets with labels fixed independently of model output, writes a transparent JSON record, and renders an HTML report covering accuracy, latency, privacy and limitations.

Measured runs with the release prompt on Windows 10 Pro, NVIDIA RTX 3070 and 32 GB RAM classified between 6/10 and 8/10 tickets correctly. The latest run scored 6/10 with 161.5 ms median inference and 6,006 ms model load. One earlier run scored 8/10 with 150 ms median inference. Each had a roughly 7-second first generation. This variability is a known quality limit of the small model. Cloud quality and latency were NOT MEASURED. The owner-run cached QVAC inference succeeded, but the saved offline log lacks a simultaneous connectivity record; manual network-disconnection recording is needed for final judging evidence.

## Track justification — Cloud to Pocket

The original architecture points an OpenAI-compatible client at a remote cloud API. Pocketify moves the same classification and summary task to QVAC on a personal Windows computer, then measures local quality and performance and explains the privacy gain and limits. It does not claim general automatic migration or cloud parity.

## Exact QVAC integration

`src/qvac-client.mjs` imports `loadModel`, `completion`, `unloadModel`, and `QWEN3_600M_INST_Q4` from `@qvac/sdk` 0.22.0. `src/triage.mjs` defines the structured output request. The CLI package `@qvac/cli` 0.17.0 provides `qvac doctor` and an optional OpenAI-compatible server. Both QVAC packages declare Apache-2.0 in their installed metadata. The model is the QVAC catalog's Unsloth Qwen3-0.6B Q4_0 GGUF, 382,156,480 bytes, Apache-2.0 per its source model card; the catalog SHA-256 is recorded in the evaluation. Download with `node qvac-gate.mjs` before going offline. The model weights are not in Git.

## Demo and disclosure

Setup: `scripts/setup.ps1`, then `node qvac-gate.mjs` while online. Disconnect internet manually. Run `scripts/demo-offline.cmd`, inspect `reports/latest.html`, and show the saved connectivity and adapter evidence. The source repo must be made public and a playable video link attached before submission. This project was built during the hackathon; QVAC SDK, QVAC CLI and Unsloth model weights are third-party work. No customer data, API keys or paid AI requests are included.

## 90-second demo script

| Time | Voiceover and action |
| --- | --- |
| 0–12 s | “Ticket triage often sends private support text to a cloud AI. Pocketify brings that task onto this laptop.” Show cloud-oriented config. |
| 12–25 s | Run scanner; show the detected client call site. |
| 25–38 s | Run migration; show backup and local QVAC config. |
| 38–50 s | Show Windows internet disconnected, then run Ticket Triage. |
| 50–68 s | Run offline evaluation and show ten synthetic ticket outcomes. |
| 68–82 s | Open HTML report: accuracy, latency, model identity, cloud NOT MEASURED. |
| 82–90 s | “Official QVAC SDK, cached Qwen3 model, no cloud AI request.” Show repo and limitations. |

## Shot list and evidence to capture

1. Windows network UI showing disconnection and `evidence/demo-offline-connectivity.txt`.
2. `qvac doctor --json` success and model cache status without showing private paths if sharing publicly.
3. Scanner output, migration backup, Ticket Triage classification and summary.
4. Offline evaluation terminal and `reports/latest.html` with model/accuracy/latency.
5. Repository README, source integration lines and license disclosure.

Do not claim a video exists until a playable file has been recorded and reviewed. The DoraHacks Build must be submitted by the owner after checking the official deadline and requirements.
