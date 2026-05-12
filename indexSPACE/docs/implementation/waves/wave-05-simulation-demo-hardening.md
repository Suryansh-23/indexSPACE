# Wave 05: Simulation, Demo Operations, Verification, And Polish

## Purpose

Turn the integrated MVP into a reliable competition demo.

This wave owns:

- persistent simulator behavior;
- internal operator controls;
- final UI polish against `DESIGN.md`;
- demo runbook;
- long-running backend checks;
- final end-to-end validation evidence.

## Status

Planned. Starts after Wave 04 has a working integrated path.

## Prerequisites

- Read all previous wave handoffs.
- Read `indexspace/DESIGN.md` and the latest UI screenshot feedback.
- Run the Wave 04 end-to-end path once before changing simulator/demo code.
- Confirm which accounts are safe for simulator activity.
- Confirm deployment target for backend/UI, if any.

## Implementation Contracts

### Simulator Contract

Simulator remains inside `backend`, but isolated from curator fulfillment.

Modes:

```text
raw_functionspace_market_simulator
vault_activity_simulator
```

Rules:

- simulator on by default unless explicit env flag disables it;
- simulator account is not curator account;
- simulator cannot call fulfill functions for user requests;
- simulator activity is visibly labeled synthetic/demo;
- simulator writes state to SQLite;
- simulator can be toggled/configured from `/internal`.

### Internal Route Contract

`/internal` must show:

- backend health;
- indexer checkpoint;
- latest indexed block;
- curator/operator address;
- vault-scoped FunctionSpace usernames;
- simulator status/toggles;
- recent curator executions;
- recent simulator actions;
- known errors/manual recovery rows.

This route is operator-facing. It should be dense and clear, not decorative.

### Demo Runbook Contract

Create:

```text
indexspace/docs/implementation/DEMO_RUNBOOK.md
```

Must include:

- env variables;
- package install;
- contract deployment or configured addresses;
- backend startup;
- UI startup;
- faucet/test USDC setup;
- happy-path demo script;
- failure recovery steps;
- checks to run before recording/submission.

### Polish Contract

Final polish is not open-ended redesign. It must target:

- richer palette/contrast from screenshot feedback;
- product identity clarity in first viewport;
- trade drawer as core action;
- chart panel not empty;
- methodology as system modules;
- connected portfolio drawer;
- no text overlap;
- responsive desktop/mobile verification.

## Owned Areas

- `indexspace/backend/**`
- `indexspace/ui/**`
- `indexspace/docs/implementation/**`
- `indexspace/DESIGN.md` for final durable design clarifications

## Shared-Risk Areas

- Simulator using real FunctionSpace endpoints
- Long-running backend state
- Demo accounts and balances
- UI polling intervals and backend load

## Forbidden Write Areas

- `packages/**` SDK internals
- contract lifecycle semantics unless Wave 04 found a critical bug
- shared index market selection unless a market is unavailable and `SPEC.md`
  must be updated

## Exact Tasks

1. Pre-work:
   - inspect Wave 04 evidence;
   - run one manual happy path;
   - list demo accounts and balances;
   - verify simulator cannot use curator credentials.
2. Simulator:
   - implement raw market simulator with tiny FunctionSpace trades;
   - implement vault activity simulator with safe test wallets if feasible;
   - persist simulator cursors/state;
   - add intensity/on-off controls;
   - expose recent simulator actions.
3. Internal route:
   - wire controls to backend internal endpoints;
   - show indexer/curator/simulator state;
   - show latest errors and manual recovery notes.
4. Demo hardening:
   - tune polling intervals;
   - add visible degraded states;
   - add copy buttons for addresses/tx/position IDs;
   - ensure preview-only indices are intentionally disabled.
5. UI polish:
   - final palette/contrast pass;
   - responsive pass;
   - screenshot pass for key routes;
   - remove unused v0/shadcn clutter from final app where safe.
6. Runbook:
   - write `DEMO_RUNBOOK.md`;
   - include exact commands and env shape;
   - include known recovery operations.
7. Final validation:
   - run contract tests;
   - run backend tests/smoke;
   - run UI build;
   - run end-to-end subscribe/redeem;
   - leave backend running long enough to catch polling issues if feasible.

## Acceptance Table

| Item | Required Evidence |
| --- | --- |
| Simulator is isolated from curator | config/code evidence and internal status |
| Simulator can be toggled | `/internal` screenshot/API output |
| Raw market activity simulator works or is explicitly blocked | FunctionSpace trade evidence or documented blocker |
| Vault activity simulator works or is explicitly scoped down | request event evidence or documented blocker |
| Internal route shows operational state | screenshot/browser smoke |
| Demo runbook exists | `DEMO_RUNBOOK.md` |
| UI meets DESIGN.md guardrails | screenshot review notes |
| End-to-end subscribe/redeem still works | tx hashes, DB rows, FS position IDs |
| Long-running server behavior is acceptable | 30+ minute run or documented shorter proof |

## Verification Commands / Evidence

Run the full suite available at the time:

```bash
cd indexspace/contracts
forge test -vvv
```

```bash
cd indexspace/backend
bun run typecheck
bun run test
bun run dev
```

```bash
cd indexspace/ui
bun run typecheck
bun run build
bun run dev
```

Browser checks:

- `/`
- `/vault/ai-acceleration`
- `/vault/crypto-reflexivity`
- `/internal`
- portfolio drawer
- mobile `/`

Failure evidence:

- simulator disabled flag works;
- backend unavailable state in UI;
- duplicate active request or wrong-network state remains controlled.

Regression evidence:

- Wave 04 end-to-end path still works after simulator/polish changes.

## Merge-Back Criteria

- Demo runbook is complete enough for a fresh run.
- Final screenshots are saved or linked in handoff.
- End-to-end evidence is captured.
- Known risks are explicit and bounded.
- No hidden mocks remain in the live-vault path unless named in runbook.

## Handoff Notes

Final handoff should include:

- deployed contract addresses;
- backend URL;
- UI URL;
- FunctionSpace endpoint;
- curator account names;
- simulator account names;
- exact commands run;
- checks not run;
- known demo risks;
- final demo script.
