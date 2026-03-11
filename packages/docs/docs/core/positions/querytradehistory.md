---
title: "queryTradeHistory"
sidebar_position: 5
---

# queryTradeHistory

**`queryTradeHistory(client, marketId, options?)`**

**Layer:** L1. Convenience function that composes `queryMarketPositions` + `positionsToTradeEntries` into a single call. Returns the same `TradeEntry[]` type documented above.

```typescript
async function queryTradeHistory(
  client: FSClient,
  marketId: string | number,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<TradeEntry[]>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `FSClient` | Authenticated API client |
| `marketId` | `string \| number` | Market identifier |
| `options.limit` | `number` | Maximum number of trade entries to return (default: 100) |
| `options.signal` | `AbortSignal` | Optional AbortController signal for request cancellation (forward-compatible; will be wired through once the underlying query layer supports it) |

**Example:**

```typescript
const trades = await queryTradeHistory(ctx.client, marketId, { limit: 50 });
// trades = [{ id: "12_open", side: "buy", amount: 100, ... }, { id: "12_close", side: "sell", amount: 115, ... }, ...]
```
