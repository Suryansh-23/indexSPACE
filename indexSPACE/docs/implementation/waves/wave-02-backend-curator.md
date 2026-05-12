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

Complete.

## Prerequisites

- Read `indexSPACE/SPEC.md` sections 4, 7, 10, 11, 12, 13, 14.
- Read Wave 01 handoff for ABI/event names.
- Inspect `llms.txt` for SDK consumer guidance.
- Inspect relevant `@functionspace/core` exports before writing SDK calls.
- Confirm backend dependencies:
  - `hono`;
  - Bun SQLite (`bun:sqlite`);
  - `viem`;
  - `@functionspace/core`;
  - `@indexspace/shared`.

## Implementation Contracts

### Backend File Contract

Keep backend intentionally small:

```text
indexSPACE/backend/src/
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

- `indexSPACE/backend/**`
- `indexSPACE/shared/**` only for missing backend-facing types
- root/package manifests and `bun.lock` only for backend dependencies
- `indexSPACE/SPEC.md` only if backend API contract changes architecture

## Shared-Risk Areas

- Contract ABI imports/artifacts from Wave 01
- Shared index config
- FunctionSpace SDK auth/config files or env variables

## Forbidden Write Areas

- `indexSPACE/contracts/**` except ABI copy/reference updates
- `indexSPACE/ui/**`
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
cd indexSPACE/backend
bun install
bun run src/index.ts
```

Package scripts added during implementation:

```bash
bun run typecheck   # tsc --noEmit
bun run test        # bun test (20 tests)
bun run dev         # bun run --watch src/index.ts
bun start           # bun run src/index.ts
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

### Implementation Divergences

- SQLite driver: `bun:sqlite` (not `better-sqlite3`)
- Indexer uses in-process `MockVault` instead of RPC polling (real RPC deferred to Wave 04)
- `simulator_state` table schema exists but Simulator class does not persist to it (state is in-memory)
- No SDK preview calls before curator execution (deferred until FS credentials available)
- Contract name `IndexVault` (not `ForecastVault`)
- Root workspace paths updated from `indexspace/` to `indexSPACE/`

### Wave 03 Handoff

API routes (all prefix with `http://localhost:8787`):

| Route | Method | Description |
| --- | --- | --- |
| `/health` | GET | Server health, FS client status, mock mode, simulator state |
| `/api/indices` | GET | All four index definitions with constituents |
| `/api/vaults` | GET | Vault summary list (id, name, mode, live/preview status) |
| `/api/vaults/:vaultId` | GET | Vault detail with NAV/share, total shares, USDC balance |
| `/api/vaults/:vaultId/requests?controller=0x...` | GET | Request history filtered by vault and optional controller |
| `/api/vaults/:vaultId/positions` | GET | Open/closed FunctionSpace positions |
| `/api/vaults/:vaultId/candles` | GET | NAV candle history |
| `/api/vaults/:vaultId/quote-subscribe` | POST | Subscribe quote (body: `{ assets: string }`) |
| `/api/vaults/:vaultId/quote-redeem` | POST | Redeem quote (body: `{ shares: string }`) |
| `/internal/status` | GET | Full internal status (config, DB counts, simulator) |
| `/internal/curator/tick` | POST | Trigger curator to process one batch of pending requests |
| `/internal/indexer/tick` | POST | Trigger indexer to poll mock vault events |
| `/internal/simulator` | POST | Enable/disable simulator (body: `{ enabled: boolean }`) |
| `/internal/simulator/generate` | POST | One-shot simulator activity generation |

Response examples:

```
GET /health -> {"status":"ok","fsClientConfigured":false,"mockVault":true,"simulatorEnabled":true}
GET /api/vaults -> [{"id":"ai-acceleration","name":"AI Acceleration","mode":"live-vault","isLive":true}]
POST /api/vaults/ai-acceleration/quote-subscribe -> {"vaultId":"ai-acceleration","side":"subscribe","inputAssets":"500.000000","navPerShare":"1.0000...","allocations":[...]}
```

Default base URL: `http://localhost:8787`

Environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | HTTP server port |
| `HOST` | `0.0.0.0` | HTTP server host |
| `FS_USERNAME` | - | FunctionSpace API username |
| `FS_PASSWORD` | - | FunctionSpace API password |
| `FS_API_URL` | `https://fs-engine-api-dev.onrender.com` | FunctionSpace API base URL |
| `RPC_URL` | `http://localhost:8545` | Base Sepolia RPC (for Wave 04) |
| `MOCK_VAULT` | `true` | Use mock vault instead of real onchain |
| `POLL_INTERVAL_MS` | `10000` | Indexer poll interval |
| `CONFIRMATIONS` | `3` | Block confirmations |
| `REORG_BUFFER` | `20` | Reorg safety buffer |

Known UI-blocking gaps:
- No deployed contract addresses (vaults use mock state)
- No real onchain events (requests created via simulator or internal API)
- Vault detail returns empty `vaultAddress` and `shareAddress`

### Wave 04 Handoff

- Vault addresses: set in `indexSPACE/shared/src/indices.ts` when deployed
- Curator operator address: the `curator` constructor arg on `IndexVault`
- Request lifecycle states: pending -> executing -> claimable (via curator) -> claimed (via user or claim simulation)
- Claimable state polling: `GET /api/vaults/:vaultId/requests?controller=0x...` returns `status: "claimable"` rows
- Indexer checkpoints persisted in `indexer_checkpoints` table
- ABI path: `indexSPACE/contracts/out/IndexVault.sol/IndexVault.json`
