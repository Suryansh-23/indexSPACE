# IndexSpace SPEC

Last updated: 2026-05-12

## 1. Product Direction

Build **IndexSpace**, an onchain async forecast-index vault product for
FunctionSpace markets.

IndexSpace lets users subscribe to curated narrative indices backed by real
FunctionSpace market positions. The product is not only an analytics terminal:
users deposit testnet ERC-20 assets into an async vault, a curator executes the
underlying FunctionSpace trades, and users receive vault shares representing
exposure to the index strategy.

Core pitch:

> IndexSpace turns prediction-market narratives into tradeable async index
> vaults.

The important technical framing:

- The vault/share lifecycle is onchain on Base Sepolia.
- The underlying FunctionSpace trades are executed offchain through the
  FunctionSpace SDK by a vault-scoped curator account.
- The curator is a trusted MVP actor. Signed receipts and TEE execution are
  deferred.
- FunctionSpace positions are not onchain assets. The vault does not directly
  custody FunctionSpace positions; it owns the user-facing request/share
  accounting and redemption flow.

## 2. MVP Thesis

The MVP should feel like a working mutual-fund-style index product:

1. User connects wallet.
2. User deposits testnet ERC-20 into an index vault.
3. Vault records an async deposit request.
4. Backend curator immediately executes the corresponding FunctionSpace basket.
5. Curator fulfills the vault request with shares.
6. User receives or claims vault shares.
7. User requests redemption.
8. Curator sells proportional FunctionSpace exposure.
9. Curator fulfills the redemption request.
10. User claims redeemed assets to their wallet.

This is closer to an async mutual fund than an ETF. Do not use ETF language.

Preferred product terms:

- async forecast index vault
- narrative index vault
- subscription
- redemption
- shares
- NAV
- curator
- execution evidence

Avoid:

- trustless fund
- ETF
- fully onchain custody of FunctionSpace positions
- guaranteed NAV
- automatic settlement
- passive investment product

## 3. Locked Architecture Decisions

### Repo Structure

Implementation lives under the SDK fork, but in a new product workspace:

```text
fs_trading_sdk/
  indexspace/
    ui/          # Vite + React app
    backend/     # Bun + Hono + SQLite API, curator, simulator
    contracts/   # Foundry project
    shared/      # shared index config and types
```

Keep the scaffold intentionally small. Single files are acceptable where the
logic is small. Avoid production-style folder bloat until the code demands it.

Foundry's normal `script/` directory stays inside `indexspace/contracts` if
needed. Do not create a top-level `scripts/` directory unless cross-package
orchestration becomes painful.

### Stack

- Frontend: Vite + React.
- Wallet stack: `wagmi` + `viem` + RainbowKit.
- Backend: Bun + Hono + SQLite.
- Contracts: Foundry + Solidity, custom minimal ERC-7540-style vaults built
  with OpenZeppelin ERC-20/ERC-4626 primitives.
- Network: Base Sepolia.
- Vault asset: Circle Base Sepolia USDC
  (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`).
- FunctionSpace frontend SDK: `@functionspace/react`.
- FunctionSpace backend SDK: `@functionspace/core`.
- TEE: deferred; design backend so it can later run inside Phala/dstack or a
  similar TEE.

### Vault Coverage

Ship four indices:

1. AI Acceleration Index: real integrated vault.
2. Crypto Reflexivity Index: real integrated vault.
3. Macro Stress Index: preview-only index.
4. Creator Economy Index: preview-only index.

Do not try to make all four vaults fully integrated in the MVP.

## 4. Compliance And Guardrails

FunctionSpace competition guardrails still matter:

- Use live FunctionSpace markets; do not create custom FunctionSpace markets.
- Read `numBuckets`, `lowerBound`, and `upperBound` from live market objects.
- Use `@functionspace/core` for belief generation, payout previews, validation,
  and trade execution in backend code.
- Use `@functionspace/react` hooks for FunctionSpace-facing market data and
  previews inside the React UI where applicable.
- Use `PasswordlessAuthWidget` for any user-facing FunctionSpace auth surface.
- Do not submit raw FunctionSpace trade payloads from React.
- Do not reimplement FunctionSpace math exposed by the SDK.
- Assume no realtime push from FunctionSpace; use polling/refetch.

The backend may use `@functionspace/core` directly because it is not a React
component and this is the documented non-React SDK surface.

## 5. ERC-7540 Model

Target closer ERC-7540 compatibility, but keep the implementation minimal.

The vault should support async deposit and redeem flows:

```solidity
requestDeposit(uint256 assets, address controller, address owner)
requestRedeem(uint256 shares, address controller, address owner)

pendingDepositRequest(uint256 requestId, address controller)
claimableDepositRequest(uint256 requestId, address controller)
pendingRedeemRequest(uint256 requestId, address controller)
claimableRedeemRequest(uint256 requestId, address controller)

setOperator(address operator, bool approved)
isOperator(address controller, address operator)
```

Expose operator functions for ERC-7540 compatibility, but do not rely on
operator claiming in the MVP.

Use `requestId = 0` for the MVP. That aggregates requests per controller and
keeps the contract simpler. Emit custom events with an internal monotonic
request number for UI tracking if needed.

Use one active request total per controller per vault. A controller cannot open
a new deposit or redeem request while any request is pending or claimable.

Suggested storage shape:

```solidity
enum RequestKind {
    None,
    Deposit,
    Redeem
}

enum RequestStatus {
    None,
    Pending,
    Claimable
}

struct Request {
    RequestKind kind;
    RequestStatus status;
    uint256 assets;
    uint256 shares;
}

mapping(address controller => Request) public requests;
```

Both `requestDeposit` and `requestRedeem` should reject with `ACTIVE_REQUEST`
if `requests[controller].status != RequestStatus.None`. `claimDeposit` and
`claimRedeem` clear the request.

Important ERC-7540 behavior:

- Requests move through `pending -> claimable -> claimed`.
- The vault should not push claim assets/shares directly to the user during
  fulfillment.
- Claiming can be performed by the controller or by an approved operator.
- For MVP, users claim manually after fulfillment. Backend/operator claiming is
  deferred.
- Failure/cancel functions are deferred. If a request gets stuck during the
  demo, use manual/admin recovery rather than adding more contract surface.

UX can still present this as one flow:

```text
requested -> executing -> claimable -> claimed
```

but the implementation should preserve the claim state.

## 6. Onchain Asset Flow

Use Circle Base Sepolia USDC as the vault asset:

```text
0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

The UI should include a "Need test USDC?" link to the Circle faucet and a copy
button for the token address.

Deposits:

1. User approves vault to spend test ERC-20.
2. User calls `requestDeposit`.
3. Vault pulls assets from user and records pending deposit.
4. Backend sees `DepositRequest`.
5. Backend executes FunctionSpace basket.
6. Backend calls fulfillment function to move request to claimable.
7. User manually claims shares.

Redemptions:

1. User calls `requestRedeem`.
2. Vault locks or burns shares.
3. Backend sees `RedeemRequest`.
4. Backend sells proportional FunctionSpace positions.
5. Backend calls fulfillment function to move request to claimable.
6. User manually claims assets.

The vault contract should hold all user-deposited/redeemable test ERC-20.
The backend should not temporarily custody user ERC-20 in a hot wallet.

## 7. Backend Responsibilities

The backend is one deployable service with a small internal split:

```text
backend/src/
  index.ts          # Hono app and worker boot
  config.ts         # env, vault/index config loading
  db.ts             # SQLite setup
  sdk.ts            # FunctionSpace client/auth helpers
  quotes.ts         # index quote engine
  curator.ts        # request execution and fulfillment
  simulator.ts      # optional demo activity
```

This is intentionally coarse. Split later only when files become hard to read.

### Curator

The curator:

- uses one vault-scoped FunctionSpace account per real vault;
- watches Base Sepolia vault events;
- computes per-constituent trade allocations from static weights;
- builds SDK belief vectors;
- calls FunctionSpace previews before execution;
- executes buys/sells through `@functionspace/core`;
- records FunctionSpace position IDs and sell results;
- fulfills vault requests onchain;
- leaves fulfilled requests claimable for the user to claim manually.

Curator accounts and simulator accounts must be separate.

### Position Book

Use a pooled multi-lot position book, not one mutable FunctionSpace position per
market.

The current SDK opens and closes positions:

```ts
buy(client, marketId, belief, collateral, numBuckets)
sell(client, positionId, marketId)
previewSell(client, positionId, marketId)
```

There is no visible SDK primitive for adding collateral to an existing position,
partially selling a position, merging positions, or rebalancing one position in
place.

So each subscription can create new lots:

```text
vault -> market -> many FunctionSpace position lots
user -> vault shares
```

Users own pro-rata vault shares. They do not own specific FunctionSpace lots.

### Share And NAV Math

Use Circle Base Sepolia USDC as the asset and assume, for demo purposes:

```text
1 USDC = 1 FunctionSpace collateral unit
```

Use 6 decimals for USDC and 18 decimals for vault shares.

First deposit:

```text
sharesMinted = assetsDeposited
```

Later deposits:

```text
sharesMinted = assetsDeposited / navPerShare
```

Live NAV:

```text
grossNAV = idleUSDC + sum(previewSell(open FunctionSpace positions))
navPerShare = grossNAV / totalShareSupply
```

If share supply is zero, `navPerShare = 1`.

### Redemption Math

Redeem requests unwind lots instead of partially selling positions.

```text
redeemFraction = sharesRequested / totalShareSupply
targetAssets = redeemFraction * grossNAV
```

Simple MVP algorithm:

```text
for each constituent by weight:
  targetMarketValue = targetAssets * constituentWeight
  sell open lots FIFO until returnedCollateral >= targetMarketValue
```

The user receives the realized amount from the sold lots. Remaining lots stay
in the vault and NAV is recomputed after execution.

If partial execution occurs, pause the request for manual recovery. Do not mint
or redeem silently against incomplete execution.

### Belief Strategy

Each index constituent has three strategy dimensions:

1. constituent weight;
2. belief curve center or target range;
3. belief curve width/confidence/skew.

For MVP, use fixed target belief templates per constituent:

```ts
type ConstituentStrategy = {
  weight: number;
  shape: "gaussian" | "range" | "right_skew" | "left_skew";
  centerNormalized: number;
  widthNormalized: number;
  jitterBps?: number;
};
```

The curator may apply small bounded execution jitter per lot so activity does
not look robotic, but it must not change the index thesis, weights, or broad
shape.

Allowed:

```text
base center = 0.72
jitter = +/- 0.02
actual center = 0.70 to 0.74
```

Not allowed:

```text
randomly flip bullish/bearish thesis
randomly change weights
randomly widen/narrow curves enough to change index identity
```

### Indexer

The backend should index Base Sepolia contract events with HTTP polling and
event filters, not WebSockets. The server may run for several days during the
demo, so boring restartable polling is preferred over fragile socket state.

Persist in SQLite:

- last indexed block per contract;
- indexed event rows;
- dedupe key: `chainId + contractAddress + txHash + logIndex`;
- vault request state;
- execution state;
- FunctionSpace position mappings.

Defaults:

- poll interval: 10 seconds;
- confirmations: 3 blocks;
- reorg buffer: 20 blocks;
- on restart, resume from checkpoint minus reorg buffer.

### Quote Engine

The backend owns index-level quotes.

FunctionSpace core provides the lower-level preview primitives:

- `previewPayoutCurve(client, marketId, belief, collateral, numBuckets)`
- `previewSell(client, positionId, marketId)`

IndexSpace builds vault quotes on top:

```text
POST /api/vaults/:vaultId/quote-subscribe
POST /api/vaults/:vaultId/quote-redeem
```

Subscribe quote output should include:

- input assets;
- estimated shares;
- current NAV/share;
- per-market collateral allocation;
- generated belief shape summary;
- FunctionSpace payout preview summary;
- execution fee/slippage buffer if any;
- quote expiry.

Redeem quote output should include:

- input shares;
- estimated assets;
- current NAV/share;
- proportional position unwind plan;
- `previewSell` results where positions exist;
- quote expiry.

The contract remains the final source of request/share state. Quotes are
advisory because ERC-7540 async exchange rates can change between request and
claim.

### Simulator

Keep simulator logic inside `backend` for deployment simplicity, but isolate it
from the curator path.

Simulator modes:

1. Raw FunctionSpace market simulator:
   - uses simulator-owned FunctionSpace accounts;
   - places tiny buy/sell trades on selected raw markets;
   - creates visible market activity for the demo.

2. Vault activity simulator:
   - uses configured test wallets;
   - submits small subscribe/redeem requests against the Base Sepolia vaults;
   - helps the dashboard show live request activity.

Rules:

- Simulator must be explicitly labeled as demo/synthetic activity.
- Simulator must never use curator FunctionSpace accounts.
- Simulator must never fulfill user vault requests.
- Simulator is on by default.
- Simulator is disabled only when an explicit env flag sets it off.
- Simulator can be configured from an internal UI route.

## 8. TEE Deferred Design

TEE is deferred from the MVP critical path.

The backend should still be TEE-ready at the architecture level:

- keep curator execution deterministic and isolated from simulator code;
- persist execution rows linking vault requests to FunctionSpace position IDs;
- keep one vault-scoped FunctionSpace account per live vault;
- later add signed receipts, an `/attestation` endpoint, and Phala/dstack
  deployment without changing the core product model.

Do not block the MVP on Phala, Oasis ROFL, Chainlink Functions, or
attestation verification.

## 9. UI Scope

### First Screen: Trading Terminal Dashboard

The first screen is a trading terminal dashboard, not a landing page.

It should include:

- four index cards;
- live NAV/index chart area;
- request activity strip;
- vault health/status;
- compact portfolio summary;
- trading-focused panel inspired by Hyperliquid/Binance.
- "Need test USDC?" link to the Circle faucet.

The UI should feel like a serious trading product, not a marketing page.

### Real Vault Detail Pages

For AI Acceleration and Crypto Reflexivity:

- left: NAV/index chart and key metrics;
- right: persistent subscribe/redeem ticket;
- lower tabs:
  - constituents;
  - positions;
  - methodology.

The trade ticket should include:

- subscribe/redeem toggle;
- amount input;
- quote summary;
- estimated shares/assets;
- execution route;
- status chip;
- confirm button.

Keep trade modal complexity low. Advanced controls such as NAV tolerance,
deadline, or slippage can be deferred unless the contract requires them.

### FunctionSpace Widget Reuse

Use relevant `@functionspace/ui` widgets directly where they speed up the build
and reinforce that IndexSpace is using FunctionSpace-native market primitives.

Recommended widget usage:

| Widget | Use In IndexSpace | Notes |
| --- | --- | --- |
| `PasswordlessAuthWidget` | Optional FunctionSpace auth surface / internal testing | Required if exposing user-side FunctionSpace auth. |
| `MarketCharts` | Constituent drilldown tabs | Use `views={["consensus", "distribution", "timeline"]}`. |
| `ConsensusChart` | Compact constituent chart and strategy preview | Good for showing current curve vs vault target curve. |
| `DistributionChart` | Constituent mini-charts | Useful in constituent table/details. |
| `TimelineChart` | Market history drilldown | Use where history is available. |
| `MarketStats` | Constituent detail panel | Shows volume, liquidity, open positions, status. |
| `TimeSales` | Raw market activity panel | Useful alongside simulator activity. |
| `PositionTable` | Internal/debug view for vault-scoped FS account | Not the main user portfolio, because users own vault shares. |
| `MarketExplorer` / `MarketFilterBar` | Internal market selection / catalogue debug | Not needed in the primary user flow. |

Trading widgets:

- `TradePanel`, `ShapeCutter`, `BinaryPanel`, `BucketRangeSelector`,
  `BucketTradePanel`, and `CustomShapeEditor` are single-market FunctionSpace
  trade widgets.
- They should not power index-vault subscription, because subscription goes
  through the vault contract and backend curator.
- They can be used in constituent drilldowns or internal strategy preview panes
  where direct single-market FunctionSpace interaction is useful.

Styling:

- Wrap IndexSpace UI in `FunctionSpaceProvider` with a custom theme aligned to
  the IndexSpace design system.
- Prefer CSS variable/theme overrides and wrapper layout classes over editing
  SDK package internals.
- Keep only one SDK trading component mounted at a time because the SDK widgets
  coordinate preview state through shared context.

### Preview-Only Index Pages

For Macro Stress and Creator Economy:

- index score;
- distribution metrics;
- constituent table;
- "what moved?" card;
- disabled/coming-soon trade ticket explaining why vault execution is not
  enabled yet.

### Portfolio

Add a global portfolio drawer or page showing:

- vault shares;
- estimated NAV value;
- pending requests;
- claimable requests;
- claimed/completed history;
- links to Base Sepolia transactions and FunctionSpace position IDs.

Use a Uniswap-like drawer pattern:

- wallet/portfolio button in the top-right;
- drawer slides from the right;
- tabs for `Portfolio`, `Requests`, and `Activity`;
- primary actions stay in the index detail trade ticket, not inside the drawer.

### Internal Route

Add a hidden/internal route:

```text
/internal
```

It should show:

- backend health;
- indexer checkpoint;
- curator/operator address;
- vault-scoped FunctionSpace usernames;
- simulator state;
- controls for raw FunctionSpace simulator;
- controls for vault request simulator.

This is a demo/operator surface, not part of the normal user nav.

## 10. Backend Persistence

Keep the SQLite schema small. Index/vault configuration lives in shared TS
config, not the DB.

Minimum tables:

```text
requests
fs_positions
indexer_checkpoints
index_candles
simulator_state
```

`requests` tracks the one active onchain request per controller/vault and its
backend execution status.

`fs_positions` tracks pooled FunctionSpace position lots:

```text
vault_id
market_id
position_id
status
collateral
returned_collateral
belief_json_or_hash
request_id
created_at
closed_at
```

`indexer_checkpoints` stores the last indexed block per contract.

`index_candles` stores computed NAV/index-score candles for charts.

`simulator_state` stores simulator mode and last-run cursors.

## 11. Backend Indexing

Use Base Sepolia HTTP RPC polling with event filters.

Defaults:

```text
poll interval: 10 seconds
confirmations: 3 blocks
reorg buffer: 20 blocks
dedupe key: chainId + contractAddress + txHash + logIndex
```

Persist checkpoints in SQLite and, on restart, resume from checkpoint minus the
reorg buffer.

### Status Model

Use compact status chips by default:

```text
pending
executing
claimable
claimed
failed
cancelled
```

Detailed event history can live inside an execution drawer, not as the primary UI.

### Charts

Use:

- index NAV/score candle chart;
- constituent distribution mini-charts;
- trade markers for subscription/redemption events where available.

Keep one FunctionSpace trading component mounted at a time if using SDK UI
components, because SDK docs warn that multiple trading components can conflict
through shared preview state.

## 12. Index Methodology

Index scores are normalized forecast signals. NAV/share is the vault accounting
value. Keep those concepts separate.

For distribution scoring, normalize each constituent market into `[0, 1]` using
live bounds:

```ts
normalizedMedian = (median - lowerBound) / (upperBound - lowerBound);
normalizedWidth = (p90 - p10) / (upperBound - lowerBound);
conviction = 1 - normalizedWidth;
```

Orientation:

```ts
type Orientation =
  | "higher_is_bullish"
  | "lower_is_bullish"
  | "higher_is_stress"
  | "lower_is_stress";
```

Directional score:

```ts
directionalScore =
  orientation === "higher_is_bullish" ||
  orientation === "higher_is_stress"
    ? normalizedMedian
    : 1 - normalizedMedian;
```

Composite score:

```ts
indexScore = 100 * sum(weight_i * directionalScore_i);
```

Additional metrics:

- conviction: weighted inverse uncertainty width;
- dispersion: weighted standard deviation of directional scores;
- upside/downside tail mass: probability mass beyond configured thresholds;
- attribution: constituent contribution to score/NAV move.

The "what moved?" card should be concise and template-driven:

```text
AI Acceleration moved +4.8.
Main driver: OpenAI valuation right-tail expanded.
Counterweight: robotics deployment uncertainty widened.
Read: software/capitalization is bullish; physical deployment is less certain.
```

## 13. Index Configs

Use the competition dev endpoint catalogue as the implementation source:

```text
https://fs-engine-api-dev.onrender.com/api/views/markets/list
```

Market IDs below were verified against the dev endpoint on 2026-05-11. The app
must fail softly if a configured market is missing.

### AI Acceleration Index

Real vault.

| Weight | Market ID | Market | Range | Orientation | Role |
| ---: | ---: | --- | --- | --- | --- |
| 18% | 215 | OpenAI Valuation at Last Funding Round in 2026 | 150-500 | `higher_is_bullish` | capital |
| 14% | 205 | OpenAI Annualized Revenue (ARR) in Dec 2026 | 20-45 | `higher_is_bullish` | capital |
| 14% | 204 | Highest SWE-bench (Resolved) Score by an AI Model (Dec 2026) | 40-90 | `higher_is_bullish` | capability |
| 10% | 208 | Highest Chatbot Arena Elo Rating (Dec 2026) | 1350-1550 | `higher_is_bullish` | capability |
| 10% | 206 | Highest ARC-AGI Public Leaderboard Score (Dec 2026) | 60-95 | `higher_is_bullish` | capability |
| 10% | 217 | Highest GPQA Diamond Accuracy Score by an AI Model (Dec 2026) | 60-95 | `higher_is_bullish` | capability |
| 10% | 212 | Tesla Optimus Units Sold or Deployed Internally by Dec 2026 | 0-5000 | `higher_is_bullish` | deployment |
| 8% | 210 | Total Number of Figure AI Robots in Commercial Deployment (Dec 2026) | 0-2000 | `higher_is_bullish` | deployment |
| 6% | 211 | Waymo Annual Run Rate Revenue (Dec 2026) | 50-500 | `higher_is_bullish` | deployment |

### Crypto Reflexivity Index

Real vault.

| Weight | Market ID | Market | Range | Orientation | Role |
| ---: | ---: | --- | --- | --- | --- |
| 15% | 159 | Solana (SOL) Price in USD on Dec 31, 2026 | 0-3000 | `higher_is_bullish` | liquidity |
| 10% | 168 | Dogecoin (DOGE) Price in USD on Dec 31, 2026 | 0-4.5 | `higher_is_bullish` | liquidity |
| 15% | 160 | Total Stablecoin Market Capitalization Dec 31, 2026 | 0-2500 | `higher_is_bullish` | liquidity |
| 10% | 167 | MakerDAO DAI Supply on Dec 31, 2026 | 0-50 | `higher_is_bullish` | liquidity |
| 15% | 166 | Uniswap V3 Annual Trading Volume 2026 | 0-6000 | `higher_is_bullish` | liquidity |
| 10% | 163 | Lido (LDO) Total ETH Staked Dec 31, 2026 | 0-62.5 | `higher_is_bullish` | adoption |
| 10% | 161 | Ethereum Average Daily Gas Price (Gwei) in Dec 2026 | 0-500 | `higher_is_stress` | liquidity |
| 8% | 238 | Aave Ethereum WETH Reserve Utilization (Month-End May 2026) | 80-100 | `higher_is_stress` | liquidity |
| 7% | 237 | Aave Ethereum USDC 30-Day Average Supply APY (May 8 - June 6 2026) | 0-15 | `higher_is_stress` | liquidity |

### Macro Stress Index

Preview-only.

| Weight | Market ID | Market | Range | Orientation | Role |
| ---: | ---: | --- | --- | --- | --- |
| 20% | 144 | US U-6 Unemployment Rate (Nov 2026) | 0-100 | `higher_is_stress` | macro |
| 15% | 148 | US 10-Year Treasury Yield on Dec 31, 2026 | 0-100 | `higher_is_stress` | macro |
| 15% | 151 | VIX (CBOE Volatility Index) Close on Dec 31, 2026 | 0-200 | `higher_is_stress` | macro |
| 10% | 175 | Brent Crude Oil Price (USD/bbl) on Dec 31, 2026 | 0-480 | `higher_is_stress` | macro |
| 10% | 174 | WTI Crude Oil Price (USD/bbl) on Dec 31, 2026 | 0-450 | `higher_is_stress` | macro |
| 10% | 185 | US Average Retail Regular Gasoline Price (Nov 2026) | 0-18 | `higher_is_stress` | macro |
| 10% | 179 | Chicago Wheat Futures Price (USd/bu) Dec 2026 | 0-3600 | `higher_is_stress` | macro |
| 10% | 79 | Arctic Sea Ice Minimum Extent in September 2026 | 0-13.75 | `lower_is_stress` | macro |

### Creator Economy Index

Preview-only.

| Weight | Market ID | Market | Range | Orientation | Role |
| ---: | ---: | --- | --- | --- | --- |
| 15% | 219 | MrBeast Total YouTube Subscribers on Dec 31, 2026 | 473-600 | `higher_is_bullish` | adoption |
| 14% | 224 | Substack Total Annual Recurring Revenue (ARR) 2026 | 50-200 | `higher_is_bullish` | adoption |
| 13% | 230 | Patreon Total Creator Earnings in 2026 | 1-4 | `higher_is_bullish` | adoption |
| 10% | 223 | OnlyFans Total Gross Revenue in 2026 | 5-12 | `higher_is_bullish` | capital |
| 10% | 222 | Twitch Peak Concurrent Viewers in 2026 | 4-12 | `higher_is_bullish` | adoption |
| 8% | 225 | Kai Cenat Peak Concurrent Twitch Viewers in 2026 | 0.5-2.5 | `higher_is_bullish` | adoption |
| 8% | 231 | Kick.com Peak Concurrent Viewers in 2026 | 0.5-3 | `higher_is_bullish` | adoption |
| 10% | 228 | Total Payout to Creators via X Ads Revenue Sharing in 2026 | 10-100 | `higher_is_bullish` | capital |
| 8% | 227 | Instagram Reels Average Daily Views (Dec 2026) | 100-400 | `higher_is_bullish` | adoption |
| 4% | 233 | Total Subscribers for Highest Subscribed Independent Podcaster | 15-40 | `higher_is_bullish` | adoption |

## 14. Shared Types

```ts
export type VaultMode = "live-vault" | "preview-only";

export type RequestStatus =
  | "pending"
  | "executing"
  | "claimable"
  | "claimed"
  | "failed"
  | "cancelled";

export type IndexConstituent = {
  id: string;
  marketId: number;
  label: string;
  weight: number;
  orientation:
    | "higher_is_bullish"
    | "lower_is_bullish"
    | "higher_is_stress"
    | "lower_is_stress";
  role: "capital" | "capability" | "deployment" | "liquidity" | "macro" | "adoption";
};

export type ForecastIndex = {
  id: string;
  name: string;
  mode: VaultMode;
  vaultAddress?: `0x${string}`;
  shareAddress?: `0x${string}`;
  assetAddress?: `0x${string}`;
  fsVaultUsername?: string;
  constituents: IndexConstituent[];
};

export type VaultExecution = {
  executionId: string;
  vaultId: string;
  requestId: string;
  internalRequestId?: string;
  side: "subscribe" | "redeem";
  controller: `0x${string}`;
  fsUsername: string;
  navBefore: string;
  navAfter: string;
  txHash?: `0x${string}`;
  fsTrades: Array<{
    marketId: number;
    side: "buy" | "sell";
    positionId: string;
    collateral: number;
    beliefHash?: string;
    returnedCollateral?: number;
  }>;
  createdAt: string;
};
```

## 15. Failure Handling

Failure/cancel functions are deferred from contract scope.

If curator execution fails before FunctionSpace trades:

- keep the request pending/blocked;
- surface manual/admin recovery in `/internal`.

If execution partially succeeds:

- persist partial execution rows;
- pause further automation for that request;
- surface admin/manual recovery in UI;
- do not silently mint shares against incomplete execution.

If user claim fails:

- keep request claimable;
- allow the user to retry claim.

## 16. Demo Flow

```text
1. Open IndexSpace terminal dashboard.
2. Show four narrative indices.
3. Click AI Acceleration, a live Base Sepolia vault.
4. Show NAV, index score, constituents, and what moved.
5. Enter subscription amount in the right-side trade ticket.
6. Backend returns quote using FunctionSpace previews.
7. User submits requestDeposit on Base Sepolia.
8. Curator detects request and executes FunctionSpace basket trades.
9. UI updates status: pending -> executing -> claimable -> claimed.
10. User sees vault shares, Base Sepolia transactions, and FunctionSpace position IDs.
11. User requests redeem.
12. Curator sells proportional positions and claims assets back to user.
13. Show Crypto Reflexivity as second live vault.
14. Show Macro Stress and Creator Economy as preview-only future vaults.
```

Final pitch:

> FunctionSpace gives us continuous belief markets. IndexSpace turns curated
> market baskets into async onchain forecast-index vaults.

## 17. Validation Checklist

Before calling the MVP done:

- UI runs from `indexspace/ui` on `localhost:3000`.
- Base Sepolia contracts deploy successfully.
- Circle Base Sepolia USDC approval and `requestDeposit` work.
- Curator sees deposit event.
- Curator executes real FunctionSpace buys through `@functionspace/core`.
- Curator fulfills deposit request and shares become claimable; user claim marks
  them claimed.
- Redemption request works.
- Curator executes FunctionSpace sells.
- Redeemed assets are claimed to the requesting user wallet through manual
  claim.
- AI Acceleration and Crypto Reflexivity have real vault flows.
- Macro Stress and Creator Economy are visibly preview-only.
- Backend simulator can be enabled/disabled.
- Simulator is on by default unless explicitly disabled by env.
- Simulator accounts are separate from curator accounts.
- Execution rows show FunctionSpace position IDs and Base Sepolia transactions.
- No UI claims that FunctionSpace positions are directly owned by the EVM
  contract.
- The app reads live market bounds and bucket counts.
- FunctionSpace SDK math/previews/trades are used instead of custom math.

## 18. Deferred

- Real TEE deployment.
- Signed execution receipts.
- Failure/cancel contract functions.
- Chainlink Functions NAV verifier.
- Full ERC-7540 audit-level compliance.
- Additional vaults for Macro Stress and Creator Economy.
- Dynamic rebalancing.
- Secondary-market share trading.
- Production custody guarantees.
- Real settlement handling for resolved FunctionSpace markets.

## 19. References

- [FunctionSpace setup guide](https://ecosystem.functionspace.dev/competition/setupguide)
- [FunctionSpace SDK builder guide](fs_trading_sdk/builder.md)
- [FunctionSpace core docs](fs_trading_sdk/packages/docs/static/core.txt)
- [FunctionSpace react docs](fs_trading_sdk/packages/docs/static/react.txt)
- [ERC-7540](https://eips.ethereum.org/EIPS/eip-7540)
- [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626)
- [Phala dstack overview](https://docs.phala.com/dstack/overview)
- [Oasis ROFL](https://docs.oasis.io/build/rofl/)
- [Chainlink Functions](https://docs.chain.link/chainlink-functions)
