# DEFCON

**kinetic energy analysis system** — a music video motion analysis tool by swaeta mir.

analyses kinetic energy, subject velocity, and audio-visual sync across a curated selection of music videos using real-time computer vision.

---

## features

- landing page with animated ascii art portrait and boot sequence
- thermal / normal view toggle on video playback
- coco-ssd person detection with smoothed bounding boxes
- frame-diff energy metrics and real-time audio waveform
- vibe alignment score (audio-visual coactivation)
- ironbow thermal colormap rendering

## stack

- next.js 16 + react 19 + typescript
- tailwind css v4
- tensorflow.js + coco-ssd (client-side, webgl)
- cloudflare r2 (video cdn)
- vt323 monospace font

## videos

- skepta — bullet from a gun (2019)
- tiakola — x (2024)
- yeat — come n go (2025)
- drake — 5am in toronto (2013)
- gunna — skybox (2022)
- asap rocky — fashion killa (2013)

## running locally

```bash
npm install
npm run dev
```

open [http://localhost:3000](http://localhost:3000)

> note: video files are not included in the repo. to run locally, add `.mp4` files to `public/videos/` matching the filenames in `lib/videos.ts`, or point the src fields at a cdn.

---

swaeta mir, 2026
