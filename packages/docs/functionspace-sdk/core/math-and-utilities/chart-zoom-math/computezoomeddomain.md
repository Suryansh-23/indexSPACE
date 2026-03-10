# computeZoomedDomain

**`computeZoomedDomain(params)`**

**Layer:** L0. Computes a new X domain after a scroll-wheel zoom event. Zoom is cursor-anchored: the data value under the cursor stays fixed while the domain contracts or expands around it. Returns `null` when the zoomed range reaches >= 99% of the full range (reset threshold, to avoid near-full-range jitter).

```typescript
function computeZoomedDomain(params: ZoomParams): [number, number] | null

interface ZoomParams {
  currentDomain: [number, number];
  fullDomain: [number, number];
  cursorDataX: number;
  direction: 1 | -1;       // 1 = zoom out, -1 = zoom in
  zoomFactor?: number;      // default: 0.15
  maxZoomFactor?: number;   // default: 50 (max zoom = fullRange / 50)
}
```

<br>
