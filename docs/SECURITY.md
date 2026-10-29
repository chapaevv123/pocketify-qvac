# Security and limitations

- The example includes an OpenAI-compatible HTTPS cloud transport to make the original workflow concrete. It is disabled by default and requires both `POCKETIFY_ALLOW_CLOUD=1` and an API key from `OPENAI_API_KEY`; no cloud request was made during this project. Migration selects local QVAC and no API key is needed for the demo.
- Offline mode checks outbound TCP and ICMP before evaluation. It does not change firewall rules or adapters. Failed probes cannot prove every route is blocked; show Windows disconnected state in the judge recording.
- Model download and npm setup require connectivity. The exact GGUF comes from the QVAC catalog and is validated by its SHA-256. Do not commit `.qvac/` or `node_modules/`.
- Scanner reads only JS/TS files, skips common generated directories and symlinks, and caps file count and size. It reports patterns; it does not execute scanned code.
- Migration accepts only a known config shape, keeps a backup, writes a temporary file then renames it, and refuses unknown providers. An existing backup causes a safe error rather than overwrite.
- Tickets in the dataset are synthetic. Do not put customer secrets in demo inputs or commit environment files. QVAC local inference reduces exposure to external AI providers, but local OS users and processes with access to this machine may still inspect data or model caches.
- The model can be inaccurate, especially on ambiguous requests. The report retains every mismatch and does not invent a cloud baseline. Client RSS and host free RAM are not precise worker memory measurements.
- The optional QVAC HTTP server should bind to loopback by default. This MVP uses the direct SDK because the server's KV cache path is protected in the Codex sandbox.

## Studio-specific controls

- Studio binds to `127.0.0.1` by default. Its fixed static asset list prevents path traversal. API requests require a loopback Host; cross-origin POST requests are rejected. Only JSON request bodies up to 8 KiB are accepted. The web UI uses text nodes for model output and scan findings to avoid HTML injection.
- API routes never accept a filesystem path or shell command. Migration touches only the ignored dedicated `examples/studio-workspace/`, uses the existing validated migration function, and retains the backup. Its reset action replaces only the demo config.
- The Offline Challenge does not change Windows adapters, firewall, registry, drivers or network settings. It probes DNS, TCP, HTTPS and ICMP to external targets before and after inference. A reachable probe makes FAIL, including when another probe fails. An unavailable probe makes UNVERIFIED unless an external route is known reachable. A checked manual-disconnection box is a user statement, not an independently authenticated Windows adapter state.
- A receipt contains model identity, timings, probe results and SHA-256 hashes of input/output, but no raw ticket text. It is saved locally under ignored `.studio/receipts/`. Anyone with local filesystem access may still inspect tickets during processing or receipts afterward. A receipt is not cryptographic proof of total network isolation.
- The public Render Static Site has no inference API. It displays stored evaluations, recorded sample-ticket outputs and genuine captured screenshots. Only `site/` is published; `.studio/`, `.qvac/`, model weights, `node_modules/`, local config and owner evidence logs stay outside the publish directory.
