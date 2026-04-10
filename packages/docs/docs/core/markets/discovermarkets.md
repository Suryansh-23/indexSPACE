---
title: "discoverMarkets"
sidebar_position: 1
description: "List available markets with optional filtering, sorting, and limiting. Works without authentication."
---

# discoverMarkets

**`discoverMarkets(client, options?)`**

**Layer:** L1. Lists available markets with optional client-side filtering, sorting, and limiting. Returns the same `MarketState` shape as `queryMarketState`, but for every matching market. Does not require authentication (works in guest mode).

```typescript
async function discoverMarkets(
  client: FSClient,
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]>
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `client` | `FSClient` | API client instance |
| `options` | `MarketDiscoveryOptions?` | Optional filtering, sorting, and limiting options (see below) |

**`MarketDiscoveryOptions`:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `state` | `string?` | Filter by `resolutionState` (e.g., `'open'`, `'resolved'`). |
| `titleContains` | `string?` | Case-insensitive substring match on market `title`. |
| `categories` | `string[]?` | Filter by categories (matches markets whose categories overlap). |
| `filters` | `MarketFilter[]?` | Array of custom field-level filters (AND logic). |
| `sortBy` | `string?` | Field name to sort by (e.g., `'totalVolume'`, `'createdAt'`). |
| `sortOrder` | `'asc' \| 'desc'?` | Sort direction. Defaults to `'desc'`. |
| `limit` | `number?` | Maximum number of results to return. |
| `signal` | `AbortSignal?` | Abort signal for the HTTP request. |

All filtering, sorting, and limiting happens client-side after the full market list is fetched from the server.

**Basic example:**

```typescript
const markets = await discoverMarkets(client);
const openMarkets = markets.filter(m => m.resolutionState === 'open');
console.log(`${openMarkets.length} markets open for trading`);
```

**Filtering example:**

```typescript
// Get open markets sorted by volume
const markets = await discoverMarkets(client, {
  state: 'open',
  sortBy: 'totalVolume',
  sortOrder: 'desc',
  limit: 20,
});
```

**Title search example:**

```typescript
const markets = await discoverMarkets(client, {
  titleContains: 'temperature',
});
```

**Custom filter example:**

```typescript
import type { MarketFilter } from '@functionspace/core';

const markets = await discoverMarkets(client, {
  filters: [
    { field: 'totalVolume', value: 100, action: 'greaterThan' },
    { field: 'participantCount', value: 5, action: 'greaterThanOrEqual' },
  ],
});
```

**Note:** The `MarketState.resolutionState` type includes `'voided'` but the current API mapping only produces `'open'` or `'resolved'`. The `'voided'` variant is reserved for future use.

**See also:** [`filterMarkets`](./filtermarkets.md) for reusable client-side filtering, [`discoverPopularMarkets` / `discoverActiveMarkets` / `discoverMarketsByCategory`](./discoverpopularmarkets.md) for preset convenience wrappers.
