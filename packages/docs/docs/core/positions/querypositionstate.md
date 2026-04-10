---
title: "queryPositionState"
sidebar_position: 2
description: "Fetch a single position by ID from a market."
---

# queryPositionState

**`queryPositionState(client, positionId, marketId, options?)`**

**Layer:** L1. Fetches a single position by ID. Internally calls `queryMarketPositions` and filters. Throws if the position is not found.

```typescript
async function queryPositionState(
  client: FSClient,
  positionId: string | number,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<Position>
```

Returns the same `Position` type documented above. Throws `Error("Position <positionId> not found in market <marketId>")` if no match is found.

**Example:**

```typescript
// After opening a position, fetch its current state
const { numBuckets } = market.config;
const result = await buy(ctx.client, marketId, belief, 100, numBuckets);
const position = await queryPositionState(ctx.client, result.positionId, marketId);
console.log(position.status);     // "open"
console.log(position.claims);     // number of claim tokens minted
```

**Note:** If you already have the full positions list, filter it yourself rather than calling this (it makes a full API round-trip each time).
