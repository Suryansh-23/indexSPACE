---
title: "previewSell"
sidebar_position: 2
---

# previewSell

**`previewSell(client, positionId, marketId)`**

**Layer:** L1. Previews how much collateral would be returned if a position were sold right now, without actually selling it. Used by `PositionTable` to show live "market value" for each open position.

```typescript
async function previewSell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<PreviewSellResult>
```

**Parameters:**

| Parameter    | Type               | Description                         |
| ------------ | ------------------ | ----------------------------------- |
| `client`     | `FSClient`         | Authenticated API client.           |
| `positionId` | `number`           | The position to simulate selling.   |
| `marketId`   | `string \| number` | The market the position belongs to. |

**Returns `PreviewSellResult`:**

```typescript
interface PreviewSellResult {
  collateralReturned: number; // Estimated collateral you'd receive
  iterations: number;         // Number of solver iterations the server used
}
```

**Example:**

```typescript
// Show current market value for each open position
const positions = await queryMarketPositions(ctx.client, marketId);

for (const pos of positions.filter(p => p.status === 'open')) {
  const preview = await previewSell(ctx.client, pos.positionId, marketId);
  const pnl = preview.collateralReturned - pos.collateral;
  console.log(`Position ${pos.positionId}: worth $${preview.collateralReturned} (${pnl >= 0 ? '+' : ''}${pnl})`);
}
```
