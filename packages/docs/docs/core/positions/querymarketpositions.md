---
title: "queryMarketPositions"
sidebar_position: 1
---

# queryMarketPositions

**`queryMarketPositions(client, marketId)`**

**Layer:** L1. Fetches all positions for a given market. This is the primary way to get position data and is the underlying call used by `queryPositionState` and `queryTradeHistory`.

```typescript
async function queryMarketPositions(
  client: FSClient,
  marketId: string | number,
): Promise<Position[]>
```

**Returns `Position[]`:**

```typescript
interface Position {
  positionId: number;
  belief: number[];                              // The belief vector that was traded
  collateral: number;                            // Amount of currency locked
  claims: number;                                // Claim tokens minted
  owner: string;                                 // Username of the position holder
  status: 'open' | 'sold' | 'settled' | 'closed';
  prediction: number;                            // Center-of-mass hint from the trade
  stdDev: number;                                // Standard deviation of the belief
  createdAt: string;                             // ISO 8601 timestamp
  closedAt: string | null;                       // When the position was closed (null if open)
  soldPrice: number | null;                      // Collateral returned on sell (null if not sold)
  settlementPayout: number | null;               // Payout at market resolution (null if unresolved)
}
```

**Example:**

```typescript
const positions = await queryMarketPositions(ctx.client, marketId);
const openPositions = positions.filter(p => p.status === 'open');
const totalCollateralLocked = openPositions.reduce((sum, p) => sum + p.collateral, 0);
```


