import React, { useState } from 'react';
import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketExplorer } from '@functionspace/ui';
import { config, widgetTheme } from './App';

// -- Swap trading layout by changing this import --
import { BasicTradingLayout as TradingLayout } from './App_BasicTradingLayout';
// import { ShapeCutterTradingLayout as TradingLayout } from './App_ShapeCutterTradingLayout';
// import { DistRangeLayout as TradingLayout } from './App_DistRange';
// import { BinaryPanelLayout as TradingLayout } from './App_BinaryPanel';
// import { CustomShapeLayout as TradingLayout } from './App_CustomShapeLayout';
// import { TimelineBinaryLayout as TradingLayout } from './App_TimelineBinaryTradingLayout';

export default function App_MarketDiscovery() {
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);

  return (
    <FunctionSpaceProvider config={config} theme={widgetTheme}>
      {selectedMarketId !== null ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <button
            onClick={() => setSelectedMarketId(null)}
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
          <TradingLayout marketId={selectedMarketId} />
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <h1 style={{ color: 'var(--fs-text)', marginBottom: '1.5rem', fontFamily: 'inherit' }}>Market Discovery</h1>
          <MarketExplorer
            views={['cards', 'pulse', 'compact', 'gauge', 'split', 'table', 'heatmap', 'charts']}
            state="open"
            pollInterval={5000}
            onSelect={setSelectedMarketId}
          />
        </div>
      )}
    </FunctionSpaceProvider>
  );
}
