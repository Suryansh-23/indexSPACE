# Wave 01: Product Substrate, Shared Config, And Vault Contracts

## Purpose

Create the stable substrate that every later wave depends on:

- shared index/vault configuration;
- shared request, vault, constituent, and execution types;
- Foundry contract scaffold;
- minimal ERC-7540-compatible async vault contract;
- contract tests for request lifecycle and asset/share accounting.

This wave must not build backend curator logic or UI integration.

## Status

Complete.

## Prerequisites

- Read `indexSPACE/SPEC.md` fully.
- Read `indexSPACE/DESIGN.md` only for naming/product language that appears in
  shared config.
- Inspect current package manifests:
  - root `package.json`;
  - `indexSPACE/shared/package.json`;
  - `indexSPACE/contracts/foundry.toml`;
  - SDK package exports if shared config imports SDK types.
- Verify Foundry is available with `forge --version`.
- Verify Bun workspace resolution with `bun install` if dependencies change.

## Implementation Contracts

### Shared Config Contract

Add shared config under `indexSPACE/shared/src/`.

Minimum files:

```text
indexSPACE/shared/src/index.ts
indexSPACE/shared/src/chains.ts
indexSPACE/shared/src/indices.ts
indexSPACE/shared/src/types.ts
```

Required exported constants:

```ts
BASE_SEPOLIA_CHAIN_ID = 84532
BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
```

Required exported types must match `SPEC.md`:

- `VaultMode`
- `RequestStatus`
- `Orientation`
- `IndexConstituent`
- `ForecastIndex`
- `ConstituentStrategy`
- `VaultExecution`

Required exported index config:

- `FORECAST_INDICES`
- `LIVE_VAULT_IDS = ["ai-acceleration", "crypto-reflexivity"]`
- `PREVIEW_INDEX_IDS = ["macro-stress", "creator-momentum"]`

All market IDs, weights, ranges, orientations, and roles must come from
`SPEC.md` section 13. The config must fail TypeScript if weights are missing or
if unsupported orientation/role strings are used.

### Contract Scope

Implement a minimal async vault contract in `indexSPACE/contracts/src/`.

The contract is named `IndexVault` (file: `IndexVault.sol`).

Required properties:

- one ERC-20 share token per vault contract;
- asset is Circle Base Sepolia USDC;
- shares use 18 decimals;
- asset accounting accepts 6-decimal USDC;
- first deposit mint math treats `navPerShare = 1`;
- later fulfillment uses curator-provided shares/assets according to MVP model;
- `requestId = 0` for ERC-7540-style query functions;
- one active request total per controller;
- manual user claim for deposit and redeem;
- operator approval functions exist but operator claiming is not required for MVP.

Required public methods:

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

Required implementation-specific methods:

```solidity
fulfillDeposit(address controller, uint256 shares)
fulfillRedeem(address controller, uint256 assets)
claimDeposit(address receiver, address controller)
claimRedeem(address receiver, address controller)
```

Names can vary only if strongly justified, but the ABI must be documented for
Wave 02 and Wave 04.

### Contract Events

Emit events suitable for backend polling:

```solidity
event DepositRequest(
  uint256 indexed internalRequestId,
  address indexed controller,
  address indexed owner,
  uint256 assets
);

event RedeemRequest(
  uint256 indexed internalRequestId,
  address indexed controller,
  address indexed owner,
  uint256 shares
);

event DepositFulfilled(
  uint256 indexed internalRequestId,
  address indexed controller,
  uint256 assets,
  uint256 shares
);

event RedeemFulfilled(
  uint256 indexed internalRequestId,
  address indexed controller,
  uint256 shares,
  uint256 assets
);

event DepositClaimed(
  uint256 indexed internalRequestId,
  address indexed controller,
  address indexed receiver,
  uint256 shares
);

event RedeemClaimed(
  uint256 indexed internalRequestId,
  address indexed controller,
  address indexed receiver,
  uint256 assets
);
```

If event names differ, update later wave docs before implementation continues.

### Request State Contract

Use the state machine from `SPEC.md`:

```text
None -> Pending -> Claimable -> None
```

Rules:

- `requestDeposit` rejects if controller has any pending or claimable request.
- `requestRedeem` rejects if controller has any pending or claimable request.
- `claimDeposit` clears the request after minting/transferring shares.
- `claimRedeem` clears the request after transferring assets.
- fulfill functions are curator/operator/admin gated.
- no automatic push claim during fulfillment.
- no failure/cancel path in MVP.

### Mock Asset

For local tests, add a minimal mock ERC-20 with 6 decimals (`MockUSDC.sol`).
Do not use it in production config.

## Owned Areas

- `indexSPACE/shared/**`
- `indexSPACE/contracts/**`
- root or workspace package manifests only if dependencies/scripts are required
- `indexSPACE/SPEC.md` only for correcting contract/API names discovered during
  implementation

## Shared-Risk Areas

- Root `package.json` and `bun.lock`
- Contract ABI artifacts that Wave 02 and Wave 04 depend on
- Shared type names consumed by backend/UI

## Forbidden Write Areas

- `indexSPACE/backend/**` except package dependency adjustments if absolutely
  required
- `indexSPACE/ui/**`
- `packages/**` SDK internals
- `../index-space-ui-v0/**`

## Exact Tasks

1. Pre-work:
   - read canonical docs and manifests;
   - inspect OpenZeppelin availability or add dependency;
   - confirm Foundry layout and version.
2. Shared config:
   - create typed index config from `SPEC.md`;
   - export chain constants and shared request/execution types;
   - add simple weight-sum helper or test if practical.
3. Contracts:
   - add mock USDC for tests;
   - implement minimal async forecast vault;
   - wire owner/curator access;
   - implement request/fulfill/claim lifecycle;
   - implement operator approval read/write functions.
4. Tests:
   - deposit request pulls USDC and marks pending;
   - second request for same controller reverts with active request;
   - fulfill deposit marks claimable and claim mints shares;
   - redeem request locks/burns shares according to selected approach;
   - fulfill redeem marks claimable and claim transfers USDC;
   - non-curator cannot fulfill.
5. Documentation:
   - record final ABI/event names in wave handoff;
   - update `SPEC.md` only if implementation contract names intentionally
     differ from planned names.

## Acceptance Table

| Item | Required Evidence |
| --- | --- |
| Shared config exports all four indices with exact SPEC market IDs/weights | TypeScript compile or targeted test output |
| Contract implements one active request per controller | Foundry test showing second request revert |
| Deposit lifecycle works | Foundry test: request -> fulfill -> claim |
| Redeem lifecycle works | Foundry test: request -> fulfill -> claim |
| Curator gate works | Foundry test for unauthorized fulfill revert |
| ABI/events are ready for backend | Generated ABI path and event names listed in handoff |

## Verification Commands / Evidence

Run, at minimum:

```bash
cd indexSPACE/contracts
forge test -vvv
```

If shared TypeScript changed:

```bash
cd indexSPACE/shared
bunx tsc --noEmit
```

If repo-level TypeScript config cannot check `shared`, document the limitation
and add a smaller package-level check. (This was the case: root workspace paths
in `package.json` use `indexspace/` lowercase but directories are `indexSPACE/`
mixed case, so a package-level `tsconfig.json` was added to shared.)

Failure evidence:

- intentional unauthorized fulfill;
- intentional duplicate active request.

Regression evidence:

- root package install still resolves;
- existing SDK tests are not required in this wave unless root config changes
  affect them.

## Merge-Back Criteria

- Foundry tests pass.
- Shared config is committed and importable.
- Contract ABI/event names are stable enough for Wave 02.
- No backend or UI code depends on unstated contract behavior.

## Handoff Notes

Wave 02 needs:

- contract ABI paths: `indexSPACE/contracts/out/IndexVault.sol/IndexVault.json`
- constructor args: `(address asset_, address curator_, string memory name_, string memory symbol_)`
  - asset: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia USDC)
  - curator: address of the backend curator account
- event names/signatures (all include `indexed internalRequestId`):
  - `DepositRequest(uint256,address,address,uint256)`
  - `RedeemRequest(uint256,address,address,uint256)`
  - `DepositFulfilled(uint256,address,uint256,uint256)`
  - `RedeemFulfilled(uint256,address,uint256,uint256)`
  - `DepositClaimed(uint256,address,address,uint256)`
  - `RedeemClaimed(uint256,address,address,uint256)`
- curator/admin address: set as immutable constructor arg, not changeable post-deploy
- shared index config exports available from `@indexspace/shared`

## Implementation Notes

- Contract name: `IndexVault` (not `ForecastVault` as originally implied by spec language)
- Request struct includes `requestId` field to ensure fulfill/claim events reference the correct request ID
- `requestDeposit`/`requestRedeem` require `msg.sender == owner` (authorization guard)
- `address(0)` rejected in both request functions
- OpenZeppelin v5.6.1 installed via `forge install`
- Foundry v1.7.1 installed at setup (was not previously available)
- 9 Foundry tests covering all acceptance criteria
- Bug discovered via code review: stale `_nextRequestId` in fulfill/claim events (fixed)
