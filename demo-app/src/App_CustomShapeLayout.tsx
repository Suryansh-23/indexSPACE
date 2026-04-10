import { FunctionSpaceProvider } from '@functionspace/react';
import { CustomShapeEditor, MarketStats, PositionTable, PasswordlessAuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Reusable layout content (used by both demo-app and docs site)
export function CustomShapeLayout({ marketId }: { marketId: string | number }) {
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
        <CustomShapeEditor marketId={marketId} zoomable />
      </div>

      <PositionTable marketId={marketId} tabs={['open-orders', 'trade-history', 'market-positions']} />
    </>
  );
}

// Custom shape layout: drag-to-draw belief editor
export default function App_CustomShapeLayout() {
  return (
    <ArticlePage widgetWidth="150%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <CustomShapeLayout marketId={MARKET_ID} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
