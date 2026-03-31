import React from 'react';
import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketExplorer, TradePanel, MarketStats, ConsensusChart } from '@functionspace/ui';
import { config, widgetTheme } from './App';

export default function App_MarketOverlay() {
  return (
    <FunctionSpaceProvider config={config} theme={widgetTheme}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ color: 'var(--fs-text)', marginBottom: '1.5rem', fontFamily: 'inherit' }}>
          Market Explorer
        </h1>
        <MarketExplorer
          views={['cards', 'pulse', 'compact', 'gauge', 'split', 'table', 'heatmap', 'charts']}
          state="open"
          pollInterval={5000}
        >
          {(marketId) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <MarketStats marketId={marketId} />
              <ConsensusChart marketId={marketId} height={350} zoomable />
              <TradePanel marketId={marketId} modes={['gaussian', 'range']} />
            </div>
          )}
        </MarketExplorer>
      </div>
    </FunctionSpaceProvider>
  );
}
