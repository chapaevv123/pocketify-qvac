# Offline verification audit

## Historical receipts

Two original local receipts were reviewed without changing their verdicts:

| UTC | Receipt | Warm-up | Fresh inference | Before / after | Verdict |
| --- | --- | --- | --- | --- | --- |
| 2026-10-29 07:56:03 | `38baaf0f-f070-4e61-bf1a-5c55b8a5199c` | completed | completed, 242 ms | UNVERIFIED / UNVERIFIED (historical aggregate label) | INCONCLUSIVE |
| 2026-10-29 07:56:39 | `63ac8842-8be4-48fa-952e-39bbb728a002` | completed | completed, 223 ms | UNVERIFIED / UNVERIFIED (historical aggregate label) | INCONCLUSIVE |

The selected DNS query returned `ECONNREFUSED` and is classified `UNAVAILABLE`: this can reflect a resolver, local stack or network policy response and cannot establish physical disconnection. The direct TCP check returned `ENETUNREACH`; HTTPS failed name resolution; ICMP exited nonzero. No external route was observed reachable during the supposed online baseline, so there is no observed reachable-to-blocked transition. The video shows owner acknowledgement and the final verdict but does not show Windows adapter state.

The public [evidence page](https://pocketify-qvac.onrender.com/evidence.html) provides sanitized copies. The raw originals remain ignored under `.studio/receipts/` on the owner's machine. Sanitization removes machine paths and does not change outcomes.

## Supplementary PowerShell recording

Source `media/raw/04-powershell-network-proof.mp4` is 34.300 s, 2560×1410, 60 fps, H.264/AAC. At approximately 00:04–00:12, PowerShell shows warnings `TCP connect to (1.1.1.1 : 443) failed` and `Ping to 1.1.1.1 failed` after prompting for manual disconnection. These are observations for two checks to one destination. At approximately 00:16–00:34, the same terminal runs the scanner and local QVAC SDK; the output includes a 180 ms inference with model ID `bc5c55956168a616`, category `feature`, for the CSV export crash ticket. The benchmark ground truth for that ticket is `bug`, so this is a genuine model mismatch. The recording does not show a successful pre-disconnect connectivity check or Windows adapter state. It also does not establish an uncut visual link to either historical Studio receipt. No new automated PASS receipt was produced.

The published [8-second excerpt](https://pocketify-qvac.onrender.com/media/pocketify-network-highlight.mp4) uses source 00:04–00:12 and crops away the console prompt containing the machine user path. It preserves the probe warnings without altering their text. The original recording remains untouched and uncommitted.

## Current decision rule

`studio/probes.mjs` separates per-probe `REACHABLE`, `BLOCKED` and `UNAVAILABLE` from aggregate `INCONCLUSIVE`. DNS `ECONNREFUSED`, HTTPS name-resolution errors and local `EACCES` permission failures remain `UNAVAILABLE`; TCP `ECONNREFUSED` conservatively indicates a reachable route. A challenge returns FAIL if fresh inference fails or any external route is reachable during verification. It returns PASS only if genuine warm-up and fresh inference completed, manual disconnect was acknowledged, an external route was observed reachable before disconnection, and every selected probe was BLOCKED before and after fresh inference. All other states are INCONCLUSIVE. Each new receipt records the reason as well as raw probes.

These observations are bounded. Even PASS cannot establish absolute physical isolation of every possible path.

## Repeat the challenge

1. In a regular PowerShell window, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1` from the repository root.
2. While online, run `node .\qvac-gate.mjs` once to cache the supported model.
3. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-studio.ps1` and open `http://127.0.0.1:4317`.
4. Click **Start Offline Challenge** while definitely online; confirm that at least one external probe is REACHABLE and warm-up completes.
5. Manually disconnect Wi-Fi/Ethernet in Windows and capture the adapter state in the recording. Keep localhost open.
6. Click **Verify & Infer**. Inspect DNS/TCP/HTTPS/ICMP outcomes and the genuine QVAC answer.
7. Download the receipt. Publish it only after reviewing its input for sensitive data.
8. Restore connectivity manually.

No script disables adapters, modifies the firewall, changes boot settings or needs administrator privileges.
