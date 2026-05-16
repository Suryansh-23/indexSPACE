#!/usr/bin/env bash
# IndexSpace end-to-end flow test (Base Sepolia)
# Usage: CURATOR_PRIVATE_KEY=0x... bash test-flow.sh
set -euo pipefail

RPC="https://sepolia.base.org"
AI_VAULT="0x98FB1483c889cB936E6eaD120fC45654afAb5B67"
BACKEND="http://localhost:8787"
CURATOR_ADDR="0x71b18BB22528ceba7fc35dc90F27d334562E621C"

# Test wallet can be overridden per run to keep the flow replayable.
TEST_ADDR="${TEST_ADDR:-0x4060a4CD7A5C85e1080FEFc306ACeCF13EB44ADf}"
TEST_KEY="${TEST_KEY:-0xaf6df2ef9252fa139800bf2ee642e91c4edb388b53f80428299d9619b7aa1cee}"

CURATOR_KEY="${CURATOR_PRIVATE_KEY:?CURATOR_PRIVATE_KEY env var required}"
FUND_ETH_WEI="${FUND_ETH_WEI:-2000000000000000}"   # 0.002 ETH
FUND_USDC_AMT="${FUND_USDC_AMT:-2000000}"           # 2 USDC (6 decimals) — keep small; FS wallet cap is $1000
DEPOSIT_AMT="${DEPOSIT_AMT:-1000000}"              # 1 USDC (6 decimals)

json_get() {
  local expr="$1"
  python3 -c "$expr"
}

cast_uint() {
  tr -d '\n' | sed 's/ .*//'
}

next_curator_nonce() {
  cast nonce "$CURATOR_ADDR" --block pending --rpc-url "$RPC" | cast_uint
}

send_curator_tx() {
  local nonce
  nonce=$(next_curator_nonce)
  cast send "$@" \
    --nonce "$nonce" \
    --private-key "$CURATOR_KEY" \
    --rpc-url "$RPC" \
    --timeout 60
}

require_backend() {
  local health
  health=$(curl -sf "$BACKEND/health")
  echo "$health" | json_get "import json,sys; d=json.load(sys.stdin); assert d.get('status') == 'ok'; assert d.get('mockVault') is False; print('Backend healthy in real mode')"
}

fresh_wallet_guard() {
  local asset_bal share_bal reqs eth_bal
  eth_bal=$(cast balance "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)
  asset_bal=$(cast call "$ASSET" "balanceOf(address)(uint256)" "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)
  share_bal=$(cast call "$AI_VAULT" "balanceOf(address)(uint256)" "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)
  reqs=$(curl -sf "$BACKEND/api/vaults/ai-acceleration/requests?controller=$TEST_ADDR")

  if [ "$share_bal" != "0" ] || [ "$reqs" != "[]" ]; then
    echo "Fresh-wallet preflight failed for non-resettable state."
    echo "  ETH balance:   $eth_bal"
    echo "  Asset balance: $asset_bal"
    echo "  Share balance: $share_bal"
    echo "  Requests:      $reqs"
    echo "ETH and idle asset balance are allowed to be prefunded; shares and requests must be empty."
    exit 1
  fi
}

ensure_curator_liquidity() {
  local curator_usdc
  curator_usdc=$(cast call "$ASSET" "balanceOf(address)(uint256)" "$CURATOR_ADDR" --rpc-url "$RPC" | cast_uint)
  if [ "$curator_usdc" -lt "$FUND_USDC_AMT" ]; then
    echo "Curator does not have enough asset balance for funding."
    echo "  Curator asset: $curator_usdc"
    echo "  Required:      $FUND_USDC_AMT"
    echo "Reduce FUND_USDC_AMT/DEPOSIT_AMT or refill the curator wallet."
    exit 1
  fi
}

echo "=== IndexSpace E2E Test ==="
echo "Test wallet: $TEST_ADDR"
echo "Vault:       $AI_VAULT (ai-acceleration)"
echo ""

ASSET=$(cast call "$AI_VAULT" "asset()(address)" --rpc-url "$RPC")
ASSET_DECIMALS=$(cast call "$ASSET" "decimals()(uint8)" --rpc-url "$RPC" | cast_uint)
ASSET_SYMBOL=$(cast call "$ASSET" "symbol()(string)" --rpc-url "$RPC" | tr -d '"')
ASSET_NAME=$(cast call "$ASSET" "name()(string)" --rpc-url "$RPC" | tr -d '"')

echo "Asset:       $ASSET_NAME ($ASSET_SYMBOL) @ $ASSET"
echo ""

echo "[0/9] Backend + wallet preflight..."
require_backend
fresh_wallet_guard
ensure_curator_liquidity

NAV_BEFORE=$(curl -sf "$BACKEND/api/vaults/ai-acceleration" | json_get "import json,sys; d=json.load(sys.stdin); print(d['metrics']['navPerShare'])")
echo "      NAV before: $NAV_BEFORE"
echo "      Funding:    $(python3 - "$FUND_USDC_AMT" "$ASSET_DECIMALS" <<'PY'
import sys
amt = int(sys.argv[1]); dec = int(sys.argv[2])
places = min(dec, 6)
print(format(amt / (10 ** dec), f'.{places}f'))
PY
) $ASSET_SYMBOL"
echo "      Deposit:    $(python3 - "$DEPOSIT_AMT" "$ASSET_DECIMALS" <<'PY'
import sys
amt = int(sys.argv[1]); dec = int(sys.argv[2])
places = min(dec, 6)
print(format(amt / (10 ** dec), f'.{places}f'))
PY
) $ASSET_SYMBOL"

# ── 1. Fund test wallet ───────────────────────────────────────────────────────
EXISTING_ETH=$(cast balance "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)
if [ "$EXISTING_ETH" -lt "$FUND_ETH_WEI" ]; then
  echo "[1/9] Funding test wallet with gas..."
  send_curator_tx "$TEST_ADDR" --value "$FUND_ETH_WEI"
else
  echo "[1/9] Skipping ETH funding; wallet already has gas."
fi

USDC_BAL=$(cast call "$ASSET" "balanceOf(address)(uint256)" "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)
if [ "$USDC_BAL" -lt "$FUND_USDC_AMT" ]; then
  TOP_UP=$((FUND_USDC_AMT - USDC_BAL))
  echo "[2/9] Sending test asset to wallet..."
  send_curator_tx "$ASSET" "transfer(address,uint256)" "$TEST_ADDR" "$TOP_UP"
else
  echo "[2/9] Skipping asset funding; wallet already has enough."
fi

USDC_BAL=$(cast call "$ASSET" "balanceOf(address)(uint256)" "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)
echo "      Asset balance: $(python3 - "$USDC_BAL" "$ASSET_DECIMALS" <<'PY'
import sys
bal = int(sys.argv[1])
dec = int(sys.argv[2])
places = min(dec, 6)
print(format(bal / (10 ** dec), f'.{places}f'))
PY
) $ASSET_SYMBOL"

# ── 2. Subscribe flow ─────────────────────────────────────────────────────────
echo "[3/9] Approving deposit amount for vault..."
cast send "$ASSET" "approve(address,uint256)" "$AI_VAULT" "$DEPOSIT_AMT" \
  --private-key "$TEST_KEY" \
  --rpc-url "$RPC" \
  --timeout 60

ALLOWANCE=0
for i in $(seq 1 10); do
  ALLOWANCE=$(cast call "$ASSET" "allowance(address,address)(uint256)" "$TEST_ADDR" "$AI_VAULT" --rpc-url "$RPC" | cast_uint)
  if [ "$ALLOWANCE" -ge "$DEPOSIT_AMT" ]; then
    echo "      Allowance confirmed: $ALLOWANCE"
    break
  fi
  echo "      ... waiting for allowance propagation ($i/10)"
  sleep 2
done

if [ "$ALLOWANCE" -lt "$DEPOSIT_AMT" ]; then
  echo "Allowance never reached deposit amount."
  exit 1
fi

echo "[4/9] Requesting deposit..."
cast send "$AI_VAULT" "requestDeposit(uint256,address,address)" \
  "$DEPOSIT_AMT" "$TEST_ADDR" "$TEST_ADDR" \
  --private-key "$TEST_KEY" \
  --rpc-url "$RPC" \
  --timeout 60

echo "[5/9] Triggering backend indexer + curator tick..."
curl -sf -X POST "$BACKEND/internal/indexer/tick" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  indexed:', d.get('indexed',0), 'events')"
sleep 2
curl -sf -X POST "$BACKEND/internal/curator/tick" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  curator processed:', d.get('processed',0), 'requests')"

echo "[6/9] Checking request status..."
sleep 3
STATUS=$(curl -sf "$BACKEND/api/vaults/ai-acceleration/requests?controller=$TEST_ADDR")
echo "  $STATUS"

echo "[7/9] Waiting for claimable status..."
for i in $(seq 1 10); do
  curl -sf -X POST "$BACKEND/internal/indexer/tick" >/dev/null || true
  sleep 1
  curl -sf -X POST "$BACKEND/internal/curator/tick" >/dev/null || true
  STATUS_JSON=$(curl -sf "$BACKEND/api/vaults/ai-acceleration/requests?controller=$TEST_ADDR")
  CLAIMABLE=$(echo "$STATUS_JSON" | python3 -c "import json,sys; rows=json.load(sys.stdin); print(any(r.get('status')=='claimable' for r in rows))" 2>/dev/null)
  if [ "$CLAIMABLE" = "True" ]; then
    echo "  ✓ Request is claimable"
    break
  fi
  echo "  ... attempt $i/10 — not claimable yet"
  sleep 4
done

STATUS_JSON=$(curl -sf "$BACKEND/api/vaults/ai-acceleration/requests?controller=$TEST_ADDR")
CLAIMABLE=$(echo "$STATUS_JSON" | python3 -c "import json,sys; rows=json.load(sys.stdin); print(any(r.get('status')=='claimable' for r in rows))")
if [ "$CLAIMABLE" != "True" ]; then
  echo "Request never became claimable."
  echo "$STATUS_JSON"
  exit 1
fi

echo "[8/9] Claiming deposit..."
cast send "$AI_VAULT" "claimDeposit(address,address)" \
  "$TEST_ADDR" "$TEST_ADDR" \
  --private-key "$TEST_KEY" \
  --rpc-url "$RPC" \
  --timeout 60

echo "[9/9] Final verification..."
CLAIMED="False"
FINAL_STATUS="[]"
for i in $(seq 1 12); do
  curl -sf -X POST "$BACKEND/internal/indexer/tick" >/dev/null || true
  FINAL_STATUS=$(curl -sf "$BACKEND/api/vaults/ai-acceleration/requests?controller=$TEST_ADDR")
  CLAIMED=$(echo "$FINAL_STATUS" | python3 -c "import json,sys; rows=json.load(sys.stdin); print(any(r.get('status')=='claimed' for r in rows))")
  if [ "$CLAIMED" = "True" ]; then
    echo "      Claimed status confirmed after claim ($i/12)"
    break
  fi
  echo "      ... waiting for claim event indexing ($i/12)"
  sleep 3
done
NAV_AFTER=$(curl -sf "$BACKEND/api/vaults/ai-acceleration" | json_get "import json,sys; d=json.load(sys.stdin); print(d['metrics']['navPerShare'])")

SHARE_BAL=$(cast call "$AI_VAULT" "balanceOf(address)(uint256)" "$TEST_ADDR" --rpc-url "$RPC" | cast_uint)

if [ "$SHARE_BAL" = "0" ]; then
  echo "Share balance is still zero after claim."
  exit 1
fi

if [ "$CLAIMED" != "True" ]; then
  echo "Request did not reach claimed status."
  echo "$FINAL_STATUS"
  exit 1
fi

python3 - "$NAV_BEFORE" "$NAV_AFTER" <<'PY'
import sys
before = float(sys.argv[1])
after = float(sys.argv[2])
if after + 1e-12 < before:
    print(f"NAV regressed: before={before:.12f} after={after:.12f}")
    raise SystemExit(1)
print(f"NAV check passed: before={before:.12f} after={after:.12f}")
PY

echo ""
echo "=== Result ==="
echo "Share balance: $(echo "scale=6; $SHARE_BAL / 1000000000000000000" | bc) shares"
echo "Request status: claimed"
echo "NAV before:    $NAV_BEFORE"
echo "NAV after:     $NAV_AFTER"
echo ""
echo "Done! Full subscribe flow verified on Base Sepolia."
