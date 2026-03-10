# Categories

### All Functions by Category

#### Transactions

| Layer | Function              | Scope    |
| ----- | --------------------- | -------- |
| L1    | `buy()`               | Position |
| L1    | `sell()`              | Position |
| L1    | `createMarket()`      | Market   |
| L1    | `approvePosition()`   | Position |
| L1    | `setApprovalForAll()` | Position |
| L1    | `transferPosition()`  | Position |
| L1    | `claimPayout()`       | Position |
| L1    | `resolveMarket()`     | Market   |
| L3    | `updatePosition()`    | Position |
| L3    | `batchSell()`         | Position |
| L3    | `batchClaim()`        | Position |
| L3    | `batchBuy()`          | Position |
| L3    | `claimAll()`          | Position |
| L3    | `closeAllPositions()` | Position |
| L3    | `exitMarket()`        | Market   |

#### Builders

| Layer | Function                  | Shape Type             |
| ----- | ------------------------- | ---------------------- |
| L1    | `buildBelief()`           | Universal constructor  |
| L2    | `buildGaussian()`         | Bell curve             |
| L2    | `buildSpike()`            | Sharp peak             |
| L2    | `buildPlateau()`          | Flat range             |
| L2    | `buildRamp()`             | Directional gradient   |
| L2    | `buildStep()`             | Multiple regions       |
| L2    | `buildMultimodal()`       | Multiple peaks         |
| L2    | `buildCustom()`           | User-drawn             |
| L3    | `buildBinary()`           | Yes/No on range        |
| L3    | `buildAmplifyConsensus()` | Consensus + conviction |
| L3    | `buildContrarian()`       | Anti-consensus         |

#### Projections

| Layer | Function                           | Phase      |
| ----- | ---------------------------------- | ---------- |
| L0    | `evaluatePotential()`              | Any        |
| L0    | `evaluateDensity()`                | Any        |
| L2    | `projectBuy()`                     | Pre-entry  |
| L2    | `projectSell()`                    | Exit       |
| L2    | `projectPayout()`                  | Settlement |
| L2    | `projectPayoutCurve()`             | Settlement |
| L2    | `projectCollateralForPayout()`     | Pre-entry  |
| L2    | `projectCollateralForClaimShare()` | Pre-entry  |
| L2    | `projectClaimShare()`              | Position   |
| L2    | `projectEligibility()`             | Position   |
| L3    | `projectExpectedPayout()`          | Pre-entry  |
| L3    | `projectProfitRange()`             | Settlement |
| L3    | `projectCompare()`                 | Comparison |

#### Queries

| Layer | Function                     | Scope    |
| ----- | ---------------------------- | -------- |
| L1    | `queryMarketState()`         | Market   |
| L1    | `queryPositionState()`       | Position |
| L1    | `queryUserPositions()`       | User     |
| L1    | `queryAllowance()`           | Token    |
| L2    | `queryDensityAt()`           | Market   |
| L2    | `queryPercentile()`          | Market   |
| L2    | `queryDensityBetween()`      | Market   |
| L2    | `queryConfidenceInterval()`  | Market   |
| L2    | `queryClaimShare()`          | Position |
| L3    | `queryConsensusSummary()`    | Market   |
| L3    | `queryMarketCertainty()`     | Market   |
| L3    | `queryPositionVsConsensus()` | Position |
| L3    | `queryPositionSummary()`     | Position |

#### Discovery

| Layer | Function                  | Purpose                   |
| ----- | ------------------------- | ------------------------- |
| L2    | `discoverMarkets()`       | Filtered market search    |
| L2    | `discoverUserActivity()`  | User's market involvement |
| L2    | `discoverUserPositions()` | User's positions          |
| L3    | `discoverTrending()`      | High activity markets     |
| L3    | `discoverResolvingSoon()` | Upcoming resolutions      |
| L3    | `discoverNew()`           | Recently created          |
| L3    | `discoverHighValue()`     | Large pool markets        |
| L3    | `discoverByCreator()`     | Creator's markets         |
| L3    | `discoverByCategory()`    | Category-filtered         |

###
