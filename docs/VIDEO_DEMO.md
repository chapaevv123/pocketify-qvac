# Final demo film

The edited [109-second MP4](../site/media/pocketify-demo-1080p.mp4) is 1920×1080 H.264 at 30 fps (5,809,814 bytes). The [preview](../site/media/pocketify-demo-preview.mp4), [poster](../site/media/pocketify-demo-poster.webp), [captions](../site/media/pocketify-demo-captions.vtt), [17-second offline clip](../site/media/pocketify-offline-highlight.mp4), [8-second PowerShell excerpt](../site/media/pocketify-network-highlight.mp4), [14-second migration clip](../site/media/pocketify-migration-highlight.mp4) and WebP highlights are published with the Static Site.

The [machine-readable source manifest](../site/media/source-manifest.json) records exact source in/out and final timeline positions. Rebuild with `node scripts/montage-demo.mjs` after placing all four original recordings under ignored `media/raw/` and installing FFmpeg. The script does not alter originals or playback speed and adds no music. Source metadata: `01` 29.000 s, `02` 114.450 s, `03` 21.183 s, `04` 34.300 s; all are 2560×1410, 60 fps, H.264/AAC. The final video has no audio track.

| Final time | Actual footage | On-screen claim |
| --- | --- | --- |
| 00:00–00:08 | Public homepage | Product name and promise |
| 00:08–00:19 | Public recorded ticket playback | Historical QVAC output; not fresh inference |
| 00:19–00:33 | Browser scanner and migration | Bundled-source scan and isolated config change |
| 00:33–00:55 | Local Studio | Fresh QVAC inference and resulting category |
| 00:55–01:12 | Local Offline Challenge | Selected routes fail; visible verdict INCONCLUSIVE |
| 01:12–01:20 | PowerShell recording, source 00:04–00:12 | TCP 1.1.1.1:443 and ping 1.1.1.1 failed |
| 01:20–01:35 | Public benchmarks and evidence | Five full ten-ticket runs, including regressions |
| 01:35–01:43 | GitHub repository | Source and reproduction path |
| 01:43–01:49 | Public homepage | Branded outro |

The PowerShell excerpt was cropped from source coordinates `x=0,y=144,width=1280,height=720`, then scaled to 1920×1080. This excludes the console prompt containing a local user path while leaving the original yellow probe warnings visible. No terminal output was recreated. The excerpt shows two failed probes to one IP; it does not show a successful online baseline or Windows adapter state. The later uncut source frames show the same `demo-offline.cmd` invocation completing real QVAC inference in 180 ms, with category `feature` for “The CSV export crashes when I click Download.” That classification is a model error against the benchmark's `bug` label and is not presented as a correct prediction. Source 04 does not independently establish that the challenge UI receipt and this command share one continuous disconnect event. The historical receipts remain INCONCLUSIVE. For a stronger future claim, record the Windows network state before and after the manual disconnect while running a new local challenge and publish its actual receipt.
