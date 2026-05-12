import { FSClient } from "@functionspace/core";
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

export function buildBeliefVector(
  numBuckets: number,
  strategy: ConstituentStrategy,
): number[] {
  const len = numBuckets + 2;
  const vec = new Array(len).fill(0);

  const total = strategy.weight / 100;

  if (strategy.shape === "gaussian") {
    const centerIdx = Math.floor(strategy.centerNormalized * (len - 1));
    const spread = Math.max(1, Math.floor(strategy.widthNormalized * len));
    for (let i = 0; i < len; i++) {
      const dist = Math.abs(i - centerIdx);
      vec[i] = Math.exp(-((dist * dist) / (2 * spread * spread)));
    }
  } else if (strategy.shape === "range") {
    const lo = Math.floor(Math.max(0, strategy.centerNormalized - strategy.widthNormalized) * (len - 1));
    const hi = Math.ceil(Math.min(1, strategy.centerNormalized + strategy.widthNormalized) * (len - 1));
    for (let i = lo; i <= hi; i++) {
      vec[i] = 1;
    }
  } else if (strategy.shape === "right_skew") {
    const peak = Math.floor(Math.min(0.9, strategy.centerNormalized) * (len - 1));
    for (let i = 0; i < len; i++) {
      const rel = (i - peak) / len;
      vec[i] = rel <= 0 ? 1 + rel * 5 : Math.exp(-rel * 10);
    }
  } else if (strategy.shape === "left_skew") {
    const peak = Math.floor(Math.max(0.1, strategy.centerNormalized) * (len - 1));
    for (let i = 0; i < len; i++) {
      const rel = (peak - i) / len;
      vec[i] = rel <= 0 ? 1 + rel * 5 : Math.exp(-rel * 10);
    }
  }

  const sum = vec.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < len; i++) {
      vec[i] = (vec[i] / sum) * total;
    }
  }

  return vec;
}
