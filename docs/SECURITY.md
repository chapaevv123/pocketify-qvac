# Security and limitations

- The example includes an OpenAI-compatible HTTPS cloud transport to make the original workflow concrete. It is disabled by default and requires both `POCKETIFY_ALLOW_CLOUD=1` and an API key from `OPENAI_API_KEY`; no cloud request was made during this project. Migration selects local QVAC and no API key is needed for the demo.
- Offline mode checks outbound TCP and ICMP before evaluation. It does not change firewall rules or adapters. Failed probes cannot prove every route is blocked; show Windows disconnected state in the judge recording.
- Model download and npm setup require connectivity. The exact GGUF comes from the QVAC catalog and is validated by its SHA-256. Do not commit `.qvac/` or `node_modules/`.
- Scanner reads only JS/TS files, skips common generated directories and symlinks, and caps file count and size. It reports patterns; it does not execute scanned code.
- Migration accepts only a known config shape, keeps a backup, writes a temporary file then renames it, and refuses unknown providers. An existing backup causes a safe error rather than overwrite.
- Tickets in the dataset are synthetic. Do not put customer secrets in demo inputs or commit environment files. QVAC local inference reduces exposure to external AI providers, but local OS users and processes with access to this machine may still inspect data or model caches.
- The model can be inaccurate, especially on ambiguous requests. The report retains every mismatch and does not invent a cloud baseline. Client RSS and host free RAM are not precise worker memory measurements.
- The optional QVAC HTTP server should bind to loopback by default. This MVP uses the direct SDK because the server's KV cache path is protected in the Codex sandbox.
