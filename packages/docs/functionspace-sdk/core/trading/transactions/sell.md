# Sell

**`sell(client, positionId, marketId)`**

**Layer:** L1. Closes an open position and returns collateral to the trader.

```typescript
async function sell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<SellResult>
```

**Parameters:**

<table><thead><tr><th width="143.8359375">Parameter</th><th width="161.765625">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>client</code></td><td><code>FSClient</code></td><td>Authenticated API client.</td></tr><tr><td><code>positionId</code></td><td><code>number</code></td><td>The position to close. Get this from <code>queryMarketPositions</code> or from <code>BuyResult.positionId</code>.</td></tr><tr><td><code>marketId</code></td><td><code>string | number</code></td><td>The market the position belongs to.</td></tr></tbody></table>

**Returns `SellResult`:**

```typescript
interface SellResult {
  positionId: number;        // The closed position's ID
  collateralReturned: number; // Amount of currency returned to the trader
}
```

The returned collateral depends on the current market state. If the market consensus has shifted toward your belief since you bought, you'll get back more than you put in. If it shifted away, you'll get back less. Use `projectSell` to preview the return before executing.

**Example:**

```typescript
const result = await sell(ctx.client, position.positionId, marketId);
console.log(`Got back ${result.collateralReturned}`);

ctx.invalidate(marketId); // refresh charts and position tables
```
