---
title: "useMarketFilters"
sidebar_position: 8
description: "Manages search, category filtering, and sorting state on top of useMarkets. Returns filtered markets plus a pre-built props bundle for MarketFilterBar."
---

# useMarketFilters

**`useMarketFilters(config?)`**

Manages search, category filtering, and sorting state on top of `useMarkets`. Debounces search input (300ms), builds discovery options from the combined filter state, and returns both the filtered market list and a pre-built props bundle that can be spread directly onto `MarketFilterBar`.

```typescript
function useMarketFilters(
  config?: UseMarketFiltersConfig,
): UseMarketFiltersReturn
```

**Config:**

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `categories` | `string[]?` | -- | Fixed list of available categories. When provided, overrides metadata-derived categories. |
| `featuredCategories` | `string[]?` | -- | Categories to display first in the chip bar. Non-featured categories from metadata appear after. |
| `sortOptions` | `SortOption[]?` | 5 defaults | Custom sort options. Each has `field`, `label`, and optional `defaultOrder`. |
| `defaultSortField` | `string?` | `'totalVolume'` | Initial sort field. |
| `defaultSortOrder` | `'asc' \| 'desc'?` | `'desc'` | Initial sort direction. |
| `pollInterval` | `number?` | -- | Polling interval in ms passed to `useMarkets`. |
| `enabled` | `boolean?` | `true` | When `false`, suppresses fetching. |
| `state` | `string?` | -- | Filter by resolution state (e.g., `'open'`). |

**`SortOption` shape:**

```typescript
interface SortOption {
  field: string;
  label: string;
  defaultOrder?: 'asc' | 'desc';
}
```

**Default sort options:** Volume (desc), Liquidity (desc), Traders (desc), Newest (desc), Ending Soon (asc).

**Return shape:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `markets` | `MarketState[]` | Filtered, sorted market list |
| `loading` | `boolean` | `true` only on the first fetch |
| `isFetching` | `boolean` | `true` whenever a request is in flight |
| `error` | `Error \| null` | Fetch error, if any |
| `refetch` | `() => Promise<void>` | Trigger a background refetch |
| `searchText` | `string` | Current search input (not debounced) |
| `selectedCategories` | `string[]` | Currently selected category filters |
| `activeSortField` | `string` | Current sort field |
| `sortOrder` | `'asc' \| 'desc'` | Current sort direction |
| `resultCount` | `number` | Number of markets matching current filters |
| `setSearchText` | `(text: string) => void` | Update search (debounced internally) |
| `clearSearch` | `() => void` | Clear search text immediately |
| `toggleCategory` | `(category: string) => void` | Toggle a category filter on/off |
| `clearCategories` | `() => void` | Clear category selection only (does not affect search or sort) |
| `setSortField` | `(field: string) => void` | Change sort field (resets order to the option's `defaultOrder`) |
| `toggleSortOrder` | `() => void` | Toggle between `'asc'` and `'desc'` |
| `resetFilters` | `() => void` | Reset all filters to initial state |
| `availableCategories` | `string[]` | Categories available for filtering (from config or metadata) |
| `sortOptions` | `SortOption[]` | Active sort options |
| `filterBarProps` | `MarketFilterBarProps` | Pre-built props bundle for `MarketFilterBar` |
| `discoveryOptions` | `MarketDiscoveryOptions & QueryOptions` | Options passed to `useMarkets` (useful for debugging) |

**Behavior:**

* Composes `useMarkets` internally -- you do not need to call `useMarkets` separately.
* Search input is debounced at 300ms before being passed to `useMarkets` as `titleContains`.
* When `setSortField` is called, the sort order resets to the selected option's `defaultOrder` (if defined).
* `availableCategories` is derived from market metadata unless `categories` or `featuredCategories` is provided in config. Featured categories appear first.
* `filterBarProps` is a memoized object containing all props needed by `MarketFilterBar` -- spread it directly.
* Throws `"useMarketFilters must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Example -- simple usage with MarketFilterBar:**

```tsx
import { useMarketFilters } from '@functionspace/react';
import { MarketFilterBar, MarketList } from '@functionspace/ui';

function MarketBrowser() {
  const { markets, loading, error, filterBarProps } = useMarketFilters({
    state: 'open',
    pollInterval: 10000,
  });

  return (
    <div>
      <MarketFilterBar {...filterBarProps} />
      <MarketList
        markets={markets}
        loading={loading}
        error={error}
        onSelect={(id) => console.log('Selected:', id)}
      />
    </div>
  );
}
```

**Example -- custom sort options:**

```tsx
import type { SortOption } from '@functionspace/react';
import { useMarketFilters } from '@functionspace/react';
import { MarketFilterBar, MarketList } from '@functionspace/ui';

const mySortOptions: SortOption[] = [
  { field: 'totalVolume', label: 'Most Active', defaultOrder: 'desc' },
  { field: 'expiresAt', label: 'Closing Soon', defaultOrder: 'asc' },
];

function CustomSortBrowser() {
  const { markets, loading, error, filterBarProps } = useMarketFilters({
    state: 'open',
    sortOptions: mySortOptions,
    defaultSortField: 'totalVolume',
  });

  return (
    <div>
      <MarketFilterBar {...filterBarProps} />
      <MarketList markets={markets} loading={loading} error={error} />
    </div>
  );
}
```

**Example -- custom composition without MarketFilterBar:**

```tsx
import { useMarketFilters } from '@functionspace/react';

function CustomFilterUI() {
  const {
    markets,
    loading,
    searchText,
    setSearchText,
    clearSearch,
    selectedCategories,
    toggleCategory,
    availableCategories,
    activeSortField,
    setSortField,
    sortOrder,
    toggleSortOrder,
    resetFilters,
    resultCount,
  } = useMarketFilters({ state: 'open' });

  return (
    <div>
      <input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search..."
      />
      {searchText && <button onClick={clearSearch}>Clear</button>}

      <div>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            style={{ fontWeight: selectedCategories.includes(cat) ? 'bold' : 'normal' }}
          >
            {cat}
          </button>
        ))}
      </div>

      <select value={activeSortField} onChange={(e) => setSortField(e.target.value)}>
        <option value="totalVolume">Volume</option>
        <option value="expiresAt">Ending Soon</option>
      </select>
      <button onClick={toggleSortOrder}>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</button>
      <button onClick={resetFilters}>Reset</button>

      <p>{resultCount} markets</p>
      {loading && <p>Loading...</p>}
      <ul>
        {markets.map((m) => (
          <li key={m.marketId}>{m.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Related:** `useMarkets` (underlying data hook), `MarketFilterBar` (pre-built filter UI), `MarketOverlay` (uses `useMarketFilters` internally)

---
