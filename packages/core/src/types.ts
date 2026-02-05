// ── Market Types ──

export interface MarketConfig {
  K: number;
  L: number;
  H: number;
  P0: number;
  mu: number;
  epsAlpha: number;
  tau: number;
  gamma: number;
  lambdaS: number;
  lambdaD: number;
}

export interface MarketState {
  alpha: number[];
  consensus: number[];
  totalMass: number;
  poolBalance: number;
  participantCount: number;
  totalVolume: number;
  positionsOpen: number;
  config: MarketConfig;
  title: string;
  xAxisUnits: string;
  decimals: number;
  resolutionState: 'open' | 'resolved' | 'voided';
  resolvedOutcome: number | null;
}

export interface ConsensusSummary {
  mean: number;
  median: number;
  mode: number;
  variance: number;
  stdDev: number;
}

export interface ConsensusCurve {
  points: Array<{ x: number; y: number }>;
  config: MarketConfig;
}

// ── Position Types ──

export interface Position {
  positionId: number;
  belief: number[];
  collateral: number;
  claims: number;
  owner: string;
  status: 'open' | 'sold' | 'settled';
  prediction: number;
  stdDev: number;
  createdAt: string;
  soldPrice: number | null;
  settlementPayout: number | null;
}

// ── Trading Types ──

export interface BuyResult {
  positionId: number;
  belief: number[];
  claims: number;
  collateral: number;
}

export interface SellResult {
  positionId: number;
  collateralReturned: number;
}

export interface ProjectSellResult {
  collateralReturned: number;
  iterations: number;
}

export interface PayoutCurve {
  projections: Array<{
    outcome: number;
    payout: number;
    profitLoss: number;
  }>;
  maxPayout: number;
  maxPayoutOutcome: number;
  inputCollateral: number;
}

// ── Builder Types ──

export type BeliefVector = number[];

export interface GaussianParams {
  center: number;
  spread: number;
  bounds?: [number, number];
}

export interface PlateauParams {
  low: number;
  high: number;
  bounds?: [number, number];
}

// ── Client Types ──

export interface FSConfig {
  baseUrl: string;
  username: string;
  password: string;
}
