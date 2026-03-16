// Types
export type {
  MarketConfig,
  MarketState,
  ConsensusSummary,
  ConsensusCurve,
  Position,
  BuyResult,
  SellResult,
  PreviewSellResult,
  PayoutCurve,
  BeliefVector,
  GaussianParams,
  RangeParams,
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
  PasswordlessLoginResult,
} from './types.js';
export { PASSWORD_REQUIRED } from './types.js';

// Client
export { FSClient } from './client.js';

// Math
export { evaluateDensityPiecewise, evaluateDensityCurve, computeStatistics, computePercentiles } from './math/density.js';
export { generateGaussian, generateRange, generateBelief, generateDip, generateLeftSkew, generateRightSkew, generateCustomShape, generateBellShape } from './math/generators.js';
export type { Region, PointRegion, RangeRegion, SplineRegion, RangeInput } from './math/generators.js';
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

// Previews
export { previewSell } from './previews/previewSell.js';
export { previewPayoutCurve } from './previews/previewPayoutCurve.js';

// Validation
export { validateBeliefVector } from './validation.js';

// Auth
export { loginUser, signupUser, fetchCurrentUser, validateUsername, passwordlessLoginUser, silentReAuth } from './auth/auth.js';

// Chart Interaction
export { pixelToDataX, computeZoomedDomain, computePannedDomain, filterVisibleData, generateEvenTicks } from './chart/zoom.js';
export type { ZoomParams, PanParams } from './chart/zoom.js';

// Discovery
export { discoverMarkets } from './discovery/markets.js';
