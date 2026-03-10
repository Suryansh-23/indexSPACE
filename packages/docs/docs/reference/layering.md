---
title: "Layering"
sidebar_position: 1
---

# Layering

### All Functions by Layer

#### L0 — Pure Math (Internal)

| Function                           | Purpose                          |
| ---------------------------------- | -------------------------------- |
| `evaluateDensity(coefficients, x)` | Evaluate PDF at point x          |
| `evaluatePotential(α)`             | Compute Dirichlet potential A(α) |

#### L1 — Core Protocol-Aware

| Function               | Category    | Scope    |
| ---------------------- | ----------- | -------- |
| `buy()`                | Transaction | Position |
| `sell()`               | Transaction | Position |
| `createMarket()`       | Transaction | Market   |
| `approvePosition()`    | Transaction | Position |
| `setApprovalForAll()`  | Transaction | Position |
| `transferPosition()`   | Transaction | Position |
| `claimPayout()`        | Transaction | Position |
| `resolveMarket()`      | Transaction | Market   |
| `buildBelief()`        | Builder     | —        |
| `queryMarketState()`   | Query       | Market   |
| `queryPositionState()` | Query       | Position |
| `queryUserPositions()` | Query       | User     |
| `queryAllowance()`     | Query       | Token    |

#### L2 — Convenience

| Function                           | Category   | Scope      |
| ---------------------------------- | ---------- | ---------- |
| `buildGaussian()`                  | Builder    | —          |
| `buildSpike()`                     | Builder    | —          |
| `buildPlateau()`                   | Builder    | —          |
| `buildRamp()`                      | Builder    | —          |
| `buildStep()`                      | Builder    | —          |
| `buildMultimodal()`                | Builder    | —          |
| `buildCustom()`                    | Builder    | —          |
| `projectBuy()`                     | Projection | Pre-entry  |
| `projectSell()`                    | Projection | Exit       |
| `projectPayout()`                  | Projection | Settlement |
| `projectPayoutCurve()`             | Projection | Settlement |
| `projectCollateralForPayout()`     | Projection | Pre-entry  |
| `projectCollateralForClaimShare()` | Projection | Pre-entry  |
| `projectClaimShare()`              | Projection | Position   |
| `projectEligibility()`             | Projection | Position   |
| `queryDensityAt()`                 | Query      | Market     |
| `queryPercentile()`                | Query      | Market     |
| `queryDensityBetween()`            | Query      | Market     |
| `queryConfidenceInterval()`        | Query      | Market     |
| `queryClaimShare()`                | Query      | Position   |
| `discoverMarkets()`                | Discovery  | —          |
| `discoverUserActivity()`           | Discovery  | —          |
| `discoverUserPositions()`          | Discovery  | —          |

#### L3 — Intent

| Function                     | Category    | Scope      |
| ---------------------------- | ----------- | ---------- |
| `buildBinary()`              | Builder     | —          |
| `buildAmplifyConsensus()`    | Builder     | —          |
| `buildContrarian()`          | Builder     | —          |
| `projectExpectedPayout()`    | Projection  | Pre-entry  |
| `projectProfitRange()`       | Projection  | Settlement |
| `projectCompare()`           | Projection  | Comparison |
| `queryConsensusSummary()`    | Query       | Market     |
| `queryMarketCertainty()`     | Query       | Market     |
| `queryPositionVsConsensus()` | Query       | Position   |
| `queryPositionSummary()`     | Query       | Position   |
| `discoverTrending()`         | Discovery   | —          |
| `discoverResolvingSoon()`    | Discovery   | —          |
| `discoverNew()`              | Discovery   | —          |
| `discoverHighValue()`        | Discovery   | —          |
| `discoverByCreator()`        | Discovery   | —          |
| `discoverByCategory()`       | Discovery   | —          |
| `updatePosition()`           | Transaction | Position   |
| `batchSell()`                | Transaction | Position   |
| `batchClaim()`               | Transaction | Position   |
| `batchBuy()`                 | Transaction | Position   |
| `claimAll()`                 | Transaction | Position   |
| `closeAllPositions()`        | Transaction | Position   |
| `exitMarket()`               | Transaction | Market     |
