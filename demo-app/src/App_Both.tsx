import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, TradePanel, ShapeCutter, MarketStats, PositionTable } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

const CHART_RATIO = 2.2;
const PANEL_RATIO = 1;

// ShapeCutter beside chart, TradePanel below
export default function App_Both() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <MarketStats marketId={MARKET_ID} />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', minHeight: '520px' }}>
          <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
            <ConsensusChart marketId={MARKET_ID} height={655} />
          </div>
          <div style={{ flex: PANEL_RATIO, minWidth: 0 }}>
            <ShapeCutter marketId={MARKET_ID} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <TradePanel marketId={MARKET_ID} modes={['gaussian', 'plateau']} />
        </div>

        <PositionTable marketId={MARKET_ID} username={config.username} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
