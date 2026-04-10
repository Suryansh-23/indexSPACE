import type { MarketState, MarketFilter, MarketDiscoveryOptions } from '../types.js';

/**
 * Resolve a field value from a MarketState object.
 * Checks direct properties first, then falls back to metadata.
 */
function resolveFieldValue(market: MarketState, field: string): unknown {
  if (field in market) {
    return market[field as keyof MarketState];
  }
  return market.metadata[field];
}

/**
 * Evaluate a single filter against a field value.
 */
function evaluateFilter(fieldValue: unknown, filter: MarketFilter): boolean {
  const { value: filterValue, action } = filter;

  switch (action) {
    case 'equals':
      return fieldValue === filterValue;

    case 'notEquals':
      return fieldValue !== filterValue;

    case 'greaterThan':
      return (fieldValue as number) > (filterValue as number);

    case 'greaterThanOrEqual':
      return (fieldValue as number) >= (filterValue as number);

    case 'lessThan':
      return (fieldValue as number) < (filterValue as number);

    case 'lessThanOrEqual':
      return (fieldValue as number) <= (filterValue as number);

    case 'contains': {
      if (typeof fieldValue !== 'string' || typeof filterValue !== 'string') return false;
      return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
    }

    case 'in': {
      const fieldIsArray = Array.isArray(fieldValue);
      const filterIsArray = Array.isArray(filterValue);

      if (fieldIsArray && filterIsArray) {
        // Intersection: any overlap
        return (fieldValue as unknown[]).some((v) => (filterValue as unknown[]).includes(v));
      }
      if (fieldIsArray) {
        // Check if filter value exists in field array
        return (fieldValue as unknown[]).includes(filterValue);
      }
      if (filterIsArray) {
        // Check if field value exists in filter array
        return (filterValue as unknown[]).includes(fieldValue);
      }
      // Neither is array: equality
      return fieldValue === filterValue;
    }

    case 'between': {
      const arr = filterValue as [number, number];
      const min = Math.min(arr[0], arr[1]);
      const max = Math.max(arr[0], arr[1]);
      return typeof fieldValue === 'number' && fieldValue >= min && fieldValue <= max;
    }

    default:
      return false;
  }
}

/**
 * Filter, sort, and limit a list of MarketState objects.
 *
 * Pure function -- does not modify the input array.
 * Converts typed convenience filters (state, titleContains, categories) into
 * MarketFilter objects and merges them with explicit filters. All filters use
 * AND logic (every filter must match for a market to be included).
 *
 * Category: Discovery | Layer: L1
 */
export function filterMarkets(
  markets: MarketState[],
  options: Omit<MarketDiscoveryOptions, 'signal'>,
): MarketState[] {
  // Build filter list from typed convenience options
  const filters: MarketFilter[] = [];

  if (options.state !== undefined) {
    filters.push({ field: 'resolutionState', value: options.state, action: 'equals' });
  }

  if (options.titleContains !== undefined) {
    filters.push({ field: 'title', value: options.titleContains, action: 'contains' });
  }

  if (options.categories !== undefined) {
    filters.push({ field: 'categories', value: options.categories, action: 'in' });
  }

  // Merge with explicit filters
  if (options.filters) {
    filters.push(...options.filters);
  }

  // Apply filters (AND logic)
  let result = filters.length > 0
    ? markets.filter((market) =>
        filters.every((filter) => {
          const fieldValue = resolveFieldValue(market, filter.field);
          return evaluateFilter(fieldValue, filter);
        }),
      )
    : [...markets];

  // Sort
  if (options.sortBy) {
    const sortOrder = options.sortOrder ?? 'desc';
    const sortField = options.sortBy;
    result.sort((a, b) => {
      const aVal = resolveFieldValue(a, sortField);
      const bVal = resolveFieldValue(b, sortField);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp: number;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  // Limit
  if (options.limit !== undefined) {
    result = result.slice(0, options.limit);
  }

  return result;
}
