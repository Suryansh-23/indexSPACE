---
title: "discoverMarkets"
sidebar_position: 1
---

# discoverMarkets

**`discoverMarkets(client)`**

**Layer:** L1. Lists all available markets. Returns the same `MarketState` shape as `queryMarketState`, but for every market. Does not require authentication (works in guest mode).

```typescript
async function discoverMarkets(client: FSClient): Promise<MarketState[]>
```

**Example:**

```typescript
const markets = await discoverMarkets(client);
const openMarkets = markets.filter(m => m.resolutionState === 'open');
console.log(`${openMarkets.length} markets open for trading`);
```

**Note:** The `MarketState.resolutionState` type includes `'voided'` but the current API mapping only produces `'open'` or `'resolved'`. The `'voided'` variant is reserved for future use.
