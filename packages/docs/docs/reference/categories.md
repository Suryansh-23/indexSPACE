---
title: "Categories"
sidebar_position: 2
description: "All SDK functions organized by category: transactions, generators, previews, queries, auth, and math."
---

# Categories

Every SDK function belongs to a **category** that determines its functional domain.

### Transactions (State-Changing)

| Layer | Function | Scope |
|-------|----------|-------|
| L1 | `buy()` | Open a position |
| L1 | `sell()` | Close a position |

### Position Generators (Belief Construction)

| Layer | Function | Shape Type |
|-------|----------|------------|
| L1 | `generateBelief()` | Universal constructor (regions) |
| L2 | `generateGaussian()` | Bell curve |
| L2 | `generateRange()` | Uniform range (single or multi) |
| L2 | `generateDip()` | Valley / dip shape |
| L2 | `generateLeftSkew()` | Left-skewed distribution |
| L2 | `generateRightSkew()` | Right-skewed distribution |
| L2 | `generateCustomShape()` | User-drawn control points |
| L2 | `generateBellShape()` | Symmetric bell (for editor defaults) |

### Previews (Read-Only)

| Layer | Function | Phase |
|-------|----------|-------|
| L2 | `previewPayoutCurve()` | Pre-entry payout preview |
| L2 | `previewSell()` | Exit collateral estimate |

### Queries (Server State)

| Layer | Function | Scope |
|-------|----------|-------|
| L1 | `queryMarketState()` | Full market state |
| L1 | `getConsensusCurve()` | Consensus as chart-ready points |
| L1 | `queryConsensusSummary()` | Mean, median, mode, variance, stdDev |
| L1 | `queryDensityAt()` | Density at a single point |
| L1 | `queryMarketHistory()` | Historical market snapshots |
| L1 | `queryMarketPositions()` | All positions for a market |
| L1 | `queryPositionState()` | Single position by ID |
| L1 | `queryTradeHistory()` | Trade entries for a market |

### Discovery

| Layer | Function | Purpose |
|-------|----------|---------|
| L1 | `discoverMarkets()` | List all available markets |

### Auth

| Layer | Function | Purpose |
|-------|----------|---------|
| L0 | `validateUsername()` | Client-side username validation |
| L1 | `loginUser()` | Username/password login |
| L1 | `signupUser()` | Create account |
| L1 | `fetchCurrentUser()` | Fetch authenticated user profile |
| L1 | `passwordlessLoginUser()` | Login or auto-signup by username |
| L1 | `silentReAuth()` | Re-authenticate stored session |

### Validation

| Layer | Function | Purpose |
|-------|----------|---------|
| L0 | `validateBeliefVector()` | Client-side belief vector validation |

### Pure Math (L0)

| Function | Purpose |
|----------|---------|
| `evaluateDensityPiecewise()` | Density PDF at a single point |
| `evaluateDensityCurve()` | Density PDF as `{ x, y }[]` curve |
| `computeStatistics()` | Mean, median, mode, variance, stdDev from coefficients |
| `computePercentiles()` | 9-point percentile set from coefficients |
| `calculateBucketDistribution()` | Divide range into probability buckets |
| `transformHistoryToFanChart()` | History snapshots to fan chart points |
| `mapPosition()` | Transform raw API position to `Position` type |
| `positionsToTradeEntries()` | Positions to `TradeEntry[]` for display |

### Chart Zoom Math (L0)

| Function | Purpose |
|----------|---------|
| `pixelToDataX()` | Convert pixel coordinate to data value |
| `computeZoomedDomain()` | Cursor-anchored zoom domain |
| `computePannedDomain()` | Drag-based pan domain |
| `filterVisibleData()` | Filter data array to visible domain |
| `generateEvenTicks()` | Evenly-spaced tick values |
