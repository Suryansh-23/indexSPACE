import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketCharts, DistributionChart, ShapeCutter, MarketStats, PositionTable, TimeSales, PasswordlessAuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// ShapeCutter trading layout: chart with tabs, ShapeCutter below
export default function App_ShapeCutterTradingLayout() {
  return (
    <ArticlePage widgetWidth="150%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}>
            <MarketStats marketId={MARKET_ID} />
          </div>
          <div style={{ flex: 3, minWidth: 0 }}>
            <PasswordlessAuthWidget />
          </div>
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <MarketCharts marketId={MARKET_ID} height={350} views={['consensus', 'distribution', 'timeline']} zoomable />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <ShapeCutter marketId={MARKET_ID} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
          <PositionTable marketId={MARKET_ID} username={config.username} tabs={['open-orders', 'trade-history', 'market-positions']} />
        </div>

      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
