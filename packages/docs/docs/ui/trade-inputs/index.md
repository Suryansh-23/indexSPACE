---
title: "Trade Inputs"
sidebar_position: 1
description: "Overview of six trading input widgets: TradePanel, BinaryPanel, BucketRangeSelector, and more."
---

# Trade Inputs

Interactive trading widgets that let users construct beliefs and submit trades. All are self-contained, handling their own loading/error states, and require `FunctionSpaceProvider`.

| Widget | Input Style | Description |
|--------|------------|-------------|
| **TradePanel** | Slider-based | Gaussian/range shape selection with confidence and target sliders |
| **BinaryPanel** | Single-click | Binary yes/no trading at a configurable x-point |
| **BucketRangeSelector** | Bucket grid | Click outcome range buttons to build multi-range beliefs |
| **BucketTradePanel** | Composite | `DistributionChart` + `BucketRangeSelector` with shared state |
| **CustomShapeEditor** | Drag points | Freeform belief construction by dragging control points |
| **ShapeCutter** | Preset shapes | 8 named belief geometries with adaptive parameter sliders |

