# IndexSpace Implementation Plan

Last updated: 2026-05-12

## Purpose

This document owns execution sequencing for IndexSpace. It does not redefine the
product, design system, vault model, or FunctionSpace SDK boundaries.

Canonical source documents:

- Product and architecture boundary: `indexspace/SPEC.md`
- Visual system and UI tone: `indexspace/DESIGN.md`
- Execution sequence: this file
- Wave-local contracts: `indexspace/docs/implementation/waves/*.md`

If a wave discovers that `SPEC.md` is wrong, stop and update `SPEC.md` before
continuing. Do not let wave docs become the hidden source of architecture truth.

## Frozen Decisions

- Adopt the generated Next.js UI from `../index-space-ui-v0` into
  `indexspace/ui`.
- Target an end-to-end MVP: Base Sepolia vault contracts, backend indexer,
  backend curator, FunctionSpace SDK trade execution, simulator, and UI flow.
- Implement the minimal ERC-7540-compatible subset in `SPEC.md`, not a full
  standard implementation.
- Keep all implementation under `indexspace/` inside the SDK fork.
- Keep docs, screenshots, and design guidance under `indexspace/`.
- Use Bun wherever practical for JS package management and scripts.

## Wave Graph

All waves are sequential. Do not parallelize unless this plan is revised.

```text
Wave 01: Product substrate, shared config, and vault contracts
  -> Wave 02: Backend indexer, quotes, FunctionSpace SDK, curator
  -> Wave 03: Adopt and harden Next.js UI
  -> Wave 04: Wire UI, contracts, backend, wallet, and SDK data
  -> Wave 05: Simulator, demo operations, verification, and polish
```

Dependency classes:

| Edge | Type | Reason |
| --- | --- | --- |
| Wave 01 -> Wave 02 | hard dependency | Backend needs contract ABI/events, shared index config, and request lifecycle. |
| Wave 02 -> Wave 03 | contract-stability dependency | UI can mock earlier, but real API shapes should be stable before integration hardening. |
| Wave 03 -> Wave 04 | hard dependency | Integration requires the adopted UI app and component ownership to be stable. |
| Wave 04 -> Wave 05 | organizational sync barrier | Demo simulation and final polish should run against integrated behavior, not mocks. |

## Worktree And Merge Rules

- One active implementation branch at a time unless the plan is explicitly
  revised.
- Wave branches should start from synced `main`.
- Each wave must leave the worktree buildable or explicitly document why not.
- Do not modify SDK internals under `packages/*` unless a wave explicitly says
  so. Prefer consumer-side usage of `@functionspace/core`, `@functionspace/react`,
  and `@functionspace/ui`.
- Do not edit generated UI files in `../index-space-ui-v0` as the canonical
  source after Wave 03. Once adopted, `indexspace/ui` is the source of truth.
- Do not create additional architecture docs unless a wave hits a real contract
  that is too large for the wave doc.

## Validation Policy

Every wave must collect:

- command evidence: commands run and important output;
- state evidence: generated files, DB rows, deployed addresses, or screenshots;
- failure evidence: at least one intentionally bad path where relevant;
- regression evidence: one earlier guarantee still holds.

Validation should be right-sized:

- contract waves run Foundry tests;
- backend waves run unit/smoke tests and an SDK dry run where possible;
- UI waves run type/build checks and screenshot/browser smoke checks;
- integration waves run end-to-end subscribe/redeem paths on Base Sepolia or an
  explicitly documented local fallback.

Never claim a check passed unless it actually ran.

## Handoff Policy

Each wave is handoff-ready only when:

- all acceptance rows are either passed or explicitly deferred with owner/risk;
- changed docs match changed code;
- command/state/failure/regression evidence is captured in the final handoff;
- no unresolved decision is hidden in code comments or TODOs;
- the next wave can start without reverse-engineering local intent.

## Wave Index

- `waves/wave-01-substrate-contracts.md`
- `waves/wave-02-backend-curator.md`
- `waves/wave-03-next-ui-adoption.md`
- `waves/wave-04-integration.md`
- `waves/wave-05-simulation-demo-hardening.md`
