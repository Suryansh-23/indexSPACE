---
title: "useMarkets"
sidebar_position: 7
description: "Fetches a list of markets with optional filtering, sorting, limiting, and polling support."
---

# useMarkets

**`useMarkets(options?)`**

Fetches a list of markets with optional client-side filtering, sorting, and limiting. Supports polling and conditional fetching via `QueryOptions`. Re-fetches when options change or the cache entry is invalidated.

```typescript
function useMarkets(
  options?: MarketDiscoveryOptions & QueryOptions,
): {
  markets: MarketState[];
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options.state` | `string?` | Filter by `resolutionState` (e.g., `'open'`). |
| `options.titleContains` | `string?` | Case-insensitive substring match on market title. |
| `options.categories` | `string[]?` | Filter by category overlap. |
| `options.filters` | `MarketFilter[]?` | Custom field-level filters (AND logic). |
| `options.sortBy` | `string?` | Field name to sort by (e.g., `'totalVolume'`). |
| `options.sortOrder` | `'asc' \| 'desc'?` | Sort direction. Defaults to `'desc'`. |
| `options.limit` | `number?` | Maximum number of results. |
| `options.pollInterval` | `number?` | Polling interval in milliseconds. Default: `0` (no polling). |
| `options.enabled` | `boolean?` | When `false`, suppresses fetching. Default: `true`. |

**Behavior:**

* `markets` is an empty array `[]` until the first successful fetch; `loading` starts as `true`.
* `loading` is `true` only on the first fetch (no cached data). On background refetches (polling, invalidation), `loading` stays `false` and `isFetching` is `true`. This prevents UI flicker during polling.
* Re-fetches automatically when any option changes or when the cache entry is invalidated.
* `refetch` returns a `Promise<void>`. It triggers a background refetch without resetting `loading`.
* Throws `"useMarkets must be used within FunctionSpaceProvider"` if rendered outside the provider.

**`loading` vs `isFetching`:**

| Field | When true | Use for |
| ----- | --------- | ------- |
| `loading` | First fetch only (no cached data yet) | Showing loading spinners or skeletons |
| `isFetching` | Any in-flight request (first fetch or background refetch) | Showing subtle "refreshing" indicators |

**Delegates to:** `discoverMarkets(client, options)` (see Core > Markets).

**Example -- list all markets:**

```tsx
import { useMarkets } from '@functionspace/react';

function MarketBrowse() {
  const { markets, loading, error } = useMarkets();

  if (loading) return <p>Loading markets...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {markets.map(m => (
        <li key={m.marketId}>{m.title} -- {m.resolutionState}</li>
      ))}
    </ul>
  );
}
```

**Example -- filtered and sorted with polling:**

```tsx
import { useMarkets } from '@functionspace/react';

function PopularOpenMarkets() {
  const { markets, loading, isFetching, error } = useMarkets({
    state: 'open',
    sortBy: 'totalVolume',
    sortOrder: 'desc',
    limit: 10,
    pollInterval: 30000,
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {isFetching && <span>Refreshing...</span>}
      <ul>
        {markets.map(m => (
          <li key={m.marketId}>
            {m.title} -- Volume: {m.totalVolume}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Example -- search by title:**

```tsx
import { useState } from 'react';
import { useMarkets } from '@functionspace/react';

function MarketSearch() {
  const [query, setQuery] = useState('');
  const { markets, loading } = useMarkets({
    titleContains: query || undefined,
    enabled: query.length >= 2,
  });

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search markets..."
      />
      {loading && <p>Searching...</p>}
      <ul>
        {markets.map(m => (
          <li key={m.marketId}>{m.title}</li>
        ))}
      </ul>
    </div>
  );
}
```
