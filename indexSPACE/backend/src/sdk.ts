import { FSClient } from "@functionspace/core";
import { buy as fsBuy, sell as fsSell, queryMarketState, validateBeliefVector } from "@functionspace/core";
import { generateGaussian, generateRange, generateLeftSkew, generateRightSkew } from "@functionspace/core";
import type { ConstituentStrategy, Orientation } from "@indexspace/shared";

export interface VaultClient {
  client: FSClient;
  vaultId: string;
  fsUsername: string;
}

let _fsClient: FSClient | null = null;

export function getFsClient(apiUrl: string, username?: string, password?: string): FSClient | null {
  if (_fsClient) return _fsClient;
  if (!username || !password) return null;
  _fsClient = new FSClient({ baseUrl: apiUrl, username, password });
  return _fsClient;
}

export function resetFsClient(): void {
  _fsClient = null;
}

export function getDefaultStrategy(
  weight: number,
  orientation: Orientation,
): ConstituentStrategy {
  const defaults: Record<Orientation, { centerNormalized: number; widthNormalized: number; shape: ConstituentStrategy["shape"] }> = {
    higher_is_bullish: { centerNormalized: 0.72, widthNormalized: 0.15, shape: "right_skew" },
    lower_is_bullish: { centerNormalized: 0.28, widthNormalized: 0.15, shape: "left_skew" },
    higher_is_stress: { centerNormalized: 0.78, widthNormalized: 0.12, shape: "range" },
    lower_is_stress: { centerNormalized: 0.22, widthNormalized: 0.12, shape: "range" },
  };

  const base = defaults[orientation];
  const jitter = (Math.random() - 0.5) * 0.04;

  return {
    weight,
    shape: base.shape,
    centerNormalized: Math.max(0, Math.min(1, base.centerNormalized + jitter)),
    widthNormalized: base.widthNormalized,
    jitterBps: Math.round(Math.abs(jitter) * 10000),
  };
}

interface MarketBounds {
  numBuckets: number;
  lowerBound: number;
  upperBound: number;
}

const _marketBoundsCache = new Map<number, { data: MarketBounds; expiresAt: number }>();
const MARKET_CACHE_TTL_MS = 60_000;

async function getMarketBounds(marketId: number): Promise<MarketBounds | null> {
  if (!_fsClient) return null;

  const cached = _marketBoundsCache.get(marketId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const state = await queryMarketState(_fsClient, marketId);
    const data: MarketBounds = {
      numBuckets: state.config.numBuckets,
      lowerBound: state.config.lowerBound,
      upperBound: state.config.upperBound,
    };
    _marketBoundsCache.set(marketId, { data, expiresAt: Date.now() + MARKET_CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error(`Failed to query market state for market ${marketId}:`, err);
    return null;
  }
}

export function buildBeliefVector(
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
  strategy: ConstituentStrategy,
): number[] {
  const range = upperBound - lowerBound;
  const center = lowerBound + strategy.centerNormalized * range;
  const spread = strategy.widthNormalized * range;

  switch (strategy.shape) {
    case "gaussian":
      return generateGaussian(center, spread, numBuckets, lowerBound, upperBound);
    case "range": {
      const lo = center - spread / 2;
      const hi = center + spread / 2;
      return generateRange(lo, hi, numBuckets, lowerBound, upperBound);
    }
    case "right_skew":
      return generateRightSkew(center, spread, numBuckets, lowerBound, upperBound);
    case "left_skew":
      return generateLeftSkew(center, spread, numBuckets, lowerBound, upperBound);
    default:
      return generateGaussian(center, spread, numBuckets, lowerBound, upperBound);
  }
}

export interface FsBuyResult {
  positionId: string | number;
  marketId: number;
}

export async function tryFsBuy(
  marketId: number,
  collateral: number,
  strategy: ConstituentStrategy,
): Promise<FsBuyResult | null> {
  try {
    if (!_fsClient) return null;

    const bounds = await getMarketBounds(marketId);
    if (!bounds) return null;

    const { numBuckets, lowerBound, upperBound } = bounds;
    const belief = buildBeliefVector(numBuckets, lowerBound, upperBound, strategy);

    validateBeliefVector(belief, numBuckets);

    const result = await fsBuy(_fsClient, marketId, belief, Math.floor(collateral * 1e6), numBuckets);
    return { positionId: result.positionId, marketId };
  } catch (err) {
    console.error(`FS buy failed for market ${marketId}:`, err);
    return null;
  }
}

export async function tryFsSell(
  positionId: string | number,
  marketId: number,
): Promise<boolean> {
  try {
    if (!_fsClient) return false;
    await fsSell(_fsClient, positionId, marketId);
    return true;
  } catch (err) {
    console.error(`FS sell failed for position ${positionId}:`, err);
    return false;
  }
}
