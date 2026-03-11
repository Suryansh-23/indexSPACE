import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketCharts, DistributionChart, ShapeCutter, MarketStats, PositionTable, TimeSales, PasswordlessAuthWidget, BinaryPanel } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Reusable layout content (used by both demo-app and docs site)
export function ShapeCutterTradingLayout({ marketId, username }: { marketId: string | number; username?: string }) {
  return (
    <>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 7, minWidth: 0 }}>
          <MarketStats marketId={marketId} />
        </div>
        <div style={{ flex: 3, minWidth: 0 }}>
          <PasswordlessAuthWidget />
        </div>
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <MarketCharts marketId={marketId} height={350} views={['consensus', 'distribution', 'timeline']} zoomable />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <ShapeCutter marketId={marketId} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
        <PositionTable marketId={marketId} username={username} tabs={['open-orders', 'trade-history', 'market-positions']} />
      </div>
      <BinaryPanel
        marketId={marketId}
        xPoint={{ mode: 'static', value: 91 }}
      />
    </>
  );
}

// ShapeCutter trading layout: chart with tabs, ShapeCutter below
export default function App_ShapeCutterTradingLayout() {
  return (
    <ArticlePage widgetWidth="150%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <ShapeCutterTradingLayout marketId={MARKET_ID} username={config.username} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
