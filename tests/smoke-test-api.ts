/**
 * Backend Smoke Test
 *
 * Verifies all API endpoints respond correctly before starting SDK development.
 * Run with: npx tsx tests/smoke-test-api.ts
 *
 * Set these environment variables before running (or create a root .env file):
 *   FS_TEST_URL, FS_TEST_USERNAME, FS_TEST_PASSWORD, FS_TEST_MARKET_ID
 */
const BASE_URL = 'http://localhost:8000';
const USERNAME = '';
const PASSWORD =  '';
const MARKET_ID = '15';

if (!USERNAME || !PASSWORD) {
  console.error('Missing FS_TEST_USERNAME or FS_TEST_PASSWORD environment variables.');
  console.error('Set them in your shell or in a root .env file.');
  process.exit(1);
}

// ─────────────────────────────────────────────

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

const results: TestResult[] = [];
let token: string | null = null;

async function test(name: string, method: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    results.push({ endpoint: name, method, status: 'PASS', detail });
  } catch (e: any) {
    results.push({ endpoint: name, method, status: 'FAIL', detail: e.message });
  }
}

async function run() {
  // 1. Auth
  await test('/api/auth/login', 'POST', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    const data = await res.json();
    if (!data.success || !data.access_token) throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    token = data.access_token;
    return `Got token (${token!.substring(0, 20)}...)`;
  });

  const headers = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  // 2. Market State
  await test('/api/market/state', 'GET', async () => {
    const res = await fetch(`${BASE_URL}/api/market/state?market_id=${MARKET_ID}`, { headers: headers() });
    const data = await res.json();
    const fields = ['alpha_vector', 'market_params', 'title', 'total_volume', 'current_pool'];
    const missing = fields.filter(f => !(f in data));
    if (missing.length) throw new Error(`Missing fields: ${missing.join(', ')}. Got keys: ${Object.keys(data).join(', ')}`);
    return `title="${data.title}", K=${data.market_params?.K}, alpha_vector length=${data.alpha_vector?.length}`;
  });

  // 3. Positions
  await test('/api/market/positions', 'GET', async () => {
    const res = await fetch(`${BASE_URL}/api/market/positions?market_id=${MARKET_ID}`, { headers: headers() });
    const data = await res.json();
    if (!('positions' in data)) throw new Error(`No 'positions' key. Got: ${Object.keys(data).join(', ')}`);
    return `${data.positions.length} positions found`;
  });

  // 4. Sell Simulate (use first open position if available, otherwise skip)
  await test('/api/sell/simulate/{id}', 'GET', async () => {
    const posRes = await fetch(`${BASE_URL}/api/market/positions?market_id=${MARKET_ID}`, { headers: headers() });
    const posData = await posRes.json();
    const openPos = posData.positions?.find((p: any) => p.status === 'open');
    if (!openPos) return 'SKIPPED — no open positions to simulate';
    const res = await fetch(`${BASE_URL}/api/sell/simulate/${openPos.position_id}?market_id=${MARKET_ID}`, { headers: headers() });
    const data = await res.json();
    if (!('current_value_t_star' in data)) throw new Error(`Missing current_value_t_star. Got: ${Object.keys(data).join(', ')}`);
    return `position_id=${data.position_id}, value=${data.current_value_t_star}`;
  });

  // 5. Preview Settlement
  await test('/api/projection/project_settlement', 'POST', async () => {
    // Build a simple uniform belief vector
    const stateRes = await fetch(`${BASE_URL}/api/market/state?market_id=${MARKET_ID}`, { headers: headers() });
    const stateData = await stateRes.json();
    const K = stateData.market_params.K;
    const belief = Array(K + 1).fill(1 / (K + 1));
    const res = await fetch(`${BASE_URL}/api/projection/project_settlement?market_id=${MARKET_ID}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ belief_vector: belief, collateral: 10, num_outcomes: 20 }),
    });
    const data = await res.json();
    if (!data.projections) throw new Error(`No projections. Got: ${Object.keys(data).join(', ')}`);
    return `${data.projections.length} projections, max_payout=${data.max_payout}`;
  });

  // 6. Buy (small trade to verify endpoint works)
  await test('/api/market/buy', 'POST', async () => {
    const stateRes = await fetch(`${BASE_URL}/api/market/state?market_id=${MARKET_ID}`, { headers: headers() });
    const stateData = await stateRes.json();
    const K = stateData.market_params.K;
    const L = stateData.market_params.L;
    const H = stateData.market_params.H;
    const center = (L + H) / 2;
    // Simple Gaussian belief
    const belief = Array.from({ length: K + 1 }, (_, k) => {
      const u = k / K;
      const uCenter = (center - L) / (H - L);
      return Math.exp(-0.5 * ((u - uCenter) / 0.15) ** 2);
    });
    const sum = belief.reduce((a, b) => a + b, 0);
    const normalized = belief.map(v => v / sum);
    const res = await fetch(`${BASE_URL}/api/market/buy?market_id=${MARKET_ID}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ C: 1, p_vector: normalized, prediction: center }),
    });
    const data = await res.json();
    if (!data.success || !data.position) throw new Error(`Buy failed: ${JSON.stringify(data)}`);
    return `position_id=${data.position.position_id}, claims=${data.position.minted_claims_m}`;
  });

  // Print results
  console.log('\n=== Backend Smoke Test Results ===\n');
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'OK' : 'FAIL';
    console.log(`[${icon}] ${r.method} ${r.endpoint}`);
    console.log(`     ${r.detail}\n`);
  }
  const failed = results.filter(r => r.status === 'FAIL');
  if (failed.length) {
    console.log(`\n${failed.length} endpoint(s) FAILED. Fix before starting development.`);
    process.exit(1);
  } else {
    console.log('\nAll endpoints verified. Ready to build.');
  }
}

run();
