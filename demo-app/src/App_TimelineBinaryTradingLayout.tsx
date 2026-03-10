import { FunctionSpaceProvider } from '@functionspace/react';
import { TimelineChart, BinaryPanel, MarketStats, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Reusable layout content (used by both demo-app and docs site)
export function TimelineBinaryLayout({ marketId }: { marketId: string | number }) {
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

      <div style={{ marginTop: '1rem' }}>
        <TimelineChart marketId={marketId} height={500} zoomable />
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <BinaryPanel
          marketId={marketId}
          xPoint={{ mode: 'dynamic-mean' }}
        />
      </div>
    </>
  );
}

// TimelineBinary trading layout: timeline chart with binary panel below
export default function App_TimelineBinaryTradingLayout() {
  return (
    <ArticlePage widgetWidth="150%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <TimelineBinaryLayout marketId={MARKET_ID} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
