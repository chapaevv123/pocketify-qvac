# Measured evidence summary

## Interactive release provenance

The browser scanner reads the bundled `app.mjs` source from build data and applies the same detection rules imported by the CLI scanner. Browser migration executes a validated configuration transform in memory, with preserved original backup; no visitor file or Git repository is written. Public QVAC ticket records are exact rows from committed evaluation JSON. Browser network checks only measure same-origin fetches, browser events and timings; caches or service workers may satisfy requests. Neither these checks nor Node's selected external probes establish absolute internet isolation.

The original committed ten-ticket QVAC runs are **8/10, 6/10 and 6/10** with median inference **150, 158 and 161.5 ms**. The most persistent errors are `access` and `feature` requests classified as `other`; another run also misclassified billing and bug examples. A generic prompt clarification was tested twice with unchanged ground truth; it scored **6/10 (152.5 ms median)** and **5/10 (138 ms median)**. Both raw regressions remain in `reports/prompt-refined-run-1.json` and `reports/prompt-refined-run-2.json`. The clarification was reverted. The prompt defines labels, constrained JSON is parsed strictly, and the evaluator preserves all mismatches. No quality improvement is claimed. A physical-disconnect PASS remains unverified.

The full raw logs remain in the local `evidence/` directory and are intentionally excluded from Git because they include machine paths and environment details. The repository includes three full JSON and HTML evaluation snapshots in `reports/`. Studio's public screenshots in `site/` are genuine browser captures of the local interface; the Live Lab capture shows a real QVAC response.

| Check | Observed result |
| --- | --- |
| `qvac doctor --json` | All required checks passed; Windows x64, Node 22.23.1, RTX 3070 Vulkan, QVAC SDK 0.22.0 |
| Catalog model | `QWEN3_600M_INST_Q4`, `Qwen3-0.6B-Q4_0.gguf`, 382,156,480 bytes, SHA-256 `33bcc57074ec7b6eada5a90651ee546ec0c2b271002c22baf9f1b2dd1e8f75cb` |
| Owner online gate | Genuine model load and generated text; inference 4,968 ms after first download |
| Owner cached gate | Genuine cached model load and generated text; inference 627 ms; adapter or connectivity state was not saved |
| Codex cached gate | Genuine cached model load and generated text; inference 4,466 ms while a direct registry connection failed |
| Evaluation, first release prompt run | 8/10 accuracy, median 150 ms; `reports/sample-2026-10-29.json` |
| Evaluation, later release prompt run | 6/10 accuracy, median 158 ms; `reports/sample-release-2026-10-29.json` |
| Evaluation, current release prompt run | 6/10 accuracy, median 161.5 ms; `reports/sample-current-2026-10-29.json`; the expanded probe found ICMP reachable, so this is marked non-offline |
| Outbound probe during early evaluation | TCP to `1.1.1.1:443` failed with `EACCES`, but a later ICMP ping to 1.1.1.1 succeeded; the early probe did not establish full disconnection |
| Unit tests | 4/4 passed |
| Real QVAC integration test | 1/1 passed with cached model |
| Current offline-script guard | Refused the run because TCP failed but ICMP succeeded; exit 1 before migration or inference |
| Optional QVAC HTTP endpoint | Preloaded the same cached model; `/v1/chat/completions` returned HTTP 500 in the Codex sandbox because QVAC could not create its KV cache under the protected user profile. Raw logs: local `evidence/qvac-http-server.txt` and `evidence/qvac-http-response.txt`. |
| Git publication | `.git` initialized, but sandbox denied `.git/index.lock`; `gh auth status` reported invalid token. Raw logs remain in local evidence. |
| Studio Live Lab API | Real `QWEN3_600M_INST_Q4` billing classification, model ID `bc5c55956168a616`, first request 7,181 ms. Browser interaction classified a CSV crash as `bug`; warm inference 465 ms in the public capture. |
| Studio Offline Challenge in Codex sandbox | Real QVAC inference completed (billing, 382 ms) with DNS/TCP/HTTPS blocked but ICMP reachable both before and after. Verdict **FAIL**, receipt `13b5d2a6-ac8b-4519-a312-39666d9a3bd1` saved locally. This validates conservative rejection, not an offline success. |
| Studio fresh evaluation | 6/10, median 170.5 ms, model load 5,948 ms on 2026-10-28 23:38:57 UTC; local ignored `reports/latest.json`. |
| Studio API and UI tests | 4/4 API/safety tests, 1/1 real QVAC API integration test, and CDP browser check at 390 px (no horizontal overflow, real button-to-model result). |

The online download and cached inference were performed with official `@qvac/sdk`, not a substitute engine. The early TCP-only probe did **not** establish full disconnection. The current demo refuses an offline claim if either TCP or ICMP succeeds. The owner should record a manual disconnected-adapter demonstration for final submission. No cloud benchmark was performed.
