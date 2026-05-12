# Wave 02: Backend Indexer, Quotes, FunctionSpace SDK, And Curator

## Purpose

Build the backend service that turns onchain vault requests into FunctionSpace
trades and claimable vault requests.

This wave owns:

- Bun + Hono backend;
- SQLite persistence;
- Base Sepolia event polling;
- quote endpoints;
- FunctionSpace SDK client/auth helpers;
- curator execution for subscribe/redeem;
- internal health/status endpoints.

This wave should use mocks only where real Base Sepolia deployment is not yet
available. Any mock must be clearly isolated and replaceable in Wave 04.

## Status

Planned. Starts after Wave 01 is merged.

## Prerequisites

- Read `indexspace/SPEC.md` sections 4, 7, 10, 11, 12, 13, 14.
- Read Wave 01 handoff for ABI/event names.
- Inspect `llms.txt` for SDK consumer guidance.
- Inspect relevant `@functionspace/core` exports before writing SDK calls.
- Inspect existing smoke-test notes or create a small throwaway SDK dry run if
  credentials/endpoints are configured.
- Confirm backend dependencies:
  - `hono`;
  - `better-sqlite3` or Bun SQLite;
  - `viem`;
  - `@functionspace/core`;
  - `@indexspace/shared`.

## Implementation Contracts

### Backend File Contract

Keep backend intentionally small:

```text
indexspace/backend/src/
  index.ts
  config.ts
  db.ts
  sdk.ts
  quotes.ts
  curator.ts
  simulator.ts
```

Do not create a production-style folder tree until files become too large.

### SQLite Schema Contract

Minimum tables:

```text
requests
fs_positions
indexer_checkpoints
index_candles
simulator_state
```

`requests` required columns:

```text
id
chain_id
vault_id
vault_address
internal_request_id
controller
owner
kind                  -- subscribe | redeem
status                -- pending | executing | claimable | claimed | failed | cancelled
asset_amount
share_amount
tx_hash
log_index
block_number
execution_id
error
created_at
updated_at
```

`fs_positions` required columns:

```text
id
vault_id
market_id
position_id
status                -- open | closing | closed | failed
collateral
returned_collateral
belief_json
belief_hash
request_id
created_at
closed_at
```

`indexer_checkpoints` required columns:

```text
chain_id
contract_address
last_indexed_block
updated_at
```

`index_candles` required columns:

```text
vault_id
bucket_ts
open
high
low
close
gross_nav
share_supply
created_at
```

`simulator_state` required columns:

```text
key
value_json
updated_at
```

### API Contract

Required public API:

```text
GET  /health
GET  /api/indices
GET  /api/vaults
GET  /api/vaults/:vaultId
GET  /api/vaults/:vaultId/requests?controller=0x...
GET  /api/vaults/:vaultId/positions
GET  /api/vaults/:vaultId/candles
POST /api/vaults/:vaultId/quote-subscribe
POST /api/vaults/:vaultId/quote-redeem
```

Required internal API:

```text
GET  /internal/status
POST /internal/simulator
POST /internal/curator/tick
POST /internal/indexer/tick
```

### Quote Contract

Subscribe quote response:

```ts
{
  vaultId: string;
  side: "subscribe";
  inputAssets: string;
  navPerShare: string;
  estimatedShares: string;
  quoteExpiry: string;
  allocations: Array<{
    marketId: number;
    weight: number;
    collateral: string;
    shape: string;
    centerNormalized: number;
    widthNormalized: number;
    preview?: unknown;
  }>;
}
```

Redeem quote response:

```ts
{
  vaultId: string;
  side: "redeem";
  inputShares: string;
  navPerShare: string;
  estimatedAssets: string;
  quoteExpiry: string;
  unwindPlan: Array<{
    marketId: number;
    targetValue: string;
    positionIds: string[];
    previewSell?: unknown;
  }>;
}
```

Quotes are advisory. Contract state is final.

### Curator State Machine

```text
pending request
  -> executing
  -> fs trades complete
  -> onchain fulfill tx submitted
  -> claimable
```

Failure rule:

- If any FunctionSpace buy/sell fails, mark request `failed` and do not fulfill
  onchain.
- If FunctionSpace succeeds but onchain fulfill fails, mark request `failed`
  with `needs_manual_recovery`.
- Do not silently mint shares/assets against incomplete execution.

### Indexer Contract

Use HTTP polling and event filters:

- poll interval: 10 seconds;
- confirmations: 3 blocks;
- reorg buffer: 20 blocks;
- dedupe key: `chainId + contractAddress + txHash + logIndex`;
- resume from checkpoint minus reorg buffer.

## Owned Areas

- `indexspace/backend/**`
- `indexspace/shared/**` only for missing backend-facing types
- root/package manifests and `bun.lock` only for backend dependencies
- `indexspace/SPEC.md` only if backend API contract changes architecture

## Shared-Risk Areas

- Contract ABI imports/artifacts from Wave 01
- Shared index config
- FunctionSpace SDK auth/config files or env variables

## Forbidden Write Areas

- `indexspace/contracts/**` except ABI copy/reference updates
- `indexspace/ui/**`
- `packages/**` SDK internals
- `../index-space-ui-v0/**`

## Exact Tasks

1. Pre-work:
   - inspect `@functionspace/core` exports for `buy`, `sell`, `previewSell`,
     `previewPayoutCurve`, and belief generation helpers;
   - inspect Wave 01 ABI/events;
   - verify env requirements for FunctionSpace endpoint/auth and Base Sepolia
     RPC;
   - decide SQLite driver based on Bun compatibility.
2. Backend scaffold:
   - add Hono server;
   - add config/env loader;
   - add SQLite setup and migrations on boot;
   - add health/internal status routes.
3. Indexer:
   - poll vault events;
   - persist deduped request rows;
   - expose indexer checkpoint in `/internal/status`;
   - implement one-shot tick endpoint for tests/demo.
4. Quote engine:
   - compute NAV from idle USDC plus `previewSell` where available;
   - compute subscribe allocations by static weights;
   - compute redeem unwind plan from open lots FIFO;
   - return advisory quote payloads.
5. SDK client:
   - create vault-scoped FunctionSpace clients/accounts;
   - generate belief vectors from shared `ConstituentStrategy`;
   - call SDK previews before execution.
6. Curator:
   - process pending subscribe requests;
   - execute per-market FunctionSpace buys;
   - persist `fs_positions`;
   - fulfill deposit onchain;
   - process pending redeem requests;
   - sell lots FIFO per target value;
   - fulfill redeem onchain.
7. Tests/smoke:
   - unit-test quote math with deterministic fixtures;
   - unit-test request state transitions without live RPC;
   - run one SDK preview or ephemeral trade path if credentials/endpoints permit.

## Acceptance Table

| Item | Required Evidence |
| --- | --- |
| Backend boots with SQLite | `bun run` command output and `/health` response |
| Schema creates required tables | SQLite introspection or test output |
| Event indexer dedupes logs | test or dry-run evidence |
| Quote endpoints return typed subscribe/redeem payloads | curl/API output |
| Curator can process subscribe request | test with mocked contract or dev contract |
| Curator can process redeem request | test with seeded open lots |
| FunctionSpace SDK path is real | preview/trade smoke evidence or documented blocked env |
| Failure path is explicit | test for failed SDK trade or failed fulfill |

## Verification Commands / Evidence

Expected commands:

```bash
cd indexspace/backend
bun install
bun run src/index.ts
```

Add package scripts during implementation, then run the final scripts instead:

```bash
bun run typecheck
bun run test
bun run dev
```

API smoke examples:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/api/vaults
curl -X POST http://localhost:8787/api/vaults/ai-acceleration/quote-subscribe
```

Failure evidence:

- duplicate event replay does not create duplicate request;
- failed SDK/contract operation moves request to failed/manual recovery state.

Regression evidence:

- Wave 01 Foundry tests still pass after ABI/dependency changes.

## Merge-Back Criteria

- Backend routes and schema are stable for Wave 03/04 UI integration.
- Curator can run at least against mocks and ideally against dev/testnet.
- FunctionSpace SDK use is through `@functionspace/core`, not reimplemented math.
- No simulator account can fulfill user requests.

## Handoff Notes

Wave 03 needs:

- API route list;
- response examples;
- backend base URL default;
- env variable list;
- any known UI-blocking gaps.

Wave 04 needs:

- deployed vault addresses or local deployment instructions;
- curator operator address;
- request lifecycle states;
- claimable state polling guidance.
