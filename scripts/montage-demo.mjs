import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const raw = path.join(root, 'media/raw');
const work = path.join(root, 'media/work');
const out = path.join(root, 'media/final');
await mkdir(work, { recursive: true });
await mkdir(out, { recursive: true });

// Source seconds are literal; no clip has changed playback speed.
const scenes = [
  { file: '02-public-render.mp4', start: 0, end: 8, title: 'POCKETIFY STUDIO', caption: 'Turn off the internet  Keep the intelligence', claim: 'Public homepage and product framing' },
  { file: '02-public-render.mp4', start: 8, end: 19, title: 'PUBLIC MODE', caption: 'Inspect recorded real QVAC outputs  No fresh model call', claim: 'Recorded ticket playback on Render' },
  { file: '02-public-render.mp4', start: 24, end: 38, title: 'LIVE IN BROWSER', caption: 'Scan the bundled source and migrate an isolated config', claim: 'Public browser migration and diff' },
  { file: '01-local-qvac.mp4', start: 0, end: 22, title: 'LIVE LOCAL QVAC', caption: 'Fresh support ticket inference on the cached model', claim: 'Visible local inference with genuine output' },
  { file: '03-offline-challenge.mp4', start: 4, end: 21, title: 'OFFLINE CHALLENGE', caption: 'Selected routes failed  Verdict INCONCLUSIVE', claim: 'Challenge UI and inconclusive verdict; physical adapter state not shown' },
  { file: '02-public-render.mp4', start: 45, end: 60, title: 'MEASURED EVIDENCE', caption: 'Five genuine ten-ticket runs  5 to 8 correct', claim: 'Benchmark and evidence sections' },
  { file: '02-public-render.mp4', start: 63, end: 71, title: 'OPEN SOURCE', caption: 'Inspect the repository and reproduce the local run', claim: 'GitHub repository visible' },
  { file: '02-public-render.mp4', start: 108, end: 114, title: 'POCKETIFY STUDIO', caption: 'Public lab  Local QVAC  Honest evidence', claim: 'Public homepage outro' },
];
const duration = scenes.reduce((sum, scene) => sum + scene.end - scene.start, 0);
if (duration < 90 || duration > 110) throw new Error(`Montage duration ${duration}s is outside target`);
const font = process.platform === 'win32' ? 'C\\:/Windows/Fonts/arialbd.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed with ${result.status}`);
}
function escapeText(value) { return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll(':', '\\:').replaceAll('%', '\\%'); }
function timestamp(seconds) { const h = Math.floor(seconds / 3600); const m = Math.floor(seconds % 3600 / 60); const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.000`; }
let elapsed = 0;
const cues = ['WEBVTT', ''];
for (const [index, scene] of scenes.entries()) {
  const source = path.join(raw, scene.file);
  await stat(source);
  const output = path.join(work, `scene-${String(index + 1).padStart(2, '0')}.mp4`);
  const seconds = scene.end - scene.start;
  const zoom = index === 2 || index === 3 || index === 4;
  const spatial = zoom ? 'crop=2304:1296:128:57,scale=1920:1080' : 'crop=2507:1410:26:0,scale=1920:1080';
  const filter = `${spatial},fps=30,format=yuv420p,drawbox=x=0:y=892:w=iw:h=188:color=0x10231f@0.94:t=fill,` +
    `drawtext=fontfile='${font}':text='${escapeText(scene.title)}':fontcolor=0xb9f0cb:fontsize=52:x=72:y=917,` +
    `drawtext=fontfile='${font}':text='${escapeText(scene.caption)}':fontcolor=0xf2f0e9:fontsize=30:x=74:y=994`;
  run(['-ss', String(scene.start), '-i', source, '-t', String(seconds), '-an', '-vf', filter,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', output]);
  scene.montageStart = elapsed;
  scene.montageEnd = elapsed + seconds;
  cues.push(`${timestamp(elapsed)} --> ${timestamp(elapsed + seconds)}`, `${scene.title}. ${scene.caption}.`, '');
  elapsed += seconds;
}
const concat = scenes.map((_, index) => `file '${path.join(work, `scene-${String(index + 1).padStart(2, '0')}.mp4`).replaceAll('\\', '/')}'`).join('\n') + '\n';
await writeFile(path.join(work, 'concat.txt'), concat);
const final = path.join(out, 'pocketify-demo-1080p.mp4');
run(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'concat.txt'), '-c', 'copy', '-movflags', '+faststart', final]);
run(['-i', final, '-vf', 'scale=960:540', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-an', '-movflags', '+faststart', path.join(out, 'pocketify-demo-preview.mp4')]);
run(['-ss', '0.5', '-i', final, '-frames:v', '1', '-vf', 'scale=1280:720', '-quality', '78', path.join(out, 'pocketify-demo-poster.webp')]);
run(['-ss', '63', '-i', final, '-frames:v', '1', '-vf', 'scale=960:540', '-quality', '76', path.join(out, 'pocketify-offline-highlight.webp')]);
run(['-ss', '26', '-i', final, '-frames:v', '1', '-vf', 'scale=960:540', '-quality', '76', path.join(out, 'pocketify-migration-highlight.webp')]);
await writeFile(path.join(out, 'pocketify-demo-captions.vtt'), cues.join('\n'));
const manifest = JSON.stringify({
  durationSeconds: duration, resolution: '1920x1080', frameRate: 30, playbackSpeed: 1,
  sourceFiles: ['01-local-qvac.mp4', '02-public-render.mp4', '03-offline-challenge.mp4'],
  scenes, limitations: [
    'No Windows network adapter state appears in the supplied footage.',
    'The visible offline challenge verdict is INCONCLUSIVE.',
    'Source audio is near silent; final video uses captioned visuals without music.',
    'Benchmark footage shows a historical experimental 5/10 run; all five runs are preserved.'
  ] }, null, 2) + '\n';
await writeFile(path.join(out, 'source-manifest.json'), manifest);
const publicMedia = path.join(root, 'site/media');
await mkdir(publicMedia, { recursive: true });
for (const name of ['pocketify-demo-1080p.mp4', 'pocketify-demo-preview.mp4', 'pocketify-demo-poster.webp',
  'pocketify-offline-highlight.webp', 'pocketify-migration-highlight.webp', 'pocketify-demo-captions.vtt'])
  await copyFile(path.join(out, name), path.join(publicMedia, name));
await writeFile(path.join(publicMedia, 'source-manifest.json'), manifest);
console.log(`Produced ${duration}s montage at ${final}`);
