---
title: "positionsToTradeEntries"
sidebar_position: 4
---

# positionsToTradeEntries

**`positionsToTradeEntries(positions, options?)`**

**Layer:** L0. Pure transform. Converts an array of positions into a flat list of trade entries for display in a trade history table. For each position, creates a "buy" entry. If the position has been sold (`soldPrice !== null`), also creates a "sell" entry. Results are sorted by timestamp descending. Applies fallbacks for missing data: `prediction ?? null`, `collateral ?? 0`, `owner ?? 'Unknown'`, and `'--'` for null/invalid timestamps.

```typescript
function positionsToTradeEntries(
  positions: Position[],
  options?: { limit?: number },  // default: 100
): TradeEntry[]
```

**Returns `TradeEntry[]`:**

```typescript
interface TradeEntry {
  id: string;              // "{positionId}_open" or "{positionId}_close"
  timestamp: string;       // Formatted as "YYYY-MM-DD HH:mm:ss" (ISO-derived, 24-hour)
  side: 'buy' | 'sell';
  prediction: number | null;
  amount: number;          // Collateral (buy) or sold price (sell)
  username: string;
  positionId: string;
}
```

**Example:**

```typescript
const positions = await queryMarketPositions(ctx.client, marketId);
const entries = positionsToTradeEntries(positions, { limit: 20 });
// entries[0] = { id: "45_close", side: "sell", amount: 115.3, timestamp: "2025-06-15 10:23:45", ... }
// entries[1] = { id: "45_open",  side: "buy",  amount: 100,   timestamp: "2025-06-14 08:12:00", ... }
```

**Note:** This is a workaround while no dedicated trades API endpoint exists. When `/market/trades` becomes available, `queryTradeHistory` will switch to it without changing its signature.
