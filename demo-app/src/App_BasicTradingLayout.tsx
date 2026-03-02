import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, TradePanel, MarketStats, PositionTable, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

const CHART_RATIO = 7
const PANEL_RATIO = 3;

// Basic trading layout: TradePanel beside chart
export default function App_BasicTradingLayout() {
  return (
    <ArticlePage widgetWidth='150%'>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}>
            <MarketStats marketId={MARKET_ID} />
          </div>
          <div style={{ flex: 3, minWidth: 0 }}>
            <AuthWidget />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', minHeight: '520px' }}>
          <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
            <ConsensusChart marketId={MARKET_ID} height={655} zoomable />
          </div>
          <div style={{ flex: PANEL_RATIO, minWidth: 0 }}>
            <TradePanel marketId={MARKET_ID} modes={['gaussian', 'plateau']} />
          </div>
        </div>

        <PositionTable marketId={MARKET_ID} username={config.username} tabs={['open-orders', 'trade-history', 'market-positions']} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
