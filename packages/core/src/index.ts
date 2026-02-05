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
  FSConfig,
} from './types.js';

// Client
export { FSClient } from './client.js';

// Math
export { evaluateDensity, evaluateDensityCurve, computeStatistics } from './math/bernstein.js';
export { buildGaussian, buildPlateau, buildBelief } from './math/builders.js';
export type { Region, PointRegion, RangeRegion } from './math/builders.js';

// Queries
export { queryMarketState, getConsensusCurve, queryConsensusSummary, queryDensityAt } from './queries/market.js';
export { queryPositionState, mapPosition } from './queries/positions.js';

// Transactions
export { buy } from './transactions/buy.js';
export { sell } from './transactions/sell.js';

// Projections
export { projectSell } from './projections/projectSell.js';
export { projectPayoutCurve } from './projections/projectPayoutCurve.js';

// Discovery
export { discoverMarkets } from './discovery/markets.js';
