# queryTradeHistory

**`queryTradeHistory(client, marketId, options?)`**

**Layer:** L1. Convenience function that composes `queryMarketPositions` + `positionsToTradeEntries` into a single call. Returns the same `TradeEntry[]` type documented above.

```typescript
async function queryTradeHistory(
  client: FSClient,
  marketId: string | number,
  options?: { limit?: number },
): Promise<TradeEntry[]>
```

**Example:**

```typescript
const trades = await queryTradeHistory(ctx.client, marketId, { limit: 50 });
// trades = [{ id: "12_open", side: "buy", amount: 100, ... }, { id: "12_close", side: "sell", amount: 115, ... }, ...]
```

<br>
