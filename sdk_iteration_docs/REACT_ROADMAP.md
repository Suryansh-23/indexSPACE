# React Layer Roadmap

## Purpose

This document is the third reference alongside `CLAUDE.md` (architecture rules) and `PLAYBOOK.md` (implementation patterns). It defines **what the React layer needs to become** and serves two roles:

1. **Roadmap** — tiered improvements ranked by what unblocks multi-user testing first, then general SDK maturity.
2. **Review checklist** — when reviewing any hook, provider, or component change, verify against the checklists here.

The React layer currently passes data through. Its job is to become the **value layer** — where caching, freshness, coordination, and mutation lifecycle are managed — so that core stays pure and UI stays presentation-only.

---

## Current State

| Capability | Status |
|------------|--------|
| Data fetching via hooks | Thin wrappers — fetch on mount, refetch on global invalidation counter |
| Caching | None at any layer |
| Request deduplication | None — `useMarket` + `useConsensus` both hit `/api/market/state` independently |
| Polling | Only `useTradeHistory` supports `pollInterval`, hand-wired |
| Mutation hooks | None — UI components import `buy`/`sell`/`projectPayoutCurve` from core directly |
| Invalidation | Global — `marketId` parameter is accepted but ignored, all hooks refetch |
| Stale-while-revalidate | None — every refetch sets `loading: true`, causing UI flicker |
| Request cancellation | None — unmounted components may receive stale async responses |
| Retry logic | None — single attempt, fail immediately |

---

## Tier 1: Multi-User Critical

These are required before concurrent users can meaningfully test on the same markets. Without them, the SDK either wastes resources, misses other users' activity, or forces consumers to manage mutation boilerplate.

---

### 1.1 Query Cache with Request Deduplication

**Problem:** Every hook instance fires its own API request. Mounting `MarketStats`, `ConsensusChart`, and `PositionTable` for one market produces at least 3 requests per invalidation cycle — and `useMarket` + `useConsensus` both call the same endpoint, so it is effectively 4. Add a second market or duplicate a widget and it multiplies further. There is no shared cache.

**What it should do:**

- Cache responses keyed by query identity (function + parameters).
- When multiple hook instances request the same data, one network request fires and all subscribers receive the result.
- Cache entries have a configurable staleness window. Within that window, new subscribers get cached data instantly (no loading state, no request).
- When a cache entry is invalidated or expires, a single refetch updates all subscribers.

**Where it lives:** React layer. A `QueryCache` (or equivalent) owned by the Provider. Core functions remain pure `async (client, ...params) => data` with no caching opinion. UI components call hooks as before — the cache is invisible to them.

**Key design decisions:**

- **Cache key structure:** Must uniquely identify a query. Standard pattern is a tuple: `[functionName, ...params]`. TanStack Query calls these "query keys" (e.g., `['market', marketId]`). SWR uses a single string key. The tuple approach is more composable for targeted invalidation.
- **Subscriber model:** Each hook instance registers as a subscriber to a cache key. The cache tracks subscriber count — when it drops to zero, the entry can be garbage collected (after an optional `gcTime`).
- **Single source of truth:** All data-fetching hooks read from the cache, never from local `useState`. This eliminates the current pattern where each hook has its own copy of the data.

**Established practice:**

- **TanStack Query:** `queryKey` array → `queryFn` → deduplicated fetch → subscribers notified. Used in production by thousands of apps. Default `staleTime: 0`, `gcTime: 5min`.
- **SWR:** String key → fetcher function → in-memory cache with deduplication. SWR deduplicates requests within a 2-second window by default.
- **Apollo Client:** Normalized cache keyed by `__typename` + `id`. Every `useQuery` with the same variables shares a cache entry.

**Layer implications:**

- **Core:** No changes. Query functions stay pure.
- **React:** Cache class replaces per-hook `useState`. Provider creates and owns the cache instance. Hooks become thin subscribers: register key, return cached data + metadata.
- **UI:** No changes. Same hook API, same return shape.

**Checklist:**

- [ ] Cache class with key-based storage, subscriber tracking, and garbage collection
- [ ] All data-fetching hooks migrate from local `useState` to cache subscription
- [ ] Duplicate hook instances produce one network request, not N
- [ ] Cache is scoped to the Provider instance (no global singletons — supports multiple Providers on one page)
- [ ] `gcTime` is configurable at Provider level

---

### 1.2 System-Wide Polling

**Problem:** When multiple users trade on the same market, consensus shifts, positions change, and stats update. Currently, hooks only refetch when the local user triggers invalidation via their own trade. There is no mechanism to discover changes made by other users. This is a hard blocker for multi-user testing.

**What it should do:**

- Every data-fetching hook accepts an optional `pollInterval` (milliseconds).
- When enabled, the hook's cache entry refetches on a timer.
- Since polling is per cache key (not per hook instance), multiple components sharing a key share one timer.
- Provider accepts a `defaultPollInterval` for all queries, overridable per hook.
- Polling pauses when no subscribers are mounted (cache entry has zero subscribers).

**Critical requirement — visibility-aware polling:**

Polling must pause when the browser tab is hidden or the component is unmounted. Without this, a multi-market dashboard with 5 markets polling at 3-second intervals generates continuous background traffic. This is wasteful and will drain mobile batteries.

Standard approach: listen to `document.visibilitychange`. When `document.hidden` is `true`, pause all poll timers. Resume when visible. TanStack Query does this by default. SWR pauses revalidation on hidden tabs.

**Where it lives:** React layer, as a feature of the query cache. Poll timers are per cache key. The Provider manages the visibility listener.

**Established practice:**

- **TanStack Query:** `refetchInterval` option on any `useQuery`. Automatically pauses when window loses focus (configurable via `refetchIntervalInBackground`).
- **SWR:** `refreshInterval` option. Pauses when page is not visible.
- **Apollo Client:** `pollInterval` on `useQuery`. Does NOT auto-pause (a known limitation Apollo users work around manually).

**Layer implications:**

- **Core:** No changes.
- **React:** Poll timer logic lives in the cache. Each cache entry optionally holds an interval. Provider registers/deregisters the visibility listener.
- **UI:** Components opt-in per use: `useConsensus(marketId, { pollInterval: 3000 })`. No changes required for components that don't need polling.

**General maturity note:** Polling is the pragmatic first step. The architecture should be designed so that the polling transport can later be replaced by WebSocket/SSE push without changing the hook API (see Tier 3.2).

**Checklist:**

- [ ] All data-fetching hooks accept `pollInterval` option
- [ ] Poll timers are per cache key, not per hook instance
- [ ] Provider accepts `defaultPollInterval` configuration
- [ ] Polling pauses when `document.hidden === true`
- [ ] Polling pauses when subscriber count drops to zero
- [ ] Polling resumes on visibility change or new subscriber
- [ ] Poll-triggered refetches do not set `loading: true` (see Tier 2.1 — stale-while-revalidate)

---

### 1.3 Mutation Hooks

**Problem:** UI components import `buy`, `sell`, `projectPayoutCurve`, and `projectSell` directly from core. Each component manages its own `submitting`/`error` state via `useState`, manually calls `ctx.invalidate()`, and manually refreshes the user's wallet balance. This boilerplate is repeated across every trading component. Consumers building custom trade UIs must import from two packages and know the invalidation protocol.

Auth already set the precedent — `useAuth` wraps core's `loginUser`/`signupUser` with managed state and side effects. Trade mutations should follow the same pattern.

**What it should do:**

Provide hooks that wrap core mutation functions and return:

```
{ execute: (...args) => Promise<Result>, loading: boolean, error: Error | null, reset: () => void }
```

On success, the hook automatically:
1. Invalidates the affected market's cache entries (targeted, see 1.4).
2. Refreshes the user's wallet balance.
3. Clears the error state.

On failure, the hook sets the error and does not invalidate.

**Mutation hooks needed:**

| Hook | Wraps | Auto side effects |
|------|-------|-------------------|
| `useBuy` | `buy()` from core | Invalidate market, refresh wallet |
| `useSell` | `sell()` from core | Invalidate market, refresh wallet |
| `useProjectPayout` | `projectPayoutCurve()` from core | Set `previewPayout` on context |
| `useProjectSell` | `projectSell()` from core | None — returns value for display |

**Where it lives:** React layer. Each hook wraps a core function, adds state management, and triggers cache-level side effects.

**Established practice:**

- **TanStack Query:** `useMutation` with `onSuccess` callback for cache invalidation. `mutate()` / `mutateAsync()` for fire-and-forget vs awaitable. `isLoading`, `error`, `reset` on the return.
- **SWR:** `useSWRMutation` — trigger-based, not automatic. Returns `{ trigger, isMutating, error }`.
- **Apollo Client:** `useMutation` returns `[mutateFunction, { loading, error, data }]`. Supports `refetchQueries` and `update` for cache manipulation.

**Layer implications:**

- **Core:** No changes. `buy()`, `sell()`, projection functions remain pure.
- **React:** New hooks added. Mutation hooks use the cache's invalidation API rather than the raw context counter.
- **UI:** Trading components replace direct core imports with hook calls. Removes per-component state management for submission loading/error. The three-phase trade pattern (PLAYBOOK.md) remains — Phase 1 (instant preview) and Phase 2 (debounced projection) still live in the component. Phase 3 (submit) delegates to the mutation hook.

**Checklist:**

- [ ] `useBuy` hook with `execute`, `loading`, `error`, `reset`
- [ ] `useSell` hook with same shape
- [ ] `useProjectPayout` hook — debounce is caller's responsibility, hook handles the request
- [ ] `useProjectSell` hook
- [ ] All mutation hooks auto-invalidate affected market on success
- [ ] All mutation hooks auto-refresh user wallet on success
- [ ] Error state is clearable via `reset()`
- [ ] UI trading components refactored to use mutation hooks instead of direct core imports
- [ ] Consumers building custom UIs only import from `@functionspace/react`

---

### 1.4 Targeted Invalidation

**Problem:** `invalidate(marketId)` ignores the `marketId` parameter — it increments a global counter and every hook for every market refetches. With multiple markets mounted (dashboards, market lists), a trade on market A triggers unnecessary refetches for markets B, C, D.

**What it should do:**

- `invalidate(marketId)` marks only cache entries keyed to that market as stale.
- Only subscribers to those entries refetch.
- Support `invalidateAll()` for cases where a global refresh is needed (e.g., logout).

**Where it lives:** React layer, as part of the query cache. Cache keys already contain the `marketId` — the invalidation function walks the cache and matches.

**Established practice:**

- **TanStack Query:** `queryClient.invalidateQueries({ queryKey: ['market', marketId] })` — partial key matching invalidates all queries that start with the given prefix.
- **Apollo Client:** `refetchQueries` accepts query names or variable filters.
- **RTK Query:** Tag-based invalidation — mutations declare which tags they invalidate, queries declare which tags they provide.

**Layer implications:**

- **Core:** No changes.
- **React:** Cache keys must include `marketId` as a prefix segment. `invalidate(marketId)` filters cache entries by key prefix. The global `invalidationCount` is removed or relegated to `invalidateAll()`.
- **UI:** No changes. Components already pass `marketId` to `ctx.invalidate()`.

**Checklist:**

- [ ] Cache keys are structured as `[queryName, marketId, ...otherParams]`
- [ ] `invalidate(marketId)` only marks matching cache entries as stale
- [ ] `invalidateAll()` available for global refresh (logout, reconnect)
- [ ] Mutation hooks (1.3) call targeted invalidation, not global

---

## Tier 2: Production Quality

These make the SDK feel solid. Without them the SDK works but feels rough — loading flickers on polls, failed requests don't retry, unmounted components leak. These should be in place before external developers consume the SDK.

---

### 2.1 Stale-While-Revalidate

**Problem:** Every refetch (including poll-triggered) sets `loading: true`, which causes components to flash loading spinners or skeletons. When polling every 3 seconds on a live market, the UI would flicker constantly. This makes the polling from Tier 1.2 unusable without this fix.

**What it should do:**

- On initial fetch (no cached data), return `loading: true`.
- On subsequent refetches (cached data exists), return the stale data immediately with `loading: false` and `isFetching: true`.
- When the background refetch completes, update the data silently.
- Components that want to show a subtle "refreshing" indicator can use `isFetching`. Most will ignore it.

**Hook return shape change:**

| Field | Meaning |
|-------|---------|
| `loading` | `true` only when there is no data yet (first fetch) |
| `isFetching` | `true` whenever a request is in flight (first fetch or background refetch) |
| `data` | Cached data (may be stale during background refetch) |
| `error` | Last error (cleared on successful refetch) |

**Established practice:** SWR is literally named after this pattern (Stale-While-Revalidate, RFC 5861). TanStack Query implements it via `staleTime` (how long data is fresh) and `placeholderData` / `keepPreviousData`. This is not optional for any SDK with polling — it's the reason polling feels smooth rather than jarring.

**Checklist:**

- [ ] All data-fetching hooks return `isFetching` alongside `loading`
- [ ] `loading` is `true` only when no cached data exists
- [ ] Background refetches (poll, invalidation) do not set `loading: true`
- [ ] UI components that currently check `if (loading)` continue to work without changes (backward-compatible — `loading` is still `true` on first fetch)

---

### 2.2 Derived Query Optimization

**Problem:** `getConsensusCurve` in core internally calls `queryMarketState` then runs `evaluateDensityCurve` client-side. This means `useMarket` and `useConsensus` mounted together produce two identical API calls to `/api/market/state`. The query cache (Tier 1.1) would deduplicate the request, but the consensus hook still creates a separate cache entry for data that could be derived from the market entry.

**What it should do:**

`useConsensus` should derive its data from the market cache entry rather than fetching independently. The pattern:

1. Subscribe to the market cache key.
2. When market data is available, run `evaluateDensityCurve` client-side (this is pure math, already in core).
3. Return the result.

This means one API call serves both `useMarket` and `useConsensus`. Any other hook that needs market state as input should follow the same derived pattern.

**Where it lives:** React layer. Core's `getConsensusCurve` still exists for standalone use, but the hook bypasses it in favor of derivation.

**General maturity note:** This pattern — "query A derives from query B's cache entry" — is fundamental to avoiding request waterfalls. TanStack Query supports it via `select` (transform cached data without a new fetch). SWR supports it with dependent keys.

**Checklist:**

- [ ] `useConsensus` reads from market cache entry + client-side transform
- [ ] Mounting `useMarket` + `useConsensus` for the same market produces one API call, not two
- [ ] Other derived hooks (`useBucketDistribution` already derives from `useMarket` + `useConsensus`) continue to work

---

### 2.3 Retry with Backoff

**Problem:** Every hook makes a single fetch attempt. If the request fails (network blip, server hiccup, 503), the hook reports an error immediately. The user sees an error state until they manually trigger a refetch or a new invalidation cycle fires. In a live multi-user environment, transient failures are expected.

**What it should do:**

- Failed queries retry automatically with exponential backoff (e.g., 1s, 2s, 4s).
- Configurable max retries (default 3).
- Only retry on transient errors (network failures, 5xx). Do not retry on 4xx (auth failures, bad requests).
- Retries are transparent — `loading` stays true during retries on initial fetch. `isFetching` stays true during retries on background refetch.
- Mutations do NOT retry by default (a retried `buy` could double-execute). Mutation retry must be explicitly opted in.

**Established practice:**

- **TanStack Query:** Default 3 retries with exponential backoff. `retry` and `retryDelay` configurable per query. Mutations default to `retry: false`.
- **SWR:** `onErrorRetry` callback with default exponential backoff. Configurable per hook.
- **Apollo Client:** `RetryLink` middleware. Configurable retry count and delay function.

**Layer implications:**

- **Core:** No changes. Core functions throw on failure as before.
- **React:** Retry logic lives in the cache's fetch orchestration. When a query's fetch function throws, the cache retries before notifying subscribers of the error.

**Checklist:**

- [ ] Failed queries retry with exponential backoff (default: 3 retries)
- [ ] Retry only on transient errors (network, 5xx), not on 4xx
- [ ] Configurable at Provider level (`defaultRetryCount`, `defaultRetryDelay`) and per hook
- [ ] Mutation hooks do NOT retry by default
- [ ] Retry state is transparent — consumers see `loading`/`isFetching`, not individual retry attempts

---

### 2.4 Request Cancellation

**Problem:** When a component unmounts or its parameters change (e.g., user navigates to a different market), in-flight requests continue and may resolve after the component is gone. The `mountedRef` guard in `useTradeHistory` prevents state updates on unmounted components, but the request still completes on the network. Wasted bandwidth, and in edge cases, stale responses can update the wrong cache entry.

**What it should do:**

- Pass an `AbortSignal` to core fetch functions.
- When a hook unmounts or its parameters change, abort the in-flight request.
- When a cache entry is invalidated while a fetch is in-flight, abort the old fetch before starting a new one.

**Where it lives:** Shared between core and React. Core's `FSClient` methods accept an optional `AbortSignal` and pass it to `fetch()`. React's cache orchestration creates and manages `AbortController` instances.

**Layer implications:**

- **Core:** `FSClient.get()` and `FSClient.post()` accept an optional `signal` parameter and forward it to `fetch()`. This is a backward-compatible addition.
- **React:** Cache manages `AbortController` per in-flight request. On re-fetch or subscriber removal, previous controller is aborted.
- **UI:** No changes.

**Established practice:** TanStack Query passes `AbortSignal` to every query function. SWR does not (a known limitation). The `AbortController` API is standard in all modern browsers and Node.js 16+.

**Checklist:**

- [ ] `FSClient.get()` and `FSClient.post()` accept optional `signal: AbortSignal`
- [ ] Cache creates `AbortController` per fetch and aborts on re-fetch or cleanup
- [ ] Aborted requests do not update cache entries or trigger error states
- [ ] Parameter changes (e.g., `marketId` change) abort the previous request before starting a new one

---

## Tier 3: SDK Maturity

These differentiate a good SDK from a great one. They are not blockers for multi-user testing but should be designed for now — architectural decisions in Tiers 1 and 2 should not make these harder to add later.

---

### 3.1 Optimistic Updates

After a user submits a trade, immediately estimate the new consensus and update the cache before the server responds. If the request fails, revert to the previous cached value.

**Prerequisite:** Mutation hooks (1.3) and query cache (1.1).

**Where it lives:** React layer. Mutation hooks accept an `onMutate` callback that snapshots the current cache state and applies the optimistic update. On error, the snapshot is restored.

**Design constraint:** The optimistic consensus must be computed client-side using the same math core already provides (`generateBelief` + market state). This keeps the optimistic update accurate rather than a guess.

**Established practice:** TanStack Query: `onMutate` → snapshot → manual cache update → `onError` → rollback. Apollo Client: `optimisticResponse` option on `useMutation`.

---

### 3.2 Real-Time Transport (WebSocket/SSE)

Replace polling with push-based updates. When another user trades, the server pushes the updated market state to all connected clients.

**Critical architectural point:** The hook API does not change. Whether data arrives via poll or push, the consumer calls `useConsensus(marketId)` and gets `{ consensus, loading, error }`. The transport is an implementation detail of the cache layer.

**Design for this now:** Ensure the cache's "refetch" mechanism is abstract enough that a WebSocket message can write directly to a cache entry and notify subscribers — without going through the fetch → response → update cycle. TanStack Query supports this via `queryClient.setQueryData()`. The cache should expose an equivalent.

**Where it lives:** React layer. A transport adapter (polling vs WebSocket vs SSE) feeds the cache. Core provides the WebSocket client if needed. UI is unaware.

---

### 3.3 Focus and Reconnect Revalidation

Automatically refetch stale data when:
- The browser tab regains focus (`visibilitychange` event)
- The network reconnects (`online` event)

This catches changes that happened while the user was away. Especially important for prediction markets where consensus can shift significantly during a brief absence.

**Established practice:** SWR enables `revalidateOnFocus` and `revalidateOnReconnect` by default. TanStack Query enables `refetchOnWindowFocus` by default. Both are configurable.

**Where it lives:** React layer. The Provider registers event listeners and triggers cache-wide revalidation. Each cache entry respects its `staleTime` — only actually-stale entries refetch.

---

## Component Resilience

These are cross-cutting concerns that apply to all components regardless of tier. They should be incorporated into the component review checklist and addressed progressively.

---

### Instance-Proof Components

**Problem:** An embeddable SDK must support multiple instances of the same component on one page. Any hardcoded DOM `id` attributes will collide when a consumer mounts two `ConsensusChart` or two `PositionTable` components.

**Fix:** Use React's `useId()` hook to generate stable, unique identifiers per component instance. Apply to any `id`, `htmlFor`, `aria-labelledby`, or `aria-describedby` attribute.

**When to apply:** Now. This is a quick win with no architectural dependency. Add to the widget creation checklist.

**Checklist:**

- [ ] No hardcoded `id` attributes in any component
- [ ] `useId()` used for all DOM identifiers that need uniqueness
- [ ] `htmlFor` / `aria-*` attributes reference the generated ID
- [ ] Verified by mounting two instances of the same component

---

### Activity-Proof Components

**Problem:** When a component is hidden (e.g., inactive tab in `MarketCharts`, React's `<Activity>` API, or a consumer's own tab system), it should not poll, fetch, or apply global side effects. Without this, polling (Tier 1.2) generates traffic for invisible widgets.

**Fix:** Components that produce side effects (CSS variable injection, timers, subscriptions) must clean up when hidden and resume when visible. For the query cache, this means tracking active vs inactive subscribers.

**When to apply:** Required when polling (Tier 1.2) is implemented. The cache's poll timer should only run when at least one subscriber is both mounted and visible.

**Design consideration:** `MarketCharts` already handles this partially — `TimelineChartContent` only fetches when the timeline tab is active. This pattern should be generalized at the cache level rather than implemented per component.

**Checklist:**

- [ ] Poll timers pause when subscriber components are hidden
- [ ] No network traffic for tabs/widgets not currently visible
- [ ] CSS side effects (if any) are toggled on mount/unmount
- [ ] `document.visibilitychange` listener pauses all polling when tab is hidden

---

### Portal-Proof Components

**Problem:** If a consumer renders a widget inside a React portal (modal, popover, dropdown), the widget may render outside the Provider's DOM subtree. CSS variables set on the Provider's wrapper `<div>` will not cascade into the portal, causing all `--fs-*` variables to resolve to nothing. The widget renders broken with no visible error.

**Fix:** Two approaches:

1. **CSS variable injection on the portal container.** Provide a utility or wrapper component that re-applies the theme variables to a given container element.
2. **Document-level variable injection.** Apply `--fs-*` variables to `document.documentElement` instead of the provider wrapper. Simpler but leaks into the global scope (problematic if multiple Providers with different themes exist on one page).

**When to apply:** Before enterprise consumers embed widgets. Not urgent for initial multi-user testing where all widgets live inside the Provider subtree.

**Checklist:**

- [ ] Theme variables are accessible to portaled components
- [ ] A utility or wrapper exists for portal use cases
- [ ] Multiple Providers with different themes on one page do not conflict

---

### Future-Proof State Management

**Problem:** `useMemo` is a performance hint, not a semantic guarantee. React documentation states that React may discard memoized values to free memory. If the query cache (Tier 1.1) relies on `useMemo` for storage, React could silently discard cached data.

**Rule:** Cache storage must use `useState`, `useRef`, or an external store (`useSyncExternalStore`). Never `useMemo` for data that must persist across renders.

Existing hooks like `useBucketDistribution` use `useMemo` for derived computations — this is fine because the computation is pure and re-derivable. The distinction is: `useMemo` for derivations (recomputable), `useState`/`useRef`/external store for source data (must persist).

**Recommended approach for the cache:** `useSyncExternalStore` is the React-blessed way to subscribe to an external store. The cache is an external store — it lives outside React's state tree and notifies subscribers on updates. This is how TanStack Query, Zustand, and Redux connect to React.

**Checklist:**

- [ ] Query cache uses `useSyncExternalStore` or `useRef` — not `useMemo`
- [ ] Derived computations (pure transforms of cached data) may use `useMemo`
- [ ] No correctness dependency on `useMemo` cache persistence

---

## Implementation Approach

### Build vs Adopt

**Option A — Lightweight internal cache:** A focused query cache class (~300-400 lines) that handles keyed storage, deduplication, staleness, polling, and subscriber management. Zero external dependencies. Full control over the API surface.

**Option B — Adopt TanStack Query internally:** Gets everything in Tiers 1-3 out of the box. But adds a dependency, requires its own `QueryClientProvider` (nested inside yours), and creates conflicts if consumers already use TanStack Query in their app (two cache instances, two DevTools).

**Recommendation for an embeddable SDK:** Option A. Dependency conflicts are a support burden for SDK maintainers, and consumers of an embeddable SDK are more likely to already have their own data layer. TanStack Query is the reference for **what** to build — its API design, default behaviors, and terminology are the standard. The implementation can be focused on the subset the SDK actually needs.

### Implementation Order

The tiers are ordered by priority, but within Tier 1 there is a dependency chain:

```
1.1 Query Cache ──> 1.2 Polling (needs cache for per-key timers)
       │                   │
       └──> 1.4 Targeted Invalidation (needs cache key structure)
       │
       └──> 1.3 Mutation Hooks (needs cache for auto-invalidation)
```

**Tier 2 depends on Tier 1:**

- 2.1 Stale-While-Revalidate requires the cache (1.1) — it is a cache behavior.
- 2.2 Derived Query Optimization requires the cache — it reads from another entry.
- 2.3 Retry with Backoff lives in the cache's fetch orchestration.
- 2.4 Request Cancellation touches core (`FSClient` signal support) and the cache.

Build the cache first. Everything else layers on top.

---

## Review Checklist

When reviewing any PR that touches the React layer, verify:

### Hook Changes
- [ ] Hook returns `{ <named>, loading, error, refetch }` (data-fetching) or `{ execute, loading, error, reset }` (mutation)
- [ ] Hook checks for `FunctionSpaceContext` and throws a descriptive error if missing
- [ ] Data-fetching hooks subscribe to the query cache, not local `useState`
- [ ] Data-fetching hooks accept optional `pollInterval`
- [ ] Mutation hooks do not retry by default
- [ ] Mutation hooks auto-invalidate the affected market on success
- [ ] New hooks are exported from `packages/react/src/index.ts`

### Cache Changes
- [ ] Cache keys are structured tuples: `[queryName, marketId, ...params]`
- [ ] No `useMemo` for cache storage — use `useSyncExternalStore` or `useRef`
- [ ] Deduplication works: same key from two components = one request
- [ ] Stale data returned immediately on background refetch (no loading flicker)
- [ ] Garbage collection respects `gcTime`
- [ ] Poll timers are visibility-aware

### Component Changes
- [ ] No hardcoded DOM `id` attributes — use `useId()` if identifiers needed
- [ ] No direct imports from `@functionspace/core` for mutations — use mutation hooks
- [ ] Pure math imports from core are allowed (generators, density evaluation)
- [ ] Loading/error states handled per existing patterns
- [ ] CSS uses `var(--fs-*)` variables only

### Layer Boundary Enforcement
- [ ] Core does not import from React or UI
- [ ] React does not import from UI
- [ ] UI does not make API calls directly — data via hooks, mutations via mutation hooks
- [ ] UI may import pure math functions from core (generators, density evaluation, statistics)

---

## References

| Resource | What it establishes |
|----------|-------------------|
| [TanStack Query](https://tanstack.com/query) | Query keys, deduplication, stale-while-revalidate, mutation hooks, cache invalidation, optimistic updates, retry, `AbortSignal` support |
| [SWR](https://swr.vercel.sh/) | Stale-while-revalidate pattern, focus revalidation, deduplication window, minimal API surface for data fetching |
| [Apollo Client](https://www.apollographql.com/docs/react/) | Normalized cache, `useMutation` with `refetchQueries`, optimistic responses, polling |
| [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) | React-blessed pattern for subscribing to external stores (the query cache) |
| [RFC 5861](https://datatracker.ietf.org/doc/html/rfc5861) | HTTP stale-while-revalidate semantics — the origin of the SWR pattern |
| [Bulletproof React Components](https://shud.in/thoughts/build-bulletproof-react-components) | Instance-proof (`useId`), activity-proof (visibility cleanup), portal-proof (`ownerDocument`), future-proof (`useMemo` is not semantic) |
