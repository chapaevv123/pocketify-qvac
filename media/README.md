# Video production

The three owner-provided recordings live in ignored `media/raw/`. Do not commit them.

Run `node scripts/montage-demo.mjs` with FFmpeg available to create the 101-second 1080p master, preview, captions, poster, two short playable highlight clips, WebP highlights and source manifest in ignored `media/final/`. The script also copies the optimized, public artifacts into `site/media/` for Render hosting. Every source clip plays at its original speed and the final video has no added music.

The exact source in/out points and authenticity notes are in [source-manifest.json](../site/media/source-manifest.json). The challenge footage visibly ends **INCONCLUSIVE** and does not show physical adapter state.
