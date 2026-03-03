# SDK v1.0 Documentation Fact-Check Findings

**Date:** 2026-03-03
**Document reviewed:** `sdk_docs_v1.0.md` (3,545 lines)
**Source files checked:** 60 files across `packages/core/`, `packages/react/`, `packages/ui/`
**Agents dispatched:** 49 parallel fact-checking agents
**Method:** Each agent read specific doc line ranges + corresponding source files and verified every factual claim (function signatures, parameter names/types/defaults, return types, behavior, context interactions)
**Status:** All HIGH and MEDIUM issues have been resolved in `sdk_docs_v1.0.md`. LOW issues remain for future cleanup.

## Executive Summary

| Severity | Count |
|----------|-------|
| **HIGH** | 5 |
| **MEDIUM** | 8 |
| **LOW** | ~18 |
| **PASS** | ~500+ individual claims verified |

The documentation is broadly accurate -- types, interfaces, most component props, and core function signatures all match the source code precisely. The HIGH-severity issues are concentrated in three areas: (1) a phantom hook (`useFunctionSpace`) referenced in code examples that doesn't exist, (2) the Quick Start starter kit presenting a fictional `App.tsx` that doesn't match the actual codebase, (3) the composition section omitting a critical exclusivity constraint for trading widgets, (4) the architecture categories table mislabeling a category, and (5) a claim that `TimeSales` doesn't respond to `ctx.invalidate()` when it does.

---

## HIGH Severity

Issues that would cause developers to write incorrect, broken, or misleading code.

### H1. `useFunctionSpace` does not exist

**Location:** Code examples throughout the Core and React sections
**Doc claims:** Uses `const ctx = useFunctionSpace()` and `useFunctionSpace().client` in code examples as the primary way to access the Provider context.
**Actual code:** This hook does not exist anywhere in the codebase. It is not exported from `@functionspace/react`. A developer copy-pasting any example using `useFunctionSpace()` would get a runtime import error.
**Correct approach:** Use `useContext(FunctionSpaceContext)` or the specialized hooks (`useAuth`, `useMarket`, etc.).
**Source:** `packages/react/src/index.ts` -- no such export exists.

### H2. Quick Start `App.tsx` is a fictional composite file

**Location:** Doc lines ~3388-3430 (Quick Start: Minimal Integration)
**Doc claims:** Shows `App.tsx` as a self-contained component with `FunctionSpaceProvider`, widget imports, JSX layout, and a default export. Presents it as "Config + layout in one file."
**Actual code:** The real `demo-app/src/App.tsx` is a config-only module that exports `config`, `MARKET_ID`, and `widgetTheme`. It has no JSX, no `FunctionSpaceProvider`, no component, and no default export. Layout components live in separate `App_*.tsx` files.
**Impact:** A developer following the Quick Start verbatim would create a file that looks nothing like the actual codebase. Additionally:
- Doc uses hardcoded config values (`'https://your-api-url.com'`); actual code uses `import.meta.env.VITE_*` environment variables
- Doc omits `PositionTable` from the Quick Start layout, despite the doc's own Basic Trading Layout description saying it should include one
**Source:** `demo-app/src/App.tsx`, `demo-app/src/App_BasicTradingLayout.tsx`

### H3. Composition section omits trading widget exclusivity constraint

**Location:** Doc lines ~3309-3321 (Composability Rules, Rule 6)
**Doc claims:** "Mix and match freely" -- encourages combining components without restriction.
**Actual code:** Only one trading component should be mounted at a time (documented separately at line ~2433, but NOT in the composition section). Mounting two trading widgets simultaneously causes conflicting `previewBelief`/`previewPayout` context writes, leading to flickering/broken previews.
**Impact:** A developer reading only the composition section would confidently mount a `TradePanel` and `ShapeCutter` side-by-side, creating a broken layout.
**Source:** All trading widgets write to the same `ctx.setPreviewBelief` and `ctx.setPreviewPayout` context fields.

### H4. Architecture categories table: "Positions" category is mislabeled

**Location:** Doc lines ~53 (Categories table)
**Doc claims:** `Positions | Pure computation -- transforms inputs into belief vectors | Read-only (no network)`
**Actual code:** The `queries/positions.ts` file contains **network-calling** functions (`queryMarketPositions`, `queryPositionState`) -- these are Queries, not pure computation. The description actually matches `math/generators.ts` (which generates belief vectors purely), but generators are organized under `math/`, not "Positions."
**Impact:** A developer would believe `queryMarketPositions` is a pure, offline function when it actually requires a network-connected `FSClient`.
**Additionally:** The categories table is missing two groups entirely: Auth (`loginUser`, `signupUser`, etc.) and Chart Interaction (`pixelToDataX`, `computeZoomedDomain`, etc.), both of which are exported from `@functionspace/core`.
**Source:** `packages/core/src/index.ts`, `packages/core/src/queries/positions.ts`, `packages/core/src/math/generators.ts`

### H5. TimeSales: doc says no `ctx.invalidate()` integration -- code has it

**Location:** Doc line ~3141
**Doc claims:** "Does not integrate with `ctx.invalidate()` -- refreshes are polling-only."
**Actual code:** `useTradeHistory` hook subscribes to `ctx.invalidationCount` in its effect dependencies (`useEffect(() => { fetch(); }, [fetch, ctx.invalidationCount])`), so calling `ctx.invalidate()` **does** trigger a refetch.
**Impact:** A developer would incorrectly believe there is no way to force-refresh `TimeSales` besides waiting for the poll interval, when `ctx.invalidate()` works fine.
**Source:** `packages/react/src/useTradeHistory.ts` line 44

---

## MEDIUM Severity

Issues that are incomplete or misleading, likely causing confusion but not necessarily broken code.

### M1. `buy()` error handling is undocumented

**Location:** Doc lines ~349-410
**Doc claims:** Documents the happy-path parameters and return type, but no mention of error handling.
**Actual code:** `buy()` throws on missing authentication, HTTP errors, API failures, and auto-retries on 401 (token refresh). Developers have no guidance on what exceptions to catch or what error shapes to expect.
**Source:** `packages/core/src/transactions/buy.ts`

### M2. BucketRangeSelector: doc claims inline error on out-of-bounds custom range -- code silently ignores

**Location:** Doc line ~2726
**Doc claims:** "Out-of-bounds values are rejected (not clamped), displaying an inline error."
**Actual code:** The `applyCustomRange` function (lines 104-119) silently returns on invalid input without setting any error state or rendering any inline error message. There is no error state variable for custom range validation.
**Impact:** A developer or QA engineer would expect visible user feedback for invalid custom ranges and find none.
**Source:** `packages/ui/src/trading/BucketRangeSelector.tsx` lines 104-119

### M3. PositionTable: `settlementPayout` P/L path described as "not status-gated" -- but it is

**Location:** Doc P/L calculation section for PositionTable
**Doc claims:** "Any position with a non-null `settlementPayout` uses this path" (parenthetical says "not status-gated").
**Actual code:** Sold/closed positions with a non-null `soldPrice` hit the first branch and **never reach** the `settlementPayout` check. The `settlementPayout` path is only reached for positions that are NOT sold/closed.
**Impact:** A developer could incorrectly assume `settlementPayout` always wins when non-null.
**Source:** `packages/ui/src/market/PositionTable.tsx` lines 189-193

### M4. Composition section: `ctx.invalidate()` shown without required `marketId` parameter

**Location:** Doc lines ~3297-3307 (shared state diagram)
**Doc claims:** Shows `ctx.invalidate()` with no arguments.
**Actual code:** The signature is `invalidate(marketId: string | number) => void`. The parameter is required in the TypeScript type (even though the implementation ignores it).
**Impact:** A developer copying the diagram code would get a TypeScript compilation error.
**Source:** `packages/react/src/context.ts` line 11

### M5. Composition section: `ctx.previewBelief` listed as read by `CustomShapeEditor` -- it is not

**Location:** Doc line ~3300
**Doc claims:** `ctx.previewBelief` is "read by ConsensusChart / CustomShapeEditor (shows preview overlay)."
**Actual code:** `CustomShapeEditor` does NOT read `ctx.previewBelief`. It uses its own internal `shape.pVector` from `useCustomShape()` for its belief curve display. It *writes* `ctx.setPreviewBelief` (so `ConsensusChart` can show its preview), but never reads it back.
**Impact:** A developer might incorrectly expect cross-widget preview reading in `CustomShapeEditor`.
**Source:** `packages/ui/src/trading/CustomShapeEditor.tsx`

### M6. CustomShapeEditor: doc omits the trade form UI entirely

**Location:** Doc lines ~2639-2697
**Doc claims:** Documents chart overlay, control points, locking, and point count -- but does not mention the trade execution form.
**Actual code:** The component includes a full trade form with dollar amount input (default "100"), a submit button, and a "Trade Summary" section showing prediction, peak payout, and max loss.
**Impact:** A developer may not expect the component to include trade execution capabilities.
**Source:** `packages/ui/src/trading/CustomShapeEditor.tsx`

### M7. MarketStats: value/class mismatch when market is null

**Location:** Doc MarketStats section
**Doc claims:** Correctly describes the CSS class behavior (`status-resolved` when market data is undefined) but does not mention the contradictory display text.
**Actual code:** When `market` is null, the displayed status text falls back to "Active" (line 31) but the CSS class is `status-resolved` (line 32). The value says "Active" while the class says "resolved."
**Source:** `packages/ui/src/market/MarketStats.tsx` lines 31-32

### M8. `CHART_COLORS` exported from `@functionspace/ui` but not documented

**Location:** Not in `sdk_docs_v1.0.md` at all
**Actual code:** `CHART_COLORS` is exported from `packages/ui/src/index.ts` line 18 via `./theme.js`. The React package has its own `ChartColors` type and `resolveChartColors` function, making this UI-level export potentially confusing.
**Impact:** A developer might find this export via IDE autocomplete and not know how it relates to the React-layer theme system.
**Source:** `packages/ui/src/index.ts` line 18

---

## LOW Severity

Minor discrepancies unlikely to cause problems but worth cleaning up.

### L1. `refetch` return types: doc says `() => void`, code returns `() => Promise<void>`

**Affected hooks:** `usePositions`, `useBucketDistribution`, `useTradeHistory`
**Doc claims:** `refetch: () => void`
**Actual code:** `refetch: () => Promise<void>`
**Impact:** Minimal -- void return type works but a developer can't await the refetch if they wanted to.

### L2. `TradeEntry.positionId` is `string` but `Position.positionId` is `number`

The doc correctly documents both types but does not call out this cross-type inconsistency. A developer joining positions to trade entries would need a type conversion.

### L3. `computeStatistics` return type documented as `ConsensusSummary` but code uses inline object

**Doc claims:** Returns `ConsensusSummary`
**Actual code:** Returns an inline `{ mean, median, mode, variance, stdDev }` object. The shape is identical to `ConsensusSummary` but is not typed as such.

### L4. `resolutionState` includes `'voided'` in type but implementation only produces `'open'` or `'resolved'`

The type definition allows `'voided'` but the actual server/API never produces this value.

### L5. Theme preset `FS_DARK` overrides Tier 3 defaults

`FS_DARK` has `borderWidth: '2px'` and `transitionSpeed: '300ms'`, differing from `applyDefaults()` fallbacks of `'1px'` and `'200ms'`. This is by design but not documented.

### L6. ConsensusChart "crosshair" description is misleading

Doc says "crosshair" but only a vertical dashed line is rendered (no horizontal line).

### L7. `loginUser`/`signupUser` error message format undocumented

On HTTP errors, these functions include the status code in the error message. Not documented.

### L8. `mapPosition`/`positionsToTradeEntries` undocumented behaviors

UTC normalization, sell entry `closedAt` fallback, and `Position.prediction` type inconsistency are not documented.

### L9. AuthWidget state machine: no explicit "authenticated" view state

Doc implies a 4th view state "Authenticated" but internally the view state type is `'idle' | 'login' | 'signup'`. The "Authenticated" rendering is a guard check on `isAuthenticated && user`, not a distinct state transition.

### L10. Starter kit theme/variable mismatches

- Quick Start uses variable name `theme` (actual: `widgetTheme`)
- Quick Start defaults to `'fs-dark'` (actual: `'native-light'`)
- Quick Start chart height is 500 (actual Basic Trading Layout: 655)
- `App_ShapeCutterTradingLayout.tsx` has unused imports (`DistributionChart`, `TimeSales`)

### L11. MarketCharts context scoping could be clearer

Doc says `MarketCharts` reads `ctx.previewBelief` "for subtitle text only" -- technically correct at the component boundary, but child `ConsensusChartContent` also reads `previewBelief`, `previewPayout`, `selectedPosition`, and `chartColors`. Could confuse developers about the full context dependency tree.

### L12. TimeSales: doc says no direct context interaction -- component has explicit context check

`TimeSales` directly accesses `FunctionSpaceContext` via `useContext()` at line 37 with its own presence check, independently of `useTradeHistory`. Functionally redundant but is a direct context interaction the doc says doesn't exist.

### L13. Composition Phase 1 says `generateBelief()` but widgets use various generators

The three-phase pattern description uses `generateBelief()` as a shorthand, but individual widgets call `generateGaussian`, `generatePlateau`, `generateDip`, etc. Won't cause incorrect code since it's describing the pattern, not a specific API call.

### L14. `GaussianParams` and `PlateauParams` types exported from core but not documented

These are exported from `packages/core/src/types.ts` and `packages/core/src/index.ts` but have no mention in the SDK docs.

### L15. Quick Start omits `modes` prop on TradePanel

Actual `App_BasicTradingLayout.tsx` passes `modes={['gaussian', 'plateau']}` explicitly. The prop has a matching default so behavior is identical, but a developer cross-referencing would notice the discrepancy.

---

## Sections with Zero Issues (All PASS)

The following sections were verified and found to be fully accurate:

- **All 20 type/interface definitions** -- Every field name, type, optionality, and union variant matches source code exactly
- **`generateBelief`** -- Parameters, region types, composition behavior
- **`sell()`** -- Parameters, return type
- **`projectPayoutCurve()`** -- Parameters, return type, numOutcomes
- **`projectSell()`** -- Parameters, return type
- **`queryMarketPositions` + `queryPositionState`** -- Parameters, return types
- **`queryTradeHistory`** -- Parameters, return type
- **`discoverMarkets`** -- Parameters, return type
- **`queryMarketState`** -- Fields, MarketConfig, alpha vector
- **`getConsensusCurve` + `queryConsensusSummary` + `queryDensityAt`** -- Parameters, return types
- **`queryMarketHistory`** -- Parameters, return type, snapshot shape
- **`evaluateDensityCurve` + `evaluateDensityPiecewise`** -- Parameters, behavior
- **`calculateBucketDistribution`** -- Parameters, return type
- **`transformHistoryToFanChart`** -- Parameters, return type
- **Chart zoom functions** (`pixelToDataX`, `computeZoomedDomain`, `computePannedDomain`, `filterVisibleData`, `generateEvenTicks`)
- **`FSClient`** -- Constructor, methods, token management, guest mode
- **Shape definitions** -- `SHAPE_DEFINITIONS`, `ShapeId`, names, icon metadata
- **`FunctionSpaceProvider`** -- Props, auth modes, theme resolution, style injection
- **`FunctionSpaceContext`** -- Interface fields match Provider's actual contextValue
- **`useMarket`** -- Return shape, loading/error/refetch, invalidation
- **`useConsensus`** -- Return shape, numPoints, refetch
- **`useCustomShape`** -- Return fields, lock, drag, belief output
- **`useAuth`** -- Return fields match context, thin accessor pattern
- **`useChartZoom` + `rechartsPlotArea`** -- Return shape, options, behavior
- **Theme system** -- 30 tokens, presets, `resolveChartColors`, `getPresetChartColors`
- **`TradePanel`** -- All 28 claims verified (props, tabs, sliders, context writes, reset behavior)
- **`ShapeCutter`** -- All 35 claims verified (8 shapes, adaptive sliders, generators, context)
- **`BinaryPanel`** -- All claims verified
- **`CustomShapeEditor`** -- 40 claims verified (chart overlay, drag, locking, Y-axis cap)
- **`BucketTradePanel`** -- All claims verified (composition pattern, state sharing)
- **`MarketCharts`** -- All claims verified (tabs, subtitle, state persistence)
- **`ConsensusChart`** -- All claims verified
- **`DistributionChart`** -- All claims verified
- **`TimelineChart`** -- All claims verified
- **`PositionTable`** -- 33 of 36 claims verified (3 minor issues noted above)
- **`AuthWidget`** -- 29 of 30 claims verified
- **Architecture** -- 3-layer structure, import direction, package names all correct
- **Index exports** -- Every documented function/hook/component is exported from the correct package

---

## Recommended Action Priority

1. **Fix H1 immediately** -- Replace all `useFunctionSpace()` references with the correct pattern (`useContext(FunctionSpaceContext)` or specialized hooks)
2. **Fix H2** -- Rewrite the Quick Start to match the actual codebase's two-file pattern (config module + layout component), or clearly label it as a standalone example
3. **Fix H3** -- Add a prominent warning to the composition section about trading widget exclusivity
4. **Fix H4** -- Rename/restructure the Categories table to accurately reflect the code organization
5. **Fix H5** -- Remove the incorrect claim about TimeSales not responding to invalidation
6. **Address M1-M8** -- Update documentation for accuracy on error handling, custom range behavior, P/L priority, and other medium-severity items
7. **Clean up L1-L15** -- Minor corrections as time permits
