// Types
export type {
  MarketConfig,
  MarketState,
  ConsensusSummary,
  ConsensusCurve,
  Position,
  BuyResult,
  SellResult,
  ProjectSellResult,
  PayoutCurve,
  BeliefVector,
  GaussianParams,
  PlateauParams,
  BucketData,
  TradeEntry,
  FSConfig,
  MarketSnapshot,
  MarketHistory,
  PercentileSet,
  FanChartPoint,
  UserProfile,
  AuthResult,
  SignupResult,
  SignupOptions,
} from './types.js';

// Client
export { FSClient } from './client.js';

// Math
export { evaluateDensityPiecewise, evaluateDensityCurve, computeStatistics, computePercentiles } from './math/density.js';
export { buildGaussian, buildRange, buildPlateau, buildBelief, buildDip, buildLeftSkew, buildRightSkew, buildCustomShape, generateBellShape } from './math/builders.js';
export type { Region, PointRegion, RangeRegion, SplineRegion, RangeInput } from './math/builders.js';
export { calculateBucketDistribution } from './math/distribution.js';
export { transformHistoryToFanChart } from './math/fanChart.js';

// Shapes
export { SHAPE_DEFINITIONS } from './shapes/index.js';
export type { ShapeId, ShapeDefinition } from './shapes/index.js';

// Queries
export { queryMarketState, getConsensusCurve, queryConsensusSummary, queryDensityAt } from './queries/market.js';
export { queryPositionState, queryMarketPositions, mapPosition } from './queries/positions.js';
export { positionsToTradeEntries, queryTradeHistory } from './queries/trades.js';
export { queryMarketHistory } from './queries/history.js';

// Transactions
export { buy } from './transactions/buy.js';
export { sell } from './transactions/sell.js';

// Projections
export { projectSell } from './projections/projectSell.js';
export { projectPayoutCurve } from './projections/projectPayoutCurve.js';

// Auth
export { loginUser, signupUser, fetchCurrentUser, validateUsername } from './auth/auth.js';

// Discovery
export { discoverMarkets } from './discovery/markets.js';
