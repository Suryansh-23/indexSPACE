import { FunctionSpaceProvider, useDistributionState } from '@functionspace/react';
import { MarketCharts, MarketStats, BucketRangeSelector, PasswordlessAuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// Reusable layout content (used by both demo-app and docs site)
// Must be rendered inside FunctionSpaceProvider (useDistributionState needs context)
export function DistRangeLayout({ marketId }: { marketId: string | number }) {
  const distState = useDistributionState(marketId);

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
        <MarketCharts marketId={marketId} height={350} views={['distribution']} distributionState={distState} zoomable />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <BucketRangeSelector marketId={marketId} distributionState={distState} />
      </div>
    </>
  );
}

// MarketStats at top, MarketCharts (consensus + distribution tabs), BucketRangeSelector below
export default function App_DistRange() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <DistRangeLayout marketId={MARKET_ID} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
