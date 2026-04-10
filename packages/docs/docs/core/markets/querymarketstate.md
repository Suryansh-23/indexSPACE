---
title: "queryMarketState"
sidebar_position: 2
description: "Fetch complete state for a single market: alpha vector, consensus, config, and metadata."
---

# queryMarketState

**`queryMarketState(client, marketId)`**

**Layer:** L1. Fetches the complete state of a single market. This is the most important market function. It returns the alpha vector, the derived consensus distribution, market config (`numBuckets`, `lowerBound`, `upperBound`, and AMM parameters), metadata (title, units, decimals), and resolution status.

```typescript
async function queryMarketState(
  client: FSClient,
  marketId: string | number,
): Promise<MarketState>
```

**Returns `MarketState`:**

```typescript
interface MarketState {
  alpha: number[];            // Raw alpha vector from the AMM
  consensus: number[];        // Normalized probability distribution (alpha / sum(alpha))
  totalMass: number;          // Sum of alpha vector
  poolBalance: number;        // Current collateral pool
  participantCount: number;   // Total positions ever created
  totalVolume: number;        // Total collateral traded
  positionsOpen: number;      // Currently open positions
  config: MarketConfig;       // { numBuckets, lowerBound, upperBound, P0, mu, epsAlpha, tau, gamma, lambdaS, lambdaD }
  title: string;              // Market question text
  xAxisUnits: string;         // Unit label for outcome axis (e.g., "°F", "USD")
  decimals: number;           // Display precision for outcome values
  resolutionState: 'open' | 'resolved' | 'voided';
  resolvedOutcome: number | null;  // Settlement value (null if unresolved)
  marketId: number;           // Unique market identifier
  createdAt: string | null;   // ISO 8601 creation timestamp (null from single-market endpoint)
  expiresAt: string | null;   // ISO 8601 expiration timestamp, or null if no expiry
  resolvedAt: string | null;  // ISO 8601 resolution timestamp, or null if unresolved
  marketType: string;         // Market type (e.g., 'standard', 'walkthrough')
  marketSubtype: string | null; // Market subtype, or null
  metadata: Record<string, unknown>; // Server metadata (categories, tags, custom fields)
  consensusMean: number;      // Scalar consensus mean (closed-form from coefficient array)
}
```

The `config` object contains the parameters you need for building beliefs (`numBuckets`, `lowerBound`, `upperBound`) and the AMM parameters that govern market behavior:

| Config Field   | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `numBuckets`   | Number of outcome buckets. Belief vectors have length `numBuckets + 2`.  |
| `lowerBound`   | Lower bound of outcome space.                                            |
| `upperBound`   | Upper bound of outcome space.                                            |
| `K` *(deprecated)* | Alias for `numBuckets`. Will be removed in a future release.         |
| `L` *(deprecated)* | Alias for `lowerBound`. Will be removed in a future release.         |
| `H` *(deprecated)* | Alias for `upperBound`. Will be removed in a future release.         |
| `P0`         | Initial pool size.                                             |
| `mu`         | AMM sensitivity parameter.                                     |
| `epsAlpha`   | Minimum alpha per bucket (prevents zero probability).          |
| `tau`        | Fee parameter for trades.                                      |
| `gamma`      | Market maker spread parameter.                                 |
| `lambdaS`    | Sell-side liquidity parameter.                                 |
| `lambdaD`    | Deposit-side liquidity parameter.                              |

**Example:**

```typescript
const market = await queryMarketState(ctx.client, 42);

console.log(market.title);                    // "What will the high temperature be on Jan 1?"
console.log(market.xAxisUnits);               // "°F"
console.log(market.config.lowerBound, market.config.upperBound); // 30, 110
console.log(market.resolutionState);           // "open"

// The consensus vector is what charts render
const peakBucket = market.consensus.indexOf(Math.max(...market.consensus));
const peakOutcome = market.config.lowerBound + (peakBucket / market.config.numBuckets) * (market.config.upperBound - market.config.lowerBound);
console.log(`Market mode: ~${peakOutcome}°F`);
```
