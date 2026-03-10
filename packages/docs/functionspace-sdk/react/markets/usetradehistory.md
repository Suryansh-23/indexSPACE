# useTradeHistory

**`useTradeHistory(marketId, options?)`**

Fetches trade history for a market with optional polling for live updates.

```typescript
function useTradeHistory(
  marketId: string | number,
  options?: {
    limit?: number;
    pollInterval?: number;
  },
): {
  trades: TradeEntry[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter              | Type               | Description                                                                                                 |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `marketId`             | `string \| number` | Market identifier.                                                                                          |
| `options.limit`        | `number?`          | Maximum number of trade entries to return. Default: `100`.                                                  |
| `options.pollInterval` | `number?`          | Polling interval in milliseconds. Default: `0` (no polling). When > 0, re-fetches automatically on a timer. |

**Behavior:**

* `trades` starts as `null` and becomes a `TradeEntry[]` after the first successful fetch; check for `null` before rendering.
* Re-fetches automatically when `marketId` or `limit` changes, and whenever the provider's invalidation fires (e.g., after a `buy` or `sell` transaction).
* Polling is cleaned up on unmount or when `pollInterval` changes; safe to unmount mid-fetch.
* The only data hook that supports automatic periodic re-fetching via `pollInterval`.
* Each `TradeEntry` contains: `id`, `timestamp`, `side` (`'buy' | 'sell'`), `prediction` (`number | null`), `amount`, `username`, and `positionId`.

**Delegates to:** `queryTradeHistory` from core.

**Example:**

```tsx
function TradeFeed({ marketId }: { marketId: string }) {
  const { trades, loading, error, refetch } = useTradeHistory(marketId, {
    limit: 50,
    pollInterval: 5000,
  });

  if (loading && !trades) return <p>Loading trades...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!trades || trades.length === 0) return <p>No trades yet.</p>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {trades.map((t) => (
          <li key={t.id}>
            {t.timestamp} — {t.username} {t.side} {t.amount.toFixed(2)}
            {t.prediction !== null && ` @ ${t.prediction.toFixed(1)}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
