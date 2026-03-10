---
hidden: true
---

# Positions

## Positions

A position represents a participant's stake in a market. Each position is an NFT (Position Ticket) that binds together a belief shape, committed collateral, and minted claims. Positions can be transferred, delegated, partially exited, or held until settlement.

***

### Reading Position State

Query functions read position data from the blockchain. These functions return current state without modifying it.

***

#### queryPositionState

`Query | L1`

Returns the complete on-chain state of a position. This is the single source of truth for all position data and serves as the foundation for derived queries and projections.

```typescript
const state = await queryPositionState('position-456');
```

**Response:**

```typescript
{
  belief: number[],            // Bernstein coefficients (p)
  collateral: number,          // Committed collateral (C)
  claims: number,              // Minted claims (m)
  owner: address,              // Current NFT owner
  createdBlock: number,
  createdTimestamp: number,
  metadata: object
}
```

***

#### queryUserPositions

`Query | L1`

Returns all position IDs owned by a wallet address. This is a direct on-chain read that returns identifiers only.

```typescript
const positions = await queryUserPositions('0x...');
// { positions: ['position-456', 'position-789', ...] }
```

For complete position data, call `queryPositionState` on each ID. For paginated results with embedded market context, use `discoverUserPositions` instead.

***

#### queryClaimShare

`Query | L2`

Returns the position's current share of total minted claims in the market. This is the s\_i component in settlement—the portion of payout weight derived from claim ownership.

```typescript
const share = await queryClaimShare('position-456');
```

**Response:**

```typescript
{
  share: number,               // s_i = claims / totalClaims
  claims: number,              // Position's claims (m_i)
  totalClaims: number          // Market's total claims (M)
}
```

Claim share changes as other participants enter or exit the market.

***

#### queryPositionVsConsensus

`Query | L3`

Returns an analysis of how a position's belief compares to current market consensus. Includes divergence measures and identifies regions where the position is overweight or underweight relative to consensus.

```typescript
const analysis = await queryPositionVsConsensus('position-456');
```

**Response:**

```typescript
{
  divergence: number,                              // Overall difference measure
  overweightRegions: Array<{ start, end }>,        // Where position exceeds consensus
  underweightRegions: Array<{ start, end }>,       // Where position trails consensus
  alignment: 'contrarian' | 'aligned' | 'neutral'  // Qualitative characterization
}
```

Useful for understanding exposure and explaining "you're betting against consensus in region X" in position detail views.

***

#### queryPositionSummary

`Query | L3`

Returns a human-readable summary combining query data with projection data. Designed for position cards and portfolio views where users want a complete picture without understanding underlying mechanics.

```typescript
const summary = await queryPositionSummary('position-456');
```

**Response:**

```typescript
{
  collateral: number,
  claims: number,
  claimShare: number,
  currentValue: number,        // Current sell value
  profitRange: Array<{ start, end }>,
  expectedPayout: number,      // Under current consensus
  pnl: number                  // Current value minus collateral
}
```

**Note:** This function calls both Query and Projection functions internally.

***

### Discovering Positions

Discovery functions retrieve position data from an indexed database. These enable filtering, sorting, and pagination with embedded market context.

***

#### discoverUserPositions

`Discovery | L2`

Returns all positions owned by an address with embedded market summaries. This is the primary function for building portfolio views.

```typescript
const portfolio = await discoverUserPositions('0x...', {
  positionState: 'open',
  sort: 'collateral',
  sortDirection: 'desc',
  limit: 20
});
```

**Response:**

```typescript
{
  positions: Array<{
    positionId: string,
    collateral: number,
    claims: number,
    createdAt: timestamp,
    state: 'open' | 'settled',
    market: MarketSummary
  }>,
  totalCount: number,
  hasMore: boolean,
  cursor: string
}
```

**Filter Options:**

| Filter          | Description      | Values                         |
| --------------- | ---------------- | ------------------------------ |
| `positionState` | Settlement state | `'open'`, `'settled'`, `'any'` |

**Sort Options (Position):**

| Field        | Description                 |
| ------------ | --------------------------- |
| `created_at` | Position creation timestamp |
| `collateral` | Committed collateral amount |
| `claims`     | Minted claim units          |

Default sort is `created_at` descending.

***

#### discoverUserActivity

`Discovery | L2`

Returns markets where a specified address has participated, either as creator or trader. Each result includes role annotation and embedded position summaries.

```typescript
const activity = await discoverUserActivity('0x...', {
  state: 'open',
  limit: 20
});
```

**Response:**

```typescript
{
  markets: Array<{
    ...MarketSummary,
    role: 'creator' | 'participant' | 'both',
    positions: PositionSummary[]
  }>,
  totalCount: number,
  hasMore: boolean,
  cursor: string
}
```

Accepts the same filter options as `discoverMarkets`. The `positions` array is embedded when the user holds positions in the market.

***

### Managing Positions

Transaction functions for position management. These modify on-chain state by transferring ownership, delegating control, or closing positions.

***

#### transferPosition

`Transaction | L1`

Transfers ownership of a Position Ticket NFT to another address. Standard ERC-721 transfer.

```typescript
const result = await transferPosition('position-456', '0x...');
// { txHash: string }
```

The recipient receives the full position with original belief, collateral, and claims intact.

***

#### approvePosition

`Transaction | L1`

Grants another address permission to sell or transfer a specific position. Required before a third party can manage the position.

```typescript
const result = await approvePosition('position-456', '0x...');
// { txHash: string }
```

Pass the zero address to revoke approval. Standard ERC-721 approve pattern.

***

#### setApprovalForAll

`Transaction | L1`

Grants or revokes blanket approval for an operator to manage all of the user's positions.

```typescript
const result = await setApprovalForAll('0x...', true);
// { txHash: string }
```

**Parameters:**

| Parameter  | Required | Description                        |
| ---------- | -------- | ---------------------------------- |
| `operator` | Yes      | Address to grant/revoke approval   |
| `approved` | Yes      | `true` to grant, `false` to revoke |

Standard ERC-721 pattern. Critical for vault and automated manager integrations.

***

#### batchSell

`Transaction | L3`

Closes multiple positions across markets in a single orchestrated operation.

```typescript
const result = await batchSell(['position-456', 'position-789']);
```

**Parameters:**

| Parameter     | Required | Description                               |
| ------------- | -------- | ----------------------------------------- |
| `positionIds` | Yes      | Array of positions to close               |
| `slippage`    | No       | Maximum acceptable deviation per position |

**Response:**

```typescript
{
  results: Array<{
    positionId: string,
    collateralReturned: number,
    success: boolean,
    txHash?: string
  }>
}
```

Continues processing on individual failures. Check `success` flag for each position.

***

#### closeAllPositions

`Transaction | L3`

Exits all open positions matching specified criteria.

```typescript
const result = await closeAllPositions({
  categories: ['crypto']
});
```

**Parameters:**

| Parameter             | Required | Description                          |
| --------------------- | -------- | ------------------------------------ |
| `criteria.marketId`   | No       | Limit to specific market             |
| `criteria.categories` | No       | Limit to markets in these categories |
| `criteria.slippage`   | No       | Maximum acceptable deviation         |

**Response:**

```typescript
{
  closed: number,
  totalCollateralReturned: number,
  results: Array<{ positionId, collateralReturned, success, txHash? }>
}
```

Use for emergency exits, portfolio liquidation, or category-based risk reduction.

***

#### exitMarket

`Transaction | L3`

Closes all positions the user holds in a specific market. More targeted than `closeAllPositions`.

```typescript
const result = await exitMarket('market-123');
```

**Parameters:**

| Parameter  | Required | Description                  |
| ---------- | -------- | ---------------------------- |
| `marketId` | Yes      | Market to exit completely    |
| `slippage` | No       | Maximum acceptable deviation |

**Response:**

```typescript
{
  positionsClosed: number,
  totalCollateralReturned: number,
  results: Array<{ positionId, collateralReturned, success, txHash? }>
}
```

Use when leaving a market entirely before resolution.
