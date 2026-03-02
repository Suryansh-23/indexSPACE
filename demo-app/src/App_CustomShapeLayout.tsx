import { FunctionSpaceProvider } from '@functionspace/react';
import { CustomShapeEditor, MarketStats, PositionTable, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Custom Shape trading layout: MarketStats + Auth, CustomShapeEditor, PositionTable
export default function App_CustomShapeLayout() {
  return (
    <ArticlePage widgetWidth="150%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}>
            <MarketStats marketId={MARKET_ID} />
          </div>
          <div style={{ flex: 3, minWidth: 0 }}>
            <AuthWidget />
          </div>
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <CustomShapeEditor marketId={MARKET_ID} zoomable />
        </div>

        <div>
          <PositionTable marketId={MARKET_ID} username={config.username} tabs={['open-orders', 'trade-history', 'market-positions']} />
        </div>
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
