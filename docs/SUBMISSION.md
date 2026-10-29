# DoraHacks submission draft (English)

## Title and pitch

**Pocketify Studio — turn off the internet. Keep the intelligence.**

Pocketify Studio is a local laboratory that scans a supported JavaScript AI workflow, safely migrates its configuration to Tether QVAC, runs real on-device Ticket Triage, and records what happens when the internet is disconnected.

## Project description

Support teams often send ticket text to a cloud LLM just to choose a queue and write a short summary. Pocketify demonstrates this workflow running on hardware the developer controls. The bundled Ticket Triage app uses an OpenAI-compatible `chat.completions.create` client shape. A scanner identifies common JS/TS LLM call sites. A migration command validates and backs up the supported example config, then routes requests to the official `@qvac/sdk`. The evaluator runs ten synthetic tickets with labels fixed independently of model output, writes a transparent JSON record, and renders an HTML report covering accuracy, latency, privacy and limitations.

Pocketify Studio adds a browser-based local instrument on `127.0.0.1:4317`. Judges can submit a ticket and see genuine local classification, summary, model identity and timing. The Offline Challenge prepares the model, asks the owner to disconnect manually, checks DNS/TCP/HTTPS/ICMP before and after real inference, and exports a JSON receipt. PASS requires all tested external routes blocked; any reachable route forces FAIL. The same interface is prepared for Render Static Site hosting, where live actions are disabled and visitors can inspect genuine recorded QVAC outputs and stored evaluations. The public site never simulates inference.

Measured runs with the release prompt on Windows 10 Pro, NVIDIA RTX 3070 and 32 GB RAM classified between 6/10 and 8/10 tickets correctly. The latest run scored 6/10 with 161.5 ms median inference and 6,006 ms model load. One earlier run scored 8/10 with 150 ms median inference. Each had a roughly 7-second first generation. This variability is a known quality limit of the small model. Cloud quality and latency were NOT MEASURED. The owner-run cached QVAC inference succeeded, but the saved offline log lacks a simultaneous connectivity record; manual network-disconnection recording is needed for final judging evidence.

## Track justification — Cloud to Pocket

The original architecture points an OpenAI-compatible client at a remote cloud API. Pocketify moves the same classification and summary task to QVAC on a personal Windows computer, then measures local quality and performance and explains the privacy gain and limits. It does not claim general automatic migration or cloud parity.

## Exact QVAC integration

`src/qvac-client.mjs` imports `loadModel`, `completion`, `unloadModel`, and `QWEN3_600M_INST_Q4` from `@qvac/sdk` 0.22.0. `src/triage.mjs` defines the structured output request. The CLI package `@qvac/cli` 0.17.0 provides `qvac doctor` and an optional OpenAI-compatible server. Both QVAC packages declare Apache-2.0 in their installed metadata. The model is the QVAC catalog's Unsloth Qwen3-0.6B Q4_0 GGUF, 382,156,480 bytes, Apache-2.0 per its source model card; the catalog SHA-256 is recorded in the evaluation. Download with `node qvac-gate.mjs` before going offline. The model weights are not in Git.

## Demo and disclosure

Setup: `scripts/setup.ps1`, then `node qvac-gate.mjs` while online. Launch with `scripts/start-studio.ps1` and open `http://127.0.0.1:4317`. Use the Live Lab, prepare the cached model, disconnect internet manually, and run the Offline Challenge. Download its receipt and capture Windows' disconnected state in the demo recording. The original CLI offline script remains available. The existing source repo is `https://github.com/chapaevv123/pocketify-qvac`; the Render Static Site URL must be added only after deployment and verification. A playable video link is unavailable until the owner records it. This project was built during the hackathon; QVAC SDK, QVAC CLI and Unsloth model weights are third-party work. No customer data, API keys or paid AI requests are included.

## 90-second demo script

| Time | Voiceover and action |
| --- | --- |
| 0–10 s | Show the Studio hero and say: “Turn off the internet. Keep the intelligence.” Click Explore the Demo. |
| 10–30 s | Select a synthetic ticket; click Analyze Locally. Show actual category, summary, QVAC model and latency. |
| 30–55 s | Click Start Offline Challenge, disconnect Wi-Fi or Ethernet visibly, confirm manual disconnection, click Verify & Infer. Show probes, real result and downloaded receipt. If probes are not all blocked, state the actual FAIL/UNVERIFIED result. |
| 55–75 s | Click See the Migration, run scanner and apply migration. Show the detected call site, QVAC config and preserved cloud backup. |
| 75–90 s | Show benchmark matrix, 6/10–8/10 run variability, cloud NOT MEASURED, evidence ledger and GitHub repository. |

## Shot list and evidence to capture

1. A playable screen recording and Windows network UI showing physical disconnection during the Studio challenge.
2. Downloaded challenge receipt JSON, its PASS/FAIL/UNVERIFIED result, and terminal output from real QVAC inference. Keep private local paths out of public screenshots.
3. Scanner output, migrated config and preserved backup in the dedicated workspace.
4. Benchmark matrix and actual stored JSON reports; show cloud NOT MEASURED.
5. Repository README, Studio screenshot, Render showcase if deployed, source integration and license disclosure.

Do not claim a video exists until a playable file has been recorded and reviewed. The DoraHacks Build must be submitted by the owner after checking the official deadline and requirements.
