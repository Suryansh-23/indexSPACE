# queryDensityAt

**`queryDensityAt(client, marketId, x)`**

**Layer:** L1. Evaluates the consensus probability density at a single point. Fetches market state, then calls `evaluateDensityPiecewise` client-side.

```typescript
async function queryDensityAt(
  client: FSClient,
  marketId: string | number,
  x: number,
): Promise<{ x: number; density: number }>
```

**Example:**

```typescript
// Tooltip: show density at the user's cursor position
const result = await queryDensityAt(ctx.client, marketId, 75);
console.log(`Probability density at 75: ${result.density.toFixed(4)}`);
```
