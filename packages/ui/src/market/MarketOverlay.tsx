import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FunctionSpaceContext, useMarketFilters, useMarkets } from '@functionspace/react';
import type { SortOption, UseMarketFiltersConfig } from '@functionspace/react';
import { MarketList } from './MarketList.js';
import { MarketFilterBar } from './MarketFilterBar.js';
import { Overlay } from '../components/index.js';
import '../styles/base.css';

export interface MarketOverlayProps {
  children: (marketId: number) => React.ReactNode;
  state?: string;
  categories?: string[];
  pollInterval?: number;
  emptyMessage?: string;
  showFilterBar?: boolean;
  featuredCategories?: string[];
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
  filterBarMaxWidth?: string;
}

export function MarketOverlay({
  children,
  state,
  categories,
  pollInterval,
  emptyMessage,
  showFilterBar = true,
  featuredCategories,
  sortOptions,
  searchPlaceholder,
  filterBarMaxWidth,
}: MarketOverlayProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('MarketOverlay must be used within FunctionSpaceProvider');

  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);

  // Build config for useMarketFilters
  const filtersConfig = useMemo<UseMarketFiltersConfig>(() => ({
    categories,
    featuredCategories,
    sortOptions,
    pollInterval,
    state,
  }), [categories, featuredCategories, sortOptions, pollInterval, state]);

  // When showFilterBar is true, use useMarketFilters for full filtering support
  const filtersResult = useMarketFilters(showFilterBar ? filtersConfig : { enabled: false });

  // When showFilterBar is false, use useMarkets directly
  const marketsResult = useMarkets(showFilterBar ? { enabled: false } : { state, categories, pollInterval });

  const markets = showFilterBar ? filtersResult.markets : marketsResult.markets;
  const loading = showFilterBar ? filtersResult.loading : marketsResult.loading;
  const error = showFilterBar ? filtersResult.error : marketsResult.error;

  const selectedMarket = markets.find(m => m.marketId === selectedMarketId);

  const handleSelect = useCallback((id: number) => setSelectedMarketId(id), []);
  const handleClose = useCallback(() => setSelectedMarketId(null), []);

  // Auto-dismiss overlay when selected market disappears from list
  useEffect(() => {
    if (selectedMarketId !== null && !loading) {
      const found = markets.find(m => m.marketId === selectedMarketId);
      if (!found) {
        setSelectedMarketId(null);
      }
    }
  }, [selectedMarketId, markets, loading]);

  return (
    <div className="fs-market-overlay">
      {showFilterBar && (
        <MarketFilterBar
          {...filtersResult.filterBarProps}
          maxWidth={filterBarMaxWidth}
          searchPlaceholder={searchPlaceholder}
        />
      )}
      <MarketList
        markets={markets}
        loading={loading}
        error={error}
        emptyMessage={emptyMessage}
        onSelect={handleSelect}
      />
      <Overlay
        open={selectedMarketId !== null}
        onClose={handleClose}
        title={selectedMarket?.title ?? 'Trade'}
      >
        {selectedMarketId !== null && children(selectedMarketId)}
      </Overlay>
    </div>
  );
}
