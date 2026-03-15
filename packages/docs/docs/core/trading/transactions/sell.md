---
title: "Sell"
sidebar_position: 2
---

# Sell

**`sell(client, positionId, marketId)`**

**Layer:** L1. Closes an open position and returns collateral to the trader.

```typescript
async function sell(
  client: FSClient,
  positionId: string | number,
  marketId: string | number,
): Promise<SellResult>
```

**Parameters:**


| Parameter | Type | Description |
| --- | --- | --- |
| `client` | `FSClient` | Authenticated API client. |
| `positionId` | `string \| number` | The position to close. Get this from `queryMarketPositions` or from `BuyResult.positionId`. |
| `marketId` | `string \| number` | The market the position belongs to. |


**Returns `SellResult`:**

```typescript
interface SellResult {
  positionId: string | number;  // The closed position's ID
  collateralReturned: number;   // Amount of currency returned to the trader
  creditedTo?: string;          // Username the payout was credited to
}
```

The returned collateral depends on the current market state. If the market consensus has shifted toward your belief since you bought, you'll get back more than you put in. If it shifted away, you'll get back less. Use `previewSell` to preview the return before executing.

**Example:**

```typescript
const result = await sell(ctx.client, position.positionId, marketId);
console.log(`Got back ${result.collateralReturned}`);

ctx.invalidate(marketId); // refresh charts and position tables
```
