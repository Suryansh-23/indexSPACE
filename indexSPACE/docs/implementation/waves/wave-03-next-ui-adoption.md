# Wave 03: Adopt And Harden The Next.js UI

## Purpose

Move the generated v0 UI from `../index-space-ui-v0` into `indexspace/ui` and
turn it into the canonical IndexSpace UI package.

This wave owns UI adoption, design-system hardening, route structure, mock-data
cleanup, and build validation. It does not connect wallet/contracts/backend yet
except through stable mock adapters shaped like Wave 02 APIs.

## Status

Complete.

## Prerequisites

- Read `indexSPACE/DESIGN.md` fully.
- Read Wave 02 handoff for API shapes.
- Run the generated UI build/dev command before moving if practical, to capture
  baseline issues.

## Implementation Contracts

### UI Package Decision

`indexSPACE/ui` becomes a Next.js App Router app.

Update `indexspace/ui/package.json` to use Next.js and React 19 if adopting v0
unchanged. If downgrading to React 18 is required for SDK compatibility, record
the reason in the wave handoff and update package constraints consistently.

Expected package scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit"
}
```

### Route Contract

Required routes:

```text
/
/vault/[id]
/internal
```

The portfolio must be a global drawer from the top bar. A separate route is
optional and should not replace the drawer.

### UI Adapter Contract

Create a local data adapter boundary so Wave 04 can replace mocks without
rewriting components:

```text
indexSPACE/ui/lib/indexspace-api.ts
indexSPACE/ui/lib/mock-data.ts
indexSPACE/ui/lib/types.ts
```

Required adapter functions:

```ts
getIndices()
getVault(vaultId)
getVaultCandles(vaultId)
getVaultRequests(vaultId, controller?)
getVaultPositions(vaultId)
quoteSubscribe(vaultId, assets)
quoteRedeem(vaultId, shares)
getInternalStatus()
```

In Wave 03 these can return deterministic mock data. The function signatures
must match Wave 02 API response shapes.

### Design Contract

Apply the screenshot feedback:

- no flat gray terminal skin;
- richer dark instrument palette or warm light/dark hybrid;
- terminal dashboard remains the home page;
- no separate marketing page;
- stronger `indexSPACE` product identity;
- richer trade drawer;
- methodology as system modules, not paragraphs;
- connected mock portfolio content by default;
- chart panel must not feel empty;
- bottom activity strip remains visible on desktop.

Update `DESIGN.md` only if implementation reveals a durable design rule.

### Mock Data Contract

Replace generated random NAV history. Mock data must be deterministic and stable
across renders.

Mock index names, market IDs, weights, and roles should come from
`@indexspace/shared`, not duplicate fake v0 market names like `GPT-5 RELEASE Q1`
unless those names are mapped to real configured markets.

## Owned Areas

- `indexSPACE/ui/**`
- `indexSPACE/DESIGN.md` for durable design clarifications
- root/package manifests and `bun.lock` for UI dependency/workspace changes

## Shared-Risk Areas

- `indexSPACE/shared/**` only for UI-facing type gaps
- backend API contracts from Wave 02
- SDK packages if React version compatibility becomes an issue

## Forbidden Write Areas

- `indexSPACE/contracts/**`
- `indexSPACE/backend/**` except documenting API mismatch in handoff
- `packages/**` SDK internals
- `../index-space-ui-v0/**` after adoption begins

## Exact Tasks

1. Pre-work:
   - run or inspect v0 generated app;
   - identify files to copy/adapt;
   - compare v0 dependencies with workspace dependencies;
   - choose React/Next version compatibility strategy.
2. Adoption:
   - replace empty `indexspace/ui` scaffold with Next.js app structure;
   - remove unnecessary v0 boilerplate not used by IndexSpace;
   - keep only needed shadcn/Radix components;
   - wire workspace imports for `@indexspace/shared`.
3. Design hardening:
   - apply improved palette from screenshot feedback;
   - strengthen product identity and vault numbering;
   - improve chart contextual panels;
   - improve trade drawer quote/lifecycle states;
   - improve portfolio drawer with connected mock data;
   - redesign methodology into modules.
4. Adapter boundary:
   - move mock data behind `lib/indexspace-api.ts`;
   - keep component props close to future backend payloads.
5. Responsive pass:
   - desktop terminal layout;
   - tablet collapsed rail/drawer;
   - mobile stacked instrument layout;
   - no text overlap.
6. Validation:
   - typecheck/build;
   - browser screenshot smoke on desktop and mobile if dev server can run.

## Acceptance Table

| Item | Required Evidence |
| --- | --- |
| `indexspace/ui` is canonical Next.js app | file tree and package scripts |
| App builds | `bun run build` or documented build blocker |
| Mock data deterministic | code inspection/test, no `Math.random()` in render data |
| UI uses shared index config | imports from `@indexspace/shared` |
| Design feedback addressed | before/after screenshot notes |
| Routes exist | browser or build evidence for `/`, `/vault/[id]`, `/internal` |
| Portfolio drawer has connected mock content | screenshot or browser smoke |
| Mobile has no obvious overlap | screenshot or viewport smoke |

## Verification Commands / Evidence

Expected:

```bash
cd indexSPACE/ui
bun install
bun run typecheck
bun run build
bun run dev
```

Browser checks:

- desktop `/`;
- desktop `/vault/ai-acceleration`;
- desktop `/internal`;
- mobile `/`.

Failure evidence:

- preview-only index disables trade path and explains why;
- invalid vault ID shows a controlled state, not a crash.

Regression evidence:

- Wave 02 backend still boots after workspace/package changes.

## Merge-Back Criteria

- `indexspace/ui` is source of truth.
- `../index-space-ui-v0` can be deleted or ignored after handoff.
- UI adapter boundary is stable for Wave 04.
- Design is materially closer to `DESIGN.md` and screenshot feedback.

## Handoff Notes

### Implementation Notes

- Adopted Next.js 16.2.6 with React 19 (`@functionspace/react` supports `^18 || ^19`)
- Kept wallet dependencies (`wagmi`, `viem`, `rainbowkit`) for Wave 04, no wallet/contract wiring yet
- Used `max-md:hidden` for desktop-only elements (vault rail, trade drawer)
- Mobile: vault selector strip + floating TRADE button opens full-screen trade drawer
- SSR-safe clock via `useClock` hook (suppresses hydration mismatch)
- Mock data is fully deterministic: `hashId` function replaces `Math.random` for navChange/shares
- NAV history uses `Math.sin`/`Math.cos` drift (stable across renders)
- Constituent names from `@indexspace/shared` (no fake market names)
- Palette from `DESIGN.md` with warm neutrals, amber undertones (Machine Black, Instrument Ink)
- Routes: `/` (terminal), `/vault/[id]` (detail), `/internal` (status), `/not-found` (controlled 404)
- No shadcn UI components copied (indexspace components use custom CSS with `cn` utility)
- `use-toast.ts` and `use-mobile.ts` hooks available for future use

### Wave 04 Handoff

Adapter functions (in `lib/indexspace-api.ts`):
- `getIndices()`, `getVault(vaultId)`, `getVaultCandles(vaultId)`
- `getVaultRequests(vaultId, controller?)`, `getVaultPositions(vaultId)`
- `quoteSubscribe(vaultId, assets)`, `quoteRedeem(vaultId, shares)`
- `getInternalStatus()`

Wallet state locations: wagmi provider setup needed in `app/layout.tsx`
Trade drawer state model: `useState` in `Terminal` component (`walletConnected`, `step`, `mode`)
React version: React 19, SDK compatible
No browser screenshots available (no Chrome in dev environment)
