---
title: "pixelToDataX"
sidebar_position: 1
---

# pixelToDataX

**`pixelToDataX(clientX, plotAreaLeft, plotAreaRight, xDomain)`**

**Layer:** L0. Converts a pixel X coordinate (from a mouse event) to a data-space X value via linear interpolation. Clamps to `[0, 1]` ratio so positions outside the plot area map to domain edges. Returns `xDomain[0]` when plot width is ≤ 0.

```typescript
function pixelToDataX(
  clientX: number,
  plotAreaLeft: number,
  plotAreaRight: number,
  xDomain: [number, number],
): number
```
