---
title: "Markets"
sidebar_position: 4
---

---
hidden: true
---

# Markets

##

## Markets

Markets are the core entity in functionSPACE. Each market represents a question about a future numerical outcome defined over a continuous range. Markets aggregate participant beliefs into a consensus probability distribution and hold committed collateral in a unified pool until resolution.

---

### Discovering Markets

Discovery functions retrieve market data from an indexed database, enabling filtering, sorting, and pagination across the market catalogue.

**Indexer Dependency:** Discovery functions query an off-chain indexer that monitors blockchain events and maintains a searchable database. The SDK accepts an indexer URL as configuration and operates identically whether using the functionSPACE-hosted indexer (viability being explored) or a self-hosted instance.

**Data Scope:** Discovery returns market summaries optimised for browsing. For complete market state including the full consensus distribution, call `queryMarketState()` on markets of interest.

---

#### discoverMarkets

`Discovery | L2`

The primary search interface for markets. Returns a paginated list of markets matching specified filter criteria. All filters combine with AND logic.

All L3 discovery functions are convenience wrappers that call `discoverMarkets` with preset configurations.

```typescript
const results = await discoverMarkets({
  state: 'open',
  categories: ['crypto'],
  limit: 20
});
```

**Response:**

```typescript
{
  markets: MarketSummary[],
  totalCount: number,
  hasMore: boolean,
  cursor: string
}
```

**MarketSummary:**

```typescript
{
  id: string,
  title: string,
  description: string,
  categories: string[],
  outcomeRange: [number, number],
  poolBalance: number,
  participantCount: number,
  createdAt: timestamp,
  resolvesAt: timestamp,
  state: 'open' | 'resolved' | 'voided'
}
```

**Pagination:**

```typescript
const page1 = await discoverMarkets({ state: 'open', limit: 20 });
const page2 = await discoverMarkets({ state: 'open', limit: 20, cursor: page1.cursor });
```

---

#### discoverTrending

`Discovery | L3`

Returns markets with highest recent trading activity within a specified timeframe.

```typescript
const trending = await discoverTrending('24h', 10);
```

Wraps `discoverMarkets` with `state: 'open'`, sorted by `recent_volume` descending. Additional filters can be passed via options and merge with defaults.

---

#### discoverResolvingSoon

`Discovery | L3`

Returns open markets with resolution dates approaching within the specified number of days, sorted by soonest first.

```typescript
const urgent = await discoverResolvingSoon(7, 10);
```

Wraps `discoverMarkets` with `state: 'open'` and `resolvesBefore: now + days`, sorted by `resolves_at` ascending.

---

#### discoverNew

`Discovery | L3`

Returns markets created within the specified number of hours, sorted by newest first.

```typescript
const recent = await discoverNew(24, 10);
```

Wraps `discoverMarkets` with `state: 'open'` and `createdAfter: now - hours`, sorted by `created_at` descending.

---

#### discoverHighValue

`Discovery | L3`

Returns open markets with pool balance above a specified minimum, sorted by largest first.

```typescript
const whale = await discoverHighValue(10000, 10);
```

Wraps `discoverMarkets` with `state: 'open'` and `poolBalanceMin`, sorted by `pool_balance` descending.

---

#### discoverByCreator

`Discovery | L3`

Returns all markets created by a specified address, including resolved markets.

```typescript
const creatorMarkets = await discoverByCreator('0x...', 10);
```

Wraps `discoverMarkets` with `creator` filter, sorted by `created_at` descending. State defaults to `'any'`.

---

#### discoverByCategory

`Discovery | L3`

Returns open markets tagged with a specified category.

```typescript
const cryptoMarkets = await discoverByCategory('crypto', 10);
```

Wraps `discoverMarkets` with `state: 'open'` and `categories` filter, sorted by `pool_balance` descending.

---

#### Filter Options

All filters are optional. When multiple filters are specified, they combine with AND logic.

| Type     | Filter                | Description                          | Values                                      |
| -------- | --------------------- | ------------------------------------ | ------------------------------------------- |
| State    | `state`               | Market resolution state              | `'open'`, `'resolved'`, `'voided'`, `'any'` |
| Time     | `createdAfter`        | Markets created after timestamp      | datetime                                    |
| Time     | `createdBefore`       | Markets created before timestamp     | datetime                                    |
| Time     | `resolvesAfter`       | Resolution date after timestamp      | datetime                                    |
| Time     | `resolvesBefore`      | Resolution date before timestamp     | datetime                                    |
| Time     | `resolvedAfter`       | Resolved after timestamp             | datetime                                    |
| Time     | `resolvedBefore`      | Resolved before timestamp            | datetime                                    |
| Economic | `poolBalanceMin`      | Minimum pool balance                 | number                                      |
| Economic | `poolBalanceMax`      | Maximum pool balance                 | number                                      |
| Economic | `participantCountMin` | Minimum unique participants          | integer                                     |
| Economic | `volumeMin`           | Minimum total historical volume      | number                                      |
| Economic | `recentVolumeMin`     | Minimum volume in trailing 24h       | number                                      |
| Content  | `categories`          | Markets with any of these categories | string\[]                                   |
| Content  | `categoriesAll`       | Markets with all of these categories | string\[]                                   |
| Content  | `titleContains`       | Title contains text                  | string                                      |
| Content  | `descriptionContains` | Description contains text            | string                                      |
| Range    | `rangeContains`       | Outcome range includes this value    | number                                      |
| Range    | `rangeOverlaps`       | Outcome range overlaps interval      | \[min, max]                                 |
| Address  | `creator`             | Created by this address              | address                                     |
| Address  | `creatorIn`           | Created by any of these addresses    | address\[]                                  |
| Outcome  | `resolvedOutcome`     | Resolved to exactly this value       | number                                      |
| Outcome  | `resolvedOutcomeMin`  | Resolved to at least this value      | number                                      |
| Outcome  | `resolvedOutcomeMax`  | Resolved to at most this value       | number                                      |

---

#### Sort Options

| Field               | Description                     |
| ------------------- | ------------------------------- |
| `pool_balance`      | Current pool size               |
| `participant_count` | Number of unique participants   |
| `created_at`        | Creation timestamp              |
| `resolves_at`       | Scheduled resolution timestamp  |
| `resolved_at`       | Actual resolution timestamp     |
| `volume`            | Total historical volume         |
| `recent_volume`     | Volume in trailing 24 hours     |
| `certainty`         | Consensus concentration measure |

---

### Reading Market State

Query functions read current protocol state from the blockchain. These functions return computed values derived from on-chain data without modifying state.

---

#### queryMarketState

`Query | L1`

Returns the complete on-chain state of a market. This is the single source of truth for all market data and serves as the foundation for all derived queries and projections.

```typescript
const state = await queryMarketState('market-123');
```

**Response:**

```typescript
{
  alpha: number[],              // Raw state vector (α)
  consensus: number[],          // Normalized coefficients (q)
  totalMass: number,            // P = Σα_k
  poolBalance: number,          // Collateral held
  totalClaims: number,          // M_totalClaims
  participantCount: number,
  config: {
    K: number,                  // Bernstein degree
    L: number,                  // Outcome range lower bound
    H: number,                  // Outcome range upper bound
    P0: number,                 // Initial prior strength
    mu: number                  // Mint scale constant
  },
  resolutionCriteria: string,
  resolutionState: 'open' | 'resolved' | 'voided',
  resolvedOutcome: number | null,
  protocol: {
    gamma: number,              // Accuracy temperature
    tau: number                 // Eligibility gate
  },
  createdAt: timestamp,
  resolvedAt: timestamp | null
}
```

---

#### queryDensityAt

`Query | L2`

Returns the probability density of the consensus distribution at a specific outcome value. Evaluates the Bernstein polynomial at the given point.

```typescript
const density = await queryDensityAt('market-123', 75000);
// { density: 0.00042 }
```

For visualising the full consensus curve, call this function across multiple points within the outcome range \[L, H].

---

#### queryPercentile

`Query | L2`

Returns the outcome value at a specified percentile of the consensus distribution. This is the inverse CDF; given a cumulative probability, returns the outcome where that probability mass lies below.

```typescript
const median = await queryPercentile('market-123', 50);
// { outcome: 72500 }

const upperQuartile = await queryPercentile('market-123', 75);
// { outcome: 81000 }
```

---

#### queryDensityBetween

`Query | L2`

Returns the probability mass between two outcome values. Calculated as CDF(x2) - CDF(x1).

```typescript
const rangeProb = await queryDensityBetween('market-123', 70000, 80000);
// { probability: 0.45 }
```

Useful for statements like "45% probability the outcome falls between 70,000 and 80,000".

---

#### queryConfidenceInterval

`Query | L2`

Returns the outcome range containing the central X% of probability mass. The bounds are symmetric. Equal probability mass lies below the lower bound and above the upper bound.

```typescript
const ci90 = await queryConfidenceInterval('market-123', 90);
// { lower: 65000, upper: 85000 }
```

For asymmetric bounds, use `queryPercentile` directly.

---

#### queryConsensusSummary

`Query | L3`

Returns key statistical measures of the consensus distribution in a single call: mean, median, mode, variance, and standard deviation.

```typescript
const summary = await queryConsensusSummary('market-123');
```

**Response:**

```typescript
{
  mean: number,      // Expected value
  median: number,    // 50th percentile
  mode: number,      // Peak density outcome
  variance: number,
  stdDev: number
}
```

Internally calls `queryMarketState` and computes derived statistics.

---

#### queryMarketCertainty

`Query | L3`

Returns a scalar measure of consensus concentration. Low values indicate diffuse, uncertain consensus (flat distribution). High values indicate sharp, confident consensus (peaked distribution).

```typescript
const certainty = await queryMarketCertainty('market-123');
// { certainty: 0.72, entropy: 0.28 }
```

Certainty is computed as `1 - normalised_entropy`, ranging from 0 (maximally uncertain) to 1 (maximally certain). Useful for comparing market maturity across different markets.

---

### Creating Markets

Market creation instantiates a new prediction market on-chain. The creator defines the outcome space, resolution criteria, and seeds the market with an initial position.

---

#### createMarket

`Transaction | L1`

Creates a new market with a defined outcome range and resolution criteria. The creator must provide an initial belief and collateral, becoming the market's first participant.

```typescript
const market = await createMarket({
  outcomeRange: [50000, 150000],
  resolutionCriteria: 'BTC/USD price on Coinbase at 2025-12-31 00:00 UTC',
  initialBelief: coefficients,
  initialCollateral: 100,
  resolvesAt: '2026-01-27T01:23:30Z'
});
```

**Parameters:**

| Parameter            | Type        | Description                                         |
| -------------------- | ----------- | --------------------------------------------------- |
| `outcomeRange`       | `[L, H]`    | Lower and upper bounds of possible outcomes         |
| `resolutionCriteria` | `string`    | Description of how the outcome will be determined   |
| `initialBelief`      | `number[]`  | Creator's belief as Bernstein coefficients          |
| `initialCollateral`  | `number`    | Collateral for creator's initial position           |
| `closesAt`           | `timestamp` | Timestamp of when the market will close; ISO 8601   |
| `resolvesAt`         | `timestamp` | Timestamp of when the market will resolve; ISO 8601 |

**Response:**

```typescript
{
  marketId: string,
  positionId: string,    // Creator's initial position
  txHash: string
}
```

The initial position seeds the unified collateral pool and establishes the market's genesis consensus state.

**Note:** Resolution is handled by the Reality Market system, which is outside the scope of this SDK section. The `resolveMarket` function exists as a placeholder for integration with the resolution layer.
