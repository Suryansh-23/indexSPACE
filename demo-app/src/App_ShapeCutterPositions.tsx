import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, ShapeCutter, MarketStats, PositionTable } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

const CUTTER_RATIO = 7;
const POSITIONS_RATIO = 3;

// Chart full width, ShapeCutter (70%) + PositionTable (30%) below
export default function App_ShapeCutterPositions() {
  return (
    <ArticlePage widgetWidth="120%">
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <MarketStats marketId={MARKET_ID} />

        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <ConsensusChart marketId={MARKET_ID} height={500} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: CUTTER_RATIO, minWidth: 0 }}>
            <ShapeCutter marketId={MARKET_ID} />
          </div>
          <div style={{ flex: POSITIONS_RATIO, minWidth: 0 }}>
            <PositionTable marketId={MARKET_ID} username={config.username} />
          </div>
        </div>
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
