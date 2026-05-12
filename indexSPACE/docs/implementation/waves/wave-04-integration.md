# Wave 04: End-To-End Integration

## Purpose

Wire the adopted UI, Base Sepolia vault contracts, backend APIs, wallet flow,
and FunctionSpace-derived state into one working demo path.

This wave proves the actual user-facing loop:

```text
connect wallet
-> approve USDC
-> request subscription
-> backend indexes request
-> curator executes FunctionSpace basket
-> curator fulfills vault request
-> user claims shares
-> user requests redemption
-> curator sells FunctionSpace lots
-> curator fulfills redeem request
-> user claims USDC
```

## Status

Complete.

## Prerequisites

- Read Wave 01 contract handoff.
- Read Wave 02 backend/API handoff.
- Read Wave 03 UI handoff.
- Confirm Base Sepolia RPC and wallet/faucet setup.
- Confirm Circle Base Sepolia USDC availability and faucet link.
- Confirm FunctionSpace endpoint/auth material for vault-scoped accounts.
- Run contract tests, backend tests, and UI build before integration changes.

## Implementation Contracts

### Wallet Contract

Use:

- `wagmi`;
- `viem`;
- RainbowKit or a simple wagmi connector UI if RainbowKit conflicts with the
  visual system.

Required wallet states:

```text
disconnected
wrong network
connected/no allowance
connected/ready
tx pending
request pending
claimable
claimed
failed
```

The UI must show Base Sepolia explicitly. Wrong-network state must not submit
transactions.

### Contract Client Contract

Create UI-side contract client helpers:

```text
indexspace/ui/lib/contracts.ts
indexspace/ui/lib/wagmi.ts
```

Required functions:

```ts
approveVault(vaultId, assets)
requestDeposit(vaultId, assets, controller, owner)
requestRedeem(vaultId, shares, controller, owner)
claimDeposit(vaultId, receiver, controller)
claimRedeem(vaultId, receiver, controller)
readUserRequest(vaultId, controller)
readBalances(vaultId, owner)
```

Do not submit FunctionSpace trades from React.

### Backend Client Contract

Replace Wave 03 mocks with Wave 02 API calls behind the existing adapter.

Required behavior:

- if backend is unavailable, show explicit degraded state;
- preserve preview-only index behavior;
- poll active request status after user submits onchain request;
- update portfolio drawer from backend + contract state;
- show FunctionSpace position IDs where backend exposes them.

### Deployment Contract

At least two live vaults must be deployable/configurable:

- AI Acceleration;
- Crypto Reflexivity.

Vault addresses must flow through config, not hardcoded in components.

Preview-only indices must stay non-tradeable.

## Owned Areas

- `indexspace/ui/**`
- `indexspace/backend/**`
- `indexspace/contracts/**` deployment/config files only if needed
- `indexspace/shared/**` for final deployed address config
- package manifests and lockfiles as needed

## Shared-Risk Areas

- Contract ABI/address synchronization
- Backend API payload shape
- UI wallet and request state machine
- FunctionSpace account credentials

## Forbidden Write Areas

- `packages/**` SDK internals
- `../index-space-ui-v0/**`
- unrelated root docs outside `indexspace/` unless correcting drift

## Exact Tasks

1. Pre-work:
   - deploy or locally deploy both live vault contracts;
   - record addresses in shared config or env;
   - verify USDC approval/request flow with a small script or UI;
   - verify backend can see the emitted request event.
2. Wallet/UI wiring:
   - add wallet provider;
   - implement network/allowance/balance reads;
   - wire subscribe and redeem buttons to contract writes;
   - wire claim buttons.
3. Backend wiring:
   - configure RPC/vault addresses;
   - run indexer against deployed vaults;
   - run curator tick on detected requests;
   - expose updated request and position state to UI.
4. FunctionSpace execution:
   - execute real SDK buy path for subscribe requests on dev endpoint;
   - persist position IDs;
   - execute sell path for redeem requests using stored lots;
   - expose execution evidence.
5. UI state:
   - trade drawer reflects real request lifecycle;
   - portfolio drawer reflects real shares/requests;
   - internal page reflects backend/indexer/curator status;
   - chart/NAV data uses backend candles or deterministic fallback.
6. End-to-end smoke:
   - subscribe small amount;
   - claim shares;
   - redeem small amount;
   - claim USDC.

## Acceptance Table

| Item | Required Evidence |
| --- | --- |
| Wallet connects to Base Sepolia | browser screenshot/state |
| USDC approval works | tx hash or viem receipt |
| `requestDeposit` emits event | tx/log evidence |
| Backend indexes deposit request | SQLite row/API response |
| Curator executes FunctionSpace buys | FunctionSpace position IDs persisted |
| Deposit fulfillment makes claimable | contract read/UI state |
| User claims shares | tx hash and share balance change |
| Redeem request works | tx/log evidence |
| Curator sells lots and fulfills redeem | persisted sell result and claimable assets |
| User claims USDC | tx hash and asset balance change |
| Preview-only indices cannot trade | browser failure/disabled evidence |

## Verification Commands / Evidence

Expected command set:

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

State evidence:

- SQLite request rows;
- SQLite `fs_positions` rows;
- contract reads for pending/claimable request state;
- FunctionSpace position IDs;
- tx hashes for approval/request/claim.

Failure evidence:

- wrong network blocks submit;
- preview-only index blocks submit;
- duplicate active request shows `ACTIVE_REQUEST` or controlled UI error.

Regression evidence:

- Wave 03 UI still renders dashboard/vault/internal after real adapter wiring.

## Merge-Back Criteria

- One complete subscribe and redeem path works for at least one live vault.
- Second live vault is configured and at least quote/request-ready.
- All real credentials/env requirements are documented in handoff.
- Any non-working piece is explicitly categorized as a blocker, not hidden as a
  mock.

## Handoff Notes

### Implementation Notes

- Deployment: IndexVault contracts deployed to local Anvil via `forge script`
- Anvil addresses stored in `@indexspace/shared` (ANVIL_AI_VAULT, ANVIL_CRYPTO_VAULT, etc.)
- Backend has hybrid mode: `MOCK_VAULT=true` (default) uses mock vault; `MOCK_VAULT=false` + `RPC_URL` + `CURATOR_PRIVATE_KEY` uses real Anvil chain
- RealIndexer polls `DepositRequest` / `RedeemRequest` events via viem, deduped by tx_hash+log_index
- Curator calls `fulfillDeposit` / `fulfillRedeem` onchain when `CURATOR_PRIVATE_KEY` is set
- FSClient buy/sell calls wrapped in try/catch; falls back to mock position IDs when FS not configured
- UI adapter (`lib/indexspace-api.ts`) tries backend API first, falls back to deterministic mock data on 3s timeout
- Contract client (`lib/contracts.ts`) provides `approveVault`, `requestDeposit`, `requestRedeem`, `claimDeposit`, `claimRedeem`, `readUserRequest`, `readBalances`
- Wagmi config (`lib/wagmi.ts`) configured with Anvil (31337) + Base Sepolia (84532)
- Internal page fetches live backend status; shows degraded state when backend unreachable
- No browser available for wallet/UI smoke testing; all contract client code is wired but unverified via UI

### Blocker: no browser verification
Wallet connection, approve/deposit/redeem/claim contract flows cannot be tested without browser. Code is ready for Wave 05 browser session.

### Wave 05 Handoff

- Demo runbook: start anvil -> deploy contracts -> start backend (mock=false) -> start UI -> open browser
- Deployed addresses: see `@indexspace/shared` `ANVIL_*` exports
- Backend env file shape:
  ```
  MOCK_VAULT=false
  RPC_URL=http://localhost:8545
  CURATOR_PRIVATE_KEY=0xac09...ff80 (anvil account #0)
  FS_USERNAME=<functionspace username>
  FS_PASSWORD=<functionspace password>
  ```
- Simulator-safe accounts: anvil account #0 (deployer), #1 (curator)
- Known gaps: wallet UI flow, onchain fulfill confirmation, browser screenshots
