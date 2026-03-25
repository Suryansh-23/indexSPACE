---
title: "Convenience Discovery Functions"
sidebar_position: 9
description: "L2 preset wrappers for common market discovery patterns: popular markets, active markets, and category filtering."
---

# Convenience Discovery Functions

L2 convenience wrappers around `discoverMarkets` with preset options. Each function applies sensible defaults and merges any caller-provided options on top. All three resolve through `discoverMarkets` internally.

---

## discoverPopularMarkets

**`discoverPopularMarkets(client, options?)`**

**Layer:** L2. Returns markets sorted by total volume (descending), limited to 10 by default.

```typescript
async function discoverPopularMarkets(
  client: FSClient,
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]>
```

**Preset defaults:**
- `sortBy: 'totalVolume'`
- `sortOrder: 'desc'`
- `limit: 10`

Caller options override these presets. Caller `filters[]` are appended to preset filters (not replaced).

**Example:**

```typescript
import { discoverPopularMarkets } from '@functionspace/core';

// Top 10 by volume (default)
const popular = await discoverPopularMarkets(client);

// Top 5 open markets by volume
const popularOpen = await discoverPopularMarkets(client, {
  state: 'open',
  limit: 5,
});
```

---

## discoverActiveMarkets

**`discoverActiveMarkets(client, options?)`**

**Layer:** L2. Returns markets with `resolutionState === 'open'`.

```typescript
async function discoverActiveMarkets(
  client: FSClient,
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]>
```

**Preset defaults:**
- `state: 'open'`

Caller options override presets. For example, passing `sortBy` adds sorting to the open-market filter.

**Example:**

```typescript
import { discoverActiveMarkets } from '@functionspace/core';

// All open markets
const active = await discoverActiveMarkets(client);

// Open markets sorted by participant count
const activeSorted = await discoverActiveMarkets(client, {
  sortBy: 'participantCount',
  sortOrder: 'desc',
});
```

---

## discoverMarketsByCategory

**`discoverMarketsByCategory(client, categories, options?)`**

**Layer:** L2. Returns markets matching one or more categories.

```typescript
async function discoverMarketsByCategory(
  client: FSClient,
  categories: string[],
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]>
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `client` | `FSClient` | API client instance |
| `categories` | `string[]` | One or more category strings to match |
| `options` | `MarketDiscoveryOptions?` | Additional filtering/sorting options |

**Preset defaults:**
- `categories: <provided categories argument>`

Caller options override presets. Caller `filters[]` are appended to the category filter.

**Example:**

```typescript
import { discoverMarketsByCategory } from '@functionspace/core';

// All markets in the "weather" category
const weather = await discoverMarketsByCategory(client, ['weather']);

// Weather or sports markets, sorted by volume
const multi = await discoverMarketsByCategory(client, ['weather', 'sports'], {
  sortBy: 'totalVolume',
  sortOrder: 'desc',
});
```

---

## Option Merging Behavior

All three convenience functions merge caller options on top of their presets:

- **Typed fields** (`state`, `titleContains`, `categories`, `sortBy`, `sortOrder`, `limit`): caller value overrides preset value.
- **`filters[]`**: caller filters are appended to preset filters (both apply with AND logic).
- **`signal`**: passes through from the caller.

**See also:** [`discoverMarkets`](./discovermarkets.md) for the underlying L1 function, [`filterMarkets`](./filtermarkets.md) for pure client-side filtering.
