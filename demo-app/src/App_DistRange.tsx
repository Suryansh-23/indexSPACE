import { FunctionSpaceProvider, useDistributionState } from '@functionspace/react';
import { MarketCharts, MarketStats, BucketRangeSelector } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Inner component so useDistributionState has access to FunctionSpaceProvider context
function DistRangeContent() {
  const distState = useDistributionState(MARKET_ID);

  return (
    <>
      <MarketStats marketId={MARKET_ID} />

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <MarketCharts marketId={MARKET_ID} height={350} views={['consensus', 'distribution']} distributionState={distState} />
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
