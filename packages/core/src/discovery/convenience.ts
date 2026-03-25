import type { FSClient } from '../client.js';
import type { MarketState, MarketDiscoveryOptions } from '../types.js';
import { discoverMarkets } from './markets.js';

/**
 * Merge caller options on top of preset defaults.
 * - Caller typed fields (state, titleContains, categories, sortBy, sortOrder, limit) override presets.
 * - Caller filters[] are appended to preset filters[].
 * - signal passes through from caller.
 */
function mergeOptions(
  preset: MarketDiscoveryOptions,
  caller?: MarketDiscoveryOptions,
): MarketDiscoveryOptions {
  if (!caller) return preset;

  const merged: MarketDiscoveryOptions = { ...preset };

  // Typed fields: caller overrides preset
  if (caller.state !== undefined) merged.state = caller.state;
  if (caller.titleContains !== undefined) merged.titleContains = caller.titleContains;
  if (caller.categories !== undefined) merged.categories = caller.categories;
  if (caller.sortBy !== undefined) merged.sortBy = caller.sortBy;
  if (caller.sortOrder !== undefined) merged.sortOrder = caller.sortOrder;
  if (caller.limit !== undefined) merged.limit = caller.limit;

  // Filters: append caller filters to preset filters
  if (caller.filters) {
    merged.filters = [...(preset.filters ?? []), ...caller.filters];
  }

  // Signal: pass through from caller
  if (caller.signal !== undefined) merged.signal = caller.signal;

  return merged;
}

/**
 * L2: Discover popular markets sorted by total volume (descending).
 * Returns the top 10 by default. Caller options override presets.
 * Resolves through discoverMarkets with preset sort/limit options.
 *
 * Category: Discovery | Layer: L2
 */
export async function discoverPopularMarkets(
  client: FSClient,
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]> {
  const preset: MarketDiscoveryOptions = {
    sortBy: 'totalVolume',
    sortOrder: 'desc',
    limit: 10,
  };
  return discoverMarkets(client, mergeOptions(preset, options));
}

/**
 * L2: Discover currently active (open) markets.
 * Caller options override presets.
 * Resolves through discoverMarkets with preset state filter.
 *
 * Category: Discovery | Layer: L2
 */
export async function discoverActiveMarkets(
  client: FSClient,
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]> {
  const preset: MarketDiscoveryOptions = {
    state: 'open',
  };
  return discoverMarkets(client, mergeOptions(preset, options));
}

/**
 * L2: Discover markets matching one or more categories.
 * Caller options override presets.
 * Resolves through discoverMarkets with preset categories filter.
 *
 * Category: Discovery | Layer: L2
 */
export async function discoverMarketsByCategory(
  client: FSClient,
  categories: string[],
  options?: MarketDiscoveryOptions,
): Promise<MarketState[]> {
  const preset: MarketDiscoveryOptions = {
    categories,
  };
  return discoverMarkets(client, mergeOptions(preset, options));
}
