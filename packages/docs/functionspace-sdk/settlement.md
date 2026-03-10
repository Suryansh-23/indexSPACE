---
hidden: true
---

# Settlement

## Settlement

Settlement occurs after a market resolves. The unified collateral pool is distributed among eligible position holders based on their claim share and accuracy at the resolved outcome. This section covers checking resolution state, understanding payout calculations, and claiming funds.

***

### Resolution State

Resolution state is read via `queryMarketState`. The relevant fields are:

```typescript
const state = await queryMarketState('market-123');

// Resolution fields:
state.resolutionState    // 'open' | 'resolved' | 'voided'
state.resolvedOutcome    // number | null (null if unresolved)
state.resolvedAt         // timestamp | null
```

**Resolution States:**

| State      | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `open`     | Market is active. Trading permitted. No outcome determined.    |
| `resolved` | Outcome has been submitted. Trading closed. Payouts available. |
| `voided`   | Market invalidated. All collateral returned to participants.   |

**Note:** Resolution is controlled by the Reality Market system, which is outside the scope of this SDK. The `resolveMarket` transaction exists as a placeholder for integration with the resolution layer.

***

### Payout Calculation

When a market resolves, each position's payout is determined by two components that combine multiplicatively:

**Claim Share (s\_i):** The position's proportion of total minted claims. Reflects cumulative contribution to the market over time—early and contrarian positions earn more claims.

**Accuracy Share (a\_i):** The position's belief density at the resolved outcome, relative to all other positions. Reflects how much probability mass the position assigned to the correct answer.

The final payout weight is: `w_i = (s_i)^λs × (a_i)^λd`

Where λs and λd are protocol parameters that balance contribution vs accuracy.

**Eligibility Gate (τ):** Positions must exceed a minimum density threshold at the resolved outcome to receive any payout. This prevents "participation trophies" for wildly inaccurate beliefs.

***

#### Projection Functions for Settlement

The following projection functions (documented in Section 4.2) are essential for settlement analysis:

**projectPayout(positionId, outcome)** — Projects payout at a specific outcome with full breakdown:

```typescript
const projection = await projectPayout('position-456', 75000);
// { payout, eligible, weight, claimShare, accuracyShare }
```

**projectEligibility(positionId, outcome)** — Checks if position passes the τ gate:

```typescript
const eligibility = await projectEligibility('position-456', 75000);
// { eligible, density, threshold, densityRatio }
```

**projectPayoutCurve(positionId)** — Projects payouts across all possible outcomes:

```typescript
const curve = await projectPayoutCurve('position-456');
// { points: [{outcome, payout}], minPayout, maxPayout }
```

**projectProfitRange(positionId)** — Identifies outcomes where position is profitable:

```typescript
const profit = await projectProfitRange('position-456');
// { ranges: [{start, end}], breakevenPoints }
```

***

### Claiming

Claim transactions withdraw entitled funds from resolved markets. Payouts use a pull model. Participants must explicitly claim their funds.

***

#### claimPayout

`Transaction | L1`

Withdraws payout from a single resolved position. Burns the Position Ticket after claiming.

```typescript
const result = await claimPayout('position-456');
```

**Response:**

```typescript
{
  payout: number,
  txHash: string
}
```

Reverts if market is not resolved or position is ineligible. Position NFT is burned after successful claim.

***

#### batchClaim

`Transaction | L3`

Claims payouts from multiple specified positions.

```typescript
const result = await batchClaim(['position-456', 'position-789']);
```

**Response:**

```typescript
{
  results: Array<{
    positionId: string,
    payout: number,
    success: boolean,
    txHash?: string
  }>
}
```

Continues processing on individual failures. Use when claiming specific positions, such as when an application manages positions on behalf of users.

***

#### claimAll

`Transaction | L3`

Claims all available payouts across all resolved markets for an address. Auto-discovers claimable positions.

```typescript
const result = await claimAll();
// Claims for connected wallet

const result = await claimAll('0x...');
// Claims for specified address (requires approval)
```

**Response:**

```typescript
{
  claimed: number,             // Number of positions claimed
  totalPayout: number,         // Sum of all payouts
  results: Array<{
    positionId: string,
    payout: number,
    txHash: string
  }>
}
```

Defaults to the connected wallet address. Use for one-click collection of all owed funds.
