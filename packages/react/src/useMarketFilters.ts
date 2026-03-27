import { useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { MarketDiscoveryOptions, MarketState } from '@functionspace/core';
import type { QueryOptions } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useMarkets } from './useMarkets.js';

// ── Types ──

export interface SortOption {
  field: string;
  label: string;
  defaultOrder?: 'asc' | 'desc';
}

export interface UseMarketFiltersConfig {
  categories?: string[];
  featuredCategories?: string[];
  sortOptions?: SortOption[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pollInterval?: number;
  enabled?: boolean;
  state?: string;
}

export interface MarketFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  searchPlaceholder?: string;
  availableCategories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onClearCategories?: () => void;
  featuredCategories?: string[];
  sortOptions: SortOption[];
  activeSortField: string;
  sortOrder: 'asc' | 'desc';
  onSortFieldChange: (field: string) => void;
  onSortOrderToggle: () => void;
  resultCount: number;
  loading?: boolean;
  onReset: () => void;
  maxWidth?: string;
  maxVisibleCategories?: number;
}

const SEARCH_DEBOUNCE_MS = 300;

// ── Default sort options ──

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { field: 'totalVolume', label: 'Volume', defaultOrder: 'desc' },
  { field: 'poolBalance', label: 'Liquidity', defaultOrder: 'desc' },
  { field: 'positionsOpen', label: 'Traders', defaultOrder: 'desc' },
  { field: 'createdAt', label: 'Newest', defaultOrder: 'desc' },
  { field: 'expiresAt', label: 'Ending Soon', defaultOrder: 'asc' },
];

// ── Return type ──

export interface UseMarketFiltersReturn {
  // Data from useMarkets
  markets: MarketState[];
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  // Filter state
  searchText: string;
  selectedCategories: string[];
  activeSortField: string;
  sortOrder: 'asc' | 'desc';
  resultCount: number;

  // Actions
  setSearchText: (text: string) => void;
  clearSearch: () => void;
  clearCategories: () => void;
  toggleCategory: (category: string) => void;
  setSortField: (field: string) => void;
  toggleSortOrder: () => void;
  resetFilters: () => void;

  // Derived
  availableCategories: string[];
  sortOptions: SortOption[];

  // Pre-built props bundle
  filterBarProps: MarketFilterBarProps;

  // Discovery options passed to useMarkets (useful for debugging/testing)
  discoveryOptions: MarketDiscoveryOptions & QueryOptions;
}

// ── Hook ──

export function useMarketFilters(
  config?: UseMarketFiltersConfig,
): UseMarketFiltersReturn {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarketFilters must be used within FunctionSpaceProvider');

  const sortOptions = config?.sortOptions ?? DEFAULT_SORT_OPTIONS;
  const defaultSortField = config?.defaultSortField ?? 'totalVolume';
  const defaultSortOrder = config?.defaultSortOrder ?? 'desc';

  // ── Local state ──
  const [searchText, setSearchTextRaw] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeSortField, setActiveSortField] = useState(defaultSortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  // ── Debounce timer ──
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const setSearchText = useCallback((text: string) => {
    setSearchTextRaw(text);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      timerRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTextRaw('');
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = null;
    setDebouncedSearch('');
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const setSortField = useCallback((field: string) => {
    setActiveSortField(field);
    const option = sortOptions.find(o => o.field === field);
    if (option?.defaultOrder) {
      setSortOrder(option.defaultOrder);
    }
  }, [sortOptions]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTextRaw('');
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = null;
    setDebouncedSearch('');
    setSelectedCategories([]);
    setActiveSortField(defaultSortField);
    setSortOrder(defaultSortOrder);
  }, [defaultSortField, defaultSortOrder]);

  // ── Build discovery options ──
  const discoveryOptions = useMemo<MarketDiscoveryOptions & QueryOptions>(() => {
    const opts: MarketDiscoveryOptions & QueryOptions = {};

    if (config?.categories) {
      opts.categories = config.categories;
    }

    if (debouncedSearch) {
      opts.titleContains = debouncedSearch;
    }

    if (selectedCategories.length > 0) {
      opts.filters = [{ field: 'categories', value: selectedCategories, action: 'in' as const }];
    }

    opts.sortBy = activeSortField;
    opts.sortOrder = sortOrder;

    if (config?.state) {
      opts.state = config.state;
    }

    if (config?.pollInterval !== undefined) {
      opts.pollInterval = config.pollInterval;
    }

    if (config?.enabled !== undefined) {
      opts.enabled = config.enabled;
    }

    return opts;
  }, [
    config?.categories,
    config?.state,
    config?.pollInterval,
    config?.enabled,
    debouncedSearch,
    selectedCategories,
    activeSortField,
    sortOrder,
  ]);

  // ── Compose useMarkets ──
  const { markets, loading, isFetching, error, refetch } = useMarkets(discoveryOptions);

  // ── Available categories ──
  const availableCategories = useMemo<string[]>(() => {
    if (config?.categories) {
      return config.categories;
    }

    if (config?.featuredCategories) {
      const featured = config.featuredCategories;
      const fromMetadata = new Set<string>();
      for (const m of markets) {
        if (Array.isArray(m.metadata?.categories)) {
          for (const cat of m.metadata.categories as string[]) {
            fromMetadata.add(cat);
          }
        }
      }
      // Featured first, then unique non-featured from metadata
      const result = [...featured];
      for (const cat of fromMetadata) {
        if (!featured.includes(cat)) {
          result.push(cat);
        }
      }
      return result;
    }

    // Default: unique from metadata
    const fromMetadata = new Set<string>();
    for (const m of markets) {
      if (Array.isArray(m.metadata?.categories)) {
        for (const cat of m.metadata.categories as string[]) {
          fromMetadata.add(cat);
        }
      }
    }
    return [...fromMetadata];
  }, [config?.categories, config?.featuredCategories, markets]);

  const resultCount = markets.length;

  // ── Filter bar props bundle ──
  const filterBarProps = useMemo<MarketFilterBarProps>(() => ({
    searchText,
    onSearchChange: setSearchText,
    onSearchClear: clearSearch,
    availableCategories,
    selectedCategories,
    onToggleCategory: toggleCategory,
    onClearCategories: clearCategories,
    featuredCategories: config?.featuredCategories,
    sortOptions,
    activeSortField,
    sortOrder,
    onSortFieldChange: setSortField,
    onSortOrderToggle: toggleSortOrder,
    resultCount,
    loading,
    onReset: resetFilters,
  }), [
    searchText,
    setSearchText,
    clearSearch,
    availableCategories,
    selectedCategories,
    toggleCategory,
    clearCategories,
    config?.featuredCategories,
    sortOptions,
    activeSortField,
    sortOrder,
    setSortField,
    toggleSortOrder,
    resultCount,
    loading,
    resetFilters,
  ]);

  return {
    markets,
    loading,
    isFetching,
    error,
    refetch,
    searchText,
    selectedCategories,
    activeSortField,
    sortOrder,
    resultCount,
    setSearchText,
    clearSearch,
    clearCategories,
    toggleCategory,
    setSortField,
    toggleSortOrder,
    resetFilters,
    availableCategories,
    sortOptions,
    filterBarProps,
    discoveryOptions,
  };
}
