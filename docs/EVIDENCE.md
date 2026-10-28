# Measured evidence summary

The full raw logs remain in the local `evidence/` directory and are intentionally excluded from Git because they include machine paths and environment details. The repository includes two full JSON and HTML evaluation snapshots in `reports/`.

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

The online download and cached inference were performed with official `@qvac/sdk`, not a substitute engine. The early TCP-only probe did **not** establish full disconnection. The current demo refuses an offline claim if either TCP or ICMP succeeds. The owner should record a manual disconnected-adapter demonstration for final submission. No cloud benchmark was performed.
