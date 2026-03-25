import React, { useState } from 'react';
import { FunctionSpaceProvider, useMarkets } from '@functionspace/react';
import { MarketList } from '@functionspace/ui';
import { config, widgetTheme } from './App';

// ── Swap trading layout by changing this import ──
import { BasicTradingLayout as TradingLayout } from './App_BasicTradingLayout';
// import { ShapeCutterTradingLayout as TradingLayout } from './App_ShapeCutterTradingLayout';
// import { DistRangeLayout as TradingLayout } from './App_DistRange';
// import { BinaryPanelLayout as TradingLayout } from './App_BinaryPanel';
// import { CustomShapeLayout as TradingLayout } from './App_CustomShapeLayout';
// import { TimelineBinaryLayout as TradingLayout } from './App_TimelineBinaryTradingLayout';

// ── Market List View ──

function MarketListView({ onSelect }: { onSelect: (id: number) => void }) {
  const { markets, loading, error } = useMarkets({
    state: 'open',
    sortBy: 'totalVolume',
    sortOrder: 'desc',
    pollInterval: 5000,
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: 'var(--fs-text)', marginBottom: '1.5rem', fontFamily: 'inherit' }}>Markets</h1>
      <MarketList markets={markets} loading={loading} error={error} onSelect={onSelect} />
    </div>
  );
}

// ── Trading View ──

function TradingView({ marketId, onBack }: { marketId: number; onBack: () => void }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <button
        onClick={onBack}
        style={{
          color: 'var(--fs-text-secondary)',
          marginBottom: '1rem',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          fontSize: '0.9rem',
          fontFamily: 'inherit',
        }}
      >
        &larr; Back to Markets
      </button>
      <TradingLayout marketId={marketId} />
    </div>
  );
}

// ── Inner Layout (named export for docs site reuse) ──

export function MarketDiscoveryLayout() {
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);

  if (selectedMarketId === null) {
    return <MarketListView onSelect={setSelectedMarketId} />;
  }

  return <TradingView marketId={selectedMarketId} onBack={() => setSelectedMarketId(null)} />;
}

// ── Default Export (wraps in provider) ──

export default function App_MarketDiscovery() {
  return (
    <FunctionSpaceProvider config={config} theme={widgetTheme}>
      <MarketDiscoveryLayout />
    </FunctionSpaceProvider>
  );
}
