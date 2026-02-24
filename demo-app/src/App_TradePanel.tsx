import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, TradePanel, MarketStats, PositionTable, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

const CHART_RATIO = 2.2;
const PANEL_RATIO = 1;

// TradePanel beside chart (original layout)
export default function App_TradePanel() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <AuthWidget />
        <div style={{ marginTop: '1rem' }}>
          <MarketStats marketId={MARKET_ID} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', minHeight: '520px' }}>
          <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
            <ConsensusChart marketId={MARKET_ID} height={655} />
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
