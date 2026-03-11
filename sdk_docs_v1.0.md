# FunctionSpace Trading SDK — v1.0 Documentation

A TypeScript SDK for embedding prediction market trading widgets into web applications. Developers install the packages via npm and drop in themed, interactive components that handle everything from market visualization to trade execution.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Getting Started](#getting-started)
3. [Core (`@functionspace/core`)](#core)
4. [React (`@functionspace/react`)](#react)
5. [UI (`@functionspace/ui`)](#ui)
6. [Composition](#composition)
7. [Starter Kits](#starter-kits)

---

## Architecture

### Package Structure

```
packages/
├── core/     # Pure TypeScript — API client, math, transactions (no React)
├── react/    # React integration — Provider, hooks, theme system
└── ui/       # React components — TradePanel, ConsensusChart, etc.
```

The SDK follows a strict 3-layer dependency chain: **core → react → ui**. Higher layers depend on lower layers, never the reverse.

- **`@functionspace/core`** — Zero framework dependencies. Pure TypeScript functions for API communication, probability math, belief construction, and trade execution. Can be used standalone in any JavaScript environment.
- **`@functionspace/react`** — Wraps core functions in React hooks and provides a context-based Provider that manages authentication, theming, and cross-component state.
- **`@functionspace/ui`** — Ready-to-use React components (charts, trade panels, position tables) that consume hooks from the react layer and render fully themed, interactive widgets.

### Layers

Every function in the SDK belongs to one of four abstraction layers:

| Layer | Name | Description |
|-------|------|-------------|
| **L0** | Pure Math | Protocol-agnostic math. No awareness of markets, positions, or network. Input → output only. |
| **L1** | Core | Direct protocol interactions with full parameter control. Network calls via `FSClient`. |
| **L2** | Convenience | Higher-level wrappers with sensible defaults. Named concepts mapping to common use cases. |
| **L3** | Intent | Domain-specific functions driven by user intent. May reference live market state. (Reserved — not present in current core.) |

### Categories

Every function also belongs to a functional category:

| Category | What It Does | State |
|----------|-------------|-------|
| **Positions** | Pure computation — transforms inputs into belief vectors (`generateBelief`, `generateGaussian`, etc.) | Read-only (no network) |
| **Queries** | Reads and interprets current server state (markets, positions, history, trades) | Read-only |
| **Previews** | Computes hypothetical outcomes without modifying state | Read-only |
| **Transactions** | State-changing operations (buy, sell) | Write |
| **Discovery** | Find and filter available markets | Read-only |

### Theme System

The SDK uses a 30-token semantic theme system. Developers configure once at the Provider level:

```tsx
// Use a built-in preset
<FunctionSpaceProvider config={config} theme="fs-dark">

// Or customize with overrides
<FunctionSpaceProvider config={config} theme={{
  preset: "fs-dark",
  primary: "#your-brand-color"
}}>
```

Available presets: `"fs-dark"` | `"fs-light"` | `"native-dark"` | `"native-light"`

All components inherit theming automatically through CSS custom properties (`--fs-*`) and a resolved `chartColors` object on context (for SVG-rendered chart elements that cannot use CSS variables).

---

## Getting Started

### Installation

The SDK is organized as a monorepo with three packages. Install the packages your integration needs:

```bash
# Full widget integration (most common)
npm install @functionspace/core @functionspace/react @functionspace/ui

# Headless / custom UI (hooks only, no pre-built components)
npm install @functionspace/core @functionspace/react

# Pure TypeScript / non-React (API client and math only)
npm install @functionspace/core
```

### Basic Setup

Wrap your application (or the section containing SDK widgets) in `FunctionSpaceProvider`:

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, TradePanel } from '@functionspace/ui';

function App() {
  const config = {
    baseUrl: 'https://your-api.example.com',
    username: 'user',     // optional: enables auto-auth on mount
    password: 'pass',     // optional: enables auto-auth on mount
  };

  return (
    <FunctionSpaceProvider config={config} theme="fs-dark">
      <ConsensusChart marketId={1} height={400} />
      <TradePanel marketId={1} />
    </FunctionSpaceProvider>
  );
}
```

That's it. The chart and trade panel automatically coordinate — moving sliders on the TradePanel instantly shows a preview overlay on the ConsensusChart. No prop-drilling or manual wiring required.

### Authentication Modes

- **Auto-authenticate:** Pass `username` and `password` in config. The Provider authenticates on mount.
- **Interactive:** Omit credentials. Use the `AuthWidget` or `PasswordlessAuthWidget` component, or the `useAuth()` hook for login/signup UI.
- **Passwordless:** Omit credentials. Use `PasswordlessAuthWidget` for username-only login with auto-signup. Pass `storedUsername` to the provider for silent re-auth on mount.
- **Guest:** No credentials. Read-only access (charts, market data). Trading operations are blocked.

---

## Core

`@functionspace/core` — Pure TypeScript. No React dependency.

### Trading

Functions for constructing beliefs, executing trades, and previewing outcomes.

#### Position Generators

Generators construct normalized probability vectors ("beliefs") that express a trader's view of where an outcome will land. A belief vector is the core data structure of the SDK. It's what gets sent to the API when opening a position, and what gets rendered on charts as a preview overlay.

##### `generateBelief(regions, K, L, H)`: Universal Belief Constructor

**Layer:** L1 (Core). Every other generator (`generateGaussian`, `generateRange`, `generateDip`, etc.) delegates to this function. Use the convenience generators for common single-shape beliefs. Use `generateBelief` directly when you need multi-region composition or fine-grained control.

```typescript
function generateBelief(
  regions: Region[],
  K: number,
  L: number,
  H: number,
): BeliefVector  // number[] that sums to 1, length K+1
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `regions` | `Region[]` | One or more regions describing where probability mass should be concentrated. Regions are **additive**: their weighted kernels are summed before normalization. Can mix any combination of `PointRegion`, `RangeRegion`, and `SplineRegion`. |
| `K` | `number` | Number of outcome buckets (the vector will have `K + 1` elements). From `market.config.K`. |
| `L` | `number` | Lower bound of the outcome space. From `market.config.L`. |
| `H` | `number` | Upper bound of the outcome space. From `market.config.H`. |

**Where do K, L, H come from?** Every market has a `config` object with these values. You never hardcode them. Always destructure from the market:

```typescript
const { K, L, H } = market.config;
```

For example, a market asking "What will the temperature be?" might have `K = 100`, `L = 50`, `H = 120`, meaning 101 buckets spanning 50°F to 120°F.

**Return value:** A `BeliefVector` (`number[]`) of length `K + 1` where every element is ≥ 0 and the array sums to exactly 1. Each element represents the probability mass assigned to one outcome bucket. Element `[0]` corresponds to outcome `L`, element `[K]` corresponds to outcome `H`, with linear interpolation between.

##### Region Types

Regions are the building blocks. Each describes a shape of probability mass in outcome space.

**`PointRegion`** (Gaussian peak):

```typescript
interface PointRegion {
  type: 'point';
  center: number;    // Peak location in outcome space (e.g., 75 for 75°F)
  spread: number;    // Width of the bell curve in outcome-space units
  weight?: number;   // Relative weight when combining with other regions (default: 1)
  skew?: number;     // Asymmetry: -1 = wider left tail, +1 = wider right tail, 0 = symmetric
  inverted?: boolean; // true = dip shape (high at edges, low at center)
}
```

The kernel is a Gaussian: `exp(-0.5 * ((u - center) / spread)²)`. When `skew` is set, the effective spread differs on each side of center. A skew of `-1` makes the left tail ~3x wider and the right tail ~0.3x narrower. When `inverted: true`, the Gaussian is flipped: `max(1 - gaussian, 0.02)`, creating a "dip" with high probability everywhere *except* near center.

**`RangeRegion`** (Flat range):

```typescript
interface RangeRegion {
  type: 'range';
  low: number;       // Start of the range in outcome space
  high: number;      // End of the range in outcome space
  weight?: number;   // Relative weight (default: 1)
  sharpness?: number; // Edge transition: 0 = smooth cosine taper, 1 = hard cliff (default: 0)
}
```

Produces a flat-top shape: full probability within `[low, high]`, tapering to near-zero outside. At `sharpness: 0`, edges use a smooth cosine rolloff over 2 buckets. At `sharpness: 1`, edges are vertical cliffs.

**`SplineRegion`** (Arbitrary freeform curve):

```typescript
interface SplineRegion {
  type: 'spline';
  controlX: number[]; // X positions in outcome space [L..H], must be sorted ascending
  controlY: number[]; // Y values (unnormalized heights, e.g., [0, 10, 25, 10, 0])
  weight?: number;    // Relative weight (default: 1)
}
```

Uses Fritsch-Carlson monotonic cubic Hermite interpolation to produce a smooth, overshoot-free curve through the control points. Negative outputs are clamped to 0. This is what powers the `CustomShapeEditor` UI widget.

**`RangeInput`** (For multi-range `generateRange` overload):

```typescript
interface RangeInput {
  low: number;
  high: number;
  weight?: number;
  sharpness?: number;
}
```

Used by the `generateRange(ranges[], K, L, H)` overload to pass multiple range specifications. Each `RangeInput` becomes a `RangeRegion` internally.

##### How Composition Works

When you pass multiple regions, `generateBelief` processes each into a raw kernel array, scales by `weight`, sums them element-wise, then normalizes the combined array to sum to 1:

```
for each region:
    kernel = computeKernel(region, K, L, H)
    combined[k] += kernel[k] * region.weight

return normalize(combined)  // divide by sum → sums to 1 (if sum ≤ 0, returns uniform distribution)
```

Regions are **additive, not multiplicative**. Two peaks at different locations create a bimodal distribution. A peak with `weight: 2` gets twice the probability mass of a peak with `weight: 1` (before normalization).

##### Examples

**Single Gaussian, "I think the outcome will be around 75":**
```typescript
const { K, L, H } = market.config;

const belief = generateBelief([
  { type: 'point', center: 75, spread: 5 }
], K, L, H);
```

**Bimodal, "I think it'll be either 60 or 90, leaning toward 90":**
```typescript
const belief = generateBelief([
  { type: 'point', center: 60, spread: 4, weight: 0.3 },
  { type: 'point', center: 90, spread: 4, weight: 0.7 },
], K, L, H);
```

**Range, "I think it'll land somewhere between 70 and 85":**
```typescript
const belief = generateBelief([
  { type: 'range', low: 70, high: 85, sharpness: 0.5 }
], K, L, H);
```

**Non-contiguous ranges, "Either 50-60 or 80-90, but not the middle":**
```typescript
const belief = generateBelief([
  { type: 'range', low: 50, high: 60 },
  { type: 'range', low: 80, high: 90 },
], K, L, H);
```

**Skewed peak, "Around 75 but could be higher":**
```typescript
const belief = generateBelief([
  { type: 'point', center: 75, spread: 5, skew: 0.8 }
], K, L, H);
```

**Dip, "Anything but 75":**
```typescript
const belief = generateBelief([
  { type: 'point', center: 75, spread: 5, inverted: true }
], K, L, H);
```

**Custom shape, freeform from control points:**
```typescript
const belief = generateBelief([
  { type: 'spline', controlX: [50, 65, 75, 85, 100], controlY: [0, 10, 25, 10, 0] }
], K, L, H);
```

**Mixed, Gaussian peak + range floor:**
```typescript
const belief = generateBelief([
  { type: 'point', center: 80, spread: 3, weight: 2 },
  { type: 'range', low: 60, high: 100, weight: 0.5 },
], K, L, H);
```

##### How the Belief Flows into a Trade

The belief vector is the input to two critical operations:

**1. Preview.** Pass to `ctx.setPreviewBelief(belief)` for instant chart overlay, and to `previewPayoutCurve()` for potential payout visualization:
```typescript
ctx.setPreviewBelief(belief);  // shows dashed overlay on consensus chart

const payout = await previewPayoutCurve(client, marketId, belief, collateral);
// payout.outcomes[i] = { outcome, payout, profitLoss }
```

**2. Execution.** Pass to `buy()` to open a real position:
```typescript
const result = await buy(client, marketId, belief, collateral);
// result = { positionId, belief, claims, collateral }
```

##### Convenience Generators

All L2 generators are thin wrappers around `generateBelief`. Use them for common single-shape beliefs:

| Function | Equivalent `generateBelief` Call |
|---|---|
| `generateGaussian(center, spread, K, L, H)` | `generateBelief([{ type: 'point', center, spread }], K, L, H)` |
| `generateRange(low, high, K, L, H, sharpness?)` | `generateBelief([{ type: 'range', low, high, sharpness: sharpness ?? 0.5 }], K, L, H)` — note: defaults to `0.5`, not `0` |
| `generateRange(ranges: RangeInput[], K, L, H)` | `generateBelief(ranges.map(r => ({ type: 'range', ...r })), K, L, H)` — uses each range's own `sharpness` (defaults to `0` at kernel level) |
| `generateDip(center, spread, K, L, H)` | `generateBelief([{ type: 'point', center, spread: spread * 1.5, inverted: true }], K, L, H)` |
| `generateLeftSkew(center, spread, K, L, H, skewAmount?)` | `generateBelief([{ type: 'point', center, spread, skew: -skewAmount }], K, L, H)` — `skewAmount` defaults to `1` |
| `generateRightSkew(center, spread, K, L, H, skewAmount?)` | `generateBelief([{ type: 'point', center, spread, skew: skewAmount }], K, L, H)` — `skewAmount` defaults to `1` |
| `generateCustomShape(controlValues, K, L, H)` | `generateBelief([{ type: 'spline', controlX: [evenly spaced L..H], controlY: controlValues }], K, L, H)` |
| `generateBellShape(numPoints, peakPosition?, spread?, zeroTailPercent?)` | Not a belief. Generates raw Y-values for `CustomShapeEditor` initialization. Defaults: `peakPosition = 0.5`, `spread = 4`, `zeroTailPercent = 0.30`. |

#### Transactions

Transactions are the only functions in the SDK that mutate server state. Both require an authenticated `FSClient` (the client must have a valid token, which happens automatically when using `FunctionSpaceProvider` in the React layer, or manually via `loginUser` in core-only usage).

##### `buy(client, marketId, belief, collateral, options?)`

**Layer:** L1. Opens a new position by posting a belief vector and collateral amount to the market.

```typescript
async function buy(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  options?: { prediction?: number },
): Promise<BuyResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `FSClient` | Authenticated API client. In React, access via `useContext(FunctionSpaceContext).client` or use a trading widget that handles this internally. |
| `marketId` | `string \| number` | The market to trade in. |
| `belief` | `BeliefVector` | The probability distribution to trade on. Generated with `generateBelief` or any convenience generator. |
| `collateral` | `number` | Amount of currency to put up. Minimum is typically 1. |
| `options.prediction` | `number?` | Optional center-of-mass hint for the API. UI components pass the trader's target outcome value here. Not required for the trade to execute. |

**Returns `BuyResult`:**

```typescript
interface BuyResult {
  positionId: number;   // Unique ID for the new position
  belief: number[];     // The belief vector as stored server-side
  claims: number;       // Number of claim tokens minted
  collateral: number;   // Collateral amount locked
}
```

**Example (standalone core usage):**
```typescript
import { FSClient, loginUser, buy, generateGaussian, queryMarketState } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
await loginUser(client, 'user', 'pass');

const market = await queryMarketState(client, 42);
const { K, L, H } = market.config;
const belief = generateGaussian(75, 5, K, L, H);

const result = await buy(client, 42, belief, 100);
console.log(`Opened position ${result.positionId}, claims: ${result.claims}`);
```

**Example (inside a React component):**
```typescript
const ctx = useContext(FunctionSpaceContext);
const { market } = useMarket(marketId);
const { K, L, H } = market.config;

const belief = generateGaussian(75, 5, K, L, H);
const result = await buy(ctx.client, marketId, belief, 100, { prediction: 75 });

// After a successful buy, invalidate so other components (charts, position tables) refetch
ctx.invalidate(marketId);
```

**Error handling:**

`buy()` throws on failure. The error message varies by cause:

| Cause | Error message pattern |
|-------|-----------------------|
| Not authenticated (guest mode) | `"Authentication required. Please sign in to perform this action."` |
| HTTP error (e.g., 400, 500) | `"API error: {status} {statusText} on POST /api/market/buy"` |
| API-level failure (`success: false`) | `"API error: {message}"` (message from server response) |
| 401 (expired token) | Auto-retries once by re-authenticating. If retry fails, throws the HTTP error. |

Always wrap `buy()` in a try/catch. The SDK's trading UI widgets handle this internally — they catch errors, display them inline, and reset state.

##### `sell(client, positionId, marketId)`

**Layer:** L1. Closes an open position and returns collateral to the trader.

```typescript
async function sell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<SellResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `FSClient` | Authenticated API client. |
| `positionId` | `number` | The position to close. Get this from `queryMarketPositions` or from `BuyResult.positionId`. |
| `marketId` | `string \| number` | The market the position belongs to. |

**Returns `SellResult`:**

```typescript
interface SellResult {
  positionId: number;        // The closed position's ID
  collateralReturned: number; // Amount of currency returned to the trader
}
```

The returned collateral depends on the current market state. If the market consensus has shifted toward your belief since you bought, you'll get back more than you put in. If it shifted away, you'll get back less. Use `previewSell` to preview the return before executing.

**Example:**
```typescript
const result = await sell(ctx.client, position.positionId, marketId);
console.log(`Got back ${result.collateralReturned}`);

ctx.invalidate(marketId); // refresh charts and position tables
```

#### Previews

Previews are read-only API calls that preview what *would* happen without actually executing a trade. They're used by UI components in the "debounced preview" phase of the trade flow.

##### `previewPayoutCurve(client, marketId, belief, collateral, numOutcomes?)`

**Layer:** L2. Given a hypothetical belief and collateral, previews what the settlement payout would be for every possible outcome. This is how the SDK shows "if the market resolves at X, you'd get Y" curves.

```typescript
async function previewPayoutCurve(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  numOutcomes?: number,
): Promise<PayoutCurve>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `FSClient` | Authenticated API client. |
| `marketId` | `string \| number` | The market to preview against. |
| `belief` | `BeliefVector` | The belief vector to simulate. Same format as what you'd pass to `buy`. |
| `collateral` | `number` | The collateral amount to simulate. |
| `numOutcomes` | `number?` | Number of outcome points to sample. Defaults to server-side default if omitted. |

**Returns `PayoutCurve`:**

```typescript
interface PayoutCurve {
  previews: Array<{
    outcome: number;     // A possible settlement value
    payout: number;      // What you'd receive if the market resolved here
    profitLoss: number;  // payout - collateral (positive = profit, negative = loss)
  }>;
  maxPayout: number;         // Best-case payout across all outcomes
  maxPayoutOutcome: number;  // The outcome value that produces the best payout
  inputCollateral: number;   // Echo of the collateral you passed in
}
```

**How UI components use this:** Every trade panel calls `previewPayoutCurve` on a 500ms debounce after the trader adjusts any input (prediction slider, confidence, collateral amount). The result is written to `ctx.setPreviewPayout(result)`, which the `ConsensusChart` reads to render a payout overlay in its tooltip.

**Example:**
```typescript
const belief = generateGaussian(75, 5, K, L, H);
const curve = await previewPayoutCurve(ctx.client, marketId, belief, 100);

console.log(`Best case: $${curve.maxPayout} if outcome = ${curve.maxPayoutOutcome}`);
console.log(`Worst case: $${Math.min(...curve.previews.map(p => p.payout))}`);

// Write to context so the chart renders the payout overlay
ctx.setPreviewPayout(curve);
```

##### `previewSell(client, positionId, marketId)`

**Layer:** L1. Previews how much collateral would be returned if a position were sold right now, without actually selling it. Used by `PositionTable` to show live "market value" for each open position.

```typescript
async function previewSell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<PreviewSellResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `FSClient` | Authenticated API client. |
| `positionId` | `number` | The position to simulate selling. |
| `marketId` | `string \| number` | The market the position belongs to. |

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

#### Shape Definitions

| Export | Type | Description |
|--------|------|-------------|
| `SHAPE_DEFINITIONS` | `ShapeDefinition[]` | Registry of all 8 named belief shapes with metadata (id, name, description, parameter list, SVG icon path). Used by UI shape pickers. |
| `ShapeDefinition` | Interface | `{ id: ShapeId; name: string; description: string; parameters: ('targetOutcome' \| 'confidence' \| 'rangeValues' \| 'peakBias' \| 'skewAmount')[]; svgPath: string }` |
| `ShapeId` | Type | `'gaussian' \| 'spike' \| 'range' \| 'bimodal' \| 'dip' \| 'leftskew' \| 'rightskew' \| 'uniform'` |

### Positions

Functions for fetching, transforming, and displaying position data. Positions are created by `buy()` and closed by `sell()`. These query functions are read-only.

##### `queryMarketPositions(client, marketId)`

**Layer:** L1. Fetches all positions for a given market. This is the primary way to get position data and is the underlying call used by `queryPositionState` and `queryTradeHistory`.

```typescript
async function queryMarketPositions(
  client: FSClient,
  marketId: string | number,
): Promise<Position[]>
```

**Returns `Position[]`:**

```typescript
interface Position {
  positionId: number;
  belief: number[];                              // The belief vector that was traded
  collateral: number;                            // Amount of currency locked
  claims: number;                                // Claim tokens minted
  owner: string;                                 // Username of the position holder
  status: 'open' | 'sold' | 'settled' | 'closed';
  prediction: number;                            // Center-of-mass hint from the trade
  stdDev: number;                                // Standard deviation of the belief
  createdAt: string;                             // ISO 8601 timestamp
  closedAt: string | null;                       // When the position was closed (null if open)
  soldPrice: number | null;                      // Collateral returned on sell (null if not sold)
  settlementPayout: number | null;               // Payout at market resolution (null if unresolved)
}
```

**Example:**
```typescript
const positions = await queryMarketPositions(ctx.client, marketId);
const openPositions = positions.filter(p => p.status === 'open');
const totalCollateralLocked = openPositions.reduce((sum, p) => sum + p.collateral, 0);
```

##### `queryPositionState(client, positionId, marketId)`

**Layer:** L1. Fetches a single position by ID. Internally calls `queryMarketPositions` and filters. Throws if the position is not found.

```typescript
async function queryPositionState(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<Position>
```

Returns the same `Position` type documented above. Throws `Error(`Position ${positionId} not found in market ${marketId}`)` if no match is found.

**Example:**
```typescript
// After opening a position, fetch its current state
const result = await buy(ctx.client, marketId, belief, 100);
const position = await queryPositionState(ctx.client, result.positionId, marketId);
console.log(position.status);     // "open"
console.log(position.claims);     // number of claim tokens minted
```

**Note:** If you already have the full positions list, filter it yourself rather than calling this (it makes a full API round-trip each time).

##### `mapPosition(raw)`

**Layer:** L0. Pure transform with no network call. Converts a raw API response object (snake_case fields) into a typed `Position` (camelCase fields). Used internally by `queryMarketPositions`. Useful if you're calling the API directly or processing webhook/websocket payloads outside the SDK's query functions.

```typescript
function mapPosition(raw: any): Position
```

**Field mapping:**

| API field (snake_case) | Position field (camelCase) |
|---|---|
| `position_id` | `positionId` |
| `belief_p` | `belief` |
| `input_collateral_C` | `collateral` |
| `minted_claims_m` | `claims` |
| `username` | `owner` |
| `status` | `status` |
| `prediction` | `prediction` |
| `std_dev` | `stdDev` |
| `created_at` | `createdAt` |
| `position_closed_at` | `closedAt` (null if missing) |
| `sold_price` | `soldPrice` (null if missing) |
| `settlement_payout` | `settlementPayout` (null if missing) |

**Example:**
```typescript
// If you're calling the API directly (e.g., from a non-SDK HTTP client)
const response = await fetch(`${baseUrl}/api/market/positions?market_id=42`);
const data = await response.json();
const positions: Position[] = data.positions.map(mapPosition);
```

##### `positionsToTradeEntries(positions, options?)`

**Layer:** L0. Pure transform. Converts an array of positions into a flat list of trade entries for display in a trade history table. For each position, creates a "buy" entry. If the position has been sold (`soldPrice !== null`), also creates a "sell" entry. Results are sorted by timestamp descending. Applies fallbacks for missing data: `prediction ?? null`, `collateral ?? 0`, `owner ?? 'Unknown'`, and `'--'` for null/invalid timestamps.

```typescript
function positionsToTradeEntries(
  positions: Position[],
  options?: { limit?: number },  // default: 100
): TradeEntry[]
```

**Returns `TradeEntry[]`:**

```typescript
interface TradeEntry {
  id: string;              // "{positionId}_open" or "{positionId}_close"
  timestamp: string;       // Formatted as "YYYY-MM-DD HH:mm:ss" (ISO-derived, 24-hour)
  side: 'buy' | 'sell';
  prediction: number | null;
  amount: number;          // Collateral (buy) or sold price (sell)
  username: string;
  positionId: string;
}
```

**Example:**
```typescript
const positions = await queryMarketPositions(ctx.client, marketId);
const entries = positionsToTradeEntries(positions, { limit: 20 });
// entries[0] = { id: "45_close", side: "sell", amount: 115.3, timestamp: "2025-06-15 10:23:45", ... }
// entries[1] = { id: "45_open",  side: "buy",  amount: 100,   timestamp: "2025-06-14 08:12:00", ... }
```

**Note:** This is a workaround while no dedicated trades API endpoint exists. When `/market/trades` becomes available, `queryTradeHistory` will switch to it without changing its signature.

##### `queryTradeHistory(client, marketId, options?)`

**Layer:** L1. Convenience function that composes `queryMarketPositions` + `positionsToTradeEntries` into a single call. Returns the same `TradeEntry[]` type documented above.

```typescript
async function queryTradeHistory(
  client: FSClient,
  marketId: string | number,
  options?: { limit?: number },
): Promise<TradeEntry[]>
```

**Example:**
```typescript
const trades = await queryTradeHistory(ctx.client, marketId, { limit: 50 });
// trades = [{ id: "12_open", side: "buy", amount: 100, ... }, { id: "12_close", side: "sell", amount: 115, ... }, ...]
```

### Markets

Functions for discovering markets, fetching market state, and reading consensus data. `queryMarketState` is the foundational call. The others build on top of it by running client-side math on the returned consensus vector.

##### `discoverMarkets(client)`

**Layer:** L1. Lists all available markets. Returns the same `MarketState` shape as `queryMarketState`, but for every market. Does not require authentication (works in guest mode).

```typescript
async function discoverMarkets(client: FSClient): Promise<MarketState[]>
```

**Example:**
```typescript
const markets = await discoverMarkets(client);
const openMarkets = markets.filter(m => m.resolutionState === 'open');
console.log(`${openMarkets.length} markets open for trading`);
```

**Note:** The `MarketState.resolutionState` type includes `'voided'` but the current API mapping only produces `'open'` or `'resolved'`. The `'voided'` variant is reserved for future use.

##### `queryMarketState(client, marketId)`

**Layer:** L1. Fetches the complete state of a single market. This is the most important market function. It returns the alpha vector, the derived consensus distribution, market config (`K`, `L`, `H`, and AMM parameters), metadata (title, units, decimals), and resolution status.

```typescript
async function queryMarketState(
  client: FSClient,
  marketId: string | number,
): Promise<MarketState>
```

**Returns `MarketState`:**

```typescript
interface MarketState {
  alpha: number[];            // Raw alpha vector from the AMM
  consensus: number[];        // Normalized probability distribution (alpha / sum(alpha))
  totalMass: number;          // Sum of alpha vector
  poolBalance: number;        // Current collateral pool
  participantCount: number;   // Total positions ever created
  totalVolume: number;        // Total collateral traded
  positionsOpen: number;      // Currently open positions
  config: MarketConfig;       // { K, L, H, P0, mu, epsAlpha, tau, gamma, lambdaS, lambdaD }
  title: string;              // Market question text
  xAxisUnits: string;         // Unit label for outcome axis (e.g., "°F", "USD")
  decimals: number;           // Display precision for outcome values
  resolutionState: 'open' | 'resolved' | 'voided';
  resolvedOutcome: number | null;  // Settlement value (null if unresolved)
}
```

The `config` object contains the parameters you need for building beliefs (`K`, `L`, `H`) and the AMM parameters that govern market behavior:

| Config Field | Description |
|---|---|
| `K` | Number of outcome buckets. Belief vectors have length `K + 1`. |
| `L` | Lower bound of outcome space. |
| `H` | Upper bound of outcome space. |
| `P0` | Initial pool size. |
| `mu` | AMM sensitivity parameter. |
| `epsAlpha` | Minimum alpha per bucket (prevents zero probability). |
| `tau` | Fee parameter for trades. |
| `gamma` | Market maker spread parameter. |
| `lambdaS` | Sell-side liquidity parameter. |
| `lambdaD` | Deposit-side liquidity parameter. |

**Example:**
```typescript
const market = await queryMarketState(ctx.client, 42);

console.log(market.title);                    // "What will the high temperature be on Jan 1?"
console.log(market.xAxisUnits);               // "°F"
console.log(market.config.L, market.config.H); // 30, 110
console.log(market.resolutionState);           // "open"

// The consensus vector is what charts render
const peakBucket = market.consensus.indexOf(Math.max(...market.consensus));
const peakOutcome = market.config.L + (peakBucket / market.config.K) * (market.config.H - market.config.L);
console.log(`Market mode: ~${peakOutcome}°F`);
```

##### `getConsensusCurve(client, marketId, numPoints?)`

**Layer:** L1. Fetches market state, then evaluates the consensus PDF into chart-ready `{ x, y }[]` points using `evaluateDensityCurve`. This is a convenience wrapper. If you already have the market state, call `evaluateDensityCurve(market.consensus, L, H)` directly instead of making another API round-trip.

```typescript
async function getConsensusCurve(
  client: FSClient,
  marketId: string | number,
  numPoints?: number,  // default: 200
): Promise<ConsensusCurve>
```

**Returns `ConsensusCurve`:**

```typescript
interface ConsensusCurve {
  points: Array<{ x: number; y: number }>;  // x = outcome value, y = probability density
  config: MarketConfig;                      // The market's config for reference
}
```

**Example:**
```typescript
const curve = await getConsensusCurve(ctx.client, marketId, 200);
// curve.points = [{ x: 50, y: 0.001 }, { x: 50.35, y: 0.003 }, ...]
// Pass directly to a Recharts <Line> or to calculateBucketDistribution
const buckets = calculateBucketDistribution(curve.points, curve.config.L, curve.config.H, 12);
```

##### `queryConsensusSummary(client, marketId)`

**Layer:** L1. Returns summary statistics of the consensus distribution: mean, median, mode, variance, and standard deviation. Computed client-side from the consensus coefficients via `computeStatistics`.

```typescript
async function queryConsensusSummary(
  client: FSClient,
  marketId: string | number,
): Promise<ConsensusSummary>
```

**Returns `ConsensusSummary`:**

```typescript
interface ConsensusSummary {
  mean: number;      // Expected value
  median: number;    // 50th percentile
  mode: number;      // Most likely outcome
  variance: number;  // Spread of the distribution
  stdDev: number;    // Square root of variance
}
```

**Example:**
```typescript
const summary = await queryConsensusSummary(ctx.client, marketId);
console.log(`Expected: ${summary.mean.toFixed(1)}${market.xAxisUnits}`);
console.log(`Most likely: ${summary.mode.toFixed(1)}${market.xAxisUnits}`);
console.log(`Spread: +/-${summary.stdDev.toFixed(1)}`);
```

##### `queryDensityAt(client, marketId, x)`

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

##### `queryMarketHistory(client, marketId, limit?, offset?)`

**Layer:** L1. Fetches time-series snapshots of the market's alpha vector. Each snapshot records the state after a trade. Used to power timeline/fan charts that show how the consensus distribution has evolved over time.

```typescript
async function queryMarketHistory(
  client: FSClient,
  marketId: string | number,
  limit?: number,
  offset?: number,
): Promise<MarketHistory>
```

**Returns `MarketHistory`:**

```typescript
interface MarketHistory {
  marketId: number;
  totalSnapshots: number;      // Total available (for pagination)
  snapshots: MarketSnapshot[]; // Ordered by time
}

interface MarketSnapshot {
  snapshotId: number;
  tradeId: number;
  side: 'buy' | 'sell';
  positionId: string;
  alphaVector: number[];       // Full alpha vector at this point in time
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  currentPool: number;
  numOpenPositions: number;
  createdAt: string;           // ISO 8601
}
```

**Example:**
```typescript
const history = await queryMarketHistory(ctx.client, marketId, 100);
// Pass to transformHistoryToFanChart() from the math utilities to get chart-ready data
const fanData = transformHistoryToFanChart(history.snapshots, L, H);
```

### Math & Utilities

Pure math functions with no network dependency. All are L0 (Pure Math) unless noted. These operate on coefficient vectors (belief vectors, consensus vectors, alpha vectors) and return computed results. They have no awareness of markets, clients, or React.

The `coefficients` parameter in these functions accepts any normalized probability vector, meaning you can pass `market.consensus`, a belief vector from `generateBelief`, or `position.belief`. They all share the same shape: a `number[]` of length `K + 1` summing to 1.

#### Density Evaluation

##### `evaluateDensityCurve(coefficients, L, H, numPoints?)`

**Layer:** L0. Evaluates a coefficient vector as a continuous probability density function across the full outcome range, returning chart-ready `{ x, y }[]` points. Uses piecewise-linear interpolation between adjacent coefficients, scaled by `(K+1)/(H-L)` to produce a proper PDF (integrates to 1).

```typescript
function evaluateDensityCurve(
  coefficients: number[],
  L: number,
  H: number,
  numPoints?: number,  // default: 200
): Array<{ x: number; y: number }>
```

This is the function that turns raw probability vectors into renderable curves. `ConsensusChart` uses it directly for the preview belief overlay and selected position overlay. For the main consensus line, `ConsensusChart` calls `useConsensus` which internally uses `getConsensusCurve` (which delegates to `evaluateDensityCurve`).

**Example:**
```typescript
// Render the market consensus as a chart curve
const { consensus, config: { L, H } } = market;
const curvePoints = evaluateDensityCurve(consensus, L, H, 200);
// curvePoints = [{ x: 50, y: 0.001 }, { x: 50.35, y: 0.003 }, ..., { x: 120, y: 0.0 }]

// Render a belief preview with the same resolution
const belief = generateGaussian(75, 5, K, L, H);
const beliefCurve = evaluateDensityCurve(belief, L, H, curvePoints.length);
```

##### `evaluateDensityPiecewise(coefficients, x, L, H)`

**Layer:** L0. Evaluates the density PDF at a single point `x`. Same interpolation logic as `evaluateDensityCurve`, but for one value. Used internally by `computeStatistics` and `computePercentiles` for numerical integration. Also useful for tooltip readouts.

```typescript
function evaluateDensityPiecewise(
  coefficients: number[],
  x: number,
  L: number,
  H: number,
): number  // probability density at x
```

Values outside `[L, H]` are clamped to the edge coefficients. The return value is a density (can be > 1), not a probability. To get the probability of a range, integrate the density over that range (or use `calculateBucketDistribution`).

**Example:**
```typescript
// Show the density value at a specific outcome (e.g., for a tooltip)
const density = evaluateDensityPiecewise(market.consensus, 75, L, H);
console.log(`Density at 75: ${density.toFixed(4)}`);

// Compare density of your belief vs consensus at the same point
const beliefDensity = evaluateDensityPiecewise(belief, 75, L, H);
console.log(`Your belief is ${(beliefDensity / density).toFixed(1)}x the consensus at 75`);
```

#### Statistical Analysis

##### `computeStatistics(coefficients, L, H)`

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

##### `computePercentiles(coefficients, L, H)`

**Layer:** L0. Computes 9 percentile values by walking a 500-point CDF integration from `L` to `H` and recording the outcome value when each cumulative threshold is crossed.

```typescript
function computePercentiles(
  coefficients: number[],
  L: number,
  H: number,
): PercentileSet
```

**Returns `PercentileSet`:**

```typescript
interface PercentileSet {
  p2_5: number;    // 2.5th percentile
  p12_5: number;   // 12.5th percentile
  p25: number;     // 25th percentile (Q1)
  p37_5: number;   // 37.5th percentile
  p50: number;     // 50th percentile (median)
  p62_5: number;   // 62.5th percentile
  p75: number;     // 75th percentile (Q3)
  p87_5: number;   // 87.5th percentile
  p97_5: number;   // 97.5th percentile
}
```

These 9 percentiles define the bands of the fan chart. The 2.5th-97.5th range covers the 95% confidence interval; the 25th-75th covers the interquartile range.

**Example:**
```typescript
const pct = computePercentiles(market.consensus, L, H);
console.log(`95% confidence: ${pct.p2_5.toFixed(1)} to ${pct.p97_5.toFixed(1)}`);
console.log(`IQR: ${pct.p25.toFixed(1)} to ${pct.p75.toFixed(1)}`);
console.log(`Median: ${pct.p50.toFixed(1)}`);
```

#### Distribution Bucketing

##### `calculateBucketDistribution(points, L, H, numBuckets?, decimals?)`

**Layer:** L0. Integrates a density curve into equal-width histogram buckets using trapezoidal integration with linear interpolation at bucket boundaries. This is how continuous PDF curves get turned into the discrete bar charts used by `DistributionChart` and `BucketRangeSelector`.

```typescript
function calculateBucketDistribution(
  points: Array<{ x: number; y: number }>,  // from evaluateDensityCurve or ConsensusCurve.points
  L: number,
  H: number,
  numBuckets?: number,   // default: 12, clamped to [1, 200]
  decimals?: number,     // default: 0 (for range label formatting)
): BucketData[]
```

**Note:** The `points` parameter takes `{ x, y }[]` density curve points, not a raw coefficient vector. Call `evaluateDensityCurve` first if you have coefficients.

**Returns `BucketData[]`:**

```typescript
interface BucketData {
  range: string;       // Formatted label, e.g., "70-75" or "70.5-75.5"
  min: number;         // Bucket lower bound
  max: number;         // Bucket upper bound
  probability: number; // Integrated probability mass (0 to 1)
  percentage: number;  // probability * 100
}
```

**Example:**
```typescript
const curve = evaluateDensityCurve(market.consensus, L, H, 200);
const buckets = calculateBucketDistribution(curve, L, H, 12);

// buckets = [
//   { range: "50-56", min: 50, max: 56, probability: 0.02, percentage: 2.0 },
//   { range: "56-62", min: 56, max: 62, probability: 0.08, percentage: 8.0 },
//   ...
// ]
```

#### Fan Chart Transform

##### `transformHistoryToFanChart(snapshots, L, H, maxPoints?)`

**Layer:** L0. Transforms raw `MarketSnapshot[]` (from `queryMarketHistory`) into chart-ready `FanChartPoint[]` for rendering timeline/fan charts. For each snapshot, it normalizes the alpha vector to a consensus, then computes statistics and all 9 percentile bands. Automatically downsamples to `maxPoints` using evenly-spaced index sampling (preserving first and last) if the input is too large. Filters out snapshots with invalid alpha vectors (all zeros).

```typescript
function transformHistoryToFanChart(
  snapshots: MarketSnapshot[],
  L: number,
  H: number,
  maxPoints?: number,  // default: 200
): FanChartPoint[]
```

**Returns `FanChartPoint[]`:**

```typescript
interface FanChartPoint {
  timestamp: number;          // Epoch milliseconds (for x-axis)
  createdAt: string;          // Original ISO 8601 string
  tradeId: number;            // The trade that produced this snapshot
  mean: number;               // Consensus mean at this point in time
  mode: number;               // Consensus mode
  stdDev: number;             // Consensus standard deviation
  percentiles: PercentileSet; // All 9 percentile bands
}
```

**Example:**
```typescript
const history = await queryMarketHistory(ctx.client, marketId, 500);
const fanData = transformHistoryToFanChart(history.snapshots, L, H, 200);

// fanData[0].percentiles.p25 = lower quartile at the first snapshot
// fanData[0].percentiles.p75 = upper quartile at the first snapshot
// The TimelineChart renders nested area bands from p2_5..p97_5
```

#### Chart Zoom Math

Pure geometry functions for implementing zoom and pan on Recharts charts. These are protocol-agnostic (no awareness of markets or charting libraries) and are consumed by the `useChartZoom` hook in the React layer.

##### `pixelToDataX(clientX, plotAreaLeft, plotAreaRight, xDomain)`

**Layer:** L0. Converts a pixel X coordinate (from a mouse event) to a data-space X value via linear interpolation. Clamps to `[0, 1]` ratio so positions outside the plot area map to domain edges. Returns `xDomain[0]` when plot width is ≤ 0.

```typescript
function pixelToDataX(
  clientX: number,
  plotAreaLeft: number,
  plotAreaRight: number,
  xDomain: [number, number],
): number
```

##### `computeZoomedDomain(params)`

**Layer:** L0. Computes a new X domain after a scroll-wheel zoom event. Zoom is cursor-anchored: the data value under the cursor stays fixed while the domain contracts or expands around it. Returns `null` when the zoomed range reaches >= 99% of the full range (reset threshold, to avoid near-full-range jitter).

```typescript
function computeZoomedDomain(params: ZoomParams): [number, number] | null

interface ZoomParams {
  currentDomain: [number, number];
  fullDomain: [number, number];
  cursorDataX: number;
  direction: 1 | -1;       // 1 = zoom out, -1 = zoom in
  zoomFactor?: number;      // default: 0.15
  maxZoomFactor?: number;   // default: 50 (max zoom = fullRange / 50)
}
```

##### `computePannedDomain(params)`

**Layer:** L0. Computes a new X domain after a drag-to-pan gesture. The domain range is preserved (only the position shifts). Dragging right shifts the view left in data space. Clamped to the full domain boundaries.

```typescript
function computePannedDomain(params: PanParams): [number, number]

interface PanParams {
  startDomain: [number, number];
  fullDomain: [number, number];
  pixelDelta: number;
  plotAreaWidth: number;
}
```

##### `filterVisibleData(data, xKey, domain)`

**Layer:** L0. Filters a data array to items whose `xKey` value falls within the given domain (inclusive). Generic over any object type.

```typescript
function filterVisibleData<T>(
  data: T[],
  xKey: keyof T & string,
  domain: [number, number],
): T[]
```

##### `generateEvenTicks(domain, count)`

**Layer:** L0. Generates exactly `count` evenly-spaced tick values from `domain[0]` to `domain[1]`. Used for axis tick rendering when the default Recharts ticks don't align well with the zoomed domain. Edge cases: returns `[]` when `count < 1`, returns `[midpoint]` when `count === 1`.

```typescript
function generateEvenTicks(
  domain: [number, number],
  count: number,
): number[]
```

### Client

`FSClient` is the HTTP client that every query, transaction, and preview function accepts as its first argument. It manages authentication tokens, auto-retries on 401, and supports guest mode for read-only access.

##### `FSClient`

```typescript
class FSClient {
  constructor(config: FSConfig)

  get base(): string               // The base URL
  get isAuthenticated(): boolean    // Whether a token is set

  setToken(token: string): void     // Manually set a Bearer token
  clearToken(): void                // Remove the current token
  authenticate(): Promise<void>     // Login using the credentials from config

  get<T>(path: string, params?: Record<string, string>): Promise<T>
  post<T>(path: string, body?: unknown, params?: Record<string, string>): Promise<T>
}
```

**Constructor config `FSConfig`:**

```typescript
interface FSConfig {
  baseUrl: string;            // API base URL (e.g., "https://api.example.com")
  username?: string;          // Credentials for auto-authentication
  password?: string;          // Credentials for auto-authentication
  autoAuthenticate?: boolean; // Reserved for future use
}
```

**Authentication behavior:**

- **With credentials** (`username` + `password` provided): The client auto-authenticates on the first API call that requires a token. If a 401 is received, it clears the token, re-authenticates, and retries the request once.
- **Guest mode** (no credentials): GET requests go through with an `X-Username: guest` header. POST/mutation requests throw `"Authentication required. Please sign in to perform this action."`.
- **Manual token**: Call `setToken(token)` if you obtain a token through your own auth flow (e.g., from `loginUser`).

**Example (standalone usage):**
```typescript
import { FSClient, loginUser, queryMarketState } from '@functionspace/core';

// Option 1: Auto-auth via credentials
const client = new FSClient({
  baseUrl: 'https://api.example.com',
  username: 'trader1',
  password: 'secret',
});
// First API call triggers automatic login
const market = await queryMarketState(client, 42);

// Option 2: Manual token management
const guest = new FSClient({ baseUrl: 'https://api.example.com' });
const { token } = await loginUser(guest, 'trader1', 'secret');
guest.setToken(token);
// Now guest is authenticated for mutations
```

**In React:** You don't create `FSClient` directly. `FunctionSpaceProvider` creates and manages it. Access it via `useContext(FunctionSpaceContext).client`, or use hooks and trading widgets that access the client internally.

### Auth

Authentication functions for login, signup, and user profile retrieval. These use raw `fetch()` internally (bypassing the client's `ensureAuth`) because auth endpoints are the one case where you POST without a token.

In the React layer, `FunctionSpaceProvider` wraps these into `login()`, `signup()`, and `logout()` callbacks on the context, managing token lifecycle automatically. The core auth functions below are for standalone (non-React) usage.

##### `loginUser(client, username, password)`

**Layer:** L1. Authenticates a user against the API. Returns the user profile and a session token. The token is not automatically set on the client; you must call `client.setToken(token)` yourself (or use the React Provider which handles this).

```typescript
async function loginUser(
  client: FSClient,
  username: string,
  password: string,
): Promise<{ user: UserProfile; token: string }>
```

**Returns `{ user: UserProfile, token: string }`:**

```typescript
interface UserProfile {
  userId: number;
  username: string;
  walletValue: number;                     // Current wallet balance
  role: 'trader' | 'creator' | 'admin';
}
```

Throws on failure with the server's error detail message, or `"Login failed: invalid response"` if the response shape is unexpected.

**Example:**
```typescript
import { FSClient, loginUser } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
const { user, token } = await loginUser(client, 'trader1', 'secret');
client.setToken(token);

console.log(`Logged in as ${user.username} (${user.role}), wallet: $${user.walletValue}`);
```

##### `signupUser(client, username, password, options?)`

**Layer:** L1. Registers a new user. Returns the user profile but no token. You must call `loginUser` after signup to obtain a session.

```typescript
async function signupUser(
  client: FSClient,
  username: string,
  password: string,
  options?: SignupOptions,
): Promise<{ user: UserProfile }>
```

**Options:**

```typescript
interface SignupOptions {
  accessCode?: string;  // Invite/access code if the server requires one
}
```

Throws on failure with the server's error detail message, or `"Signup failed: no user in response"` if the response is malformed.

**Example:**
```typescript
const { user } = await signupUser(client, 'newtrader', 'password123', {
  accessCode: 'INVITE-CODE',
});
// No token yet, must login
const { token } = await loginUser(client, 'newtrader', 'password123');
client.setToken(token);
```

##### `fetchCurrentUser(client)`

**Layer:** L1. Fetches the profile of the currently authenticated user. Routes through `client.get()` which includes the Bearer token. Requires the client to be authenticated (will trigger auto-auth if credentials are configured).

```typescript
async function fetchCurrentUser(client: FSClient): Promise<UserProfile>
```

Returns the same `UserProfile` type documented above. Handles both nested (`{ user: {...} }`) and flat (`{ user_id, ... }`) API response shapes.

**Example:**
```typescript
const profile = await fetchCurrentUser(client);
console.log(`Wallet balance: $${profile.walletValue}`);
```

##### `passwordlessLoginUser(client, username)`

**Layer:** L1. Passwordless login with auto-signup. Tries login with username only. If the user doesn't exist, auto-creates an account. Throws with `code: PASSWORD_REQUIRED` for password-protected accounts.

```typescript
function passwordlessLoginUser(
  client: FSClient,
  username: string,
): Promise<PasswordlessLoginResult>
// Returns: { action: 'login' | 'signup', user: UserProfile, token: string }
```

**Error handling:**
- Account requires password: throws `Error` with `code: 'PASSWORD_REQUIRED'`
- User doesn't exist: auto-creates account and returns `action: 'signup'`
- Other errors: throws with server error message

**Example:**
```typescript
import { FSClient, passwordlessLoginUser, PASSWORD_REQUIRED } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
try {
  const result = await passwordlessLoginUser(client, 'username');
  client.setToken(result.token);
  console.log(`${result.action}: ${result.user.username}`);
} catch (err) {
  if (err instanceof Error && 'code' in err && (err as any).code === PASSWORD_REQUIRED) {
    // Prompt for password
  }
}
```

##### `silentReAuth(client, username)`

**Layer:** L1. Re-authenticate a returning user by username. Used internally by the provider when `storedUsername` is provided. Throws `PASSWORD_REQUIRED` for password-protected accounts.

```typescript
function silentReAuth(
  client: FSClient,
  username: string,
): Promise<{ user: UserProfile; token: string }>
```

##### `validateUsername(name)`

**Layer:** L0. Client-side username validation. No network call. Use this to validate input before calling `signupUser` to avoid unnecessary API round-trips.

```typescript
function validateUsername(name: string): { valid: boolean; error?: string }
```

**Rules:**
- Minimum 3 characters
- Maximum 32 characters
- Only letters, numbers, dots (`.`), dashes (`-`), and underscores (`_`)
- Input is trimmed before validation

**Example:**
```typescript
const result = validateUsername('ab');
// { valid: false, error: "Username must be at least 3 characters" }

const result2 = validateUsername('trader_1');
// { valid: true }

// Use before signup
const check = validateUsername(usernameInput);
if (!check.valid) {
  setError(check.error);
  return;
}
await signupUser(client, usernameInput, password);
```

### Settlement

> **Coming Soon.** Settlement functions (resolving markets, computing payouts against resolved outcomes) are not yet available in the SDK. The `Position` type includes `settlementPayout` and `resolvedOutcome` fields in anticipation of this functionality.

---

## React

`@functionspace/react` provides React hooks, a Provider component, and a theme system that wraps `@functionspace/core` into an idiomatic React API. Requires `@functionspace/core` as a peer dependency.

All hooks must be called within a `FunctionSpaceProvider`. Every data-fetching hook shares a common return shape (`loading`, `error`, `refetch`) and automatically re-fetches when `ctx.invalidate(marketId)` is called after trades.

### Provider & Context

#### `FunctionSpaceProvider`

Root component that initializes the SDK for a React tree. Creates an `FSClient`, manages authentication state, resolves theme tokens, injects 30 CSS custom properties onto a wrapper `<div>`, provides resolved `ChartColors` for Recharts rendering, and exposes shared context (preview state, invalidation, auth) to all descendant hooks and components.

All hooks in `@functionspace/react` require a `FunctionSpaceProvider` ancestor. Calling any hook outside this provider throws an error.

```tsx
<FunctionSpaceProvider
  config={{
    baseUrl: string;
    username?: string;
    password?: string;
    autoAuthenticate?: boolean;
  }}
  theme?: FSThemeInput
>
  {children}
</FunctionSpaceProvider>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `config.baseUrl` | `string` | API base URL (e.g., `"https://api.example.com"`) |
| `config.username` | `string?` | Username for auto-authentication on mount |
| `config.password` | `string?` | Password for auto-authentication on mount |
| `config.autoAuthenticate` | `boolean?` | Controls auto-login behavior. Auto-auth fires when this is not explicitly `false` AND both `username` and `password` are truthy. Set to `false` to suppress auto-auth even when credentials are present. |
| `theme` | `FSThemeInput?` | Preset name (`"fs-dark"`, `"fs-light"`, `"native-dark"`, `"native-light"`), partial theme object with optional `preset` base, or full `FSTheme`. Defaults to `"fs-dark"`. See Theme System. |
| `storedUsername` | `string \| null?` | Previously authenticated username for silent re-auth on mount. When provided, the provider attempts `silentReAuth` in the background. |
| `children` | `ReactNode` | Child component tree |

**Auth modes:**

1. **Auto-auth mode** (`username` + `password` provided, `autoAuthenticate` not `false`): Calls `loginUser(client, username, password)` on mount. Renders an "Authenticating..." placeholder until the request completes. On success, sets the token on the client and stores the `UserProfile`. On failure, stores the error on `authError` but still renders children, allowing guest-mode browsing. Does not increment `invalidationCount`.

2. **Interactive mode** (no credentials, or `autoAuthenticate: false`): Renders children immediately in guest mode (read-only market browsing). The application authenticates later by calling `login()` or `signup()` from `useAuth()`.

3. **Guest mode** (no credentials, no intent to authenticate): Identical to interactive mode at the Provider level. All data hooks work (market data, consensus, distributions), but mutation operations require authentication.

4. **Passwordless mode** (`storedUsername` prop provided, no credentials): Renders children immediately, then attempts `silentReAuth(client, storedUsername)` in the background. On success, sets the token and user. If the account requires a password (`PASSWORD_REQUIRED`), sets `showAdminLogin: true` and `pendingAdminUsername` so the `PasswordlessAuthWidget` can prompt for credentials. On other errors, clears the stored username.

The exact auto-auth condition: `config.autoAuthenticate !== false && !!config.username && !!config.password`.

**Context fields (`FSContext`):**

*Auth:*

| Field | Type | Description |
|-------|------|-------------|
| `client` | `FSClient` | Shared API client instance, pre-configured with `baseUrl`. Token is set automatically after successful auth. |
| `user` | `UserProfile \| null` | Authenticated user profile, or `null` in guest mode |
| `isAuthenticated` | `boolean` | `true` when `user` is not `null` |
| `authLoading` | `boolean` | `true` during in-progress `login` or `signup` calls |
| `authError` | `Error \| null` | Most recent auth error. Cleared at the start of each `login()`, `signup()`, or `logout()` call. |
| `login` | `(username: string, password: string) => Promise<UserProfile>` | Authenticates, sets token on client, stores user, increments `invalidationCount`. Throws on failure. |
| `signup` | `(username: string, password: string, options?: SignupOptions) => Promise<UserProfile>` | Registers via `signupUser`, then calls `loginUser` (signup returns no token). Stores user, increments `invalidationCount`. Throws on failure. |
| `logout` | `() => void` | Clears token, user, `authError`, all preview state, and `selectedPosition`. Increments `invalidationCount`. |
| `refreshUser` | `() => Promise<void>` | Re-fetches the current user profile (e.g., wallet balance after trades). No-ops silently if `client.isAuthenticated` is `false`. |
| `passwordlessLogin` | `(username: string) => Promise<PasswordlessLoginResult>` | Passwordless login/auto-signup. Sets token, stores username, updates user. Throws with `code: PASSWORD_REQUIRED` for password-protected accounts. |
| `showAdminLogin` | `boolean` | `true` when silent re-auth detected a password-protected account requiring password input. |
| `pendingAdminUsername` | `string \| null` | The username that triggered the admin login prompt during silent re-auth. |
| `clearAdminLogin` | `() => void` | Resets `showAdminLogin` to `false` and `pendingAdminUsername` to `null`. |

*Preview coordination:*

| Field | Type | Description |
|-------|------|-------------|
| `previewBelief` | `number[] \| null` | Trade preview belief vector, written by trading widgets, read by chart components |
| `setPreviewBelief` | `(belief: number[] \| null) => void` | Setter for `previewBelief` |
| `previewPayout` | `PayoutCurve \| null` | Trade payout preview, written by trading widgets |
| `setPreviewPayout` | `(payout: PayoutCurve \| null) => void` | Setter for `previewPayout` |
| `selectedPosition` | `Position \| null` | Currently selected position for chart overlay, typically set by a position table row click |
| `setSelectedPosition` | `(pos: Position \| null) => void` | Setter for `selectedPosition` |

*Invalidation:*

| Field | Type | Description |
|-------|------|-------------|
| `invalidate` | `(marketId: string \| number) => void` | Increments `invalidationCount` (triggering all data hooks to re-fetch) and, if authenticated, refreshes the user profile via `fetchCurrentUser` (best-effort, errors swallowed). The `marketId` parameter is accepted for future per-market invalidation but currently unused. |
| `invalidationCount` | `number` | Counter watched by all data hooks. Increments on calls to `invalidate()`, `login()`, `signup()`, and `logout()`. Does not increment on auto-auth at mount. |

*Theme:*

| Field | Type | Description |
|-------|------|-------------|
| `chartColors` | `ChartColors` | Resolved concrete hex/rgba color values for Recharts SVG rendering. Derived from the resolved theme, with preset-specific overrides for named presets. See `ChartColors` in Theme System. |

**Invalidation mechanism:**

After a trade, call `ctx.invalidate(marketId)`. This increments the internal `invalidationCount`, which every data hook includes in its `useEffect` dependency array. All hooks re-fetch in parallel on the next render. If the user is authenticated, `invalidate` also fires a background `fetchCurrentUser` call to refresh the wallet balance (failure is silently ignored). The `login()`, `signup()`, and `logout()` callbacks also increment `invalidationCount`, so all data hooks automatically refresh after auth state changes.

**Examples:**

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';

// Auto-auth: logs in on mount, shows "Authenticating..." until ready
<FunctionSpaceProvider
  config={{
    baseUrl: 'https://api.example.com',
    username: 'trader1',
    password: 'secret',
  }}
  theme="fs-dark"
>
  <App />
</FunctionSpaceProvider>

// Interactive: starts as guest, user authenticates later via useAuth()
<FunctionSpaceProvider
  config={{ baseUrl: 'https://api.example.com' }}
  theme={{ preset: 'native-dark', primary: '#ff6600' }}
>
  <App />
</FunctionSpaceProvider>

// Guest-only: no credentials, read-only market browsing
<FunctionSpaceProvider
  config={{ baseUrl: 'https://api.example.com' }}
>
  <App />
</FunctionSpaceProvider>
```

#### `FunctionSpaceContext`

The raw React context object created via `createContext<FSContext | null>(null)`. All hooks call `useContext(FunctionSpaceContext)` internally and throw if the value is `null` (meaning the hook was used outside a `FunctionSpaceProvider`). Direct access is rarely needed; prefer the specialized hooks (`useAuth`, `useMarket`, etc.) which provide narrower, typed interfaces.

#### `resolveTheme(input?)`

```typescript
function resolveTheme(input?: FSThemeInput): ResolvedFSTheme
```

Pure function that normalizes an `FSThemeInput` into a `ResolvedFSTheme` with all 30 tokens guaranteed present. Called internally by the Provider on each render (memoized on the `theme` prop), but exported for use outside Provider contexts (e.g., build-time theme generation, testing).

**Resolution rules:**
- `undefined` / not provided: returns `FS_DARK`
- String preset ID (e.g., `"fs-light"`): returns the matching preset, or `FS_DARK` if unrecognized
- Object with `preset` key: starts from the named preset, spreads overrides, then calls `applyDefaults` to derive missing optional tokens
- Object without `preset`: treats the input as a raw `FSTheme` and calls `applyDefaults` to derive all 21 optional tokens from the 9 required core tokens

### Data Hooks

All data-fetching hooks share a common pattern:

- Accept `marketId` as the first argument
- Return `{ data, loading, error, refetch }` (where `data` is the hook-specific field name like `market`, `consensus`, etc.)
- Start with `loading: true`, set to `false` after the first fetch completes
- Automatically re-fetch when `ctx.invalidationCount` changes (triggered by `invalidate()`, `login()`, `signup()`, or `logout()`)
- Throw if called outside a `FunctionSpaceProvider`
- `refetch()` can be called imperatively to force a re-fetch at any time

#### `useMarket(marketId)`

Fetches complete market state -- configuration, consensus coefficients, metadata, and resolution status -- and re-fetches when the market ID or provider invalidation count changes.

```typescript
function useMarket(
  marketId: string | number,
): {
  market: MarketState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter  | Type               | Description       |
|------------|--------------------|--------------------|
| `marketId` | `string \| number` | Market identifier  |

**Behavior:**
- `market` is `null` until the first successful fetch; `loading` starts as `true`.
- Re-fetches automatically when `marketId` changes or when the provider's invalidation count increments (e.g., after a `buy` or `sell` via `ctx.invalidate()`).
- `refetch` is async. Calling it resets `loading` to `true` and `error` to `null` before the request fires.
- Throws `"useMarket must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Delegates to:** `queryMarketState(client, marketId)` (see Core > Markets).

**Example:**

```tsx
function MarketHeader({ marketId }: { marketId: number }) {
  const { market, loading, error, refetch } = useMarket(marketId);

  if (loading) return <p>Loading market...</p>;
  if (error)  return <p>Error: {error.message}</p>;
  if (!market) return null;

  return (
    <div>
      <h2>{market.title}</h2>
      <p>
        Range: {market.config.L} to {market.config.H} {market.xAxisUnits}
      </p>
      <p>Status: {market.resolutionState}</p>
      <p>Participants: {market.participantCount}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

#### `useConsensus(marketId, numPoints?)`

Fetches the consensus probability density curve as chart-ready `{ x, y }[]` points by wrapping `getConsensusCurve` from core.

```typescript
function useConsensus(
  marketId: string | number,
  numPoints?: number,
): {
  consensus: ConsensusCurve | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | `string \| number` | Market identifier |
| `numPoints` | `number?` | Evaluation points for the density curve. Defaults to `200`. Higher values produce smoother curves at the cost of a larger array. |

**Behavior:**
- Throws if rendered outside `FunctionSpaceProvider`.
- Passes `numPoints` through to `getConsensusCurve`, which evaluates the consensus coefficients into `numPoints` evenly-spaced `{ x, y }` samples between `config.L` and `config.H`.
- Re-fetches automatically when `marketId`, `numPoints`, or the provider's `invalidationCount` changes.
- `refetch()` can be called imperatively to force a re-fetch at any time.
- `consensus` is `null` until the first successful fetch completes.

**Delegates to:** `getConsensusCurve(client, marketId, numPoints)` (see Core > Markets).

**Example:**

```tsx
function ConsensusSummary({ marketId }: { marketId: number }) {
  const { consensus, loading, error } = useConsensus(marketId, 300);

  if (loading) return <div>Loading consensus...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!consensus) return null;

  const { L, H } = consensus.config;
  const peak = consensus.points.reduce((max, p) => (p.y > max.y ? p : max), consensus.points[0]);

  return (
    <div>
      <p>Range: {L} to {H}</p>
      <p>Peak density at {peak.x.toFixed(1)} ({consensus.points.length} points)</p>
    </div>
  );
}
```

#### `usePositions(marketId, username?)`

Fetches all positions for a market. When `username` is provided, filters the results client-side to only positions owned by that user.

```typescript
function usePositions(
  marketId: string | number,
  username?: string,
): {
  positions: Position[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | `string \| number` | Market identifier |
| `username` | `string?` | If provided, filters to positions where `position.owner === username`. If omitted, returns all positions in the market. |

**Behavior:**
- Filtering by `username` happens client-side after the full fetch. The API call always fetches all market positions regardless of the `username` parameter.
- Re-fetches automatically when `marketId`, `username`, or the provider's `invalidationCount` changes.
- Throws `"usePositions must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Delegates to:** `queryMarketPositions(client, marketId)` from core.

**Example:**

```tsx
function MyPositions({ marketId }: { marketId: number }) {
  const { user } = useAuth();
  const { positions, loading } = usePositions(marketId, user?.username);

  if (loading || !positions) return <div>Loading positions...</div>;

  return (
    <ul>
      {positions.map(p => (
        <li key={p.positionId}>
          Position #{p.positionId}: ${p.collateral.toFixed(2)} at {p.prediction}
        </li>
      ))}
    </ul>
  );
}
```

#### `useTradeHistory(marketId, options?)`

Fetches trade history for a market with optional polling for live updates.

```typescript
function useTradeHistory(
  marketId: string | number,
  options?: {
    limit?: number;
    pollInterval?: number;
  },
): {
  trades: TradeEntry[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | `string \| number` | Market identifier. |
| `options.limit` | `number?` | Maximum number of trade entries to return. Default: `100`. |
| `options.pollInterval` | `number?` | Polling interval in milliseconds. Default: `0` (no polling). When > 0, re-fetches automatically on a timer. |

**Behavior:**
- `trades` starts as `null` and becomes a `TradeEntry[]` after the first successful fetch; check for `null` before rendering.
- Re-fetches automatically when `marketId` or `limit` changes, and whenever the provider's invalidation fires (e.g., after a `buy` or `sell` transaction).
- Polling is cleaned up on unmount or when `pollInterval` changes; safe to unmount mid-fetch.
- The only data hook that supports automatic periodic re-fetching via `pollInterval`.
- Each `TradeEntry` contains: `id`, `timestamp`, `side` (`'buy' | 'sell'`), `prediction` (`number | null`), `amount`, `username`, and `positionId`.

**Delegates to:** `queryTradeHistory` from core.

**Example:**

```tsx
function TradeFeed({ marketId }: { marketId: string }) {
  const { trades, loading, error, refetch } = useTradeHistory(marketId, {
    limit: 50,
    pollInterval: 5000,
  });

  if (loading && !trades) return <p>Loading trades...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!trades || trades.length === 0) return <p>No trades yet.</p>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {trades.map((t) => (
          <li key={t.id}>
            {t.timestamp} — {t.username} {t.side} {t.amount.toFixed(2)}
            {t.prediction !== null && ` @ ${t.prediction.toFixed(1)}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### `useMarketHistory(marketId, options?)`

Fetches time-series history of consensus snapshots, used for fan chart rendering and historical analysis.

```typescript
function useMarketHistory(
  marketId: string | number,
  options?: { limit?: number },
): {
  history: MarketHistory | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | `string \| number` | Market identifier |
| `options.limit` | `number?` | Maximum number of historical snapshots to fetch. Passed through to `queryMarketHistory`; when omitted the server applies its own default. |

**Behavior:**
- Returns a `MarketHistory` object containing `marketId`, `totalSnapshots`, and a `snapshots` array of `MarketSnapshot` records ordered by timestamp.
- Re-fetches automatically when `marketId`, `options.limit`, or the provider's `invalidationCount` changes.
- Throws if rendered outside `FunctionSpaceProvider`.

**Delegates to:** `queryMarketHistory(client, marketId, limit)` from core.

**Example:**

```tsx
import { useMarketHistory, useMarket } from '@functionspace/react';
import { transformHistoryToFanChart } from '@functionspace/core';

function MarketTimeline({ marketId }: { marketId: number }) {
  const { market } = useMarket(marketId);
  const { history, loading, error } = useMarketHistory(marketId, { limit: 500 });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!market || !history) return null;

  const { L, H } = market.config;
  const fanData = transformHistoryToFanChart(history.snapshots, L, H);

  return (
    <div>
      <p>{history.totalSnapshots} total snapshots, showing {fanData.length} points</p>
      {fanData.map(pt => (
        <p key={pt.tradeId}>
          {new Date(pt.timestamp).toLocaleDateString()} — mean: {pt.mean.toFixed(2)}
        </p>
      ))}
    </div>
  );
}
```

#### `useBucketDistribution(marketId, numBuckets?, numPoints?)`

Composite hook that combines `useMarket` + `useConsensus` internally and derives a `BucketData[]` array via `calculateBucketDistribution`. Makes no additional API calls beyond what the inner hooks fetch.

```typescript
function useBucketDistribution(
  marketId: string | number,
  numBuckets: number = 12,
  numPoints: number = 200,
): {
  buckets: BucketData[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | `string \| number` | Market identifier |
| `numBuckets` | `number` | Number of equal-width outcome buckets to divide the range `[L, H]` into. Default: `12`. |
| `numPoints` | `number` | Number of evaluation points for the consensus density curve. Default: `200`. |

**Behavior:**

- Calls `useMarket(marketId)` to obtain market config (`L`, `H`, `decimals`) and `useConsensus(marketId, numPoints)` to fetch the consensus density curve. No additional API calls are made.
- Returns `loading` and `error` from `useConsensus` only; `useMarket` data is consumed silently.
- The `buckets` array is memoized and recomputes when `consensus`, `market`, `numBuckets`, or the provider's `invalidationCount` changes. Returns `null` until both market and consensus data are available.
- Each `BucketData` contains `range` (formatted string), `min`/`max` (numeric bounds), `probability` (0-1 mass), and `percentage` (0-100).
- For more control over bucket configuration (settable count, sub-range computation, percentiles), use `useDistributionState` instead.

**Delegates to:** `useMarket` + `useConsensus` (hooks), `calculateBucketDistribution` (core math).

**Example:**

```tsx
function OutcomeBuckets({ marketId }: { marketId: number }) {
  const { buckets, loading, error, refetch } = useBucketDistribution(marketId, 8);

  if (loading) return <p>Loading distribution...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!buckets) return null;

  return (
    <div>
      <h3>Outcome Distribution</h3>
      <ul>
        {buckets.map((b) => (
          <li key={b.range}>
            {b.range}: {b.percentage.toFixed(1)}%
          </li>
        ))}
      </ul>
      {/* buckets[0] = { range: "40-45", min: 40, max: 45, probability: 0.12, percentage: 12 } */}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

#### `useDistributionState(marketId, config?)`

The most feature-rich data hook. Combines market and consensus data, manages a controllable bucket count with clamping, pre-computes full-range buckets and consensus percentiles, and provides a `getBucketsForRange` helper for on-demand sub-range computation.

```typescript
function useDistributionState(
  marketId: string | number,
  config?: DistributionStateConfig,
): DistributionState
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketId` | `string \| number` | Market identifier |
| `config.defaultBucketCount` | `number?` | Initial bucket count. Default: `12`. Clamped to `[2, 50]`. |

**Returns `DistributionState`:**

| Field | Type | Description |
|-------|------|-------------|
| `market` | `MarketState \| null` | Pass-through from `useMarket` |
| `loading` | `boolean` | `true` if either market or consensus is still loading |
| `error` | `Error \| null` | First error from either inner hook |
| `refetch` | `() => void` | Re-fetches both market and consensus data |
| `bucketCount` | `number` | Current bucket count (2 to 50) |
| `setBucketCount` | `(n: number) => void` | Update bucket count. Value is clamped to `[2, 50]`. |
| `buckets` | `BucketData[] \| null` | Pre-computed buckets over the full range `[L, H]`. Recomputes when consensus, market, bucketCount, or invalidation changes. |
| `percentiles` | `PercentileSet \| null` | 9-point percentile set (p2_5 through p97_5) computed from `market.consensus` (via `useMarket`), not from the separately-fetched consensus curve |
| `getBucketsForRange` | `(min: number, max: number) => BucketData[]` | Compute buckets over a custom sub-range using the current `bucketCount`. Returns empty array if consensus or market data is not yet loaded. |

**Behavior:** This hook is designed for sharing state between components. Pass the returned object to both a chart and a selector to keep bucket configuration synchronized. Buckets and percentiles recompute reactively when the underlying market or consensus data changes, when `bucketCount` is updated, or when a cache invalidation is triggered via context.

**Delegates to:** `useMarket` + `useConsensus` (hooks), `calculateBucketDistribution` + `computePercentiles` (core math).

**Example:**

```tsx
function DistributionView({ marketId }: { marketId: number }) {
  const dist = useDistributionState(marketId, { defaultBucketCount: 10 });

  // Share the same state object with both chart and selector
  return (
    <>
      <DistributionChart marketId={marketId} distributionState={dist} />
      <BucketRangeSelector marketId={marketId} distributionState={dist} />
      <button onClick={() => dist.setBucketCount(dist.bucketCount + 1)}>
        More buckets ({dist.bucketCount})
      </button>
    </>
  );
}
```

### Trading

#### `useCustomShape(market)`

State management hook for the interactive custom shape editor. Manages control point values, locked points, and drag interaction state, and derives a normalized `BeliefVector` and mode prediction from the current control values. This is a state/action hook -- the consuming component manages loading and error states separately (typically from `useMarket`).

```typescript
function useCustomShape(market: MarketState | null): UseCustomShapeReturn
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `market` | `MarketState \| null` | Market state providing `config.K`, `config.L`, `config.H` for belief construction. When `null`, `pVector` and `prediction` are `null`. |

**Returns `UseCustomShapeReturn`:**

*State fields:*

| Field | Type | Description |
|-------|------|-------------|
| `controlValues` | `number[]` | Current height of each control point. Values range from 0 to 25. Initialized as a bell shape via `generateBellShape`. |
| `lockedPoints` | `number[]` | Indices of currently locked control points (maximum 2). Locked points cannot be dragged or set. |
| `numPoints` | `number` | Current control point count (5 to 25, default 20). |

*Derived fields:*

| Field | Type | Description |
|-------|------|-------------|
| `pVector` | `BeliefVector \| null` | Normalized belief vector derived from control values via `generateCustomShape`. `null` when `market` is `null`. |
| `prediction` | `number \| null` | Mode (peak) of the derived distribution via `computeStatistics`. `null` when `market` is `null`. |

*Action fields:*

| Field | Type | Description |
|-------|------|-------------|
| `setControlValue` | `(index: number, value: number) => void` | Set a single control point's value. No-op if the point is locked or the index is out of range. Value is clamped to `[0, 25]`. |
| `toggleLock` | `(index: number) => void` | Toggle lock on a control point. If already at max locks (2), the oldest lock is dropped (FIFO) before the new lock is added. |
| `setNumPoints` | `(n: number) => void` | Change the control point count. `n` is rounded and clamped to `[5, 25]`. Resets all values to a bell shape and clears locks. |
| `resetToDefault` | `() => void` | Reset all control values to a bell shape at the current `numPoints`. Clears locks and ends any active drag. |

*Drag fields:*

| Field | Type | Description |
|-------|------|-------------|
| `startDrag` | `(index: number) => void` | Begin dragging a control point. No-op if the point is locked. |
| `handleDrag` | `(value: number) => void` | Update the currently dragged point's value. Value is clamped to `[0, 25]`. No-op if no drag is active or the dragged point is locked. |
| `endDrag` | `() => void` | End the current drag operation. |
| `isDragging` | `boolean` | Whether a drag is currently active (`draggingIndex !== null`). |
| `draggingIndex` | `number \| null` | Index of the point currently being dragged, or `null`. |

**Behavior:**
- Requires `FunctionSpaceProvider`. Throws if called outside one.
- All value mutations (`setControlValue`, `handleDrag`) clamp to `[0, 25]`. Values outside this range are silently clamped, never rejected.
- `setControlValue` is a no-op for out-of-range indices (negative or beyond `controlValues.length`). No error is thrown.
- Locked points are fully protected: `setControlValue`, `startDrag`, and `handleDrag` all silently no-op when the target point is locked.
- `toggleLock` uses FIFO eviction: when already at the maximum of 2 locks, the oldest lock is removed before the new one is added. Toggling an already-locked point unlocks it.
- `setNumPoints` rounds the input to the nearest integer before clamping to `[5, 25]`, then regenerates control values as a bell shape and clears all locks.
- `resetToDefault` regenerates the bell shape at the current `numPoints` (does not reset `numPoints` to 20) and clears both locks and drag state.
- `pVector` recomputes whenever `controlValues` or `market` changes. `prediction` recomputes whenever `pVector` or `market` changes.

**Delegates to:** `generateCustomShape`, `generateBellShape`, `computeStatistics` from core.

**Example:**

```tsx
function ShapeEditor({ marketId }: { marketId: number }) {
  const { market } = useMarket(marketId);
  const shape = useCustomShape(market);

  return (
    <div>
      {shape.controlValues.map((val, i) => (
        <input
          key={i}
          type="range"
          min={0}
          max={25}
          value={val}
          onChange={(e) => shape.setControlValue(i, Number(e.target.value))}
          disabled={shape.lockedPoints.includes(i)}
        />
      ))}
      <p>Prediction: {shape.prediction?.toFixed(2)}</p>
      <button onClick={shape.resetToDefault}>Reset</button>
    </div>
  );
}
```

### Auth

#### `useAuth()`

Thin accessor hook that extracts authentication state and actions from the Provider context. Does not add any state or logic of its own.

```typescript
function useAuth(): {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<UserProfile>;
  signup: (username: string, password: string, options?: SignupOptions) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  passwordlessLogin: (username: string) => Promise<PasswordlessLoginResult>;
  showAdminLogin: boolean;
  pendingAdminUsername: string | null;
  clearAdminLogin: () => void;
}
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `user` | `UserProfile \| null` | Current user profile (userId, username, walletValue, role), or `null` in guest mode |
| `isAuthenticated` | `boolean` | `true` when `user` is not null |
| `loading` | `boolean` | `true` during login or signup operations |
| `error` | `Error \| null` | Most recent authentication error. Cleared when a new login/signup attempt starts or on logout. |
| `login` | `(username: string, password: string) => Promise<UserProfile>` | Authenticate and return the user profile. Sets the token on the client, stores the user, and increments the invalidation counter. Re-throws errors for inline UI handling. |
| `signup` | `(username: string, password: string, options?: SignupOptions) => Promise<UserProfile>` | Register a new user, then automatically log in (signup returns no token, so a login call follows). Increments the invalidation counter. Re-throws errors. |
| `logout` | `() => void` | Clear token, user profile, auth error, preview state (belief and payout), and selected position. Increments the invalidation counter. |
| `refreshUser` | `() => Promise<void>` | Re-fetch the current user's profile (e.g., to update wallet balance after a trade). Silently fails if not authenticated. |
| `passwordlessLogin` | `(username: string) => Promise<PasswordlessLoginResult>` | Passwordless login with auto-signup. Returns `{ action: 'login' \| 'signup', user, token }`. Sets token and user on the provider. Throws with `code: PASSWORD_REQUIRED` for password-protected accounts. |
| `showAdminLogin` | `boolean` | `true` when silent re-auth detected a password-protected account. Used by `PasswordlessAuthWidget` to auto-open the admin login form. |
| `pendingAdminUsername` | `string \| null` | Username that triggered admin login during silent re-auth. Pre-fills the admin login form. |
| `clearAdminLogin` | `() => void` | Resets `showAdminLogin` and `pendingAdminUsername`. Called after successful admin login. |

**Behavior:**

- **No local state.** This hook reads directly from `FunctionSpaceContext` and returns a subset of its fields. The `loading` and `error` fields are renamed from `ctx.authLoading` and `ctx.authError` for ergonomic consumption.
- **Invalidation triggers.** `login`, `signup`, and `logout` all increment the context-level `invalidationCount`, causing data-fetching hooks (e.g., `useMarket`, `usePositions`) to refetch automatically.
- **Error lifecycle.** `login` and `signup` clear `authError` before attempting the operation and set it on failure. `logout` also clears `authError`. Errors are re-thrown by `login` and `signup` so callers can handle them inline.
- **Provider guard.** Throws `"useAuth must be used within FunctionSpaceProvider"` if called outside the provider tree.

**Delegates to:** `FunctionSpaceContext` (read-only accessor).

**Example:**

```tsx
function AuthButton() {
  const { user, isAuthenticated, login, logout, loading } = useAuth();

  if (isAuthenticated) {
    return (
      <div>
        <span>{user!.username} (${user!.walletValue})</span>
        <button onClick={logout}>Sign Out</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login('trader1', 'secret')}
      disabled={loading}
    >
      {loading ? 'Signing in...' : 'Sign In'}
    </button>
  );
}
```

### Chart Utilities

#### `useChartZoom(options)`

Complete chart zoom-and-pan state machine. Handles scroll-wheel zoom (cursor-anchored), mouse-drag panning, double-click reset, and automatic Y-domain recomputation for visible data. Uses `requestAnimationFrame` coalescing for smooth scroll performance.

This hook has **no context dependency** -- it does not call `useContext` and has no `FunctionSpaceContext` requirement. It is a pure interaction utility, portable to any Recharts chart.

```typescript
function useChartZoom(options: ChartZoomOptions): ChartZoomResult
```

**Options (`ChartZoomOptions`):**

| Field | Type | Description |
|-------|------|-------------|
| `data` | `any[]` | The chart's data array |
| `xKey` | `string` | Property name for the X-axis value in each data item |
| `fullXDomain` | `[number, number]` | The complete (unzoomed) X domain range |
| `getPlotArea` | `(containerRect: DOMRect) => { left: number; right: number }` | Callback that computes the plot area pixel boundaries from the container's bounding rect. Use `rechartsPlotArea()` for standard Recharts layouts. |
| `computeYDomain` | `(visibleData: any[], fullData: any[]) => [number, number]` | Optional callback to recompute Y-axis bounds when the visible data range changes. Receives visible slice and full data array. If omitted, `yDomain` returns `undefined`. |
| `resetTrigger` | `any` | When this value changes, zoom state resets to full domain. Useful for market switches. |
| `maxZoomFactor` | `number?` | Maximum zoom depth as a divisor of full range. Default: `50` (can zoom to 1/50th of full range). |
| `zoomFactor` | `number?` | Per-scroll zoom step size. Default: `0.15` (15% per scroll tick). |
| `panExcludeSelectors` | `string[]?` | CSS selectors for elements that should not initiate pan. Each selector is tested via `target.closest(sel)` on mouse-down. Example: `['.control-dot']` to exclude draggable chart handles. |
| `enabled` | `boolean?` | Master enable/disable. Default: `true`. When `false`, all `containerProps` event handlers become no-ops and `style` is `{}`. |

**Returns (`ChartZoomResult`):**

| Field | Type | Description |
|-------|------|-------------|
| `containerRef` | `React.MutableRefObject<HTMLDivElement \| null>` | Ref to attach to the chart's container div. Required for imperative wheel event listening. |
| `xDomain` | `[number, number]` | Current visible X domain. Equals `fullXDomain` when not zoomed. |
| `yDomain` | `[number, number] \| undefined` | Recomputed Y domain for the visible data slice. `undefined` if `computeYDomain` was not provided. When not zoomed, calls `computeYDomain(data, data)`. |
| `isZoomed` | `boolean` | `true` when the view is zoomed in from the full domain |
| `isPanning` | `boolean` | `true` when a mouse-drag pan is in progress |
| `containerProps` | `object` | Spread onto the container div. Contains `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`, `onDoubleClick`, and `style`. Cursor shows `grab` when zoomed, `grabbing` (with `userSelect: none`) when panning, and no cursor override otherwise. |
| `reset` | `() => void` | Programmatic zoom reset to full domain |

**Behavior:**
- **Wheel zoom** -- Uses `{ passive: false }` to call `preventDefault` (prevents page scrolling while zooming the chart). Zoom is cursor-anchored: the data value under the mouse pointer stays fixed during zoom.
- **rAF coalescing** -- Multiple wheel events within a single animation frame are batched into one state update. Only the latest computed domain is applied.
- **Pan** -- Only activates when already zoomed (cannot pan the full domain). Left mouse button only. Checks `panExcludeSelectors` via `target.closest(sel)` before initiating.
- **Auto-reset** -- Zoom resets to full domain when: `resetTrigger` value changes, `fullXDomain` values change (e.g., switching markets), the user double-clicks, or when zooming out past 99% of full range.
- **Y recomputation** -- When `computeYDomain` is provided, it is called with `(visibleSlice, fullData)` whenever the visible data changes. Falls back to `(fullData, fullData)` when not zoomed or when the visible slice is empty.
- **Disabled mode** -- When `enabled=false`, all `containerProps` handlers are no-ops, `style` is `{}`, and the wheel listener is not attached.

**Delegates to:** `pixelToDataX`, `computeZoomedDomain`, `computePannedDomain`, `filterVisibleData` from `@functionspace/core` (L0 chart zoom math).

**Example:**

```tsx
import { useChartZoom, rechartsPlotArea } from '@functionspace/react';

const MARGIN = { top: 10, right: 20, bottom: 30, left: 10 };

function ZoomableChart({ data, marketId }) {
  const zoom = useChartZoom({
    data,
    xKey: 'x',
    fullXDomain: [data[0].x, data[data.length - 1].x],
    getPlotArea: rechartsPlotArea(MARGIN, 60),
    computeYDomain: (visible) => [0, Math.max(...visible.map(d => d.y)) * 1.1],
    resetTrigger: marketId,
  });

  return (
    <div ref={zoom.containerRef} {...zoom.containerProps}>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={MARGIN}>
          <XAxis dataKey="x" domain={zoom.xDomain} type="number" />
          <YAxis domain={zoom.yDomain} />
          <Area dataKey="y" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

#### `rechartsPlotArea(margin, yAxisWidth?)`

Factory function that creates a `getPlotArea` callback compatible with `useChartZoom`. Accounts for Recharts chart margins and Y-axis width to compute the correct pixel boundaries for zoom/pan coordinate conversion.

```typescript
function rechartsPlotArea(
  margin: { left: number; right: number },
  yAxisWidth?: number,  // default: 60
): (rect: DOMRect) => { left: number; right: number }
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `margin` | `{ left: number; right: number }` | The `margin` prop passed to the Recharts chart component |
| `yAxisWidth` | `number?` | Width of the Y-axis in pixels. Default: `60`. |

**Returns:** A function that takes a container's `DOMRect` and returns `{ left, right }` pixel positions of the plot area. Computed as `left = rect.left + margin.left + yAxisWidth`, `right = rect.right - margin.right`.

**Example:**

```tsx
const MARGIN = { top: 10, right: 20, bottom: 30, left: 10 };
const getPlotArea = rechartsPlotArea(MARGIN, 60);
// getPlotArea(containerRect) => { left: containerRect.left + 10 + 60, right: containerRect.right - 20 }
```

### Theme System

The theme system uses a 30-token architecture organized into tiers. You provide as few as 9 required tokens; the remaining 21 are automatically derived.

#### `FSTheme`

The full theme interface. Only the 9 core tokens are required; all others have sensible defaults derived from the core tokens via `applyDefaults`.

**Core 9 (required):**

| Token | Type | Purpose |
|-------|------|---------|
| `primary` | `string` | Primary brand color (buttons, links, consensus curve) |
| `accent` | `string` | Accent/highlight color (preview lines, secondary actions) |
| `positive` | `string` | Success/gain color (payout curves, profit indicators) |
| `negative` | `string` | Error/loss color (loss indicators, sell actions) |
| `background` | `string` | Page background |
| `surface` | `string` | Card/panel background |
| `text` | `string` | Primary text color |
| `textSecondary` | `string` | Secondary/dimmed text |
| `border` | `string` | Default border color |

**Tier 1 (optional, derived from core 9):**

| Token | Default Source | Purpose |
|-------|---------------|---------|
| `bgSecondary` | `background` | Alternate background areas |
| `surfaceHover` | `surface` | Surface hover state |
| `borderSubtle` | `border` | Subtle/secondary borders |
| `textMuted` | `textSecondary` | Most subtle text level |

**Tier 2 (optional, component-specific):**

| Token | Default Source | Purpose |
|-------|---------------|---------|
| `navFrom` | `background` | Navigation gradient start |
| `navTo` | `background` | Navigation gradient end |
| `overlay` | `'rgba(0,0,0,0.2)'` | Modal/overlay backdrop |
| `inputBg` | `background` | Form input background |
| `codeBg` | `background` | Code block background |
| `chartBg` | `background` | Chart background |
| `accentGlow` | `'rgba(59,130,246,0.25)'` | Glow effect around accent elements |
| `badgeBg` | `'rgba(128,128,128,0.15)'` | Badge background |
| `badgeBorder` | `'rgba(128,128,128,0.25)'` | Badge border |
| `badgeText` | `textSecondary` | Badge text color |
| `logoFilter` | `'none'` | CSS filter applied to logo images |

**Tier 3 (optional, shape/personality):**

| Token | Default | Purpose |
|-------|---------|---------|
| `fontFamily` | `'inherit'` | Font stack |
| `radiusSm` | `'0.375rem'` | Small border radius |
| `radiusMd` | `'0.75rem'` | Medium border radius |
| `radiusLg` | `'1rem'` | Large border radius |
| `borderWidth` | `'1px'` | Default border width |
| `transitionSpeed` | `'200ms'` | CSS transition duration |

#### `ResolvedFSTheme`

`Required<FSTheme>` with all 30 tokens guaranteed present. This is what the Provider and all components actually consume.

#### `FSThemeInput`

The flexible input type accepted by the Provider's `theme` prop:

```typescript
type FSThemeInput =
  | ThemePresetId                                    // e.g., "fs-dark"
  | (Partial<FSTheme> & { preset?: ThemePresetId })  // overrides with optional preset base
```

**Usage patterns:**

```tsx
// Use a preset as-is
<FunctionSpaceProvider theme="fs-dark" />

// Start from a preset, override specific tokens
<FunctionSpaceProvider theme={{ preset: 'native-dark', primary: '#ff6600', positive: '#00ff00' }} />

// Fully custom theme (must provide all 9 core tokens)
<FunctionSpaceProvider theme={{
  primary: '#6366f1',
  accent: '#f59e0b',
  positive: '#22c55e',
  negative: '#ef4444',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  border: '#333333',
}} />
```

#### Preset Constants

Four built-in presets, each providing all 30 tokens:

| Constant | Preset ID | Description |
|----------|-----------|-------------|
| `FS_DARK` | `'fs-dark'` | FunctionSpace branded dark theme. Blue primary, dark purple-tinted background, 2px borders, 300ms transitions. |
| `FS_LIGHT` | `'fs-light'` | FunctionSpace branded light theme. Blue primary, light gray background. |
| `NATIVE_DARK` | `'native-dark'` | De-branded dark theme. Pure black background, system fonts, compact radius (0.25/0.375/0.5rem), 1px borders, 150ms transitions. |
| `NATIVE_LIGHT` | `'native-light'` | De-branded light theme. White surface, system fonts, compact radius. |
| `THEME_PRESETS` | n/a | Metadata array for building theme-selector UIs: `{ id: ThemePresetId, label: string, group: string }[]` |

#### `ChartColors`

Concrete hex/rgba values for Recharts SVG rendering. Resolved from the theme and preset-specific overrides. Available on context as `ctx.chartColors`.

| Field | Type | Description |
|-------|------|-------------|
| `grid` | `string` | CartesianGrid stroke color |
| `axisText` | `string` | Axis label and tick fill |
| `tooltipBg` | `string` | Custom tooltip background |
| `tooltipBorder` | `string` | Custom tooltip border |
| `tooltipText` | `string` | Custom tooltip text color |
| `crosshair` | `string` | Cursor/crosshair stroke |
| `consensus` | `string` | Consensus curve stroke/fill |
| `previewLine` | `string` | Trade preview line stroke |
| `payout` | `string` | Payout curve color |
| `positions` | `string[]` | Position overlay curve colors (7-color palette) |
| `fanBands` | `FanBandColors` | Fan chart band colors |

**`FanBandColors`:**

| Field | Description |
|-------|-------------|
| `mean` | Solid mean line color |
| `band25` | Inner band (25th-75th percentile) |
| `band50` | Mid-inner band |
| `band75` | Mid-outer band |
| `band95` | Outer band (2.5th-97.5th percentile) |

#### `resolveChartColors(theme, presetOverrides?, customOverrides?)`

Produces a `ChartColors` object from a resolved theme. Merges three layers: base defaults (derived from theme tokens), preset-specific overrides, and custom overrides. Fan band colors are deep-merged separately.

```typescript
function resolveChartColors(
  theme: ResolvedFSTheme,
  presetOverrides?: Partial<ChartColors>,
  customOverrides?: Partial<ChartColors>,
): ChartColors
```

If `consensus` is overridden but neither `presetOverrides.fanBands.mean` nor `customOverrides.fanBands.mean` is explicitly set, `fanBands.mean` is automatically synced to the resolved consensus color. Note: all four built-in presets include explicit `fanBands.mean` values, so this auto-sync only fires for fully custom (non-preset) themes.

#### `getPresetChartColors(presetId)`

Returns preset-specific chart color overrides for a given preset ID. Used internally by the Provider during chart color resolution.

```typescript
function getPresetChartColors(presetId: ThemePresetId): Partial<ChartColors> | undefined
```

#### CSS Custom Properties

The Provider injects all 30 theme tokens as CSS custom properties on a wrapper div. UI components reference these properties for styling. You can also use them in your own CSS:

```css
.my-custom-panel {
  background: var(--fs-surface);
  color: var(--fs-text);
  border: var(--fs-border-width) solid var(--fs-border);
  border-radius: var(--fs-radius-md);
  transition: background var(--fs-transition-speed);
}
```

**Full property mapping:**

| CSS Property | Theme Token |
|--------------|-------------|
| `--fs-primary` | `primary` |
| `--fs-accent` | `accent` |
| `--fs-positive` | `positive` |
| `--fs-negative` | `negative` |
| `--fs-background` | `background` |
| `--fs-surface` | `surface` |
| `--fs-text` | `text` |
| `--fs-text-secondary` | `textSecondary` |
| `--fs-border` | `border` |
| `--fs-bg-secondary` | `bgSecondary` |
| `--fs-surface-hover` | `surfaceHover` |
| `--fs-border-subtle` | `borderSubtle` |
| `--fs-text-muted` | `textMuted` |
| `--fs-nav-from` | `navFrom` |
| `--fs-nav-to` | `navTo` |
| `--fs-overlay` | `overlay` |
| `--fs-input-bg` | `inputBg` |
| `--fs-code-bg` | `codeBg` |
| `--fs-chart-bg` | `chartBg` |
| `--fs-accent-glow` | `accentGlow` |
| `--fs-badge-bg` | `badgeBg` |
| `--fs-badge-border` | `badgeBorder` |
| `--fs-badge-text` | `badgeText` |
| `--fs-logo-filter` | `logoFilter` |
| `--fs-font-family` | `fontFamily` |
| `--fs-radius-sm` | `radiusSm` |
| `--fs-radius-md` | `radiusMd` |
| `--fs-radius-lg` | `radiusLg` |
| `--fs-border-width` | `borderWidth` |
| `--fs-transition-speed` | `transitionSpeed` |

### Settlement

> **Coming Soon.** No settlement-specific hooks are currently available.

---

## UI

`@functionspace/ui` — Ready-to-use React components. Requires `@functionspace/react` and `@functionspace/core` as peer dependencies.

All UI components must be rendered inside a `FunctionSpaceProvider`. They handle their own loading and error states, communicate through context (not props), and inherit theming automatically.

> **Deprecated export:** `@functionspace/ui` also exports `CHART_COLORS` from `./theme.js`. This is a legacy static color object hardcoded to the FS Dark theme. Use `ctx.chartColors` from `FunctionSpaceContext` instead — it responds to theme changes and supports all presets.

### Trading

Trading components that support error callbacks implement the `TradeInputBaseProps` contract:

```typescript
interface TradeInputBaseProps {
  marketId: string | number;
  onBuy?: (result: BuyResult) => void;
  onError?: (error: Error) => void;
}
```

`BinaryPanel`, `ShapeCutter`, and `CustomShapeEditor` implement the full contract. `TradePanel` and `BucketRangeSelector` accept `marketId` and `onBuy` but not `onError` (trade errors display inline only). `BucketTradePanel` delegates trading to its child `BucketRangeSelector`.

Every trading component follows the **three-phase trade pattern**:

| Phase | Timing | What Happens | Chart Effect |
|-------|--------|-------------|--------------|
| **1. Preview** | Instant (on every input change) | Generates belief via `generateBelief()` or convenience generator → writes `ctx.setPreviewBelief(belief)` | Dashed overlay appears on ConsensusChart |
| **2. Payout** | Debounced (500ms after last input change) | Calls `previewPayoutCurve()` → writes `ctx.setPreviewPayout(result)` | Payout column appears in chart tooltip |
| **3. Submit** | On button click | Calls `buy()` → resets inputs to defaults → clears preview state → calls `ctx.invalidate(marketId)` | Preview clears, all data hooks refetch |

All trading components clear `ctx.setPreviewBelief(null)` and `ctx.setPreviewPayout(null)` on unmount, ensuring charts never show stale previews.

**Exclusivity:** Only one trading component should be mounted at a time. Mounting multiple trading components simultaneously causes conflicting `previewBelief` and `previewPayout` writes to context.

---

#### `TradePanel`

The simplest parametric trading panel. Offers two belief shapes — Gaussian (bell curve) and Range (flat range) — with slider-based inputs.

```tsx
import { TradePanel } from '@functionspace/ui';
```

**CSS class:** `fs-trade-panel`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to trade on |
| `modes` | `('gaussian' \| 'range')[]` | `['gaussian', 'range']` | Which shape modes to offer. Tab bar hidden when only one mode. |
| `onBuy` | `(result: BuyResult) => void` | -- | Called after successful trade |

**Behavior:**

- **Gaussian mode:** "My Prediction" slider (L to H, step = range/100) + "Confidence" slider (0–100%). Confidence inversely maps to spread width: 0% = 20% of range (wide), 100% = 1% of range (narrow). Generates belief via `generateGaussian`.
- **Range mode:** Two-handle range slider for selecting an outcome range. Initializes to the middle 50% of the market range. Generates belief via `generateRange` with sharpness `1` (hard edges).
- **Amount input:** USDC input (minimum $1), default `'100'`. Displays debounced potential payout as `$X.XX`.
- **Post-trade reset:** All inputs revert to defaults (prediction to midpoint, confidence to 50, range to 25–75%, amount to '100').
- **Prediction passed to `buy()`:** In Gaussian mode, the slider value. In Range mode, the midpoint of the selected range.

**Context interactions:**

- **Reads:** `ctx.client`
- **Writes:** `ctx.setPreviewBelief(belief)` on input change, `ctx.setPreviewPayout(result)` after debounced preview, clears both on unmount
- **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useMarket`, `generateGaussian`, `generateRange`, `previewPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <TradePanel marketId={42} />
</FunctionSpaceProvider>
```

```tsx
<TradePanel
  marketId={42}
  modes={['gaussian']}
  onBuy={(result) => console.log('Position opened:', result.positionId)}
/>
```

**Related:** `ConsensusChart` (renders preview from this component's context writes) | `generateGaussian`, `generateRange` (core generators)

---

#### `BinaryPanel`

A simplified Yes/No trading interface. Users bet whether the outcome will be above or below a threshold value X. Renders a natural-language question: "Will {title} be more than {X}{units}?"

```tsx
import { BinaryPanel } from '@functionspace/ui';
```

**CSS class:** `fs-binary-panel`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to trade on |
| `xPoint` | `XPointMode` | `{ mode: 'variable' }` | How the threshold is determined (see below) |
| `yesColor` | `string` | `'#10b981'` | CSS color for the Yes button |
| `noColor` | `string` | `'#f43f5e'` | CSS color for the No button |
| `onBuy` | `(result: BuyResult) => void` | -- | Called after successful trade |
| `onError` | `(error: Error) => void` | -- | Called on trade failure |

**`XPointMode`:**

```typescript
type XPointMode =
  | { mode: 'static'; value: number }
  | { mode: 'variable'; initial?: number }
  | { mode: 'dynamic-mode'; allowOverride?: boolean }
  | { mode: 'dynamic-mean'; allowOverride?: boolean };
```

| Mode | Threshold Source | Editable? | Fallback |
|------|-----------------|-----------|----------|
| `static` | `value` (fixed) | Never | -- |
| `variable` | `initial` or market midpoint | Always | `(L + H) / 2` |
| `dynamic-mode` | Consensus mode (peak probability) via `computeStatistics` | Only if `allowOverride: true` | `(L + H) / 2` |
| `dynamic-mean` | Consensus mean via `computeStatistics` | Only if `allowOverride: true` | `(L + H) / 2` |

All resolved thresholds are clamped to `[L, H]`.

**Behavior:**

- **Yes:** Calls `generateRange(X, H, K, L, H, 1)` -- a hard-edged range from the threshold to the market high.
- **No:** Calls `generateRange(L, X, K, L, H, 1)` -- a hard-edged range from the market low to the threshold.
- **Side toggle:** Clicking an already-selected side deselects it. The amount input and submit button only appear after a side is chosen.
- **Default amount:** Hardcoded `'100'` USDC.
- **Post-trade reset:** Side resets to `null` (no selection), amount resets to `'100'`. Threshold persists.
- **Threshold formatting:** Displays with `market.decimals` precision, followed by `market.xAxisUnits`.
- **Loading/error states:** Renders "Loading..." or "Error: {message}" when market data is unavailable.

**Context interactions:**

- **Reads:** `ctx.client`
- **Writes:** `ctx.setPreviewBelief(belief)` on side/threshold change, `ctx.setPreviewPayout(result)` after debounced preview, clears both on unmount
- **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useMarket`, `generateRange`, `computeStatistics`, `previewPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <BinaryPanel marketId={42} />
</FunctionSpaceProvider>
```

```tsx
<BinaryPanel
  marketId={42}
  xPoint={{ mode: 'dynamic-mean', allowOverride: true }}
  onBuy={(result) => console.log('Position:', result.positionId)}
/>
```

**Related:** `ConsensusChart` (renders preview overlay) | `computeStatistics` (powers dynamic threshold tracking) | `XPointMode` (exported type)

---

#### `ShapeCutter`

A trading panel offering **8 distinct belief shape presets** with clickable SVG icon buttons. Adaptive parameter sliders change per shape.

```tsx
import { ShapeCutter } from '@functionspace/ui';
```

**CSS class:** `fs-shape-cutter`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to trade on |
| `shapes` | `ShapeId[]` | all 8 | Filter which shapes to offer |
| `defaultShape` | `ShapeId` | `'gaussian'` | Pre-selected shape |
| `onBuy` | `(result: BuyResult) => void` | -- | Called after successful trade |
| `onError` | `(error: Error) => void` | -- | Called on trade failure |

**Shape generators:**

| Shape | Generator | Key Parameters |
|-------|---------|----------------|
| Gaussian | `generateGaussian` | Target outcome, confidence |
| Spike | `generateGaussian` (with dynamic tighter multiplier) | Target outcome, confidence |
| Range | `generateRange` (sharpness `1`) | Range (two-handle slider) |
| Bimodal | `generateBelief` (two `PointRegion`s) | Range (peak positions), confidence, peak balance |
| The Dip | `generateDip` | Target outcome, confidence |
| Left Skew | `generateLeftSkew` | Target outcome, confidence, skew intensity |
| Right Skew | `generateRightSkew` | Target outcome, confidence, skew intensity |
| Uniform | `generateRange(L, H, ...)` (full range) | None |

**Behavior:**

- **Layout:** Left column (trade summary, adaptive parameter sliders) + right column (shape icon grid, labeled "Strategy Geometry"). Amount input and submit button are in a footer below both columns.
- **Adaptive sliders:** Three fixed slider slots use `visibility: hidden` to prevent layout shifts. Each shape activates a different combination — target outcome or range, confidence, and shape-specific controls (peak balance for bimodal, skew intensity for left/right skew).
- **Trade summary:** Displays prediction, payout potential, and max loss (equal to collateral).
- **Confidence-to-spread mapping:** 0% = 20% of range (wide), 100% = 1% of range (narrow). Spike shape uses an additional dynamic multiplier for ~20x more range sensitivity.
- **Post-trade reset:** All parameters revert to defaults. The selected shape persists.

**Context interactions:**

- **Reads:** `ctx.client`
- **Writes:** `ctx.setPreviewBelief(belief)` on input change, `ctx.setPreviewPayout(result)` after debounced preview, clears both on unmount
- **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useMarket`, `generateGaussian`, `generateRange`, `generateBelief`, `generateDip`, `generateLeftSkew`, `generateRightSkew`, `SHAPE_DEFINITIONS`, `previewPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <ShapeCutter marketId={42} />
</FunctionSpaceProvider>
```

```tsx
<ShapeCutter
  marketId={42}
  shapes={['gaussian', 'range', 'bimodal', 'dip']}
  defaultShape="bimodal"
  onBuy={(result) => console.log('Position:', result.positionId)}
/>
```

**Related:** `ConsensusChart` (renders preview overlay) | `SHAPE_DEFINITIONS` (shape metadata, icons) | `ShapeId` (exported type)

---

#### `CustomShapeEditor`

A chart-integrated trading panel where users **draw their belief directly** by dragging control points on a probability density chart. The most expressive trading component.

```tsx
import { CustomShapeEditor } from '@functionspace/ui';
```

**CSS class:** `fs-custom-shape`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to trade on |
| `defaultNumPoints` | `number` | `20` | Initial control point count (5–25) |
| `zoomable` | `boolean` | -- | Enable chart zoom/pan (control dots are excluded from pan triggers) |
| `onBuy` | `(result: BuyResult) => void` | -- | Called after successful trade |
| `onError` | `(error: Error) => void` | -- | Called on trade failure |

**Behavior:**

- **Chart area:** Embeds its own consensus chart (height 280px) rendering the consensus curve (background), user's belief curve (dashed), and optional selected position overlay from context. SVG control dots are positioned using Recharts axis scale functions for pixel-perfect alignment.
- **Drag interaction:** Control dots respond to mouse/touch drag events. Vertical movement maps to value (0–25). Global listeners are attached during drag for smooth tracking.
- **Vertical sliders:** A row of sliders below the chart mirrors the control points. Each slider can be dragged independently.
- **Locking:** Up to 2 control points can be locked, preventing edits. Locked dots display in the consensus color with a `not-allowed` cursor. Locks use FIFO — locking a third point drops the oldest lock.
- **Point count:** Adjustable slider (5–25). Changing the count resets all values to a bell shape and clears locks.
- **Y-axis capping:** Overlay curves (preview, selected position) are capped at 4x the consensus maximum density to prevent the consensus curve from being visually squished.
- **Loading/error states:** Renders "Loading..." or "Error: {message}" when market data is unavailable.
- **Trade form:** Between the chart and the vertical sliders, a trade summary section displays the current prediction, peak payout, and max loss (equal to collateral). Below the sliders, an amount input (default 100 USDC) and submit button complete the trade execution form — the same pattern as other trading widgets.
- **Post-trade reset:** Calls `resetToDefault()`, regenerating a bell shape and clearing locks.
- **Prediction:** The mode (peak) of the belief distribution is derived from `useCustomShape` (which internally uses `computeStatistics`) and passed to `buy()`.

**Context interactions:**

- **Reads:** `ctx.client`, `ctx.chartColors`, `ctx.selectedPosition` (renders belief overlay), `ctx.previewPayout` (tooltip data)
- **Writes:** `ctx.setPreviewBelief(belief)` on control value change, `ctx.setPreviewPayout(result)` after debounced preview, clears both on unmount
- **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useMarket`, `useConsensus`, `useCustomShape`, `evaluateDensityCurve`, `useChartZoom`, `rechartsPlotArea`, `previewPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <CustomShapeEditor marketId={42} zoomable />
</FunctionSpaceProvider>
```

```tsx
<CustomShapeEditor
  marketId={42}
  defaultNumPoints={15}
  onBuy={(result) => console.log('Position:', result.positionId)}
/>
```

**Related:** `useCustomShape` (hook managing control point state) | `ConsensusChart` (shares the same context reads for preview/position overlays) | `generateCustomShape` (core generator)

---

#### `BucketRangeSelector`

A bucket-click trading interface. Displays outcome ranges as a grid of selectable buttons with probability percentages.

```tsx
import { BucketRangeSelector } from '@functionspace/ui';
```

**CSS class:** `fs-bucket-range`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to trade on |
| `distributionState` | `DistributionState` | -- | External shared state (for syncing with `DistributionChart`). When omitted, creates its own via `useDistributionState`. |
| `defaultBucketCount` | `number` | `12` | Initial number of outcome buckets |
| `maxSelections` | `number` | `3` | Maximum simultaneously selected items (buckets + custom range combined) |
| `defaultAutoMode` | `boolean` | `false` | Start in auto mode (crops to 95% CI) |
| `showCustomRange` | `boolean` | `true` | Show custom min/max range input toggle |
| `onBuy` | `(result: BuyResult) => void` | -- | Called after successful trade |

**Behavior:**

- **Bucket grid:** Adaptive column layout — 3 columns for ≤9, 4 for ≤16, 5 for ≤25, 6 for >25. Each button shows the outcome range label and probability percentage. Clicking a selected bucket deselects it (toggle).
- **FIFO selection:** When `maxSelections` is reached, clicking a new bucket drops the oldest. Custom range selections count toward the max, reducing available bucket slots.
- **Auto mode:** Filters the grid to buckets within the 95% confidence interval (p2.5 to p97.5), focusing on active probability mass.
- **Custom range panel:** Collapsible inputs for min/max values with apply/clear buttons. Ranges are validated — out-of-bounds values are silently rejected (not clamped). Invalid inputs (NaN, min ≥ max, values outside the effective range) cause the apply action to do nothing.
- **Selection clearing:** Bucket selections reset automatically when bucket count or auto mode changes (because bucket boundaries shift).
- **Belief construction:** Generates belief via `generateRange` from the selected bucket and custom range boundaries.
- **Prediction:** The average midpoint of all selected ranges is passed to `buy()`.
- **Loading/error states:** Renders "Loading market data..." or "Error: {message}" when data is unavailable.

**Context interactions:**

- **Reads:** `ctx.client`
- **Writes:** `ctx.setPreviewBelief(belief)` on selection change, `ctx.setPreviewPayout(result)` after debounced preview, clears both on unmount
- **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useDistributionState`, `generateRange`, `previewPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <BucketRangeSelector marketId={42} />
</FunctionSpaceProvider>
```

```tsx
// Shared state with a DistributionChart
const distState = useDistributionState(marketId, { defaultBucketCount: 8 });
<DistributionChart marketId={42} distributionState={distState} />
<BucketRangeSelector marketId={42} distributionState={distState} maxSelections={4} />
```

**Related:** `DistributionChart` (sync via shared `DistributionState`) | `BucketTradePanel` (composite of both) | `useDistributionState` (hook)

---

#### `BucketTradePanel`

A composite component stacking `DistributionChart` on top of `BucketRangeSelector` with a **shared `DistributionState`**. Adjusting the bucket count slider in the chart automatically updates the selector grid.

```tsx
import { BucketTradePanel } from '@functionspace/ui';
```

**CSS class:** `fs-bucket-trade-panel`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to trade on |
| `defaultBucketCount` | `number` | `12` | Shared initial bucket count |
| `chartHeight` | `number` | `300` | Distribution chart height in pixels |
| `maxSelections` | `number` | -- | Forwarded to `BucketRangeSelector` |
| `defaultAutoMode` | `boolean` | -- | Forwarded to `BucketRangeSelector` |
| `showCustomRange` | `boolean` | -- | Forwarded to `BucketRangeSelector` |
| `onBuy` | `(result: BuyResult) => void` | -- | Forwarded to `BucketRangeSelector` |

**Behavior:**

- **Composition only:** Creates a `useDistributionState` and passes it to both children. Has no internal loading/error handling — both children manage their own states independently.
- **State sharing:** Bucket count changes in the chart's slider propagate to the selector grid through the shared `DistributionState`.

**Context interactions:** None directly. All context interaction is delegated to `DistributionChart` and `BucketRangeSelector`.

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <BucketTradePanel marketId={42} defaultBucketCount={8} chartHeight={250} />
</FunctionSpaceProvider>
```

**Related:** `DistributionChart`, `BucketRangeSelector`, `useDistributionState`

---

### Charts

All chart components use a two-tier internal architecture: a **Content** sub-component (receives pre-fetched data, used by `MarketCharts`) and a **Standalone** wrapper (handles its own loading/error states and renders a header). Chart colors are always read from `ctx.chartColors` (concrete hex values for Recharts SVG rendering), never from CSS variables.

---

#### `MarketCharts`

Tabbed container housing up to three chart views in one panel. The highest-level chart widget.

```tsx
import { MarketCharts } from '@functionspace/ui';
```

**CSS class:** `fs-chart-container`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to display |
| `height` | `number` | `300` | Chart height in pixels |
| `views` | `ChartView[]` | `['consensus']` | Which views to show: `'consensus'`, `'distribution'`, `'timeline'` |
| `overlayCurves` | `OverlayCurve[]` | -- | Additional density curves to overlay on the consensus view |
| `defaultBucketCount` | `number` | `12` | Starting bucket count for the distribution view |
| `distributionState` | `DistributionState` | -- | External shared bucket state for the distribution view |
| `zoomable` | `boolean` | -- | Enable zoom/pan on consensus and timeline views |

**`ChartView`:** `'consensus' | 'distribution' | 'timeline'`

**`OverlayCurve`:**

```typescript
interface OverlayCurve {
  id: string;                              // Unique identifier
  label: string;                           // Legend label
  curve: Array<{ x: number; y: number }>; // Density curve points
  color?: string;                          // Stroke/fill color (defaults to chartColors.payout)
}
```

**Behavior:**

- **Tab bar:** Renders only when multiple views are configured. Tab labels: "Consensus", "Distribution", "Timeline".
- **State persistence:** Bucket count and time filter persist across tab switches (state lives in `MarketCharts`, not in children).
- **Header:** Displays market title and a dynamic subtitle that changes to "Compare market consensus with your trade preview" when `ctx.previewBelief` is set (default: "Current market probability density").
- **Loading/error:** Fetches consensus data directly (`useConsensus` at 100 points) for loading/error state management. Content sub-components may fetch additional data independently (e.g., `TimelineChartContent` fetches history only when its tab is active).

**Context interactions:**

- **Reads:** `ctx.previewBelief` (subtitle text only)

**Internal calls:** `useMarket`, `useConsensus`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketCharts marketId={42} views={['consensus', 'distribution', 'timeline']} zoomable />
</FunctionSpaceProvider>
```

```tsx
<MarketCharts marketId={42} height={400} views={['consensus']} overlayCurves={[{
  id: 'my-model',
  label: 'My Model',
  curve: modelPoints,
  color: '#ff6600',
}]} />
```

**Related:** `ConsensusChart`, `DistributionChart`, `TimelineChart` (inner content components) | `useDistributionState` (for shared bucket state)

---

#### `ConsensusChart`

Standalone probability density chart. Automatically overlays trade preview and selected position curves from context — no prop wiring needed.

```tsx
import { ConsensusChart } from '@functionspace/ui';
```

**CSS class:** `fs-chart-container`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to visualize |
| `height` | `number` | `300` | Chart height in pixels |
| `overlayCurves` | `OverlayCurve[]` | -- | Additional density curves (same type as `MarketCharts`) |
| `zoomable` | `boolean` | -- | Enable scroll-wheel zoom and drag-to-pan |

**Renders (bottom to top):**

1. **Consensus area** — `type="monotone"`, solid stroke, gradient fill (40% → 5% opacity). No animation.
2. **Trade preview area** — `type="linear"` (sharp edges for shape accuracy), dashed stroke (5 5), gradient fill, 300ms animation. Appears when any trading component writes `ctx.previewBelief`.
3. **Selected position area** — `type="monotone"`, solid stroke, gradient fill, 300ms animation. Appears when a `PositionTable` row is clicked.
4. **Payout data** — Invisible area on a hidden right Y-axis (tooltip only). Shows "Potential Payout: $X.XX" in tooltip when payout data exists.
5. **Overlay curves** — `type="monotone"`, custom colors, gradient fills, 300ms animation.

**Behavior:**

- **Y-axis capping:** When preview or position overlay curves exceed the consensus maximum, the Y-domain caps overlay influence at 4x the consensus max to prevent the consensus curve from being visually squished.
- **Payout matching:** Payout preview data is matched to chart X points via nearest-neighbor within 2 steps. Points outside this range show no payout value.
- **Custom tooltip:** Color-coded rows for each active data series (consensus, preview, selected position, payout, overlays). Cursor renders as a dashed crosshair.
- **Legend:** Auto-generated from active data series with matching colors. The payout series is excluded from the legend (`legendType="none"`) even when payout data exists.
- **Loading/error:** Renders "Loading consensus data..." or "Error: {message}" inline.

**Context interactions:**

- **Reads:** `ctx.previewBelief` (preview curve), `ctx.selectedPosition` (position curve), `ctx.previewPayout` (tooltip data), `ctx.chartColors` (all rendering colors)
- **Writes:** None

**Internal calls:** `useMarket`, `useConsensus`, `evaluateDensityCurve`, `useChartZoom`, `rechartsPlotArea`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <ConsensusChart marketId={42} height={400} zoomable />
</FunctionSpaceProvider>
```

**Related:** Any trading component (writes `previewBelief`/`previewPayout` that this chart reads) | `PositionTable` (writes `selectedPosition`) | `useChartZoom` (zoom/pan hook)

---

#### `DistributionChart`

Horizontal bar chart showing probability mass by outcome bucket. Includes an interactive bucket count slider (range 2–50).

```tsx
import { DistributionChart } from '@functionspace/ui';
```

**CSS class:** `fs-chart-container`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to display |
| `height` | `number` | `300` | Chart height in pixels |
| `defaultBucketCount` | `number` | `12` | Initial bucket count (2–50) |
| `distributionState` | `DistributionState` | -- | External shared state. When provided, the chart's bucket count slider controls the shared state. |

**Renders:**

- **Sub-header:** Title "Aggregate Distribution", subtitle with bucket count, and interactive range slider (2–50).
- **Horizontal bar chart:** Vertical layout (`BarChart layout="vertical"`). Each bar represents one outcome bucket. Bars use `chartColors.consensus` with the peak bucket at full opacity (1.0) and others at 0.8. Percentage labels render to the right of each bar.
- **Custom tooltip:** Shows "Range: {range} {units}" and "Probability: {percentage}%". Units suffix is only displayed when `market.xAxisUnits` is truthy.

**Behavior:**

- **Smart bucket decimals:** Bucket range labels automatically use integer formatting when bucket width ≥ 1, or `market.decimals` precision for narrow buckets.
- **Bucket count slider:** Allows interactive adjustment (2–50). When `distributionState` is provided, the slider controls the shared state; otherwise it controls internal state.
- **Loading/error:** Renders "Loading consensus data..." or "Error: {message}" inline.

**Context interactions:**

- **Reads:** `ctx.chartColors` (bar fill, grid, axis, tooltip colors)
- **Writes:** None

**Internal calls:** `useMarket`, `useConsensus`, `calculateBucketDistribution`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <DistributionChart marketId={42} height={250} defaultBucketCount={8} />
</FunctionSpaceProvider>
```

**Related:** `BucketRangeSelector` (sync via shared `DistributionState`) | `BucketTradePanel` (composite) | `calculateBucketDistribution` (core math)

---

#### `TimelineChart`

Fan chart showing consensus evolution over time with nested confidence interval bands.

```tsx
import { TimelineChart } from '@functionspace/ui';
```

**CSS class:** `fs-chart-container`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to display |
| `height` | `number` | `300` | Chart height in pixels |
| `zoomable` | `boolean` | -- | Enable scroll-wheel zoom and drag-to-pan |

**Renders:**

- **Four nested confidence bands** (rendered widest first so narrower bands paint on top): 95% CI (p2.5–p97.5), 75% CI (p12.5–p87.5), 50% CI (p25–p75), 25% CI (p37.5–p62.5). All use `chartColors.fanBands.*` colors.
- **Mean line:** Solid stroke on top of all bands, using `chartColors.fanBands.mean`.
- **Time filter buttons:** All / 24h / 7d / 30d. Changing the filter resets any active zoom state.
- **Interactive legend:** Band entries are clickable toggles to show/hide individual bands. The mean line entry is not toggleable.
- **End-of-series annotation:** Displays the most recent mean value, positioned at the chart's right edge.
- **Custom tooltip:** Shows date/time, mean, median (p50), 50% CI range, and 95% CI range, all formatted to `market.decimals` precision.

**Behavior:**

- **Split data fetching:** The standalone wrapper loads market data; the content component (`TimelineChartContent`) always fetches history via `useMarketHistory` when mounted. The "only when visible" optimization is implemented by callers (e.g., `MarketCharts` conditionally renders `TimelineChartContent` only when the timeline tab is active).
- **Synthetic flat-line:** When only 1 history snapshot exists, a synthetic second point at the current timestamp creates a visible flat line.
- **Extend to now:** The last data point is always extended to `Date.now()`, ensuring the chart shows current-time coverage.
- **Zoom Y-domain adaptation:** When zoomed in, the Y-axis recalculates from the visible data's band95 range, providing auto-fitting vertical bounds.
- **X-axis formatting:** Uses time format (HH:MM) for the 24h filter, date format (Mon Day) for longer ranges.
- **Loading/error:** Two-level: "Loading market data..." from the standalone wrapper, then "Loading history data..." from the content component. Empty state shows "No history data available for this time range".

**Context interactions:**

- **Reads:** `ctx.chartColors` (fan band colors, grid, axis, crosshair)
- **Writes:** None

**Internal calls:** `useMarket`, `useMarketHistory`, `transformHistoryToFanChart`, `useChartZoom`, `rechartsPlotArea`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <TimelineChart marketId={42} height={500} zoomable />
</FunctionSpaceProvider>
```

**Related:** `transformHistoryToFanChart` (core math) | `useMarketHistory` (data hook) | `computePercentiles` (powers the band calculations)

---

### Positions

---

#### `PositionTable`

Paginated data table for viewing and managing positions. Supports three tab views, real-time market value lookup via `previewSell`, inline sell actions, and row selection that coordinates with chart overlays.

```tsx
import { PositionTable } from '@functionspace/ui';
```

**CSS class:** `fs-table-container`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to display positions for |
| `username` | `string` | required | Authenticated username (filters positions and enables "(you)" highlighting) |
| `tabs` | `PositionTabId[]` | `['open-orders', 'trade-history']` | Which tabs to show. Tab bar hidden when only one tab. |
| `pageSize` | `number` | `20` | Rows per page |
| `selectedPositionId` | `number \| null` | -- | Controlled selection: externally managed selected position ID |
| `onSelectPosition` | `(id: number \| null) => void` | -- | Controlled selection callback. When provided, row clicks call this instead of writing to `ctx.setSelectedPosition`. |
| `onSell` | `(result: SellResult) => void` | -- | Called after successful sell |

**Tabs and columns:**

| Tab ID | Label | Columns |
|--------|-------|---------|
| `open-orders` | Open Orders | ID, Timestamp, Status, Prediction, Cost, Market Value, P/L, P/L%, Actions |
| `trade-history` | Trade History | ID, Timestamp, Status, Prediction, Cost, Sold Value, P/L, P/L%, Resolution Payout |
| `market-positions` | Market Positions | ID, Timestamp, Owner, Status, Prediction, Cost, Sold Value, Market Value, P/L |

**Behavior:**

- **Row selection (two modes):**
  - **Uncontrolled** (no `onSelectPosition`): Clicking a row writes the position to `ctx.setSelectedPosition`, causing `ConsensusChart` to render the position's belief as a colored overlay. Clicking the selected row again deselects it.
  - **Controlled** (`onSelectPosition` provided): Clicking a row calls `onSelectPosition(id)`. Selection state is determined by the `selectedPositionId` prop, falling back to `ctx.selectedPosition?.positionId` when `selectedPositionId` is not provided.
- **Per-tab pagination:** Each tab maintains its own page number independently. Pages auto-reset to 1 when tab data count changes.
- **Market value lookup:** For visible open positions (current page only), `previewSell` is called via `Promise.allSettled` for resilient fetching. Values are cached and update when the page changes.
- **Sell flow:** The "Sell" button (open-orders tab, open positions only) calls `sell()`, then `ctx.invalidate(marketId)` and `refetch()`. Shows "Selling..." during the operation. Sell errors display as a banner above the table.
- **P/L calculation (priority order):** 1) Sold/closed positions with a non-null `soldPrice`: `soldPrice - collateral`. 2) Any remaining position with a non-null `settlementPayout`: `settlementPayout - collateral`. 3) Open positions: `marketValue - collateral` (from `previewSell`). Note: sold/closed positions with a `soldPrice` always use path 1, even if they also have a `settlementPayout`. P/L% = `(P/L / collateral) * 100`.
- **Owner highlighting:** In the `market-positions` tab, the authenticated user's rows show "(you)" next to the username.
- **Sorting:** All tab data is sorted by position ID descending.
- **Loading/error:** Renders a spinner with "Loading positions..." or an error message with a "Retry" button. Empty states show contextual messages per tab.

**Context interactions:**

- **Reads:** `ctx.client`, `ctx.selectedPosition?.positionId` (for uncontrolled selection highlighting)
- **Writes:** `ctx.setSelectedPosition(position | null)` (uncontrolled mode only)
- **Triggers:** `ctx.invalidate(marketId)` after successful sell

**Internal calls:** `usePositions`, `previewSell`, `sell`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <PositionTable marketId={42} username="trader1" />
</FunctionSpaceProvider>
```

```tsx
<PositionTable
  marketId={42}
  username="trader1"
  tabs={['open-orders', 'trade-history', 'market-positions']}
  pageSize={10}
  onSell={(result) => console.log('Sold, returned:', result.collateralReturned)}
/>
```

**Related:** `ConsensusChart` (reads `selectedPosition` for overlay) | `usePositions` (data hook) | `previewSell`, `sell` (core functions)

---

#### `TimeSales`

Live scrollable feed of recent market trades with automatic polling.

```tsx
import { TimeSales } from '@functionspace/ui';
```

**CSS class:** `fs-time-sales`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to display trades for |
| `maxHeight` | `string` | `'500px'` | Scrollable container max-height |
| `limit` | `number` | `100` | Maximum trades to fetch |
| `pollInterval` | `number` | `5000` | Polling interval in ms (0 to disable) |
| `showFooter` | `boolean` | `true` | Show "Recent Trades" footer with count badge |
| `emptyMessage` | `string` | `'No market activity yet'` | Custom empty state text |

**Renders:**

- **Header:** "Time & Sales" heading.
- **Table columns:** UTC Date/Time, Prediction, Amount, User.
- **Color-coded rows:** Green (`fs-trade-buy`) for buys, red (`fs-trade-sell`) for sells.
- **Footer:** "Recent Trades" label with count badge. Only visible when `showFooter` is `true` and trades exist.

**Behavior:**

- **Polling:** Automatically refetches every `pollInterval` ms via `useTradeHistory`. Also responds to `ctx.invalidate()` — calling invalidate after a buy/sell triggers an immediate refetch in addition to the regular polling cycle.
- **Graceful background refresh:** After the initial load succeeds, subsequent poll failures are silent — the UI never regresses to a loading or error state while stale data remains visible.
- **Username truncation:** Usernames longer than 12 characters are truncated to `first8...last4`. Null usernames show "Unknown".
- **Prediction formatting:** Shows `prediction.toFixed(2)` or "N/A" when null.
- **Currency formatting:** Dollar sign prefix with 2 decimal places, locale-aware.
- **Loading/error:** Initial-only: "Loading trades..." with spinner, or error message with "Retry" button. Both only display before first successful fetch.

**Context interactions:** Data fetching is delegated to `useTradeHistory`, which reads `ctx.client` and responds to `ctx.invalidationCount` changes (triggering refetches on invalidation).

**Internal calls:** `useTradeHistory` (with `pollInterval`)

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <TimeSales marketId={42} />
</FunctionSpaceProvider>
```

```tsx
<TimeSales marketId={42} maxHeight="300px" limit={50} pollInterval={10000} />
```

**Related:** `useTradeHistory` (data hook with polling support)

---

### Market & Auth

---

#### `MarketStats`

Horizontal stats bar showing key market metrics. Display-only with no user interactions.

```tsx
import { MarketStats } from '@functionspace/ui';
```

**CSS class:** `fs-stats-bar`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `marketId` | `string \| number` | required | Market to display stats for |

**Displays:**

| Stat | Source | Format |
|------|--------|--------|
| Total Volume | `market.totalVolume` | `$` + locale-formatted integer |
| Current Liquidity | `market.poolBalance` | `$` + locale-formatted integer |
| Open Positions | `market.positionsOpen` | Integer |
| Market Status | `market.resolutionState` | `'open'` → "Active", all others → "Resolved" |

**Behavior:**

- **Loading state:** Per-stat skeleton placeholders (labels still visible, only values show shimmer).
- **Error state:** Per-stat inline "Error" text in the negative color.
- **Status CSS classes:** Market status value receives `status-active` (when state is `'open'`) or `status-resolved` (all other states, including when market data is undefined) class for conditional styling. Note: when market data is null (briefly during loading), the displayed text falls back to "Active" while the CSS class is `status-resolved` — this mismatch is cosmetic since skeleton placeholders hide the text during loading.

**Context interactions:** None directly. All context access is delegated to `useMarket`.

**Internal calls:** `useMarket`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketStats marketId={42} />
</FunctionSpaceProvider>
```

**Related:** `useMarket` (data hook)

---

#### `AuthWidget`

Self-contained authentication widget handling login, signup, and logout flows across four visual states.

```tsx
import { AuthWidget } from '@functionspace/ui';
```

**CSS class:** `fs-auth-widget`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `requireAccessCode` | `boolean` | `false` | Show access code field on the signup form |
| `onLogin` | `(user: UserProfile) => void` | -- | Called after successful login |
| `onSignup` | `(user: UserProfile) => void` | -- | Called after successful signup |
| `onLogout` | `() => void` | -- | Called after logout |

**States:**

| State | Renders | Transitions To |
|-------|---------|----------------|
| **Idle** | "Sign In" and "Sign Up" buttons | Login form, Signup form |
| **Login form** | Username + password fields, "Log In" submit, "Cancel", "Don't have an account? Sign up" link | Idle (cancel/success), Signup form (link), Authenticated (success) |
| **Signup form** | Username + password + confirm password + optional access code, "Create Account" submit, "Cancel", "Already have an account? Log in" link | Idle (cancel/success), Login form (link), Authenticated (success) |
| **Authenticated** | Wallet balance (`$X.XX`), username, "Sign Out" button | Idle (sign out) |

**Behavior:**

- **Form validation:**
  - Username validated on blur and signup submit via `validateUsername()` (3–32 chars, alphanumeric + `.` `-` `_`). Not called on login form submit. Inline error displays below the input.
  - Password minimum: 6 characters. Confirm password must match.
  - Access code field shown when `requireAccessCode` is `true`, but is not enforced — users can leave it blank.
- **Loading UX:** All inputs and buttons are disabled during auth operations. Submit button text changes to "Logging in..." or "Creating account...".
- **Error handling:** The widget manages its own `formError` state from caught exceptions rather than using `useAuth().error`. Form errors display in a dedicated error area.
- **Form reset:** All fields and errors clear on every view transition (cancel, switch forms, success).
- **Signup flow:** After successful `signup()`, resets the form and switches view. Does NOT automatically call `login()` — the user must log in separately.

**Context interactions:**

- **Reads (via `useAuth`):** `user`, `isAuthenticated`, `loading`
- **Writes (via `useAuth`):** `login()`, `signup()`, `logout()` — these manage token lifecycle, user profile, and invalidation counter on the Provider context.

**Internal calls:** `useAuth`, `validateUsername`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <AuthWidget />
</FunctionSpaceProvider>
```

```tsx
<AuthWidget
  requireAccessCode
  onLogin={(user) => console.log('Welcome', user.username)}
  onLogout={() => console.log('Signed out')}
/>
```

**Related:** `useAuth` (hook) | `validateUsername` (core utility) | `UserProfile` (type)

---

#### `PasswordlessAuthWidget`

Modal-based passwordless authentication widget. Users sign in or sign up with just a username. Password-protected accounts are directed to an admin login form within the modal.

```tsx
import { PasswordlessAuthWidget } from '@functionspace/ui';
```

**CSS class:** `fs-passwordless-auth`

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `requireAccessCode` | `boolean` | `false` | Show access code field on the admin signup form |
| `onLogin` | `(user: UserProfile, action: 'login' \| 'signup') => void` | -- | Called after successful passwordless login or auto-signup |
| `onSignup` | `(user: UserProfile) => void` | -- | Called after successful admin signup |
| `onLogout` | `() => void` | -- | Called after logout |

**States:**

| State | Renders | Transitions To |
|-------|---------|----------------|
| **Idle** | "Sign In / Sign Up" button | Passwordless form (click) |
| **Passwordless form** | Username field + submit + "Admin Login" link | Idle (cancel/success), Admin login (link) |
| **Admin login** | Username + password fields, navigation links | Idle (cancel/success), Passwordless (link), Admin signup (link) |
| **Admin signup** | Username + password + confirm + optional access code | Idle (cancel/success), Admin login (link) |
| **Authenticated** | Wallet balance (`$X.XX`), username, "Sign Out" button | Idle (sign out) |

**Behavior:**

- **Passwordless flow:** Submitting a username calls `passwordlessLogin()`. If the user exists without a password, they log in. If the user doesn't exist, an account is auto-created. If the account requires a password, the `PASSWORD_REQUIRED` error is caught and displayed with a prompt to use Admin Login.
- **Silent re-auth:** When `storedUsername` is passed to `FunctionSpaceProvider`, the provider attempts `silentReAuth` on mount. If the stored account requires a password, `showAdminLogin` becomes `true` and the widget auto-opens the admin login form with the username pre-filled.
- **Admin login:** Standard username + password authentication through `login()` from `useAuth()`.
- **Admin signup:** Standard username + password + confirm signup through `signup()` from `useAuth()`.
- **Modal:** Opens on button click, closes on cancel, success, or Escape key.
- **Loading UX:** Inputs and buttons disabled during auth operations. Submit button text changes to "Signing in...", "Logging in...", or "Creating account...".
- **Error handling:** Widget manages its own `formError` state. Form errors display in a dedicated error area.
- **Form reset:** All fields and errors clear on every view transition.

**Context interactions:**

- **Reads (via `useAuth`):** `user`, `isAuthenticated`, `loading`, `showAdminLogin`, `pendingAdminUsername`
- **Writes (via `useAuth`):** `passwordlessLogin()`, `login()`, `signup()`, `logout()`, `clearAdminLogin()`

**Internal calls:** `useAuth`, `validateUsername`, `PASSWORD_REQUIRED`

**Example:**

```tsx
<FunctionSpaceProvider
  config={{ baseUrl: 'https://your-api.example.com' }}
  theme="fs-dark"
  storedUsername={localStorage.getItem('fs-username')}
>
  <PasswordlessAuthWidget
    onLogin={(user, action) => localStorage.setItem('fs-username', user.username)}
    onLogout={() => localStorage.removeItem('fs-username')}
  />
</FunctionSpaceProvider>
```

**Related:** `useAuth` (hook) | `PASSWORD_REQUIRED` (constant) | `PasswordlessLoginResult` (type) | `AuthWidget` (password-based alternative)

---

### Settlement

> **Coming Soon.** No settlement-specific UI components are currently available. The `PositionTable` displays `settlementPayout` values when positions have been settled, but there is no dedicated settlement workflow widget yet.

---

## Composition

The SDK is designed around **composition through context**. Any combination of UI components works together automatically when placed inside the same `FunctionSpaceProvider` — no prop-passing, no manual wiring, no event bus.

### How Components Communicate

```
FunctionSpaceProvider
├── ctx.previewBelief    ← written by any trading widget
│                         → read by ConsensusChart (shows preview overlay)
├── ctx.previewPayout    ← written by any trading widget (debounced)
│                         → read by ConsensusChart tooltip (shows payout data)
├── ctx.selectedPosition ← written by PositionTable (row click)
│                         → read by ConsensusChart / CustomShapeEditor (shows position overlay)
└── ctx.invalidate(marketId) ← called after buy/sell
                          → triggers all data hooks to re-fetch
```

### Composability Rules

1. **Any chart + any trade panel = working preview.** Place a `ConsensusChart` and a `TradePanel` in the same provider tree. Moving sliders on the trade panel instantly shows a dashed preview curve on the chart.

2. **Any chart + `PositionTable` = position visualization.** Clicking a position row highlights that position's belief on the chart.

3. **Any trade panel can stand alone.** Each trading widget handles its own loading, error states, and submission. You can use a `ShapeCutter` without any chart.

4. **Charts can stand alone.** A `ConsensusChart` without a trade panel simply shows the market consensus — no preview overlay.

5. **`DistributionState` syncs chart and selector.** Pass the same `useDistributionState()` result to both `MarketCharts` (or `DistributionChart`) and `BucketRangeSelector`. Changing the bucket count in one updates the other.

6. **Mix and match freely — with one constraint.** Want a `TimelineChart` above a `BinaryPanel`? A `ConsensusChart` next to a `CustomShapeEditor`? A `MarketStats` bar above a `BucketTradePanel`? All valid. All automatic. **However, only one trading component should be mounted at a time.** Mounting multiple trading components simultaneously causes conflicting `previewBelief` and `previewPayout` writes to context, resulting in flickering previews.

### Composition Examples

**Minimal: Chart only**
```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <ConsensusChart marketId={1} height={400} />
</FunctionSpaceProvider>
```

**Standard: Chart + Trade Panel**
```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <div style={{ display: 'flex' }}>
    <ConsensusChart marketId={1} height={500} zoomable />
    <TradePanel marketId={1} />
  </div>
</FunctionSpaceProvider>
```

**Full: Stats + Chart + Trade + Positions**
```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketStats marketId={1} />
  <AuthWidget />
  <div style={{ display: 'flex' }}>
    <MarketCharts marketId={1} views={['consensus', 'distribution', 'timeline']} zoomable />
    <ShapeCutter marketId={1} />
  </div>
  <PositionTable marketId={1} username={user.username} />
</FunctionSpaceProvider>
```

**Distribution Trading: Synced chart + bucket selector**
```tsx
function DistRangeLayout({ marketId }) {
  const distState = useDistributionState(marketId);
  return (
    <FunctionSpaceProvider config={config} theme="fs-dark">
      <MarketCharts marketId={marketId} views={['consensus', 'distribution']} distributionState={distState} />
      <BucketRangeSelector marketId={marketId} distributionState={distState} />
    </FunctionSpaceProvider>
  );
}
```

### Three-Phase Trade Pattern

Every trading widget follows the same execution pattern:

| Phase | Timing | What Happens | Chart Effect |
|-------|--------|-------------|--------------|
| **1. Preview** | Instant (on every input change) | `generateBelief()` → `ctx.setPreviewBelief(belief)` | Dashed overlay appears on consensus chart |
| **2. Payout** | Debounced (500ms after last change) | `previewPayoutCurve()` → `ctx.setPreviewPayout(result)` | Payout column appears in chart tooltip |
| **3. Submit** | On button click | `buy()` → `ctx.invalidate(marketId)` | Preview clears, all data refreshes |

This pattern ensures responsive feedback (phase 1 is synchronous) while avoiding excessive API calls (phase 2 is debounced).

---

## Starter Kits

The demo app includes six starter kit layouts, each demonstrating a different composition of SDK components for a distinct trading experience. Every starter kit wraps widgets in a simulated editorial article page context, showing how SDK widgets embed into real content.

---

### Quick Start: Minimal Integration

The fastest way to get trading widgets running. The demo app separates config from layout — `App.tsx` exports shared configuration, and layout files (e.g., `App_BasicTradingLayout.tsx`) define the component composition. You can also combine both into a single file as shown below.

> **Environment variables:** The demo app reads `VITE_FS_BASE_URL`, `VITE_FS_USERNAME`, `VITE_FS_PASSWORD`, `VITE_FS_MARKET_ID`, and `VITE_FS_AUTO_AUTH` from a `.env` file. Replace the hardcoded values below with your own or use environment variables.

**Standalone example** — Config + layout in one file. Drop this into any React app to get started.

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';
import type { FSThemeInput } from '@functionspace/react';
import { ConsensusChart, TradePanel, PositionTable, MarketStats, AuthWidget } from '@functionspace/ui';

const config = {
  baseUrl: 'https://your-api-url.com',
  username: 'your-username',          // optional — omit for manual auth via AuthWidget
  password: 'your-password',          // optional — omit for manual auth via AuthWidget
  autoAuthenticate: true,             // auto-login on mount when username/password provided
};

const MARKET_ID = 'your-market-id';
const theme: FSThemeInput = 'fs-dark';  // or 'fs-light', 'native-dark', 'native-light', or custom overrides

export default function App() {
  return (
    <FunctionSpaceProvider config={config} theme={theme}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
        <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ flex: 7, minWidth: 0 }}>
          <ConsensusChart marketId={MARKET_ID} height={500} zoomable />
        </div>
        <div style={{ flex: 3, minWidth: 0 }}>
          <TradePanel marketId={MARKET_ID} />
        </div>
      </div>

      <PositionTable marketId={MARKET_ID} username={config.username ?? ''} />
    </FunctionSpaceProvider>
  );
}
```

**`main.tsx`** — Standard React entry point. No SDK-specific code.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

That's it. The `FunctionSpaceProvider` handles authentication, theming, and cross-component state. All widgets inside it work automatically.

To use a different layout, replace the component block inside `FunctionSpaceProvider` with any of the starter kit compositions below.

---

### Basic Trading Layout

**File:** `demo-app/src/App_BasicTradingLayout.tsx`

The canonical full-featured layout. Side-by-side chart and trade panel with position management below.

**Components:** `MarketStats` + `AuthWidget` (header row) → `ConsensusChart` + `TradePanel` (7:3 split) → `PositionTable`

**What it enables:** Users read the article, see the aggregate market forecast on the consensus chart, form a view using Gaussian or Range shapes, watch their preview overlay in real-time, submit a trade, then manage positions in the table below. Clicking a position row highlights it on the chart.

**Target audience:** General-purpose. The recommended default for most integrations.

---

### Binary Panel

**File:** `demo-app/src/App_BinaryPanel.tsx`

Demonstrates the `BinaryPanel` in all four threshold modes simultaneously (static, variable, dynamic-mode, dynamic-mean), paired with a tabbed chart.

**Components:** `MarketStats` + `AuthWidget` → `MarketCharts` (consensus + distribution tabs) → 4x `BinaryPanel` (2x2 grid) → `PositionTable`

**What it enables:** The simplest possible trading UX. Users answer "Will X be more than Y?" — a familiar binary yes/no question. The chart provides context; the four panels demonstrate different threshold strategies.

**Target audience:** Casual users, non-financial audiences. Maximum accessibility.

---

### Custom Shape Layout

**File:** `demo-app/src/App_CustomShapeLayout.tsx`

The drag-to-draw belief editor for maximum expressiveness.

**Components:** `MarketStats` + `AuthWidget` → `CustomShapeEditor` (full width, zoomable) → `PositionTable`

**What it enables:** Users sculpt arbitrary probability distributions by dragging control points directly on the chart. Lock specific points, adjust resolution (5–25 control points), and see the belief curve update in real-time. The editor embeds its own consensus chart — no separate chart component needed.

**Target audience:** Advanced traders, quantitative analysts. Highest friction, highest expressiveness.

---

### Distribution Range

**File:** `demo-app/src/App_DistRange.tsx`

Trading against discrete probability buckets — the most approachable interface for range-based thinking.

**Components:** `MarketStats` + `AuthWidget` → `MarketCharts` (consensus + distribution tabs, with shared `distributionState`) → `BucketRangeSelector` (with shared `distributionState`)

**What it enables:** Users see probability mass per outcome range as a bar chart, then click bucket buttons to compose a bet. "I think there's a 40% chance it's between 48M and 52M" becomes a few button clicks. The chart's bucket count slider and the selector grid stay perfectly in sync through shared `useDistributionState`.

**Key pattern:** `useDistributionState` is called in the inner component and passed to both `MarketCharts` and `BucketRangeSelector` — demonstrating cross-component state sharing.

**Target audience:** Users who think in ranges rather than specific numbers. Compact layout suitable for sidebars.

---

### Shape Cutter Trading Layout

**File:** `demo-app/src/App_ShapeCutterTradingLayout.tsx`

The 8-preset shape selector with a three-tab chart. The middle ground between TradePanel and CustomShapeEditor.

**Components:** `MarketStats` + `AuthWidget` → `MarketCharts` (consensus + distribution + timeline tabs, zoomable) → `ShapeCutter` → `PositionTable`

**What it enables:** Users choose from 8 belief geometries (Gaussian, Spike, Range, Bimodal, Dip, Left Skew, Right Skew, Uniform), tune parameters with sliders, and see their shape previewed on the consensus chart in real-time. The timeline tab shows historical consensus evolution — how stable or volatile the market has been.

**Target audience:** Intermediate traders who want expressive shapes without drag-and-drop complexity.

---

### Timeline Binary Trading Layout

**File:** `demo-app/src/App_TimelineBinaryTradingLayout.tsx`

The simplest layout: historical fan chart + binary yes/no bet.

**Components:** `MarketStats` + `AuthWidget` → `TimelineChart` (500px, zoomable) → `BinaryPanel` (dynamic-mean mode)

**What it enables:** Users see how the market's center of gravity has moved over time (fan chart with confidence bands), then make a simple above/below bet against the current consensus mean. The threshold auto-updates as the mean shifts.

**Target audience:** Casual users, first-time participants. Visually compelling (the fan chart looks like a stock chart with uncertainty bands), immediately actionable (yes/no question). The closest the SDK gets to a traditional prediction market interface.

---

### Starter Kit Summary

| Starter Kit | Complexity | Trading Input | Chart Views | Position Table | Best For |
|-------------|-----------|---------------|-------------|----------------|----------|
| Basic Trading | Medium | Gaussian / Range | Consensus | Yes | General purpose |
| Binary Panel | Low | Yes / No | Consensus + Distribution | Yes | Casual users |
| Custom Shape | High | Drag control points | Embedded in editor | Yes | Power users |
| Distribution Range | Medium | Click buckets | Consensus + Distribution | No | Range thinkers |
| Shape Cutter | Medium-High | 8 preset shapes | Consensus + Distribution + Timeline | Yes | Intermediate traders |
| Timeline Binary | Low | Yes / No | Timeline (fan chart) | No | First-time users |
