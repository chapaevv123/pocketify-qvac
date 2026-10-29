# Pocketify Studio — submission copy

## Project title

Pocketify Studio — Turn off the internet. Keep the intelligence.

## Short pitch

Pocketify safely migrates a supported cloud AI ticket workflow to local inference with the official QVAC SDK, then makes the result inspectable through a public browser lab, measured runs and an honest offline challenge.

## Detailed description

Support teams often send ticket text to a cloud model to classify a request and write a summary. Pocketify demonstrates that same supported workflow running through a model cached on the developer's own device. Its scanner locates common OpenAI-compatible JS/TS patterns. For the bundled Ticket Triage example, a validated migration changes only `pocketify.json`, preserves the cloud original and routes the familiar client shape to official `@qvac/sdk` 0.22.0. The local QVAC Bare worker loads `QWEN3_600M_INST_Q4` and generates real classifications and summaries without a paid API.

The public Render Static Site is useful without installation: visitors can execute the scanner against bundled source, migrate an isolated in-memory configuration, inspect the exact diff and backup, explore every saved QVAC ticket outcome, and run browser network diagnostics. The public site does **not** execute QVAC inference. Fresh inference and the Offline Challenge run only in the loopback Studio on the owner's device.

The offline challenge checks the cached model, performs genuine warm-up inference, asks the user to disconnect through normal OS controls, samples DNS/TCP/HTTPS/ICMP before and after fresh inference, and exports a JSON receipt. It distinguishes a sampled connectivity observation from proof of complete physical isolation. The two historical receipts are **INCONCLUSIVE**: fresh QVAC output succeeded, but DNS returned an ambiguous `ECONNREFUSED` and no external route was observed reachable before disconnection. The supplied film does not show Windows adapter state.

A supplementary PowerShell recording visibly shows failed TCP 1.1.1.1:443 and ping 1.1.1.1 checks, then genuine local QVAC inference in the same terminal. The latter returned `feature` for a CSV export crash ticket in 180 ms; its benchmark label is `bug`. The recording lacks a successful online baseline and visible adapter state. It is additional visual evidence, not a replacement for the historical INCONCLUSIVE receipts or absolute proof of isolation.

Five genuine ten-ticket runs are preserved, including regressions: the original prompt scored 8/10, 6/10 and 6/10; a generic prompt revision scored 6/10 and 5/10 and was reverted. Cloud quality and latency were not measured. The interface shows mismatches and full source records rather than presenting only the favorable run.

## Technical highlights

- Official `@qvac/sdk` 0.22.0, `QWEN3_600M_INST_Q4`, local model ID `bc5c55956168a616`.
- Reusable scanner rules shared between CLI and browser lab.
- Safe migration scope: validated demo config only, original backup, post-migration diff and reset.
- Read-only public evidence with five full evaluation JSON files and two sanitized local challenge receipts.
- Conservative verdict logic: ambiguous DNS/HTTPS failures remain UNAVAILABLE; PASS requires a reachable online baseline and blocked selected checks during fresh inference.
- Existing free Render Static Site; no server-side inference, paid API or public model weights.

## Ready-to-use links

| Item | URL |
| --- | --- |
| Public demo | https://pocketify-qvac.onrender.com/ |
| 109-second video | https://pocketify-qvac.onrender.com/media/pocketify-demo-1080p.mp4 |
| PowerShell probe excerpt | https://pocketify-qvac.onrender.com/media/pocketify-network-highlight.mp4 |
| Embedded player | https://pocketify-qvac.onrender.com/#watch |
| Evidence and JSON receipts | https://pocketify-qvac.onrender.com/evidence.html |
| Offline instructions | https://pocketify-qvac.onrender.com/offline.html |
| Source code | https://github.com/chapaevv123/pocketify-qvac |

Verify these public URLs after the latest Render deployment before pasting them into a hackathon form.

## Honest limitations

The 0.6B model makes classification errors. The public site cannot run the QVAC worker. The supplied offline film ends INCONCLUSIVE and does not independently show Windows adapter state. Failed selected probes cannot prove every route unavailable. No cloud baseline, customer data, API key or paid inference was used. Do not describe the historical receipts as PASS.

## Media and provenance

The final video is 109 seconds at 1920×1080, 30 fps, and uses all four original owner recordings. It has readable English captions, no added music and no speed manipulation. The PowerShell excerpt is cropped to exclude a local user path; the original is untouched. The [source manifest](../site/media/source-manifest.json) lists exact clips and timestamps; raw recordings are excluded from Git. [Full video notes](VIDEO_DEMO.md).
