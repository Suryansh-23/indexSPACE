"""
Backend Smoke Test

Verifies all API endpoints respond correctly before starting SDK development.
Run with: python tests/smoke-test-api.py

UPDATE THESE VARIABLES before running:
"""
import sys
import math
import requests

BASE_URL = 'http://localhost:8000'
USERNAME = 'SDK_demo'
PASSWORD = 'demo_2026_@@'
MARKET_ID = '15'

# ─────────────────────────────────────────────

results: list[dict] = []
token: str | None = None


def test(name: str, method: str, fn):
    try:
        detail = fn()
        results.append({'endpoint': name, 'method': method, 'status': 'PASS', 'detail': detail})
    except Exception as e:
        results.append({'endpoint': name, 'method': method, 'status': 'FAIL', 'detail': str(e)})


def run():
    global token

    # 1. Auth
    def test_login():
        global token
        res = requests.post(
            f'{BASE_URL}/api/auth/login',
            json={'username': USERNAME, 'password': PASSWORD}
        )
        data = res.json()
        if not data.get('success') or not data.get('access_token'):
            raise Exception(f"Unexpected response: {data}")
        token = data['access_token']
        return f"Got token ({token[:20]}...)"

    test('/api/auth/login', 'POST', test_login)

    def headers():
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

    # 2. Market State
    def test_market_state():
        res = requests.get(f'{BASE_URL}/api/market/state?market_id={MARKET_ID}', headers=headers())
        data = res.json()
        fields = ['alpha_vector', 'market_params', 'title', 'total_volume', 'current_pool']
        missing = [f for f in fields if f not in data]
        if missing:
            raise Exception(f"Missing fields: {', '.join(missing)}. Got keys: {', '.join(data.keys())}")
        return f"title=\"{data['title']}\", K={data.get('market_params', {}).get('K')}, alpha_vector length={len(data.get('alpha_vector', []))}"

    test('/api/market/state', 'GET', test_market_state)

    # 3. Positions
    def test_positions():
        res = requests.get(f'{BASE_URL}/api/market/positions?market_id={MARKET_ID}', headers=headers())
        data = res.json()
        if 'positions' not in data:
            raise Exception(f"No 'positions' key. Got: {', '.join(data.keys())}")
        return f"{len(data['positions'])} positions found"

    test('/api/market/positions', 'GET', test_positions)

    # 4. Sell Simulate (use first open position if available, otherwise skip)
    def test_sell_simulate():
        pos_res = requests.get(f'{BASE_URL}/api/market/positions?market_id={MARKET_ID}', headers=headers())
        pos_data = pos_res.json()
        positions = pos_data.get('positions', [])
        open_pos = next((p for p in positions if p.get('status') == 'open'), None)
        if not open_pos:
            return 'SKIPPED — no open positions to simulate'
        res = requests.get(f"{BASE_URL}/api/sell/simulate/{open_pos['position_id']}?market_id={MARKET_ID}", headers=headers())
        data = res.json()
        if 'current_value_t_star' not in data:
            raise Exception(f"Missing current_value_t_star. Got: {', '.join(data.keys())}")
        return f"position_id={data['position_id']}, value={data['current_value_t_star']}"

    test('/api/sell/simulate/{id}', 'GET', test_sell_simulate)

    # 5. Project Settlement
    def test_project_settlement():
        state_res = requests.get(f'{BASE_URL}/api/market/state?market_id={MARKET_ID}', headers=headers())
        state_data = state_res.json()
        K = state_data['market_params']['K']
        belief = [1 / (K + 1)] * (K + 1)
        res = requests.post(
            f'{BASE_URL}/api/projection/project_settlement?market_id={MARKET_ID}',
            headers=headers(),
            json={'belief_vector': belief, 'collateral': 10, 'num_outcomes': 20}
        )
        data = res.json()
        if not data.get('projections'):
            raise Exception(f"No projections. Got: {', '.join(data.keys())}")
        return f"{len(data['projections'])} projections, max_payout={data.get('max_payout')}"

    test('/api/projection/project_settlement', 'POST', test_project_settlement)

    # 6. Buy (small trade to verify endpoint works)
    def test_buy():
        state_res = requests.get(f'{BASE_URL}/api/market/state?market_id={MARKET_ID}', headers=headers())
        state_data = state_res.json()
        K = state_data['market_params']['K']
        L = state_data['market_params']['L']
        H = state_data['market_params']['H']
        center = (L + H) / 2
        # Simple Gaussian belief
        belief = []
        for k in range(K + 1):
            u = k / K
            u_center = (center - L) / (H - L)
            belief.append(math.exp(-0.5 * ((u - u_center) / 0.15) ** 2))
        total = sum(belief)
        normalized = [v / total for v in belief]
        res = requests.post(
            f'{BASE_URL}/api/market/buy?market_id={MARKET_ID}',
            headers=headers(),
            json={'C': 1, 'p_vector': normalized, 'prediction': center}
        )
        data = res.json()
        if not data.get('success') or not data.get('position'):
            raise Exception(f"Buy failed: {data}")
        return f"position_id={data['position']['position_id']}, claims={data['position']['minted_claims_m']}"

    test('/api/market/buy', 'POST', test_buy)

    # Print results
    print('\n=== Backend Smoke Test Results ===\n')
    for r in results:
        icon = 'OK' if r['status'] == 'PASS' else 'FAIL'
        print(f"[{icon}] {r['method']} {r['endpoint']}")
        print(f"     {r['detail']}\n")

    failed = [r for r in results if r['status'] == 'FAIL']
    if failed:
        print(f"\n{len(failed)} endpoint(s) FAILED. Fix before starting development.")
        sys.exit(1)
    else:
        print('\nAll endpoints verified. Ready to build.')


if __name__ == '__main__':
    run()
