import React from 'react';
import { MarketStats, AuthWidget, MarketCharts, BucketRangeSelector } from '@functionspace/ui';
import { useDistributionState } from '@functionspace/react';
import { DEMO_MARKET_ID } from '../../constants';

function DistributionRangeInner() {
  const distState = useDistributionState(DEMO_MARKET_ID, { defaultBucketCount: 12 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <MarketStats marketId={DEMO_MARKET_ID} />
        <AuthWidget />
      </div>
      <MarketCharts
        marketId={DEMO_MARKET_ID}
        views={['consensus', 'distribution']}
        distributionState={distState}
        height={300}
      />
      <BucketRangeSelector marketId={DEMO_MARKET_ID} distributionState={distState} />
    </div>
  );
}

export default function DistributionRangeDemo() {
  return <DistributionRangeInner />;
}
