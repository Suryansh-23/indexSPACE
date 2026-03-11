---
title: "Data Infrastructure"
sidebar_position: 3
---

# Data Infrastructure

**Purpose:** Provide queryable, real-time data without requiring developers to run indexing infrastructure.

**What We Provide:**

| Layer             | What It Is                                         | Who Uses It                 |
| ----------------- | -------------------------------------------------- | --------------------------- |
| **Indexer**       | Service watching chain events, storing in database | Us (internal)               |
| **GraphQL API**   | Query interface over indexed data                  | SDK and advanced developers |
| **SDK Functions** | Discovery/Query functions calling GraphQL          | Most developers             |
| **Subscriptions** | WebSocket connections for real-time updates        | Apps needing live data      |

**What Gets Indexed:**

* **Markets:** Creation, parameters, resolution, consensus over time, volume, metadata
* **Positions:** Creation, modification, closure, owner history, payouts
* **Events:** Every trade with before/after state, resolutions, fee distributions

**Real-Time Subscriptions (V2):**

```typescript
// Subscribe to consensus changes
subscribeMarket(marketId, (update) => {
  console.log('Consensus shifted:', update.consensus);
});

// Subscribe to position updates
subscribePositions(address, (update) => {
  console.log('Position changed:', update);
});
```

**Configuration:**

```typescript
const config = createConfig({
  indexerUrl: 'https://indexer.functionspace.io/graphql', // FS-hosted
  // or
  indexerUrl: 'https://your-indexer.example.com/graphql', // self-hosted
});
```
