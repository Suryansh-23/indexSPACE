---
title: "Layering"
sidebar_position: 1
description: "SDK function layering system: L0 pure math, L1 core protocol, and L2 convenience wrappers."
---

# Layering

Every SDK function belongs to a **layer** that determines its abstraction level. Higher layers compose lower layers.

### L0 -- Pure Math

Protocol-agnostic math. No awareness of markets, positions, or network.

| Function | Category |
|----------|----------|
| `evaluateDensityPiecewise()` | Math |
| `evaluateDensityCurve()` | Math |
| `computeStatistics()` | Math |
| `computePercentiles()` | Math |
| `calculateBucketDistribution()` | Math |
| `transformHistoryToFanChart()` | Math |
| `mapPosition()` | Utility |
| `positionsToTradeEntries()` | Utility |
| `validateBeliefVector()` | Validation |
| `validateUsername()` | Auth |
| `pixelToDataX()` | Chart Zoom |
| `computeZoomedDomain()` | Chart Zoom |
| `computePannedDomain()` | Chart Zoom |
| `filterVisibleData()` | Chart Zoom |
| `generateEvenTicks()` | Chart Zoom |

### L1 -- Core

Direct protocol interactions with full parameter control. Unopinionated and explicit.

| Function | Category |
|----------|----------|
| `buy()` | Transaction |
| `sell()` | Transaction |
| `generateBelief()` | Position Generator |
| `queryMarketState()` | Query |
| `getConsensusCurve()` | Query |
| `queryConsensusSummary()` | Query |
| `queryDensityAt()` | Query |
| `queryMarketHistory()` | Query |
| `queryMarketPositions()` | Query |
| `queryPositionState()` | Query |
| `queryTradeHistory()` | Query |
| `discoverMarkets()` | Discovery |
| `loginUser()` | Auth |
| `signupUser()` | Auth |
| `fetchCurrentUser()` | Auth |
| `passwordlessLoginUser()` | Auth |
| `silentReAuth()` | Auth |

### L2 -- Convenience

Higher-level wrappers with sensible defaults. Named concepts mapping to common use cases.

| Function | Category |
|----------|----------|
| `generateGaussian()` | Position Generator |
| `generateRange()` | Position Generator |
| `generateDip()` | Position Generator |
| `generateLeftSkew()` | Position Generator |
| `generateRightSkew()` | Position Generator |
| `generateCustomShape()` | Position Generator |
| `generateBellShape()` | Position Generator |
| `previewPayoutCurve()` | Preview |
| `previewSell()` | Preview |
