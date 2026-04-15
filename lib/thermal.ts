// ironbow colormap lut — maps luminance [0–255] to thermal rgb
// cold: black → purple → red → orange → yellow → white: hot

const LUT: [number, number, number][] = new Array(256)

;(function buildLUT() {
  const stops: [number, number, number, number][] = [
    [0,   0,   0,   0  ],
    [0.2, 60,  0,   60 ],
    [0.4, 180, 0,   80 ],
    [0.55,255, 50,  0  ],
    [0.7, 255, 180, 0  ],
    [0.85,255, 255, 60 ],
    [1.0, 255, 255, 255],
  ]

  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let s = 0
    while (s < stops.length - 2 && t > stops[s + 1][0]) s++
    const [t0, r0, g0, b0] = stops[s]
    const [t1, r1, g1, b1] = stops[s + 1]
    const f = (t - t0) / (t1 - t0)
    LUT[i] = [
      Math.round(r0 + f * (r1 - r0)),
      Math.round(g0 + f * (g1 - g0)),
      Math.round(b0 + f * (b1 - b0)),
    ]
  }
})()

function ironbow(luminance: number): [number, number, number] {
  return LUT[Math.max(0, Math.min(255, Math.round(luminance)))]
}

/** apply ironbow in-place to raw imagedata pixels */
export function applyIronbowToImageData(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const [r, g, b] = ironbow(lum)
    data[i] = r; data[i + 1] = g; data[i + 2] = b
  }
}

export interface SubjectBlob {
  bbox: { x: number; y: number; w: number; h: number }
  centroid: { x: number; y: number }  // normalised 0–1
  occupancy: number                    // fraction of frame
}

export interface MotionData {
  subjects: SubjectBlob[]
  energy: number                       // 0–1 mean frame diff
  // primary subject fields for telemetry compatibility
  bbox: SubjectBlob['bbox'] | null
  centroid: { x: number; y: number }
  occupancy: number
}

// minimum blob size in pixels at 320×180
const MIN_BLOB_PX = 500

/** frame-differencing + connected-components — returns one blob per subject */
export function detectMotion(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 35,
): MotionData {
  const total = width * height
  const mask = new Uint8Array(total)
  let totalDiff = 0

  for (let i = 0; i < total; i++) {
    const p = i * 4
    const pL = 0.299 * prev[p] + 0.587 * prev[p + 1] + 0.114 * prev[p + 2]
    const cL = 0.299 * curr[p] + 0.587 * curr[p + 1] + 0.114 * curr[p + 2]
    const diff = Math.abs(pL - cL)
    totalDiff += diff
    if (diff > threshold) mask[i] = 1
  }

  const energy = totalDiff / (total * 255)

  // connected components via dfs
  const visited = new Uint8Array(total)
  const subjects: SubjectBlob[] = []

  for (let start = 0; start < total; start++) {
    if (!mask[start] || visited[start]) continue

    const stack = [start]
    visited[start] = 1
    let minX = width, maxX = 0, minY = height, maxY = 0
    let sumX = 0, sumY = 0, count = 0

    while (stack.length > 0) {
      const idx = stack.pop()!
      const x = idx % width
      const y = (idx / width) | 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      sumX += x; sumY += y; count++

      if (y > 0           && mask[idx - width] && !visited[idx - width]) { visited[idx - width] = 1; stack.push(idx - width) }
      if (y < height - 1  && mask[idx + width] && !visited[idx + width]) { visited[idx + width] = 1; stack.push(idx + width) }
      if (x > 0           && mask[idx - 1]     && !visited[idx - 1])     { visited[idx - 1] = 1;     stack.push(idx - 1) }
      if (x < width - 1   && mask[idx + 1]     && !visited[idx + 1])     { visited[idx + 1] = 1;     stack.push(idx + 1) }
    }

    if (count >= MIN_BLOB_PX) {
      subjects.push({
        bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        centroid: { x: sumX / count / width, y: sumY / count / height },
        occupancy: count / total,
      })
    }
  }

  // largest subject first
  subjects.sort((a, b) => b.occupancy - a.occupancy)

  const primary = subjects[0] ?? null
  return {
    subjects,
    energy,
    bbox: primary?.bbox ?? null,
    centroid: primary?.centroid ?? { x: 0.5, y: 0.5 },
    occupancy: primary?.occupancy ?? 0,
  }
}
