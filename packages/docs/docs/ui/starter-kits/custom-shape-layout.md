---
title: "Custom Shape Layout"
sidebar_position: 3
---

# Custom Shape Layout


**File:** `demo-app/src/App_CustomShapeLayout.tsx`

The drag-to-draw belief editor for maximum expressiveness.

**Components:** `MarketStats` + `AuthWidget` → `CustomShapeEditor` (full width, zoomable) → `PositionTable`

**What it enables:** Users sculpt arbitrary probability distributions by dragging control points directly on the chart. Lock specific points, adjust resolution (5–25 control points), and see the belief curve update in real-time. The editor embeds its own consensus chart — no separate chart component needed.

**Target audience:** Advanced traders, quantitative analysts. Highest friction, highest expressiveness.
