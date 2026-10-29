# Pocketify Studio: 90–120 second recording

Use `https://pocketify-qvac.onrender.com/` for scenes 1–4 and 6 after the new Render deployment is verified, and the local Studio at `http://127.0.0.1:4317` for scene 5. A physical-disconnect PASS is still pending owner verification. Do not narrate PASS unless the downloaded receipt says PASS.

| Time | Screen and narration |
| --- | --- |
| 0–12 s | Hero. “Pocketify moves a supported cloud AI ticket workflow to local QVAC.” Show the four entry points. |
| 12–30 s | Run Scanner. Point to actual file, line and call-site excerpt. |
| 30–48 s | Apply Safe Migration. Show before/after config, exact diff and preserved backup. Reset if desired. |
| 48–66 s | Select two recorded QVAC tickets, including a mismatch. Show original input, observed output, expected label and latency. Say “recorded, not fresh inference.” |
| 66–96 s | Open local Studio. Run fresh inference, Prepare (cache check and warm-up), physically disconnect Wi-Fi/Ethernet with Windows controls, Verify & Infer, download receipt. Show actual verdict; if FAIL/INCONCLUSIVE, state it plainly. |
| 96–115 s | Show original 8/10, 6/10, 6/10 and reverted experimental 6/10, 5/10 runs, source repository and reproducibility instructions. |

Before recording: run `node .\qvac-gate.mjs` while online if weights are not cached, then `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-studio.ps1`. Keep localhost open during disconnection. Reconnect manually afterward. The public browser diagnostics are an additional interactive scene, not evidence of physical disconnection.
