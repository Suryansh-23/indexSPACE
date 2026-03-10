# computeStatistics

**`computeStatistics(coefficients, L, H)`**

**Layer:** L0. Computes summary statistics from a coefficient vector. Mean is computed in closed form; variance, mode, and median use numerical integration over a 500-point grid.

```typescript
function computeStatistics(
  coefficients: number[],
  L: number,
  H: number,
): ConsensusSummary
```

**Returns `ConsensusSummary`:**

```typescript
interface ConsensusSummary {
  mean: number;      // Expected value: L + (H-L) * sum(k/K * p_k)
  median: number;    // CDF integration to 0.5
  mode: number;      // Argmax of density on a 500-point grid
  variance: number;  // Numerical integration of (x - mean)^2 * density, normalized by total integrated weight
  stdDev: number;    // sqrt(variance)
}
```

**Example:**

```typescript
const stats = computeStatistics(market.consensus, L, H);
console.log(`Market expects ~${stats.mean.toFixed(1)} (±${stats.stdDev.toFixed(1)})`);
console.log(`Most likely outcome: ${stats.mode.toFixed(1)}`);
```
