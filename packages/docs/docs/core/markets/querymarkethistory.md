---
title: "queryMarketHistory"
sidebar_position: 6
description: "Fetch paginated time-series snapshots of a market's alpha vector after each trade."
---

# queryMarketHistory

**`queryMarketHistory(client, marketId, limit?, offset?)`**

**Layer:** L1. Fetches time-series snapshots of the market's alpha vector. Each snapshot records the state after a trade. Used to power timeline/fan charts that show how the consensus distribution has evolved over time.

```typescript
async function queryMarketHistory(
  client: FSClient,
  marketId: string | number,
  limit?: number,
  offset?: number,
): Promise<MarketHistory>
```

**Returns `MarketHistory`:**

```typescript
interface MarketHistory {
  marketId: number;
  totalSnapshots: number;      // Total available (for pagination)
  snapshots: MarketSnapshot[]; // Ordered by time
}

interface MarketSnapshot {
  snapshotId: number;
  tradeId: number;
  side: 'buy' | 'sell';
  positionId: string;
  alphaVector: number[];       // Full alpha vector at this point in time
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  currentPool: number;
  numOpenPositions: number;
  createdAt: string;           // ISO 8601
}
```

**Example:**

```typescript
const history = await queryMarketHistory(ctx.client, marketId, 100);
// Pass to transformHistoryToFanChart() from the math utilities to get chart-ready data
const fanData = transformHistoryToFanChart(history.snapshots, L, H);
```
