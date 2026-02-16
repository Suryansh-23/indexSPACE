import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketCharts, DistributionChart, ShapeCutter, MarketStats, PositionTable, TimeSales } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Chart full width with tabs, ShapeCutter below, distribution-only chart at bottom
export default function App_ShapeCutter() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <MarketStats marketId={MARKET_ID} />

        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <MarketCharts marketId={MARKET_ID} height={350} views={['consensus', 'distribution', 'timeline']} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <ShapeCutter marketId={MARKET_ID} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <PositionTable marketId={MARKET_ID} username={config.username} />
          <TimeSales marketId={MARKET_ID} />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <MarketCharts marketId={MARKET_ID} height={350} views={['distribution']} />
        </div>
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
