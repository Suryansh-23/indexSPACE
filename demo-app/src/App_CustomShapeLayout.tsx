import { FunctionSpaceProvider } from '@functionspace/react';
import { CustomShapeEditor, MarketStats, PositionTable, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Reusable layout content (used by both demo-app and docs site)
export function CustomShapeLayout({ marketId, username }: { marketId: string | number; username?: string }) {
  return (
    <>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 7, minWidth: 0 }}>
          <MarketStats marketId={marketId} />
        </div>
        <div style={{ flex: 3, minWidth: 0 }}>
          <AuthWidget />
        </div>
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <CustomShapeEditor marketId={marketId} zoomable />
      </div>

      <div>
        <PositionTable marketId={marketId} username={username} tabs={['open-orders', 'trade-history', 'market-positions']} />
      </div>
    </>
  );
}

// Custom Shape trading layout: MarketStats + Auth, CustomShapeEditor, PositionTable
export default function App_CustomShapeLayout() {
  return (
    <ArticlePage widgetWidth="150%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <CustomShapeLayout marketId={MARKET_ID} username={config.username} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
