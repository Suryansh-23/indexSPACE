---
title: "filterMarkets"
sidebar_position: 8
description: "Pure client-side filtering, sorting, and limiting of MarketState arrays."
---

# filterMarkets

**`filterMarkets(markets, options)`**

**Layer:** L1 Discovery. Pure function that filters, sorts, and limits an array of `MarketState` objects client-side. Does not make any network requests. Does not modify the input array.

```typescript
function filterMarkets(
  markets: MarketState[],
  options: Omit<MarketDiscoveryOptions, 'signal'>,
): MarketState[]
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `markets` | `MarketState[]` | Array of markets to filter |
| `options` | `Omit<MarketDiscoveryOptions, 'signal'>` | Filtering, sorting, and limiting options |

**Options:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `state` | `string?` | Filter by `resolutionState` (converted to `equals` filter on `resolutionState`). |
| `titleContains` | `string?` | Case-insensitive substring match on `title` (converted to `contains` filter). |
| `categories` | `string[]?` | Filter by categories overlap (converted to `in` filter on `categories`). |
| `filters` | `MarketFilter[]?` | Custom field-level filters. Combined with typed filters above using AND logic. |
| `sortBy` | `string?` | Field name to sort by. Supports string and numeric fields. |
| `sortOrder` | `'asc' \| 'desc'?` | Sort direction. Defaults to `'desc'`. |
| `limit` | `number?` | Maximum number of results after filtering and sorting. |

**Filter actions (`MarketFilter.action`):**

| Action | Description | Value type |
| ------ | ----------- | ---------- |
| `'equals'` | Exact match (`===`) | any |
| `'notEquals'` | Not equal (`!==`) | any |
| `'greaterThan'` | Numeric greater than | number |
| `'greaterThanOrEqual'` | Numeric greater than or equal | number |
| `'lessThan'` | Numeric less than | number |
| `'lessThanOrEqual'` | Numeric less than or equal | number |
| `'contains'` | Case-insensitive substring match | string |
| `'in'` | Array overlap or membership check | array or scalar |
| `'between'` | Inclusive range check (`[min, max]`) | `[number, number]` |

**Field resolution:** Each filter's `field` is resolved by checking the `MarketState` top-level properties first, then falling back to `market.metadata[field]`. This allows filtering on both standard fields (like `totalVolume`) and custom metadata fields.

**Example -- filter and sort an existing array:**

```typescript
import { filterMarkets } from '@functionspace/core';

const filtered = filterMarkets(allMarkets, {
  state: 'open',
  sortBy: 'totalVolume',
  sortOrder: 'desc',
  limit: 10,
});
```

**Example -- custom filters with AND logic:**

```typescript
const highVolume = filterMarkets(allMarkets, {
  filters: [
    { field: 'totalVolume', value: 1000, action: 'greaterThan' },
    { field: 'participantCount', value: [5, 50], action: 'between' },
  ],
});
```

**Example -- filter by metadata field:**

```typescript
const filtered = filterMarkets(allMarkets, {
  filters: [
    { field: 'region', value: 'north-america', action: 'equals' },
  ],
});
```

**See also:** [`discoverMarkets`](./discovermarkets.md) fetches the market list from the server and applies `filterMarkets` internally when options are provided.
