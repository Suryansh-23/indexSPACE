---
title: "mapPosition"
sidebar_position: 3
description: "Pure transform that converts raw snake_case API position data to typed camelCase Position objects."
---

# mapPosition

**`mapPosition(raw)`**

**Layer:** L0. Pure transform with no network call. Converts a raw API response object (snake\_case fields) into a typed `Position` (camelCase fields). Used internally by `queryMarketPositions`. Useful if you're calling the API directly or processing webhook/websocket payloads outside the SDK's query functions.

```typescript
function mapPosition(raw: any): Position
```

**Field mapping:**

| API field (snake\_case) | Position field (camelCase)           |
| ----------------------- | ------------------------------------ |
| `position_id`           | `positionId`                         |
| `belief_p`              | `belief`                             |
| `input_collateral_C`    | `collateral`                         |
| `minted_claims_m`       | `claims`                             |
| `username`              | `owner`                              |
| `status`                | `status`                             |
| `prediction`            | `prediction`                         |
| `std_dev`               | `stdDev`                             |
| `created_at`            | `createdAt`                          |
| `position_closed_at`    | `closedAt` (null if missing)         |
| `sold_price`            | `soldPrice` (null if missing)        |
| `settlement_payout`     | `settlementPayout` (null if missing) |

**Example:**

```typescript
// If you're calling the API directly (e.g., from a non-SDK HTTP client)
const response = await fetch(`${baseUrl}/api/market/positions?market_id=42`);
const data = await response.json();
const positions: Position[] = data.positions.map(mapPosition);
```
