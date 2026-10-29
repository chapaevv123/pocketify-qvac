# Final demo film

The edited [101-second MP4](../site/media/pocketify-demo-1080p.mp4) is 1920×1080 H.264 at 30 fps. The [preview](../site/media/pocketify-demo-preview.mp4), [poster](../site/media/pocketify-demo-poster.webp), [captions](../site/media/pocketify-demo-captions.vtt), [offline highlight](../site/media/pocketify-offline-highlight.webp) and [migration highlight](../site/media/pocketify-migration-highlight.webp) are published with the Static Site.

The [machine-readable source manifest](../site/media/source-manifest.json) records exact source in/out and final timeline positions. Rebuild with `node scripts/montage-demo.mjs` after placing the three original recordings under ignored `media/raw/` and installing FFmpeg. The script does not alter originals or playback speed and adds no music.

| Final time | Actual footage | On-screen claim |
| --- | --- | --- |
| 00:00–00:08 | Public homepage | Product name and promise |
| 00:08–00:19 | Public recorded ticket playback | Historical QVAC output; not fresh inference |
| 00:19–00:33 | Browser scanner and migration | Bundled-source scan and isolated config change |
| 00:33–00:55 | Local Studio | Fresh QVAC inference and resulting category |
| 00:55–01:12 | Local Offline Challenge | Selected routes fail; visible verdict INCONCLUSIVE |
| 01:12–01:27 | Public benchmarks and evidence | Five full ten-ticket runs, including regressions |
| 01:27–01:35 | GitHub repository | Source and reproduction path |
| 01:35–01:41 | Public homepage | Branded outro |

The offline source clip contains the owner's acknowledgement and the challenge result, but does not show the Windows adapter state. The video caption does not claim physical disconnection was independently established. Two historical receipts remain INCONCLUSIVE. For a future stronger claim, record the Windows network state before and after the manual disconnect while running a new local challenge and publish its actual receipt.
