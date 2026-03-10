import { FunctionSpaceProvider, useDistributionState } from '@functionspace/react';
import { MarketCharts, MarketStats, BucketRangeSelector, PasswordlessAuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Inner component so useDistributionState has access to FunctionSpaceProvider context
function DistRangeContent() {
  const distState = useDistributionState(MARKET_ID);

  return (
    <>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}>
            <MarketStats marketId={MARKET_ID} />
          </div>
          <div style={{ flex: 3, minWidth: 0 }}>
            <PasswordlessAuthWidget />
          </div>
        </div>

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <MarketCharts marketId={MARKET_ID} height={350} views={['consensus', 'distribution']} distributionState={distState} zoomable />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <BucketRangeSelector marketId={MARKET_ID} distributionState={distState} />
      </div>
    </>
  );
}

// MarketStats at top, MarketCharts (consensus + distribution tabs), BucketRangeSelector below
export default function App_DistRange() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <DistRangeContent />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
