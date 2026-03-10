---
title: "Trading"
sidebar_position: 5
---

---
hidden: true
---

# Trading

## Trading

Trading in functionSPACE involves three distinct phases: constructing a belief shape that represents your probability distribution, projecting the outcomes of potential trades, and executing transactions on-chain.

---

### Building Beliefs

Builder functions transform human-interpretable parameters into valid Bernstein coefficient vectors. These are pure computation functions with no chain interaction—they prepare the belief data required for trading.

All builders return a coefficient array that satisfies the protocol's validity constraints: non-negative values that sum to 1.

---

#### buildBelief

`Builder | L1`

The universal shape constructor. Accepts an array of regions that are combined and normalised into a single valid PDF. Any shape can be constructed by composing regions. All L2 builders resolve through this function.

```typescript
const belief = buildBelief([
  { type: 'point', center: 75000, spread: 5000, weight: 2 },
  { type: 'range', low: 60000, high: 70000, weight: 1 }
]);
```

**Region Types:**

Regions define portions of probability mass. Multiple regions are combined according to their weights.

**Point Region:**

Concentrated probability around a specific value. Creates a peak.

| Parameter    | Required | Description                                                                     |
| ------------ | -------- | ------------------------------------------------------------------------------- |
| `type`       | Yes      | `'point'`                                                                       |
| `center`     | Yes      | Location of peak within bounds                                                  |
| `spread`     | Yes      | Width of the peak. Higher = more uncertain                                      |
| `weight`     | No       | Relative probability mass. Default: 1                                           |
| `skew`       | No       | Asymmetry. 0 = symmetric, positive = tail toward higher values. Range: \[-1, 1] |
| `tailWeight` | No       | Probability mass in tails vs center. Range: \[0, 1]                             |

**Range Region:**

Flat probability across an interval. Creates a plateau.

| Parameter    | Required | Description                                                |
| ------------ | -------- | ---------------------------------------------------------- |
| `type`       | Yes      | `'range'`                                                  |
| `low`        | Yes      | Start of interval                                          |
| `high`       | Yes      | End of interval                                            |
| `weight`     | No       | Relative probability mass. Default: 1                      |
| `lowHeight`  | No       | Relative density at low boundary. Default: 1               |
| `highHeight` | No       | Relative density at high boundary. Default: 1              |
| `curve`      | No       | Interpolation shape. 0 = linear, &gt;0 = convex, &lt;0 = concave |

---

#### buildGaussian

`Builder | L2`

Creates a bell curve centered on a specific value. Use when you have a point estimate with uncertainty around it.

```typescript
const belief = buildGaussian(75000, 5000);
```

**Parameters:**

| Parameter            | Required | Description            |
| -------------------- | -------- | ---------------------- |
| `center`             | Yes      | Central value          |
| `spread`             | Yes      | Width of distribution  |
| `options.skew`       | No       | Asymmetry of the curve |
| `options.tailWeight` | No       | Fat tail adjustment    |
| `options.bounds`     | No       | Override market bounds |

---

#### buildSpike

`Builder | L2`

Creates high conviction at an exact value with minimal spread. Use when you are highly confident about a specific outcome.

```typescript
const belief = buildSpike(75000);
```

---

#### buildPlateau

`Builder | L2`

Creates equal probability within a range. Use when you believe the outcome will fall somewhere within an interval but have no preference within that interval.

```typescript
const belief = buildPlateau(70000, 80000);
```

**Parameters:**

| Parameter              | Required | Description            |
| ---------------------- | -------- | ---------------------- |
| `low`                  | Yes      | Start of range         |
| `high`                 | Yes      | End of range           |
| `options.edgeBehavior` | No       | How edges taper        |
| `options.bounds`       | No       | Override market bounds |

---

#### buildRamp

`Builder | L2`

Creates a directional belief where probability increases toward one end of the range. Use when you believe higher or lower outcomes are more likely without a specific target.

```typescript
const belief = buildRamp('ascending');
```

**Parameters:**

| Parameter        | Required | Description                     |
| ---------------- | -------- | ------------------------------- |
| `direction`      | Yes      | `'ascending'` or `'descending'` |
| `options.bounds` | No       | Override market bounds          |

---

#### buildStep

`Builder | L2`

Creates multiple flat regions with different probability weights. Use for discrete scenario analysis where you assign different likelihoods to distinct ranges.

```typescript
const belief = buildStep([
  { low: 50000, high: 70000, weight: 1 },
  { low: 70000, high: 90000, weight: 3 },
  { low: 90000, high: 110000, weight: 1 }
]);
```

---

#### buildMultimodal

`Builder | L2`

Creates multiple distinct peaks. Use when you believe there are several possible outcomes with different likelihoods.

```typescript
const belief = buildMultimodal([
  { type: 'point', center: 65000, spread: 3000, weight: 1 },
  { type: 'point', center: 85000, spread: 3000, weight: 2 }
]);
```

Each peak can be a Point or Range type with associated weight.

---

#### buildCustom

`Builder | L2`

Creates a shape from user-drawn control points. The SDK interpolates between points and upsamples to the market's Bernstein degree K.

```typescript
const belief = buildCustom([
  { x: 0.0, y: 0.1 },
  { x: 0.3, y: 0.5 },
  { x: 0.7, y: 0.8 },
  { x: 1.0, y: 0.2 }
], market);
```

Control points use normalised coordinates where x spans \[0, 1] across the outcome range.

---

#### buildBinary

`Builder | L3`

Creates a yes/no belief about whether the outcome falls within a range. Reads current market state to construct the appropriate shape.

```typescript
// Belief that outcome IS in range
const yes = buildBinary({ low: 70000, high: 80000 }, 'yes', market);

// Belief that outcome is NOT in range
const no = buildBinary({ low: 70000, high: 80000 }, 'no', market);
```

When `outcome` is `'yes'`, constructs a plateau inside the range. When `'no'`, transforms to a step function covering regions outside the range.

---

#### buildAmplifyConsensus

`Builder | L3`

Creates a belief aligned with current consensus but with higher conviction in a specified region. Use when you agree with the market but believe it underweights a particular area.

```typescript
const belief = buildAmplifyConsensus({ low: 72000, high: 78000 }, market);
```

Reads market consensus and amplifies density within the specified range.

---

#### buildContrarian

`Builder | L3`

Creates a belief opposing current consensus. Places probability mass where consensus density is low.

```typescript
const belief = buildContrarian(market);
```

Reads market consensus and inverts it. Use when you believe the market is systematically wrong.

---

### Projecting Outcomes

Projection functions compute hypothetical outcomes without executing transactions. They read current state and simulate what would happen under various scenarios, enabling informed decision-making before committing capital.

---

#### projectBuy

`Projection | L2`

Projects the complete outcome of entering a position: claims minted, resulting claim share, post-trade consensus, and the magnitude of market impact.

```typescript
const projection = await projectBuy('market-123', belief, 1000);
```

**Response:**

```typescript
{
  claims: number,              // Claim tokens that would be minted
  claimShare: number,          // Resulting share of total claims
  consensusAfter: number[],    // Post-trade consensus coefficients
  shiftMagnitude: number       // How much the trade moves consensus
}
```

This is the primary pre-trade analysis function. Call before every buy to show users the full impact of their trade.

---

#### projectSell

`Projection | L2`

Projects the collateral returned if a position is closed at current market state. Supports partial exits via percentage parameter.

```typescript
const projection = await projectSell('position-456');
// Full exit

const partial = await projectSell('position-456', 50);
// 50% exit
```

**Response:**

```typescript
{
  collateralReturned: number,
  claimsBurned: number,
  remainingClaims?: number      // Present for partial exits
}
```

The collateral returned reflects current market state, not the original entry price.

---

#### projectPayout

`Projection | L2`

Projects the payout a position would receive if the market resolves to a specific outcome. Includes full breakdown of the settlement calculation.

```typescript
const projection = await projectPayout('position-456', 75000);
```

**Response:**

```typescript
{
  payout: number,
  eligible: boolean,           // Passes τ eligibility gate
  weight: number,              // Combined settlement weight
  claimShare: number,          // s_i component
  accuracyShare: number        // a_i component
}
```

The breakdown enables UIs that explain why the payout is what it is—showing how contribution history and accuracy combine.

---

#### projectPayoutCurve

`Projection | L2`

Projects payouts across the entire outcome range, providing a complete picture of how the position performs under all possible resolutions.

```typescript
const curve = await projectPayoutCurve('position-456');
```

**Response:**

```typescript
{
  points: Array<{ outcome: number, payout: number }>,
  minPayout: number,
  maxPayout: number
}
```

Essential for visualising position risk profile. Resolution parameter controls sampling density for performance/precision tradeoff.

---

#### projectEligibility

`Projection | L2`

Projects whether a position would pass the τ eligibility gate at a specified outcome.

```typescript
const eligibility = await projectEligibility('position-456', 75000);
```

**Response:**

```typescript
{
  eligible: boolean,
  density: number,             // Position's density at outcome
  threshold: number,           // Required density for eligibility
  densityRatio: number         // Position density / threshold
}
```

Critical for positions with edge beliefs. Prevents surprise exclusion at settlement.

---

#### projectClaimShare

`Projection | L2`

Projects the position's current share of total minted claims. This is the s\_i component in settlement.

```typescript
const share = await projectClaimShare('position-456');
```

**Response:**

```typescript
{
  share: number,
  claims: number,
  totalClaims: number
}
```

Claim share changes as other participants enter or exit the market.

---

#### projectCollateralForPayout

`Projection | L2`

Projects the collateral required to achieve a target payout at a specific outcome. Inverse planning: instead of "what do I get for X collateral," answers "what must I commit to get Y payout."

```typescript
const requirement = await projectCollateralForPayout(
  'market-123', 
  belief, 
  100,      // target payout
  75000     // outcome
);
```

**Response:**

```typescript
{
  collateralRequired: number,
  resultingClaims: number
}
```

---

#### projectCollateralForClaimShare

`Projection | L2`

Projects the collateral required to achieve a target percentage of the total claim pool.

```typescript
const requirement = await projectCollateralForClaimShare('market-123', belief, 0.05);
```

**Response:**

```typescript
{
  collateralRequired: number,
  achievable: boolean          // False if target share is impractical
}
```

---

#### projectExpectedPayout

`Projection | L3`

Projects the probability-weighted average payout assuming current consensus represents the true probability distribution.

```typescript
const expected = await projectExpectedPayout('position-456');
```

**Response:**

```typescript
{
  expectedPayout: number,
  valueChange: number,         // Expected payout minus collateral
  collateral: number
}
```

A contrarian position will show negative expected value under consensus by definition. This is factual information, not advice.

---

#### projectProfitRange

`Projection | L3`

Projects the outcome ranges where the position is profitable (payout exceeds collateral committed).

```typescript
const profit = await projectProfitRange('position-456');
```

**Response:**

```typescript
{
  ranges: Array<{ start: number, end: number }>,
  breakevenPoints: number[]
}
```

Multiple ranges are possible for complex belief shapes. Breakeven points are the boundaries where payout equals collateral.

---

#### projectCompare

`Projection | L3`

Projects a side-by-side comparison of two positions, showing key metrics and differences.

```typescript
const comparison = await projectCompare('position-456', 'position-789');
```

**Response:**

```typescript
{
  positionA: { expectedPayout, profitRanges, claimShare, breakevenPoints },
  positionB: { expectedPayout, profitRanges, claimShare, breakevenPoints },
  differences: { ... }
}
```

Returns factual comparison only. The SDK never recommends which position is "better."

---

### Executing Trades

Transaction functions write to the blockchain. They modify protocol state by creating positions, closing positions, or transferring collateral.

---

#### buy

`Transaction | L1`

Creates a new position on-chain. Transfers collateral from user to the unified pool and mints a Position Ticket NFT representing the position.

```typescript
const result = await buy('market-123', belief, 1000);
```

**Parameters:**

| Parameter    | Required | Description                           |
| ------------ | -------- | ------------------------------------- |
| `marketId`   | Yes      | Target market                         |
| `belief`     | Yes      | Bernstein coefficients from a builder |
| `collateral` | Yes      | Amount to commit                      |
| `slippage`   | No       | Maximum acceptable deviation          |

**Response:**

```typescript
{
  positionId: string,
  claims: number,
  txHash: string
}
```

Reverts if slippage is exceeded. Belief coefficients must be valid (non-negative, sum to 1).

---

#### sell

`Transaction | L1`

Closes a position fully or partially. Burns the Position Ticket (full exit) or updates ticket state (partial exit). Returns collateral from pool to user.

```typescript
const result = await sell('position-456');
// Full exit

const partial = await sell('position-456', 50);
// 50% exit
```

**Parameters:**

| Parameter    | Required | Description                                             |
| ------------ | -------- | ------------------------------------------------------- |
| `positionId` | Yes      | Position to close                                       |
| `amount`     | No       | Percentage (0-100) or absolute collateral. Default: 100 |
| `slippage`   | No       | Maximum acceptable deviation                            |

**Response:**

```typescript
{
  collateralReturned: number,
  claimsBurned: number,
  remainingClaims?: number,
  txHash: string
}
```

---

#### updatePosition

`Transaction | L3`

Changes a position's belief shape by executing a sell followed by a buy. Orchestrates two sequential transactions.

```typescript
const result = await updatePosition('position-456', newBelief);
```

**Parameters:**

| Parameter         | Required | Description                                                  |
| ----------------- | -------- | ------------------------------------------------------------ |
| `positionId`      | Yes      | Position to update                                           |
| `newCoefficients` | Yes      | New belief shape                                             |
| `collateralDelta` | No       | Additional collateral to add (positive) or remove (negative) |
| `slippage`        | No       | Maximum acceptable deviation                                 |

**Response:**

```typescript
{
  soldPosition: { collateralReturned, claimsBurned },
  newPosition: { positionId, claims },
  txHashes: string[]
}
```

Use when adjusting belief while staying in the market. The SDK handles the sell-then-buy orchestration.
