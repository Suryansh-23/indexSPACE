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
  status: 'open' | 'sold' | 'settled' | 'closed';
  prediction: number;
  stdDev: number;
  createdAt: string;
  closedAt: string | null;
  soldPrice: number | null;
  settlementPayout: number | null;
}

// ── Trade History Types ──

export interface TradeEntry {
  id: string;
  timestamp: string;
  side: 'buy' | 'sell';
  prediction: number | null;
  amount: number;
  username: string;
  positionId: string;
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

export interface PreviewSellResult {
  collateralReturned: number;
  iterations: number;
}

export interface PayoutCurve {
  // API response uses "projections" -- remapped to "previews" in SDK types
  previews: Array<{
    outcome: number;
    payout: number;
    profitLoss: number;
  }>;
  maxPayout: number;
  maxPayoutOutcome: number;
  inputCollateral: number;
}

// ── Distribution Types ──

export interface BucketData {
  range: string;
  min: number;
  max: number;
  probability: number;
  percentage: number;
}

// ── Position Generator Types ──

export type BeliefVector = number[];

export interface GaussianParams {
  center: number;
  spread: number;
  bounds?: [number, number];
}

export interface RangeParams {
  low: number;
  high: number;
  bounds?: [number, number];
}

// ── History Types ──

export interface MarketSnapshot {
  snapshotId: number;
  tradeId: number;
  side: 'buy' | 'sell';
  positionId: string;
  alphaVector: number[];
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  currentPool: number;
  numOpenPositions: number;
  createdAt: string;  // ISO 8601
}

export interface MarketHistory {
  marketId: number;
  totalSnapshots: number;
  snapshots: MarketSnapshot[];
}

export interface PercentileSet {
  p2_5: number;
  p12_5: number;
  p25: number;
  p37_5: number;
  p50: number;
  p62_5: number;
  p75: number;
  p87_5: number;
  p97_5: number;
}

export interface FanChartPoint {
  timestamp: number;       // epoch ms
  createdAt: string;
  tradeId: number;
  mean: number;
  mode: number;
  stdDev: number;
  percentiles: PercentileSet;
}

// ── Auth Types ──

/** Sentinel error code for password-protected accounts */
export const PASSWORD_REQUIRED = 'PASSWORD_REQUIRED' as const;

/** Result of passwordless login attempt */
export interface PasswordlessLoginResult {
  /** Whether this was a login (existing user) or signup (new user) */
  action: 'login' | 'signup';
  /** The authenticated user profile */
  user: UserProfile;
  /** JWT access token */
  token: string;
}

export interface UserProfile {
  userId: number;
  username: string;
  walletValue: number;
  role: 'trader' | 'creator' | 'admin';
}

export interface AuthResult {
  user: UserProfile;
  token: string;
}

export interface SignupResult {
  user: UserProfile;
}

export interface SignupOptions {
  accessCode?: string;
}

// ── Client Types ──

export interface FSConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  autoAuthenticate?: boolean;
}
