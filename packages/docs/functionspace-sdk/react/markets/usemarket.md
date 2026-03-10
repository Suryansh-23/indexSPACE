# useMarket

**`useMarket(marketId)`**

Fetches complete market state -- configuration, consensus coefficients, metadata, and resolution status -- and re-fetches when the market ID or provider invalidation count changes.

```typescript
function useMarket(
  marketId: string | number,
): {
  market: MarketState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter  | Type               | Description       |
| ---------- | ------------------ | ----------------- |
| `marketId` | `string \| number` | Market identifier |

**Behavior:**

* `market` is `null` until the first successful fetch; `loading` starts as `true`.
* Re-fetches automatically when `marketId` changes or when the provider's invalidation count increments (e.g., after a `buy` or `sell` via `ctx.invalidate()`).
* `refetch` is async. Calling it resets `loading` to `true` and `error` to `null` before the request fires.
* Throws `"useMarket must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Delegates to:** `queryMarketState(client, marketId)` (see Core > Markets).

**Example:**

```tsx
function MarketHeader({ marketId }: { marketId: number }) {
  const { market, loading, error, refetch } = useMarket(marketId);

  if (loading) return <p>Loading market...</p>;
  if (error)  return <p>Error: {error.message}</p>;
  if (!market) return null;

  return (
    <div>
      <h2>{market.title}</h2>
      <p>
        Range: {market.config.L} to {market.config.H} {market.xAxisUnits}
      </p>
      <p>Status: {market.resolutionState}</p>
      <p>Participants: {market.participantCount}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```
