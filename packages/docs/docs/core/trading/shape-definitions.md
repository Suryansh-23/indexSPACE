---
title: "Shape Definitions"
sidebar_position: 4
---

# Shape Definitions

| Export              | Type                | Description                                                                                                                                                           |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHAPE_DEFINITIONS` | `ShapeDefinition[]` | Registry of all 8 named belief shapes with metadata (id, name, description, parameter list, SVG icon path). Used by UI shape pickers.                                 |
| `ShapeDefinition`   | Interface           | `{ id: ShapeId; name: string; description: string; parameters: ('targetOutcome' \| 'confidence' \| 'rangeValues' \| 'peakBias' \| 'skewAmount')[]; svgPath: string }` |
| `ShapeId`           | Type                | `'gaussian' \| 'spike' \| 'plateau' \| 'bimodal' \| 'dip' \| 'leftskew' \| 'rightskew' \| 'uniform'`                                                                  |
