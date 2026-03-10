import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, TradePanel, MarketStats, PositionTable, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

const CHART_RATIO = 7
const PANEL_RATIO = 3;

// Reusable layout content (used by both demo-app and docs site)
export function BasicTradingLayout({ marketId, username }: { marketId: string | number; username?: string }) {
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

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', minHeight: '520px' }}>
        <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
          <ConsensusChart marketId={marketId} height={655} zoomable />
        </div>
        <div style={{ flex: PANEL_RATIO, minWidth: 0 }}>
          <TradePanel marketId={marketId} modes={['gaussian', 'range']} />
        </div>
      </div>

      <PositionTable marketId={marketId} username={username} tabs={['open-orders', 'trade-history', 'market-positions']} />
    </>
  );
}

// Basic trading layout: TradePanel beside chart
export default function App_BasicTradingLayout() {
  return (
    <ArticlePage widgetWidth='150%'>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <BasicTradingLayout marketId={MARKET_ID} username={config.username} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
