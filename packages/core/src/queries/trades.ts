import type { FSClient } from '../client.js';
import type { Position, TradeEntry } from '../types.js';
import { queryMarketPositions } from './positions.js';

/**
 * Format an ISO timestamp for display.
 * "2025-01-15T14:23:45.000Z" → "2025-01-15 14:23:45"
 */
function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '--';
  try {
    return new Date(isoString).toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return '--';
  }
}

/**
 * Pure transform: converts positions into trade entries.
 *
 * For each position, creates a buy entry. If the position is closed/sold,
 * also creates a sell entry. Results are sorted by timestamp descending.
 *
 * This is the current workaround while no dedicated trades API endpoint exists.
 * When /market/trades is available, queryTradeHistory can switch to it directly.
 */
export function positionsToTradeEntries(
  positions: Position[],
  options?: { limit?: number },
): TradeEntry[] {
  const limit = options?.limit ?? 100;
  const entries: TradeEntry[] = [];

  for (const pos of positions) {
    const posId = String(pos.positionId);

    entries.push({
      id: `${posId}_open`,
      timestamp: formatTimestamp(pos.createdAt),
      side: 'buy',
      prediction: pos.prediction ?? null,
      amount: pos.collateral ?? 0,
      username: pos.owner ?? 'Unknown',
      positionId: posId,
    });

    if (pos.soldPrice !== null) {
      entries.push({
        id: `${posId}_close`,
        timestamp: formatTimestamp(pos.closedAt ?? pos.createdAt),
        side: 'sell',
        prediction: pos.prediction ?? null,
        amount: pos.soldPrice,
        username: pos.owner ?? 'Unknown',
        positionId: posId,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.timestamp === '--' && b.timestamp !== '--') return 1;
    if (a.timestamp !== '--' && b.timestamp === '--') return -1;
    if (a.timestamp === '--' && b.timestamp === '--') return 0;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return entries.slice(0, limit);
}

/**
 * Composed query: fetches all positions for a market and transforms
 * them into trade entries.
 *
 * When a dedicated /market/trades endpoint becomes available, this
 * function can switch its data source without changing its signature.
 */
export async function queryTradeHistory(
  client: FSClient,
  marketId: string | number,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<TradeEntry[]> {
  const positions = await queryMarketPositions(
    client,
    marketId,
    options?.signal ? { signal: options.signal } : undefined,
  );
  return positionsToTradeEntries(positions, options);
}
